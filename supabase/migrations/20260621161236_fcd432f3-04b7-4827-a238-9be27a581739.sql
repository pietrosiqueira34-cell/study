ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS workout_type text NOT NULL DEFAULT 'academia',
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

ALTER TABLE public.workout_sets
  ADD COLUMN IF NOT EXISTS muscle_group text;

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts(user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON public.workout_sets(workout_id, position);
CREATE INDEX IF NOT EXISTS idx_finance_user_date ON public.finance_entries(user_id, entry_date DESC);