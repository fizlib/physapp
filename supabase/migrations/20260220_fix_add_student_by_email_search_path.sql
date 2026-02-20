-- Fix lint issue: Function Search Path Mutable
-- Ensure SECURITY DEFINER function has an explicit, stable search_path.
ALTER FUNCTION public.add_student_by_email(uuid, text)
SET search_path = public, auth, pg_temp;
