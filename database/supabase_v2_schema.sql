-- ============================================================
-- BloodRelay V2 — Clean Database Initialization
-- Project: rjynjbvvgivwyexzziek.supabase.co
-- Generated: 2026-06-21
--
-- Removed from V1:
--   - otp_verifications (Clerk handles auth)
--   - blood_requests.expires_at (dead field)
--   - blood_requests.requester_phone (duplicate of contact_phone)
--   - blood_banks.website (never queried)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

CREATE TYPE blood_group AS ENUM (
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
);

CREATE TYPE request_status AS ENUM (
    'searching',
    'donor_accepted',
    'fulfilled',
    'cancelled',
    'expired'
);

CREATE TYPE urgency_level AS ENUM (
    'IMMEDIATE',
    'TODAY',
    'SCHEDULED'
);

CREATE TYPE donor_response_status AS ENUM (
    'ACCEPTED',
    'CONFIRMED',
    'ARRIVED',
    'CANCELLED'
);

CREATE TYPE notification_channel AS ENUM (
    'PUSH',
    'SMS',
    'WHATSAPP'
);

CREATE TYPE notification_log_status AS ENUM (
    'SENT',
    'DELIVERED',
    'FAILED'
);

CREATE TYPE notification_type AS ENUM (
    'emergency_request',
    'request_update',
    'system'
);

CREATE TYPE notification_read_status AS ENUM (
    'unread',
    'read'
);

CREATE TYPE activity_event_type AS ENUM (
    'profile_completed',
    'availability_changed',
    'request_created',
    'notification_sent',
    'donor_accepted',
    'request_fulfilled',
    'request_cancelled',
    'request_expired'
);


-- ────────────────────────────────────────────────────────────
-- TABLE: profiles
--
-- One row per Clerk user. id = Clerk user ID (string).
-- blood_group is nullable on creation — set during onboarding.
-- ────────────────────────────────────────────────────────────

CREATE TABLE profiles (
    id                  text            PRIMARY KEY,
    full_name           text            NOT NULL,
    phone               text,
    blood_group         blood_group,
    is_donor            boolean         NOT NULL DEFAULT false,
    is_available_donor  boolean         NOT NULL DEFAULT false,
    city                text,
    profile_completed   boolean         NOT NULL DEFAULT false,
    -- PostGIS geography column. Accepts WKT strings on insert:
    -- e.g. 'POINT(77.5946 12.9716)' (lng lat order)
    location            geography(Point, 4326),
    latitude            double precision,
    longitude           double precision,
    last_donation_date  timestamptz,
    cooldown_until      timestamptz,
    is_verified         boolean         NOT NULL DEFAULT false,
    fcm_token           text,
    created_at          timestamptz     NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- TABLE: blood_requests
-- ────────────────────────────────────────────────────────────

CREATE TABLE blood_requests (
    id                  uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id        text            NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blood_group         blood_group     NOT NULL,
    units               integer         NOT NULL DEFAULT 1 CHECK (units BETWEEN 1 AND 20),
    patient_name        text,
    hospital_name       text            NOT NULL,
    city                text,
    contact_phone       text,
    urgency_level       urgency_level,
    location            geography(Point, 4326),
    latitude            double precision,
    longitude           double precision,
    status              request_status  NOT NULL DEFAULT 'searching',
    escalation_phase    smallint        NOT NULL DEFAULT 1 CHECK (escalation_phase BETWEEN 1 AND 3),
    notified_count      integer         NOT NULL DEFAULT 0,
    confirmed_count     integer         NOT NULL DEFAULT 0,
    -- Populated when request is fulfilled to record outcome
    donor_name          text,
    donor_phone         text,
    note                text,
    requester_relation  text,
    created_at          timestamptz     NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- TABLE: donor_responses
--
-- Unique constraint on (request_id, donor_id) prevents duplicate
-- responses. Used with ON CONFLICT ... DO UPDATE for upserts.
-- ────────────────────────────────────────────────────────────

CREATE TABLE donor_responses (
    id              uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      uuid                    NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    donor_id        text                    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status          donor_response_status   NOT NULL DEFAULT 'ACCEPTED',
    distance_meters double precision,
    eta_minutes     integer,
    responded_at    timestamptz             DEFAULT now(),
    created_at      timestamptz             NOT NULL DEFAULT now(),

    UNIQUE (request_id, donor_id)
);


-- ────────────────────────────────────────────────────────────
-- TABLE: notification_logs
--
-- Internal audit log of every alert sent (PUSH/SMS/WhatsApp).
-- donor_id is nullable — null means a blood bank was notified.
-- ────────────────────────────────────────────────────────────

CREATE TABLE notification_logs (
    id          uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  uuid                    NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    donor_id    text                    REFERENCES profiles(id) ON DELETE SET NULL,
    channel     notification_channel    NOT NULL DEFAULT 'PUSH',
    status      notification_log_status NOT NULL DEFAULT 'SENT',
    metadata    jsonb,
    created_at  timestamptz             NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- TABLE: notifications
--
-- In-app notifications displayed in the NotificationBell.
-- ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
    id          uuid                        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     text                        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    request_id  uuid                        REFERENCES blood_requests(id) ON DELETE SET NULL,
    title       text                        NOT NULL,
    message     text                        NOT NULL,
    type        notification_type           NOT NULL DEFAULT 'system',
    status      notification_read_status    NOT NULL DEFAULT 'unread',
    sent_at     timestamptz                 NOT NULL DEFAULT now(),
    read_at     timestamptz
);


-- ────────────────────────────────────────────────────────────
-- TABLE: activities
--
-- Audit/activity timeline shown on the dashboard.
-- ────────────────────────────────────────────────────────────

CREATE TABLE activities (
    id          uuid                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     text                NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    request_id  uuid                REFERENCES blood_requests(id) ON DELETE SET NULL,
    event_type  activity_event_type NOT NULL,
    description text                NOT NULL,
    created_at  timestamptz         NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- TABLE: blood_banks
--
-- Reference data for Phase 3 escalation alerts.
-- Populated manually or via seed script.
-- ────────────────────────────────────────────────────────────

CREATE TABLE blood_banks (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text        NOT NULL,
    address         text,
    city            text,
    phone           text,
    latitude        double precision,
    longitude       double precision,
    location        geography(Point, 4326),
    operating_hours text,
    created_at      timestamptz NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────

-- profiles
CREATE INDEX idx_profiles_blood_group ON profiles (blood_group);
CREATE INDEX idx_profiles_donor_flags ON profiles (is_donor, is_available_donor);
CREATE INDEX idx_profiles_location    ON profiles USING GIST (location);

-- blood_requests
CREATE INDEX idx_requests_requester   ON blood_requests (requester_id);
CREATE INDEX idx_requests_status      ON blood_requests (status);
CREATE INDEX idx_requests_blood_group ON blood_requests (blood_group);
CREATE INDEX idx_requests_created_at  ON blood_requests (created_at DESC);
CREATE INDEX idx_requests_location    ON blood_requests USING GIST (location);

-- donor_responses
CREATE INDEX idx_responses_request    ON donor_responses (request_id);
CREATE INDEX idx_responses_donor      ON donor_responses (donor_id);

-- notification_logs
CREATE INDEX idx_notif_logs_request   ON notification_logs (request_id);
CREATE INDEX idx_notif_logs_donor     ON notification_logs (donor_id, created_at DESC);

-- notifications
CREATE INDEX idx_notifications_user   ON notifications (user_id, status);

-- activities
CREATE INDEX idx_activities_user      ON activities (user_id, created_at DESC);
CREATE INDEX idx_activities_request   ON activities (request_id);

-- blood_banks
CREATE INDEX idx_blood_banks_location ON blood_banks USING GIST (location);


-- ────────────────────────────────────────────────────────────
-- FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Used by the FastAPI matching engine (v1 signature).
-- Returns all available donors within radius, unfiltered by blood group.
-- Caller filters by blood group in Python.
CREATE OR REPLACE FUNCTION find_nearby_donors(
    lat       double precision,
    lng       double precision,
    radius_km double precision
)
RETURNS TABLE (
    id              text,
    full_name       text,
    phone           text,
    blood_group     blood_group,
    distance_meters double precision
)
LANGUAGE sql STABLE
AS $$
    SELECT
        p.id,
        p.full_name,
        p.phone,
        p.blood_group,
        ST_Distance(
            p.location,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        ) AS distance_meters
    FROM profiles p
    WHERE
        p.is_donor            = true
        AND p.is_available_donor = true
        AND p.location        IS NOT NULL
        AND ST_DWithin(
            p.location,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_km * 1000
        )
    ORDER BY distance_meters ASC;
$$;


-- Used by the frontend AlertEngineService (v2 signature).
-- Filters by blood group at the DB level. Returns fcm_token for push.
CREATE OR REPLACE FUNCTION find_nearby_donors_v2(
    req_lat         double precision,
    req_lng         double precision,
    radius_km       double precision,
    req_blood_group text
)
RETURNS TABLE (
    id              text,
    full_name       text,
    phone           text,
    blood_group     blood_group,
    fcm_token       text,
    distance_meters double precision
)
LANGUAGE sql STABLE
AS $$
    SELECT
        p.id,
        p.full_name,
        p.phone,
        p.blood_group,
        p.fcm_token,
        ST_Distance(
            p.location,
            ST_SetSRID(ST_MakePoint(req_lng, req_lat), 4326)::geography
        ) AS distance_meters
    FROM profiles p
    WHERE
        p.is_donor              = true
        AND p.is_available_donor   = true
        AND p.blood_group          = req_blood_group::blood_group
        AND p.location             IS NOT NULL
        AND ST_DWithin(
            p.location,
            ST_SetSRID(ST_MakePoint(req_lng, req_lat), 4326)::geography,
            radius_km * 1000
        )
    ORDER BY distance_meters ASC;
$$;


-- Used in Phase 3 escalation to notify nearby blood banks.
CREATE OR REPLACE FUNCTION find_nearby_blood_banks(
    req_lat   double precision,
    req_lng   double precision,
    radius_km double precision
)
RETURNS TABLE (
    id              uuid,
    name            text,
    phone           text,
    distance_meters double precision
)
LANGUAGE sql STABLE
AS $$
    SELECT
        b.id,
        b.name,
        b.phone,
        ST_Distance(
            b.location,
            ST_SetSRID(ST_MakePoint(req_lng, req_lat), 4326)::geography
        ) AS distance_meters
    FROM blood_banks b
    WHERE
        b.location IS NOT NULL
        AND ST_DWithin(
            b.location,
            ST_SetSRID(ST_MakePoint(req_lng, req_lat), 4326)::geography,
            radius_km * 1000
        )
    ORDER BY distance_meters ASC;
$$;


-- Called by DonorService.submitDonorResponse() after a donor accepts.
-- Atomically increments confirmed_count and transitions status to
-- donor_accepted in one statement — eliminates the race condition in views.py.
CREATE OR REPLACE FUNCTION increment_confirmed_count(req_id uuid)
RETURNS void
LANGUAGE sql
AS $$
    UPDATE blood_requests
    SET
        confirmed_count = confirmed_count + 1,
        status = CASE
            WHEN status = 'searching' THEN 'donor_accepted'::request_status
            ELSE status
        END
    WHERE
        id = req_id
        AND status NOT IN ('fulfilled', 'cancelled', 'expired');
$$;


-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
--
-- NOTE: This project uses Clerk for authentication, not Supabase Auth.
-- For auth.uid() to work in RLS policies, configure Clerk as a JWT
-- provider in your Supabase project:
--   Dashboard → Settings → Auth → Third-party Auth → Add Clerk
-- Until that is configured, the service_role key (used by Django and
-- Next.js server routes) bypasses RLS automatically.
-- ────────────────────────────────────────────────────────────

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_responses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_banks       ENABLE ROW LEVEL SECURITY;


-- ── profiles ─────────────────────────────────────────────────

CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    USING (auth.uid()::text = id);

CREATE POLICY "profiles_insert_own"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid()::text = id);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (auth.uid()::text = id);


-- ── blood_requests ────────────────────────────────────────────
-- All authenticated users can read requests — donors need to see the
-- emergency board. Writes restricted to the requester.

CREATE POLICY "requests_select_authenticated"
    ON blood_requests FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "requests_insert_own"
    ON blood_requests FOR INSERT
    WITH CHECK (auth.uid()::text = requester_id);

CREATE POLICY "requests_update_own"
    ON blood_requests FOR UPDATE
    USING (auth.uid()::text = requester_id);

CREATE POLICY "requests_delete_own"
    ON blood_requests FOR DELETE
    USING (auth.uid()::text = requester_id);


-- ── donor_responses ───────────────────────────────────────────
-- Donors read/write their own responses.
-- Requesters can read responses on their own requests.

CREATE POLICY "responses_select"
    ON donor_responses FOR SELECT
    USING (
        auth.uid()::text = donor_id
        OR EXISTS (
            SELECT 1 FROM blood_requests r
            WHERE r.id = request_id
              AND r.requester_id = auth.uid()::text
        )
    );

CREATE POLICY "responses_insert_own"
    ON donor_responses FOR INSERT
    WITH CHECK (auth.uid()::text = donor_id);

CREATE POLICY "responses_update_own"
    ON donor_responses FOR UPDATE
    USING (auth.uid()::text = donor_id);


-- ── notification_logs ─────────────────────────────────────────
-- Writes are service-role only (alert engine).
-- Donors can read their own logs (used by CooldownService).

CREATE POLICY "notif_logs_select_own"
    ON notification_logs FOR SELECT
    USING (auth.uid()::text = donor_id);


-- ── notifications ─────────────────────────────────────────────

CREATE POLICY "notifications_select_own"
    ON notifications FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "notifications_update_own"
    ON notifications FOR UPDATE
    USING (auth.uid()::text = user_id);


-- ── activities ────────────────────────────────────────────────

CREATE POLICY "activities_select_own"
    ON activities FOR SELECT
    USING (auth.uid()::text = user_id);


-- ── blood_banks ───────────────────────────────────────────────
-- Public reference data — readable by everyone.

CREATE POLICY "blood_banks_select_all"
    ON blood_banks FOR SELECT
    USING (true);
