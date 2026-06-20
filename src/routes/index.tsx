import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Brain, BookOpen, Wallet, Sparkles, ListTodo, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">LifeStudy</span>
        </div>
        <div className="flex gap-2">
          <Link to="/auth" className="rounded-lg px-4 py-2 text-sm hover:bg-secondary">Entrar</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Criar conta
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 sm:py-20">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent" /> Plataforma completa para sua rotina
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Estude, organize e <span className="gradient-text">evolua</span> em um lugar só.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            LifeStudy reúne matérias, tarefas, flashcards, finanças e uma IA de estudos
            em uma única plataforma — com seus dados privados e separados por conta.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90">
              Começar gratuitamente
            </Link>
            <Link to="/auth" className="rounded-xl border border-border px-6 py-3 text-sm font-semibold hover:bg-secondary">
              Já tenho conta
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { i: BookOpen, t: "Estudos", d: "Matérias, conteúdos e progresso por usuário." },
            { i: ListTodo, t: "Tarefas", d: "Organize sua rotina e prazos." },
            { i: Brain, t: "Flashcards", d: "Crie e revise com repetição espaçada." },
            { i: Wallet, t: "Finanças", d: "Controle ganhos e gastos com gráficos." },
            { i: Sparkles, t: "IA de Estudos", d: "Tire dúvidas, gere resumos e questões." },
            { i: GraduationCap, t: "Perfil personalizado", d: "Seus interesses guiam o app." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="card-surface p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LifeStudy
      </footer>
    </div>
  );
}
