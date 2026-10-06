# Backend analysis and migration plan: Supabase → Convex (database and auth)

> **Status: implemented** (see section 7). Sections 1–6 are the original analysis and plan; section 7 records what was built and where it differs.

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

### Auth: docs mention Clerk, code uses Supabase Auth
- No `@clerk/*` package is installed. The only Clerk traces are a stub `createClerkSupabaseClient`, env-var examples, a schema comment ("id = Clerk user ID") and the README. These are all dead and get deleted; Clerk is not part of the target.
- The real auth is Supabase Auth: email/password in `login/page.tsx`, phone OTP via `api/auth/otp/*`, and `signInAnonymously` in the request wizard. Middleware (`lib/supabase/middleware.ts`) and `AuthContext` use Supabase sessions.
- Consequence: existing user ids are Supabase UUIDs. Moving to Convex Auth means re-onboarding or a one-off user import.

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
Browser (Next.js, Convex Auth sign-in forms, Convex useQuery/useMutation, live by default)
   │  Convex Auth session (JWT, refresh token in cookie via Next.js middleware)
   ▼
Convex
 ├─ auth                @convex-dev/auth: Password, Phone OTP, Anonymous providers
 ├─ queries/mutations   authz via getAuthUserId(ctx)
 ├─ scheduler           durable escalation phases (runAfter), expiry
 ├─ actions             FCM v1, SMS (OTP + alerts), Telegram, Groq (all external I/O)
 └─ http router         Convex Auth routes (/.well-known, /api/auth/*)
```

What goes away: the FastAPI service, Supabase client/server/mock, middleware cookie refresh, OTP routes, `realtime.ts`, 20 s notification polling, the `escalate` cron, `docker-compose` Postgres, and all SQL files.
What stays: Next.js on Netlify, MapLibre, Groq, FCM, Telegram.

### Convex schema (`convex/schema.ts`)
Spread `authTables` from `@convex-dev/auth/server` (it creates `users`, `authAccounts`, `authSessions` etc.). Extend the auth `users` table with the app fields below, so `users._id` is the user id everywhere and there is no second identity table.

- `users` (auth table, extended): `name`, `email`, `phone`, `fullName`, `bloodGroup`, `isDonor`, `isAvailableDonor`, `city`, `profileCompleted`, `lat`, `lng`, `geohash`, `lastDonationDate`, `cooldownUntil`, `isVerified`, `role` (`donor | hospital | admin`), `fcmTokens: string[]`.
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

### Auth with Convex Auth
Uses `@convex-dev/auth` (still labelled beta; pin the version).
- Install `convex`, `@convex-dev/auth`. Run `npx @convex-dev/auth` to generate `convex/auth.ts`, `convex/auth.config.ts`, `convex/http.ts` and the JWT keys (`JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` on the Convex deployment).
- `convex/auth.ts`: `convexAuth({ providers: [Password({ profile }), Phone, Anonymous] })`.
  - **Password** replaces the email/password flow in `login/page.tsx` (`signIn("password", { flow: "signUp" | "signIn" })`). `profile` maps the sign-up form to `fullName`.
  - **Phone OTP** replaces `api/auth/otp/*` and `OTPVerification.tsx`. Convex Auth has no built-in SMS, so write a custom provider whose `sendVerificationRequest` calls the SMS provider (Twilio Verify or MSG91). Phone numbers are stored on `users.phone` and `phoneVerificationTime` is set by the library.
  - **Anonymous** replaces `signInAnonymously` in the request wizard. A guest can create a request; an anonymous account is upgraded by linking a phone OTP, which keeps the request owned.
- Next.js: `ConvexAuthNextjsServerProvider` in `layout.tsx`, `ConvexAuthNextjsProvider` on the client, and `convexAuthNextjsMiddleware` replacing `lib/supabase/middleware.ts` with the same public-route list. **Remove `/api/*` from the public list.**
- Server-side authz helpers `requireUser(ctx)` (wraps `getAuthUserId`) and `requireOwner(ctx, request)`, used by every public function. This closes bugs 1–3 by construction.
- Roles: `users.role` (`donor | hospital | admin`), set only by internal/admin mutations, never from client input.
- Because the user row is the auth row, no webhook or user-sync step is needed. Account deletion is one internal mutation that also removes the user's `authAccounts` and sessions.

### Request creation and escalation
- `requests.create` (mutation): validate, insert, log activity, then `ctx.scheduler.runAfter(0, internal.alerts.runPhase, {requestId, phase: 1})`.
- `alerts.runPhase` (internal action): load the request, **return if status is not `searching`**, query eligible donors, notify, then schedule the next phase (`runAfter(5 min)`, `runAfter(10 min)`) and finally an expiry mutation at 2 h. Store the scheduled function ids so `cancel`/`fulfill` can cancel them.
- Eligibility (single indexed pass, no N+1): available donor, ABO/Rh-compatible with the request, not in cooldown, no log in the last 24 h, not already notified for this request.
- Per-channel actions: `sendPush` (FCM HTTP v1 via service account), `sendSms` (Twilio), `sendTelegram`. Each writes a `notificationLogs` row with the real result.
- `donorResponses.respond` (mutation): upsert and recompute `confirmedCount` from `ACCEPTED/CONFIRMED/ARRIVED` rows in the same transaction. This is atomic, so the counter drift in bug 6 disappears.
- Blood compatibility matrix lives in `convex/lib/compat.ts` and is shared with the UI.

### Frontend rewire
- `AuthContext` → thin wrapper over `useConvexAuth()` plus `useQuery(api.users.me)`.
- Server actions in `app/actions/*` and `services/*` → `convex/*.ts` functions; pages call `useQuery`/`useMutation`. Live updates for dashboard, request page, drawer, hospital dashboard and notification bell come free; delete `realtime.ts`, `useRealtimeAlerts` channel code and polling.
- `useRealtimeAlerts` becomes a `useQuery` on unread notifications that fires the browser notification/sound for new ones.
- `/api/ai/parse-request`: move it to a Convex action that requires `requireUser` and rate-limits per user (keeps `GROQ_API_KEY` in Convex env). Alternative: keep the Next route and check the session with `convexAuthNextjsToken()`.
- Hospital flow: `hospitals.requestVerification` mutation, with `isVerified` set only by an admin mutation.

## 4. Phased plan

**Phase 0 – Decisions (blocking)** — see section 5.

**Phase 1 – Foundation**
Create the Convex project; add deps; run the Convex Auth setup; `convex/schema.ts` with `authTables`; providers; auth middleware; env vars (`NEXT_PUBLIC_CONVEX_URL`, plus `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` on Convex). Login page calls `signIn("password", …)`.
*Exit:* a user can sign up, sign in and sign out, and `users.me` returns their row.

**Phase 2 – Users and profiles**
`users.me/update`, `completeRegistration` (replaces `saveRegistrationProfile`, drops the stray `age` or adds it to the schema), donor availability toggle, FCM token registration.

**Phase 3 – Requests and responses**
`requests.create/get/listActive/listMine/update/cancel/fulfill`, `donorResponses.respond/cancel/listForRequest` with owner/responder authorization. Port dashboard, wizard, request page, drawer, hospital dashboard.

**Phase 4 – Matching and escalation**
Geo index, compatibility matrix, `alerts.runPhase`, scheduler wiring, cancellation on fulfil/cancel, expiry.

**Phase 5 – Notifications and activity**
In-app notifications and activities in Convex; FCM v1, Twilio and Telegram actions; logs with real statuses; notification bell on `useQuery`.

**Phase 6 – Data migration and cutover**
Export Supabase tables to JSONL, write a one-off `convex/migrate.ts` import (map UUIDs to Convex ids, convert `location` WKT to `lat/lng`). For users, either (a) re-onboard (existing data is Supabase-UUID keyed and `clear_user_data.sql` suggests data is disposable), or (b) import users by email/phone into the auth tables and have them set a password via reset. Passwords cannot be carried over from Supabase unless the hash scheme is replicated in a custom Password `crypto` config. Run in staging first; freeze writes during the final import.

**Phase 7 – Cleanup**
Remove `matching-engine/`, `database/`, `@supabase/*`, `svix`, the Clerk stubs and README mentions, mock client, OTP routes, `docker-compose` db and matching-engine services, Supabase CI placeholders (add Convex placeholders), and update README ("Built with"), `.env.local.example`, `netlify.toml` secret-scan keys. Add `npx convex deploy` to the Netlify build command.

## 5. Open decisions
1. **Existing users:** re-onboard on Convex Auth (simple) or import by email/phone (more work)? Is there production data worth keeping?
2. **Geo approach:** Convex Geospatial component vs geohash buckets (recommendation: component, fall back to geohash).
3. **SMS provider:** Twilio, MSG91 (the code hints at both), or drop SMS for now? Phone OTP sign-in depends on this, so it is not optional if phone login stays.
4. **Blood compatibility:** should alerts go to compatible groups (e.g. O- for anyone) or exact match only, as now? Recommendation: compatible, ranked by exact match first.
5. **Hospital verification:** manual admin approval via `users.role`, or an external license check?
6. **Telegram broadcast:** keep it, and if so, drop the patient name and phone from the message?

## 6. Risks
- Convex mutations are transactional but actions are not; keep all state changes in mutations and have actions only do I/O, then record results via an internal mutation.
- Convex query results are reactive and billed per read; keep the "all active requests" feed paginated and indexed by `status`.
- Convex Auth is beta and its API has shifted between releases; pin the version and check the current docs when implementing. The `JWT_PRIVATE_KEY`/`JWKS`/`SITE_URL` env vars must be set per deployment (dev and prod), or sign-in fails silently.
- Convex has no built-in SMS or email delivery; OTP and password-reset delivery are your code and your provider's cost.
- Next 16 prefers `proxy.ts` over `middleware.ts`; the current `middleware.ts` still works but check the Convex Auth docs for the preferred file name.

## 7. Implementation status

Built in `frontend/convex/` and wired into the app. Verified by `npm run type-check`, `npm run build` and 12 `convex-test` tests (`npm test`) covering auth, eligibility, escalation, response counting and privacy rules. **Not verified against a live Convex deployment** — see "Before first deploy".

**Differences from the plan**
- **Geo search:** plain haversine over the indexed `(isAvailableDonor, bloodGroup)` set, no Geospatial component and no geohash. Fine at this scale; revisit past a few thousand donors.
- **Compatibility:** alerts go to ABO/Rh-compatible donors, exact matches first (`lib/compat.ts`, shared with the dashboard filter).
- **Auth providers:** Password (email) and Phone OTP. The Anonymous provider was dropped: the wizard now verifies a phone number instead of creating guest accounts.
- **Escalation:** one internal mutation per phase (5/15/25 km, 5 min apart, expiry at 2 h). It re-checks status on every run, so fulfilling or cancelling stops it without stored job ids. Network I/O is in actions (`delivery.ts`).
- **SMS:** Twilio via `fetch`; without credentials the message is logged and the log row is marked `FAILED` / `sms_not_configured`.
- **Push:** FCM HTTP v1 with service-account auth; invalid tokens are pruned. Multiple tokens per user.
- **Telegram:** kept; the broadcast no longer includes the patient name or contact number.
- **Privacy:** contact phone is shown only to the requester and donors who accepted; responder lists are visible only to the requester; the nearby-donor map is owner-only, without phone numbers and with coordinates rounded to ~1 km.
- **AI parsing:** stays a Next.js route (the emergency page uses it before sign-in), now with a per-IP rate limit, input cap and no error details.
- **Frontend:** snake_case row shapes are preserved by mappers in `convex/lib/helpers.ts`, so most components were unchanged. Server actions, `services/`, Supabase clients, OTP and alert routes, `matching-engine/` and `database/` were deleted.

**Before first deploy**
1. `npx convex dev` (creates the deployment and regenerates `convex/_generated`; the committed copy was produced from the CLI templates because no deployment was reachable).
2. `npx @convex-dev/auth` (JWT keys, `SITE_URL`).
3. `npx convex env set APP_URL …` plus the optional `TWILIO_*`, `FIREBASE_*`, `TELEGRAM_*`.
4. Netlify: add `CONVEX_DEPLOY_KEY` (build runs `npx convex deploy`) and `NEXT_PUBLIC_CONVEX_URL`.

**Known gaps**
- No role or admin tooling: `isVerified` and `role` exist in the schema but nothing sets them, so hospital verification is still cosmetic (decision 5 above is open).
- `bloodBanks` has no UI or seed; insert rows from the Convex dashboard.
- The Google/GitHub buttons on the login page were placeholders before and still are.
- Requests created without a hospital from the list rely on browser location; denied location blocks submission with a message.
