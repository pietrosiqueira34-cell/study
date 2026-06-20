import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, User as UserIcon, ImagePlus, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { resizeImageToDataUrl } from "@/lib/pdf-extract";

export const Route = createFileRoute("/_authenticated/ia")({
  component: IA,
});

type Part = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type Msg = { role: "user" | "assistant"; content: string | Part[] };

function partsToText(c: Msg["content"]): string {
  if (typeof c === "string") return c;
  return c.map((p) => (p.type === "text" ? p.text : "🖼️ [imagem]")).join(" ");
}
function imagesIn(c: Msg["content"]): string[] {
  if (typeof c === "string") return [];
  return c.filter((p) => p.type === "image_url").map((p) => (p as { image_url: { url: string } }).image_url.url);
}

function IA() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou a IA do LifeStudy. Posso explicar matérias, resolver questões, criar resumos e flashcards. Você também pode me **enviar uma foto da questão** ou um print, e eu leio, resolvo e explico." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [messages]);

  async function onPickImage(f: File) {
    try {
      const data = await resizeImageToDataUrl(f, 1280, 0.85);
      setPendingImage(data);
    } catch {
      toast.error("Não consegui ler essa imagem");
    }
  }

  async function send() {
    const text = input.trim();
    if ((!text && !pendingImage) || busy) return;
    setInput("");
    const content: Part[] = [];
    if (pendingImage) content.push({ type: "image_url", image_url: { url: pendingImage } });
    content.push({ type: "text", text: text || "Resolva e explique a questão da imagem em detalhes, passo a passo. Inclua: enunciado transcrito, resolução, alternativa correta (se houver), conteúdo cobrado e um resumo." });
    setPendingImage(null);

    const newMessages: Msg[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok) {
        const t = await res.text();
        if (res.status === 429) throw new Error("Muitas requisições. Tente novamente em instantes.");
        if (res.status === 402) throw new Error("Créditos da IA esgotados.");
        throw new Error(t || "Falha na IA");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Sem stream");
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const m = line.match(/^data:\s*(.*)$/);
          if (!m) continue;
          if (m[1] === "[DONE]") continue;
          try {
            const json = JSON.parse(m[1]);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro";
      toast.error(msg);
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col md:h-[calc(100vh-5rem)]">
      <PageHeader title="IA de Estudos" description="Tire dúvidas, envie fotos de questões e peça resumos, flashcards ou questões." />
      <div ref={scrollRef} className="card-surface flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((m, i) => {
            const imgs = imagesIn(m.content);
            const text = partsToText(m.content);
            return (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}
                <div className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background/60 border border-border"
                }`}>
                  {imgs.map((src, j) => (
                    <img key={j} src={src} alt="anexo" className="max-h-56 rounded-lg border border-border/40" />
                  ))}
                  <div className="whitespace-pre-wrap">{text || (busy ? "..." : "")}</div>
                </div>
                {m.role === "user" && (
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {pendingImage && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <img src={pendingImage} alt="" className="h-10 w-10 rounded object-cover" />
          <span className="flex-1 text-muted-foreground">Imagem anexada — envie sua pergunta ou apenas clique em enviar.</span>
          <button onClick={() => setPendingImage(null)} className="rounded p-1 hover:bg-secondary" aria-label="Remover">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = ""; }}
        />
        <Button type="button" variant="secondary" size="lg" onClick={() => fileRef.current?.click()} aria-label="Anexar imagem">
          <ImagePlus className="h-4 w-4" />
        </Button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Pergunte algo, anexe uma foto da questão, peça resumos ou flashcards..."
          rows={1}
          className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <Button type="submit" disabled={busy || (!input.trim() && !pendingImage)} size="lg">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
