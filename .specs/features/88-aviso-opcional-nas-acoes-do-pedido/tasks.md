# 88 — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

### Regras do projeto que SOBREPÕEM a skill (`CLAUDE.md` + instrução do usuário)

1. **Nenhum commit.** Nem por task nem no fim — o usuário pede o commit quando quiser. O passo
   "atomic commit" vira **"gate verde + task marcada `[x]` neste arquivo"**.
2. **Nunca `git stash`, `git checkout -- …`, `git reset` nem `git clean`** — a árvore pode ter
   trabalho de outra sessão. Mutante do sensor: copie o arquivo para um `.bak` no scratchpad, altere,
   rode, restaure e confira o SHA-256 (`shasum -a 256`).
3. **Migration só no banco local** (`127.0.0.1:54442`). Nunca `--linked`, nunca `db push`.
4. **Teste, probe e prova só no ambiente local** (Supabase em `:54441`). Bloquear `*.supabase.co` em
   prova de navegador.
5. Medir testes **um workspace por vez**, `--testTimeout=20000` **sem** o `--`, exit code capturado
   **fora de pipe**.
6. Ler o `CLAUDE.md` do módulo antes de mexer nele (`apps/backoffice/CLAUDE.md`,
   `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`).

---

**Spec**: `.specs/features/88-aviso-opcional-nas-acoes-do-pedido/spec.md`
**Design**: `.specs/features/88-aviso-opcional-nas-acoes-do-pedido/design.md` (Approved)
**Desenho de tela**: Claude Design, *Uma Estrelinha - Backoffice* — `Pedidos - Lista.html`, `Pedido - Edição.html`
**Status**: Approved (2026-10-29) — Implemented (2026-10-30), Verifier (3 rodadas) e QA feitos; bugs do QA consertados e retestados (2026-10-30; o reteste reabriu um e achou outro, consertados e verificados no segundo reteste)

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec. Diretrizes encontradas: `CLAUDE.md` (raiz:
> guardas com âncora e sensor, `AD-012`, "teste não monta a árvore que prova", página real),
> `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, os `vitest.config.ts`
> de cada workspace.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| `packages/core` (regra pura: `notifications`, `orders/history`, `order-actions`) | unit | Todos os ramos; 1:1 com as ACs; todo edge case listado; sensor nos pontos de regra; `purity`/`denoReach` quando o grafo muda | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test --testTimeout=20000` |
| Edge function `send-notification` (handlers, dispatch) | unit (deps injetadas) | Caminho feliz + cada edge case + cada falha; corpo e RPC chamadas conferidos por VALOR (dublê que registra) | `supabase/functions/send-notification/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test --testTimeout=20000` |
| Migration | guarda de fonte (store) + probe SQL | Uma régua por comando (`L-033`), `mutar()` que lança, âncora; o comportamento só pelo probe `begin … rollback` | `apps/store/src/shared/lib/__tests__/*Schema.test.ts` · `.specs/features/88-…/probes/` | `pnpm --filter @estrelinha/store test --testTimeout=20000` · `psql … -v ON_ERROR_STOP=1 -f probes/01-aviso-pulado.sql` |
| Painel — model/hooks | unit | Todas as ACs da camada; o corpo/argumento da escrita conferido por valor | `apps/backoffice/src/**/*.test.ts` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Painel — componentes e páginas | integration (RTL) | Pela **página real** (`AdminOrderPage`, `AdminOrdersPage`) com o client dublado registrando `functions.invoke` e as escritas; estados de carregamento por atributo e texto; nada de recriar a composição no teste | `apps/backoffice/src/**/__tests__/*.test.tsx` e `*.test.tsx` ao lado | idem |
| App do ateliê (só leitura do histórico) | unit/integration | O texto da linha `skipped` no histórico do app | `apps/mobile-adm/src/**` | `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` |
| Documentação (`CLAUDE.md`, `STATE.md`) | none | — | — | — |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Task só com unit de um workspace | o comando de teste do workspace tocado (tabela acima) |
| Full | Task que toca mais de um workspace, ou guarda da loja | os comandos de teste de **cada** workspace tocado **e** da loja (`@estrelinha/store`: os guardas varrem `apps/**` e `supabase/functions`) |
| Build | Última task de cada fase | Full + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (0) · `npx tsc --noEmit -p packages/core/tsconfig.json` (11 herdados) · `npx tsc --noEmit -p apps/mobile-adm/tsconfig.app.json` (0) · `cd apps/backoffice && npx eslint .` (23/5) · `pnpm --filter @estrelinha/backoffice build` |

Baseline de referência (`CLAUDE.md`, 2026-10-29): store 6231/335 · backoffice 4516/244 · core
4924/190 · mobile-adm 2279/140 · functions 1230/33 — **remedida na T01**, e a T01 vale.

---

## Execution Plan

### Phase 1 — Fundação no banco e em `core` (5)

```
T01 → T02 → T03 → T04 → T05
```

### Phase 2 — O motor (3)

```
T06 → T07 → T08
```

### Phase 3 — Peças do painel (5)

```
T09 → T10 → T11 → T12 → T13
```

### Phase 4 — Página do pedido (5)

```
T14 → T15 → T16 → T17 → T18
```

### Phase 5 — Lista e fecho (4)

```
T19 → T20 → T21 → T23 → T24 → T22
```

**Lotes de subagente** (fases inteiras, ~7 tasks): **L1** = Fases 1+2 (8) · **L2** = Fase 3 (5) ·
**L3** = Fase 4 (5) · **L4** = Fase 5 (6, com T23/T24 do achado do L3). Sequenciais.

---

## Task Breakdown

### T01: Medir a baseline de entrada

**What**: medir testes dos cinco workspaces, tipos e lint com a árvore parada e gravar em `baseline.md`.
**Where**: `.specs/features/88-aviso-opcional-nas-acoes-do-pedido/baseline.md`
**Depends on**: None
**Requirement**: Success Criteria (baselines sem regressão)
**Done when**:
- [ ] store, backoffice, core, mobile-adm, functions medidos um por vez, `--testTimeout=20000`, exit capturado fora de pipe
- [ ] tipos dos 4 projetos + core (11) e lint do backoffice anotados; divergência da tabela do `CLAUDE.md` registrada com a causa provável
**Tests**: none · **Gate**: —

**Feito**: `baseline.md`. store 6231/335 · backoffice 4516/244 · core 4924/190 · mobile-adm 2279/140 · functions 1230/33 (todos exit 0); tsc 0 · 0 · 0 · 0 · 0, core 11; lint backoffice 23/5 · store 2/2 · mobile-adm 0/0. Nenhuma divergência contra o `CLAUDE.md`.

---

### T02: Migration do status `skipped` e a RPC `skip_order_notification`

**What**: migration `supabase/migrations/20261102120000_88-aviso-pulado.sql` (C4) + guarda + probe; aplicar **só** no banco local.
**Where**: a migration; `apps/store/src/shared/lib/__tests__/avisoPuladoSchema.test.ts` (novo); `apps/store/src/shared/lib/__tests__/orderNotificationsSchema.test.ts` (só se precisar aprender o endereço vigente do `check` de status); `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (RPC nova na lista literal); `.specs/features/88-…/probes/01-aviso-pulado.sql`
**Depends on**: T01
**Reuses**: molde de `entregaDeEmailSchema`/`orderNotificationsSchema` (`mutar()` que lança); a recriação do `check` da `57`/`79`
**Requirement**: AVS-10, AVS-11, AVS-24 (lado banco)
**Done when**:
- [ ] `check` de `status` = `('pending','sent','failed','skipped')`, derrubado antes de recriado; `skip_order_notification` `security definer`, `search_path = ''`, `execute` só `service_role` (revoke de `public`/`anon`/`authenticated`); upsert com `where n.status in ('failed','skipped')`; nenhuma escrita de dado
- [ ] guarda: uma régua por comando, cada uma com sensor por mutação; âncora (arquivo lido, função e `check` achados); o `check` da `42` deixa de ser o vigente
- [ ] `marcacaoSoPorAcao` conhece `skip_order_notification` (com o `create function` conferido na migration)
- [ ] probe `begin … rollback` contra a 54442, exit 0, só linhas `ok —`: insere `skipped`; `failed→skipped`; `sent` intocado (devolve null); `pending` intocado; `claim_order_notification` reivindica `skipped`; `anon`/`authenticated` sem `execute`
- [ ] migration aplicada no banco local (`psql` na 54442), `supabase migration list` local mostra a 88
**Tests**: guarda de fonte + probe · **Gate**: full (store)

**Feito**: `supabase/migrations/20261102120000_88-aviso-pulado.sql` (aplicada SÓ no banco local por `supabase migration up --local`; `schema_migrations` local mostra `20261102120000`), `apps/store/src/shared/lib/__tests__/avisoPuladoSchema.test.ts` (39 casos, uma régua por comando, `mutar()` que lança, âncora: arquivo + função + `check` + as duas criadoras da pasta), `probes/01-aviso-pulado.sql` (`begin … rollback`, reaplica o arquivo do disco; exit 0, **22** `ok —`). Gate: store **6270/336**, exit 0 (+39/+1). `orderNotificationsSchema` não precisou mudar (o guarda novo mede o `check` vigente e assere que o da 42 não é mais). Sensor: guarda — 5 mutantes no arquivo real (recorte com `sent`, sem revoke de `authenticated`, `security invoker`, `check` sem `skipped`, `search_path = public`), 5 mortos por asserção, SHA-256 conferido; probe — 5 mutantes, 4 mortos (`sent`, `pending`, `search_path`, `check`); o sem-revoke-de-`authenticated` sobrevive ao probe porque o banco local não dá `execute` padrão a `authenticated` (o `revoke … from public` basta aqui) — quem o mata é o guarda. **Desvio**: `skip_order_notification` entra na lista literal de `marcacaoSoPorAcao` na **T06**, junto com a primeira chamada: a régua compara POR IGUALDADE o conjunto chamado em produção com a lista, e acrescentá-la antes da chamada reprovaria a suíte da loja.

---

### T03: `customerNoticeFor` e `sentCustomerEvents`

**What**: `packages/core/src/notifications/notice.ts` (C1), exportado pelo barril.
**Where**: `notice.ts`, `index.ts`, `__tests__/notice.test.ts`; `purity`/`denoReach` do diretório se a âncora de contagem mudar
**Depends on**: T02
**Reuses**: `eventsForTrigger`, `EVENT_AUDIENCE`, `orderStateFailure`, `resolveEventSettings`
**Requirement**: AVS-01 (previsão), AVS-06, AVS-14, AVS-15, AVS-16, AVS-18, A-01, edge cases (sem e-mail; settings ausentes)
**Done when**:
- [ ] matriz: cada gatilho × status/material × ligado/desligado × já enviado × sem `customer_email` × retirada; `shipped` sem rastreio ⇒ `send: []`; com rastreio ⇒ `['order_shipped']`; já enviado ⇒ `alreadySent: ['order_shipped']`; eventos `owner` nunca em `send`
- [ ] `sentCustomerEvents` conta só `channel = 'email'` e `status = 'sent'` (`skipped`/`failed`/`push` não contam)
- [ ] sensor: a previsão sem o filtro de "já enviado" reprova o caso do ajuste
- [ ] grafo alcançável pelo Deno (especificador relativo com `.ts`, `import type` incluso)
**Tests**: unit · **Gate**: quick (core)

**Feito**: `packages/core/src/notifications/notice.ts` (`customerNoticeFor`, `sentCustomerEvents`, `CustomerNotice`; todo import relativo com `.ts`, sem import de pacote), exportado por `notifications/index.ts`; `__tests__/notice.test.ts` (22 casos: o par TRG-12, o ajuste já avisado, desligado, Entregue/Cancelado/volta de status, retirada, material recebido/produção, envelope com o aviso da dona excluído, pagamento aprovado, sem e-mail ×4, settings nulos ×2, e `sentCustomerEvents`). `settings` aceita `null`/`undefined` (cai nos padrões, edge case da spec). O `purity.test.ts` do diretório alcança o arquivo por construção (varre a pasta), e passa. Gate: core **4946/191**, exit 0 (+22/+1). Sensor: 6 mutantes no arquivo real (sem o filtro de "já enviado" — o sensor que a task pede —, sem o filtro de público, sem a checagem de e-mail, sem a pré-condição, sem o filtro de ligado, `sentCustomerEvents` contando `skipped`), 6 mortos por asserção, SHA-256 conferido.

---

### T04: A linha `skipped` no histórico

**What**: `core/orders/history.ts` ganha o ramo `skipped` e `emailSkipped` (C5, metade core).
**Where**: `packages/core/src/orders/history.ts` e o teste dele; `apps/mobile-adm` (um caso de leitura no teste do histórico do app)
**Depends on**: T03
**Requirement**: AVS-12 (texto), risco "mobile-adm passa a receber `skipped`"
**Done when**:
- [ ] `skipped` ⇒ título `Aviso à cliente não enviado: <NOTIFICATION_EVENT_NAMES>`, detalhe `Você escolheu não avisar`, `emailSent: false`, `emailSkipped: true`, `emailType`, `emailChannel`
- [ ] o ramo de falha fica byte a byte (asserção existente intacta) e `regrasDoPedidoNoCore` do painel continua `toBe`
- [ ] o app do ateliê mostra a frase nova para a linha `skipped` (teste do app)
**Tests**: unit · **Gate**: full (core, mobile-adm, backoffice)

**Feito**: `packages/core/src/orders/history.ts` — `HistoryEvent.emailSkipped?`, e o ramo `skipped` ANTES do de falha (título `Aviso à cliente não enviado: <NOTIFICATION_EVENT_NAMES>`, detalhe `Você escolheu não avisar`, `emailSent: false`, `emailSkipped: true`, `emailType`, `emailChannel`; o ramo de falha byte a byte). `__tests__/history.test.ts` +20 (a linha inteira por `toEqual`, o `it.each` dos 17 eventos, o `error` residual que não vaza, a falha e a enviada sem `emailSkipped`); `apps/mobile-adm/src/widgets/order-detail/__tests__/ItensValoresEntregaHistorico.test.tsx` +1 (a frase da escolha no `Historico` real, sem "Falha ao enviar"/"NÃO foi avisada"). Gate: core **4966/191** · mobile-adm **2280/140** · backoffice **4516/244** (idêntico; `regrasDoPedidoNoCore` segue `toBe`), os três exit 0. Sensor: 3 mutantes no arquivo real (o ramo apagado — morto no core e no app —, sem `emailSkipped`, o `error` vazando no detalhe), 3 mortos por asserção, SHA-256 conferido. Achado (fora do escopo, não consertado): o `Historico.tsx` do app pinta em `alert` toda linha de e-mail com `emailSent === false` — a linha `skipped` sai com a frase certa, mas no tom de falha.

---

### T05: `avisarCliente` no dono da escrita

**What**: C2 — `NotifyOptions`, `avisarCliente` nos quatro `write*`, `customer: false` no corpo de `triggerOrderNotification`.
**Where**: `packages/core/src/order-actions/{types,notify,status,tracking,material,materialTracking}.ts` e testes
**Depends on**: T04
**Requirement**: AVS-03, AVS-04 (lado core), A-04, Tech Decision "dois argumentos quando ausente"
**Done when**:
- [ ] `avisarCliente:false` ⇒ `notify(id, trigger, { cliente: false })`; ausente/`true` ⇒ `notify` chamado com **exatamente dois** argumentos (paridade; `runAppAction` e o app intocados)
- [ ] `avisar:false` continua não chamando `notify` mesmo com `avisarCliente:false`
- [ ] `triggerOrderNotification` manda `{ order_id, trigger }` sem opção e `{ order_id, trigger, customer: false }` com `cliente:false` (corpo por valor)
- [ ] `purity` de `order-actions` verde
**Tests**: unit · **Gate**: build (fim da Fase 1)

**Feito**: `packages/core/src/order-actions/types.ts` (`NotifyOptions { cliente? }`, `OrderWriteDeps.notify` com o 3º argumento opcional), `notify.ts` (`triggerOrderNotification(…, opcoes?)` põe `customer: false` no corpo só com `cliente === false`; `notifyWrite`, o dono único de "2 ou 3 argumentos"), `status.ts`/`tracking.ts`/`material.ts`/`materialTracking.ts` (`avisarCliente?`, só com `avisar`), `index.ts` (tipo `NotifyOptions`). Testes: `__tests__/avisarCliente.test.ts` novo (5 casos × 4 escritas: `{ cliente: false }`, `emailSent` do que voltou, ausente e `true` com EXATAMENTE dois argumentos, `avisar: false` sem aviso) e `notify.test.ts` +4 (corpo com `customer: false`; sem a chave para `{cliente:true}`, `{}` e `undefined`). Nenhum teste antigo tocado; `runAppAction` e o app intocados. Gate build: core **4990/192** (+24/+1) · store 6270/336 · backoffice 4516/244 · mobile-adm 2280/140, os quatro exit 0; tsc backoffice 0 · mobile-adm 0 · store 0 · core 11 (idênticos linha a linha à T01); lint backoffice 23/5; `pnpm --filter @estrelinha/backoffice build` verde; `purity` de `order-actions` verde. Sensor: 6 mutantes nos arquivos reais (terceiro argumento sempre, corpo ignorando a opção, `customer: true` no corpo, `status.ts` ignorando a escolha, o envelope ignorando a escolha, `avisar: false` vencido por `avisarCliente`), 6 mortos por asserção, SHA-256 dos cinco arquivos conferido.

---

### T06: O motor pula os e-mails da cliente

**What**: C3, metade `dispatch.ts`: `DispatchTriggerOptions.customer`, modo pular no caminho do e-mail (mesmas checagens, RPC no lugar do claim), `skipped: 'admin_opt_out'`.
**Where**: `supabase/functions/send-notification/dispatch.ts`, `__tests__/dispatch.test.ts`
**Depends on**: T05
**Requirement**: AVS-04, AVS-10, AVS-11 (lado motor), AVS-24, A-04
**Done when**:
- [ ] `customer:false`: evento `customer` ⇒ `rpc('skip_order_notification', { p_order_id, p_event, p_channel:'email' })` e **nenhuma** chamada ao provedor; evento `owner` do mesmo gatilho sai (e-mail, e push quando houver)
- [ ] evento desligado, pré-condição falhando ou sem destinatário ⇒ nem RPC nem envio
- [ ] RPC devolvendo `null` ⇒ `skipped:'already_sent'`; erro ⇒ `reason:'skip_failed'` sem lançar
- [ ] sem a opção, as listas exatas de eventos dos testes antigos seguem sem asserção tocada
- [ ] log sem e-mail nem texto da cliente
**Tests**: unit · **Gate**: quick (functions)

**Feito**: `supabase/functions/send-notification/dispatch.ts` — `DispatchTriggerOptions.customer?`, `SkipReason` `admin_opt_out`, e o modo pular como PARÂMETRO (`pular`) de `forEvent` → `forEmail` → `deliver` (uma função só: as mesmas checagens de remetente, pré-condição, ligado e destinatário; no lugar do claim, `rpc('skip_order_notification', { p_order_id, p_event, p_channel })`); `null` ⇒ `skipped: already_sent`, erro ⇒ `reason: skip_failed` sem lançar; o log `{ …, status: 'skipped', skipped: 'admin_opt_out' }` sem e-mail nem texto. `pular` vale só para `EVENT_AUDIENCE === 'customer'` com `customer === false` explícito. Testes em arquivo NOVO `__tests__/dispatchSkip.test.ts` (11 casos), no molde de `dispatchPush.test.ts` — `dispatch.test.ts` sem asserção tocada (as listas exatas de eventos sem a opção seguem verdes). `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts`: `skip_order_notification` entrou na lista literal (o desvio anotado na T02), com o `create function` conferido na migration pelo `it.each` de sempre (90/90). Gate: functions **1241/34**, exit 0 (+11/+1). Sensor: 6 mutantes em `dispatch.ts` (pular também a dona, pular sem a opção, claim no lugar do skip, `null` virando pulado, erro da RPC ignorado, e-mail da cliente no log), 6 mortos por asserção, SHA-256 conferido.

---

### T07: A porta `trigger` aceita, a porta `notify` ignora

**What**: C3, metade `handlers.ts`: `runTrigger(deps, body, { podePularCliente })`.
**Where**: `supabase/functions/send-notification/handlers.ts`, `__tests__/handlers.test.ts`
**Depends on**: T06
**Requirement**: risco de segurança "porta da cliente", AVS-04
**Done when**:
- [ ] `action=trigger` (admin) com `customer:false` repassa a opção; com `customer` ausente/`true`, comportamento de hoje
- [ ] `action=notify` (dona do pedido) com `customer:false` **envia** normalmente (a opção é ignorada) — provado pelo provedor chamado
- [ ] `wiringResolve`/`http` guards verdes
**Tests**: unit · **Gate**: full (functions, store)

**Feito**: `supabase/functions/send-notification/handlers.ts` — `runTrigger(deps, body, { podePularCliente })`; `trigger` (admin) passa `true`, `notify` (dona do pedido) passa `false`; só o booleano `customer === false` conta. `__tests__/handlers.test.ts` +6 (admin com `customer: false` ⇒ skip e zero provedor; ausente/`true`/a string `"false"` ⇒ a cliente recebe; `notify` com `customer: false` ENVIA — provedor chamado para a cliente, nenhum skip; não-admin ⇒ 403 sem skip). Gate: functions **1247/34** · store **6271/336** (+1: o `it.each` de `marcacaoSoPorAcao` sobre a RPC nova), os dois exit 0; `wiringResolve` e `http` verdes. Sensor: 4 mutantes em `handlers.ts` (`notify` pulando, `trigger` não pulando, a string contando, o ausente pulando), 4 mortos por asserção, SHA-256 conferido.

---

### T08: Probe do motor servido

**What**: `.specs/features/88-…/probes/02-motor.sh` — `supabase functions serve` local, pedido semeado e limpo por `trap`.
**Where**: o probe e a saída de referência `02-motor.saida.txt`
**Depends on**: T07
**Requirement**: Success Criteria (probe), AVS-10, AVS-13 (lado servidor), `AD-012`
**Done when**:
- [ ] `trigger` com `customer:false` ⇒ linha `skipped` gravada; `owner` registrado como de costume
- [ ] `send` do mesmo evento ⇒ a linha deixa de ser `skipped` (reivindicada: `sent` ou `failed` conforme a chave local)
- [ ] `notify` com `customer:false` não grava `skipped`
- [ ] exit 0, só linhas `ok —`; nada fora do banco local
**Tests**: probe · **Gate**: build (fim da Fase 2)

**Feito**: `probes/02-motor.sh` + `probes/02-motor.saida.txt`. `supabase functions serve send-notification --env-file` com envio CONTIDO (chave do Resend inválida, `RESEND_DEV_REDIRECT_TO` em `@exemplo.invalid` e `HTTPS_PROXY` para um proxy inexistente — o motivo gravado nas linhas `failed` é `error sending request for url (https://api.resend.com/…)`, ou seja, nada saiu da máquina); pedidos `P88-…` e uma conta de cliente semeados, dois eventos ligados em `store_settings.notifications`, e `trap` que apaga as fixturas, devolve `notifications` byte a byte (conferido) e encerra o `serve`. Exit 0, **16** `ok —`: `trigger` com `customer:false` ⇒ `skipped` (attempts 1, nenhuma tentativa); o aviso à dona do mesmo gatilho reivindicado como de costume; o `send` converte a MESMA linha (mesmo id) de `skipped` para `failed`; `notify` com `customer:false` reivindica o e-mail da cliente e não grava `skipped`; nenhuma linha `sent`. O probe servido também prova que o grafo do motor (com `notice.ts` no barril) resolve no Deno. Gate build: functions 1247/34 · store 6271/336 · core 4990/192, exit 0; tsc backoffice 0 · mobile-adm 0 · store 0 · core 11 herdados; lint backoffice 23/5; build do backoffice verde. Sensor contra o motor SERVIDO: 2 mutantes (a porta `notify` pulando; o motor pulando também a dona), 2 mortos pelo probe (`PROBE FALHOU` nomeando o pedido), SHA-256 dos dois arquivos conferido, banco restaurado nas duas rodadas.

---

### T09: `ActionButton` e `usePendingAction`

**What**: C7 — botão que mostra trabalho e o portão de uma gravação por vez, com a região viva.
**Where**: `apps/backoffice/src/shared/ui/ActionButton.tsx`, `apps/backoffice/src/shared/lib/usePendingAction.ts`, testes; `shared/ui/index.ts`
**Depends on**: T08
**Requirement**: CRG-01, CRG-02, CRG-09, A-11
**Done when**:
- [ ] `pending` ⇒ `Loader2` com `animate-spin`, gerúndio, `aria-busy="true"`, `disabled`; sem `pending`, o rótulo
- [ ] `rodar` com outra gravação em curso não executa a segunda (contado pela função dublada); `pendente` volta a `null` em sucesso **e** em falha
- [ ] região viva anuncia gerúndio e resultado
- [ ] alvo ≥ 44 px quando o chamador pede (classe por token exato)
**Tests**: integration (RTL) · **Gate**: quick (backoffice)

**Feito**: `apps/backoffice/src/shared/ui/ActionButton.tsx` (`pending`, `pendingLabel`, `alvo44` ⇒ `min-h-11`; `Loader2` com `animate-spin`, `aria-busy="true"`, `disabled`; `forwardRef`), exportado por `shared/ui/index.ts`; `apps/backoffice/src/shared/lib/usePendingAction.ts` (`{ pendente, rodar(chave, gerundio, fn), anunciar(texto), regiaoViva }` — trava síncrona por ref, `pendente` volta a `null` no `finally`, a rejeição chega a quem chamou; região `aria-live="polite"` com o gerúndio ao começar e o resultado por `anunciar`). Teste `shared/ui/ActionButton.test.tsx` (10 casos: o rótulo e o gerúndio, `aria-busy`, o ícone `lucide-loader-circle` girando, `disabled` do chamador, `min-h-11` por token exato só com `alvo44`; o botão da gravação em curso e o vizinho desabilitado sem indicador; duas `rodar` no mesmo tique ⇒ a segunda não roda (contada); duplo clique ⇒ uma chamada; `null` em sucesso e em falha; a região viva). Gate: backoffice **4526/245**, exit 0 (+10/+1). Sensor: 6 mutantes (sem a trava, sem o `finally`, sem anunciar o gerúndio, sem `aria-busy`, sem `disabled` no `pending`, `min-h-11` sempre), 6 mortos por asserção, SHA-256 conferido.

---

### T10: Releitura que não pisca

**What**: `useAdminOrder.reload(modo)` e `useAdminOrderList.refetch(modo)` com `FetchMode` (C7).
**Where**: `apps/backoffice/src/entities/order/api/useAdminOrder.ts`, `useAdminOrderList.ts` e testes
**Depends on**: T09
**Requirement**: CRG-03, CRG-04, CRG-12
**Done when**:
- [ ] `'revalidar'` não liga `loading`; em falha mantém `order`/`rows` e grava `staleError`; `'inicial'` igual a hoje
- [ ] a lista expõe `revalidando` durante a releitura e mantém página e tamanho
- [ ] testes de hook provando o estado nos dois modos, inclusive a falha
**Tests**: unit · **Gate**: quick (backoffice)

**Feito**: `entities/order/api/useAdminOrder.ts` — `reload(modo: FetchMode = 'inicial')` e `staleError`; só `'revalidar'` revalida (qualquer outro valor é a carga inicial, para um `onClick={reload}` não revalidar em silêncio); em `'revalidar'` nada é zerado antes da resposta (nem `loading`, nem as fotos dos itens), a falha da leitura do pedido grava `staleError` e mantém o pedido, o sucesso apaga `staleError`. `entities/order/api/useAdminOrderList.ts` — `refetch(modo)`, `revalidando` (verdadeiro do começo até as contagens voltarem) e `staleError`; em falha mantém linhas e total; o recorte (página e tamanho) é o da consulta, sem mudança. Testes novos: `useAdminOrder.revalidar.test.ts` (6: `loading` registrado a CADA render — nenhum `true` na releitura, o pedido e as fotos no meio da releitura segura, a falha mantendo o pedido com `staleError` e `error` nulo, o sucesso apagando; a carga inicial liga `loading` com a leitura segura; a falha inicial sem `staleError`) e `useAdminOrderList.revalidar.test.ts` (5: `revalidando` só no meio, linhas por identidade, página 3 × 50 ⇒ `range(100, 149)` nas duas leituras, falha mantendo linhas e total, sucesso apagando `staleError`, e a carga inicial de sempre). Gate: backoffice **4537/247**, exit 0 (+11/+2). Sensor: 8 mutantes (as fotos zeradas na releitura, `loading` ligado na releitura do pedido, o ramo do `staleError` do pedido, o `staleError` que não apaga — no pedido e na lista —, `loading` ligado na releitura da lista, o ramo do `staleError` da lista, sem `revalidando`), 8 mortos por asserção — o da lista que não apaga sobreviveu à primeira escrita e ganhou o caso "a releitura seguinte que dá certo APAGA", reinjetado e morto; SHA-256 conferido. Fora do escopo, não feito: o token de sequência da convenção da `50` (duas releituras fora de ordem) — com `usePendingAction` uma gravação por vez no pedido, a corrida fica só entre uma releitura e uma troca de filtro da lista, como hoje.

---

### T11: `avisarCliente` no hook do painel

**What**: `useAdminOrders` repassa `avisarCliente` em `updateStatus`, `addTrackingCode`, `setMaterialStatus`, `setMaterialTracking`, e `cancelOrder` dispara o gatilho com `customer:false` quando pedido; corrige o comentário de `addTrackingCode` sobre o Melhor Envio (`A-08`).
**Where**: `apps/backoffice/src/entities/order/api/useAdminOrders.ts`, `notifyOrder.ts`, `useAdminOrders.delega.test.ts`, `useAdminOrders.test.ts`
**Depends on**: T10
**Requirement**: AVS-03, AVS-04, AVS-09
**Done when**:
- [ ] cada função entrega `avisarCliente` ao dono (o argumento recebido pelo dublê, por valor); ausente ⇒ chamada idêntica à de hoje
- [ ] `cancelOrder(id, motivo, false)` invoca `send-notification?action=trigger` com `customer:false`; a escrita de `cancelOrder` continua a única da allowlist (`pedidoGravadoSoPeloDono` verde)
- [ ] `notifyOrder(id, trigger, opcoes?)` repassa ao dono
**Tests**: unit · **Gate**: full (backoffice, store)

**Feito**: `entities/order/api/useAdminOrders.ts` — `updateStatus(id, status, note?, avisarCliente?)`, `addTrackingCode(id, code, carrier, avisarCliente?)`, `setMaterialStatus(id, status, avisarCliente?)`, `setMaterialTracking(id, code, avisarCliente?)`: a escolha entra na entrada do dono SÓ quando foi dita (`comEscolha`: ausente ⇒ nem a chave aparece; `true` e `false` chegam por valor); `cancelOrder(id, reason, avisarCliente?)` — a escrita intocada (continua a única da allowlist de `pedidoGravadoSoPeloDono`), e o aviso vira `notifyOrder(id, trigger, { cliente: false })` com a caixa desmarcada, ou a chamada de dois argumentos de sempre; o comentário de `addTrackingCode` que dizia cobrir o Melhor Envio foi corrigido (`A-08`, `BL-061`). `notifyOrder.ts` — `notifyOrder(id, trigger, opcoes?)` repassa a `triggerOrderNotification`. Testes: `notifyOrder.test.ts` +2 (corpo com `customer: false`; sem a opção, sem a chave), `useAdminOrders.delega.test.ts` +6 (as quatro escritas com `false` por valor, `true` por valor, ausente sem a chave nas quatro) e `useAdminOrders.aviso.test.ts` novo (7: o CORPO de `functions.invoke`, por valor, com o dono e o `notifyOrder` de VERDADE — as quatro escritas com e sem a escolha, e `cancelOrder` com `false`, ausente e `true`, este conferindo a escrita do cancelamento). Nenhum teste antigo tocado. Gate full: backoffice **4552/248** · store **6271/336** (idêntica: `pedidoGravadoSoPeloDono` verde), os dois exit 0. Sensor: 6 mutantes (a escolha nunca repassada, a chave sempre presente, só o `false` repassado, `notifyOrder` engolindo a opção, `cancelOrder` sem o `{ cliente: false }`, `cancelOrder` pulando a cliente sempre), 6 mortos por asserção, SHA-256 conferido. Nota: `cancelOrder` continua devolvendo só o `error` (não o `emailSent`) — mudar a forma do retorno não estava na task; o Lote 3 decide se `AVS-07` no cancelamento precisa dele.

---

### T12: O diálogo de aviso e o portão

**What**: C6 — `features/order-notice` (`NoticeDialog`, `useNoticeGate`, barril).
**Where**: `apps/backoffice/src/features/order-notice/**` e testes
**Depends on**: T11
**Requirement**: AVS-01, AVS-02, AVS-04 (texto da caixa desmarcada), AVS-05, AVS-07 (erro no diálogo), AVS-19 (forma do lote), AVS-22, CRG-07, A-02, A-06
**Done when**:
- [ ] caixa nasce **marcada** a cada abertura; desmarcar risca os e-mails e mostra a frase do histórico com avião; um botão confirma com o verbo recebido
- [ ] `executar(true|false)` recebe o estado da caixa; `null` fecha; string fica no diálogo e reabilita
- [ ] enquanto `executar` corre: `Esc`, fora e "Voltar" não fecham; o botão mostra o gerúndio (`ActionButton`)
- [ ] "Voltar"/`Esc` não chamam `executar`; foco vai ao título ao abrir e volta à origem ao fechar
- [ ] nomes dos e-mails vêm de `NOTIFICATION_EVENT_NAMES` (`notificationSingleOwner` verde); "Ver o e-mail" monta a prévia com `order_id` (P3)
- [ ] variante de lote: "Avisar as N clientes", contagem por e-mail, linha "já recebeu antes"
**Tests**: integration (RTL) · **Gate**: full (backoffice, store)

**Feito**: `apps/backoffice/src/features/order-notice/` — `model/types.ts` (`NoticeRequest`, `NoticeEmail`), `model/useNoticeGate.ts` (`{ pedir, dialogo, ocupado }` e `FALHA_INESPERADA`), `model/previa.ts` (`abrirPrevia`), `ui/NoticeDialog.tsx`, `ui/NoticeEmails.tsx` (a caixa + os e-mails + as frases, separada para o cancelamento reusar — `A-03`), `index.ts`. A caixa nasce marcada a cada `pedir`; `executar(avisar)`; `null` fecha, uma frase fica num `role="alert"` com o botão reabilitado e a caixa como estava, e uma exceção vira `FALHA_INESPERADA`; com a gravação no ar o `onOpenChange` do diálogo controlado ignora `Esc`, clique fora e o "x", e "Voltar" e a caixa ficam desabilitados; o botão é o `ActionButton` com o gerúndio; "Voltar"/`Esc` chamam `aoCancelar` e nunca `executar`; o foco vai ao título (`tabIndex=-1`) ao abrir e volta ao elemento focado no `pedir`. Os nomes vêm de `NOTIFICATION_EVENT_NAMES`; desmarcada, a lista ganha `line-through` (`data-riscado`) e a frase "A cliente não recebe e-mail. Fica anotado no histórico, com o avião…" com o `Send`. Lote: "Avisar as N clientes por e-mail", "N e-mails, um para cada cliente:" (ou "1 e-mail:"), a contagem por e-mail, a linha "já recebeu" e o `extra`. "Ver o e-mail" (só com `orderId`, nunca no lote) abre a aba ANTES do `await` e põe o HTML da prévia num `<iframe sandbox>` — nunca escrito no documento da aba, que é da origem do painel logado. **Desvios**: (1) `NoticeRequest` ganhou `orderId?` (a prévia de `AVS-22` precisa do pedido; o design não o listava) e `aoCancelar?` (`AVS-05`: o "Outro status" volta ao vazio); (2) `features/notification-settings/index.ts` passou a exportar `previewNotification` (uma linha, para não importar caminho profundo). Teste `features/order-notice/__tests__/NoticeDialog.test.tsx` (16 casos, com `functions.invoke` registrando o corpo da prévia e `window.open` devolvendo um documento de verdade). Gate full: backoffice **4568/249** · store **6271/336** (`notificationSingleOwner` verde), os dois exit 0; tsc do painel 0. Sensor: 17 mutantes; 15 mortos por asserção na primeira rodada e 2 sobreviventes — as travas redundantes (uma ref em `confirmar` e outra em `voltar`, mais o `preventDefault` de `Esc`/fora), inalcançáveis porque o botão desabilitado e o `onOpenChange` controlado já barram: foram REMOVIDAS em vez de ganharem teste; os 3 guardas que sobraram (o `!ocupado` do `onOpenChange`, o "Voltar" desabilitado, a caixa desabilitada) reinjetados e mortos. SHA-256 conferido em todos.

---

### T13: Esqueleto do pedido

**What**: `OrderPageSkeleton` com a grade do pedido (coluna + lateral 330).
**Where**: `apps/backoffice/src/shared/ui/Skeletons.tsx` e teste
**Depends on**: T12
**Requirement**: CRG-06
**Done when**:
- [ ] a mesma grade `lg:grid-cols-[minmax(0,1fr)_330px]` do pedido, `aria-busy`, sem texto "Carregando..."; `motion-reduce` no brilho se houver
**Tests**: integration (RTL) · **Gate**: build (fim da Fase 3)

**Feito**: `apps/backoffice/src/shared/ui/Skeletons.tsx` — `OrderPageSkeleton` (`data-testid="order-page-skeleton"`, `aria-busy="true"`, `aria-label="Carregando o pedido"` sem texto visível; o cabeçalho e a grade `grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]` de `AdminOrderPage`, com dois cartões na coluna e um na lateral; todo bloco com `motion-reduce:animate-none` ao lado do `animate-pulse` do `Skeleton`), exportado por `shared/ui/index.ts`. `Skeletons.test.tsx` +2 (a grade por token exato e dois filhos, `aria-busy`, nenhum "Carregando"; todo bloco que pulsa com o par de movimento, âncora > 5 blocos). Gate build (fim da Fase 3): backoffice **4570/249** · store **6271/336**, os dois exit 0; tsc backoffice 0 · mobile-adm 0 · core 11 herdados; lint backoffice 23/5; `pnpm --filter @estrelinha/backoffice build` verde. Sensor: 4 mutantes (a lateral em 320, sem `aria-busy`, sem o par `motion-reduce`, um "Carregando..." de volta), 4 mortos por asserção, SHA-256 conferido.

---

### T14: Próximo passo

**What**: `OrderNextStep` com `ActionButton` e o seletor desabilitado e com estado.
**Where**: `apps/backoffice/src/features/order-detail/ui/OrderNextStep.tsx` e teste
**Depends on**: T13
**Requirement**: CRG-01, CRG-02, AVS-05 (seletor volta ao vazio)
**Done when**:
- [x] botão mostra o gerúndio por status (`Marcando como enviado…` etc.) quando `pendente`; seletor desabilitado com `pendente`; volta ao vazio quando o portão é cancelado
**Tests**: integration (RTL) · **Gate**: quick (backoffice)

**Feito**: `features/order-detail/ui/OrderNextStep.tsx` — o botão é `ActionButton` (`alvo44`, `pending` quando `gravando === passo.status`, gerúndio de `gerundioDoStatus`); o seletor tem `aria-label="Outro status"`, `disabled={busy}`, guarda a escolha enquanto o gesto corre e volta ao vazio quando a promessa de `onAdvance` termina (gravado, desistido ou rejeitado — a rejeição é engolida ali, para não virar erro não tratado num manipulador de evento). Prop nova `gravando?: string | null`; `onAdvance` passou a `Promise<unknown>`. `features/order-detail/model/gerundio.ts` novo (`gerundioDoStatus(status, retirada)`: "Marcando como enviado…", "Marcando como retirado…" etc., as frases do protótipo), exportado pelo barril — a página e o diálogo dizem o mesmo gerúndio. Teste novo `features/order-detail/ui/OrderNextStep.test.tsx` (7: gerúndio + `aria-busy` + desabilitado, retirada, sem gravação, outra gravação desabilita SEM indicador, seletor desabilitado, a escolha visível até o gesto terminar e o vazio depois, a rejeição também esvazia). Gate quick: o arquivo 7/7. Sensor: 3 mutantes (`pending` sempre falso, o seletor sem `disabled`, o vazio imediato de antes), 3 mortos por asserção, SHA-256 conferido.

---

### T15: Card do material

**What**: `OrderMaterialCard` com portão (recebido, produção, envelope), `ActionButton` e a nota da dona.
**Where**: `apps/backoffice/src/features/order-management/ui/OrderMaterialCard.tsx` e teste
**Depends on**: T14
**Requirement**: gestos 4, 5, 6; AVS-01, AVS-04, A-04 (nota da dona)
**Done when**:
- [x] com e-mail previsto, o portão abre; sem, grava direto e diz por quê
- [x] `onSetStatus`/`onSetTracking` recebem `avisarCliente` (por valor)
- [x] envelope: a nota "o aviso para você sai de qualquer forma" decidida por `EVENT_AUDIENCE` do gatilho, nunca por nome de evento
- [x] cada botão com seu gerúndio; o campo do código mantém o texto em falha
**Tests**: integration (RTL) · **Gate**: quick (backoffice)

**Feito**: `features/order-management/ui/OrderMaterialCard.tsx` — o card DESCREVE os três gestos (recebido, produção, envelope) e quem os roda é `acionar` (prop nova, vinda de `useGestoComAviso` da página): previsão → portão ou gravação direta → frase do desfecho. `onSetStatus`/`onSetTracking` recebem `avisarCliente` por valor só quando houve diálogo (sem diálogo, exatamente dois argumentos). O envelope prevê com `material_status` de destino `material_enviado` (o que a RPC faz). Os três botões viraram `ActionButton` com chave própria (`material:material_recebido`, `material:em_producao`, `material:envelope`) e gerúndio ("Registrando recebimento…", "Colocando em produção…", "Salvando código…"); `pendente` desabilita todos. O campo do envelope mantém o texto em falha. **Peça nova (fora do Where, necessária)**: `features/order-notice/model/useGestoComAviso.ts` (+ barril) — `useGestoComAviso({ settings, enviados })` junta `useNoticeGate` + `usePendingAction` + `customerNoticeFor` e a frase (`fraseDoResultado`: com a caixa desmarcada decide-se pela CAIXA; `emailSent` ⇒ "a cliente foi avisada por e-mail"; caixa marcada sem envio ⇒ "o e-mail não saiu; o pedido foi alterado"; sem diálogo ⇒ "“<nome>” já tinha sido enviado, não sai de novo" ou "nenhum aviso sai nesta mudança"); `notaDaDonaPara` decide a nota por `EVENT_AUDIENCE` dos eventos de `eventsForTrigger` (texto: "O aviso “Material a caminho”, para você, não depende desta caixa: ele segue o que está em Configurações → Notificações." — não afirma que sai, porque o evento da dona nasce desligado). `abrirPrevia` passou a ser exportado pelo barril (o cancelamento a usa). `OrderMaterialCard.test.tsx` 21 → 31: arnês com o hook REAL e o diálogo; **reescritos sem perder asserção** (o fluxo mudou pela spec — o portão abre antes da escrita): "chama a transição com o alvo certo" agora confirma no diálogo e cobra `('ord-1','material_recebido', true)` e que nada foi gravado antes; "recusa do servidor vira toast" roda com o evento desligado (gravação direta) + caso novo da recusa DENTRO do diálogo; "e-mail que NÃO saiu" cobra a frase nova ("· nenhum aviso sai nesta mudança") e continua recusando "avisada"/"e-mail" + caso novo da caixa marcada sem envio; "`nao_aplicavel` não ganha card" mede o lugar do card (o arnês monta a região viva). Novos: portão antes da escrita com nome e cliente, desmarcar ⇒ `false` e a frase pela caixa com `sent: true`, "Voltar" ⇒ zero escritas, produção sem diálogo com 2 argumentos, já enviado, envelope com a nota da dona e `false` por valor, nota ausente sem evento da dona, gerúndio + `aria-busy` + vizinhos desabilitados (dois gestos), o código mantido em falha. Gate quick: 31/31. Sensor: 4 mutantes (3º argumento sempre, a nota por público errado, a chave do gerúndio trocada, o Salvar sem `ocupado`), 4 mortos por asserção, SHA-256 conferido.

---

### T16: Cancelar pedido

**What**: `OrderCancelDialog` com a caixa, fica aberto até o desfecho e não apaga o motivo em falha.
**Where**: `apps/backoffice/src/features/order-management/ui/OrderCancelDialog.tsx` e teste (novo)
**Depends on**: T15
**Requirement**: AVS-08, AVS-09, CRG-07
**Done when**:
- [x] e-mail previsto ⇒ caixa marcada + "Confirmar cancelamento"; desligado ⇒ linha "está desligado em Configurações → Notificações", sem caixa
- [x] `onConfirm(motivo, avisarCliente)` devolve sucesso; só fecha no sucesso; motivo preservado em falha
- [x] "Cancelando…" no botão, `Voltar` desabilitado durante
**Tests**: integration (RTL) · **Gate**: quick (backoffice)

**Feito**: `features/order-management/ui/OrderCancelDialog.tsx` — props novas `aviso?: CustomerNotice` (a previsão, feita pela PÁGINA com `customerNoticeFor` sobre o pedido cancelado), `eventosDaCliente`, `cliente`, `onVerEmail`; `onConfirm(motivo, avisarCliente)` passou a devolver `Promise<string | null>` (`null` fecha; frase fica num `role="alert"`). Com `send` não vazio, a caixa é a `NoticeEmails` do portão (`A-03`), marcada a cada abertura; sem, uma linha: "“<nome>” já tinha sido enviado…", "Este pedido não tem e-mail da cliente…" ou "Nenhum e-mail sai: “Pedido cancelado” está desligado em Configurações → Notificações." (o nome vem de `eventsForTrigger`, nunca de literal). Sem caixa, `avisarCliente` é `undefined` (não há escolha a anotar, `AVS-23`). Durante a gravação: `ActionButton` "Cancelando…", "Voltar", a caixa e o motivo desabilitados, `Esc`/fora ignorados; o motivo fica em falha. O botão passou a "Confirmar cancelamento" (grafia da spec). Teste novo `OrderCancelDialog.test.tsx` (11). Gate quick: 11/11. Sensor: 3 mutantes (fecha mesmo em falha, `false` sem caixa, `Esc` fechando no meio), 3 mortos por asserção, SHA-256 conferido.

---

### T17: O avião no histórico

**What**: `OrderHistory` desenha o avião na linha `emailSkipped` e estado por linha.
**Where**: `apps/backoffice/src/features/order-detail/ui/OrderHistory.tsx` e teste
**Depends on**: T16
**Requirement**: AVS-12, AVS-13, CRG-08
**Done when**:
- [x] linha `emailSkipped` ⇒ botão 44×44 com `Send`, nome acessível "Enviar agora o e-mail “<nome>” para a cliente", chama `onResendEmail(evento, canal)`
- [x] linha de falha continua com "Reenviar"; linha enviada sem botão
- [x] só o botão da linha em curso mostra o estado; nota e demais linhas desabilitadas
**Tests**: integration (RTL) · **Gate**: quick (backoffice)

**Feito**: `features/order-detail/ui/OrderHistory.tsx` — linha `emailSkipped` em tom neutro (`data-pulado`), ícone `Send`, e o avião: `ActionButton` `size="icon"` `h-11 w-11 min-w-11`, nome acessível "Enviar agora o e-mail “<nome>” para a cliente" (nome de `NOTIFICATION_EVENT_NAMES`), gerúndio "Enviando…"; a linha de falha segue com "Reenviar" ("Reenviando…") e a enviada sem botão. `onResendEmail(evento, canal, id)` ganhou o id da linha; props novas `reenviando` (id em curso — só aquele botão mostra o estado) e `anotando` ("Salvando nota…"); `onAddNote` devolvendo `false` mantém o texto (`CRG-05`). Teste novo `OrderHistory.test.tsx` (10, linhas montadas por `buildHistory` de verdade). **Ajuste do app (achado do L1)**: `apps/mobile-adm/src/widgets/order-detail/ui/Historico.tsx` — `falhou` exclui `emailSkipped`, então a linha pulada sai no tom neutro (ponto `primary`/`line`, título e detalhe `ink-soft`); `ItensValoresEntregaHistorico.test.tsx` +1 (o ponto e o detalhe pelo token de classe, nenhum `*-estrelinha-alert`). Gate: backoffice o arquivo 10/10; mobile-adm **2281/140**, exit 0 (os guardas `tomMemorial*` verdes). Sensor: 3 mutantes (a pulada como falha, `emCurso` sempre falso, o ramo do app apagado), 3 mortos por asserção, SHA-256 conferido.

---

### T18: A página do pedido

**What**: `AdminOrderPage` liga tudo: esqueleto, releitura `revalidar`, faixa de desatualizado, região viva, portão nos gestos 1–7, avião, resultados honestos.
**Where**: `apps/backoffice/src/pages/admin/AdminOrderPage.tsx`, `AdminOrderPage.test.tsx` (e `.retirada` se tocar), teste novo `AdminOrderPage.aviso.test.tsx`
**Depends on**: T17
**Requirement**: AVS-01..09, AVS-12, AVS-13, AVS-23, CRG-01..09, edge cases da spec
**Done when**:
- [x] pela **página real**, com o client dublado registrando o corpo de `functions.invoke`: gestos 1, 2, 3, 4, 5, 6, 7 — previsto ⇒ diálogo antes de qualquer escrita; desmarcado ⇒ `customer:false`; marcado ⇒ corpo de hoje; "Voltar" ⇒ zero escritas
- [x] "já enviado" (linha `sent` em `order_notifications`) ⇒ sem diálogo e resultado "já tinha sido enviado"
- [x] depois de gravar: nenhum "Carregando...", transportadora digitada preservada; releitura falhando ⇒ faixa com "Tentar de novo"
- [x] primeira carga ⇒ `OrderPageSkeleton`
- [x] avião ⇒ `action=send` com evento e canal da linha; desfechos de `A-13` com a frase
- [x] resultados de `AVS-07` nas quatro formas
**Tests**: integration (RTL, página real) · **Gate**: build (fim da Fase 4)

**Feito**: `pages/admin/AdminOrderPage.tsx` — `useNotificationSettings` + `sentCustomerEvents(emails)` + `useGestoComAviso` (um por página: o `dialogo` e a `regiaoViva` montados uma vez); `loading` ⇒ `OrderPageSkeleton`; toda releitura pós-escrita é `reload('revalidar')` (inclusive o `onUpdate` do Melhor Envio, que passava a função crua); `staleError` ⇒ faixa `role="alert"` "Não consegui atualizar o pedido. O que está na tela pode estar desatualizado." com "Tentar de novo". Gestos 1/2 (`mudarStatus`, chave `status:<s>`), 3 (rastreio: o código só sai do campo no sucesso), 4–6 (card), 7 (cancelar: a previsão vai ao diálogo; `rodar('cancelar')`), nota (`rodar('nota')`, "A nota não foi salva. Tente de novo.") e e-mail da linha (`rodar('email:<id>')`: falha ⇒ "Reenviar" de sempre; pulada ⇒ o avião com os desfechos de `A-13`). `busy = pendente !== null || ocupado` desabilita os controles que gravam e o "Cancelar pedido". **Fora do Where, necessário**: `entities/order/api/notifyOrder.ts` ganhou `resendNotificationOutcome` (`'enviado' | 'desligado' | 'estado' | 'falhou'`, lendo `skipped: 'disabled'` e o 422 do `FunctionsHttpError`) — `resendNotification` (booleano) ficou intacto para o "Reenviar". Teste novo `AdminOrderPage.aviso.test.tsx` (25), pela página REAL com `useAdminOrder`/`useAdminOrders`/o dono/`useStoreSettings` de verdade e o client dublado registrando escritas, RPCs e o corpo de `functions.invoke`: gestos 1–7 (diálogo antes de qualquer escrita, marcado ⇒ corpo de hoje, desmarcado ⇒ `customer: false`, "Voltar" ⇒ zero escritas), as quatro formas de `AVS-07`, já enviado, gerúndio + "Cancelar pedido" desabilitado, esqueleto na primeira carga, a transportadora digitada que sobrevive à releitura sem esqueleto, a faixa e o "Tentar de novo", o avião nos quatro desfechos. **Testes antigos reescritos** (o comportamento mudou pela spec; nenhuma asserção perdida): `AdminOrderPage.test.tsx` — "sem e-mail, não promete" cobra "Rastreio salvo · nenhum aviso sai nesta mudança" + não "avisada"; "a falha de escrita vira toast" cobra "O rastreio não foi salvo. Nada foi alterado — tente de novo." (`CRG-05`) + nenhum sucesso + o código no campo; "avançar avisa" cobra "— a cliente foi avisada por e-mail"; e os dois arquivos de página ganharam o dublê de `useNotificationSettings` (os padrões) — sem ele a página pede um `QueryClient` que esses testes não montam. Gate build (fim da Fase 4): backoffice **4570/249 → 4635/253** (+65/+4), mobile-adm **2280/140 → 2281/140**, store **6271/336** (idêntica: `notificationSingleOwner`, `pedidoGravadoSoPeloDono` e `marcacaoSoPorAcao` verdes), os três exit 0 fora de pipe; tsc backoffice 0 · mobile-adm 0 · core 11 herdados; lint backoffice 23/5 · mobile-adm 0/0; `pnpm --filter @estrelinha/backoffice build` verde. Sensor da fase (23 mutantes nos arquivos reais, `run.py` no scratchpad, SHA-256 conferido em todos): 23 mortos por asserção, 0 por compilação, 0 sobreviventes — os da página: `revalidar` virando carga inicial, previsão ignorada (sempre direto), a caixa ignorada no diálogo, a frase com `emailSent` antes da caixa, `enviados` vazio, a faixa apagada, o avião caindo no "Reenviar", o esqueleto trocado por "Carregando...", o cancelamento sem a previsão, `desligado` perdido em `resendNotificationOutcome`. **Desvio**: `cancelOrder` devolve só o erro (contrato da T11), então com a caixa MARCADA o cancelamento diz "Pedido cancelado — confira no histórico se o e-mail à cliente saiu" em vez de afirmar ou negar o aviso (`AVS-07` sem `emailSent` aqui).

---

### T19: Lote com progresso e contagem

**What**: `bulkMaterial.ts` ganha `onProgress` e conta e-mails/pulados; o avanço de status em lote vira função do model (`runStatusBulk`) com o mesmo contrato.
**Where**: `apps/backoffice/src/features/order-list/model/bulkMaterial.ts` (+ arquivo do avanço se separado) e testes
**Depends on**: T18
**Requirement**: CRG-10, CRG-11, AVS-19 (escrita com a escolha)
**Done when**:
- [x] `onProgress(feitos, total)` chamado a cada pedido, inclusive no que falha; teto `BULK_LIMIT` mantido
- [x] cada escrita recebe `avisarCliente` (por valor); o resumo diz mudaram/recusados/falharam/e-mails enviados/anotados
- [x] falha no meio não para o lote
**Tests**: unit · **Gate**: quick (backoffice)

**Feito**: `features/order-list/model/bulkMaterial.ts` — `runBulk(rows, step, { avisarCliente, onProgress, previstos })` (o laço comum: nada aborta, `onProgress(feitos, total)` depois de CADA pedido, inclusive o que falha ou lança; teto `BULK_LIMIT`), `runMaterialBulk(rows, status, transition, opcoes?)` (a escolha chega como 3º argumento SÓ quando houve escolha), `runStatusBulk(rows, update, opcoes?)` (o avanço em lote, com `NEXT_STATUS` — o antigo `PROXIMO_STATUS` da página subiu para cá; fim de linha fica fora do laço e do progresso, contado em `untouched`), `BulkOutcome` com `emailsSent` (soma de `emailSent` das que passaram), `annotated` (caixa desmarcada × `previstos`) e `untouched` (opcionais: os casos antigos montam o resultado sem eles); `bulkSummary(outcome, { verbo?, aviso? })` — sem o segundo argumento, o texto de antes; com ele, a parcela dos e-mails (pela CAIXA quando desmarcada; "N e-mails enviados" / "nenhum e-mail saiu" / "nenhum aviso sai nestas mudanças"), "N ficaram como estavam" e a falha com "— tente de novo". Barril atualizado. Teste novo `model/__tests__/loteComAviso.test.ts` (18). Nenhum caso antigo de `orderList.test.ts` tocado. Gate quick: 86/86 no diretório.

---

### T20: Barra de lote com progresso

**What**: `OrderBulkBar` mostra "Avançando 7 de 30…" com barra determinada e desabilita as ações.
**Where**: `apps/backoffice/src/features/order-list/ui/OrderBulkBar.tsx` e teste
**Depends on**: T19
**Requirement**: CRG-10
**Done when**:
- [x] `progresso` presente ⇒ `role="progressbar"` com `aria-valuenow`/`aria-valuemax`, texto do verbo e contagem, ações ocultas/desabilitadas; ausente ⇒ barra de hoje
**Tests**: integration (RTL) · **Gate**: quick (backoffice)

**Feito**: `features/order-list/ui/OrderBulkBar.tsx` — prop `progresso?: BulkProgress` (`{ verbo, feitos, total }`, tipo exportado): presente ⇒ `aria-busy` na barra, "Avançando 7 de 30…" com `Loader2`, "Não feche a página" e `role="progressbar"` determinado (`aria-valuemin/max/now`, largura proporcional, `motion-reduce:transition-none`), e as ações FORA de cena (e o aviso do teto também); ausente ⇒ a barra de sempre. Teste novo `ui/OrderBulkBar.test.tsx` (4). Gate quick: 4/4.

---

### T21: A lista de pedidos

**What**: `AdminOrdersPage` — leitura dos envios dos selecionados, portão de lote, cartão do celular com portão e estado, esqueleto, "Atualizando…".
**Where**: `apps/backoffice/src/pages/admin/AdminOrdersPage.tsx`, `AdminOrdersPage.test.tsx`
**Depends on**: T20
**Requirement**: AVS-19, AVS-20, AVS-21, CRG-10..13
**Done when**:
- [x] pela página real: lote com e-mail previsto ⇒ diálogo com contagem e "já recebeu"; sem ⇒ grava direto; escolha chega a cada escrita; progresso visível; resumo
- [x] **uma** consulta a `order_notifications` por lote (dublê conta), só ao acionar
- [x] cartão do celular: portão, estado só no cartão, desfecho em aviso (inclusive falha)
- [x] primeira carga com esqueleto; releitura sem trocar a tabela por "Carregando..."
**Tests**: integration (RTL, página real) · **Gate**: full (backoffice, store)

**Feito**: `pages/admin/AdminOrdersPage.tsx` — `useNotificationSettings` + `useGestoComAviso` (um por página; `dialogo` e `regiaoViva` montados uma vez); `acionarLote(tipo)`: UMA leitura dos envios dos selecionados (até `BULK_LIMIT`) por `entities/order/api/sentEmails.ts` (novo: `fetchSentEmails(ids)` com `in('order_id')`, `channel = email`, `status = sent`, agrupado por `sentCustomerEvents`; lança na falha ⇒ "Não consegui conferir os e-mails já enviados. Nada foi alterado."), o plano por pedido (`planejarLote`: destino por `NEXT_STATUS` ou pela máquina de material de `core`, `materialTransitionRefusal`; previsão `customerNoticeFor` no estado de destino), sem e-mail ⇒ grava direto (`AVS-20`), com e-mail ⇒ `gesto.pedir` com título, "N mudam · M ficam como estão", a contagem agrupada por e-mail, "N pedido(s) já recebeu/receberam “…” antes", a lista do que muda (`extra`) e "Avançar N pedidos"/"Registrar N recebimentos"; ao confirmar o diálogo FECHA (desenho do protótipo: o progresso mora na barra, que o diálogo cobriria) e `correrLote` mostra o progresso, conta, resume (`bulkSummary`) e relê com `refetch('revalidar')`. Cartão do celular (gesto 10): `registrarRecebimento` lê os envios DAQUELE pedido e chama `gesto.acionar` com `enviados` próprio; `ActionButton` com estado só naquele cartão (`lendoCartao` ou a chave `cartao:<id>`), desfecho em aviso inclusive recusa e falha. `ocupado` desabilita barra, seleção, cartões, exportar e folha. "Atualizando…" ao lado do título com `revalidando` (`CRG-12`); primeira carga ⇒ `TableSkeleton` + 3 `CardSkeleton` em `aria-busy` (`CRG-13`). **Fora do Where, necessário**: `useGestoComAviso` ganhou `Gesto.enviados?` (a leitura feita no gesto vence a do hook) e devolve `pedir`; `PageHeader` ganhou `titleAside?` (aditivo, sem mudar quem não usa). Teste novo `AdminOrdersPage.aviso.test.tsx` (16), pela página REAL (`useAdminOrderList`, `useAdminOrders`, o dono, `notifyOrder`, `fetchSentEmails`, `useStoreSettings` de verdade; só o client dublado, registrando leituras de `order_notifications`, RPCs, escritas e corpos): o diálogo do lote com a contagem e nada gravado antes; UMA leitura, com os filtros por valor, e nenhuma antes do clique; "já recebeu"; desmarcada ⇒ `customer: false` em cada corpo e a frase pela caixa com `sent: true`; marcada ⇒ corpo de sempre e "2 e-mails enviados"; "Voltar" ⇒ zero escritas; leitura falha ⇒ zero escritas; avanço sem previsão ⇒ direto; avanço com "Pedido postado", fim de linha e escolha por valor; evento desligado ⇒ sem diálogo; o progresso 0 → 1 → fim pedido a pedido; ações e seleção desabilitadas; a tabela fica e "Atualizando…" aparece na releitura; o cartão (leitura só do pedido, diálogo, `customer: false`, estado só nele, já enviado, falha da RPC em aviso); esqueleto. **Teste antigo reescrito** (`AdminOrdersPage.test.tsx`, comportamento mudado pela spec, nenhuma asserção perdida): `material_received` nasce ligado, então os dois casos do lote de material passam pelo diálogo ("Registrar 3 recebimentos") e o resumo cobrado ganhou a parcela "· nenhum e-mail saiu"; o arquivo ganhou o dublê de `useNotificationSettings` (os padrões) e o de `fetchSentEmails` (sem envios). Gate: ver T22.

---

### T23: `cancelOrder` devolve se o e-mail saiu

**What**: `useAdminOrders.cancelOrder` passa a devolver `{ error, emailSent }`, e a página diz o desfecho real do cancelamento com a caixa marcada (`AVS-07`), no lugar de "confira no histórico".
**Where**: `apps/backoffice/src/entities/order/api/useAdminOrders.ts` e testes; `AdminOrderPage.tsx` (frase); `AdminOrderPage.aviso.test.tsx`
**Depends on**: T21
**Requirement**: AVS-07, AVS-09
**Done when**:
- [x] `emailSent` vem do retorno de `notifyOrder` (o mesmo booleano das outras escritas); a escrita de `cancelOrder` não muda (`pedidoGravadoSoPeloDono` verde)
- [x] caixa marcada + `emailSent:true` ⇒ "— a cliente foi avisada por e-mail"; `false` ⇒ "o e-mail não saiu — o pedido foi cancelado"; caixa desmarcada ⇒ frase pela caixa
**Tests**: unit + integration (página real) · **Gate**: full (backoffice, store)

**Feito**: `entities/order/api/useAdminOrders.ts` — `cancelOrder` devolve `{ error: null, emailSent }` (o booleano do `notifyOrder`, o mesmo das outras escritas) ou `{ error, emailSent: false }` sem gatilho; a escrita não mudou (`pedidoGravadoSoPeloDono` verde). `pages/admin/AdminOrderPage.tsx` — `cancelar` diz o desfecho real: desmarcada ⇒ "Pedido cancelado · sem e-mail à cliente (anotado no histórico)" (pela caixa, mesmo com `sent: true`); marcada + `emailSent` ⇒ "Pedido cancelado — a cliente foi avisada por e-mail"; marcada sem envio ⇒ "O e-mail não saiu — o pedido foi cancelado"; sem caixa ⇒ `fraseDoResultado` com o `emailSent` real. Testes: `useAdminOrders.aviso.test.ts` +3 (o retorno com `sent` true/false, a escrita falhando sem gatilho); `AdminOrderPage.aviso.test.tsx` +3 (as três frases pela página real, nenhuma "confira no histórico"). **Teste antigo ajustado**: o dublê de `cancelOrder` em `AdminOrderPage.test.tsx` passou a resolver `{ error: null, emailSent: false }` (a forma nova do retorno); nenhuma asserção mudou.

---

### T24: Guarda "o painel não decide se avisa por conta própria" (`AVS-17`)

**What**: guarda de fonte que recusa, em `apps/backoffice/src/**` de produção, decidir "este gesto avisa?" fora da chamada a `customerNoticeFor` — comparar `status === 'shipped'` para decidir aviso, ler `.enabled` de configurações de notificação, listar eventos por nome — e exige a chamada (metade positiva) em `features/order-notice/model/useGestoComAviso.ts`, `pages/admin/AdminOrderPage.tsx` e `pages/admin/AdminOrdersPage.tsx`.
**Where**: `apps/backoffice/src/shared/lib/__tests__/avisoComDonoUnico.test.ts` (novo)
**Depends on**: T23
**Requirement**: AVS-17
**Done when**:
- [x] âncora dupla (arquivos lidos e as três chamadas achadas); remoção de comentário com CRLF/LF; sensores: cada forma proibida injetada num texto sintético reprova, e os inversos (o `nextStep` existente e o `OrderNotificationSettings` da tela de Configurações) não são acusados — o escopo exclui `features/notification-settings/**` por nome, declarado
- [x] mutante real: apagar a chamada em uma das três reprova
**Tests**: guarda de fonte · **Gate**: full (backoffice, store)

**Feito**: `apps/backoffice/src/shared/lib/__tests__/avisoComDonoUnico.test.ts` (15). Escopo: produção do painel, sem testes e sem `features/notification-settings/**` (por nome, declarado). Quatro réguas com nome, cada uma chamada pela asserção e pelo sensor: status de destino comparado com literal NA MESMA LINHA que fala de aviso/e-mail (limite por linha declarado no cabeçalho); o interruptor lido à mão (`resolveEventSettings` ou o caminho cru até `enabled`); a pré-condição do motor chamada direto; nome de evento como literal (lista importada de `core`). Metade positiva: os três pontos chamam `customerNoticeFor` em código, e `AdminOrderPage` passa `aviso=` ao `OrderCancelDialog`, que não calcula. Âncora: >150 arquivos, o escopo separado, os três pontos, a lista de eventos não vazia. Sensores: cada forma num texto sintético reprova; inversos — a coluna "sem código" da lista, `nextStep`, os interruptores do GA e do Shopping, `NOTIFICATION_EVENT_NAMES[e]`; a chamada só em comentário não conta (CRLF e LF); o removedor não engole a linha seguinte nem o código depois de um glob. A primeira escrita da régua do status não casava `=== novo.status` (literal à esquerda) — quem acusou foi o sensor; corrigida. As formas proibidas nos sensores são montadas por concatenação, não escritas na prosa. Mutante real: apagar a chamada em `AdminOrdersPage` e em `AdminOrderPage` ⇒ a suíte reprova (n19, n20 abaixo).

---

### T22: Fecho — medição e documentação

**What**: medir os cinco workspaces, tipos, lint e build; atualizar `CLAUDE.md` (raiz: baseline, linha da 88, guarda novo na tabela), `apps/backoffice/CLAUDE.md`, `supabase/CLAUDE.md` (status `skipped`, `customer:false`, ordem de publicação), `packages/core/CLAUDE.md` (`notice.ts`, `avisarCliente`); esta lista com `[x]`.
**Where**: os arquivos citados
**Depends on**: T24
**Requirement**: Success Criteria (baselines)
**Done when**:
- [x] números medidos (não somados), com o delta por workspace contra a T01
- [x] tipos 0 · 0 · core 11 · lint 23/5 (ou a queda explicada) · build verde · `packages/core/src/payment/**` sem diff
**Tests**: none · **Gate**: build

**Feito**: medidos em 2026-10-30, um workspace por vez, exit fora de pipe: **backoffice 4694/257** · **store 6271/336** · **core 4990/192** · **mobile-adm 2281/140** · **functions 1247/34**, os cinco exit 0. Delta da feature contra a T01: backoffice +178/+13 · core +66/+2 · store +40/+1 · functions +17/+1 · mobile-adm +2/0. Tipos: backoffice 0 · mobile-adm 0 · store 0 · `apps/store/tsconfig.server.json` 0 · catalog-import 0 · core 11 (herdados). Lint: backoffice 23/5 · store 2/2 · mobile-adm 0/0 (sem mudança). `pnpm --filter @estrelinha/backoffice build` verde. `git diff --name-only -- packages/core/src/payment` vazio (e nada não rastreado lá). Documentação: `CLAUDE.md` raiz (linha *Testes*, o parágrafo da `88`, o estado da `88` na lista de features e os guardas `avisoPuladoSchema` e `avisoComDonoUnico`), `apps/backoffice/CLAUDE.md` (seção nova em *Pedidos*), `supabase/CLAUDE.md` (`customer: false`, `skipped`, a RPC, a ordem de publicação), `packages/core/CLAUDE.md` (`notice.ts` na tabela, `avisar` × `avisarCliente`). **Sensor do Lote 4** (`scratchpad/l4sensor/run.py`, cópia `.bak`, SHA-256 conferido em todos): 22 mutantes — sem progresso no pedido que falha, a escolha não repassada, `emailsSent` não somado, anotados sem `previstos`, `untouched` não contado, a frase da caixa depois do envio, `aria-valuenow` fixo, a barra sem o ramo do progresso, o lote sempre direto, a caixa ignorada no lote, a leitura sem o filtro `sent`, o cartão sem os próprios `enviados`, a releitura do lote como carga inicial, o esqueleto trocado por "Carregando...", o estado do cartão nunca aceso, a seleção não desabilitada, `cancelOrder` com `emailSent` fixo, a frase do cancelamento ignorando o envio, a previsão apagada da lista e do cancelamento (guarda), `Gesto.enviados` ignorado, a recusa da RPC do cartão ignorada — **22 mortos por asserção, 0 sobreviventes** (o n14 morreu por compilação na primeira escrita e foi refeito válido, morto por asserção).

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram | Status |
| --- | --- | --- | --- |
| T01 | None | início da Fase 1 | ✅ |
| T02 | T01 | T01 → T02 | ✅ |
| T03 | T02 | T02 → T03 | ✅ |
| T04 | T03 | T03 → T04 | ✅ |
| T05 | T04 | T04 → T05 | ✅ |
| T06 | T05 | Fase 1 → T06 | ✅ |
| T07 | T06 | T06 → T07 | ✅ |
| T08 | T07 | T07 → T08 | ✅ |
| T09 | T08 | Fase 2 → T09 | ✅ |
| T10 | T09 | T09 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | Fase 3 → T14 | ✅ |
| T15 | T14 | T14 → T15 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | Fase 4 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T01 | medição | none | none | ✅ |
| T02 | migration | guarda + probe | guarda + probe | ✅ |
| T03 | core | unit | unit | ✅ |
| T04 | core + leitura no app | unit | unit (core + app) | ✅ |
| T05 | core | unit | unit | ✅ |
| T06 | function | unit | unit | ✅ |
| T07 | function | unit | unit | ✅ |
| T08 | integração servida | probe | probe | ✅ |
| T09 | painel componente/hook | integration | integration | ✅ |
| T10 | painel hooks | unit | unit | ✅ |
| T11 | painel hooks | unit | unit | ✅ |
| T12 | painel feature UI | integration | integration | ✅ |
| T13 | painel componente | integration | integration | ✅ |
| T14 | painel componente | integration | integration | ✅ |
| T15 | painel componente | integration | integration | ✅ |
| T16 | painel componente | integration | integration | ✅ |
| T17 | painel componente | integration | integration | ✅ |
| T18 | página | integration (página real) | integration (página real) | ✅ |
| T19 | painel model | unit | unit | ✅ |
| T20 | painel componente | integration | integration | ✅ |
| T21 | página | integration (página real) | integration (página real) | ✅ |
| T22 | documentação | none | none | ✅ |

## Granularity Check

Todas as tasks tocam um módulo coeso (uma função de `core`, um arquivo do motor, um componente, uma
página). T02 junta migration + guarda + probe porque o guarda e o probe são as provas da mesma
migration (merge backward, sem código não verificado). T18 e T21 são as integrações de página, a
única camada em que a fiação se prova (lição "teste não monta a árvore que prova").

## Status das tasks

- [x] T01 · [x] T02 · [x] T03 · [x] T04 · [x] T05 · [x] T06 · [x] T07 · [x] T08
- [x] T09 · [x] T10 · [x] T11 · [x] T12 · [x] T13
- [x] T14 · [x] T15 · [x] T16 · [x] T17 · [x] T18
- [x] T19 · [x] T20 · [x] T21 · [x] T23 · [x] T24 · [x] T22

---

## Conserto da rodada 1 do Verifier (2026-10-30)

O Verifier r1 (`validation.md`) reprovou por um defeito de produto (AVS-07 no gesto 6) e um mutante
sobrevivente (P24, CRG-09). A spec foi emendada antes do conserto: AVS-07 (`emailSent` = e-mail À
CLIENTE; o motor responde `customer_sent`), AVS-12 (a hora da escolha) e CRG-07 (o lote é exceção
declarada). Cada conserto com teste vermelho antes do código, salvo onde dito.

- **C1 — `customer_sent`**: `supabase/functions/send-notification/handlers.ts` (`runTrigger`) responde
  `customer_sent: results.some(r => r.ok && EVENT_AUDIENCE[r.event] === 'customer')`, com `sent` igual;
  `packages/core/src/order-actions/notify.ts` devolve `customer_sent === true`, recuando para
  `sent === true` só quando o campo FALTA no corpo (motor antigo na janela de deploy). Testes: +3 em
  `handlers.test.ts` (cliente avisada; só a dona com `customer: false`; o campo sempre presente), +4 em
  `notify.test.ts` (true; só a dona ⇒ false; truthy que não é `true`; motor antigo nos dois sentidos).
  Vermelho antes: sim (3 e 2). **Nenhum teste antigo precisou mudar**: os que respondem só `sent` caem no
  recuo e continuam provando o que provavam.
- **C2 — o envelope (gesto 6)**: `useAdminOrders.setMaterialTracking` devolve `emailSent` do dono (e
  `emailSent: false` nos três ramos de falha). Pela página real (`AdminOrderPage.aviso.test.tsx`): caixa
  marcada + `customer_sent: true` ⇒ "a cliente foi avisada por e-mail" (vermelho antes: sim); `sent: true,
  customer_sent: false` ⇒ não diz que a cliente foi avisada, diz "o e-mail não saiu". **Teste antigo
  reescrito**: `useAdminOrders.delega.test.ts` cravava `{ ok, reason }` por igualdade; a forma ganhou
  `emailSent`, e o caso `ok` virou `it.each([true, false])` — o antigo só tinha `false`, verdadeiro nos dois
  mundos —, e os quatro de falha passaram a exigir `emailSent: false`. Nenhuma asserção perdida.
- **C3 — o lote**: dois casos em `AdminOrdersPage.aviso.test.tsx` — o motor respondendo só pela dona ⇒
  "2 marcadas · nenhum e-mail saiu"; pela cliente ⇒ "2 e-mails enviados". `bulkMaterial.ts` não mudou (já
  somava `emailSent`); o conserto é o de C1. Vermelho antes: **não** (C1 já estava no disco); a prova é o
  mutante M2b abaixo.
- **C4 — CRG-09**: dois casos pela página real lendo a região `aria-live="polite"` depois do gesto (com o
  diálogo e sem). Só teste; a prova é P24 reinjetado.
- **C5 — AVS-12**: o `do update` de `skip_order_notification` renova `created_at = now()` e mantém
  `error = null` (migration reescrita — não aplicada fora do local — e reaplicada no banco local por
  `psql -f`, idempotente; `prosrc` conferido). Guarda `avisoPuladoSchema.test.ts`: a régua `renovaHoraDaEscolha`
  e três sensores (+4; vermelho antes: sim). Probe `01-aviso-pulado.sql`: a linha `failed` nasce dois dias
  antes e `failed→skipped` exige `created_at = now()`; exit 0, **23** `ok —` (eram 22).
- **C6 — AVS-07, a redação**: "o e-mail não saiu — o pedido foi alterado" (`useGestoComAviso.ts`), com os
  dois testes que cravavam a frase reescritos primeiro (vermelhos antes: sim).
- **C7 — CRG-07 no lote**: comentário no `executar` de `AdminOrdersPage.tsx` citando "CRG-07, exceção do
  lote"; nenhum comportamento mudou.

**Mutantes reinjetados** (arquivo copiado, alterado, testes, restaurado, SHA-256 conferido): M1 o filtro
de público tirado de `customer_sent` (handlers); M2 `notify.ts` voltando a ler só `sent` (core) e M2b o
mesmo, medido pela página e pelo lote; M3 sem o recuo para `sent` (core); M4 `setMaterialTracking`
descartando `emailSent`; M5 a frase com ponto e vírgula; P24 `anunciar(frase)` apagado de `concluir`; e a
migration sem `created_at = now()` (probe exit 3 com `PROBE FALHOU` na linha nova, guarda 3 reprovações).
**Todos mortos por asserção.**

**Gates** (um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe): core 4990 → **4994**/192,
functions 1247 → **1250**/34, backoffice 4694 → **4701**/257, store 6271 → **6275**/336, mobile-adm
**2281**/140 (idêntico); exit 0 os cinco. `tsc` backoffice 0 · mobile-adm 0 · core 11 (herdados); eslint
backoffice 23/5; `pnpm --filter @estrelinha/backoffice build` verde. Docs: `CLAUDE.md` (raiz),
`apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`.

**Probe `02-motor.sh` não rodado** (sobe `supabase functions serve`); o `customer_sent` está provado por
unidade (M1 morto).

---

## Conserto da rodada 2 do Verifier (2026-10-30)

A r2 reprovou só por cobertura (`CRG-09`): o resultado do gesto chegava à região viva, mas quatro dos
pontos que anunciam não tinham asserção — N13 (cancelamento com sucesso, `AdminOrderPage.tsx`), N22 (o
avião), N23 (o "Reenviar") e N11 (a falha do gesto sem diálogo, `useGestoComAviso.ts`). **Nenhum código de
produto mudou**: os seis casos novos passaram de primeira contra o código, ou seja, o anúncio acontece.

**Testes** (`AdminOrderPage.aviso.test.tsx`, bloco "a região viva anuncia também…", pela página real, com o
mesmo `regiaoVivaDiz` dos casos da r1): cancelamento marcado com sucesso; avião enviado e avião que falha;
"Reenviar" que sai e que não sai (linha `failed`); "voltar para Pago" (sem diálogo) com a escrita falhando —
cada um lê a frase exata no `[aria-live="polite"]` depois de o toast ser chamado com ela.

**Mutantes reinjetados** (harness da r2, cópia em `bak/`, SHA-256 conferido na restauração; logs em
`scratchpad/conserto-r2/mlogs/`): N11, N13, N22 e N23 — **4/4 mortos por asserção**, cada um derrubando só
o(s) caso(s) que o nomeia(m) (N22 e N23 derrubam os dois desfechos, sucesso e falha).

**Gates** (um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe): backoffice 4701 →
**4707**/257, store **6275**/336 (idêntico); exit 0 os dois. `tsc` backoffice 0; eslint backoffice 23/5.

---

## Fecho das lacunas da rodada 3 (2026-10-30)

A r3 reprovou **só por cobertura** (34 mutantes, 4 sobreviventes: V04, V14, V20, V28; nenhum defeito de
produto) e era a última rodada. As lacunas foram fechadas **sem rodada 4** (precedente da `72`, da `73` e da
`83`). **Nenhum código de produto mudou**: os oito casos novos passaram de primeira contra o código.

**Testes** (+8, todos pela árvore real; os dois de página no molde dos casos das rodadas 1 e 2):

1. **CRG-09, a nota interna (V20)** — `AdminOrderPage.aviso.test.tsx`, bloco "lacunas da rodada 3…": digitar
   a nota, "Anotar", a escrita em `order_notes` por valor, e "Nota salva" lido no `[aria-live="polite"]` (sem
   toast de sucesso: é o único sinal).
2. **AVS-21, o cartão com a leitura dos envios falhando (V14)** — `AdminOrdersPage.aviso.test.tsx`, `it.each`
   com o e-mail desligado (sem diálogo no caminho, a escrita indevida sairia direto) e ligado: a frase "Não
   consegui conferir os e-mails já enviados. Nada foi alterado." no toast e na região viva, nenhum diálogo,
   nenhuma RPC, nenhum gatilho, nenhum toast de sucesso — conferidos depois de deixar o gesto correr.
3. **Lote acima de 50 (V28)** — mesmo arquivo: 60 selecionados ⇒ "Registrar o material de 50 pedidos", "50
   mudam.", a lista "O que muda" com 50 itens (o 50º presente, o 51º ausente), a leitura dos envios com os 50
   primeiros ids, "Registrar 50 recebimentos", e só esses 50 gravam (RPC e gatilho, na ordem).
4. **AVS-08, cancelamento com cliente sem e-mail (V04)** — pela página (`customer_email: null` com "Pedido
   cancelado" LIGADO) e pelo diálogo (`it.each` com `null`, `''` e `'   '`): "Este pedido não tem e-mail da
   cliente: nenhum aviso sai.", sem caixa, e nunca "desligado em Configurações".

**Mutantes reinjetados** (cópia do harness da r3 em `scratchpad/fecho-r3/`, arquivo copiado para `bak/`,
SHA-256 conferido na restauração, um por vez; logs em `scratchpad/fecho-r3/mlogs/`; a classificação refeita
pela linha `Tests` de cada log, porque o classificador do arnês lê errado "Failed Tests", como a r3 já
anotara): **V20** 1 caso, **V14** 2 casos, **V28** 1 caso, **V04** 4 casos — **4/4 mortos por asserção**,
cada um derrubando só os casos novos que o nomeiam; 0 por compilação, 0 por `timed out`.

**Gates** (um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe): backoffice 4707 →
**4715**/257, store **6275**/336 (idêntico); exit 0 os dois. `tsc` backoffice 0; eslint backoffice 23/5.
Docs: `CLAUDE.md` (raiz), as linhas *Testes* e a da `88`. O `validation.md` não foi tocado.

### Decisão aberta para o QA (observação da r3) — decidida no conserto do QA como `A-14`

**A página do pedido com a leitura de `order_notifications` falhando segue com a lista vazia.**
`useAdminOrder` degrada a leitura dos envios para `[]` (`useAdminOrder.ts`), e a previsão pode então
perguntar por um e-mail que já saiu; com a caixa desmarcada, a frase diz "anotado no histórico", mas o motor
não grava `skipped` sobre `sent`. Está conforme a letra (AVS-07 e A-09 mandam a frase da caixa desmarcada pela
caixa), mas o lote e o cartão do celular tratam a mesma falha como "Nada foi alterado" e a página do pedido
não. Decidir no QA: manter, ou fazer a página recusar o gesto com aviso como o lote e o cartão.

---

## Conserto do QA (2026-10-30)

O QA (`docs/qa/reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md`) achou 7 bugs da `88` e
paper cuts. Duas decisões foram tomadas **pela recomendação do QA, a confirmar pelo usuário**, e estão
na spec: **A-14** (a página do pedido recusa o gesto que dependeria da previsão quando a leitura de
`order_notifications` falha — fecha a "Decisão aberta para o QA" abaixo) e **A-15** (o motor não muda;
a linha de falha diz "A tentativa de envio falhou" com "Reenviar", o erro cru num detalhe recolhido —
AVS-13 emendado). CRG-09 e CRG-11 ganharam a nota do conserto (um anúncio por desfecho; o resumo do lote
fica até ser dispensado). Cada conserto com teste vermelho antes (salvo onde dito) e mutante reinjetado.

- [x] **Q1 — `BUG-20261030-leitura-de-envios-falha-em-silencio` (A-14)**: `useAdminOrder.emailsError`;
  `useGestoComAviso({ enviadosIndisponiveis })` recusa com `SENT_EMAILS_READ_FAILED` (o mesmo dono do
  lote e do cartão); o cancelamento recusa dentro do diálogo; o Histórico diz "Não consegui ler os
  e-mails deste pedido." com "Tentar de novo".
- [x] **Q2 — `BUG-20261030-lista-diz-nada-esperando-enquanto-carrega`**: `useAdminOrderList.contando`; o
  subtítulo neutro, esqueleto nos cartões da fila (`aria-busy`), sem contagem nas abas.
- [x] **Q3 — `BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido`**: `shared/lib/foco.ts` (dono único de
  "para onde volta o foco"), usado pelo portão, pelo gesto sem diálogo, pelo Histórico (avião e
  "Reenviar"), pelo cancelamento, pelo "Tentar de novo" da releitura e pelo cartão; o "Outro status"
  passa o seletor como origem. Os testes simulam o que o Chromium faz e o jsdom não
  (`src/test/focoDoNavegador.ts`). **O caso "Outro status" → Voltar não reproduz no jsdom** (verde antes
  e depois); a prova do conserto é o mutante Q3f.
- [x] **Q4 — `BUG-20261030-aviao-que-falha-apaga-a-escolha` (A-15)**: `OrderHistory` mostra "A tentativa de
  envio falhou" e o erro cru em `<details>` (toda linha de e-mail que falhou). `AdminOrderPage.test.tsx`
  (o caso antigo "SMTP timeout") continua passando: o texto está no detalhe recolhido.
- [x] **Q5 — `BUG-20261030-resumo-do-lote-some-em-quatro-segundos`**: o resumo vira região `status` na
  lista, com "Dispensar o resumo do lote" e foco; `bulkSummary` diz "(já no fim do caminho)". **Testes
  antigos reescritos** (liam o toast): cinco em `AdminOrdersPage.aviso.test.tsx`, um em
  `AdminOrdersPage.test.tsx`, um em `loteComAviso.test.ts` — o texto continua por igualdade, agora na
  região; nenhum afrouxado.
- [x] **Q6 — `BUG-20261030-recebi-o-material-sem-o-pedido-no-nome`**: `aria-label` "<ação> — pedido #<n>,
  <cliente>". Um seletor antigo (`name: 'Recebi o material'` exato) virou prefixo.
- [x] **Q7 — `BUG-20261030-pedido-rola-de-lado-com-fonte-200`**: filtros do Histórico com `flex-wrap`,
  `min-w-0`, `max-w-full`, provado por token exato; a medida de `scrollWidth` fica para o reteste.
- [x] **Q8 — paper cuts**: o título do lote diz o número dos que MUDAM (o mesmo do botão; dois testes
  antigos de título reescritos para o número novo); e **um anúncio por desfecho**: o resultado com aviso
  flutuante é anunciado pela região viva do sonner e a do gesto não repete (`informar`), a falha dentro
  do diálogo pelo `role="alert"` dele, o resumo do lote pela região `status`. Os casos de CRG-09 das
  rodadas 1 a 3 que liam a frase na região do gesto (8 na página do pedido e o par do cartão na lista)
  foram **invertidos** (o aviso é chamado com a frase
  E a região não a repete) — a regra mudou por decisão, e o mutante que apaga o aviso ainda morre.
- Paper cuts **não feitos** (fora da régua "uma linha e sem risco", ou dependem de decisão): o
  "Para …:" com dois-pontos dentro da caixa do diálogo; o avião decorativo à esquerda da linha pulada; a
  dica "sua joia foi postada" × "Pedido postado" (copy); "Ver o e-mail" abrir aba nova sem avisar; o lote
  de material tentando de novo um pedido já "material recebido"; e o "Close" em inglês do `DialogContent`
  (`BUG-20261026`, decisão de outra feature, intocado).

**Mutantes reinjetados** (cópia em `scratchpad/conserto-qa/bak/`, um por vez, SHA-256 conferido na
restauração, logs em `scratchpad/conserto-qa/mlogs/`; o arnês lança quando o alvo não é encontrado):
Q1a recusa apagada · Q1b página sem `emailsError` · Q1c hook sem `emailsError` · Q1d cancelamento sem
recusa · Q1e Histórico volta a "Nada por aqui" · Q2 subtítulo afirmando · Q2b cartões com 0 · Q3a gesto
sem diálogo sem devolver o foco · Q3b portão devolvendo à origem crua · Q3c Histórico sem foco depois
do avião · Q3d cancelamento sem `onCloseAutoFocus` · Q3e "Tentar de novo" sem foco · Q3f seletor fora
da origem · Q3g cartão sem origem · Q3h cartão sem foco na falha da leitura · Q4 erro cru de volta · Q5a
resumo de volta ao toast · Q5b sem o motivo · Q5c "Dispensar" que não dispensa · Q6 cartão sem o pedido
no nome · Q7 sem `flex-wrap` · Q8a título com todos · Q8b resultado anunciado duas vezes. **23/23 mortos
por asserção**, 0 por compilação, 0 por timeout. Q3b **sobreviveu na primeira passada** (nenhum caso
tinha a origem do diálogo sumindo); ganhou o caso "pelo diálogo, com o cartão saindo da lista" e morreu.

**Gates** (um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe): backoffice 4715 →
**4737**/257 (+22), store **6275**/336 (idêntico); exit 0 os dois. Core e mobile-adm não tocados, não
remedidos. `tsc` backoffice 0; eslint backoffice 23/5; `pnpm --filter @estrelinha/backoffice build`
verde. Sem migration. **Falta o reteste em navegador** (390 e 1440, 130/200 %, teclado e leitor), em
especial: o `scrollWidth` da página do pedido a 390/200 %, o foco real do Chromium em cada caso do bug, o
"Outro status" → Esc, e o resumo do lote recebendo o foco.

## Conserto do reteste (2026-10-30)

O reteste em navegador (`docs/qa/reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md`)
verificou 6 dos 7 bugs, **reabriu** `BUG-20261030-pedido-rola-de-lado-com-fonte-200` (a 390/200 %:
`scrollWidth` 431 no pedido, 478 na lista e na Fila) e achou
`BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar`. A decisão da rolagem seguiu a recomendação (a)
do relatório. Cada conserto com teste vermelho antes; mutante reinjetado (cópia em
`scratchpad/r88f/bak/`, SHA-256 conferido, o arnês lança sem alvo).

- [x] **R1 — foco depois do "Tentar de novo" do Histórico e do "Dispensar" do resumo**: `OrderHistory`
  guarda a ref do botão e, depois da releitura, `devolverFoco(botão, h2 do bloco)` — fica nele se a
  leitura falhou de novo, vai a "Histórico" se o aviso sumiu; "Dispensar" tira a região com `flushSync` e
  foca o título da lista (`tituloDaPagina`). Testes em `AdminOrderPage.aviso.test.tsx` (+2: o caso que lê e
  o par que falha de novo) e `AdminOrdersPage.aviso.test.tsx` (+1), com `simularFocoDoNavegador`;
  vermelhos antes com `activeElement` = `<body>`.
- [x] **R2 — a rolagem a 390/200 %**, medida no Chromium antes de mexer (folha por folha, descontando o
  que rola dentro de contêiner): a coluna da página era a trilha implícita `auto` (373 px numa tela de
  294); os botões do cabeçalho `nowrap` (363–370 px); o preço `w-[110px]` com o valor de 134; os números
  da cliente em `grid-cols-2` fixo; o botão do cartão da lista `nowrap`. Conserto: `shared/ui/acoesDoCabecalho.ts`
  (dono único das ações do `PageHeader` e do `RecordPageHeader`: `min-w-0 max-w-full flex-wrap` e, só
  `max-md:`, botões com `h-auto min-h-11 whitespace-normal`); a grade do pedido com `grid-cols-1`; a linha
  do item com `flex-wrap`, nome com piso `min(6rem, o que sobra ao lado da foto)`, quantidade + preço num
  grupo `ml-auto` e o preço `min-w-[110px] whitespace-nowrap`; os números da cliente em `auto-fit` com
  piso de 8rem; o botão do cartão com `h-auto min-w-0 whitespace-normal`. Testes por token exato em
  `PageHeader.test.tsx` (+1), `RecordPageHeader.test.tsx` (+1), `AdminOrderPage.test.tsx` (+3) e
  `AdminOrdersPage.aviso.test.tsx` (+1). O teste da linha do item reprovou a primeira vez por **seletor**
  (o nome aparece duas vezes) e não por asserção; corrigido o seletor, a prova de que ele mede é o mutante
  L5/L6.
- Fora: `AdminClientPage.tsx:278` tem o mesmo preço `w-[110px]` (não medido; tela fora da `88`); o
  "Close" em inglês (`BUG-20261026`).

**Mutantes** (F1 sem foco depois de reler · F2 "Dispensar" sem foco · L1/L2 ações dos dois cabeçalhos
de volta ao antigo · L3 sem o `whitespace-normal` · L4 grade sem `grid-cols-1` · L5 linha sem `flex-wrap` ·
L6 preço de volta a `w-[110px]` · L7 números em `grid-cols-2` · L8 botão do cartão `nowrap`): **10/10
mortos por asserção**, 0 por compilação.

**Segundo reteste em navegador** (Chromium 1228, só local, `*.supabase.co` bloqueado, e-mail desviado
como no `probes/02-motor.sh`, pedidos `QA88F-…`): `scrollWidth` **390** em 390 a 100/130/200 % no pedido
(QA88F-01/02/03), na lista e na Fila; 1440 sem mudança medida (botões 36 px, linha do item 74 px, números
em duas colunas de 144); o preço inteiro (134 = 134 a 200 %); foco `H2 "Histórico"` e `H1 "Pedidos"`.
Regressão: caixa marcada/desmarcada, "já enviado", linha "não enviado" + avião, lote com resumo e o cartão
a 200 % — limpos em 390 e 1440.

**Gates** (um workspace por vez, `--testTimeout=20000` sem `--`, exit fora de pipe): backoffice 4737 →
**4746**/257 (+9), store **6275**/336 (idêntico); exit 0 os dois. `tsc` backoffice 0; eslint backoffice
23/5; `pnpm --filter @estrelinha/backoffice build` verde. Sem migration.

## Orquestração (pedido do usuário, 2026-10-29)

1. Lotes L1 → L4 por subagente, migrations **só no banco local**.
2. Gates da skill de spec: gate de cada task, T22 (medição de fecho), **Verifier independente** (até 3 rodadas de conserto + reverificação).
3. **Skills de QA focadas na feature**: `qa-report` (sessões dos 10 gestos, diálogo, avião, carregamento) e `qa-execution` em navegador, 390 e 1440, ambiente local, `*.supabase.co` bloqueado e destinatário desviado.
4. Bug achado vira task: conserto com teste vermelho antes, reteste em navegador.

### Achados do L1 que os lotes seguintes carregam

- **`emailSent` com `customer:false`**: o motor responde `sent: true` se o aviso à DONA saiu. O resultado mostrado (`AVS-07`) decide a frase pela **caixa** quando ela foi desmarcada, nunca só por `emailSent` (T12/T18/T21).
- **Linha `skipped` em tom de alerta no app do ateliê** (`apps/mobile-adm/src/widgets/order-detail/ui/Historico.tsx`): tom neutro para `emailSkipped` (entra no L3, junto da T17).
- **`general.email` local é endereço real**: toda prova que sirva o motor localmente desvia o destinatário (molde do `probes/02-motor.sh`).
