-- Add IP restriction columns to classrooms table
ALTER TABLE classrooms
ADD COLUMN allowed_ip TEXT,
ADD COLUMN ip_check_enabled BOOLEAN DEFAULT TRUE;
