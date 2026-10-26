# 74 — mobile-adm: Pedidos — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination
sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Commits — regra do projeto, acima da Skill** (`CLAUDE.md` raiz, `BL-012`): **sem** commit por
> task. Os commits saem juntos no fim, **no branch `feat/74-mobile-adm-pedidos`**, e só quando o
> usuário pedir. Sub-agentes não fazem commit nem `git stash`.
>
> **Worktree**: tudo em `/Users/rafael.santos/Projetos/uma-estrelinha/store-74-mobile-adm-pedidos`,
> por caminho absoluto. Nunca editar o repositório principal.
>
> **Merge** (`AD-056`): finalizada e testada (tasks concluídas, Verificador com PASS, gates sem
> regressão, QA, prova em navegador escrita), a branch é mergeada em **`feature/mobile-adm`**.
>
> **Banco**: só o local (`supabase migration up --local`, faixa 54440–54449). **Nunca**
> `supabase stop --all`, `db push` ou `secrets set`. Probes em `begin … rollback` ou com fixturas
> identificadas e apagadas no fim. Portas 8082–8084 são de outras sessões: a prova em navegador usa
> `vite preview` numa porta livre.
>
> **O Design manda com as emendas do §13** (E1–E8). Onde o texto das seções anteriores diverge, vale o
> §13: **não existe `ATELIE_CLOCK_RPC`** (E1), `lerComPapel` usa `Promise.allSettled` (E2), o anexar é
> descartado por **geração** (E3), a sentinela se rearma (E4), o `h1` existe em todo estado (E5), a
> troca de conta faz `queryClient.clear()` (E6), o "Voltar" decide por `state.doApp` (E7), e o guarda
> de predicado não acusa filtro de identidade (E8).

---

**Spec**: `.specs/features/74-mobile-adm-pedidos/spec.md` · **Design**: `design.md` (abordagem B,
`AD-058`, emendas §13)
**Status**: Aprovado no gate de Tasks (2026-10-23), com as emendas TE1–TE9 do fim do arquivo — elas valem como parte do "Done when" de cada task citada

---

## Test Coverage Matrix

> Gerado do código, do `CLAUDE.md` raiz (*Baselines*, *Os guardas*, *Mobile é o caso principal*,
> *O defeito 01*), de `apps/mobile-adm/CLAUDE.md`, `apps/backoffice/CLAUDE.md`,
> `packages/core/CLAUDE.md`, dos `vitest.config.ts` e do `tasks.md` da `73` (molde). Lições:
> `L-030`, `L-033`, `L-043`, `L-054`, `L-055`, `L-059`, `L-060`, `L-061`, `L-063`; memórias "dublê que
> não enxerga", "teste não monta a árvore que prova", "mutante que morre por compilação".

| Camada | Tipo | Expectativa | Onde | Comando |
| --- | --- | --- | --- | --- |
| Regra pura de `core` (`orders/*`, `material/steps.ts`) | unit | todo ramo; 1:1 com as ACs; cada edge case da spec; **frase byte a byte a do painel** (`MAP-48`) lida do disco do painel **antes** de apagá-la; especificador relativo com `.ts` | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Reexportação do painel | guarda `toBe` + a suíte existente **sem asserção tocada** | cada símbolo de §2.2 é a mesma referência; sensor com cópia de valor igual reprova | `apps/backoffice/src/entities/order/api/__tests__` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Migration (`atelie_clock`) | guarda de fonte | uma régua **por comando** (`L-033`), âncora, `mutar()` que lança | `apps/store/src/shared/lib/__tests__` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| SQL e PostgREST semânticos | probe contra o banco local | `01-relogio`, `02-lista` (os três `or=`, seis visões, quatro blocos, a busca, a paginação com `insert` no meio, µs), `03-cliente-sem-papel` | `.specs/features/74-mobile-adm-pedidos/probes/` | `psql` em `54442` / `curl` em `54441` |
| Hooks de leitura do app (`lerComPapel`, `useListaDePedidos`, `usePedido`) | unit (`renderHook` + `fakeSupabase` que **registra a cadeia**) **e** integração com `clientReal.ts` | a cadeia inteira igual à de `core` (`L-060`); recusa vence; geração; janela; falha por bloco; pendura por leitura | `apps/mobile-adm/src/entities/order/api/__tests__` | `pnpm --filter @estrelinha/mobile-adm test` |
| Widgets / páginas do app | componente (RTL + jsdom) montando o **`<App />` real** por `montarApp` | caminho feliz + cada edge case + os três estados por leitura + `h1` em todo estado + `motion-reduce:` | `apps/mobile-adm/src/**/__tests__/*.test.tsx` | idem |
| Guardas do app (endereço, leitura com papel, regra no core, abas, rotas, movimento) | guarda de fonte (AST onde a régua é de uso) | âncora dupla, sensores CRLF/LF/glob e o inverso | `apps/mobile-adm/src/**/__tests__` | idem |
| Layout em 360/390/412, fonte 130 %/200 %, sentinela real, voltar | navegador real | **não alcançável por jsdom** | `prova-navegador.md` | Playwright no build servido |

## Gate Check Commands

| Nível | Quando | Comando |
| --- | --- | --- |
| Quick | task só de `core` ou só do app, sem arquivo novo fora dele | o workspace tocado |
| Full | **toda task que cria ou move arquivo em `apps/**` ou `packages/**`** (os guardas da loja varrem `apps/**` e `packages/**`: `situacaoComDonoUnico`, `marcacaoSoPorAcao`, `brandScan`, `fusoComDonoUnico`, `notificationSingleOwner`…) | core + mobile-adm + **store** + backoffice, **um por vez**, `pnpm --filter @estrelinha/<w> test --testTimeout=20000` (**sem o `--`**), **exit code fora de pipe** |
| Build | fim de fase | Full + `npx tsc --noEmit -p` em `apps/{mobile-adm,store,backoffice}/tsconfig.app.json`, `apps/mobile-adm/tsconfig.node.json` e `packages/core/tsconfig.json` (11 herdados, nenhum novo) + `npx eslint .` em mobile-adm, backoffice e store + `pnpm --filter @estrelinha/mobile-adm build` |

Baseline: **medida na T01 com a árvore parada** (a linha do `CLAUDE.md` raiz é 15184/756; a entrada
real é a do disco no `775e407e`).

---

## Execution Plan

```
Fase 1 (entrada e core):    T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08
Fase 2 (banco e leitura):   T09 → T10 → T11 → T12 → T13 → T14 → T15
Fase 3 (a lista):           T16 → T17 → T18 → T19 → T20 → T21
Fase 4 (detalhe e fiação):  T22 → T23 → T24 → T25 → T26 → T27 → T28
Fase 5 (fecho):             T29 → T30 → T31
                            → Verificador independente (sempre) → QA (qa-report + qa-execution)
```

Lotes para sub-agentes (~7 tasks, fases inteiras): **Lote 1** = Fase 1 (T01–T08) · **Lote 2** =
Fase 2 (T09–T15) · **Lote 3** = Fase 3 (T16–T21) · **Lote 4** = Fases 4–5 (T22–T31; a Fase 5 é curta
e depende de tudo — pode virar o **Lote 5** se o Lote 4 passar de 7 no orçamento de contexto).

---

## Tasks

### Fase 1 — entrada e as regras em `core`

> **Execução (2026-10-23)**: T01–T08 feitas. Entre as tasks rodou o gate do workspace tocado (core `src/orders` + `src/material`, e o recorte do painel `src/entities`, `features/order-list`, `features/order-detail`); o **Full + Build** rodou uma vez, no fim da fase (T08), com os quatro workspaces um por vez. Nenhuma task da fase criou arquivo em `apps/mobile-adm` ou na loja, e a suíte da loja fechou idêntica (5815/317).

### T01 — `01-baseline-e-medicao`
- **What**: medir as seis suítes com a árvore parada em `baseline.md` (contagem, arquivos, exit code),
  `tsc` dos cinco projetos + `packages/core` (11 herdados), lint dos três apps; e medir no banco
  local quantos pedidos existem por visão e por bloco (`store_overview.fila`), para os probes.
- **Where**: `.specs/features/74-mobile-adm-pedidos/baseline.md`
- **Depends on**: —
- **Done when**: `baseline.md` com os seis números e exit codes (um workspace por vez, fora de pipe),
  os tipos e o lint; divergência contra a linha do `CLAUDE.md` raiz **declarada**, não corrigida em
  silêncio.
- **Reqs**: — (gate de "sem regressão").
- **Tests**: none (medição) · **Gate**: —
- **Status**: ✅ Feito (2026-10-23). `baseline.md`: seis suítes 15184/756 com exit 0 (bate o `CLAUDE.md` raiz), tipos 0 nos seis projetos + 11 herdados em `core`, lint 25/7; e a seção *Banco local*: 18 · 0 · 1 · 0 nos quatro blocos, 19 · 54 · 19 · 12 · 4 · 25 nas seis visões, contados com `toSqlPredicate`/`needsActionSqlPredicate`. Dois blocos em zero ⇒ a T10 precisa de fixturas que os povoem.

### T02 — `02-tom-e-rotulos-de-pagamento-em-core`
- **What**: `SituationTone` muda de `situation.ts` para `labels.ts` (com reexport em `situation.ts`,
  R5); `PAYMENT_METHOD_LABELS` sobe de `orderQuery.ts` para `core/orders/labels.ts`; nasce
  `PAYMENT_STATUS_TONES` (A15: pending `wait`, approved `done`, rejected `alert`, refunded `neutral`,
  expired `neutral`, cancelled `alert`). O painel reexporta `PAYMENT_METHOD_LABELS` no mesmo arquivo.
- **Where**: `packages/core/src/orders/{labels,situation,index}.ts`;
  `apps/backoffice/src/entities/order/api/orderQuery.ts`
- **Depends on**: T01
- **Reuses**: `ORDER_PAYMENT_STATUS_LABELS` (mesmo arquivo)
- **Done when**: `PAYMENT_STATUS_TONES` exaustivo (um tom por `AdminPaymentStatus`, tipo `Record`);
  os rótulos de meio iguais **byte a byte** aos do painel (lidos do disco antes da troca); o painel
  reexporta por referência; `purity.test.ts` verde; suíte do painel **sem asserção tocada**; Full gate.
- **Reqs**: `MAP-25` (tom e meio), `MAP-47`, `MAP-48`, `MAP-50`.
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feito. `SituationTone` em `labels.ts` com `export type { SituationTone }` em `situation.ts`; `PAYMENT_METHOD_LABELS` e `PAYMENT_STATUS_TONES` em `labels.ts` e no barril; o painel reexporta (`orderQuery.ts`). Prova: `core/orders/__tests__/paymentLabels.test.ts` (10 casos: as quatro palavras byte a byte as do painel no `775e407e`, os seis tons de A15, exaustividade contra `ORDER_PAYMENT_STATUS_LABELS`); identidade em `regrasDoPedidoNoCore.test.ts`. Mutante M15 (`refunded` ⇒ `alert`) morto por asserção.

### T03 — `03-visoes-busca-e-recorte-em-core`
- **What**: `core/orders/views.ts` (`OrderViewId`, `ORDER_VIEWS`, `ViewPredicate`, `viewPredicate`,
  `MATERIAL_QUEUE_STATES`, `OrderSlice`, `DEFAULT_ORDER_SLICE`, `SliceBuilder`, `applyOrderSlice`) e
  `core/orders/search.ts` (`ORDER_SEARCH_COLUMNS`, `buildOrderSearchCondition`, `SEARCH_DEBOUNCE_MS`),
  movidos byte a byte de `orderQuery.ts`; o painel reexporta.
- **Where**: `packages/core/src/orders/{views,search,index}.ts` + testes;
  `apps/backoffice/src/entities/order/api/orderQuery.ts`
- **Depends on**: T02
- **Reuses**: `queue.ts` (`queueBlock`, `toPostgrestFilter`, `needsActionOrFilter`),
  `paging/pageMath.ts` (`escapeSearchTerm`), `format.ts` (`stripOrderNumberPrefix`)
- **Done when**: as seis visões na ordem e com os rótulos de `MAP-07`; `applyOrderSlice` com um
  builder registrador produz, para cada visão, a **mesma sequência** que o `applyView` do painel (lida
  com o mesmo registrador) e, para cada bloco, `or(toPostgrestFilter(queueBlock(id).rule))`;
  `buildOrderSearchCondition` com `#0244`/`0244`/`244`, só espaços ⇒ `null`, `,()` viram espaço
  (`MAP-12`); relativos com `.ts`; painel sem asserção tocada; Full gate.
- **Reqs**: `MAP-01`, `MAP-02`, `MAP-03` (padrão), `MAP-07`, `MAP-10`, `MAP-11` (constante), `MAP-12`,
  `MAP-47`, `MAP-48`, `MAP-50`.
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feito. `core/orders/views.ts` (visões, `viewPredicate`, `MATERIAL_QUEUE_STATES`, `OrderSlice`, `DEFAULT_ORDER_SLICE`, `SliceBuilder`, `isBlockSlice`, `applyOrderSlice`) e `search.ts`, byte a byte; o painel reexporta. Prova: `views.test.ts` (23, cadeia registrada por visão e por bloco, bloco ≠ visão de nome parecido) e `search.test.ts` (5: `#0244`/`0244`/`244`, só espaços ⇒ `null`, `,()` ⇒ espaço, 300 ms). **Endereço novo de um guarda da `73`**: `core/orders/__tests__/queue.test.ts` exigia `const PRECISA_ACAO_OR = needsActionOrFilter()` no `orderQuery.ts` do painel; a régua passou a ler `views.ts` e GANHOU vizinhas (o painel não declara o predicado, reexporta `viewPredicate` de `core`, e continua sem o vocabulário da fila à mão). Mutantes M01–M04 mortos.

### T04 — `04-a-linha-em-core`
- **What**: `core/orders/row.ts` (`purchaseOrdinalLabel`, `queueSince`, `rowQueueAge`, entrada
  estrutural) e `core/orders/rowSummary.ts` (`rowSummary`, `RowSummary`, `PrimaryActionId`,
  `RowSummaryInput`), movidos byte a byte; o arquivo do painel vira reexportação.
- **Where**: `packages/core/src/orders/{row,rowSummary,index}.ts` + testes;
  `apps/backoffice/src/entities/order/api/orderQuery.ts`,
  `apps/backoffice/src/features/order-list/model/rowSummary.ts`
- **Depends on**: T03
- **Done when**: cada frase de `rowSummary` igual à do painel (lida do disco antes da troca);
  `blocker` vazio em `delivered`/`cancelled`; o ordinal sem valor válido ⇒ só o tempo (`MAP-16`);
  `queueSince` por `material_received_at`/`created_at` conforme o estado; painel sem asserção tocada;
  Full gate.
- **Reqs**: `MAP-16`, `MAP-17`, `MAP-47`, `MAP-48`, `MAP-50`.
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feito. `core/orders/row.ts` (`queueSince`, `rowQueueAge`, `purchaseOrdinalLabel`, `RowQueueInput`) e `rowSummary.ts` (`RowSummaryInput` estrutural); `features/order-list/model/rowSummary.ts` virou reexportação, e `orderQuery.ts` reexporta as três de `row.ts`. Prova: `row.test.ts` (12) e `rowSummary.test.ts` (12: as oito frases copiadas do disco do painel, `delivered`/`cancelled` vazios, o material antes do status). Mutantes M07 e M17 mortos em core **e** no painel (`orderList.test.ts`).

### T05 — `05-proximo-passo-historico-e-entrega-em-core`
- **What**: `core/orders/nextStep.ts` (`nextStep`, `NextStep`, `PICKUP_DONE_ACTION`,
  `NextStepInput`) e `core/orders/history.ts` (`buildHistory`, `HistoryEvent`, `HistoryKind`, as
  três entradas estruturais), movidos byte a byte; `HISTORY_FILTERS`/`filterHistory` **ficam** no
  painel. Nasce `core/orders/delivery.ts` (`shippingLine`, `MAP-26`/`MAP-27`).
- **Where**: `packages/core/src/orders/{nextStep,history,delivery,index}.ts` + testes;
  `apps/backoffice/src/features/order-detail/model/{nextStep,history}.ts`
- **Depends on**: T04
- **Reuses**: `ORDER_STATUS_LABELS`, `NOTIFICATION_EVENT_LABELS`, `isPickupOrder`
- **Done when**: `label`/`blockedReason`/histórico iguais aos do painel em todos os estados (lidos do
  disco antes da troca), inclusive "Pedido cancelado", retirada e e-mail que falhou ("A cliente NÃO
  foi avisada"); `shippingLine` nas quatro frases de `MAP-26` e `null` na retirada; o histórico do
  mais recente para o mais antigo com as notas; painel sem asserção tocada; Full gate.
- **Reqs**: `MAP-21`, `MAP-26`, `MAP-27`, `MAP-28`, `MAP-47`, `MAP-48`, `MAP-50`.
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feito. `core/orders/nextStep.ts` (`NextStepInput` com os campos opcionais que o `DbOrder` do painel tem opcionais), `history.ts` (`buildHistory` genérica nas três entradas, para o painel passar as linhas com `order_id` sem excesso de propriedade) e `delivery.ts` (`shippingLine`); `HISTORY_FILTERS`/`filterHistory` ficaram no painel. Prova: `nextStep.test.ts` (11), `history.test.ts` (8: "A cliente NÃO foi avisada", WhatsApp na 2ª tentativa, evento fora do vocabulário, notas, ordem decrescente) e `delivery.test.ts` (8, inclusive retirada ⇒ `null` com código). Mutantes M08, M09, M14 mortos (M08/M09 também no painel).

### T06 — `06-a-lista-em-core`
- **What**: `core/orders/list.ts`: `sliceOrder`, `cursorFilter`, `OrderCursor`, `ORDER_PAGE_SIZE = 25`,
  `listCountLine`, `emptyHint`, `EMPTY_TITLE`, `isOrderId`. **Sem `ATELIE_CLOCK_RPC`** (E1). O painel
  passa a ler `pageSize: ORDER_PAGE_SIZE` em `defaultOrderQuery`.
- **Where**: `packages/core/src/orders/{list,index}.ts` + teste; `orderQuery.ts` do painel
- **Depends on**: T05
- **Done when**: `sliceOrder` `asc` em "Precisa de ação" e em todo bloco, `desc` no resto (`MAP-08`);
  `cursorFilter` com a **string crua** (µs, aspas duplas), `gt`/`lt` por direção, e um caso que prova
  que passar por `Date` mudaria o valor (R1); as frases de `MAP-08`/`MAP-09` com singular/plural e
  termo; `isOrderId` recusa não-uuid; painel sem asserção tocada; Full gate.
- **Reqs**: `MAP-08`, `MAP-09`, `MAP-13`, `MAP-14`, `MAP-29` (`isOrderId`), `MAP-50`.
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feito. `core/orders/list.ts` (`ORDER_PAGE_SIZE`, `sliceOrder`, `OrderCursor`, `cursorFilter`, `EMPTY_TITLE`, `listCountLine` — `null` com zero, `MAP-09` —, `emptyHint`, `isOrderId`), sem `ATELIE_CLOCK_RPC` (E1); `defaultOrderQuery` do painel lê `pageSize: ORDER_PAGE_SIZE`. Prova: `list.test.ts` (35, inclusive o caso R1: `new Date(…).toISOString()` muda o cursor). Mutantes M05, M06, M12, M16 mortos.

### T07 — `07-passos-do-material-em-core`
- **What**: `core/material/steps.ts` (`MATERIAL_STEPS`, `materialProgress`, `materialSubline`,
  `MATERIAL_USED_TITLE`) + `export * from './steps.ts'` no barril; guarda `stepsDenoReach.test.ts`.
- **Where**: `packages/core/src/material/{steps,index}.ts`, `material/__tests__/{steps,stepsDenoReach}.test.ts`
- **Depends on**: T06
- **Done when**: os quatro passos de A22 com `feito`/`atual`/`depois` para cada `material_status`; os
  quatro feitos e "Material usado na joia" com `shipped`/`delivered`; `materialSubline` nas três
  formas de A23 contra um `agora` injetado; o guarda recusa import de pacote e relativo sem `.ts`, com
  sensor; Quick gate (core) + store (o `brandScan`/`fusoComDonoUnico` varrem `packages/`).
- **Reqs**: `MAP-23`, `MAP-50`.
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feito. `core/material/steps.ts` (`MATERIAL_STEPS`, `materialProgress` ⇒ `{ titulo, passos }` ou `null` em `nao_aplicavel`, `materialSubline(o, agora)` sobre `relativeAge`, `MATERIAL_USED_TITLE`) e `export * from './steps.ts'`. Prova: `steps.test.ts` (16) e `stepsDenoReach.test.ts` (6: grafo `steps → material`, `stats/labels → time/zone`, com sensores de `import type` sem `.ts`, de pacote e do removedor de comentário). Mutantes M11 e M13 mortos. Gate full (Q-T1).

### T08 — `08-painel-delega-e-guarda-de-referencia`
- **What**: `applyView` de `useAdminOrderList.ts` passa a delegar a `applyOrderSlice` (mesma ordem de
  chamadas); `regrasDoPedidoNoCore.test.ts` prova `toBe` para todo símbolo de §2.2; `purity.test.ts`
  de `core/orders` lista os oito arquivos novos e o piso sobe para `≥ 16`.
- **Where**: `apps/backoffice/src/entities/order/api/useAdminOrderList.ts`,
  `apps/backoffice/src/entities/order/api/__tests__/regrasDoPedidoNoCore.test.ts`,
  `packages/core/src/orders/__tests__/purity.test.ts`
- **Depends on**: T07
- **Done when**: `useAdminOrderList.test.ts` verde **sem asserção tocada** (ele registra a cadeia);
  `regrasDoPedidoNoCore` com lista literal e sensor de cópia de valor igual que reprova; mutante que
  inverte `.or`/`.in` em `applyOrderSlice` morre por asserção no painel; Build gate (fim da Fase 1).
- **Reqs**: `MAP-47`, `MAP-50`, `MAP-51` (G-MAP51: `filterChips.ts` intocado, conferido por diff).
- **Tests**: unit + guarda · **Gate**: build
- **Status**: ✅ Feito. `applyView` de `useAdminOrderList.ts` delega a `applyOrderSlice`; `purity.test.ts` lista os oito arquivos novos com piso `≥ 16`; guarda `regrasDoPedidoNoCore.test.ts` (20 casos: 17 caminhos literais com `toBe`, os filtros do histórico ficando no painel, sensor de cópia). **Dois desvios declarados**: (1) o guarda mora em `apps/backoffice/src/app/__tests__/` e não em `entities/order/api/__tests__` — de `entities` o import de `features` é fronteira FSD ao contrário e o lint do painel subiria de 23/5 para 23/10; (2) a premissa "`useAdminOrderList.test.ts` registra a cadeia" era verdadeira só para a consulta da idade: os mutantes M01/M02/M04/M18 **sobreviveram** na suíte do painel na primeira rodada. Acrescentei ao arquivo um `describe` novo com dois casos (a cadeia da lista em "Precisa de ação" e a das seis contagens de aba, escritas por extenso); nenhuma asserção existente tocada (só as duas linhas de import ganharam nomes). Depois disso os quatro morrem por asserção no painel. `filterChips.ts` intocado (`git diff` vazio). **Sensor da fase**: 18 mutantes reinjetados nos arquivos reais, SHA-256 conferido na restauração, 18 mortos por asserção, zero por compilação. **Build gate**: core 3988/158 (+142/+11), mobile-adm 406/39, store 5815/317, backoffice 3670/210 (+22/+1), todos exit 0, um por vez, fora de pipe; `tsc` 0 em mobile-adm (app e node), store (app e server), backoffice e catalog-import, `core` 11 herdados nos mesmos arquivos; lint 0/0 · 23/5 · 2/2; `pnpm --filter @estrelinha/mobile-adm build` verde.

### Fase 2 — o banco e a leitura do app

> **Execução (2026-10-23/24)**: T09–T15 feitas, sem commit. O Build gate rodou no fim da fase (T15), com os quatro workspaces um por vez; o gate da loja foi o que achou os dois guardas cruzados (abaixo, T09 e T11). **Sensor da fase**: 21 mutantes reinjetados nos arquivos reais (`mutar74.py`, no scratchpad da sessão), SHA-256 conferido na restauração de cada um: **21 mortos por asserção, zero por compilação, zero sobreviventes**. O M21 (nome da RPC trocado) morreu na primeira rodada por uma razão FALSA — a régua de RPC já reprovava antes da mutação, porque o escopo dela não lia o app —, e foi refeito depois do conserto do escopo: morre por asserção, e a régua passa sem ele. Mutantes da fase: M01–M03 `lerComPapel` (consulta decidindo antes da RPC, em série, sem a régua do `lido_em`), M04–M10 lista (`.neq` a mais, sem a geração, janela fixa de 25, próxima com contagem, cursor por `Date`, `isFetching` ignorado, ordem sempre `desc`), M11–M14 detalhe (sem `isOrderId`, histórico ignorando as notas, erro do pedido engolido, notificações sem `order_id`), M15–M16 endereço (padrão "Tudo", duas visões), M17 guarda da leitura (`from` solto), M18 guarda do endereço (`useSearchParams` na página), M19–M20 guarda da migration (`execute` a `anon`, sem a recusa), M21 guarda de RPC. Equivalente declarado, não injetado: `refetchOnWindowFocus: true` e `staleTime: 0` são os padrões do React Query 5, então apagá-los não muda comportamento (a régua de foco prova o efeito, não a opção).

### T09 — `09-migration-atelie-clock-e-guardas`
- **What**: `supabase/migrations/20261024120000_74-relogio-do-atelie.sql` (§3.1), aplicada **só no
  local**; `atelieClockSchema.test.ts` (molde de `overviewSchema`); `'atelie_clock'` na lista literal
  de `marcacaoSoPorAcao.test.ts` com o `create function` conferido.
- **Where**: `supabase/migrations/…`, `apps/store/src/shared/lib/__tests__/{atelieClockSchema,marcacaoSoPorAcao}.test.ts`
- **Depends on**: T08
- **Done when**: o guarda recusa, cada um por mutante: sem `has_role` ⇒ `42501` antes de tudo, sem
  `security definer`, sem `search_path = ''`, sem `stable`, `execute` a `anon`/`public`, `from public.`
  (leitura de tabela), `insert`/`update`/`delete`; `mutar()` lança sem alvo; a igualdade de
  `marcacaoSoPorAcao` **não** afrouxada (a RPC entra e o caso dela confere a migration); migration
  aplicada no local sem erro; Full gate.
- **Reqs**: `MAP-53`, `MAP-36`/`MAP-37` (o lado do banco).
- **Tests**: guarda de fonte · **Gate**: full
- **Status**: ✅ Feito. Prefixo conferido livre antes de criar (TE8): o worktree, o repositório principal e todo o histórico do git (`git log --all`) vão até `20261023120000`; o `80` de outra sessão usa `20261022150000`. `supabase/migrations/20261024120000_74-relogio-do-atelie.sql` (§3.1, sem tabela, sem escrita, sem argumento), aplicada **só no local** (`supabase migration up --local`, `Migrations applied`). Guarda `apps/store/src/shared/lib/__tests__/atelieClockSchema.test.ts` (33 casos): âncora, 11 réguas (definer, `search_path = ''`, `stable`, sem argumento, recusa como PRIMEIRO comando do corpo, `lido_em` de `now()`, sem `from`/`join`/`select` no corpo, `revoke` de `public, anon`, `grant` só a `authenticated`, sem escrita, `has_role` qualificado), 17 sensores (toda régua com ao menos um, provado), `mutar()` que lança, removedor de comentário com CRLF e LF. `'atelie_clock'` entrou na lista literal `RPCS` de `marcacaoSoPorAcao.test.ts`, e o `it.each` dela confere o `create function`. **Achado pelo gate da loja, e consertado pela causa**: o `ESCOPO` de `marcacaoSoPorAcao` (feature `67`) nunca listou `apps/mobile-adm/src` — escrito antes do app existir —, então a régua 4 ("o conjunto de RPCs chamado em produção = `RPCS`, por igualdade") não enxergava a chamada do app e reprovava. O escopo GANHOU o app (régua mais larga, nenhuma afrouxada); com ele, a régua 1 (escrita nas três tabelas de marcação) também passa a alcançar o app.

### T10 — `10-probes-relogio-lista-e-cliente`
- **What**: `probes/01-relogio.sql`, `probes/02-lista.sh` (HTTP com o JWT de um admin semeado, a URL
  que o supabase-js monta a partir das funções de `core`), `probes/03-cliente-sem-papel.sh`, com a
  saída gravada ao lado.
- **Where**: `.specs/features/74-mobile-adm-pedidos/probes/`
- **Depends on**: T09
- **Done when**: `01`: admin ⇒ `lido_em`, sem papel e `anon` ⇒ `42501`. `02`: para as seis visões,
  os quatro blocos e `#0244`/`0244`/`244`, conjunto de ids do app = do painel = da consulta SQL de
  referência; contagem de cada bloco = `store_overview.fila` no mesmo instante; fixturas R1 e R2;
  **os três `or=` juntos** com "Precisa de ação" (`or` com `and(…)` aninhado); 60 pedidos paginados de
  25 com um `insert` no meio sem repetir nem pular; dois pedidos no mesmo segundo (µs); a resposta tem
  exatamente as chaves de `COLUNAS_DA_LISTA` e do detalhe. `03`: a view devolve as linhas da cliente
  **e** a RPC recusa. Tudo `ok`, exit 0, banco restaurado (fixturas apagadas).
- **Reqs**: `MAP-01`, `MAP-02`, `MAP-10`, `MAP-14`, `MAP-37`, Success Criteria 1–3, R1, R3, R10.
- **Tests**: probe · **Gate**: — (registrado no `validation.md`)
- **Status**: ✅ Feito. Em `.specs/features/74-mobile-adm-pedidos/probes/`, com a saída gravada ao lado (`*.saida.txt`), todos `ok`, exit 0 e banco restaurado (54 pedidos e 9 usuários antes e depois). **`01-relogio.sql`** (psql, `begin … rollback`, derruba a função e reaplica o ARQUIVO): admin recebe só `lido_em` = `now()`; conta sem papel, `authenticated` sem `sub` e `anon` ⇒ `42501`; `anon` sem `execute`; definer, `stable`, `search_path` vazio — 9 `ok`. Sensor: três mutantes no `.sql` (o `grant` a `anon`, a recusa trocada por `if false`, o `lido_em` uma hora atrás) derrubam o probe, SHA-256 restaurado. **`02-lista.sh` + `02-lista.ts`** (fixturas commitadas por `02-fixturas.sql` e apagadas por `trap` com `02-limpa.sql`; cliente supabase-js real logado como a admin do seed; oráculo SQL ESCRITO À MÃO, independente de `core`) — 49 `ok`: as seis visões com app = painel = SQL e `count exact` = SQL; os quatro blocos povoados (as fixturas cobrem os dois que estavam em zero na T01) com lista = SQL e contagem do app = `store_overview.fila` = tile do painel = SQL; "Precisa de ação" = `fila.precisa_acao` (22); R2 (Pix pendente com `status` cancelado) no bloco Pix e fora da união; `#0244`/`0244`/`244` app = painel = SQL (1, 1, 2); os TRÊS `or=` juntos (visão aninhada + busca + cursor) = SQL; 68 linhas paginadas de 25 com dois `insert` no meio, sem repetir, sem pular, o mais novo fora e o mais velho uma vez; R1 — quatro pedidos no mesmo segundo (dois no mesmo µs) de 1 em 1 sem pular nem repetir, o PostgREST devolvendo µs, e o SENSOR (cursor passado por `Date`) pulando; as chaves da resposta = `COLUNAS_DA_LISTA`, `COLUNAS_DO_DETALHE` e as quatro relações (`AD-012`); pedido inexistente ⇒ `null` sem erro. Sensor do probe: `concluidos` sem `cancelled` em `views.ts` ⇒ 2 FALHA; o cursor de `list.ts` passado por `Date` ⇒ R1 FALHA; SHA-256 restaurado. **`03-cliente-sem-papel.sh`**: a cliente (pedido adotado por e-mail, `handle_new_customer`) lê `order_list` e `order_items` SEM erro e só o dela, **e** `atelie_clock` a recusa com `42501`; controle: a admin recebe `lido_em` e vê 55 pedidos; `anon` ⇒ `42501` — 8 `ok`. **Dois registros**: (1) R1 da `73` (pago com `material_status` nulo) **não tem fixtura possível** — a coluna é `not null` no banco (`information_schema`), então a união e os blocos não podem divergir por ele; (2) `model/linha.ts` (as colunas e os tipos, previstos na T14) nasceu aqui, porque o probe confere as chaves da resposta contra ELE — com a lista escrita no probe, a prova seria sobre uma cópia.

### T11 — `11-arnes-do-app`
- **What**: `test/fakeSupabase.ts` passa a registrar a **cadeia inteira** de `from` (`select` com
  opções, `or`, `in`, `eq`, `order`, `limit`, `maybeSingle`) com respostas, erro e pendura por tabela;
  dublê de `IntersectionObserver` com disparo manual em `test/setup.ts` (R7); fixturas de pedido em
  `test/pedidos.ts` (um de cada estado, R1, R2, retirada, cupom + Pix, gravação, e-mail falho, nota).
- **Where**: `apps/mobile-adm/src/test/{fakeSupabase,setup,pedidos}.ts`, `test/__tests__/fakeSupabase.test.ts`
- **Depends on**: T10
- **Done when**: o dublê devolve a cadeia registrada na ordem exata; uma tabela sem resposta configurada
  lança (não devolve `[]` em silêncio); `clientRealPareado` verde (a cópia da loja não muda); os
  casos existentes do app verdes; Quick gate (mobile-adm) + store.
- **Reqs**: habilita `MAP-01`/`02`/`10`/`40` por teste (`L-060`, R9).
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feito. `test/fakeSupabase.ts`: toda tabela de dado (fora `user_roles`/`customers`, que seguem o caminho do `AuthProvider`) devolve um builder `thenable` que registra a cadeia inteira (`select` com as opções, `or`, `in`, `eq`, `neq`, `is`, `ilike`, `gt`/`lt`/`gte`/`lte`, `order`, `limit`, `range`, `maybeSingle`, `single`), com `responderTabela` (resposta ou função da cadeia e do número da leitura), `falharTabela`, `pendurarTabela` e `cadeiasDe`; tabela sem resposta configurada LANÇA; tipada por `ConsultaFalsa`. `test/intersecao.ts` + `setup.ts`: o `IntersectionObserver` falso, instalado em todo teste, que só dispara por `dispararInterseccao` e esquece o observador desligado. `test/pedidos.ts`: um de cada estado, aguardando material, sem rastreio, R2, retirada, cupom + Pix, gravação, e-mail falho, nota. Prova: `fakeSupabase.test.ts` (+8: a cadeia na ordem exata, o `.neq` a mais na cadeia, `maybeSingle`, a tabela sem resposta lançando, falha e pendura por tabela, resposta por leitura, o caminho do papel intocado, o reset) e `intersecao.test.ts` (4). `clientRealPareado` verde, `test/clientReal.ts` **não** tocado (o teste com client real da T12 cria o próprio client, por isso). **Achado pelo gate da loja**: `notificationSingleOwner.test.ts` varre `apps/**` e trata `src/test/` como produção (só `__tests__` e `.test.ts` são teste) — a fixtura com o nome de um evento como literal reprovou; ela passou a ler `MATERIAL_INSTRUCTIONS_EVENT` de `core`.

### T12 — `12-ler-com-papel`
- **What**: `entities/order/api/lerComPapel.ts` (E2): `Promise.allSettled([supabase.rpc('atelie_clock'),
  consulta()])` — a RPC chamada **pelo nome literal**, só aqui (E1); recusa vence, depois o erro da
  consulta, depois `{ resultado, lido_em }`.
- **Where**: `apps/mobile-adm/src/entities/order/api/lerComPapel.ts` + `__tests__/lerComPapel.test.ts`
  e `__tests__/lerComPapelComClientReal.test.ts`
- **Depends on**: T11
- **Done when**: com o dublê e com o **supabase-js real** (`clientReal.ts` + `fetch` falso): RPC
  `42501` + consulta com linhas ⇒ lança `42501` e o resultado nunca sai; RPC `42501` + consulta com
  erro de rede ⇒ `42501`; RPC com rede ⇒ erro sem `code` (`MAP-38`); consulta falha com RPC ok ⇒ o
  erro da consulta; a RPC e a consulta saem **em paralelo** (a consulta começa antes de a RPC
  responder); `marcacaoSoPorAcao` (loja) verde; Full gate.
- **Reqs**: `MAP-36`, `MAP-37`, `MAP-38`.
- **Tests**: unit + integração (client real) · **Gate**: full
- **Status**: ✅ Feito. `entities/order/api/lerComPapel.ts` (E1, E2): `Promise.allSettled([supabase.rpc('atelie_clock'), (async () => consulta())()])` — a consulta embrulhada num `async` para um `throw` síncrono dela não escapar da régua; a recusa (ou a rejeição) da RPC vence, depois o erro da consulta, depois `{ resultado, lido_em }`; uma RPC 200 sem `lido_em` é falha de leitura, nunca o dado. Prova sobre o dublê, `lerComPapel.test.ts` (11): `42501` + linhas ⇒ `42501` e nada sai; `42501` + consulta que rejeita ⇒ `42501`; `42501` + consulta que lança síncrono ⇒ `42501`; RPC que rejeita decide; rede na RPC ⇒ erro sem `code`; consulta falha com RPC ok ⇒ o da consulta; 200 sem `lido_em` ⇒ falha; o caminho bom; nome literal sem argumento, uma chamada; a consulta começa antes de a RPC responder; nada sai com a RPC pendurada. Sobre o **supabase-js real** (`createClient` com `fetch` falso, `lerComPapelComClientReal.test.ts`, 7): 403 `42501` + `order_list` com linhas ⇒ `42501` (e a consulta saiu de fato); `42501` + `order_list` por rede (o PostgREST real repete o GET com recuo: relógio falso) ⇒ `42501`; RPC com rede ⇒ não é recusa; 500 na consulta ⇒ o erro dela; as duas requisições saem antes de a RPC responder; e Q-T4 — a cadeia de `core` vira na URL os TRÊS `or=` que o probe `02` mediu, com `order=created_at.asc,id.asc` e `limit=25`. `marcacaoSoPorAcao` verde (com o escopo da T09).

### T13 — `13-enderecos-de-pedidos`
- **What**: `pedidosHref.ts` aceita as seis visões de `ORDER_VIEWS` (o `SPEC_DEVIATION` da `73` sai),
  `DestinoDePedidos = OrderSlice`, nasce `recorteDoEndereco(search)` (padrão de A5) e
  `pedidoHref(id)`; guarda `enderecoDePedidosComDonoUnico.test.ts`.
- **Where**: `apps/mobile-adm/src/entities/order/model/pedidosHref.ts` + testes,
  `apps/mobile-adm/src/entities/order/__tests__/enderecoDePedidosComDonoUnico.test.ts`
- **Depends on**: T12
- **Done when**: as seis visões ida e volta; bloco vence visão; valor fora do vocabulário e ausência ⇒
  `DEFAULT_ORDER_SLICE`; os testes da `73` (`MAI-07`/`MAI-15`) sem asserção afrouxada; o guarda recusa
  `visao`/`bloco`/`useSearchParams` fora de `pedidosHref.ts`, com sensores (CRLF/LF/glob) e metade
  positiva (exigida quando a `PedidosPage` chamar `recorteDoEndereco`, T21 — até lá a âncora é o
  próprio dono); Full gate.
- **Reqs**: `MAP-03`, `MAP-04`, `MAP-06` (o endereço).
- **Tests**: unit + guarda · **Gate**: full
- **Status**: ✅ Feito. `pedidosHref.ts`: o vocabulário de visão é `ORDER_VIEWS` de `core` (o `SPEC_DEVIATION` da `73` saiu), `DestinoDePedidos = OrderSlice`, nascem `recorteDoEndereco(search)` (A5: o do endereço ou `DEFAULT_ORDER_SLICE`) e `pedidoHref(id)`; `PARAM_VISAO`/`PARAM_BLOCO` deixaram de ser exportados (nenhum leitor fora do dono). Prova: `pedidosHref.test.ts` (+9: as quatro visões novas por extenso com âncora nas seis, ida e volta nos dez destinos, o padrão sem parâmetro, valor fora do vocabulário ⇒ padrão, bloco vence visão, bloco inválido com visão válida ⇒ padrão, `pedidoHref`). **Uma asserção da `73` mudou de valor, e o motivo é a spec, não o código**: `pedidosHref({ visao: 'fila-material' })` lançava porque a Início só conhecia duas visões; `MAP-03` faz dela uma visão válida, e a régua "fora do vocabulário lança" continua, com `'inventada'`. `MAI-07`/`MAI-15` sem asserção afrouxada (os endereços da Início e de "Ver todos" seguem iguais; `QueueTiles` e `RecentOrders` verdes). Guarda `entities/order/__tests__/enderecoDePedidosComDonoUnico.test.ts` (18): o literal do parâmetro, o fragmento `?visao=`/`&bloco=`, `PARAM_*` e `useSearchParams` só no dono (allowlist de um), âncora no app lido, no dono e num consumidor, e no dono USANDO as formas; seis sensores que acusam, quatro inversos (`data-bloco=`, a chave `bloco:` de objeto, `visaoAtual`, `isBlockSlice`), comentário com CRLF e LF, o código depois do comentário, o glob de dois asteriscos. **Pendência para a T21**: a metade positiva ("a `PedidosPage` chama `recorteDoEndereco`") entra com a página — até lá a âncora é o dono.

### T14 — `14-hook-da-lista`
- **What**: `entities/order/api/useListaDePedidos.ts` (abordagem B): chave
  `['atelie-pedidos', slice, termo.trim()]`; `queryFn` lê a janela do topo com
  `limite = max(25, ⌈carregadas/25⌉×25)` e `count: 'exact'`; `carregarMais` pelo cursor (string do
  servidor), sem contagem, anexando só se a **geração** não mudou (E3) e nunca com a chave em
  `isFetching`; `proximaFalhou`; `staleTime: 0`, `refetchOnWindowFocus`, `retry: retryUnlessDenied`,
  sem `placeholderData`. Declara `LinhaDaLista`/`COLUNAS_DA_LISTA`/`JanelaDaLista` em `model/linha.ts`.
- **Where**: `apps/mobile-adm/src/entities/order/{api/useListaDePedidos.ts,model/linha.ts}` + testes
- **Depends on**: T13
- **Done when**: a cadeia registrada é **igual** a `[select, …applyOrderSlice, or(busca)?,
  or(cursor)?, order(created_at), order(id), limit]` para visão, bloco, busca e página seguinte, e um
  `.neq` a mais reprova (`L-060`); `asc`/`desc` por `sliceOrder`; a primeira página e cada releitura
  pedem contagem, a seguinte não (G-A9a); releitura com 50 carregadas pede `limit 50`; anexar
  descartado por releitura **em voo** e por releitura **terminada**; termo antigo descartado
  (`MAP-11`/`40`); fim por página curta (`MAP-15`); falha da próxima mantém as linhas; Quick gate +
  store.
- **Reqs**: `MAP-01`, `MAP-02`, `MAP-08`, `MAP-10`, `MAP-11`, `MAP-13`, `MAP-14`, `MAP-15`, `MAP-35`,
  `MAP-39` (foco), `MAP-40`.
- **Tests**: unit · **Gate**: full
- **Status**: ✅ Feito. `entities/order/api/useListaDePedidos.ts`: chave `['atelie-pedidos', slice, termo aparado]`; `queryFn` lê a janela do topo com `tamanhoDaJanela(carregadas)` = `max(25, ⌈n/25⌉×25)` e `count: 'exact'`; `carregarMais` pelo cursor (as strings do servidor), sem contagem, por `lerComPapel`, anexando só se a GERAÇÃO da chave (incrementada no início de cada `queryFn`) não mudou (E3), e nunca com a chave em `isFetching` nem com outra página no ar; `erroDaProxima`/`proximaFalhou` presos à chave em que aconteceram; `staleTime: 0`, `refetchOnWindowFocus`, `retry: retryUnlessDenied`, sem `placeholderData`. `LinhaDaLista`/`COLUNAS_DA_LISTA`/`JanelaDaLista` em `model/linha.ts` (da T10). Prova, `useListaDePedidos.test.tsx` (33), sobre um `QueryClient` sem padrão (a repetição tem de vir do hook): a cadeia das dez leituras (6 visões + 4 blocos) é IGUAL à que um gravador passado pelas funções de `core` produz, com a ordem `asc`/`desc` escrita por extenso; a busca depois do recorte, aparada, com dois `or` em "Precisa de ação"; a página seguinte com o cursor em µs e sem contagem; a RPC também na página seguinte; o fim por página curta (e pela primeira janela curta); a falha da próxima mantendo as linhas; a recusa na próxima chegando com `42501`; "Tentar de novo" anexando; a releitura com 50 carregadas pedindo `limit 50` e contagem, e 30 arredondando para 50; o anexar descartado por releitura EM VOO e por releitura TERMINADA; nada sai com a janela em releitura; nada sai em dobro; o termo antigo que chega depois não é desenhado; trocar de recorte mostra carregando, nunca a lista anterior; a falha da próxima não migra de recorte; foco relê; `42501` não repete; rede repete uma vez. O "`.neq` a mais reprova" é provado pelo mutante M04 (13 casos caem).

### T15 — `15-hook-do-detalhe-e-guarda-da-leitura`
- **What**: `entities/order/api/usePedido.ts` (§3.4 + E2): uma `queryFn` com as cinco leituras dentro
  de **um** `lerComPapel`; o pedido da view `order_list`; `Bloco<T>` por string; histórico inteiro em
  falha se uma das três fontes falhar (Q6); `isOrderId` antes da rede (Q7). Guarda
  `leituraSoComPapel.test.ts` (AST, allowlist de dois).
- **Where**: `apps/mobile-adm/src/entities/order/{api/usePedido.ts,model/linha.ts}` + testes,
  `entities/order/api/__tests__/leituraSoComPapel.test.ts`
- **Depends on**: T14
- **Done when**: colunas exatas das cinco relações (as de §13 M3); erro do pedido ⇒ a query falha;
  pedido `null` ⇒ `pedido: null`; id não-uuid ⇒ `null` **sem** chamada de rede nem de RPC; itens em
  falha ⇒ `itens.estado = 'falhou'` com o resto ok; notas em falha ⇒ histórico `falhou`; recusa da RPC
  ⇒ nenhum bloco; o guarda acusa `supabase.from(` fora dos dois hooks e fora de uma função passada a
  `lerComPapel(`, com sensor e o inverso; Build gate (fim da Fase 2).
- **Reqs**: `MAP-29`, `MAP-30`, `MAP-36`, `MAP-37`.
- **Tests**: unit + guarda · **Gate**: build
- **Status**: ✅ Feito. `entities/order/api/usePedido.ts` (§3.4, E2, TE3): `isOrderId` antes de tudo (id não-uuid ⇒ `pedido: null` e `lido_em: null` sem rede e sem RPC, Q7); uma `queryFn` com as cinco leituras dentro de UM `lerComPapel`; cada leitura vira `{ data, error }` (inclusive a que lança); erro do pedido ⇒ a query falha; pedido `null` ⇒ `pedido: null`; `Bloco<T>` por string; histórico em falha se QUALQUER das três fontes falhou (Q6), senão `buildHistory` de `core`; mesmas opções da lista. `DetalheDoPedido.lido_em` passou a `string | null` (só o id impossível não tem leitura). Prova, `usePedido.test.tsx` (24): a cadeia do pedido (`select(COLUNAS_DO_DETALHE) → eq('id') → maybeSingle`) e as quatro relações com as colunas ESCRITAS POR EXTENSO e só o `eq('order_id')`; UMA confirmação; o resultado com o histórico fundido (os três fios, o e-mail que falhou); erro do pedido ⇒ falha; inexistente ⇒ `null`; quatro ids impossíveis sem rede nem RPC; itens em falha sozinhos; cada uma das três fontes do histórico derrubando o histórico inteiro; o fetch que lança virando bloco em falha; "Tentar de novo" relendo as cinco e a confirmação (TE4); `42501` vencendo, sem repetir, também com o pedido em erro de rede; foco relê (TE3); rede repete uma vez. Guarda `entities/order/api/__tests__/leituraSoComPapel.test.ts` (14), **pela AST**: régua 1 — só `lerComPapel.ts` e os dois hooks importam o client, por igualdade; régua 2 — nos hooks toda referência a `supabase` é o receptor de um `.from(`, e toda `supabase.from(` só é alcançável por `lerComPapel` (dentro da função passada a ele, ou numa função privada do arquivo cujas referências, recursivamente, também são); régua 3 — `lerComPapel.ts` não lê tabela; âncoras 2 + 5 `from` e o `lerComPapel(` em cada hook; dez sensores, inclusive os inversos (dentro do arrow, função privada) e as formas acusadas (`from` solto, função privada chamada também fora, função EXPORTADA, função passada a outra chamada, client apelidado, leitura em `lerComPapel.ts`). **Build gate (fim da Fase 2)**: core **3988/158** (=), mobile-adm **531/46** (+125/+7 sobre 406/39), store **5849/318** (+34/+1: `atelieClockSchema` 33 e a RPC nova em `marcacaoSoPorAcao`), backoffice **3670/210** (=), todos exit 0, um por vez, fora de pipe, `--testTimeout=20000` sem o `--`; `tsc` 0 em mobile-adm (app e node), store (app e server) e backoffice, `core` 11 herdados; lint mobile-adm 0/0, backoffice 23/5, store 2/2; `pnpm --filter @estrelinha/mobile-adm build` verde.

### Fase 3 — a lista

> **Execução (2026-10-24)**: T16–T21 feitas, inline, numa sessão. Entre as tasks rodou a suíte do arquivo/pasta tocada do app; o **Full + Build** rodou uma vez, no fim da fase (T21), com os quatro workspaces um por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe: core **3988/158** (=), mobile-adm **641/53** (+110/+7 sobre 531/46), store **5849/318** (=, com `situacaoComDonoUnico`, `numeroDoPedidoComDonoUnico`, `notificationSingleOwner`, `brandScan` e `marcacaoSoPorAcao` varrendo os arquivos novos), backoffice **3670/210** (=, `provenanceNotRead` verde); `tsc` 0 em mobile-adm (app e node), store (app e server) e backoffice, `core` 11 herdados; lint mobile-adm **0/0**, backoffice 23/5, store 2/2; `pnpm --filter @estrelinha/mobile-adm build` verde. **Sensor do autor**: 15 mutantes reinjetados nos arquivos reais da fase (página, linha, lista, sentinela, faixa, selo, rolagem, e o `SEARCH_DEBOUNCE_MS` de `core`), SHA-256 conferido na restauração, **15 mortos por asserção, 0 por compilação** (script em scratchpad; tabela abaixo, na T21). Autor = verificador nesta fase; o Verificador independente roda no fim da feature.

### T16 — `16-selo-compartilhado`
- **What**: `shared/ui/Selo.tsx` (pílula por `SituationTone`) extraída de `SituacaoDoPedido`, que passa
  a usá-la; o mapa tom → classe mora **só** aqui.
- **Where**: `apps/mobile-adm/src/shared/ui/Selo.tsx` + teste; `entities/order/ui/SituacaoDoPedido.tsx`
- **Depends on**: T15
- **Done when**: os testes do selo da `73` (`RecentOrders`, `situationAudience`) verdes sem asserção
  tocada; o selo **não** usa `truncate` (`MAP-43`) e quebra; `situacaoComDonoUnico` (loja) verde;
  Full gate.
- **Reqs**: `MAP-16` (selo), `MAP-25` (selo de pagamento), `MAP-43`.
- **Status**: ✅ Feito. `shared/ui/Selo.tsx` (pílula e ponto por `SituationTone`; os dois mapas tom → classe moram SÓ aqui, sem exportação) e `SituacaoDoPedido` passou a desenhar por ele, mantendo `data-situation`/`data-tone` e o rótulo como último filho com `min-w-0`. Prova: `shared/ui/__tests__/Selo.test.tsx` (9): a pílula e o ponto de cada um dos cinco tons ESCRITOS POR EXTENSO, atributos de dado repassados, sem `truncate`/`whitespace-nowrap` no selo e no rótulo (`MAP-43`), e uma varredura do app (âncora ≥ 50 arquivos e as classes achadas no dono) recusando classe de pílula de tom fora de `Selo.tsx`; `entities/order/ui/__tests__/SituacaoDoPedido.test.tsx` (1, separado por fronteira FSD: `shared` não importa `entities`). `RecentOrders.test.tsx` (as réguas de selo da `73`) e `situacaoAudience` (core) verdes sem asserção tocada; `situacaoComDonoUnico` (loja) verde.
- **Tests**: unit (componente) · **Gate**: full

### T17 — `17-linha-do-pedido`
- **What**: `entities/order/ui/LinhaDoPedido.tsx`: número, selo `atelie`, nome (ou e-mail), "Nª compra
  · há N", total com centavos, a frase de `rowSummary(row).blocker` com o ponto de cor decidido por
  `rowSummary(row).action`, a idade só em `aguardando_material`; `<Link>` inteiro para
  `pedidoHref(id)` com `state: { doApp: true }` (E7), nome acessível "Pedido #0244, <cliente>".
- **Where**: `apps/mobile-adm/src/entities/order/ui/LinhaDoPedido.tsx` + teste
- **Depends on**: T16
- **Done when**: cada campo contra a fixtura; sem nome ⇒ e-mail; sem frase em entregue/cancelado; a
  idade ausente fora de `aguardando_material`; **nenhum** botão nem texto de ação (`MAP-18`); alvo ≥ 44
  px por classe; idade contra `lido_em` (aparelho em outro relógio não muda o texto); número e total
  com classe que quebra (`MAP-43`); Quick gate + store.
- **Reqs**: `MAP-16`, `MAP-17`, `MAP-18`, `MAP-19`, `MAP-42`, `MAP-43`.
- **Status**: ✅ Feito. `entities/order/ui/LinhaDoPedido.tsx`: número por `formatOrderNumber`, selo `SituacaoDoPedido`, nome ou e-mail, `purchaseOrdinalLabel` · `relativeAge(created_at, lido_em)`, `formatPrice`, a frase `rowSummary(row).blocker` com o ponto decidido por `rowSummary(row).action` (`registrar-recebimento` ⇒ acento, `salvar-rastreio` ⇒ alerta, o resto primário — `MAP-49`, nunca o status cru), a idade (`queueAgeLabel(rowQueueAge(row, new Date(lido_em)))`) só com `toMaterialStatus(material_status) === 'aguardando_material'`; `<Link>` inteiro para `pedidoHref(id)` com `state: { doApp: true }` (E7), `aria-label` "Pedido #0244, <cliente>" (TE1: o `#` só por `formatOrderNumber`), `min-h-11`; número e total com `[overflow-wrap:anywhere]`, total `ml-auto min-w-0 max-w-full`, nome com piso `min-w-[min(100%,8rem)]`. Prova: `entities/order/ui/__tests__/LinhaDoPedido.test.tsx` (24): cada campo contra a fixtura escrito por extenso (`#0244`, `Em produção`, `3ª compra · há 2 dias`, `R$ 389,90`); sem nome ⇒ e-mail (também no nome acessível); sem ordinal ⇒ só o tempo; o aparelho em 2031 não muda o tempo nem a idade (contra `lido_em`); envelope esperado ⇒ "Esperando o envelope da cliente · parado há 13 dias" com ponto de acento; material a caminho ⇒ acento SEM idade; sem rastreio ⇒ alerta; pago ⇒ primário; entregue e cancelado sem frase; oito estados sem botão e sem rótulo de ação (`MAP-18`); um link só, com 44 px, que abre `/pedidos/<id>` com `{ doApp: true }`; número/total que quebram e a linha que embrulha. `numeroDoPedidoComDonoUnico`, `provenanceNotRead` e `notificationSingleOwner` verdes (TE1).
- **Tests**: unit (componente) · **Gate**: full

### T18 — `18-chips-e-faixa-do-bloco`
- **What**: `features/order-slice/ui/{ChipsDeRecorte,FaixaDoBloco}.tsx`: seis chips de `ORDER_VIEWS`
  com `aria-pressed`, faixa que rola dentro de si; "Filtro: <rótulo do bloco>" com "Limpar filtro"
  (44 px). Os dois recebem o recorte e um `aoTrocar(slice)` — quem navega é a página.
- **Where**: `apps/mobile-adm/src/features/order-slice/` + testes
- **Depends on**: T17
- **Done when**: seis chips na ordem e rótulos de `MAP-07`, só o atual pressionado; com bloco, nenhum
  chip pressionado e a faixa visível; o toque emite `{ visao }` / `{ visao: 'tudo' }`; `overflow-x-auto`
  com `min-w-0` (sem estouro do body por classe); `motion-reduce:` em toda transição; Quick gate + store.
- **Reqs**: `MAP-02`, `MAP-05`, `MAP-06`, `MAP-07`, `MAP-42`, `MAP-45`.
- **Status**: ✅ Feito. `features/order-slice/ui/ChipsDeRecorte.tsx` (os seis de `ORDER_VIEWS`, `aria-pressed` só no da visão atual e em nenhum com bloco, faixa `flex min-w-0 overflow-x-auto` sem `flex-wrap`, chips `shrink-0 min-h-11` com `transition-colors motion-reduce:transition-none`) e `FaixaDoBloco.tsx` ("Filtro: <`queueBlock(id).label`>" e "Limpar filtro" de 44 px, que emite `{ visao: 'tudo' }`); os dois só emitem, quem navega é a página. Prova: `features/order-slice/__tests__/ChipsEFaixa.test.tsx` (21): os seis rótulos na ordem de `MAP-07` por extenso; a faixa que rola dentro de si; o par `motion-reduce:`; para cada visão, só o seu chip pressionado (e cinco `false`); com bloco, nenhum; cada chip emite `{ visao: <id> }` uma vez; a frase de cada um dos quatro blocos; "Limpar filtro" com `min-h-11` emitindo `{ visao: 'tudo' }`.
- **Tests**: unit (componente) · **Gate**: full

### T19 — `19-busca-de-pedidos`
- **What**: `features/order-search/ui/BuscaDePedidos.tsx` + `shared/lib/useDebounce.ts` (conferir antes
  se já existe no app; não importar do painel): o campo com o placeholder "Número, nome, e-mail ou
  rastreio" e o termo debounced por `SEARCH_DEBOUNCE_MS` de `core`.
- **Where**: `apps/mobile-adm/src/features/order-search/`, `apps/mobile-adm/src/shared/lib/useDebounce.ts` + testes
- **Depends on**: T18
- **Done when**: com relógio falso, nenhuma emissão antes de 300 ms e uma só depois da última tecla; o
  valor vem da constante de `core` (mutante na constante muda o teste); o termo **não** vai ao
  endereço (A13); campo com rótulo acessível e altura ≥ 44 px; Quick gate + store.
- **Reqs**: `MAP-10`, `MAP-11`.
- **Status**: ✅ Feito. `shared/lib/useDebounce.ts` (genérico, atraso do chamador — TE5; conferido que o app não tinha um) e `features/order-search/ui/BuscaDePedidos.tsx` (campo `type=search` com rótulo `sr-only` "Buscar pedido", placeholder "Número, nome, e-mail ou rastreio", `CAMPO` de 48 px; emite o termo depois de `SEARCH_DEBOUNCE_MS` de `core`, não emite na montagem nem repete o mesmo termo). Prova: `features/order-search/__tests__/BuscaDePedidos.test.tsx` (7), relógio falso: rótulo, placeholder e `h-12`; a montagem não emite; nada a 299 ms e uma emissão aos 300 (o atraso ESCRITO, não importado — o mutante `SEARCH_DEBOUNCE_MS = 200` em `core` morre por asserção, M08); três teclas ⇒ uma emissão com o último texto; apagar emite `''`; voltar ao mesmo texto não reemite; digitar não muda o `search` da rota (A13).
- **Tests**: unit · **Gate**: full

### T20 — `20-widget-da-lista`
- **What**: `widgets/order-list/ui/ListaDePedidos.tsx` + `widgets/order-list/model/useSentinela.ts`:
  esqueleto com `aria-busy`, falha, vazio (`EMPTY_TITLE` + `emptyHint`), dado com `listCountLine`, a
  sentinela com margem e o fim ("Tentar de novo" na falha da próxima, nada quando `fim`). A sentinela
  se rearma (E4).
- **Where**: `apps/mobile-adm/src/widgets/order-list/` + testes
- **Depends on**: T19
- **Done when**: os três estados exclusivos (`L-063`); falha **nunca** "Nada por aqui."; "Nada por
  aqui." com as três dicas e sem linha de contagem; contagem com singular/plural; a sentinela chama
  `carregarMais` ao cruzar, não chama com `fim`, e **rearma** depois de um anexar descartado com ela
  ainda visível (o dublê de `IntersectionObserver`); esqueletos com `motion-reduce:`; Quick gate +
  store.
- **Reqs**: `MAP-08`, `MAP-09`, `MAP-13`, `MAP-15`, `MAP-34`, `MAP-35`, `MAP-44`, `MAP-45`.
- **Status**: ✅ Feito. `widgets/order-list/ui/ListaDePedidos.tsx` (quatro estados exclusivos por `data-estado`: falha sem dado com `FalhaDoBloco`; esqueleto `aria-busy` com quatro `Traco`; vazio com `EMPTY_TITLE` + `emptyHint` sem contagem; dado com `listCountLine(total, recorte, comBusca)` e as linhas; no fim, a sentinela enquanto há mais, `FalhaDoBloco` com `carregarMais` na falha da próxima, nada com `fim`) e `widgets/order-list/model/useSentinela.ts` (`IntersectionObserver` com `rootMargin` `0px 0px 600px 0px`, desligado e recriado quando `ativo` ou a janela mudam — E4; `ativo` falso com uma página no ar, no fim e na falha). Prova: `widgets/order-list/__tests__/ListaDePedidos.test.tsx` (22), sobre o dublê de `IntersectionObserver`: a falha nunca é "Nada por aqui." (`MAP-34`); o esqueleto `aria-busy` com `motion-reduce:animate-none` (`MAP-44`/`45`); o dado com a releitura falhada sem esqueleto; as cinco dicas do vazio sem contagem (`MAP-09`); seis frases de contagem por extenso, inclusive singular/plural e com busca (`MAP-08`), e a contagem pelo TOTAL, não pelas linhas; a sentinela chama `carregarMais` uma vez ao cruzar com a margem; com `fim` nada observa nem desenha esqueleto (`MAP-15`); a falha da próxima mantém as linhas e o "Tentar de novo" pede a página (`MAP-35`); **rearma**: depois de um anexar descartado com a MESMA janela e a sentinela visível, um observador novo e a página seguinte sai; janela relida rearma e o observador velho fica desligado; o fim desliga.
- **Tests**: unit (componente) · **Gate**: full

### T21 — `21-pagina-pedidos`
- **What**: `pages/PedidosPage.tsx` reescrita: `recorteDoEndereco(location.search)`, chips/faixa
  navegando com `replace`, busca, a lista, `useOrdersRealtime('atelie-pedidos-realtime', …)` invalidando
  `['atelie-pedidos']` **e** `STORE_OVERVIEW_KEY`, `PullToRefresh`, `useRecusaDePapel`, frescor
  ("Atualizado às" + `NAO_ATUALIZOU`, que sobe para `shared/ui/leitura.tsx` com `InicioPage`
  reexportando para o teste da `73` não mudar), `h1` "Pedidos" em todo estado (E5), título
  "Pedidos · Ateliê", `shared/lib/useRolagemRestaurada.ts`.
- **Where**: `apps/mobile-adm/src/pages/PedidosPage.tsx`, `pages/__tests__/PedidosPage.test.tsx`,
  `shared/lib/useRolagemRestaurada.ts`, `shared/ui/leitura.tsx`, `pages/InicioPage.tsx`
- **Depends on**: T20
- **Done when**: pelo **`<App />` real** (`montarApp`): cada endereço que a Início monta abre o recorte
  certo, com a contagem da fixtura; `?bloco=` + `?visao=` ⇒ bloco; chip ⇒ endereço trocado **sem
  entrada nova de histórico**; "Limpar filtro" ⇒ `?visao=tudo`; recusa ⇒ nenhuma linha (nem a de
  antes) e a recusa da `72`, com uma reconferência por episódio; rede ⇒ falha, nunca recusa; releitura
  falha com dado ⇒ o dado fica com "Atualizado às" e o aviso; **um** canal aberto e fechado ao sair;
  o aviso do canal relê lista e resumo (provado pelo que muda na tela); voltar do detalhe restaura a
  posição (scroll guardado por `location.key`); foco no `h1` com a leitura pendente; a metade positiva
  do guarda do endereço (T13) ligada; `InicioPage.test.tsx` sem asserção tocada; Build gate (fim da
  Fase 3).
- **Reqs**: `MAP-01`..`MAP-06`, `MAP-34`..`MAP-40`, `MAP-46`, G-A28.
- **Status**: ✅ Feito. `pages/PedidosPage.tsx` reescrita: `recorteDoEndereco(search)`; chips e faixa navegando por `pedidosHref(slice)` com `replace`; o termo como estado da página; `useListaDePedidos`; `useRecusaDePapel([erro da janela, erro da próxima])` com `janela = recusada ? undefined : lista.data`; `LinhaDeFrescor` (`NAO_ATUALIZOU` e a linha de frescor subiram para `shared/ui/leitura.tsx`; `InicioPage` passou a usá-la e reexporta `NAO_ATUALIZOU`, então `InicioPage.test.tsx` ficou **sem uma linha alterada**); `PullToRefresh` com `refetch`; `h1` (o rótulo da aba) em todo estado; `shared/lib/useRolagemRestaurada.ts` (posição por `location.key` num `Map` de módulo, restaurada uma vez quando há janela). **Decisão de implementação, para o Verificador**: o canal `atelie-pedidos-realtime` (invalidando `['atelie-pedidos']` e `STORE_OVERVIEW_KEY`) abre só depois da primeira leitura com papel CONFIRMADO e fecha na recusa — a RLS entregaria a uma conta sem papel os avisos dos pedidos dela, e antes da confirmação não há lista a reler; ele não fecha ao trocar de recorte. Com isso o caso da `73` "trocar de aba FECHA o canal" (`canaisAbertos()` vazio ao abrir Pedidos sem leitura configurada) segue verde sem asserção tocada. **Mudança de asserção declarada**: `TabBar.test.tsx` (`MAF-18`) tira `/pedidos` das abas "em construção", no molde do que a `73` fez com a Início, com um caso novo provando que Pedidos não é mais "em breve". `setup.ts` ganhou o stub de `window.scrollTo` (jsdom não implementa). Guarda do endereço: a **metade positiva** entrou em `enderecoDePedidosComDonoUnico.test.ts` (+2: a página importa e chama `recorteDoEndereco(search)`, e o sensor da citação só em comentário). Prova, `pages/__tests__/PedidosPage.test.tsx` (24), pelo `<App />` real: os seis endereços que a Início monta (quatro blocos, "Precisa de ação", "Tudo") com o recorte da cadeia IGUAL ao que `applyOrderSlice` produz e a contagem da fixtura; valor fora do vocabulário ⇒ "Precisa de ação"; `?visao=` + `?bloco=` ⇒ o bloco; chip troca endereço, recorte e chip pressionado com `history.length` igual; "Limpar filtro" ⇒ `?visao=tudo`; TE6 (busca sem resultado: "Nada por aqui." + "Nenhum pedido com “Zuleica”." e o recorte igual); `h1` lendo, na falha e no vazio, título "Pedidos · Ateliê", e o foco no `h1` entrando pela aba com a leitura pendente; `42501` com o papel tirado ⇒ Login com a recusa, nenhuma linha, mesmo com a consulta trazendo linhas, papel perguntado 2×; `42501` com o papel ainda admin ⇒ nenhuma linha nem a de antes, falha sem frescor, UMA reconferência estável por 30 s; rede ⇒ falha, nunca recusa (papel 1×); "Atualizado às 11h30."; releitura falhada mantém as linhas com o aviso; UM canal após a confirmação, que sobrevive à troca de chip e fecha ao sair; nenhum canal antes da confirmação; o aviso relê (contagem 3 → 5 na tela) e deixa `STORE_OVERVIEW_KEY` invalidada no cache do app; puxar relê sem esqueleto; voltar à lista (pelo histórico, vindo da Início) chama `scrollTo(0, 840)`; entrada nova não rola. **Sensor do autor (fase)**:

  | M | Mutação no arquivo real | Resultado |
  | --- | --- | --- |
  | M01 | `recorteDoEndereco('')` na página | morto (9 casos, inclusive a metade positiva do guarda) |
  | M02 | segundo mapa tom → classe em `LinhaDoPedido` | morto (`Selo.test.tsx`) |
  | M03 | sentinela sem rearmar pela janela | morto |
  | M04 | idade em todo material | morto |
  | M05 | o ramo da falha apagado | morto (4) |
  | M06 | a recusa desenha o cache | morto |
  | M07 | chip sem `replace` | morto (2) |
  | M08 | `SEARCH_DEBOUNCE_MS = 200` em `core` | morto (2) |
  | M09 | o aviso não invalida o resumo | morto |
  | M10 | "Limpar filtro" vai a "Precisa de ação" | morto (2) |
  | M11 | contagem pelas linhas carregadas | morto |
  | M12 | canal antes da confirmação | morto |
  | M13 | `truncate` no rótulo do selo | morto |
  | M14 | sem ponto de alerta | morto |
  | M15 | rolagem não restaura | morto |

  **Pendências para a Fase 4**: (1) "voltar do DETALHE restaura a posição" foi provado voltando da Início, porque `/pedidos/:id` só nasce na T24 (hoje a linha leva ao `*` ⇒ `/`); a T24 deve repetir o caso pelo detalhe. (2) O resumo relido pelo aviso está provado pelo estado do cache (`isInvalidated`); a prova "pelo que muda na tela" chega com o selo da aba (T25).
- **Tests**: unit (componente, árvore real) · **Gate**: build

### Fase 4 — o detalhe, o selo e a fiação

> **Execução (2026-10-24)**: T22–T28 feitas, inline, numa sessão de worker. Gate de cada task na suíte do app (e as do painel e da loja onde a task cria arquivo em `apps/**`); **Full + Build** no fim (T28). Sem commit.

### T22 — `22-detalhe-cabecalho-cliente-e-material`
- **What**: `widgets/order-detail/ui/{CabecalhoDoPedido,ProximoPasso,BlocoCliente,BlocoMaterial}.tsx`:
  "Pedido #0244", data de Brasília + "há N", selo `atelie`, "Voltar" de 44 px (E7: `state.doApp` ⇒
  `navigate(-1)`, senão `/pedidos` com `replace`); o `label` de `nextStep` + a frase de `rowSummary`,
  **sem** `blockedReason` e sem botão; nome, ordinal, e-mail, telefone e "WhatsApp" para `wa.me`
  (`normalizeBrPhone`, `target="_blank" rel="noopener noreferrer"`), sem "Ver cliente"; o material com
  título, `materialSubline` e os quatro passos de `materialProgress`, ausente em `nao_aplicavel`.
- **Where**: `apps/mobile-adm/src/widgets/order-detail/ui/` + testes
- **Depends on**: T21
- **Done when**: cada campo contra as fixturas; sem telefone válido ⇒ nem telefone nem botão; nenhuma
  frase "Você pode avançar" na tela; "Ver cliente" ausente; os quatro passos com `aria-current` no
  atual e os quatro feitos em enviado/entregue; datas contra `lido_em` com o aparelho em UTC; Quick
  gate + store.
- **Reqs**: `MAP-20`, `MAP-21`, `MAP-22`, `MAP-23`, `MAP-42`, `MAP-43`.
- **Status**: ✅ Feito. `widgets/order-detail/ui/{CabecalhoDoPedido,ProximoPasso,BlocoCliente,BlocoMaterial,BlocoDoDetalhe}.tsx` + `model/titulos.ts` (`tituloDoPedido` por `formatOrderNumber`, TE1). O cabeçalho existe SEM o pedido (`h1` "Pedido", E5) e com ele ("Pedido #0244", selo `atelie`, `formatShortDate` · `relativeAge` contra o `lido_em`); "Voltar" `min-h-11 min-w-11` com `state.doApp` ⇒ `navigate(-1)`, senão `/pedidos` por `replace` (E7). Próximo passo = `nextStep().label` + `rowSummary().blocker`, sem botão e sem `blockedReason`. Cliente: nome/e-mail, ordinal, e-mail; telefone e "WhatsApp" (`wa.me/<normalizeBrPhone>`, `_blank`, `noopener noreferrer`, `min-h-11`) só com número válido — o telefone desenhado a partir do número JÁ normalizado (um `+55 …` gravado não sai torto); sem "Ver cliente". Material: `materialProgress`/`materialSubline`, `aria-current="step"` no atual, ausente em `nao_aplicavel`. Prova: `widgets/order-detail/__tests__/CabecalhoClienteMaterial.test.tsx` (25), aparelho em UTC com compra às 02h30 UTC ⇒ "20 out · há 2 dias"; os quatro estados do material e os dois de "usado na joia"; as três linhas de A23; o inverso do WhatsApp em `null`, `''` e `'1234-5'`. Guardas cruzados TE1 verdes na suíte da loja (`numeroDoPedidoComDonoUnico`, `notificationSingleOwner`) e do painel (`provenanceNotRead`).
- **Tests**: unit (componente) · **Gate**: full

### T23 — `23-detalhe-itens-valores-entrega-e-historico`
- **What**: `widgets/order-detail/ui/{BlocoItens,BlocoValores,BlocoEntrega,Historico}.tsx`: "N joias"
  pela soma das quantidades, nome congelado, variação, "Gravação: …", "q × preço"; subtotal, frete
  (ou "grátis"), cupom/Pix/promoção só quando > 0, **Total = `orders.total` sem recalcular**, meio +
  selo de pagamento (`PAYMENT_STATUS_TONES` + `Selo`); endereço + `shippingLine`, ou "Retirada no
  escritório" sem transportadora, prazo nem rastreio; o histórico de `buildHistory` com "<data> · há
  N". Cada bloco com `Bloco 'falhou'` ⇒ `FalhaDoBloco` com "Tentar de novo".
- **Where**: `apps/mobile-adm/src/widgets/order-detail/ui/` + testes
- **Depends on**: T22
- **Done when**: uma fixtura cuja soma de itens **difere** de `total` mostra `total` (prova do "sem
  recalcular"); "1 joia"/"N joias"; item `nuvemshop:…` pelo nome; as quatro frases de entrega e a
  retirada; e-mail falho diz que a cliente não foi avisada; notas internas no histórico; falha por
  bloco isolada; Quick gate + store.
- **Reqs**: `MAP-24`, `MAP-25`, `MAP-26`, `MAP-27`, `MAP-28`, `MAP-30`, `MAP-43`.
- **Status**: ✅ Feito. `widgets/order-detail/ui/{BlocoItens,BlocoValores,BlocoEntrega,Historico}.tsx`. Itens: "N joias" pela soma das quantidades (`model/titulos.ts`), nome congelado, variação, "Gravação: …" (aparado), "q × preço"; em falha, "Joias" + `FalhaDoBloco`. Valores: subtotal, "Frete · <serviço>" (ou "Retirada no escritório") com "grátis" no custo zero, cupom/Pix/promoção só > 0, **Total = `orders.total`**, meio por `PAYMENT_METHOD_LABELS` e selo por `ORDER_PAYMENT_STATUS_LABELS` + `PAYMENT_STATUS_TONES` no MESMO `shared/ui/Selo`. Entrega: endereço (`maskCep`), serviço e `shippingLine`; retirada só com `PICKUP_METHOD_NAME`. Histórico: `buildHistory` já fundido pelo hook, "<dia> · <há N>", e-mail falho em alerta; vazio "Nada registrado ainda."; falha do bloco inteiro (Q6). Prova: `ItensValoresEntregaHistorico.test.tsx` (31): a soma (399,90) difere do total (389,90) e a tela diz 389,90; seis pares meio × pagamento × tom; as seis frases de rastreio e a retirada sem endereço, serviço nem rastreio; a ordem do fio com a nota interna. **Spec-precision gap (MAP-28)**: a frase "A cliente NÃO foi avisada" é a de `buildHistory` SÓ quando o envio não registrou `error`; com erro, o painel e o app mostram o erro cru sob "Falha ao enviar …" (a regra subiu byte a byte e não foi alterada). Provado o caso sem erro; o com erro fica para o Verificador decidir se pede frase extra.
- **Tests**: unit (componente) · **Gate**: full

### T24 — `24-pagina-do-pedido-e-rota`
- **What**: `pages/PedidoPage.tsx` (compõe os blocos; `usePedido`;
  `useOrdersRealtime('atelie-pedido-realtime', …)` invalidando a chave do pedido e
  `STORE_OVERVIEW_KEY`; `PullToRefresh`; vigia; "Não encontrei este pedido." + "Voltar aos pedidos";
  `h1` em todo estado; título "Pedido · Ateliê" → "Pedido #0244 · Ateliê"; `scrollTo(0,0)` ao montar);
  `<Route path="/pedidos/:id">` no `App.tsx` dentro do `RequireAdmin`; `abasSaoAsRotas` aprende
  subrota sem afrouxar; `rotasSobGuarda` com a rota.
- **Where**: `apps/mobile-adm/src/{pages/PedidoPage.tsx,pages/__tests__/PedidoPage.test.tsx,app/App.tsx}`,
  `widgets/tab-bar/__tests__/abasSaoAsRotas.test.ts`, `app/__tests__/rotasSobGuarda.test.ts`,
  `widgets/tab-bar/__tests__/TabBar.test.tsx`
- **Depends on**: T23
- **Done when**: pelo `<App />` real: lista → linha → detalhe → "Voltar" volta ao mesmo recorte; F5
  no detalhe + "Voltar" ⇒ `/pedidos`; id inexistente e não-uuid ⇒ "Não encontrei"; recusa ⇒ nenhum
  bloco; um bloco em falha não derruba os outros; o aviso do canal relê o detalhe (estado novo na
  tela); a aba Pedidos com `aria-current="page"` em `/pedidos/:id` e nenhuma outra (R11);
  `abasSaoAsRotas` com âncora "4 abas, 4 rotas de aba, 1 subrota" e sensores `/estoque/:id` e
  `/relatorios` ainda acusados; `rotasSobGuarda` acusa a rota fora do bloco; Full gate.
- **Reqs**: `MAP-20`, `MAP-29`, `MAP-30`, `MAP-34`..`MAP-40`, `MAP-46`, `MAP-54`, `MAP-55`.
- **Status**: ✅ Feito. `pages/PedidoPage.tsx` (usePedido; vigia; `h1` em todo estado; título "Pedido · Ateliê" → "Pedido #0244 · Ateliê"; esqueletos por bloco `aria-busy`; "Não encontrei este pedido." + "Voltar aos pedidos"; `FalhaDoBloco` na falha da primeira leitura e na recusa; `LinhaDeFrescor`; canal `atelie-pedido-realtime` aberto só depois da confirmação, invalidando a chave do pedido e `STORE_OVERVIEW_KEY`; `PullToRefresh`; `scrollTo(0,0)`); `<Route path="/pedidos/:id">` dentro do `RequireAdmin`. `abasSaoAsRotas` aprendeu SUBROTA (âncora 4 abas · 4 rotas de aba · 1 subrota; sensores `/estoque/:id` e `/relatorios` acusados) e `rotasSobGuarda` ganhou a rota na lista (dez) e um caso com a rota movida para fora. Prova: `pages/__tests__/PedidoPage.test.tsx` (21) pelo `<App />` real: lista (`?bloco=sem-rastreio`) → linha → detalhe → "Voltar" volta ao MESMO recorte e chama `scrollTo(0, 840)` (a pendência (1) da T21, agora pelo detalhe); F5 + "Voltar" ⇒ `/pedidos` sem entrada nova; Início → Últimos pedidos → detalhe → "Voltar" ⇒ Início; id inexistente e não-uuid (este sem RPC, sem leitura e sem canal); itens em falha isolados e "Tentar de novo" relendo SEM esqueleto e sem desmontar o bloco Cliente (TE4); histórico com uma fonte em falha; falha do pedido; releitura falhada com "Não consegui atualizar agora."; `42501` com papel tirado (Login, nada no DOM) e com papel admin (nenhum bloco, UMA reconferência por 30 s); rede ⇒ falha; aba Pedidos `aria-current="page"` e nenhuma outra (MAP-55); foco no `h1` entrando com a leitura pendente; o aviso troca a situação na tela ("Em produção" → "Enviado") e o SELO da aba (5 → 1).
- **Tests**: unit (componente, árvore real) + guarda · **Gate**: full

### T25 — `25-selo-da-aba-pedidos`
- **What**: `widgets/tab-bar/model/selo.ts` (`textoDoSelo`, `nomeDaAbaComSelo`); `TabBar` com prop
  `selos`; `MobileLayout` chama `useResumo()` (mesma chave da Início) e passa `fila.precisa_acao`, ou
  `null` em erro/sem dado; **sem** `useRecusaDePapel` (G-A24).
- **Where**: `apps/mobile-adm/src/widgets/tab-bar/{model/selo.ts,ui/TabBar.tsx}`,
  `app/layout/MobileLayout.tsx` + testes
- **Depends on**: T24
- **Done when**: 0 ⇒ sem selo; 1 ⇒ "Pedidos, 1 precisa de você"; 100 ⇒ "99+"; pendente, falha,
  releitura falha com dado e `42501` ⇒ sem selo e **sem** reconferência de papel; com a Início aberta,
  **uma** chamada a `store_overview` (dedupe); o selo `aria-hidden`, o rótulo visível e o alvo
  inalterados; o aviso do canal da lista atualiza o selo; Full gate.
- **Reqs**: `MAP-31`, `MAP-32`, `MAP-33`, A25.
- **Status**: ✅ Feito. `widgets/tab-bar/model/selo.ts` (`textoDoSelo`, `nomeDaAbaComSelo`, `SELO_MAXIMO`); `TabBar` com `selos` (selo `aria-hidden`, `absolute` sobre o ícone, `aria-label` no `NavLink` só com selo); `MobileLayout` com `useResumo()` ⇒ `fila.precisa_acao`, ou `null` com `isError` ou sem dado; sem `useRecusaDePapel`. Prova: `widgets/tab-bar/__tests__/seloDaAba.test.tsx` (24): a regra (0/`null`/negativo ⇒ sem selo, 99 ⇒ "99", 100 ⇒ "99+", singular/plural); pela árvore real 5/1/100/0, rótulo visível e `min-h-12` inalterados, só a aba Pedidos com selo; dedupe com a Início (UMA chamada); pendente, rede, releitura falhada com dado (o "5" some) e `42501` (sem selo, papel perguntado 1×, a rota fica). **Mudanças de asserção declaradas** (consequência de `MAP-31`/`MAP-33`, não afrouxamento): `TabBar.test.tsx` (`MAF-18`) passa a exigir `leiturasDeDado()` = `['rpc:store_overview']` nas abas em construção (a leitura do selo, que vale em qualquer aba; a página continua sem número); `InicioPage.test.tsx` e `PedidosPage.test.tsx` acham a aba Pedidos pelo COMEÇO do nome (`/^Pedidos/`), porque com selo o nome é "Pedidos, 5 precisam de você"; e o caso da T21 "o aviso invalida o resumo" deixou de medir `isInvalidated` (o observador do selo relê na hora e o estado volta a `false`) e passou a medir o selo mudando na tela (5 → 7) — a prova "pelo que muda na tela" que a T21 deixou pendente.
- **Tests**: unit (componente) · **Gate**: full

### T26 — `26-ultimos-pedidos-levam-ao-detalhe`
- **What**: as linhas de `widgets/recent-orders` viram `<Link to={pedidoHref(id)} state={{ doApp: true }}>`,
  a linha inteira como alvo, nome acessível com número e cliente; o teste da `73` que exigia "não são
  links" é **invertido** (não descartado), e as réguas de fonte a 130 %/200 % ficam.
- **Where**: `apps/mobile-adm/src/widgets/recent-orders/{ui/RecentOrders.tsx,__tests__/RecentOrders.test.tsx}`
- **Depends on**: T25
- **Done when**: a asserção antiga de ausência de link vira presença de link com o `href` certo e o
  `state`; Início → linha → detalhe → "Voltar" ⇒ Início (`<App />` real); alvo ≥ 44 px; as demais
  asserções da `73` intocadas; Full gate.
- **Reqs**: `MAP-52`, `MAP-20` (E7).
- **Status**: ✅ Feito. `widgets/recent-orders/ui/RecentOrders.tsx`: cada linha é `<Link to={pedidoHref(id)} state={{ doApp: true }}>` com `aria-label` "Pedido #0244, <cliente>" e `min-h-11`; o `li` guarda só a borda, o link leva as classes de quebra da `73`. `RecentOrders.test.tsx`: o caso `MAI-15` "NÃO são links" foi **invertido** (presença, `href` de cada um, nome acessível e alvo) e ganhou o caso do `state.doApp`; as cinco réguas da fonte a 130 %/200 % passaram **sem uma linha tocada** (14 → 15). O percurso Início → linha → detalhe → "Voltar" ⇒ Início está em `PedidoPage.test.tsx`.
- **Tests**: unit (componente) · **Gate**: full

### T27 — `27-troca-de-conta-limpa-o-cache`
- **What**: em `App`, quando `user.id` muda de um valor não nulo para outro ou para `null`,
  `queryClient.clear()` (E6); o `SIGNED_IN` da volta da aba (mesmo id) **não** limpa.
- **Where**: `apps/mobile-adm/src/app/App.tsx` + `app/__tests__/trocaDeContaLimpaCache.test.tsx`
- **Depends on**: T26
- **Done when**: troca de conta com lista, detalhe e selo em cache ⇒ nada da conta anterior desenhado
  (molde de `MAI-22`); a volta da aba com o mesmo usuário mantém o cache e não pisca (molde de
  `contratoComClientReal`); logout ⇒ cache vazio; Full gate.
- **Reqs**: R6, `MAP-37`, edge case "sair com a lista aberta".
- **Status**: ✅ Feito. `app/App.tsx` → `LimparCacheNaTrocaDeConta` (dentro do `AuthProvider`, efeito de layout): `user.id` não nulo → `null` ⇒ `queryClient.clear()`; não nulo → outro id ⇒ `queryClient.resetQueries()`. **SPEC_DEVIATION de E6, medida**: com `clear()` na troca A → B sem `SIGNED_OUT` a página e o layout seguem MONTADOS (o `h1` é o mesmo nó) e o selo continuava com o número de A — `clear()` não avisa quem observa; e `resetQueries()` no logout RELIA as consultas ainda montadas e reenchia o cache (a conta que voltava via a lista de antes). Marcado no código. Prova: `app/__tests__/trocaDeContaLimpaCache.test.tsx` (4) pela árvore real: A → B com lista, detalhe e selo em cache e tudo de B no ar ⇒ nenhuma linha, nenhum selo, nada de A no `main`, detalhe em esqueleto; a volta da aba (mesmo usuário) mantém o MESMO nó da linha e o selo, sem `aria-busy`; sair e voltar com a mesma conta e tudo no ar ⇒ nada de antes; TE7: sair com a lista aberta e a releitura em voo ⇒ `removeChannel` chamado, nenhum canal aberto, e a resposta atrasada nunca desenhada.
- **Tests**: unit (árvore real) · **Gate**: full

### T28 — `28-guardas-de-regra-e-de-movimento`
- **What**: `shared/lib/__tests__/regraDePedidoSoNoCore.test.ts` (MAP-49, com o recorte de E8) e um
  guarda de movimento com escopo literal dos arquivos novos da `74` (molde de
  `animacaoRespeitaMovimento`/`movimentoDaContaRespeitaMovimento`).
- **Where**: `apps/mobile-adm/src/shared/lib/__tests__/{regraDePedidoSoNoCore,movimentoDosPedidos}.test.ts`
- **Depends on**: T27
- **Done when**: o guarda de regra acusa entrada de mapa/`case` com chave de visão, status, pagamento ou
  meio (vocabulários **importados** de `core`) e literal de predicado de recorte (`status`,
  `material_status`, `payment_status`, `payment_method`, `tracking_code`) — e **não** acusa
  `.eq('id', …)`/`.eq('order_id', …)` nem `rowSummary(row).action === …` (inversos); âncora dupla
  (arquivos lidos + a chamada a `applyOrderSlice` achada); sensores CRLF/LF/glob; o de movimento com
  âncora de tokens e pares medida com a própria régua e o par a três linhas que não cobre; os dois
  verdes na árvore atual; Build gate (fim da Fase 4).
- **Reqs**: `MAP-45`, `MAP-49`.
- **Status**: ✅ Feito. `shared/lib/__tests__/regraDePedidoSoNoCore.test.ts` (25): régua 1 (entrada de mapa e `case` com chave dos vocabulários IMPORTADOS de `core` — `ORDER_VIEWS`, `ORDER_STATUS_LABELS`, `ORDER_PAYMENT_STATUS_LABELS`, `PAYMENT_METHOD_LABELS`) e régua 2 (predicado de recorte pela chamada e pela string de `.or()`); âncora dupla (83 arquivos de produção com os da `74` nomeados, e `applyOrderSlice(q, slice)` achado no hook da lista); 11 sensores positivos, 8 inversos (inclusive `.eq('id', id)`, `.eq('order_id', id)`, `rowSummary(row).action === 'salvar-rastreio'`, E8) e CRLF/LF/glob. **Allowlist de UMA linha, literal**: `'a-separar': 'a_separar',` em `widgets/queue-tiles/model/fila.ts` (`73`) — a chave é o id do BLOCO homônimo da visão e o valor é o nome do campo de `store_overview`; sensor prova que a mesma linha noutro arquivo, ou com valor de rótulo, é acusada. `movimentoDosPedidos.test.ts` (7): escopo literal de 21 arquivos (os de UI da `74` + `shared/ui/leitura.tsx`, dono do `Traco`), régua estreita da `59` (o par tem de DESLIGAR movimento); âncora medida 4 tokens / 2 pares (o `animate-pulse` do esqueleto e o `transition-colors` dos chips). **Sensor do autor (fase)**: 30 mutantes reinjetados nos arquivos reais, SHA-256 conferido na restauração, **30 mortos por asserção** (dois mutantes da primeira escrita morriam por compilação ou `TypeError` — M04 e M09 — e foram reescritos em forma válida antes de contar):

  | M | Mutação no arquivo real | Resultado |
  | --- | --- | --- |
  | G1 | mapa `{ shipped: … }` em `BlocoValores` | morto (`regraDePedidoSoNoCore`) |
  | G2 | `.eq('status', 'paid')` em `usePedido` | morto (idem) |
  | G3 | `Traco` sem `motion-reduce:animate-none` | morto (`movimentoDosPedidos`) |
  | G4 | `transition-colors` sem par no WhatsApp | morto (idem) |
  | G5 | a rota como `/estoque/:id` | morto (`abasSaoAsRotas`) |
  | M01 | "Voltar" sempre à lista | morto |
  | M02 | "Voltar" sempre `-1` | morto |
  | M03 | Total recalculado das linhas | morto |
  | M04 | WhatsApp sem `normalizeBrPhone` | morto (2) |
  | M05 | `blockedReason` desenhado | morto |
  | M06 | sem `aria-current` | morto |
  | M07 | selo ignora `isError` | morto |
  | M08 | teto do selo em 100 | morto |
  | M09 | logout sem limpar | morto (2) |
  | M10 | A → B com `clear()` | morto |
  | M11 | logout com `resetQueries()` | morto |
  | M12 | linha de Últimos pedidos sem `doApp` | morto |
  | M13 | a recusa desenha o cache | morto |
  | M14 | o aviso não invalida o resumo | morto |
  | M15 | "N joias" pelas linhas | morto |
  | M16 | sempre "precisam" | morto |
  | M17 | retirada tratada como entrega | morto |
  | M18 | detalhe não abre no topo | morto |
  | M19 | sem título do documento | morto |
  | M20 | sem `aria-label` com o selo | morto |
  | M21 | e-mail falho sem alerta | morto |
  | M22 | data pelo dia UTC | morto |
  | M23 | canal antes da confirmação | morto |
  | M24 | "grátis" sumindo | morto |

  **Build gate (fim da Fase 4)**, medido em 2026-10-24, um workspace por vez, exit fora de pipe: mobile-adm **782/60** (entrada da fase 641/53, **+141/+7**), store **5849/318**, backoffice **3670/210**, core **3988/158** (os três sem arquivo tocado nesta fase). `tsc` 0 em mobile-adm (`app` e `node`), store e backoffice; core 11 (os herdados). eslint mobile-adm **0/0**, backoffice 23/5, store 2/2. `pnpm --filter @estrelinha/mobile-adm build` verde. `packages/core/src/payment/**` e `filterChips.ts` sem alteração.
- **Tests**: guarda de fonte · **Gate**: build

### Fase 5 — o fecho

### T29 — `29-recusa-com-client-real-pela-arvore`
- **What**: `app/__tests__/pedidosComClientReal.test.tsx`: o `<App />` real sobre o supabase-js real
  (`clientReal.ts`) com `fetch` falso — uma conta sem papel cujo `order_list` devolve linhas dela e
  `atelie_clock` devolve `42501`, abrindo `/pedidos` e `/pedidos/<id dela>`.
- **Where**: `apps/mobile-adm/src/app/__tests__/pedidosComClientReal.test.tsx`
- **Depends on**: T28
- **Done when**: nas duas rotas, a recusa da `72` e **nenhum** texto das linhas da cliente no DOM, em
  nenhum instante observado; a RPC com rede ⇒ falha de leitura; mutante que troca a ordem de decisão
  de `lerComPapel` morre por asserção; Full gate.
- **Reqs**: `MAP-36`, `MAP-37`, `MAP-38`, Success Criterion 3 (com o probe `03` da T10).
- **Status**: ✅ Feito (2026-10-24). `app/__tests__/pedidosComClientReal.test.tsx` (8 = 4 × as duas rotas, `describe.each`): o `<App />` real sobre o supabase-js REAL; a conta abre com o papel conferido e o perde quando a primeira `atelie_clock` sai (o único caminho em que a página monta — sem papel na abertura o `RequireAdmin` nem a deixa montar). Casos: **par** (RPC 200 ⇒ "Clarice Sem Papel", `#0777` na tela — a régua tem alvo); RPC 403 `42501` + `order_list` com as linhas DELA ⇒ `/login` com `SEM_ACESSO` e **nenhum** texto delas (nome, `#0777`, a peça) em nenhum dos ~80 instantes lidos (o `body` a cada 50 ms do relógio falso), com `order_list` de fato pedido; RPC 403 + `order_list` em 500 ⇒ ainda a recusa (E2); RPC sem rede ⇒ `FALHA_DE_LEITURA`, rota mantida, papel lido UMA vez, nenhuma linha. **Arnês**: `clientReal.ts` ganhou `tabelas` (a forma de `rpc` para tabela/view; tabela sem entrada segue `[]`), nas DUAS cópias — `clientRealPareado` verde. **Sensor** (`lerComPapel.ts` real, SHA-256 `8fb5f4fa…` conferido na restauração): M1 ordem trocada (a consulta decide antes da RPC), M2 erro da RPC ignorado, M3 o dado sai antes da confirmação, M4 `Promise.all`, M5 rede vira recusa — **5 mortos por asserção**, nenhum por compilação. Full gate: mobile-adm 790/61, core 3988/158, store 5849/318, backoffice 3670/210, todos exit 0.
- **Tests**: integração (client real) · **Gate**: full

### T30 — `30-gates-e-documentacao`
- **What**: Build gate completo, um workspace por vez; atualizar as baselines do `CLAUDE.md` raiz (com
  o delta por workspace contra `baseline.md`), a linha da `74` em *Workflow de specs*, os guardas novos
  na tabela *Os guardas*; `apps/mobile-adm/CLAUDE.md` (Pedidos, `lerComPapel`, selo, rotas);
  `packages/core/CLAUDE.md` (o que subiu); a Traceability da `spec.md`; o handoff no `STATE.md`.
- **Where**: `CLAUDE.md`, `apps/mobile-adm/CLAUDE.md`, `packages/core/CLAUDE.md`, `spec.md`,
  `.specs/STATE.md`
- **Depends on**: T29
- **Done when**: os seis workspaces medidos (exit 0, fora de pipe), tipos 0 nos apps e 11 em core, lint
  sem regressão, `pnpm --filter @estrelinha/mobile-adm build` verde, `git diff --name-only` sem
  `packages/core/src/payment/**` nem `filterChips.ts`; nenhuma queda de contagem sem o número
  reaparecendo do outro lado; documentação com números **medidos**.
- **Reqs**: todos (gate) · `MAP-41` (`swSemDadosDaLoja` verde, sem `runtimeCaching`), `MAP-51`.
- **Status**: ✅ Feito (2026-10-24). Build gate, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem `--`: store **5849/318** (+34/+1 contra `baseline.md`) · backoffice **3670/210** (+22/+1) · mobile-adm **790/61** (+384/+22) · core **3988/158** (+142/+11) · functions **957/21** (0) · catalog-import **512/23** (0) = **15766/791** (+582/+35), todos exit 0, nenhuma queda. `tsc`: 0 em mobile-adm (`app` e `node`), store (`app` e `server`), backoffice e catalog-import; core **11**, os mesmos cinco arquivos herdados. eslint mobile-adm 0/0, backoffice 23/5, store 2/2 (sem regressão). `pnpm --filter @estrelinha/mobile-adm build` verde. `git diff --name-only feature/mobile-adm -- packages/core/src/payment` vazio e `filterChips.ts` intocado. `swSemDadosDaLoja` verde (`MAP-41`). Documentação: `CLAUDE.md` raiz (a linha da `74` em *Workflow de specs*, a próxima rascunho é a `75`; *Testes* 15766/791 com o parágrafo de delta; oito guardas novos na tabela), `apps/mobile-adm/CLAUDE.md` (rotas, seção *Pedidos*, guardas, arnês), `packages/core/CLAUDE.md` (módulos e a seção da lista), a Traceability e os Success Criteria da `spec.md`, e o handoff no `STATE.md`. Ordem: as medidas foram feitas antes da T31, e a T31 não mudou código de produto nem de teste (Q-T5 não disparou).
- **Tests**: none (gate) · **Gate**: build

### T31 — `31-prova-em-navegador`
- **What**: `prova-navegador.md`: build servido (`vite preview` numa porta livre), Chromium, banco local
  com fixturas de 60 pedidos (apagadas no fim), em **390×844** (alvo), **1440×900**, 360×800 e
  412×915, e a fonte do sistema a **130 % e 200 %**.
- **Where**: `.specs/features/74-mobile-adm-pedidos/{prova-navegador.md,prova/}`
- **Depends on**: T30
- **Done when**: medidos, não supostos: `scrollWidth == innerWidth` na lista, no detalhe e com a faixa
  de chips rolada; todo alvo ≥ 44 px (chips, linha, "Limpar filtro", "Voltar", "WhatsApp", "Tentar de
  novo"); a 130 %/200 % sem sobreposição (retângulos medidos), selo sem corte, número e total
  quebrando; rolagem real até o fim com 60 pedidos sem id repetido no DOM; o percurso Início → bloco →
  lista (número igual) → detalhe → voltar no mesmo recorte **e posição**, e o voltar do histórico;
  Início → Últimos pedidos → detalhe → voltar à Início; Realtime atualizando o detalhe aberto; o selo
  igual ao "Precisa de ação" e sumindo em 0; `prefers-reduced-motion` parado; zero hit para fora
  (intercepção por caminho, `*.supabase.co` bloqueado); defeito achado ⇒ task de bug com teste antes
  do conserto, e reteste.
- **Reqs**: `MAP-42`, `MAP-43`, `MAP-44`, `MAP-45`, `MAP-13`/`14` (real), Success Criteria 1 e 5.
- **Status**: ✅ Feito (2026-10-24). `prova-navegador.md` + `prova/` (três capturas, `fixturas.sql`, `limpa.sql`). Build servido (`vite preview --port 4374`, bundle `index-BNsPq-d3.js` conferido contra o `dist/`, SW e caches limpos), banco local com 60 pedidos `P74-NN` (apagados; `orders` 54 → 114 → 54, sequências intactas). Medido: os quatro blocos da Início (33/15/6/10) = a contagem da lista aberta pelo toque = o banco por `toSqlPredicate`; o selo 54 = "Precisa de ação" = o banco; 114 linhas em "Tudo", 114 ids distintos, rolagem real; voltar do detalhe ao MESMO recorte e posição (`scrollY` 3676, 33 linhas), voltar do histórico, Início → Últimos pedidos → detalhe → Início; foco no `h1` e título "Pedido #P74-20 · Ateliê"; Realtime atualizando o detalhe aberto e o selo (54 → 53) em < 1,5 s; 30 medições de layout (360/390/412 × fonte 100/130/200 % e 1440) com `scrollWidth == innerWidth`, zero sobreposição, alvos ≥ 44 px; faixa de chips rolando dentro de si; `prefers-reduced-motion` com 0 de 4 nós do esqueleto animados e `transition-property: none` nos chips; hosts só `localhost:4374` e `127.0.0.1:54441`. **Nenhum defeito da `74`**; duas observações herdadas (iguais no painel) registradas para decisão: "há 0 dias" (`queueAgeLabel`) e "Falha ao enviar … enviado" (`buildHistory`). Não medido: o selo sumindo em 0 (exigiria mexer em pedidos do seed; provado em `seloDaAba.test.tsx`) e o app instalado.
- **Tests**: navegador · **Gate**: —

---

## Requirement → Task

| Requisitos | Tasks |
| --- | --- |
| `MAP-01`, `MAP-02` | T03, T10, T14, T21 |
| `MAP-03`..`MAP-06` | T03, T13, T18, T21 |
| `MAP-07` | T03, T18 |
| `MAP-08`, `MAP-09` | T06, T14, T20 |
| `MAP-10`..`MAP-12` | T03, T10, T14, T19 |
| `MAP-13`..`MAP-15` | T06, T10, T14, T20, T31 |
| `MAP-16`..`MAP-19` | T04, T16, T17 |
| `MAP-20`..`MAP-30` | T05, T06, T07, T15, T22, T23, T24, T26 |
| `MAP-31`..`MAP-33` | T25 |
| `MAP-34`..`MAP-41` | T09, T12, T14, T15, T20, T21, T24, T29, T30 (`MAP-41`) |
| `MAP-42`..`MAP-46` | T17, T18, T20, T21, T22, T23, T24, T28, T31 |
| `MAP-47`..`MAP-51` | T02–T08, T28, T30 |
| `MAP-52` | T26 |
| `MAP-53` | T09, T10 |
| `MAP-54`, `MAP-55` | T24 |

**Coverage:** 55/55 mapeados.

---

## Pre-approval checks

### Granularity

| Task | Escopo | Status |
| --- | --- | --- |
| T02, T06, T07 | um arquivo de `core` (+ reexport de uma linha) | ✅ |
| T03, T04, T05 | dois–três arquivos de `core` de **uma** pergunta (recorte/busca; linha; detalhe) + reexport do painel — mover sem o reexport quebra o painel, então são coesos | ⚠️ OK (coeso) |
| T08 | delegação + guarda de referência + âncora de pureza | ⚠️ OK (coeso: é o fecho do "um dono") |
| T09 | migration + seu guarda + a entrada no guarda de RPC — o guarda da loja reprova sem a entrada | ⚠️ OK (coeso) |
| T10 | três probes da mesma leitura | ⚠️ OK |
| T11–T15, T16–T20, T25–T27, T29 | um hook / um componente / uma regra | ✅ |
| T21, T24 | uma página (composição) | ✅ |
| T22, T23 | quatro blocos apresentacionais cada, sem estado próprio | ⚠️ OK (coeso: um widget, divisão em duas para caber) |
| T28 | dois guardas de fonte do mesmo escopo | ⚠️ OK |

### Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T01 | — | início | ✅ |
| T02..T08 | a anterior | cadeia da Fase 1 | ✅ |
| T09 | T08 | Fase 1 → Fase 2 | ✅ |
| T10..T15 | a anterior | cadeia da Fase 2 | ✅ |
| T16 | T15 | Fase 2 → Fase 3 | ✅ |
| T17..T21 | a anterior | cadeia da Fase 3 | ✅ |
| T22 | T21 | Fase 3 → Fase 4 | ✅ |
| T23..T28 | a anterior | cadeia da Fase 4 | ✅ |
| T29 | T28 | Fase 4 → Fase 5 | ✅ |
| T30, T31 | a anterior | cadeia da Fase 5 | ✅ |

Nenhuma dependência aponta para fase posterior.

### Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T01 | medição | none | none | ✅ |
| T02–T07 | regra pura de `core` (+ reexport) | unit | unit | ✅ |
| T08 | reexport do painel + pureza | guarda + suíte | unit + guarda | ✅ |
| T09 | migration | guarda de fonte | guarda de fonte | ✅ |
| T10 | SQL/PostgREST | probe | probe | ✅ |
| T11 | arnês | unit | unit | ✅ |
| T12 | hook de leitura | unit + integração | unit + integração | ✅ |
| T13 | modelo + guarda | unit + guarda | unit + guarda | ✅ |
| T14, T15 | hooks de leitura | unit (cadeia registrada) | unit (+ guarda) | ✅ |
| T16–T20, T22, T23, T25, T26 | componentes | componente | unit (componente) | ✅ |
| T21, T24, T27 | páginas / `App` | componente pela árvore real | unit (árvore real) | ✅ |
| T28 | guardas | guarda de fonte | guarda de fonte | ✅ |
| T29 | contrato com o client real | integração | integração | ✅ |
| T30 | gate/doc | none | none | ✅ |
| T31 | layout | navegador | navegador | ✅ |

---

## Tools

- **Skills**: `tlc-spec-driven` (Execute + Verificador), `supabase` (T09, T10), `playwright-cli` (T31),
  `qa-report` + `qa-execution` (depois do Verificador).
- **MCP**: `playwright` (T31 e QA). Nenhum MCP de produção.

---

## Gate de Tasks — validação independente (2026-10-23)

> Validador ≠ autor. Lido contra `spec.md` (55 `MAP`, edge cases, Success Criteria), `design.md`
> (§7, §8, §13 E1–E8) e o código do worktree: os guardas da loja que varrem `apps/**`
> (`numeroDoPedidoComDonoUnico`, `notificationSingleOwner` — escopo `['apps', 'supabase/functions']`;
> `provenanceNotRead` — `['apps']`; `situacaoComDonoUnico`, `marcacaoSoPorAcao`), `formatOrderNumber`
> (`core/orders/format.ts`, já devolve `#0244`), `apps/mobile-adm/src/shared/lib` (só `useOnline.ts`:
> **não existe** `useDebounce` no app), `app/queryClient.ts` e o prefixo das migrations
> (último: `20261023120000_73-…`; o `20261024120000` da T09 está livre). **Veredito: aprovado para o
> Execute**, com as emendas abaixo.

**O que foi conferido e passa**: os 55 `MAP` têm task com prova (a tabela *Requirement → Task* bate
com o corpo das tasks); nenhuma dependência aponta para fase posterior; a ordem core → banco/probe →
arnês → hooks → UI → página respeita R3/`AD-012` (probe antes da primeira tela) e R9/`L-060` (dublê
que registra a cadeia antes do primeiro hook); as oito emendas E1–E8 do Design estão cada uma numa
task (E1/E2 T12, E3 T14, E4 T20, E5 T21/T24, E6 T27, E7 T17/T22/T26, E8 T28); os guardas cruzados
`marcacaoSoPorAcao` (T09), `situacaoComDonoUnico` (T16), `abasSaoAsRotas`/`rotasSobGuarda` (T24),
`clientRealPareado` (T11), `swSemDadosDaLoja` (T30) e a suíte do painel sem asserção tocada (T02–T08)
estão nomeados. O Full gate inclui a loja em toda task que cria arquivo em `apps/**`/`packages/**`.

### Emendas (obrigatórias)

| # | Task | Emenda | Por quê |
| --- | --- | --- | --- |
| TE1 | T17, T22, T26 | **Guardas cruzados esquecidos**: o "Done when" passa a incluir `numeroDoPedidoComDonoUnico` (loja) verde — o número na linha, no cabeçalho, no nome acessível ("Pedido #0244, <cliente>") e no título "Pedido #0244 · Ateliê" sai **só** de `formatOrderNumber`, nunca `` `#${…}` `` nem `'#' + …` (o guarda varre `apps/**` e reprova as duas formas). `provenanceNotRead` (painel, varre `apps/**`) verde: `COLUNAS_DA_LISTA` e as colunas do detalhe **não** nomeiam `nuvemshop_*_status`. `notificationSingleOwner` (loja) verde: o app não escreve nome de evento como literal (o histórico usa `buildHistory` de `core`) | os três guardas varrem o app novo e nenhuma task os citava; o primeiro reprovaria exatamente o nome acessível que a T17 descreve se escrito à mão |
| TE2 | T24 | O "Done when" ganha `MAP-46` e `MAP-44` do detalhe, que estavam só no *What*: título "Pedido · Ateliê" com a leitura pendente e "Pedido #0244 · Ateliê" com o dado; foco no `h1` (`document.activeElement`) entrando com a leitura **pendente** (E5); esqueletos por bloco com `aria-busy` e `motion-reduce:` | requisito no *What* sem prova no *Done when* é requisito sem dono na verificação |
| TE3 | T15 | `usePedido` com `staleTime: 0`, `refetchOnWindowFocus` e `retry: retryUnlessDenied`, como a lista (T14); caso: voltar ao primeiro plano relê o detalhe (`MAP-39`) | `MAP-39` vale para o detalhe também e só a T14 provava o foco |
| TE4 | T23, T24 | **Decisão (MAP-30)**: o "Tentar de novo" de um bloco em falha chama `refetch()` da query do pedido inteira (as cinco leituras dentro de **um** `lerComPapel`, como E2 manda), **sem** trocar os blocos bons por esqueleto (é releitura com dado). Prova: itens em falha → toque → itens aparecem, e o bloco Cliente nunca sai do DOM | uma query por bloco multiplicaria as confirmações de papel e quebraria "a recusa vence" de E2; refazer a query é a opção prática e não pisca |
| TE5 | T19 | **Decisão**: `useDebounce` não existe no app (conferido); nasce em `apps/mobile-adm/src/shared/lib/useDebounce.ts`, genérico (sem vocabulário de pedido), com o atraso **passado** pelo chamador (`SEARCH_DEBOUNCE_MS` de `core`). Não se importa o do painel (`apps/**` não importa de outro app) e não sobe para `core` (é hook de React, `purity.test.ts` recusa) | evita a pergunta em execução |
| TE6 | T21 | **Decisão (edge case)**: busca sem resultado no recorte ⇒ "Nada por aqui." + "Nenhum pedido com “<termo>”." e o recorte **não** muda; caso explícito no teste da página | o edge case da spec não estava em nenhum *Done when* |
| TE7 | T27 | O caso de troca de conta inclui o edge case "sair com a lista aberta": `SIGNED_OUT` com uma leitura da lista **em voo** ⇒ a resposta que chega depois não é desenhada e o canal da lista é removido (`removeChannel` chamado) | o edge case só estava coberto pela metade (o canal na T21) |
| TE8 | T09 | Antes de criar a migration, conferir `ls supabase/migrations` **no worktree e no repositório principal**: se outra feature (`75`…) já usou o prefixo `20261024120000`, usar o próximo livre. O guarda `atelieClockSchema` lê o arquivo pelo nome real | a colisão de prefixo da `48`/`49` só aparece no banco, tarde |
| TE9 | T30, T31, pós-QA | **Fecho do fluxo, decidido pelo pedido do usuário desta execução** (ele pediu commit ao final e a branch "pronta para merge"): depois de T31 + Verificador independente PASS + QA (`qa-report` → `qa-execution`) com todo bug achado virando task `B0n-nome` com teste antes do conserto e reteste até zerar, os commits saem **juntos, uma vez**, no branch `feat/74-mobile-adm-pedidos` (com o trailer `Co-Authored-By` do harness). O merge em `feature/mobile-adm` **não é executado** — a branch fica pronta (rebase/merge limpo conferido com `git merge-tree` ou `git merge --no-commit --no-ff` abortado) e o merge é decisão do usuário. Isso substitui, para esta execução, o "só quando o usuário pedir" do topo e o "a branch é mergeada" do protocolo | o pedido do usuário vence o texto computado; "deixar pronto para merge" não é mergear |

### Respostas às ambiguidades

| # | Pergunta | Decisão |
| --- | --- | --- |
| Q-T1 | T07 diz "Quick gate (core) + store" e o rótulo é `full` | vale **full** (core + mobile-adm + store + backoffice): `steps.ts` é arquivo novo em `packages/**`, que é a regra da tabela de gates |
| Q-T2 | T28 (guarda de regra no app) vem depois das telas — não seria melhor antes? | fica onde está: o guarda precisa da âncora positiva (a chamada a `applyOrderSlice`, que nasce na T14) e dos arquivos reais; o que ele achar na T28 é consertado na T28. Nenhum arquivo de UI declara mapa de status por desenho (o app só chama `core`) |
| Q-T3 | Lote 4 com 10 tasks | dividir: **Lote 4** = T22–T26, **Lote 5** = T27–T31 |
| Q-T4 | A T10 roda antes de existir hook — a "URL que o supabase-js monta" vem de onde? | dos tradutores de `core` (T03/T06) montados num script, e conferida contra a URL registrada pelo `clientReal` na T12; se divergirem, a T12 reprova |
| Q-T5 | A T31 acha defeito depois do Build gate da T30 | o defeito vira task de bug com teste, e T30 (gates + baselines) é **remedida** depois do conserto — a baseline escrita no `CLAUDE.md` é a da árvore final |

---

## Conserto do QA (2026-10-24)

> Bugs achados pela `qa-execution` (`docs/qa/reports/` do ciclo da `74`). Cada um: teste que reprova
> antes, conserto pela causa, mutante reinjetado no arquivo real (SHA-256 conferido na restauração),
> gates dos workspaces tocados **mais a loja**. Sem commit nesta etapa.

### B01 — `01-meio-de-pagamento-card-com-dono-unico`

- **Bug**: `BUG-20261024-pagamento-por-cartao-aparece-como-card` [Low · P2 · Trust-Damage]. O bloco
  Valores do detalhe mostrava `card` cru para todo pedido de cartão feito pelo checkout da própria
  loja (0174, 0178–0182). Evidência: `docs/qa/evidence/2026-10-24-mobile-adm-pedidos/390-detalhe-0174-meio-card.png`.
- **Causa (defeito 01)**: TRÊS mapas dos meios de pagamento — `core/orders/labels.ts` (sem `card`), o
  da loja (`apps/store/src/entities/order/lib/paymentDelivery.ts`, o único com `card`) e uma cópia
  privada no chip do painel (`apps/backoffice/src/features/order-list/model/filterChips.ts`, sem
  `card`) —, e o `BlocoValores` recuando para o valor cru (`?? pedido.payment_method`).
- **Conserto**: `core` ganha `card: 'Cartão de crédito'`, `PAYMENT_METHOD_FALLBACK` ("Outra forma de
  pagamento") e `paymentMethodLabel(method, labels?)` (apara, nunca devolve o cru). O ateliê chama
  `paymentMethodLabel`. A loja PARTE do mapa de `core` (`...CORE`) e troca só a voz de `manual`
  ("Combinado com a loja"); o chip do painel lê o mapa de `core` pela reexportação de `orderQuery`.
- **Nota contra `AD-056`** (o painel não muda de comportamento por causa do app): o painel muda num
  ponto só, e é conserto — o chip "Meio:" de um filtro por `card` passa a dizer "Cartão de crédito" em
  vez de `card`. As quatro palavras de antes não mudam. **Não tocado**: o "Método" de
  `AdminOrderPage.tsx` e o CSV do painel seguem imprimindo o valor cru — outra tela, fora do escopo
  deste bug, registrado aqui para decisão.
- **Prova**: `core/orders/__tests__/paymentLabels.test.ts` (o mapa com `card`, a função com quatro
  meios e quatro recuos, o barril); `widgets/order-detail/__tests__/ItensValoresEntregaHistorico.test.tsx`
  (+2: `card` ⇒ "Cartão de crédito", `wallet_xyz` ⇒ "Outra forma de pagamento");
  `apps/store/src/entities/order/lib/__tests__/paymentDelivery.test.ts` (novo, 3: toda chave de `core`
  com a mesma palavra menos `manual`, nenhuma chave só da loja, o recuo de `core`); painel
  `orderList.test.ts` (+1: "Meio: PIX, Cartão de crédito").
- **Sensor**: M1 `card` apagado de `core` (core e ateliê), M2 o recuo cru de volta em `core` (core e
  ateliê), M3 a loja voltando a lista própria sem `card` (loja), M4 o chip com a cópia de quatro
  (painel) — **4 mortos por asserção**, 0 por compilação.
- **Status**: ✅ Feito.

### B02 — `02-voltar-do-pedido-devolve-a-busca`

- **Bug**: `BUG-20261024-voltar-do-pedido-buscado-perde-a-busca` [Low · P3 · Friction]. Buscar, abrir
  um resultado e voltar (o "Voltar" do detalhe ou o do sistema) limpava a caixa e trazia o recorte
  inteiro no topo. A r3 do Verificador tinha apontado (`validation.md` §6).
- **Causa**: o termo era `useState('')` da `PedidosPage` (A13), e a página desmonta ao abrir o
  detalhe. A rolagem já tinha memória por entrada (`useRolagemRestaurada`); o termo, não — e sem ele a
  chave da lista buscada também se perdia.
- **Conserto**: `shared/lib/useTermoDaEntrada.ts`, no molde de `useRolagemRestaurada`: `Map` em
  módulo por `location.key` (nada em storage, nada no endereço — A13 continua valendo), gravado ao
  desmontar, lido na montagem. `BuscaDePedidos` ganha `inicial` (lido só na montagem, não reemitido).
  Com o termo de volta, a lista buscada sai do cache e a rolagem dela é restaurada. Entrada nova (a aba,
  um link colado) e F5 abrem sem termo. **A troca de conta esquece os termos** (`esquecerTermos()` em
  `LimparCacheNaTrocaDeConta`, ao lado do cache): um nome digitado por A não reaparece para B.
- **Prova**: `pages/__tests__/PedidosPage.test.tsx` (+2, pelo `<App />` real: buscar "Helena", abrir
  o resultado, `history.back()` ⇒ a caixa com "Helena", 1 linha, nenhuma leitura sem o termo, rolagem
  `(0, 320)`; e a entrada nova pela aba abrindo sem termo e com o endereço sem o termo);
  `app/__tests__/trocaDeContaLimpaCache.test.tsx` (+1: A busca, abre, B entra, volta ⇒ caixa vazia).
- **Sensor**: M5 a página de volta a `useState('')`, M6 a busca ignorando `inicial`, M7 o hook não
  lendo o `Map`, M8 a troca de conta sem `esquecerTermos()`, M9 o hook gravando vazio — **5 mortos por
  asserção**, 0 por compilação.
- **Status**: ✅ Feito.

### B03 — `03-falha-de-aviso-nomeia-o-evento`

- **Bug**: `BUG-20261024-falha-de-aviso-diz-enviado` [Low · P3 · Trust-Damage]. No bloco Histórico, um
  aviso que falhou aparecia como "Falha ao enviar aviso de pagamento aprovado **enviado** (E-mail)" —
  "falha" e "enviado" na mesma linha. Era a observação O2 de `prova-navegador.md`, nunca registrada.
- **Causa**: `buildHistory` (`packages/core/src/orders/history.ts`) montava a linha de FALHA com o
  rótulo de histórico `NOTIFICATION_EVENT_LABELS`, que está no passado ("o que aconteceu com este
  pedido?"). A pergunta da falha é "que evento é este?", e quem responde é `NOTIFICATION_EVENT_NAMES`
  (`core/notifications/catalog.ts`, feature `56`). Herdado do painel: a `74` levou a frase para `core`
  sem mudá-la, e `AdminOrderPage.test.tsx:334`, `orderDetail.test.ts:229` e `history.test.ts:46`
  travavam o texto errado.
- **Conserto**: na falha, `Falha ao enviar o aviso: <nome do evento> (<canal>)` — ex.: "Falha ao enviar
  o aviso: Pagamento aprovado (E-mail)"; evento fora do vocabulário mostra o slug. A linha do e-mail que
  SAIU não muda (continua o rótulo de histórico). `history.ts` passa a importar `catalog.ts` com `.ts`
  explícito (o grafo de `core/orders` segue alcançável pelo Deno; `purity.test.ts` verde).
- **Nota contra `AD-056`**: muda texto do PAINEL num ponto só — a linha de falha do histórico em
  `/admin/pedidos/:id` —, e é conserto do mesmo defeito (o painel lê o mesmo `buildHistory`). A decisão
  de mudar o texto do painel foi tomada aqui seguindo a recomendação do QA; se a dona preferir outra
  frase, é uma linha em `history.ts` e as quatro asserções abaixo.
- **Prova**: `core/orders/__tests__/history.test.ts` (+18: `it.each` dos 17 eventos — o título é
  exatamente `Falha ao enviar o aviso: ${NOTIFICATION_EVENT_NAMES[e]} (E-mail)` e nunca casa
  `/enviad[oa]/` —, e o evento fora do vocabulário pelo WhatsApp; o caso da linha 46 reescrito para o
  texto novo); painel `orderDetail.test.ts` e `AdminOrderPage.test.tsx` com as duas asserções
  atualizadas. Antes do conserto: 19 reprovam no core.
- **Sensor**: M10 a falha voltando a `rotuloDoEvento` (o rótulo no passado) em `history.ts` — morto por
  asserção no core (19) e no painel (2), 0 por compilação; SHA-256 de `history.ts` conferido na
  restauração (`d3124f01…adecf`).
- **Status**: ✅ Feito (aguarda o reteste do QA).

### Gate do conserto

Um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe: core **3998/158**,
mobile-adm **809/61**, backoffice **3671/210**, store **5852/319** — todos exit 0. `tsc` 0 em
mobile-adm, store e backoffice; `core` 11 (os herdados). eslint mobile-adm 0/0, backoffice 23/5,
store 2/2 (sem regressão). Autor = verificador nesta passada; o reteste do QA fecha os dois bugs.

**Gate do B03** (2026-10-24, um workspace por vez, `--testTimeout=20000` sem o `--`, exit fora de pipe):
core **4016/158** (+18, o B03), mobile-adm **811/61**, backoffice **3671/210** (duas asserções
reescritas, contagem igual), store **5852/319** — todos exit 0. `tsc` 0 em mobile-adm, backoffice e
store; `core` 11 (os herdados). eslint backoffice 23/5, mobile-adm 0/0 (store não tocado). O +2 do
mobile-adm sobre o gate anterior não é do B03 (nenhum arquivo do app tocado): remeça antes de usá-lo
como baseline.
