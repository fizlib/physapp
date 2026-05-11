-- New classrooms should start with IP access control disabled.
ALTER TABLE classrooms
ALTER COLUMN ip_check_enabled SET DEFAULT FALSE;
