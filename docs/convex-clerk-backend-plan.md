# Backend analysis and migration plan: Supabase → Convex, Supabase Auth → Clerk

## 1. What the backend is today

There are three pieces, and they overlap:

| Piece | Where | Role |
|---|---|---|
| Next.js "backend" | `frontend/src/app/actions/*`, `app/api/*`, `services/*` | Server actions, route handlers, alert engine, Supabase queries |
| FastAPI matching engine | `matching-engine/` | `POST /match-donors`: finds donors and sends alerts in a background task |
| Postgres + PostGIS (Supabase) | `database/*.sql` | 7 tables, 4 SQL functions, RLS policies |

Data model (`database/supabase_v2_schema.sql`): `profiles`, `blood_requests`, `donor_responses`, `notification_logs`, `notifications`, `activities`, `blood_banks`. Geo search uses PostGIS (`find_nearby_donors`, `find_nearby_donors_v2`, `find_nearby_blood_banks`). `increment_confirmed_count` is an RPC.

Request flow today:
`wizard → POST /api/requests → insert blood_requests → POST matching-engine /match-donors → (phase 1 push @5km → sleep → phase 2 @15km → sleep → phase 3 SMS + Telegram @25km)`.
The Next.js `AlertEngineService` and `/api/alerts/escalate` implement a second copy of the same pipeline.

## 2. Findings

### Auth: docs say Clerk, code uses Supabase Auth
- No `@clerk/*` package is installed. The only Clerk traces are a stub `createClerkSupabaseClient`, env-var examples, a schema comment ("id = Clerk user ID") and the README.
- The real auth is Supabase Auth: email/password in `login/page.tsx`, phone OTP via `api/auth/otp/*`, and `signInAnonymously` in the request wizard. Middleware (`lib/supabase/middleware.ts`) and `AuthContext` use Supabase sessions.
- Consequence: existing user ids are Supabase UUIDs, not Clerk ids. Moving to Clerk means a user migration or re-onboarding.

### Security and correctness bugs
1. **Server actions probably can't see the user.** They call `supabaseServer.auth.getUser()`, but `supabaseServer` is a service-role client with no cookie session. `getUser()` returns no user, so every action and `/api/requests` throws or returns `Unauthorized` against a real Supabase project. (It only appears to work because of the in-browser mock client.)
2. **Service role everywhere.** Where actions do work, they bypass RLS and mostly trust client input. `getResponsesForRequestAction` has a comment admitting it skips the ownership check, so any signed-in user can read any request's donor names and phones.
3. **Middleware marks all `/api/*` public**, and:
   - `/api/alerts/escalate` has its auth check commented out. Anyone can trigger escalations.
   - `/api/alerts/push` and `/api/alerts/sms` are unauthenticated relays. Anyone can spam FCM or SMS.
   - `/api/ai/parse-request` is unauthenticated, so anyone can spend the Groq quota.
4. **RLS is wide open in the live migration.** `supabase_migration_v2.sql` creates `USING (true)` policies on `activities` and `notifications`. They conflict with the strict policies in `supabase_v2_schema.sql`. The browser also reads and updates `notifications` and `activities` directly with the anon key.
5. **`saveRegistrationProfile` writes an `age` column** that doesn't exist in the schema.
6. **`increment_confirmed_count` runs on every response upsert**, including `CANCELLED`/`ARRIVED` updates. The count inflates, and the migration version also drops the status guard.
7. **Hospital verification is cosmetic.** `/hospital/verify` just redirects. Nothing sets `is_verified`, and there is no role concept.

### Notification and matching problems
8. **Two competing escalation engines.** `/api/requests` only calls FastAPI. The Next.js cron route needs an external scheduler that isn't configured (no `vercel.json` or Netlify scheduled function). The timings differ (10 s sleeps vs 5/10 min).
9. **FastAPI escalation is not durable.** It uses `BackgroundTasks` plus `asyncio.sleep`, so a restart or deploy loses it. It also doesn't stop when a request is fulfilled or cancelled. The "5 minutes" is a 10-second test value.
10. **Push is effectively dead.** It uses the legacy FCM `fcm/send` server-key API (shut down in 2024). Only one `fcm_token` is stored per user. SMS is a stub (Twilio is commented out; FastAPI always logs FAILED).
11. **Matching only returns the exact blood group.** There is no ABO/Rh compatibility, despite the README promising ranking by group. The FastAPI query skips cooldown checks. The SQLite fallback fabricates donor locations.
12. **N+1 cooldown queries** (2 queries per donor). Phase 1 counts all donors rather than eligible ones in `notified_count`.
13. **Phase 3 Telegram broadcast** posts patient name and contact phone to a channel. Review this for privacy.
14. **Stale infra.** `docker-compose.yml` mounts `./supabase_setup.sql` from the wrong path. The README mentions Django, which isn't in the repo. The mock Supabase client in `lib/supabase/client.ts` hides real failures.

## 3. Target architecture

```
Browser (Next.js, Clerk <SignIn/>, Convex useQuery/useMutation, live by default)
   │  Clerk JWT (template "convex")
   ▼
Convex
 ├─ queries/mutations   authz via ctx.auth.getUserIdentity() (identity.subject = Clerk user id)
 ├─ scheduler           durable escalation phases (runAfter), expiry
 ├─ actions             FCM v1, Twilio SMS, Telegram, Groq (all external I/O)
 └─ http actions        Clerk webhook (user.created/updated/deleted), optional
```

What goes away: the FastAPI service, Supabase client/server/mock, middleware cookie refresh, OTP routes, `realtime.ts`, 20 s notification polling, the `escalate` cron, `docker-compose` Postgres, and all SQL files.
What stays: Next.js on Netlify, MapLibre, Groq, FCM, Telegram.

### Convex schema (`convex/schema.ts`)
Use Clerk's user id as a string key; Convex generates `_id` for everything else.

- `users`: `clerkId` (index), `fullName`, `phone`, `bloodGroup`, `isDonor`, `isAvailableDonor`, `city`, `profileCompleted`, `lat`, `lng`, `geohash`, `lastDonationDate`, `cooldownUntil`, `isVerified`, `role` (`donor | hospital | admin`), `fcmTokens: string[]`.
- `bloodRequests`: `requesterId` (→ users), `bloodGroup`, `units`, `patientName`, `hospitalName`, `city`, `contactPhone`, `urgencyLevel`, `lat`, `lng`, `status`, `escalationPhase`, `notifiedCount`, `confirmedCount`, `donorName`, `donorPhone`, `note`, `requesterRelation`. Indexes: `by_requester`, `by_status`, `by_status_bloodGroup`.
- `donorResponses`: `requestId`, `donorId`, `status`, `distanceMeters`, `etaMinutes`, `respondedAt`. Indexes: `by_request`, `by_donor`, `by_request_donor` (unique by convention, enforced in the mutation).
- `notificationLogs`: `requestId`, `donorId?`, `channel`, `status`, `metadata`. Indexes `by_request`, `by_donor` (for the 24 h fatigue check).
- `notifications`: `userId`, `requestId?`, `title`, `message`, `type`, `status`, `readAt?`. Index `by_user_status`.
- `activities`: `userId`, `requestId?`, `eventType`, `description`. Index `by_user`.
- `bloodBanks`: same fields plus `lat`, `lng`, `geohash`.

Use `v.union(v.literal(...))` for the enums. This replaces the Postgres enums.

### Geo search (biggest design change)
Convex has no PostGIS. Options:
1. **Recommended:** the Convex Geospatial component (`@convex-dev/geospatial`), indexing users and blood banks by point, with rectangle/nearest queries. Verify its current API at implementation time.
2. Fallback with no dependency: store a geohash (precision 4–5) on `users`, index `by_bloodGroup_geohash`, query the neighbouring cells for the radius, then filter exactly with haversine in the function. This is fine at this app's scale.

Either way, the final distance filter and sort happen in code.

### Auth with Clerk
- Install `@clerk/nextjs`, `convex`. Wrap the app in `ClerkProvider` and `ConvexProviderWithClerk`.
- `convex/auth.config.ts` with the Clerk Frontend API URL as `domain` and `applicationID: "convex"`; create the Clerk JWT template named `convex`.
- Replace `lib/supabase/middleware.ts` with `clerkMiddleware`, using the same public-route list. **Remove `/api/*` from the public list**; only keep the Clerk webhook public.
- Phone verification: enable phone number as a required, verified attribute in Clerk. This replaces `api/auth/otp/*`, `OTPVerification.tsx` and the wizard's `signInWithOtp`/`signInAnonymously` hack.
- User sync: a `users.store` mutation called on first load (upsert by `identity.subject`), plus an optional Clerk webhook (`svix` is already a dependency) to handle `user.updated`/`user.deleted`.
- Server-side authz helper `requireUser(ctx)` and `requireOwner(ctx, request)`, used by every public function. This closes bugs 1–3 by construction.

### Request creation and escalation
- `requests.create` (mutation): validate, insert, log activity, then `ctx.scheduler.runAfter(0, internal.alerts.runPhase, {requestId, phase: 1})`.
- `alerts.runPhase` (internal action): load the request, **return if status is not `searching`**, query eligible donors, notify, then schedule the next phase (`runAfter(5 min)`, `runAfter(10 min)`) and finally an expiry mutation at 2 h. Store the scheduled function ids so `cancel`/`fulfill` can cancel them.
- Eligibility (single indexed pass, no N+1): available donor, ABO/Rh-compatible with the request, not in cooldown, no log in the last 24 h, not already notified for this request.
- Per-channel actions: `sendPush` (FCM HTTP v1 via service account), `sendSms` (Twilio), `sendTelegram`. Each writes a `notificationLogs` row with the real result.
- `donorResponses.respond` (mutation): upsert and recompute `confirmedCount` from `ACCEPTED/CONFIRMED/ARRIVED` rows in the same transaction. This is atomic, so the counter drift in bug 6 disappears.
- Blood compatibility matrix lives in `convex/lib/compat.ts` and is shared with the UI.

### Frontend rewire
- `AuthContext` → thin wrapper over Clerk `useUser` plus `useQuery(api.users.me)`.
- Server actions in `app/actions/*` and `services/*` → `convex/*.ts` functions; pages call `useQuery`/`useMutation`. Live updates for dashboard, request page, drawer, hospital dashboard and notification bell come free; delete `realtime.ts`, `useRealtimeAlerts` channel code and polling.
- `useRealtimeAlerts` becomes a `useQuery` on unread notifications that fires the browser notification/sound for new ones.
- `/api/ai/parse-request`: keep as a Next route but add Clerk `auth()` and a per-user rate limit, or move it to a Convex action (keeps `GROQ_API_KEY` in Convex env). Moving it is cleaner.
- Hospital flow: `hospitals.requestVerification` mutation, with `isVerified` set only by an admin mutation.

## 4. Phased plan

**Phase 0 – Decisions (blocking)** — see section 5.

**Phase 1 – Foundation**
Create Convex and Clerk projects; add deps; `convex/schema.ts`, `auth.config.ts`; providers; `clerkMiddleware`; env vars (`NEXT_PUBLIC_CONVEX_URL`, `CLERK_*`, `CLERK_JWT_ISSUER_DOMAIN` set on Convex). Login page becomes Clerk `<SignIn/>`/`<SignUp/>`.
*Exit:* signed-in user sees their Clerk identity in `users.me`.

**Phase 2 – Users and profiles**
`users.store/me/update`, `completeRegistration` (replaces `saveRegistrationProfile`, drops the stray `age` or adds it to the schema), donor availability toggle, FCM token registration.

**Phase 3 – Requests and responses**
`requests.create/get/listActive/listMine/update/cancel/fulfill`, `donorResponses.respond/cancel/listForRequest` with owner/responder authorization. Port dashboard, wizard, request page, drawer, hospital dashboard.

**Phase 4 – Matching and escalation**
Geo index, compatibility matrix, `alerts.runPhase`, scheduler wiring, cancellation on fulfil/cancel, expiry.

**Phase 5 – Notifications and activity**
In-app notifications and activities in Convex; FCM v1, Twilio and Telegram actions; logs with real statuses; notification bell on `useQuery`.

**Phase 6 – Data migration and cutover**
Export Supabase tables to JSONL, write a one-off `convex/migrate.ts` import (map UUIDs to Convex ids, convert `location` WKT to `lat/lng`). For users, either (a) re-onboard (existing data is Supabase-UUID keyed and `clear_user_data.sql` suggests data is disposable), or (b) pre-create Clerk users by email/phone via the Clerk Backend API and rewrite `clerkId`. Run in staging first; freeze writes during the final import.

**Phase 7 – Cleanup**
Remove `matching-engine/`, `database/`, `@supabase/*`, mock client, OTP routes, `docker-compose` db and matching-engine services, Supabase CI placeholders (add Convex/Clerk placeholders), and update README ("Built with"), `.env.local.example`, `netlify.toml` secret-scan keys. Add `npx convex deploy` to the Netlify build command.

## 5. Open decisions
1. **Existing users:** re-onboard through Clerk (simple) or migrate by email/phone (more work)? Is there production data worth keeping?
2. **Geo approach:** Convex Geospatial component vs geohash buckets (recommendation: component, fall back to geohash).
3. **SMS provider:** Twilio, MSG91 (the code hints at both), or drop SMS for now?
4. **Blood compatibility:** should alerts go to compatible groups (e.g. O- for anyone) or exact match only, as now? Recommendation: compatible, ranked by exact match first.
5. **Hospital verification:** manual admin approval via Clerk role/metadata, or an external license check?
6. **Telegram broadcast:** keep it, and if so, drop the patient name and phone from the message?

## 6. Risks
- Convex mutations are transactional but actions are not; keep all state changes in mutations and have actions only do I/O, then record results via an internal mutation.
- Convex query results are reactive and billed per read; keep the "all active requests" feed paginated and indexed by `status`.
- Clerk JWT template name must be exactly `convex`, and the issuer domain must be set in the Convex dashboard, or every call is unauthenticated.
- Next 16 prefers `proxy.ts` over `middleware.ts`; the current `middleware.ts` still works but check the Clerk docs for the preferred file name.
