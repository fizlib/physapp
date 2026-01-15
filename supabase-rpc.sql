-- RPC: Add Student by Email
-- This function allows adding a student to a classroom using their email.
-- It must be SECURITY DEFINER to look up the email in auth.users.

CREATE OR REPLACE FUNCTION public.add_student_by_email(
  p_course_id UUID,
  p_email TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT) 
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_profile_role TEXT;
BEGIN
  -- 1. Find the User ID from the email
  SELECT id INTO v_student_id
  FROM auth.users
  WHERE email = p_email;

  IF v_student_id IS NULL THEN
    RETURN QUERY SELECT false, 'Student email not found.';
    RETURN;
  END IF;

  -- 2. Verify the user is actually a student
  SELECT role INTO v_profile_role
  FROM public.profiles
  WHERE id = v_student_id;

  IF v_profile_role <> 'student' THEN
    RETURN QUERY SELECT false, 'User is not a student.';
    RETURN;
  END IF;

  -- 3. Check if already enrolled
  IF EXISTS (SELECT 1 FROM public.enrollments WHERE student_id = v_student_id AND classroom_id = p_course_id) THEN
    RETURN QUERY SELECT false, 'Student already enrolled.';
    RETURN;
  END IF;

  -- 4. Enroll the student
  INSERT INTO public.enrollments (student_id, classroom_id)
  VALUES (v_student_id, p_course_id);

  RETURN QUERY SELECT true, 'Student added successfully.';
END;
$$ LANGUAGE plpgsql;

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
