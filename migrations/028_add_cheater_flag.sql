-- Add per-classroom cheater flag to enrollments table
-- When is_cheater = true, exercise points display as 0 for the student
-- Bonus points are unaffected. No data is deleted.
-- The flag is enrollment-scoped: transferring to a new classroom resets it.
ALTER TABLE enrollments
ADD COLUMN is_cheater BOOLEAN DEFAULT false NOT NULL;
