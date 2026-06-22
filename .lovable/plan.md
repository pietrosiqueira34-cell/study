
## Visão geral
Vou preservar TUDO que já funciona (auth, banco, RLS, design, rotas, dados dos usuários) e fazer apenas as mudanças necessárias para os 9 pontos. Sem refazer do zero.

---

## 1. Build estático SPA (Netlify Drop + Web Into App)

**Estratégia:** ativar o modo SPA do TanStack Start (`server.preset: "static"` + prerender da rota `/`) e configurar fallback `index.html` para todas as rotas.

- Editar `vite.config.ts` para usar preset estático no build de produção e gerar saída em `dist/` no formato esperado.
- Editar `src/server.ts` para que em modo estático sirva o shell SPA.
- Adicionar `public/_redirects` com `/* /index.html 200` (Netlify SPA fallback).
- Adicionar `netlify.toml` com `[build] publish = "dist"` e a função de IA.
- Garantir que `npm run build` gere `dist/index.html` + `dist/assets/` + `dist/_redirects`.
- Remover qualquer dependência de SSR em runtime (server functions de leitura viram chamadas diretas ao Supabase no client; já é o padrão atual em quase todas as páginas).

**Importante:** o preview da Lovable continua funcionando porque o template não é desmontado — só ajustamos o output do build.

---

## 2. IA via Gemini direto (sem Lovable AI Gateway)

- Remover toda referência a `LOVABLE_API_KEY` e `ai.gateway.lovable.dev`.
- Criar `netlify/functions/ai.ts` que chama `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` (ou `:streamGenerateContent`) usando `GEMINI_API_KEY` do ambiente.
- A função aceita `{ messages, mode }` no mesmo formato que `/api/chat` usa hoje (compatibilidade total com a UI atual).
- Suporte multimodal: imagens passam como `inline_data` (base64) no payload do Gemini.
- Stream via Server-Sent Events para a UI continuar funcionando como agora.
- Reescrever `src/routes/_authenticated.ia.tsx` e `src/routes/_authenticated.pdfs.tsx` para chamar `/.netlify/functions/ai` em produção e `/api/chat` em dev (fallback que também usa Gemini direto agora).
- Atualizar `src/routes/api/chat.ts` para usar Gemini direto também (dev local) — same endpoint, mesma chave `GEMINI_API_KEY`.

---

## 3. PDFs — correção

Problemas conhecidos do `pdfjs-dist` em build moderno:
- `DOMMatrix is not defined` (acontece quando worker não está configurado corretamente).
- Falha de upload por bucket/RLS.

Ações:
- Configurar `pdfjs.GlobalWorkerOptions.workerSrc` com o worker correto (importar `pdfjs-dist/build/pdf.worker.min.mjs?url`).
- Garantir que `pdf-extract.ts` rode 100% client-side, sem nada em SSR.
- Verificar policies do bucket `pdfs` (upload/list/delete por `user_id`).
- Tratamento de erro com toast claro em vez de tela branca.
- Adicionar ações: gerar resumo curto, resumo longo, flashcards, questões, prova+gabarito, mapa mental, plano de revisão (botões que enviam o texto extraído com prompt pré-definido pra IA).

---

## 4. IA com imagem
Já existe na aba IA, só precisa ser portada para Gemini multimodal (item 2). Foto, galeria e print continuam funcionando via `<input type="file" accept="image/*" capture="environment">`.

---

## 5. Finanças
- Botão remover já existe; adicionar **confirmação** (AlertDialog).
- Adicionar **filtros**: tipo (ganho/gasto/todos), data (de–até), categoria (dropdown com categorias únicas).
- Saldo já é `ganhos − gastos`; recalcular reativamente após delete (já é o caso via react-query invalidate).

---

## 6. Saúde & Treino — grande melhoria
- Migration: adicionar campos em `workouts` (`workout_type`: casa/academia/corrida/caminhada/bike) e `workout_sets` (`muscle_group`, `rest_seconds`, `notes`, `completed`).
- Novo layout com:
  - Cards de treino do dia, progresso semanal (dias treinados, meta), tempo total.
  - Criar treino personalizado com seleção de tipo.
  - Biblioteca de exercícios pré-cadastrados (peito, costas, perna, ombro, bíceps, tríceps, abs, cardio; e em casa: flexão, abdominal, agachamento, prancha, polichinelo, burpee).
  - Cronômetro de treino + cronômetro de descanso.
  - Marcar série como concluída (checkbox).
  - Histórico de treinos.
- Visual com botões grandes, mobile-first.

---

## 7. Perfil & multiusuário
Já está implementado e isolado por `user_id` com RLS. Vou apenas:
- Adicionar campos faltantes (`workout_goal_per_week`) no perfil.
- Polir o estado vazio (empty states) nas páginas que não têm.

---

## 8. Performance & bugs
- Lazy loading das rotas pesadas (PDFs, IA, Saúde) via dynamic import.
- Skeleton loading em vez de "...".
- Remover chamadas duplicadas no Dashboard (consolidar em um único `useQuery`).
- Garantir que `react-query` cache rotas frequentes.

---

## 9. Mobile / Web Into App
- Já é mobile-first; vou revisar tamanhos de toque (mín 44px), inputs grandes.
- Adicionar `manifest.webmanifest` simples + meta tags para Web Into App reconhecer como app.
- Garantir `viewport` correto e sem zoom em inputs (`font-size: 16px` mínimo).

---

## Entregáveis finais (vou listar no fim da execução)
- Lista de arquivos alterados.
- Dependências removidas / adicionadas.
- Variáveis de ambiente do Netlify: `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Pasta para Netlify Drop: `dist/`.
- Como testar: `npm run build` → conferir `dist/index.html` → abrir `dist/` num servidor estático local (`npx serve dist`).

---

## Detalhes técnicos (para referência)

### Estrutura final esperada
```
dist/
  index.html
  assets/*.js
  assets/*.css
  _redirects        # /* /index.html 200
netlify/
  functions/
    ai.ts           # Gemini proxy (stream)
netlify.toml
```

### Função AI (resumo)
```ts
// netlify/functions/ai.ts
export default async (req: Request) => {
  const { messages } = await req.json();
  const key = process.env.GEMINI_API_KEY;
  // converte messages OpenAI-style → Gemini contents/parts (com inline_data pra imagens)
  // chama streamGenerateContent, repassa SSE pra UI
}
```

### Risco
A conversão para preset estático do TanStack Start pode demandar 2-3 iterações até o build sair limpo. Se der problema irrecuperável, o fallback é gerar com `prerender` de todas as rotas + servir SPA. Te aviso se precisar.

Confirma que posso seguir?
