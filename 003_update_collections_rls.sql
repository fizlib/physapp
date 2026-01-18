-- Drop existing policy
DROP POLICY IF EXISTS "Students can view enrolled assignments" ON assignments;

-- Recreate policy to allow published OR collection-based assignments
CREATE POLICY "Students can view enrolled assignments"
ON assignments FOR SELECT USING (
  (published = true OR collection_id IS NOT NULL) AND
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.classroom_id = assignments.classroom_id
    AND enrollments.student_id = auth.uid()
  )
);

-- Drop existing policy for questions
DROP POLICY IF EXISTS "Students can view questions for assignments" ON questions;

-- Recreate policy for questions
CREATE POLICY "Students can view questions for assignments"
ON questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN enrollments ON assignments.classroom_id = enrollments.classroom_id
    WHERE assignments.id = questions.assignment_id
    AND enrollments.student_id = auth.uid()
    AND (assignments.published = true OR assignments.collection_id IS NOT NULL)
  )
);
