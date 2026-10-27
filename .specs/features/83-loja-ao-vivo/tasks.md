# 83 — Loja ao vivo, Fase 1 (Acessos) — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination
sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Onde**: só na worktree `/Users/rafael.santos/Projetos/uma-estrelinha/store-83-loja-ao-vivo`,
> branch `feature/83-loja-ao-vivo`. **Nunca** editar `/Users/rafael.santos/Projetos/uma-estrelinha/store`
> (a árvore principal tem a `82` em curso, sem commit).
>
> **Commits — regra do projeto, acima da Skill** (`CLAUDE.md` raiz, `BL-012`): **sem** commit por
> task. Os commits saem juntos no fim, e só quando o usuário pedir. Sub-agentes não fazem commit nem
> `git stash`.
>
> **Números reservados**: decisão `AD-066` (a `AD-065` é da `82`); backlog a partir de `BL-055`;
> migration `20261029120000` (a `82` usa `20261028120000`).
>
> **Banco**: só o local (faixa 54440–54449; `supabase migration up --local` ou `psql` na 54442).
> **Nunca** `supabase stop --all`, `db push` ou `secrets set`. As portas 8082–8084 são de outras
> sessões: a prova em navegador usa `vite preview` numa porta livre.
>
> **Lições**: ler `.specs/LESSONS.md` direto — **não** rodar `scripts/lessons.py list` (apaga lições).

---

**Spec**: `spec.md` · **Design**: `design.md` (abordagem A, `AD-066`) · **Baseline**: `baseline.md`
**Status**: Draft

---

## Test Coverage Matrix

> Gerado do código, do `CLAUDE.md` raiz (*Baselines*, *Os guardas*, *Mobile é o caso principal*,
> *O defeito 01*), de `apps/mobile-adm/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, dos
> `vitest.config.ts` e das features `71` e `73`. Lições: `L-030`, `L-033`, `L-035`, `L-043`, `L-046`,
> `L-058`, `L-059`, `L-061`, `L-063`, `L-071`.

| Camada | Tipo | Expectativa | Onde | Comando |
| --- | --- | --- | --- | --- |
| Migration SQL | guarda de fonte | régua **por comando** (`L-033`), `mutar()` que lança, âncora (arquivo + 3 funções + 1 `alter table`), varredura de **todas** as migrations que alteram `store_visits` (`L-035`) | `apps/store/src/shared/lib/__tests__/visitasPorHoraSchema.test.ts` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| SQL semântico | probe contra o banco local | cada AC de `LAV-70`..`LAV-74` nas bordas (02:59/03:00, 23:59 BRT, segunda, dia vazio, linha sem hora, repetição, corte da hora), recusas de papel (`L-059`) | `.specs/features/83-loja-ao-vivo/probes/*.sql` | `psql "postgresql://postgres:postgres@127.0.0.1:54442/postgres" -v ON_ERROR_STOP=1 -f <probe>` |
| Regra pura de `core` (`live/*`, `stats/counterNotes.ts`) | unit | todo ramo; 1:1 com as ACs; cada edge case (zero, `null`, limiar `p = 0`, singular/plural — `L-071`); pureza com âncora | `packages/core/src/{live,stats}/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test --testTimeout=20000` |
| Hook de `core/hooks` | unit (`renderHook` + dublê) | a opção nova repassada; `refetchIntervalInBackground: false`; o intervalo para na recusa; o timer não lê sem foco; nada muda sem a opção | `packages/core/src/hooks/__tests__/useStoreMovement.test.ts` | idem |
| Widgets / páginas do app | componente (RTL + jsdom) montando o **`<App />` real** por `montarApp` | caminho feliz + cada edge case + os três estados **exclusivos** (`L-063`) + falha e pendura da leitura | `apps/mobile-adm/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` |
| Contrato com o supabase-js real | integração (`src/test/clientReal.ts`) | `42501` ⇒ recusa; 500 e rede ⇒ falha | `apps/mobile-adm/src/app/__tests__` | idem |
| Guardas de fonte do app | guarda | âncora + sensores (CRLF/LF/glob) + inverso | `apps/mobile-adm/src/shared/lib/__tests__`, `src/widgets/tab-bar/__tests__` | idem |
| Painel (reexportação) | a suíte existente **sem asserção tocada** + guarda `toBe` | igual à entrada + o guarda novo | `apps/backoffice/**` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Política | guarda de fonte + componente | parágrafo palavra por palavra + sensores | `apps/store/src/pages/__tests__` | store suite |
| Layout em 360/390/412, fonte 130/200 %, puxar | navegador real | **não alcançável por jsdom** | `prova-navegador.md` | Playwright no build servido |

## Gate Check Commands

| Nível | Quando | Comando |
| --- | --- | --- |
| Quick | task só de `core` | `pnpm --filter @estrelinha/core test --testTimeout=20000` (sem o `--`, igual à baseline) |
| Full | **toda task que cria ou move arquivo em `apps/**`, `packages/**` ou `supabase/**`** (os guardas da loja varrem `apps/**`, `packages/**` e as migrations) | core → mobile-adm → store → backoffice → functions, **um por vez**, `--testTimeout=20000` **sem o `--`** na loja e no painel, **exit code fora de pipe** (`> log 2>&1; echo $?`) |
| Build | fim de fase | Full + `npx tsc --noEmit -p apps/{mobile-adm,store,backoffice}/tsconfig.app.json` (0 · 0 · 0) + `npx tsc --noEmit -p packages/core/tsconfig.json` (11 herdados, nenhum novo) + `npx eslint .` em `apps/mobile-adm` (0/0), `apps/backoffice` (23/5) e `apps/store` (2/2) + `pnpm --filter @estrelinha/mobile-adm build` |
| Probe | tasks 01 e 02, e todo fim de fase depois delas | `supabase migration up --local` + `psql … -f .specs/features/83-loja-ao-vivo/probes/01-acessos.sql` + os probes da `71` **por nome** (`dia.sql`, `papeis.sql`, `relogio.sql`, `teto.sql`, `vendas.sql`, `visitas.sql` — `concorrencia.sql` não roda sozinho: exige `-v id -v espera` e compromete), exit 0 e só `ok —`; depois, à parte, `concorrencia.sh` e `ponta-a-ponta.sh` da `71` (comprometem; conferir `first_hour` não nulo e igual à hora de Brasília da chamada) |

Baseline de entrada: `baseline.md` (2026-10-26, `744da7ea`): core 4466/178 · functions 1105/26 ·
mobile-adm 2021/126 · backoffice 3916/225 · store 6013/326 = **17521 em 881**.

---

## Execution Plan

```
Fase 0 (portão):        T00
Fase 1 (banco):         T01 → T02
Fase 2 (core):          T03 → T04 → T05
Fase 3 (app):           T06 → T07 → T08 → T09
Fase 4 (guardas):       T10 → T11
Fase 5 (loja e fecho):  T12 → T13 → T14
                        → Verificador independente (sempre)
```

**T00 não é de sub-agente**: é o orquestrador perguntando ao usuário. Lotes para sub-agentes (~7
tasks, fases inteiras), só depois do portão: **Lote 1** = Fases 1–2 (T01–T05) · **Lote 2** =
Fases 3–4 (T06–T11) · **Lote 3** = Fase 5 (T12–T14).

---

## Tasks

### T00 — `00-portao-das-confirmacoes`
- **What**: antes de qualquer código, o usuário confirma ou recusa cada linha `n — confirmar` da spec
  que muda **copy ou número visível**: a comparação de Hoje (horas completas, "vs ontem até as {h}h");
  **Semana** — as três opções escritas na spec ((a) sem variação; (b) só Vendas com "vs semana
  anterior", custo: um cartão compara e dois não, e duas colunas a mais no SQL; (c) as três, com a
  retenção de 14 dias, fora do escopo); o texto das notas do contador (o do painel × o do PRD,
  `LAV-54`); "Não consegui carregar." × "Não consegui ler agora."; o frescor por duração local × pelo
  `lido_em`; `LAV-60` sem `lerComPapel`; o desenho do cartão na Fase 1; a frase do gráfico sem
  `acessos`; as faixas antes da contagem; o arredondamento; a Conversão em largura inteira; o período
  do Início ao voltar. As linhas que dependem da **Adri** (emenda à `VIS-28`, texto da política)
  continuam pré-condição do **deploy**, não da execução.
- **Where**: `spec.md` (a coluna "Confirmado?" de cada linha passa a `s` ou à escolha nova).
- **Depends on**: —.
- **Done when**:
  - [x] cada linha de copy/número visível com a resposta do usuário escrita na spec;
  - [x] se Semana for (b): T01 ganha as vendas da semana anterior até o mesmo ponto e T02/T04/T07 os
        casos; se (c): a feature para e o escopo volta ao usuário;
  - [x] toda resposta que muda a spec propagada ao design e às tasks antes da T01.
- **Tests**: none (decisão) · **Gate**: —
- **Reqs**: as assunções `n — confirmar`.
- **Status**: ✅ resolvido pelo orquestrador em 2026-10-26 — vale a recomendação de cada linha `n — confirmar`; Semana = (a). Nada propagado (nenhuma escolha mudou). Registrado no topo da `spec.md`.

### T01 — `01-migration-da-hora-e-dos-acessos`
- **What**: `supabase/migrations/20261029120000_83-loja-ao-vivo.sql` com o SQL do `design.md` §2
  (`store_hour`, a coluna `first_hour`, `record_store_visit` e `store_movement` recriadas); e o guarda
  `apps/store/src/shared/lib/__tests__/visitasPorHoraSchema.test.ts` com as doze réguas do design §6;
  e as funções de asserção de `visitasSchema.test.ts` movidas para `visitasRegras.ts`, aplicadas à
  `71` e à migration vigente.
- **Where**: `supabase/migrations/`, `apps/store/src/shared/lib/__tests__/`.
- **Depends on**: T00 · **Reuses**: o SQL da `71`; `mutar()`, `semComentario`, `blocoDaFuncao` de
  `visitasSchema.test.ts`.
- **Done when**:
  - [x] ~~`supabase migration up --local`~~ `psql -1 -f` aplica sem erro; rodar de novo é no-op. **Desvio de forma** (ordem do orquestrador: o banco local é compartilhado com a árvore da `82`, e `migration up` reclamaria da migration dela ausente no disco): a migration ficou **sem linha em `schema_migrations`** no banco local. Os corpos de `store_hour`, `store_movement`, `record_store_visit` e `store_clock` foram conferidos idênticos (md5 de `prosrc`) aos que o arquivo produz.
  - [x] o guarda tem uma régua por comando, cada uma com sensor por `mutar()` que lança; âncora
        (arquivo + `store_hour` + `record_store_visit` + `store_movement` + o `alter table`).
  - [x] régua (1) com as formas de `alter table` (com/sem `column`, `only`, vírgula, `rename`);
        régua (7) por fragmento (a–d), cada um com sensor; régua (11) — `/ 3` e `generate_series(0, 7)`
        contra `ACCESS_BAND_LABELS` **importado** (o arquivo de `core/live` nasce na T04: esta régua
        entra marcada `it.todo` na T01 e vira asserção na T04, sem ser esquecida — o Done when da T04
        a cobra); régua (12) — um `from public.store_visits` no corpo de `store_movement`.
  - [x] `visitasSchema.test.ts`: as funções de asserção mudam de endereço para `visitasRegras.ts`,
        **nenhuma régua afrouxada**, e passam a rodar também contra a migration vigente (escolhida
        pela última, por prefixo, que cria a função, `L-035`); mutantes de venda (tirar
        `and o.status <> 'cancelled'`, `>=` → `>` numa fronteira, tirar o `coalesce`) reinjetados no
        arquivo da `83` e mortos por asserção, SHA-256 conferido na restauração.
  - [x] Full gate sem regressão (store +N casos; o resto idêntico à baseline).
- **Tests**: guarda de fonte · **Gate**: Full
- **Reqs**: `LAV-70`, `LAV-71`, `LAV-72`, `LAV-73`, `LAV-74`.
- **Status**: ✅ 2026-10-26 — migration aplicada no banco local por `psql -1 -f` (2ª execução no-op; `information_schema` = day, visitor_id, first_hour). Guarda novo 65 casos + 1 `it.todo` (régua 11); `visitasSchema` +25 (bloco 8, a vigente), réguas movidas para `visitasRegras.ts` sem uma `expect` alterada. Mutantes reais no arquivo da `83` (cancelado, `>=`→`>`, `coalesce`): 3/3 mortos por asserção, SHA-256 conferido. Full: core 4466 · mobile-adm 2021 · store 6103 (+90, +1 todo) · backoffice 3916 · functions 1105, todos exit 0. Desvio de forma do SQL do design: `contagem_desde_dia` segue `public.store_day(v_inicio)::text` (como na `71`, mesmo valor de `v_inicio_dia`) para a régua `diaDe` da `71` alcançar a vigente.

### T02 — `02-probe-dos-acessos`
- **What**: `probes/_comum.sql` (derruba os objetos, aplica a `71` **e** a `83` do disco, auxiliares
  `confere`/`movimento`/`recusado`, lê o admin) e `probes/01-acessos.sql` com cada prova listada no
  design §6 (*Probes*). Rodar também os probes da `71`.
- **Where**: `.specs/features/83-loja-ao-vivo/probes/`.
- **Depends on**: T01 · **Reuses**: `.specs/features/71-visitas-unicas-no-dashboard/probes/_comum.sql`.
- **Done when**:
  - [x] `01-acessos.sql` exit 0 com só `ok —`, contra o banco local — incluindo os casos da revisão
        adversarial (design §6 *Probes*): comparação simétrica às 15h02 e às 00h30; a linha "do futuro"
        puxando a faixa atual; o teto em ontem anulando as comparações; faixas antes da contagem `null`;
        `service_role` executa `record_store_visit`; `information_schema.columns` = `{day, visitor_id,
        first_hour}`.
  - [x] Três mutantes na migration (o `first_hour` trocado por `extract(hour from p_agora)` — hora
        UTC —, `x.faixa > a.faixa_atual` por `>=`, e `first_hour < v_hora` por `<=` na base de ontem)
        reinjetados no arquivo, cada um derrubando o probe; o arquivo restaurado conferido por SHA-256.
  - [x] Os probes da `71` **por nome** exit 0; `concorrencia.sh` e `ponta-a-ponta.sh` da `71` rodados
        depois de `migration up --local`, com `first_hour` não nulo e igual à hora de Brasília da
        chamada (o caminho real da gravação, pela function `visit`).
  - [x] As chaves REAIS de `store_movement` (como admin, `begin … rollback`) salvas em
        `probes/saida-real.json` para a T03.
- **Tests**: integração (probe) · **Gate**: Probe
- **Reqs**: `LAV-61`, `LAV-70`..`LAV-74`.
- **Status**: ✅ 2026-10-26 — `01-acessos.sql` exit 0, 66 `ok —` (70 desde o conserto do gate do Lote 1, abaixo) (bordas 02:59/03:00/23:59, gravação e repetição, faixas e futuras, 00h30, invariante com `sem_hora`, `por_dia` em seg/qua/dom, comparação simétrica às 15h02, anteontem, contagem começando ontem e anteontem, linha do futuro, teto em ontem e anteontem, faixas antes da contagem, `periodos` = números da `71`, papéis, `service_role`, `information_schema`). Mutantes reais na migration (hora UTC, `>=` na faixa futura, `<=` na base de ontem): 3/3 derrubam o probe, SHA-256 conferido. Probes da `71` por nome: dia 9 · papeis 32 · relogio 6 · teto 10 · vendas 19 · visitas 31, todos exit 0. `concorrencia.sh` e `ponta-a-ponta.sh` (semear/ler/papeis/limpar) da `71` exit 0 — a leitura B da `ponta-a-ponta` só tem números para 22/10 e avisa (fixtura datada da `71`, não regressão). `02-gravacao-real.sh` (novo): a corrida comprometida com `now()` deixa 1 linha, `first_hour` = hora de Brasília da chamada (23, com o dia 26/10 de Brasília já 27/10 em UTC). **Não exercitado**: o caminho pela function `visit` (`function-visit.sh`) — o edge runtime local não está de pé e subir `functions serve` mexeria no ambiente compartilhado. `saida-real.json` gerado por `saida-real.sql`. **Conserto do gate do Lote 1** (2026-10-26): o ramo "teto caiu em HOJE" de `v_sem_cmp_hoje` não tinha prova — o mutante `in (v_hoje, v_ontem)` → `in (v_ontem)` deixava o probe em exit 0. Novo savepoint `teto_hoje` (controle sem teto + teto em hoje ⇒ visitas e base de Hoje null, Ontem intacta, `teto_dia` = hoje): o mutante derruba o probe por asserção. E a régua (13) de `visitasPorHoraSchema` (os dias do teto nas duas comparações, +5 casos) leva a metade de fonte ao CI: o mesmo mutante e o de anteontem reprovam por asserção, SHA-256 restaurado.

### T03 — `03-tipo-dos-acessos-e-intervalo-do-hook`
- **What**: `StoreAccess`/`StoreAccessDay`/`StoreAccessComparison` e `acessos?` em
  `core/stats/movement.ts` (exportados pelo barril); `refetchInterval` em `StoreMovementOptions`, com
  `refetchIntervalInBackground: false`.
- **Where**: `packages/core/src/stats/movement.ts`, `stats/index.ts`, `hooks/useStoreMovement.ts`,
  `hooks/__tests__/useStoreMovement.test.ts`.
- **Depends on**: T02 · **Reuses**: o `Record<keyof …, true>` de `useStoreMovement.test.ts`.
- **Done when**:
  - [x] `CHAVES_DA_RPC` com `acessos`, e as listas de `StoreAccess` iguais a `probes/saida-real.json`.
  - [x] casos: a opção chega ao `useQuery` com `refetchIntervalInBackground: false`; sem a opção, nada
        de intervalo; com o `focusManager` desligado e o relógio andando, zero chamadas; com a leitura
        recusada (`42501`) e 90 s andados, **zero** chamadas novas (`refetchInterval` função com
        `isAccessDenied`); **o timer da virada sem foco não lê** (fixtura com a virada dentro da janela
        em segundo plano) e, de volta ao foco, uma leitura; mutantes: intervalo fixo (morre no caso da
        recusa) e o timer sem a checagem de foco (morre no caso da virada).
  - [x] Full gate (o tipo é lido pelo painel e pelo app) e `tsc` 0 · 0 · 0.
- **Tests**: unit · **Gate**: Full
- **Reqs**: `LAV-08`, `LAV-71`, `LAV-72`, `LAV-73`.
- **Status**: ✅ 2026-10-26 — `StoreAccess`, `StoreAccessDay`, `StoreAccessComparison`, `StoreAccessTodayComparison`, `StoreAccessYesterdayComparison`, `StoreAccessWeekDay` e `acessos?` em `stats/movement.ts` (barril); o teste lê `probes/saida-real.json` do disco e compara as chaves com `Record<keyof …, true>`. Hook: `refetchInterval?` como função com `isAccessDenied`, `refetchIntervalInBackground: false`, e o timer da virada só relê com `focusManager.isFocused()`. +10 casos (core 4466 → 4476). Mutantes no hook real (intervalo fixo, timer sem foco, `InBackground: true`): 3/3 mortos por asserção, SHA-256 conferido. Full verde (mobile-adm 2021 · store 6103 · backoffice 3916 · functions 1105, exit 0); `tsc` 0 · 0 · 0, core 11 herdados.

### T04 — `04-regras-dos-acessos-em-core-live`
- **What**: `packages/core/src/live/access.ts`, `live/card.ts`, `live/index.ts`; subpath `./live` no
  `package.json` de `core`; `live/__tests__/access.test.ts`, `card.test.ts`, `purity.test.ts`.
- **Where**: `packages/core/src/live/`, `packages/core/package.json`.
- **Depends on**: T03 · **Reuses**: `weekdayShort`, `isoWeekday` (`core/stats/labels.ts`).
- **Done when**:
  - [x] `conversion`/`formatConversion`: `3/142 ⇒ '2,1%'`, `0/10 ⇒ '0,0%'`, `5/0 ⇒ '—'`, `3/2 ⇒ '150,0%'`.
  - [x] `accessDelta`: alta, queda, **exatamente 0**, anterior 0 ⇒ `null`, anterior `null` ⇒ `null`,
        e o meio simétrico: `+12,5 ⇒ +13` **e** `−12,5 ⇒ −13`; `deltaLine` com U+2212 e os dois tons.
  - [x] `accessCards` nos três períodos, com a fixtura em que **Visitas da comparação e Vendas da
        comparação discordam** (`L-013`), sem `acessos` (variação nula), visitas 0 (Conversão "—");
        em Hoje o par é `base_hoje` × `comparacao.hoje` (não o total), e o rótulo "vs ontem até as
        15h" vem de `ate_hora`.
  - [x] a régua (11) de `visitasPorHoraSchema` sai de `it.todo` e passa a asserção, com sensor.
  - [x] `accessChart`: Hoje com `faixa_atual` 5 e duas futuras; Hoje com `null` **antes** da atual ⇒
        `sem_contagem` (não `futura`); Ontem sem dourada; Semana numa segunda
        (1 coluna) e num domingo (7), "hoje" no dia igual a `m.hoje` — com o relógio do processo num
        **outro** dia (`L-058`); `noHourNote` 0/1/2; `freshnessLine` 0, 1.9, 2, 59, 60, 125 s.
  - [x] `purity.test.ts` com âncora (≥ 3 arquivos) e sensor do relativo sem `.ts`.
  - [x] Quick gate; Full no fim da fase.
- **Tests**: unit · **Gate**: Quick (Full no fim da Fase 2)
- **Reqs**: `LAV-07`, `LAV-51`, `LAV-52`, `LAV-53`, `LAV-67`, `LAV-04` (frases).
- **Status**: ✅ 2026-10-26 — `core/live/{access,card,index}.ts` e `./live` no `package.json`; 41 casos (`access` 33, `card` 3, `purity` 5). `formatCount` nasceu em `core/stats/labels.ts` (o design aceita `counterNotes.ts` ou `labels.ts`): `core/live` precisa dele já aqui, e a T05 só faz o painel reexportá-lo. Régua (11) de `visitasPorHoraSchema` saiu do `it.todo`: 5 casos (âncora dos dois divisores e do `generate_series`, a igualdade com `ACCESS_BAND_LABELS` importado, 3 sensores). Mutantes reais em `access.ts` (rótulo `21h`→`22h`, `Math.round` simples, total no lugar de `base_hoje`, `sem_contagem` virando `futura`): 4/4 mortos por asserção, SHA-256 conferido. Full: core 4517/181 · mobile-adm 2021 · store 6108 (todo zerado) · backoffice 3916 · functions 1105, exit 0.

### T05 — `05-notas-do-contador-com-dono-unico`
- **What**: `core/stats/counterNotes.ts` (as três, byte a byte do painel) + `counterNotes.test.ts`
  (cópia dos casos do painel) e `formatCount`; o painel reexporta e apaga `inicioDo`/`fimDo`;
  `apps/backoffice/src/app/__tests__/notasDoContadorNoCore.test.ts`; `semPessoas.test.ts` lendo
  também `counterNotes.ts`.
- **Where**: `packages/core/src/stats/`, `apps/backoffice/src/widgets/store-movement/model/labels.ts`,
  `apps/backoffice/src/app/__tests__/`.
- **Depends on**: T04 · **Reuses**: `regrasDoPedidoNoCore.test.ts` (molde do `toBe`).
- **Done when**:
  - [x] a suíte do painel com **a mesma contagem de antes + o guarda novo** (+ os casos da âncora nova
        de `semPessoas`), nenhuma asserção antiga tocada.
  - [x] o guarda: as três notas e `formatCount` `toBe`; sensor — uma cópia com o mesmo texto reprova.
  - [x] `stats/__tests__/purity.test.ts`: a âncora passa a **seis** arquivos, com `counterNotes.ts`
        (âncora de contagem subindo com o fato); `counterNotes.ts` importa `../time/format.ts` com
        extensão.
  - [x] `inicioDo`/`fimDo` apagados do painel; `npx eslint .` em `apps/backoffice` = 23/5.
  - [x] mutante: trocar `>` por `>=` em `countingSinceLine` de `core` derruba os casos de `core` **e**
        os do painel (prova de que o painel mede o dono).
  - [x] Full gate e Build (fim da Fase 2).
- **Tests**: unit + guarda · **Gate**: Build
- **Reqs**: `LAV-54`, `LAV-75`.
- **Status**: ✅ 2026-10-26 — `core/stats/counterNotes.ts` com as três notas e `inicioDo`/`fimDo` byte a byte do painel (conferido por script), barril com `.ts`; `formatCount` já estava em `core/stats/labels.ts` (T04). `counterNotes.test.ts`: cópia dos casos do painel no mesmo arnês de três fusos, mais o caso no limiar (`L-071`) e `formatCount` (+38 em core, 4517 → 4555, com a âncora de pureza em seis e o import `../time/format.ts` cobrado). Painel: as quatro reexportadas, `inicioDo`/`fimDo`/`INTEIRO` apagados, `labels.test.ts` sem uma linha alterada; `notasDoContadorNoCore.test.ts` (6 casos, sensor de cópia) e `semPessoas` lendo `counterNotes.ts` com âncora que o nomeia → backoffice 3916/225 → 3922/226. Mutantes: `>`→`>=` em `countingSinceLine` de core derruba 6 casos de core **e** 3 do painel; "pessoa" numa nota de core derruba `semPessoas`; SHA-256 conferido. Build: Full verde (core 4555 · mobile-adm 2021 · store 6108 · backoffice 3922 · functions 1105); `tsc` 0 · 0 · 0 e core 11 herdados; eslint mobile-adm 0/0, backoffice 23/5, store 2/2 (um `no-regex-spaces` que a T01 tinha posto em `visitasPorHoraSchema.test.ts` consertado aqui); `pnpm --filter @estrelinha/mobile-adm build` verde.

### T06 — `06-endereco-da-loja-ao-vivo`
- **What**: `entities/stats/model/periodos.ts` (`PERIODOS` e `ehPeriodo` **sobem** de
  `widgets/movement-hero/model/numeros.ts`, que reexporta por referência; o hero passa a usar
  `formatCount` de `core`); `entities/stats/model/aoVivo.ts` (`AO_VIVO_PATH`, `estadoDaEntrada`,
  `periodoDaEntrada`, `periodoDoInicio`/`gravarPeriodoDoInicio`) e o barril; `barraNoCaminho` falso em
  `/ao-vivo`; `ROTAS_DE_TELA = ['/ao-vivo']` em `abasSaoAsRotas.test.ts`; o guarda
  `periodosComDonoUnico.test.ts`; `useMovimento` com `refetchInterval` opcional; `leituraDe` sobe para
  `shared/ui/leitura.tsx`.
- **Where**: `apps/mobile-adm/src/entities/stats/`, `widgets/movement-hero/model/`, `widgets/tab-bar/`,
  `shared/ui/leitura.tsx`, `shared/lib/__tests__/`, `pages/InicioPage.tsx` (só o import de `leituraDe`).
- **Depends on**: T05.
- **Done when**:
  - [x] `periodoDaEntrada`: os três valores; `null`, `{}`, `'mes'`, `{ periodo: 3 }` ⇒ `'hoje'`.
  - [x] `barraNoCaminho('/ao-vivo') === false`; `/`, `/pedidos`, `/avisos` seguem `true`.
  - [x] `abasSaoAsRotas`: lista nova com âncora `toEqual(['/ao-vivo'])`; `rotasDoApp` passa a excluir
        `ROTAS_DA_CONTA ∪ ROTAS_DE_TELA`; o sensor "sem a lista, `/avisos` seria acusada" passa a
        filtrar `ROTAS_DE_TELA` antes, com o comentário dizendo por quê (mudança de fixture, não de
        régua); o sensor-irmão "sem `ROTAS_DE_TELA`, `/ao-vivo` seria acusada" sobre uma fonte com a
        rota injetada (a rota real entra na T08, que escreve o caso "a rota existe e está na lista").
  - [x] `periodosComDonoUnico`: âncora + sensor (uma segunda lista no app reprova); os testes da `73`
        do hero **sem asserção tocada**.
  - [x] `periodoDoInicio`/`gravarPeriodoDoInicio`: grava e lê da entrada atual sem tocar a URL.
  - [x] Full gate e `npx eslint .` em `apps/mobile-adm` = **0/0** (nenhum import lateral ou para cima).
- **Tests**: unit · **Gate**: Full
- **Reqs**: `LAV-06`, `LAV-50`.
- **Status**: ✅ 2026-10-27 — `entities/stats/model/{periodos,aoVivo}.ts` e o barril; `numeros.ts` reexporta `PERIODOS` por referência e escreve Vendas/Visitas com `formatCount` de `core`; `barraNoCaminho('/ao-vivo')` falso; `useMovimento({ refetchInterval })`. **Dois desvios de endereço, os dois pelo lint 0/0**: `leituraDe` foi para `shared/ui/leituraDe.ts` (o `leitura.tsx` só exporta componentes e constantes — `react-refresh/only-export-components`), e `periodosComDonoUnico.test.ts` mora em `app/__tests__` (a metade positiva importa de `entities/` e `widgets/`, fronteira FSD ao contrário a partir de `shared/`). `abasSaoAsRotas`: `ROTAS_DE_TELA` com âncora, `rotasDoApp` excluindo as duas listas, o sensor de `/avisos` filtrando `ROTAS_DE_TELA` (fixture, com o porquê no comentário) e o irmão de `/ao-vivo` sobre uma fonte com a rota injetada. mobile-adm 2021/126 → 2052/129 (+31: `aoVivo` 15, `barraNoCaminho` 7, `periodosComDonoUnico` 7, `abasSaoAsRotas` +2); core 4555 · store 6113 · backoffice 3922 · functions 1105, todos exit 0; `tsc` do app 0; eslint do app 0/0.

### T07 — `07-secao-acessos`
- **What**: `widgets/store-access/` — `SecaoAcessos.tsx`, `GraficoDosAcessos.tsx`, `model/barras.ts`,
  `index.ts` — e os testes de componente.
- **Where**: `apps/mobile-adm/src/widgets/store-access/`.
- **Depends on**: T06 · **Reuses**: `Traco`, `FalhaDoBloco` (`shared/ui/leitura.tsx`); a grade do
  `MovementHero`; `week-chart/model/barras.ts` (molde).
- **Done when**:
  - [x] o seletor: inicial por prop, `aria-pressed`, 44 px (token `min-h-11`, `L-034`), rótulos de
        `PERIODOS`. (A asserção "trocar não chama a RPC" **não** mora aqui: a seção recebe a leitura por
        prop e nunca chama RPC, então seria verdadeira nos dois mundos — ela vai para a T08.)
  - [x] os três cartões em cada período, cada um encontrado por `getByRole('group', { name })`, cada
        texto **inteiro** (`L-009`), o tom por classe exata, e **nenhum** "Com sacola"; a grade com
        `[&>*:last-child]:col-span-full` por token exato.
  - [x] o gráfico: 8 colunas com rótulos; a atual em `bg-estrelinha-accent` e rótulo `ink`; as futuras
        e as `sem_contagem` sem número e com 4 px `line`; Ontem sem `accent`; Semana com "hoje"; todos
        zero ⇒ 4 px e "0"; `alturaDaBarra` com `max = 0`, `v = max`, `v = 1` de 1000; o contêiner com
        `overflow-x-auto` e cada coluna com `min-w-[2.75rem]` por token exato (`L-029`).
  - [x] as notas (`BAND_NOTE`/`WEEK_NOTE`, `noHourNote`, as três do contador, `CONSENT_NOTE`) — cada
        uma presente **e** ausente no caso que a exclui.
  - [x] os estados de `LAV-55`, cada um com asserção de **exclusividade** (`L-063`), mais o "sem
        `acessos`": a frase `CHART_UNAVAILABLE` e **nenhum** botão no bloco do gráfico.
  - [x] a grade `auto-fit` por token exato (`L-029`); nenhuma `transition-` nas barras.
  - [x] Full gate.
- **Tests**: componente · **Gate**: Full
- **Reqs**: `LAV-50`..`LAV-55`, `LAV-63`, `LAV-67`.
- **Status**: ✅ 2026-10-27 — `widgets/store-access/{ui/SecaoAcessos,ui/GraficoDosAcessos,model/barras,index}`; fixtura `acessos()`/`movimentoComAcessos()` em `test/movimento.ts` (coerente com `movimento()`, campos candidatos divergentes, `L-013`). `SecaoAcessos.test.tsx` 27 + `barras.test.ts` 5. A área do gráfico é `min-h-[120px]` (não `h-`): com `overflow-x-auto` o eixo vertical vira `auto`, e valor + barra de 84 + rótulo passam de 120 — uma altura fixa abriria rolagem vertical no cartão (medir na T13). 7 mutantes nos dois componentes (tom trocado, `col-span-full` apagado, nota de consentimento apagada, "Contando desde" apagado, destaque `atual` trocado, número nas faixas futuras, seletor sem trava): 7/7 mortos por asserção, SHA-256 conferido. Full: mobile-adm 2084/131 · core 4555 · store 6113 · backoffice 3922 · functions 1105, exit 0; `tsc` 0; eslint 0/0.

### T08 — `08-pagina-loja-ao-vivo`
- **What**: `widgets/store-access/ui/CabecalhoAoVivo.tsx`, `shared/lib/useSegundosDesde.ts`,
  `pages/AoVivoPage.tsx`, a rota em `App.tsx`; testes pelo `<App />` real (`montarApp('/ao-vivo', { estado })`).
- **Where**: `apps/mobile-adm/src/{pages,widgets/store-access,shared/lib,app}/`.
- **Depends on**: T07 · **Reuses**: `CabecalhoDoPedido`/`BotaoVoltar` (molde), `PullToRefresh`,
  `useRecusaDePapel`, `leituraDe`.
- **Done when**:
  - [x] `h1` e `document.title` nos três estados (carregando, falha, dado); a barra de abas ausente;
        o cabeçalho com `-mx-4 -mt-4 sticky top-0 min-h-[60px]` por token exato.
  - [x] `rotasSobGuarda`: a âncora "a varredura encontra as treze rotas", com `'/ao-vivo'` na posição
        real e o título reescrito (âncora de contagem subindo com o fato); caso novo "`/ao-vivo` está
        DENTRO do bloco — e movê-la para fora é acusado", no molde do de `/pedidos/:id`.
  - [x] `abasSaoAsRotas` com o caso "a rota `/ao-vivo` existe e está na lista", e as asserções antigas
        verdes com a rota no `App.tsx` (as três que a T06 ajustou).
  - [x] trocar Hoje → Ontem → Semana pelo `<App />` em `/ao-vivo` ⇒ **zero** chamadas novas a
        `store_movement` entre os toques; mutante: o período na `queryKey` (ou `p_periodo` na RPC)
        morre por asserção.
  - [x] voltar com `doApp` ⇒ a entrada anterior (histórico montado pelo próprio teste, `L-053`); sem ⇒
        `/` por substituição.
  - [x] ciclo: andar 15 s visível ⇒ +1 chamada; 14,9 s ⇒ nenhuma; `focusManager.setFocused(false)` e
        90 s **atravessando a virada do dia** (fixtura com `expira_em` dentro da janela) ⇒ nenhuma; de
        volta ao foco ⇒ uma; recusa `42501` com o papel admin e 90 s ⇒ zero chamadas novas.
  - [x] frescor: "Atualizado agora" na chegada, "há 5 s" depois de 5 s, `NAO_ATUALIZOU` com a
        releitura em 500 (e os números mantidos); com o relógio do processo **adiantado 1 h** em relação
        ao `lido_em`, a linha continua "agora" (`LAV-61`).
  - [x] puxar só no topo: 1 px de rolagem ⇒ nada; dedo subindo ⇒ nada (`L-061`); no topo, acima do
        limiar ⇒ uma chamada.
  - [x] `42501` ⇒ Login com a frase da `72`, nenhum número em instante nenhum lido; 500 ⇒ falha.
  - [x] o período do `history.state` chega à seção (`{ periodo: 'ontem' }` ⇒ Ontem pressionado).
  - [x] Full gate e Build.
- **Tests**: componente (`<App />` real) · **Gate**: Build
- **Reqs**: `LAV-06`, `LAV-07`, `LAV-08`, `LAV-55`, `LAV-60`, `LAV-62`.
- **Status**: ✅ 2026-10-27 — `pages/AoVivoPage.tsx` (`useMovimento({ refetchInterval: 15_000 })`, `useRecusaDePapel`, `leituraDe`, `PullToRefresh`, o título), `widgets/store-access/ui/CabecalhoAoVivo.tsx` (voltar, `h1`, frescor por `freshnessLine(useSegundosDesde(dataUpdatedAt))` ou `NAO_ATUALIZOU` com `role="status"`), `shared/lib/useSegundosDesde.ts` e a rota no `App.tsx`. `AoVivoPage.test.tsx` 19 casos pelo `<App />` real; o ciclo é medido a partir do instante da ÚLTIMA chamada (o React Query recomeça o intervalo a cada atualização da query): 14,8 s ⇒ nada, 15,3 s ⇒ +1, duas voltas. `rotasSobGuarda` com a âncora em treze e o caso de `/ao-vivo` dentro do bloco; `abasSaoAsRotas` com "a rota existe e está na lista". 9 mutantes (trocar de período relendo, voltar sempre à Início, voltar sem `replace`, ciclo de 30 s, sem `useRecusaDePapel`, sem título, `NAO_ATUALIZOU` desligado, período da entrada ignorado, sem intervalo): 9/9 mortos por asserção, SHA-256 conferido. Build: mobile-adm 2105/132 · core 4555 · store 6113 · backoffice 3922 · functions 1105, exit 0; `tsc` 0; eslint 0/0; `pnpm --filter @estrelinha/mobile-adm build` verde.

### T09 — `09-cartao-visitas-hoje-na-inicio`
- **What**: `widgets/visits-card/` (`CartaoVisitasHoje.tsx`, `index.ts`); `MovementHero` com
  `periodo`/`aoTrocarPeriodo` opcionais; `InicioPage` com o período na página (inicial de
  `periodoDoInicio`), a ordem hero → cartão → `LinhaDeFrescor` → `QueueTiles`,
  `useMovimento({ refetchInterval: 30_000 })` e o Realtime sem releitura com a aba oculta.
- **Where**: `apps/mobile-adm/src/{widgets/visits-card,widgets/movement-hero,pages}/`.
- **Depends on**: T08.
- **Done when**:
  - [ ] o cartão: eyebrow, número (`41`), linha de apoio, **sem** "pessoa", sem ponto, sem "Ao vivo em
        breve"; o nome acessível exato **nos três estados** (com dado, "carregando", "não consegui
        carregar. Tentar de novo"); ordem no DOM hero → cartão → `LinhaDeFrescor` (com a releitura
        falhada) → "Precisa de você".
  - [ ] trocar a faixa para Ontem e tocar o cartão ⇒ `/ao-vivo` com Ontem pressionado (pelo `<App />`);
        voltar ⇒ a faixa da Início reabre em Ontem.
  - [ ] **o critério 1 do PRD entre as duas telas**: pelo `<App />`, ler Visitas e Vendas da faixa nos
        três períodos em `/`, tocar o cartão e conferir os mesmos valores na seção em cada período, com
        a fixtura **distinta** por período e por campo (`L-013`); mutante: `accessCards` lendo o
        período errado (ou `vendas` no lugar de `visitas`) morre.
  - [ ] carregando ⇒ `Traco` e toque navega; falha ⇒ "Não consegui carregar." e toque relê (+1
        chamada, nenhuma navegação); `0` ⇒ "0".
  - [ ] ciclo de 30 s com a aba visível; em segundo plano, nada — nem o intervalo, nem o aviso do
        Realtime (`fake.emitir('orders')` com o foco desligado ⇒ zero chamadas; de volta ao foco, uma).
  - [ ] `recusaComPapelAdmin`: com a Início montada por ≥ 4 ciclos de 30 s, `retryAdminCheck` chamado
        **uma** vez (contar `user_roles`) — prova de que o intervalo não reabre o episódio a cada ciclo.
  - [ ] **todo teste do app que monta `/`** — lista gerada por grep (`montarApp('/'`, `pushState(… '/')`):
        `pages/__tests__/{InicioPage,PedidoPage}.test.tsx`,
        `app/__tests__/{anuncios,App.smoke,inicioComClientReal,semConexao}.test.tsx`,
        `widgets/account-menu/__tests__/AccountMenu{,.avisos}.test.tsx`,
        `widgets/tab-bar/__tests__/{TabBar,seloDaAba}.test.tsx` (regerar o grep na hora): lista dos
        `vi.mock` totais conferida (`L-030`); cada caso que anda ≥ 30 s lido e, onde a contagem exata é
        a régua, uma asserção **nova** conta o ciclo — nenhuma `toHaveLength` trocada por
        `toBeGreaterThanOrEqual`. Em `InicioPage.test.tsx`: "`42501` com o papel ainda admin" fica
        **intacto** (prova que o intervalo para na recusa); "a virada do dia relê pela DURAÇÃO" passa a
        medir a virada a 10 s (fixtura, design §6), com o mutante "timer apagado" morto. A lista dos
        casos tocados e o porquê vão no "Status" desta task.
  - [ ] os testes da `73` do `MovementHero` **sem asserção tocada** (o modo não controlado segue).
  - [ ] Full gate e Build (fim da Fase 3).
- **Tests**: componente (`<App />` real) · **Gate**: Build
- **Reqs**: `LAV-04`, `LAV-05`, `LAV-50`.

### T10 — `10-guardas-de-relogio-e-tom`
- **What**: `apps/mobile-adm/src/shared/lib/__tests__/aoVivoSemRelogioDoAparelho.test.ts` e
  `tomDaLojaAoVivo.test.ts` (design §6).
- **Where**: `apps/mobile-adm/src/shared/lib/__tests__/`.
- **Depends on**: T09 · **Reuses**: `movimentoDeClientes.test.ts`, `tomMemorialDeClientes.test.ts`
  (molde); `semPessoas.test.ts` do painel (a régua de "pessoas").
- **Done when**:
  - [ ] escopo **literal** (os arquivos da `83` no app, `core/live/**`, `core/stats/counterNotes.ts`),
        âncora que **nomeia** um arquivo do app e um de `core` (`L-035`), contagem ≥ N.
  - [ ] relógio: cada forma (`new Date(`, `Date.now(`, `getHours`, `getDay`, `toLocaleDateString`)
        acusada por sensor; allowlist de UM (`useSegundosDesde.ts`), com o caso que prova que outro
        arquivo **seria** acusado.
  - [ ] tom: emoji, `!`, urgência, "pessoa(s)"/"usuário(s)" acusados; movimento sem par acusado;
        CRLF/LF; o inverso (comentário que cita a forma não é acusado).
  - [ ] Full gate.
- **Tests**: guarda · **Gate**: Full
- **Reqs**: `LAV-61`, `LAV-64`, `LAV-65`.

### T11 — `11-recusa-sobre-o-client-real`
- **What**: `apps/mobile-adm/src/app/__tests__/aoVivoComClientReal.test.tsx` sobre `src/test/clientReal.ts`.
- **Where**: `apps/mobile-adm/src/app/__tests__/`.
- **Depends on**: T10 · **Reuses**: `inicioComClientReal.test.tsx` (molde).
- **Done when**:
  - [ ] `store_movement` 403 `{ code: '42501' }` ⇒ Login com a frase da `72`; nenhum número (lido a cada
        passo do relógio) em `/ao-vivo` e no cartão do Início.
  - [ ] **200, depois 403 na releitura de 15 s** (a conta perde o papel com a tela aberta) ⇒ nenhum
        número e nenhuma linha "Atualizado há" em instante nenhum depois da recusa — nem o do cache.
  - [ ] 500 e rede caída ⇒ "Não consegui carregar.", nunca a recusa.
  - [ ] dois mutantes em `AoVivoPage.tsx` (sem `useRecusaDePapel`; rede tratada como recusa) mortos
        por asserção, SHA-256 conferido na restauração.
  - [ ] Full gate e Build (fim da Fase 4).
- **Tests**: integração · **Gate**: Build
- **Reqs**: `LAV-60`.

### T12 — `12-politica-com-a-hora`
- **What**: o parágrafo do Apêndice A da spec em `PrivacyPolicyPage.tsx`; `politicaDoContador.test.ts`
  e `PrivacyPolicyPage.test.tsx` com o literal novo e o sensor "sem a hora cheia reprova".
- **Where**: `apps/store/src/pages/`.
- **Depends on**: T11.
- **Done when**:
  - [ ] o parágrafo novo, palavra por palavra; os quatro sensores de antes seguem (as frases que eles
        trocam existem no texto novo) e o sensor novo reprova sem o trecho da hora.
  - [ ] Full gate.
- **Tests**: guarda + componente · **Gate**: Full
- **Reqs**: `LAV-66`.

### T13 — `13-prova-em-navegador`
- **What**: `prova-navegador.md` com `vite preview` do build numa porta livre, banco local com a
  migration, e o movimento real (visitas inseridas por `record_store_visit` com `p_agora` em horas
  diferentes).
- **Where**: `.specs/features/83-loja-ao-vivo/prova-navegador.md` (+ capturas em `prova/`).
- **Depends on**: T12.
- **Done when**:
  - [ ] 360 · 390 · 412 × 100 · 130 · 200 %: `scrollWidth` igual à tela no Início e em `/ao-vivo`;
        nada sobreposto; números em uma coluna a 200 %; a Conversão em largura inteira na largura
        padrão (sem célula vazia ao lado); alvos ≥ 44 px (cartão, voltar, seletor).
  - [ ] o gráfico nos dois extremos (360 a 200 %, com valores de **4 dígitos** na fixtura): nenhum valor
        sobre o vizinho, a rolagem acontece **dentro** do cartão do gráfico e o `body` não rola.
  - [ ] o cabeçalho de borda a borda, sem vão no topo (o `-mx-4 -mt-4`).
  - [ ] o número do cartão, o da faixa e o "Visitas" da seção iguais ao do banco (`store_movement`
        lido por `psql` como admin) nos três períodos; as faixas iguais ao `por_faixa`.
  - [ ] o ciclo de 15 s na rede (nenhuma chamada com a aba oculta por `visibilitychange`).
  - [ ] puxar no topo; voltar do Android (`history.back()`); `prefers-reduced-motion` sem nada animando.
  - [ ] o que **não** foi provado (Android real) escrito no fim.
- **Tests**: navegador · **Gate**: Build
- **Reqs**: `LAV-63` e o resto em revisão visual.

### T14 — `14-documentacao-e-fecho`
- **What**: `AD-066` no `STATE.md` (texto do design §9) e o handoff; `BL-055` (comparação semanal ×
  retenção), `BL-056` (probe da `83` fora do CI) e `BL-057` ("pessoas" na Fase 2 × `VIS-41`: presença
  conta pessoas, Visitas conta navegadores — decidir antes da Fase 2, junto do escopo do guarda
  `tomDaLojaAoVivo`) no `BACKLOG.md`; nota de emenda à `VIS-28` no topo da
  spec da `71` (sem reescrever a AC, `AD-017` de espírito); `apps/mobile-adm/CLAUDE.md` (rota
  `/ao-vivo`, o cartão, os guardas novos), `packages/core/CLAUDE.md` (`./live`, `counterNotes`),
  `supabase/CLAUDE.md` (a coluna, o probe no gate de quem recriar a função), e as baselines do
  `CLAUDE.md` raiz (medidas, um workspace por vez, exit fora de pipe).
- **Where**: `.specs/`, `CLAUDE.md`, `apps/mobile-adm/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`.
- **Depends on**: T13.
- **Done when**:
  - [ ] cada número escrito foi medido nesta task (não somado).
  - [ ] a lista "a confirmar" da spec repetida no handoff, com quem decide (Adri × usuário).
  - [ ] Build gate final.
- **Tests**: none (documentação) · **Gate**: Build
- **Reqs**: rastreabilidade de todos.

---

## Phase Execution Map

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5

Fase 0:  T00
Fase 1:  T01 ──→ T02
Fase 2:  T03 ──→ T04 ──→ T05
Fase 3:  T06 ──→ T07 ──→ T08 ──→ T09
Fase 4:  T10 ──→ T11
Fase 5:  T12 ──→ T13 ──→ T14
```

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T00 | 1 portão de decisão | ✅ |
| T01 | 1 migration + o guarda dela (+ as réguas da `71` aplicadas a ela) | ⚠️ maior, coeso: o guarda mede o arquivo |
| T02 | probes (1 pasta) | ✅ |
| T03 | 1 tipo + 1 opção de hook | ✅ coeso (a opção é do hook que lê o tipo) |
| T04 | 1 módulo (`core/live`) | ✅ |
| T05 | 1 função tripla movida + reexportação | ✅ |
| T06 | o endereço da tela (modelo + barra + lista de rotas) | ⚠️ 3 arquivos pequenos, coesos: "a rota existe sem aba" |
| T07 | 1 widget | ✅ |
| T08 | 1 página (+ cabeçalho e hook dela) | ⚠️ coeso: a página não é testável sem o cabeçalho |
| T09 | 1 widget + a composição da Início | ✅ |
| T10 | 2 guardas da mesma família | ✅ |
| T11 | 1 teste de integração | ✅ |
| T12 | 1 parágrafo + o guarda dele | ✅ |
| T13 | 1 prova | ✅ |
| T14 | documentação | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T00 | — | início | ✅ |
| T01 | T00 | T00 → T01 (fase anterior) | ✅ |
| T02 | T01 | T01 → T02 | ✅ |
| T03 | T02 | T02 → T03 (fase anterior) | ✅ |
| T04 | T03 | T03 → T04 | ✅ |
| T05 | T04 | T04 → T05 | ✅ |
| T06 | T05 | T05 → T06 (fase anterior) | ✅ |
| T07 | T06 | T06 → T07 | ✅ |
| T08 | T07 | T07 → T08 | ✅ |
| T09 | T08 | T08 → T09 | ✅ |
| T10 | T09 | T09 → T10 (fase anterior) | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 (fase anterior) | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T00 | decisão | none | none | ✅ |
| T01 | Migration SQL | guarda de fonte | guarda de fonte | ✅ |
| T02 | SQL semântico | probe | integração (probe) | ✅ |
| T03 | tipo + hook de `core` | unit | unit | ✅ |
| T04 | regra pura de `core` | unit | unit | ✅ |
| T05 | regra pura + painel | unit + suíte do painel intacta | unit + guarda | ✅ |
| T06 | modelo + guarda de rotas | unit / guarda | unit | ✅ |
| T07 | widget | componente | componente | ✅ |
| T08 | página | componente pelo `<App />` | componente (`<App />` real) | ✅ |
| T09 | widget + página | componente pelo `<App />` | componente (`<App />` real) | ✅ |
| T10 | guardas do app | guarda | guarda | ✅ |
| T11 | contrato com o client real | integração | integração | ✅ |
| T12 | política (loja) | guarda + componente | guarda + componente | ✅ |
| T13 | layout | navegador | navegador | ✅ |
| T14 | documentação | none | none | ✅ |

---

## Ferramentas

- **Skills**: `tlc-spec-driven` (Execute e Verificador); `supabase` (T01–T02); `playwright-cli` (T13);
  `qa-report`/`qa-execution` depois do Verificador (memória do usuário: "feature até o QA sem parar").
- **MCP**: nenhum obrigatório; o banco local é lido por `psql`/`supabase db query --local`.
