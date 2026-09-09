CREATE OR REPLACE FUNCTION public.impact_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'members', (SELECT count(*) FROM public.profiles),
    'jobseekers', (SELECT count(*) FROM public.profiles WHERE member_type = 'jobseeker'),
    'students', (SELECT count(*) FROM public.profiles WHERE member_type = 'student'),
    'recruiters', (SELECT count(*) FROM public.profiles WHERE member_type IN ('recruiter','caterer')),
    'modules', (SELECT count(*) FROM public.training_modules WHERE is_active),
    'enrollments', (SELECT count(*) FROM public.enrollments),
    'completions', (SELECT count(*) FROM public.enrollments WHERE status = 'completed'),
    'certificates', (SELECT count(*) FROM public.certificates),
    'jobs', (SELECT count(*) FROM public.jobs WHERE is_active),
    'applications', (SELECT count(*) FROM public.applications),
    'placements', (SELECT count(*) FROM public.applications WHERE status = 'placed'),
    'reels', (SELECT count(*) FROM public.talent_reels WHERE is_public),
    'area_groups', (SELECT count(*) FROM public.conversations WHERE area_key IS NOT NULL),
    'raised', (SELECT COALESCE(sum(amount), 0) FROM public.donations WHERE status = 'completed'),
    'campaigns', (SELECT count(*) FROM public.donation_campaigns WHERE is_active)
  )
$$;

REVOKE ALL ON FUNCTION public.impact_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.impact_stats() TO anon, authenticated, service_role;