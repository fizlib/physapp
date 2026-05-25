-- Add random group assignment history and separate student popup notifications.

CREATE TABLE IF NOT EXISTS public.random_group_batches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  group_size INTEGER NOT NULL CHECK (group_size >= 2),
  leftover_strategy TEXT NOT NULL CHECK (leftover_strategy IN ('smaller_group', 'distribute')),
  selected_count INTEGER NOT NULL CHECK (selected_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_random_group_batches_classroom_created
ON public.random_group_batches (classroom_id, created_at DESC);

ALTER TABLE public.random_group_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read own random group batches"
ON public.random_group_batches
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.classrooms
    WHERE classrooms.id = random_group_batches.classroom_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

CREATE POLICY "Teachers create own random group batches"
ON public.random_group_batches
FOR INSERT
WITH CHECK (
  teacher_id = (select auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.classrooms
    WHERE classrooms.id = random_group_batches.classroom_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

CREATE TABLE IF NOT EXISTS public.random_group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  batch_id UUID REFERENCES public.random_group_batches(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_number INTEGER NOT NULL CHECK (group_number >= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(batch_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_random_group_members_batch_group
ON public.random_group_members (batch_id, group_number);

CREATE INDEX IF NOT EXISTS idx_random_group_members_student
ON public.random_group_members (student_id, created_at DESC);

ALTER TABLE public.random_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read own random group members"
ON public.random_group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.random_group_batches
    JOIN public.classrooms ON classrooms.id = random_group_batches.classroom_id
    WHERE random_group_batches.id = random_group_members.batch_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

CREATE POLICY "Students read own random group memberships"
ON public.random_group_members
FOR SELECT
USING ((select auth.uid()) = student_id);

CREATE POLICY "Teachers create own random group members"
ON public.random_group_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.random_group_batches
    JOIN public.classrooms ON classrooms.id = random_group_batches.classroom_id
    WHERE random_group_batches.id = random_group_members.batch_id
      AND classrooms.teacher_id = (select auth.uid())
  )
);

CREATE TABLE IF NOT EXISTS public.student_popup_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.random_group_batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_popup_notifications_unseen
ON public.student_popup_notifications (student_id, created_at ASC)
WHERE seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_popup_notifications_batch
ON public.student_popup_notifications (batch_id);

ALTER TABLE public.student_popup_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own popup notifications"
ON public.student_popup_notifications
FOR SELECT
USING ((select auth.uid()) = student_id);

CREATE POLICY "Students update own popup notifications"
ON public.student_popup_notifications
FOR UPDATE
USING ((select auth.uid()) = student_id)
WITH CHECK ((select auth.uid()) = student_id);
