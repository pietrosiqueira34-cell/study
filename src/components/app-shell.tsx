import { type ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, BookOpen, ListTodo, Brain, Wallet, Sparkles, User as UserIcon,
  LogOut, Menu, X, GraduationCap, FileText, HeartPulse,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/estudos", label: "Estudos", icon: BookOpen },
  { to: "/tarefas", label: "Tarefas", icon: ListTodo },
  { to: "/flashcards", label: "Flashcards", icon: Brain },
  { to: "/pdfs", label: "PDFs", icon: FileText },
  { to: "/ia", label: "IA de Estudos", icon: Sparkles },
  { to: "/saude", label: "Saúde & Treino", icon: HeartPulse },
  { to: "/financas", label: "Finanças", icon: Wallet },
  { to: "/perfil", label: "Perfil", icon: UserIcon },
] as const;

// Bottom tabs mobile — itens mais usados
const bottomNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/ia", label: "IA", icon: Sparkles },
  { to: "/saude", label: "Saúde", icon: HeartPulse },
  { to: "/perfil", label: "Perfil", icon: UserIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarInner pathname={location.pathname} onSignOut={handleSignOut} email={user?.email} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-semibold">LifeStudy</span>
          </div>
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-secondary" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {open && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end p-2">
                <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-sidebar-accent" aria-label="Fechar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarInner pathname={location.pathname} onSignOut={handleSignOut} email={user?.email} onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-8 sm:py-10 md:pb-10">{children}</main>

        {/* Bottom tab bar (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden">
          {bottomNav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link key={to} to={to} className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px]",
                active ? "text-primary" : "text-muted-foreground",
              )}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function SidebarInner({
  pathname, onSignOut, email, onNavigate,
}: { pathname: string; onSignOut: () => void; email?: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold">LifeStudy</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 px-2 text-xs text-sidebar-foreground/60 truncate">{email}</div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-surface flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
