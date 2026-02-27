-- Add bonus_points column to enrollments table
-- Bonus points are added to a student's earned total without affecting max points
ALTER TABLE enrollments
ADD COLUMN bonus_points INTEGER DEFAULT 0 NOT NULL;
