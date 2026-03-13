-- Add info_button_color column for information collection button styling
-- Values: 'neutral' (default) or 'red'
ALTER TABLE collections ADD COLUMN IF NOT EXISTS info_button_color TEXT DEFAULT 'neutral';
