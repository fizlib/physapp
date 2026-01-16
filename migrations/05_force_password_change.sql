-- Add must_change_password column to profiles table
ALTER TABLE profiles 
ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE;
