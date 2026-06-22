// Dev-only proxy: chama Google Gemini direto (mesma lógica da Netlify Function).
// Em produção (Netlify), a função em /netlify/functions/ai.ts atende /api/chat.
import { createFileRoute } from "@tanstack/react-router";

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
type Part = TextPart | ImagePart;
type Msg = { role: "system" | "user" | "assistant"; content: string | Part[] };

const SYSTEM = `Você é a IA educacional do LifeStudy, um assistente brasileiro especializado em educação.
Ajude o usuário com:
- Explicar conteúdos escolares de forma simples e didática
- Resolver matemática e ciências passo a passo
- Quando o usuário enviar IMAGEM de questão/prova: leia, transcreva, resolva passo a passo, indique a alternativa correta, explique o conteúdo e resuma o tema
- Quando enviar texto de PDF: gere o que for pedido (resumo, flashcards, questões, prova, mapa mental, plano de revisão)
- Se a imagem estiver ilegível, peça nova foto com mais luz/foco
Responda sempre em português brasileiro, com markdown.`;

function dataUrlToInline(url: string) {
  const m = url.match(/^data:([^;]+);base64,(.+)$/);
  return m ? { mime: m[1], data: m[2] } : null;
}

async function urlToInline(url: string) {
  if (url.startsWith("data:")) return dataUrlToInline(url);
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const mime = r.headers.get("content-type") ?? "image/jpeg";
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { mime, data: btoa(bin) };
  } catch { return null; }
}

async function toGeminiContents(messages: Msg[]) {
  const contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    const role = m.role === "assistant" ? "model" : "user";
    const parts: Array<Record<string, unknown>> = [];
    if (typeof m.content === "string") parts.push({ text: m.content });
    else {
      for (const p of m.content) {
        if (p.type === "text") parts.push({ text: p.text });
        else if (p.type === "image_url") {
          const inline = await urlToInline(p.image_url.url);
          if (inline) parts.push({ inline_data: { mime_type: inline.mime, data: inline.data } });
        }
      }
    }
    if (!parts.length) parts.push({ text: "" });
    contents.push({ role, parts });
  }
  return contents;
}

function sseChunk(text: string) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, mode } = (await request.json()) as { messages: Msg[]; mode?: string };
          if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

          const key = process.env.GEMINI_API_KEY;
          if (!key) return new Response("GEMINI_API_KEY não configurada", { status: 500 });

          const contents = await toGeminiContents(messages);
          const systemText = SYSTEM + (mode === "pdf" ? "\nVocê está analisando o texto de um PDF." : "");

          const upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents,
                systemInstruction: { parts: [{ text: systemText }] },
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
              }),
            },
          );

          if (!upstream.ok || !upstream.body) {
            return new Response(await upstream.text(), { status: upstream.status });
          }

          const reader = upstream.body.getReader();
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              let buf = "";
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  const lines = buf.split("\n");
                  buf = lines.pop() ?? "";
                  for (const line of lines) {
                    const m = line.match(/^data:\s*(.*)$/);
                    if (!m) continue;
                    const raw = m[1].trim();
                    if (!raw || raw === "[DONE]") continue;
                    try {
                      const j = JSON.parse(raw);
                      const parts = j?.candidates?.[0]?.content?.parts ?? [];
                      for (const p of parts) {
                        if (typeof p?.text === "string" && p.text.length) {
                          controller.enqueue(encoder.encode(sseChunk(p.text)));
                        }
                      }
                    } catch { /* ignore */ }
                  }
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              } finally {
                controller.close();
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            },
          });
        } catch (e) {
          return new Response(e instanceof Error ? e.message : "error", { status: 500 });
        }
      },
    },
  },
});
