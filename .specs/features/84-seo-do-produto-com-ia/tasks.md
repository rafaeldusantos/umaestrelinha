# 84 — SEO do produto com IA · Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Sobreposições do projeto** (`CLAUDE.md` + decisão do usuário, memória `commit-so-quando-pedir`):
> **não há commit por task nem no fim** — só quando o usuário pedir. Nenhum agente usa
> `git stash`, `git checkout -- <arquivo>`, `git reset` ou `git clean`: a árvore tem trabalho
> não commitado de **outra frente** (`AdminOrderPage*`, `AdminOrdersPage*`, `AdminProductsPage*`,
> `AdminProductFormPage.tsx`, `AdminProductFormPage.voltar.test.tsx`, `features/{order,product}-list/model/queryUrl*`).
> Mutantes do sensor: editar no lugar e restaurar com comparação SHA-256.

---

**Spec**: `.specs/features/84-seo-do-produto-com-ia/spec.md`
**Design**: `.specs/features/84-seo-do-produto-com-ia/design.md`
**Branch**: `feature/84-seo-do-produto-com-ia`
**Status**: In Progress

---

## Test Coverage Matrix

> Gerada da base de código, do `CLAUDE.md` (raiz e módulos: guardas com âncora dupla e sensor, régua por
> token exato, `L-039`/`L-040`, "teste não monta a árvore que prova") e da spec. Guidelines:
> `CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `supabase/CLAUDE.md`, `packages/core/CLAUDE.md`,
> os `vitest.config.ts` de cada workspace.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura em `core` | unit | Todos os ramos; 1:1 com as ACs; todo edge case listado; sensor de alcance Deno | `packages/core/src/seo/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Handler / módulos de edge function | unit (vitest, deps injetadas, `AD-004`) | Toda resposta (200/400/401/403/405/422/429/502/503), happy + cada borda + cada falha; payload enviado à porta conferido campo a campo (`L-039`); dublê que devolve só as colunas pedidas (`L-040`) | `supabase/functions/seo-suggest/__tests__/*.test.ts`, `supabase/functions/_shared/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| `index.ts` de function | guarda (`wiringResolve`) + boot local | Por construção; + `supabase functions serve` e `curl` sem header ⇒ 401 | — | `pnpm --filter @estrelinha/functions test` + boot |
| Modelo do painel (hooks, funções) | unit | 1:1 com as ACs; ordem/descarte por sequência; frases exatas da spec | `apps/backoffice/src/features/**/model/**/*.test.ts` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| UI do painel | componente (RTL) + página real | ACs de tela pela **página real** quando a AC é de fiação; token exato em classe | `apps/backoffice/src/**/ui/**/*.test.tsx`, `apps/backoffice/src/pages/admin/AdminProductFormPage.seo.test.tsx` | idem |
| Guardas de fonte | unit (lê o disco) | Âncora dupla, sensores (CRLF, LF, glob `**`), inverso | `apps/store/src/shared/lib/__tests__/`, `supabase/functions/_shared/__tests__/` | `pnpm --filter @estrelinha/store test --testTimeout=20000` / functions |
| Config (`config.toml`, `.env.example`) | none | build gate | — | — |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | task com testes de um workspace | `pnpm --filter @estrelinha/<ws> test --testTimeout=20000` (sem `--` antes da flag), exit capturado fora de pipe |
| Full | task que toca `core` lido por painel/functions, ou função + painel | os workspaces tocados, **um por vez** |
| Build | fim de fase | Full dos 4 workspaces (core, functions, backoffice, store) + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` + `npx tsc --noEmit -p packages/core/tsconfig.json` (11 herdados) + `cd apps/backoffice && npx eslint .` (23/5) + `pnpm --filter @estrelinha/backoffice build` |

**Baseline de entrada** (medida com a árvore parada em 2026-10-27, antes de qualquer edição da `84`):
ver `baseline.md` nesta pasta.

---

## Execution Plan

### Phase 1 — A regra e o painel sem rede (`SIA-01..09`)

```
T01 → T02 → T03 → T04
```

### Phase 2 — A edge function (`SIA-13..15`, `17..23`, `26`)

```
T05 → T06 → T07 → T08 → T09 → T10
```

(T06 e T07 dependem de T01; T08 de T05..T07.)

### Phase 3 — O botão no painel e a prova (`SIA-10..12`, `16`, `20`, `22..25`)

```
T11 → T12 → T13
```

---

## Task Breakdown

### T01: Regra da sugestão em `core/seo/suggestion.ts` — ✅ feito
**Resultado**: core 4697/184 → **4759/186** (exit 0): `suggestion.test.ts` (57 casos: limites derivados, `stripBrand`, `memorialToneRefusal` com `it.each` sobre os 13 termos de `URGENCY_TERMS`, cada motivo de `suggestionRefusal` e os inversos) e `suggestionDenoReach.test.ts` (5: âncora de 7 arquivos medidos, extensão, pacote, dois sensores). Arquivos: `seo/suggestion.ts` (novo), `seo/brand.ts` (só `export` em `JA_TEM_MARCA` e `ABREVIACAO_DA_MARCA`; `brandedTitle` intocado), os dois testes. `denoReach.test.ts` de `core/seo` segue em **15**, intocado. **SPEC_DEVIATION 1**: `suggestion.ts` **não** entrou no barril `seo/index.ts` — o `denoReach` existente caminha a partir do barril, e a entrada levaria a âncora de 15 para 17 (`suggestion.ts` + `material/material.ts`). Quem consome importa o arquivo: `@estrelinha/core/seo/suggestion` (painel) e o caminho relativo `.ts` (function). **SPEC_DEVIATION 2**: o terceiro parâmetro de `suggestionRefusal` chama-se `requiresMaterial` (o design dizia `materialNamed`); a semântica é a do Done-when — `true` recusa material nomeado, `false` passa. ⚠️ Spec-precision gap: "material nomeado" casa os rótulos de `MATERIAL_KIND_LABELS` inteiros (ex.: "Mecha de cabelo", "Pelo do pet"); a palavra solta "cabelo" não é acusada.
**What**: limites (`SEO_TITLE_FIELD_MAX = 60`, `SUGGESTION_TITLE_MAX` calculado de `STORE_BRAND`, `SUGGESTION_DESCRIPTION_MIN = 70`), `stripBrand`, `memorialToneRefusal`, `suggestionRefusal`; exportar de `brand.ts` as duas regex de marca (sem mudar `brandedTitle`).
**Where**: `packages/core/src/seo/suggestion.ts` (novo), `packages/core/src/seo/brand.ts` (export), `packages/core/src/seo/index.ts` (barrel), `packages/core/src/seo/__tests__/suggestion.test.ts`, `packages/core/src/seo/__tests__/suggestionDenoReach.test.ts`
**Depends on**: —
**Reuses**: `brand.ts`, `text.ts` (`DESCRIPTION_MAX`), `material/material.ts` (`MATERIAL_KIND_LABELS`, folha sem import)
**Requirement**: SIA-14, SIA-15, A2, A3, A7, edge cases (marca no título, igual a exemplo, material nomeado)
**Done when**:
- [ ] `SUGGESTION_TITLE_MAX === 43` provado **e** derivado (`60 - ' | Uma Estrelinha'.length`), com asserção que muda se `STORE_BRAND` mudar (lida da constante, não cravada no teste só como número)
- [ ] `suggestionRefusal` devolve `null` para sugestão válida e uma frase não vazia para: título vazio, título > 43 depois de `stripBrand`, descrição < 70, > 160, emoji, `!`, cada termo de urgência da lista, igual a exemplo (sem caixa e sem acento), material nomeado com `materialNamed = true` (e **passa** com `false` — inverso)
- [ ] `stripBrand` tira `| Uma Estrelinha` e `| UE` do fim e não toca no meio
- [ ] Grafo de `suggestion.ts` alcançável pelo Deno: todo especificador relativo com `.ts` (`import type` incluso), nenhum pacote; sensor com um import sem `.ts`
- [ ] `denoReach.test.ts` existente de `core/seo` segue em 15 (âncora intocada)
- [ ] Gate quick (core) verde
**Tests**: unit · **Gate**: quick

### T02: Checklist — SEO deixa de bloquear — ✅ feito
**Resultado**: backoffice 4016/230 → **4022/230** (exit 0, suíte inteira). `checklist.test.ts`: o caso "SEO exige título E descrição" foi **invertido** (SEO vazio ⇒ `ok`, `blocking: false`, `canPublish === true`, `pendingCount === 0`), +6 casos (os 5 bloqueantes, sensor do nome vazio, os três rótulos e o espaço-como-vazio); o caso "cada item pendente traz atalho" passou de `toHaveLength(5)` para a lista exata `['name','category','image','weight']` com `seo_title: ''` na entrada (mais forte, não mais fraco). Arquivos: `model/checklist.ts` (`blocking`, `seoLabel`, `canPublish`/`pendingCount` só sobre bloqueantes; o item de SEO tem `ok: true` e `hint: null`), `model/checklist.test.ts`, `ui/PublishChecklist.test.tsx` (só a fixture ganhou `blocking: true`, exigido pelo tipo). `PublishChecklist.tsx` não mudou: com `ok: true` o item de SEO é desenhado como aprovado, com o rótulo informativo.
**What**: `ChecklistItem.blocking`; item `seo` com `blocking: false`, `ok: true`, rótulos "SEO automático (nome e descrição)" / "SEO curado" / "SEO parcial — o resto vem do nome e da descrição"; `canPublish`/`pendingCount` só sobre `blocking`.
**Where**: `apps/backoffice/src/features/product-form/model/checklist.ts`, `checklist.test.ts`, e o consumidor que desenha o checklist (achar por `buildChecklist(`) se ele precisar distinguir o item informativo
**Depends on**: —
**Requirement**: SIA-03
**Done when**:
- [ ] O caso antigo que exigia SEO para publicar é **invertido** (não apagado): com os 5 itens bloqueantes ok e SEO vazio, `canPublish === true` e `pendingCount === 0`
- [ ] Os três rótulos exatos, um caso cada; espaço só conta como vazio
- [ ] Os 5 itens bloqueantes continuam bloqueando (um caso de sensor: nome vazio ⇒ `canPublish === false`)
- [ ] Gate quick (backoffice) verde, contagem ≥ entrada
**Tests**: unit · **Gate**: quick

### T03: `SeoPreview` mostra o servido — ✅ feito
**Resultado**: `ui/__tests__/SeoPreview.test.tsx` novo (17 casos: derivado = `{nome} | Uma Estrelinha` e a descrição resumida, conferido também contra `productPageMeta`; os textos fixos antigos ausentes; curado servido; SIA-16 por `rerender`; piso `STORE_BRAND`/`STORE_DESCRIPTION_FLOOR` e a `storeDescription`; os dois placeholders; o selo "automático" nos quatro cruzamentos e no só-espaço; contador `30/60 · 47 com a marca` e `25/60 · 25 com a marca`; `maxLength` 60/160). `SeoPreview.tsx`: prévia por `productPageMeta`, `maxLength` de `SEO_TITLE_FIELD_MAX` (`@estrelinha/core/seo/suggestion`) e `DESCRIPTION_MAX`, os `<Label>` ganharam `htmlFor`, contador da descrição mantido (`N/160 caracteres`). `SlugField.test.tsx`: a montagem de `SeoPreview` ganhou `name`/`productDescription` (exigidos pelo tipo; asserção intocada). **SPEC_DEVIATION**: a prop da descrição do produto chama-se `productDescription` — `description` já era a prop do SEO curado. ~~`storeDescription` é opcional e a página não a passa~~ — **resolvido no conserto r1 do Verifier**: a página passa `useSeoSettings().description`, a mesma leitura da loja (ver *Conserto r1 do Verifier*, lacuna 5). Gate: suíte do backoffice no build gate da T04.
**What**: props `name`, `description`, `storeDescription?`; prévia por `productPageMeta`; placeholders; selo "automático"; contador "N/60 · M com a marca"; `maxLength` de `SEO_TITLE_FIELD_MAX`/`DESCRIPTION_MAX`.
**Where**: `apps/backoffice/src/features/product-form/ui/SeoPreview.tsx`, `apps/backoffice/src/features/product-form/ui/__tests__/SeoPreview.test.tsx` (novo)
**Depends on**: T01
**Requirement**: SIA-05..09, SIA-16
**Done when**:
- [ ] Sem SEO: a prévia mostra `{nome} | Uma Estrelinha` e `descriptionFromHtml(descrição)`; os textos fixos antigos **não** aparecem
- [ ] Nome e descrição vazios: `STORE_BRAND` e `STORE_DESCRIPTION_FLOOR` (ou a `storeDescription` passada)
- [ ] Selo "automático" presente só no que é derivado (título, descrição, cada um independente), ausente no curado
- [ ] Placeholders: título = nome; descrição = derivada
- [ ] Contador: título com marca já escrita mostra o mesmo número nos dois lados
- [ ] Gate quick (backoffice) verde
**Tests**: unit (componente) · **Gate**: quick

### T04: A página publica sem SEO e passa nome/descrição à prévia — ✅ feito
**Resultado**: `pages/admin/AdminProductFormPage.seo.test.tsx` novo (6 casos, página real, molde do `fornecedor`): publicar sem SEO ⇒ botão habilitado, `is_active: true`, `seo_title`/`seo_description` `null`, zero toast destrutivo, aba Geral continua ativa; só espaços ⇒ `null`; rascunho ⇒ `is_active: false` e `null`; só título ⇒ título gravado e descrição `null`; nome editado sem salvar ⇒ a prévia mostra `Anel Estrela | Uma Estrelinha` com o selo, e o diário vazio. **O handleSubmit NÃO gravava `null` para campo só com espaço** (`form.seo_title || null` grava `'   '`), contra a letra de `SIA-01` — o caso reprovou antes do conserto. Sensor: `canPublish` sem o recorte de `blocking` + item de SEO voltando a exigir os dois campos ⇒ 6 casos reprovam (2 do checklist, 4 da página); restaurado com SHA-256 conferido.
**Diff exato da `84` em `AdminProductFormPage.tsx`** (o resto do diff do arquivo é da outra frente):
```diff
-      seo_title: form.seo_title || null,
-      seo_description: form.seo_description || null,
+      // Feature 84 (SIA-01): vazio OU só espaço grava `null` — a loja deriva do nome e da descrição.
+      seo_title: form.seo_title.trim() ? form.seo_title : null,
+      seo_description: form.seo_description.trim() ? form.seo_description : null,
@@ (aba SEO)
                   slug={form.slug || slugify(form.name)}
+                  name={form.name}
+                  productDescription={form.description}
                   onTitleChange={v => setField('seo_title', v)}
```
**Build gate da fase 1** (um workspace por vez, exit fora de pipe): core **4759/186** (exit 0), backoffice **4045/232** (exit 0; entrada 4016/230 ⇒ +29/+2), store **6146/329** (exit 0, idêntico à entrada, sem o *Unhandled Error* da baseline); `tsc` backoffice **0**, `tsc` core **11** herdados (nenhum em arquivo da `84`); eslint backoffice **23/5** (nenhum em arquivo tocado); `pnpm --filter @estrelinha/backoffice build` verde.
**What**: `AdminProductFormPage.tsx` passa `name`/`description` ao `SeoPreview`; nenhuma outra mudança de regra (o `handleSubmit` já grava `null` — provar).
**Where**: `apps/backoffice/src/pages/admin/AdminProductFormPage.tsx`, `apps/backoffice/src/pages/admin/AdminProductFormPage.seo.test.tsx` (novo, **página real**, molde de `AdminProductFormPage.fornecedor.test.tsx`)
**Depends on**: T02, T03
**Requirement**: SIA-01, SIA-02, SIA-04, SIA-05 (fiação)
**Done when**:
- [ ] *Salvar e publicar* sem SEO: o `update/insert` gravado tem `is_active: true`, `seo_title: null`, `seo_description: null`, nenhum toast destrutivo
- [ ] *Salvar rascunho* idem com `is_active: false`
- [ ] Só título preenchido: grava o título e `seo_description: null`
- [ ] Editar o nome (sem salvar) e abrir a aba SEO: a prévia mostra o nome novo com a marca
- [ ] ⚠️ O arquivo da página tem mudança de outra frente: editar só as linhas do `SeoPreview`; registrar o diff exato da `84` nesse arquivo no `tasks.md`
- [ ] **Build gate da fase 1** verde
**Tests**: integração (página real) · **Gate**: build

### T05: A porta do Claude — `_shared/claudePort.ts`, `_shared/claudeResult.ts`, `_shared/claude.ts` — ✅ feito
**Resultado**: functions 1105/26 → +10/+1 (`_shared/__tests__/claudeResult.test.ts`: `end_turn` com JSON ⇒ `ok` com `json` e `usage`; `refusal` com `content: []` e com um `content` que LANÇA se lido (Proxy) ⇒ `refusal`; `max_tokens` com JSON parseável ⇒ `truncated`; não-JSON e sem bloco `text` ⇒ `invalid`; `thinking` antes do `text` ignorado; `usage` ausente ⇒ 0; e a forma dos imports pela AST). Arquivos: `_shared/claudePort.ts` (tipos neutros, sem import), `_shared/claudeResult.ts` (`messageToResult` puro), `_shared/claude.ts` (`createClaudeJson`, `npm:@anthropic-ai/sdk@1.3.0`, `maxRetries: 1`, `timeout: 15_000`, `output_config: { effort, format: { type: 'json_schema', schema } }`, `{ signal }`; erros por classe — `APIUserAbortError`, `APIConnectionError`, `APIError` com `status` ⇒ `upstream`). **`output_config.format` conferido** em 2026-10-27 em `https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md` (URL no topo de `claude.ts`): JSON Schema cru como `{ type: 'json_schema', schema }`, JSON num bloco `text`, `additionalProperties: false` obrigatório, e **`minLength`/`maxLength` recusados com 400** — por isso o schema não os tem. E **`deno check` de `claude.ts` contra o SDK 1.3.0 baixado do npm passou (exit 0)**, num diretório isolado do scratchpad com `nodeModulesDir: none` (na raiz o Deno exige `deno install` por causa do `node_modules` do monorepo) — prova os tipos de `output_config`, `effort` e das três classes de erro. **SPEC_DEVIATION**: o Done-when diz "`claudePort.ts` e `claudeResult.ts` sem import nenhum"; `claudeResult.ts` tem UM `import type` relativo com `.ts` (os tipos da porta) — a outra saída seria declarar o tipo do resultado duas vezes. O teste assere exatamente isso (`[{ spec: './claudePort.ts', soTipo: true }]`) e `claudePort.ts` sem import nenhum.
**What**: tipos neutros (`ClaudeJsonRequest`, `ClaudeJsonResult`, `ClaudeJson`); `messageToResult(msg)` puro (ramifica por `stop_reason` antes do conteúdo, pega o bloco `text`, `JSON.parse` com falha ⇒ `{ kind: "invalid" }`), e o adaptador `createClaudeJson(apiKey)` com o SDK `npm:@anthropic-ai/sdk@1.3.0` (único import do pacote no repo), `maxRetries: 1`, `timeout: 15_000`, `output_config: { effort, format: { type: 'json_schema', schema } }`, erros por classe tipada ⇒ `upstream`.
**Where**: `supabase/functions/_shared/{claudePort.ts,claudeResult.ts,claude.ts}`, `supabase/functions/_shared/__tests__/claudeResult.test.ts`
**Depends on**: —
**Reuses**: desenho de `webPush.ts`/`pushOutcome.ts`
**Requirement**: SIA-13 (forma do pedido), SIA-23, A8, A10
**Done when**:
- [ ] Antes de escrever `claude.ts`, conferir a forma de `output_config.format` com JSON Schema cru na documentação viva (skill `claude-api` → `shared/live-sources.md`) e anotar a URL no topo do arquivo
- [ ] `messageToResult`: `end_turn` com JSON válido ⇒ `ok` com `json` e `usage`; `refusal` ⇒ `refusal` **sem ler `content`** (caso com `content: []`); `max_tokens` ⇒ `truncated`; texto não-JSON ⇒ `invalid`; sem bloco `text` ⇒ `invalid`; blocos `thinking` antes do `text` são ignorados
- [ ] `claudePort.ts` e `claudeResult.ts` sem import nenhum (Deno + vitest)
- [ ] Gate quick (functions) verde
**Tests**: unit · **Gate**: quick

### T06: Exemplos — `seo-suggest/examples.ts` — ✅ feito
**Resultado**: +19/+1 (`seo-suggest/__tests__/examples.test.ts`). `pickExamples` (ordem do formulário, completa com a categoria só abaixo de 3 relacionados curados, sem repetir, sem o próprio produto, ≤ 5, `seo_title` nulo/só espaço não conta, campos aparados) e `loadContext` (três leituras; dublê de lista que **projeta só as colunas pedidas**, `L-040`, com `cost_price`/`stock`/`supplier_id` na fixtura que nunca chegam; erro em cada uma das três leituras ⇒ segue, `readErrors` = `related` · `same_category` · `categories`; id inexistente ignorado; sem relacionados nem categoria, zero leituras; nomes das categorias na ordem do formulário). **SPEC_DEVIATION**: a leitura por categoria pede `id,name,seo_title,seo_description,filtro:product_categories!inner(category_id)` com `.in('filtro.category_id', …)` — as 4 colunas do Done-when **mais** o embed que filtra pelo vínculo N:N (molde de `mapProduct.ts` da loja; `products.category_id` é a coluna legada). O embed traz só `category_id`. A leitura dos relacionados e a de `categories` pedem exatamente o que o Done-when diz. ⚠️ Sem `.not('seo_title','is',null)` no banco (o dublê não registra `.not`): quem descarta o sem-SEO é `pickExamples`, e a leitura por categoria traz 8 para sobrar margem (686/702 curados, medido na `62`).
**What**: `pickExamples(related, sameCategory, productId, max = 5)` puro; `loadContext(supabase, body)` com as três leituras de colunas literais.
**Where**: `supabase/functions/seo-suggest/examples.ts`, `supabase/functions/seo-suggest/__tests__/examples.test.ts`
**Depends on**: T01
**Reuses**: `_shared/testing/fakes.ts` (`createFakeSupabase`, `ReadCall`)
**Requirement**: A5, SIA-21, edge cases (id inexistente, o próprio produto)
**Done when**:
- [ ] Ordem: relacionados curados primeiro; completa com mesma categoria só quando relacionados < 3; nunca repete; nunca o próprio produto; no máximo 5; zero ⇒ lista vazia
- [ ] Relacionado sem `seo_title` (nulo ou só espaço) não conta
- [ ] As leituras pedem **exatamente** `id,name,seo_title,seo_description` em `products` e `id,name` em `categories` (igualdade de string), com `is_active = true` e `limit` na leitura por categoria; o dublê devolve só as colunas pedidas (`L-040`)
- [ ] Erro de leitura ⇒ contexto sem exemplos (a sugestão segue), registrado no resultado para o log
- [ ] Gate quick (functions) verde
**Tests**: unit · **Gate**: quick

### T07: Prompt — `seo-suggest/prompt.ts` — ✅ feito
**Resultado**: +14/+1 (`seo-suggest/__tests__/prompt.test.ts`): constantes (`claude-haiku-5-5`, `medium`, 4096) e `SEO_SCHEMA` por igualdade; `system` idêntico entre duas peças diferentes e com pt-BR, os tetos 43/70/160 lidos de `core`, "sem emoji", "sem ponto de exclamação", urgência, trocadilho, "não repita os exemplos" e a proibição de nomear o material; `user` com a frase do material só quando `requiresMaterial` (e sem a palavra "material" quando falso); descrição sem HTML e sem o bloco de FAQ, só-FAQ ⇒ `(vazia)`, > 4.000 cortada em limite de palavra com `descriptionCut`; exemplos em `<exemplo>` com nome/título/descrição; o dado não fecha o delimitador (`<`/`>` viram `‹`/`›`); campos fora de A6 no input não aparecem. Como o `system` tem de ser estável, a regra do material mora sempre nele ("se o pedido disser…"), e a permissão vai no `user` só quando a peça leva material. `buildSeoPrompt` devolve também `descriptionCut` (o edge case manda declarar o corte no log).
**What**: `SEO_MODEL = 'claude-haiku-5-5'`, `SEO_EFFORT = 'medium'`, `SEO_MAX_TOKENS = 4096`, `SEO_SCHEMA`, `buildSeoPrompt(input)` ⇒ `{ system, user }`.
**Where**: `supabase/functions/seo-suggest/prompt.ts`, `__tests__/prompt.test.ts`
**Depends on**: T01
**Reuses**: `core/seo/suggestion.ts` (tetos interpolados), `core/faq/block.ts` (`htmlToText`, `stripFaqBlock`)
**Requirement**: SIA-13, A6, A10, A11, edge cases (descrição só FAQ, > 4.000, material)
**Done when**:
- [ ] `system` é **idêntico** entre duas chamadas com peças diferentes (estável para cache) e contém, como texto: pt-BR, os números 43/70/160 vindos das constantes, "sem emoji", "sem ponto de exclamação", proibição de urgência, de trocadilho, "não repita os exemplos"
- [ ] Com `requiresMaterial: true`, o `user` permite dizer que a joia leva material da cliente e o `system` proíbe nomeá-lo; com `false`, nenhuma menção a material
- [ ] Descrição reduzida a texto, sem o bloco de FAQ, cortada em 4.000 em limite de palavra
- [ ] Exemplos delimitados (`<exemplo>`), um por item, com nome, título e descrição
- [ ] Nenhum campo fora de A6 no texto (caso com custo/fornecedor no input de teste que **não** aparece)
- [ ] `SEO_SCHEMA` com `required: ['title','description']` e `additionalProperties: false`
- [ ] Gate quick (functions) verde
**Tests**: unit · **Gate**: quick

### T08: Handler — `seo-suggest/handlers.ts` — ✅ feito
**Resultado**: +37/+1 (`seo-suggest/__tests__/handlers.test.ts`), todos os itens do Done-when, com a porta proibida (conta **e** lança) nos caminhos 401/403/403/429/400; 503 com `rpcs` só `has_role` e `reads` vazio; 401 antes do 503; teto pelo limitador real (30 passam, a 31ª é 429, outra conta passa); 400 nos sete casos e os limites exatos (200/20/10) passando; payload à porta campo a campo, `schema` por **identidade** com `SEO_SCHEMA`, `system`/`user` iguais aos de `buildSeoPrompt` com o contexto lido, e as chaves exatas do pedido; marca tirada do título; `invalid` e JSON sem forma contam como reprovada; `refusal`/`truncated` com 1 chamada; prazo com relógio falso (o `signal` não aborta em 14.999 ms e aborta em 15.000 ⇒ 502); 2ª tentativa recusada com 4.999 ms sobrando e feita com 5.000; erro de leitura não derruba; log com `userId`, `result`, `examples`, `attempts`, `inputTokens`, `outputTokens`, `ms` (somados nas duas tentativas) e a ausência do nome, da descrição e da sugestão em **todo** o `console.log`; uma linha também para `limited`/`not_configured`/`upstream`/`refusal`. O orçamento conta a partir do `AbortController` (depois das leituras), e a linha de log leva ainda `descriptionCut` e, quando houver, `readErrors`. Sensor do autor (6 mutantes no código real, SHA-256 conferido na restauração, nenhum por compilação): 503 antes do admin, teto com chave global, `<=` no orçamento, `content` lido antes do `stop_reason`, `is_active` apagado e marca não removida — **6 mortos por asserção**.
**What**: `route(deps, req)` conforme o design (CORS, 405, `requireAdmin`, 503, 429 por conta, 400, contexto, até 2 tentativas sob um `AbortController` de 15 s, 422/502, log).
**Where**: `supabase/functions/seo-suggest/handlers.ts`, `__tests__/handlers.test.ts`
**Depends on**: T05, T06, T07
**Reuses**: `_shared/auth.ts`, `_shared/rateLimit.ts`, `_shared/http.ts`, `_shared/testing/fakes.ts`
**Requirement**: SIA-13..15, SIA-17, SIA-18, SIA-20, SIA-22, SIA-23, SIA-26, edge case 400
**Done when**:
- [ ] 401 sem header, 403 sem papel, 403 com `has_role` em erro — e a porta do Claude **não chamada** nos três (dublê que conta chamadas **e** lança se chamado)
- [ ] `claude: null` ⇒ 503 `not_configured`, depois do admin e antes de qualquer leitura
- [ ] 31ª chamada da mesma conta em 10 min ⇒ 429 `limited`; outra conta passa (chave = `userId`)
- [ ] 400 `bad_request`: nome vazio/> 200, > 20 relacionados, > 10 categorias, id não-uuid, JSON inválido
- [ ] Payload à porta (`L-039`): `model === 'claude-haiku-5-5'`, `effort === 'medium'`, `maxTokens === 4096`, `schema === SEO_SCHEMA`, `system`/`user` de `buildSeoPrompt`, `signal` presente
- [ ] 200 com `{ title (sem marca), description, examples: n }`
- [ ] Reprovada 1× e aprovada ⇒ 200 com 2 chamadas; reprovada 2× ⇒ 422 `off_rules`; `invalid` conta como reprovada
- [ ] `refusal` ⇒ 422 `refusal` com **1** chamada; `truncated` ⇒ 422 `truncated`
- [ ] `upstream` ⇒ 502; o timeout de 15 s com fake timers aborta o `signal` e responde 502; a 2ª tentativa **não** acontece com < 5 s sobrando
- [ ] Log: uma linha JSON com `userId`, `result`, `examples`, `attempts`, `inputTokens`, `outputTokens`, `ms` — e **nem** o nome nem a descrição do produto nela (asserção de ausência com o texto real da fixture)
- [ ] Gate quick (functions) verde
**Tests**: unit · **Gate**: quick

### T09: Fiação — `index.ts`, `config.toml`, `.env.example` e o guarda da porta — ✅ feito
**Resultado**: functions **1198/31** (exit 0; entrada 1105/26 ⇒ +93/+5): `claudeSoNaPorta.test.ts` (13: âncoras — ≥ 40 arquivos de functions e ≥ 500 de apps/packages lidos, e o adaptador importando a versão —; as três réguas pela AST; sensores de segunda importação por `npm:`, `esm.sh`, `import()` e reexport; comentário com CRLF, LF e o glob de dois asteriscos; o import logo abaixo do glob continua visível; inverso da porta neutra; caminho relativo resolvido; chamada × menção) e `wiringResolve` contando o diretório novo (âncora derivada, igualdade). Arquivos: `seo-suggest/index.ts` (só fiação; `claude: null` sem a chave, `createRateLimiter(30, 600_000, Date.now)`), `supabase/config.toml` (`ANTHROPIC_API_KEY = "env(ANTHROPIC_API_KEY)"` em `[edge_runtime.secrets]` e `[functions.seo-suggest] verify_jwt = false` com o comentário), `.env.example` (`ANTHROPIC_API_KEY=` vazia, servidor). `supabase-deploy.yml` **não** tocado. **Boot local feito** (Supabase local de pé; `supabase functions serve seo-suggest --env-file <scratchpad>/seo.env`, arquivo sem a chave, sem tocar nos containers): `POST` sem header ⇒ **401** `{"error":"Não autenticado"}` (o worker subiu, então o grafo — inclusive o `npm:` do SDK — resolveu no edge runtime 1.77.4; não foi preciso trocar para `esm.sh`); com a anon key como bearer ⇒ **401**; com o JWT do admin local (`admin@umaestrelinha.dev`) ⇒ **503** `{"reason":"not_configured"}`, e a linha de log `{"fn":"seo-suggest","userId":…,"result":"not_configured","ms":0}`; `OPTIONS` ⇒ 200 `ok`. O `serve` foi encerrado; `deno.lock` sem diff. O caminho com a chave (a chamada real) fica para o probe da T13.
**What**: `seo-suggest/index.ts` só fiação; `[functions.seo-suggest] verify_jwt = false` com o comentário; `ANTHROPIC_API_KEY` no `.env.example` da raiz (servidor); guarda `claudeSoNaPorta.test.ts` (molde de `pushSoNoMotor`).
**Where**: `supabase/functions/seo-suggest/index.ts`, `supabase/config.toml`, `.env.example`, `supabase/functions/_shared/__tests__/claudeSoNaPorta.test.ts`
**Depends on**: T08
**Requirement**: SIA-19 (lado das functions), SIA-20
**Done when**:
- [ ] `wiringResolve.test.ts` passa contando a function nova (âncora derivada)
- [ ] Guarda: o pacote do SDK só em `_shared/claude.ts`, versão `1.3.0` exata; `claude.ts` importado só por `index.ts` que **chama** `createClaudeJson(`; âncora dupla, CRLF/LF/glob, inverso
- [ ] Boot local: `supabase functions serve seo-suggest` (com `--env-file` de um arquivo **sem** a chave) e `curl -X POST` sem header ⇒ 401; com JWT de admin local ⇒ 503 `not_configured`. Se `npm:` falhar no runtime local, trocar para `esm.sh` (ver design) e registrar
- [ ] Gate quick (functions) verde
**Tests**: guarda + boot · **Gate**: quick

### T10: Guarda da loja — a chave e o SDK fora dos apps — ✅ feito
**Resultado**: `apps/store/src/shared/lib/__tests__/claudeSoNoServidor.test.ts` (22): âncoras (> 1000 arquivos de `apps/**` e `packages/**`; App.tsx da loja, do painel e do ateliê e `packages/core/src/seo/suggestion.ts` nomeados; o extrator acha a porta `admin-users`; o arquivo do allowlist existe), as três ausências (env, pacote, host) em produção **e** teste fora o próprio guarda, allowlist de UM com o caso que prova outro teste acusado, sensores por forma (env com `VITE_`, em string, CRLF, LF; pacote por import, subcaminho e `import()`; host por `fetch` cru e caixa alta), inverso (`functions.invoke('seo-suggest')`, "Sugerir com IA", `@estrelinha/core`), comentário de linha e de bloco, glob `**`, número da linha. **Achado ao escrever**: o removedor de comentário do molde (`chaveDeServidorForaDoNavegador`) trata o `//` de `https://` como comentário e apaga o resto da linha — um `fetch('https://<host da API>/…')` passaria em branco. Aqui o removedor ganhou `(?<!:)` e um sensor nos dois sentidos (a URL em código é acusada; um comentário que cita a URL continua comentário). **O molde tem o mesmo ponto cego e NÃO foi tocado** (fora do escopo; as réguas dele não dependem de URL hoje). **Build gate da fase 2** (um workspace por vez, exit fora de pipe): functions **1198/31** (exit 0), core **4761/186** (exit 0 — não tocado nesta fase; a contagem de entrada que o orquestrador estimou, 4763, não bateu: medido 4761), backoffice **4045/232** (exit 0, idêntico), store **6168/330** (entrada 6146/329 ⇒ +22/+1: o guarda novo), **6168 de 6168 passando, exit 1** pelo `Unhandled Error [vitest-worker]: Timeout calling "onTaskUpdate"`, sem asserção reprovada, nas DUAS execuções sozinha — a mesma assinatura de contenção registrada na `baseline.md`; `tsc` backoffice **0**, store **0**, core **11** herdados. Nenhum guarda da loja que varre `supabase/functions` acusou o código novo.
**What**: `claudeSoNoServidor.test.ts` varrendo `apps/**` e `packages/**`: recusa `ANTHROPIC_API_KEY`, o nome do pacote do SDK e `api.anthropic.com`.
**Where**: `apps/store/src/shared/lib/__tests__/claudeSoNoServidor.test.ts`
**Depends on**: T09
**Reuses**: molde de `chaveDeServidorForaDoNavegador.test.ts`
**Requirement**: SIA-19
**Done when**:
- [ ] Âncora dupla (arquivos lidos ≥ piso, um arquivo de cada app nomeado — `L-035`), sensores (cada forma, CRLF, LF, glob `**`), allowlist de UM (o próprio guarda) com caso provando que outro teste seria acusado
- [ ] **Build gate da fase 2** verde (inclui a suíte da loja inteira — os guardas de lá varrem as functions)
**Tests**: guarda · **Gate**: build

### T11: Painel — `features/seo-suggestion` (api, frases, hook) — ✅ feito
**Resultado**: backoffice +41/+2 (gate da suíte inteira na T12). `api/__tests__/requestSeoSuggestion.test.ts` (17: o corpo campo a campo e por igualdade de chaves — um campo extra no input não vai —, `productId: null`, 200 ⇒ `ok`, 200 sem forma ⇒ `upstream`, cada `reason` do corpo com o status real do handler, 401/403 ⇒ `forbidden` com corpo `{ error }`, 404 com corpo ilegível ⇒ `upstream`, o status decide sem `reason` conhecido, `FunctionsFetchError` sem status e `invoke` que lança ⇒ `network`). `model/__tests__/useSeoSuggestion.test.ts` (24, com o dublê da api SEGURANDO cada resposta até o teste resolvê-la): aplica os dois campos; toque em voo ignorado (1 chamada) e o seguinte volta a chamar; `undo` devolve o par exato (inclusive espaço), some depois de usado; `noteManualEdit`, nova sugestão e `reset` desligam o desfazer; SIA-25 com a frase exata, e `noteManualEdit` sem voo NÃO arma descarte; `cancel` (troca de aba) descarta sem frase; pedido superado que responde DEPOIS do vigente é descartado; `reset` em voo descarta; hook desmontado não chama `apply`; as 8 frases de falha literais da spec/design com campos intocados; `not_configured` ⇒ `disabled` e o próximo toque não chama (nem depois de `cancel`/`reset`). Arquivos: `features/seo-suggestion/{api/requestSeoSuggestion.ts, model/copy.ts, model/useSeoSuggestion.ts, index.ts}`. **SPEC_DEVIATION 1**: o hook ganhou `cancel()` além do `{ status, message, canUndo, suggest, undo, noteManualEdit, reset }` do design — o hook mora na página (o Radix desmonta a aba inativa; um estado no botão perderia o desfazer a cada troca), então "trocar de aba descarta a resposta" (`SIA-24`) precisa de um sinal explícito; `cancel` descarta o voo **sem** apagar o desfazer (a spec só lista edição, nova sugestão e save). **SPEC_DEVIATION 2**: `reset()` também invalida um pedido em voo (salvar com a sugestão no ar não deixa a resposta tardia sujar o formulário recém-salvo). **SPEC_DEVIATION 3**: o desfazer só existe quando havia texto em pelo menos um dos dois campos — letra de `SIA-12` ("preenche campos que já tinham texto"); com os dois vazios não há o que desfazer. **SPEC_DEVIATION 4**: os motivos são `forbidden`/`bad_request` além dos do design; `network` e `upstream` (e o 404 do gateway) usam a mesma frase. Sucesso não escreve frase na região viva (a spec não dá uma).
**What**: `requestSeoSuggestion` (invoke + tradução do `FunctionsHttpError` por status/`reason`), `model/copy.ts` (frases da spec), `useSeoSuggestion` (sequência, descarte, desfazer, `not_configured` persistente).
**Where**: `apps/backoffice/src/features/seo-suggestion/{api,model}/…` + `index.ts` + testes
**Depends on**: T08 (contrato)
**Reuses**: molde de `useAdminUsers`/`useAnalyticsSecret`
**Requirement**: SIA-10, SIA-12, SIA-20, SIA-22..25
**Done when**:
- [ ] Corpo enviado: `productId`, `name`, `description`, `categoryIds`, `relatedIds`, `requiresMaterial` do input (asserção campo a campo)
- [ ] Cada `reason` (e 401/403, e rede) ⇒ a frase exata da spec/design
- [ ] `undo` devolve exatamente o par anterior; `noteManualEdit`, nova sugestão e `reset` desligam o desfazer
- [ ] Resposta de pedido superado (segundo `suggest`), de hook desmontado ou chegada depois de `noteManualEdit` ⇒ **não** aplica; só o último caso mostra a frase de `SIA-25`
- [ ] `suggest` com um em voo ⇒ ignorado (uma chamada só)
- [ ] `not_configured` ⇒ `disabled` até desmontar
- [ ] Gate quick (backoffice) verde
**Tests**: unit · **Gate**: quick

### T12: Painel — botão e composição na aba SEO — ✅ feito
**Resultado**: `ui/__tests__/SuggestSeoButton.test.tsx` (7: habilitado com nome; SIA-11 com nome vazio/só espaço, dica ligada por `aria-describedby`; "Sugerindo…" desabilitado com `animate-spin` + `motion-reduce:animate-none` por token exato; `disabled` visível com a frase na região `role="status"`/`aria-live="polite"`; região montada vazia; "Desfazer" só com `canUndo`; `h-11` nos dois botões). `AdminProductFormPage.seo.test.tsx` +11 pela **página real** (o `functions.invoke` do dublê registra e SEGURA cada chamada): corpo com o nome editado sem salvar, `categoryIds`, `productId`, `requiresMaterial`; "Sugerindo…" desabilitado; os dois campos e a prévia (`… | Uma Estrelinha`, sem "automático") com a sugestão e o diário VAZIO; nome vazio ⇒ desabilitado com a dica e zero chamadas; salvar depois grava os textos sugeridos; Desfazer devolve os dois textos; digitar no título **ou** na descrição some com o Desfazer; o save some com o Desfazer; SIA-25 (texto digitado mantido + frase); SIA-24 (trocar de aba, resposta chega, voltar: campos vazios, sem frase, e o botão chama de novo); 503 ⇒ desabilitado com a frase e salvar liberado; 502 ⇒ frase, campos intocados. `animacaoRespeitaMovimento.test.ts`: o arquivo novo entrou no escopo literal, âncoras remedidas com a própria régua **45/21 → 47/22**.
**Diff exato da `84` em `AdminProductFormPage.tsx` nesta task** (somado ao da T04; o resto é da outra frente):
```diff
-import { useState, useRef } from 'react'
+import { useEffect, useState, useRef } from 'react'
 import SeoPreview from '@/features/product-form/ui/SeoPreview'
+import { SuggestSeoButton, useSeoSuggestion } from '@/features/seo-suggestion'
@@ depois de `const [activeTab, setActiveTab] = useState<TabId>('geral')`
+  // Feature 84 (…): a sugestão de SEO mora AQUI, não no botão — (3 linhas de comentário)
+  const seoSuggestion = useSeoSuggestion({
+    current: { title: form.seo_title, description: form.seo_description },
+    apply: par => setFields({ seo_title: par.title, seo_description: par.description }),
+  })
+  const { cancel: cancelSeoSuggestion } = seoSuggestion
+  // `SIA-24`: sair da aba SEO com a sugestão no ar descarta a resposta que chegar depois.
+  useEffect(() => {
+    if (activeTab !== 'seo') cancelSeoSuggestion()
+  }, [activeTab, cancelSeoSuggestion])
@@ handleSubmit, depois de `draft.discard()`
+    // Feature 84 (`SIA-12`): o desfazer da sugestão some no save.
+    seoSuggestion.reset()
@@ aba SEO, antes do <SeoPreview>
+                <SuggestSeoButton
+                  name={form.name}
+                  status={seoSuggestion.status}
+                  message={seoSuggestion.message}
+                  canUndo={seoSuggestion.canUndo}
+                  onUndo={seoSuggestion.undo}
+                  onSuggest={() =>
+                    seoSuggestion.suggest({
+                      productId: id ?? null,
+                      name: form.name,
+                      description: form.description,
+                      categoryIds: form.category_ids,
+                      relatedIds: form.related_product_ids,
+                      requiresMaterial: form.requires_material === true,
+                    })
+                  }
+                />
@@ <SeoPreview>
-                  onTitleChange={v => setField('seo_title', v)}
-                  onDescriptionChange={v => setField('seo_description', v)}
+                  onTitleChange={v => {
+                    seoSuggestion.noteManualEdit()
+                    setField('seo_title', v)
+                  }}
+                  onDescriptionChange={v => {
+                    seoSuggestion.noteManualEdit()
+                    setField('seo_description', v)
+                  }}
```
**Sensor do autor** (6 mutantes no código real, SHA-256 conferido na restauração, nenhum por compilação): aplicar depois de `noteManualEdit` (2 casos), `undo` devolvendo vazio (4), botão habilitado sem nome (2), frase de `limited` trocada (1), troca de aba sem `cancel` na página (1), save sem `reset` na página (1) — **6 mortos por asserção**.
**Build gate da fase 3** (um workspace por vez, exit fora de pipe): backoffice **4104/235** (exit 0; entrada 4045/232 ⇒ +59/+3), core **4761/186** (exit 0, idêntico), functions **1198/31** (exit 0, idêntico), store **6168/330 passando, exit 1** só pelo `Timeout calling "onTaskUpdate"` sem asserção reprovada (a assinatura de contenção da `baseline.md`, idêntica à T10; `claudeSoNoServidor` verde com o slice novo); `tsc` backoffice **0**, store **0**, core **11** herdados; eslint backoffice **23/5** (nenhum novo); `pnpm --filter @estrelinha/backoffice build` verde.
**What**: `SuggestSeoButton` (desabilitado sem nome, "Sugerindo…", "Desfazer", `aria-live`, alvo ≥ 44 px, `motion-reduce:` no spinner); a página compõe botão + `SeoPreview`, liga `noteManualEdit` nos dois `onChange` e `reset` depois do save.
**Where**: `apps/backoffice/src/features/seo-suggestion/ui/SuggestSeoButton.tsx` + teste; `AdminProductFormPage.tsx`; `AdminProductFormPage.seo.test.tsx` (amplia)
**Depends on**: T04, T11
**Requirement**: SIA-10, SIA-11, SIA-12, SIA-16, SIA-20
**Done when**:
- [ ] **Página real**: tocar "Sugerir com IA" com o `functions.invoke` dublado ⇒ os dois campos e a prévia mostram a sugestão; **nada** gravado no banco até salvar
- [ ] Nome vazio ⇒ botão desabilitado com "Preencha o nome do produto primeiro."
- [ ] Desfazer pela página devolve os textos anteriores; digitar num campo some com o desfazer
- [ ] Salvar depois da sugestão grava os textos sugeridos
- [ ] `animacaoRespeitaMovimento` (escopo literal) recebe o arquivo novo com âncoras remedidas, se ele tiver classe de movimento
- [ ] **Build gate da fase 3** verde nos 4 workspaces
**Tests**: componente + página real · **Gate**: build

### T13: Prova — navegador e API real — ✅ feito (navegador); API real pendente: sem ANTHROPIC_API_KEY
**Resultado**: `prova-navegador.md`, só local (painel :8083 → Supabase local; `*.supabase.co` e `**/g/collect*` bloqueados; bundle servido conferido). 390×844 e 1440×900: publicar sem SEO (banco: `is_active = t`, os dois SEO `NULL`), rascunho e SEO parcial gravando `NULL` no vazio, checklist com os três rótulos, prévia derivada (nome editado sem salvar muda a prévia), piso da loja no produto novo, **503 real** `not_configured` (botão desabilitado + frase), 200/429/502/422×3 interceptados com as frases e campos intocados, salvar liberado, Desfazer (devolve o par, some ao digitar e ao salvar), descarte por edição (frase de `SIA-25`) e por troca de aba, corpo com as 6 chaves, alvos 44 px, foco visível, `scrollWidth == innerWidth` em todos os estados. **Dois defeitos a 200 % em 390**: D1 a prévia vira "J…"/"Joi A…" ao lado do selo "automático" (fonte do selo fixa em 10 px); D2 o botão "Sugerir com IA" (306 px) estoura o contêiner (196 px) e o cartão. O body rola a 200 % por `SlugField` (anterior à 84). Produto de teste apagado; `functions serve` encerrado.
**What**: prova em navegador (390×844 e 1440) com a function interceptada: publicar sem SEO, prévia derivada, sugerir, desfazer, 502, 429, 503, sem rolagem horizontal. Probe contra a Claude API real **quando houver `ANTHROPIC_API_KEY`**: 5 produtos do catálogo local, régua de A7 e p95 ≤ 15 s, `usage` registrado.
**Where**: `.specs/features/84-seo-do-produto-com-ia/prova-navegador.md`, `probes/`
**Depends on**: T12
**Requirement**: Success Criteria
**Done when**:
- [ ] As medidas de layout e os estados registrados, com o bundle servido conferido antes
- [ ] Probe real rodado **ou** declarado pendente com o comando pronto
**Tests**: none (prova) · **Gate**: —

---

## Phase Execution Map

```
Phase 1:  T01 ──→ T02 ──→ T03 ──→ T04
Phase 2:  T05 ──→ T06 ──→ T07 ──→ T08 ──→ T09 ──→ T10
Phase 3:  T11 ──→ T12 ──→ T13
```

Lotes (fases inteiras, ~7 tasks): **Worker A = Fase 1 (4 tasks)**, **Worker B = Fase 2 (6)**, **Worker C = Fase 3 (T11, T12)**; a T13 (prova em navegador) fica com o orquestrador.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T01 | 1 módulo de regra (+ export de 2 regex) | ✅ |
| T02 | 1 função | ✅ |
| T03 | 1 componente | ✅ |
| T04 | fiação de 1 página | ✅ |
| T05 | 1 porta (3 arquivos coesos: tipo, tradução pura, adaptador) | ⚠️ coeso |
| T06 | 1 módulo | ✅ |
| T07 | 1 módulo | ✅ |
| T08 | 1 endpoint | ✅ |
| T09 | fiação + 1 guarda | ⚠️ coeso (o guarda mede a fiação) |
| T10 | 1 guarda | ✅ |
| T11 | 1 slice de modelo (api + frases + hook) | ⚠️ coeso |
| T12 | 1 componente + composição | ✅ |
| T13 | prova | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T01 | — | início da Fase 1 | ✅ |
| T02 | — | após T01 (ordem, sem dependência real) | ✅ |
| T03 | T01 | após T02 | ✅ |
| T04 | T02, T03 | após T03 | ✅ |
| T05 | — | início da Fase 2 | ✅ |
| T06 | T01 | Fase 2, depois da Fase 1 | ✅ |
| T07 | T01 | idem | ✅ |
| T08 | T05, T06, T07 | após T07 | ✅ |
| T09 | T08 | após T08 | ✅ |
| T10 | T09 | após T09 | ✅ |
| T11 | T08 | Fase 3, depois da Fase 2 | ✅ |
| T12 | T04, T11 | após T11 | ✅ |
| T13 | T12 | após T12 | ✅ |

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T01 | regra `core` | unit | unit | ✅ |
| T02 | modelo do painel | unit | unit | ✅ |
| T03 | UI do painel | componente | componente | ✅ |
| T04 | UI (fiação) | página real | página real | ✅ |
| T05 | módulo de function | unit | unit (`claude.ts` provado pelo boot e pelo probe — não carregável pelo vitest, `AD-004`) | ✅ |
| T06 | módulo de function | unit | unit | ✅ |
| T07 | módulo de function | unit | unit | ✅ |
| T08 | handler | unit | unit | ✅ |
| T09 | `index.ts` + config | guarda + boot | guarda + boot | ✅ |
| T10 | guarda | unit | unit | ✅ |
| T11 | modelo do painel | unit | unit | ✅ |
| T12 | UI | componente + página real | componente + página real | ✅ |
| T13 | prova | none | none | ✅ |

---

## Conserto r1 do Verifier

**Date**: 2026-10-27 · **Entrada**: `validation.md` (FAIL por cobertura, 5 sobreviventes: V05, V20, V21, V22, V30, V40 — e a lacuna de precisão de SIA-07). Nenhum código de comportamento mudou além da fiação de SIA-07 (decisão do orquestrador: implementar) e da extração pura de `claude.ts`.

### Por lacuna

1. **`_shared/claude.ts` sem teste (V20, V21, V22).** Novo `supabase/functions/_shared/claudeRequest.ts`, sem o SDK (só `import type` de `./claudePort.ts`): `claudeClientOptions(apiKey)` ⇒ `{ apiKey, maxRetries: 1, timeout: 15_000 }` e `claudeMessagesArgs(req)` ⇒ `[corpo, { signal }]`. `claude.ts` passou a usar os dois (`new Anthropic(claudeClientOptions(apiKey))` e `const [body, options] = claudeMessagesArgs(req); client.messages.create(body, options)`); `TIMEOUT_MS` saiu de lá. Teste novo `_shared/__tests__/claudeRequest.test.ts` (8): opções do client por `toEqual`; o corpo inteiro escrito por extenso por `toEqual` (`model`, `max_tokens`, `system`, `messages`, `output_config: { effort, format: { type: 'json_schema', schema } }`); o esforço nos três valores; o schema por `toBe`; as opções do pedido só com `signal`, e o MESMO `signal` (`toBe`, e abortar o controle aborta o que vai ao SDK); e, pela AST de `claude.ts`, a metade que o vitest não alcança — o único `new` é `new Anthropic(claudeClientOptions(apiKey))`, a única `create` é `client.messages.create(body, options)` com `[body, options] = claudeMessagesArgs(req)` — mais a forma dos imports de `claudeRequest.ts` (`[{ spec: './claudePort.ts', soTipo: true }]`). `claudeSoNaPorta.test.ts`: `_shared/claudeRequest.ts` entrou na âncora da varredura (a régua 1 já recusa o SDK em qualquer arquivo que não o adaptador). **`deno check claude.ts` passou (exit 0)** contra `npm:@anthropic-ai/sdk@1.3.0`, num diretório isolado do scratchpad (`conserto-r1/denocheck`, `nodeModulesDir: none`, `--no-lock`), com os quatro arquivos de `_shared` copiados.
2. **SIA-10 / V30.** `AdminProductFormPage.seo.test.tsx`: a fixtura do caso de sugestão passou a ter `related_product_ids: ['r1','r2']` e duas categorias (`c1`, `c2`); o corpo do `invoke` é asserido campo a campo (`productId`, `name`, `description`, `categoryIds`, `relatedIds`, `requiresMaterial`) e depois por `toEqual` do objeto inteiro.
3. **Corte dos 4.000 no log / V40.** `seo-suggest/__tests__/handlers.test.ts` (+2): descrição com 5.250 caracteres de texto ⇒ a linha de log traz `descriptionCut: true` (e o `user` enviado à porta não contém o texto inteiro); a descrição curta da fixtura ⇒ `descriptionCut: false`.
4. **Fronteira de palavra / V05.** `core/seo/__tests__/suggestion.test.ts` (+3): "socorra" (contém "corra") e "aproveitem" (contém "aproveite") não reprovam o tom; "leiteira" (contém "leite") não reprova o material com `requiresMaterial`. Cada caso assere que o termo É substring do texto, para não virar o caso "Corrente" de novo. ⚠️ Observação, sem mudança: pela mesma fronteira, o plural "cabelos" **não** é acusado como material ("Pingente com cabelos do bebê" passa). Decidir se a régua deve casar plurais é decisão de produto.
5. **SIA-07 (implementado).** `AdminProductFormPage.tsx`, diff exato da `84` nesta rodada (o resto do arquivo é da outra frente, intocado):
   ```diff
   +import { useSeoSettings } from '@estrelinha/core/hooks/useStoreSettings'
   …
   +  // Feature 84 (`SIA-07`, conserto r1): o piso da prévia é a descrição da loja — a MESMA leitura que a
   +  // página do produto da loja faz (`apps/store/src/pages/ProductPage.tsx`), para a prévia ser o servido.
   +  const { description: storeDescription } = useSeoSettings()
   …
                     productDescription={form.description}
   +                  storeDescription={storeDescription}
   ```
   Teste pela página real (+2 em `AdminProductFormPage.seo.test.tsx`; o dublê do client ganhou `h.settings`, as linhas de `store_settings`): produto sem descrição e `seo.description` configurada ⇒ a prévia mostra a descrição da loja e não o piso; `seo.description` vazia ⇒ `STORE_DESCRIPTION_FLOOR`. Como na loja, sem linha `seo` no banco vale `DEFAULT_SEO.description` (o default do TypeScript), não o piso.

### Contagens (um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe)

| Workspace | Antes | Depois | Exit |
| --- | --- | --- | --- |
| core | 4761/186 | **4764/186** (+3) | 0 |
| functions | 1198/31 | **1208/32** (+10/+1: `claudeRequest.test.ts` 8, `handlers.test.ts` 2) | 0 |
| backoffice | 4104/235 | **4106/235** (+2) | 0 |
| store | 6168/330 | **6168/330** (idêntico) | 0 |

`tsc` backoffice **0**; `tsc` core **11** (os herdados: `home/__tests__` 7, `sitemap/__tests__/urls` 2, `packages/supabase/src/client.ts` 2); eslint backoffice **23/5**. Logs em `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/cc66d325-20ac-4107-8ea3-42611f7041ad/scratchpad/conserto-r1/`.

### Mutantes reinjetados (edição no lugar, restauração por cópia, SHA-256 conferido: 11/11 `SHA_OK`; o arnês lança se o alvo não for achado exatamente uma vez)

| # | Arquivo | Mutação | Resultado | Quem matou |
| --- | --- | --- | --- | --- |
| V05 | `core/seo/suggestion.ts` | `contemTermo` sem a fronteira | ✅ asserção | os 3 inversos novos (socorra, aproveitem, leiteira) |
| V20 | `_shared/claudeRequest.ts` | `effort: 'high'` fixo | ✅ asserção | "o corpo inteiro, por igualdade"; "o esforço é o de quem chama" |
| V21 | idem | `CLAUDE_MAX_RETRIES = 3` | ✅ asserção | "uma retentativa, 15 s por tentativa" |
| V22 | idem | opções do pedido `{}` | ✅ asserção | "o MESMO signal do orçamento" |
| V22b | idem | `signal` de um `AbortController` novo | ✅ asserção | idem (`toBe`) |
| V20w | `_shared/claude.ts` | `create(body, {})` | ✅ asserção | AST: "`messages.create` recebe exatamente o par" |
| V21w | idem | `new Anthropic({ apiKey, maxRetries: 3, timeout: 15_000 })` | ✅ asserção | AST: "o client nasce de `claudeClientOptions(apiKey)`" |
| V30 | `AdminProductFormPage.tsx` | `relatedIds: []` | ✅ asserção | SIA-10 pela página |
| V30c | idem | `categoryIds: form.category_ids.slice(0, 1)` | ✅ asserção | SIA-10 pela página |
| V40 | `seo-suggest/handlers.ts` | `descriptionCut` fora do log | ✅ asserção | os 2 casos de log novos |
| V42 | `AdminProductFormPage.tsx` | sem `storeDescription={…}` | ✅ asserção | SIA-07 "com `seo.description` configurada" |

**11/11 mortos por asserção, 0 por compilação.** Nenhum `git stash`/`checkout`/`restore`/`reset`/`clean`; nada commitado. T13 (navegador e probe real) segue em aberto, fora desta rodada.


## Conserto r2

**Date**: 2026-10-27 · Implementador (não o Verifier). Testes exclusivamente no ambiente local (restrição do usuário): nenhum comando tocou o projeto hospedado; nada de `--linked`, `secrets set` nem deploy. Nada commitado; nenhum `git stash`/`checkout`/`restore`/`reset`/`clean`.

### Mudanças de produto (spec revista em 2026-10-27: A3, A12, A13)

1. **A12 — o material afetivo pode e deve ser nomeado.** Decisão do usuário: medido no banco, 430 de 463 peças com material o nomeiam no nome e 432 de 460 com SEO curado o nomeiam no SEO — é o termo buscado. Saíram de `core/seo/suggestion.ts` a recusa de material, `PALAVRAS_DE_MATERIAL`, `NOMES_DE_MATERIAL` e o import de `material/material.ts`. O grafo Deno de `suggestion.ts` encolheu de **7 para 6** arquivos, remedido pela própria régua de `suggestionDenoReach.test.ts` (a âncora agora assere também a ausência de `material/material.ts`; o sensor do import de pacote mudou de alvo para `faq/block.ts`, que continua no grafo).
   - **Substituições declaradas (a AC mudou, não a régua afrouxou)**: em `suggestion.test.ts`, os 8 casos que provavam a recusa de material (e os inversos que só existiam por causa dela — "leiteira", "pelo" como preposição, "Outro material", "o mesmo texto passa sem material") saíram; entraram os **inversos de A12** (4 títulos e 1 descrição nomeando o material ⇒ `null`). Em `handlers.test.ts`, "material nomeado com requiresMaterial ⇒ 422" virou "⇒ 200 com UMA chamada". Em `prompt.test.ts`, "proíbe NOMEAR o material" virou "NÃO proíbe nomear o material — manda nomeá-lo". **N12/N13 (os diminutivos fora da lista de material) ficam OBSOLETOS pela A12**: a lista não existe mais.
2. **A3 — descrição 140–160.** `SUGGESTION_DESCRIPTION_MIN = 140` (era 70); `SUGGESTION_DESCRIPTION_ASK_MIN = 150` novo, o piso que o prompt pede (a folga de 10 evita retentativa por um caractere). Bordas: 139 reprova, 140 passa, 160 passa, 161 reprova. As fixturas de descrição dos testes de `core` e do handler foram alongadas para caber em 140–160 (cada uma com a medida asserida).
3. **A13 — título diferente do nome.** `suggestionRefusal(s, exampleTitles, productName)`: título (depois de `stripBrand`) igual ao nome — sem caixa, sem acento, espaço colapsado — reprova; vem depois de "igual a exemplo". O handler passa `body.name`. Casos: igual reprova; igual com caixa/acento/espaço diferentes reprova; igual depois de tirar a marca reprova; o nome contido no título passa; a ordem (exemplo antes de nome). No handler: igual ao nome ⇒ retentativa e 200; 2× ⇒ 422 `off_rules`; o nome que vale é o do corpo.
4. **O `system` do prompt reescrito** com as regras de SEO da loja (skill `seo-uma-estrelinha`), sem perder as de tom: título ≤ 43 sem a marca (a loja acrescenta " | Uma Estrelinha"), palavra-chave principal (tipo de joia + material afetivo) no início, material base se couber (Prata 925, Aço Inoxidável), nunca igual ao nome; descrição de 150 a 160, frase completa, palavra-chave + benefício emocional + fecho sem urgência ("Peça personalizada. Envio para todo o Brasil."); com `requiresMaterial`, dizer que a joia é feita com o material enviado pela cliente; tom íntimo e acolhedor, sem emoji, exclamação, urgência, trocadilho nem festa; não repetir título nem descrição dos exemplos. Os números vêm das constantes (`SUGGESTION_TITLE_MAX`, `SUGGESTION_DESCRIPTION_ASK_MIN`, `DESCRIPTION_MAX`). A linha do `user` para `requiresMaterial` deixou de dizer "sem nomear qual".

### Lacunas do Verifier r2 fechadas

- **N01/N02 (e N03 sem `new`)** — `claudeRequest.test.ts` ganhou a régua que fixa **o arquivo `claude.ts` inteiro, sem comentário, por igualdade** (os statements impressos pelo printer do TypeScript com `removeComments`). Qualquer escrita entre a montagem e o envio, `Object.assign` no client ou reescrita do `signal` reprova.
- **N04** — a tradução do erro saiu de `claude.ts` para **`_shared/claudeError.ts`** (`errorToResult(err, classes)`, sem SDK; as classes chegam injetadas — o adaptador passa o próprio `Anthropic`). Teste novo `claudeError.test.ts` (14), com um dublê que repete a **hierarquia** do SDK 1.3.0 (medida no Deno: `APIUserAbortError` e `APIConnectionError` filhas de `APIError`, `APIConnectionTimeoutError` filha de `APIConnectionError`): aborto ⇒ `upstream` sem status (mesmo com status numérico), timeout e conexão ⇒ `upstream` sem status, 500/503/529/429/400 ⇒ `upstream` com o status, status não numérico ⇒ `null`, erro estranho ⇒ `upstream`, nenhum erro vira `refusal`, decisão por classe e não por texto, e a forma dos imports. `claudeSoNaPorta.test.ts` incluiu `_shared/claudeError.ts` na âncora.
- **N05** — a mesma régua de igualdade fixa `return messageToResult(msg as any)`: mascarar o `stop_reason` reprova.
- **N09** — caso de `claudeMessagesArgs` com o `user` real de `buildSeoPrompt` com descrição longa (cortada em 4.000; `user` > 3.900 caracteres) indo inteiro em `messages`.
- **N16/N17** — `URGENCY_TERMS` comparada por igualdade com a lista escrita por extenso no teste, e um `it.each` sobre a lista **literal** (o `each` sobre a própria constante encolhia junto com ela).
- **N28** — caso da página real com `requires_material: false` ⇒ `requiresMaterial: false` no corpo do `invoke`.
- **`deno check claude.ts` passou (exit 0)** contra `npm:@anthropic-ai/sdk@1.3.0`, num diretório isolado do scratchpad (`conserto-r2/denocheck`, `nodeModulesDir: none`, `--no-lock`), com os cinco arquivos de `_shared` copiados (`claude`, `claudePort`, `claudeRequest`, `claudeResult`, `claudeError`) — prova que `Anthropic` satisfaz `ClaudeErrorClasses`.

### Contagens (um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe)

| Workspace | Antes | Depois | Exit |
| --- | --- | --- | --- |
| core | 4764/186 | **4767/186** (+3: −8 casos de material, +5 inversos de A12, +5 de A13, +1 lista literal; os dois `each` de urgência seguem com 13 termos, agora sobre a lista escrita) | 0 |
| functions | 1208/32 | **1228/33** (+20/+1: `claudeError.test.ts` 14 novos; `claudeRequest` +2; `prompt` +1; `handlers` +3) | 0 |
| backoffice | 4106/235 | **4107/235** (+1, N28) | 0 |
| store | 6168/330 | **6168/330** (idêntico) | 0 |

`tsc` backoffice **0**; `tsc` core **11** (os herdados, idênticos); eslint backoffice **23/5**. Logs em `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/cc66d325-20ac-4107-8ea3-42611f7041ad/scratchpad/conserto-r2/`.

### Mutantes reinjetados (edição no lugar, restauração por cópia, SHA-256 conferido: 17/17 `SHA_OK`; o arnês lança com alvo ausente ou repetido e com `No test files found`)

| # | Arquivo | Mutação | Resultado | Quem matou |
| --- | --- | --- | --- | --- |
| N01 | `_shared/claude.ts` | `body.output_config.effort = 'high'` depois da montagem | ✅ asserção | o arquivo por igualdade (AST) |
| N02 | idem | `Object.assign(client, { maxRetries: 3 })` | ✅ asserção | idem |
| N03b | idem | `options.signal = req.signal` (sem `new`) | ✅ asserção | idem |
| N04 | `_shared/claudeError.ts` | aborto ⇒ `refusal` | ✅ asserção | 3 casos de `claudeError.test.ts` |
| N04b | idem | conexão ⇒ `refusal` | ✅ asserção | 3 casos |
| N04c | idem | 5xx sem status | ✅ asserção | 6 casos |
| N05 | `_shared/claude.ts` | `messageToResult({ ...msg, stop_reason: 'end_turn' })` | ✅ asserção | o arquivo por igualdade (AST) |
| N09 | `_shared/claudeRequest.ts` | `content: req.user.slice(0, 2000)` | ✅ asserção | "o `user` vai inteiro" |
| N16 | `core/seo/suggestion.ts` | `'garanta já'` fora | ✅ asserção | lista literal + o `each` literal |
| N17 | idem | `'estoque limitado'` fora | ✅ asserção | idem |
| R1 | idem | piso volta a 70 | ✅ asserção | limites A3; 139/140 |
| R2 | idem | A13 apagada | ✅ asserção | 3 casos de A13 |
| R3 | idem | A13 sem dobrar (`title === productName`) | ✅ asserção | "caixa, acento e espaço" |
| R4 | `seo-suggest/prompt.ts` | o prompt pede 140 | ✅ asserção | "carrega as regras…" |
| R5 | idem | o prompt volta a proibir nomear o material | ✅ asserção | "NÃO proíbe nomear o material" |
| R6 | `seo-suggest/handlers.ts` | nome vazio na régua | ✅ asserção | 2 casos A13 do handler |
| N28 | `AdminProductFormPage.tsx` | `requiresMaterial: true` fixo | ✅ asserção | SIA-10 com `requires_material: false` |

**17/17 mortos por asserção, 0 por compilação.** Dos 10 sobreviventes da r2: 8 reinjetados e mortos (N01, N02, N04, N05, N09, N16, N17, N28); **N12 e N13 obsoletos pela A12**. T13 (navegador e probe contra a API real) segue em aberto, fora desta rodada.

## Fecho das lacunas da rodada 3 (orquestrador, sem rodada 4)

A r3 do Verifier reprovou só por cobertura (3 sobreviventes, nenhum defeito de produto). Pelo precedente
do projeto (`72`, `73`, `75`), as lacunas foram fechadas com o mutante reinjetado, sem rodada 4.
Autor = verificador nesta passada, declarado.

| Lacuna | Conserto | Mutante reinjetado | Resultado |
| --- | --- | --- | --- |
| X04 — emoji em apresentação de texto | `suggestion.test.ts`: `❤` e `☀` sem seletor de variação reprovam | `\p{Extended_Pictographic}` → `\p{Emoji_Presentation}` | morto (asserção), SHA ok |
| X05 — âncora `$` da marca no fim | `suggestion.test.ts`: `'Colar \| Uma Estrelinha dourado'` intocado | regex sem `$` | morto (asserção), SHA ok |
| X14 — `requiresMaterial` não booleano | `handlers.ts` `parseBody`: presente e não booleano ⇒ 400; caso no `it.each` do 400 | remover a checagem | morto (asserção), SHA ok |
| X14b — `=== true` → `!!` | — | — | **equivalente** depois do conserto de X14 (só booleano chega) |
| `stop_reason: model_context_window_exceeded` (achado lateral) | `claudeResult.ts`: ⇒ `truncated`, como `max_tokens`; caso em `claudeResult.test.ts` | voltar a só `max_tokens` | morto (asserção), SHA ok |

`pause_turn` (só ocorre com ferramentas de servidor, que a chamada não declara) segue o caminho comum:
sem bloco `text` válido ⇒ `invalid` ⇒ conta como reprovada.

## Conserto dos bugs do QA

Relatório: `docs/qa/reports/2026-10-27-backoffice-seo-com-ia.md`. Cada conserto começou por um teste que
reprovou antes; depois o código; depois o mutante (o conserto desfeito) reinjetado no arquivo real,
restaurado por cópia com SHA-256 conferido (12/12 `SHA_OK`; o arnês lança com alvo ausente ou repetido).
`AdminProductFormPage.tsx` **não** foi tocado: a página já chamava `noteManualEdit` e `reset`.

| Bug | Conserto | Teste que reprovou antes | Mutante | Resultado |
| --- | --- | --- | --- | --- |
| `segunda-sugestao-perde-o-texto-da-adri` (SIA-12 nova) | `useSeoSuggestion`: o ponto de volta (`origin`) é gravado só pela 1ª sugestão da série; desfazer, edição manual e save encerram a série; em voo o "Desfazer" some e volta com a resposta | hook "SIA-12 (letra nova)" (7 casos, 4 vermelhos); página "manual → sugerir → sugerir → desfazer" | M1 a 2ª sugestão regrava o ponto de volta · M12 o desfazer visível em voo | mortos (4 · 2) |
| `sugerir-e-desfazer-soltam-o-foco` | `SuggestSeoButton`: em voo e no 503, `aria-disabled` sem o nativo, toque ignorado no botão; "Desfazer" entrega o foco a "Sugerir com IA" | botão (voo, `disabled`, foco do Desfazer); página "o foco não cai no body" e o SIA-10 | M2 nativo de volta · M3 sem `focus()` · M4 toque em voo não ignorado no botão | mortos (5 · 2 · 2) |
| `sugestao-preenchida-sem-aviso-ao-leitor` | frase `SEO_SUGGESTION_APPLIED` no 200, na região `role=status` | hook "a frase do sucesso"; página "o leitor de tela ouve o sucesso" (2) | M5 `setMessage(null)` no 200 | morto (5) |
| `previa-do-google-ilegivel-com-fonte-200` | `SeoPreview`: título `line-clamp-2 break-words` (sem `truncate`), descrição `break-words`, selo `max-w-full break-words`, caixa `min-w-0` | `SeoPreview.test.tsx` "a prévia embrulha em vez de cortar" (5, token exato) | M8 `truncate` de volta · M9 selo sem teto · M10 caixa sem `min-w-0` | mortos (1 · 2 · 1) |
| `aviso-de-falha-da-sugestao-fica-depois-de-salvar` | `useSeoSuggestion`: a frase sai na edição manual (fora de voo), no save e no desfazer — menos a dica de `not_configured` (SIA-20) | hook "a frase de falha sai…" (8 vermelhos); página 502 × edição e 429 × save | M6 edição sem apagar · M7 save sem apagar · M11 apagar também a dica de `not_configured` | mortos (7 · 7 · 1) |

**12/12 mortos por asserção, 0 por compilação.**

**Desvios e asserções mudadas (nenhuma afrouxada):**

- `SPEC_DEVIATION` (lacuna de precisão de `SIA-10`): o sucesso ganhou frase na região viva ("Sugestão
  aplicada ao título e à descrição. Revise antes de salvar."). Por isso dois casos antigos do hook, que
  asseriam `message === null` depois do 200 ("em voo: status loading…" e "noteManualEdit SEM pedido em
  voo…"), passaram a asserir a frase nova.
- `SIA-10`/`SIA-20` dizem "desabilitado": em voo e no 503 o botão agora é desabilitado por
  `aria-disabled` (o nativo soltava o foco). Os casos que usavam `toBeDisabled()` (botão: voo e
  `disabled`; página: "Sugerindo…" e 503) passaram a asserir `aria-disabled="true"`, a **ausência** do
  `disabled` nativo e que o toque não chama (mais forte). `SIA-11` (sem nome) segue com o nativo e com
  `toBeDisabled()` intocado.
- `SIA-12` nova não contradisse nenhum caso antigo: "uma nova sugestão desliga o desfazer já no toque"
  continua verdadeiro (em voo o desfazer some) e ficou; o caso da série vem ao lado.
- **Limite do jsdom:** ele não aplica a *focus fixup* — com o `disabled` nativo o `activeElement` em voo
  e no 503 continuava no botão (medido: aquelas linhas passavam antes). Quem discrimina ali é a ausência
  do nativo; a medida do foco no navegador fica para o reteste do QA. O foco depois do "Desfazer" (o nó
  desmonta) é discriminado em jsdom.

**Contagens** (um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe): backoffice
4110/235 → **4142/235** (+32), exit 0; store **6168/330**, idêntico, exit 0. `tsc` backoffice **0**;
eslint backoffice **23/5** (inalterado); `pnpm --filter @estrelinha/backoffice build` exit 0.
`animacaoRespeitaMovimento` não precisou remedir âncora (nenhuma classe de movimento nova). Logs e o
arnês (`mutar.py`, `mutantes.txt`) em
`/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/cc66d325-20ac-4107-8ea3-42611f7041ad/scratchpad/conserto-qa/`.
