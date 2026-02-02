-- Add per-part points tracking for multi-part exercises
-- Allows tracking submitted answers and earned points per question/part

-- Add JSONB column for per-question submitted answers
-- Format: { "question_id": "submitted_answer_string", ... }
ALTER TABLE assignment_progress
ADD COLUMN submitted_answers JSONB DEFAULT '{}';

-- Add JSONB column for per-question earned points
-- Format: { "question_id": earned_points_integer, ... }
ALTER TABLE assignment_progress
ADD COLUMN earned_points_per_part JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN assignment_progress.submitted_answers IS 'Map of question_id to submitted answer string for per-part tracking';
COMMENT ON COLUMN assignment_progress.earned_points_per_part IS 'Map of question_id to earned points integer for per-part scoring';
