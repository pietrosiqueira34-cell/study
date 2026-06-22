// Netlify Function — proxy para Google Gemini (sem Lovable AI Gateway).
// Aceita o mesmo payload que a UI já envia (OpenAI-style) e devolve SSE
// no formato OpenAI (`data: { choices:[{ delta:{ content } }] }`)
// para que o front continue funcionando sem mudanças.

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
type Part = TextPart | ImagePart;
type Msg = { role: "system" | "user" | "assistant"; content: string | Part[] };

const SYSTEM = `Você é a IA educacional do LifeStudy, um assistente brasileiro especializado em educação.
Ajude o usuário com:
- Explicar conteúdos escolares de forma simples e didática
- Resolver matemática e ciências passo a passo
- Quando o usuário enviar IMAGEM de questão/prova: leia, transcreva o enunciado, resolva passo a passo, indique a alternativa correta (se houver), explique o conteúdo cobrado e dê um resumo do tema
- Quando enviar texto de PDF: gere o que for pedido (resumo curto, resumo longo, flashcards, questões objetivas, questões discursivas, prova com gabarito, mapa mental, plano de revisão)
- Se a imagem estiver ilegível, peça uma nova foto com mais luz e foco
Responda sempre em português brasileiro com markdown. Seja claro, encorajador e didático.`;

function dataUrlToInline(url: string): { mime: string; data: string } | null {
  const m = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], data: m[2] };
}

async function urlToInline(url: string): Promise<{ mime: string; data: string } | null> {
  if (url.startsWith("data:")) return dataUrlToInline(url);
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const mime = r.headers.get("content-type") ?? "image/jpeg";
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { mime, data: btoa(bin) };
  } catch {
    return null;
  }
}

async function toGeminiContents(messages: Msg[]) {
  const contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    const role = m.role === "assistant" ? "model" : "user";
    const parts: Array<Record<string, unknown>> = [];
    if (typeof m.content === "string") {
      parts.push({ text: m.content });
    } else {
      for (const p of m.content) {
        if (p.type === "text") parts.push({ text: p.text });
        else if (p.type === "image_url") {
          const inline = await urlToInline(p.image_url.url);
          if (inline) parts.push({ inline_data: { mime_type: inline.mime, data: inline.data } });
        }
      }
    }
    if (parts.length === 0) parts.push({ text: "" });
    contents.push({ role, parts });
  }
  return contents;
}

function sseChunk(text: string): string {
  const payload = { choices: [{ delta: { content: text } }] };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return new Response("GEMINI_API_KEY não configurada no Netlify", { status: 500 });

  let body: { messages?: Msg[]; mode?: string };
  try { body = await req.json(); } catch { return new Response("invalid json", { status: 400 }); }
  const messages = body.messages;
  if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

  const contents = await toGeminiContents(messages);
  const systemText = SYSTEM + (body.mode === "pdf" ? "\nVocê está analisando o texto de um PDF enviado pelo usuário." : "");

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
    const txt = await upstream.text();
    return new Response(`Gemini error: ${txt.slice(0, 500)}`, { status: upstream.status });
  }

  // Converte SSE do Gemini -> SSE OpenAI-compat (que a UI já sabe ler)
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
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
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

export const config = { path: "/api/chat" };
