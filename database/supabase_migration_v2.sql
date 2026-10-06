-- ============================================================
-- BloodRelay V2 — Phase 1 Migration
-- Run this in Supabase SQL Editor against your live instance.
-- Safe to run on a fresh or existing database.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PART A: Normalize blood_requests.status to V2 enum values
-- ─────────────────────────────────────────────────────────────

-- Step 1: Migrate existing rows to V2 values.
-- 'fulfilled' and 'cancelled' already match — skipped in CASE branches.
UPDATE public.blood_requests
SET status = CASE
  WHEN status IN ('CREATED', 'open', 'SEARCHING', 'SEARCHING_FOR_DONORS') THEN 'searching'
  WHEN status IN ('DONOR_ACCEPTED')                                         THEN 'donor_accepted'
  WHEN status IN ('FULFILLED', 'COMPLETED')                                 THEN 'fulfilled'
  WHEN status IN ('CANCELLED')                                              THEN 'cancelled'
  WHEN status IN ('EXPIRED')                                                THEN 'expired'
  ELSE status
END
WHERE status NOT IN ('searching', 'donor_accepted', 'fulfilled', 'cancelled', 'expired');

-- Step 2: Drop the old permissive CHECK constraint.
ALTER TABLE public.blood_requests
  DROP CONSTRAINT IF EXISTS blood_requests_status_check;

-- Step 3: Add the strict V2 CHECK constraint.
ALTER TABLE public.blood_requests
  ADD CONSTRAINT blood_requests_status_check
  CHECK (status IN ('searching', 'donor_accepted', 'fulfilled', 'cancelled', 'expired'));

-- Step 4: Change the column DEFAULT to 'searching'.
ALTER TABLE public.blood_requests
  ALTER COLUMN status SET DEFAULT 'searching';

-- Step 5: Update the increment_confirmed_count RPC to use 'donor_accepted'.
CREATE OR REPLACE FUNCTION increment_confirmed_count(req_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.blood_requests
  SET confirmed_count = confirmed_count + 1,
      status = 'donor_accepted'
  WHERE id = req_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- PART B: Add missing profile fields
-- ─────────────────────────────────────────────────────────────

-- Add city column (nullable — existing users are unaffected).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text;

-- Add profile_completed flag (defaults false — existing users remain false).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;


-- ─────────────────────────────────────────────────────────────
-- PART C: Create activities table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id  uuid REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  event_type  text NOT NULL CHECK (event_type IN (
                'profile_completed',
                'availability_changed',
                'request_created',
                'notification_sent',
                'donor_accepted',
                'request_fulfilled',
                'request_cancelled',
                'request_expired'
              )),
  description text NOT NULL,
  created_at  timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Permissive for now — matches the pattern used on other tables.
CREATE POLICY "Allow read access to activities"   ON public.activities FOR SELECT USING (true);
CREATE POLICY "Allow insert into activities"      ON public.activities FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS activities_user_id_idx    ON public.activities (user_id);
CREATE INDEX IF NOT EXISTS activities_request_id_idx ON public.activities (request_id);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON public.activities (created_at DESC);


-- ─────────────────────────────────────────────────────────────
-- PART D: Create notifications table (user inbox)
-- Does NOT touch notification_logs — that table is untouched.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  title      text NOT NULL,
  message    text NOT NULL,
  type       text NOT NULL DEFAULT 'system'
               CHECK (type IN ('emergency_request', 'request_update', 'system')),
  status     text NOT NULL DEFAULT 'unread'
               CHECK (status IN ('unread', 'read')),
  sent_at    timestamp with time zone NOT NULL DEFAULT now(),
  read_at    timestamp with time zone
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to notifications"   ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow insert into notifications"      ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on notifications"        ON public.notifications FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx  ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_status_idx   ON public.notifications (status);
CREATE INDEX IF NOT EXISTS notifications_sent_at_idx  ON public.notifications (sent_at DESC);
