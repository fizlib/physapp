-- Fix lint issue: Function Search Path Mutable
-- Ensure SECURITY DEFINER trigger function has an explicit, stable search_path.
ALTER FUNCTION public.handle_new_user()
SET search_path = public, pg_temp;
