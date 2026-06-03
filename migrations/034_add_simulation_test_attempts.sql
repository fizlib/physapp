-- Store standalone scored simulation attempts.
CREATE TABLE IF NOT EXISTS public.simulation_test_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  simulation_id TEXT NOT NULL,
  question_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_index INTEGER NOT NULL DEFAULT 0,
  current_question_started_at TIMESTAMP WITH TIME ZONE,
  current_question_deadline_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  earned_points INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_simulation_test_attempts_assignment
ON public.simulation_test_attempts (assignment_id);

CREATE INDEX IF NOT EXISTS idx_simulation_test_attempts_student
ON public.simulation_test_attempts (student_id);

ALTER TABLE public.simulation_test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own simulation attempts"
ON public.simulation_test_attempts
FOR SELECT
USING ((select auth.uid()) = student_id);

CREATE POLICY "Students create own simulation attempts"
ON public.simulation_test_attempts
FOR INSERT
WITH CHECK ((select auth.uid()) = student_id);

CREATE POLICY "Students update own simulation attempts"
ON public.simulation_test_attempts
FOR UPDATE
USING ((select auth.uid()) = student_id)
WITH CHECK ((select auth.uid()) = student_id);

CREATE POLICY "Teachers manage classroom simulation attempts"
ON public.simulation_test_attempts
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.assignments
    JOIN public.classrooms ON classrooms.id = assignments.classroom_id
    WHERE assignments.id = simulation_test_attempts.assignment_id
      AND classrooms.teacher_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.assignments
    JOIN public.classrooms ON classrooms.id = assignments.classroom_id
    WHERE assignments.id = simulation_test_attempts.assignment_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);
