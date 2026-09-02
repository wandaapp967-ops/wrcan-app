-- 1. Location field
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suburb text;

-- 2. Area groups
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS area_key text;
CREATE UNIQUE INDEX IF NOT EXISTS conversations_area_key_uidx ON public.conversations (area_key) WHERE area_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.area_key_of(_suburb text, _city text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT NULLIF(lower(regexp_replace(trim(coalesce(NULLIF(trim(_suburb), ''), _city, '')), '\s+', '-', 'g')), '')
$$;

CREATE OR REPLACE FUNCTION public.area_label_of(_suburb text, _city text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT initcap(trim(coalesce(NULLIF(trim(_suburb), ''), _city, ''))) || ' Seekers'
$$;

CREATE OR REPLACE FUNCTION public.allocate_area_group(_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.profiles;
  k text;
  conv uuid;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p.id IS NULL OR p.member_type NOT IN ('jobseeker', 'student') THEN RETURN NULL; END IF;
  k := public.area_key_of(p.suburb, p.city);
  IF k IS NULL THEN RETURN NULL; END IF;

  SELECT id INTO conv FROM public.conversations WHERE area_key = k;
  IF conv IS NULL THEN
    INSERT INTO public.conversations (title, is_group, area_key, created_by)
    VALUES (public.area_label_of(p.suburb, p.city), true, k, _user_id)
    RETURNING id INTO conv;
  END IF;

  -- leave other area groups
  DELETE FROM public.conversation_participants cp
  USING public.conversations c
  WHERE cp.conversation_id = c.id AND cp.user_id = _user_id
    AND c.area_key IS NOT NULL AND c.area_key <> k;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (conv, _user_id)
  ON CONFLICT DO NOTHING;

  RETURN conv;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.allocate_area_group(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.allocate_area_group(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.auto_allocate_area()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.allocate_area_group(auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.auto_allocate_area() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.auto_allocate_area() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.profiles_area_allocate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.allocate_area_group(NEW.id);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.profiles_area_allocate() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_area_allocate_trg ON public.profiles;
CREATE TRIGGER profiles_area_allocate_trg
AFTER INSERT OR UPDATE OF suburb, city, member_type ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_area_allocate();

-- Backfill current jobseekers and students
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE member_type IN ('jobseeker','student') LOOP
    PERFORM public.allocate_area_group(r.id);
  END LOOP;
END $$;

-- 3. Status posts (24h)
CREATE TABLE IF NOT EXISTS public.status_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','image','video')),
  body text,
  media_path text,
  media_mime text,
  background text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_posts TO authenticated;
GRANT ALL ON public.status_posts TO service_role;
ALTER TABLE public.status_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in members can view active statuses" ON public.status_posts
  FOR SELECT TO authenticated USING (expires_at > now());
CREATE POLICY "Members manage their own statuses" ON public.status_posts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Talent reels
CREATE TABLE IF NOT EXISTS public.talent_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'video' CHECK (kind IN ('video','image')),
  title text NOT NULL,
  caption text,
  skill_tag text,
  area text,
  media_path text NOT NULL,
  media_mime text,
  duration_ms integer,
  views integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.talent_reels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_reels TO authenticated;
GRANT ALL ON public.talent_reels TO service_role;
ALTER TABLE public.talent_reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reels are viewable by everyone" ON public.talent_reels
  FOR SELECT USING (is_public = true);
CREATE POLICY "Members can read their own reels" ON public.talent_reels
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members manage their own reels" ON public.talent_reels
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.talent_reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reel_id, user_id)
);
GRANT SELECT ON public.reel_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.reel_likes TO authenticated;
GRANT ALL ON public.reel_likes TO service_role;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see reel likes" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "Members like as themselves" ON public.reel_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members remove their own likes" ON public.reel_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_status_posts_updated_at BEFORE UPDATE ON public.status_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_talent_reels_updated_at BEFORE UPDATE ON public.talent_reels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Storage policies for the public talent bucket
CREATE POLICY "Talent media is publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'talent');
CREATE POLICY "Members upload their own talent media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'talent' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members update their own talent media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'talent' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Members delete their own talent media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'talent' AND (storage.foldername(name))[1] = auth.uid()::text);

ALTER PUBLICATION supabase_realtime ADD TABLE public.status_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.talent_reels;