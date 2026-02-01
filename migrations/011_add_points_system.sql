-- Add points system to assignments and assignment_progress tables
-- Points are per-exercise, only for classwork collections

-- Step 1: Add points_enabled and points to assignments table
ALTER TABLE assignments 
ADD COLUMN points_enabled BOOLEAN DEFAULT false,
ADD COLUMN points INTEGER DEFAULT 1;

-- Step 2: Add earned_points and submitted_answer to assignment_progress table
ALTER TABLE assignment_progress
ADD COLUMN earned_points INTEGER,
ADD COLUMN submitted_answer TEXT;

-- Optional: Add index for querying point-enabled assignments
CREATE INDEX idx_assignments_points_enabled ON assignments (points_enabled) WHERE points_enabled = true;
