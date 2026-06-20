
-- Expand profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS weekly_study_goal_minutes INT DEFAULT 600,
  ADD COLUMN IF NOT EXISTS weekly_workout_goal INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS daily_steps_goal INT DEFAULT 8000,
  ADD COLUMN IF NOT EXISTS favorite_subjects TEXT[] DEFAULT '{}';

-- PDFs
CREATE TABLE IF NOT EXISTS public.pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  page_count INT,
  extracted_text TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdfs TO authenticated;
GRANT ALL ON public.pdfs TO service_role;
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pdfs" ON public.pdfs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pdfs_updated BEFORE UPDATE ON public.pdfs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workouts
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_group TEXT,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INT,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER workouts_updated BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workout sets
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise TEXT NOT NULL,
  sets INT DEFAULT 3,
  reps INT DEFAULT 10,
  weight_kg NUMERIC(6,2),
  rest_seconds INT DEFAULT 60,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sets TO authenticated;
GRANT ALL ON public.workout_sets TO service_role;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own workout_sets" ON public.workout_sets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cardio
CREATE TABLE IF NOT EXISTS public.cardio_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'corrida',
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes NUMERIC(6,2),
  distance_km NUMERIC(6,2),
  avg_pace TEXT,
  calories INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cardio_activities TO authenticated;
GRANT ALL ON public.cardio_activities TO service_role;
ALTER TABLE public.cardio_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cardio" ON public.cardio_activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Step logs (one row per user per day)
CREATE TABLE IF NOT EXISTS public.step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INT NOT NULL DEFAULT 0,
  distance_km NUMERIC(6,3) DEFAULT 0,
  active_minutes INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.step_logs TO authenticated;
GRANT ALL ON public.step_logs TO service_role;
ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own steps" ON public.step_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER step_logs_updated BEFORE UPDATE ON public.step_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
