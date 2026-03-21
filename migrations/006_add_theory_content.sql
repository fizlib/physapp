-- Add theory content columns to assignments table
-- Theory exercises display read-only text + optional image to students (no questions)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS theory_content TEXT DEFAULT NULL;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS theory_image_url TEXT DEFAULT NULL;
