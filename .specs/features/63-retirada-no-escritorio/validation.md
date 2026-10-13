# 63 — Retirada no escritório · Validação

**Verificador**: independente (autor ≠ verificador), 2026-10-11. Evidência-ou-zero: todo AC abaixo
tem `arquivo:linha` de uma asserção sobre o resultado definido na spec, e cada mutante foi injetado
**no arquivo real**, com cópia salva, restauração e comparação por SHA-256 (o arnês lança quando a
string alvo não é encontrada exatamente uma vez). Nenhum commit, nenhum `git stash`.

> **Rodada 3 (2026-10-11): ❌ FAIL — por cobertura, só no guarda de RET-15.** Os 7 sobreviventes da
> rodada 2 morrem por asserção, os 16 mutantes novos (core, loja, painel, functions, migration)
> morrem por asserção, o gate bate e todo AC tem asserção de resultado. Mas **7 formas novas de
> comprar etiqueta passam pelo guarda de fonte** (G01–G07): o guarda de RET-15 é uma lista de
> formas proibidas, e cada rodada acha a próxima. Recomendação: trocar o guarda de fonte por prova
> de comportamento (ver a seção **Rodada 3** no fim).
>
> **Rodada 2 (2026-10-11): ❌ FAIL — por cobertura.** Os 7 sobreviventes da rodada 1 morrem por
> asserção; o conserto abriu dois buracos novos no guarda de RET-15 (N01, N07) e o RET-12 com sessão
> não tem caso (N18). Ver a seção **Rodada 2** no fim.

## Veredito (rodada 1): ❌ FAIL — por cobertura, nenhum defeito de produto encontrado

Os 21 ACs têm evidência ancorada na spec, os cinco workspaces passam e os números batem
exatamente com os declarados. O FAIL vem do sensor: **7 mutantes não-equivalentes sobreviveram**,
concentrados em dois pontos que os próprios autores já tinham declarado fracos (a prévia do
`send-notification` e a recusa da `melhor-envio`), mais dois buracos pequenos de asserção.

**A prova em navegador continua pendente** (390×844 e 1440; página do produto e checkout com CEP do
RS e de SP). Ela é feita à parte, depois desta verificação.

---

## Gate medido (um workspace por vez, exit code fora de pipe, `--testTimeout=20000`)

| Medida | Declarado pelos autores | Medido | |
| --- | --- | --- | --- |
| core | 2755/114 | **2755/114**, exit 0 | ✅ |
| store | 4661/273 | **4661/273**, exit 0 | ✅ |
| backoffice | 3145/174 | **3145/174**, exit 0 | ✅ |
| functions | 951/20 | **951/20**, exit 0 | ✅ |
| catalog-import | 512/23 | **512/23**, exit 0 | ✅ |
| `tsc` store · backoffice | 0 · 0 | **0 · 0** | ✅ |
| lint | 26/7 | **26/7** (backoffice 24/5 · store 2/2) | ✅ |
| `git diff --name-only -- packages/core/src/payment` | vazio | **vazio** | ✅ |

**Alcance pelo Deno (verificado à mão, não pelo guarda)**: todo especificador relativo de
`pickup.ts`, `precondition.ts`, `journey.ts`, `situation.ts`, `format.ts`, `render/layout.ts`,
`render/email.ts`, `dispatch.ts`, `send-notification/handlers.ts`, `checkout/handlers.ts` e
`melhor-envio/index.ts` tem `.ts` explícito, incluindo o `import type { PickupAddress }` de
`email.ts`; nenhum alias `@estrelinha/*` entrou nesses grafos; nenhum comentário dos arquivos da
feature escreve uma forma de import sem extensão. `deno check` **não rodou** (Deno não está
instalado na máquina) — o `supabase start` ainda é a prova que falta.

---

## Checagem ancorada na spec

| AC | Resultado definido na spec | Evidência (`arquivo:linha` — asserção) | |
| --- | --- | --- | --- |
| RET-01 | grupo "Retirar em", linha `Escritório - Uma Estrelinha - …`, `Pronta para retirada a partir de {data}`, `Grátis` | `ShippingCalc.test.tsx:204` — `getByRole('list',{name:'Retirar em'})`, `getByText(LINHA)`, `'Pronta para retirada a partir de 14 de outubro'`, `'Grátis'`; `:214` ordem abaixo dos Correios | ✅ |
| RET-02 | fora do RS, sem "Retirar em" | `ShippingCalc.test.tsx:236` — `queryByText('Retirar em')` nulo, `/Escritório/` nulo; `pickup.test.ts:42–72` bordas da faixa | ✅ |
| RET-03 | sem número nem complemento | `pickup.test.ts:84`; `ShippingCalc.test.tsx:228` e `DeliveryBlock.test.tsx` (RET-06) — `/455/` e `/Sala 3/` ausentes | ✅ |
| RET-04 | cotação falha/vazia ⇒ retirada + mensagem de falha | `ShippingCalc.test.tsx:245,254` — mensagem **e** `LINHA`; mutante S01 morre | ✅ |
| RET-05 | desligada ou endereço incompleto ⇒ nenhuma superfície | `ShippingCalc.test.tsx:264,273`; `DeliveryBlock.test.tsx` "retirada desligada…"; `usePickupOption.test.tsx:74,81`; um campo por caso em `pickup.test.ts:107–119` | ✅ |
| RET-06 | dois grupos no checkout, retirada selecionável | `DeliveryBlock.test.tsx` "CEP do RS: dois grupos…" e "escolher a retirada grava…" (`aria-pressed`) | ✅ ⚠️ ver nota 1 |
| RET-07 | frete 0; `retirada` / `Retirada no escritório` / custo 0 / sem `delivery_estimate_*` | `CheckoutPage.test.tsx:2789` pela **página real** — CTA `R$ 95,00`, payload com os quatro campos; par PAC `R$ 109,90`; `buildOrderPayload.test.ts:257`; `OrderSummary.test.tsx:773` | ✅ |
| RET-08 | nunca pré-selecionada, nunca "a mais barata"; frete grátis por valor zera o PAC/SEDEX mais barato | `DeliveryBlock.test.tsx` "endereço is_default do RS…", "cotação com uma opção só…", "frete grátis atingido…" (`R$ 14,90` riscado, `R$ 24,80` não) | ✅ ⚠️ mutante S03 sobreviveu (gap 3) |
| RET-09 | endereço completo continua obrigatório | `DeliveryBlock.test.tsx` "…sem número, incompleto" — via `isDeliveryComplete` de `core`; `CheckoutPage.test.tsx:2789` — `address_number` no payload | ✅ ⚠️ nota 2 |
| RET-10 | CEP para fora do RS desfaz a escolha | `DeliveryBlock.test.tsx` "trocar para um CEP de São Paulo…" e "rascunho restaurado… CEP de fora do RS" (mutante S05 morre) | ✅ |
| RET-11 | recolhido: "Retirada no escritório" + linha, sem prazo | `DeliveryBlock.test.tsx` "recolhido com a retirada…" — `queryByText(/^Chega/)` e "Prazo confirmado…" nulos | ✅ |
| RET-12 | 422 `pickup_unavailable`, nada gravado, nos quatro ramos | `createOrder.test.ts:973` (CEP), "custo… diferente de zero", `:1000` (desligada), "sem rua", "sem `material`" — `toEqual({error:'pickup_unavailable'})` + `nadaGravado` (inserts/updates/upserts/contas vazios) | ✅ |
| RET-13 | dono único em `core/shipping`, alcançável pelo Deno | `shipping/__tests__/denoReach.test.ts`; imports relativos com `.ts` em `checkout/handlers.ts:31–34` e `melhor-envio/index.ts` | ✅ |
| RET-14 | painel: "Retirada no escritório", Melhor Envio sem cotação/etiqueta | `AdminOrderPage.retirada.test.tsx:131,141,163` — bloco REAL montado pela página, `invoke` com zero chamadas | ✅ |
| RET-15 | `create` recusa sem chamar a API | `retiradaSemEtiqueta.test.ts:160` (guarda de fonte) | ⚠️ mutantes F05/F06 sobreviveram (gap 1) |
| RET-16 | `separating → delivered`, rótulo "retirado" | `orderDetail.test.ts:242,267`; `AdminOrderPage.retirada.test.tsx:183` — botão "Marcar como retirado" pela página | ✅ |
| RET-17 | `order_shipped` ⇒ `pickup_order`, mesmo com `shipped` | `precondition.test.ts:321` (shipped + rastreio); `dispatch.test.ts:600` pelo motor, `fetch` com zero chamadas | ✅ |
| RET-18 | e-mail: "Retirada" + linha, sem número/complemento | `render.test.ts:817,832,841`; `dispatch.test.ts:619` pelo motor | ✅ motor · ❌ **prévia sem caso** (gap 2) |
| RET-19 | confirmação/`/pedido/:id`/`/conta`: "Retirada no escritório" + linha; jornada sem "A caminho", última "Retirado no escritório" | `OrderConfirmationPage.test.tsx:842,854` pela página real; `OrderPaymentDelivery.retirada.test.tsx:42`; `journey.test.ts:254`; `situation.test.ts:293`; `OrderSituationBadge.test.tsx:176` | ✅ |
| RET-20 | interruptor; migration aditiva e idempotente; default TS = SQL | `storeSettingsDefaults.test.ts:496–560` (sensores por mutação); `AdminSettingsPage.test.tsx` "interruptor existe… chave AUSENTE aparece ligada", salvar `false`/`true` | ✅ |
| RET-21 | ligada + Material incompleto ⇒ aviso | `AdminSettingsPage.test.tsx` "RET-21: ligada com o Material VAZIO…" + um caso por campo; sem aviso com a retirada desligada | ✅ |

### Edge cases

| Edge case | Evidência | |
| --- | --- | --- |
| CEP com menos de 8 dígitos | `pickup.test.ts:59` | ✅ |
| Rascunho restaurado com retirada e interruptor desligado ⇒ escolha desfeita; servidor recusa | `DeliveryBlock.test.tsx` "rascunho restaurado… desligada" (+ par "enquanto a configuração CARREGA: a escolha fica", mutante S04 morre); `createOrder.test.ts:1000` | ✅ |
| Cupom de frete grátis ⇒ retirada continua `Grátis`, PAC/SEDEX grátis | **nenhum caso** com cupom e retirada juntos | ⚠️ (verdadeiro nos dois mundos — a retirada é sempre `0` —, só pino de regressão) |

**Notas de precisão da spec**

1. RET-06 pede "dois grupos". Só "Retirar em" é `role="group"`; "Envio a domicílio" é um `<span>` de
   título. A asserção mede o texto, não um grupo — aceitável, mas a spec diz mais do que a tela faz.
2. RET-09 é "regra atual, sem mudança": a prova é `isDeliveryComplete` de `core` (não mudou), então
   é verdadeira nos dois mundos por construção. É o que a spec pede; registrado só para não ser lido
   como prova da tela.

---

## Sensor de discriminação — 45 mutantes

Arnês: `pnpm --filter @estrelinha/<ws> exec vitest run <escopo> --testTimeout=20000`; todo
sobrevivente foi **re-rodado na suíte inteira do workspace** antes de ser declarado sobrevivente.
Morte por compilação: **zero** (todas as mortes são por asserção).

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| C01 | `core/shipping/pickup.ts` | faixa do RS `=== '9'` → `>= '8'` | morto · asserção |
| C02 | `pickup.ts` | cidade deixa de ser exigida | morto · asserção |
| C03 | `pickup.ts` | número entra na linha | morto · asserção |
| C04 | `pickup.ts` | custo só recusado acima de 50 | morto · asserção |
| C05 | `core/notifications/precondition.ts` | `pickup_order` só fora de `shipped` | morto · asserção |
| C06 | `core/orders/journey.ts` | retirada volta a ter "A caminho" | morto · asserção |
| C07 | `journey.ts` | rótulo "Retirado no escritório" na etapa errada | morto · asserção |
| C08 | `core/orders/situation.ts` | "Retirado" na chave errada | morto · asserção |
| **C09** | `pickup.ts` | `enabled === true` → `enabled !== false` (`undefined` liga) | **SOBREVIVEU** (core inteiro, 2755 verdes) |
| F01 | `checkout/handlers.ts` | chave ausente ⇒ desligada | morto · asserção |
| F02 | `checkout/handlers.ts` | CEP do corpo ignorado | morto · asserção |
| F03 | `checkout/handlers.ts` | custo do corpo ignorado | morto · asserção |
| F04 | `checkout/handlers.ts` | gatilho lê `shipping_method` | morto · asserção |
| **F05** | `melhor-envio/index.ts` | `if (isPickupOrder(order) && body?.force !== true)` | **SOBREVIVEU** (functions inteiro, 951 verdes) |
| **F06** | `melhor-envio/index.ts` | `isPickupOrder(order?.shipping_service_id)` (sempre `false` em runtime) | **SOBREVIVEU** |
| **F07** | `send-notification/handlers.ts` | prévia não guarda `settings.material` | **SOBREVIVEU** |
| **F08** | `send-notification/handlers.ts` | `shipping_service_id` sai do `select` da prévia | **SOBREVIVEU** |
| F09 | `send-notification/dispatch.ts` | `shipping_service_id` sai de `ORDER_COLUMNS` | morto · asserção |
| F10 | `dispatch.ts` | motor não passa `settings.material` ao render | morto · asserção |
| F11 | `render/layout.ts` | bloco de retirada sem a linha do escritório | morto · asserção |
| F12 | `render/email.ts` | texto sem o endereço da retirada | morto · asserção |
| **F13** | `send-notification/handlers.ts` | prévia não passa `settings.material` ao render | **SOBREVIVEU** |
| S01 | `ShippingCalc.tsx` | retirada só com cotação | morto · asserção |
| S02 | `ShippingCalc.tsx` | retirada lê o CEP digitado, não o consultado | morto · asserção |
| **S03** | `DeliveryBlock.tsx` | pré-seleção escolhe a retirada no endereço `is_default` | **SOBREVIVEU** (gap 3) |
| S04 | `DeliveryBlock.tsx` | desfaz a escolha enquanto a configuração carrega | morto · asserção |
| S05 | `DeliveryBlock.tsx` | rascunho fora do RS não é desfeito | morto · asserção |
| S06 | `DeliveryBlock.tsx` | faixa recolhida da retirada some | morto · asserção |
| S07 | `DeliveryBlock.tsx` | rascunho da retirada ganha data | morto · asserção |
| S08 | `OrderPaymentDelivery.tsx` | retirada mostra o endereço da cliente | morto · asserção |
| S09 | `OrderSummary.tsx` | linha volta a "Frete · Uma Estrelinha …" | morto · asserção |
| S10 | `usePickupOption.ts` | data ignora `handling_days` | morto · asserção |
| S11 | migration da 63 | sem `NOT value ? 'pickup_enabled'` | morto · asserção |
| S12 | migration da 63 | nasce `false` | morto · asserção |
| S13 | `settings.ts` | `DEFAULT_SHIPPING.pickup_enabled = false` | morto · asserção |
| S14 | `DeliveryBlock.tsx` | `pickup` sem o portão `rsCep` | sobreviveu — **equivalente**: o `PickupSource` desmonta fora do RS e o cleanup já zera `pickupRead` |
| S15 | `usePickupOption.ts` | `settled` sempre `true` | morto · asserção |
| B01 | `nextStep.ts` | atalho da retirada em `paid` | morto · asserção |
| B02 | `nextStep.ts` | retirada em `shipped` volta a cobrar rastreio | morto · asserção |
| B03 | `MelhorEnvioTab.tsx` | retirada volta a oferecer cotação/etiqueta | morto · asserção |
| B04 | `AdminOrderPage.tsx` | rastreio de saída volta para retirada | morto · asserção |
| B05 | `ShippingMaterialSection.tsx` | aviso por régua própria (só rua) | morto · asserção |
| B06 | `ShippingMaterialSection.tsx` | chave ausente aparece desligada | morto · asserção |
| B07 | `OrderNextStep.tsx` | botão ignora `actionLabel` | morto · asserção |
| B08 | `AdminOrderPage.tsx` | linha "Retirada no escritório" some do cartão | morto · asserção |

**Totais**: 45 injetados · **37 mortos, todos por asserção** · 8 sobreviventes, dos quais **1
equivalente** (S14) e **7 lacunas reais** (C09, F05, F06, F07, F08, F13, S03).

---

## Lacunas, por prioridade

1. **RET-15 — o guarda de fonte prova que `isPickupOrder` é CHAMADO, não que DECIDE** (F05, F06).
   `retiradaSemEtiqueta.test.ts` mede posição, 422, `select` e import, mas não a condição do `if`:
   `isPickupOrder(order) && body?.force !== true` e `isPickupOrder(order?.shipping_service_id)` — este
   último é `false` para todo pedido em runtime — passam com 951 verdes. É a recusa que impede
   comprar etiqueta com o saldo da carteira.
   **Conserto**: no predicado `recusaAntesDaEtiqueta`, exigir que a expressão do `if` seja
   exatamente a chamada `isPickupOrder(<id>)`, com um argumento `Identifier` igual ao nome ligado
   por `const { data: <id> }` no primeiro `.select(…)`; dois sensores novos com as duas formas
   acima. Alternativa melhor: extrair a decisão pré-API de `handleCreate` para uma função pura em
   arquivo testável e cobri-la por unidade.

2. **RET-18 — a PRÉVIA de e-mail de um pedido de retirada não tem caso** (F07, F08, F13). Apagar a
   coluna do `select` da prévia, o `saida.material = m` ou o 6º argumento do `renderEmail` em
   `handlers.ts` deixa 951 verdes. Consequência: a Adri pré-visualiza o e-mail de um pedido de
   retirada real (`order_id`) e vê "Entrega" com o endereço da cliente, ou "Retirada" sem a linha do
   escritório — e o e-mail de verdade sai diferente. Os autores já tinham declarado essa lacuna.
   **Conserto**: em `send-notification/__tests__/handlers.test.ts`, um caso de `preview` com
   `order_id`, fixtura de `orders` como **função do `select`** (o molde de `dispatch.test.ts:594`,
   que apaga `shipping_service_id` quando a coluna não é pedida) e `store_settings.material`
   completo; asserir `'>Retirada</strong>'` e a linha
   `Escritório - Uma Estrelinha - …` no HTML, e a ausência de `>Entrega</strong>`.

3. **RET-08 — a pré-seleção só é medida com a cotação já resolvida no primeiro render** (S03). Com a
   cotação imediata, o efeito de pré-seleção roda antes de o `PickupSource` entregar a opção, então
   um mutante que pré-seleciona a retirada no endereço `is_default` nunca a enxerga. No navegador a
   ordem é a contrária (configuração chega antes da cotação), e é exatamente aí que a regressão
   apareceria.
   **Conserto**: em `DeliveryBlock.test.tsx`, endereço `is_default` do RS com `quoteState` em
   carregamento no primeiro render, depois `quoteState({ data: [SEDEX, PAC] })` + `rerender`;
   asserir `shipping.serviceId === '1'`.

4. **O contrato estrito de `pickupAvailable` não tem asserção** (C09). O `design.md` e o comentário
   do arquivo dizem que `enabled` é `=== true` e que quem lê o jsonb cru resolve o default antes;
   `enabled !== false` passa no core inteiro. Hoje é equivalente na prática (a loja mescla
   `DEFAULT_SHIPPING`, a function faz `?? true`), mas o próximo consumidor que esquecer o default
   ligaria a retirada sem querer. **Conserto**: em `pickup.test.ts`, `pickupAvailable` e
   `pickupRefusal` com `enabled: undefined` e `null` ⇒ indisponível / `pickup_unavailable`.

5. **O 422 `pickup_unavailable` no checkout não tem caso, e a mensagem manda tentar de novo.** A
   página trata como falha genérica (`ORDER_FAILED_MESSAGE`, "Tente novamente") e mantém a retirada
   escolhida — a retentativa nunca vai passar. O `design.md` aceita a mensagem genérica, então não é
   violação da spec, mas o caminho não é medido. **Conserto**: um caso em `CheckoutPage.test.tsx`
   com `createOrderMutateAsync` rejeitando, asserindo o toast e que o rascunho fica intacto; avaliar
   uma mensagem própria que peça outra forma de envio.

6. **Edge case do cupom de frete grátis com retirada** — sem caso. Verdadeiro nos dois mundos (a
   retirada é sempre `0`); vale um pino barato em `DeliveryBlock.test.tsx`.

7. **Pendências de prova fora do vitest**: `deno check`/`supabase start` com o grafo novo (Deno não
   instalado aqui), e a prova em navegador em 390×844 e 1440 — a linha do endereço é longa e só o
   navegador mostra se ela cabe sem rolagem horizontal.

---

## Rodada 2 — verificação independente do conserto (2026-10-11)

**Verificador**: independente (não escreveu o código nem o conserto). Mesmo arnês da rodada 1:
mutação no arquivo real, cópia salva, restauração e comparação por SHA-256 (todas bateram), alvo
encontrado **exatamente uma vez** ou o arnês lança (com normalização CRLF para `CheckoutPage.tsx`);
escopo `pnpm --filter @estrelinha/<ws> exec vitest run <escopo> --testTimeout=20000`, e todo
sobrevivente re-rodado na **suíte inteira do workspace**. Morte classificada por asserção (`Tests N
failed` com o arquivo carregado) × compilação/carga. Nenhum commit, nenhum `git stash`.

### Veredito: ❌ FAIL — por cobertura, nenhum defeito de produto encontrado

Os sete sobreviventes reais da rodada 1 morrem, todos por asserção. Mas o conserto de RET-15
**moveu o ônus da prova para o guarda de fonte**, e ele aceita duas formas que compram etiqueta
(N01, N07). E o RET-12 é provado só para convidada (N18).

### Gate medido (um workspace por vez, exit code fora de pipe)

| Medida | Esperado | Medido | |
| --- | --- | --- | --- |
| core | 2757/114 | **2757/114**, exit 0 | ✅ |
| store | 4671/273 | **4671/273**, exit 0 | ✅ |
| backoffice | 3145/174 | **3145/174**, exit 0 | ✅ |
| functions | 962/21 | **962/21**, exit 0 | ✅ |
| catalog-import | 512/23 | **512/23**, exit 0 | ✅ |
| `tsc` store · backoffice | 0 · 0 | **0 · 0** | ✅ |
| lint | 26/7 | **26/7** (backoffice 24/5 · store 2/2) | ✅ |
| `git diff --name-only -- packages/core/src/payment` | vazio | **vazio** | ✅ |

**Alcance pelo Deno, à mão**: `melhor-envio/pickupGate.ts` tem um único import,
`../../../packages/core/src/shipping/pickup.ts` (relativo, `.ts` explícito, sem alias); `pickup.ts`
não importa nada; `index.ts` importa `./pickupGate.ts` com extensão. Nenhum comentário desses três
arquivos escreve forma de import sem extensão, e nenhum cita `@estrelinha/*`. `deno check` continua
sem rodar (Deno não instalado).

**Retentativa depois do 422 `pickup_unavailable`** (lido em `checkout/handlers.ts`, `createOrder`):
a idempotência por `client_request_id` vem **antes** da recusa, e a recusa não grava nada
(`createOrder.test.ts` — `nadaGravado`). Logo a retentativa com a MESMA chave não acha pedido e cria
um novo: a reutilização da chave pela loja é correta. O mutante N13 (descartar a chave na recusa) é
**equivalente** por isso.

### Re-injeção dos sobreviventes da rodada 1 (código atual)

| # | Mutação (forma adaptada ao código atual quando necessário) | Resultado |
| --- | --- | --- |
| C09 | `pickup.ts`: `enabled === true` → `enabled !== false` | morto · asserção (2 casos) |
| F05 | `index.ts`: `if (recusaRetirada && body?.force !== true)` | morto · asserção (`retiradaSemEtiqueta`) |
| F06 | `index.ts`: `pickupGate(order?.shipping_service_id)` | morto · asserção |
| F06b | `pickupGate.ts`: `isPickupOrder(order?.shipping_service_id)` (a forma original, agora no portão) | morto · asserção (2 casos) |
| F07 | `send-notification/handlers.ts`: prévia não guarda `saida.material` | morto · asserção |
| F08 | `shipping_service_id` sai do `select` da prévia | morto · asserção |
| F13 | prévia não passa `settings.material` ao `renderEmail` | morto · asserção |
| S03 | `DeliveryBlock`: pré-seleção põe `PICKUP_DRAFT` no `is_default` com retirada (efeito com `pickup` nas deps) | morto · asserção |

### Mutantes novos — 20

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| **N01** | `melhor-envio/index.ts` | tira o `return` do `new Response(…)` da recusa — a resposta é montada e descartada, e o fluxo segue para `meFetch("/api/v2/me/cart")` | **SOBREVIVEU** (functions inteiro, 962) |
| **N02** | `index.ts` | `error: recusaRetirada.error + "_x"` | **SOBREVIVEU** (baixo: nenhum consumidor de produção lê `pickup_order`) |
| **N03** | `index.ts` | `await globalThis.fetch(...)` no carrinho do Melhor Envio **antes** do portão | **SOBREVIVEU** — o guarda só reconhece chamada à API por `Identifier` `meFetch`/`fetch` |
| N04 | `index.ts` | import `./pickupGate` sem `.ts` | morto · asserção |
| N05 | `pickupGate.ts` | status 422 → 409 | morto · asserção |
| N06 | `pickupGate.ts` | importa do barrel `shipping/index.ts` | morto · asserção |
| **N07** | `index.ts` | `let recusaRetirada = pickupGate(order)` + `if (body?.force === true) recusaRetirada = null` antes do `if` — F05 com outra forma | **SOBREVIVEU** |
| N08 | `useOrders.ts` | qualquer `corpo.error` vira `PickupUnavailableError` | morto · asserção |
| N09 | `CheckoutPage.tsx` | na recusa, `reset()` do rascunho inteiro | morto · asserção |
| N10 | `CheckoutPage.tsx` | na recusa, `clearCart()` | morto · asserção |
| N11 | `CheckoutPage.tsx` | toast genérico também | morto · asserção |
| N12 | `CheckoutPage.tsx` | reabre `payment` em vez de `delivery` | morto · asserção |
| N13 | `CheckoutPage.tsx` | `invalidateOrder()` na recusa (chave de idempotência nova) | sobreviveu — **equivalente** (ver acima) |
| N14 | `ShippingCalc.tsx` | `aria-label="Envio a domicílio"` sempre | morto · asserção |
| **N15** | `DeliveryBlock.tsx` | `role="group"` sempre (também sem retirada, fora do RS) | **SOBREVIVEU** (store inteiro, 4671) |
| N16 | `DeliveryBlock.tsx` | `aria-labelledby={undefined}` | morto · asserção |
| N17 | `checkout/handlers.ts` | recusa da retirada movida para **antes** da idempotência | morto · asserção |
| **N18** | `checkout/handlers.ts` | recusa só sem `Authorization` (retirada forjada passa com sessão) | **SOBREVIVEU** (functions inteiro, 962) |
| **N19** | `entities/pickup/model/usePickupOption.ts` | `usePickupLocation` passa a esconder a linha com `pickup_enabled === false` | **SOBREVIVEU** (store inteiro) |
| N20 | `DeliveryBlock.tsx` | rascunho fora do RS com retirada não é desfeito | morto · asserção |

**Totais da rodada 2**: 28 injetados (8 re-injeções + 20 novos) · **20 mortos, todos por asserção,
zero por compilação** · 8 sobreviventes, dos quais **1 equivalente** (N13) e **7 lacunas** (N01,
N02, N03, N07, N15, N18, N19).

> Observação de medição: nas re-rodadas completas do store, o relatório imprime linhas `×` de
> "gaveta de material — o fio" com a suíte fechando **4671/4671, exit 0** — parecem tentativas que
> passaram na repetição. Não têm relação com esta feature, mas merecem uma olhada isolada.

### Lacunas, por prioridade

1. **RET-15 — o guarda aceita uma recusa que não RETORNA (N01).** `devolveARecusa` testa
   `/\bnew Response\(/` no texto do `then`; sem o `return`, a resposta é descartada e a etiqueta é
   comprada. **Conserto**: na AST, exigir que o `then` contenha um `ReturnStatement` cuja expressão
   é `NewExpression` de `Response` com `status: <recusa>.status` e `error: <recusa>.error` — e um
   sensor com o `return` removido.
2. **RET-15 — a recusa pode ser anulada entre a chamada e o `if` (N07).** O guarda confere a
   condição do `if`, não que o nome é imutável. **Conserto**: exigir `const` na declaração
   (`VariableDeclarationList` com `NodeFlags.Const`) e nenhuma atribuição ao nome entre a chamada e o
   `if`; sensor com `let` + reatribuição por flag do corpo.
3. **RET-12 com sessão (N18).** Os casos do `describe` RET-12 em `createOrder.test.ts` rodam sem
   `Authorization`. **Conserto**: um caso de retirada forjada (CEP de SP ou custo ≠ 0) com
   `comSessao()` + `Bearer jwt` ⇒ 422 e `nadaGravado`.
4. **RET-15 — chamada à API por `obj.fetch(…)` é invisível (N03).** **Conserto**: tratar como API
   também `PropertyAccessExpression` cujo nome é `fetch`/`meFetch`; sensor.
5. **`usePickupLocation` sem portão é decisão de design sem guarda (N19).** O `apps/store/CLAUDE.md`
   diz que desligar a retirada depois não muda onde a cliente vai buscar; nenhum teste prende isso.
   **Conserto**: em `usePickupOption.test.tsx` (ou `OrderPaymentDelivery.retirada.test.tsx`),
   `pickup_enabled: false` ⇒ a linha continua.
6. **RET-06 — o par sem retirada no `DeliveryBlock` (N15).** O conserto declarou "o par de SP sem
   grupo", mas só a `ShippingCalc` o tem (N14 morre). **Conserto**: no caso de SP do `DeliveryBlock`,
   nenhum `role="group"` em volta das opções dos Correios.
7. **O literal `error` da recusa na fiação (N02)** — baixo; cobrir junto com a lacuna 1 (o `error`
   do `Response` ser exatamente `<recusa>.error`, sem expressão em volta).
8. Pendências fora do vitest seguem: `deno check`/`supabase start` com o grafo novo e a prova em
   navegador (390×844 e 1440).

---

## Rodada 3 — verificação independente do conserto da rodada 2 (2026-10-11)

**Verificador**: independente (não escreveu o código, o conserto nem as rodadas anteriores). O
arnês é o mesmo: a mutação é feita no arquivo real e o arquivo é restaurado do buffer original, com
o SHA-256 conferido depois de cada mutação (os 31 bateram). O arnês **lança** quando o alvo não
aparece exatamente uma vez (CRLF normalizado) e quando a mutação não muda nada. Cada mutante roda
primeiro no escopo `pnpm --filter … exec vitest run <escopo> --testTimeout=20000`, e todo
sobrevivente é re-rodado na **suíte inteira** do workspace. A morte é classificada por asserção
(`Tests N failed`) ou por compilação/carga. Nenhum commit, nenhum `git stash`. O gate foi medido
**antes** de qualquer mutação.

### Veredito: ❌ FAIL — por cobertura, nenhum defeito de produto encontrado

- Os 7 sobreviventes da rodada 2 morrem **todos por asserção**.
- Os 16 mutantes novos de superfície morrem **todos por asserção**.
- Todos os 21 ACs têm asserção sobre o resultado definido na spec.
- O gate bate.

O FAIL vem de um lugar só: o guarda de fonte de RET-15 (`retiradaSemEtiqueta.test.ts`) deixa passar
**7 formas novas** em que um pedido de retirada ainda põe a etiqueta no carrinho do Melhor Envio.
Nenhuma é a forma do código atual: hoje o `index.ts` está certo, e a prova disso é o
`pickupGate.test.ts`, mais a leitura à mão. O que falta é o guarda impedir a regressão.

### Gate medido (um workspace por vez, exit code fora de pipe, `--testTimeout=20000`)

| Medida | Esperado | Medido | |
| --- | --- | --- | --- |
| core | 2757/114 | **2757/114**, exit 0 | ✅ |
| store | 4672/273 | **4672/273**, exit 0 | ✅ |
| backoffice | 3145/174 | **3145/174**, exit 0 | ✅ |
| functions | 969/21 | **969/21**, exit 0 | ✅ |
| catalog-import | 512/23 | **512/23**, exit 0 | ✅ |
| `tsc` store · backoffice | 0 · 0 | **0 · 0** (exit 0, sem diagnóstico) | ✅ |
| lint | 26/7 | **26/7**: backoffice 24/5 · store 2/2 (o store foi medido sozinho, porque o turbo para no `backoffice#lint`) | ✅ |
| `git diff --name-only -- packages/core/src/payment` | vazio | **vazio** | ✅ |

### Re-injeção dos sobreviventes da rodada 2 (código atual)

| # | Mutação | Resultado |
| --- | --- | --- |
| N01 | `index.ts`: tira o `return` antes do `new Response` da recusa | morto · asserção (`retiradaSemEtiqueta`, caso do arquivo real) |
| N02 | `index.ts`: `error: recusaRetirada.error + "_x"` | morto · asserção |
| N07 | `index.ts`: `let` + `if (body?.force === true) recusaRetirada = null` antes do `if` | morto · asserção |
| N03 | `index.ts`: `await globalThis.fetch(…/me/cart)` antes do portão | morto · asserção |
| N18 | `checkout/handlers.ts`: a recusa da retirada só sem `Authorization` | morto · asserção (2 casos "com SESSÃO") |
| N19 | `usePickupOption.ts`: `usePickupLocation` devolve `null` com `pickup_enabled === false` | morto · asserção (`OrderPaymentDelivery.retirada.test.tsx`) |
| N15 | `DeliveryBlock.tsx`: `role="group"` incondicional na lista dos Correios | morto · asserção ("CEP de São Paulo… não viram grupo") |

### Caçando buracos que o próprio conserto criou: 8 formas aplicadas a `melhor-envio/index.ts`

O guarda confere estas formas: que o nome é `const`; que nenhuma atribuição o alcança; que o `then`
tem um `ReturnStatement` cujo `new Response` leva exatamente `<recusa>.status` e `<recusa>.error`;
e que nenhuma chamada a `meFetch`/`fetch` aparece antes do portão, seja por `Identifier` ou por
acesso a propriedade. O que ele **não** confere é se esse `if` está no caminho de execução de
`handleCreate`, nem se alguma chamada à API está escondida atrás de outro nome.

| # | Forma (no arquivo real; todas compram etiqueta ou carrinho para um pedido de retirada) | Resultado |
| --- | --- | --- |
| **G01** | `if (body?.force !== true) if (recusaRetirada) { return … }`. A recusa fica aninhada sob uma flag do corpo, o mesmo efeito do F05 com outra sintaxe | **SOBREVIVEU** (functions inteiro, 969) |
| **G02** | o `if` da recusa dentro de uma arrow que nunca é chamada (`const _naoChamada = () => { if (recusaRetirada) { return … } }`). O `return` sai da arrow, não de `handleCreate` | **SOBREVIVEU** |
| **G03** | `await meFetch("/api/v2/me/cart", …)` dentro do `then`, **antes** do `return`. A posição dele vem depois da chamada ao portão, então a régua "antes da API" passa | **SOBREVIVEU** |
| **G04** | `const me = meFetch; await me("/api/v2/me/cart", …)` antes do portão. A API é detectada só pelos nomes `meFetch`/`fetch` | **SOBREVIVEU** |
| **G05** | um helper `comprarEtiqueta(o)` declarado no módulo, que chama `meFetch(cart)`, é chamado antes do portão. É a forma mais realista: uma refatoração que extrai o carrinho para uma função | **SOBREVIVEU** |
| **G06** | `try { if (recusaRetirada) return … } finally { await meFetch(cart) }`. O `finally` roda depois do `return` | **SOBREVIVEU** |
| **G07** | `{ const order = { shipping_service_id: null }; const recusaRetirada = pickupGate(order); … }`. A sombra passa no confronto **por nome** entre o argumento e a linha do pedido | **SOBREVIVEU** |
| G08 | controle: `return void new Response(…)` | morto · asserção (o guarda reprova expressão que não é `NewExpression`: sem falso negativo nesta direção) |

**Falso positivo e sensores**: o guarda aprova o `index.ts` real sem mutação (gate verde). Os
sensores chamam `recusaAntesDaEtiqueta`, o mesmo predicado da asserção do arquivo real, e não uma
cópia dele. Isso está certo, e não é o problema.

### Mutantes novos de superfície: 16

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| R01 | `core/shipping/pickup.ts` | sem UF a linha sai com `/` no fim | morto · asserção |
| R02 | `pickup.ts` | `isRsCep` aceita mais de 8 dígitos | morto · asserção |
| R03 | `pickup.ts` | rua só de espaço conta como preenchida (sem `trim`) | morto · asserção (2) |
| R04 | `pickup.ts` | `pickupRefusal` só recusa custo `> 0` (negativo/NaN passam) | morto · asserção |
| R05 | `checkout/handlers.ts` | `shipping_cost` ausente vira `0` | morto · asserção |
| R06 | `checkout/handlers.ts` | o material é lido da chave `shipping` | morto · asserção (3) |
| R07 | `ShippingCalc.tsx` | a retirada mostra `R$ 0,00` em vez de `Grátis` | morto · asserção (2) |
| R08 | `DeliveryBlock.tsx` | o bloco recolhido perde a linha do escritório | morto · asserção |
| R09 | `CheckoutPage.tsx` | o 422 `pickup_unavailable` não desfaz a escolha da retirada | morto · asserção |
| R10 | `send-notification/render/layout.ts` | a versão em texto do e-mail diz `Entrega:` | morto · asserção (3) |
| R11 | `backoffice/nextStep.ts` | o rótulo do próximo passo vira "Entregue" | morto · asserção |
| R12 | `MelhorEnvioTab.tsx` | o bloco da retirada fica mudo (sem dizer que não há etiqueta) | morto · asserção |
| R13 | `ShippingMaterialSection.tsx` | o interruptor sempre grava `true` | morto · asserção (2) |
| R14 | migration da 63 | `WHERE key IN ('shipping','material')` (grava a chave no material) | morto · asserção |
| R15 | `OrderPaymentDelivery.tsx` | o método aparece como "Entrega" | morto · asserção (4) |
| R16 | `usePickupOption.ts` | a loja ignora o interruptor (`enabled: true`) | morto · asserção (5) |

**Totais da rodada 3**: 31 injetados (7 re-injeções, 8 formas contra o guarda e 16 novos). Morreram
**24, todos por asserção, nenhum por compilação**: 7 re-injeções, o controle G08 e os 16 novos.
**Sobreviveram 7**, as formas G01–G07, todas no guarda de RET-15. Nenhum equivalente.

### Checagem ancorada na spec (RET-01..21)

A tabela da rodada 1 foi conferida contra o código atual. Cada AC tem pelo menos um caso que assere
o **resultado** da spec: o texto, o 422, o payload, a ausência de chamada ou a etapa da jornada.
Nenhum desses casos espelha a implementação. Desde a rodada 1 entraram e foram conferidos o RET-12
com sessão (`createOrder.test.ts`, "com SESSÃO"), o RET-18 pela prévia (`handlers.test.ts:890`), o
par do RET-06 no checkout em SP (`DeliveryBlock.test.tsx`) e o RET-19 com a retirada desligada
depois da compra. O edge case do cupom de frete grátis já tem caso
(`DeliveryBlock.test.tsx`, "cupom de frete grátis num CEP do RS…").

**Nenhum AC sem asserção de resultado.** O RET-15 tem asserção de resultado sobre a **decisão**
(`pickupGate.test.ts`) e sobre a fiação **na forma atual**; o que falta é a fiação ser impossível de
quebrar em silêncio (ver abaixo). As notas de precisão 1 e 2 da rodada 1 continuam valendo.

### Lacunas, por prioridade

1. **RET-15: o guarda de fonte é uma lista de formas proibidas, e não alcança a propriedade (G01–G07).**
   As três rodadas acharam formas novas (F05/F06, depois N01/N03/N07, agora G01–G07), e cada conserto
   acrescentou uma régua de sintaxe. A propriedade de verdade é comportamental: *para uma linha de
   retirada, `handleCreate` não chama a API nenhuma vez*. Uma régua de AST só a aproxima. As formas
   mais realistas são **G05** (uma refatoração que extrai o carrinho para um helper chamado antes do
   portão) e **G03** (um `meFetch` dentro da recusa).
   **Conserto recomendado** (muda a forma do código, e não só o teste): seguir `AD-004` também nesta
   function. A lógica de `handleCreate` vai para `melhor-envio/handlers.ts`, com `meFetch` e o client
   injetados; o `index.ts` fica só com o wiring. Um teste de unidade alimenta uma linha de retirada e
   assere `422 pickup_order` **e** zero chamadas ao `meFetch` injetado. Isso mata G01–G07 por
   construção, e também qualquer forma futura. O guarda de fonte pode então encolher para "o
   `index.ts` delega para o handler".
   **Conserto mínimo, se a extração não couber agora**: no guarda, exigir que o `if` da recusa seja
   **instrução direta do corpo de `handleCreate`** (mata G01, G02 e G06), que o `then` contenha
   **só** o `return` (mata G03), e que nenhuma chamada a um identificador declarado no módulo, ou
   ligado por alias, apareça antes do portão a não ser `adminClient`/`pickupGate` e os métodos do
   client (mata G04 e G05). Exigir também que a linha do pedido não seja redeclarada em escopo
   interno (mata G07). Mesmo assim, continua sendo uma lista.
2. Pendências fora do vitest, inalteradas: `deno check`/`supabase start` com o grafo novo (Deno não
   está instalado aqui), e a prova em navegador em 390×844 e 1440.

### O que **não** é lacuna

O código de produto está certo em todas as superfícies medidas. A recusa da retirada na `checkout`
cobre os quatro ramos com e sem sessão, e o `index.ts` atual recusa antes da primeira chamada à API.
