# BloodAxis

Emergency blood coordination platform that connects hospitals, patients, and donors in real time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Framer Motion |
| Auth | Clerk |
| Backend | Django 5, Django REST Framework, Gunicorn |
| Matching Engine | FastAPI, PostGIS spatial queries |
| Database | Supabase (PostgreSQL + PostGIS) |
| Realtime | Supabase Realtime |
| Push Notifications | Firebase Cloud Messaging |
| Maps | MapLibre GL |
| AI | Groq SDK |
| Infra | Docker Compose, Vercel (frontend), Render/Railway (backend) |

---

## Repository Structure

```
frontend/           # Next.js app
  src/
    app/            # Pages and API routes (App Router)
    components/
      auth/         # OTPVerification
      dashboard/    # Dashboard widgets
      landing/      # Landing page sections
      map/          # Map, EmergencyMap, overlays
      nav/          # BottomNav
      notifications/# NotificationBell, NotificationPrompt
      request/      # Request detail components
      ui/           # Shared UI primitives
      wizard/       # Request creation wizard steps
    hooks/          # useNotifications, useRealtimeAlerts
    lib/            # Supabase, Firebase, API, utils
    services/       # Business logic services
    types/          # TypeScript types

backend/            # Django REST API
  config/           # Settings, URLs, WSGI/ASGI
  core/             # Models, views, serializers, auth

matching-engine/    # FastAPI geospatial matching service
  app/
    core/           # Database connection
    models/         # Donor model
    routes/         # Match endpoints
    services/       # Matching algorithm, notifier

database/           # Supabase SQL schema and migrations
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
GROQ_API_KEY=
BACKEND_URL=http://localhost:8000
MATCHING_ENGINE_URL=http://localhost:9000
TELEGRAM_BOT_TOKEN=
```

### Backend (`backend/.env`)

```env
DATABASE_URL=
DJANGO_SECRET_KEY=
CLERK_SECRET_KEY=
MATCHING_ENGINE_URL=http://localhost:9000
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Matching Engine (`matching-engine/.env`)

```env
DATABASE_URL=
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

---

## Running Locally

### Option A — Docker Compose (full stack)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Django API | http://localhost:8000 |
| FastAPI Engine | http://localhost:9000 |

### Option B — Individual services

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

**Django backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**FastAPI matching engine**

```bash
cd matching-engine
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 9000
```

---

## Database

SQL schema and migration files are in `database/`.

Apply them to your Supabase project via the SQL editor or Supabase CLI:

```bash
supabase db push
```

PostGIS must be enabled on the Supabase project before applying the schema.

---

## Production Deployment

- **Frontend**: Deploy `frontend/` to Vercel. Add all `NEXT_PUBLIC_*` and server-side env vars in the Vercel dashboard.
- **Backend**: Deploy `backend/` to Render or Railway using `backend/Dockerfile`.
- **Matching Engine**: Deploy `matching-engine/` using `matching-engine/Dockerfile`. Set `$PORT` env var.
- **Database**: Use Supabase connection pooler URL (port 6543) in production.
