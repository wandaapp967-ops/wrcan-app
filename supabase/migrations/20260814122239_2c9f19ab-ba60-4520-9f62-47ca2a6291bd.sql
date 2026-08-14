
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','recruiter','caterer','student','jobseeker');
CREATE TYPE public.member_type AS ENUM ('student','jobseeker','recruiter','caterer');
CREATE TYPE public.enrollment_status AS ENUM ('enrolled','in_progress','completed','withdrawn');
CREATE TYPE public.application_status AS ENUM ('submitted','shortlisted','interview','offered','placed','rejected');
CREATE TYPE public.message_kind AS ENUM ('text','image','video','audio','file','location','contact');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  member_type public.member_type NOT NULL DEFAULT 'jobseeker',
  date_of_birth date,
  gender text,
  city text,
  province text,
  highest_qualification text,
  field_of_study text,
  skills text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{}',
  experience_years integer NOT NULL DEFAULT 0,
  has_disability boolean NOT NULL DEFAULT false,
  disability_detail text,
  availability text,
  drivers_licence boolean NOT NULL DEFAULT false,
  company_name text,
  bio text,
  avatar_url text,
  cv_path text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, member_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'member_type')::public.member_type, 'jobseeker')
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'member_type')::text, 'jobseeker')::public.app_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TRAINING MODULES
CREATE TABLE public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  provider text NOT NULL,
  accrediting_body text,
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL DEFAULT '',
  nqf_level integer,
  duration_hours integer NOT NULL DEFAULT 20,
  credits integer,
  min_age integer NOT NULL DEFAULT 16,
  max_age integer NOT NULL DEFAULT 99,
  required_qualification text,
  tags text[] NOT NULL DEFAULT '{}',
  manual_url text,
  is_accredited boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_modules TO authenticated;
GRANT SELECT ON public.training_modules TO anon;
GRANT ALL ON public.training_modules TO service_role;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules_public_read" ON public.training_modules FOR SELECT USING (is_active);
CREATE POLICY "modules_admin_write" ON public.training_modules FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ENROLLMENTS
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status public.enrollment_status NOT NULL DEFAULT 'enrolled',
  progress integer NOT NULL DEFAULT 0,
  score integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, module_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments_own" ON public.enrollments FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CERTIFICATES
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  certificate_number text NOT NULL UNIQUE,
  learner_name text NOT NULL,
  module_title text NOT NULL,
  provider text NOT NULL,
  score integer,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificates_own" ON public.certificates FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- JOBS
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company text NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'recruitment',
  description text NOT NULL DEFAULT '',
  city text,
  province text,
  employment_type text NOT NULL DEFAULT 'Full-time',
  salary_min integer,
  salary_max integer,
  min_age integer NOT NULL DEFAULT 16,
  max_age integer NOT NULL DEFAULT 99,
  required_qualification text,
  required_skills text[] NOT NULL DEFAULT '{}',
  min_experience integer NOT NULL DEFAULT 0,
  positions integer NOT NULL DEFAULT 1,
  disability_friendly boolean NOT NULL DEFAULT false,
  closes_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT ON public.jobs TO anon;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_public_read" ON public.jobs FOR SELECT USING (is_active);
CREATE POLICY "jobs_owner_write" ON public.jobs FOR ALL TO authenticated
USING (auth.uid() = posted_by OR public.has_role(auth.uid(),'admin'))
WITH CHECK (auth.uid() = posted_by OR public.has_role(auth.uid(),'admin'));

-- APPLICATIONS
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.application_status NOT NULL DEFAULT 'submitted',
  match_score integer NOT NULL DEFAULT 0,
  cover_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_own" ON public.applications FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "applications_recruiter_read" ON public.applications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.posted_by = auth.uid()));
CREATE POLICY "applications_recruiter_update" ON public.applications FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.posted_by = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.posted_by = auth.uid()));

-- CHAT
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  is_group boolean NOT NULL DEFAULT false,
  avatar_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.message_kind NOT NULL DEFAULT 'text',
  body text,
  media_path text,
  media_mime text,
  media_size integer,
  duration_ms integer,
  latitude double precision,
  longitude double precision,
  reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.conversations, public.conversation_participants, public.messages TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id)
$$;

CREATE POLICY "conv_select" ON public.conversations FOR SELECT TO authenticated
USING (public.is_participant(id, auth.uid()));
CREATE POLICY "conv_insert" ON public.conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);
CREATE POLICY "conv_update" ON public.conversations FOR UPDATE TO authenticated
USING (public.is_participant(id, auth.uid())) WITH CHECK (public.is_participant(id, auth.uid()));

CREATE POLICY "cp_select" ON public.conversation_participants FOR SELECT TO authenticated
USING (public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "cp_insert" ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()));
CREATE POLICY "cp_update_own" ON public.conversation_participants FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cp_delete_own" ON public.conversation_participants FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "msg_select" ON public.messages FOR SELECT TO authenticated
USING (public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "msg_insert" ON public.messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "msg_update_own" ON public.messages FOR UPDATE TO authenticated
USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "msg_delete_own" ON public.messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_touch_conversation AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- RATINGS
CREATE TABLE public.service_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stars integer NOT NULL,
  area text NOT NULL DEFAULT 'general',
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.service_ratings TO authenticated;
GRANT ALL ON public.service_ratings TO service_role;
ALTER TABLE public.service_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_read" ON public.service_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "ratings_insert_own" ON public.service_ratings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- DATA MARKETPLACE
CREATE TABLE public.data_purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  phone text,
  dataset text NOT NULL,
  record_count integer,
  purpose text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.data_purchase_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.data_purchase_requests TO authenticated;
GRANT ALL ON public.data_purchase_requests TO service_role;
ALTER TABLE public.data_purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dpr_insert_any" ON public.data_purchase_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "dpr_admin_read" ON public.data_purchase_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "dpr_admin_update" ON public.data_purchase_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SEED TRAINING MODULES
INSERT INTO public.training_modules (title, provider, accrediting_body, category, description, nqf_level, duration_hours, credits, min_age, max_age, required_qualification, tags) VALUES
('YES Work Readiness Programme','YES','Youth Employment Service','work-readiness','Full YES 4 Youth work readiness manual: workplace conduct, communication, CV writing, interview mastery and first-job survival skills.',3,40,20,18,35,'Grade 10','{work readiness,youth,cv,interview}'),
('YES Digital Skills for the Workplace','YES','Youth Employment Service','digital','Microsoft Office, email etiquette, cloud collaboration, online safety and digital job hunting for first-time work seekers.',3,30,15,18,35,'Grade 10','{digital,computer,office}'),
('YES Entrepreneurship & Side Hustle Bootcamp','YES','Youth Employment Service','business','Turn a skill into income: idea validation, costing, pricing, informal trading rules and township business models.',4,35,18,18,35,'Grade 11','{entrepreneurship,business,sme}'),
('YES Financial Literacy & Money Management','YES','Youth Employment Service','finance','Budgeting on a stipend, debt traps, credit records, saving, and how UIF, PAYE and payslips actually work.',3,20,10,18,35,'Grade 10','{finance,budget,money}'),
('Services SETA: Generic Management NQF 4','SETA','Services SETA','management','Full learnership manual for generic management: leading teams, planning, budgets, performance and problem solving.',4,120,150,18,60,'Grade 12','{management,learnership,nqf4}'),
('Services SETA: New Venture Creation NQF 4','SETA','Services SETA','business','Register and run a compliant small business, tender readiness, CIPC, SARS basics and business plan development.',4,110,149,18,60,'Grade 12','{business,nvc,tender}'),
('CATHSSETA: Professional Cookery NQF 4','SETA','CATHSSETA','catering','Commercial cookery: knife skills, stocks and sauces, protein cookery, plating, menu costing and kitchen brigade systems.',4,160,160,17,60,'Grade 11','{catering,chef,cookery,kitchen}'),
('CATHSSETA: Food & Beverage Service NQF 3','SETA','CATHSSETA','catering','Front of house service, table setting, banqueting, wine and beverage service, guest handling and upselling.',3,120,120,17,60,'Grade 10','{catering,waiter,service,hospitality}'),
('CATHSSETA: Food Safety, HACCP & Hygiene','SETA','CATHSSETA','catering','R638 regulations, HACCP principles, allergen control, cold chain, pest control and kitchen audit readiness.',4,40,20,18,60,'Grade 10','{haccp,food safety,hygiene,compliance}'),
('CATHSSETA: Event & Function Catering Management','SETA','CATHSSETA','catering','Plan and execute functions from 50 to 5000 covers: quoting, staffing, logistics, equipment hire and on-site control.',5,60,40,20,60,'Grade 12','{events,catering,functions}'),
('W&RSETA: Retail Operations NQF 3','SETA','W&RSETA','retail','Merchandising, stock control, point of sale, shrinkage, customer service and retail floor management.',3,90,120,17,60,'Grade 10','{retail,pos,stock}'),
('MerSETA: Basic Welding & Fabrication','SETA','merSETA','technical','Arc, MIG and TIG fundamentals, joint preparation, safety, reading fabrication drawings and quality inspection.',3,120,110,18,55,'Grade 9','{welding,artisan,technical}'),
('HWSETA: Home Based Personal Care NQF 3','SETA','HWSETA','health','Care of the elderly and ill at home, infection control, mobility assistance, medication support and dignity of care.',3,100,120,18,60,'Grade 10','{care,health,home based}'),
('HWSETA: First Aid Level 1, 2 & 3','SETA','HWSETA','health','Full three-level first aid: CPR, bleeding, burns, fractures, shock, AED use and emergency scene management.',3,40,25,16,65,'None','{first aid,cpr,safety}'),
('AgriSETA: Food Handling & Processing','SETA','AgriSETA','catering','Farm to plate food handling, processing hygiene, packaging, traceability and cold storage management.',3,60,40,18,60,'Grade 10','{agri,food,processing}'),
('SASSETA: Security Officer Grade E to A','SETA','SASSETA','security','Full PSIRA-aligned grades E to A: patrolling, access control, report writing, firearm awareness and crowd control.',3,120,80,18,60,'Grade 9','{security,psira,guard}'),
('ETDP SETA: Facilitator, Assessor & Moderator','SETA','ETDP SETA','education','Become an accredited trainer: facilitate learning, conduct outcomes-based assessment and moderate assessments.',5,80,45,21,65,'Grade 12','{trainer,assessor,moderator}'),
('MICT SETA: End User Computing NQF 3','SETA','MICT SETA','digital','Word, Excel, PowerPoint, internet and email to full NQF 3 unit standard level with practical portfolio of evidence.',3,90,130,16,60,'Grade 9','{computer,euc,office}'),
('MICT SETA: Data Capturing & Administration','SETA','MICT SETA','digital','Accurate high-speed data capture, spreadsheets, filing systems, POPIA-compliant record keeping and reporting.',3,60,50,17,60,'Grade 10','{data capture,admin,popia}'),
('FP&M SETA: Sewing & Garment Manufacturing','SETA','FP&M SETA','technical','Industrial machining, pattern basics, quality control and production line work in clothing manufacture.',2,80,70,17,60,'Grade 8','{sewing,clothing,manufacturing}'),
('UNICEF Life Skills & Psychosocial Support','UNICEF','UNICEF South Africa','life-skills','UNICEF life skills curriculum: self-awareness, resilience, decision making, coping and peer support.',3,30,15,14,35,'None','{life skills,youth,wellbeing}'),
('UNICEF Child Protection & Safeguarding','UNICEF','UNICEF South Africa','life-skills','Recognising abuse, mandatory reporting, safeguarding in the workplace and safe programming with children.',4,25,12,18,65,'Grade 10','{child protection,safeguarding}'),
('UNICEF Youth Leadership & Civic Engagement','UNICEF','UNICEF South Africa','life-skills','Community mobilisation, advocacy, running youth structures and project management for social impact.',4,35,18,16,35,'Grade 10','{leadership,youth,community}'),
('UNICEF Disability Inclusion in Employment','UNICEF','UNICEF South Africa','disability','Reasonable accommodation, inclusive recruitment, assistive technology and disability rights in the workplace.',4,25,12,16,65,'None','{disability,inclusion,rights}');

-- SEED JOBS
INSERT INTO public.jobs (company, title, category, description, city, province, employment_type, salary_min, salary_max, min_age, max_age, required_qualification, required_skills, min_experience, positions, disability_friendly, closes_at) VALUES
('WRCAN Catering Division','Head Chef - Corporate Contract','catering','Lead a brigade of 12 on a blue-chip corporate feeding contract serving 1200 covers daily.','Sandton','Gauteng','Full-time',28000,38000,25,55,'Grade 12','{cookery,menu planning,haccp,leadership}',5,1,false,'2026-10-31'),
('WRCAN Catering Division','Commis Chef (YES Placement)','catering','12-month YES placement for a young cook to gain accredited commercial kitchen experience.','Soweto','Gauteng','Learnership',4500,6000,18,29,'Grade 11','{cookery,hygiene,teamwork}',0,8,true,'2026-09-30'),
('Blue Ribbon Functions','Function Waiter - Weekends','catering','Weekend banqueting and wedding service across Gauteng venues. Own transport advantageous.','Pretoria','Gauteng','Part-time',3500,5500,18,45,'Grade 10','{service,hospitality,customer service}',1,20,true,'2026-12-15'),
('Cape Fine Foods','Food Safety Officer','catering','HACCP implementation and internal audits across three production sites in the Western Cape.','Cape Town','Western Cape','Full-time',22000,30000,24,55,'Diploma','{haccp,food safety,auditing,reporting}',3,2,false,'2026-10-10'),
('Shoprite Holdings','Retail Store Assistant','recruitment','Floor, till and stock duties in high-volume stores. Full in-house training provided.','Durban','KwaZulu-Natal','Full-time',5000,7500,18,40,'Grade 10','{retail,pos,customer service}',0,35,true,'2026-11-20'),
('Discovery Health','Call Centre Agent - Healthcare','recruitment','Inbound member servicing for a leading medical scheme. Excellent English and one other language.','Sandton','Gauteng','Full-time',9000,13000,19,45,'Grade 12','{communication,computer,customer service}',1,25,true,'2026-09-25'),
('Bidvest Protea Coin','Security Officer Grade C','recruitment','Static and access control posts. Valid PSIRA registration required or complete our funded training.','Johannesburg','Gauteng','Full-time',6500,9000,21,55,'Grade 9','{security,access control,report writing}',1,40,false,'2026-12-01'),
('Sun International','Housekeeping Supervisor','recruitment','Supervise a team of 15 room attendants at a five-star resort property.','Sun City','North West','Full-time',12000,16000,24,50,'Grade 12','{housekeeping,supervision,quality control}',3,3,false,'2026-10-05'),
('Netcare Group','Home Based Carer','recruitment','Provide dignified in-home care to elderly patients. Accredited HWSETA carer certificate required.','Port Elizabeth','Eastern Cape','Full-time',7000,10000,20,60,'Grade 10','{care,first aid,patient care,empathy}',1,15,true,'2026-11-11'),
('Sasol','Artisan Assistant - Welding','recruitment','Support qualified boilermakers on plant shutdowns and maintenance. Safety induction provided.','Secunda','Mpumalanga','Contract',11000,15000,20,50,'Grade 9','{welding,fabrication,safety}',2,10,false,'2026-09-18'),
('Capitec Bank','Data Capturer - Onboarding','recruitment','High-accuracy client data capture in a POPIA-controlled environment.','Stellenbosch','Western Cape','Contract',8000,11000,18,45,'Grade 12','{data capture,excel,accuracy,popia}',0,12,true,'2026-10-22'),
('WRCAN Empire Recruitment','Recruitment Consultant (360)','recruitment','Own a desk end to end: business development, sourcing, screening and placement across catering clients.','Midrand','Gauteng','Full-time',18000,45000,22,55,'Diploma','{recruitment,sales,communication,negotiation}',2,4,true,'2026-12-31');
