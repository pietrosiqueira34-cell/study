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
import { Checkbox } from "@/components/ui/checkbox";
import { ListTodo, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tarefas")({
  component: Tarefas,
});

type Task = {
  id: string; title: string; description: string | null; due_date: string | null;
  priority: string; category: string; status: string;
};

function Tarefas() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("user_id", userId).order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<Task>) => {
      const { error } = await supabase.from("tasks").insert({ ...input, user_id: userId, title: input.title! });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", userId] }); toast.success("Tarefa criada"); setOpen(false); },
  });

  const toggleStatus = useMutation({
    mutationFn: async (t: Task) => {
      const { error } = await supabase.from("tasks").update({ status: t.status === "concluida" ? "pendente" : "concluida" }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", userId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks", userId] }); toast.success("Tarefa removida"); },
  });

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description="Sua rotina, prazos e prioridades."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova tarefa</Button></DialogTrigger>
            <TaskDialog onSubmit={(v) => create.mutate(v)} pending={create.isPending} />
          </Dialog>
        }
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Cadastre sua primeira tarefa"
          description="Organize compromissos, estudos e prazos importantes em um só lugar."
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova tarefa</Button>}
        />
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="card-surface flex items-center gap-3 px-4 py-3">
              <Checkbox checked={t.status === "concluida"} onCheckedChange={() => toggleStatus.mutate(t)} />
              <div className="min-w-0 flex-1">
                <p className={`truncate font-medium ${t.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {t.due_date && <span>📅 {t.due_date}</span>}
                  <span className="capitalize">⚑ {t.priority}</span>
                  <span className="capitalize">#{t.category}</span>
                </div>
              </div>
              <button onClick={() => remove.mutate(t.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskDialog({ onSubmit, pending }: { onSubmit: (v: Partial<Task>) => void; pending: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due_date, setDueDate] = useState("");
  const [priority, setPriority] = useState("media");
  const [category, setCategory] = useState("estudo");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova tarefa</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ title, description, due_date: due_date || null, priority, category }); }} className="space-y-4">
        <div className="space-y-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={due_date} onChange={(e) => setDueDate(e.target.value)} /></div>
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
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="escola">Escola</SelectItem>
              <SelectItem value="estudo">Estudo</SelectItem>
              <SelectItem value="trabalho">Trabalho</SelectItem>
              <SelectItem value="pessoal">Pessoal</SelectItem>
              <SelectItem value="saude">Saúde</SelectItem>
              <SelectItem value="projeto">Projeto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter><Button type="submit" disabled={pending}>Criar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
