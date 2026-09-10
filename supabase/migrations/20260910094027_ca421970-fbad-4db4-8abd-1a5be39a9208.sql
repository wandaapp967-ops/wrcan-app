
CREATE OR REPLACE FUNCTION public.control_room_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'new_users_today', (SELECT count(*) FROM public.profiles WHERE created_at >= date_trunc('day', now())),
    'emails_captured', (SELECT count(*) FROM public.profiles WHERE email IS NOT NULL),
    'emails_today', (SELECT count(*) FROM public.profiles WHERE email IS NOT NULL AND created_at >= date_trunc('day', now())),
    'active_sessions', (SELECT count(*) FROM public.profiles WHERE last_seen_at >= now() - interval '15 minutes'),
    'active_24h', (SELECT count(*) FROM public.profiles WHERE last_seen_at >= now() - interval '24 hours'),
    'reel_views', (SELECT coalesce(sum(views),0) FROM public.talent_reels),
    'reels_count', (SELECT count(*) FROM public.talent_reels),
    'interactions', (SELECT count(*) FROM public.reel_likes) + (SELECT count(*) FROM public.messages) + (SELECT count(*) FROM public.applications),
    'certificates', (SELECT count(*) FROM public.certificates),
    'certificates_today', (SELECT count(*) FROM public.certificates WHERE issued_at >= date_trunc('day', now())),
    'recruiters', (SELECT count(*) FROM public.profiles WHERE member_type IN ('recruiter','caterer')),
    'recruiters_online', (SELECT count(*) FROM public.profiles WHERE member_type IN ('recruiter','caterer') AND last_seen_at >= now() - interval '15 minutes'),
    'jobs', (SELECT count(*) FROM public.jobs WHERE is_active),
    'jobs_this_week', (SELECT count(*) FROM public.jobs WHERE created_at >= now() - interval '7 days'),
    'applications', (SELECT count(*) FROM public.applications),
    'messages', (SELECT count(*) FROM public.messages WHERE deleted_at IS NULL),
    'messages_last_hour', (SELECT count(*) FROM public.messages WHERE created_at >= now() - interval '1 hour'),
    'enrollments', (SELECT count(*) FROM public.enrollments),
    'completions', (SELECT count(*) FROM public.enrollments WHERE status = 'completed'),
    'daily_active', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('day', to_char(d.day,'Dy'), 'value', c.cnt) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(date_trunc('day', now()) - interval '6 days', date_trunc('day', now()), interval '1 day') AS d(day)
      CROSS JOIN LATERAL (
        SELECT count(DISTINCT p.id) AS cnt FROM public.profiles p
        WHERE p.last_seen_at >= d.day AND p.last_seen_at < d.day + interval '1 day'
      ) c
    ),
    'recent_logins', (
      SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
        SELECT
          CASE WHEN p.email IS NULL THEN 'hidden'
               ELSE left(split_part(p.email,'@',1),2) || '***@' || split_part(p.email,'@',2) END AS email,
          p.full_name,
          p.last_seen_at,
          coalesce(p.city, p.province, 'South Africa') AS place
        FROM public.profiles p
        ORDER BY p.last_seen_at DESC
        LIMIT 6
      ) x
    ),
    'generated_at', now()
  );
$$;

REVOKE ALL ON FUNCTION public.control_room_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.control_room_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.control_room_stats() TO authenticated;
