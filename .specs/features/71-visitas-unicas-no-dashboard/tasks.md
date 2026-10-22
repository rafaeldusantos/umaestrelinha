# 71 · Visitas únicas no Dashboard — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. **If the skill cannot be
activated, STOP and tell the user — do not proceed without it.**

**Exceções do projeto, que sobrepõem a skill** (`CLAUDE.md` raiz, `BL-012`, memória do projeto):

- **Nenhum commit** — nem por task, nem no fim. **Nenhum `git stash`, nenhum push.** O usuário commita
  quando pedir. Por isso nenhuma task abaixo tem campo `Commit`.
- **Banco: só o Supabase LOCAL** (API 54441, Postgres 54442). Nunca `--linked`, nunca
  `supabase db reset`, nunca `supabase stop --all`. Migration local se aplica com
  `supabase migration up --local` (ou `psql` na 54442 com `ON_ERROR_STOP=1`). Se o banco não estiver
  de pé, `supabase start` (sem `--all`); se não subir, registrar e seguir com prova por interceptação
  (memória "Prova em navegador sem Docker").
- **Não rodar `python3 scripts/lessons.py list`** (apaga lições). Ler `.specs/LESSONS.md` direto.
  Lição nova vai como "Lições candidatas" no `validation.md` do verificador.
- **A última task não é a verificação**: o Verifier independente (autor ≠ verificador) roda depois
  da 32, com sensor de mutação.

**Antes da 01 — medir a ENTRADA com a árvore parada**, um workspace por vez, exit code fora de pipe
(a tabela do `CLAUDE.md` envelheceu em quase toda feature; a `70` está implementada sem commit). O
delta de cada task é contra esse número medido, nunca contra o escrito.

**Design**: `.specs/features/71-visitas-unicas-no-dashboard/design.md` · **Decisão**: `AD-055` (escrita na 30)
**Status**: Executado (tasks 01–32), **IMPLEMENTADA, sem commit**. Verificação independente em três rodadas (2026-10-22, `validation.md`): r1 **FAIL** (cobertura e um defeito raro, G4) e r2 **FAIL** (cobertura, G7/G8) — os dois consertados nas seções *Consertos da verificação r1/r2*, ao fim deste arquivo, com os mutantes reinjetados e mortos de novo na r3; r3 **FAIL** por **uma** lacuna de cobertura nova (**G9**: o `ate` que `store_clock` devolve, sem prova no produtor), **não consertada** no fecho — ver o handoff da `71` no `STATE.md`. Nenhum defeito de produto aberto.

**Assunções ainda `n — confirmar`** (spec, *Assumptions*), executadas pelo padrão escolhido e isoladas
para poderem ser desfeitas sem tocar no resto:

| Assunção | Padrão executado | Onde mora no plano |
| --- | --- | --- |
| Remover "Pedidos Hoje" e "Fat. Hoje" | saem (`VIS-35`) | **só** na task 27 — reverter a 27 devolve os dois cards |
| Gráfico e Fat. do Mês | ficam como estão; `BL-046`/`BL-047` | task 30 |
| Pedido marcado como pago à mão | não conta | régua de venda na 06 |
| Ticket sem venda | `—` + `sr-only` | 06 (`NULL`), 23 e 25 |
| Pedidos da Nuvemshop em Vendas | contam | régua de venda na 06 (sem filtro de `nuvemshop_id`) |
| Texto do Apêndice A | palavra por palavra, aguardando a Adri | 12; pré-condição do **deploy**, registrada na 30 |

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found:
> `CLAUDE.md` (raiz: guardas lidos do disco com âncora de contagem e sensores, régua nunca afrouxada,
> "tipo escrito à mão é afirmação" ⇒ probe contra o banco local, mobile 390 primeiro, prova em
> navegador para layout, gate do painel inclui a suíte da loja), `apps/backoffice/CLAUDE.md`,
> `apps/store/CLAUDE.md`, `packages/core/CLAUDE.md` (Deno por caminho com `.ts`), `supabase/CLAUDE.md`
> (`AD-004`, `_shared/http.ts`), os `vitest.config.ts` dos workspaces, e o design (seções 8, 9 e 10).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura em `core` (`time`, `visits`) | unit | 1:1 com as ACs que ela decide; toda fixture da spec; sensor inverso onde a spec pede (Cubot, `/bot/i`); fusos em `describe.each` com sensor de troca | `packages/core/src/{time,visits}/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Alcance Deno de `core` | guarda de fonte | arquivos-folha sem import; barril com `.ts`; `import type` incluso; CRLF | `packages/core/src/visits/__tests__/denoReach.test.ts` | idem |
| Migration SQL | guarda de fonte **+** probe | uma régua por comando (`L-033`), `mutar()` que lança, âncora (arquivo + 2 tabelas + 9 funções + bloco do `pg_cron`); probe em `begin … rollback` provando cada fixture numérica e cada recusa de papel | `apps/store/src/shared/lib/__tests__/visitasSchema.test.ts` · `.specs/features/71-visitas-unicas-no-dashboard/probes/*.sql` | store suite · `psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 -f <probe>` |
| Edge function (`handlers.ts`) | unit com deps injetadas | cada portão (0a–6) com caminho feliz, recusa e falha; log sem id/IP/UA; `Authorization` que lança; `index.ts` coberto por `wiringResolve` | `supabase/functions/{visit,_shared}/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Loja `shared/lib/visits` e `entities/cookie-consent` | unit | todo ramo de `VIS-12`, `16`, `18`–`22`, `24`, `25`; dublês de `navigator.locks` que **seguram** a trava; store de consentimento **real** | `apps/store/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Loja `app/` e `widgets/` | component (RTL) | o `VisitCounter` real no `App`-like com o agendador dublado; o caso de `AVS-02` invertido, não apagado | `apps/store/src/{app,widgets}/**/__tests__/*.test.tsx` | idem |
| Guardas de dono único / fonte | guarda de fonte | âncora dupla ou tripla, metade positiva, sensores CRLF/LF/glob (`BL-027`) e inverso; escopo `apps/*/src` (+ `apps/store/server` onde couber), nunca `dist`/`.server` | `apps/store/src/{shared/lib,pages,app}/__tests__/*.test.ts` · `apps/backoffice/src/**/__tests__` | store / backoffice suites |
| Painel `entities` (hooks) | unit (`renderHook` com `QueryClientProvider`) | `VIS-04` pelas chaves exatas; timer por duração do servidor com relógio falso (adiantado 2 h ⇒ uma chamada); canal único com re-render | `apps/backoffice/src/entities/**/api/*.test.ts` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Painel `widgets` e `pages` | component (RTL) | `VIS-01`–`11`, `38`–`41`, `44` pela **página real** e o widget real (só o client e os widgets alheios dublados); proxies de layout por token exato | `apps/backoffice/src/{widgets,pages,shared/ui}/**/*.test.tsx` | idem |
| Layout, gateway real, `navigator.locks`, abas reais | prova em navegador (Playwright) | 390×844 e depois 1440: `VIS-11` medido; ponta a ponta; o par com `webdriver` neutralizado e sem neutralização | `.specs/features/71-visitas-unicas-no-dashboard/prova-em-navegador.md` | ver task 29 |
| Documentação (`CLAUDE.md`, `BACKLOG.md`, `STATE.md`) | none | — | — | build gate |

## Gate Check Commands

> Generated from codebase — confirm before Execute. `LOG` é um arquivo no scratchpad da sessão.
> **Um workspace por vez**; `--testTimeout=20000` **sem** o `--` antes (o `--` engole a flag);
> exit code capturado **fora de pipe** (`pnpm test | tail` devolve o código do `tail`).

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | task de um workspace, só unit/component | o workspace tocado: `pnpm --filter @estrelinha/<ws> test [--testTimeout=20000] > "$LOG" 2>&1; echo "exit=$?"` |
| Full | task com probe, task que toca dois workspaces, e todo fim de fase | os workspaces tocados **e** a suíte da loja (os guardas dela varrem `apps/**`, `packages/**` e `supabase/functions/**`) + `npx tsc --noEmit -p apps/store/tsconfig.app.json` + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` + `npx tsc --noEmit -p apps/store/tsconfig.server.json`; com probe, o `psql … -f` da task com `ON_ERROR_STOP=1` |
| Build | task 32 (fecho) | os cinco workspaces um por vez (`core`, `functions`, `store`, `backoffice`, `catalog-import`) + os três `tsc` acima + `pnpm lint` + `pnpm build` + `git diff --name-only -- packages/core/src/payment` **vazio** |

---

## Execution Plan

Fases em sequência; tasks em ordem dentro da fase. **Não rodar duas suítes ao mesmo tempo na mesma
árvore** (timeout de 5 s em guarda de disco, medido na `34`, `46`, `48`).

### Fase 1 — Fundação em `core` (o fuso e os contratos)

```
01
02
03
01, 02, 03 ──→ 04
```

### Fase 2 — Banco (migration `20261021120000_71-visitas-unicas.sql`)

```
01 (F1) ──→ 05 ──→ 06 ──→ 07
```

### Fase 3 — O fuso com dono único e a function `visit`

```
01 (F1) ──→ 08
09
02, 03 (F1) + 09 ──→ 10
07 (F2) + 10 ──→ 11
```

### Fase 4 — Loja: a política e o marcador

```
12 ──→ 13 ──→ 14
03 (F1) ────────→ 14
```

### Fase 5 — Loja: decidir, enviar, consentir e montar

```
02 (F1) ──→ 15
03 (F1) ──→ 16
14 (F4) ──→ 17 ──→ 18
13, 14 (F4) + 15, 16, 17 ──→ 19 ──→ 20
04 (F1) ──────────────────────────→ 20
```

### Fase 6 — Painel: os dados e o bloco

```
21
07 (F2) ──→ 22
01 (F1) + 22 ──→ 23
24
22, 23, 24 ──→ 25
```

### Fase 7 — Painel: o Dashboard e o menu da conta

```
21, 25 (F6) ──→ 26 ──→ 27
04 (F1) + 20 (F5) ──→ 28
```

### Fase 8 — Fecho (prova em navegador e documentação)

```
11 (F3) + 20 (F5) + 27, 28 (F7) ──→ 29 ──→ 31 ──→ 32
27 (F7) ──→ 30 ──────────────────────────────────→ 32
```

### Lotes (máximo ~7 tasks, fases inteiras, em ordem de dependência)

| Lote | Fases | Tasks | Gate do lote |
| --- | --- | --- | --- |
| **L1** | 1 + 2 | 01–07 (7) | full: `core` + store (o guarda da migration mora lá) + probes da 07 verdes, migration aplicada no banco local |
| **L2** | 3 + 4 | 08–14 (7) | full: `core`, `functions`, store, backoffice + os três `tsc` + probe da function servida (11) |
| **L3** | 5 | 15–20 (6) | full: store + `packages/supabase` exercido pela suíte da loja + `tsc` da loja e do servidor |
| **L4** | 6 | 21–25 (5) | full: backoffice **e** store + `tsc` do painel |
| **L5** | 7 + 8 | 26–32 (7) | build (task 32) |

---

## Task Breakdown

### 01-dono-do-fuso-em-core

**What**: `packages/core/src/time/` com `STORE_TIME_ZONE` (folha, sem import), `formatStoreHour(iso)` ⇒ `"15h32"` e `formatDayMonth('AAAA-MM-DD')` ⇒ `"21/10"` por corte de texto (nunca `new Date`), e o subpath `"./time"`.
**Where**: `packages/core/src/time/zone.ts`, `time/format.ts`, `time/index.ts` (barril com `.ts`), `time/__tests__/format.test.ts`, `packages/core/package.json` (`exports`)
**Depends on**: —
**Reuses**: `core/orders/situation.ts:141` (a forma atual do `Intl.DateTimeFormat` com o fuso)
**Requirement**: VIS-34 (dono TS do fuso), VIS-10/38/40 (a hora escrita `HHhMM`), VIS-09 (o dia sem `new Date`)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] `formatStoreHour('2026-10-21T18:32:00Z') === '15h32'`, `hourCycle` `h23` (`'2026-10-21T03:05:00Z'` ⇒ `'00h05'`)
- [x] `formatDayMonth('2026-10-21') === '21/10'`; o arquivo roda num `describe.each` de fusos (`UTC`, `America/Sao_Paulo`, `Asia/Tokyo`) trocando `process.env.TZ` em `beforeAll`, **com o sensor** de que a troca pegou (`new Date(0).getTimezoneOffset()` difere entre os ramos); um `formatDayMonth` mutante que passe por `new Date('AAAA-MM-DD')` reprova no ramo de fuso negativo
- [x] `zone.ts` sem nenhum `import`; `import { STORE_TIME_ZONE } from '@estrelinha/core/time'` resolve no `tsc` dos dois apps
- [x] Quick gate (`core`) verde; contagem = entrada + casos novos, sem queda

**Tests**: unit · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22, lote L1). `core/time/{zone,format,index}.ts` + subpaths `"./time"` e `"./visits"` no `package.json`. 15 casos em `time/__tests__/format.test.ts`. O sensor de mutação achou um buraco no próprio teste: o formatador da hora é montado no carregamento do módulo, então importá-lo uma vez no topo congelava o fuso da máquina e o mutante "sem `timeZone`" sobrevivia aos três ramos — o módulo passou a ser **reimportado por ramo** (`vi.resetModules()`), e o mutante morre em 6 casos. `hour12: false` no lugar de `hourCycle: 'h23'` sobrevive como **mutante equivalente** (em pt-BR o ICU já resolve `h23`). `tsc` dos dois apps provado com um arquivo-sonda temporário que importava `@estrelinha/core/time` (e um par com erro de tipo, para provar que a sonda era compilada); a sonda foi apagada.

---

### 02-assinaturas-de-robo

**What**: `packages/core/src/visits/bots.ts` com `BOT_SIGNATURES` (as 20 da spec, por extenso) e `isBotUserAgent(ua)` por substring sem diferenciar maiúsculas — nunca `/bot/i`.
**Where**: `packages/core/src/visits/bots.ts`, `visits/__tests__/bots.test.ts`
**Depends on**: —
**Reuses**: forma de folha sem import de `core/shipping/pickup.ts` e `core/analytics/host.ts`
**Requirement**: VIS-23

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] Âncora: `BOT_SIGNATURES.length === 20`, e cada assinatura tem uma fixture de user agent real que a casa
- [x] Os cinco inversos (Safari de iPhone, Chrome de Android, navegador interno do Instagram, do WhatsApp, `CUBOT_X30`) **não** são robô; `null`/`undefined`/`''` não são robô
- [x] Sensor: um classificador ingênuo `/bot/i` aplicado à mesma tabela **reprova** (pega o Cubot)
- [x] `bots.ts` sem nenhum `import`
- [x] Quick gate (`core`) verde

**Tests**: unit · **Gate**: quick

**Status**: ✅ Concluída. `visits/bots.ts` (20 assinaturas, substring sem diferenciar maiúsculas) + 30 casos. Mutantes mortos por asserção: `/bot/i` (pega o Cubot) e a lista com 19.

---

### 03-contrato-do-corpo-da-visita

**What**: `packages/core/src/visits/visitor.ts` com `isVisitorId` (UUID v4, sem diferenciar maiúsculas), `visitBody(id)` (o construtor que a loja chama) e `visitBodyRefusal(body): string | null` (`'json'`, `'chave'`, `'id'` — string, porque `strictNullChecks` é `false`).
**Where**: `packages/core/src/visits/visitor.ts`, `visits/__tests__/visitor.test.ts`
**Depends on**: —
**Reuses**: `menuTargetRefusal`/`reservedSlugRefusal` (forma do veredito `string | null`)
**Requirement**: VIS-12 (formato do id), VIS-13 (corpo exato), VIS-21

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] `Object.keys(visitBody(id))` **igual** a `['id']` (igualdade, não "contém")
- [x] Recusa por caso: não-objeto, `null`, array, `id` ausente, `id` não-v4 (v1, v7, sem hífens, com espaço), **cada** chave extra (`force`, `day`, `dia`, `ate`, `debug`); aceita v4 em maiúsculas
- [x] `visitor.ts` sem nenhum `import`
- [x] Quick gate (`core`) verde

**Tests**: unit · **Gate**: quick

**Status**: ✅ Concluída. `visits/visitor.ts` + 27 casos. Corpo que não é objeto ⇒ `'json'` (o JSON ilegível é decidido pelo handler da 10, que só chega aqui com o valor lido). Mutantes mortos: chave extra aceita, v1/v7 aceitos, regex sem âncora inicial.

---

### 04-parametro-nao-contar-e-barril

**What**: `packages/core/src/visits/optOut.ts` (`OPT_OUT_PARAM = 'nao-contar'`, `optOutHref(origin, on)`, `readOptOutParam(search): 'on' | 'off' | null`), o barril `visits/index.ts` com `.ts` explícito, o subpath `"./visits"`, e o guarda de alcance do Deno.
**Where**: `packages/core/src/visits/optOut.ts`, `visits/index.ts`, `visits/__tests__/optOut.test.ts`, `visits/__tests__/denoReach.test.ts`, `packages/core/package.json`
**Depends on**: 01, 02, 03
**Reuses**: `packages/core/src/checkout/__tests__/denoReach.test.ts` (molde do guarda)
**Requirement**: VIS-42 (dono do parâmetro), VIS-23 (alcance Deno da lista)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] `optOutHref('https://loja', true) === 'https://loja/?nao-contar=1'` e `false` ⇒ `=0`; `readOptOutParam` lê `?nao-contar=1`, `=0`, ausente, outro valor e o parâmetro no meio de outros (`?a=1&nao-contar=1&b=2`)
- [x] `denoReach`: `bots.ts`, `visitor.ts`, `optOut.ts` e `time/zone.ts` sem import nenhum; `visits/index.ts` sem especificador relativo sem `.ts`, **`import type` incluso**; âncora = exatamente os arquivos nomeados; sensores de `import type` sem extensão e de CRLF; nenhum comentário escreve por extenso a forma proibida (o bundler do `supabase start` lê comentário)
- [x] Quick gate (`core`) verde

**Tests**: unit + guarda de fonte · **Gate**: quick

**Status**: ✅ Concluída. `visits/optOut.ts`, o barril `visits/index.ts` (com `.ts`) e `denoReach.test.ts` (âncora: as 4 folhas + o barril com exatamente 3 especificadores; sensores de `import type` sem extensão no barril e numa folha, pacote no barril, CRLF e prosa em comentário). Mutantes mortos: o barril sem `.ts`, e "outro valor desliga". **Gate da Fase 1**: core **3414/133 → 3507/138** (+93/+5), exit 0.

---

### 05-migration-gravacao

**What**: a primeira metade da migration: `store_time_zone()` (o literal, uma vez), `store_day`, `store_day_start`, `store_week_start` (sobre a data local), `store_production_host()`, as tabelas `store_visits (day, visitor_id)` e `store_visit_counter` (singleton, sem semente), `prune_store_visits` (**invoker**), `record_store_visit` e `store_clock` (definer, `grant … to service_role` explícito), conforme C1–C5 do design — e o guarda `visitasSchema.test.ts` com as réguas desta metade.
**Where**: `supabase/migrations/20261021120000_71-visitas-unicas.sql` (novo), `apps/store/src/shared/lib/__tests__/visitasSchema.test.ts` (novo)
**Depends on**: 01
**Reuses**: `minhaContaSchema.test.ts` (molde, `mutar()` que lança); `20260913130000_49-checkout-sem-conta.sql:112-115` (grant explícito ao `service_role`)
**Requirement**: VIS-03, VIS-14, VIS-27 (teto 5.000), VIS-28, VIS-30, VIS-34, VIS-44 (`capped_day`)

**Tools**: MCP NONE · Skill `supabase-postgres-best-practices`

**Done when**:
- [x] Antes de criar o arquivo: o maior prefixo de `supabase/migrations/` é conferido (`20261021120000` precisa ser maior; lição da `48`/`49`)
- [x] Toda referência interna qualificada por `public.`; `ate`/`agora` com `::bigint`; nenhuma escrita de dado fora de corpo de função; as funções de dia **sem** `set search_path`, com o comentário do porquê (inlining)
- [x] `visitasSchema.test.ts` reprova, **uma régua por comando**: coluna além das duas / sem PK em `store_visits`; coluna fora das quatro em `store_visit_counter`; RLS ausente, `revoke all` de `public/anon/authenticated` ausente ou `create policy` em qualquer das duas; `prune_store_visits` `security definer`, sem `revoke` dos três ou com qualquer `grant`; `record_store_visit`/`store_clock` sem `security definer`, sem `search_path = ''`, sem `revoke` dos três, **sem `grant execute … to service_role`** (asserção positiva) ou com `grant` a outro papel; as cinco funções de régua com `grant`; chamada sem `public.` nos corpos; o literal do fuso fora de `store_time_zone`, repetido, ou diferente de `STORE_TIME_ZONE` (**importado** de `core/time`); `current_date`; `now()::date`; `date_trunc('week'`; offset `-03`; `5000` ausente; `- 7` ausente da poda; `insert`/`update`/`delete` fora de corpo de função
- [x] Âncora desta metade: arquivo lido + 2 tabelas + 8 funções encontradas por nome; `mutar()` **lança** sem alvo; um mutante por asserção, inclusive o `grant … to service_role` apagado e um `public.` tirado
- [x] Full gate: store (contagem = entrada + casos novos); o guarda **não** afrouxa nenhuma régua de outro guarda de schema

**Tests**: guarda de fonte (o probe vem na 07, quando a migration está inteira) · **Gate**: full

**Status**: ✅ Concluída. Prefixo conferido antes de criar: o maior era `20261020120000`. Migration `supabase/migrations/20261021120000_71-visitas-unicas.sql` (seções 1–5) e `apps/store/src/shared/lib/__tests__/visitasSchema.test.ts`. Duas réguas do guarda nasceram erradas e foram consertadas antes de valer: o `replace` com texto de troca contendo `$$` virava `$` (corpos SQL têm `$$`) — `mutar()` passou a substituir por **função** —, e `>= 5000` casava o prefixo de `50000` (`\b` no fim). Sensores cobrem: coluna a mais, PK, RLS, revoke de `anon`, policy, grant a `anon`, revoke de régua, os dois literais do fuso, fuso diferente do dono, `current_date`/`now()::date`/`date_trunc('week'`/`-03`, `security definer` na poda, `- 7`, `grant … to service_role` apagado, `security definer`/`search_path` das duas RPCs, `::bigint`, `public.` tirado de chamada e de tabela, 5000, semente do contador. **Sem sensor dedicado** (asserção positiva só): a leitura de `store_production_host`, `store_clock` sem escrita, a ordem poda → gravação.

---

### 06-migration-leitura-e-poda-agendada

**What**: a segunda metade: `store_movement(p_agora)` (definer, `has_role(auth.uid(), 'admin')` no corpo, `grant` só a `authenticated`, visitas por `count(distinct)` por período, vendas pela lista positiva com `store_day_start` sobre `paid_at` (D5), faturamento com `coalesce(…, 0)`, ticket `round(…, 2)` ou `NULL`, poda com `least(v_hoje, store_day(now()))`, os campos `*_dia`, `production_host`, `lido_em`, `expira_em`, `teto_dia`) e o bloco `do $$` que agenda `prune-store-visits` **só se** `pg_cron` já existir.
**Where**: `supabase/migrations/20261021120000_71-visitas-unicas.sql`, `apps/store/src/shared/lib/__tests__/visitasSchema.test.ts`
**Depends on**: 05
**Reuses**: `20260718235214_payment_approval_rpc.sql:86-108` (agendamento), migration da `34` (`CLI-04`, critério de dinheiro)
**Requirement**: VIS-15, VIS-30, VIS-31, VIS-32, VIS-33, VIS-34, VIS-44 (`teto_dia`)

**Tools**: MCP NONE · Skill `supabase-postgres-best-practices`

**Done when**:
- [x] O guarda ganha: `store_movement` sem `has_role(auth.uid(), 'admin')` no corpo (aceita `public.has_role`), com `execute` a `anon`, sem `grant … to authenticated`; `sum(` sem `coalesce(`; `paid_at::date`; `store_day_start` ausente do predicado de `orders`; o agendamento fora de `if exists (… pg_extension … 'pg_cron')`, com `create extension`, ou com corpo que não seja a chamada a `public.prune_store_visits`
- [x] **Sem filtro de `nuvemshop_id`** (assunção `n`, padrão "contam"), com o comentário apontando a assunção
- [x] Âncora final: arquivo + 2 tabelas + **9** funções + o bloco do `pg_cron`; um mutante por régua nova
- [x] Full gate: store verde

**Tests**: guarda de fonte · **Gate**: full

**Status**: ✅ Concluída. Seções 6 (`store_movement`) e 7 (o `do $$` do `pg_cron`). `SPEC_DEVIATION` D5 declarado no SQL e no guarda. Sem recorte de `nuvemshop_id`, com o comentário apontando a assunção pendente (o guarda assere a ausência). Âncora final: arquivo + 2 tabelas + **9** funções (e "exatamente nove `create or replace function`") + o bloco do `pg_cron`. **Gate**: `visitasSchema.test.ts` **137/137**; store **5350/299 → 5487/300** (+137/+1, exit 0, `--testTimeout=20000`).

---

### 07-probes-no-banco-local

**What**: provar a migration contra o Postgres local e só então aplicá-la. Os probes moram em `.specs/features/71-visitas-unicas-no-dashboard/probes/` (reproduzíveis pelo verificador) e rodam com `begin; \i <migration>; …; rollback;` — sem estado residual — antes de `supabase migration up --local`.
**Where**: `.specs/features/71-visitas-unicas-no-dashboard/probes/{dia,visitas,vendas,papeis,teto,concorrencia}.sql` (novos); banco local (54442)
**Depends on**: 06
**Reuses**: regras dos probes da seção 9 do design
**Requirement**: VIS-03, VIS-14, VIS-15, VIS-28, VIS-30, VIS-31, VIS-32, VIS-33, VIS-44

**Tools**: MCP NONE · Skill `supabase`

**Done when**:
- [x] Banco local de pé (`supabase start` **sem** `--all`, se preciso); nenhum comando com `--linked`, nenhum `db reset`
- [x] Cada probe começa provando contagem zero no período da fixture; fixturas de pedido com `order_number` explícito (`PROBE-…`); leitura como admin por `set local role authenticated` + `request.jwt.claims` com o id do admin **lido do banco**
- [x] `dia.sql`: `02:59:59.900Z` ⇒ 20/10; `03:00:00Z` ⇒ 21/10; domingo `2026-10-19T02:30:00Z` ⇒ 18/10, semana de 12/10 (VIS-03)
- [x] `visitas.sql`: seg/ter/qua ⇒ **2/1/2**; dom/seg ⇒ 1/1/1 (VIS-15); poda com `p_agora` injetado: nada com mais de 7 dias, os 8 dias ficam (VIS-30); `store_movement` com `p_agora` futuro não poda o presente
- [x] `vendas.sql`: fixturas (a)–(f) de VIS-31; 33,33 e 10,01; ticket `NULL` **e** faturamento `0` sem venda (VIS-32); >1.000 visitas e >1.000 pedidos pagos ⇒ contagens exatas; só escalares na resposta, `production_host` igual ao de `store_clock` (VIS-33)
- [x] `papeis.sql`: `anon` e `authenticated` não-admin recebem `42501` na tabela, em `record_store_visit`, `store_clock`, `prune_store_visits` e `store_movement`; `service_role` executa as duas primeiras (VIS-28, VIS-33)
- [x] `teto.sql`: 5.000 linhas num dia + uma chamada ⇒ `teto`, `capped_day` gravado, `teto_dia` na leitura (VIS-44)
- [x] Depois: `supabase migration up --local`; o job `prune-store-visits` existe em `cron.job`; `concorrencia.sql` (dois `psql` em paralelo, mesmo id) ⇒ 1 linha, as duas respostas `gravada`/`repetida`, com limpeza das linhas gravadas e de `store_visit_counter` ao estado lido antes (VIS-14); JSON de `record_store_visit` com `ate`/`agora` inteiros
- [x] Se um probe achar defeito **depois** de aplicada: corrigir o arquivo e reaplicar só localmente (`drop` dos objetos da `71` + remover a versão `20261021120000` de `supabase_migrations.schema_migrations`, por `psql`), registrando o porquê — a migration nunca foi ao hospedado (`AD-017` não se aplica ainda)
- [x] Saída de cada probe anotada na nota da task neste arquivo

**Tests**: probe (integração contra o banco local) · **Gate**: full

**Status**: ✅ Concluída (2026-10-22). Banco local já de pé (não precisou de `supabase start`); nenhum `--linked`, nenhum `db reset`. Probes em `probes/`: `_comum.sql` (aplica a migration **do zero** dentro da transação — derruba os objetos da 71 antes —, define `confere`/`movimento`/`recusado` em `pg_temp` e lê o admin do banco), `dia.sql` (9 ok), `visitas.sql` (17 ok), `vendas.sql` (15 ok), `papeis.sql` (32 ok, com o sensor de que `select 1` como `anon` não conta como recusa), `teto.sql` (10 ok) e `concorrencia.{sql,sh}`. Todos `exit 0` com `ON_ERROR_STOP=1`, em `begin … rollback`, **antes e depois** de aplicar.
  - `supabase migration up --local` aplicou só `20261021120000`. `cron.job` tem `prune-store-visits` (`15 3 * * *`, ` select public.prune_store_visits(public.store_day(now())) `). ACL medida: `record_store_visit`/`store_clock` = `{postgres, service_role}`, `store_movement` = `{postgres, authenticated}`, `prune_store_visits` = `{postgres}`.
  - `concorrencia.sh`: sessão A `{"desfecho": "gravada", "dia": "2026-10-22", "ate": 1792724400000, …}`, sessão B (começa 0,5 s depois, com A segurando a transação 2 s) `"repetida"`; **1 linha**; contador `ausente` antes e depois da limpeza.
  - PostgREST (54441) com a chave publicável: `GET store_visits`, `GET store_visit_counter` e `POST rpc/` das quatro RPCs ⇒ **401 `42501`** nas seis. Com a chave de serviço local: `record_store_visit` ⇒ `gravada` e depois `repetida` (200), `store_clock` ⇒ `{dia, ate, agora, production_host: "umaestrelinha.com.br"}`; as linhas e o contador foram apagados depois (estado lido antes: vazio).
  - **Sensor de mutação sobre os probes** (migration mutada numa cópia, probes apontando para ela): `count(*)` na semana, `coalesce` tirado, recorte de cancelado tirado, dia por UTC, poda `- 6`, teto 50000, `round` tirado e poda sem `least` — **todos mortos**. O `grant … to service_role` apagado **sobrevivia** com a migration já aplicada (o `grant` antigo continuava no banco); por isso o `_comum.sql` passou a derrubar os objetos antes de aplicar, e o mutante passou a morrer (`permission denied for function store_clock`).
  - Dois defeitos **do probe**, não da migration, achados ao rodar: um `lateral` sem referência à série fazia o Postgres avaliar a gravação UMA vez e repetir o resultado (5.000 "gravadas", 1 linha), e `recusado()` devolvia `null` quando não havia erro. Os dois consertados; nenhuma correção na migration foi necessária depois de aplicada.

---

### 08-fuso-com-dono-unico

**What**: as quatro declarações do fuso em `apps/` e `packages/` passam a importar `STORE_TIME_ZONE` (uma linha cada), e nasce o guarda `fusoComDonoUnico.test.ts`, **sem allowlist**. A do importador (`tools/catalog-import/src/csv/parse.ts`) fica fora do escopo, declarada no cabeçalho do guarda.
**Where**: `packages/core/src/orders/situation.ts` (import com `.ts`, exigido por `orders/__tests__/purity.test.ts`), `apps/backoffice/src/features/google-analytics/model/copy.ts`, `apps/backoffice/src/features/google-analytics/ui/AnalyticsSecretField.tsx`, `apps/store/src/entities/order/lib/orderMeta.ts`, `apps/store/src/shared/lib/__tests__/fusoComDonoUnico.test.ts` (novo)
**Depends on**: 01
**Reuses**: `orderAccessSingleOwner.test.ts` (escopo `apps/*/src`, sem `dist`)
**Requirement**: VIS-34

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] O guarda varre `apps/*/src`, `apps/store/server`, `packages/*/src` e `supabase/functions` (só produção), escritos **literalmente**, e reprova o literal fora de `core/time/zone.ts`
- [x] Âncora: arquivos lidos + o dono encontrado + os quatro consumidores **importando** `STORE_TIME_ZONE`; sensores CRLF/LF/glob de dois asteriscos; a escrita antiga reinjetada num dos quatro reprova
- [x] Comportamento dos quatro idêntico (as suítes deles seguem verdes sem asserção tocada)
- [x] Full gate: `core`, store, backoffice + `tsc` dos dois apps

**Tests**: guarda de fonte (+ suítes existentes dos quatro consumidores) · **Gate**: full

**Status**: ✅ Concluída (2026-10-22). Os quatro consumidores importam `STORE_TIME_ZONE` (uma linha cada; `situation.ts` por `../time/zone.ts`, os três de `apps/` por `@estrelinha/core/time`). `apps/store/src/shared/lib/__tests__/fusoComDonoUnico.test.ts` (12 casos): escopo literal `apps/store/src`, `apps/store/server`, `apps/backoffice/src`, `packages/{core,ui,supabase,auth}/src`, `supabase/functions`, só produção (sem `__tests__`, `*.test.*`, `dist`, `.server`); âncora ≥ 900 arquivos + um arquivo de cada raiz + o dono escrevendo o nome + os quatro importando **e usando** o dono; sensores: a escrita antiga reinjetada (em memória) em `copy.ts`, aspas duplas e template, CRLF/LF, glob de dois asteriscos, e o par de "importar o dono" (sem uso, nome local, import sem `.ts`). O próprio guarda monta o nome por `join` e nunca o escreve inteiro. Viu reprovar antes (6 falhas: os 4 consumidores + a varredura) e passar depois. **Injeção real**: o literal de volta em `orderMeta.ts` e em `situation.ts` ⇒ 3 falhas cada, restaurado por SHA-256. Suítes dos consumidores intocadas e verdes: `core/orders` 117, `google-analytics` do painel 55, `entities/order` da loja 184.

---

### 09-limitador-compartilhado

**What**: `createRateLimiter`, `RateLimiter` e `clientIp` **movidos** sem mudança de corpo de `checkout/handlers.ts` para `supabase/functions/_shared/rateLimit.ts`; a `checkout` reexporta os três.
**Where**: `supabase/functions/_shared/rateLimit.ts` (novo), `supabase/functions/checkout/handlers.ts`, `supabase/functions/_shared/__tests__/rateLimit.test.ts` (novo)
**Depends on**: —
**Reuses**: `http.test.ts` (molde de "reexporta a mesma referência" e "segunda declaração reprova")
**Requirement**: VIS-27

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] `expect(checkout.createRateLimiter).toBe(shared.createRateLimiter)` (e `clientIp`) — `toBe`, nunca `toEqual`
- [x] Uma segunda **declaração** de `createRateLimiter` em qualquer function reprova; âncora: functions lidas + o dono encontrado; sensor do comentário (a régua procura declaração, não menção)
- [x] Os casos existentes da `checkout` seguem verdes sem asserção tocada; import em `_shared` relativo com `.ts`
- [x] Quick gate (`functions`) verde

**Tests**: unit + guarda de fonte · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). `supabase/functions/_shared/rateLimit.ts` (sem import nenhum) com `RateLimiter`, `createRateLimiter` e `clientIp` movidos **sem mudança de corpo** (só o comentário do `createRateLimiter` passou a citar as duas functions); `checkout/handlers.ts` importa `clientIp`/`RateLimiter` do dono e reexporta os três (`export { … } from '../_shared/rateLimit.ts'`). `_shared/__tests__/rateLimit.test.ts` (7 casos): `toBe` nas duas funções, o tipo reexportado do dono com `.ts`, âncora (functions lidas + dono + `checkout/handlers.ts`), régua de DECLARAÇÃO (função, `const`, `interface`, `type`) e sensores — import, reexport, chamada e comentário (LF/CRLF) não são declaração. Viu reprovar (módulo inexistente) e passar. Functions 890/19 → 897/20, exit 0, com os casos da `checkout` sem asserção tocada.

---

### 10-handlers-da-visita

**What**: `supabase/functions/visit/handlers.ts` com `route(deps, req)`, `createClockCache()` e os portões 0a–6 na ordem do design (C10), dependências injetadas (`supabase`, `now`, `limiter`, `clock`, `log`).
**Where**: `supabase/functions/visit/handlers.ts` (novo), `supabase/functions/visit/__tests__/handlers.test.ts` (novo)
**Depends on**: 02, 03, 09
**Reuses**: `_shared/http.ts` (`corsHeaders`, `json`, `preflight`), `_shared/testing/fakes.ts` (`rpcs`, `rpcByFn`), `core/analytics/host.ts` (`trafficType`, por caminho com `.ts`), `melhor-envio/handlers.ts` (molde de corpo hostil)
**Requirement**: VIS-14, VIS-21, VIS-23, VIS-27, VIS-29

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] `OPTIONS` ⇒ preflight sem log; `GET` ⇒ `405` + log `inválido`
- [x] Limite: 31ª chamada do mesmo IP no minuto ⇒ `429 { dia, ate, agora }` **sem** `record_store_visit`; **sem IP, a 31ª ⇒ `200`**; `store_clock` falhando no `429` ⇒ `429` sem relógio e log `limite`
- [x] Corpo: um caso por corpo hostil (JSON inválido, id não-v4, cada chave extra) ⇒ `400`, `inválido`, RPC de gravação **não** chamada; v4 em maiúsculas aceito
- [x] `store_clock` falha ⇒ `500`, `erro`; UA de robô ⇒ `200` `robô` sem gravar; sem `Origin`, `Origin` ilegível ou origem de homologação ⇒ `200` `interno` sem gravar, com o `production_host` vindo do dublê de `store_clock` respondendo por nome
- [x] Gravação: `rpcs` registra `record_store_visit` com chaves **exatas** `['p_id']`; `gravada`/`repetida`/`teto` repassados com `{ dia, ate, agora }`; falha ⇒ `500`, `erro`
- [x] Uma linha de log por resposta (exceto `OPTIONS`), com um dos 8 desfechos; nenhuma linha contém o id, o IP ou o UA usados no caso; `headers.get('authorization')` **lança** e nada quebra; o `ClockCache` injetado não vaza entre casos
- [x] Quick gate (`functions`) verde

**Tests**: unit com deps injetadas · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). `supabase/functions/visit/handlers.ts` com `route`, `createClockCache`, `Clock`, `ClockCache`, `Deps`, `Desfecho`; portões 0a–6 na ordem de C10; imports de `core` por caminho com `.ts` (`visits/bots.ts`, `visits/visitor.ts`, `analytics/host.ts` — as três são folhas). `visit/__tests__/handlers.test.ts` (53 casos), **toda** requisição montada com `headers.get('authorization')` que lança (com sensor de que o Proxy intercepta). Decisão de forma, sem desvio de AC: no `429` servido do CACHE o `agora` é o instante desta resposta (`deps.now()`), não o do cache — com o `agora` velho o navegador mediria a duração até a meia-noite a partir de um instante antigo e seguraria o marcador além da virada; vindo de `store_clock`, sai o `agora` do banco. **Sensor de mutação**: 15 mutantes no arquivo real (balde `'sem-ip'`, ler `Authorization`, `agora` do cache, sem filtro de robô, `p_agora` na gravação, origem ausente liberando, host fixo no código, id/IP no log, sem log no 405, log no `OPTIONS`, corpo antes do teto, falha do relógio no 429 virando 500, desfecho desconhecido repassado, cache sem expiração, prazo em texto aceito) — **15 mortos por asserção, 0 por compilação**, restauração conferida por SHA-256.

---

### 11-fiacao-da-function-visit

**What**: `supabase/functions/visit/index.ts` só com wiring (env, client service-role, `createRateLimiter(30, 60_000, now)` de `../_shared/rateLimit.ts`, `createClockCache()`, `Deno.serve`) e `[functions.visit] verify_jwt = false` no `config.toml`, com a justificativa escrita; prova do caminho real contra o banco local.
**Where**: `supabase/functions/visit/index.ts` (novo), `supabase/config.toml`
**Depends on**: 07, 10
**Reuses**: `checkout/index.ts` (forma do wiring)
**Requirement**: VIS-29, VIS-13 (gateway aceita só `apikey`), VIS-14, VIS-23

**Tools**: MCP NONE · Skill `supabase`

**Done when**:
- [x] `wiringResolve.test.ts` alcança a function nova pela âncora derivada do disco (sem número cravado), e a chamada a `route` resolve
- [x] Probe com `supabase functions serve` contra o banco local, com `store_settings.analytics.production_host` **semeado só no banco local** e **restaurado** ao valor lido antes ao fim: `POST` só com `apikey` + `Origin` casando ⇒ `gravada`, segunda ⇒ `repetida`; UA `HeadlessChrome` ⇒ `robô`; sem `Origin` ⇒ `interno`; nenhuma linha gravada nos três últimos (contagem conferida por `psql`); as linhas da prova apagadas e `store_visit_counter` restaurado
- [x] Se o edge runtime responder `503` nomeando arquivo que existe: é bind-mount obsoleto — `supabase stop` (**sem** `--all`) + `supabase start`
- [x] Full gate: `functions` + store (os guardas `chaveDeServidorForaDoNavegador`, `numeroDoPedido…` e afins varrem `supabase/functions`)

**Tests**: guarda de fonte (`wiringResolve`) + probe · **Gate**: full

**Status**: ✅ Concluída (2026-10-22). `visit/index.ts` só wiring (env, client service-role, `createRateLimiter(30, 60_000, now)` de `../_shared/rateLimit.ts`, `createClockCache()`, log em `console.log(JSON.stringify(…))`, `Deno.serve`); `[functions.visit] verify_jwt = false` no `config.toml`, com a justificativa. `wiringResolve` alcança `visit/index.ts` pela âncora derivada (+2 casos); sensor: `createClockCach()` reinjetado ⇒ reprova nomeando o arquivo. `deno check --no-lock` de `visit/index.ts` e `checkout/index.ts` ⇒ exit 0. **Prova servida** (`supabase functions serve visit`, edge runtime local subiu sem `stop/start`): `probes/function-visit.sh` semeia `production_host = 'localhost'` só no banco local e restaura por `trap`: só `apikey` publicável + `Origin: http://localhost:8082` ⇒ `200 gravada` (1 linha), segunda ⇒ `repetida` (1 linha), `HeadlessChrome` ⇒ `robô`, sem `Origin` ⇒ `interno`, Origin `umaestrelinha-store-five.vercel.app` ⇒ `interno` (0 linhas nos três), `ate`/`agora` inteiros (`{"desfecho":"gravada","dia":"2026-10-22","ate":1792724400000,"agora":…}`); exit 0. Estado antes/depois idêntico: `production_host=umaestrelinha.com.br`, contador `ausente`, 0 linhas. Log servido: 5 linhas `{"fn":"visit","desfecho":…}`, nenhum UUID. Pelo gateway, também: `OPTIONS` 200, `GET` 405, corpo com chave extra 400. A function servida foi parada depois.

---

### 12-paragrafo-da-politica

**What**: o quarto parágrafo da seção "Medição de audiência" de `/politica-de-privacidade`, **palavra por palavra** do Apêndice A — escrito **antes** do módulo do contador, para que a invariante de `VIS-37` valha desde o primeiro arquivo.
**Where**: `apps/store/src/pages/PrivacyPolicyPage.tsx`, `apps/store/src/pages/__tests__/PrivacyPolicyPage.test.tsx`
**Depends on**: —
**Reuses**: o guarda de parágrafos existente (`PrivacyPolicyPage.test.tsx:285`)
**Requirement**: VIS-36

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] A seção tem **quatro** parágrafos; o teste passa de três para quatro e assere o **literal** do novo; a asserção dos três antigos continua ao lado, sem mudança
- [x] O texto não diz "anônimo" nem "nunca registramos"; `politicaComDonoUnico` e `copyInstitucional` seguem verdes
- [x] A aprovação da Adri fica registrada como pendência de **deploy** (vai para o handoff na 30)
- [x] Quick gate (store) verde

**Tests**: component · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). Quarto parágrafo na seção "Medição de audiência", palavra por palavra do Apêndice A. `PrivacyPolicyPage.test.tsx`: o caso dos três virou "exatamente quatro, na ordem" (os três da `61` + o do contador), com dois casos novos ao lado — os três antigos continuam os três primeiros sem mudança, e o do contador não diz "anônim" nem "nunca registr" e afirma os 8 dias e o IP. Viu reprovar (2 falhas) e passar; as réguas da `61` (o "envia" negado, a base legal sem "consentimento") seguem verdes com o parágrafo novo. `politicaComDonoUnico` e `copyInstitucional` verdes. **Aprovação da Adri: pendência de DEPLOY**, a registrar no handoff na task 30.

---

### 13-marcador-do-visitante

**What**: `apps/store/src/shared/lib/visits/visitor.ts` com `VISITOR_KEY`, `VisitorMarker`, `readMarker(): MarkerRead` (discriminante de string: `ausente`/`presente`/`indisponivel`), `markerAllowsCall`, `saveClock(ateServidor, agoraServidor)` (prazo local por **duração**, relendo o marcador e nunca restaurando `id`) e `resetVisitCounterForTests`; e o guarda `politicaDoContador.test.ts`.
**Where**: `apps/store/src/shared/lib/visits/visitor.ts` (novo), `apps/store/src/shared/lib/visits/__tests__/marker.test.ts` (novo), `apps/store/src/pages/__tests__/politicaDoContador.test.ts` (novo)
**Depends on**: 12
**Reuses**: `resetAnalyticsForTests` (`shared/lib/analytics/index.ts:264`)
**Requirement**: VIS-16, VIS-12 (forma `{ v: 1, id, ate, em }`), VIS-37

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] `em ≤ agora < ate` ⇒ não chama; `agora ≥ ate` ⇒ chama; `agora < em` (relógio voltou) ⇒ chama; marcador ausente ⇒ chama
- [x] `saveClock` grava `ate = Date.now() + (ateServidor − agoraServidor)` e `em = Date.now()`; **relógio adiantado 2 h + 5 navegações depois de um 200 ⇒ no máximo 1 chamada**; um marcador cujo `id` foi apagado durante o voo continua sem `id` depois de `saveClock`
- [x] `localStorage` que lança na leitura ⇒ `indisponivel`; JSON inválido ou `v` diferente de 1 ⇒ `ausente`
- [x] `politicaDoContador`: com `visitor.ts` presente e o parágrafo do Apêndice A ausente de `PrivacyPolicyPage.tsx`, reprova; sensor: parágrafo com uma palavra trocada reprova; âncora: os dois arquivos lidos
- [x] Quick gate (store) verde

**Tests**: unit + guarda de fonte · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). `apps/store/src/shared/lib/visits/visitor.ts`: `VISITOR_KEY`, `VisitorMarker`, `readMarker(): MarkerRead` (`ausente`/`presente`/`indisponivel`; id fora de v4 lido como `null`, prazo não numérico como `null`), `markerAllowsCall`, `saveClock` (relê no instante da escrita, só toca `ate`/`em`, ignora prazo não finito, não lança), `visitCounterState` + `resetVisitCounterForTests`. `visits/__tests__/marker.test.ts` (27 casos), incluindo o aparelho adiantado 2 h às 23h de Brasília + 5 navegações ⇒ 1 chamada, e o id apagado durante o voo que continua apagado. `pages/__tests__/politicaDoContador.test.ts` (6 casos): âncora nos dois arquivos, predicado `violada(contadorExiste, fonte)` com o JSX normalizado, sensores (parágrafo apagado, "8"→"90", "aleatório"→"anônimo", e sem contador não cobra). Viu reprovar (módulo inexistente; âncora do guarda) e passar. **Injeção real** no `PrivacyPolicyPage.tsx`: "8 dias"→"90 dias" e o parágrafo adulterado ⇒ reprova. ⚠️ `visitCounterState` é estado de módulo previsto pelo design para a task 19 (uma em voo, falhas da aba); nasceu aqui porque o reset é desta task.

---

### 14-id-do-visitante

**What**: no mesmo `visitor.ts`: `ensureVisitorId()` (sem `randomUUID` ⇒ `null`; com `navigator.locks` ⇒ trava `estrelinha-visitor` com **releitura dentro dela**; grava e relê o que gravou; id armazenado inválido ⇒ ausente), `forgetVisitorId()` (apaga só o `id`, mantém `ate`/`em`), `OPT_OUT_KEY`, `setOptOut`, `isOptedOut`; e o guarda `visitanteComDonoUnico.test.ts`.
**Where**: `apps/store/src/shared/lib/visits/visitor.ts`, `apps/store/src/shared/lib/visits/__tests__/visitor.test.ts` (novo), `apps/store/src/shared/lib/__tests__/visitanteComDonoUnico.test.ts` (novo)
**Depends on**: 03, 13
**Reuses**: `isVisitorId` de `@estrelinha/core/visits`; `orderAccessSingleOwner.test.ts` (molde do guarda)
**Requirement**: VIS-12, VIS-19, VIS-20, VIS-24 (`forgetVisitorId`), VIS-42 (a marca no armazenamento)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] Id vem de `crypto.randomUUID` e passa em `isVisitorId`; um segundo `ensureVisitorId` devolve o mesmo
- [x] VIS-19: `localStorage` que lança na leitura, que lança na escrita, ou escrita que não confere na releitura ⇒ `null` **e nenhum id guardado em memória** (a chamada seguinte com o armazenamento ainda quebrado continua `null`); sem `randomUUID` ⇒ `null`
- [x] VIS-20: dublê de `navigator.locks` que **segura** a trava; entre o `request` e o callback outra escrita grava um id ⇒ esse id é devolvido e `randomUUID` é chamado **zero** vezes; sem `navigator.locks` ⇒ cria sem trava
- [x] `forgetVisitorId` mantém `ate`/`em`; `setOptOut(true)` grava `'1'`, `false` apaga; `isOptedOut` com armazenamento que lança ⇒ `false` sem lançar
- [x] `visitanteComDonoUnico`: `estrelinha-visitor` ou `estrelinha-nao-contar` em `apps/*/src` (**testes inclusos**) fora de `visitor.ts` reprova; os testes **importam** `VISITOR_KEY`/`OPT_OUT_KEY`; âncora: arquivos lidos + o dono com as duas chaves + um arquivo de cada app (`L-035`); sensores CRLF/LF/glob e o inverso (um teste irmão com o literal **seria** acusado); allowlist de um além do dono (o próprio guarda, escrito literalmente)
- [x] Quick gate (store) verde

**Tests**: unit + guarda de fonte · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). No mesmo `visitor.ts`: `ensureVisitorId` (sem `crypto.randomUUID` ⇒ `null`, inclusive com id já guardado; com `navigator.locks` ⇒ `request(VISITOR_KEY, …)` e releitura dentro da trava; grava e relê o que gravou; `randomUUID` fora de v4 não vira id; nada em memória), `forgetVisitorId` (só `id` ⇒ `null`), `OPT_OUT_KEY`, `setOptOut` (`true` grava `'1'`, `false` APAGA), `isOptedOut` (só `'1'`, armazenamento que lança ⇒ `false`). `visits/__tests__/visitor.test.ts` (23 casos), com a trava dublada que SEGURA. `shared/lib/__tests__/visitanteComDonoUnico.test.ts` (8 casos): escopo `apps/store/src` + `apps/backoffice/src` **com testes**, allowlist de um (o próprio guarda), âncora (≥ 900 arquivos, `App.tsx` de cada app, os testes do contador, o dono declarando as duas chaves), a metade positiva (os dois testes importam `VISITOR_KEY` de `../visitor`), sensores (teste irmão acusado, a segunda chave no painel acusada, CRLF/LF, glob). **Sensor de mutação**: 13 mutantes em `visitor.ts` (relógio que volta, borda do prazo, prazo sem conversão, sem releitura, leitura fora da trava, esquecer apagando o prazo, `setOptOut(false)` gravando `'0'`, `indisponivel`→`ausente`, sem checar `randomUUID`, id inválido aceito, `saveClock` restaurando id, prazo perdido ao criar id, marca aceitando qualquer valor) — **13 mortos por asserção**; injeção real da chave por extenso em `marker.test.ts` ⇒ o guarda reprova. Restauração por SHA-256 em todos.

**Gate do lote L2 (Fases 3 e 4)** — 2026-10-22, um workspace por vez, exit code fora de pipe, `--testTimeout=20000` sem `--` nos apps:

| Workspace | Entrada (saída do L1) | Saída do L2 | Delta | Exit |
| --- | --- | --- | --- | --- |
| core | 3507/138 | **3507/138** | 0 (só `situation.ts` passou a importar o dono; nenhum caso novo) | 0 |
| functions | 890/19 | **952/21** | +62/+2 (`rateLimit` 7, `visit/handlers` 53, `wiringResolve` +2 derivados da `visit`) | 0 |
| store | 5487/300 | **5567/305** | +80/+5 | 0 |
| backoffice | 3511/199 | **3511/199** | 0 (comportamento de `copy.ts`/`AnalyticsSecretField.tsx` idêntico) | 0 |

`tsc --noEmit`: `apps/store/tsconfig.app.json` 0 · `apps/backoffice/tsconfig.app.json` 0 · `apps/store/tsconfig.server.json` 0. `deno check --no-lock` de `visit/index.ts` e `checkout/index.ts`: exit 0. `packages/core/src/payment/**`: zero arquivos alterados.

- **A suíte da LOJA reprovou 1 caso na primeira medição, e foi o guarda certo fazendo o trabalho dele**: `marcacaoSoPorAcao.test.ts` (feature `67`) exige que o conjunto de `.rpc(nome)` de produção seja IGUAL a uma lista literal, e a `visit` trouxe `record_store_visit` e `store_clock`. Os dois entraram na lista `RPCS`, com o comentário da `71`; o `it.each` que exige `create function` numa migration passou a cobrir os dois (+2). Nenhuma régua afrouxada. **É a quarta feature seguida em que o código fora da loja quebra um guarda da loja** — o gate do lote incluir a suíte da loja não é zelo.
- **Prova servida** (task 11) com o banco local restaurado ao estado de entrada: `production_host = umaestrelinha.com.br`, `store_visit_counter` ausente, `store_visits` vazia.

---

### 15-decisao-de-contar

**What**: `apps/store/src/shared/lib/visits/refusal.ts` com `VisitContext` e `visitRefusal(ctx): string | null` (decisão pura de `VIS-22`, que **não recebe** `enabled`, `measurement_id` nem `canMeasure`), e o guarda `contadorSemGa.test.ts`.
**Where**: `apps/store/src/shared/lib/visits/refusal.ts` (novo), `visits/__tests__/refusal.test.ts` (novo), `apps/store/src/shared/lib/__tests__/contadorSemGa.test.ts` (novo)
**Depends on**: 02
**Reuses**: `trafficType` de `@estrelinha/core/analytics`, `isBotUserAgent` de `@estrelinha/core/visits`
**Requirement**: VIS-22

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] Uma recusa por condição (build não-produção, prévia, `settingsLoaded` falso ⇒ `'esperando'`, host interno, `statistics` falso, `optedOut`, `webdriver`, UA de robô), cada uma com o par liberado ao lado
- [x] `production_host = 'umaestrelinha.com.br'` em `localhost` ⇒ recusa; `production_host = ''` ⇒ recusa (`internal`)
- [x] `contadorSemGa` reprova `enabled`, `measurement_id` ou `canMeasure` em **código** de `shared/lib/visits/**` (o escopo cresce para `app/VisitCounter.tsx` na 19); âncora: arquivos lidos + `visitRefusal` encontrado; sensor: `shared/lib/analytics/index.ts` **seria** acusado pela mesma régua; prosa que cita os nomes não é acusada
- [x] Quick gate (store) verde

**Tests**: unit + guarda de fonte · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). `apps/store/src/shared/lib/visits/refusal.ts`: `VisitContext` (sem campo nenhum do GA4) e `visitRefusal` — `'ambiente'`, `'previa'`, `'esperando'`, `'interno'` (por `trafficType`), `'recusa'`, `'marca'`, `'robo'` (`webdriver` e `isBotUserAgent`), nessa ordem. `'esperando'` vence o host: com a configuração ainda no padrão vazio, o motivo não pode ser `interno`. `visits/__tests__/refusal.test.ts` (17): uma recusa por condição com o liberado ao lado, os sete motivos distintos entre si, o par `localhost` × host de produção, host vazio, `www.`/maiúsculas, e os inversos Cubot e Instagram. `shared/lib/__tests__/contadorSemGa.test.ts` (7), já no escopo final da 19 (`shared/lib/visits/**` sem testes + `app/VisitCounter.tsx`): âncora nos quatro arquivos e `visitRefusal` declarado e chamado; sensores — `shared/lib/analytics/index.ts` acusado, cada nome sozinho, prosa com LF/CRLF, glob (`BL-027`), token exato. Os testes do segmento ficam fora do escopo de propósito: a fixture de `VIS-22` escreve o GA4 desligado por extenso.

---

### 16-envio-com-chave-publicavel

**What**: `@estrelinha/supabase` passa a exportar `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (continua o único leitor das duas env e continua lançando sem elas), e `apps/store/src/shared/lib/visits/send.ts` faz o `POST` com `fetch` cru (nunca `functions.invoke`), `credentials: 'omit'`, só `apikey`, corpo de `visitBody`, sem `keepalive`.
**Where**: `packages/supabase/src/client.ts`, `apps/store/src/shared/lib/visits/send.ts` (novo), `visits/__tests__/send.test.ts` (novo), `apps/store/src/shared/lib/visits/index.ts` (barril do segmento)
**Depends on**: 03
**Reuses**: `visitBody` de `@estrelinha/core/visits`
**Requirement**: VIS-13, VIS-18 (resposta sem `ate`/`agora` numéricos é falha)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] `JSON.parse(body)` tem chaves **iguais** a `['id']`; URL `${SUPABASE_URL}/functions/v1/visit`; método `POST`
- [x] Com sessão ativa no client dublado, `Authorization` **ausente** e diferente do token; `supabase.functions.invoke` nunca chamado; `keepalive` ausente
- [x] `{ status, ate, agora }` só quando os dois são números finitos; `ate` string, `NaN` ou ausente ⇒ sem `ate`; rede que rejeita ⇒ status de falha, sem lançar
- [x] `chaveDeServidorForaDoNavegador` segue verde; o "lança sem env" do client continua provado
- [x] Full gate: store + backoffice (os dois consomem `@estrelinha/supabase`) + `tsc` dos dois apps

**Tests**: unit · **Gate**: full

**Status**: ✅ Concluída (2026-10-22). `packages/supabase/src/client.ts` exporta `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (o `const` interno `SUPABASE_ANON_KEY` virou o export; continua o único leitor das duas env e continua lançando sem elas), e `index.ts` os reexporta. `apps/store/src/shared/lib/visits/send.ts`: `postVisit(id)` com `fetch` cru, `credentials: 'omit'`, só `apikey` + `Content-Type`, corpo de `visitBody`, sem `keepalive`; devolve `ate`/`agora` só quando os dois são números finitos; corpo não-JSON preserva o status; rede que rejeita ⇒ `status: 0`. Barril `shared/lib/visits/index.ts`. `visits/__tests__/send.test.ts` (18): client dublado COM sessão ativa — `Authorization` ausente, nenhum cabeçalho com o token, `functions.invoke` nunca chamado, chaves do corpo `toEqual(['id'])`; cinco formas de resposta sem relógio; e três casos com o client **de verdade** (`doUnmock` + `resetModules`): exporta o que a env diz, lança sem a URL, lança sem a chave. `chaveDeServidorForaDoNavegador` verde.

---

### 17-consentimento-relido-e-recusa-apaga

**What**: `useCookieConsentStore` ganha `syncFromStorage()` (aplica **só** registro válido; ausente ou armazenamento que lança mantém a memória e não fecha a folha) e `save(false)` passa a chamar `forgetVisitorId()` ao lado de `clearGaCookies()`. `hydrate()` não muda.
**Where**: `apps/store/src/entities/cookie-consent/model/cookieConsentStore.ts`, `.../__tests__/cookieConsentStore.test.ts`
**Depends on**: 14
**Reuses**: `clearGaCookies` (o mesmo sentido de import `entities → shared`)
**Requirement**: VIS-24, VIS-25

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] Store **real**: com marcador `{ id, ate, em }`, `save(false)` deixa `id` nulo e `ate`/`em` intactos; `save(true)` não toca o marcador
- [x] `syncFromStorage`: recusa escrita no `localStorage` **sem** evento ⇒ aplicada; armazenamento ausente ⇒ memória mantida; **`setItem` que lança + `save(false)` + `syncFromStorage()` ⇒ `statistics` continua `false`** (a aba privada antiga)
- [x] Os casos existentes de `hydrate` seguem verdes sem asserção tocada; o comentário de cada função diz qual pergunta ela responde
- [x] Quick gate (store) verde

**Tests**: unit · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). `cookieConsentStore.ts`: `save(false)` chama `forgetVisitorId()` ao lado de `clearGaCookies()`; `syncFromStorage()` aplica só registro válido, não fecha a folha; `hydrate()` com o mesmo comportamento de antes (zera também a marca abaixo). ⚠️ **Refinamento sobre o design** (dentro de `VIS-25`, "nunca desfaz recusa em memória"): uma marca de módulo `memoriaSemGravar` registra quando a última gravação lançou, e enquanto ela vale `syncFromStorage` não aplica nada — senão um armazenamento que LÊ mas não GRAVA (cota cheia) devolveria um aceite antigo por cima da recusa em memória. O import é de `@/shared/lib/visits/visitor`, e não do barril: o barril carrega o envio e com ele o client do Supabase, e o GoTrue real derrubava a suíte de consentimento com erros não tratados no caso do armazenamento que lança. `cookieConsentStore.test.ts` +11 (os 10 antigos sem asserção tocada): marcador real, recusa apaga só o `id`, `save(true)`/aceitar/X não tocam; sync aplica recusa e aceite, mantém memória com armazenamento ausente, corrompido, que lança na leitura, que lança na gravação, e com aceite antigo + gravação que lança; folha aberta continua aberta. Viu reprovar (9) e passar.

---

### 18-estatisticas-sempre-na-folha

**What**: a folha "Preferências de cookies" mostra Estatísticas **independentemente de `analytics.enabled`**, "Salvar escolhas" grava a escolha do interruptor, e a frase da categoria vira a do Apêndice A (sem "anônima"). Inversão declarada de `AVS-02`.
**Where**: `apps/store/src/widgets/cookie-notice/ui/CookiePreferencesSheet.tsx` (linhas 28 e 130), `.../__tests__/CookieNotice.test.tsx`
**Depends on**: 17
**Reuses**: —
**Requirement**: VIS-26

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] O caso "medição DESLIGADA ⇒ a folha não mostra Estatísticas" (`CookieNotice.test.tsx:228`) é **invertido**, não apagado, com o nome dizendo `VIS-26`/`AVS-02` invertida; ao lado, a asserção de que a escolha é gravada com a medição desligada
- [x] A frase nova literal está na folha; "anônima" não aparece; `touchTarget`, `fieldBorder` e `accentText` seguem verdes
- [x] Quick gate (store) verde

**Tests**: component · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). `CookiePreferencesSheet.tsx`: saiu o `useAnalyticsSettings` (linha 28), a categoria Estatísticas não tem mais condição, "Salvar escolhas" chama `save(estatisticas)`, e a frase é a do Apêndice A. `CookieNotice.test.tsx`: o caso de `AVS-02` foi **invertido** (agora "medição DESLIGADA ⇒ a folha MOSTRA Estatísticas (VIS-26 inverte AVS-02)", com comentário declarando a inversão e a configuração chegando antes da asserção), mais um caso novo — com o GA4 desligado, "Salvar escolhas" grava `statistics: false`; a asserção da frase trocou de literal (a cópia aprovada mudou) e ganhou a vizinha `not.toMatch(/anônim/i)`. Viu reprovar (3) e passar. `touchTarget`, `fieldBorder` e `accentText` verdes. O arquivo não passava no `prettier --check` antes da mudança e continua não passando (a linha longa do disco do interruptor é anterior).

---

### 19-contador-montado-na-loja

**What**: `apps/store/src/app/VisitCounter.tsx` — o efeito em `pathname` + `isFetched` que agenda `tentar()` fora do caminho crítico (`requestIdleCallback` ⇒ senão `readyState === 'complete'` ⇒ `setTimeout(…, 0)` ⇒ senão `load`), e `tentar()`: `syncFromStorage` → `visitRefusal` → `markerAllowsCall` → trava "uma em voo" → `ensureVisitorId` → `visitRefusal` de novo → `postVisit` → `saveClock` ou falha contada (no máximo mais uma tentativa por aba). Montado no `App.tsx` fora das `Routes`, sob `!previewMode`.
**Where**: `apps/store/src/app/VisitCounter.tsx` (novo), `apps/store/src/app/App.tsx`, `apps/store/src/app/__tests__/VisitCounter.test.tsx` (novo), `apps/store/src/app/__tests__/contadorMontado.test.tsx` (novo), `apps/store/src/shared/lib/__tests__/contadorSemGa.test.ts` (escopo ganha `app/VisitCounter.tsx`)
**Depends on**: 13, 14, 15, 16, 17
**Reuses**: `AnalyticsLoader` (montagem ao lado), `scrollToTop.test.tsx` (molde do guarda de montagem), `useAnalyticsSettings` (`production_host`, `isFetched`)
**Requirement**: VIS-17, VIS-18, VIS-22, VIS-24, VIS-25

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] VIS-17: agendador dublado ⇒ **zero** `fetch` antes de disparar; sem `requestIdleCallback` e `readyState === 'complete'` ⇒ navegar dá 1 chamada; `readyState === 'loading'` ⇒ espera o `load`
- [x] 5 navegações ⇒ 1 chamada; `200` ⇒ marcador gravado; `429` com `ate` ⇒ marcador e nenhuma outra no dia; `500`/rede/`200` sem `ate` ⇒ sem marcador, **uma** tentativa a mais na próxima navegação, depois nenhuma
- [x] VIS-22 no componente: `enabled = false` e `measurement_id = ''` com o resto liberado ⇒ **chama**; `localhost` com host de produção ⇒ não chama; settings carregando ⇒ espera e chama quando `isFetched` vira
- [x] VIS-24 com a store **real**: `save(false)` + navegar ⇒ zero `fetch`; POST segurado ⇒ `save(false)` ⇒ resposta `200` ⇒ `id` continua `null`
- [x] VIS-25: aba A com `statistics: true` em memória, recusa gravada no armazenamento por "outra aba", virada do prazo ⇒ **nenhuma** chamada
- [x] `contadorMontado`: `VisitCounter` no `App.tsx`, fora das `Routes`, sob `!previewMode`; sintaxe que a régua não lê derruba a âncora
- [x] Full gate: store + `tsc` da loja e do servidor

**Tests**: component + guarda de fonte · **Gate**: full

**Status**: ✅ Concluída (2026-10-22). `apps/store/src/app/VisitCounter.tsx`: o efeito em `pathname` + `isFetched` + `production_host` agenda `tentar()` por `agendar()` — `requestIdleCallback` (prazo 5 s) ⇒ senão `readyState === 'complete'` ⇒ `setTimeout(…, 0)` ⇒ senão `load` —, com cancelamento na limpeza; `tentar()`: `syncFromStorage` → `visitRefusal` → `readMarker`/`markerAllowsCall` → "uma em voo" e teto de 2 falhas por aba (`visitCounterState`) → `ensureVisitorId` → `syncFromStorage` + `visitRefusal` de novo → `postVisit` → `saveClock` com `200`/`429` com relógio, senão uma falha. Montado no `App.tsx` como `{!previewMode && <VisitCounter />}`, depois do `CookieNotice`, fora das `Routes`. `app/__tests__/VisitCounter.test.tsx` (31 com os da 20): agendador dublado, `fetch` dublado, store de consentimento e marcador REAIS; zero `fetch` antes do agendador; os dois ramos sem `requestIdleCallback`; 5 navegações ⇒ 1 chamada com o id do marcador no corpo; virada ⇒ mesma id; uma em voo; `429` com relógio; cinco falhas (`500`, `400`, rede, `200` sem `ate`, `429` sem relógio) com uma tentativa a mais só na próxima navegação; GA4 desligado ⇒ chama; `localhost` × host de produção ⇒ nada e nenhum id; configuração segurada ⇒ espera e chama; build de dev, `webdriver`, UA de robô, marca e recusa ⇒ nada; `VIS-24` com save(false) + virada ⇒ zero e o id não volta, e POST no ar ⇒ save(false) ⇒ 200 ⇒ id nulo; **recusa enquanto a trava do id espera ⇒ nada** (caso acrescentado para o segundo `visitRefusal` ter dono); `VIS-25` outra aba + virada ⇒ nada, com o sensor sem recusa ⇒ chama, e aceite antigo + gravação que lança + recusa ⇒ nada. `app/__tests__/contadorMontado.test.tsx` (8): predicado `montagem()` chamado pela asserção e pelos sensores (sem portão, `previewMode ? null :`, dentro das `Routes`, fora do `BrowserRouter`, só em comentário com LF/CRLF). Duas armadilhas do arnês, registradas: o React renderiza só ao SAIR do `act` (o escoamento é feito em vários `act` curtos), e o `Toaster` precisa vir antes do contador, como no `App.tsx`.

---

### 20-nao-contar-pela-url

**What**: o `VisitCounter` ganha o efeito em `location.search`: `readOptOutParam` trata `on` (marca, `forgetVisitorId`, aviso "Este navegador não é mais contado nas visitas da loja.") e `off` (apaga a marca, aviso "Este navegador voltou a ser contado nas visitas da loja."), e tira o parâmetro com `navigate({ search }, { replace: true })`, preservando os outros.
**Where**: `apps/store/src/app/VisitCounter.tsx`, `apps/store/src/app/__tests__/VisitCounter.test.tsx`
**Depends on**: 04, 19
**Reuses**: `readOptOutParam` de `@estrelinha/core/visits`, o `sonner` já montado na loja (`toasterUnico`)
**Requirement**: VIS-42

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] `?nao-contar=1&utm=x` ⇒ marca `'1'`, `id` apagado com `ate`/`em` mantidos, URL do router vira `?utm=x`, **sem entrada nova no histórico** (o `history.length`/`navigationType` do router medido), aviso exato; depois, navegar ⇒ zero chamadas
- [x] `?nao-contar=0` ⇒ marca apagada, parâmetro tirado, aviso de volta; a chamada volta a acontecer
- [x] Valor desconhecido (`?nao-contar=x`) não muda nada
- [x] Quick gate (store) verde

**Tests**: component · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). Efeito em `search`, declarado ANTES do agendamento: `readOptOutParam` ⇒ `on`: `setOptOut(true)` + `forgetVisitorId()` + aviso "Este navegador não é mais contado nas visitas da loja."; `off`: `setOptOut(false)` + aviso "Este navegador voltou a ser contado nas visitas da loja."; nos dois, `navigate({ pathname, search, hash }, { replace: true })` sem o parâmetro e com os outros. Casos em `VisitCounter.test.tsx`: `=1&utm=x` ⇒ marca `'1'`, `{ id: null }` com o prazo intacto, `?utm=x`, `useNavigationType() === 'REPLACE'`, voltar duas vezes cai na entrada anterior (nenhuma entrada nova), o aviso exato no `Toaster` real, e zero chamadas depois; `=0` ⇒ marca apagada, parâmetro tirado, aviso de volta, a chamada acontece; `=x` ⇒ nada muda (URL intacta, `POP`, sem aviso, chamada com o id existente). O parâmetro é escrito pelo teste com `OPT_OUT_PARAM` de `core`, nunca por extenso (o guarda da 28 pode varrer testes).


**Gate do lote L3 (Fase 5)** — 2026-10-22, um workspace por vez, exit code fora de pipe, `--testTimeout=20000` sem `--`:

| Workspace | Entrada (saída do L2) | Saída do L3 | Delta | Exit |
| --- | --- | --- | --- | --- |
| store | 5567/305 | **5660/310** | +93/+5 (`refusal` 17, `contadorSemGa` 7, `send` 18, `cookieConsentStore` +11, `CookieNotice` +1, `VisitCounter` 31, `contadorMontado` 8) | 0 |
| backoffice | 3511/199 | **3511/199** | 0 (`packages/supabase` mudou só por acréscimo de export) | 0 |

`tsc --noEmit`: `apps/store/tsconfig.app.json` 0 · `apps/store/tsconfig.server.json` 0 · `apps/backoffice/tsconfig.app.json` 0. Lint da loja **2/2** (a baseline; nenhum problema nos arquivos do lote). Core e functions não foram tocados neste lote e não foram remedidos. `packages/core/src/payment/**`: zero arquivos alterados.

- **Sensor de mutação**: 23 mutantes nos arquivos reais do lote (`refusal.ts`, `send.ts`, `cookieConsentStore.ts`, `CookiePreferencesSheet.tsx`, `VisitCounter.tsx`, `App.tsx`), o arnês lançando quando o alvo não existe e restaurando por SHA-256: **23 mortos por asserção, nenhum por compilação, nenhum sobrevivente** — incluindo a releitura depois da trava apagada (que sobreviveria antes do caso acrescentado na 19), a marca `memoriaSemGravar` apagada, o `replace` trocado por `push`, a tentativa agendada síncrona, e o contador passando a ler o interruptor do GA4.
- **Sem probe de banco neste lote**: a Fase 5 é só cliente. A gravação pelo caminho real (function → RPC) já foi provada pelo probe da task 11 (L2); a prova ponta a ponta no navegador é a task 29.

---

### 21-canal-unico-de-pedidos

**What**: `apps/backoffice/src/entities/order/api/useOrdersRealtime.ts` — **o** canal `admin-orders-realtime`, com o callback mais recente num `ref` e o efeito com dependência vazia; exportado pelo barril de `entities/order`.
**Where**: `apps/backoffice/src/entities/order/api/useOrdersRealtime.ts` (novo), `.../useOrdersRealtime.test.ts` (novo), `apps/backoffice/src/entities/order/index.ts`
**Depends on**: —
**Reuses**: o trecho de `useAdminStats.ts:116-123` (forma do canal)
**Requirement**: VIS-10 (d)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] Um `supabase.channel('admin-orders-realtime')` por montagem; re-render com uma **seta nova** como `onChange` não recria o canal; o aviso chama o callback **mais recente**; desmontar chama `removeChannel` com o mesmo canal
- [x] Quick gate (backoffice) verde

**Tests**: unit · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). `apps/backoffice/src/entities/order/api/useOrdersRealtime.ts`: `useOrdersRealtime(onChange)` e `ORDERS_REALTIME_CHANNEL = 'admin-orders-realtime'`; o callback mais recente num `ref` (atualizado por um efeito sem dependência, declarado ANTES do efeito do canal), e o canal num efeito com dependência vazia que ouve `postgres_changes` `*` em `public.orders`. Exportado pelo barril de `entities/order`. `useOrdersRealtime.test.ts` (4): um canal com o nome, o filtro e o `subscribe`; re-render com seta nova ⇒ `channel` continua em 1 e `removeChannel` não é chamado; o aviso chama a seta mais recente e não a primeira; desmontar remove o MESMO canal (`toBe`). Viu reprovar (módulo inexistente) e passar. `useAdminStats` ainda abre o canal dele: quem o tira é a 26 (fora deste lote).

---

### 22-leitura-do-movimento

**What**: o tipo `StoreMovement` (C6) e `useStoreMovement`: React Query com `STORE_MOVEMENT_KEY = ['store-movement']`, `rpc('store_movement')` **sem segundo argumento**, `if (error) throw error`, `staleTime: 0`, `refetchOnWindowFocus: true`, `retry: 1`, e o timer da virada medido como **duração do servidor** (`expira_em − lido_em`, a partir de `dataUpdatedAt`, piso 1 s, teto 2³¹−1, `NaN` não agenda).
**Where**: `apps/backoffice/src/entities/stats/model/storeMovement.ts` (novo), `.../api/useStoreMovement.ts` (novo), `.../api/useStoreMovement.test.ts` (novo), `apps/backoffice/src/entities/stats/index.ts`
**Depends on**: 07
**Reuses**: `useAdminStats` (forma do client), o JSON real de `store_movement` medido na 07 (o tipo escrito à mão é **conferido** contra ele, `AD-012`)
**Requirement**: VIS-04, VIS-10 (a, b, c), VIS-33 (forma)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] `rpc.mock.calls[0]` é **exatamente** `['store_movement']` (comprimento 1)
- [x] Dublê devolvendo `{ error }` (não promessa rejeitada) ⇒ estado de erro
- [x] Relógio falso: no instante `expira_em` acontece uma nova chamada; **com o relógio local adiantado 2 h em relação a `lido_em` ⇒ exatamente uma chamada na virada, não um laço**; `expira_em` ilegível ⇒ não agenda; foco da janela ⇒ releitura
- [x] As chaves do tipo batem com as chaves do JSON do probe da 07 (lista escrita no teste a partir da saída real)
- [x] Quick gate (backoffice) verde

**Tests**: unit · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). `entities/stats/model/storeMovement.ts` (`StoreMovement`, `MovementPeriod`, `MovementPeriodKey`) e `entities/stats/api/useStoreMovement.ts` (`STORE_MOVEMENT_KEY`, `turnDelayMs`, `useStoreMovement`): `rpc('store_movement')` sem segundo argumento, `if (error) throw error`, `staleTime: 0`, `refetchOnWindowFocus: true`, `retry: 1`; o timer da virada é `expira_em − lido_em` menos o tempo local decorrido desde `dataUpdatedAt`, com piso de 1 s e teto 2³¹−1, e `NaN` não agenda. Barril de `entities/stats` exporta hook, chave, `turnDelayMs` e tipos. `useStoreMovement.test.ts` (10): `mock.calls[0]` igual a `['store_movement']` com comprimento 1; a chave no cache; `{ error }` ⇒ erro depois de duas chamadas; relógios iguais ⇒ nenhuma chamada em 9 h − 1 ms, uma em 9 h, `hoje` 22/10, nenhuma uma hora depois; **relógio adiantado 2 h** (o servidor dublado responde no relógio dele) ⇒ nenhuma chamada às 7 h locais, uma às 9 h, nenhuma 3 h depois; `expira_em` ilegível ⇒ exatamente 1 chamada em 3 dias; piso de 1 s; desmontar cancela; foco ⇒ releitura; e as chaves do tipo contra as da RPC por `Record<keyof …, true>` (o `tsc` recusa chave a mais ou a menos). **Duas armadilhas do arnês, registradas no arquivo**: (1) o React Query v5 só notifica propriedades LIDAS no render, e um `renderHook` que olha `isError` depois do fato não re-renderiza — o hook é montado como o widget o lê (`useComoOWidget`); (2) o `setTimeout(0)` de notificação agendado de dentro de um callback de timer falso não dispara no `advanceTimersByTimeAsync` — o arquivo usa `notifyManager.setScheduler(queueMicrotask)` e devolve `defaultScheduler` no fim. **Probe contra o banco local**: `store_movement()` como o admin do seed (SQL, `begin … rollback`) e por `POST /rest/v1/rpc/store_movement` na 54441 com o JWT do admin e corpo `{}` ⇒ 200 com exatamente as 12 chaves de topo, `hoje/ontem/semana` e as 4 medidas do tipo, `faturamento` 0 e `ticket` `null` sem venda; como `anon` ⇒ 401 `42501`.

---

### 23-textos-do-bloco

**What**: `apps/backoffice/src/widgets/store-movement/model/labels.ts`, puro: `periodLine`, `countingSinceLine`, `lastVisitLine`, `updatedAtLine`, `emptyCounterLine` (por `m.production_host`), `cappedLine`, os formatadores de inteiro pt-BR, e `VISIT_INFO_TEXT` (o texto exato do ⓘ, constante única). Nenhum dia decidido aqui: tudo vem dos campos `*_dia`, `hoje`, `ontem`, `inicio_semana`.
**Where**: `apps/backoffice/src/widgets/store-movement/model/labels.ts` (novo), `.../model/__tests__/labels.test.ts` (novo)
**Depends on**: 01, 22
**Reuses**: `formatDayMonth`, `formatStoreHour` (`core/time`), `formatPrice` (`core/formatters`)
**Requirement**: VIS-07, VIS-08 (texto), VIS-09, VIS-10 ("Atualizado às"), VIS-38, VIS-39, VIS-40, VIS-44

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] O arquivo roda num `describe.each` de fusos (`UTC`, `America/Sao_Paulo`, `Asia/Tokyo`) com o sensor de troca
- [x] VIS-09: "Hoje, 21/10", "Ontem, 20/10", "De 19/10 a 21/10", "Semana iniciada hoje, 19/10"; com `hoje = '2026-10-21'` diz 21/10 nos três fusos
- [x] VIS-38: `contagem_desde = 2026-10-21T18:32:00Z`, `hoje = 22/10` ⇒ Ontem e Semana "Contando desde 21/10 às 15h32", Hoje sem linha
- [x] VIS-39: os dois textos exatos por `m.production_host` preenchido/vazio; VIS-40: "hoje às", "ontem às", "em DD/MM às" a partir de `ultima_visita_dia` contra `hoje`/`ontem` **do banco**; VIS-44: o texto exato, presente quando `teto_dia` está no período e ausente fora
- [x] VIS-07: `1.234`; ticket formatado do valor do banco **sem recálculo**; `null` ⇒ `—` + "sem vendas no período"; "Atualizado às 15h32"
- [x] `VISIT_INFO_TEXT` igual ao literal da spec
- [x] Quick gate (backoffice) verde

**Tests**: unit · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). `widgets/store-movement/model/labels.ts`: `VISIT_INFO_TEXT`, `TICKET_VAZIO`, `SEM_VENDAS_TEXT`, `formatCount`, `periodLine`, `periodValues` (Visitas `—` com `contagem_desde` nulo; ticket do banco, `null` sem venda), `updatedAtLine`, `countingSinceLine` (primeiro dia do período ≤ `contagem_desde_dia`, texto contra texto), `emptyCounterLine` (por `m.production_host`), `lastVisitLine` (contra `hoje`/`ontem` do banco) e `cappedLine`. `// SPEC_DEVIATION` no arquivo: `cappedLine(aba, m)` em vez de `cappedLine(m)` — a linha depende do período aberto. `model/__tests__/labels.test.ts` (76 = 25 × 3 fusos + o sensor): `describe.each` com `UTC`, São Paulo e Tóquio, módulo reimportado por ramo, fixtures com instante cujo dia UTC difere do de Brasília (02:10Z ⇒ "hoje às 23h10"), e o sensor de que os três deslocamentos diferem. Neste arquivo o módulo foi escrito junto do teste, então a reprovação vista foi a do sensor de mutação (abaixo), e não a de antes.

---

### 24-statcard-carregando-e-info

**What**: `StatCard` ganha props **aditivas e opcionais** `loading` (esqueleto `<div>` **no lugar** do `<p>` do valor) e `info` (o nó do ⓘ no cabeçalho), e `value` alarga para `ReactNode` de frase. Os outros consumidores não mudam.
**Where**: `apps/backoffice/src/shared/ui/StatCard.tsx`, `StatCard.test.tsx`, `apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts` (escopo + âncoras)
**Depends on**: —
**Reuses**: `TableSkeleton`/esqueletos existentes do painel (forma do `animate-pulse`)
**Requirement**: VIS-05 (esqueleto por card), VIS-08 (lugar do ⓘ)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] Sem as props novas, a saída é idêntica à de antes (casos existentes sem asserção tocada); `loading` ⇒ nenhum `<p>` de valor e nenhum `0` no card; `info` renderiza no cabeçalho
- [x] `animate-pulse` do esqueleto e `transition-*` do `StatCard` com par `motion-reduce:` na mesma linha; o `StatCard` entra no escopo literal de `animacaoRespeitaMovimento` com as âncoras subindo ao número medido pela própria régua
- [x] Quick gate (backoffice) verde

**Tests**: component + guarda de fonte · **Gate**: quick

**Status**: ✅ Concluída (2026-10-22). `shared/ui/StatCard.tsx`: `value` passa a `ReactNode`; `loading` troca o `<p>` do valor (e o subtítulo) por um `<div aria-hidden data-skeleton="valor">` com `animate-pulse motion-reduce:animate-none`; `info` entra no cabeçalho num invólucro `flex` com o ícone depois dele — e **sem `info` a árvore é a de antes** (o ícone sem invólucro). A transição de borda que já existia ganhou `motion-reduce:transition-none`, a única mudança na saída dos outros consumidores. `StatCard.test.tsx` +5 (os 4 antigos sem asserção tocada): o HTML sem as props novas é **igual** ao de uma cópia do desenho anterior (só com o par de movimento), com e sem ícone e subtítulo; `loading` ⇒ só o rótulo é `<p>`, nenhum dígito, esqueleto `DIV` `aria-hidden`; o par `animate-pulse`/`motion-reduce:animate-none` por token; `info` no cabeçalho, antes do ícone, e o valor continua sendo o 2º `<p>`; `value` de frase dentro do `<p>`. Viu reprovar (4) e passar. `animacaoRespeitaMovimento.test.ts`: `shared/ui/StatCard.tsx` no escopo literal, âncoras medidas com a própria régua de 40/18 (o escopo anterior) para **44/20**.

---

### 25-bloco-movimento-da-loja

**What**: `widgets/store-movement/ui/StoreMovement.tsx` — `<section aria-labelledby>` com `h2` "Movimento da loja", `Tabs` (`aria-label="Período"`, `TabsList h-auto`, gatilhos `min-h-11`), a linha do período, a grade `grid-cols-2 lg:grid-cols-4` com quatro `StatCard`, o ⓘ em `Popover` (gatilho `h-11 w-11 -m-3.5`, nunca `Tooltip`), os três estados (primeira carga, erro sem dados, dados — releitura nunca vira esqueleto) e as linhas de rodapé; barril do widget; guarda `semPessoas`.
**Where**: `apps/backoffice/src/widgets/store-movement/ui/StoreMovement.tsx` (novo), `widgets/store-movement/index.ts` (novo), `.../ui/__tests__/StoreMovement.test.tsx` (novo), `.../__tests__/semPessoas.test.ts` (novo), `apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts` (escopo + âncoras)
**Depends on**: 22, 23, 24
**Reuses**: `@estrelinha/ui/tabs`, `@estrelinha/ui/popover`, `NavRail.tsx:44,91` (molde do alvo de 44px), `AdminSettingsPage` (`TabsList h-auto`)
**Requirement**: VIS-01, VIS-02, VIS-05, VIS-06, VIS-07, VIS-08, VIS-10, VIS-11 (proxies), VIS-39, VIS-41, VIS-44

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] VIS-01/02: `h2`, abas na ordem com Hoje selecionada, quatro cards na ordem; trocar de aba mantém `rpc` em **1** chamada; exatamente um `aria-selected="true"`; `aria-label="Período"`; setas ←/→ movem a seleção
- [x] VIS-05: resposta segurada ⇒ esqueleto ×4, `aria-busy="true"`, e **ausência** de `0`, `R$ 0,00` e `—`; releitura segurada com dados ⇒ valores continuam, sem `aria-busy`
- [x] VIS-06: `{ error }` com `retry: false` no `QueryClient` de teste ⇒ uma mensagem, um botão "Tentar de novo" (`h-11` por token exato), nenhum valor; clique ⇒ `rpc` de novo; releitura que falha com dados mantém valores e o "Atualizado às" da leitura boa
- [x] VIS-07/39/44 renderizados: `R$ 0,00` sem venda, ticket `—` com `sr-only`, Visitas `—` (nunca `0`) com `contagem_desde` nulo, a linha do teto
- [x] VIS-08: `<button>` com `aria-label="O que conta como visita única"` e `aria-expanded`; abre por clique, Enter e Espaço; Esc fecha e devolve o foco; o texto **inteiro** é `VISIT_INFO_TEXT`; `h-11 w-11` por token exato
- [x] VIS-11 (proxy): `grid-cols-2`, `lg:grid-cols-4`, `h-auto`, `min-h-11` por token exato (`(?:^|\s)token(?![-\w])`)
- [x] `semPessoas`: "pessoas" ou "usuários" nos literais do widget reprova; âncora: arquivos lidos + `VISIT_INFO_TEXT` encontrado; inverso: "Visitas únicas" passa
- [x] Os arquivos de UI novos no escopo literal de `animacaoRespeitaMovimento`, âncoras subindo junto
- [x] Full gate: backoffice **e** store (guardas da loja varrem `apps/backoffice`) + `tsc` do painel

**Tests**: component + guarda de fonte · **Gate**: full

**Status**: ✅ Concluída (2026-10-22). `widgets/store-movement/ui/StoreMovement.tsx` e o barril `widgets/store-movement/index.ts`: `<section aria-labelledby aria-busy>` com `h2` "Movimento da loja"; erro **sem** dado ⇒ uma frase e "Tentar de novo" (`Button` com `h-11`, seta para `refetch`); senão `Tabs` (`TabsList aria-label="Período" className="h-auto"`, gatilhos `min-h-11 px-4`) e um `TabsContent` por aba com a linha do período, a grade `data-grade="movimento"` `grid grid-cols-2 lg:grid-cols-4 gap-3` com os quatro `StatCard` (o valor num `<span class="whitespace-nowrap text-xl sm:text-2xl">`, para `R$ 99.999,99` caber em ~140px no celular; ticket nulo ⇒ `—` `aria-hidden` + `sr-only`; "Contando desde" como subtítulo de Visitas) e as linhas de rodapé em `[overflow-wrap:anywhere]` (teto, contador vazio, última visita, "Atualizado às"). O ⓘ é `Popover` (`PopoverContent` com `motion-reduce:animate-none`) com gatilho `<button type="button" aria-label="O que conta como visita única" class="-m-3.5 flex h-11 w-11 …">`. `ui/__tests__/StoreMovement.test.tsx` (16), com o **hook real** e só a RPC dublada: VIS-01 (h2 nomeando a região, abas na ordem, Hoje selecionada, cards na ordem); VIS-02 (as três abas com os valores certos, RPC em 1, uma aba selecionada, `tablist` "Período", → e ← movem a seleção); VIS-05 (resposta segurada ⇒ 4 esqueletos, `aria-busy`, nenhum dígito, `R$` ou `—`; releitura segurada com dados ⇒ valores, sem esqueleto nem `aria-busy`); VIS-06 (`{ error }` ⇒ uma frase, um botão `h-11`, nenhum valor, o botão relê; releitura que falha mantém valores e "Atualizado às 15h32"); VIS-07/39/44/38/40 renderizados; VIS-08 (tag `BUTTON`, `type`, `aria-expanded`, `h-11`/`w-11`, dentro do card de Visitas; clique abre `dialog` com o texto inteiro, sem `tooltip`; Esc fecha e devolve o foco); VIS-11 (proxies por token exato). `__tests__/semPessoas.test.ts` (5): escopo literal `model/labels.ts`, `ui/StoreMovement.tsx`, `index.ts`; âncora (os três lidos, `VISIT_INFO_TEXT` e "Visitas únicas" encontrados); sensores (singular, plural, com e sem acento; comentário com LF e CRLF; inversos "Visitas únicas", "navegador" e "pessoal"). `animacaoRespeitaMovimento`: o bloco no escopo, âncoras **45/21**. **Não provado em jsdom, e deixado para a prova em navegador (task 29)**: Enter e Espaço abrindo o ⓘ (a régua aqui é a TAG, porque o jsdom não sintetiza a ação padrão do teclado), o toque fora fechando o Popover, e as medidas de `VIS-11`.


**Gate do lote L4 (Fase 6)** — 2026-10-22, um workspace por vez, exit code fora de pipe, `--testTimeout=20000` sem `--`:

| Workspace | Entrada (saída do L3) | Saída do L4 | Delta | Exit |
| --- | --- | --- | --- | --- |
| backoffice | 3511/199 | **3627/204** | +116/+5 (`useOrdersRealtime` 4, `useStoreMovement` 10, `labels` 76, `StatCard` +5, `StoreMovement` 16, `semPessoas` 5; `animacaoRespeitaMovimento` com o mesmo número de casos e as âncoras de 38/18 para 45/21) | 0 |
| store | 5660/310 | **5661/310** | +1 (o `it.each` de `marcacaoSoPorAcao` que confere `create function` da RPC nova) | 0 |

- **A suíte da loja reprovou na primeira medição, e foi o guarda certo**: `marcacaoSoPorAcao.test.ts` (feature 67) compara por IGUALDADE o conjunto de RPCs chamadas em `apps/**`, e o painel passou a chamar `store_movement`. Mesmo achado do L2 com `record_store_visit`/`store_clock`. `store_movement` entrou na lista literal `RPCS`, com o comentário do porquê; nenhuma asserção afrouxada.
- `tsc --noEmit`: `apps/backoffice/tsconfig.app.json` 0 · `apps/store/tsconfig.app.json` 0 · `apps/store/tsconfig.server.json` 0. ESLint nos arquivos do lote: zero problema novo (os erros que a varredura acusa são de `useAdminStats.ts` e `useAdminOrders.test.ts`, da baseline, não tocados). `packages/core/src/payment/**`: zero arquivos alterados. Core e functions não foram tocados e não foram remedidos.
- **Sensor de mutação**: 38 mutantes nos arquivos reais do lote (`useOrdersRealtime.ts`, `useStoreMovement.ts`, `labels.ts`, `StatCard.tsx`, `StoreMovement.tsx`), com o arnês lançando quando o alvo não existe e restaurando por SHA-256. **Primeira rodada: 37 mortos por asserção, 1 sobrevivente** — `M09`, a guarda de `NaN` apagada: `setTimeout(NaN)` dispara na hora, e no relógio falso o `Date.now()` não anda, o `dataUpdatedAt` se repete e o laço para numa chamada extra, que o caso contava DEPOIS de acontecer. O caso passou a cobrar exatamente uma chamada desde a montagem; reinjetado, `M09` morre. **Resultado final: 38 mortos por asserção, 0 por compilação, 0 sobreviventes** — entre eles o timer pelo relógio local (`M05`), o piso tirado, o `{}` na RPC, o erro que não lança, o canal recriado por render, o callback velho, o dia por `new Date`, a última visita pelo dia UTC, o ticket recalculado, o host fixo, o esqueleto sem par, `isError` escondendo dados, a grade de uma coluna, o ⓘ de 32px e o Popover sem par.
- **Probe contra o banco local** (sem `--linked`, sem escrita): `store_movement()` como o admin do seed em `begin … rollback`, e `POST /rest/v1/rpc/store_movement` na 54441 com o JWT do admin e corpo `{}` ⇒ 200 com exatamente as chaves do tipo; `anon` ⇒ 401 `42501`.

---

### 26-dashboard-com-o-bloco

**What**: `AdminDashboard` renderiza `<StoreMovement />` como **primeira seção depois do `PageHeader`** e chama `useOrdersRealtime(() => { refetchStats(); queryClient.invalidateQueries({ queryKey: STORE_MOVEMENT_KEY }) })`; `useAdminStats` deixa de assinar o canal.
**Where**: `apps/backoffice/src/pages/admin/AdminDashboard.tsx`, `apps/backoffice/src/entities/stats/api/useAdminStats.ts`, `apps/backoffice/src/pages/admin/AdminDashboard.test.tsx` (novo)
**Depends on**: 21, 25
**Reuses**: `AdminSettingsPage.test.tsx` (molde de página com `QueryClientProvider`)
**Requirement**: VIS-01 (posição), VIS-10 (d)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] Com a **página real e o widget real** (só `SalesChart`, `AlertsPanel`, `TopProductsCard`, `QuickActions`, `AdminTable` e o client dublados): o bloco é o primeiro irmão depois do `PageHeader` — o mutante "bloco abaixo da grade" reprova
- [x] Exatamente **um** `supabase.channel(` com o Dashboard montado, inclusive depois de re-render; o aviso do canal dispara **as duas** releituras (stats e `store_movement`); `useAdminStats` sozinho não abre canal
- [x] Trocar de aba no Dashboard ⇒ zero chamadas novas
- [x] Full gate: backoffice + store + `tsc` do painel

**Tests**: component · **Gate**: full

**Status**: ✅ Concluída (2026-10-22). `AdminDashboard.tsx` renderiza `<StoreMovement />` logo depois do `PageHeader` e chama `useOrdersRealtime(() => { void refetch(); void queryClient.invalidateQueries({ queryKey: STORE_MOVEMENT_KEY }) })`; `useAdminStats` deixou de abrir o canal (o efeito só chama `fetchStats`). `pages/admin/AdminDashboard.test.tsx` (novo, 7 casos nesta task) monta a **página real e o widget real** — só o client, `SalesChart`, `AlertsPanel`, `TopProductsCard`, `QuickActions` e `AdminTable` (por `importOriginal` no barril de `shared/ui`) dublados: o bloco é `children[1]` da raiz, com o `h1` "Dashboard" em `children[0]`; o bloco real mostra `1.234`; **um** `channel('admin-orders-realtime')` depois de dois `rerender` e nenhum `removeChannel`; o aviso do canal muda **os dois números na tela** ("Pendentes" de 2 para 5 pela contagem dublada, Visitas de 1.234 para 1.240 pela RPC), e a RPC fica em 2 chamadas; desmontar remove o MESMO canal (`toBe`); `renderHook(useAdminStats)` sozinho não chama `channel`; trocar para Ontem e Esta semana deixa `rpc` em 1 e `from` sem chamada nova. Viu reprovar (7) e passar. **Sensor**: 5 mutantes nos arquivos reais (bloco apagado, bloco abaixo da grade, `invalidateQueries` apagado, `refetch` apagado, canal devolvido ao `useAdminStats`) — 5 mortos por asserção, restauração por SHA-256.

---

### 27-saem-os-cards-de-hoje-em-utc

**What**: **(assunção pendente de confirmação — task isolada para poder ser revertida)** `useAdminStats` deixa de calcular `ordersToday`, `revenueToday` e a consulta `todayOrders` (sem campo morto), e o Dashboard perde "Pedidos Hoje" e "Fat. Hoje"; os quatro restantes ficam em `grid-cols-2 lg:grid-cols-4`.
**Where**: `apps/backoffice/src/entities/stats/api/useAdminStats.ts`, `apps/backoffice/src/pages/admin/AdminDashboard.tsx`, `apps/backoffice/src/pages/admin/AdminDashboard.test.tsx`, `apps/backoffice/src/entities/stats/api/useAdminStats.test.ts` (novo)
**Depends on**: 26
**Reuses**: —
**Requirement**: VIS-35

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] O Dashboard renderizado não contém "Pedidos Hoje" nem "Fat. Hoje"; contém Fat. do Mês, Produtos Ativos, Clientes Novos e Pendentes; a grade tem `grid-cols-2` e `lg:grid-cols-4` por token exato
- [x] `useAdminStats.test.ts`: o objeto devolvido não tem `ordersToday`/`revenueToday`, e nenhuma consulta com o recorte de "hoje" em UTC é feita; o `tsc` não acha leitor órfão
- [x] Imports de `ShoppingCart`/`DollarSign` saem; o `(sum, o: any)` sai — `pnpm lint` do painel **cai** (provável 24 → 23 erros), anotado na nota da task
- [x] Full gate: backoffice + store + `tsc` do painel

**Tests**: unit + component · **Gate**: full

**Status**: ✅ Concluída (2026-10-22) — **assunção PENDENTE de confirmação do usuário** (reverter esta task devolve os dois cards). `useAdminStats` perdeu `ordersToday`, `revenueToday`, a variável `today` (dia ISO em UTC) e a consulta `todayOrders`; o tipo `AdminStats` não tem mais os dois campos e o `tsc` do painel não achou leitor órfão (0). `AdminDashboard` perdeu "Pedidos Hoje", "Fat. Hoje" e os imports `ShoppingCart`/`DollarSign`; a grade é `grid grid-cols-2 lg:grid-cols-4 gap-4`. `entities/stats/api/useAdminStats.test.ts` (novo, 3): as chaves do objeto por **igualdade** com as oito que ficam (e `'ordersToday' in stats` falso), nenhuma consulta com `gte` num dia sem hora (com âncora de consultas registradas e o sensor de que o recorte antigo casaria a régua), e os `select` de `orders` por igualdade com os quatro que ficam. `AdminDashboard.test.tsx` +3: os dois rótulos ausentes, os quatro que ficam na ordem, e `grid-cols-2`/`lg:grid-cols-4` presentes e `lg:grid-cols-6`/`md:grid-cols-3` ausentes por token exato. Viu reprovar (6) e passar. **Lint do painel caiu de 24/5 para 23/5**: o `(sum, o: any)` de `revenueToday` saiu (o de `monthRevenue` fica). **Sensor**: 4 mutantes (um card de hoje de volta, a grade de seis colunas, a consulta de hoje em UTC de volta, `ordersToday` de volta no objeto) — 4 mortos por asserção.

---

### 28-abrir-a-loja-sem-contar

**What**: o menu da conta ganha "Abrir a loja sem contar" (`optOutHref(storeOrigin(), true)`, nova aba), que some sem `VITE_STORE_URL` como "Abrir a loja"; e nasce o guarda `parametroNaoContarComDonoUnico.test.ts` (na suíte da loja), cuja metade positiva lê os dois consumidores.
**Where**: `apps/backoffice/src/widgets/admin-layout/ui/AccountMenu.tsx`, `AccountMenu.test.tsx`, `apps/store/src/shared/lib/__tests__/parametroNaoContarComDonoUnico.test.ts` (novo)
**Depends on**: 04, 20
**Reuses**: `storeOrigin()` (`apps/backoffice/src/shared/lib/storeOrigin`), o item "Abrir a loja" existente
**Requirement**: VIS-43, VIS-42 (dono único do parâmetro)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] O item aparece com `href` igual a `optOutHref(origin, true)`, `target="_blank"` e o mesmo `rel` de "Abrir a loja"; some sem `VITE_STORE_URL`
- [x] `AccountMenu.test.tsx:95-99`: a lista de `menuitem` passa a quatro itens; `:113,123`: o nome de "Abrir a loja" vira **exato** (senão casa dois itens e lança) — nenhuma asserção afrouxada
- [x] O guarda reprova o literal do parâmetro (`'nao-contar'`, `nao-contar=`, `?nao-contar`) em `apps/*/src` e `packages/*/src` fora de `core/visits/optOut.ts`; **metade positiva**: `VisitCounter` chama `readOptOutParam` e `AccountMenu` chama `optOutHref`; âncora: arquivos lidos + o dono + os dois consumidores; inverso: `estrelinha-nao-contar` **não** é acusado; sensores CRLF/LF
- [x] Full gate: backoffice + store + `tsc` dos dois apps

**Tests**: component + guarda de fonte · **Gate**: full

**Status**: ✅ Concluída (2026-10-22). `AccountMenu.tsx`: item "Abrir a loja sem contar" logo depois de "Abrir a loja", com `href={optOutHref(loja, true)}`, `target="_blank"`, o mesmo `rel`, o mesmo `ITEM` (`min-h-11`), o ícone `EyeOff` e o `sr-only` "(abre em nova aba)"; dentro do mesmo `loja &&`, então some sem `VITE_STORE_URL`. `AccountMenu.test.tsx`: a lista passa a quatro itens (por `toEqual`), o seletor de "Abrir a loja" vira o nome acessível **exato** — e o nome acessível tem espaço antes do parêntese (`'Abrir a loja (abre em nova aba)'`), não a forma sem espaço que o design citava (aquela é o `textContent`) —, a asserção de ausência sem env continua com a regex ampla de propósito, e +4 casos do item novo (`href` igual a `optOutHref(origem, true)` e diferente do de "Abrir a loja", `target`, `rel` igual; logo depois de "Abrir a loja"; some sem env, sobrando só Minha conta e Sair; `min-h-11` por token). `apps/store/src/shared/lib/__tests__/parametroNaoContarComDonoUnico.test.ts` (novo, 11): escopo literal `apps/store/src`, `apps/backoffice/src` e os quatro `packages/*/src`, **testes inclusos**, sem `dist`/`node_modules`; régua de token com fronteira de letra, dígito e hífen (`L-034`), que deixa passar a chave do armazenamento; **allowlist de três** escrita literalmente (o dono, o teste do dono — que precisa do literal para provar o contrato — e o próprio guarda, que monta o nome por `join` e nunca o escreve); âncora (≥1200 arquivos, um de cada app, o dono, o teste do dono e os dois consumidores) e o dono declarando o nome igual à constante; **metade positiva** (`VisitCounter` chama `readOptOutParam(`, `AccountMenu` chama `optOutHref(`, com a régua de chamada que ignora import e comentário); sensores: as formas `get('…')`, `/?…=1`, `…=` em template e um teste da loja acusados, a chave do armazenamento (e o `visitor.ts` real) não, prosa com LF e CRLF não, glob `apps/**` não cega, teste irmão fora da allowlist acusado, e chamar ≠ importar ≠ citar. Viu reprovar (só a metade do painel) e passar. **Sensor**: 5 mutantes (literal à mão no menu, `optOutHref(loja, false)`, o item fora do `loja &&`, sem `target`, e a loja lendo o parâmetro à mão no `VisitCounter`) — 5 mortos por asserção, nas duas suítes.

**Gate da Fase 7** — 2026-10-22, um workspace por vez, exit code fora de pipe, `--testTimeout=20000` sem `--`:

| Workspace | Entrada (saída do L4) | Saída da Fase 7 | Delta | Exit |
| --- | --- | --- | --- | --- |
| backoffice | 3627/204 | **3644/206** | +17/+2 (`AdminDashboard` 10, `useAdminStats` 3, `AccountMenu` +4) | 0 |
| store | 5661/310 | **5672/311** | +11/+1 (`parametroNaoContarComDonoUnico`) | 0 |

`tsc --noEmit`: `apps/store/tsconfig.app.json` 0 · `apps/backoffice/tsconfig.app.json` 0 · `apps/store/tsconfig.server.json` 0. Lint do painel **23/5** (era 24/5).

---

### 29-prova-em-navegador

**What**: a prova que jsdom não alcança, em 390×844 primeiro e depois 1440, com a loja em `pnpm build` + `vite preview` (o contador só conta em build de produção), o painel servido, o banco local de pé e `production_host = 'localhost'` **semeado só no banco local** e restaurado ao fim. Evidência em `prova-em-navegador.md`.
**Where**: `.specs/features/71-visitas-unicas-no-dashboard/prova-em-navegador.md` (novo); scripts no scratchpad
**Depends on**: 11, 20, 27, 28
**Reuses**: seção 10 do design; memória "Prova em navegador sem Docker" (recuo se o banco não subir); molde da `53` para alvo de 44px
**Requirement**: VIS-11, VIS-08 (toque), VIS-17, VIS-20, VIS-25, VIS-42, VIS-13 (gateway), VIS-07/39 (texto com host sem espaço)

**Tools**: MCP `playwright` · Skill `playwright-cli`

**Done when**:
- [x] O bundle **servido** é conferido antes de medir (o `VisitCounter` presente no chunk)
- [x] Neutralização declarada: `navigator.webdriver` falso por script de inicialização e UA comum; **e o par sem neutralização**: zero chamadas no cliente, e `HeadlessChrome` direto na function ⇒ `robô`
- [x] Bloco em 390 e 1440 com `R$ 99.999,99` e `9.999` (fixture por interceptação da RPC): nenhum valor quebra nem passa da borda, rótulos em até duas linhas, `scrollWidth` do `body` = viewport, abas/ⓘ/"Tentar de novo" com 44px medidos (`getBoundingClientRect` + clique 5px fora do desenho); o texto de `VIS-39` com host sem espaço não empurra a largura; Popover abre por toque e fecha com toque fora
- [x] Ponta a ponta: 5 rotas ⇒ **1** `POST /functions/v1/visit`; recarregar ⇒ 0; relógio além do prazo ⇒ 1; o Dashboard mostra 1 visita; WebKit (sem `requestIdleCallback`) navegando depois do `load` ⇒ a chamada acontece
- [x] Duas abas abertas juntas ⇒ um id; recusa numa aba ⇒ a outra não chama mais; `?nao-contar=1` ⇒ barra de endereço sem o parâmetro, aviso, nenhuma chamada; a loja no iframe de `/admin/home` ⇒ nenhuma chamada
- [x] GA interceptado por caminho (`**/g/collect*`), nunca por domínio; nenhuma requisição ao hospedado
- [x] Linhas gravadas pela prova apagadas e `store_visit_counter`/`production_host` restaurados; o que ficou fora (Instagram/WhatsApp em aparelho real, gateway hospedado) declarado

**Tests**: prova em navegador · **Gate**: full (store e backoffice remedidos depois de semear/restaurar o banco)

**Status**: ✅ Concluída (2026-10-22). Evidência em `prova-em-navegador.md`. Banco local (54441/54442), function `visit` por `supabase functions serve`, loja em `pnpm build` + `vite preview --port 8082`, painel em dev na 8083, Playwright 1.61.1 (o que casa com os navegadores instalados). `production_host = 'localhost'` **e** `analytics.enabled = false` semeados só no banco local — o segundo prova "com o GA4 desligado o contador conta" e impede hit à propriedade real — e **restaurados** (`diff` do JSON de entrada vazio; 4 linhas gravadas apagadas; o contador, ausente na entrada, apagado). Medido: o bundle servido tem o contador e só conhece `127.0.0.1:54441`; **sem** neutralização ⇒ 0 POSTs e `robô` na chamada direta; 5 rotas ⇒ **1** POST (`gravada`, corpo exatamente `{"id":…}`, sem `Authorization`, `apikey` publicável, `ate`/`agora` inteiros), recarregar ⇒ 0, relógio 26 h adiante ⇒ 1 (`repetida`), banco com 1 linha; o Dashboard real mostra **1** em 390 e 1440; WebKit (`requestIdleCallback` ausente) chama depois do `load`; duas abas juntas ⇒ um id e 1 linha; recusa na aba A ⇒ a aba B com o prazo vencido faz 0 POSTs; `?nao-contar=1` ⇒ URL sem o parâmetro e com `utm_source`, aviso, `history.length` 2, 0 POSTs, voltar não reencontra o parâmetro; a loja no iframe de `/admin/home` ⇒ 0. Bloco com a RPC interceptada (`9.999`, `R$ 99.999,99`, host de 80 caracteres sem espaço, erro 500) em 390 e 1440: `scrollWidth` = viewport nos três estados, valores em uma linha dentro do card (165px em 390), rótulos ≤ 2 linhas, abas 44px de altura, ⓘ 44×44 (desenho 16×16), "Tentar de novo" 44px; o ⓘ abre com toque 5px fora do desenho, fecha com toque fora, Enter e Espaço abrem, Esc fecha e devolve o foco — os pontos do `VIS-08` que o L4 deixou para cá. GA4: 0 requisições. **Achado**: o banco local guarda `image_url` de seções da Home no Storage **hospedado**, e a primeira rodada fez GETs públicos de imagem lá (leitura anônima de arquivo, sem credencial nem escrita); da segunda rodada em diante `*.supabase.co` foi bloqueado por rota. Nenhuma requisição às APIs do hospedado. O log da function só traz `{"fn":"visit","desfecho":…}`. Ficaram fora, declarados: navegador interno do Instagram/WhatsApp em aparelho, gateway hospedado, Safari real. Store e backoffice remedidos depois da restauração, no gate de fecho (32).

---

### 30-backlog-e-decisao

**What**: `BL-046` (gráfico e Fat. do Mês na régua de dia de Brasília e venda paga) e `BL-047` (Pendentes conta pedido pago) no backlog — conferindo antes que são os próximos números livres; `AD-055` no `STATE.md` (texto da seção 11 do design) e o handoff da `71`: as cinco assunções `n — confirmar`, o texto do Apêndice A como pré-condição de deploy, a ordem de publicação (migration antes do bundle), o segundo canal de `orders` em `useAdminOrders.ts:99` e o `page_view` com `?nao-contar=1` como dívidas nomeadas, o defeito do GA4 entre abas (feature `61`) como observação.
**Where**: `.specs/BACKLOG.md`, `.specs/STATE.md`
**Depends on**: 27
**Reuses**: formato das entradas `BL-0NN` e `AD-0NN` existentes
**Requirement**: VIS-35 (registro da assunção), Success Criteria "cada divergência tem nome e número"

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] Os dois `BL` e o `AD-055` existem, sem reaproveitar número ocupado; o handoff lista cada pendência com quem decide (usuário, Adri, operação)
- [x] Nenhum guarda de string acusa a prosa nova (os textos ficam em `.specs/`, fora do escopo dos guardas)

**Tests**: none · **Gate**: build (no fecho, task 32)

**Status**: ✅ Concluída (2026-10-22). `.specs/BACKLOG.md`: `BL-046` (o gráfico e o "Fat. do Mês" em dia UTC, pedido criado, PIX pendente incluído e teto de 1.000 linhas) e `BL-047` ("Pendentes" conta pedido pago, e o `AlertsPanel` repete o número) — conferido antes que a última entrada era `BL-045`. `.specs/STATE.md`: `AD-055` (texto da seção 11 do design, com a inversão de `AVS-02` em *Supera*) e o handoff da `71` no topo da seção, com cada pendência e quem decide: o usuário (as cinco assunções `n — confirmar`), a Adri (o Apêndice A, pré-condição do deploy), a operação (migration antes do bundle, o `notice` do `pg_cron`, o contador parado até o DNS) e a medição em aparelho; dívidas nomeadas (o segundo canal de `orders` em `useAdminOrders.ts:99`, o `page_view` com o parâmetro); o defeito do GA4 entre abas (feature `61`) como observação. Os textos ficam em `.specs/`, fora do escopo dos guardas de string.

---

### 31-claude-md-dos-modulos

**What**: os `CLAUDE.md` dos módulos tocados: `apps/backoffice` (o bloco "Movimento da loja", a saída dos dois cards, o item do menu da conta, `useOrdersRealtime`), `apps/store` (o `VisitCounter`, o marcador por duração, a recusa, `?nao-contar`, a folha de cookies com Estatísticas sempre visível), `supabase` (a function `visit` com `verify_jwt = false`, o `_shared/rateLimit.ts`, as RPCs, o `pg_cron` da poda, a contagem de functions) e `packages/core` (os subpaths `./visits` e `./time`, e por que são folhas).
**Where**: `apps/backoffice/CLAUDE.md`, `apps/store/CLAUDE.md`, `supabase/CLAUDE.md`, `packages/core/CLAUDE.md`
**Depends on**: 29
**Reuses**: —
**Requirement**: documentação de fecho (`CLAUDE.md` raiz: "ao fechar uma feature, atualize o `CLAUDE.md` do módulo")

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] Cada módulo descreve o que mudou e o porquê, sem repetir regra que já mora no raiz
- [x] **Descrever a forma proibida, não escrevê-la**: nenhum texto novo carrega por extenso o literal do fuso, as chaves do armazenamento fora da lista do raiz, ou um import sem `.ts` — a suíte da loja segue verde depois da edição

**Tests**: none · **Gate**: build (no fecho, task 32)

**Status**: ✅ Concluída (2026-10-22). `apps/backoffice/CLAUDE.md`: seção "O Dashboard e o bloco Movimento da loja" (uma leitura sem argumento, distintos e não soma, três estados, quando relê e o timer por duração, o canal único, a saída dos cards de "hoje" como assunção pendente, `StatCard` aditivo, o ⓘ em Popover medido, a prova pela página real, o aviso sobre `marcacaoSoPorAcao`), o item "Abrir a loja sem contar" na tabela e na lista do menu da conta (com o espaço do nome acessível), e as baselines do app (testes 3644/206, lint 23/5). `apps/store/CLAUDE.md`: seção "O contador de visitas únicas" (montagem, agendamento e o ramo `readyState`, o marcador por duração, as chaves com dono, a trava, o envio cru com a chave publicável, a recusa na mesma ação, a releitura com `memoriaSemGravar`, "Estatísticas" sempre visível e o Apêndice A, `?nao-contar`, o Playwright recusado pelo filtro, o contador parado até o DNS). `supabase/CLAUDE.md`: a linha da `visit` na tabela e a seção dela (portões e log, `verify_jwt = false`, o dia no banco, o host no servidor, o teto por IP e o diário, `_shared/rateLimit.ts`, a tabela fechada e o `grant` explícito, a poda em três caminhos e o `pg_cron` condicional, `store_movement`, os probes), e a contagem de migrations (64). `packages/core/CLAUDE.md`: as linhas `./time` e `./visits` e a seção "folhas, e por que o DIA não mora aqui". **Nenhum texto novo escreve o nome do fuso por extenso**; as chaves de armazenamento aparecem só na lista do raiz; nenhum import sem `.ts` foi escrito. A suíte da loja foi remedida depois da edição: 5672/311, exit 0.

---

### 32-claude-md-raiz-e-baselines

**What**: o `CLAUDE.md` raiz: as chaves `estrelinha-visitor` e `estrelinha-nao-contar` em "Chaves em uso hoje"; a `71` no parágrafo de numeração ("A próxima é a `72`"); as linhas dos guardas novos na tabela; o parágrafo da feature na seção de baselines com o delta por workspace **medido**; a tabela de baselines (lint, tipos, testes) atualizada ao número medido.
**Where**: `CLAUDE.md`
**Depends on**: 30, 31
**Reuses**: o formato dos parágrafos de fecho das features `68`–`70`
**Requirement**: Success Criteria (chaves e numeração no raiz; gate "sem regressão" nos cinco workspaces, incluindo a suíte da loja; `payment/**` intocado)

**Tools**: MCP NONE · Skill NONE

**Done when**:
- [x] Build gate rodado e o resultado escrito: os cinco workspaces um por vez, exit code fora de pipe, `--testTimeout=20000` sem `--` nos dois apps; os três `tsc` em **0**; `pnpm lint` com a queda do painel anotada (e nenhum erro novo); `pnpm build` verde; `git diff --name-only -- packages/core/src/payment` vazio
- [x] O delta de cada workspace é contra a **entrada medida** antes da 01, com cada queda declarada e reaparecendo do outro lado (os casos movidos de `checkout` para `_shared`, se algum)
- [x] Os guardas da loja seguem verdes depois da edição (o raiz não carrega forma proibida por extenso fora do que já carregava)

**Tests**: none (documentação; o gate é o build) · **Gate**: build

**Status**: ✅ Concluída (2026-10-22). `CLAUDE.md` raiz: as duas chaves do contador em "Chaves em uso hoje" (com o dono e o guarda), a `71` no parágrafo de numeração ("A próxima é a `72`"), onze linhas novas na tabela dos guardas, o parágrafo da feature na seção de baselines (com o achado do guarda de RPCs e o da prova), a tabela de baselines (lint, testes), a pendência em *Estado conhecido* e a linha do Apêndice A em "O que espera decisão da dona".

**Gate de fecho (L5, build)** — 2026-10-22, um workspace por vez, exit code fora de pipe, `--testTimeout=20000` sem o `--` nos dois apps, contra a **entrada medida antes da 01** (`baseline.md`):

| Workspace | Entrada | Saída | Delta | Exit |
| --- | --- | --- | --- | --- |
| core | 3414/133 | **3507/138** | +93/+5 | 0 |
| functions | 890/19 | **952/21** | +62/+2 (`rateLimit` 7, `visit/handlers` 53, `wiringResolve` +2; os casos de limitador da `checkout` não caíram — ela reexporta) | 0 |
| store | 5350/299 | **5672/311** | +322/+12 | 0 |
| backoffice | 3511/199 | **3644/206** | +133/+7 | 0 |
| catalog-import | 512/23 | **512/23** | 0 | 0 |
| **Total** | **13677/673** | **14287/699** | **+610/+26** | |

Nenhuma queda em workspace nenhum. `tsc --noEmit`: `apps/store/tsconfig.app.json` 0 · `apps/backoffice/tsconfig.app.json` 0 · `apps/store/tsconfig.server.json` 0 · `tools/catalog-import/tsconfig.json` 0. `pnpm lint`: **25/7** — backoffice **23/5** (era 24/5: a queda é o `(sum, o: any)` que saiu com `revenueToday` na 27), store 2/2; nenhum erro novo. `pnpm build`: exit 0 (2 de 2). `git diff --name-only -- packages/core/src/payment` e `git status --porcelain -- packages/core/src/payment`: vazios. A suíte da loja foi rodada de novo depois da edição dos `CLAUDE.md`: 5672/311, exit 0. **Sem commit**: o usuário commita; o Verifier independente roda depois desta task.

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8
 └─────── L1 ──────┘ └─────── L2 ──────┘  L3      L4     └──── L5 ────┘

Fase 1:  01 ──→ 02 ──→ 03 ──→ 04
Fase 2:  05 ──→ 06 ──→ 07
Fase 3:  08 ──→ 09 ──→ 10 ──→ 11
Fase 4:  12 ──→ 13 ──→ 14
Fase 5:  15 ──→ 16 ──→ 17 ──→ 18 ──→ 19 ──→ 20
Fase 6:  21 ──→ 22 ──→ 23 ──→ 24 ──→ 25
Fase 7:  26 ──→ 27 ──→ 28
Fase 8:  29 ──→ 30 ──→ 31 ──→ 32
```

Execução estritamente sequencial (a ordem de execução acima respeita todas as dependências das
seções *Execution Plan*; as setas deste mapa são de **ordem**, não de dependência).

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| 01 | um módulo-folha (`core/time`): constante + dois formatadores | ✅ coeso |
| 02 | uma lista + uma função | ✅ |
| 03 | um contrato (três funções do mesmo corpo) | ✅ coeso |
| 04 | uma folha + barril + guarda de alcance | ⚠️ OK — o barril e o guarda existem por causa da folha |
| 05 | metade de gravação da migration + o guarda que a lê | ⚠️ OK — guarda co-localizado |
| 06 | metade de leitura da migration + réguas novas | ⚠️ OK — guarda co-localizado |
| 07 | probes de uma migration | ✅ |
| 08 | uma troca mecânica (4 imports de uma linha) + o guarda que a fixa | ⚠️ OK — uma regra, quatro leitores |
| 09 | um movimento de arquivo + reexport | ✅ |
| 10 | um handler | ✅ |
| 11 | wiring + config + probe servido | ✅ |
| 12 | um parágrafo | ✅ |
| 13 | o marcador (um arquivo) + o guarda de política que ele aciona | ⚠️ OK |
| 14 | o id (mesmo arquivo) + o guarda da chave | ⚠️ OK |
| 15 | uma função pura + guarda | ✅ |
| 16 | um envio + duas exportações que ele exige | ⚠️ OK — exportações sem outro consumidor |
| 17 | duas mudanças na mesma store | ✅ |
| 18 | uma folha | ✅ |
| 19 | um componente + montagem + guarda de montagem | ⚠️ OK |
| 20 | um efeito no mesmo componente | ✅ |
| 21 | um hook | ✅ |
| 22 | um hook + o tipo que ele devolve | ✅ |
| 23 | um módulo puro de textos | ✅ |
| 24 | um componente compartilhado | ✅ |
| 25 | um widget + guarda de literais | ✅ |
| 26 | uma página (e a remoção do canal duplicado, inseparável dela) | ✅ |
| 27 | uma remoção (hook + página acoplados pelo `tsc`) | ⚠️ OK — isolada por ser assunção pendente |
| 28 | um item de menu + guarda do parâmetro | ⚠️ OK |
| 29 | uma prova | ✅ |
| 30–32 | um documento (ou par de documentos) cada | ✅ |

Nenhuma ❌.

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama (*Execution Plan*) | Status |
| --- | --- | --- | --- |
| 01 | — | — | ✅ |
| 02 | — | — | ✅ |
| 03 | — | — | ✅ |
| 04 | 01, 02, 03 | 01, 02, 03 ──→ 04 | ✅ |
| 05 | 01 | 01 (F1) ──→ 05 | ✅ |
| 06 | 05 | 05 ──→ 06 | ✅ |
| 07 | 06 | 06 ──→ 07 | ✅ |
| 08 | 01 | 01 (F1) ──→ 08 | ✅ |
| 09 | — | — | ✅ |
| 10 | 02, 03, 09 | 02, 03 (F1) + 09 ──→ 10 | ✅ |
| 11 | 07, 10 | 07 (F2) + 10 ──→ 11 | ✅ |
| 12 | — | — | ✅ |
| 13 | 12 | 12 ──→ 13 | ✅ |
| 14 | 03, 13 | 13 ──→ 14 · 03 (F1) ──→ 14 | ✅ |
| 15 | 02 | 02 (F1) ──→ 15 | ✅ |
| 16 | 03 | 03 (F1) ──→ 16 | ✅ |
| 17 | 14 | 14 (F4) ──→ 17 | ✅ |
| 18 | 17 | 17 ──→ 18 | ✅ |
| 19 | 13, 14, 15, 16, 17 | 13, 14 (F4) + 15, 16, 17 ──→ 19 | ✅ |
| 20 | 04, 19 | 19 ──→ 20 · 04 (F1) ──→ 20 | ✅ |
| 21 | — | — | ✅ |
| 22 | 07 | 07 (F2) ──→ 22 | ✅ |
| 23 | 01, 22 | 01 (F1) + 22 ──→ 23 | ✅ |
| 24 | — | — | ✅ |
| 25 | 22, 23, 24 | 22, 23, 24 ──→ 25 | ✅ |
| 26 | 21, 25 | 21, 25 (F6) ──→ 26 | ✅ |
| 27 | 26 | 26 ──→ 27 | ✅ |
| 28 | 04, 20 | 04 (F1) + 20 (F5) ──→ 28 | ✅ |
| 29 | 11, 20, 27, 28 | 11 (F3) + 20 (F5) + 27, 28 (F7) ──→ 29 | ✅ |
| 30 | 27 | 27 (F7) ──→ 30 | ✅ |
| 31 | 29 | 29 ──→ 31 | ✅ |
| 32 | 30, 31 | 31 ──→ 32 · 30 ──→ 32 | ✅ |

Nenhuma dependência aponta para fase posterior.

## Test Co-location Validation

| Task | Camada criada/alterada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| 01–03 | regra pura em `core` | unit | unit | ✅ |
| 04 | regra pura + alcance Deno | unit + guarda | unit + guarda | ✅ |
| 05, 06 | migration SQL | guarda + probe | guarda (probe na 07) | ✅ — a migration só se prova inteira; o probe é **merge forward** para a 07, a primeira task em que ela é executável, e a 07 é a task seguinte da mesma fase |
| 07 | migration SQL | probe | probe | ✅ |
| 08 | guarda de dono único (+ consumidores) | guarda | guarda + suítes existentes | ✅ |
| 09, 10 | edge function `_shared`/`handlers.ts` | unit | unit (+ guarda na 09) | ✅ |
| 11 | `index.ts` + config | `wiringResolve` | guarda + probe | ✅ |
| 12 | página da loja | component | component | ✅ |
| 13, 14 | `shared/lib/visits` | unit (+ guardas) | unit + guarda | ✅ |
| 15, 16 | `shared/lib/visits` | unit | unit (+ guarda na 15) | ✅ |
| 17 | `entities/cookie-consent` | unit | unit | ✅ |
| 18 | `widgets/cookie-notice` | component | component | ✅ |
| 19, 20 | `app/` | component (+ guarda) | component + guarda | ✅ |
| 21, 22 | painel `entities` | unit | unit | ✅ |
| 23 | painel `widgets/model` (puro) | unit | unit | ✅ |
| 24, 25 | painel `shared/ui`, `widgets/ui` | component (+ guarda) | component + guarda | ✅ |
| 26, 27 | painel `pages` + `entities` | component + unit | component (+ unit na 27) | ✅ |
| 28 | painel `widgets` + guarda da loja | component + guarda | component + guarda | ✅ |
| 29 | layout / gateway | prova em navegador | prova em navegador | ✅ |
| 30–32 | documentação | none | none | ✅ |

## Requirement Traceability

| Requirement | Tasks |
| --- | --- |
| VIS-01 | 25, 26 |
| VIS-02 | 25 |
| VIS-03 | 05, 07 |
| VIS-04 | 22 |
| VIS-05 | 24, 25 |
| VIS-06 | 25 |
| VIS-07 | 23, 25, 29 |
| VIS-08 | 23, 24, 25, 29 |
| VIS-09 | 01, 23 |
| VIS-10 | 01, 21, 22, 23, 25, 26 |
| VIS-11 | 25 (proxy), 29 |
| VIS-12 | 03, 13, 14 |
| VIS-13 | 03, 11, 16 |
| VIS-14 | 05, 07, 10, 11 |
| VIS-15 | 06, 07 |
| VIS-16 | 13 |
| VIS-17 | 19, 29 |
| VIS-18 | 16, 19 |
| VIS-19 | 14 |
| VIS-20 | 14, 29 |
| VIS-21 | 03, 10 |
| VIS-22 | 15, 19 |
| VIS-23 | 02, 04, 10, 11 |
| VIS-24 | 14, 17, 19 |
| VIS-25 | 17, 19, 29 |
| VIS-26 | 18 |
| VIS-27 | 05, 09, 10 |
| VIS-28 | 05, 07 |
| VIS-29 | 10, 11 |
| VIS-30 | 05, 06, 07 |
| VIS-31 | 06, 07 |
| VIS-32 | 06, 07 |
| VIS-33 | 06, 07, 22 |
| VIS-34 | 01, 05, 06, 08 |
| VIS-35 | 27 *(assunção pendente)*, 30 |
| VIS-36 | 12 |
| VIS-37 | 13 |
| VIS-38 | 01, 23 |
| VIS-39 | 23, 25, 29 |
| VIS-40 | 01, 23 |
| VIS-41 | 25 |
| VIS-42 | 04, 14, 20, 28, 29 |
| VIS-43 | 28 |
| VIS-44 | 05, 06, 07, 23, 25 |

**Coverage:** 44 de 44 mapeados.

## Ferramentas

MCP: `playwright` só na 29. Skills: `supabase-postgres-best-practices` (05, 06), `supabase` (07, 11),
`playwright-cli` (29). Nenhuma task usa o projeto hospedado.

---

## Consertos da verificação r1

A rodada 1 da verificação independente (`validation.md`, 2026-10-22) reprovou a feature por
**cobertura** e por **um defeito raro confirmado** (G4). Cada lacuna foi consertada pela causa: nenhuma
asserção afrouxada, nenhum teste apagado. Para cada lacuna de cobertura, o mutante do verificador foi
**reinjetado no arquivo real** (arnês que lança quando o alvo não é encontrado, restaura e confere o
SHA-256) e **morreu por asserção** — nenhuma morte por compilação, e nas réguas do guarda de schema a
morte conferida é a da régua, não a do `mutar()` de um sensor que perdeu o alvo (lição candidata 5 da
r1). Nada de commit, stash ou push; banco só o local (54442).

| Id | AC | O que era | Conserto | Mutante reinjetado ⇒ quem mata |
| --- | --- | --- | --- | --- |
| **G1** | VIS-29 | `[functions.visit] verify_jwt = false` sem guarda (X01 passava em todas as suítes) | `visit/__tests__/handlers.test.ts`: lê o `config.toml` (CRLF normalizado), âncora (arquivo lido, `[functions.checkout]` presente, **uma** seção `[functions.visit]`), a régua `\[functions\.visit\]\s*\nverify_jwt = false` e três sensores (`true`, a linha ausente — padrão do CLI é `true` —, e o `false` de outra function não satisfazendo a régua). +5 | X01 (`verify_jwt = true` no `config.toml` real) ⇒ o caso da régua, `expected false to be true` |
| **G4** | VIS-24, VIS-42 | **DEFEITO**: a recusa que chegava com `ensureVisitorId()` esperando a trava deixava um id NOVO gravado; a segunda decisão só impedia a chamada | **A decisão passou para DENTRO da trava, antes de ler ou criar**: `ensureVisitorId(podeSeguir?)` chama `podeSeguir()` dentro do callback de `navigator.locks` (e no caminho sem trava), e recusado devolve `null` sem escrever nada — entre a decisão e a escrita não há `await`. O `VisitCounter` passa `() => podeChamar(cfg)` e mantém a segunda decisão antes da rede. Testes: a sonda R01 (`expect(marcador()?.id ?? null).toBeNull()`) no caso que já existia; id já guardado + recusa durante a trava ⇒ o id continua apagado e o prazo intacto; `?nao-contar=1` durante a trava ⇒ zero chamada e nenhum id; sensor (a mesma trava sem recusa cria e chama). Unidade (`visitor.test.ts`, +5): a decisão é perguntada só **depois** de a trava soltar; recusa durante a espera ⇒ `null`, nada gravado e `randomUUID` não roda; marcador já gravado não muda; sem trava, mesma regra; sensor liberado | R01 (o `VisitCounter` sem o `podeSeguir`) ⇒ 3 casos do componente; a linha `if (podeSeguir && !podeSeguir()) return null` apagada de `visitor.ts` ⇒ 7 casos (4 de unidade, 3 do componente) |
| **G2** | VIS-38, VIS-40 | `started_at` "uma vez" e `last_recorded_at` "a cada linha nova" sem prova (S19, S20) | `probes/visitas.sql`, fixtura `fixtura_instantes` (a `extra.sql` da r1, ampliada): A às 10h, B às 12h, A de novo às 14h ⇒ `started_at = 10h`, `last_recorded_at = 12h`, `store_movement` devolvendo os dois; e uma gravação nova às 11h não puxa `last_recorded_at` para trás (`greatest`). 17 → 25 `ok`. `visitasSchema.test.ts`: a cláusula `do update set` é **exatamente** `last_recorded_at = greatest(…)`; `started_at =` não aparece no corpo; o upsert mora dentro do `if found`; três sensores (S19, S20, S21 sem `greatest`) | S19, S20 e S21 no arquivo da migration ⇒ o probe (`PROBE FALHOU` na linha certa) **e** a régua do guarda |
| **G3** | VIS-03 / D5 | a fronteira EXATA de Ontem nas vendas sem fixtura (S10) | `probes/vendas.sql`, `savepoint fronteira`: pago às 03:00:00Z de 21/10 ⇒ Hoje 1, Ontem 0, Semana 1 (com a âncora `store_day(…) = 21/10` e o faturamento acompanhando), e o par 1 µs antes ⇒ Ontem. 15 → 19 `ok`. `visitasSchema.test.ts`: as seis expressões de período da consulta de pedidos — Hoje `>= v_ini_hoje` (2), Ontem `>= v_ini_ontem and < v_ini_hoje` (2), Semana `>= v_ini_semana` (2), e exatamente seis `filter` —, com sensores de S10 e de `>` em Hoje | S10 (as duas expressões, e também só a da soma) ⇒ o probe e a régua |
| **G5** | VIS-19 | o `VisitCounter` sem armazenamento que grava nunca era montado (V09) | `VisitCounter.test.tsx`: `setItem` lançando só para o marcador ⇒ zero `fetch` (nem na navegação seguinte) e marcador ausente; sem `crypto.randomUUID` ⇒ zero `fetch`; sensor (com os dois, o mesmo percurso chama uma vez) | V09 (`if (!id) return` apagado) ⇒ os dois casos novos |
| **G6** | VIS-22 | a espera pela leitura de `store_settings` não era discriminada: em `localhost` o host PADRÃO já recusava (V23) | `VisitCounter.test.tsx`: a página no host padrão (`umaestrelinha.com.br`, por `jsdom.reconfigure`, restaurado no `afterEach`), com âncora; leitura segurada ⇒ zero `fetch` e nenhum id; terminada com o host do banco igual ⇒ chama; terminada com o host **vazio** (contagem parada) ⇒ nenhuma chamada | V23 (`settingsLoaded: true`) ⇒ os dois casos novos |
| **P1** | VIS-12 | "o id não vai em outra requisição" só por leitura | guarda novo `apps/store/src/shared/lib/__tests__/idDoVisitanteSoNoEnvio.test.ts` (17): na PRODUÇÃO dos dois apps, fora de `shared/lib/visits`, só `app/VisitCounter.tsx` traz `ensureVisitorId`, `postVisit` ou `readMarker` (import nomeado, `type`, alias, `export … from`, namespace, `export *`, `import()`, barril, arquivo do módulo ou caminho relativo); metade positiva (o `VisitCounter` traz os três); dentro da pasta só `send.ts` faz rede; o `VisitCounter` não faz rede própria. Âncoras (arquivos lidos dos dois apps, produção sem testes, o consumidor legítimo `cookieConsentStore` enxergado pelo recorte de caminho e sem nenhum dos três nomes) e onze sensores, incluindo CRLF, comentário (CRLF e LF), o inverso de `forgetVisitorId`/`visitRefusal`, um `postVisit` de outro módulo e o alias `@/` do painel (outra pasta) | `readMarker` acrescentado ao import do `cookieConsentStore.ts` real ⇒ a régua; um `fetch` acrescentado a `visitor.ts` real ⇒ a régua da rede |
| **P2** | VIS-10 | a troca de "Hoje, 21/10" para "Hoje, 22/10" no instante `expira_em` provada só por composição | `StoreMovement.test.tsx`: o widget com o hook real e relógio falso — 1 ms antes de `expira_em` a tela diz "Hoje, 21/10" (uma leitura); no instante, "Hoje, 22/10" (duas), sem foco nem clique, e a aba Ontem diz "Ontem, 21/10". +1 | o widget guardando a PRIMEIRA leitura (`useState` com a primeira `data`) ⇒ só o caso novo — os 110 do bloco e do hook seguiam verdes, que é a medida exata da lacuna |
| **H1** | VIS-32 | a régua do ticket (`v_f_\w+ / v_n_\w+`) aceitava sufixos trocados; S08b só morria por um `mutar()` que perdia o alvo | backreference (`v_n_(\w+) … v_f_\1 / v_n_\1`), com sensores S08b (Hoje dividindo a soma da semana) e S08c (divisor de Ontem); e `periodoCasado`: cada objeto `'<p>', jsonb_build_object(…)` devolve visitas, vendas, faturamento e ticket **com o sufixo dele** — sensor do faturamento de Ontem lendo a semana, e do ticket de Hoje trocado inteiro pelo de Ontem (bem formado: a régua do ticket sozinha aprovaria) | S08b e a troca de faturamento de Ontem no arquivo da migration ⇒ as réguas do ticket e do período (não sensores) |
| **D1** | — | higiene de documento | cabeçalho deste arquivo atualizado; rastreabilidade da `spec.md` com os 44 mapeados e o status da r1; `StatCard.test.tsx` normalizado para LF (o diff contra o HEAD voltou a ser só as 89 linhas acrescentadas); o `VisitCounter.test.tsx` não imprime aviso de `act()` nem isolado nem na suíte completa da loja (os 8 avisos que restam são de outros arquivos, anteriores à `71`) | — |

> ⚠️ **A metade semântica do SQL depende dos probes, e eles NÃO rodam no CI** (declaração pedida
> por H1). O guarda `visitasSchema.test.ts` prende a **forma** do SQL; o **comportamento** — o pedido
> pago às 00:00, os instantes do contador, o ticket por período, os papéis, o teto e a corrida — só
> reprova rodando `probes/dia.sql`, `visitas.sql`, `vendas.sql`, `teto.sql`, `papeis.sql` e
> `concorrencia.sh` contra o banco local (`psql … -v ON_ERROR_STOP=1 -f <probe>`). **Rodar os seis
> antes de cada deploy que mexa na migration ou nas RPCs da `71`.** Registrado também no handoff da
> `STATE.md`.

**Probes depois dos consertos** (2026-10-22, banco local, todos em `begin … rollback`): `dia.sql` 9
`ok` · `visitas.sql` **25** · `vendas.sql` **19** · `teto.sql` 10 · `papeis.sql` 32, todos exit 0;
banco limpo depois (`store_visits` 0, `store_visit_counter` 0, nenhum pedido `PROBE-`/`VERIF-`). A
migration **não** mudou.

**Gates** (2026-10-22, um workspace por vez, `--testTimeout=20000` sem o `--`, exit code fora de pipe):

| Workspace | Antes (r1) | Depois | Delta | Exit |
| --- | --- | --- | --- | --- |
| core | 3507/138 | 3507/138 | 0 (não tocado) | 0 |
| functions | 952/21 | **957/21** | +5 | 0 |
| store | 5672/311 | **5717/312** | +45/+1 | 0 |
| backoffice | 3644/206 | **3645/206** | +1 | 0 |
| catalog-import | 512/23 | 512/23 | 0 | 0 |
| **Total** | 14287/699 | **14338/700** | **+51/+1** | |

`tsc` 0 em `apps/store/tsconfig.app.json`, `apps/backoffice/tsconfig.app.json` e
`apps/store/tsconfig.server.json`. Lint **25/7** (backoffice 23/5 · store 2/2), sem mudança; os
arquivos tocados nos dois apps passam no ESLint sem aviso (`supabase/` não tem lint). `packages/core/src/payment/**` intocado.

**Arquivos tocados pelos consertos**: `apps/store/src/shared/lib/visits/visitor.ts`,
`apps/store/src/app/VisitCounter.tsx` (produção — G4); `apps/store/src/app/__tests__/VisitCounter.test.tsx`,
`apps/store/src/shared/lib/visits/__tests__/visitor.test.ts`,
`apps/store/src/shared/lib/__tests__/visitasSchema.test.ts`,
`apps/store/src/shared/lib/__tests__/idDoVisitanteSoNoEnvio.test.ts` (novo),
`supabase/functions/visit/__tests__/handlers.test.ts`,
`apps/backoffice/src/widgets/store-movement/ui/__tests__/StoreMovement.test.tsx`,
`apps/backoffice/src/shared/ui/StatCard.test.tsx` (só fim de linha); `probes/visitas.sql`,
`probes/vendas.sql`; este arquivo, a `spec.md`, a `STATE.md`, o `CLAUDE.md` raiz e o
`apps/backoffice/CLAUDE.md` (baselines).

**Lições candidatas** (para o `validation.md` da r2, não pelo `lessons.py`):

1. **Uma decisão refeita depois de uma espera tem de morar onde o EFEITO acontece, não onde a ação
   sai.** Decidir de novo depois da trava impedia a chamada; só decidir dentro dela, sem `await` até
   a escrita, impede o código de nascer. *(G4)*
2. **Ampliar a régua do guarda para "o mesmo sufixo dos dois lados" não basta: o bloco inteiro
   trocado continua bem formado.** A regra "cada período devolve as variáveis dele" é a que pega a
   troca de período — a do ticket sozinha aprovava. *(H1)*
3. **Para provar "espera a configuração", a fixtura precisa de um mundo em que o PADRÃO liberaria** —
   no jsdom, `jsdom.reconfigure({ url })` muda o host da página sem dublar `window.location` (que é
   não configurável). *(G6)*

## Consertos da verificação r2

A rodada 2 da verificação independente (`validation.md`, 2026-10-22) reprovou a feature por
**cobertura**, com duas lacunas e nenhum defeito de produto: o código estava certo nos dois pontos, e
faltava a prova. As duas foram fechadas pela causa: nenhuma asserção afrouxada, nenhum teste apagado,
**nenhuma linha de produção alterada** (a migration e o `VisitCounter.tsx` saem desta rodada como
entraram). Os mutantes do verificador foram **reinjetados no arquivo real**, com um arnês que lança
quando o alvo não aparece exatamente uma vez, restaura e confere o SHA-256, e **morreram por
asserção**. Nada de commit, stash ou push; banco só o local (54442).

| Id | AC | O que era | Conserto | Mutante reinjetado ⇒ quem mata |
| --- | --- | --- | --- | --- |
| **G7** | VIS-33 (dado de VIS-38/VIS-40) | `contagem_desde_dia` e `ultima_visita_dia` sem fixtura entre 21h e 24h de Brasília, quando o dia de Brasília difere do dia em UTC. O guarda conferia só o NOME dos campos, e a fixtura do G2 gravava às 10h/12h UTC, quando `store_day(x)` e `x::date` escrevem o mesmo texto (S24 e S25 sobreviviam) | `probes/visitas.sql`, `savepoint fixtura_dias_do_contador` (a `dias-do-contador.sql` do verificador, com duas âncoras a mais): sessão em `UTC`, primeira visita às 02:59:59Z de 21/10 (23h59:59 de 20/10 em Brasília) e última às 01:30Z de 22/10 (22h30 de 21/10), cada uma conferida no `dia` que `record_store_visit` devolve; lido às 03:30Z ⇒ `contagem_desde_dia = 2026-10-20` e `ultima_visita_dia = 2026-10-21`. 25 → **31** `ok`. `visitasSchema.test.ts`, bloco novo: uma régua por campo (`'contagem_desde_dia', public.store_day(v_inicio)::text` e `'ultima_visita_dia', public.store_day(v_ultima)::text`), mais a régua geral **nenhum `::date` fora do bloco de `store_day`** (com âncora de que o dono tem o dele), e quatro sensores: S24, S25, os dois campos trocando de variável (o dia certo do instante errado) e `date(v_inicio)` sem `::`. +8 | S24 (`v_inicio::date::text`) e S25 (`v_ultima::date::text`) no arquivo da migration ⇒ a régua do campo **e** a régua do `::date` (não só os sensores que perdem o alvo), e o probe na linha certa: `PROBE FALHOU: contagem_desde_dia = 20/10 …` (S24) e `PROBE FALHOU: ultima_visita_dia = 21/10 …` (S25) |
| **G8** | VIS-24, VIS-25 | a decisão de dentro da trava (`podeChamar`, que relê o armazenamento) sem prova de que relê: os quatro casos do G4 recusavam na MESMA aba, onde a memória muda na hora (N3 sobrevivia à suíte inteira da loja) | `VisitCounter.test.tsx`, no bloco `VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera` (a sonda R2-N3 do verificador): trava segurada; âncora de que esta aba ainda tem o aceite em memória; a outra aba grava `{v:1, notice:'answered', statistics:false}` em `COOKIE_CONSENT_KEY` sem evento; a trava solta ⇒ `fetch` não chamado **e** `marcador()?.id ?? null` nulo. O sensor que já existia no bloco (a mesma trava sem recusa cria e chama) cobre o inverso. +1 | N3 (`VisitCounter.tsx:82`, `() => podeChamar(cfg)` → `() => visitRefusal(contexto(cfg)) === null`) ⇒ **só** o caso novo, `expected '4dbc2f33-…' to be null` — os 40 outros seguem verdes, que é a medida exata da lacuna |

**A observação X02 do verificador não foi consertada, de propósito**: a decisão de rede depois da
trava (`VisitCounter.tsx:85`) só se distingue num modelo de trava que resolve num passo seguinte ao
callback, que nenhum navegador implementa. A linha fica como defesa barata, e o comentário dela já
diz que é "a última palavra".

**Probes depois dos consertos** (2026-10-22, banco local, todos em `begin … rollback`): `dia.sql` 9
`ok` · `visitas.sql` **31** · `vendas.sql` 19 · `teto.sql` 10 · `papeis.sql` 32, todos exit 0;
banco limpo depois (`store_visits` 0, `store_visit_counter` 0). A migration **não** mudou.

**Gates** (2026-10-22, `--testTimeout=20000` sem o `--`, exit code fora de pipe). Só a loja foi
tocada (dois arquivos de teste) — os outros quatro workspaces não foram tocados nem remedidos nesta
rodada, e a linha deles é a da r1:

| Workspace | Antes (r2) | Depois | Delta | Exit |
| --- | --- | --- | --- | --- |
| store | 5717/312 | **5726/312** | +9 | 0 |
| core · functions · backoffice · catalog-import | 3507/138 · 957/21 · 3645/206 · 512/23 | idem | 0 (não tocados) | — |
| **Total** | 14338/700 | **14347/700** | **+9** | |

`tsc` 0 em `apps/store/tsconfig.app.json` e `apps/store/tsconfig.server.json`; os dois arquivos
tocados passam no ESLint sem aviso.

**Arquivos tocados pelos consertos**: `apps/store/src/shared/lib/__tests__/visitasSchema.test.ts`,
`apps/store/src/app/__tests__/VisitCounter.test.tsx`, `probes/visitas.sql` e este arquivo.

**Lições candidatas** (para o `validation.md`, não pelo `lessons.py`):

1. **Uma fixtura de fuso tem de cair na faixa em que os fusos DISCORDAM.** Às 10h e às 12h UTC o dia
   de Brasília e o dia em UTC são o mesmo, e `store_day(x)` e `x::date` escrevem o mesmo texto: a
   fixtura prova o campo e é cega à regra que o campo existe para carregar. Para Brasília (UTC−3),
   a faixa é 21h–24h locais, e a sessão do probe precisa estar em UTC. *(G7)*
2. **Régua que confere o NOME do campo não confere o valor.** A lista de campos da resposta passava
   com qualquer expressão ao lado do nome; a régua que fecha a lacuna nomeia a expressão — e a régua
   geral ("nenhum `::date` fora do dono") pega a próxima simplificação em qualquer outro campo. *(G7)*
3. **Para provar que uma decisão RELÊ o armazenamento, a mudança tem de vir de onde só o
   armazenamento vê.** Recusar na mesma aba muda a memória e o armazenamento juntos, e uma decisão
   que só lê a memória também recusa: a prova verdadeira nos dois mundos. A recusa da outra aba,
   gravada sem evento, é o único estímulo que separa os dois. *(G8)*
