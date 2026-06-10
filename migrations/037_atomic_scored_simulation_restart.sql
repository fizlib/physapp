-- Restart scored simulation attempts for only the explicitly selected students.
-- PostgreSQL executes the entire function in one transaction, so an insert
-- failure rolls back both result deletions.
CREATE OR REPLACE FUNCTION public.restart_scored_simulation_attempts(
  p_assignment_id UUID,
  p_student_ids UUID[],
  p_attempt_rows JSONB
)
RETURNS TABLE (
  deleted_attempts INTEGER,
  deleted_progress INTEGER,
  inserted_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_deleted_attempts INTEGER := 0;
  v_deleted_progress INTEGER := 0;
  v_inserted_attempts INTEGER := 0;
  v_selected_count INTEGER := COALESCE(cardinality(p_student_ids), 0);
  v_distinct_row_students INTEGER := 0;
BEGIN
  IF v_selected_count = 0 THEN
    RAISE EXCEPTION 'At least one student must be selected';
  END IF;

  IF p_attempt_rows IS NULL OR jsonb_typeof(p_attempt_rows) <> 'array' THEN
    RAISE EXCEPTION 'Attempt rows must be a JSON array';
  END IF;

  IF jsonb_array_length(p_attempt_rows) <> v_selected_count THEN
    RAISE EXCEPTION 'Attempt row count must match selected student count';
  END IF;

  SELECT COUNT(DISTINCT (attempt_row->>'student_id')::UUID)
  INTO v_distinct_row_students
  FROM jsonb_array_elements(p_attempt_rows) AS attempt_row;

  IF v_distinct_row_students <> v_selected_count THEN
    RAISE EXCEPTION 'Attempt rows must contain each selected student exactly once';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_attempt_rows) AS attempt_row
    WHERE (attempt_row->>'assignment_id')::UUID <> p_assignment_id
      OR NOT ((attempt_row->>'student_id')::UUID = ANY(p_student_ids))
  ) THEN
    RAISE EXCEPTION 'Attempt rows do not match the requested assignment and students';
  END IF;

  DELETE FROM public.simulation_test_attempts
  WHERE assignment_id = p_assignment_id
    AND student_id = ANY(p_student_ids);
  GET DIAGNOSTICS v_deleted_attempts = ROW_COUNT;

  DELETE FROM public.assignment_progress
  WHERE assignment_id = p_assignment_id
    AND student_id = ANY(p_student_ids);
  GET DIAGNOSTICS v_deleted_progress = ROW_COUNT;

  INSERT INTO public.simulation_test_attempts (
    assignment_id,
    student_id,
    simulation_id,
    question_order,
    answers,
    current_index,
    current_question_started_at,
    current_question_deadline_at,
    earned_points
  )
  SELECT
    (attempt_row->>'assignment_id')::UUID,
    (attempt_row->>'student_id')::UUID,
    attempt_row->>'simulation_id',
    attempt_row->'question_order',
    COALESCE(attempt_row->'answers', '{}'::JSONB),
    COALESCE((attempt_row->>'current_index')::INTEGER, 0),
    (attempt_row->>'current_question_started_at')::TIMESTAMP WITH TIME ZONE,
    (attempt_row->>'current_question_deadline_at')::TIMESTAMP WITH TIME ZONE,
    COALESCE((attempt_row->>'earned_points')::INTEGER, 0)
  FROM jsonb_array_elements(p_attempt_rows) AS attempt_row;
  GET DIAGNOSTICS v_inserted_attempts = ROW_COUNT;

  IF v_inserted_attempts <> v_selected_count THEN
    RAISE EXCEPTION 'Inserted attempt count does not match selected student count';
  END IF;

  RETURN QUERY
  SELECT v_deleted_attempts, v_deleted_progress, v_inserted_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.restart_scored_simulation_attempts(UUID, UUID[], JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restart_scored_simulation_attempts(UUID, UUID[], JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.restart_scored_simulation_attempts(UUID, UUID[], JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.restart_scored_simulation_attempts(UUID, UUID[], JSONB) TO service_role;
