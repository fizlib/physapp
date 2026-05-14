-- Allow teachers to keep a student's submitted exercise answers but exclude
-- the earned score for that exercise from effective grade totals.
ALTER TABLE assignment_progress
ADD COLUMN IF NOT EXISTS points_disabled_by_teacher BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN assignment_progress.points_disabled_by_teacher IS 'When true, this progress row earns 0 effective points for grade totals while preserving raw earned_points.';
