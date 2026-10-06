# BloodAxis

**When someone needs blood, every minute counts. BloodAxis finds the people who can give it — fast.**

BloodAxis is an emergency blood coordination platform. It connects families, hospitals, and nearby donors in real time, so a request for blood reaches the right people within moments instead of being lost in a flurry of phone calls and forwarded messages.

---

## The problem

When a patient needs blood urgently, families usually start the same scramble: calling relatives, posting in WhatsApp groups, asking around the hospital. It is slow, stressful, and there is no way to know who is actually nearby, who has the right blood group, or whether anyone is on the way.

## What BloodAxis does

1. **Ask for blood in under a minute.** Pick the blood group, how many units, and how urgent it is. You can even type or paste a plain message like *"Need 2 units O positive urgently at City Hospital"* and BloodAxis fills in the form for you.
2. **Reach the right donors automatically.** BloodAxis looks for compatible donors close to the hospital and alerts them straight away with a push notification.
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

The quickest way is Docker:

```bash
docker-compose up --build
```

Then open http://localhost:3000.

You'll need accounts and keys for the services BloodAxis relies on (sign-in, database, notifications, maps, AI). Copy the example environment files in each folder and fill them in.

## What's inside

| Folder | Purpose |
|---|---|
| `frontend/` | The app people use: landing page, request wizard, map, dashboards |
| `matching-engine/` | The service that finds nearby donors for a request |
| `database/` | The database schema |

## Built with

Next.js, Django, FastAPI, Supabase (PostgreSQL + PostGIS), Clerk, Firebase Cloud Messaging, MapLibre, and Groq.

---

*Built because no one should wait on a phone call when a life is at stake.*
