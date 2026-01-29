-- Add revealed_question_indices column to assignment_progress table
ALTER TABLE assignment_progress 
ADD COLUMN revealed_question_indices INTEGER[] DEFAULT '{}';

COMMENT ON COLUMN assignment_progress.revealed_question_indices IS 'Array of question indices where the student has revealed the solution.';
