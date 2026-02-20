-- Seed default site setting for virtual keyboard toggle visibility
INSERT INTO public.site_settings (key, value)
VALUES ('virtual_keyboard_toggle_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
