CREATE OR REPLACE FUNCTION public.start_direct_chat(_other_id uuid, _title text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _conv uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other_id IS NULL OR _other_id = _me THEN RAISE EXCEPTION 'invalid participant'; END IF;

  SELECT c.id INTO _conv
  FROM public.conversations c
  JOIN public.conversation_participants a ON a.conversation_id = c.id AND a.user_id = _me
  JOIN public.conversation_participants b ON b.conversation_id = c.id AND b.user_id = _other_id
  WHERE c.is_group = false
  LIMIT 1;

  IF _conv IS NOT NULL THEN RETURN _conv; END IF;

  INSERT INTO public.conversations (created_by, is_group, title)
  VALUES (_me, false, COALESCE(_title, 'Wanda chat'))
  RETURNING id INTO _conv;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (_conv, _me), (_conv, _other_id)
  ON CONFLICT DO NOTHING;

  RETURN _conv;
END; $$;

REVOKE EXECUTE ON FUNCTION public.start_direct_chat(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_direct_chat(uuid, text) TO authenticated;