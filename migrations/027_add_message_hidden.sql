-- Add is_hidden column to student_messages (for dismiss/hide functionality)
ALTER TABLE student_messages ADD COLUMN is_hidden BOOLEAN DEFAULT false;
