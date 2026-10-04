CREATE TABLE public.uploaded_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  issuer text,
  issued_on date,
  file_path text NOT NULL,
  file_mime text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.uploaded_certificates TO authenticated;
GRANT ALL ON public.uploaded_certificates TO service_role;
ALTER TABLE public.uploaded_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read uploaded certificates" ON public.uploaded_certificates FOR SELECT TO authenticated USING (true);
CREATE POLICY "members add own certificates" ON public.uploaded_certificates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members delete own certificates" ON public.uploaded_certificates FOR DELETE TO authenticated USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.uploaded_certificates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.certificates;

CREATE POLICY "cert_files_read_authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'certificates');
CREATE POLICY "cert_files_insert_own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "cert_files_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'certificates' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.certificate_directory()
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, city text, wanda_certs bigint, uploaded_certs bigint, completed bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.city,
    (SELECT count(*) FROM public.certificates c WHERE c.user_id = p.id),
    (SELECT count(*) FROM public.uploaded_certificates u WHERE u.user_id = p.id),
    (SELECT count(*) FROM public.enrollments e WHERE e.user_id = p.id AND e.status = 'completed')
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND (EXISTS (SELECT 1 FROM public.certificates c WHERE c.user_id = p.id)
      OR EXISTS (SELECT 1 FROM public.uploaded_certificates u WHERE u.user_id = p.id))
  ORDER BY p.full_name
$$;

CREATE OR REPLACE FUNCTION public.member_achievements(_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL ELSE jsonb_build_object(
    'certificates', (SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.issued_at DESC), '[]'::jsonb) FROM public.certificates c WHERE c.user_id = _user_id),
    'completed', (SELECT coalesce(jsonb_agg(jsonb_build_object('title', m.title, 'provider', m.provider, 'score', e.score, 'completed_at', e.completed_at) ORDER BY e.completed_at DESC), '[]'::jsonb)
      FROM public.enrollments e JOIN public.training_modules m ON m.id = e.module_id
      WHERE e.user_id = _user_id AND e.status = 'completed')
  ) END
$$;
REVOKE EXECUTE ON FUNCTION public.certificate_directory() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.member_achievements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.certificate_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_achievements(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_unread_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.messages m
  JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = auth.uid()
  WHERE m.sender_id <> auth.uid() AND m.deleted_at IS NULL AND m.created_at > cp.last_read_at
$$;
REVOKE EXECUTE ON FUNCTION public.my_unread_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_unread_count() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_control_room()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'recruiter') OR public.has_role(auth.uid(), 'caterer') OR public.has_role(auth.uid(), 'admin')
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_control_room() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_control_room() TO authenticated;

CREATE OR REPLACE FUNCTION public.control_room_stats_secure()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_view_control_room() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  RETURN public.control_room_stats();
END $$;
REVOKE EXECUTE ON FUNCTION public.control_room_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.control_room_stats_secure() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.control_room_stats_secure() TO authenticated;