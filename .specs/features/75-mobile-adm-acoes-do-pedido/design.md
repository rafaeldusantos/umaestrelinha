# 75 — mobile-adm: ações no pedido — Design

**Spec**: `.specs/features/75-mobile-adm-acoes-do-pedido/spec.md` (portão do Specify fechado em 2026-10-24)
**Status**: **Approved** — portão do Design fechado em 2026-10-24 pelo validador independente
(`approved: true`, Q1–Q11 e SPEC-N respondidas, 8 issues não bloqueantes **corrigidas neste
arquivo**: §2.3, §3.2, §3.3, §3.5, §3.6, §4, §8.1, §8.4, §12, §13 e a rastreabilidade em §15).
Assunções que ainda pedem o usuário estão marcadas **n — confirmar** em §14.2 e não bloqueiam as Tasks.
**Escopo**: Large (41 requisitos, 4 camadas: `packages/core` — um módulo puro e um módulo de escrita
novo —, `apps/backoffice` (delegação, sem mudança de tela), `apps/mobile-adm`, guardas em três suítes).
**Sem migration**: as três portas de escrita (`update orders`, `insert order_status_history`,
`rpc set_material_status`) e a de aviso (`send-notification?action=trigger`) já existem.
Decisões ativas respeitadas: `AD-008` (aviso contido), `AD-012` (prova contra o banco), `AD-032`
(o gatilho nomeia o fato), `AD-033`, `AD-049` (retirada), `AD-056`, `AD-057`, `AD-058`.
Decisão nova: **`AD-059`** (§12; **aceita** no portão do Design e registrada em `.specs/STATE.md`).
Backlog novo: **`BL-051`** (a RPC atômica `advance_order_status`, abordagem B).

Código lido antes de escrever (além do que a spec lista):
`apps/backoffice/src/entities/order/api/{useAdminOrders,notifyOrder}.ts` e os dois testes
(`useAdminOrders.test.ts` dubla `@estrelinha/supabase/client` e `./notifyOrder`;
`notifyOrder.test.ts` dubla `@estrelinha/supabase` — **o índice, não `/client`**),
`features/order-list/model/chargeMaterial.ts`, os chamadores `AdminOrderPage.tsx:109,201,218` e
`AdminOrdersPage.tsx:175,193,707`; a migration da `22` (`set_material_status` devolve
`{ ok, status, reason }` com `reason ∈ not_admin · invalid_status · order_not_found ·
invalid_transition`, linhas 140–191); `core/orders/{rowSummary,nextStep,row,tracking}.ts`,
`core/material/material.ts` (`MATERIAL_TRANSITIONS`, `materialTransitionRefusal`),
`core/hooks/useStoreOverview.ts` (`isAccessDenied`, `retryUnlessDenied`),
`core/orders/__tests__/purity.test.ts` (âncora `≥ 16`); no app: `entities/order/api/{lerComPapel,
usePedido,useListaDePedidos}.ts`, `entities/order/{model/linha.ts,ui/LinhaDoPedido.tsx}`,
`widgets/order-detail/ui/*`, `widgets/order-list/ui/ListaDePedidos.tsx`, `pages/PedidoPage.tsx`,
`features/access-check/model/useRecusaDePapel.ts`, `shared/lib/{useRolagemRestaurada,
useTermoDaEntrada}.ts`, `index.html` (viewport); `packages/ui/src/sheet.tsx`; os guardas
`leituraSoComPapel`, `regraDePedidoSoNoCore`, `movimentoDosPedidos` (app), `pedidoComDonoUnico`,
`marcacaoSoPorAcao` (loja). Varredura de escritores: `grep from('orders'|'order_status_history')`
em `apps/**` e `packages/**` — **os únicos escritores PostgREST são as três funções de
`useAdminOrders.ts`** (`updateStatus`, `cancelOrder`, `addTrackingCode`); o resto é leitura.
Lições: o arquivo de lições não tem nenhuma *confirmed*; aplicadas como cautela as candidatas
`L-050` (fluxo de vários passos precisa de caso para a falha do passo do meio), `L-053` (histórico do
jsdom sobrevive entre testes), `L-055` (dublê precisa reproduzir os eventos do client real),
`L-057` (re-entrada), `L-060` (exclusividade, não presença) e `L-063`.

---

## 1. Architecture Overview

```mermaid
graph TD
  subgraph corePure["packages/core — puro (Node, Deno, browser)"]
    AA[orders/appAction.ts<br/>appPrimaryAction · trackingSheet · trackingEdit<br/>canChargeMaterial · actionConfirmation · frases]
    TR[orders/tracking.ts<br/>+ normalizeTrackingCode · trackingCodeRefusal]
    CH[orders/charge.ts<br/>chargeMaterialText · chargeMaterialUrl]
    RS[orders/rowSummary.ts · nextStep.ts — intocados]
    MT[material/material.ts — intocado]
  end
  subgraph coreIO["packages/core/src/order-actions — o DONO da escrita (deps injetadas)"]
    WS[writeOrderStatus]
    WT[writeTrackingCode]
    WM[writeMaterialStatus]
    TN[triggerOrderNotification]
    RUN[runAppAction — compõe a ação do app]
  end
  subgraph db["Supabase (sem migration)"]
    O[(orders — RLS admin full orders)]
    H[(order_status_history)]
    RPCM[(rpc set_material_status)]
    CLK[(rpc atelie_clock — 74)]
    FN[[send-notification?action=trigger]]
  end
  subgraph bo["apps/backoffice (sem mudança de tela)"]
    UAO[useAdminOrders<br/>updateStatus · addTrackingCode · setMaterialStatus → delegam<br/>cancelOrder fica (allowlist)]
    NO[notifyOrder.ts → delega a TN]
    CM[chargeMaterial.ts → reexporta por toBe]
  end
  subgraph app["apps/mobile-adm"]
    PORTA[features/order-actions/api/gravarAcao.ts<br/>única porta de escrita do app]
    HOOK[features/order-actions/model/useAcaoDoPedido<br/>trava · releitura · aviso · erro]
    UI[RodapeDaAcao · BotaoDaAcao · FolhaDoRastreio<br/>EditarRastreio · LembreteDoEnvio · AvisoDaAcao]
    LCP[entities/order/api/lerComPapel.ts<br/>+ conferirPapel]
  end
  AA --> RS & TR
  RUN --> AA & WS & WT & WM & TN
  WS --> O & H
  WT --> O
  WM --> RPCM
  TN --> FN
  UAO --> WS & WT & WM
  NO --> TN
  CM --> CH
  UI --> HOOK --> PORTA --> RUN
  PORTA -->|zero linhas ⇒ quem é você?| LCP --> CLK
  UI --> AA & CH
```

**A ideia em uma frase**: "qual ação este pedido oferece no app, com que guarda de origem, que frase
a folha diz e que confirmação é verdadeira" é **regra pura** em `core/orders/appAction.ts`; "como se
grava status, rastreio e material e se dispara o aviso" é **um** módulo de escrita em
`core/order-actions`, com o client e o notificador **injetados**, chamado pelo hook do painel e pela
porta do app; o app só despacha, trava, relê e desenha — e trata "zero linhas" sempre como pergunta
("o pedido mudou ou você perdeu o acesso?"), respondida por `atelie_clock`.

### 1.1 Abordagens para o dono da escrita (Large ⇒ exploração)

As três entregam o mesmo escopo (o app grava o mesmo que o painel, com zero linhas nunca sendo
sucesso). **DECIDIDO no portão (Q1): A** — a forma que G1 do Specify já fechou. Conferido pelo
validador: os únicos escritores PostgREST de `orders`/`order_status_history` em `apps/**` e
`packages/**` são `updateStatus`, `cancelOrder` e `addTrackingCode`. B (RPC atômica) fica registrada
como **`BL-051`** (`.specs/BACKLOG.md`), a saída da não-atomicidade (§11, R6).

| | Abordagem | Prós | Contras |
| --- | --- | --- | --- |
| **A** | **módulo TS em `core/order-actions`** com `{ client, notify }` injetados; o hook do painel e a porta do app chamam as mesmas funções | sem migration; o painel continua com os dublês de hoje (o client dublado por `@estrelinha/supabase/client` e o notificador por `./notifyOrder` chegam ao dono **porque são injetados**); a sequência `update → histórico → aviso` passa a ter uma escrita | `update` e `insert` do histórico continuam em duas idas (não atômicas, como hoje no painel); o dono não é alcançável pelo Deno (não precisa ser) |
| B | **RPC `advance_order_status(p_id, p_from, p_to, p_note)`** que faz `update` + histórico numa transação, com `has_role` ⇒ `42501`; o dono TS só a chama | atômico (some a falha "status gravado sem histórico"); recusa de papel explícita em vez de "zero linhas" | migration nova e uma terceira escrita da regra de origem (SQL × TS); muda o caminho do painel (o dublê do painel registra `update`, e passaria a ver `rpc` — **asserções do painel tocadas**, contra `AD-056`); entra na lista literal de `marcacaoSoPorAcao` |
| C | o app grava sozinho (cópia da sequência do painel) | nenhum toque no painel | o defeito 01 no caminho do status; descartado no Specify (G1) |

### 1.2 Abordagens para a trava por pedido (A20, `MAA-20`)

**DECIDIDO no portão (Q3): A.** `travar(id)` e `soltar(id)` são síncronos; `soltar` mora no
`finally`, inclusive quando a porta **lança** a recusa. A régua é o teste de dois `executar()` no mesmo
tique, sem `await` entre eles: uma escrita só. B não é usada, porque "o `useIsMutating` já conta no
mesmo tique" não foi verificado na versão instalada (`AD-012`).

| | Abordagem | Prós | Contras |
| --- | --- | --- | --- |
| **A** | **um `Set` de ids em módulo** (`features/order-actions/model/travas.ts`), lido por `useSyncExternalStore`, molde de `access-check/model/tentativa.ts` | síncrono: o segundo toque no **mesmo tique** já vê a trava (`travar(id)` devolve `false`); compartilhado pelo cartão e pelo detalhe sem prop; testável sem React | código nosso (≈ 30 linhas) |
| B | `useMutation` com `mutationKey: ['acao-do-pedido', id]` e `useIsMutating` | idiomático | **não sei** se `isMutating` já conta a mutação no mesmo tique de `mutate()` em todas as versões v5 (a mudança para `pending` acontece dentro de `execute`); depender disso para "o segundo toque não sai" é afirmação sem verificação — teria de ser provado antes de usar |

---

## 2. Code Reuse Analysis

### 2.1 Reaproveitado sem mudança

| O quê | Onde | Uso na `75` |
| --- | --- | --- |
| `rowSummary`, `PrimaryActionId` | `core/orders/rowSummary.ts` | **composto** por `appPrimaryAction` (A14); byte a byte |
| `nextStep`, `PICKUP_DONE_ACTION` | `core/orders/nextStep.ts` | o rótulo e o destino da retirada (A16) |
| `isPickupOrder` | `core/shipping/pickup.ts` | retirada sem rastreio (`MAA-16`) |
| `toMaterialStatus`, `materialTransitionRefusal` | `core/material/material.ts` | o passo do material em "Iniciar separação" e o motivo legível (`MAA-03`, `MAA-09`) |
| `queueSince`, `queueAge` | `core/orders/row.ts`, `core/material/aging.ts` | a idade do lembrete, contra `lido_em` (A18) |
| `normalizeBrPhone` | `core/notifications/phone.ts` | condição do lembrete e a URL (`MAA-17`) |
| `formatOrderNumber` | `core/orders/format.ts` | confirmações e lembrete |
| `isAccessDenied`, `ACCESS_DENIED_CODE`, `STORE_OVERVIEW_KEY` | `core/hooks/useStoreOverview.ts` | "é recusa?" (um dono) e a terceira chave de releitura |
| `lerComPapel` | `entities/order/api/lerComPapel.ts` | ganha `conferirPapel()` (o literal `atelie_clock` continua só ali, E1 da `74`) |
| `useRecusaDePapel` | `features/access-check` | recebe também o erro da ação (`MAA-21`, `MAA-23`) |
| `usePedido`, `chaveDoPedido`, `LISTA_DE_PEDIDOS_KEY` | `entities/order` | releitura por chave (A21) |
| `useOrdersRealtime` (já montado no detalhe e na lista) | `core/hooks` | `MAA-26`: o rodapé e a folha reagem ao estado novo |
| `Sheet` (`side="bottom"`, Radix Dialog) | `@estrelinha/ui/sheet` | a folha do rastreio: foco preso, fundo e Escape fecham |
| `Input`, `Button`, `campo.ts` | `@estrelinha/ui`, `shared/ui/campo.ts` | campo do código e botões (48 px) |
| arnês: `fakeSupabase.ts`, `clientReal.ts`, `montarApp.tsx`, `pedidos.ts`, `intersecao.ts` | `apps/mobile-adm/src/test` | estendidos (§9), nunca copiados |

### 2.2 O que SOBE para `packages/core` (byte a byte, `MAA-27`, `MAA-28`)

| Símbolo | De (painel) | Para | Entrada | O painel passa a |
| --- | --- | --- | --- | --- |
| `chargeMaterialText`, `chargeMaterialUrl` | `features/order-list/model/chargeMaterial.ts` | `core/orders/charge.ts` (importa `../material/material.ts`, `../material/aging.ts`, `../notifications/phone.ts`, `./format.ts`, `./row.ts`) | `ChargeMaterialInput = { material_status; customer_name; order_number; created_at; material_received_at }` — o `AdminOrderRow` satisfaz | `export { chargeMaterialText, chargeMaterialUrl } from '@estrelinha/core/orders'` no mesmo arquivo; `whatsappNumber` continua (alias de `normalizeBrPhone`) |
| a sequência de `updateStatus` (update + histórico + `order_status_changed`) | `useAdminOrders.ts:122–139` | `core/order-actions/status.ts` → `writeOrderStatus` | — | `updateStatus` delega e mantém `fetchOrders`/`fetchStatusCounts` e `{ error, emailSent }` |
| a sequência de `addTrackingCode` | `useAdminOrders.ts:165–175` | `core/order-actions/tracking.ts` → `writeTrackingCode` | — | `addTrackingCode` delega, passando `carrier` |
| a sequência de `setMaterialStatus` (RPC + `material_status_changed`) | `useAdminOrders.ts:186–208` | `core/order-actions/material.ts` → `writeMaterialStatus` | — | delega e traduz o resultado para `{ ok, reason, emailSent }` (com `rpc_failed` e o `?? 'invalid_transition'` de hoje) |
| o disparo `action=trigger` | `notifyOrder.ts:24–33` | `core/order-actions/notify.ts` → `triggerOrderNotification(client, orderId, trigger)` | — | `notifyOrder(id, t)` vira `triggerOrderNotification(supabase, id, t)` com o `supabase` importado de **`@estrelinha/supabase`** (é o que `notifyOrder.test.ts` dubla). `resendNotification` fica |

**`setMaterialStatus` entra no dono mesmo não estando na letra de A2** (**DECIDIDO no portão, Q2:
sim**; a tradução exata está em §3.3): a sequência
"RPC → se `ok`, `material_status_changed`" é exatamente o que "Recebi o material" e o primeiro passo
de "Iniciar separação" fazem no app; escrita duas vezes, a do app poderia, por exemplo, avisar em
`ok: false`. `setMaterialTracking` (o envelope, G6 fora) **fica no painel** — o app não a chama.

`cancelOrder` **fica no painel**, como a única entrada do allowlist do guarda de `MAA-39` (§8.1).

### 2.3 O que NASCE em `packages/core`

Puro, em `core/orders` (todo especificador relativo com `.ts`; `purity.test.ts` o alcança por
construção, e a âncora `≥ 16` continua valendo):

| Símbolo | Arquivo | Responde |
| --- | --- | --- |
| `AppActionId`, `AppAction`, `appPrimaryAction(row)` | `orders/appAction.ts` | A14: a ação do app, com rótulo e **plano** (§5.1) — cancelado/entregue ⇒ `nenhuma`; retirada em `separating` ⇒ `marcar-retirado`; senão `rowSummary` |
| `TrackingSheet`, `trackingSheet(row, origem)` | idem | A10/A23/A25: título, frase, valor inicial, guarda de status do `update`, se avança para `shipped`, e se a confirmação **pode** citar e-mail. `null` para retirada e para status sem folha |
| `trackingEdit(row)` | idem | `MAA-11`: "Informar" / "Alterar" na Entrega, ou `null` (retirada, status fora de `shipped`/`delivered`) |
| `canChargeMaterial(row)` | idem | A17: `aguardando_material` **e** não cancelado **e** `normalizeBrPhone(customer_phone)` válido |
| `actionConfirmation(input)` | idem | A11: `{ titulo, frase }` — cita e-mail **só** quando o plano diz que o evento é o nomeado e `sent === true` |
| `ACTION_FAILED`, `ORDER_CHANGED`, `PARTIAL_MATERIAL`, `PARTIAL_TRACKING`, `SAVING` | idem | as frases fixas: "Não consegui salvar. Tente de novo.", "Este pedido mudou enquanto você olhava.", "A produção ficou registrada, mas o pedido não passou para separação.", "O código ficou salvo, mas o pedido não foi marcado como enviado.", "Salvando…" |
| `normalizeTrackingCode`, `trackingCodeRefusal`, `TRACKING_CODE_MIN_LENGTH = 8` | `orders/tracking.ts` (continua sem import) | A8: apara, tira espaços internos, maiúsculas; recusa abaixo de 8 com "Confira o código — ele costuma ter 13 caracteres." |

De escrita, em **`core/order-actions/`** (subpath novo `"./order-actions": "./src/order-actions/index.ts"`
no `exports`; **não** em `core/orders`, que `purity.test.ts` proíbe de importar `@supabase/*`; molde
de lugar: `core/hooks`):

| Arquivo | Símbolo |
| --- | --- |
| `types.ts` | `OrderWriteClient`, `OrderWriteDeps`, `WriteOutcome`, `MaterialOutcome`, `AppActionOutcome` |
| `notify.ts` | `triggerOrderNotification(client, orderId, trigger): Promise<boolean>` — nunca lança |
| `status.ts` | `writeOrderStatus(deps, input): Promise<WriteOutcome>` |
| `tracking.ts` | `writeTrackingCode(deps, input): Promise<WriteOutcome>` |
| `material.ts` | `writeMaterialStatus(deps, input): Promise<MaterialOutcome>` |
| `appAction.ts` | `runAppAction(deps, row, pedido): Promise<AppActionOutcome>` — despacha o plano de `appPrimaryAction`/`trackingSheet` |
| `index.ts` | barrel |

`OrderWriteClient` é `Pick<SupabaseClient, 'from' | 'rpc' | 'functions'>` com `import type` de
`@supabase/supabase-js` — o único import de pacote do módulo, **só de tipo** (o guarda de pureza do
módulo, §8.5, aceita exatamente isso).

**A dependência passa a ser declarada** (issue do portão): hoje `packages/core/package.json` não
declara `@supabase/supabase-js` (só a raiz declara `^2.103.0`), e o `import type` só resolveria pelo
`node-linker=hoisted`, o que é coincidência e não contrato. A task que cria o módulo:

1. acrescenta a `packages/core/package.json` um `"peerDependencies": { "@supabase/supabase-js":
   "^2.103.0" }` (a mesma faixa da raiz; o pacote não é empacotado, então peer descreve o contrato
   sem instalar uma segunda cópia) e roda `pnpm install`, conferindo que o diff do `pnpm-lock.yaml` é
   **só** a entrada do importer `packages/core`;
2. acrescenta o subpath `"./order-actions": "./src/order-actions/index.ts"` no `exports`;
3. mede `npx tsc --noEmit -p packages/core/tsconfig.json` antes e depois: **os mesmos 11 erros
   herdados, linha a linha**, e zero em `src/order-actions/**`.

Derivar o tipo de `@estrelinha/supabase` foi descartado: o guarda de pureza (§8.5) proíbe
`@estrelinha/*` no módulo, e o barrel de lá carrega o client (que lança sem env no carregamento).

---

## 3. Components

### 3.1 `core/orders/appAction.ts` — a regra da ação do app

- **Purpose**: responder, sem I/O, "que ação este pedido oferece no app, e com que plano".
- **Interfaces**:
  - `appPrimaryAction(row: AppActionInput): AppAction` — ordem de A14: (1) `status ∈ {cancelled,
    delivered}` ⇒ `nenhuma`; (2) `isPickupOrder(row) && status === 'separating'` ⇒ `marcar-retirado`
    com `label = nextStep(row).actionLabel` e `plano.to = nextStep(row).status`; (3) senão
    `rowSummary(row)`, com `anotar-rastreio-envelope` (não produzida hoje) ⇒ `nenhuma`.
  - `trackingSheet(row, origem: 'acao' | 'entrega'): TrackingSheet | null`
  - `trackingEdit(row): { rotulo: 'Informar' | 'Alterar' } | null`
  - `canChargeMaterial(row: ChargeMaterialInput & { status; customer_phone }): boolean`
  - `actionConfirmation(input: ConfirmationInput): { titulo: string; frase: string }`
- **Dependencies**: `rowSummary.ts`, `nextStep.ts`, `../shipping/pickup.ts`, `../material/material.ts`,
  `../notifications/phone.ts`, `./format.ts`.
- **Reuses**: tudo acima; **não** muda `rowSummary` nem `RowSummaryInput` (o painel o lê).
- **Por que a guarda de origem mora aqui**: `regraDePedidoSoNoCore` (`MAP-49`) acusa no app a comparação
  direta de uma coluna de estado com um literal do vocabulário dela (régua 3, acrescentada no conserto
  da rodada 1 do Verificador, M45 — até ali a afirmação "qualquer condição sobre `status`" era falsa:
  o guarda só via mapas, `case` e predicados de recorte). `includes`/`in` e o literal guardado numa
  variável continuam fora do alcance, declarado no cabeçalho do guarda. Se o app passasse
  `expectedFrom: 'paid'`, ele escreveria a regra. O
  plano já vem com `from`/`to` e com a lista de A25, e o app só repassa o plano ao dono.

### 3.2 `core/order-actions` — o dono da escrita

- **Purpose**: a única escrita PostgREST de `orders`/`order_status_history` **em `apps/*/src` e
  `packages/*/src`** (menos `cancelOrder`), e a única sequência "RPC do material → aviso". Fora desse
  escopo, por construção, há outros donos que gravam `orders` com **service role** no servidor:
  `supabase/functions/**` (`checkout`, `mercado-pago`, `melhor-envio`) e `tools/catalog-import`
  (`src/write/orders.ts:186`, `from('orders').update(patch)`). Eles não passam por RLS nem por
  `expectedFrom` e não são consumidores deste dono — a frase "única escrita do monorepo" seria falsa
  sem essa ressalva.
- **Nomes** (issue do portão): em `OrderWriteDeps`, `notify` é a **função** notificadora; no input
  das escritas, o booleano que decide se o aviso sai chama-se **`avisar`** (padrão `true`). Os dois
  nunca têm o mesmo nome.
- **Interfaces**:
  - `writeOrderStatus({ client, notify }, { id, to, from, expectedFrom?, note?, avisar? = true })`:
    `update({ status: to }).eq('id', id)` [+ `.eq('status', expectedFrom)`] `.select('id')`;
    `error` ⇒ `{ tipo: 'falhou', erro }`; nenhuma linha ⇒ `{ tipo: 'nenhuma-linha' }` (**sem**
    histórico, A22); senão `insert` no histórico com `from_status = expectedFrom ?? from ?? null`
    (resultado **ignorado**, paridade com o painel, Q8/R6) e, se `avisar`, **um**
    `notify(id, 'order_status_changed')` ⇒ `{ tipo: 'ok', emailSent }`.
  - `writeTrackingCode(deps, { id, code, carrier?, statusIn?, avisar? = true })`: o objeto do `update`
    leva `shipping_carrier` **só** quando `carrier !== undefined` (A9); `statusIn` vira
    `.in('status', statusIn)` (A25); mesmo tratamento de efeito; sem histórico (é o que o painel faz).
  - `writeMaterialStatus(deps, { id, to, avisar? = true })`: `rpc('set_material_status', { p_order_id,
    p_status })`; `error` ⇒ `falhou`; `reason === 'not_admin'` ⇒ `{ tipo: 'sem-papel' }`; outro
    `ok !== true` ⇒ `{ tipo: 'material-recusado', reason, status }`; `ok` ⇒ aviso
    `material_status_changed` e `{ tipo: 'ok', status, emailSent }`.
  - `triggerOrderNotification(client, orderId, trigger)`: o corpo do `notifyOrder` de hoje, com o
    client recebido.
  - `runAppAction(deps, row, pedido: { tipo: 'primaria' } | { tipo: 'rastreio'; codigo; origem })`:
    §5.2.
- **Dependencies**: `OrderWriteDeps` injetado; `../orders/appAction.ts`, `../orders/tracking.ts`,
  `../material/material.ts` (tudo relativo com `.ts`).
- **Reuses**: o texto e a ordem das chamadas de `useAdminOrders.ts`, com o efeito conferido por
  `.select('id')` (A3/A24).
- **Nunca lança** para falha de rede do supabase-js: o `{ error }` vira `falhou`; uma exceção
  síncrona do client é capturada e vira `falhou` (as três formas da `72`: `{ error }`, lançada,
  rejeitada).

### 3.3 Painel — delegação sem mudança de tela

- `useAdminOrders.ts`: `updateStatus` → `writeOrderStatus({ client: supabase, notify: notifyOrder },
  { id, to: status, from: currentOrder?.status ?? null, note })`; `addTrackingCode` →
  `writeTrackingCode(…, { id, code, carrier })`; `setMaterialStatus` → `writeMaterialStatus`. Cada um
  traduz o desfecho para a forma de retorno de hoje e mantém as próprias releituras.
  `nenhuma-linha` vira `{ error: new Error('Nenhum pedido foi alterado.') }` (A24, **n — confirmar**)
  — inalcançável para uma admin com o id da lista.

**Tradução exata, desfecho por desfecho** (issue do portão — cada linha é um caso de
`useAdminOrders.delega.test.ts`):

| Função do painel | Desfecho do dono | Devolve ao chamador (forma de hoje, byte a byte) |
| --- | --- | --- |
| `updateStatus` | `ok { emailSent }` | `{ error: null, emailSent }` (+ `fetchOrders`, `fetchStatusCounts`; `addTrackingCode` só `fetchOrders`, como hoje) |
| `updateStatus` | `falhou { erro }` | `{ error: erro, emailSent: false }`, sem releitura (como hoje) |
| `updateStatus` | `nenhuma-linha` | `{ error: new Error('Nenhum pedido foi alterado.'), emailSent: false }` (A24, mudança declarada) |
| `addTrackingCode` | mesmas três linhas acima | idem |
| `setMaterialStatus` | `ok { status, emailSent }` | `{ ok: true, reason: null, emailSent }` (+ `fetchOrders`, `fetchStatusCounts`) |
| `setMaterialStatus` | `sem-papel` | `{ ok: false, reason: 'not_admin', emailSent: false }` |
| `setMaterialStatus` | `material-recusado { reason }` | `{ ok: false, reason: reason ?? 'invalid_transition', emailSent: false }` |
| `setMaterialStatus` | `falhou` (o `{ error }` da RPC **ou** exceção capturada) | `{ ok: false, reason: 'rpc_failed', emailSent: false }` |

**Mudança de comportamento declarada (benigna)**: hoje uma exceção **síncrona** do client dentro de
`setMaterialStatus` (o `supabase.rpc` lançando em vez de devolver `{ error }`) **propaga** ao
chamador; com o dono, ela é capturada e vira `falhou` ⇒ `reason: 'rpc_failed'`. Os chamadores
(`AdminOrderPage.tsx`, `AdminOrdersPage.tsx`) já tratam `ok: false` com toast; a exceção caía num
`catch` genérico ou em erro não tratado. Nenhuma asserção do painel cobre esse caminho hoje (conferir
na task); um caso novo em `useAdminOrders.delega.test.ts` pina a forma nova. O mesmo vale para
`updateStatus`/`addTrackingCode`: exceção vira `{ error: <a exceção> }`.
- `notifyOrder.ts`: invólucro de uma linha; `resendNotification` intacto.
- `chargeMaterial.ts`: reexporta por referência.
- **Nenhuma asserção do painel tocada.** O dublê de `useAdminOrders.test.ts` ganha `.select` na cadeia
  de `update(...).eq(...)` (devolvendo `{ data: [{ id }], error: updateResult.error }`), que a spec
  autoriza (`MAA-27`).

### 3.4 App — a porta de escrita (`features/order-actions/api/gravarAcao.ts`)

- **Purpose**: o único arquivo do app que entrega o client a quem escreve.
- **Interfaces**: `gravarAcao(row: LinhaDaLista | PedidoDoDetalhe, pedido): Promise<ResultadoDaAcao>`.
  - monta `deps = { client: supabase, notify: (id, t) => triggerOrderNotification(supabase, id, t) }`
    e chama `runAppAction`;
  - `sem-papel` (o `not_admin` da RPC) ⇒ **lança** `{ code: ACCESS_DENIED_CODE }` — a recusa passa a
    ter um formato só no app, lido por `isAccessDenied`;
  - `nenhuma-linha`, ou `parcial` com causa `nenhuma-linha` ⇒ `await conferirPapel()` (de
    `lerComPapel.ts`): `42501` ⇒ lança a recusa; resposta boa ⇒ devolve `mudou` (ou o `parcial`);
    falha de rede da conferência ⇒ `falhou` (rede nunca é recusa);
  - nunca chama `.from(`, `.rpc(` ou `.functions` no client: só o **passa** (guarda §8.2).
- **Dependencies**: `@estrelinha/supabase/client`, `@estrelinha/core/order-actions`,
  `@/entities/order` (`conferirPapel`), `@estrelinha/core/hooks/useStoreOverview`.

### 3.5 App — o hook da ação (`features/order-actions/model/useAcaoDoPedido.ts`)

- **Purpose**: trava, releitura, aviso e erro de **um** pedido, para o rodapé, o cartão, a folha e a
  linha "Informar/Alterar".
- **Interfaces**: `useAcaoDoPedido(id) → { executar(row, pedido), travado: boolean, erro: ErroDaAcao | null,
  erroBruto: unknown }`.
  - `executar`: `if (!travar(id)) return` → `gravarAcao` → em **todo** desfecho (finally, também na
    recusa) invalida `chaveDoPedido(id)`, `[LISTA_DE_PEDIDOS_KEY]` e `STORE_OVERVIEW_KEY` (A21) →
    `soltar(id)`.
  - sucesso ⇒ `mostrarAviso(actionConfirmation(...))` no host global (§3.7); o erro do pedido some.
  - `mudou` ⇒ erro do pedido = `ORDER_CHANGED`; `falhou` ⇒ `ACTION_FAILED`; `material-recusado` ⇒
    `materialTransitionRefusal(<status da RPC>, to)` ou, com `order_not_found`, o estado "Não encontrei
    este pedido." pela releitura; `parcial` ⇒ a frase de `MAA-40`/`MAA-15` com "Tentar de novo".
  - **O que o "Tentar de novo" reenvia** (Q9 e issue do portão). O erro guardado em `erros.ts` leva,
    além da frase, a **retentativa**: `{ frase, retentativa: PedidoDaAcao | null }`.
    - `PARTIAL_MATERIAL` (`MAA-40`): `retentativa = { tipo: 'primaria' }`. Reexecuta sobre a linha
      **relida** do cache; com o material já em `em_producao`, `materialAntes` é `false` e só o
      status é gravado, sem regra própria.
    - `PARTIAL_TRACKING` (`MAA-15`) — **(a), a regra principal**: `retentativa = { tipo: 'rastreio',
      codigo: <o código normalizado que acabou de ser gravado>, origem }`. O botão chama
      `executar(<linha relida>, retentativa)` **sem reabrir a folha**. Na linha relida o status é
      `separating` e `tracking_code` é igual ao código, então `trackingSheet` volta `modo: 'enviar'` e
      `runAppAction` **pula o passo 1** (§5.2): grava só o status, o histórico e o aviso. Se a
      linha relida não está mais em `separating` (outra pessoa enviou, cancelou), o passo 2 afeta
      zero linhas e vale `MAA-21`; se a linha relida não tem mais o código (outra pessoa apagou), o
      passo 1 roda de novo com a guarda de A25, e nada se perde.
    - **(b), complemento**: `trackingSheet(row, origem).valorInicial = row.tracking_code ?? ''`
      também no modo `enviar` (não só em `alterar`). Se a Adri fechar o erro e tocar o rodapé
      "Marcar como enviado" em vez do "Tentar de novo", a folha abre **já com o código**, e salvar
      sem mexer cai na mesma regra de pulo. Em `salvar` (`shipped` sem código) o valor é `''` por
      construção.
    - Cada um tem caso próprio: (a) em `useAcaoDoPedido.test.tsx` e pelo `<App />` real — a folha
      **não** aparece no DOM depois do toque em "Tentar de novo", o dublê registra **zero**
      `update` de `tracking_code` e **um** `update` de status; (b) em `appAction.test.ts`,
      `trackingSheet` em `separating` com código ⇒ `valorInicial` igual ao código, e sem código ⇒
      `''`.
  - recusa (lançada) ⇒ guardada em `erroBruto`, que a página passa a `useRecusaDePapel([pedido.error,
    erroBruto])` — o mesmo episódio único da `73`/`74`.
  - **Troca de conta no meio** (edge case): a conta do início (`user.id`) é comparada com a do fim; se
    mudou, nenhum aviso nem erro é desenhado (a releitura é inócua: o cache já foi limpo por
    `LimparCacheNaTrocaDeConta`).
- **Dependencies**: `travas.ts`, `avisos.ts`, `erros.ts` (o erro por pedido, em módulo, para o cartão
  e o detalhe verem o mesmo), `@tanstack/react-query`, `@estrelinha/auth`.

### 3.6 App — UI (`features/order-actions/ui/`)

| Componente | Onde é montado | O que desenha |
| --- | --- | --- |
| `RodapeDaAcao` | `PedidoPage` (abaixo dos blocos) | fixo acima da barra de abas (`bottom` = altura da barra + `safe-area`), largura inteira, `min-h-12`; o rótulo de `appPrimaryAction`; "Salvando…" com `aria-disabled` enquanto travado; o erro do pedido logo acima, `role="alert"`; nada quando `nenhuma`. A página ganha uma reserva de altura igual no fim do conteúdo (`MAA-31`: o rodapé não cobre o último bloco) |
| `BotaoDaAcao` | `widgets/order-list` — **irmão** do `LinhaDoPedido` dentro do `<li>`, nunca dentro do `<Link>` (botão dentro de link é interativo aninhado; **DECIDIDO, Q5**), **em fluxo normal, abaixo do conteúdo do link** — nunca `absolute` sobre o cartão, então `alvoDeToqueNaoRoubaPosicao` não entra em jogo | o mesmo rótulo, a mesma trava, a mesma folha (P2); o resto do cartão continua abrindo o detalhe (§13 item 2) |
| `FolhaDoRastreio` | aberta pelo rodapé, pelo cartão e por `EditarRastreio` | `Sheet side="bottom"`, `hideClose` (o X tem 16 px), título/frase/valor inicial de `trackingSheet`, campo com `autoCapitalize="characters"`, `inputMode="text"`, `autoComplete="off"`, normalizando ao digitar; "Agora não" e "Salvar" (48 px); a recusa de `trackingCodeRefusal` no campo sem ir à rede; fecha só depois do sucesso |
| `EditarRastreio` | `BlocoEntrega` (linha do rastreio) | "Informar"/"Alterar" (`trackingEdit`), 44 px |
| `LembreteDoEnvio` | `BlocoMaterial` | `<a href={chargeMaterialUrl(row, row.customer_phone, new Date(lidoEm))} target="_blank" rel="noopener noreferrer">` quando `canChargeMaterial`; cor do WhatsApp por constante da marca do terceiro (precedente `shared/config` da `65` na loja) |
| `AvisoDaAcao` | **host único** em `app/layout/MobileLayout` (dentro do `RequireAdmin`: a recusa desmonta o host, e nenhuma confirmação aparece sobre ela — coerente com `MAA-21`/`MAA-23`) | a confirmação, `role="status"`, `fixed`, com `bottom` = altura da barra de abas **+** altura do `RodapeDaAcao` quando há rodapé montado **+** `env(safe-area-inset-bottom)` (as alturas vêm de **uma** constante/variável CSS por elemento, lida pelo rodapé, pela barra e pelo aviso, nunca três números); largura inteira menos o gutter de 16 px; texto que quebra (sem `truncate`); some sozinha em **5 s** (**n — confirmar**, Q7) sem tomar o foco; uma nova confirmação **substitui** a anterior e **reinicia** o prazo |

`widgets/order-detail` passa a importar de `features/order-actions` (camada abaixo — permitido).
`entities/order/ui/LinhaDoPedido` **não** importa `features`: só troca o tom (`PONTO_DA_ACAO`) para
ser decidido por `appPrimaryAction(row).action` (A14b); `marcar-retirado` cai no tom primário.

### 3.7 App — estados em módulo (fora do React)

`travas.ts` (`travar`, `soltar`, `useTravado`), `avisos.ts` (`mostrarAviso`, `useAviso`) e `erros.ts`
(`definirErro(id, e)`, `useErroDoPedido(id)`), os três com `useSyncExternalStore` — molde de
`access-check/model/tentativa.ts`, pelo mesmo motivo: o cartão some da lista quando o pedido sai do
recorte, e o detalhe desmonta na recusa; estado de `useRef` morreria com eles. Os três são limpos na
troca de conta (`LimparCacheNaTrocaDeConta` chama `esquecerAcoes()`, como já chama `esquecerTermos`).

### 3.8 A folha e o voltar do Android (A23, `MAA-32`)

`features/order-actions/model/useFolhaNoHistorico.ts`:

- **abrir**: `navigate(location, { state: { ...location.state, folhaDoRastreio: <chave> } })` —
  mesma `pathname`/`search`, **preserva** `doApp` (E7 da `74`: o "Voltar" do detalhe precisa dele);
- a folha está aberta **sse** `location.state?.folhaDoRastreio === <chave>` **e** ela foi aberta nesta
  montagem (um `ref`); o voltar do Android consome a entrada e, por construção, fecha a folha;
- **fechar** por "Agora não", fundo, Escape ou sucesso ⇒ `navigate(-1)`;
- **F5 com a folha aberta**: ao montar com o marcador e sem o `ref`, `navigate(location, { replace:
  true, state: <state sem o marcador> })` — a folha não reabre e não sobra voltar morto;
- `<chave>` = `<id do pedido>:<modo>`; `MAA-26`: com o Realtime trazendo um estado em que
  `trackingSheet(row, origem)` muda de `modo` ou vira `null`, a folha fecha (`navigate(-1)`) e o erro
  do pedido vira `ORDER_CHANGED`.
- Nada vai à URL: `pedidosHref` continua o único dono do endereço (`enderecoDePedidosComDonoUnico`).
- Na lista, a entrada nova muda `location.key`: `useRolagemRestaurada` grava a posição da entrada de
  baixo ao trocar e a restaura ao voltar; `useTermoDaEntrada` mantém o `useState` da página montada.
  As duas coisas são conferidas em navegador (§13), não só por jsdom.

### 3.9 O teclado virtual (`MAA-32`)

`index.html` não tem `interactive-widget`, e no Chrome Android ≥ 108 o teclado **sobrepõe** o
conteúdo `fixed` em vez de encolher a página. **DECIDIDO no portão (Q4)**: um hook local,
`shared/lib/useTecladoVirtual.ts`, que lê `window.visualViewport` (`height`, `offsetTop`, ouvindo
`resize` e `scroll` dele) e devolve o deslocamento `innerHeight − (height + offsetTop)` (piso 0) a
aplicar como `bottom` **só da folha**; sem `visualViewport`, devolve 0. O viewport do app **não**
muda: `interactive-widget=resizes-content` mudaria toda tela com teclado (a barra de abas subiria na
busca de Pedidos e no Login), fora do escopo da `75`, e não resolveria o iOS Safari, onde o teclado
nunca redimensiona o layout viewport — `visualViewport` cobre os dois. Teste de unidade do hook com
um `visualViewport` dublado (ausente ⇒ 0; reduzido ⇒ a diferença; ouvintes removidos no desmonte,
por identidade do handler — lição da `47`); a prova é o navegador (§13 item 3) e o Android real com o
usuário.

---

## 4. Data Models

```typescript
// core/orders/appAction.ts — puro
export type AppActionId =
  | 'registrar-recebimento' | 'separar' | 'marcar-enviado'
  | 'salvar-rastreio' | 'marcar-retirado' | 'nenhuma'

export interface AppActionInput {           // a LinhaDaLista da 74 satisfaz
  status: string
  material_status: string | null
  tracking_code: string | null
  payment_method: string | null
  shipping_service_id: string | null
}

export type AppActionPlan =                  // discriminada por STRING (strictNullChecks: false)
  | { tipo: 'material'; to: 'material_recebido' }
  | { tipo: 'separar'; materialAntes: boolean; from: 'paid'; to: 'separating' }
  | { tipo: 'folha' }                        // marcar-enviado e salvar-rastreio: o plano vem de trackingSheet
  | { tipo: 'status'; from: 'separating'; to: 'delivered' }
  | { tipo: 'nenhum' }

export interface AppAction { action: AppActionId; label: string; plano: AppActionPlan }

export interface TrackingSheet {
  modo: 'enviar' | 'salvar' | 'alterar'
  titulo: 'Marcar como enviado' | 'Salvar rastreio' | 'Alterar rastreio'
  frase: string                              // as três de A10
  valorInicial: string                       // row.tracking_code ?? '' em "alterar" E em "enviar" (Q9-b); '' em "salvar" por construção
  guarda: string[]                           // A25: ['separating','shipped'] | ['shipped'] | ['delivered']
  avancaPara: 'shipped' | null               // só de separating
  citaEmailSeEnviado: boolean                // separating, ou shipped SEM código; nunca delivered
}

// core/order-actions/types.ts
export type WriteOutcome =
  | { tipo: 'ok'; emailSent: boolean }
  | { tipo: 'nenhuma-linha' }
  | { tipo: 'falhou'; erro: unknown }

export type MaterialOutcome =
  | { tipo: 'ok'; status: string; emailSent: boolean }
  | { tipo: 'sem-papel' }
  | { tipo: 'material-recusado'; reason: string | null; status: string | null }  // null ⇒ o painel traduz para 'invalid_transition'
  | { tipo: 'falhou'; erro: unknown }

export type AppActionOutcome =
  | { tipo: 'ok'; emailSent: boolean; materialMudou: boolean }
  | { tipo: 'nenhuma-linha' }
  | { tipo: 'falhou'; erro: unknown }
  | { tipo: 'sem-papel' }
  | { tipo: 'material-recusado'; reason: string | null; status: string | null; to: string }
  | { tipo: 'parcial'; etapa: 'material' | 'rastreio'; causa: 'falhou' | 'nenhuma-linha' }

// core/order-actions — o pedido que a porta repassa; também é a 'retentativa' guardada no erro (§3.5)
export type PedidoDaAcao =
  | { tipo: 'primaria' }
  | { tipo: 'rastreio'; codigo: string; origem: 'acao' | 'entrega' }

// entrada das escritas: o booleano do aviso é `avisar`; `notify` é só a função de OrderWriteDeps
export interface OrderWriteDeps {
  client: OrderWriteClient
  notify: (orderId: string, trigger: NotificationTrigger) => Promise<boolean>   // import type de '../notifications/triggers.ts'
}

// apps/mobile-adm — o erro de um pedido, em módulo (erros.ts)
export interface ErroDaAcao { frase: string; retentativa: PedidoDaAcao | null }

// apps/mobile-adm — o que a porta devolve depois de conferir o papel
export type ResultadoDaAcao =
  | Exclude<AppActionOutcome, { tipo: 'nenhuma-linha' } | { tipo: 'sem-papel' }>
  | { tipo: 'mudou' }
// (a recusa não é resultado: é lançada com { code: '42501' })
```

**Nenhuma coluna nova** e nenhuma constante de colunas nova: `COLUNAS_DA_LISTA` já traz o que
`appPrimaryAction`/`trackingSheet` leem, e `COLUNAS_DO_DETALHE` traz `customer_phone` (o cartão não
desenha o lembrete).

---

## 5. Fluxos

### 5.1 `appPrimaryAction` — tabela de verdade (cada linha tem teste)

| Entrada | `action` | `label` | `plano` |
| --- | --- | --- | --- |
| `status` cancelled/delivered (qualquer material) | `nenhuma` | `''` | `nenhum` |
| material `aguardando_material` ou `material_enviado` (pagamento qualquer, A15) | `registrar-recebimento` | Recebi o material | `material → material_recebido` |
| `shipped` sem código, não retirada | `salvar-rastreio` | Salvar rastreio | `folha` |
| `paid` | `separar` | Iniciar separação | `separar`, `materialAntes = material === 'material_recebido'` |
| `separating`, retirada | `marcar-retirado` | Marcar como retirado (`nextStep`) | `status separating → delivered` |
| `separating`, não retirada | `marcar-enviado` | Marcar como enviado | `folha` |
| `pending`; `shipped` com código | `nenhuma` | `''` | `nenhum` |

### 5.2 `runAppAction` — a ordem das escritas

```mermaid
sequenceDiagram
  participant App as gravarAcao (app)
  participant Run as runAppAction (core)
  participant DB as Supabase
  App->>Run: row, { tipo: 'rastreio', codigo } (de separating)
  Run->>Run: sheet = trackingSheet(row); código ≠ row.tracking_code?
  Run->>DB: update tracking_code .eq(id) .in(status, sheet.guarda) .select(id)
  alt erro / zero linhas
    Run-->>App: falhou / nenhuma-linha (nada gravado)
  end
  Run->>DB: update status=shipped .eq(id) .eq(status,'separating') .select(id)
  alt erro / zero linhas
    Run-->>App: parcial { etapa: 'rastreio', causa }
  end
  Run->>DB: insert order_status_history (separating → shipped)
  Run->>DB: functions.invoke send-notification?action=trigger (UMA vez)
  Run-->>App: ok { emailSent }
```

- **Recebi**: `writeMaterialStatus('material_recebido')` e mais nada.
- **Separar**: com `materialAntes`, `writeMaterialStatus('em_producao')`; qualquer desfecho que não
  seja `ok` encerra **sem** tocar no status (`MAA-09`). Depois `writeOrderStatus(from/expectedFrom
  'paid', to 'separating')` — que dispara o `order_status_changed` dele (não produz e-mail para
  `separating`, `MAA-08`); falha ou zero linhas **depois** de o material ter mudado ⇒ `parcial
  'material'` (`MAA-40`). A retentativa recalcula `appPrimaryAction` da linha relida: com o material
  já em `em_producao`, `materialAntes` é `false` e só o status é gravado — sem regra própria.
- **Rastreio** (de `salvar`/`alterar`, ou `enviar`): passo 1 com `avisar: false` e `statusIn =
  sheet.guarda`, **pulado** quando o código normalizado é igual ao `tracking_code` da linha **e** o
  modo é `enviar` (a retentativa de `MAA-15` grava "só o que falta"; em "alterar" o mesmo código
  ainda grava, edge case "código igual"; em `salvar` também grava sempre — **DECIDIDO, Q9**); o pulo
  não perde guarda, porque o passo 2 continua com `.eq('status','separating')`. Passo 2 só com
  `avancaPara`; o aviso é um só, no fim. Quem chega à regra de pulo na prática é o "Tentar de novo"
  de `PARTIAL_TRACKING` (§3.5, (a)) e a folha reaberta já com o código (§3.5, (b)).
- **Retirado**: `writeOrderStatus(expectedFrom 'separating', to 'delivered')`.
- `materialMudou` vai para `actionConfirmation`: "Pedido #0251 em produção." × "em separação.".

### 5.3 Confirmação verdadeira (A11) — quem decide "cita e-mail"

`actionConfirmation({ action, modo?, emailSent, materialMudou, materialJaEstava?, customer_name,
order_number })` — e-mail só quando **`emailSent === true` e o plano diz que o único evento possível
é o nomeado**: `registrar-recebimento` (exceto o idempotente, que `emailSent` já traz falso), `separar`
com `materialMudou`, e rastreio com `citaEmailSeEnviado`. A partir de `delivered` nunca, mesmo com
`emailSent` (A10b). A tabela de A11 vira casos de teste, um por linha, incluindo `sent === true` em
`delivered` e `separar` sem material com `sent === true` (o `order_status_changed` de `separating` não
produz e-mail — se um dia produzir, a frase continua não prometendo).

---

## 6. Error Handling Strategy

| Cenário | Onde é decidido | O que a Adri vê |
| --- | --- | --- |
| rede/5xx no passo único | dono ⇒ `falhou` | "Não consegui salvar. Tente de novo." (`role="alert"`, junto do botão); pedido relido como estava (`MAA-22`) |
| zero linhas, papel confirmado | dono ⇒ `nenhuma-linha`; porta ⇒ `conferirPapel` ok ⇒ `mudou` | "Este pedido mudou enquanto você olhava." + releitura; o rodapé mostra a ação do estado novo (`MAA-21`) |
| zero linhas, papel recusado | porta lança `{ code: '42501' }` | a recusa da `72`, via `useRecusaDePapel` (uma reconferência por episódio), sem confirmação (`MAA-21`, `MAA-23`) |
| `not_admin` da RPC | dono ⇒ `sem-papel`; porta lança `42501` | idem |
| `invalid_transition` | dono ⇒ `material-recusado` | `materialTransitionRefusal(status devolvido, to)` + releitura (`MAA-03`, `MAA-09`) |
| `order_not_found` | idem | a releitura leva ao "Não encontrei este pedido." (`MAP-29`) |
| material mudou, status não | dono ⇒ `parcial 'material'` | `PARTIAL_MATERIAL` + "Tentar de novo" (`MAA-40`) |
| rastreio gravado, status não | dono ⇒ `parcial 'rastreio'` | `PARTIAL_TRACKING` + "Tentar de novo" (`MAA-15`) |
| aviso falhou | `triggerOrderNotification` ⇒ `false` | gravação vale; confirmação sem e-mail (`MAA-24`) |
| conferência de papel sem rede | porta ⇒ `falhou` | "Não consegui salvar…" — rede nunca é recusa |
| sem conexão | `useOnline` da `72` | "Sem conexão"; nada enfileirado (`MAA-25`) |
| sessão trocada com ação no ar | hook compara a conta | nada desenhado |
| código curto | `trackingCodeRefusal` | a frase no campo, sem rede (`MAA-12`) |
| histórico não gravou (insert falhou depois do status) | dono **ignora**, como o painel faz hoje (**DECIDIDO, Q8**: paridade) | nada — a linha do histórico falta; ver R6; a saída atômica é `BL-051` |

---

## 7. Releitura (A21, `MAA-41`)

Em **todo** desfecho que chega à rede (sucesso, recusa, zero linhas, parcial, material recusado,
falha): `invalidateQueries` de `chaveDoPedido(id)`, `{ queryKey: [LISTA_DE_PEDIDOS_KEY] }` (todos os
recortes e termos) e `STORE_OVERVIEW_KEY`. Nada de `setQueryData`: o dado novo vem do banco. Prova
pelo **estado do cache** (`queryClient.getQueryState(k)?.isInvalidated`) nas três chaves **e** na
vizinha `chaveDoPedido(<outro id>)` que não vira, com as quatro chaves semeadas antes — nunca
"`invalidateQueries` foi chamado" (lição `51`/`59`). Recusa de código antes da rede (`MAA-12`) não
invalida nada.

---

## 8. Guardas

### 8.1 `pedidoGravadoSoPeloDono.test.ts` (loja, `shared/lib/__tests__`, `MAA-39`)

- **Pela AST** (molde `marcacaoSoPorAcao`): toda cadeia cujo `from(<x>)` resolve para `'orders'` ou
  `'order_status_history'` (literal, ou variável com literal — tabela que não resolve é acusada em
  qualquer arquivo) seguida de `.update(`, `.insert(`, `.upsert(` ou `.delete(` — **uma régua por
  comando** (`L-033`), oito combinações com caso cada —, em `apps/*/src` **e** `packages/*/src`,
  produção, fora de `packages/core/src/order-actions/**`.
- **Allowlist literal de UMA entrada**: o corpo da função `cancelOrder` de
  `apps/backoffice/src/entities/order/api/useAdminOrders.ts` (por declaração, não pelo arquivo — um
  `update` novo no mesmo arquivo é acusado), com o motivo escrito.
- **Metade positiva**: `useAdminOrders.ts` chama `writeOrderStatus`, `writeTrackingCode` e
  `writeMaterialStatus`; `gravarAcao.ts` chama `runAppAction`; `notifyOrder.ts` chama
  `triggerOrderNotification`.
- **Âncora dupla** (arquivos lidos; as escritas achadas **dentro** do dono, ≥ 3) e sensores: CRLF, LF,
  o glob de dois asteriscos no comentário, a cadeia quebrada em linhas, tabela em variável, alias de
  import do client, e os inversos (`select` de `orders`, `update` de outra tabela entre os dois, e o
  `insert` de `orders` da loja — que é do `pedidoComDonoUnico` e não deste guarda; nenhum hoje).
- **Fora do escopo, declarado no cabeçalho do guarda** (issue do portão), com o motivo: são outros
  donos por construção, que gravam com **service role** no servidor e não passam por RLS:
  - `supabase/functions/**` (`checkout`, `mercado-pago`, `melhor-envio`);
  - `tools/catalog-import/**` (`src/write/orders.ts:186`, `from('orders').update(patch)` do
    importador da Nuvemshop, rodado à mão).
  O cabeçalho diz por extenso que ampliar o escopo a esses diretórios **quebra** o importador e as
  functions sem que eles tenham feito nada errado — quem quiser ampliar decide outro dono antes.
  A âncora de escopo escreve os diretórios literalmente (`apps/*/src`, `packages/*/src`), nunca
  itera uma constante (lição do `brandScan`).

### 8.2 `escritaSoPelaPorta.test.ts` (app, `entities/order/api/__tests__`, ampliação de `MAA-29`)

Mesmo arquivo de AST de `leituraSoComPapel` ou vizinho dele (decisão de tasks), três réguas novas:

1. em `apps/mobile-adm/src` (produção), nenhuma chamada `.update(`, `.insert(`, `.upsert(`,
   `.delete(`, `.functions.invoke(`, e nenhuma `.rpc(` fora de `lerComPapel.ts` (`atelie_clock`);
2. a allowlist de quem importa o client cresce de 3 para **4** (`gravarAcao.ts`), e em `gravarAcao.ts`
   o identificador `supabase` só aparece como **valor passado** (nunca receptor de `.`);
3. `gravarAcao.ts` chama `runAppAction(` e `conferirPapel(` (metade positiva).

`leituraSoComPapel` continua intocado na régua dele (a âncora de 3 importadores vira 4 **com a razão**
— ou o guarda novo lê a lista, decisão de tasks; nunca afrouxar).

### 8.3 `regraDePedidoSoNoCore` (`MAP-49`) — continua valendo, e ganhou a régua 3

O app não escreve status: o plano vem de `core`. **Mudança depois da rodada 1 do Verificador (M45)**:
o guarda ganhou a régua `COMPARACAO_DE_ESTADO` — coluna de estado comparada por `===`/`!==` a um literal
do vocabulário DAQUELA coluna, nos dois sentidos —, porque este design e `appAction.ts` afirmavam um
alcance que ele não tinha. Cada coluna casa só com o próprio vocabulário, o que deixa passar o
`PromiseSettledResult.status === 'rejected'` de `lerComPapel.ts` (inverso provado na linha real). Os arquivos novos entram na varredura por construção
(ela varre `src/**`); a âncora de arquivos sobe e é recontada.

### 8.4 `fraseDaAcaoSoNoCore.test.ts` (app, `shared/lib/__tests__`) — **DECIDIDO, Q10: incluir**

Protege `AD-008` (o app nunca promete e-mail por conta própria; quem decide é `actionConfirmation`).

- **Régua**: nenhum literal de string (inclusive texto de JSX e template literal) de
  `apps/mobile-adm/src`, produção, contém `Não consegui salvar`, `por e-mail`, `aviso de postagem`,
  `mudou enquanto` ou `Rastreio salvo`. **Sem allowlist** — conferido pelo validador: hoje nenhum
  literal do app contém essas formas, então o guarda nasce verde sem exceção.
- **Casa `Não consegui salvar`, nunca `Não consegui`**: `ACCESS_UNCHECKED` ("Não consegui conferir seu
  acesso.", `core/auth`) é legítimo e o app o desenha. Um **inverso** prova isso: uma fonte sintética
  com `ACCESS_UNCHECKED` escrito por extenso **não** é acusada; e o rótulo "E-mail" do bloco Cliente
  também não (só `por e-mail` é forma proibida).
- **Âncora positiva** (para a ausência no app não ser verdadeira sobre o nada): as cinco frases
  **existem** em `packages/core/src/orders/appAction.ts` — a régua lê o arquivo do disco e exige
  cada forma lá; e a varredura do app tem âncora de arquivos lidos (≥ os 83 da `74`, recontada).
- **Sensores**: a forma proibida num arquivo com CRLF e com LF é acusada; dentro de comentário
  (`//`, `/* */` e o glob de dois asteriscos) **não** é — a regra procura uso, e a prosa que explica
  o defeito precisa poder citá-lo (a armadilha de `authSenderDomain`); `mutar()` lança sem alvo.
- **Descreve a forma proibida, não a escreve** no cabeçalho do próprio guarda fora dos sensores
  (regra da seção dos guardas do `CLAUDE.md` da raiz); a lista mora numa constante do teste.

### 8.5 Pureza de `core/order-actions` (`packages/core/src/order-actions/__tests__/purity.test.ts`)

Molde de `core/orders/__tests__/purity.test.ts`: nenhum React, nenhum `@estrelinha/*`, nenhum alias;
relativo sempre com `.ts`; o único pacote aceito é `@supabase/supabase-js` **em `import type`**.
Âncora de contagem (≥ 7 arquivos) e sensor de `import { createClient }` (valor) acusado.

### 8.6 Os de sempre

- `movimentoDosPedidos` (app): escopo literal ampliado aos arquivos de UI novos da `75`
  (`RodapeDaAcao`, `BotaoDaAcao`, `FolhaDoRastreio`, `EditarRastreio`, `LembreteDoEnvio`,
  `AvisoDaAcao`, e os da `74` tocados), âncora **recontada com a própria régua** (`MAA-34`).
  ⚠️ A folha usa o `SheetContent` de `packages/ui`, cujas classes (`data-[state=open]:animate-in`,
  `slide-in-from-bottom`) **não estão no app** e não são vistas pelo guarda; o app passa
  `motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none` —
  **não** `motion-reduce:animate-none` puro, que perde em especificidade para o seletor de atributo
  (R2). Régua de token exato para isso dentro do próprio guarda.
- `marcacaoSoPorAcao` (loja): o conjunto de RPCs **não muda** (`set_material_status` sai do painel e
  entra em `packages/core`, que já está no escopo; nenhuma RPC nova) — `MAA-30` verde por igualdade.
- `regrasDoPedidoNoCore` (painel): **não é tocado**; a reexportação de `chargeMaterial*` ganha arquivo
  próprio, `app/__tests__/lembreteNoCore.test.ts` (`toBe`), e a delegação, `useAdminOrders.delega.test.ts`
  (o dono dublado por `vi.mock('@estrelinha/core/order-actions')`, conferindo o `client`, o `notify`,
  a entrada e a tradução de cada desfecho — inclusive `nenhuma-linha` ⇒ erro, A24).
- `notificationSingleOwner`, `numeroDoPedidoComDonoUnico`, `situacaoComDonoUnico`,
  `enderecoDePedidosComDonoUnico`: os arquivos novos caem nas varreduras; nenhum literal de evento
  (só os gatilhos `order_status_changed`/`material_status_changed`, que já são permitidos), número
  sempre por `formatOrderNumber`.

---

## 9. Testes

| Camada | Arquivo | O que prova |
| --- | --- | --- |
| core puro | `orders/__tests__/appAction.test.ts` | a tabela de §5.1 linha a linha (inclusive cancelado com material aguardando, retirada em `separating`, `shipped` com código); `trackingSheet` nos **quatro** casos de `MAA-11` + `separating`, com `guarda`, `avancaPara` e `citaEmailSeEnviado`; retirada ⇒ `null` em todo status; `trackingEdit`; `canChargeMaterial` (sem número, número inválido, `material_enviado`, cancelado); `actionConfirmation`, uma linha de A11 por caso, nome vazio |
| core puro | `orders/__tests__/tracking.test.ts` (+) | normalização (espaços internos, minúsculas), 7 recusa e 8 passa, a frase |
| core puro | `orders/__tests__/charge.test.ts` | os casos que hoje estão em `orderList.test.ts` do painel **ficam lá** (o painel prova pela reexportação); aqui, byte a byte contra textos escritos por extenso, o `wa.me` sem número, `stale` × `fresh` com `now` |
| core escrita | `order-actions/__tests__/*.test.ts` | dublê que **registra a cadeia** (`update` valores, cada `eq`/`in`, `select`), as RPCs e os `notify`: `.select('id')` sempre; zero linhas ⇒ sem histórico e sem aviso (A22); `expectedFrom` vira `.eq('status')` só quando passado (painel sem); `carrier` ausente ⇒ chave ausente do objeto (`not.toHaveProperty`); `statusIn` ⇒ `.in`; as **ordens** (`L-050`: um caso por passo que falha, provando que o seguinte não roda), um aviso só no rastreio de `separating`; `not_admin` ⇒ `sem-papel`; as três formas de falha |
| painel | `useAdminOrders.test.ts` (só o dublê ganha `.select`) + `useAdminOrders.delega.test.ts` + `lembreteNoCore.test.ts` + `notifyOrder.test.ts` (intocado, prova o invólucro) | a suíte inteira verde **sem asserção tocada** |
| painel | `useAdminOrders.delega.test.ts` (detalhe) | a tabela de tradução de §3.3, **uma linha por caso**, inclusive `material-recusado` com `reason: null` ⇒ `'invalid_transition'`, `sem-papel` ⇒ `'not_admin'` e a exceção síncrona capturada ⇒ `'rpc_failed'` |
| core | `packages/core/package.json` + `tsc` | a `peerDependency` de `@supabase/supabase-js` declarada; `tsc -p packages/core/tsconfig.json` com os mesmos 11 erros herdados, linha a linha, e zero em `order-actions/**` |
| app | `shared/lib/__tests__/useTecladoVirtual.test.ts` | §3.9: sem `visualViewport` ⇒ 0; reduzido ⇒ a diferença; ouvintes removidos por identidade |
| app | `shared/lib/__tests__/fraseDaAcaoSoNoCore.test.ts` | §8.4 |
| app | `features/order-actions/__tests__/gravarAcao.test.ts` | `nenhuma-linha` ⇒ `conferirPapel`; `42501` ⇒ lança recusa; ok ⇒ `mudou`; conferência sem rede ⇒ `falhou`; `sem-papel` ⇒ lança |
| app | `useAcaoDoPedido.test.tsx` | trava: dois `executar` no **mesmo** tique ⇒ uma escrita; cartão e detalhe montados juntos; `soltar` no `finally` também na recusa (re-entrada, `L-057`); releitura pelo estado do cache (§7); aviso só com sucesso; troca de conta no meio |
| app, `<App />` real | `pages/__tests__/acoesDoPedido.test.tsx` (sobre `fakeSupabase`, que ganha `update`/`insert`/`rpc` registrados e respostas por chamada) | cada ação pelo rodapé e pelo cartão; a folha com o voltar (com a sentinela do histórico, `L-053`, e o mutante `push → replace` morto); F5 com o marcador; `MAA-26` com `emitir()` do Realtime; `role="status"`/`role="alert"`; exclusividade dos estados (`L-063`): "Salvando…" × erro × confirmação |
| app, client real | `app/__tests__/acoesComClientReal.test.tsx` | sobre o supabase-js REAL (`clientReal.ts`): PATCH de `orders` devolvendo `[]` com 200 e `atelie_clock` em 403 `42501` ⇒ a recusa e **nenhuma** confirmação; `set_material_status` com `{ ok:false, reason:'not_admin' }` ⇒ recusa; PATCH em 500 ⇒ "Não consegui salvar", nunca a recusa. O arnês ganha resposta **por método** (`PATCH`/`POST`) em `tabelas` — **nas duas cópias** (`clientRealPareado`) |
| probe | `.specs/features/75-…/probes/01-paridade.ts` (supabase-js real contra o banco local, admin e conta sem papel) | Success Criteria 1 e 2: o mesmo pedido semeado duas vezes, tratado pelo dono via porta do app e via o hook do painel (para "Separar" com material, o painel faz `setMaterialStatus('em_producao')` + `updateStatus('separating')`); compara colunas, histórico e `order_notifications`; a conta sem papel não muda nada. Requer o edge runtime local com `send-notification` de pé (R7) |

---

## 10. Onde mora cada regra (resumo)

| Pergunta | Dono |
| --- | --- |
| que ação este pedido oferece no app? | `core/orders/appAction.ts` → `appPrimaryAction` |
| que frase a folha diz, que guarda o `update` leva, avança o status? | `trackingSheet` |
| a confirmação pode citar e-mail? | `actionConfirmation` |
| o código é aceitável? | `core/orders/tracking.ts` → `trackingCodeRefusal` |
| a mensagem e a URL do lembrete | `core/orders/charge.ts` (painel reexporta por `toBe`) |
| o lembrete aparece? | `canChargeMaterial` |
| como se grava status/rastreio/material e se avisa | `core/order-actions` (painel e app) |
| é recusa? | `isAccessDenied` (`core/hooks`) |
| zero linhas: mudou ou perdeu o acesso? | `gravarAcao.ts` + `conferirPapel` (app) |
| o que reler | `useAcaoDoPedido` (três chaves) |
| a transição do material é válida? | `MATERIAL_TRANSITIONS` (TS) × `set_material_status` (SQL), `materialTransitions.test.ts` — intocados |

---

## 11. Risks & Concerns

| # | Concern | Location | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Teclado virtual sobrepõe `fixed bottom` no Chrome Android ≥ 108 (viewport sem `interactive-widget`) | `apps/mobile-adm/index.html:5` | o campo do código fica escondido sob o teclado no balcão do correio | `useTecladoVirtual` (`visualViewport`) só na folha (Q4); prova em navegador com teclado emulado e no Android real pelo usuário |
| R2 | `motion-reduce:animate-none` perde para `data-[state=open]:animate-in` (especificidade de atributo) | `packages/ui/src/sheet.tsx:38` | a folha desliza com "menos movimento" ligado, e o guarda de token aprova | classes `motion-reduce:data-[state=…]:animate-none`; régua de token exato; prova em navegador com `prefers-reduced-motion` |
| R3 | Botão dentro do `<Link>` do cartão seria interativo aninhado (HTML inválido, toque ambíguo) | `entities/order/ui/LinhaDoPedido.tsx` | toque no botão abriria o detalhe | `BotaoDaAcao` irmão do link no `<li>` do widget; `LinhaDoPedido` só troca o tom |
| R4 | O dublê de escrita do painel (`update(v) → { eq: () => Promise }`) não tem `.select` | `useAdminOrders.test.ts:32–34` | a delegação derruba a suíte do painel com `select is not a function` | o dublê ganha `.select` (autorizado por `MAA-27`); nenhuma asserção tocada — conferido por `git diff` do arquivo mostrando só o dublê |
| R5 | `notifyOrder.test.ts` dubla `@estrelinha/supabase` (índice) e `useAdminOrders.test.ts` dubla `/client` — dois módulos | `notifyOrder.ts:1`, `useAdminOrders.ts:2` | o invólucro importando de `/client` escaparia do dublê do teste dele | o invólucro mantém `@estrelinha/supabase`; o hook mantém `/client`; ambos **injetam** no dono |
| R6 | `update` do status e `insert` do histórico não são atômicos (como hoje no painel); falha do `insert` é ignorada (paridade) | `useAdminOrders.ts:124–132` | status muda sem linha de histórico, raramente | paridade declarada (Q8); a RPC atômica (abordagem B) é `BL-051` |
| R7 | Probe de paridade depende de `send-notification` no edge runtime local, que já ficou com bind-mount obsoleto (`53`, `56`) | `supabase` local | probe mede "aviso não saiu" por ambiente, não por código | o probe confere o worker antes (`401` sem auth = vivo); `supabase stop` (sem `--all`) + `start` se 503 nomear arquivo existente |
| R8 | A entrada de histórico da folha muda `location.key` na lista | `useRolagemRestaurada.ts`, `useTermoDaEntrada.ts` | voltar da folha aberta pelo cartão perde rolagem ou termo | o desenho de §3.8 preserva os dois por leitura do código; prova em navegador com a lista rolada e buscada |
| R9 | `strictNullChecks: false`: união por booleano não estreita | tipos de §4 | TS2339 ao ler o motivo | todas as uniões discriminam por `tipo` string |
| R10 | `PICKUP_DONE_ACTION`/`nextStep` como fonte do rótulo da retirada: `nextStep` devolve `actionLabel?` opcional | `core/orders/nextStep.ts` | `undefined` no rótulo se a regra mudar | `appPrimaryAction` usa `nextStep(row).actionLabel ?? PICKUP_DONE_ACTION`, com teste que pina o texto |
| R11 | `useRecusaDePapel` reconfere uma vez por episódio; a recusa vinda de uma ação no cartão (lista) precisa entrar na vigia da lista | `PedidosPage.tsx` | recusa da ação no cartão ficaria sem efeito | as duas páginas passam o `erroBruto` do hook à vigia; caso pelo `<App />` real nas duas |

---

## 12. Decisão de projeto — `AD-059` (aceita no portão, com os dois ajustes do validador)

- **Decision**: **toda escrita de status e rastreio de saída em `orders` (com o histórico) e a
  sequência "RPC do material → aviso", feita a partir de `apps/*/src` ou `packages/*/src`, têm UM
  dono, `@estrelinha/core/order-actions`**, que recebe o client e o notificador **injetados** e
  confere o efeito com `.select('id')` — zero linhas nunca é sucesso. O painel (`useAdminOrders`) e
  o app (`features/order-actions/api/gravarAcao.ts`) chamam o dono; só `cancelOrder` escreve fora
  dele, como entrada literal de allowlist. Guarda: `pedidoGravadoSoPeloDono.test.ts` (loja).
- **Escopo, declarado** (ajuste 1): `supabase/functions/**` (`checkout`, `mercado-pago`,
  `melhor-envio`) e `tools/catalog-import` (`src/write/orders.ts:186`) também gravam `orders`, com
  service role no servidor, e são **outros donos por construção** — fora do guarda, e o cabeçalho
  dele diz por quê. A frase "única escrita do monorepo" seria falsa sem essa ressalva.
- **Nomes** (ajuste 2): em `OrderWriteDeps`, `notify` é a função; no input das escritas, o booleano
  do aviso é `avisar`.
- **Decision**: **no app do ateliê, toda escrita passa pela porta única**, que nunca toca o client
  (só o passa) e responde "zero linhas" perguntando ao banco **quem é você** (`conferirPapel` →
  `atelie_clock`): `42501` é recusa, resposta boa é "o pedido mudou". O app sempre passa a guarda de
  estado de origem, e quem a escolhe é `core` (`appPrimaryAction`/`trackingSheet`). Guarda:
  `escritaSoPelaPorta.test.ts` (app).
- **Reason**: o painel e o app passariam a gravar o mesmo pedido; duas sequências de
  "update + histórico + aviso" divergem sem nada quebrar (defeito 01). A RLS de `orders` faz o
  `update` de uma conta sem papel afetar zero linhas **sem erro**, então "sem erro" não é "gravou".
- **Trade-off**: `update` e histórico continuam não atômicos (paridade com o painel); a RPC atômica
  é `BL-051`. O painel passa a tratar zero linhas como erro (caso degenerado, A24) e a exceção síncrona
  do client como `rpc_failed`/`{ error }` (§3.3). Complementa `AD-058` (leitura) do lado da escrita.

---

## 13. O que só o navegador prova

Em 360×800, 390×844 e 412×915, fonte do sistema a 100, 130 e 200 %, com o build servido
(`vite preview`) e o banco local:

1. o rodapé fixo acima da barra de abas **não cobre** o último bloco (Histórico) com a página rolada
   até o fim; `scrollWidth === innerWidth` em todas as telas tocadas;
2. todos os alvos novos com altura ≥ 44 medida (`getBoundingClientRect`): rodapé, "Informar/Alterar",
   lembrete, "Agora não", "Salvar", botão do cartão — e o cartão continua abrindo o detalhe fora do
   botão;
3. a folha com o **teclado virtual aberto** (emulado pelo CDP com `visualViewport` reduzido, e no
   Android real pelo usuário): o campo visível acima do teclado;
4. o voltar do Android (`history.back()`): fecha a folha sem mudar `pathname`/`search`; o voltar
   seguinte leva à lista **no mesmo recorte e posição** (com a lista rolada e buscada antes, R8); F5
   com a folha aberta abre sem folha e o primeiro voltar vai à lista;
5. `prefers-reduced-motion: reduce`: a folha e a confirmação aparecem sem se mover (R2), medido por
   `getAnimations()` vazio;
6. rótulos de rodapé, folha, cartão e confirmação a 130 e 200 % quebrando sem sobrepor nem cortar;
   e a **posição do `AvisoDaAcao`** nas três larguras e nos três tamanhos de fonte, com e sem rodapé
   montado (detalhe × lista): a borda de baixo do aviso **acima** da de cima do `RodapeDaAcao` (quando
   há) e da barra de abas, nenhum dos três se sobrepondo (`getBoundingClientRect`), e a área segura
   respeitada (emulada com `env(safe-area-inset-bottom)` > 0 pelo CDP, ou conferida no iPhone/Android
   real pelo usuário);
7. o percurso de ponta a ponta contra o banco local: Início → "Aguardando material" → pedido →
   "Recebi o material" → confirmação → o número da Início caindo; e separar → marcar como enviado com
   o código; depois "Alterar" e conferir em `order_notifications` que não há segundo `order_shipped`;
8. a confirmação anunciada (`role="status"`) sem tirar o foco do elemento em que estava, e sumindo
   sozinha; o erro (`role="alert"`) ficando até a próxima ação;
9. o lembrete abrindo `wa.me/55…?text=…` em nova aba com o texto byte a byte o do painel para o mesmo
   pedido (o painel aberto ao lado, na mesma hora).

---

## 14. Portão do Design — fechado em 2026-10-24

### 14.1 Decisões (validador independente, `approved: true`)

| # | Pergunta | Decisão | Onde está no design |
| --- | --- | --- | --- |
| Q1 | Dono da escrita | **A**, módulo TS em `core/order-actions` com client e notificador injetados; B (RPC atômica) é `BL-051` | §1.1, §2.3, §12 |
| Q2 | `setMaterialStatus` no dono | **sim**; `setMaterialTracking` fica no painel; tradução exata dos desfechos | §2.2, §3.3 |
| Q3 | Trava por pedido | **A**, `Set` em módulo + `useSyncExternalStore`, `soltar` no `finally` | §1.2, §3.5, §3.7 |
| Q4 | Teclado virtual | **hook local** `useTecladoVirtual` (`visualViewport`), só na folha; viewport intocado | §3.9 |
| Q5 | Botão do cartão | **irmão** do link no `<li>`, em fluxo normal, sem `absolute` | §3.6 |
| Q6 | Confirmação e erro | confirmação num **host único** no `MobileLayout` (`role="status"`); erro junto do botão, em módulo por id (`role="alert"`) | §3.6, §3.7 |
| Q7 | Tempo da confirmação | **5 s**, nova substitui e reinicia o prazo — **n — confirmar** | §3.6 |
| Q8 | Histórico que falha depois do status | **paridade** (ignora, como o painel); `BL-051` | §3.2, §6, R6 |
| Q9 | Retentativa de `MAA-15` | **pula** o passo do rastreio só em `enviar` e só com código igual; "Tentar de novo" reexecuta com o mesmo código sem reabrir a folha (a), e a folha reabre com o código (b) | §3.5, §4, §5.2 |
| Q10 | `fraseDaAcaoSoNoCore` | **incluir**, com âncora positiva, CRLF/LF e o inverso de `ACCESS_UNCHECKED` | §8.4 |
| Q11 | `AD-059` | **aceita** com os dois ajustes (escopo declarado; `avisar` × `notify`) | §12, `.specs/STATE.md` |

### 14.2 Assunções que seguem **n — confirmar** (não bloqueiam as Tasks; padrão conservador)

| Id | Assunção | Padrão adotado |
| --- | --- | --- |
| Q7 | prazo da confirmação | 5 s, a nova substitui a anterior e reinicia o prazo |
| A8 | código do rastreio | ≥ 8 caracteres, sem formato imposto, normalizado em maiúsculas sem espaços |
| A11 | textos de confirmação | no tom memorial, sem prometer e-mail quando `sent` é falso |
| A17 | quando o lembrete aparece | só com telefone válido e só em `aguardando_material` |
| A23 | voltar do Android | fecha a folha sem sair do pedido |
| A24 | zero linhas no painel | vira erro ("Nenhum pedido foi alterado."), inalcançável na prática |

### 14.3 Issues do portão e onde foram corrigidas

| Issue | Correção |
| --- | --- |
| rastreabilidade incompleta (16 requisitos sem menção) | §15, tabela completa `MAA-01`..`MAA-41` |
| "Tentar de novo" de `PARTIAL_TRACKING` não especificado | §3.5 (a) e (b), §4 (`valorInicial`, `ErroDaAcao`), §5.2, casos em §9 |
| tradução dos desfechos de `writeMaterialStatus` no painel | §3.3, tabela e a mudança benigna da exceção síncrona |
| `notify` (função) × `notify` (booleano) | §3.2 e §4: o booleano é `avisar` |
| escopo do guarda e de `AD-059` sem `tools/catalog-import` | §3.2, §8.1, §12 |
| `@supabase/supabase-js` não declarado em `core` | §2.3: `peerDependency` + medição de `tsc` contra os 11 herdados |
| `fraseDaAcaoSoNoCore` casando largo demais / sem âncora | §8.4 |
| posição do `AvisoDaAcao` sem prova | §3.6 e §13 item 6 |

---

## 15. Rastreabilidade — requisito → componente → teste

Toda task da fase seguinte cita os `MAA-xx` que fecha; um requisito sem linha aqui é requisito sem
task (o que custou o `ABN-07` na `53`). "`<App />`" = `pages/__tests__/acoesDoPedido.test.tsx`;
"real" = `app/__tests__/acoesComClientReal.test.tsx`; "nav" = §13 (prova em navegador).

| Req | O que exige | Componente(s) | Teste(s) |
| --- | --- | --- | --- |
| MAA-01 | rodapé "Recebi o material"; cancelado/entregue sem rodapé | `appPrimaryAction`, `RodapeDaAcao` | `appAction.test.ts` (§5.1); `<App />`; nav 1–2 |
| MAA-02 | RPC uma vez, `material_status_changed` só com `ok`, confirmação, releitura | `writeMaterialStatus`, `runAppAction`, `useAcaoDoPedido` | `order-actions/__tests__/material.test.ts`; `useAcaoDoPedido.test.tsx`; `<App />`; probe 01 |
| MAA-03 | `invalid_transition` ⇒ motivo de `materialTransitionRefusal`, releitura | `writeMaterialStatus`, `useAcaoDoPedido` | `material.test.ts`; `useAcaoDoPedido.test.tsx`; `<App />` |
| MAA-04 | `not_admin` ⇒ recusa; `order_not_found` ⇒ "Não encontrei este pedido." | `writeMaterialStatus` (`sem-papel`), `gravarAcao` (lança 42501), `useRecusaDePapel` | `gravarAcao.test.ts`; `<App />`; real |
| MAA-05 | idempotente: confirmação sem e-mail | `actionConfirmation` | `appAction.test.ts` (linha de A11); `<App />` |
| MAA-06 | rodapé "Iniciar separação" em `paid` | `appPrimaryAction`, `RodapeDaAcao` | `appAction.test.ts`; `<App />` |
| MAA-07 | material antes, status só com `ok`, `expectedFrom 'paid'` | `runAppAction` (plano `separar`), `writeOrderStatus` | `order-actions/__tests__/appAction.test.ts` (ordem, `L-050`) |
| MAA-08 | uma linha de histórico, um `order_status_changed`, `material_status_changed` só quando mudou | `writeOrderStatus`, `runAppAction` | `order-actions/__tests__/status.test.ts`, `appAction.test.ts`; probe 01 |
| MAA-09 | transição recusada ⇒ status não gravado, motivo | `runAppAction`, `useAcaoDoPedido` | `order-actions/__tests__/appAction.test.ts` (passo 2 não roda); `<App />` |
| MAA-10 | folha "Marcar como enviado"/"Salvar rastreio" pelo rodapé | `trackingSheet`, `FolhaDoRastreio`, `useFolhaNoHistorico` | `appAction.test.ts`; `<App />` |
| MAA-11 | "Informar"/"Alterar" na Entrega; frase pelos quatro pares | `trackingEdit`, `trackingSheet`, `EditarRastreio` | `appAction.test.ts` (os quatro casos); `<App />`; nav 2 |
| MAA-12 | código recusado sem rede; normaliza ao digitar | `normalizeTrackingCode`, `trackingCodeRefusal`, `FolhaDoRastreio` | `tracking.test.ts`; `<App />` (zero chamadas no dublê) |
| MAA-13 | ordem rastreio → status → histórico → um aviso; zero linhas no passo 1 ⇒ nada | `runAppAction`, `writeTrackingCode`, `writeOrderStatus` | `order-actions/__tests__/appAction.test.ts`; `<App />`; probe 01 |
| MAA-14 | de `shipped`/`delivered` só o código; confirmação sem e-mail em `delivered` | `trackingSheet` (`guarda`, `citaEmailSeEnviado`), `actionConfirmation` | `appAction.test.ts` (core, `delivered` sem código com `sent: true`); `order-actions/__tests__/tracking.test.ts` |
| MAA-15 | parcial do rastreio + "Tentar de novo" grava só o que falta | `runAppAction` (pulo), `ErroDaAcao.retentativa`, `trackingSheet.valorInicial` | `order-actions/__tests__/appAction.test.ts`; `useAcaoDoPedido.test.tsx` (a); `appAction.test.ts` core (b); `<App />` |
| MAA-16 | retirada sem folha, sem "Informar/Alterar", sem "Marcar como enviado" | `appPrimaryAction`, `trackingSheet`/`trackingEdit` ⇒ `null` | `appAction.test.ts` (todo status); `<App />` (rodapé, Entrega, cartão) |
| MAA-17 | lembrete só em `aguardando_material`, não cancelado, telefone válido | `canChargeMaterial`, `LembreteDoEnvio` | `appAction.test.ts`; `<App />`; nav 2 |
| MAA-18 | abre `wa.me` em nova aba, idade com `lido_em`, nada gravado | `chargeMaterialUrl`, `LembreteDoEnvio` | `charge.test.ts`; `<App />` (`href`, `target`, zero escrita); nav 9 |
| MAA-19 | mensagem sem material, sem urgência, byte a byte a do painel | `core/orders/charge.ts` | `charge.test.ts` (textos por extenso); painel `orderList.test.ts` intocado + `lembreteNoCore.test.ts` (`toBe`); nav 9 |
| MAA-20 | trava "Salvando…"; segundo toque não sai; cartão e detalhe juntos | `travas.ts`, `useAcaoDoPedido`, `RodapeDaAcao`, `BotaoDaAcao` | `useAcaoDoPedido.test.tsx` (mesmo tique); `<App />` |
| MAA-21 | zero linhas ⇒ conferir papel ⇒ recusa ou "mudou" | `gravarAcao` + `conferirPapel` | `gravarAcao.test.ts`; `<App />`; real |
| MAA-22 | rede/5xx ⇒ "Não consegui salvar", nunca recusa | dono (`falhou`), `gravarAcao`, `useAcaoDoPedido` | `order-actions/__tests__/*`; `gravarAcao.test.ts`; real (PATCH 500) |
| MAA-23 | conta sem papel não muda pedido, cai na recusa | RLS + `gravarAcao`, `useRecusaDePapel` | real (PATCH `[]` + `atelie_clock` 403); probe 01 (conta sem papel) |
| MAA-24 | aviso falha ⇒ gravação vale, confirmação sem e-mail | `triggerOrderNotification`, `actionConfirmation` | `order-actions/__tests__/notify.test.ts`; `appAction.test.ts` core |
| MAA-25 | sem conexão ⇒ tela da `72`, nada enfileirado | `useOnline` (72), nenhuma fila | `<App />` (offline: zero escrita no dublê) |
| MAA-26 | Realtime: rodapé reflete estado novo; folha velha fecha com "mudou" | `useFolhaNoHistorico`, `RodapeDaAcao` | `<App />` com `emitir()` |
| MAA-27 | painel delega ao mesmo dono; nenhuma asserção do painel tocada | `useAdminOrders`, `notifyOrder` | `useAdminOrders.delega.test.ts`; suíte do painel verde; `git diff` do teste antigo só no dublê; `pedidoGravadoSoPeloDono` (metade positiva) |
| MAA-28 | `chargeMaterial*` em `core`, entrada estrutural, painel reexporta por `toBe` | `core/orders/charge.ts`, `chargeMaterial.ts` | `charge.test.ts`; `lembreteNoCore.test.ts` |
| MAA-29 | nenhuma escrita/RPC/invoke no app fora da porta; `MAP-49` vale | `gravarAcao.ts` | `escritaSoPelaPorta.test.ts`; `regraDePedidoSoNoCore` |
| MAA-30 | `marcacaoSoPorAcao` verde por igualdade | — (nenhuma RPC nova) | `marcacaoSoPorAcao.test.ts` (loja) |
| MAA-31 | rodapé fixo sem cobrir o último bloco; sem rolagem horizontal; alvos ≥ 44 px | `RodapeDaAcao` (+ reserva de altura), todos os alvos | `<App />` (classes por token exato); nav 1–2 |
| MAA-32 | folha: teclado, foco preso, voltar fecha, F5 com `replace` | `FolhaDoRastreio`, `useFolhaNoHistorico`, `useTecladoVirtual` | `<App />` (sentinela do histórico, `L-053`); `useTecladoVirtual.test.ts`; nav 3–4 |
| MAA-33 | 130 e 200 % de fonte sem sobrepor | todos os componentes de UI novos, `AvisoDaAcao` | nav 6 |
| MAA-34 | menos movimento; `movimentoDosPedidos` ampliado | classes `motion-reduce:data-[state=…]` | `movimentoDosPedidos.test.ts` (âncora recontada); nav 5 |
| MAA-35 | confirmação `role="status"` sem roubar foco, some sozinha; erro `role="alert"` fica | `AvisoDaAcao`, `avisos.ts`, `erros.ts` | `<App />` (foco, relógio falso de 5 s, exclusividade `L-063`); nav 8 |
| MAA-36 | botão do cartão com a mesma ação, trava e folha | `BotaoDaAcao`, `appPrimaryAction`, `LinhaDoPedido` (tom) | `<App />` pelo cartão; `useAcaoDoPedido.test.tsx` (cartão + detalhe) |
| MAA-37 | lista relê na mesma posição; pedido sai do recorte | `useAcaoDoPedido` (três chaves), `useRolagemRestaurada` | `useAcaoDoPedido.test.tsx` (`isInvalidated`); `<App />`; nav 4 |
| MAA-38 | retirada: "Marcar como retirado", `separating → delivered`, histórico, aviso | `appPrimaryAction`, `runAppAction` (plano `status`) | `appAction.test.ts` core; `order-actions/__tests__/appAction.test.ts`; `<App />` |
| MAA-39 | escrita de `orders`/histórico só pelo dono; allowlist `cancelOrder` | `core/order-actions` | `pedidoGravadoSoPeloDono.test.ts` (loja) |
| MAA-40 | material em produção, status falhou ⇒ parcial + retentativa só do status | `runAppAction`, `ErroDaAcao.retentativa` | `order-actions/__tests__/appAction.test.ts`; `useAcaoDoPedido.test.tsx`; `<App />` |
| MAA-41 | três chaves invalidadas em todo desfecho; vizinha não | `useAcaoDoPedido` | `useAcaoDoPedido.test.tsx` (`isInvalidated`, com a vizinha) |
