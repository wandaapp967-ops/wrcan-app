ALTER TABLE public.clock_logs
  ADD COLUMN worker_name text,
  ADD COLUMN worker_role text;