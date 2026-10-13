# 63 — Retirada no escritório · Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Commits — regra do projeto sobrepõe a da Skill** (`CLAUDE.md`, `BL-012`): **não** commitar por
> task. Os commits da implementação saem juntos, ao fim da feature, depois do Verifier.

---

**Design**: `.specs/features/63-retirada-no-escritorio/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `CLAUDE.md` (raiz — baselines, guardas, "mobile primeiro", "prove que grava"), `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, `vitest.config.ts` de cada workspace.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| `packages/core` (regra pura) | unit | 1:1 com as ACs; faixa de CEP nas bordas; todo ramo de `pickupRefusal`; alcance Deno | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Store — features/entities (UI) | component (vitest + RTL) | cada AC de tela com asserção sobre o **literal** (L-036) e nos dois sentidos (aparece / não aparece) | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Store — guardas de disco | unit (fonte) | âncora de contagem + sensor | `apps/store/src/shared/lib/__tests__` | idem |
| Backoffice — UI e model | component / unit | AC de tela com literal; `nextStep` nos dois tipos de pedido | `apps/backoffice/src/**/*.test.ts(x)` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Edge functions (handlers) | unit com dublê | happy + recusa + "nada gravado"; dublê que **enxerga** a leitura de `store_settings` | `supabase/functions/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Migration | guarda de fonte + probe SQL local | aditiva e idempotente; default igual ao TS | `storeSettingsDefaults.test.ts` | store, acima |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | task de um workspace | o comando do workspace tocado, exit code fora de pipe |
| Full | fim de cada fase | os cinco workspaces, **um por vez** (store e backoffice com `--testTimeout=20000`, sem `--`) |
| Build | fim da feature | `pnpm build` + `pnpm lint` (≤ 26/7) + `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` (0 · 0) + `git diff --name-only -- packages/core/src/payment` vazio |

**Baseline de entrada**: medir com a árvore parada **antes** da T01 (a tabela do `CLAUDE.md` pode estar velha — a árvore tem mudanças não commitadas de outra sessão).

---

## Execution Plan

```
Fase 1 (core)      T01 → T02
Fase 2 (loja)      T03 → T04 → T05 → T06
Fase 3 (servidor)  T07 → T08
Fase 4 (pós-compra) T09 → T10 → T11 → T12 → T13
Fase 5 (fecho)     T14
```

---

### Fase 1 — Regra e configuração

#### T01 · `01-dono-da-retirada`

- **O quê**: `packages/core/src/shipping/pickup.ts` (constantes, `isRsCep`, `pickupLocation`, `pickupAvailable`, `pickupRefusal`, `isPickupOrder`), export no barrel com `.ts`, e `formatPickupReady` em `estimate.ts`.
- **Requisitos**: RET-02, RET-03, RET-05, RET-13 (regra)
- **Depends on**: —
- **Tests**: `core/shipping/__tests__/pickup.test.ts` — bordas da faixa (`89999-999` ✗, `90000-000` ✓, `99999-999` ✓, 7 dígitos ✗, com máscara ✓, `null` ✗); `pickupLocation` sem `number`/`complement` **mesmo com os dois preenchidos** (L-013: valores distintos e reconhecíveis); `null` com rua, bairro ou cidade em branco (um caso por campo, L-010); cada ramo de `pickupRefusal` (desligada, sem endereço, CEP fora, custo ≠ 0, tudo certo ⇒ `null`). Estender o guarda `denoReach` de `core` (ou criar `shipping/__tests__/denoReach.test.ts`) para `pickup.ts`. `formatPickupReady` em `estimate.test.ts`.
- **Done when**: quick gate de `core` verde.
- **Status**: ✅ done — `pickup.ts` (zero imports; exporta também `PICKUP_REFUSAL = 'pickup_unavailable'`; `pickupAvailable`/`pickupRefusal` exigem `enabled === true` estrito — quem lê o jsonb cru resolve o default antes), barrel com `.ts`, `formatPickupReady` em `estimate.ts`; testes `pickup.test.ts` (30), `shipping/__tests__/denoReach.test.ts` (8, com remoção de comentário após normalizar CRLF; mutação real provada), +2 em `estimate.test.ts`. core 2704 → 2744.

#### T02 · `02-interruptor-nasce-ligado`

- **O quê**: `ShippingSettings.pickup_enabled` + `DEFAULT_SHIPPING.pickup_enabled = true` (`packages/supabase/src/types/settings.ts`); `DbOrder.shipping_service_id`; migration `supabase/migrations/20261011120000_63-retirada.sql` (`update store_settings set value = value || '{"pickup_enabled": true}' where key = 'shipping' and not value ? 'pickup_enabled'`).
- **Requisitos**: RET-20 (dado)
- **Depends on**: —
- **Tests**: `storeSettingsDefaults.test.ts` passa a ler a migration da `63` e a comparar `pickup_enabled` com o default do TS; asserção de aditividade (`value ||`) e idempotência (`not value ?`), cada uma com sensor por mutação (L-033). Probe SQL no banco local (aplicar duas vezes; segunda é no-op).
- **Done when**: store quick gate verde; `tsc` dos dois apps em 0.
- **Status**: ✅ done — `pickup_enabled` + default `true`, `DbOrder.shipping_service_id?`, migration `20261011120000_63-retirada.sql` (prefixo livre conferido; escrita com `jsonb_build_object('pickup_enabled', true)` — mesmo efeito que o literal jsonb, e é a forma que `campoAditivo` lê). `storeSettingsDefaults.test.ts` +10 (aditiva, idempotente, só `shipping`, sem escrita de pedido; sensores por mutação com `mutar()` que lança). Probe no Postgres local em transação com `rollback`: 1ª aplicação `UPDATE 1` preservando os outros campos, 2ª `UPDATE 0`, e não religa depois de desligada. tsc 0 · 0.

### Fase 2 — Loja

#### T03 · `03-hook-da-retirada`

- **O quê**: `apps/store/src/entities/pickup/` — `usePickupOption(cep)` → `{ location, readyLabel } | null`; barrel.
- **Requisitos**: RET-01 (dados), RET-05
- **Depends on**: T01, T02
- **Tests**: hook com settings dublado: CEP RS + ligada + endereço ⇒ objeto com a linha exata e `a partir de {data}` com `handling_days` úteis (data fixa); desligada ⇒ `null`; sem rua ⇒ `null`; CEP SP ⇒ `null`.
- **Done when**: store quick gate verde.
- **Status**: ✅ done — `entities/pickup` (`usePickupOption(cep)` → `{ location, readyLabel } | null`, e `usePickupOptionState(cep)` → `{ option, settled }`, lendo `useStoreSettings()`; `settled` = `isFetched`, para "ainda não sei" não desfazer retirada restaurada). 8 testes.

#### T04 · `04-retirada-na-pagina-do-produto`

- **O quê**: `features/shipping-calc/ui/ShippingCalc.tsx` — grupos "Envio a domicílio"/"Retirar em", a retirada também quando a cotação falha ou volta vazia.
- **Requisitos**: RET-01, RET-02, RET-03, RET-04, RET-05
- **Depends on**: T03
- **Status**: ✅ done — grupo `Retirar em` (lista rotulada) abaixo dos Correios, que ganham `Envio a domicílio` só quando há retirada; a retirada responde ao CEP **consultado**. O componente que lê a configuração (`CalcResultsWithPickup`) só monta para CEP do RS — é o que mantém os casos antigos (e os testes de `ProductInfo` que dublam só `useShippingSettings`) sem edição. +9 casos; o mock do arquivo ganhou `useStoreSettings` (nenhum caso antigo editado). Dois mutantes (retirada só com cotação; número na linha) morrem por asserção.
- **Tests**: `ShippingCalc.test.tsx` — com CEP `91240-010`: título `Retirar em`, a linha **inteira** (L-009), `Pronta para retirada a partir de …`, `Grátis`; o número `455` e o complemento **ausentes** do DOM; com `01310-100`: nenhum `Retirar em`; cotação com erro + CEP RS: mensagem de erro **e** retirada; retirada desligada ⇒ ausente; sem RS ⇒ lista igual à de hoje (casos antigos sem edição).
- **Done when**: store quick gate verde.

#### T05 · `05-retirada-no-checkout`

- **O quê**: `features/checkout/ui/DeliveryBlock.tsx` — `pickupOption` separado, dois grupos, seleção, faixa recolhida, limpeza do rascunho quando a retirada deixa de estar disponível.
- **Requisitos**: RET-06, RET-08, RET-09, RET-10, RET-11
- **Depends on**: T03
- **Status**: ✅ done — `PickupSource` (só monta para CEP do RS) lê a opção e a entrega ao bloco; a retirada fica **fora** de `options`. Desfaz a escolha quando a retirada some com a configuração carregada (nunca enquanto carrega) e quando o CEP do rascunho não é do RS. Recolhido mostra `Retirada no escritório` + linha + `Grátis`. +14 casos (51 antigos sem edição; mock ganhou `useStoreSettings`). 6 mutantes, 6 mortos por asserção.
- **Tests**: `DeliveryBlock.test.tsx` — os dois grupos rotulados com CEP RS; selecionar a retirada grava `{ serviceId: 'retirada', serviceName: 'Retirada no escritório', cost: 0, estimateMin: '', estimateMax: '' }`; **com endereço `is_default` do RS, a pré-seleção continua sendo o PAC/SEDEX mais barato** (RET-08, não a retirada); com o frete grátis atingido, o mais barato dos Correios continua `Grátis` e a retirada não "rouba" (L-013: preços distintos); cotação vazia ⇒ "Frete padrão" **e** retirada; trocar para CEP de SP desfaz a escolha e esconde a opção; rascunho restaurado com `retirada` e o interruptor desligado ⇒ `shipping` volta a `null`; recolhido mostra `Retirada no escritório` + a linha, e **não** "Chega"/"Prazo confirmado"; sem número da cliente o bloco segue incompleto (RET-09). Casos SHP-05/SHP-06/ADR-02 existentes **sem edição**.
- **Done when**: store quick gate verde.

#### T06 · `06-pedido-de-retirada-gravado`

- **O quê**: `features/checkout/lib/buildOrderPayload.ts` — nada novo esperado; fixar por teste. Se `CheckoutPage` precisar, mensagem do 422.
- **Requisitos**: RET-07
- **Depends on**: T05
- **Status**: ✅ done — nenhum código novo em `buildOrderPayload`; +3 casos fixam o contrato. `CheckoutPage.test.tsx` +2 pela página real (retirada ⇒ CTA `R$ 95,00` e payload `retirada`/`Retirada no escritório`/custo 0/sem datas; par com PAC ⇒ `R$ 109,90`). Nenhuma mensagem nova para o 422 — a página já trata erro de criação (fica para a T07 conferir). Mutantes de fiação (sem a fonte no bloco aberto; custo do rascunho) morrem por asserção.
- **Tests**: `buildOrderPayload.test.ts` — rascunho de retirada ⇒ `shipping_service_id: 'retirada'`, `shipping_method: 'Retirada no escritório'`, `shipping_cost: 0`, `delivery_estimate_min/max` **ausentes**, endereço da cliente presente; `CheckoutPage.test.tsx` — total sem frete com retirada escolhida (fiação pela página real, não composição no teste).
- **Done when**: store full gate verde.

### Fase 3 — Servidor

#### T07 · `07-checkout-recusa-retirada-forjada`

- **O quê**: `supabase/functions/checkout/handlers.ts` — recusa 422 `pickup_unavailable` antes do `insert`, lendo `store_settings` só para pedido de retirada.
- **Requisitos**: RET-12, RET-13
- **Depends on**: T01
- **Tests**: `createOrder.test.ts` — um caso por ramo (CEP SP, custo `9.9`, desligada, `material` sem rua) ⇒ 422 **e** zero `insert` em `orders`/`order_items`; retirada válida ⇒ 201 com `shipping_service_id: 'retirada'` gravado; pedido Correios **não** lê `store_settings` (o dublê precisa registrar as tabelas lidas — `L`/memória "dublê que não enxerga"); retentativa idempotente de retirada já gravada continua devolvendo o pedido.
- **Done when**: functions quick gate verde.
- **Status**: ✅ done — `recusaDeRetirada` em `checkout/handlers.ts` (import relativo de `pickup.ts`), logo depois da idempotência e antes da identidade (que não escreve) e de qualquer `insert`; lê `store_settings` por `.eq('key', 'shipping'|'material')` só para pedido de retirada; `pickup_enabled` ausente ⇒ ligada (`?? true`); `Number(shipping_cost)` (ausente ⇒ `NaN` ⇒ recusa). `createOrder.test.ts` +11 (fixtura de `store_settings` como FUNÇÃO que registra as chaves lidas — sem mudar o dublê compartilhado): válida grava; chave ausente = ligada; CEP SP, custo 9,9, custo ausente, desligada, sem rua, sem `material` ⇒ 422 com `inserts`/`updates`/`upserts`/contas vazios; Correios não lê `store_settings`; retentativa de retirada já gravada devolve o pedido. 5 mutantes, 5 mortos por asserção.

#### T08 · `08-sem-etiqueta-para-retirada`

- **O quê**: `supabase/functions/melhor-envio/index.ts` — `handleCreate` lê `shipping_service_id` e recusa 422 `pickup_order` antes da API (import relativo `.ts` de `pickup.ts`).
- **Requisitos**: RET-15
- **Depends on**: T01
- **Tests**: `supabase/functions/_shared/__tests__/retiradaSemEtiqueta.test.ts` — fonte sem comentário (CRLF normalizado, L-031): `isPickupOrder(` aparece em `handleCreate` **antes** do primeiro `fetch(`; sensor com a ordem invertida e sensor com a chamada só em comentário. `wiringResolve.test.ts` segue verde (o import existe).
- **Done when**: functions quick gate verde; `deno check` da function, se disponível.
- **Status**: ✅ done — `handleCreate` recusa `422 { error: "pickup_order" }` logo depois do 404 e antes da primeira leitura de itens e de qualquer `meFetch`; o `select("*")` já traz a coluna (mantido). Guarda `_shared/__tests__/retiradaSemEtiqueta.test.ts` (10) pela AST do TypeScript: chamada antes da API, `if` devolvendo 422 + `pickup_order`, `select` com `*` ou a coluna, import do arquivo do dono com `.ts`; âncoras (arquivo, função, chamada à API) e 8 sensores (ordem invertida, chamada só em comentário LF/CRLF, só em string, status 200, select sem a coluna, import sem extensão/pelo barrel, função renomeada). 3 mutantes no arquivo real, 3 mortos por asserção. `wiringResolve` verde. **`deno check` não rodou** — Deno não está instalado nesta máquina.

### Fase 4 — Pós-compra

#### T09 · `09-interruptor-no-painel`

- **O quê**: `apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx` — `ToggleField` "Retirada no escritório" no cartão Frete (`SWITCH_TAP_44`), aviso quando ligada e o endereço do Material está incompleto.
- **Requisitos**: RET-20, RET-21
- **Depends on**: T01, T02
- **Tests**: o teste da seção — alternar e salvar envia `shipping.pickup_enabled`; aviso com o texto literal quando `street` vazio; sem aviso com endereço completo; sem aviso com a retirada desligada. `originZipNotRead` e `contadorComDonoUnico` verdes.
- **Done when**: backoffice quick gate verde.
- **Status**: ✅ done — `ToggleField` "Retirada no escritório" no cartão Frete (`SWITCH_TAP_44`), `checked = shipping.pickup_enabled ?? DEFAULT_SHIPPING.pickup_enabled` (chave ausente aparece ligada); `InfoBanner` `role="status"` quando ligada e `pickupLocation(data.material) === null` — lê o endereço **gravado**, não o que está sendo digitado. Não há arquivo de teste da seção: os casos foram para `AdminSettingsPage.test.tsx` (que monta a seção real pela rota), +13 — chave ausente = ligada; desligada; salvar `false`/`true`; alvo de 44; aviso com a frase inteira no Material vazio; um caso por campo (rua, bairro, cidade) com `'   '`; sem número/complemento ⇒ sem aviso; completo ⇒ sem aviso; desligada ⇒ sem aviso; desligar na tela tira o aviso. 4 mutantes, 4 mortos por asserção.

#### T10 · `10-pedido-de-retirada-no-painel`

- **O quê**: `AdminOrderPage.tsx` (linha `Retirada no escritório` no cartão Entrega) e `MelhorEnvioTab.tsx` (sem cotação/etiqueta para retirada).
- **Requisitos**: RET-14
- **Depends on**: T01, T02
- **Tests**: `AdminOrderPage.test.tsx` renderizando a **página** com pedido de retirada: literal presente, botão de criar etiqueta ausente, nenhum `invoke('melhor-envio…')`; pedido Correios: inalterado.
- **Done when**: backoffice quick gate verde.
- **Status**: ✅ done — cartão Entrega: bloco `Retirada no escritório` + `PickupLocation` (novo, `entities/order/ui`, lê `useMaterialSettings` e chama `pickupLocation`; montado **só** para retirada, então os casos antigos sem `QueryClient` seguem intocados) e o bloco "Rastreio da joia (saída)" **some** para retirada (desvio: a spec não pede; sem isso "Salvar rastreio" levaria a retirada a `shipped`). `MelhorEnvioTab`: retirada ⇒ "Pedido de retirada no escritório — sem etiqueta.", sem cotar/gerar. **Arquivo novo** `AdminOrderPage.retirada.test.tsx` (8), porque `AdminOrderPage.test.tsx` dubla o `MelhorEnvioTab` inteiro: aqui o bloco é o REAL, montado pela página, com `supabase.functions.invoke` espionado (zero chamadas). 4 mutantes, 4 mortos por asserção.

#### T11 · `11-proximo-passo-da-retirada`

- **O quê**: `features/order-detail/model/nextStep.ts` — retirada: `separating → delivered`, rótulo `Marcar como retirado`.
- **Requisitos**: RET-16
- **Depends on**: T01, T02
- **Tests**: `nextStep` com o mesmo pedido variando só `shipping_service_id` (retirada ⇒ `delivered`; Correios ⇒ `shipped`); `paid` e `shipped` inalterados para os dois.
- **Done when**: backoffice quick gate verde.
- **Status**: ✅ done — retirada em `separating` ⇒ `{ status: 'delivered', label: 'Próximo passo: Retirado no escritório', actionLabel: 'Marcar como retirado' }`; `NextStep.actionLabel?` (opcional, os `toEqual` antigos não mudam) lido pelo botão de `OrderNextStep`. A pendência "sem rastreio" de `shipped → delivered` deixou de valer para retirada (levada a `shipped` à mão). Conferido: as outras lógicas de "enviado sem rastreio" (`rowSummary`, `orderQuery`, `useAdminOrderList`, `AdminClientPage`) são todas recortadas por `status = 'shipped'`, que a retirada não alcança pelo próximo passo — nada a mudar. `orderDetail.test.ts` +5 (pares Correios × retirada) e 2 casos pela página em `AdminOrderPage.retirada.test.tsx`. 3 mutantes, 3 mortos por asserção.

#### T12 · `12-avisos-da-retirada`

- **O quê**: `core/notifications/precondition.ts` (`order_shipped` ⇒ `pickup_order`), `send-notification` (`ORDER_COLUMNS`, `EmailOrder`, bloco `Retirada` no HTML e no texto).
- **Requisitos**: RET-17, RET-18
- **Depends on**: T01
- **Tests**: `precondition` — retirada com `status: 'shipped'` **e** `tracking_code` preenchido ⇒ `pickup_order` (o caso que só esta regra recusa); Correios igual a hoje. `render`/`layout` — e-mail de retirada contém `Retirada` e a linha, **não** contém o endereço da cliente nem `455`; Correios mantém `Entrega`. `denoReach`/`wiringResolve` verdes.
- **Done when**: core e functions quick gates verdes.
- **Status**: ✅ done — `precondition.ts` importa `../shipping/pickup.ts` e recusa `pickup_order` antes das outras checagens; `OrderSnapshot.shipping_service_id`. `send-notification`: `ORDER_COLUMNS` e o `select` da prévia ganham a coluna; `EmailOrder.shipping_service_id`; `renderEmail` ganha um 6º parâmetro opcional `pickup` (o `store_settings.material` cru — o motor já o lia; a prévia passou a guardá-lo também); `addressBlock`/`textBody` escrevem `Retirada` + `Retirada no escritório` + a linha de `pickupLocation` (sem a linha quando o escritório não está completo — nunca o endereço da cliente). Testes: `precondition.test.ts` +4, `render.test.ts` +5, `dispatch.test.ts` +3 pela fiação do MOTOR, com a fixtura de `orders` como função do `select` (sem a coluna no `select`, ela não chega). 7 mutantes, 7 mortos por asserção. **A prévia (`handlers.ts`) não tem caso próprio** para a retirada.

#### T13 · `13-retirada-na-conta-da-cliente`

- **O quê**: `core/orders/journey.ts` (omite `shipped`, rótulo `Retirado no escritório`) e `entities/order/ui/OrderPaymentDelivery.tsx` (local de retirada no lugar do endereço).
- **Requisitos**: RET-19
- **Depends on**: T01, T03
- **Tests**: `journey.test.ts` — retirada: chaves sem `shipped`, último rótulo literal; Correios: as seis etapas de hoje. `OrderPaymentDelivery` — retirada mostra `Retirada no escritório` e a linha; Correios mostra o endereço. Pelo menos uma página real (`OrderConfirmationPage` ou `/pedido/:id`) renderizada com pedido de retirada.
- **Done when**: core e store quick gates verdes.
- **Status**: ✅ done — `journey.ts`: retirada OMITE `shipped`, a última etapa vira `Retirado no escritório` (`PICKUP_DONE_LABEL`). **Também** `situation.ts` (o selo da lista de `/conta` e do detalhe): chave e tom `delivered`, rótulo `Retirado` (`PICKUP_DELIVERED_LABEL`, a assunção da spec) — o arquivo deixou de ter zero import (agora importa `../shipping/pickup.ts`, comentário atualizado). Loja: `usePickupLocation()` em `entities/pickup` (sem o portão do CEP/interruptor — o pedido já é de retirada); `OrderPaymentDelivery` desenha `PickupDelivery` (montado só para retirada); `OrderSummary` do checkout diz só `Retirada no escritório` (era `Frete · Uma Estrelinha Retirada no escritório`). Testes: core `journey` +4, `situation` +3; loja `OrderPaymentDelivery.retirada.test.tsx` (3, arquivo novo — o irmão monta sem dublê de settings), `OrderSituationBadge` +2, `OrderSummary` +2, `OrderConfirmationPage` +3 pela página real (o `vi.mock` de `useStoreSettings` ganhou o export `useStoreSettings`). 7 mutantes, 7 mortos por asserção.

### Fase 5 — Fecho

#### T14 · `14-baselines-e-decisao`

- **O quê**: `AD-049` em `.specs/STATE.md` (dono único da retirada); handoff; `CLAUDE.md` raiz (próxima feature `64`, baselines medidas, linha na tabela do "defeito 01" se aplicável) e `apps/store/CLAUDE.md` (a retirada no frete).
- **Depends on**: T01–T13
- **Done when**: Build gate completo; números medidos um workspace por vez.
- **Status**: ✅ done — `AD-049` e o handoff da `63` em `.specs/STATE.md`; `CLAUDE.md` raiz (numeração → `64`, linha `63` no "defeito 01", os guardas `denoReach` de `shipping` e `retiradaSemEtiqueta`, baselines medidas); seções novas em `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md` e `supabase/CLAUDE.md`. Medido em 2026-10-11, um workspace por vez: core 2755/114 · store 4661/273 · backoffice 3145/174 · functions 951/20 · catalog-import 512/23 (12024/604); lint 26/7; tsc 0 · 0 · 0; `pnpm build` verde; `git diff --name-only -- packages/core/src/payment` vazio. **Sem commit** — Verifier e prova em navegador pendentes.

Depois da T14: **Verifier independente** (automático), prova em navegador em 390×844 e 1440 (página do produto e checkout com CEP RS e SP), e só então os commits.

#### Fix round 1 — o que a verificação independente cobrou (2026-10-11)

O Verifier devolveu **FAIL por cobertura** (45 mutantes, 7 sobreviventes reais, nenhum defeito de produto — ver `validation.md`). Consertado, sem afrouxar asserção nenhuma:

| Lacuna | Mudança | Mutantes reinjetados no arquivo real |
| --- | --- | --- |
| 1 · RET-15 (F05, F06) | A decisão de `handleCreate` saiu para `supabase/functions/melhor-envio/pickupGate.ts` (puro; importa `isPickupOrder` do dono com `.ts`), com `melhor-envio/__tests__/pickupGate.test.ts` (5). `index.ts` faz `const recusaRetirada = pickupGate(order)` e `if (recusaRetirada)`. `retiradaSemEtiqueta.test.ts` reescrito para medir a FIAÇÃO: o argumento é exatamente o nome ligado a `data` no primeiro `select`, a condição do `if` é exatamente o resultado, o `then` devolve `status`/`error` dele; 14 casos (12 sensores, inclusive as formas de F05 e F06) | F05, F06 e o portão invertido — **mortos por asserção** |
| 2 · RET-18 prévia (F07, F08, F13) | `send-notification/__tests__/handlers.test.ts`: `preview` com `order_id` de retirada, `orders` como função do `select`, `material` completo; e o par dos Correios (+2) | F07, F08, F13 — **mortos por asserção** |
| 3 · RET-08 (S03) | `DeliveryBlock.test.tsx`: `is_default` do RS com a cotação carregando no primeiro render e resolvida depois por `rerender` ⇒ `serviceId === '1'` | S03 — **morto por asserção** |
| 4 · C09 | `pickup.test.ts`: `enabled` `undefined`/`null` ⇒ indisponível e `pickup_unavailable` (+2) | C09 — **morto por asserção** |
| 5 · 422 `pickup_unavailable` | **Comportamento novo**: `PickupUnavailableError` em `entities/order/api/useOrders.ts`; `CheckoutPage` mostra `PICKUP_UNAVAILABLE_MESSAGE` ("A retirada no escritório não está disponível para este pedido. Escolha uma opção de envio."), desfaz a escolha (`shipping = null`) e reabre o bloco Entrega. Testes pela página real (retentativa com o PAC passa; par: falha genérica mantém a escolha) e pelo hook (+2 e +2) | ramo apagado, escolha não desfeita, bloco não reabre, hook não distingue — **4 mortos por asserção** |
| 6 · cupom + retirada | pino em `DeliveryBlock.test.tsx`: três "Grátis", PAC/SEDEX riscados, retirada custo 0 | — (pino de regressão) |
| 7 · RET-06 | "Envio a domicílio" virou grupo nomeado: `role="group"` + `aria-labelledby` no `DeliveryBlock` (só com a retirada na tela) e `aria-label` na lista da `ShippingCalc`; asserções por papel + nome nos dois, com o par de SP sem grupo | os dois nomes removidos — **mortos por asserção** |

Medido depois, um workspace por vez: core **2757/114** · store **4671/273** · backoffice 3145/174 · functions **962/21** · catalog-import 512/23 (**12047/605**); lint 26/7; tsc 0 · 0. Nenhum mutante morreu por compilação. **Sem commit.**

#### Fix round 2 — o que a rodada 2 da verificação cobrou (2026-10-11)

A rodada 2 devolveu **FAIL por cobertura** (28 mutantes, 7 sobreviventes reais, 1 equivalente, nenhum defeito de produto). O conserto da rodada 1 tinha **movido** o ônus de RET-15 para o guarda de fonte, e o guarda aceitava formas que ainda comprariam a etiqueta. Consertado sem afrouxar asserção nenhuma, e **sem tocar código de produto**:

| Lacuna | Mudança | Mutante reinjetado no arquivo real |
| --- | --- | --- |
| N01 · a recusa não precisava ser devolvida | `retiradaSemEtiqueta.test.ts`: exige `ReturnStatement` com `new Response` carregando `status` e `error` do portão; sensor com o `return` removido | **morto por asserção** |
| N02 · o `error` da fiação solto | mesma régua: o `error` é exatamente o do portão; sensor com `+ "_x"` | **morto por asserção** |
| N07 · o resultado reatribuível antes do `if` | exige `const` e nenhuma atribuição ao nome; sensores com `let` e com a anulação por flag | **morto por asserção** |
| N03 · chamada à API por acesso a propriedade | `globalThis.fetch`/`x.meFetch` contam como chamada à API; sensor antes do portão reprova, depois passa | **morto por asserção** |
| N18 · RET-12 só provada sem sessão | `createOrder.test.ts`: retirada forjada (CEP de SP, e custo ≠ 0) **com** `Authorization: Bearer` ⇒ 422 e nada gravado (+2) | pular a recusa com sessão — **morto por asserção** |
| N19 · `usePickupLocation` sem portão, sem teste | `OrderPaymentDelivery.retirada.test.tsx`: `pickup_enabled: false` ⇒ a linha do escritório continua (+1) | portão do interruptor no hook — **morto por asserção** |
| N15 · o par de RET-06 no checkout | `DeliveryBlock.test.tsx`: no CEP de SP, o botão dos Correios não está dentro de grupo nenhum | `role="group"` incondicional — **morto por asserção** |

Os 7 reinjetados um por vez, arquivo restaurado e conferido por SHA-256. `apps/store/CLAUDE.md` corrigido: o 422 da retirada deixou de cair no toast genérico desde a rodada 1, e o texto ainda dizia o contrário. **Sem commit.**


#### Fix round 3 — o guarda de fonte de RET-15 virou prova de execução (2026-10-11)

A rodada 3 devolveu **FAIL por cobertura só no guarda de RET-15**: 7 formas novas (G01–G07) que compravam a etiqueta e passavam pela régua de AST. Conserto recomendado pela própria verificação e aprovado pelo usuário: seguir `AD-004` também na `melhor-envio`.

| Mudança | Onde |
| --- | --- |
| `handleCreate` (e só ele) saiu do `index.ts` para `supabase/functions/melhor-envio/handlers.ts`, com `CreateDeps = { supabase, meFetch, sender }` injetados. Corpo idêntico (mesmas leituras, chamadas, corpos, gravação e respostas); `pickupGate.ts` continua o dono da decisão; imports relativos com `.ts` | `handlers.ts` (novo), `index.ts` (`case "create"` ⇒ `handleCreate({ supabase: adminClient(), meFetch, sender: ME_SENDER }, body)`) |
| Teste de unidade: retirada ⇒ 422 `pickup_order` + **zero** chamadas ao `meFetch` + nenhuma gravação; corpo hostil (`force`, `debug`, `bypass`…) idem; **par** dos Correios chegando ao carrinho; pedido sem serviço segue; 400; 404 com zero chamadas; ordem e corpos das quatro chamadas; gravação e resposta; 500 do carrinho sem id; `catch` do tracking. O dublê de `orders` só devolve `shipping_service_id` quando o `select` o pede (+10) | `melhor-envio/__tests__/handlers.test.ts` |
| Guarda de fonte encolhido (18 → 13): `index.ts` delega ao handler de `./handlers.ts` com as três deps reais e o `body`, no `case "create"`; `meFetch` é função do `index.ts` que chama `fetch`; imports de `handlers.ts` relativos com `.ts`; `body` lido uma vez, só `order_id`/`service_id`; portão importa do dono. Saíram as réguas de ordem/`if`/`return`/argumento/`select`, agora provadas executando | `_shared/__tests__/retiradaSemEtiqueta.test.ts` |

Mutantes reinjetados nos arquivos reais, suíte `functions` inteira por mutante, SHA-256 conferido na restauração, arnês que lança quando o alvo não aparece exatamente uma vez:

| # | Mutação (em `handlers.ts`, salvo indicação) | Resultado |
| --- | --- | --- |
| G01 | recusa aninhada em `if (body?.force !== true)` | morto · asserção (corpo hostil; `body` lido duas vezes) |
| G02 | recusa dentro de arrow nunca chamada | morto · asserção (422 + zero chamadas) |
| G03 | `await meFetch(cart)` dentro da recusa, antes do `return` | morto · asserção (zero chamadas) |
| G04 | `const me = meFetch; await me(cart)` antes do portão | morto · asserção (zero chamadas; ordem dos Correios) |
| G05 | helper de módulo `comprarEtiqueta(meFetch, order)` antes do portão | morto · asserção (zero chamadas; ordem dos Correios) |
| G06 | `try { recusa } finally { await meFetch(cart) }` | morto · asserção (zero chamadas) |
| G07 | `order` sombreado com `shipping_service_id: null` | morto · asserção (422) |
| N01 | recusa sem `return` | morto · asserção (422 + zero chamadas) |
| N07 | `let` + `if (body?.force === true) recusa = null` | morto · asserção (corpo hostil; `body` lido duas vezes) |
| F05 | `if (recusa && body?.force !== true)` | morto · asserção (corpo hostil; `body` lido duas vezes) |
| F06 | `pickupGate(order?.shipping_service_id)` | morto · asserção (422) |
| SEL | leitura de `orders` sem `shipping_service_id` | morto · asserção (422) |
| I01 | `index.ts`: `meFetch` trocado por dublê nas deps | morto · asserção (guarda de fonte) |
| I02 | `index.ts`: import de `./handlers.js` | morto · asserção (guarda de fonte) |

**14 mortos por asserção, zero por compilação, zero sobreviventes.** Limite declarado: o teste de corpo hostil amostra nomes de flag; o que torna a regra genérica é a régua de fonte "o `body` é lido uma vez" — uma flag vinda de outra origem que não o corpo nem as deps não é coberta por nenhuma das duas.

Boot local (Supabase de pé, container conferido vendo `handlers.ts`): `create` sem header ⇒ **401**; `create` com JWT de admin e pedido inexistente ⇒ **404** `Pedido não encontrado` (do handler novo); `quote` ⇒ **200** com PAC e SEDEX. Não há pedido de retirada no banco local, então o 422 não foi exercitado via HTTP.

Medido depois, um workspace por vez, exit code fora de pipe e `--testTimeout=20000`: functions **974/22** (969 + 10 − 5) · core 2757/114 · store 4672/273 · backoffice 3145/174 · catalog-import 512/23 (**12060/606**); lint 26/7 (backoffice 24/5 · store 2/2); tsc 0 · 0; `packages/core/src/payment/**` intocado. **Sem commit.**
---

## Validation

### Granularity

| Task | Atômica? |
| --- | --- |
| T01 | ✅ um módulo (+ formatador irmão) |
| T02 | ✅ um campo de configuração e a migration dele |
| T03 | ✅ um hook |
| T04 | ✅ um componente |
| T05 | ✅ um componente |
| T06 | ✅ um contrato (payload) |
| T07 | ✅ um handler |
| T08 | ✅ um handler |
| T09 | ✅ um componente |
| T10 | ✅ uma tela (página + aba dela) |
| T11 | ✅ uma função |
| T12 | ✅ uma regra + o render que a acompanha |
| T13 | ✅ uma regra de jornada + o componente que a exibe |
| T14 | ✅ documentação |

### Diagram ↔ Depends on

| Task | Depends on | Diagrama | ✓ |
| --- | --- | --- | --- |
| T02 | — | Fase 1 | ✅ |
| T03 | T01, T02 | Fase 2 após Fase 1 | ✅ |
| T04, T05 | T03 | após T03 | ✅ |
| T06 | T05 | após T05 | ✅ |
| T07, T08 | T01 | Fase 3 | ✅ |
| T09–T12 | T01 (+T02) | Fase 4 | ✅ |
| T13 | T01, T03 | Fase 4, após Fase 2 | ✅ |
| T14 | T01–T13 | Fase 5 | ✅ |

### Test co-location

| Task | Camada | Teste exigido | No "Tests" | ✓ |
| --- | --- | --- | --- | --- |
| T01 | core | unit | ✅ | ✅ |
| T02 | migration/config | guarda + probe | ✅ | ✅ |
| T03–T06 | store | component | ✅ | ✅ |
| T07 | function | unit com dublê | ✅ | ✅ |
| T08 | function sem handlers | guarda de fonte | ✅ | ✅ |
| T09–T11 | backoffice | component/unit | ✅ | ✅ |
| T12 | core + function | unit | ✅ | ✅ |
| T13 | core + store | unit + component | ✅ | ✅ |
| T14 | docs | build gate | ✅ | ✅ |

**Coverage:** 21 requisitos, 21 mapeados.
