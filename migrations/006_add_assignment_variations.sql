-- Add required_variations_count to assignments table
ALTER TABLE assignments 
ADD COLUMN required_variations_count INTEGER DEFAULT NULL;

-- Comment: If NULL or 0, it's a standard assignment. 
-- If > 0, it indicates the number of correct answers needed to pass.
