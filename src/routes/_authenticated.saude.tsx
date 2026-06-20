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
import { HeartPulse, Dumbbell, Footprints, Timer, Trash2, Plus, Play, Pause, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import { stepCounter, stepsToKm, type StepCounterState } from "@/lib/step-counter";

export const Route = createFileRoute("/_authenticated/saude")({
  component: Saude,
});

type Tab = "treinos" | "cardio" | "passos";

function Saude() {
  const [tab, setTab] = useState<Tab>("treinos");
  return (
    <div>
      <PageHeader title="Saúde & Treino" description="Academia, corrida, caminhada e contador de passos — tudo num só lugar." />
      <div className="mb-4 inline-flex rounded-xl border border-border bg-card p-1 text-sm">
        {([
          { k: "treinos", label: "Treinos", icon: Dumbbell },
          { k: "cardio", label: "Corrida/Caminhada", icon: Footprints },
          { k: "passos", label: "Passos", icon: HeartPulse },
        ] as const).map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
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
function Workouts() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ name: "", muscle_group: "Peito", notes: "" });

  const { data: workouts = [] } = useQuery({
    queryKey: ["workouts", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workouts").select("*").eq("user_id", userId).order("workout_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Dê um nome ao treino");
      const { error } = await supabase.from("workouts").insert({ user_id: userId, name: form.name, muscle_group: form.muscle_group, notes: form.notes });
      if (error) throw error;
    },
    onSuccess: () => { setOpenNew(false); setForm({ name: "", muscle_group: "Peito", notes: "" }); qc.invalidateQueries({ queryKey: ["workouts", userId] }); toast.success("Treino criado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("workouts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts", userId] }),
  });

  const toggleDone = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("workouts").update({ completed: !completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workouts", userId] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpenNew(!openNew)}><Plus className="h-4 w-4" /> Novo treino</Button>
      </div>

      {openNew && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="card-surface space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Treino A — Peito/Tríceps" /></div>
            <div><Label>Grupo muscular</Label><Input value={form.muscle_group} onChange={(e) => setForm({ ...form, muscle_group: e.target.value })} /></div>
          </div>
          <div><Label>Observações</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <Button type="submit" disabled={create.isPending}>Salvar</Button>
        </form>
      )}

      {workouts.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Nenhum treino ainda" description="Crie seu primeiro treino e adicione os exercícios e séries." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} onDelete={() => del.mutate(w.id)} onToggle={() => toggleDone.mutate({ id: w.id, completed: w.completed })} />
          ))}
        </div>
      )}

      <RestTimer />
    </div>
  );
}

function WorkoutCard({ workout, onDelete, onToggle }: { workout: { id: string; name: string; muscle_group: string | null; notes: string | null; completed: boolean; workout_date: string }; onDelete: () => void; onToggle: () => void }) {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [openSet, setOpenSet] = useState(false);
  const [setForm, setSetForm] = useState({ exercise: "", sets: 3, reps: 10, weight_kg: 0, rest_seconds: 60 });

  const { data: sets = [] } = useQuery({
    queryKey: ["workout_sets", workout.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("workout_sets").select("*").eq("workout_id", workout.id).order("position");
      if (error) throw error;
      return data;
    },
  });

  const addSet = useMutation({
    mutationFn: async () => {
      if (!setForm.exercise.trim()) throw new Error("Informe o exercício");
      const { error } = await supabase.from("workout_sets").insert({
        user_id: userId, workout_id: workout.id, ...setForm, position: sets.length,
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

  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{workout.name}</h3>
          <p className="text-xs text-muted-foreground">{workout.muscle_group} · {workout.workout_date}</p>
        </div>
        <div className="flex gap-1">
          <Button variant={workout.completed ? "default" : "secondary"} size="sm" onClick={onToggle}>
            <Check className="h-3.5 w-3.5" /> {workout.completed ? "Concluído" : "Marcar"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      {workout.notes && <p className="mt-2 text-xs text-muted-foreground">{workout.notes}</p>}

      <div className="mt-3 space-y-2">
        {sets.map((s) => (
          <div key={s.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${s.completed ? "border-success/60 bg-success/10" : "border-border bg-background/40"}`}>
            <button onClick={() => toggleSet.mutate({ id: s.id, completed: s.completed })} className={`grid h-5 w-5 place-items-center rounded border ${s.completed ? "border-success bg-success text-success-foreground" : "border-border"}`}>
              {s.completed && <Check className="h-3 w-3" />}
            </button>
            <div className="flex-1">
              <div className="font-medium">{s.exercise}</div>
              <div className="text-xs text-muted-foreground">{s.sets}x{s.reps} · {s.weight_kg ?? 0}kg · descanso {s.rest_seconds}s</div>
            </div>
            <button onClick={() => delSet.mutate(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      {openSet ? (
        <form onSubmit={(e) => { e.preventDefault(); addSet.mutate(); }} className="mt-3 grid gap-2 sm:grid-cols-5">
          <Input className="sm:col-span-2" placeholder="Exercício" value={setForm.exercise} onChange={(e) => setSetForm({ ...setForm, exercise: e.target.value })} />
          <Input type="number" placeholder="Séries" value={setForm.sets} onChange={(e) => setSetForm({ ...setForm, sets: +e.target.value })} />
          <Input type="number" placeholder="Reps" value={setForm.reps} onChange={(e) => setSetForm({ ...setForm, reps: +e.target.value })} />
          <Input type="number" placeholder="Kg" value={setForm.weight_kg} onChange={(e) => setSetForm({ ...setForm, weight_kg: +e.target.value })} />
          <div className="sm:col-span-5 flex gap-2">
            <Button type="submit" size="sm">Adicionar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpenSet(false)}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button variant="ghost" size="sm" className="mt-3" onClick={() => setOpenSet(true)}><Plus className="h-3.5 w-3.5" /> Adicionar exercício</Button>
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
      <div className="flex items-center gap-3">
        <div className="font-mono text-3xl tabular-nums">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</div>
        <div className="flex flex-wrap gap-1">
          {[30, 60, 90, 120].map((s) => (
            <Button key={s} size="sm" variant="secondary" onClick={() => { setTarget(s); setLeft(s); setRunning(false); }}>{s}s</Button>
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
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const pace = form.distance_km > 0 ? `${(form.duration_minutes / form.distance_km).toFixed(2)} min/km` : null;
      const cals = Math.round(form.distance_km * (form.activity_type === "corrida" ? 70 : 45));
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
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="card-surface grid gap-3 p-4 sm:grid-cols-5">
        <div>
          <Label>Tipo</Label>
          <select value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="corrida">Corrida</option><option value="caminhada">Caminhada</option><option value="bike">Bike</option>
          </select>
        </div>
        <div><Label>Tempo (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} /></div>
        <div><Label>Distância (km)</Label><Input type="number" step="0.1" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: +e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <div className="sm:col-span-5"><Button type="submit" disabled={add.isPending}>Salvar atividade</Button></div>
      </form>

      {items.length === 0 ? (
        <EmptyState icon={Footprints} title="Sem atividades" description="Registre sua corrida ou caminhada." />
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="card-surface flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent"><Footprints className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="font-medium capitalize">{c.activity_type} · {c.distance_km} km · {c.duration_minutes} min</div>
                <div className="text-xs text-muted-foreground">{c.activity_date} · ritmo {c.avg_pace ?? "—"} · {c.calories} kcal</div>
                {c.notes && <div className="text-xs text-muted-foreground">{c.notes}</div>}
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

  // Initialize from server
  useEffect(() => { if (todayLog?.steps) stepCounter.setSteps(todayLog.steps); }, [todayLog?.steps]);
  // Subscribe to counter
  useEffect(() => { const unsub = stepCounter.subscribe(setState); return () => { unsub(); }; }, []);

  // Persist throttled
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
        <div className="flex items-center justify-between">
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
            <Button variant="secondary" onClick={() => stepCounter.stop()}><Pause className="h-4 w-4" /> Pausar contagem</Button>
          ) : (
            <Button onClick={async () => { const ok = await stepCounter.start(); if (!ok) toast.error("Sensores não disponíveis neste dispositivo."); }}><Play className="h-4 w-4" /> Iniciar contagem</Button>
          )}
          <Button variant="ghost" onClick={() => stepCounter.reset()}><RotateCcw className="h-4 w-4" /> Zerar</Button>
        </div>
        {!state.supported && (
          <p className="mt-3 text-xs text-warning">Seu dispositivo/navegador não fornece dados do acelerômetro. Funciona melhor em smartphones.</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Em alguns celulares, a contagem em segundo plano pode depender das permissões do sistema. O app está pronto para integração futura com sensores nativos (Capacitor / Android Step Counter).
        </p>
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
