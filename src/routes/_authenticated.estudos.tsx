import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/estudos")({
  component: Estudos,
});

type Subject = {
  id: string; name: string; color: string; priority: string; progress: number; notes: string | null;
};

function Estudos() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Subject[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; color: string; priority: string; notes: string }) => {
      const { error } = await supabase.from("subjects").insert({ ...input, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subjects", userId] }); toast.success("Matéria criada"); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subjects", userId] }); toast.success("Matéria removida"); },
  });

  const updateProgress = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => {
      const { error } = await supabase.from("subjects").update({ progress }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects", userId] }),
  });

  return (
    <div>
      <PageHeader
        title="Estudos"
        description="Suas matérias e progresso."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova matéria</Button>
            </DialogTrigger>
            <SubjectDialog onSubmit={(v) => create.mutate(v)} pending={create.isPending} />
          </Dialog>
        }
      />

      {subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Você ainda não cadastrou nenhuma matéria"
          description="Crie sua primeira matéria para começar a organizar seus estudos."
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Criar matéria</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <div key={s.id} className="card-surface p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl" style={{ background: s.color }} />
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">Prioridade: {s.priority}</p>
                  </div>
                </div>
                <button onClick={() => remove.mutate(s.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {s.notes && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{s.notes}</p>}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{s.progress}%</span>
                </div>
                <input
                  type="range" min={0} max={100} value={s.progress}
                  onChange={(e) => updateProgress.mutate({ id: s.id, progress: Number(e.target.value) })}
                  className="mt-1 w-full accent-primary"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubjectDialog({ onSubmit, pending }: { onSubmit: (v: { name: string; color: string; priority: string; notes: string }) => void; pending: boolean }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [priority, setPriority] = useState("media");
  const [notes, setNotes] = useState("");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova matéria</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, color, priority, notes }); }} className="space-y-4">
        <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Cor</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 p-1" /></div>
          <div className="space-y-1.5">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
        <DialogFooter><Button type="submit" disabled={pending}>Criar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
