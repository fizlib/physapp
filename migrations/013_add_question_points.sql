-- Add points column to questions table for per-question points tracking
-- Default is 1 point per question

ALTER TABLE questions ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN questions.points IS 'Points value for this specific question (default 1). Used in points-enabled exercises.';
