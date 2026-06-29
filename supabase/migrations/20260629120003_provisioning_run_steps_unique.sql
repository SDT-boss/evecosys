-- EVE-45: one row per (run, step) so the run store can upsert step progress.
ALTER TABLE public.provisioning_run_steps
  ADD CONSTRAINT provisioning_run_steps_run_step_unique UNIQUE (run_id, step_name);
