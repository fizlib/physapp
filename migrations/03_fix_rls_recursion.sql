-- Migration: Fix RLS Infinite Recursion
-- The previous policies created a circular dependency:
-- Classrooms -> Enrollments -> Classrooms (via RLS)

-- 1. Create a SECURITY DEFINER function to check classroom ownership
-- This function bypasses RLS on the classrooms table, breaking the loop.
CREATE OR REPLACE FUNCTION public.is_teacher_of_classroom(p_classroom_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public -- Secure search path
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM classrooms 
    WHERE id = p_classroom_id 
    AND teacher_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Teachers can view enrollments" ON enrollments;
DROP POLICY IF EXISTS "Teachers can delete enrollments" ON enrollments;

-- 3. Re-create policies using the standard function
CREATE POLICY "Teachers can view enrollments"
ON enrollments FOR SELECT USING (
  public.is_teacher_of_classroom(classroom_id)
);

CREATE POLICY "Teachers can delete enrollments"
ON enrollments FOR DELETE USING (
  public.is_teacher_of_classroom(classroom_id)
);
