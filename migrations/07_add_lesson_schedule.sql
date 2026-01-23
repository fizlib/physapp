-- Migration: Add lesson schedule to classrooms and scheduled_date to collections
-- This migration enables teachers to define recurring lesson times for school classrooms
-- and schedule classwork collections to specific dates/times

-- Add lesson_schedule JSONB column to classrooms table
-- Format: [{"day": 1, "time": "09:00"}, {"day": 3, "time": "14:30"}]
-- day: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
ALTER TABLE classrooms 
ADD COLUMN lesson_schedule JSONB DEFAULT NULL;

-- Add scheduled_date column to collections table
-- Stores the specific date and time when a classwork collection is scheduled
ALTER TABLE collections 
ADD COLUMN scheduled_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient querying of scheduled collections by date
CREATE INDEX idx_collections_scheduled_date ON collections (scheduled_date) WHERE scheduled_date IS NOT NULL;
