import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/financas")({
  component: Financas,
});

type Entry = {
  id: string; type: "ganho" | "gasto"; amount: number; category: string | null;
  description: string | null; entry_date: string;
};

function Financas() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["finance", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  const create = useMutation({
    mutationFn: async (v: Partial<Entry>) => {
      const { error } = await supabase.from("finance_entries").insert({
        user_id: userId, type: v.type!, amount: v.amount!, category: v.category, description: v.description, entry_date: v.entry_date!,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["finance", userId] }); toast.success("Lançamento criado"); setOpen(false); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("finance_entries").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", userId] }),
  });

  const { ganhos, gastos, saldo, chart } = useMemo(() => {
    let g = 0, p = 0;
    const byMonth: Record<string, { mes: string; ganhos: number; gastos: number }> = {};
    for (const e of entries) {
      const v = Number(e.amount);
      if (e.type === "ganho") g += v; else p += v;
      const m = e.entry_date.slice(0, 7);
      byMonth[m] ??= { mes: m, ganhos: 0, gastos: 0 };
      if (e.type === "ganho") byMonth[m].ganhos += v; else byMonth[m].gastos += v;
    }
    return { ganhos: g, gastos: p, saldo: g - p, chart: Object.values(byMonth).sort((a, b) => a.mes.localeCompare(b.mes)) };
  }, [entries]);

  return (
    <div>
      <PageHeader
        title="Finanças"
        description="Controle seus ganhos e gastos."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo lançamento</Button></DialogTrigger>
            <EntryDialog onSubmit={(v) => create.mutate(v)} pending={create.isPending} />
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Ganhos</span><TrendingUp className="h-4 w-4 text-success" /></div>
          <div className="mt-2 text-2xl font-bold text-success">{formatBRL(ganhos)}</div>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Gastos</span><TrendingDown className="h-4 w-4 text-destructive" /></div>
          <div className="mt-2 text-2xl font-bold text-destructive">{formatBRL(gastos)}</div>
        </div>
        <div className="card-surface p-5">
          <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Saldo</span><Wallet className="h-4 w-4 text-primary" /></div>
          <div className={`mt-2 text-2xl font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>{formatBRL(saldo)}</div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Wallet}
            title="Nenhum lançamento ainda"
            description="Cadastre seu primeiro ganho ou gasto."
            action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo lançamento</Button>}
          />
        </div>
      ) : (
        <>
          {chart.length > 0 && (
            <div className="card-surface mt-6 p-5">
              <h3 className="mb-4 font-semibold">Histórico mensal</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Bar dataKey="ganhos" fill="var(--success)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="gastos" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="card-surface mt-6 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3 text-right">Valor</th><th /></tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{e.entry_date}</td>
                    <td className="px-4 py-3">{e.description ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.category ?? "—"}</td>
                    <td className={`px-4 py-3 text-right font-medium ${e.type === "ganho" ? "text-success" : "text-destructive"}`}>
                      {e.type === "ganho" ? "+" : "−"} {formatBRL(Number(e.amount))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove.mutate(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function EntryDialog({ onSubmit, pending }: { onSubmit: (v: Partial<Entry>) => void; pending: boolean }) {
  const [type, setType] = useState<"ganho" | "gasto">("gasto");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [entry_date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ type, amount: Number(amount), category, description, entry_date }); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as "ganho" | "gasto")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ganho">Ganho</SelectItem>
                <SelectItem value="gasto">Gasto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Valor (R$)</Label><Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
        </div>
        <div className="space-y-1.5"><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Categoria</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ex: Mercado" /></div>
          <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={entry_date} onChange={(e) => setDate(e.target.value)} required /></div>
        </div>
        <DialogFooter><Button type="submit" disabled={pending}>Salvar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function formatBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
