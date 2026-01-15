-- Migration: Add email to profiles
-- 1. Add email column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill email from auth.users (This requires privileges to read auth.users)
-- NOTE: If you run this in the Supabase SQL Editor, it usually has access.
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id
AND public.profiles.email IS NULL;

-- 3. Update RLS policies (optional, but good practice if we want to filter by email later)
-- For now, existing policies on profiles are fine.
