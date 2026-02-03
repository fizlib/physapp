-- Create table to track our gemini keys
CREATE TABLE IF NOT EXISTS public.gemini_keys (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    label text NOT NULL,
    api_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS for gemini_keys (Disable all access by default)
ALTER TABLE public.gemini_keys ENABLE ROW LEVEL SECURITY;

-- Note: No standard RLS policies mean even authenticated users can't SELECT/INSERT/UPDATE directly.
-- We will use SECURITY DEFINER functions to manage the keys.

-- Function to add a key securely
CREATE OR REPLACE FUNCTION public.add_gemini_key(key_text text, label_text text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_key_id uuid;
BEGIN
    -- Insert directly into our table
    INSERT INTO public.gemini_keys (api_key, label)
    VALUES (key_text, label_text)
    RETURNING id INTO new_key_id;

    RETURN new_key_id;
END;
$$;

-- Function to get keys
CREATE OR REPLACE FUNCTION public.get_gemini_keys()
RETURNS TABLE (id uuid, label text, api_key text, created_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        id, 
        label, 
        api_key,
        created_at
    FROM public.gemini_keys
    ORDER BY created_at DESC;
$$;

-- Function to delete a key
CREATE OR REPLACE FUNCTION public.delete_gemini_key(key_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.gemini_keys WHERE id = key_id;
END;
$$;

-- Grant access to authenticated users (restricted by server-side logic in the app)
GRANT EXECUTE ON FUNCTION public.add_gemini_key(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gemini_keys() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_gemini_key(uuid) TO authenticated;
