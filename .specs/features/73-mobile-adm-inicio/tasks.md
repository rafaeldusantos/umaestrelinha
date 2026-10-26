# 73 — mobile-adm: Início — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination
sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Commits — regra do projeto, acima da Skill** (`CLAUDE.md` raiz, `BL-012`): **sem** commit por
> task. Os commits saem juntos no fim, **no branch `feat/73-mobile-adm-inicio`**, e só quando o
> usuário pedir. Sub-agentes não fazem commit nem `git stash`.
>
> **Merge** (`AD-056`): finalizada e testada (tasks concluídas, Verificador com PASS, gates sem
> regressão, prova em navegador escrita), a branch é mergeada em **`feature/mobile-adm`**.
>
> **Banco**: só o local (`supabase migration up --local`, faixa 54440–54449). **Nunca**
> `supabase stop --all`, `db push` ou `secrets set`. Leitura em produção só por
> `supabase db query --linked` com `SELECT` (T01). Portas 8082–8084 são de outras sessões: a prova
> em navegador usa `vite preview` numa porta livre.

---

**Spec**: `.specs/features/73-mobile-adm-inicio/spec.md` · **Design**: `design.md` (abordagem A, `AD-057`)
**Status**: Draft

---

## Test Coverage Matrix

> Gerado do código, do `CLAUDE.md` raiz (*Baselines*, *Os guardas*, *Mobile é o caso principal*,
> *O defeito 01*), de `apps/backoffice/CLAUDE.md`, `apps/mobile-adm/CLAUDE.md`,
> `packages/core/CLAUDE.md` e dos `vitest.config.ts`. Lições: `L-030`, `L-033`, `L-043`, `L-046`,
> `L-054`, `L-055`.

| Camada | Tipo | Expectativa | Onde | Comando |
| --- | --- | --- | --- | --- |
| Regra pura de `core` (`orders/queue.ts`, `stats/*`) | unit | todo ramo; 1:1 com as ACs; cada edge case; paridade com a régua antiga **antes** de apagá-la | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Hooks de `core/hooks` | unit (`renderHook` + dublê **e** client real) | a chamada **sem argumento**, o `throw` do `{ error }`, o timer por duração, um canal por montagem e o fechamento | `packages/core/src/hooks/__tests__` | idem |
| Migration (`store_overview`) | guarda de fonte | régua **por comando** (`L-033`), âncora, `mutar()` que lança | `apps/store/src/shared/lib/__tests__` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| SQL semântico | probe contra o banco local | cada regra do §5 do design nas bordas; `42501` para anon e cliente | `.specs/features/73-mobile-adm-inicio/probes/*.sql` | `psql` no `54442` (ou `supabase db query --local`) |
| Widgets / página do app | componente (RTL + jsdom) montando o **`<App />` real** por `montarApp` | caminho feliz + cada edge case + falha **por leitura** (`L-043`) + pendura por leitura (`L-054`) | `apps/mobile-adm/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/mobile-adm test` |
| Contrato com o supabase-js real | integração (`clientReal.ts`) | o `42501` e o erro de rede chegando como `{ error }` ao hook | `apps/mobile-adm/src/app/__tests__` | idem |
| Painel (reexportações, `fetchTiles` por `core`) | a suíte existente, **sem asserção tocada** | igual à entrada | `apps/backoffice/**` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Layout em 360/412, puxar, PWA | navegador real | **não alcançável por jsdom** | `prova-navegador.md` | Playwright no build servido |

## Gate Check Commands

| Nível | Quando | Comando |
| --- | --- | --- |
| Quick | task só de `core` ou só do app | o workspace tocado |
| Full | **toda task que cria ou move arquivo em `apps/**` ou `packages/**`** (os guardas da loja varrem `apps/**`) | core + mobile-adm + store + backoffice, **um por vez**, `--testTimeout=20000` **sem o `--`** na loja e no painel, **exit code fora de pipe** |
| Build | fim de fase | Full + `npx tsc --noEmit -p` em `apps/{mobile-adm,store,backoffice}/tsconfig.app.json` e `apps/mobile-adm/tsconfig.node.json` + `npx eslint .` em mobile-adm e backoffice + `pnpm --filter @estrelinha/mobile-adm build` |

Baseline: **medida na T01 com a árvore parada** (a linha do `CLAUDE.md` raiz é 14644/731).

---

## Execution Plan

```
Fase 1 (entrada):          T01
Fase 2 (core):             T02 → T03 → T04 → T05 → T06
Fase 3 (banco):            T07 → T08 → T09
Fase 4 (base do app):      T10 → T11 → T12
Fase 5 (os blocos):        T13 → T14 → T15 → T16 → T17
Fase 6 (a página):         T18 → T19
Fase 7 (fecho):            T20 → T21
                           → Verificador independente (sempre)
```

Lotes para sub-agentes (~7 tasks, fases inteiras): **Lote 1** = Fases 1–3 (T01–T09) · **Lote 2** =
Fases 4–5 (T10–T17) · **Lote 3** = Fases 6–7 (T18–T21).

---

## Tasks

### T01 — `01-baseline-e-medicao-da-fila`
- **What**: medir as seis suítes com a árvore parada (`baseline.md`), e medir R1/R2 do design:
  quantos pedidos `status = 'paid'` têm `material_status` nulo, e quantos `pix`+`pending` têm
  `status <> 'pending'` — no banco local e em produção (`supabase db query --linked`, só `SELECT`).
- **Done when**: `baseline.md` com as seis contagens e exit codes; os dois números (local e
  produção) escritos nele, com a consulta usada. **Se algum for > 0, parar e levar ao usuário** antes
  da T02 (é a decisão de unificar ou não).
- **Reqs**: — (gate) · R1, R2.

- **Status: feito** (2026-10-22) — `baseline.md`: 14644 em 731, igual à linha do `CLAUDE.md` (core 3507/138 · mobile-adm 267/26 · store 5748/315 · backoffice 3653/208 · functions 957/21 · catalog-import 512/23, todos exit 0); tipos 0 nos 4 projetos; lint 23/5 · 2/2 · 0/0. **R1 = R2 = 0 no local e em produção.** R1 é zero **por construção**: `orders.material_status` é `NOT NULL` (default `nao_aplicavel`), então o ramo `is null` da união nunca casa.
### T02 — `02-regra-da-fila-em-core`
- **What**: `packages/core/src/orders/queue.ts` (sem import nenhum): `QUEUE_BLOCKS` (id, rótulo,
  frase, acento, regra), `NEEDS_ACTION_BLOCKS`, `toPostgrestFilter`, `needsActionOrFilter`,
  `toSqlPredicate`. Exportar no barril de `core/orders` com `.ts`.
- **Done when**: testes de cada tradutor por bloco; **`needsActionOrFilter()` === o
  `PRECISA_ACAO_OR` atual do painel** (paridade lida do arquivo do painel enquanto ele existe) e
  cada bloco gerando as mesmas condições do `fetchTiles` atual; rótulos e frases iguais a
  `QUEUE_TILES`; o `denoReach`/`purity` de `core/orders` verde; Quick gate.
- **Reqs**: `MAI-05`, `MAI-06`.

- **Status: feito** — `packages/core/src/orders/queue.ts` + barril; `__tests__/queue.test.ts` (paridade com `PRECISA_ACAO_OR`, as 4 cadeias do `fetchTiles` e os textos de `QUEUE_TILES` lidos do disco do painel) e `queue.ts` na âncora de `purity.test.ts`. R1 preservado por `unionRule` no bloco `a-separar`. Quick gate core 3536/139, exit 0. 3 mutantes reinjetados (2 no painel, 1 em core), 3 mortos por asserção.
### T03 — `03-painel-le-a-fila-de-core`
- **What**: `orderQuery.ts` troca `PRECISA_ACAO_OR` por `needsActionOrFilter()` e os rótulos de
  `QUEUE_TILES` por `QUEUE_BLOCKS` (o `apply` fica); `useAdminOrderList.fetchTiles` monta cada
  contagem com `toPostgrestFilter`. `MATERIAL_NAO_SEGURA_LISTA` passa a vir de `core`.
- **Done when**: suíte do painel **idêntica em contagem e sem asserção tocada**; os testes de
  contagem continuam enxergando o filtro (o dublê registra o `.or`); Full gate.
- **Reqs**: `MAI-06`.

- **Status: feito** — `orderQuery.ts` (`PRECISA_ACAO_OR = needsActionOrFilter()`, `QUEUE_TILES` de `QUEUE_BLOCKS` com o `apply` local, `MATERIAL_NAO_SEGURA_LISTA` reexportada) e `fetchTiles` por `q.or(toPostgrestFilter(bloco.rule))`. Probe PostgREST no local: as duas formas devolvem a mesma contagem (18/18, 1/1, 40/40, 12/12). Full gate: core 3537 · mobile-adm 267 · store 5748 · backoffice **3653/208 idêntico, nenhuma asserção tocada**. ⚠️ Nenhum teste do painel executa o `fetchTiles` (a página dubla o hook): a régua é o bloco "o painel lê de core" de `queue.test.ts`, que substituiu a leitura-paridade da T02 (mudança declarada no próprio arquivo). 2 mutantes no painel, 2 mortos.
### T04 — `04-tipos-e-rotulos-em-core-stats`
- **What**: `packages/core/src/stats/`: `movement.ts` (os tipos da `71`, movidos), `turn.ts`
  (`turnDelayMs`, movido), `overview.ts` (`StoreOverview` do §5), `labels.ts` (`greetingFor`,
  `monthName`, `weekdayShort`, `piecesLabel`, `paidOrdersLabel`, `relativeAge`, e o dinheiro sem
  centavos se `core/formatters` ainda não o tiver). Novo subpath `./stats` no `package.json`.
- **Done when**: saudação nas seis bordas; mês e dia por texto, **sem `new Date('AAAA-MM-DD')`** (e
  um caso que roda com `TZ` negativo); plurais em 0, 1 e 2; `relativeAge` com piso 0; os casos de
  `turnDelayMs` da `71` movidos sem perda; Quick gate.
- **Reqs**: `MAI-03`, `MAI-04`, `MAI-10`, `MAI-11`, `MAI-13`, `MAI-14`, `MAI-21`.

- **Status: feito** — `core/stats/{movement,turn,overview,labels,index}.ts`, subpath `./stats`, `formatPriceWhole` em `core/formatters/price.ts`; o tipo do painel reexporta. Testes: `labels.test.ts` (4 fusos de processo, 2 negativos, módulo reimportado, sensor do dia lido como data), `turn.test.ts`, `overview.test.ts`, `purity.test.ts`. Quick gate core 3784/143, exit 0. 5 mutantes: 4 mortos, 1 equivalente (o piso de `relativeAge`: duração negativa já cai em "agora"). Nota: 22/10/2026 é **quinta**-feira (o exemplo da spec diz quarta).
### T05 — `05-hooks-do-movimento-e-do-canal-em-core`
- **What**: `core/hooks/useStoreMovement.ts` e `core/hooks/useOrdersRealtime.ts` (com o nome do canal
  por parâmetro), movidos do painel. O painel **reexporta** pelos caminhos de hoje
  (`entities/stats`, `entities/order`), com teste de identidade (`toBe`). Antes de mover: listar os
  `vi.mock` do painel que alcançam os dois (`L-030`).
- **Done when**: os testes dos dois hooks rodam em `core` sem perda de caso; teste `toBe` das
  reexportações; suíte do painel **sem asserção tocada** (o `AdminDashboard.test.tsx` com um canal só
  e as duas releituras); Full gate.
- **Reqs**: `MAI-20`, `MAI-21`.

- **Status: feito** — `core/hooks/useStoreMovement.ts` e `core/hooks/useOrdersRealtime.ts` (nome do canal por parâmetro); os dois arquivos de teste **mudaram de casa** sem asserção tocada (10 + 4 casos) e ganharam 2 do nome do canal; o painel reexporta, com `entities/__tests__/reexportaDeCore.test.ts` (`toBe`, 4 casos). `vi.mock` listados antes: nenhum mock total dos dois módulos; os que alcançam `@estrelinha/supabase/client` continuam valendo (mesmo caminho resolvido). `AdminDashboard.tsx` passa `ORDERS_REALTIME_CHANNEL`. Full gate: core 3800 · mobile-adm 267 · store 5748 · backoffice **3643/207** (−14 que reaparecem em core, +4), exit 0 nos quatro, `AdminDashboard.test.tsx` intacto. 3 mutantes, 3 mortos.
### T06 — `06-hook-do-resumo`
- **What**: `core/hooks/useStoreOverview.ts`, molde exato de `useStoreMovement` (chave
  `STORE_OVERVIEW_KEY`, `rpc('store_overview')` sem argumento, `throw error`, timer por duração).
- **Done when**: a chamada sem segundo argumento; o `{ error }` virando erro da query; o timer
  agendado por `expira_em − lido_em`, com piso; Quick gate.
- **Reqs**: `MAI-09`, `MAI-21`.

- **Status: feito** — `core/hooks/useStoreOverview.ts` (`STORE_OVERVIEW_KEY`, `retryUnlessDenied`, `ACCESS_DENIED_CODE`) e `useStoreOverview.test.ts` (9). **SPEC_DEVIATION declarada**: `retry: retryUnlessDenied` no hook em vez do `retry: 1` do molde — `42501` não repete. Quick gate core 3809/146, exit 0. 4 mutantes, 4 mortos. ⚠️ Para o Lote 2: `useStoreMovement` mantém `retry: 1` no PRÓPRIO hook (a suíte da `71` prende isso, inclusive para `42501`), e opção de query vence a do `QueryClient` — o `retry` do §6 na T10 **não alcança** o movimento.
### T07 — `07-migration-store-overview`
- **What**: `supabase/migrations/20261023120000_73-resumo-do-atelie.sql` com `store_overview(p_agora)`
  pelo §5 do design; os predicados da fila **colados da saída de `toSqlPredicate`**. Aplicar só no
  local (`supabase migration up --local`). Conferir o índice de `paid_at` (R9) e registrar.
- **Done when**: a migration aplica limpa; `select public.store_overview()` como admin devolve a
  forma do §5; como anon e como cliente, `42501`; nenhuma escrita de dado.
- **Reqs**: `MAI-09`..`MAI-14`, `MAI-22`, `MAI-23`.

- **Status: feito** — `supabase/migrations/20261023120000_73-resumo-do-atelie.sql` (`stable security definer`, `search_path = ''`, `has_role` ⇒ `42501` antes de qualquer leitura, `revoke` de `public`/`anon`, `grant` só a `authenticated`, sem escrita de dado), predicados da fila colados da saída de `toSqlPredicate`. Aplicada com `supabase migration up --local`. Como admin devolve a forma do §5; anon ⇒ `42501` (sem execute); cliente ⇒ `42501` do `has_role`. R9: `paid_at` não tem índice geral (só o parcial de promoção) — registrado no cabeçalho, não otimizado.
### T08 — `08-guardas-da-migration-e-da-fila`
- **What**: `overviewSchema.test.ts` e `filaComDonoUnico.test.ts` (suíte da loja, §10 e R5 do design),
  e `store_overview` na lista literal de `marcacaoSoPorAcao.test.ts` (R4).
- **Done when**: uma régua por comando, âncora (arquivo + função + os 4 blocos), `mutar()` que lança,
  um sensor por bloco e por régua (inclusive `current_date`, `date_trunc('month', now())`, `limit 4`,
  venda sem `<> 'cancelled'`, `grant` a anon); cada sensor reinjetado no arquivo real e restaurado por
  SHA-256; Full gate.
- **Reqs**: `MAI-06`, `MAI-09`, `MAI-22`, `MAI-23`.

- **Status: feito** — `overviewSchema.test.ts` (22 réguas por comando, 22 sensores com `mutar()` que lança, âncora de arquivo/função/8 CTEs) e `filaComDonoUnico.test.ts` (os 4 blocos e a união byte a byte contra `core`, a idade, a fila sem data; um sensor por bloco e por régua); `store_overview` na lista literal de `marcacaoSoPorAcao.test.ts`. 13 mutantes reinjetados nos arquivos reais (12 na migration, 1 em `queue.ts`), SHA-256 conferido: 13 mortos por asserção. Full gate: core 3809 · mobile-adm 267 · store **5812/317** · backoffice 3643, exit 0.
### T09 — `09-probes-do-resumo`
- **What**: `probes/*.sql` contra o banco local, em `begin … rollback`, com fixturas: venda às 20:59 e
  21:00 de Brasília na virada de dia e de mês; segunda-feira; pago depois cancelado; convidada com
  compra em setembro e outubro; cadastrada que adotou pedido de convidada; item órfão
  `nuvemshop:…`; empate de peças; um pedido de cada bloco da fila (e um em dois blocos, para a união).
  Conferir `StoreOverview` (`overviewKeys`) contra a saída **real** (`AD-012`).
- **Done when**: todos `ok`, exit 0; o tipo conferido; banco local restaurado.
- **Reqs**: `MAI-09`..`MAI-14`, `MAI-06`, Edge Cases.

- **Status: feito** — `probes/01-resumo.sql` (reaplica a migration DENTRO da transação, então mede o arquivo; `begin … rollback`; nenhum `nextval`), 23 asserções `ok`, exit 0, saída em `probes/01-resumo.saida.txt`. Cobertas: 21:30 e 23:59 de Brasília no dia 28, 00:00 no dia 1, segunda = dow 1, pago e cancelado, pago depois do instante, convidada em fevereiro e março (e-mail com outra caixa), cadastrada que adotou o pedido antigo, órfã `nuvemshop:` pelo nome, empate por nome, `limit 4`, cada bloco e um pedido em dois, a fila igual às consultas do painel, recentes de qualquer estado, as chaves de cada nível iguais a `OVERVIEW_KEYS`, `42501` para anon e cliente. 9 mutantes na migration: 8 mortos de primeira, 1 sobrevivente (`precisa_acao + 1`, que a diferença cancelava) — fechado com a asserção absoluta da união e reinjetado: morto. Banco restaurado (sequência 183, 54 pedidos, 9 clientes, 9 usuários, antes e depois).
### T10 — `10-arnes-e-query-client-do-app`
- **What**: `test/fakeSupabase.ts` ganha `rpc()` (registra nome **e** args; respostas, erro e
  pendura por RPC) e `channel()` (registra nome, `postgres_changes`, `removeChannel`, e `emitir()`);
  `App.tsx` ganha o `retry` do §6 (`42501` não repete).
- **Done when**: os 267 casos da `72` verdes; caso do `retry` com `42501` (uma chamada) e com erro de
  rede (duas); Quick gate.
- **Reqs**: `MAI-22`, `MAI-24`.

- **Status: feito** — `test/fakeSupabase.ts` (`rpc` registra nome **e** args, com `responderRpc`/`falharRpc`/`pendurarRpc`/`aoChamarRpc`/`chamadasDe`; `channel`/`removeChannel` com `canaisAbertos` e `emitir`) + `test/__tests__/fakeSupabase.test.ts` (6); `app/queryClient.ts` (`criarQueryClient`, `retry: retryUnlessDenied`, um cliente por montagem do `<App />`) e `App.tsx` usando-o; **decisão do orquestrador**: `useStoreMovement({ retry })` em `core` (padrão `1`, a suíte da `71` intocada; +2 casos em `useStoreMovement.test.ts`) e `entities/stats` (`useMovimento` = movimento com `retryUnlessDenied`, `useResumo`); `app/__tests__/queryClient.test.tsx` (8: o padrão do cliente e as duas leituras, `42501` ⇒ 1 chamada, rede ⇒ 2, sem argumento). Full gate (2026-10-22, um workspace por vez, exit fora de pipe): core 3811/146 · mobile-adm 281/28 · store 5812/317 · backoffice 3643/207, exit 0 nos quatro. ⚠️ A prova pelo `<App />` real de "uma chamada só com `42501` do movimento" fica para a T18: até lá a Início não lê nada (é "em construção"); hoje ela é provada pelo hook que a Início vai usar (`useMovimento`) sob o `QueryClient` do app.

### T11 — `11-enderecos-de-pedidos-e-vigia-de-recusa`
- **What**: `entities/order/model/pedidosHref.ts` e `features/access-check/model/useRecusaDePapel.ts`.
- **Done when**: os três endereços (visão, bloco, "Tudo") com o vocabulário de `core`; a vigia chama
  `retryAdminCheck` **uma vez** no primeiro `42501`, nunca num erro de rede; Quick gate.
- **Reqs**: `MAI-07`, `MAI-15`, `MAI-22`, `MAI-24`.

- **Status: feito** — `entities/order/model/pedidosHref.ts` (+ `lerDestinoDePedidos`, a leitura que a `74` fará) e `features/access-check/model/useRecusaDePapel.ts` (+ `ehRecusaDePapel`), com testes (6 + 4; a vigia sobre o `AuthProvider` real, medida pela consulta do papel saindo de novo). **SPEC_DEVIATION** no arquivo: os ids de bloco vêm de `core`, mas os de visão (`precisa-acao`, `tudo`) ainda moram no painel (`OrderViewId`); a `74` os leva a `core`. Full gate (T11–T13 juntas): core 3811 · mobile-adm 311/32 · store 5812/317 · backoffice 3643/207, exit 0.

### T12 — `12-puxar-para-atualizar`
- **What**: `shared/ui/PullToRefresh.tsx` + `overscroll-behavior-y: contain` no `body` do app.
- **Done when**: o gesto acima do limiar chama `onRefresh` uma vez, abaixo não; indicador
  `role="status"` enquanto a promessa está no ar e some ao terminar (inclusive na falha); fora do
  topo não dispara; `motion-reduce:` no indicador; Quick gate.
- **Reqs**: `MAI-19`, `MAI-31`.

- **Status: feito** — `shared/ui/PullToRefresh.tsx` (limiar 64 px, só no topo, uma chamada, `role="status"` "Atualizando…" que some também na falha, `motion-reduce:animate-none`) e `overscroll-behavior-y: contain` no `body` de `app/app.css`; `shared/ui/__tests__/PullToRefresh.test.tsx` (8, inclusive o `app.css` lido do disco). Full gate (T11–T13 juntas): core 3811 · mobile-adm 311/32 · store 5812/317 · backoffice 3643/207, exit 0.

### T13 — `13-bloco-movimento`
- **What**: `widgets/movement-hero` (faixa escura, saudação, data, períodos, quatro números).
- **Done when**: os três estados; troca de período **sem leitura** e com `aria-pressed`; `—` no
  ticket sem venda, `R$ 0` e `0`; saudação pela hora do `lido_em` em Brasília com o aparelho em UTC;
  nome acessível de cada número; Quick gate.
- **Reqs**: `MAI-01`..`MAI-04`, `MAI-17`, `MAI-18`, `MAI-30`.

- **Status: feito** — `shared/ui/leitura.tsx` (`Leitura<T>`, `FalhaDoBloco`, `Traco`: os três estados de todo bloco) e `widgets/movement-hero` (`ui/MovementHero.tsx`, `model/numeros.ts`); `__tests__/MovementHero.test.tsx` (12, processo em UTC: 14:30Z ⇒ "Bom dia", 01:30Z do dia 23 ⇒ "Boa noite" e "quinta-feira, 22 de outubro"). Spec emendada: o exemplo da data dizia quarta-feira (22/10/2026 é quinta); o comentário de `longDateLine` em `core/stats/labels.ts` também. Visitas ganhou a linha "Visitas contam navegadores, não pessoas." (assunção da spec). Full gate (T11–T13 juntas): core 3811 · mobile-adm 311/32 · store 5812/317 · backoffice 3643/207, exit 0.

### T14 — `14-bloco-precisa-de-voce`
- **What**: `widgets/queue-tiles`.
- **Done when**: os 4 blocos na ordem de `QUEUE_BLOCKS`, só o primeiro com acento e com a idade de
  `queueAge` (e sem idade em zero); toque ⇒ `pedidosHref({ bloco })`; "Ver pedidos" ⇒ visão; os zeros
  visíveis; a faixa rola dentro de si (classe); alvos ≥ 44 px; Quick gate.
- **Reqs**: `MAI-05`..`MAI-08`, `MAI-27`.

- **Status: feito** — `widgets/queue-tiles` (`ui/QueueTiles.tsx`, `model/fila.ts`: `CONTAGEM_DO_BLOCO` exaustivo por `Record` e `idadeDoMaisAntigo` = "o mais antigo " + `queueAgeLabel` do painel, contra o `lido_em`); `__tests__/QueueTiles.test.tsx` (14); fixturas `test/resumo.ts` e `test/rotas.tsx`/`test/Destino.tsx`. Build gate (fim da Fase 5, T14–T17): core 3811/146 · mobile-adm 355/37 (356 depois do caso do sensor `m`) · store 5812/317 · backoffice 3643/207, exit 0; tipos 0 em mobile-adm (app e node), store e backoffice; lint mobile-adm 0/0 · backoffice 23/5 · store 2/2; `pnpm --filter @estrelinha/mobile-adm build` exit 0.

### T15 — `15-grafico-sete-dias`
- **What**: `widgets/week-chart`.
- **Done when**: 7 barras na ordem do banco; maior barra = maior valor; `—` e piso de altura no dia
  zero; "hoje" e cor de destaque só na última; total no cabeçalho; legenda; Quick gate.
- **Reqs**: `MAI-10`.

- **Status: feito** — `widgets/week-chart` (`ui/WeekChart.tsx`, `model/barras.ts`: 84 px na maior, piso 4, ordem do banco, "hoje" e `accent` só na última); `__tests__/WeekChart.test.tsx` (10). Build gate (fim da Fase 5, T14–T17): core 3811/146 · mobile-adm 355/37 (356 depois do caso do sensor `m`) · store 5812/317 · backoffice 3643/207, exit 0; tipos 0 em mobile-adm (app e node), store e backoffice; lint mobile-adm 0/0 · backoffice 23/5 · store 2/2; `pnpm --filter @estrelinha/mobile-adm build` exit 0.

### T16 — `16-mes-clientes-e-joias`
- **What**: `widgets/month-cards` e `widgets/top-jewels`.
- **Done when**: nome do mês por texto; "1 pedido pago"/"N pedidos pagos"; clientes novas; até 4
  joias com "1 peça"/"N peças"; vazio explicado; `grid-cols-2` com `minmax(0,1fr)`; Quick gate.
- **Reqs**: `MAI-11`..`MAI-13`, `MAI-28`.

- **Status: feito** — `widgets/month-cards` (`grid-cols-2` = `repeat(2, minmax(0,1fr))`, "Fat. de <mês>" por `monthName`, `paidOrdersLabel`) e `widgets/top-jewels` (até 4, `piecesLabel`, "Ainda não houve venda neste mês."; ícone neutro, a estrela da marca); testes 7 + 6. Build gate (fim da Fase 5, T14–T17): core 3811/146 · mobile-adm 355/37 (356 depois do caso do sensor `m`) · store 5812/317 · backoffice 3643/207, exit 0; tipos 0 em mobile-adm (app e node), store e backoffice; lint mobile-adm 0/0 · backoffice 23/5 · store 2/2; `pnpm --filter @estrelinha/mobile-adm build` exit 0.

### T17 — `17-ultimos-pedidos`
- **What**: `widgets/recent-orders`.
- **Done when**: 4 linhas com nome, `formatOrderNumber`, `relativeAge` contra o `lido_em`, total com
  centavos e o selo de `orderSituation`; as linhas **não** são links (nem `<a>`, nem `role`);
  "Ver todos" ⇒ visão "Tudo"; vazio explicado; Quick gate.
- **Reqs**: `MAI-14`..`MAI-16`.

- **Status: feito** — `widgets/recent-orders` (4 linhas de texto, `formatOrderNumber`, `relativeAge` contra o `lido_em`, `formatPrice` com centavos, "Ver todos" ⇒ `/pedidos?visao=tudo`, "Ainda não há pedidos.") e `entities/order/ui/SituacaoDoPedido.tsx` (rótulo e tom de `orderSituation`; só a apresentação do tom, molde do selo da loja, sem hex à mão); `__tests__/RecentOrders.test.tsx` (8). Build gate (fim da Fase 5, T14–T17): core 3811/146 · mobile-adm 355/37 (356 depois do caso do sensor `m`) · store 5812/317 · backoffice 3643/207, exit 0; tipos 0 em mobile-adm (app e node), store e backoffice; lint mobile-adm 0/0 · backoffice 23/5 · store 2/2; `pnpm --filter @estrelinha/mobile-adm build` exit 0. Sensor do Lote 2: 27 mutantes reinjetados nos arquivos reais (SHA-256 conferido na restauração), 26 mortos por asserção de primeira; 1 sobrevivente (`m`, a guarda de contagem zero na idade, verdadeira nos dois mundos com a fixtura coerente) — fechado com o caso "contagem zero com data antiga" e reinjetado: morto.

### T18 — `18-a-pagina-inicio`
- **What**: `pages/InicioPage.tsx` compõe os blocos, o `PullToRefresh`, o Realtime
  (`atelie-orders-realtime`, invalida as duas chaves) e a vigia de recusa. O caso `MAF-18` do
  `TabBar.test.tsx` deixa de incluir `/` (a Início saiu do "em construção") — **mudança de asserção
  declarada**, com a vizinha provando que as outras três abas seguem em construção.
- **Done when**, pelo `<App />` real em `/`: uma chamada de cada RPC, sem argumento; erro de cada uma
  sozinha mantém os blocos da outra (`L-043`); pendura de cada uma sozinha (`L-054`); releitura falha
  mantém os números com "Atualizado às" e o aviso; `42501` ⇒ Login com `SEM_ACESSO` e nenhum número
  na tela; um canal só (com re-render), fechado ao trocar de aba e ao sair; `emitir()` relê as duas; o
  puxar relê as duas; a volta ao primeiro plano relê; resposta antiga chegando depois descartada; o
  rodapé da `72` presente; Full gate.
- **Reqs**: `MAI-01`, `MAI-09`, `MAI-17`..`MAI-26`, `MAI-29`.

- **Status: feito** — `pages/InicioPage.tsx` (as duas leituras por `useMovimento`/`useResumo`, `leituraDe` com a recusa sem número, "Atualizado às" por `formatStoreHour` do `lido_em` mais antigo, "Não consegui atualizar agora.", o canal `atelie-orders-realtime` invalidando as duas chaves, o `PullToRefresh`, um `h2` `sr-only` "A semana e o mês" para a hierarquia) e `pages/__tests__/InicioPage.test.tsx` (25 casos pelo `<App />` real: uma chamada de cada RPC sem argumento e só RPC; erro **e** pendura de cada leitura sozinha; "Tentar de novo" relê só a sua; frescor e a releitura que falha; `42501` de cada RPC ⇒ uma chamada e o Login com `SEM_ACESSO`; `42501` com o papel ainda admin; rede nunca vira recusa; um canal com re-render, fechado ao trocar de aba e ao sair, resposta em voo não desenhada; o aviso, o puxar, o foco e a virada relendo as duas; resposta antiga descartada; a rede caindo e voltando). Fixtura `test/movimento.ts`. **`MAF-18`, mudança de asserção declarada** em `TabBar.test.tsx`: sai `/` e a régua `leiturasDeDado()` dele; vizinha com as três abas por extenso e um caso de que a Início não é mais "em construção". **Defeito achado e consertado (red → green)**: a vigia da recusa reconferia a cada MONTAGEM — `retryAdminCheck` põe `loading`, o `RequireAdmin` desmonta a página, e com o papel ainda `admin` a tela entrava em laço; a marca saiu do `useRef` para fora do React, por episódio (`useRecusaDePapel.ts`, +1 caso). Spec (`MAI-18`) e design (§6, decisões da T18) emendados. Full gate final (2026-10-22, um workspace por vez, exit fora de pipe, `--testTimeout=20000` sem o `--` na loja e no painel): core 3811/146 · mobile-adm 387/39 · store 5812/317 · backoffice 3643/207 · functions 957/21 · catalog-import 512/23, exit 0 nos seis.

### T19 — `19-contrato-com-o-client-real`
- **What**: sobre `clientReal.ts` (supabase-js 2.110.7 com `fetch` falso): a RPC respondendo 403
  `42501`, 500 e falha de rede, chegando à Início.
- **Done when**: `42501` ⇒ recusa; 500 e rede ⇒ falha do bloco, **nunca** a recusa; Quick gate.
- **Reqs**: `MAI-22`, `MAI-24`.

- **Status: feito** — `app/__tests__/inicioComClientReal.test.tsx` (4: o par 200 desenhando; 403 `42501` ⇒ uma chamada e o Login com `SEM_ACESSO`, sem número; 500 e falha de rede ⇒ a falha do bloco, duas chamadas, papel NÃO reconferido). O arnês `test/clientReal.ts` ganhou `rpc` no cenário (`{ status, corpo }`, `rede`, `pendura`; sem entrada, `null` com 200), **nas duas cópias** (app e loja), com `clientRealPareado.test.ts` verde. Sem isso, duas suítes da `72` caíam: o `fetchFalso` respondia `[]` à RPC e o topo lia `[]` como movimento (`longDateLine(undefined)` lança). Quick gate mobile-adm verde.

### T20 — `20-gates-e-documentacao`
- **What**: Build gate completo; baselines do `CLAUDE.md` raiz; `apps/mobile-adm/CLAUDE.md` (a
  Início, `AD-057`), `apps/backoffice/CLAUDE.md` (as reexportações e a fila de `core`),
  `packages/core/CLAUDE.md` (`orders/queue`, `stats`, os hooks), a tabela de guardas com os dois
  novos; status da `73` no parágrafo de numeração.
- **Done when**: os números medidos um workspace por vez, com o delta contra a T01; lint e tipos sem
  regressão; `packages/core/src/payment/**` com zero arquivos alterados.
- **Reqs**: —.

- **Status: feito** — Gates finais (2026-10-22, um workspace por vez, exit fora de pipe): core 3811/146 · mobile-adm 387/39 · store 5812/317 · backoffice 3643/207 · functions 957/21 · catalog-import 512/23 = **15122 em 753**, exit 0 nos seis; contra a T01 (14644/731): **+478/+22** (core +304/+8, mobile-adm +120/+13, store +64/+2, backoffice −10/−1 — os 14 casos dos dois hooks mudaram para `core` e +4 da reexportação —, functions e catalog-import 0). Tipos 0 em mobile-adm (app e node), store (app e server), backoffice e catalog-import. **`packages/core` não tem tipos zerados, e não é desta feature**: `tsc -p packages/core/tsconfig.json` dá 11 erros (`home/__tests__/carousel` 5, `pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/__tests__/urls` 2, `packages/supabase/src/client.ts` 2), **idênticos linha a linha** na base `feature/mobile-adm` medida num `git worktree` fora do repositório (com o `node_modules` da raiz por symlink), e nenhum dos cinco arquivos difere da base. Lint 0/0 · 23/5 · 2/2. `pnpm --filter @estrelinha/mobile-adm build` exit 0. `packages/core/src/payment/**`: zero arquivos alterados (diff contra a base e `git status`). `CLAUDE.md` raiz (numeração, guardas, baselines), `apps/mobile-adm/CLAUDE.md`, `apps/backoffice/CLAUDE.md` e `packages/core/CLAUDE.md` atualizados.

### T21 — `21-prova-em-navegador`
- **What**: `vite preview` do app numa porta livre, contra o banco local com fixturas, em 360×800 e
  412×915: os números contra os probes e contra `/admin` e `/admin/pedidos` do painel no mesmo
  instante; sem rolagem horizontal; `R$ 99.999` numa linha; a faixa da fila rolando dentro de si; o
  puxar em aba (sem recarregar a página) e instalado; um pedido criado no banco aparecendo pelo
  Realtime; perder o papel com o app aberto.
- **Done when**: `prova-navegador.md` com as medidas e as capturas; defeito achado vira conserto com
  teste, ou dívida declarada; banco local restaurado.
- **Reqs**: `MAI-20`, `MAI-22`, `MAI-27`, `MAI-28`, Success Criteria.

- **Status: feito** — `prova-navegador.md` + `prova/` (build servido na 4317, Supabase local, 360×800 e 412×915): zero rolagem horizontal; `R$ 99.999` e `R$ 9.999,90` numa linha; a faixa rolando dentro de si (0 → 456 com `window.scrollX` 0); nenhum alvo < 44 px; os números contra `store_movement`/`store_overview` e contra as cadeias do painel no PostgREST (18 · 10 · 1 · 0, união 29); o puxar por toque real relendo as duas sem recarregar; o Realtime (`INSERT` no banco ⇒ tela em < 1 s) com **um** `realtime.subscription`, fechado ao trocar de aba; o papel removido com a tela aberta ⇒ 403 uma vez em cada RPC e o Login com a recusa, sem número em nenhum quadro. **Defeito D1 achado e consertado com teste**: depois de a rede cair e voltar a Início nunca mais relia (o `QueryClientProvider` dentro do ramo offline desligava o `onlineManager`); o provider subiu em `app/App.tsx`, caso novo em `InicioPage.test.tsx` red → green, remedido no navegador. Banco restaurado às contagens de antes (54 · 82 · 9 · 9 · 3 · 9, sequências intactas).

---

## Requirement → Task

| Req | Tasks |
| --- | --- |
| MAI-01..04 | T04, T13, T18 |
| MAI-05..08 | T02, T03, T07, T08, T14 |
| MAI-09..13 | T04, T06, T07, T09, T15, T16 |
| MAI-14..16 | T04, T07, T11, T17 |
| MAI-17..21 | T05, T06, T12, T13, T18 |
| MAI-22..26 | T07, T08, T10, T11, T18, T19, T21 |
| MAI-27..31 | T12, T14, T16, T18, T21 |

**Coverage:** 31 total, 31 mapped, 0 unmapped.
