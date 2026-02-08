-- Add scheduled_end_at to collections table
ALTER TABLE collections ADD COLUMN scheduled_end_at TIMESTAMP WITH TIME ZONE;
