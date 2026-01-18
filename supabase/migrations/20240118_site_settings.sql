-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Insert default setting for registration
INSERT INTO public.site_settings (key, value)
VALUES ('registration_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Policies
-- Allow admins to read/write settings
CREATE POLICY "Admins can manage site settings"
ON public.site_settings
FOR ALL
USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'teacher' AND is_admin = true)
);

-- Allow everyone to read settings (needed for login page)
CREATE POLICY "Public can read site settings"
ON public.site_settings
FOR SELECT
USING (true);
