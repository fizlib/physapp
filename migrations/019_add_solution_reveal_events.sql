-- Track each "Rodyti sprendimą" click as an immutable event row.
CREATE TABLE IF NOT EXISTS public.solution_reveal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL CHECK (question_index >= 0),
    clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.solution_reveal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own solution reveal events"
ON public.solution_reveal_events FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Users can insert own solution reveal events"
ON public.solution_reveal_events FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE INDEX idx_solution_reveal_events_assignment_clicked_at
ON public.solution_reveal_events (assignment_id, clicked_at DESC);

CREATE INDEX idx_solution_reveal_events_student_assignment_question
ON public.solution_reveal_events (student_id, assignment_id, question_id);
