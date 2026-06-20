import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, Camera, Sun, Moon } from "lucide-react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import { resizeImageToDataUrl } from "@/lib/pdf-extract";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: Perfil,
});

const SUGGESTED = ["ENEM", "Programação", "Inglês", "Matemática", "História", "Finanças", "Freelance", "Concursos", "Faculdade"];

function Perfil() {
  const { user, signOut } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: "", bio: "", goal: "", avatar_url: "",
    weekly_study_goal_minutes: 600, weekly_workout_goal: 3, daily_steps_goal: 8000,
    theme: "dark" as Theme,
    interests: [] as string[], favorite_subjects: [] as string[],
  });
  const [newInterest, setNewInterest] = useState("");
  const [newSubject, setNewSubject] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        bio: profile.bio ?? "",
        goal: profile.goal ?? "",
        avatar_url: profile.avatar_url ?? "",
        weekly_study_goal_minutes: profile.weekly_study_goal_minutes ?? 600,
        weekly_workout_goal: profile.weekly_workout_goal ?? 3,
        daily_steps_goal: profile.daily_steps_goal ?? 8000,
        theme: (profile.theme as Theme) ?? getStoredTheme(),
        interests: profile.interests ?? [],
        favorite_subjects: profile.favorite_subjects ?? [],
      });
      applyTheme((profile.theme as Theme) ?? getStoredTheme());
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile", userId] }); applyTheme(form.theme); toast.success("Perfil atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onPickAvatar(f: File) {
    try {
      const data = await resizeImageToDataUrl(f, 256, 0.9);
      setForm({ ...form, avatar_url: data });
    } catch { toast.error("Não foi possível ler a imagem"); }
  }

  function addTo(key: "interests" | "favorite_subjects", v: string) {
    const t = v.trim(); if (!t || form[key].includes(t)) return;
    setForm({ ...form, [key]: [...form[key], t] });
  }
  function removeFrom(key: "interests" | "favorite_subjects", v: string) {
    setForm({ ...form, [key]: form[key].filter((x) => x !== v) });
  }

  return (
    <div>
      <PageHeader title="Perfil" description="Seus dados e preferências." />
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-6 lg:grid-cols-3">
        <div className="card-surface space-y-4 p-6 lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-primary/20 text-2xl font-semibold text-primary">
                {form.avatar_url ? <img src={form.avatar_url} alt="" className="h-full w-full object-cover" /> : (form.full_name || user?.email || "?")[0]?.toUpperCase()}
              </div>
              <button type="button" onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                <Camera className="h-4 w-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickAvatar(f); e.target.value = ""; }} />
            </div>
            <div className="flex-1">
              <Label>Nome</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div className="space-y-1.5"><Label>Bio curta</Label><Textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Conte um pouco sobre você" /></div>
          <div className="space-y-1.5"><Label>Objetivo principal</Label><Textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} rows={2} placeholder="Ex: Passar no ENEM em 2026" /></div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label>Meta semanal de estudo (min)</Label><Input type="number" value={form.weekly_study_goal_minutes} onChange={(e) => setForm({ ...form, weekly_study_goal_minutes: +e.target.value })} /></div>
            <div><Label>Meta semanal de treino</Label><Input type="number" value={form.weekly_workout_goal} onChange={(e) => setForm({ ...form, weekly_workout_goal: +e.target.value })} /></div>
            <div><Label>Meta diária de passos</Label><Input type="number" value={form.daily_steps_goal} onChange={(e) => setForm({ ...form, daily_steps_goal: +e.target.value })} /></div>
          </div>

          <ChipField label="Matérias favoritas" items={form.favorite_subjects} value={newSubject} onChange={setNewSubject} onAdd={(v) => { addTo("favorite_subjects", v); setNewSubject(""); }} onRemove={(v) => removeFrom("favorite_subjects", v)} />
          <ChipField label="Interesses" items={form.interests} value={newInterest} onChange={setNewInterest} onAdd={(v) => { addTo("interests", v); setNewInterest(""); }} onRemove={(v) => removeFrom("interests", v)} suggested={SUGGESTED.filter((s) => !form.interests.includes(s))} onSuggest={(v) => addTo("interests", v)} />

          <Button type="submit" disabled={save.isPending}>Salvar alterações</Button>
        </div>

        <div className="space-y-4">
          <div className="card-surface p-6">
            <h3 className="font-semibold">Tema</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setForm({ ...form, theme: "dark" }); applyTheme("dark"); }} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.theme === "dark" ? "border-primary bg-primary/10" : "border-border"}`}>
                <Moon className="h-4 w-4" /> Escuro
              </button>
              <button type="button" onClick={() => { setForm({ ...form, theme: "light" }); applyTheme("light"); }} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm ${form.theme === "light" ? "border-primary bg-primary/10" : "border-border"}`}>
                <Sun className="h-4 w-4" /> Claro
              </button>
            </div>
          </div>
          <div className="card-surface p-6">
            <h3 className="font-semibold">Conta</h3>
            <p className="mt-1 text-sm text-muted-foreground">Sair da sua conta neste dispositivo.</p>
            <Button type="button" variant="destructive" className="mt-4 w-full" onClick={signOut}>Sair</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ChipField({ label, items, value, onChange, onAdd, onRemove, suggested, onSuggest }: {
  label: string; items: string[]; value: string;
  onChange: (v: string) => void; onAdd: (v: string) => void; onRemove: (v: string) => void;
  suggested?: string[]; onSuggest?: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">
            {i}<button type="button" onClick={() => onRemove(i)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(value); } }} placeholder="Adicionar" />
        <Button type="button" variant="secondary" onClick={() => onAdd(value)}>Adicionar</Button>
      </div>
      {suggested && onSuggest && (
        <div className="flex flex-wrap gap-1.5">
          {suggested.map((s) => (
            <button key={s} type="button" onClick={() => onSuggest(s)} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground">+ {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
