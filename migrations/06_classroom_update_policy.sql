-- Allow teachers to update their own classrooms
CREATE POLICY "Teachers can update own classrooms"
ON classrooms FOR UPDATE USING (
  auth.uid() = teacher_id
);
