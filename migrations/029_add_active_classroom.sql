-- ============================================================
-- 029: Multi-classroom enrollment with active classroom
-- ============================================================

-- 1. Add is_active_classroom column
ALTER TABLE public.enrollments
ADD COLUMN is_active_classroom BOOLEAN NOT NULL DEFAULT false;

-- 2. Auto-activate raw inserts when the student has no active classroom.
--    SECURITY DEFINER keeps the invariant reliable for inserts that bypass
--    teacher/student RLS checks, such as service-role imports.
CREATE OR REPLACE FUNCTION public.set_active_classroom_on_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active_classroom = false
     AND NOT EXISTS (
       SELECT 1
       FROM enrollments
       WHERE student_id = NEW.student_id
         AND is_active_classroom = true
     ) THEN
    NEW.is_active_classroom := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_active_classroom_on_insert
BEFORE INSERT ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.set_active_classroom_on_insert();

-- 3. Partial unique index: at most one active classroom per student
CREATE UNIQUE INDEX idx_one_active_per_student
ON public.enrollments (student_id)
WHERE is_active_classroom = true;

-- 4. Backfill: mark earliest enrollment per student as active
UPDATE public.enrollments SET is_active_classroom = true
WHERE id IN (
  SELECT DISTINCT ON (student_id) id
  FROM public.enrollments
  ORDER BY student_id, created_at ASC, id ASC
);

-- 5. Auto-promote trigger: when an active enrollment is deleted,
--    promote the oldest remaining enrollment for that student.
--    SECURITY DEFINER because the remaining enrollment may belong
--    to another teacher's classroom (bypassing teacher RLS).
CREATE OR REPLACE FUNCTION public.promote_active_classroom()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_active_classroom = true THEN
    UPDATE enrollments
    SET is_active_classroom = true
    WHERE id = (
      SELECT id FROM enrollments
      WHERE student_id = OLD.student_id
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_promote_active_classroom
AFTER DELETE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.promote_active_classroom();

-- 6. RPC: set_active_classroom
--    Only callable by the teacher who owns p_classroom_id.
--    Verifies student is enrolled and has student role.
CREATE OR REPLACE FUNCTION public.set_active_classroom(
  p_student_id UUID,
  p_classroom_id UUID
)
RETURNS TABLE (success BOOLEAN, message TEXT)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is teacher of p_classroom_id
  IF NOT public.is_teacher_of_classroom(p_classroom_id) THEN
    RETURN QUERY SELECT false, 'Unauthorized: you do not own this classroom.';
    RETURN;
  END IF;

  -- Verify p_student_id is a student
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_student_id AND role = 'student') THEN
    RETURN QUERY SELECT false, 'User is not a student.';
    RETURN;
  END IF;

  -- Verify student is enrolled in this classroom
  IF NOT EXISTS (SELECT 1 FROM enrollments WHERE student_id = p_student_id AND classroom_id = p_classroom_id) THEN
    RETURN QUERY SELECT false, 'Student is not enrolled in this classroom.';
    RETURN;
  END IF;

  -- Unset all active flags for this student
  UPDATE enrollments SET is_active_classroom = false WHERE student_id = p_student_id AND is_active_classroom = true;

  -- Set the target classroom as active
  UPDATE enrollments SET is_active_classroom = true WHERE student_id = p_student_id AND classroom_id = p_classroom_id;

  RETURN QUERY SELECT true, 'Active classroom updated successfully.';
END;
$$ LANGUAGE plpgsql;

-- 7. RPC: get_students_not_in_classroom
--    Returns all student profiles not enrolled in the given classroom.
--    Caller must be teacher of the classroom.
CREATE OR REPLACE FUNCTION public.get_students_not_in_classroom(
  p_classroom_id UUID
)
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
  -- Verify caller is teacher of p_classroom_id
  IF NOT public.is_teacher_of_classroom(p_classroom_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.email, p.created_at
  FROM profiles p
  WHERE p.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.student_id = p.id AND e.classroom_id = p_classroom_id
  )
  ORDER BY p.last_name ASC, p.first_name ASC;
END;
$$ LANGUAGE plpgsql;

-- 8. Drop the old get_unassigned_students function
DROP FUNCTION IF EXISTS public.get_unassigned_students();

-- 9. Update enroll_student RPC
--    - Verify caller is teacher of p_classroom_id
--    - Verify p_student_id has role = 'student'
--    - Self-healing: set active if student has no active enrollment
CREATE OR REPLACE FUNCTION public.enroll_student(
  p_student_id UUID,
  p_classroom_id UUID
)
RETURNS TABLE (success BOOLEAN, message TEXT)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_active BOOLEAN;
BEGIN
  -- Verify caller is teacher of p_classroom_id
  IF NOT public.is_teacher_of_classroom(p_classroom_id) THEN
    RETURN QUERY SELECT false, 'Unauthorized: you do not own this classroom.';
    RETURN;
  END IF;

  -- Verify p_student_id is a student
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_student_id AND role = 'student') THEN
    RETURN QUERY SELECT false, 'User is not a student.';
    RETURN;
  END IF;

  -- Check if already enrolled
  IF EXISTS (SELECT 1 FROM enrollments WHERE student_id = p_student_id AND classroom_id = p_classroom_id) THEN
    RETURN QUERY SELECT false, 'Student already enrolled.';
    RETURN;
  END IF;

  -- Check if student has any active enrollment
  SELECT EXISTS (
    SELECT 1 FROM enrollments WHERE student_id = p_student_id AND is_active_classroom = true
  ) INTO v_has_active;

  -- Insert enrollment, set active if none exists (self-healing)
  INSERT INTO enrollments (student_id, classroom_id, is_active_classroom)
  VALUES (p_student_id, p_classroom_id, NOT v_has_active);

  RETURN QUERY SELECT true, 'Student enrolled successfully.';
END;
$$ LANGUAGE plpgsql;

-- 10. Update add_student_by_email RPC
--    - Verify caller is teacher of p_course_id
--    - Self-healing active classroom logic
CREATE OR REPLACE FUNCTION public.add_student_by_email(
  p_course_id UUID,
  p_email TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_profile_role TEXT;
  v_has_active BOOLEAN;
BEGIN
  -- Verify caller is teacher of p_course_id
  IF NOT public.is_teacher_of_classroom(p_course_id) THEN
    RETURN QUERY SELECT false, 'Unauthorized: you do not own this classroom.';
    RETURN;
  END IF;

  -- Find the User ID from the email
  SELECT au.id INTO v_student_id
  FROM auth.users au
  WHERE au.email = p_email;

  IF v_student_id IS NULL THEN
    RETURN QUERY SELECT false, 'Student email not found.';
    RETURN;
  END IF;

  -- Verify the user is actually a student
  SELECT role INTO v_profile_role
  FROM profiles
  WHERE profiles.id = v_student_id;

  IF v_profile_role <> 'student' THEN
    RETURN QUERY SELECT false, 'User is not a student.';
    RETURN;
  END IF;

  -- Check if already enrolled
  IF EXISTS (SELECT 1 FROM enrollments WHERE student_id = v_student_id AND classroom_id = p_course_id) THEN
    RETURN QUERY SELECT false, 'Student already enrolled.';
    RETURN;
  END IF;

  -- Check if student has any active enrollment
  SELECT EXISTS (
    SELECT 1 FROM enrollments WHERE student_id = v_student_id AND is_active_classroom = true
  ) INTO v_has_active;

  -- Enroll the student, set active if none exists
  INSERT INTO enrollments (student_id, classroom_id, is_active_classroom)
  VALUES (v_student_id, p_course_id, NOT v_has_active);

  RETURN QUERY SELECT true, 'Student added successfully.';
END;
$$ LANGUAGE plpgsql;
