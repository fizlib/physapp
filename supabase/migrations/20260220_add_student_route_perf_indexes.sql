-- Performance indexes for student route navigation and RLS-heavy joins.
-- Intentionally additive: no index drops in this migration.

CREATE INDEX IF NOT EXISTS idx_assignments_classroom_published_created_at
ON public.assignments (classroom_id, published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_collection_order_index
ON public.assignments (collection_id, order_index);

CREATE INDEX IF NOT EXISTS idx_questions_assignment_created_at
ON public.questions (assignment_id, created_at);

CREATE INDEX IF NOT EXISTS idx_enrollments_classroom_student
ON public.enrollments (classroom_id, student_id);

CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id
ON public.classrooms (teacher_id);

CREATE INDEX IF NOT EXISTS idx_ip_bypasses_user_collection_expires_at
ON public.ip_bypasses (user_id, collection_id, expires_at);
