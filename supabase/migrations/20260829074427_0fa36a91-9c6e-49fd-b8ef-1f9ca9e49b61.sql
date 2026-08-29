ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE public.message_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE (message_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_receipts TO authenticated;
GRANT ALL ON public.message_receipts TO service_role;
ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_select_participants" ON public.message_receipts FOR SELECT TO authenticated
  USING (public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "receipts_insert_own" ON public.message_receipts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "receipts_update_own" ON public.message_receipts FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_receipts_conv ON public.message_receipts (conversation_id, user_id);

CREATE TABLE public.device_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'web',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tokens_own" ON public.device_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_device_tokens_updated BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.conversation_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_muted boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_settings TO authenticated;
GRANT ALL ON public.conversation_settings TO service_role;
ALTER TABLE public.conversation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_settings_own" ON public.conversation_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_conv_settings_updated BEFORE UPDATE ON public.conversation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.live_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_locations TO authenticated;
GRANT ALL ON public.live_locations TO service_role;
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_loc_select_participants" ON public.live_locations FOR SELECT TO authenticated
  USING (public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "live_loc_write_own" ON public.live_locations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_participant(conversation_id, auth.uid()));
CREATE POLICY "live_loc_update_own" ON public.live_locations FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "live_loc_delete_own" ON public.live_locations FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER trg_live_loc_updated BEFORE UPDATE ON public.live_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;
ALTER TABLE public.messages REPLICA IDENTITY FULL;