# Perguntas frequentes da loja — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tasks com a skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo de Execute e
as Critical Rules dela.** Não procure os arquivos da skill por caminho de sistema. A skill é a fonte
de verdade do fluxo completo (ciclo por task, delegação, revisão de adequação, Verifier, sensor de
discriminação).

**Se a skill não puder ser ativada, PARE e avise — não prossiga sem ela.**

---

**Design**: `.specs/features/46-perguntas-frequentes-da-loja/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Gerada do codebase, das diretrizes do projeto e da spec. **Diretrizes encontradas**: `CLAUDE.md`
> (raiz — seções *Os guardas*, *Baselines*, *Convenções*), `apps/store/CLAUDE.md`,
> `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`,
> `apps/*/vitest.config.ts`, `packages/core/package.json`.

| Camada | Tipo de teste | Cobertura esperada | Padrão de local | Comando |
| --- | --- | --- | --- | --- |
| Regra pura (`packages/core/src/faq/**`) | unit | Todos os ramos; 1:1 com as ACs da spec; **toda** borda listada em *Edge Cases* | `packages/core/src/faq/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Migration / schema (`supabase/migrations/**`) | guarda que **lê o `.sql` do disco** | Cada afrouxamento possível tem asserção própria, **uma régua por comando** (`L-033`); âncora de contagem (`L-021`); sensor por mutação | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Hook de dados (`entities/*/api`, `features/*/api`) | unit | Caminho feliz + erro + linha órfã/inativa | junto do arquivo, `*.test.ts(x)` | por workspace |
| Componente de UI (loja e painel) | unit (RTL/jsdom) | Toda AC que jsdom alcança; **literal de texto que a spec fixa é asserido inteiro** (`L-009`, `L-036`) | junto do arquivo, `*.test.tsx` | por workspace |
| Página / composição | unit (RTL) | Os três estados (carregando / vazio / falha) + a fiação (a página monta o componente — **o teste não monta a árvore que quer provar**) | `apps/*/src/pages/__tests__/*.test.tsx` | por workspace |
| Guarda de dono único / varredura de fonte | guarda | **Âncora dupla** (arquivos lidos **e** ocorrências encontradas), escopo ≥ o da regra (`L-035`), sensor com CRLF e LF (`L-031`), régua de token exato (`L-034`) | `apps/*/src/shared/lib/__tests__/*.test.ts` | por workspace |
| Layout / medida de tela | **none em jsdom** | jsdom devolve 0 para toda medida — prova é navegador real em 390×844 e 1440 | — | T29 |
| Rota / roteador | unit (bidirecional) | Rota nova classificada nos quatro conjuntos; guardas já existem e quebram sozinhos | `apps/store/src/app/__tests__/` | `pnpm --filter @estrelinha/store test` |

## Gate Check Commands

> **Um workspace por vez, e o exit code capturado FORA do pipe** — `pnpm test | tail` devolve o
> código do `tail` (`CLAUDE.md`). Duas suítes concorrentes saturam a máquina e produzem timeout de 5s
> em teste que varre disco.

| Nível | Quando | Comando |
| --- | --- | --- |
| **quick** | task que mexe só em `packages/core` | `pnpm --filter @estrelinha/core test` |
| **quick (store)** | task que mexe só na loja | `pnpm --filter @estrelinha/store test` |
| **quick (painel)** | task que mexe só no painel | `pnpm --filter @estrelinha/backoffice test` |
| **full** | task que atravessa workspace | os dois/três comandos acima, **um por vez** |
| **build** | fim de fase, ou task de migration/config | `npx tsc --noEmit -p apps/store/tsconfig.app.json` · `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` · `pnpm build` · `pnpm lint` |

**Baselines de entrada (do `CLAUDE.md`, a confirmar por medição na T1):** store **2955/189** ·
backoffice **2023/119** · core **2128/80** · functions **436/8** · catalog-import **512/23**.
Lint **27/6**. Tipos **0·0·0**. O gate é **sem regressão**, e queda de contagem só vale se o número
reaparece do outro lado.

---

## Ferramentas por task

- **MCP `supabase`**: **não autorizado nesta sessão** (o servidor pede OAuth e a sessão é não
  interativa). Todo trabalho de banco vai por **CLI do Supabase + `curl` contra o PostgREST local**
  (`127.0.0.1:54341`), que é o que o `AD-012` cobra como prova.
- **Skill `playwright-cli`**: T29 (prova em navegador, 390×844 e 1440).
- **MCP `paper`**: consulta ao artboard quando uma medida do desenho estiver em dúvida (T14–T17,
  T21–T24).
- Demais tasks: nenhum MCP.

---

## Execution Plan

### Fase 1 — A base (banco e limite)

```
T1 → T2 → T3 → T4
```

### Fase 2 — A regra pura

```
T5 → T6 → T7 → T8
```

### Fase 3 — Loja: endereço, dados e cabeça

```
T9 → T10 → T11 → T12 → T13
```

### Fase 4 — Loja: a página

```
T14 → T15 → T16 → T17 → T18 → T19
```

### Fase 5 — Painel

```
T20 → T21 → T22 → T23 → T24 → T25
```

### Fase 6 — Dono único e gate

```
T26 → T27 → T28 → T29
```

---

## Task Breakdown

### T1: Migration — teto de 4000 e a tabela `faq_page_items`

**What**: uma migration que (a) troca o `check` de `faqs.answer` de 600 para 4000, (b) cria
`faq_page_items` com o `check` de assunto, o índice e a RLS.
**Where**: `supabase/migrations/<timestamp>_46-perguntas-frequentes-da-loja.sql` (novo) ·
`apps/store/src/shared/lib/__tests__/faqPageSchema.test.ts` (novo)
**Depends on**: None
**Reuses**: a migration da `28` como molde de RLS e de comentário; `homeSections.test.ts` como molde
de guarda que lê `.sql` do disco
**Requirement**: `FAQL-26`, `FAQL-27`, `FAQL-29`

**Done when**:
- [ ] `drop constraint if exists faqs_answer_len` + `add constraint` com 4000, e o comentário diz por
      que não foi editada a migration da `28` (`AD-017`)
- [ ] `faq_page_items` com `faq_id` PK → `faqs(id)` **`on delete restrict`**, `category` com `check`
      dos 6 valores, `position`, `answer_override` nullable com `check` de 4000, `created_at`
- [ ] índice `(category, position)`
- [ ] RLS habilitada; leitura pública **sem condição** (com o comentário que explica o porquê);
      escrita `to authenticated` com `has_role` no `using` **e** no `with check`; **nenhum `grant`**
- [ ] `faqPageSchema.test.ts` assere cada item acima com **uma régua por comando** e âncora de
      contagem, e cada asserção tem sensor por mutação provado por injeção real no arquivo real
- [ ] Gate quick (store) passa
- [ ] Contagem: store sobe em ≥ 12 testes, sem queda em nenhum arquivo

**Tests**: guarda (lê o `.sql` do disco)
**Gate**: quick (store)
**Commit**: `feat(46): a tabela de colocação e o teto de 4000`

> ⚠️ **Nada de `git push` entre T1 e T2.** O `Supabase Deploy` aplica migration pendente em todo push
> em `master`, e migration aplicada é imutável (`AD-017`) — a semeadura da T2 mora **no mesmo
> arquivo**.

---

### T2: Migration — a semeadura das 26 perguntas

**What**: acrescentar ao arquivo da T1 a semeadura aditiva e idempotente das 26 perguntas e das 26
colocações, com `question_key` **pré-computado** por `faqQuestionKey`.
**Where**: o mesmo `.sql` da T1 (modificar) · `faqPageSchema.test.ts` (estender) ·
`scripts/_gen-faq-seed.mjs` (novo, gerador descartável — **fora** do bundle)
**Depends on**: T1
**Reuses**: `faqQuestionKey` (`packages/core/src/faq/faq.ts:119`); a semeadura aditiva da `39`
(`value ||` / `NOT value ?`) como molde de idempotência
**Requirement**: `FAQL-28`

**Done when**:
- [ ] As 26 linhas saem de um `values (...)` com `question`, `answer`, `question_key`, `category`,
      `position` — e o `question_key` de cada uma foi **gerado rodando `faqQuestionKey`**, nunca
      digitado
- [ ] `insert into faqs ... on conflict (question_key) do nothing`
- [ ] `insert into faq_page_items ... join faqs on question_key ... on conflict (faq_id) do nothing`
      — é o `join` que faz pergunta já existente na biblioteca entrar na página sem virar uma segunda
- [ ] **Zero `update` e zero `delete`** no arquivo inteiro
- [ ] Os emojis do texto de origem (`✨`, `❤️`) **não** entram no banco (`FAQL-10`)
- [ ] O guarda assere: as 26 linhas existem; `faqQuestionKey(question) === question_key` **em cada
      uma**; a ausência de `update`/`delete`; e a soma por assunto (5/3/4/8/3/3)
- [ ] Gate quick (store) passa
- [ ] Contagem: store sobe em ≥ 6 testes

**Tests**: guarda (lê o `.sql` do disco)
**Gate**: quick (store)
**Commit**: `feat(46): as 26 perguntas, semeadas sem apagar edição da dona`

---

### T3: `FAQ_ANSWER_MAX` e o guarda do limite vigente

**What**: subir a constante para 4000 e **reescrever** `faqSchema.test.ts` para comparar o TypeScript
com o `check` **vigente** (o da migration da `46`), mantendo a asserção de que a `28` declarou 600.
**Where**: `packages/core/src/faq/faq.ts` (modificar) ·
`apps/store/src/shared/lib/__tests__/faqSchema.test.ts` (modificar)
**Depends on**: T1
**Reuses**: o molde de `homeSections.test.ts`, que já guarda "o `check` **vigente**" depois de a `41`
recriar a constraint
**Requirement**: `FAQL-26`

**Done when**:
- [ ] `FAQ_ANSWER_MAX = 4000`, com o comentário registrando a medição (maior resposta ~1.400)
- [ ] `faqRefusal` passa a recusar em 4001, e há teste para 4000 (aceita) e 4001 (recusa)
- [ ] `faqSchema.test.ts` compara `FAQ_ANSWER_MAX` com o número da migration da **46**, e continua
      asserindo que a da `28` não foi editada
- [ ] Sensor: trocar o número numa das duas pontas reprova
- [ ] Gate full (core + store), um por vez
- [ ] Contagem: core +2, store sem queda

**Tests**: unit (core) + guarda (store)
**Gate**: full
**Commit**: `feat(46): a resposta cabe em 4000 caracteres`

---

### T4: Probe HTTP contra o banco local (`AD-012`)

**What**: aplicar a migration no Supabase local e **provar por HTTP** que a tabela grava, que a RLS
recusa `anon` e que a semeadura é idempotente.
**Where**: nenhum arquivo de produção — a evidência vai para o corpo desta task e para o
`validation.md`
**Depends on**: T2, T3
**Reuses**: o bloco *"O que o probe mediu"* da migration da `28` como formato de registro
**Requirement**: `FAQL-31`

**Done when**:
- [ ] Migration aplicada no local (`supabase migration up` ou `db push`), sem `db reset` — o catálogo
      importado não pode ser perdido
- [ ] Medido e registrado: admin insere colocação → 201 · `anon` faz `POST` → 401 · `anon` lê a
      colocação → 200 com a entrada embutida · apagar `faqs` em uso → **23503** · resposta com 4001
      caracteres → **23514** · resposta com 4000 → 201
- [ ] A semeadura rodada **duas vezes** não muda `count(*)` nem sobrescreve resposta — provado por SQL
- [ ] Nenhuma asserção depende de inspeção de tipo
- [ ] Gate build

**Tests**: none (a matriz diz "none — build gate" para schema; a prova é o probe registrado)
**Gate**: build
**Commit**: `docs(46): o que o probe mediu contra o banco local`

---

### T5: `core/faq/text.ts` — o formato da resposta

**What**: `faqAnswerBlocks` (linha em branco = parágrafo, `- ` = item) e `faqAnswerPlainText`
**definido como dobra sobre ele**.
**Where**: `packages/core/src/faq/text.ts` (novo) ·
`packages/core/src/faq/__tests__/text.test.ts` (novo) · `index.ts` (export)
**Depends on**: None
**Reuses**: `normalizeFaqText`; o estilo puro do diretório
**Requirement**: `FAQL-30`, `FAQL-17`

**Done when**:
- [ ] Parágrafo, lista, lista no meio de parágrafos, item solto, `- ` no meio da linha (não é item),
      CRLF e LF, texto vazio, texto só de espaço — cada um com caso
- [ ] `faqAnswerPlainText` **chama** `faqAnswerBlocks`; um sensor prova que um segundo parser ingênuo
      diverge e reprova
- [ ] Nenhum import
- [ ] Gate quick (core); core sobe em ≥ 12 testes

**Tests**: unit
**Gate**: quick

---

### T6: `core/faq/page.ts` — assuntos e `resolveFaqPage`

**What**: `FAQ_PAGE_CATEGORIES`, `FaqPageCategoryKey`, `faqPageCategoryLabel`,
`faqPageCategoryRefusal`, `resolveFaqPage`, e os tipos `FaqPageLink`/`FaqPageGroup`.
**Where**: `packages/core/src/faq/page.ts` (novo) · `types.ts` (modificar) ·
`packages/core/src/faq/__tests__/page.test.ts` (novo) · `index.ts` (export)
**Depends on**: T5
**Reuses**: `resolveProductFaqs` (as três regras), `normalizeFaqText`, `ResolvedFaq`
**Requirement**: `FAQL-02`, `FAQL-27`

**Done when**:
- [ ] Ordena por (ordem do assunto, `position`, `faq_id`) — com caso de empate de `position`
- [ ] Pula vínculo órfão e entrada inativa **sem preencher a vaga**
- [ ] Aplica `answer_override`; override só de espaço cai no padrão
- [ ] Assunto sem pergunta ativa **é descartado**
- [ ] `faqPageCategoryLabel` degrada para o próprio `key` em valor desconhecido
- [ ] `faqPageCategoryRefusal` devolve `string | null` (nunca união por booleano)
- [ ] Nenhum import além de `./types.ts` e `./faq.ts`
- [ ] Gate quick (core); core sobe em ≥ 16 testes

**Tests**: unit
**Gate**: quick

---

### T7: `core/faq/jsonld.ts` — o `FAQPage`

**What**: `faqPageJsonLd(groups, { url })` devolvendo o objeto `FAQPage` do schema.org.
**Where**: `packages/core/src/faq/jsonld.ts` (novo) ·
`packages/core/src/faq/__tests__/jsonld.test.ts` (novo) · `index.ts` (export)
**Depends on**: T5, T6
**Reuses**: `faqAnswerPlainText`; `core/shopping/jsonld.ts` como precedente de lugar e de forma
**Requirement**: `FAQL-13`, `FAQL-17`

**Done when**:
- [ ] `@context`, `@type: FAQPage`, `mainEntity` com `Question` + `acceptedAnswer.Answer`
- [ ] O texto vem de `faqAnswerPlainText` — asserido, não suposto
- [ ] Lista vazia devolve `mainEntity: []` (nunca `undefined`)
- [ ] `url` entra como `@id`/`url` da página
- [ ] Nenhum import de React/Supabase
- [ ] Gate quick (core); core sobe em ≥ 8 testes

**Tests**: unit
**Gate**: quick

---

### T8: `purity.test.ts` para `core/faq`

**What**: guarda que reprova import de React, Supabase ou Deno em `packages/core/src/faq/**`.
**Where**: `packages/core/src/faq/__tests__/purity.test.ts` (novo)
**Depends on**: T7
**Reuses**: `core/shopping/__tests__/purity.test.ts` (molde, inclusive a âncora de contagem)
**Requirement**: `FAQL-30` (contrapartida)

**Done when**:
- [ ] Varre o diretório inteiro, com **âncora de contagem** (`files.length >= 8`)
- [ ] Sensor: um import injetado reprova
- [ ] O motivo está escrito: o **importador do catálogo roda em Node** e consome este diretório
- [ ] Gate quick (core); core sobe em ≥ 2 testes

**Tests**: guarda
**Gate**: quick

---

### T9: `FAQ_PATH` e a classificação da rota

**What**: a constante, a entrada em `ROUTE_SLUGS` e em `SITEMAP_STATIC_PATHS`.
**Where**: `packages/core/src/routes/routes.ts` (modificar) · os guardas de rota (modificar)
**Depends on**: None
**Reuses**: `RETURNS_POLICY_PATH`/`JEWELRY_CARE_PATH` como molde exato
**Requirement**: `FAQL-01`, `FAQL-16`

**Done when**:
- [ ] `export const FAQ_PATH = '/perguntas-frequentes'`, com o comentário dizendo por que a constante
      mora aqui (quem linka não é quem renderiza)
- [ ] `'perguntas-frequentes'` em `ROUTE_SLUGS`; `FAQ_PATH` em `SITEMAP_STATIC_PATHS` **pela
      constante**, nunca literal repetido
- [ ] `routes.test.ts`, `reservedSlugs.test.ts` e `sitemapRoutes.test.ts` passam — os três são
      bidirecionais e vão cobrar a rota no `App.tsx` (que chega na T17); **até lá, esta task deixa a
      rota declarada no `App.tsx` junto**, senão o guarda reprova por construção
- [ ] Gate full (core + store)

**Tests**: unit (core) + guarda (store)
**Gate**: full

> A rota entra no `App.tsx` **nesta task** (apontando para a página que a T17 cria, criada aqui como
> casca mínima) porque os guardas de rota são bidirecionais: separar as duas metades deixaria a
> árvore vermelha entre T9 e T17, e "commit que não passa no gate" não é atômico.

---

### T10: `useFaqPage` — a leitura da loja

**What**: o hook do React Query que lê `faq_page_items` com o embed e devolve `resolveFaqPage`.
**Where**: `apps/store/src/entities/faq/api/useFaqPage.ts` (novo) + `.test.tsx`
**Depends on**: T6
**Reuses**: `useProductFaqs` (molde), `resolveFaqPage`
**Requirement**: `FAQL-09`

**Done when**:
- [ ] Chave `['faq-page']`; `select` com `faq:faqs(id, question, answer, is_active)`
- [ ] **O erro SOBE** — e há caso asserindo isso, com o comentário explicando a divergência
      deliberada de `useProductFaqs`
- [ ] Entrada inativa chega `faq: null` e é pulada (caso próprio)
- [ ] Gate quick (store); store sobe em ≥ 6 testes

**Tests**: unit
**Gate**: quick (store)

---

### T11: `useJsonLd` — o dono único do `<script type="application/ld+json">`

**Where**: `apps/store/src/shared/lib/useJsonLd.ts` (novo) + `__tests__/useJsonLd.test.tsx`
**Depends on**: None
**Reuses**: `useCanonical` (molde literal)
**Requirement**: `FAQL-13`

**Done when**:
- [ ] Injeta no mount, **remove no unmount** (caso próprio para cada metade)
- [ ] Troca de conteúdo não acumula duas tags (caso próprio)
- [ ] `null`/`undefined` não injeta nada
- [ ] Gate quick (store); store sobe em ≥ 5 testes

**Tests**: unit
**Gate**: quick (store)

---

### T12: `useDocumentMeta` — `<title>` e `<meta name="description">`

**Where**: `apps/store/src/shared/lib/useDocumentMeta.ts` (novo) + teste
**Depends on**: None
**Reuses**: `useCanonical` (molde)
**Requirement**: `FAQL-15`

**Done when**:
- [ ] Grava título e descrição no mount; **restaura o valor anterior** no unmount (caso próprio)
- [ ] Cria a `<meta>` se ela não existir, e a remove só se foi ela que criou
- [ ] Gate quick (store); store sobe em ≥ 5 testes

**Tests**: unit
**Gate**: quick (store)

---

### T13: `useFaqSearch` — o filtro da loja

**Where**: `apps/store/src/entities/faq/model/useFaqSearch.ts` (novo) + teste
**Depends on**: T6
**Reuses**: `faqQuestionKey`
**Requirement**: `FAQL-04`, `FAQL-05`

**Done when**:
- [ ] Filtra por pergunta **e** resposta, sem acento e sem caixa (caso para cada metade)
- [ ] Termo só na resposta encontra a pergunta (borda da spec)
- [ ] Busca vazia devolve tudo; resultado zero é distinguível de lista vazia
- [ ] Assunto que ficou sem resultado some do agrupamento
- [ ] Devolve a contagem de casadas
- [ ] Gate quick (store); store sobe em ≥ 8 testes

**Tests**: unit
**Gate**: quick (store)

---

### T14: `FaqAnswer` — a resposta renderizada

**Where**: `apps/store/src/entities/faq/ui/FaqAnswer.tsx` (novo) + teste
**Depends on**: T5
**Reuses**: `faqAnswerBlocks`
**Requirement**: `FAQL-30`

**Done when**:
- [ ] Parágrafo vira `<p>`; lista vira `<ul>/<li>`
- [ ] **Nenhum `dangerouslySetInnerHTML`** — asserido por varredura do próprio arquivo
- [ ] Tokens da loja, sem `prose`
- [ ] Gate quick (store); store sobe em ≥ 5 testes

**Tests**: unit
**Gate**: quick (store)

---

### T15: `FaqQuestion` — o acordeão que não esconde do rastreador

**Where**: `apps/store/src/entities/faq/ui/FaqQuestion.tsx` (novo) + teste
**Depends on**: T14
**Reuses**: `TAP_ROW`
**Requirement**: `FAQL-03`, `FAQL-07`, `FAQL-11`

**Done when**:
- [ ] `<details>` + `<summary>`; a resposta está **no DOM com o acordeão fechado** — caso próprio,
      que é a AC inteira
- [ ] `id` = `p-<faqs.id>` no elemento, e `open` quando é o alvo da âncora
- [ ] Alvo de toque ≥44px (`TAP_ROW`)
- [ ] Um sensor prova que trocar por um acordeão que desmonta reprova
- [ ] Gate quick (store); store sobe em ≥ 7 testes

**Tests**: unit
**Gate**: quick (store)

---

### T16: `FaqSubjectNav` — uma fonte, dois desenhos

**Where**: `apps/store/src/entities/faq/ui/FaqSubjectNav.tsx` (novo) + teste
**Depends on**: T6
**Reuses**: `useOverflowAffordance`, `TAP_44`, `FAQ_PAGE_CATEGORIES`
**Requirement**: `FAQL-06`

**Done when**:
- [ ] Faixa até `md`, coluna a partir de `lg` — **asserção positiva nas duas metades** (`L-029`)
- [ ] Os itens **navegam** por âncora; nenhum estado de filtro aqui
- [ ] Contagem por assunto vem do dado
- [ ] Assunto sem pergunta não aparece
- [ ] Afordância de rolagem presente na faixa
- [ ] Gate quick (store); store sobe em ≥ 8 testes

**Tests**: unit
**Gate**: quick (store)

---

### T17: `FaqPage` — a página

**Where**: `apps/store/src/pages/FaqPage.tsx` (substituir a casca da T9) ·
`apps/store/src/pages/__tests__/FaqPage.test.tsx` (novo)
**Depends on**: T10, T11, T12, T13, T15, T16
**Reuses**: `PolicyContact`, `useCanonical`, `useJsonLd`, `useDocumentMeta`, `faqPageJsonLd`
**Requirement**: `FAQL-01`, `FAQL-05`, `FAQL-08`, `FAQL-09`, `FAQL-10`, `FAQL-14`, `FAQL-15`

**Done when**:
- [ ] `<h1>` literal, `<h2>` por assunto
- [ ] Os **três** estados, cada um com caso (carregando ≠ vazio ≠ falha)
- [ ] Busca sem resultado mostra o texto exato e o contato
- [ ] `PolicyContact` é montado **pela página** — o teste renderiza a página real, nunca uma árvore
      remontada no arquivo de teste
- [ ] JSON-LD presente no `<head>` depois do render, e ausente depois do unmount
- [ ] Nenhum emoji no texto da página (asserido)
- [ ] Gate quick (store); store sobe em ≥ 14 testes

**Tests**: unit (composição)
**Gate**: quick (store)

---

### T18: O link no rodapé

**Where**: `apps/store/src/widgets/footer/ui/Footer.tsx` (modificar) + `Footer.test.tsx` (estender)
**Depends on**: T9
**Reuses**: `FooterLink`, `FAQ_PATH`
**Requirement**: `FAQL-12`

**Done when**:
- [ ] "Perguntas frequentes" na coluna **Ajuda**, por `FAQ_PATH`
- [ ] Teste assere o rótulo **e** o destino
- [ ] Gate quick (store); store sobe em ≥ 1 teste

**Tests**: unit
**Gate**: quick (store)

---

### T19: `faqJsonLdParity.test.ts` — o que o Google lê é o que a cliente lê

**Where**: `apps/store/src/entities/faq/__tests__/faqJsonLdParity.test.ts` (novo)
**Depends on**: T17
**Reuses**: `shoppingParity.test.ts` (molde, inclusive o sensor embutido)
**Requirement**: `FAQL-14`

**Done when**:
- [ ] Compara, pergunta a pergunta, o `acceptedAnswer.text` com o texto **renderizado** pelo
      `FaqAnswer` — pelas duas serializações reais, não por uma reimplementação
- [ ] Cobre resposta com lista e resposta com múltiplos parágrafos
- [ ] **Sensor embutido**: um serializador ingênuo (ex.: `answer.replace(/\n/g,' ')`) reprova na mesma
      régua
- [ ] Gate quick (store); store sobe em ≥ 5 testes

**Tests**: guarda
**Gate**: quick (store)

---

### T20: `useAdminFaqPage` — a leitura e a escrita do painel

**Where**: `apps/backoffice/src/features/faq-page/api/useAdminFaqPage.ts` (novo) + teste
**Depends on**: T6
**Reuses**: `useAdminFaqs` (molde), `faqOverrideOf`, `faq_usage`
**Requirement**: `FAQL-19`, `FAQL-20`, `FAQL-21`, `FAQL-24`

**Done when**:
- [ ] Lê colocação + entrada + uso; expõe `adicionar`, `remover`, `reordenar`, `moverDeAssunto`,
      `salvarTextoProprio`
- [ ] `salvarTextoProprio` passa por `faqOverrideOf` — texto idêntico ao padrão grava `null` (caso
      próprio)
- [ ] Erro de leitura **sobe** (não vira lista vazia)
- [ ] Gate quick (painel); painel sobe em ≥ 10 testes

**Tests**: unit
**Gate**: quick (painel)

---

### T21: `FaqPageRow` — a linha

**Where**: `apps/backoffice/src/features/faq-page/ui/FaqPageRow.tsx` (novo) + teste
**Depends on**: T20
**Reuses**: tokens `--estrelinha-admin-*`, `Switch`, `Badge`
**Requirement**: `FAQL-22`, `FAQL-23`

**Done when**:
- [ ] Faixas de largura fixa (`flex-shrink: 0`) para selo, interruptor e ações — alinham entre linhas
- [ ] "em N produtos" quando N > 0; **nada** quando N = 0 (divergência declarada do board)
- [ ] Entrada inativa na biblioteca mostra `FORA DO AR` **e** a frase que explica o efeito — literal
      asserido (`L-036`)
- [ ] Gate quick (painel); painel sobe em ≥ 8 testes

**Tests**: unit
**Gate**: quick (painel)

---

### T22: `FaqPageGroupCard` — o grupo e o arraste

**Where**: `apps/backoffice/src/features/faq-page/ui/FaqPageGroupCard.tsx` (novo) + teste
**Depends on**: T21
**Reuses**: o arraste nativo de `HomeSectionRow.tsx:159` e `CategoryTable.tsx:82` — **não `@dnd-kit`**
**Requirement**: `FAQL-20`

**Done when**:
- [ ] `draggable` + `dataTransfer`, no mesmo formato das duas listas existentes
- [ ] Soltar reordena e chama `reordenar` com a ordem nova (caso próprio)
- [ ] Arrastar para outro grupo chama `moverDeAssunto`
- [ ] Colapsa/expande; contagem no cabeçalho
- [ ] Gate quick (painel); painel sobe em ≥ 8 testes

**Tests**: unit
**Gate**: quick (painel)

---

### T23: `AddQuestionDialog` — reusar antes de criar

**Where**: `apps/backoffice/src/features/faq-page/ui/AddQuestionDialog.tsx` (novo) + teste
**Depends on**: T20
**Reuses**: `useAdminFaqs`, `faqQuestionKey`, `faqRefusal`
**Requirement**: `FAQL-18`

**Done when**:
- [ ] Duas abas: **Da biblioteca** (busca, seleção múltipla, "em N produtos" por linha) e **Escrever
      uma nova**
- [ ] Pergunta nova duplicada é **recusada com motivo nomeando a entrada existente**, antes da
      gravação — o teste prova pela **ausência de chamada** ao insert, não pelo toast
- [ ] Escolher assunto é parte da mesma ação
- [ ] Gate quick (painel); painel sobe em ≥ 10 testes

**Tests**: unit
**Gate**: quick (painel)

---

### T24: `AdminStoreFaqPage` — a tela

**Where**: `apps/backoffice/src/pages/admin/AdminStoreFaqPage.tsx` (novo) · rota em `App.tsx` ·
`AdminStoreFaqPage.test.tsx` (novo)
**Depends on**: T21, T22, T23
**Reuses**: `PageHeader`, `EmptyState`, `TableSkeleton`
**Requirement**: `FAQL-19`..`FAQL-24`

**Done when**:
- [ ] Rota `/admin/perguntas-frequentes`
- [ ] Os três estados (carregando / vazio / falha de leitura), cada um com caso
- [ ] "Ver na loja" abre `FAQ_PATH` em nova aba
- [ ] O aviso "a resposta é a mesma nos dois lugares" com o literal asserido
- [ ] A página **monta** o diálogo e os grupos — teste da página real, não árvore remontada
- [ ] Gate quick (painel); painel sobe em ≥ 12 testes

**Tests**: unit (composição)
**Gate**: quick (painel)

---

### T25: Sidebar — o item novo e o rename

**Where**: `apps/backoffice/src/widgets/admin-layout/model/navItems.ts` (modificar) · `App.tsx`
(ordem) · `navItems.test.ts` (estender)
**Depends on**: T24
**Reuses**: `navGroups`
**Requirement**: `FAQL-25`

**Done when**:
- [ ] "Página de perguntas" no grupo **Loja**, depois de Menu da loja
- [ ] O item de Catálogo renomeado para **"Biblioteca de perguntas"** (rota inalterada)
- [ ] A ordem das rotas do `App.tsx` acompanha `navGroups` — `navItems.test.ts` lê o arquivo do disco
- [ ] `navCollapse.test.ts` continua passando (a lista de colapsáveis sai de `navGroups`)
- [ ] Gate quick (painel); painel sobe em ≥ 2 testes

**Tests**: unit
**Gate**: quick (painel)

---

### T26: `faqPageSingleOwner.test.ts`

**Where**: `apps/store/src/shared/lib/__tests__/faqPageSingleOwner.test.ts` (novo)
**Depends on**: T10, T20
**Reuses**: `menuSurfaceSingleOwner.test.ts` (molde), `freeShippingSingleOwner.test.ts` (o removedor
de comentário com CRLF/LF e o glob de dois asteriscos)
**Requirement**: `FAQL-33`

**Done when**:
- [ ] Escopo varre `apps/**` **e** `supabase/functions/**` (`L-035`)
- [ ] Allowlist de **dois** arquivos, escrita literalmente
- [ ] **Âncora dupla**: arquivos lidos **e** ocorrências encontradas
- [ ] Sensores: CRLF, LF, o glob de dois asteriscos, e uma leitura injetada fora do allowlist
- [ ] Gate quick (store); store sobe em ≥ 6 testes

**Tests**: guarda
**Gate**: quick (store)

---

### T27: `faqCorpusUnico.test.ts`

**Where**: `apps/store/src/shared/lib/__tests__/faqCorpusUnico.test.ts` (novo)
**Depends on**: T26
**Reuses**: `donoUnicoDoGuia.test.ts` (a régua que procura **declaração**, nunca menção)
**Requirement**: `FAQL-32`

**Done when**:
- [ ] Reprova `create table` de segunda tabela de pergunta/resposta em `supabase/migrations/**`
- [ ] Reprova constante de Q&A declarada em `apps/**`
- [ ] Passa com a menção (um comentário citando `faqs` não pode acusar) — caso inverso próprio
- [ ] Âncora dupla + sensor
- [ ] Gate quick (store); store sobe em ≥ 5 testes

**Tests**: guarda
**Gate**: quick (store)

---

### T28: Gate completo e baselines

**Where**: `CLAUDE.md` (raiz, tabela de baselines) · `apps/store/CLAUDE.md` · `apps/backoffice/CLAUDE.md`
**Depends on**: T27
**Reuses**: o ritual de medição do `CLAUDE.md`
**Requirement**: — (gate do projeto)

**Done when**:
- [ ] Suíte medida **um workspace por vez**, com exit code capturado fora de pipe
- [ ] `npx tsc --noEmit` nos dois apps: 0 · 0
- [ ] `pnpm lint` sem erro novo (baseline 27/6)
- [ ] `pnpm build` verde nos dois apps
- [ ] `git diff --name-only` confirma **zero** linha em `packages/core/src/payment/**`
- [ ] Baselines atualizadas com o número **medido**, nunca somado
- [ ] Os `CLAUDE.md` dos módulos tocados atualizados

**Tests**: none (é o gate)
**Gate**: build

---

### T29: Prova em navegador — 390×844 e 1440

**Where**: evidência no `validation.md`
**Depends on**: T28
**Reuses**: skill `playwright-cli`
**Requirement**: `FAQL-11`, `FAQL-06`, `FAQL-13`

**Done when**:
- [ ] 390×844: `document.body.scrollWidth === 390` (zero rolagem horizontal)
- [ ] 390×844: alvo de toque da linha da pergunta e do chip ≥44px, **medido**
- [ ] 1440: índice lateral presente e a coluna de leitura em ~720px
- [ ] O `application/ld+json` presente no DOM, com 26 entradas, e **ausente** depois de navegar para
      outra rota
- [ ] A resposta presente no DOM com o `<details>` fechado, medido no navegador
- [ ] Evidência anexada (medidas, não impressões)

**Tests**: none (jsdom não mede layout — esta é a prova)
**Gate**: build

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 migration (schema) + 1 guarda | ✅ coeso |
| T2 | o mesmo arquivo (dados) + extensão do guarda | ✅ coeso |
| T3 | 1 constante + 1 guarda | ✅ |
| T4 | verificação, 0 arquivo de produção | ✅ |
| T5 · T6 · T7 · T8 | 1 módulo puro cada | ✅ |
| T9 | 1 constante + classificação + casca de rota | ✅ coeso (ver nota da task) |
| T10..T13 | 1 hook cada | ✅ |
| T14..T16 | 1 componente cada | ✅ |
| T17 | 1 página | ✅ |
| T18 | 1 arquivo, 1 link | ✅ |
| T19 · T26 · T27 | 1 guarda cada | ✅ |
| T20..T23 | 1 hook / 1 componente cada | ✅ |
| T24 | 1 página | ✅ |
| T25 | 1 arquivo de navegação | ✅ |
| T28 · T29 | gate e prova | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | None | início da F1 | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T1 | T2→T3 (mesma fase, ordem respeita T1) | ✅ |
| T4 | T2, T3 | T3→T4 | ✅ |
| T5 | None | início da F2 | ✅ |
| T6 | T5 | T5→T6 | ✅ |
| T7 | T5, T6 | T6→T7 | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | None | início da F3 | ✅ |
| T10 | T6 (F2) | T9→T10, dep aponta para trás | ✅ |
| T11 | None | T10→T11 | ✅ |
| T12 | None | T11→T12 | ✅ |
| T13 | T6 (F2) | T12→T13 | ✅ |
| T14 | T5 (F2) | início da F4 | ✅ |
| T15 | T14 | T14→T15 | ✅ |
| T16 | T6 (F2) | T15→T16 | ✅ |
| T17 | T10..T16 | T16→T17 | ✅ |
| T18 | T9 (F3) | T17→T18 | ✅ |
| T19 | T17 | T18→T19 | ✅ |
| T20 | T6 (F2) | início da F5 | ✅ |
| T21 | T20 | T20→T21 | ✅ |
| T22 | T21 | T21→T22 | ✅ |
| T23 | T20 | T22→T23 | ✅ |
| T24 | T21, T22, T23 | T23→T24 | ✅ |
| T25 | T24 | T24→T25 | ✅ |
| T26 | T10, T20 | início da F6 | ✅ |
| T27 | T26 | T26→T27 | ✅ |
| T28 | T27 | T27→T28 | ✅ |
| T29 | T28 | T28→T29 | ✅ |

Nenhuma dependência aponta para fase posterior. ✅

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 · T2 | migration/schema | guarda que lê `.sql` | guarda | ✅ |
| T3 | regra pura + guarda | unit + guarda | unit + guarda | ✅ |
| T4 | verificação de schema | none (build gate) | none | ✅ |
| T5 · T6 · T7 | regra pura | unit | unit | ✅ |
| T8 · T19 · T26 · T27 | guarda de varredura | guarda | guarda | ✅ |
| T9 | rota | unit bidirecional | unit + guarda | ✅ |
| T10 · T13 · T20 | hook de dados | unit | unit | ✅ |
| T11 · T12 | hook de `<head>` | unit | unit | ✅ |
| T14 · T15 · T16 · T21 · T22 · T23 | componente | unit (RTL) | unit | ✅ |
| T17 · T24 | página/composição | unit (3 estados + fiação) | unit | ✅ |
| T18 · T25 | componente/navegação | unit | unit | ✅ |
| T28 | gate | none | none | ✅ |
| T29 | layout | none em jsdom — navegador | none | ✅ |

Nenhuma violação. ✅

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6

Fase 1:  T1 → T2 → T3 → T4                 (base: banco e limite)
Fase 2:  T5 → T6 → T7 → T8                 (regra pura)
Fase 3:  T9 → T10 → T11 → T12 → T13        (loja: endereço, dados, cabeça)
Fase 4:  T14 → T15 → T16 → T17 → T18 → T19 (loja: a página)
Fase 5:  T20 → T21 → T22 → T23 → T24 → T25 (painel)
Fase 6:  T26 → T27 → T28 → T29             (dono único e gate)
```

**29 tasks.** Empacotadas em lotes de ~7, dão ~4 lotes.

---

## Commits

Um commit atômico por task, **sem `push` entre T1 e T2** (a migration precisa estar completa antes de
qualquer push — o `Supabase Deploy` aplica pendente em todo push em `master`, e aplicada é imutável).
