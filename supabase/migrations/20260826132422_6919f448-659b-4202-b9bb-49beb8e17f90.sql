CREATE TYPE public.donor_type AS ENUM ('individual','company','foundation','government','ngo');
CREATE TYPE public.donation_status AS ENUM ('pending','completed','failed','refunded');

CREATE TABLE public.donation_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  goal_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  cover_url text,
  beneficiaries integer NOT NULL DEFAULT 0,
  starts_at date NOT NULL DEFAULT current_date,
  ends_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.donation_campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donation_campaigns TO authenticated;
GRANT ALL ON public.donation_campaigns TO service_role;
ALTER TABLE public.donation_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_public_read ON public.donation_campaigns FOR SELECT USING (is_active);
CREATE POLICY campaigns_admin_all ON public.donation_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.donation_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.donation_campaigns(id) ON DELETE SET NULL,
  donor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_name text NOT NULL DEFAULT 'Anonymous',
  donor_type public.donor_type NOT NULL DEFAULT 'individual',
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'ZAR',
  method text NOT NULL DEFAULT 'eft',
  reference text,
  message text,
  is_anonymous boolean NOT NULL DEFAULT false,
  is_recurring boolean NOT NULL DEFAULT false,
  status public.donation_status NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX donations_created_idx ON public.donations (created_at DESC);
CREATE INDEX donations_campaign_idx ON public.donations (campaign_id);
GRANT SELECT, INSERT ON public.donations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY donations_public_read ON public.donations FOR SELECT USING (status IN ('completed','pending'));
CREATE POLICY donations_insert_any ON public.donations FOR INSERT WITH CHECK (
  donor_user_id IS NULL OR donor_user_id = auth.uid()
);
CREATE POLICY donations_own_update ON public.donations FOR UPDATE TO authenticated
  USING (donor_user_id = auth.uid()) WITH CHECK (donor_user_id = auth.uid());
CREATE POLICY donations_admin_all ON public.donations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.donor_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  contact_name text,
  email text,
  phone text,
  company_registration text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.donor_contacts TO anon;
GRANT SELECT, INSERT ON public.donor_contacts TO authenticated;
GRANT ALL ON public.donor_contacts TO service_role;
ALTER TABLE public.donor_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY donor_contacts_insert_any ON public.donor_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY donor_contacts_admin_read ON public.donor_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.donation_campaigns;

INSERT INTO public.donation_campaigns (title, slug, description, category, goal_amount, beneficiaries, ends_at) VALUES
('Youth Skills Fund','youth-skills-fund','Sponsor accredited YES and SETA learnerships for unemployed South African youth.','training',2500000,1200,'2026-12-31'),
('Disability Inclusion Drive','disability-inclusion','Assistive devices, transport stipends and workplace onboarding for participants living with disabilities.','inclusion',900000,350,'2026-10-31'),
('Community Kitchen Programme','community-kitchen','Equip catering graduates with starter kits and feed learners at township training centres.','catering',1500000,5000,'2026-11-30'),
('Digital Access Bursary','digital-access','Data, devices and connectivity so job seekers can complete online training and interviews.','technology',600000,800,'2026-09-30');

INSERT INTO public.donations (campaign_id, donor_name, donor_type, amount, method, message, is_recurring, status, created_at)
SELECT c.id, d.name, d.dtype::public.donor_type, d.amt, d.meth, d.msg, d.rec, 'completed', now() - (d.ago || ' hours')::interval
FROM (VALUES
  ('youth-skills-fund','Coca-Cola Beverages SA','company',250000,'eft','Proud to back the next generation of talent.',true,6),
  ('youth-skills-fund','Sasol Foundation','foundation',180000,'eft','Learnerships change lives.',true,30),
  ('community-kitchen','Shoprite Checkers','company',320000,'eft','Feeding futures.',true,54),
  ('disability-inclusion','Nedbank Trust','company',145000,'eft',NULL,false,78),
  ('digital-access','Vodacom Change the World','company',210000,'eft','Connectivity is opportunity.',true,101),
  ('youth-skills-fund','Thandiwe M.','individual',2500,'card','For my community.',false,4),
  ('community-kitchen','Anonymous Donor','individual',1000,'card',NULL,false,12),
  ('disability-inclusion','Department of Social Development','government',400000,'eft','Inclusion grant tranche 1.',false,140),
  ('digital-access','MTN SA Foundation','foundation',95000,'eft',NULL,false,168),
  ('youth-skills-fund','Pepsico SSA','company',175000,'eft','Empowering youth employment.',true,196),
  ('community-kitchen','Woolworths Trust','company',88000,'eft',NULL,false,220),
  ('disability-inclusion','Rotary Club Johannesburg','ngo',36000,'eft','Wheelchairs delivered.',false,250)
) AS d(slug,name,dtype,amt,meth,msg,rec,ago)
JOIN public.donation_campaigns c ON c.slug = d.slug;