
-- Allow teachers to delete their own classrooms
CREATE POLICY "Teachers can delete own classrooms"
ON classrooms FOR DELETE USING (
  auth.uid() = teacher_id
);

-- Allow teachers to delete submissions for their assignments (needed for cascade delete)
CREATE POLICY "Teachers can delete submissions"
ON submissions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN classrooms ON assignments.classroom_id = classrooms.id
    WHERE assignments.id = submissions.assignment_id
    AND classrooms.teacher_id = auth.uid()
  )
);
