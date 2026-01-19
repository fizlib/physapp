-- Create assignment_progress table
create table public.assignment_progress (
  id uuid not null default gen_random_uuid (),
  student_id uuid not null references profiles (id) on delete cascade,
  assignment_id uuid not null references assignments (id) on delete cascade,
  completed_question_indices integer[] default '{}'::integer[],
  is_completed boolean default false,
  updated_at timestamp with time zone default now(),
  constraint assignment_progress_pkey primary key (id),
  constraint assignment_progress_student_assignment_key unique (student_id, assignment_id)
) tablespace pg_default;

-- Add RLS
alter table public.assignment_progress enable row level security;

create policy "Users can view own progress"
on public.assignment_progress for select
using (auth.uid() = student_id);

create policy "Users can insert own progress"
on public.assignment_progress for insert
with check (auth.uid() = student_id);

create policy "Users can update own progress"
on public.assignment_progress for update
using (auth.uid() = student_id);

-- Index for performance
create index idx_assignment_progress_student_assignment on public.assignment_progress (student_id, assignment_id);
