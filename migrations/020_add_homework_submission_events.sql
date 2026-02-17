-- Track each explicit homework answer submission as an immutable event row.
CREATE TABLE IF NOT EXISTS public.homework_submission_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL CHECK (question_index >= 0),
    submitted_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.homework_submission_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own homework submission events"
ON public.homework_submission_events FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Users can insert own homework submission events"
ON public.homework_submission_events FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can view homework submission events for own assignments"
ON public.homework_submission_events FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.assignments
        JOIN public.classrooms ON assignments.classroom_id = classrooms.id
        WHERE assignments.id = homework_submission_events.assignment_id
            AND classrooms.teacher_id = auth.uid()
    )
);

CREATE INDEX idx_homework_submission_events_assignment_submitted_at
ON public.homework_submission_events (assignment_id, submitted_at DESC);

CREATE INDEX idx_homework_submission_events_student_assignment_question
ON public.homework_submission_events (student_id, assignment_id, question_id);
