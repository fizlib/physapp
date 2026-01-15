-- Migration: Add RLS policies for teachers to manage enrollments

-- 1. Allow teachers to view enrollments for their classrooms
CREATE POLICY "Teachers can view enrollments"
ON enrollments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM classrooms
    WHERE classrooms.id = enrollments.classroom_id
    AND classrooms.teacher_id = auth.uid()
  )
);

-- 2. Allow teachers to delete enrollments (remove students)
CREATE POLICY "Teachers can delete enrollments"
ON enrollments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM classrooms
    WHERE classrooms.id = enrollments.classroom_id
    AND classrooms.teacher_id = auth.uid()
  )
);
