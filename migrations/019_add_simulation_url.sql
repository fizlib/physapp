-- Add simulation_url column to assignments table
-- When this column is set, the exercise is a simulation exercise (no questions needed)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS simulation_url TEXT DEFAULT NULL;
