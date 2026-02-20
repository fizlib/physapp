-- Fix Supabase advisor lint: auth_rls_initplan (0003)
-- Replace direct auth function calls in RLS policies with initplan-friendly form.
-- Scope intentionally excludes multiple_permissive_policies (0006).

ALTER POLICY "Users can insert their own profile"
ON public.profiles
WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "Users can update own profile"
ON public.profiles
USING ((select auth.uid()) = id);

ALTER POLICY "Teachers can create classrooms"
ON public.classrooms
WITH CHECK (
  (select auth.uid()) IN (
    SELECT id
    FROM public.profiles
    WHERE role = 'teacher'
  )
);

ALTER POLICY "Teachers can view own classrooms"
ON public.classrooms
USING ((select auth.uid()) = teacher_id);

ALTER POLICY "Students can view their enrollments"
ON public.enrollments
USING ((select auth.uid()) = student_id);

ALTER POLICY "Students can join classrooms"
ON public.enrollments
WITH CHECK ((select auth.uid()) = student_id);

ALTER POLICY "Students can view enrolled classrooms"
ON public.classrooms
USING (
  EXISTS (
    SELECT 1
    FROM public.enrollments
    WHERE enrollments.classroom_id = classrooms.id
      AND enrollments.student_id = (select auth.uid())
  )
);

ALTER POLICY "Teachers can manage assignments"
ON public.assignments
USING (
  EXISTS (
    SELECT 1
    FROM public.classrooms
    WHERE classrooms.id = assignments.classroom_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

ALTER POLICY "Teachers can manage questions"
ON public.questions
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments
    JOIN public.classrooms ON assignments.classroom_id = classrooms.id
    WHERE assignments.id = questions.assignment_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

ALTER POLICY "Students can create submissions"
ON public.submissions
WITH CHECK ((select auth.uid()) = student_id);

ALTER POLICY "Students can view own submissions"
ON public.submissions
USING ((select auth.uid()) = student_id);

ALTER POLICY "Teachers can view submissions"
ON public.submissions
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments
    JOIN public.classrooms ON assignments.classroom_id = classrooms.id
    WHERE assignments.id = submissions.assignment_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

ALTER POLICY "Teachers can update own classrooms"
ON public.classrooms
USING ((select auth.uid()) = teacher_id);

ALTER POLICY "Admins can manage site settings"
ON public.site_settings
USING (
  (select auth.uid()) IN (
    SELECT id
    FROM public.profiles
    WHERE role = 'teacher'
      AND is_admin = true
  )
)
WITH CHECK (
  (select auth.uid()) IN (
    SELECT id
    FROM public.profiles
    WHERE role = 'teacher'
      AND is_admin = true
  )
);

ALTER POLICY "Teachers can delete own classrooms"
ON public.classrooms
USING ((select auth.uid()) = teacher_id);

ALTER POLICY "Admins can manage ip_bypasses"
ON public.ip_bypasses
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
  )
);

ALTER POLICY "Users can view their own bypasses"
ON public.ip_bypasses
USING ((select auth.uid()) = user_id);

ALTER POLICY "Teachers can delete submissions"
ON public.submissions
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments
    JOIN public.classrooms ON assignments.classroom_id = classrooms.id
    WHERE assignments.id = submissions.assignment_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

ALTER POLICY "Users can view own progress"
ON public.assignment_progress
USING ((select auth.uid()) = student_id);

ALTER POLICY "Users can insert own progress"
ON public.assignment_progress
WITH CHECK ((select auth.uid()) = student_id);

ALTER POLICY "Users can update own progress"
ON public.assignment_progress
USING ((select auth.uid()) = student_id);

ALTER POLICY "Students can view enrolled assignments"
ON public.assignments
USING (
  (published = true OR collection_id IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM public.enrollments
    WHERE enrollments.classroom_id = assignments.classroom_id
      AND enrollments.student_id = (select auth.uid())
  )
);

ALTER POLICY "Students can view questions for assignments"
ON public.questions
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments
    JOIN public.enrollments ON assignments.classroom_id = enrollments.classroom_id
    WHERE assignments.id = questions.assignment_id
      AND enrollments.student_id = (select auth.uid())
      AND (assignments.published = true OR assignments.collection_id IS NOT NULL)
  )
);

ALTER POLICY "Users can view own solution reveal events"
ON public.solution_reveal_events
USING ((select auth.uid()) = student_id);

ALTER POLICY "Users can insert own solution reveal events"
ON public.solution_reveal_events
WITH CHECK ((select auth.uid()) = student_id);

ALTER POLICY "Users can view own homework submission events"
ON public.homework_submission_events
USING ((select auth.uid()) = student_id);

ALTER POLICY "Users can insert own homework submission events"
ON public.homework_submission_events
WITH CHECK ((select auth.uid()) = student_id);

ALTER POLICY "Teachers can view homework submission events for own assignment"
ON public.homework_submission_events
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments
    JOIN public.classrooms ON assignments.classroom_id = classrooms.id
    WHERE assignments.id = homework_submission_events.assignment_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

ALTER POLICY "Teachers manage collections"
ON public.collections
USING (
  EXISTS (
    SELECT 1
    FROM public.classrooms
    WHERE classrooms.id = collections.classroom_id
      AND classrooms.teacher_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.classrooms
    WHERE classrooms.id = collections.classroom_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

ALTER POLICY "Students read enrolled collections"
ON public.collections
USING (
  EXISTS (
    SELECT 1
    FROM public.enrollments
    WHERE enrollments.classroom_id = collections.classroom_id
      AND enrollments.student_id = (select auth.uid())
  )
);
