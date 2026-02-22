-- Per-student participation for collection test sessions.
-- A row indicates that a student is allowed to take the test for the exact
-- collection test_mode_ends_at session timestamp.

CREATE TABLE IF NOT EXISTS public.collection_test_participants (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_mode_ends_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (collection_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_test_participants_collection_test_mode
ON public.collection_test_participants (collection_id, test_mode_ends_at);

CREATE INDEX IF NOT EXISTS idx_collection_test_participants_student_collection
ON public.collection_test_participants (student_id, collection_id);

ALTER TABLE public.collection_test_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage collection test participants"
ON public.collection_test_participants
USING (
  EXISTS (
    SELECT 1
    FROM public.collections
    JOIN public.classrooms ON classrooms.id = collections.classroom_id
    WHERE collections.id = collection_test_participants.collection_id
      AND classrooms.teacher_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.collections
    JOIN public.classrooms ON classrooms.id = collections.classroom_id
    WHERE collections.id = collection_test_participants.collection_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

CREATE POLICY "Students read own collection test participation"
ON public.collection_test_participants
FOR SELECT
USING ((select auth.uid()) = student_id);
