# 84 — SEO do produto com IA · Design

**Spec**: `.specs/features/84-seo-do-produto-com-ia/spec.md`
**Status**: Draft
**Branch**: `feature/84-seo-do-produto-com-ia`

---

## Architecture Overview

Três frentes, e só uma delas é nova:

1. **O checklist e a prévia** (`apps/backoffice`, `SIA-01..09`) — sem rede, sem banco novo. O item de SEO
   deixa de bloquear, e a prévia passa a chamar o **mesmo** `productPageMeta` que a loja serve.
2. **A regra da sugestão** (`packages/core/src/seo/suggestion.ts`) — limites, remoção da marca, régua de
   tom. Pura, sem import de pacote, alcançável pelo Deno.
3. **A edge function `seo-suggest`** (`supabase/functions/seo-suggest`) — a primeira integração com LLM.
   Molde de `admin-users`/`google-analytics` (`AD-004`, `AD-034`) e da porta de Web Push (`AD-062`): o
   SDK da Anthropic é importado em **um** arquivo de `_shared`, e o handler conhece só uma porta injetada.

```mermaid
graph TD
  subgraph Painel [apps/backoffice]
    P[AdminProductFormPage<br/>aba SEO] --> SP[SeoPreview<br/>productPageMeta]
    P --> BTN[SuggestSeoButton]
    BTN --> H[useSeoSuggestion<br/>em voo · desfazer · descarte]
    H -->|functions.invoke 'seo-suggest'| F
    P --> CK[buildChecklist<br/>SEO não bloqueia]
  end
  subgraph Funcao [supabase/functions/seo-suggest]
    F[index.ts — só fiação] --> R[handlers.ts route]
    R --> A[_shared/auth.ts requireAdmin]
    R --> RL[_shared/rateLimit.ts]
    R --> EX[examples.ts<br/>relacionados → mesma categoria]
    R --> PR[prompt.ts<br/>system + user + schema]
    R --> PORT((SeoModel port))
    R --> V[core/seo/suggestion.ts<br/>suggestionRefusal]
  end
  F -. injeta .-> C[_shared/claude.ts<br/>npm:@anthropic-ai/sdk@1.3.0]
  C --> API[(Claude API<br/>claude-haiku-5-5 · effort medium)]
  SP --> CORE[core/seo productPageMeta]
  V --> CORE
```

### Abordagens consideradas

| | Abordagem | Veredito |
| --- | --- | --- |
| **A** | **Edge function Supabase `seo-suggest`** + `_shared/claude.ts` com o SDK por `npm:` | **Escolhida.** É o padrão de toda operação com segredo de servidor (`AD-034`); `requireAdmin`, `rateLimit`, `corsHeaders` e o guarda de fiação (`wiringResolve`) já existem e cobrem a function nova por construção. |
| B | Função da Vercel no projeto do painel (`apps/backoffice/api/seo-suggest`), SDK Node nativo | Recusada. Precisaria de uma **segunda** porta de autorização (validar o JWT do Supabase e chamar `has_role` fora de `_shared/auth.ts`) — um segundo dono de "quem é admin" — e o painel não tem função de servidor hoje. |
| C | Chamar a Claude API do navegador | Recusada. A chave iria no bundle (é exatamente o que `chaveDeServidorForaDoNavegador` existe para impedir). |

---

## Code Reuse Analysis

### Existing Components to Leverage

| Componente | Local | Como |
| --- | --- | --- |
| `productPageMeta`, `brandedTitle`, `STORE_BRAND`, `summarize`, `descriptionFromHtml`, `DESCRIPTION_MAX` | `packages/core/src/seo/{pages,brand,text}.ts` | A prévia (`SIA-05..09`) e os limites da sugestão derivam daqui; nenhum número cravado de novo. |
| `htmlToText`, `stripFaqBlock` | `packages/core/src/faq/block.ts` | Texto da descrição enviado ao modelo (sem HTML, sem o bloco de FAQ). |
| `requireAdmin` | `supabase/functions/_shared/auth.ts` | `SIA-17`, sem cópia. |
| `createRateLimiter` | `supabase/functions/_shared/rateLimit.ts` | `SIA-18`, chave = `userId` (não IP: a porta é de admin, e o IP do painel é o mesmo para as duas pessoas). |
| `corsHeaders` | `supabase/functions/_shared/http.ts` | Reexporta, nunca declara (`http.test.ts`). |
| Molde `PushSender` / `webPush.ts` | `supabase/functions/_shared/webPush.ts` | Biblioteca externa importada num arquivo só, versão exata, só os `index.ts` a importam; o handler vê uma interface. |
| Molde `useAnalyticsSecret` / `useAdminUsers` | `apps/backoffice/src/features/{google-analytics,admin-users}` | `supabase.functions.invoke` + leitura do status/corpo do `FunctionsHttpError`. |
| Dublês `_shared/testing` | `supabase/functions/_shared/testing` | Client do Supabase que registra `select`/filtros e devolve só as colunas pedidas (`L-040`). |
| `buildChecklist` / `canPublish` / `pendingCount` | `apps/backoffice/src/features/product-form/model/checklist.ts` | Ganha a noção de item **não bloqueante**. |
| `SeoPreview` | `apps/backoffice/src/features/product-form/ui/SeoPreview.tsx` | Recebe nome e descrição e passa a renderizar o servido. |

### Integration Points

| Sistema | Integração |
| --- | --- |
| Banco | **Sem migration.** A function só **lê** `products`, `product_categories` e `categories` com o client service-role (o mesmo que `requireAdmin` já usa), com colunas listadas uma a uma. |
| Claude API | `POST /v1/messages` pelo SDK oficial, `claude-haiku-5-5`, saída estruturada. |
| Secrets | `ANTHROPIC_API_KEY` no Supabase (servidor). `.env.example` da raiz documenta a chave; **nenhum** `.env` de app a recebe. |
| `config.toml` | `[functions.seo-suggest] verify_jwt = false`, com o mesmo comentário de `admin-users` (a anon key passaria pelo gateway; quem decide é `requireAdmin`). |
| CI | A chave **não** entra na lista obrigatória de `supabase-deploy.yml` (ver Tech Decisions). |

---

## Components

### 1. `packages/core/src/seo/suggestion.ts` (novo)

- **Purpose**: os limites e a régua de aceitação de uma sugestão de SEO — o "A7" da spec.
- **Interfaces**:
  - `SUGGESTION_TITLE_MAX: number` — **calculado**: `60 - \` | ${STORE_BRAND}\`.length` (= 43). O 60 vem de
    `SEO_TITLE_FIELD_MAX`, exportado aqui e lido também pelo `maxLength` do `SeoPreview` (hoje cravado).
  - `SUGGESTION_DESCRIPTION_MIN = 140`; máximo = `DESCRIPTION_MAX` (importado de `text.ts`).
    `SUGGESTION_DESCRIPTION_ASK_MIN = 150` — o piso que o prompt pede (A3: a régua aceita de 140, a
    folga evita retentativa por um caractere). *Revisto no conserto r2* (era 70).
  - `stripBrand(title: string): string` — tira `| Uma Estrelinha` / `| UE` do fim, colapsa espaço. Usa as
    mesmas regex de `brand.ts` (exportadas de lá, não copiadas).
  - `memorialToneRefusal(text: string): string | null` — emoji (`\p{Extended_Pictographic}`), `!`,
    vocabulário de urgência (lista literal, comentada com a origem: `CLAUDE.md` e a `homeSections`).
    Exportada à parte para a `BL-001`/`BL-014` reaproveitarem.
  - `suggestionRefusal(s: { title, description }, exampleTitles: string[], productName: string): string | null`
    — `string | null`, não união booleana (`strictNullChecks: false`, `CLAUDE.md`). Ordem: vazio →
    tamanho do título (depois de `stripBrand`) → faixa da descrição → tom → igual a exemplo (comparação
    sem caixa e sem acento) → igual ao nome do produto (A13, mesma comparação; o nome **contido** passa).
    *Revisto no conserto r2*: a recusa de material saiu (A12, decisão do usuário — o material é o termo
    buscado), e o terceiro parâmetro passou de `requiresMaterial` a `productName`.
- **Dependencies**: `./brand.ts`, `./text.ts` (e, por eles, `faq/block.ts`) — todos com `.ts` explícito.
  Sem `core/material` desde o conserto r2: o grafo Deno tem 6 arquivos (`suggestionDenoReach.test.ts`).
- **Reuses**: `brand.ts`, `text.ts`.

### 2. `supabase/functions/_shared/claude.ts` (novo — o único dono do SDK)

- **Purpose**: traduzir uma `ClaudeJsonRequest` neutra numa chamada do SDK e devolver um resultado neutro.
- **Interfaces**:
  ```ts
  // claudePort.ts (sem import nenhum — o handler e os testes importam SÓ isto)
  export interface ClaudeJsonRequest {
    model: string; effort: 'low' | 'medium' | 'high'; maxTokens: number
    system: string; user: string; schema: Record<string, unknown>; signal: AbortSignal
  }
  export type ClaudeJsonResult =
    | { kind: 'ok'; json: unknown; usage: { input: number; output: number } }
    | { kind: 'refusal' | 'truncated' | 'invalid'; usage: {...} }   // invalid = sem bloco text ou JSON que não parseia
    | { kind: 'upstream'; status: number | null }   // timeout, 5xx/529 depois da retentativa, rede
  export type ClaudeJson = (req: ClaudeJsonRequest) => Promise<ClaudeJsonResult>

  // claude.ts
  import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'
  export const createClaudeJson = (apiKey: string): ClaudeJson
  ```
  Dentro: `new Anthropic({ apiKey, maxRetries: 1, timeout: 15_000 })` e
  `client.messages.create({ model, max_tokens, system, messages: [{ role: 'user', content: user }],
  output_config: { effort, format: { type: 'json_schema', schema } } }, { signal })`. **Ramifica por
  `stop_reason` antes de ler `content`** (`refusal` → `refusal`; `max_tokens` → `truncated`), pega o
  bloco `text` e faz `JSON.parse`. Erros por classe tipada (`Anthropic.APIError` com `status`,
  `APIConnectionError`, `APIUserAbortError`), nunca por texto de mensagem. *Revisto no conserto r2*: a
  montagem mora em `claudeRequest.ts`, a volta em `claudeResult.ts` e o erro em `claudeError.ts`
  (`errorToResult(err, classes)`, as classes injetadas — o adaptador passa o próprio `Anthropic`); os
  três são puros e testados, e o arquivo `claude.ts` inteiro é fixado por igualdade pela AST.
- **Dependencies**: o SDK, só aqui. **Nunca** carregado pelo vitest (o handler vê a porta).
- **Reuses**: o desenho de `webPush.ts`/`PushSender`.

### 3. `supabase/functions/seo-suggest/` (novo)

- **`index.ts`** — só fiação: `createClient` service-role, `createClaudeJson(Deno.env.get('ANTHROPIC_API_KEY'))`
  **só se a chave existir** (senão `claude: null`), `createRateLimiter(30, 600_000, Date.now)`,
  `Deno.serve(req => route(deps, req))`.
- **`handlers.ts`** — `route(deps, req)`:
  1. `OPTIONS` → CORS; método ≠ `POST` → 405.
  2. `requireAdmin` → 401/403 (`SIA-17`). **Nada antes disto toca a Anthropic.**
  3. `deps.claude === null` → `503 not_configured` (`SIA-20`).
  4. `limiter.hit(userId)` falso → `429 limited` (`SIA-18`).
  5. `parseBody` → `400` fora dos limites (nome ≤ 200, ≤ 20 relacionados, ≤ 10 categorias, uuids).
  6. `loadContext(deps.supabase, body)` → nomes das categorias + exemplos (`examples.ts`).
  7. `buildSeoPrompt(...)` (`prompt.ts`) → `{ system, user, schema }`.
  8. Laço de **no máximo 2 tentativas** sob **um** `AbortController` de 15 s criado aqui (`AD-008`, fake
     timers controlam): `ok` → `suggestionRefusal(s, exemplos, body.name)`; aprovado ⇒ `200 { title: stripBrand(t), description,
     examples }`; reprovado ⇒ segunda tentativa **só se sobrarem ≥ 5 s**; `refusal`/`truncated` ⇒ `422`
     sem retentar; `upstream` ⇒ `502`.
  9. Uma linha de log JSON por chamada (`SIA-26`), sem texto do produto.
- **`examples.ts`** — `pickExamples(related, sameCategory, max = 5)` puro (ordem: relacionados curados,
  depois mesma categoria, sem repetir, sem o próprio produto) + `loadContext` com as duas leituras:
  - `products.select('id,name,seo_title,seo_description').in('id', relacionados).not('seo_title','is',null)`
  - `product_categories` → ids dos produtos das categorias → `products.select(mesmas 4 colunas)
    .eq('is_active', true).not('seo_title','is',null).order('updated_at', { ascending: false }).limit(8)`
  - `categories.select('id,name').in('id', categorias)`
  Colunas **literais**; o guarda de `SIA-21` lê os `select` deste arquivo.
- **`prompt.ts`** — `buildSeoPrompt(input)`: `system` **estável** (regras de tom do `CLAUDE.md` em
  prosa, tetos interpolados de `core`, "não repita os exemplos"; *revisto no conserto r2* com as regras
  de SEO da loja: título ≤ 43 sem a marca com a palavra-chave — tipo de joia + material afetivo — no
  início, material base se couber, nunca igual ao nome do produto; descrição de 150 a 160 com
  palavra-chave, benefício emocional e fecho sem urgência; o material afetivo **pode e deve** ser
  nomeado, A12); `user` com a
  peça e os exemplos como dados delimitados (`<produto>`, `<exemplo>`), descrição cortada em 4.000
  caracteres em limite de palavra. Schema: `{ type: 'object', properties: { title: { type: 'string' },
  description: { type: 'string' } }, required: ['title','description'], additionalProperties: false }`.
  Constantes da chamada **aqui**: `SEO_MODEL = 'claude-haiku-5-5'`, `SEO_EFFORT = 'medium'`,
  `SEO_MAX_TOKENS = 4096` (o thinking adaptativo conta dentro do `max_tokens`; 4096 cobre thinking em
  `medium` + ~200 tokens de JSON).

### 4. `apps/backoffice/src/features/product-form/model/checklist.ts` (alterado)

- `ChecklistItem` ganha `blocking: boolean`. Os cinco itens de antes: `true`. `seo`: `false`, `ok`
  sempre `true`, `label` pelo estado (`SIA-03`: automático / curado / parcial), `hint` informativo.
- `canPublish` e `pendingCount` passam a olhar só `blocking` — **régua invertida**, não apagada: o caso
  de `checklist.test.ts` que exigia SEO para publicar vira o que prova que SEO **não** impede.

### 5. `apps/backoffice/src/features/product-form/ui/SeoPreview.tsx` (alterado)

- **Props novas**: `name`, `description` (HTML). Calcula `meta = productPageMeta({ name, description,
  seo_title: title, seo_description }, storeDescription)` a cada render (`SIA-05`, `SIA-16`).
- `placeholder` do título = nome; da descrição = `descriptionFromHtml(description)` (`SIA-06`).
- Selo "automático" ao lado do que veio derivado (`SIA-08`); contador `38/60 · 55 com a marca` usando
  `brandedTitle(title).length` (`SIA-09`); `maxLength` lido de `SEO_TITLE_FIELD_MAX`.
- `storeDescription` vem do hook de settings que a loja já usa para o piso — **conferir no Execute** se
  o painel tem leitor de `store_settings.seo`; se não tiver, passa `undefined` e o piso é
  `STORE_DESCRIPTION_FLOOR` (diferença declarada: a loja usaria a descrição da loja).

### 6. `apps/backoffice/src/features/seo-suggestion/` (novo slice)

- **`api/requestSeoSuggestion.ts`** — `functions.invoke('seo-suggest', { body })`; traduz
  `FunctionsHttpError` → `{ kind: 'ok', title, description } | { kind: 'error', reason }` com `reason ∈
  'not_configured' | 'limited' | 'off_rules' | 'refusal' | 'truncated' | 'upstream' | 'network'`.
- **`model/copy.ts`** — as frases da spec, uma por `reason` (um dono das frases).
- **`model/useSeoSuggestion.ts`** — `{ status, message, canUndo, suggest(input), undo(), noteManualEdit(), reset() }`:
  - número de sequência por pedido; resposta de pedido antigo, de componente desmontado ou depois de
    `noteManualEdit()` ⇒ descartada (`SIA-24`, `SIA-25`, com a frase de `SIA-25`);
  - guarda `{ title, description }` anteriores para `undo` (`SIA-12`); `noteManualEdit`, nova sugestão e
    `reset` (chamado pela página depois do save) limpam;
  - `not_configured` ⇒ `disabled` até desmontar (`SIA-20`).
- **`ui/SuggestSeoButton.tsx`** — botão "Sugerir com IA" (`TAP` ≥ 44 px, `motion-reduce:` em qualquer
  `animate-spin`, região `aria-live="polite"` para a mensagem), "Desfazer" ao lado.
- **Composição na página** (`AdminProductFormPage.tsx`, aba SEO): a página monta o botão e o
  `SeoPreview` lado a lado — sem import entre features. Os `onTitleChange`/`onDescriptionChange` da
  página chamam `noteManualEdit()` antes de `setField`. A sugestão aplicada chama `setField` nos dois.

---

## Data Models

Sem tabela nova. Contrato HTTP da function:

```ts
// POST /functions/v1/seo-suggest   Authorization: Bearer <jwt do admin>
interface SeoSuggestRequest {
  productId: string | null        // null = produto ainda não salvo; usado só para excluir dos exemplos
  name: string                    // 1..200
  description: string             // HTML do formulário; a function reduz a texto
  categoryIds: string[]           // ≤ 10 uuids
  relatedIds: string[]            // ≤ 20 uuids
  requiresMaterial: boolean
}
type SeoSuggestResponse =
  | { title: string; description: string; examples: number }                 // 200
  | { reason: 'not_configured' | 'limited' | 'off_rules' | 'refusal' | 'truncated' | 'upstream' | 'bad_request' }
```

---

## Error Handling Strategy

| Cenário | Function | Painel |
| --- | --- | --- |
| Sem JWT / sem papel / `has_role` erra | 401 / 403 / 403 | "Você não tem acesso a esta ação." — campos intocados |
| Chave ausente | 503 `not_configured` | botão desabilitado + "Sugestão por IA não está configurada." |
| Teto | 429 `limited` | "Muitas sugestões seguidas. Tente de novo em alguns minutos." |
| Corpo inválido | 400 `bad_request` | "Não consegui montar o pedido de sugestão." (não deveria acontecer pela tela) |
| Timeout 15 s, 5xx/529 após retentativa, rede | 502 `upstream` | "A sugestão não veio desta vez. Os campos continuam editáveis." |
| `stop_reason: refusal` | 422 `refusal` | "A IA não quis sugerir para esta peça." |
| `stop_reason: max_tokens` | 422 `truncated` | "A sugestão veio incompleta. Tente de novo." |
| JSON fora do schema / régua reprova 2× | 422 `off_rules` | "Não consegui uma sugestão dentro das regras da loja. Tente de novo ou escreva à mão." |
| Function inexistente (deploy fora de ordem) | — (404 do gateway) | tratado como `upstream` |
| Edição durante o voo / saída da página | — | resposta descartada; frase de `SIA-25` só no primeiro caso |

Em todos: **salvar continua liberado**, e o derivado continua valendo na loja.

---

## Risks & Concerns

| Concern | Local | Impacto | Mitigação |
| --- | --- | --- | --- |
| `index.ts` é o arquivo que nenhuma ferramenta lê (custou o `mercado-pago` fora do ar seis dias) | `supabase/functions/seo-suggest/index.ts` | Function morta em produção com a suíte verde | `wiringResolve.test.ts` cobre por construção (âncora derivada do disco); + **boot local** com `supabase functions serve` e um `curl` sem header (espera 401) como gate da task. |
| O SDK em Deno por `npm:` nunca foi usado no repo (só `esm.sh` e `jsr:`) | `_shared/claude.ts` | Resolução falhando só no deploy | Probe local contra a API real (Success Criteria) roda pelo edge runtime local, não por Node. Se `npm:` falhar no runtime local, cair para `https://esm.sh/@anthropic-ai/sdk@1.3.0` e registrar. |
| Formato exato de `output_config.format` para JSON Schema cru | `_shared/claude.ts` | 400 da API | Conferido contra a doc viva (`shared/live-sources.md` da skill) no Execute antes de escrever; o probe prova. |
| O guarda de RPCs da loja compara por igualdade a lista de `rpc(` em functions | `marcacaoSoPorAcao.test.ts` | Suíte da loja vermelha | `has_role` já está na lista; a function não chama RPC nova. Rodar a suíte da loja no gate (lição da `71`). |
| `denoReach` de `core/seo` tem âncora exata de 15 arquivos | `packages/core/src/seo/__tests__/denoReach.test.ts:83` | Âncora reprova se `suggestion.ts` entrar no grafo de `variant.ts` | `suggestion.ts` é raiz própria (ninguém em `variant.ts` o importa); ganha um `denoReach` próprio. Se a âncora mudar, é medida, não afrouxada. |
| `SeoPreview` usa `maxLength={60}` e `{160}` cravados | `SeoPreview.tsx:33,38` | Segundo dono dos tetos | Passam a ler `SEO_TITLE_FIELD_MAX` e `DESCRIPTION_MAX` de `core`. |
| A árvore de trabalho tem mudanças não commitadas de outra frente em `AdminProductFormPage.tsx` (o "voltar" e a lista com URL) | `apps/backoffice/src/pages/admin/AdminProductFormPage.tsx` | Commit da `84` arrastando trabalho alheio | Propriedade de arquivo declarada nas tasks; commit da `84` só com `git add` por caminho, e o arquivo da página só depois de a outra frente commitar (ou com `git add -p`). |
| Prompt injection pela descrição do produto | `prompt.ts` | O modelo seguir instrução escrita na descrição | Entrada é da própria admin; descrição delimitada como dado; a saída passa pela régua determinística e é **rascunho**, nunca gravada sem a Adri. Risco residual aceito. |
| Custo sem teto global (o limitador é por isolate) | `_shared/rateLimit.ts` | Abuso multiplicado por isolates | Só admins chamam; teto da conta na Anthropic (Console) é a fronteira de verdade — passo de operação no handoff. |
| Comentário que cita a forma proibida quebra guarda (`authSenderDomain`, bundler do `supabase start`) | todos os arquivos novos | Guarda vermelho / ambiente local fora do ar | Descrever o import do SDK em prosa, nunca escrevê-lo em comentário fora de `claude.ts`. |

---

## Tech Decisions

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Tipos da porta | Interface **neutra** `ClaudeJsonRequest`/`ClaudeJsonResult` em `claudePort.ts`, não os tipos do SDK | `AD-004`: o handler roda sob vitest sem o SDK instalado; a fronteira com o SDK fica num arquivo de 60 linhas, como `PushSender`. |
| Onde moram modelo e esforço | `seo-suggest/prompt.ts` (`SEO_MODEL`, `SEO_EFFORT`), não em `_shared/claude.ts` | A `BL-001`/`BL-014` reaproveitam a porta com outro modelo/esforço; o teste do handler assere `claude-haiku-5-5` e `medium` **no payload enviado à porta** (`L-039`). |
| Esforço | `medium`, **explícito** | Pedido do usuário (2026-10-27); é o padrão do Haiku 5.5, e escrever evita mudança silenciosa. |
| Thinking | omitido (adaptativo por padrão no Haiku 5.5) | `disabled` só é aceito até `high`, mas não há ganho em desligar. |
| Orçamento de tempo | **Um** `AbortController` de 15 s para as duas tentativas; a 2ª só com ≥ 5 s sobrando | Honra o "≤ 15 s" da spec mesmo na retentativa; `AD-008`. |
| Teto por **conta**, não por IP | `limiter.hit(userId)` | Porta de admin; as duas pessoas do ateliê podem dividir IP. |
| `ANTHROPIC_API_KEY` fora da lista obrigatória do CI | não acrescentar a `supabase-deploy.yml` | A ausência degrada para `503 not_configured` (`SIA-20`), não quebra venda; torná-la obrigatória travaria o deploy de **toda** function até alguém criar a conta da Anthropic. |
| Versão do SDK | `@anthropic-ai/sdk@1.3.0`, exata | Medida no npm em 2026-10-27; fixada como o `jsr:@negrel/webpush@0.5.0`. |
| Sem prefill, sem `temperature` | — | 400 no Haiku 5.5. |
| Guardas novos | `claudeSoNoServidor.test.ts` (loja, varre `apps/**` e `packages/**`: `ANTHROPIC_API_KEY`, o nome do pacote, `api.anthropic.com`) e `claudeSoNaPorta.test.ts` (functions: o SDK só em `_shared/claude.ts`, versão exata, importado só por `index.ts` que chama `createClaudeJson(`) — molde de `pushSoNoMotor`, com âncora dupla, CRLF/LF e inverso | `SIA-19`. |

> **Decisão de projeto a registrar no `STATE.md` ao fechar**: `AD-067` — *"Chamada a LLM tem UMA porta:
> `supabase/functions/_shared/claude.ts`, com o SDK oficial em versão exata; nenhum app nomeia a chave
> nem o pacote; o modelo e o esforço são escolhidos por quem chama."* Supera em parte `AD-011` (o botão
> de SEO).
