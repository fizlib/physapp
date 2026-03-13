-- Add 'information' to the category CHECK constraint on collections table
-- and add info_content column for information page content

-- 1. Drop existing CHECK constraint on category
ALTER TABLE collections DROP CONSTRAINT IF EXISTS collections_category_check;

-- 2. Re-create with 'information' included
ALTER TABLE collections ADD CONSTRAINT collections_category_check 
  CHECK (category IN ('homework', 'classwork', 'information'));

-- 3. Add info_content column for storing information page content
ALTER TABLE collections ADD COLUMN IF NOT EXISTS info_content TEXT;
