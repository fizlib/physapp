-- Add category column to collections table
ALTER TABLE collections 
ADD COLUMN category TEXT CHECK (category IN ('homework', 'classwork')) DEFAULT 'homework';

-- Optional: Update existing collections to have a default category if needed
-- UPDATE collections SET category = 'homework' WHERE category IS NULL;
