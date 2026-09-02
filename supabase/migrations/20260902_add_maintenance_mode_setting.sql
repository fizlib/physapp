-- Keep the site available by default. Admins can enable this from Site Settings.
INSERT INTO public.site_settings (key, value)
VALUES ('maintenance_mode_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
