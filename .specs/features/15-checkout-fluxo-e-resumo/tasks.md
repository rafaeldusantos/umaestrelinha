# Checkout — Fluxo, pagamento e resumo — Tasks

**Spec:** [`spec.md`](./spec.md) · **Design:** [`design.md`](./design.md)
**14 tasks · 5 fases.** Commits: **nenhum commit atômico durante a implementação** — convenção do
projeto (`CLAUDE.md`). Os commits saem de uma vez na T14.

---

## Progresso

| Lote | Fases | Tasks | Estado |
| --- | --- | --- | --- |
| Batch 1 | 1–2 | T01 … T06 | ✅ **completo** — core 591 · store 547 · functions 232 · `tsc` store 0 · eslint store 5/8 (= baseline) |
| Batch 2 | 3–4 | T07 … T13 | ✅ **completo** — store 601 · `tsc` 0 · eslint 5 err / 7 warn |
| Fecho | 5 | T14 | ✅ **completo** — gates medidos, prova em 390×844 e 1440, 2 defeitos de mobile corrigidos |
| Verificação | — | — | ✅ [`validation.md`](./validation.md) — 28/28 ACs rastreados, sensor 15 mutações / 12 mortas; 4 lacunas de asserção fechadas depois (ver abaixo) |

**Achados da T14 que viraram correção** (nenhum previsto na spec; os dois pré-existentes, os dois na
tela entregue e ambos proibidos pelo `CLAUDE.md`):

1. **Scroll horizontal no body em 390px** — documento media **452px**. A coluna dos blocos é item de
   grid e nasce com `min-width: auto`; os blocos colapsados usam `truncate` (`white-space: nowrap`),
   então o `min-content` da coluna era o endereço inteiro. `min-w-0` na coluna: **452px → 390px**.
   Guarda de regressão em `CheckoutPage.test.tsx` (asserção de classe — jsdom não faz layout).
2. **`Alterar` do Contato com alvo de 28px** — o `BUG-20260728` pôs `min-h-11` em Entrega e
   Pagamento e esqueceu o Contato. Medido em 390×844, corrigido.

**Bloqueio declarado (não é desta feature):** a edge function `mercado-pago` não sobe local
(503 `BOOT_ERROR`) — `packages/core/src/pricing/index.ts` importa `@nanapin/supabase/types` como
bare specifier e o Deno não resolve. Pré-existente (`c6944b6`/`de63871`, 2026-08-01), registrado em
[`BUG-20260802-edge-function-mercado-pago-nao-sobe-local`](../../../docs/qa/bugs/BUG-20260802-edge-function-mercado-pago-nao-sobe-local.md).
Consequência: **PGM-07, PGM-08 e DOC-03 não têm prova de runtime**, só de teste.

**Lacunas do verificador, fechadas depois do relatório** (4 asserções; nenhum defeito de
comportamento envolvido):

| # | Lacuna | Onde |
| --- | --- | --- |
| 1 | *Major* — um `Continuar` injetado no bloco de Pagamento passava em 99/99 testes (seria o segundo CTA que a feature veio matar). Novo `it.each` de 4 casos; mutante confirmado **morto**. | `PaymentBlock.test.tsx` |
| 2 | RSM-05 nomeia corpo, família e tracking; só o corpo era asseverado. | `OrderSummary.test.tsx` |
| 3 | RSM-02 enumera o ícone de etiqueta; não era asseverado. | `OrderSummary.test.tsx` |
| 4 | RSM-06 pede alinhamento à direita; `text-right` não era asseverado. | `OrderSummary.test.tsx` |

**Desvios aceitos no Batch 1**

1. **T02 — casa dos testes.** A task pedia os testes de `buildPayer` em `@nanapin/functions`, mas o
   suite já existia em `packages/core/src/payment/__tests__/payer.test.ts` e
   `supabase/vitest.config.ts` só inclui `functions/**/__tests__/*.test.ts`. Suite existente
   estendido; **os dois** gates rodados (functions verde em 232, provando que o import novo
   `../validators/cnpj.ts` resolve pelo grafo de `handlers.ts`).
2. **T06 — um teste atualizado para o contrato novo.** `'três blocos completos deixam todos
   colapsados'` assertava o contrato **pré-FLW** (3 botões `Alterar`). Virou `'…colapsam Contato e
   Entrega e deixam Pagamento aberto (FLW-05)'`. Nenhuma asserção enfraquecida, nenhum teste
   apagado.
3. **Prova de discriminação do `ADR-02`** (o risco nomeado no design): mutar a semeadura do
   `is_default` para sujar o bloco **matou** o teste `'semear o endereço is_default e pré-selecionar
   o frete NÃO sujam o bloco'`. Mutação revertida.

---

## Fase 1 — Domínio puro (`packages/core`)

Sem React, sem DOM. É aqui que as regras ficam provadas antes de qualquer pixel.

### T01 · Documento: CPF **ou** CNPJ — `DOC-01`, `DOC-02`

- **Arquivos:** `packages/core/src/validators/cnpj.ts` (novo), `document.ts` (novo), `index.ts`,
  `__tests__/cnpj.test.ts`, `__tests__/document.test.ts`
- **Fazer:** `stripCnpj` · `maskCnpj` (`00.000.000/0000-00`) · `isValidCnpj` (dois DVs, pesos
  `5432987654 32` / `65432987654 32`, rejeita 14 dígitos iguais) · `stripDocument` ·
  `maskDocument` (≤11 ⇒ CPF, ≥12 ⇒ CNPJ) · `isValidDocument` · `documentLabel`
- **Verificar:** CNPJ válido conhecido passa; DV trocado reprova; `11.111.111/1111-11` reprova;
  máscara **alterna** ao digitar o 12º dígito; CPF válido segue válido por `isValidDocument`
- **Gate:** `pnpm --filter @nanapin/core test`

### T02 · `buildPayer` escolhe o tipo — `DOC-03`

- **Arquivos:** `packages/core/src/payment/payer.ts`, testes em `@nanapin/functions`
- **Fazer:** `PayerIdentification.type: 'CPF' | 'CNPJ'`; 11 dígitos ⇒ `CPF`, 14 ⇒ `CNPJ`, inválido ⇒
  `identification` ausente (comportamento atual preservado)
- **Atenção:** import `'../validators/cnpj.ts'` **com extensão** — a edge function importa este
  módulo por caminho relativo Deno
- **Verificar:** os três casos + o de ausência
- **Gate:** `pnpm --filter @nanapin/functions test`

### T03 · `resolveFlow` — `FLW-01` … `FLW-07`, `PGM-06`

- **Arquivos:** `packages/core/src/checkout/blocks.ts`, `types.ts`, `index.ts`,
  `__tests__/blocks.test.ts`
- **Fazer:** `FlowState { dirty, confirmed, editing }`; `resolveFlow` com
  `settled(b) = temSucessor(b) && completo(b) && (confirmado(b) || !sujo(b))` e
  `open = editing ?? primeiro não-settled ?? null`. `isPaymentComplete`: `card` ⇒ só método;
  `pix` ⇒ método + `isValidDocument`. `resolveBlocks` **não muda de contrato**
- **Verificar:** bloco completo+sujo+não confirmado ⇒ **aberto** (FLW-01) · confirmado ⇒ próximo
  abre (FLW-03) · completo+limpo ⇒ settled desde o início (FLW-04/ADR-02) · `payment` nunca settle
  (FLW-05) · `editing` vence a ordem (FLW-06) · `isPaymentComplete` com CNPJ no PIX ⇒ `true` ·
  cartão sem documento ⇒ `true`
- **Gate:** `pnpm --filter @nanapin/core test`

---

## Fase 2 — Fluxo na loja

### T04 · `dirty` no store — `FLW-01`, `FLW-04`

- **Arquivos:** `apps/store/src/features/checkout/model/checkoutStore.ts`,
  `model/__tests__/checkoutStore.test.ts`
- **Fazer:** `dirty: BlockId[]`, `markDirty(id)` idempotente (patch vazio quando já sujo),
  limpo por `reset()`, **fora do `partialize`**
- **Verificar:** `markDirty` duas vezes não duplica nem troca a referência do array ·
  `dirty` **não** aparece no `sessionStorage` · `reset()` esvazia
- **Gate:** `pnpm --filter @nanapin/store test`

### T05 · `Continuar` em Contato e Entrega — `FLW-02`, `FLW-03`

- **Arquivos:** `ui/ContactBlock.tsx`, `ui/DeliveryBlock.tsx` + os dois testes
- **Fazer:** props `onContinue` e `canContinue`; botão contorno de tinta, `min-h-11`, desabilitado
  quando inválido. `markDirty` **só nos handlers de input** — nunca nos `useEffect` de semeadura
- **Verificar:** botão desabilitado com bloco inválido → habilita ao completar → clique chama
  `onContinue` · digitar chama `markDirty` · semear de `customers`/`is_default` **não** chama
- **Gate:** `pnpm --filter @nanapin/store test`

### T06 · Página usa `resolveFlow` — `FLW-06`, `FLW-07`

- **Arquivos:** `apps/store/src/pages/CheckoutPage.tsx`, `pages/__tests__/CheckoutPage.test.tsx`
- **Fazer:** trocar `resolveBlocks` por `resolveFlow`; `confirmed` em `useState`; `onContinue`
  confirma **e** zera `editing`; gate do CTA vira `complete.length === 3`
- **Verificar:** preencher contato **não** colapsa o bloco · `Continuar` colapsa e abre Entrega ·
  `Alterar` reabre e colapsa os outros · CTA habilita com os três válidos mesmo com bloco aberto
- **Gate:** `pnpm --filter @nanapin/store test`

---

## Fase 3 — Superfície de pagamento

### T07 · Ícone PIX e cards iguais — `PGM-01`, `PGM-02`

- **Arquivos:** `apps/store/src/shared/ui/PixIcon.tsx` (novo), `ui/PaymentBlock.tsx`,
  `ui/__tests__/PaymentBlock.test.tsx`
- **Fazer:** SVG do PIX (`viewBox="0 0 16 16"`, `fill="currentColor"`); trocar `QrCode`; cards com
  `basis-0 grow`
- **Verificar:** o card de PIX renderiza o `PixIcon` (não o lucide) · ambos os cards têm as mesmas
  classes de flex (`basis-0 grow`), nenhum com basis automático
- **Gate:** `pnpm --filter @nanapin/store test`

### T08 · Superfície por método + campo CPF/CNPJ — `PGM-03`, `PGM-04`, `DOC-01`

- **Arquivos:** `ui/PaymentBlock.tsx`, `ui/__tests__/PaymentBlock.test.tsx`
- **Fazer:** early-return de `orderId` **só para PIX**; `pix` ⇒ campo de documento; `card` ⇒
  `<CardPaymentBrick/>` e **sem** campo de documento; `maskDocument`/`isValidDocument`/
  `documentLabel`; rótulo `CPF ou CNPJ do pagador`; linha colapsada sem `· CPF` no cartão
- **Verificar:** PIX ⇒ campo presente, Brick ausente · Cartão ⇒ Brick presente, campo ausente ·
  digitar 14 dígitos aplica máscara de CNPJ · trocar de método troca a superfície
- **Gate:** `pnpm --filter @nanapin/store test`

### T09 · Brick sem botão e sem e-mail — `PGM-05`, `PGM-09`

- **Arquivos:** `ui/CardPaymentBrick.tsx`, `lib/cardBrick.ts` (novo), os dois testes
- **Fazer:** o Brick vira superfície (props `amount`, `payerEmail`, `payerDocument?`,
  `errorMessage`); `hidePaymentButton: true`, `hideFormTitle: true`,
  `initialization.payer.email`; `onSubmit` no-op; `getCardFormData()` tolerando **rejeição e
  retorno sem `token`**; `unmount()` no cleanup
- **Verificar:** `hidePaymentButton` e `hideFormTitle` chegam ao Brick · `payer.email` chega
  preenchido · `getCardFormData` devolve `null` nas duas formas de falha e o objeto quando há token
- **Gate:** `pnpm --filter @nanapin/store test`

### T10 · Gravar CPF **ou** CNPJ — `DOC-04`

- **Arquivos:** `entities/customer/api/useSaveCustomerCpf.ts` + teste
- **Fazer:** `isValidDocument`/`stripDocument`; mensagem "CPF ou CNPJ inválido"
- **Verificar:** CNPJ válido grava 14 dígitos · CPF segue gravando 11 · inválido lança sem tocar o
  banco · RLS negando (0 linhas) segue lançando
- **Gate:** `pnpm --filter @nanapin/store test`

### T11 · Um CTA, dois caminhos — `PGM-06`, `PGM-07`, `PGM-08`, `DOC-05`

- **Arquivos:** `pages/CheckoutPage.tsx`, `pages/__tests__/CheckoutPage.test.tsx`
- **Fazer:** `handleConfirm` na ordem do design (validar cartão → documento → `saveCpf` →
  endereço/variação → reusar-ou-criar pedido → `create-payment` no cartão); `cardError` em
  `useState`, passado por prop
- **Verificar:** cartão inválido ⇒ **nenhum** pedido criado e nenhuma cobrança (PGM-06) ·
  cartão aprovado ⇒ `onApproved` · recusado ⇒ mensagem amigável e **o mesmo** pedido na retentativa
  (PGM-08) · PIX ⇒ cria pedido e mostra QR (PGM-07) · documento do Brick vira `customers.cpf`,
  com fallback para `customers.cpf` e erro quando faltam os dois (DOC-05)
- **Gate:** `pnpm --filter @nanapin/store test`

---

## Fase 4 — Resumo fiel ao board

### T12 · `installments.ts` e `cardTotal` — base de `RSM-06`

- **Arquivos:** `model/installments.ts` (novo, movido de `PaymentBlock`), `model/useCheckoutTotals.ts`,
  `ui/PaymentBlock.tsx`, testes afetados
- **Fazer:** mover `resolveInstallments` (comportamento **idêntico**); `useCheckoutTotals` devolve
  `cardTotal` via `calculateOrderTotals({ …, method: 'card' })`
- **Verificar:** os casos de `resolveInstallments` seguem passando no novo módulo · com PIX
  selecionado, `cardTotal > totals.total` quando há desconto PIX · sem desconto, iguais
- **Gate:** `pnpm --filter @nanapin/store test`

### T13 · `OrderSummary` conforme o board `04` — `RSM-01` … `RSM-07`

- **Arquivos:** `ui/OrderSummary.tsx`, `ui/__tests__/OrderSummary.test.tsx`
- **Fazer:** `px-6` nas faixas · itens `gap-4`, thumb `rounded-[12px]` · faixa de cupom aplicado
  (bordas 1px, `Tag`, `CÓDIGO aplicado`, valor geleia, `X` remover) · `CouponInput` só sem cupom ·
  linha `Cupom CÓDIGO` · total `text-[32px] leading-[34px]` · sub-linha
  `no cartão: Nx de R$ Y sem juros` (só com `card_enabled` e `count >= 2`, sobre `cardTotal`) ·
  barra mobile com ` · frete grátis`
- **Verificar:** com cupom ⇒ faixa presente e `CouponInput` ausente; sem cupom ⇒ o inverso ·
  linha de totais mostra o código · sub-linha usa `cardTotal`, não o total com PIX · `1x` some ·
  `card_enabled: false` some · barra mobile ganha o sufixo no threshold
- **Gate:** `pnpm --filter @nanapin/store test`

---

## Fase 5 — Fecho

### T14 · Gates, prova visual e commits

- **Fazer, nesta ordem:**
  1. `pnpm test` (core · store · functions · backoffice) — exit 0
  2. `npx tsc --noEmit -p apps/store/tsconfig.app.json` — **0** (baseline vigente)
  3. `pnpm lint` — comparar com a baseline **store 5 err / 8 warn**; zero erros novos
  4. `pnpm build` — exit 0 (lembrando: **não** prova tipo)
  5. `supabase stop && supabase start` — obrigatório: `cnpj.ts` é arquivo **novo** no grafo de
     imports da edge function (`AD-002`, `handlers.ts:182-187`)
  6. Prova em **390×844** e 1440: sem colapso ao digitar · cards de pagamento do mesmo tamanho ·
     cartão sem segundo botão e sem campo de e-mail · resumo contra o board
  7. Commits completos, de uma vez
- **Gate:** todos os itens acima medidos e registrados (números, não impressões)

---

## Rastreabilidade

| Requisito | Task |
| --- | --- |
| FLW-01 … FLW-05 | T03, T04, T05 |
| FLW-06, FLW-07 | T03, T06 |
| PGM-01, PGM-02 | T07 |
| PGM-03, PGM-04 | T08 |
| PGM-05, PGM-09 | T09 |
| PGM-06, PGM-07, PGM-08 | T11 |
| DOC-01, DOC-02 | T01, T08 |
| DOC-03 | T02 |
| DOC-04 | T10 |
| DOC-05 | T11 |
| RSM-01 … RSM-05, RSM-07 | T13 |
| RSM-06 | T12, T13 |

**Cobertura:** 17 requisitos · 17 mapeados · 0 órfãos.
