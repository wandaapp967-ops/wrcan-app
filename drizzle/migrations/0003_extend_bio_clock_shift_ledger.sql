ALTER TABLE public.clock_logs
  ADD COLUMN venue_label text,
  ADD COLUMN pulse_bpm_estimate integer,
  ADD COLUMN attendance_hash text,
  ADD COLUMN ppe_ready boolean,
  ADD COLUMN liveness_prompt_completed boolean,
  ADD COLUMN venue_verified boolean;

CREATE POLICY "Admin supervisors read clock logs"
  ON public.clock_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));