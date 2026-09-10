ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_community boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS community_slug text UNIQUE;

DROP POLICY IF EXISTS conv_select_community ON public.conversations;
CREATE POLICY conv_select_community ON public.conversations
  FOR SELECT TO authenticated
  USING (is_community = true);

CREATE OR REPLACE FUNCTION public.join_community(_conversation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.conversations WHERE id = _conversation_id AND is_community) THEN
    RAISE EXCEPTION 'not a community group';
  END IF;
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (_conversation_id, _me)
  ON CONFLICT DO NOTHING;
  RETURN _conversation_id;
END; $$;

REVOKE ALL ON FUNCTION public.join_community(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_community(uuid) TO authenticated;

INSERT INTO public.conversations (title, is_group, is_community, community_slug, invite_url, description)
VALUES
  ('WRCAN Farmers Group 🌍🌾🍃', true, true, 'wrcan-farmers', 'https://chat.whatsapp.com/BUmt67cuhMw0zjYfZQqh4f', 'Farming, agri-skills and land opportunities across South Africa.'),
  ('WRCAN Farmers Group II 🌍⛰️🍀', true, true, 'wrcan-farmers-2', 'https://chat.whatsapp.com/BliefLzWrne8OfLwt4GfRE', 'Second farmers circle — seasonal work, produce and training.'),
  ('WRCAN Hospitality Training Group 🍽️', true, true, 'wrcan-hospitality', 'https://chat.whatsapp.com/Iia2j2U2pXyCEBd2a1uyEs', 'Catering, chefs, waitrons and hospitality learnerships.'),
  ('WRCAN NEMISA Youth Group 📷🎥', true, true, 'wrcan-nemisa-youth', 'https://chat.whatsapp.com/KD03NJqMwRe0Plmz4sLQAv', 'NEMISA digital skills, media production and free online courses.'),
  ('WRCAN Standard Bank Financial Training, Harambe & SA Youth 💙🏦', true, true, 'wrcan-stdbank-financial', 'https://chat.whatsapp.com/Lwh6ql0R79QKg7e3gcG9rT', 'Financial training, Harambee and SA Youth opportunities.'),
  ('Grade 11 with Standard Bank 💙🏦', true, true, 'grade-11-standardbank', 'https://chat.whatsapp.com/JGUnLAL0imv7SqIrsfKsjE', 'Support group for Grade 11 learners banking with Standard Bank.'),
  ('Mobi Matriculants with Capitec Account 💙🏦', true, true, 'mobi-matriculants-capitec', 'https://chat.whatsapp.com/DQ2WD3PsoXMECk5xqfJR3L', 'Matriculants with a Capitec account — bursaries, jobs and study help.')
ON CONFLICT (community_slug) DO UPDATE
  SET invite_url = EXCLUDED.invite_url,
      title = EXCLUDED.title,
      description = EXCLUDED.description;