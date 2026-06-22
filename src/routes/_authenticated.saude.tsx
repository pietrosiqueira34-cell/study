import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { HeartPulse, Dumbbell, Footprints, Timer, Trash2, Plus, Play, Pause, RotateCcw, Check, Home, Bike, Flame, Target } from "lucide-react";
import { toast } from "sonner";
import { stepCounter, stepsToKm, type StepCounterState } from "@/lib/step-counter";

export const Route = createFileRoute("/_authenticated/saude")({
  component: Saude,
});

type Tab = "treinos" | "cardio" | "passos";

const WORKOUT_TYPES = [
  { value: "academia", label: "Academia", icon: Dumbbell },
  { value: "casa", label: "Em casa", icon: Home },
  { value: "corrida", label: "Corrida", icon: Footprints },
  { value: "caminhada", label: "Caminhada", icon: Footprints },
  { value: "bike", label: "Bike", icon: Bike },
] as const;

// Biblioteca de exercícios pré-cadastrados
const EXERCISE_LIB: Record<string, string[]> = {
  Peito: ["Supino reto", "Supino inclinado", "Crucifixo", "Crossover", "Flexão de braço"],
  Costas: ["Puxada frontal", "Remada baixa", "Remada curvada", "Barra fixa", "Pulldown"],
  Pernas: ["Agachamento", "Leg press", "Cadeira extensora", "Mesa flexora", "Stiff"],
  Ombro: ["Desenvolvimento", "Elevação lateral", "Elevação frontal", "Encolhimento", "Arnold press"],
  Bíceps: ["Rosca direta", "Rosca alternada", "Rosca martelo", "Rosca concentrada", "Rosca scott"],
  Tríceps: ["Tríceps testa", "Tríceps pulley", "Tríceps francês", "Mergulho", "Tríceps coice"],
  Abdômen: ["Abdominal supra", "Prancha", "Abdominal infra", "Russian twist", "Elevação de pernas"],
  Cardio: ["Esteira", "Bike ergométrica", "Elíptico", "Pular corda", "Burpee"],
  Casa: ["Flexão", "Agachamento livre", "Polichinelo", "Prancha", "Burpee", "Abdominal", "Afundo", "Mountain climber"],
};

function Saude() {
  const [tab, setTab] = useState<Tab>("treinos");
  return (
    <div>
      <PageHeader title="Saúde & Treino" description="Academia, treino em casa, corrida, bike e contador de passos." />
      <div className="mb-4 flex overflow-x-auto rounded-xl border border-border bg-card p-1 text-sm">
        {([
          { k: "treinos", label: "Treinos", icon: Dumbbell },
          { k: "cardio", label: "Corrida/Bike", icon: Footprints },
          { k: "passos", label: "Passos", icon: HeartPulse },
        ] as const).map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setTab(k)} className={`flex flex-1 min-w-[110px] items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 font-medium ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {tab === "treinos" && <Workouts />}
      {tab === "cardio" && <Cardio />}
      {tab === "passos" && <Steps />}
    </div>
  );
}

/* -------------- Workouts -------------- */
type WorkoutRow = {
  id: string; name: string; muscle_group: string | null; notes: string | null;
  completed: boolean; workout_date: string; workout_type: string;
  duration_seconds: number | null;
};

function Workouts() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ name: "", muscle_group: "Peito", notes: "", workout_type: "academia" });
  const [confirmDel, setConfirmDel] = useState<WorkoutRow | null>(null);

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workouts").select("*").eq("user_id", userId).order("workout_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutRow[];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-workout-goal", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("weekly_workout_goal").eq("id", userId).maybeSingle();
      return data;
    },
  });
  const weeklyGoal = profile?.weekly_workout_goal ?? 4;

  // Progresso semanal
  const weekStats = useMemo(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // segunda = 0
    const monday = new Date(now); monday.setDate(now.getDate() - dow); monday.setHours(0, 0, 0, 0);
    const mondayIso = monday.toISOString().slice(0, 10);
    const week = workouts.filter((w) => w.workout_date >= mondayIso);
    const done = week.filter((w) => w.completed).length;
    const totalSeconds = week.reduce((acc, w) => acc + (w.duration_seconds ?? 0), 0);
    return { done, total: week.length, totalSeconds };
  }, [workouts]);

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Dê um nome ao treino");
      const { error } = await supabase.from("workouts").insert({
        user_id: userId, name: form.name, muscle_group: form.muscle_group, notes: form.notes, workout_type: form.workout_type,
      });
      if (error) throw error;
    },
    onSuccess: () => { setOpenNew(false); setForm({ name: "", muscle_group: "Peito", notes: "", workout_type: "academia" }); qc.invalidateQueries({ queryKey: ["workouts", userId] }); toast.success("Treino criado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("workouts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workouts", userId] }); toast.success("Treino removido"); setConfirmDel(null); },
  });

  const toggleDone = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("workouts").update({ completed: !completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts", userId] }),
  });

  const goalPct = Math.min(100, Math.round((weekStats.done / Math.max(1, weeklyGoal)) * 100));

  return (
    <div className="space-y-4">
      {/* Progresso semanal */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card-surface p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Esta semana</span><Target className="h-4 w-4 text-primary" /></div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{weekStats.done}<span className="text-base text-muted-foreground"> / {weeklyGoal}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/60">
            <div className="h-full bg-primary transition-all" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">treinos concluídos</p>
        </div>
        <div className="card-surface p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Tempo treinado</span><Timer className="h-4 w-4 text-accent" /></div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{Math.round(weekStats.totalSeconds / 60)}<span className="text-base text-muted-foreground"> min</span></div>
          <p className="mt-1 text-xs text-muted-foreground">na semana</p>
        </div>
        <div className="card-surface p-4">
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Total criados</span><Flame className="h-4 w-4 text-warning" /></div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{workouts.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">treinos no histórico</p>
        </div>
      </div>

      <RestTimer />

      <div className="flex justify-end">
        <Button size="lg" onClick={() => setOpenNew(!openNew)}><Plus className="h-4 w-4" /> Novo treino</Button>
      </div>

      {openNew && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="card-surface space-y-3 p-4">
          <div>
            <Label>Tipo de treino</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {WORKOUT_TYPES.map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => setForm({ ...form, workout_type: value })}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${form.workout_type === value ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Nome do treino</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Treino A — Peito/Tríceps" /></div>
            <div>
              <Label>Grupo principal</Label>
              <Select value={form.muscle_group} onValueChange={(v) => setForm({ ...form, muscle_group: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(EXERCISE_LIB).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-2"><Button type="submit" disabled={create.isPending}>Salvar</Button><Button type="button" variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button></div>
        </form>
      )}

      {workouts.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Nenhum treino ainda" description="Crie seu primeiro treino. Você pode escolher entre academia, treino em casa, corrida, caminhada ou bike." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} onDelete={() => setConfirmDel(w)} onToggle={() => toggleDone.mutate({ id: w.id, completed: w.completed })} />
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover treino?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel && <>Você vai apagar <strong>{confirmDel.name}</strong> e todos os exercícios dele.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDel && del.mutate(confirmDel.id)} className="bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WorkoutCard({ workout, onDelete, onToggle }: { workout: WorkoutRow; onDelete: () => void; onToggle: () => void }) {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [openSet, setOpenSet] = useState(false);
  const [setForm, setSetForm] = useState({ exercise: "", sets: 3, reps: 10, weight_kg: 0, rest_seconds: 60 });
  const [stopwatch, setStopwatch] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setStopwatch((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const { data: sets = [] } = useQuery({
    queryKey: ["workout_sets", workout.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("workout_sets").select("*").eq("workout_id", workout.id).order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addSet = useMutation({
    mutationFn: async () => {
      if (!setForm.exercise.trim()) throw new Error("Informe o exercício");
      const { error } = await supabase.from("workout_sets").insert({
        user_id: userId, workout_id: workout.id, ...setForm, position: sets.length, muscle_group: workout.muscle_group,
      });
      if (error) throw error;
    },
    onSuccess: () => { setOpenSet(false); setSetForm({ exercise: "", sets: 3, reps: 10, weight_kg: 0, rest_seconds: 60 }); qc.invalidateQueries({ queryKey: ["workout_sets", workout.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleSet = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("workout_sets").update({ completed: !completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout_sets", workout.id] }),
  });

  const delSet = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("workout_sets").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout_sets", workout.id] }),
  });

  async function saveDuration() {
    if (stopwatch < 10) return;
    await supabase.from("workouts").update({ duration_seconds: stopwatch }).eq("id", workout.id);
    qc.invalidateQueries({ queryKey: ["workouts", userId] });
    toast.success(`Treino: ${Math.round(stopwatch / 60)} min salvos`);
    setStopwatch(0); setRunning(false);
  }

  const exerciseSuggestions = workout.muscle_group && EXERCISE_LIB[workout.muscle_group] ? EXERCISE_LIB[workout.muscle_group] : EXERCISE_LIB.Casa;
  const typeMeta = WORKOUT_TYPES.find((t) => t.value === workout.workout_type) ?? WORKOUT_TYPES[0];
  const TypeIcon = typeMeta.icon;

  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><TypeIcon className="h-5 w-5" /></div>
          <div>
            <h3 className="font-semibold leading-tight">{workout.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{typeMeta.label} · {workout.muscle_group} · {workout.workout_date}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant={workout.completed ? "default" : "secondary"} size="sm" onClick={onToggle}>
            <Check className="h-3.5 w-3.5" /> {workout.completed ? "Feito" : "Marcar"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      {workout.notes && <p className="mt-2 text-xs text-muted-foreground">{workout.notes}</p>}

      {/* Cronômetro de treino */}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
        <Timer className="h-4 w-4 text-accent" />
        <span className="font-mono text-lg tabular-nums">{String(Math.floor(stopwatch / 60)).padStart(2, "0")}:{String(stopwatch % 60).padStart(2, "0")}</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant={running ? "secondary" : "default"} onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setStopwatch(0); setRunning(false); }}><RotateCcw className="h-3 w-3" /></Button>
          {stopwatch >= 10 && <Button size="sm" variant="secondary" onClick={saveDuration}>Salvar</Button>}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {sets.map((s) => (
          <div key={s.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${s.completed ? "border-success/60 bg-success/10" : "border-border bg-background/40"}`}>
            <button onClick={() => toggleSet.mutate({ id: s.id, completed: s.completed })} className={`grid h-6 w-6 shrink-0 place-items-center rounded border ${s.completed ? "border-success bg-success text-success-foreground" : "border-border"}`}>
              {s.completed && <Check className="h-3 w-3" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{s.exercise}</div>
              <div className="text-xs text-muted-foreground">{s.sets}x{s.reps} · {s.weight_kg ?? 0}kg · descanso {s.rest_seconds}s</div>
            </div>
            <button onClick={() => delSet.mutate(s.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      {openSet ? (
        <form onSubmit={(e) => { e.preventDefault(); addSet.mutate(); }} className="mt-3 space-y-2">
          <div>
            <Label className="text-xs">Exercício</Label>
            <Input list={`ex-${workout.id}`} placeholder="Digite ou escolha" value={setForm.exercise} onChange={(e) => setSetForm({ ...setForm, exercise: e.target.value })} />
            <datalist id={`ex-${workout.id}`}>{exerciseSuggestions.map((e) => <option key={e} value={e} />)}</datalist>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div><Label className="text-xs">Séries</Label><Input type="number" min={1} value={setForm.sets} onChange={(e) => setSetForm({ ...setForm, sets: +e.target.value })} /></div>
            <div><Label className="text-xs">Reps</Label><Input type="number" min={1} value={setForm.reps} onChange={(e) => setSetForm({ ...setForm, reps: +e.target.value })} /></div>
            <div><Label className="text-xs">Kg</Label><Input type="number" min={0} step={0.5} value={setForm.weight_kg} onChange={(e) => setSetForm({ ...setForm, weight_kg: +e.target.value })} /></div>
            <div><Label className="text-xs">Desc(s)</Label><Input type="number" min={0} value={setForm.rest_seconds} onChange={(e) => setSetForm({ ...setForm, rest_seconds: +e.target.value })} /></div>
          </div>
          <div className="flex gap-2"><Button type="submit" size="sm">Adicionar</Button><Button type="button" size="sm" variant="ghost" onClick={() => setOpenSet(false)}>Cancelar</Button></div>
        </form>
      ) : (
        <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setOpenSet(true)}><Plus className="h-3.5 w-3.5" /> Adicionar exercício</Button>
      )}
    </div>
  );
}

/* -------------- Rest Timer -------------- */
function RestTimer() {
  const [target, setTarget] = useState(60);
  const [left, setLeft] = useState(60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) { setRunning(false); try { navigator.vibrate?.(300); } catch { /* noop */ } return 0; }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <div className="card-surface p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Timer className="h-4 w-4 text-accent" /> Cronômetro de descanso</div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="font-mono text-3xl tabular-nums">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</div>
        <div className="flex flex-wrap gap-1">
          {[30, 45, 60, 90, 120].map((s) => (
            <Button key={s} size="sm" variant={target === s ? "default" : "secondary"} onClick={() => { setTarget(s); setLeft(s); setRunning(false); }}>{s}s</Button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <Button size="sm" onClick={() => setRunning((r) => !r)}>{running ? <><Pause className="h-3.5 w-3.5" /> Pausar</> : <><Play className="h-3.5 w-3.5" /> Iniciar</>}</Button>
          <Button size="sm" variant="ghost" onClick={() => { setLeft(target); setRunning(false); }}><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

/* -------------- Cardio -------------- */
function Cardio() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [form, setForm] = useState({ activity_type: "corrida", duration_minutes: 30, distance_km: 5, notes: "" });

  const { data: items = [] } = useQuery({
    queryKey: ["cardio", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cardio_activities").select("*").eq("user_id", userId).order("activity_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const pace = form.distance_km > 0 ? `${(form.duration_minutes / form.distance_km).toFixed(2)} min/km` : null;
      const calsPerKm = form.activity_type === "corrida" ? 70 : form.activity_type === "bike" ? 35 : 45;
      const cals = Math.round(form.distance_km * calsPerKm);
      const { error } = await supabase.from("cardio_activities").insert({ user_id: userId, ...form, avg_pace: pace, calories: cals });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cardio", userId] }); toast.success("Atividade salva"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("cardio_activities").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cardio", userId] }),
  });

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="card-surface space-y-3 p-4">
        <div>
          <Label>Atividade</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {["corrida", "caminhada", "bike"].map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, activity_type: t })}
                className={`rounded-lg border px-4 py-2 text-sm capitalize ${form.activity_type === t ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Tempo (min)</Label><Input type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} /></div>
          <div><Label>Distância (km)</Label><Input type="number" step="0.1" min={0} value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: +e.target.value })} /></div>
          <div><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="opcional" /></div>
        </div>
        <Button type="submit" size="lg" disabled={add.isPending}>Salvar atividade</Button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon={Footprints} title="Sem atividades" description="Registre sua corrida, caminhada ou pedal." />
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="card-surface flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent">
                {c.activity_type === "bike" ? <Bike className="h-5 w-5" /> : <Footprints className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium capitalize">{c.activity_type} · {c.distance_km} km · {c.duration_minutes} min</div>
                <div className="text-xs text-muted-foreground">{c.activity_date} · ritmo {c.avg_pace ?? "—"} · {c.calories} kcal</div>
                {c.notes && <div className="truncate text-xs text-muted-foreground">{c.notes}</div>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => del.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------- Steps -------------- */
function Steps() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [state, setState] = useState<StepCounterState>(stepCounter.snapshot());

  const { data: profile } = useQuery({
    queryKey: ["profile-steps", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("daily_steps_goal").eq("id", userId).maybeSingle();
      return data;
    },
  });
  const goal = profile?.daily_steps_goal ?? 8000;

  const { data: todayLog } = useQuery({
    queryKey: ["steps", userId, today],
    queryFn: async () => {
      const { data } = await supabase.from("step_logs").select("*").eq("user_id", userId).eq("log_date", today).maybeSingle();
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["steps-history", userId],
    queryFn: async () => {
      const { data } = await supabase.from("step_logs").select("*").eq("user_id", userId).order("log_date", { ascending: false }).limit(7);
      return data ?? [];
    },
  });

  useEffect(() => { if (todayLog?.steps) stepCounter.setSteps(todayLog.steps); }, [todayLog?.steps]);
  useEffect(() => { const unsub = stepCounter.subscribe(setState); return () => { unsub(); }; }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const s = stepCounter.snapshot();
      if (!s.steps) return;
      const km = stepsToKm(s.steps);
      supabase.from("step_logs").upsert({ user_id: userId, log_date: today, steps: s.steps, distance_km: km }, { onConflict: "user_id,log_date" }).then(() => {
        qc.invalidateQueries({ queryKey: ["steps", userId, today] });
      });
    }, 15000);
    return () => clearInterval(id);
  }, [userId, today, qc]);

  const km = useMemo(() => stepsToKm(state.steps), [state.steps]);
  const pct = Math.min(100, Math.round((state.steps / goal) * 100));

  return (
    <div className="space-y-4">
      <div className="card-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Passos de hoje</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{state.steps.toLocaleString("pt-BR")}</p>
            <p className="mt-1 text-xs text-muted-foreground">Meta: {goal.toLocaleString("pt-BR")} passos</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Distância</p>
            <p className="text-2xl font-semibold">{km.toFixed(2)} km</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/60">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {state.active ? (
            <Button size="lg" variant="secondary" onClick={() => stepCounter.stop()}><Pause className="h-4 w-4" /> Pausar contagem</Button>
          ) : (
            <Button size="lg" onClick={async () => { const ok = await stepCounter.start(); if (!ok) toast.error("Sensores não disponíveis neste dispositivo."); }}><Play className="h-4 w-4" /> Iniciar contagem</Button>
          )}
          <Button size="lg" variant="ghost" onClick={() => stepCounter.reset()}><RotateCcw className="h-4 w-4" /> Zerar</Button>
        </div>
        {!state.supported && (
          <p className="mt-3 text-xs text-warning">Seu dispositivo/navegador não fornece dados do acelerômetro. Funciona melhor em smartphones.</p>
        )}
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Histórico — últimos 7 dias</h3>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p> : (
          <ul className="divide-y divide-border text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between py-2">
                <span>{h.log_date}</span>
                <span className="tabular-nums">{h.steps.toLocaleString("pt-BR")} passos · {Number(h.distance_km).toFixed(2)} km</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
