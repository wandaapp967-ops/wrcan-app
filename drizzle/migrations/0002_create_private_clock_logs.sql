CREATE TABLE public.clock_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clock_type text NOT NULL CHECK (clock_type IN ('IN', 'OUT')),
  clocked_at timestamptz NOT NULL DEFAULT now(),
  snapshot_path text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.clock_logs TO authenticated;
GRANT ALL ON public.clock_logs TO service_role;
ALTER TABLE public.clock_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their own clock logs" ON public.clock_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Members create their own clock logs" ON public.clock_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'clock_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clock_logs;
  END IF;
END $$;
CREATE POLICY "Members read their own clock snapshots" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'clock-checkins' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Members upload their own clock snapshots" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'clock-checkins' AND (storage.foldername(name))[1] = auth.uid()::text
  );