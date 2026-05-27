-- Add optional ordered questions to random group assignments.

ALTER TABLE public.random_group_batches
ADD COLUMN IF NOT EXISTS questions_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.random_group_members
ADD COLUMN IF NOT EXISTS assigned_questions JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.random_group_question_sets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  questions_key TEXT NOT NULL,
  question_count INTEGER NOT NULL CHECK (question_count >= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (teacher_id, questions_key)
);

CREATE INDEX IF NOT EXISTS idx_random_group_question_sets_teacher_used
ON public.random_group_question_sets (teacher_id, last_used_at DESC);

ALTER TABLE public.random_group_question_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read own random group question sets"
ON public.random_group_question_sets
FOR SELECT
USING ((select auth.uid()) = teacher_id);

CREATE POLICY "Teachers create own random group question sets"
ON public.random_group_question_sets
FOR INSERT
WITH CHECK ((select auth.uid()) = teacher_id);

CREATE POLICY "Teachers update own random group question sets"
ON public.random_group_question_sets
FOR UPDATE
USING ((select auth.uid()) = teacher_id)
WITH CHECK ((select auth.uid()) = teacher_id);
