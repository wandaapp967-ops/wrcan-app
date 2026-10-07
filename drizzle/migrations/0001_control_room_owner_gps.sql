ALTER TABLE public.talent_reels ADD COLUMN IF NOT EXISTS latitude double precision, ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.status_posts ADD COLUMN IF NOT EXISTS latitude double precision, ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.uploaded_certificates ADD COLUMN IF NOT EXISTS latitude double precision, ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE OR REPLACE FUNCTION public.can_view_control_room()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_role(auth.uid(), 'admin') $$;

CREATE OR REPLACE FUNCTION public.control_room_members()
 RETURNS TABLE(id uuid, full_name text, member_type text, city text, suburb text, last_seen_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_view_control_room() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT p.id, p.full_name, p.member_type::text, p.city, p.suburb, p.last_seen_at
    FROM public.profiles p ORDER BY p.last_seen_at DESC LIMIT 500;
END $$;

CREATE OR REPLACE FUNCTION public.control_room_uploads()
 RETURNS TABLE(kind text, user_id uuid, full_name text, title text, latitude double precision, longitude double precision, created_at timestamptz)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_view_control_room() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  SELECT * FROM (
    SELECT 'reel'::text, r.user_id, p.full_name, r.title, r.latitude, r.longitude, r.created_at FROM public.talent_reels r JOIN public.profiles p ON p.id=r.user_id WHERE r.latitude IS NOT NULL
    UNION ALL
    SELECT 'status', s.user_id, p.full_name, coalesce(left(s.body,60),'Status'), s.latitude, s.longitude, s.created_at FROM public.status_posts s JOIN public.profiles p ON p.id=s.user_id WHERE s.latitude IS NOT NULL
    UNION ALL
    SELECT 'certificate', u.user_id, p.full_name, u.title, u.latitude, u.longitude, u.created_at FROM public.uploaded_certificates u JOIN public.profiles p ON p.id=u.user_id WHERE u.latitude IS NOT NULL
  ) x ORDER BY 7 DESC LIMIT 100;
END $$;

REVOKE EXECUTE ON FUNCTION public.control_room_members() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.control_room_uploads() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.control_room_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.control_room_uploads() TO authenticated;