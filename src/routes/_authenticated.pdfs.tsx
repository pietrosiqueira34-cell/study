import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, EmptyState } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Upload, Trash2, Sparkles, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { extractPdfText } from "@/lib/pdf-extract";

export const Route = createFileRoute("/_authenticated/pdfs")({
  component: Pdfs,
});

const ACTIONS = [
  { key: "Resumo curto", prompt: "Faça um resumo curto e direto (até 10 linhas) do conteúdo." },
  { key: "Resumo completo", prompt: "Faça um resumo completo, bem estruturado, com tópicos e exemplos." },
  { key: "Flashcards", prompt: "Crie 15 flashcards no formato 'Pergunta: ... / Resposta: ...'." },
  { key: "Questões objetivas", prompt: "Crie 10 questões objetivas (a-e) com gabarito comentado." },
  { key: "Questões discursivas", prompt: "Crie 5 questões discursivas com resposta-modelo." },
  { key: "Prova completa", prompt: "Monte uma prova com 10 objetivas + 3 discursivas, com gabarito comentado." },
  { key: "Mapa mental", prompt: "Crie um mapa mental em texto (formato indentado) do conteúdo." },
  { key: "Plano de revisão", prompt: "Crie um plano de revisão de 7 dias para esse conteúdo." },
] as const;

function Pdfs() {
  const { user, session } = useAuth();
  const userId = user!.id;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiOutput, setAiOutput] = useState("");

  const { data: pdfs = [] } = useQuery({
    queryKey: ["pdfs", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("pdfs").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const active = useMemo(() => pdfs.find((p) => p.id === activeId) ?? null, [pdfs, activeId]);

  const filteredHits = useMemo(() => {
    if (!active?.extracted_text || !search.trim()) return [];
    const q = search.toLowerCase();
    return active.extracted_text
      .split("\n")
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => line.toLowerCase().includes(q))
      .slice(0, 50);
  }, [active, search]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const p = pdfs.find(x => x.id === id);
      if (!p) return;
      await supabase.storage.from("pdfs").remove([p.storage_path]);
      const { error } = await supabase.from("pdfs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pdfs", userId] }); if (activeId) setActiveId(null); toast.success("PDF removido"); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) { toast.error("Envie um arquivo .pdf"); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("PDF muito grande (máx 15MB)"); return; }
    setUploading(true);
    try {
      toast.message("Lendo o PDF...");
      const { text, pages } = await extractPdfText(file);
      const path = `${userId}/${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
      const up = await supabase.storage.from("pdfs").upload(path, file, { contentType: "application/pdf" });
      if (up.error) throw up.error;
      const { error } = await supabase.from("pdfs").insert({
        user_id: userId,
        title: file.name.replace(/\.pdf$/i, ""),
        storage_path: path,
        size_bytes: file.size,
        page_count: pages,
        extracted_text: text.slice(0, 200_000),
      });
      if (error) throw error;
      toast.success("PDF enviado");
      qc.invalidateQueries({ queryKey: ["pdfs", userId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar");
    } finally {
      setUploading(false);
    }
  }

  async function runAi(prompt: string) {
    if (!active?.extracted_text) { toast.error("PDF sem texto extraído"); return; }
    setAiBusy(true);
    setAiOutput("");
    try {
      const trimmed = active.extracted_text.slice(0, 60_000);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          mode: "pdf",
          messages: [
            { role: "user", content: `Conteúdo do PDF "${active.title}":\n\n${trimmed}\n\n---\nTarefa: ${prompt}` },
          ],
        }),
      });
      if (!res.ok) throw new Error(await res.text() || "Erro na IA");
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let acc = ""; let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          const m = line.match(/^data:\s*(.*)$/);
          if (!m || m[1] === "[DONE]") continue;
          try {
            const j = JSON.parse(m[1]);
            const d = j.choices?.[0]?.delta?.content;
            if (d) { acc += d; setAiOutput(acc); }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Meus PDFs"
        description="Envie apostilas, provas e textos. A IA analisa, resume e gera materiais."
        action={
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Enviar PDF
          </Button>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }}
      />

      {pdfs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum PDF ainda"
          description="Envie seu primeiro PDF para gerar resumos, flashcards, questões e mapas mentais com a IA."
          action={<Button onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Enviar PDF</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="card-surface space-y-2 p-3">
            {pdfs.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActiveId(p.id); setAiOutput(""); setSearch(""); }}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${activeId === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/60"}`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate text-sm font-medium">{p.title}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{p.page_count ?? "?"} págs · {Math.round((p.size_bytes ?? 0) / 1024)} KB</div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {!active ? (
              <div className="card-surface p-8 text-center text-sm text-muted-foreground">Selecione um PDF para analisar.</div>
            ) : (
              <>
                <div className="card-surface p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{active.title}</h2>
                      <p className="text-xs text-muted-foreground">{active.page_count} páginas</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => del.mutate(active.id)}>
                      <Trash2 className="h-4 w-4" /> Excluir
                    </Button>
                  </div>
                  <div className="mb-3 flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Pesquisar dentro do PDF" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  {search && (
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-background/40 p-2 text-xs">
                      {filteredHits.length === 0 ? <div className="text-muted-foreground">Sem resultados.</div> : filteredHits.map((h, i) => (
                        <div key={i} className="truncate"><span className="text-muted-foreground">L{h.i}:</span> {h.line.trim()}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card-surface p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Analisar com IA</h3>
                  <div className="flex flex-wrap gap-2">
                    {ACTIONS.map((a) => (
                      <Button key={a.key} variant="secondary" size="sm" disabled={aiBusy} onClick={() => runAi(a.prompt)}>
                        {a.key}
                      </Button>
                    ))}
                  </div>
                  {(aiBusy || aiOutput) && (
                    <div className="mt-4 max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background/40 p-4 text-sm">
                      {aiOutput || "Pensando..."}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">PDFs até 15 MB. O texto é extraído no seu navegador e enviado à IA quando você pedir uma análise.</p>
    </div>
  );
}
