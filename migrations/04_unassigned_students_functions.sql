-- RPC: Get Unassigned Students
-- Returns a list of students who are not enrolled in ANY classroom
CREATE OR REPLACE FUNCTION public.get_unassigned_students()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.email, p.created_at
  FROM profiles p
  WHERE p.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM enrollments e WHERE e.student_id = p.id
  )
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- RPC: Enroll Student
-- Enrolls a student into a classroom by ID directly
CREATE OR REPLACE FUNCTION public.enroll_student(
  p_student_id UUID,
  p_classroom_id UUID
)
RETURNS TABLE (success BOOLEAN, message TEXT)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if already enrolled
  IF EXISTS (SELECT 1 FROM enrollments WHERE student_id = p_student_id AND classroom_id = p_classroom_id) THEN
    RETURN QUERY SELECT false, 'Student already enrolled.';
    RETURN;
  END IF;

  INSERT INTO enrollments (student_id, classroom_id)
  VALUES (p_student_id, p_classroom_id);

  RETURN QUERY SELECT true, 'Student enrolled successfully.';
END;
$$ LANGUAGE plpgsql;
