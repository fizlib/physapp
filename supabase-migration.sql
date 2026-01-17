-- Add MCQ support to questions table
ALTER TABLE questions 
ADD COLUMN options JSONB,
ADD COLUMN correct_answer TEXT;

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'questions';
