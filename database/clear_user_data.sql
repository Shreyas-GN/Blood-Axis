-- ─────────────────────────────────────────────────────────────
-- BloodRelay: Clear All User Data (Fresh Start)
-- Run this in Supabase SQL Editor to wipe out all user-generated data.
-- ─────────────────────────────────────────────────────────────

-- Disable triggers temporarily to avoid foreign key / check constraints firing
SET session_replication_role = 'replica';

-- Truncate all user data tables
TRUNCATE TABLE public.donor_responses CASCADE;
TRUNCATE TABLE public.notification_logs CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.activities CASCADE;
TRUNCATE TABLE public.blood_requests CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- Optional: Truncate blood banks if you want a completely empty database
-- TRUNCATE TABLE public.blood_banks CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Note: To completely reset authentication users in Supabase:
-- Run the following in the SQL Editor:
-- DELETE FROM auth.users;
