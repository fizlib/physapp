
-- Add type to classrooms
ALTER TABLE classrooms 
ADD COLUMN type TEXT CHECK (type IN ('private_student', 'school_class')) DEFAULT 'school_class';

-- Add category to assignments
ALTER TABLE assignments 
ADD COLUMN category TEXT CHECK (category IN ('homework', 'classwork')) DEFAULT 'homework';
