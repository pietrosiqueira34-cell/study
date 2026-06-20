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
import { Brain, Plus, RotateCw, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/flashcards")({
  component: Flashcards,
});

type Card = {
  id: string; question: string; answer: string; difficulty: string;
  times_correct: number; times_wrong: number; next_review: string;
};

function Flashcards() {
  const { user } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const { data: cards = [] } = useQuery({
    queryKey: ["flashcards", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("flashcards").select("*").eq("user_id", userId).order("next_review", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Card[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { question: string; answer: string; difficulty: string }) => {
      const { error } = await supabase.from("flashcards").insert({ ...input, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["flashcards", userId] }); toast.success("Flashcard criado"); setOpen(false); },
  });

  const review = useMutation({
    mutationFn: async ({ card, correct }: { card: Card; correct: boolean }) => {
      const daysAhead = correct ? Math.max(1, Math.min(30, card.times_correct + 1) * 2) : 1;
      const next = new Date(); next.setDate(next.getDate() + daysAhead);
      const { error } = await supabase.from("flashcards").update({
        times_correct: card.times_correct + (correct ? 1 : 0),
        times_wrong: card.times_wrong + (correct ? 0 : 1),
        last_reviewed: new Date().toISOString(),
        next_review: next.toISOString().slice(0, 10),
      }).eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashcards", userId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flashcards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashcards", userId] }),
  });

  const today = new Date().toISOString().slice(0, 10);
  const dueCount = cards.filter(c => c.next_review <= today).length;

  return (
    <div>
      <PageHeader
        title="Flashcards"
        description={`${cards.length} cards • ${dueCount} para revisar hoje`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo card</Button></DialogTrigger>
            <CardDialog onSubmit={(v) => create.mutate(v)} pending={create.isPending} />
          </Dialog>
        }
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="Crie seu primeiro flashcard"
          description="Flashcards ajudam a memorizar com repetição espaçada."
          action={<Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Criar flashcard</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const isFlipped = flipped[c.id];
            const due = c.next_review <= today;
            return (
              <div key={c.id} className="card-surface flex flex-col p-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className={due ? "text-warning" : "text-muted-foreground"}>
                    {due ? "Revisar hoje" : `Próx: ${c.next_review}`}
                  </span>
                  <button onClick={() => remove.mutate(c.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div
                  onClick={() => setFlipped((f) => ({ ...f, [c.id]: !f[c.id] }))}
                  className="flex-1 cursor-pointer rounded-lg border border-border bg-background/40 p-4 text-sm transition hover:border-primary/40"
                >
                  <p className="text-xs uppercase text-muted-foreground">{isFlipped ? "Resposta" : "Pergunta"}</p>
                  <p className="mt-2 whitespace-pre-wrap">{isFlipped ? c.answer : c.question}</p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">✓ {c.times_correct} • ✗ {c.times_wrong}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => review.mutate({ card: c, correct: false })}
                      className="rounded-md bg-destructive/15 px-2 py-1 text-destructive hover:bg-destructive/25"
                    ><X className="h-3.5 w-3.5" /></button>
                    <button
                      onClick={() => setFlipped((f) => ({ ...f, [c.id]: !f[c.id] }))}
                      className="rounded-md bg-secondary px-2 py-1 hover:bg-secondary/70"
                    ><RotateCw className="h-3.5 w-3.5" /></button>
                    <button
                      onClick={() => review.mutate({ card: c, correct: true })}
                      className="rounded-md bg-success/20 px-2 py-1 text-success hover:bg-success/30"
                    ><Check className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CardDialog({ onSubmit, pending }: { onSubmit: (v: { question: string; answer: string; difficulty: string }) => void; pending: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo flashcard</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ question, answer, difficulty: "media" }); }} className="space-y-4">
        <div className="space-y-1.5"><Label>Pergunta</Label><Textarea value={question} onChange={(e) => setQuestion(e.target.value)} required rows={3} /></div>
        <div className="space-y-1.5"><Label>Resposta</Label><Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} required rows={3} /></div>
        <DialogFooter><Button type="submit" disabled={pending}>Criar</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
