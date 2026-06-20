import { createFileRoute } from "@tanstack/react-router";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Msg = { role: "system" | "user" | "assistant"; content: string | ContentPart[] };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages, mode } = (await request.json()) as { messages: Msg[]; mode?: string };
          if (!Array.isArray(messages)) {
            return new Response("messages required", { status: 400 });
          }
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("LOVABLE_API_KEY missing", { status: 500 });

          const baseSystem = `Você é a IA educacional do LifeStudy, um assistente brasileiro especializado em educação.
Ajude o usuário com:
- Explicar conteúdos escolares de forma simples e didática
- Resolver questões de matemática e ciências com passo a passo claro
- Quando o usuário enviar uma IMAGEM de questão/prova/exercício: leia a imagem, transcreva o enunciado, resolva passo a passo, indique a alternativa correta (se houver), explique o conteúdo cobrado e dê um pequeno resumo do tema
- Quando o usuário enviar texto extraído de um PDF: gere o que ele pedir (resumo curto, resumo longo, flashcards, questões, prova, gabarito, mapa mental, plano de revisão)
- Se a imagem estiver ilegível, peça uma nova foto com mais luz e foco
Responda sempre em português brasileiro, usando markdown quando útil. Seja claro, encorajador e didático.`;

          const systemPrompt = mode === "pdf"
            ? baseSystem + "\nVocê está analisando o conteúdo de um PDF enviado pelo usuário."
            : baseSystem;

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              stream: true,
              messages: [{ role: "system", content: baseSystem }, ...messages.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content }))].concat(
                mode === "pdf" ? [{ role: "system", content: systemPrompt }] : []
              ),
            }),
          });

          if (!upstream.ok || !upstream.body) {
            const text = await upstream.text();
            return new Response(text || "AI error", { status: upstream.status });
          }

          return new Response(upstream.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "error";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
