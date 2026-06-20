import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/app-shell";
import { Link } from "@tanstack/react-router";
import { BookOpen, ListTodo, Brain, Wallet, Sparkles, TrendingUp, TrendingDown, HeartPulse, Footprints, Dumbbell } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const userId = user!.id;
  const today = new Date().toISOString().slice(0, 10);

  const { data: stats } = useQuery({
    queryKey: ["dashboard", userId],
    queryFn: async () => {
      const [subjects, tasks, flashcards, finance, profile, steps, workoutsToday] = await Promise.all([
        supabase.from("subjects").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("tasks").select("*").eq("user_id", userId).neq("status", "concluida").order("due_date", { ascending: true }).limit(5),
        supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", userId).lte("next_review", today),
        supabase.from("finance_entries").select("type, amount").eq("user_id", userId),
        supabase.from("profiles").select("full_name, avatar_url, daily_steps_goal, weekly_workout_goal").eq("id", userId).maybeSingle(),
        supabase.from("step_logs").select("steps, distance_km").eq("user_id", userId).eq("log_date", today).maybeSingle(),
        supabase.from("workouts").select("*").eq("user_id", userId).eq("workout_date", today),
      ]);
      const balance = (finance.data ?? []).reduce(
        (acc, e) => acc + (e.type === "ganho" ? Number(e.amount) : -Number(e.amount)), 0,
      );
      const ganhos = (finance.data ?? []).filter(e => e.type === "ganho").reduce((a, e) => a + Number(e.amount), 0);
      const gastos = (finance.data ?? []).filter(e => e.type === "gasto").reduce((a, e) => a + Number(e.amount), 0);
      return {
        subjectsCount: subjects.count ?? 0,
        tasks: tasks.data ?? [],
        flashcardsDue: flashcards.count ?? 0,
        balance, ganhos, gastos,
        name: profile.data?.full_name ?? "",
        avatar: profile.data?.avatar_url ?? "",
        stepsGoal: profile.data?.daily_steps_goal ?? 8000,
        stepsToday: steps.data?.steps ?? 0,
        kmToday: Number(steps.data?.distance_km ?? 0),
        workoutsToday: workoutsToday.data ?? [],
      };
    },
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const stepsPct = stats ? Math.min(100, Math.round((stats.stepsToday / stats.stepsGoal) * 100)) : 0;

  return (
    <div>
      <PageHeader title={`${greeting}${stats?.name ? `, ${stats.name}` : ""}!`} description="Aqui está o resumo do seu dia." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard to="/estudos" icon={BookOpen} label="Matérias" value={stats?.subjectsCount ?? 0} accent="text-primary" />
        <StatCard to="/tarefas" icon={ListTodo} label="Tarefas pendentes" value={stats?.tasks.length ?? 0} accent="text-accent" />
        <StatCard to="/flashcards" icon={Brain} label="Flashcards para hoje" value={stats?.flashcardsDue ?? 0} accent="text-chart-2" />
        <StatCard to="/financas" icon={Wallet} label="Saldo" value={formatBRL(stats?.balance ?? 0)} accent={(stats?.balance ?? 0) >= 0 ? "text-success" : "text-destructive"} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/saude" className="card-surface p-5 transition hover:border-primary/40">
          <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Passos de hoje</span><Footprints className="h-4 w-4 text-accent" /></div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{(stats?.stepsToday ?? 0).toLocaleString("pt-BR")}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/60"><div className="h-full bg-primary" style={{ width: `${stepsPct}%` }} /></div>
          <p className="mt-1 text-xs text-muted-foreground">Meta {(stats?.stepsGoal ?? 0).toLocaleString("pt-BR")} · {(stats?.kmToday ?? 0).toFixed(2)} km</p>
        </Link>
        <Link to="/saude" className="card-surface p-5 transition hover:border-primary/40">
          <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Treino de hoje</span><Dumbbell className="h-4 w-4 text-primary" /></div>
          <p className="mt-2 text-2xl font-bold">{stats?.workoutsToday.length ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats && stats.workoutsToday.length > 0 ? stats.workoutsToday.map(w => w.name).join(", ") : "Sem treinos cadastrados para hoje"}
          </p>
        </Link>
        <Link to="/saude" className="card-surface p-5 transition hover:border-primary/40">
          <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Saúde</span><HeartPulse className="h-4 w-4 text-destructive" /></div>
          <p className="mt-2 text-sm">Acompanhe treinos, corridas e passos.</p>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Próximas tarefas</h2>
            <Link to="/tarefas" className="text-xs text-primary hover:underline">Ver todas</Link>
          </div>
          {stats?.tasks.length ? (
            <ul className="space-y-2">
              {stats.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
                  <span className="truncate">{t.title}</span>
                  <span className="text-xs text-muted-foreground">{t.due_date ?? "sem data"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Você ainda não cadastrou nenhuma tarefa.</p>
          )}
        </div>

        <div className="card-surface p-5">
          <h2 className="mb-4 font-semibold">Finanças</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><TrendingUp className="h-4 w-4 text-success" /> Ganhos</span>
              <span className="font-medium text-success">{formatBRL(stats?.ganhos ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground"><TrendingDown className="h-4 w-4 text-destructive" /> Gastos</span>
              <span className="font-medium text-destructive">{formatBRL(stats?.gastos ?? 0)}</span>
            </div>
            <div className="mt-3 border-t border-border pt-3 flex items-center justify-between">
              <span>Saldo</span>
              <span className="font-semibold">{formatBRL(stats?.balance ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 card-surface p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent"><Sparkles className="h-5 w-5" /></div>
          <div className="flex-1">
            <h3 className="font-semibold">Precisa de ajuda nos estudos?</h3>
            <p className="text-sm text-muted-foreground">Envie uma foto da questão ou um PDF e a IA do LifeStudy resolve, resume e cria flashcards.</p>
          </div>
          <Link to="/ia" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Abrir IA</Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ to, icon: Icon, label, value, accent }: {
  to: "/estudos" | "/tarefas" | "/flashcards" | "/financas";
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; accent: string;
}) {
  return (
    <Link to={to} className="card-surface block p-5 transition hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </Link>
  );
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
