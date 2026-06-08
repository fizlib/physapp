-- Atomically accept a student game invitation, activate its classroom,
-- and mark the notification as seen.

CREATE OR REPLACE FUNCTION public.accept_game_invite(
  p_notification_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  game_id TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID := auth.uid();
  v_classroom_id UUID;
  v_kind TEXT;
  v_game_id TEXT;
BEGIN
  IF v_student_id IS NULL THEN
    RETURN QUERY SELECT false, 'Turite prisijungti iš naujo.', NULL::TEXT;
    RETURN;
  END IF;

  SELECT
    notification.classroom_id,
    notification.metadata ->> 'kind',
    notification.metadata ->> 'gameId'
  INTO
    v_classroom_id,
    v_kind,
    v_game_id
  FROM student_popup_notifications AS notification
  WHERE notification.id = p_notification_id
    AND notification.student_id = v_student_id
    AND notification.seen_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Kvietimas nerastas arba jau panaudotas.', NULL::TEXT;
    RETURN;
  END IF;

  IF v_kind IS DISTINCT FROM 'game_invite'
     OR v_game_id IS NULL
     OR v_game_id NOT IN ('coffee', 'vampires') THEN
    RETURN QUERY SELECT false, 'Žaidimo kvietimas negalioja.', NULL::TEXT;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM enrollments
    WHERE student_id = v_student_id
      AND classroom_id = v_classroom_id
  ) THEN
    RETURN QUERY SELECT false, 'Jūs nebesate šios klasės mokinys.', NULL::TEXT;
    RETURN;
  END IF;

  UPDATE enrollments
  SET is_active_classroom = false
  WHERE student_id = v_student_id
    AND is_active_classroom = true;

  UPDATE enrollments
  SET is_active_classroom = true
  WHERE student_id = v_student_id
    AND classroom_id = v_classroom_id;

  UPDATE student_popup_notifications
  SET seen_at = timezone('utc'::text, now())
  WHERE id = p_notification_id
    AND student_id = v_student_id;

  RETURN QUERY SELECT true, 'Kvietimas priimtas.', v_game_id;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION public.accept_game_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_game_invite(UUID) TO authenticated;
