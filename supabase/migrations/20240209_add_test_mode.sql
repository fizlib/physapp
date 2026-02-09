-- Add test_mode_ends_at column to collections table
-- This stores when an active test mode expires for the collection

ALTER TABLE collections ADD COLUMN IF NOT EXISTS test_mode_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN collections.test_mode_ends_at IS 'When set, indicates the collection is in timed test mode. Students see a countdown timer and pointed exercises are unlocked until this time.';
