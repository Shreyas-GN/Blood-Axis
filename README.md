# Blood Axis

**When someone needs blood, every minute counts. Blood Axis finds the people who can give it — fast.**

Blood Axis is an emergency blood coordination platform. It connects families, hospitals, and nearby donors in real time, so a request for blood reaches the right people within moments instead of being lost in a flurry of phone calls and forwarded messages.

---

## The problem

When a patient needs blood urgently, families usually start the same scramble: calling relatives, posting in WhatsApp groups, asking around the hospital. It is slow, stressful, and there is no way to know who is actually nearby, who has the right blood group, or whether anyone is on the way.

## What Blood Axis does

1. **Ask for blood in under a minute.** Pick the blood group, how many units, and how urgent it is. You can even type or paste a plain message like *"Need 2 units O positive urgently at City Hospital"* and Blood Axis fills in the form for you.
2. **Reach the right donors automatically.** Blood Axis looks for compatible donors close to the hospital and alerts them straight away with a push notification.
3. **Watch help arrive.** Donors respond, and the request page updates live, so you can see who has accepted and how far away they are.
4. **Close the loop.** Once the need is met, the request is marked complete and donors are recognised in their activity history.

## Who it's for

- **Families and patients** who need blood and don't know where to turn.
- **Donors** who are willing to help and want to be called only when it matters and only when they're close.
- **Hospitals** that want a verified, organised way to raise and track blood requests.

## Highlights

- **Live emergency map** showing active requests and donors around you.
- **Smart nearby matching** that ranks donors by distance and blood group.
- **Instant alerts** through push notifications, with an in-app notification bell.
- **Plain-language requests**, powered by AI that reads a message and turns it into a ready-to-send request.
- **Hospital dashboard** with a verification step, so requests come from trusted sources.
- **Donor profiles and activity feed** to track availability and past donations.
- **Phone verification** at sign-in to keep the community genuine.
- **Works on your phone**, with a mobile-friendly layout and bottom navigation.

## How it works, in one picture

```
Request raised  →  Nearby compatible donors found  →  Alerts sent  →  Donors respond  →  Blood arranged
```

## Try it yourself

Live site: **https://bloodaxis.netlify.app**

## Run it locally

Blood Axis uses [Convex](https://convex.dev) for the database, server functions and sign-in.

```bash
cd frontend
npm install
cp .env.local.example .env.local

# 1. Create/connect a Convex dev deployment (writes NEXT_PUBLIC_CONVEX_URL to .env.local
#    and keeps convex/_generated up to date). Leave it running.
npx convex dev

# 2. One-time: generate the sign-in keys and set the site URL on the Convex deployment.
npx @convex-dev/auth

# 3. In another terminal
npm run dev
```

Then open http://localhost:3000.

Optional services are configured as **Convex environment variables**, not in `.env.local`
(`npx convex env set NAME value`): `APP_URL`, `TWILIO_*` (SMS and phone OTP), `FIREBASE_*`
(push), `TELEGRAM_*`. Without them, SMS codes are printed in the Convex logs and push falls
back to the in-app inbox. `GROQ_API_KEY` stays in `.env.local` (used by the Next.js route).

## What's inside

| Folder | Purpose |
|---|---|
| `frontend/` | The app people use: landing page, request wizard, map, dashboards |
| `frontend/convex/` | The backend: schema, sign-in, requests, donor matching and alert escalation |
| `docs/` | Design notes and the migration plan |

## Built with

Next.js, Convex (database and authentication), Firebase Cloud Messaging, Twilio, MapLibre, and Groq.

---

*Built because no one should wait on a phone call when a life is at stake.*
