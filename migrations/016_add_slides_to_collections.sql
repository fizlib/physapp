-- Add slides_url column to collections table
ALTER TABLE public.collections ADD COLUMN slides_url TEXT;

-- Create storage bucket for collection slides if it doesn't exist
-- Note: Bucket creation is usually done via Supabase Dashboard or API, 
-- but we can document the intent here.
