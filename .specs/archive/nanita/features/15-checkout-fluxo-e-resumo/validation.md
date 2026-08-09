# Checkout — Fluxo, pagamento e resumo — Validation

**Date**: 2026-08-02
**Spec**: [`spec.md`](./spec.md) · **Tasks**: [`tasks.md`](./tasks.md)
**Diff range**: working tree não commitado vs `923e841` (`feat/backoffice-nav-groups-rebrand-nanita`)
**Verifier**: sub-agente independente (autor ≠ verificador) — instância fresca, sem contato com a
implementação

**Veredito**: ❌ **FAIL** — por **força de teste**, não por defeito de comportamento.
Os 28 ACs estão implementados e cada um foi rastreado a `arquivo:linha`. Nenhum defeito funcional
foi encontrado. O que reprova é o sensor: **3 de 15 mutações sobreviveram**, todas em desfechos que
a spec **nomeia literalmente** e que nenhuma asserção cobre. São 4 asserções de uma linha para
fechar (ver [Fix Plans](#fix-plans)).

---

## ⚠️ Nota de ambiente — sessão concorrente escrevendo na árvore

Durante esta verificação **outra sessão passou a editar o mesmo working tree** (trabalho de
*cart drawer*: `widgets/cart-drawer/**`, `CartButton`, `CrossSell`, `entities/cart/**`,
`Header`, `MobileNav`, `StoreLayout`, `ProductCard`, `CartPage` — e também
`apps/store/src/pages/CheckoutPage.tsx` + `pages/__tests__/CheckoutPage.test.tsx`, que ganharam
`import { CartDrawer } from '@/widgets/cart-drawer'`, `<CartDrawer />` e os mocks correspondentes).

Consequências, ditas com precisão:

- **Todos os gates deste relatório foram medidos entre 15:41 e 15:47**, na árvore da feature 15,
  **antes** de o trabalho concorrente aparecer (primeira observação: 16:05).
- As citações `arquivo:linha` de `CheckoutPage.test.tsx` usam a numeração **atual** (pós-edição
  concorrente); os nomes dos testes e as expressões de asserção não mudaram — só deslocaram ~5
  linhas para baixo.
- O sensor **não deixou resíduo**: os 10 arquivos mutados foram restaurados por cópia binária, com
  `identical=true` em cada restauração. Conferência final de `sha256`: 9 dos 10 continuam
  byte-idênticos ao estado pré-mutação; o décimo (`CheckoutPage.tsx`) diverge **apenas** pela
  edição concorrente citada acima — o `handleConfirm` da feature 15 está intacto, linha por linha.
- Nenhum arquivo `.sensorbak` sobrou na árvore (verificado com `find`).

---

## Task Completion

| Task | Status | Notas |
| --- | --- | --- |
| T01 · `cnpj.ts` / `document.ts` | ✅ Done | `packages/core/src/validators/{cnpj,document}.ts` + 2 suítes novas |
| T02 · `buildPayer` escolhe o tipo | ✅ Done | Desvio aceito (suíte em `@nanapin/core`, não em `@nanapin/functions`) — ver ⚠️ abaixo |
| T03 · `resolveFlow` | ✅ Done | `packages/core/src/checkout/blocks.ts:98-116`, `FlowState` em `types.ts:55-62` |
| T04 · `dirty` no store | ✅ Done | `checkoutStore.ts:84` + fora do `partialize` (`:105-113`) |
| T05 · `Continuar` em Contato/Entrega | ✅ Done | `ContactBlock.tsx`, `DeliveryBlock.tsx` |
| T06 · Página usa `resolveFlow` | ✅ Done | `CheckoutPage.tsx:134-152` |
| T07 · Ícone PIX e cards iguais | ✅ Done | `shared/ui/PixIcon.tsx`, `PaymentBlock.tsx:215/243` |
| T08 · Superfície por método | ✅ Done | `PaymentBlock.tsx:149,272,309` |
| T09 · Brick sem botão e sem e-mail | ✅ Done | `CardPaymentBrick.tsx`, `lib/cardBrick.ts` |
| T10 · Gravar CPF **ou** CNPJ | ✅ Done | `useSaveCustomerCpf.ts:30-32` |
| T11 · Um CTA, dois caminhos | ✅ Done | `CheckoutPage.tsx` `handleConfirm` |
| T12 · `installments.ts` e `cardTotal` | ✅ Done | `model/installments.ts`, `useCheckoutTotals.ts:128` |
| T13 · `OrderSummary` conforme board `04` | ✅ Done | `ui/OrderSummary.tsx` |
| T14 · Gates, prova visual e commits | ⚠️ Parcial | Gates ✅ · prova visual ✅ · **commits pendentes** (tudo no working tree). `tasks.md` ainda marca o Batch 2 como "🔄 em execução" e o Fecho como "⏳" — a tabela de progresso não foi atualizada. |

⚠️ **T02 — atenção do próprio desvio, confirmada pelo sensor**: a mutação #8 (forçar
`type: 'CPF'` para 14 dígitos em `buildPayer`) **é morta por `@nanapin/core`** e **passa batido em
`@nanapin/functions`** (232/232 verdes com o mutante vivo). O caminho da edge function não tem
sensor próprio para DOC-03. Não é regressão desta feature — é o registro de onde a rede tem furo.

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ desfecho da spec asseverado · ⚠️ desfecho parcialmente asseverado (o que falta está
nomeado) · ❌ sem evidência.

### P1 — Quem decide avançar é a pessoa

| Critério | Desfecho definido pela spec | `arquivo:linha` + asserção | Resultado |
| --- | --- | --- | --- |
| **FLW-01** edição que valida o bloco ⇒ ele continua aberto, não abre o próximo | `open` permanece no bloco editado; sucessor fechado | `packages/core/src/checkout/__tests__/blocks.test.ts:267` — `expect(result.open).toBe('contact')` + `expect(result.settled).toEqual([])`<br>`apps/store/src/pages/__tests__/CheckoutPage.test.tsx:451` — `expect(region('Contato').getByLabelText('WhatsApp')).toHaveValue('11987654321')` + `expect(region('Entrega').queryByLabelText('CEP')).not.toBeInTheDocument()`<br>`…:480` (escolher frete) — `expect(region('Entrega').getByLabelText('CEP')).toBeInTheDocument()` | ✅ |
| **FLW-02** Contato/Entrega abertos exibem `Continuar`, habilitado **somente** com o bloco válido | botão presente; `disabled` ⇔ inválido | `CheckoutPage.test.tsx:460` — `expect(continuar('Contato')).toBeDisabled()` → `toBeEnabled()`<br>`ContactBlock.test.tsx` (`describe` "Continuar (FLW-02, FLW-03)") — `toBeDisabled` / `toBeEnabled` / `expect(onContinue).not.toHaveBeenCalled()`<br>`DeliveryBlock.test.tsx` (mesmo `describe`) — idem | ✅ (mas ver mutante #15) |
| **FLW-03** `Continuar` colapsa o bloco e abre o próximo não confirmado | bloco fecha; sucessor abre | `blocks.test.ts:278` — `expect(result.open).toBe('delivery')` + `expect(result.settled).toEqual(['contact'])`<br>`CheckoutPage.test.tsx:470` — `expect(region('Contato').queryByLabelText('WhatsApp')).not.toBeInTheDocument()` + `expect(region('Entrega').getByLabelText('CEP')).toBeInTheDocument()`<br>`…:491` (Entrega → Pagamento) | ✅ |
| **FLW-04** bloco que nasce válido sem edição ⇒ colapsado, sem exigir `Continuar` | `settled` desde o primeiro render | `blocks.test.ts:289` — `expect(result.settled).toEqual(['contact','delivery'])` + `expect(result.open).toBe('payment')`<br>`CheckoutPage.test.tsx:563` — `expect(region('Entrega').queryByLabelText('CEP')).not.toBeInTheDocument()` + endereço exibido<br>`ContactBlock.test.tsx` "semear de `customers` NÃO suja" — `expect(useCheckoutStore.getState().dirty).toEqual([])`<br>`DeliveryBlock.test.tsx` "semear o endereço `is_default` e pré-selecionar o frete NÃO sujam" — idem | ✅ |
| **FLW-05** Pagamento nunca colapsa por completude | `payment` nunca em `settled`; `open === 'payment'` | `blocks.test.ts:310` — `expect(result.settled).toEqual(['contact','delivery'])` + `expect(result.open).toBe('payment')` (com `confirmed: [...,'payment']` e `dirty: ['payment']`)<br>`…:320` — `open === 'payment'` com os três completos<br>`CheckoutPage.test.tsx:416` — `expect(region('Pagamento').getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()` + `expect(screen.getAllByRole('button', { name: 'Alterar' })).toHaveLength(2)` | ✅ |
| **FLW-06** `Alterar` abre um e colapsa os demais; `Continuar` devolve o foco ao primeiro bloco ainda não confirmado | `editing` vence a ordem; ao confirmar, `editing` zera | `blocks.test.ts:328` — `expect(result.open).toBe('contact')` com `editing: 'contact'`<br>`CheckoutPage.test.tsx:426` — Contato aberto, Entrega e Pagamento fechados<br>`…:504` — após `Continuar`, `expect(region('Pagamento').getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()` | ⚠️ **spec-precision gap** (ver nota A) |
| **FLW-07** três blocos válidos ⇒ CTA habilitado, independente de bloco aberto | `disabled === false` com `open !== null` | `CheckoutPage.test.tsx:531` — `expect(region('Pagamento').getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()` **e** `expect(cta()).toBeEnabled()`<br>`blocks.test.ts:355` — `expect(result.complete).toHaveLength(3)` com `open === 'contact'`<br>Gate no código: `CheckoutPage.tsx:500` — `disabled={flow.complete.length !== 3 \|\| busy}` | ✅ |

**Nota A (FLW-06)** — a spec diz "devolve o foco ao **primeiro bloco ainda não confirmado**". A
implementação devolve ao primeiro bloco **não *settled*** (`blocks.ts:112`), e `settled` trata
"completo + nunca editado" como confirmado (é o que FLW-04 exige). O teste `:504` espera
**Pagamento**, não Entrega — coerente com FLW-04, divergente da letra de FLW-06. Os dois ACs só não
se contradizem porque `settled` é a leitura correta; a spec deveria dizer "não resolvido". Sem
impacto funcional.

### P1 — Um pagamento, um botão

| Critério | Desfecho definido pela spec | `arquivo:linha` + asserção | Resultado |
| --- | --- | --- | --- |
| **PGM-01** cards de PIX e Cartão com **mesma largura e mesma altura** | larguras/alturas iguais para rótulos de tamanhos diferentes | `PaymentBlock.test.tsx:137` — `expect(pix.className).toContain('basis-0')` + `expect(card.className).toContain('basis-0')` + `grow` nos dois<br>Código: `PaymentBlock.tsx:215` e `:243`<br>Runtime medido: **385×95 e 385×95** em 1440 | ✅ (asserção é *proxy* de classe; a igualdade real vem do runtime — jsdom não faz layout) |
| **PGM-02** ícone do PIX é a marca, `fill="currentColor"` | SVG oficial, não lucide | `PaymentBlock.test.tsx:151` — `expect(icon.getAttribute('viewBox')).toBe('0 0 16 16')`, `expect(icon.getAttribute('fill')).toBe('currentColor')`, `expect(icon.getAttribute('class')).not.toMatch(/lucide/)`, `expect(icon.querySelectorAll('path')).toHaveLength(2)`<br>Fonte: `apps/store/src/shared/ui/PixIcon.tsx:12-22` | ✅ |
| **PGM-03** PIX ⇒ campo de documento, **não** o formulário de cartão | campo presente, Brick ausente | `PaymentBlock.test.tsx:258` — `expect(screen.getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()` + `expect(screen.queryByTestId('card-brick')).not.toBeInTheDocument()` | ✅ |
| **PGM-04** Cartão ⇒ formulário **imediatamente** (antes de existir pedido), sem campo de documento | Brick montado com `orderId === null`; campo ausente | `PaymentBlock.test.tsx:265` — `renderBlock({ orderId: null })`, então `expect(screen.getByTestId('card-brick')).toBeInTheDocument()` + `expect(screen.queryByLabelText(DOC_FIELD_LABEL)).not.toBeInTheDocument()`<br>Código: `PaymentBlock.tsx:149` (`if (orderId && payment.method !== 'card')`) e `:309` | ✅ |
| **PGM-05** formulário sem botão de pagar próprio e sem campo de e-mail | `hidePaymentButton`, e-mail vindo do bloco 1 | `CardPaymentBrick.test.tsx:65` — `expect(capturedProps.customization.visual.hidePaymentButton).toBe(true)`<br>`…:71` — `hideFormTitle === true`<br>`…:78` — `expect(capturedProps.initialization.payer.email).toBe('marina@email.com')`<br>`PaymentBlock.test.tsx:285` — `expect(screen.getByTestId('card-brick').getAttribute('data-email')).toBe('marina@email.com')`<br>Runtime: **um único** botão de pagamento na página, **zero** campo de e-mail | ✅ (o "sem campo de e-mail" é asseverado pelo **mecanismo** documentado do SDK; o desfecho em si só pelo runtime) |
| **PGM-06** CTA com Cartão valida o formulário **antes** de criar o pedido; inválido ⇒ erros do Brick visíveis, sem pedido nem cobrança | ordem tokenizar→criar; zero efeito no inválido | `CheckoutPage.test.tsx:917` — `expect(createOrderMutateAsync).not.toHaveBeenCalled()`, `expect(createPaymentMutateAsync).not.toHaveBeenCalled()`, `expect(saveCpfMutateAsync).not.toHaveBeenCalled()`, `expect(useCheckoutStore.getState().orderId).toBeNull()`<br>`…:928` — `expect(getCardFormDataMock.mock.invocationCallOrder[0]).toBeLessThan(createOrderMutateAsync.mock.invocationCallOrder[0])`<br>`lib/__tests__/cardBrick.test.ts:39,47,53,59,63` — `resolves.toBeNull()` nas cinco formas de falha | ✅ ("erros de campo do Brick visíveis" não é asseverado — é comportamento do próprio Brick; o que o código garante é **não desmontá-lo**) |
| **PGM-07** PIX ⇒ cria pedido e apresenta o QR | pedido criado, QR montado, sem tokenização | `CheckoutPage.test.tsx:1028` — `expect(screen.getByTestId('pix-payment')).toBeInTheDocument()`, `expect(getCardFormDataMock).not.toHaveBeenCalled()`, `expect(createPaymentMutateAsync).not.toHaveBeenCalled()`, `expect(saveCpfMutateAsync).toHaveBeenCalledWith({ customerId: 'c1', cpf: CPF_VALIDO })`<br>`…:825` — `data-order === 'order-1'` | ✅ (sem prova de runtime — ver [Sem prova de execução](#sem-prova-de-execução)) |
| **PGM-08** recusa ⇒ CTA acionável e retentativa reusa o mesmo pedido `pending` | 2 cobranças, 1 pedido, mesmo `order_id` | `CheckoutPage.test.tsx:960` — `expect(createPaymentMutateAsync).toHaveBeenCalledTimes(2)`, `expect(createOrderMutateAsync).toHaveBeenCalledTimes(1)`, `expect(createPaymentMutateAsync.mock.calls[1][0].order_id).toBe('order-1')`<br>`PaymentBlock.test.tsx:229` — com `orderId` e método `card`, o Brick **segue montado** | ✅ ("CTA permanece acionável" é provado por uso — o segundo `fireEvent.click(cta())` funciona — mas não por `expect(cta()).toBeEnabled()`) |
| **PGM-09** troca de método desmonta a superfície anterior | Brick libera o container | `PaymentBlock.test.tsx:274` — após alternar, `expect(screen.queryByTestId('card-brick')).not.toBeInTheDocument()` e o campo volta<br>`CardPaymentBrick.test.tsx:53` — `expect(unmountController).toHaveBeenCalledTimes(1)` no `unmount()`<br>Código: `CardPaymentBrick.tsx:31-37` | ✅ |

### P1 — Documento aceita CPF ou CNPJ

| Critério | Desfecho definido pela spec | `arquivo:linha` + asserção | Resultado |
| --- | --- | --- | --- |
| **DOC-01** máscara `000.000.000-00` até 11 dígitos, `00.000.000/0000-00` a partir do 12º | troca **no** 12º dígito | `validators/__tests__/document.test.ts:22` — `expect(maskDocument('11222333000')).toBe('112.223.330-00')` **e** `expect(maskDocument('112223330001')).toBe('11.222.333/0001')`<br>`…:27` — `expect(maskDocument('11222333000181')).toBe('11.222.333/0001-81')`<br>`PaymentBlock.test.tsx:302` — mesma transição pelo campo real; `maxLength={18}` em `PaymentBlock.tsx:285` | ✅ |
| **DOC-02** 11 dígitos com DV de CPF **ou** 14 com DV de CNPJ ⇒ bloco válido; qualquer outro comprimento/DV ⇒ erro e bloco inválido | `isPaymentComplete` true/false + mensagem | `blocks.test.ts:177` — `expect(isPaymentComplete({ method:'pix', cpf: VALID_CNPJ })).toBe(true)`<br>`…:203` — DV de CNPJ errado ⇒ `false`; `…:207` — comprimento intermediário ⇒ `false`<br>`document.test.ts:66` — `isValidDocument('112223330001')` e `('1122233300018')` ⇒ `false`; `:71` — 11 e 14 dígitos iguais ⇒ `false`<br>`cnpj.test.ts:54,58,66,73,78,83,87`<br>`PaymentBlock.test.tsx:313` — CNPJ válido ⇒ `isPaymentComplete(...) === true`, sem `DOC_ERROR_MESSAGE`; `:182` — inválido ⇒ `getByRole('alert')` com `DOC_ERROR_MESSAGE` + `aria-invalid="true"` | ✅ |
| **DOC-03** `identification.type` = `CPF` (11) / `CNPJ` (14) | tipo e número exatos | `payment/__tests__/payer.test.ts:42` — `expect(payer.identification).toEqual({ type:'CPF', number:'52998224725' })`<br>`…:75` — `toEqual({ type:'CNPJ', number:'11222333000181' })`<br>`…:80,90` — DV errado e comprimento intermediário ⇒ `identification` ausente<br>`CardPaymentBrick.test.tsx:84,93,102` — o mesmo par no *prefill* do Brick | ✅ (sem prova de runtime; **e** sem sensor no grafo da edge function — ver mutante #8) |
| **DOC-04** `customers.cpf` recebe só dígitos, CPF **e** CNPJ | payload `{ cpf: '<dígitos>' }` | `entities/customer/api/__tests__/useSaveCustomerCpf.test.tsx` (`describe` "CNPJ grava igual ao CPF (DOC-04)") — `expect(updateMock).toHaveBeenCalledWith({ cpf: '11222333000181' })`; `resolves.toBe('11222333000181')`; DV errado ⇒ `rejects.toThrow(INVALID_CPF_MESSAGE)` **e** `expect(updateMock).not.toHaveBeenCalled()`<br>Código: `useSaveCustomerCpf.ts:30-32` | ✅ |
| **DOC-05** no cartão o documento persistido é o do Brick; ausente ⇒ `customers.cpf`; faltando os dois ⇒ erro sem criar pedido | valor exato em `saveCpf` | `CheckoutPage.test.tsx:982` — `expect(saveCpfMutateAsync).toHaveBeenCalledWith({ customerId:'c1', cpf:'39053344705' })` (= `CARD_FORM_DATA.payer.identification.number`)<br>`…:1020` — com o rascunho em `'111.444.777-35'`, o valor gravado **continua** `'39053344705'`<br>`…:989` — sem `identification` no Brick, `cpf:'11222333000181'` (o de `customers`)<br>`…:1006` — faltando os dois, `expect(brickError()).toBe(MISSING_DOCUMENT_MESSAGE)` + `createOrder`/`createPayment` não chamados | ✅ **asseverado por valor, não por chamada** — e o par `:982`/`:1020` é o que discrimina de verdade |

### P2 — O resumo é o do board `04`

| Critério | Desfecho definido pela spec | `arquivo:linha` + asserção | Resultado |
| --- | --- | --- | --- |
| **RSM-01** faixas com 24px de respiro, itens a 16px, miniatura 56×56 raio 12 | `px-6` em todas as faixas; `gap-4`; `h-14 w-14 rounded-[12px]` | `OrderSummary.test.tsx:348` — `header` com `px-6` **e** `bands.forEach(band => expect(band.className).toContain('px-6'))`<br>`:357` — `expect(itemsBand.className).toContain('gap-4')`<br>`:364` — `h-14` + `w-14` + `rounded-[12px]`<br>Runtime: as 6 faixas com `padding-left: 24px` | ✅ |
| **RSM-02** faixa de cupom: bordas 1px em cima/embaixo, **ícone de etiqueta**, `CÓDIGO aplicado`, valor em geleia, ação de remover | 5 elementos | `OrderSummary.test.tsx:385` — `expect(screen.getByText('NANA10 aplicado')).toBeInTheDocument()` + `queryByTestId('coupon-input')` ausente<br>`:393` — `expect(band.className).toContain('border-y')`, `expect(within(band).getByText('−R$ 5,96').className).toContain('text-nanita-jam')`, `getByRole('button', { name: 'Remover cupom' })`<br>Código: `OrderSummary.tsx:119-139` (`<Tag …>` em `:121`) | ⚠️ **4 de 5** — o **ícone de etiqueta** não é asseverado (mutante #14 sobreviveu) |
| **RSM-03** sem cupom ⇒ campo de digitar continua | `CouponInput` presente | `OrderSummary.test.tsx:414` — `expect(screen.getByTestId('coupon-input')).toBeInTheDocument()` + `queryByText(/aplicado/)` ausente<br>`:403` — remover o cupom **devolve** o campo | ✅ |
| **RSM-04** linha de desconto rotulada com o código (`Cupom NANA10`) | rótulo com código, não só "Cupom" | `OrderSummary.test.tsx:196` — `screen.getByText('Cupom NANA10')`, `expect(screen.queryByText('Cupom')).not.toBeInTheDocument()`, `within(couponRow).getByText('−R$ 10,00')` | ✅ |
| **RSM-05** total em 32px (Fredoka, `-0.03em`) | 32px **+ Fredoka + −0.03em** | `OrderSummary.test.tsx:431` — `expect(total.className).toContain('text-[32px]')` + `toContain('leading-[34px]')`<br>Código: `OrderSummary.tsx:206` — `font-heading text-[32px] font-semibold leading-[34px] tracking-[-0.03em]`<br>Runtime: 32px / 34px / **−0.96px** / **Fredoka** | ⚠️ **parcial** — `font-heading` e `tracking-[-0.03em]` não são asseverados (mutante #13 sobreviveu) |
| **RSM-06** com cartão habilitado e ≥2x: linha **abaixo do total, alinhada à direita**, `no cartão: Nx de R$ Y sem juros`, sobre o **total do cartão** | texto exato + base `cardTotal` + posição/alinhamento | `OrderSummary.test.tsx:439` — total exibido `R$ 105,00` **e** `toHaveTextContent('no cartão: 6x de R$ 18,33 sem juros')` (18,33 = 110/6, não 105/6)<br>`:451` — 1x ⇒ linha ausente; `:458` — `card_enabled:false` ⇒ ausente<br>`model/__tests__/useCheckoutTotals.test.tsx:74` — `expect(t.totals.total).toBe(105)` + `expect(t.cardTotal).toBe(110)`; `:85`, `:94`, `:103`<br>Código: `OrderSummary.tsx:211-215` (dentro de `totalRow`, `text-right`) | ⚠️ **quase completo** — o **alinhamento à direita** não é asseverado (mutante #14 sobreviveu). Texto e base são exemplares. |
| **RSM-07** frete grátis ⇒ barra do mobile diz `Resumo · N itens · frete grátis` | string exata | `OrderSummary.test.tsx:468` — `toHaveTextContent('Resumo · 2 itens · frete grátis')`<br>`:477` — abaixo do threshold, `not.toHaveTextContent('frete grátis')` | ✅ |

**Status**: 28/28 ACs rastreados com evidência · **0 sem cobertura** · **3 asserções parciais**
(RSM-02 ícone, RSM-05 tipografia, RSM-06 alinhamento) · **1 spec-precision gap** (FLW-06, nota A).

---

## Discrimination Sensor

**Profundidade**: P0-full (caminho de dinheiro) — **15 mutações**, todas em estado descartável
(cópia binária do arquivo, mutação, teste, restauração verificada por `sha256`).

| # | Arquivo:linha | Mutação | Resultado |
| --- | --- | --- | --- |
| 1 | `packages/core/src/checkout/blocks.ts:106` | remove `index < BLOCK_ORDER.length - 1` (`temSucessor`) — Pagamento passaria a colapsar | ✅ **Morto** — 4 testes (`FLW-05` ×2 + 2) |
| 2 | `blocks.ts:108` | `(confirmed \|\| !dirty)` → `true` — volta o auto-avanço | ✅ **Morto** — 3 em `@nanapin/core` (`FLW-01`, `FLW-07`) **e** 5 em `CheckoutPage.test.tsx` (`FLW-01` ×2, `FLW-02`, `FLW-03` ×2) |
| 3 | `blocks.ts:62` | `isPaymentComplete`: cartão passa a exigir documento | ✅ **Morto** — 2 testes |
| 4 | `apps/store/src/features/checkout/lib/cardBrick.ts:32` | `getCardFormData` devolve o objeto **sem** `token` | ✅ **Morto** — `'retorno sem token devolve null'` |
| 5 | `apps/store/src/pages/CheckoutPage.tsx` `handleConfirm` | move a tokenização para **depois** da criação do pedido | ✅ **Morto** — **6** testes (PGM-06 ×2, DOC-05 ×4) |
| 6 | `packages/core/src/validators/document.ts:17` | `maskDocument`: limite `<= 11` → `<= 12` | ✅ **Morto** — 2 em `@nanapin/core` **e** 1 em `PaymentBlock.test.tsx` (DOC-01) |
| 7 | `packages/core/src/validators/cnpj.ts:37` | `isValidCnpj`: `length !== 14` → `length < 14` | ✅ **Morto** — `'rejeita CNPJ com mais de 14 dígitos'` |
| 8 | `packages/core/src/payment/payer.ts:57` | força `type: 'CPF'` para 14 dígitos | ✅ **Morto** por `@nanapin/core` · ⚠️ **`@nanapin/functions` fica 232/232 verde** com o mutante vivo |
| 9 | `apps/store/src/features/checkout/ui/OrderSummary.tsx:59` | parcela derivada de `totals.total` em vez de `cardTotal` | ✅ **Morto** — RSM-06 |
| 10 | `apps/store/src/features/checkout/model/useCheckoutTotals.ts:128` | `cardTotal = totals.total` (colapsa a segunda conta) | ✅ **Morto** — 2 testes (RSM-06 em dois níveis) |
| 11 | `apps/store/src/features/checkout/ui/DeliveryBlock.tsx:221` | a pré-seleção automática do frete passa a chamar `markDirty` | ✅ **Morto** — 4 testes (ADR-02 ×2 na página + FLW-04 ×2 no bloco) |
| 12 | `apps/store/src/features/checkout/ui/PaymentBlock.tsx:27,215` | remove `basis-0` do card do PIX **e** troca `PixIcon` pelo `QrCode` do lucide | ✅ **Morto** — PGM-01 e PGM-02 |
| 13 | `OrderSummary.tsx:206` | remove `font-heading` **e** `tracking-[-0.03em]` do total | ❌ **SOBREVIVEU** — 33/33 verdes |
| 14 | `OrderSummary.tsx:121,212` | remove o `<Tag>` da faixa de cupom **e** o `text-right` da sub-linha de parcela | ❌ **SOBREVIVEU** — 33/33 verdes |
| 15 | `PaymentBlock.tsx` (fim da `<section>`) | injeta um segundo botão `Continuar` **no bloco de Pagamento** | ❌ **SOBREVIVEU** — 99/99 verdes (`PaymentBlock` + `CheckoutPage`) |

**Resultado**: **12/15 mortos, 3 sobreviveram.**

Leitura: o **núcleo** — fluxo, ordem do CTA, documento, base da parcela — é altamente
discriminante; mutações sutis morrem em **dois níveis** (domínio puro *e* página). O que não tem
sensor é a **fidelidade visual nomeada pela spec** (tipografia, ícone, alinhamento) e o
**invariante "um botão só"** fora do CTA.

O mutante #15 é o mais sério dos três: a frente 3 da feature existe para eliminar o segundo botão
de pagamento, e a suíte não perceberia um segundo botão de ação voltando ao bloco 3. A própria
tabela de assunções da spec grifa isso ("Bloco 3 não ganha `Continuar` … seria um segundo botão —
exatamente o que a frente 3 vem eliminar") — mas nada assevera.

---

## Code Quality

| Princípio | Status | Observação |
| --- | --- | --- |
| Código mínimo | ✅ | `resolveFlow` é 2 regras e 12 linhas; `resolveBlocks` preservado sem mudança de contrato |
| Mudanças cirúrgicas | ✅ | Nenhum arquivo fora do escopo da feature foi tocado pelo diff da 15 |
| Sem scope creep | ✅ | `installments.ts` é **movimento**, não reescrita — os 6 casos herdados seguem idênticos (`model/__tests__/installments.test.ts`) |
| Segue os padrões | ✅ | FSD respeitada (`lib/cardBrick.ts` no slice, `PixIcon` em `shared/ui`, domínio em `@nanapin/core`); zero `bg-nanita-jam` fora do CTA (asseverado em 3 suítes) |
| Desfecho asseverado bate com a spec | ⚠️ | 3 parciais (RSM-02/05/06) — nomeados acima |
| Cobertura por camada (domínio 1:1; UI happy+edge+erro) | ✅ | `blocks.test.ts` 60 casos · `document`+`cnpj` 37 · `CheckoutPage` 67 · `PaymentBlock` 32 · `OrderSummary` 33 |
| Todo teste mapeia a um AC / edge case / "Done when" | ✅ | Nenhum teste órfão encontrado no diff |
| Diretrizes documentadas seguidas | ✅ | `CLAUDE.md` (mobile-first, paleta Nanita, `nanapin` só como identificador técnico, sem commits atômicos durante a implementação) · `DESIGN.md` (§8 paleta) |
| Comentários explicam **por quê**, não **o quê** | ✅ | Padrão do repo mantido — `blocks.ts:84-97`, `cardBrick.ts:1-25`, `useCheckoutTotals.ts:50-55` documentam a decisão, não o código |

Um ponto de qualidade **positivo** que merece registro: `useCheckoutTotals` calcula `cardTotal`
por uma **segunda chamada à mesma `calculateOrderTotals` do servidor** em vez de reverter o
desconto PIX por aritmética. É o que impede a sub-linha de parcelamento de divergir do que o
Mercado Pago cobraria — e o mutante #10 prova que a suíte percebe se alguém "simplificar" isso.

---

## Edge Cases

- [x] **Nenhum método habilitado** ⇒ `NO_METHOD_MESSAGE`, nenhuma superfície, CTA desabilitado —
  `PaymentBlock.test.tsx:109` (`getByRole('alert')` + `method === null` + `isPaymentComplete === false`)
  e `:293` (nem campo nem Brick).
- [x] **Bloco confirmado que volta a ser inválido** ⇒ `Continuar` e CTA desabilitam juntos —
  `CheckoutPage.test.tsx:518` (`expect(continuar('Contato')).toBeDisabled()` **e** `expect(cta()).toBeDisabled()`);
  `blocks.test.ts:343` (sai de `settled` e reabre).
- [x] **`getFormData()` rejeita ou devolve vazio** ⇒ tratado como inválido, sem erro não tratado —
  `lib/__tests__/cardBrick.test.ts:39,47,53,59,63` (5 formas de falha, todas `resolves.toBeNull()`).
- [x] **11 ou 14 dígitos todos iguais** ⇒ reprovado — `document.test.ts:71`, `cnpj.test.ts:66`.
- [x] **Pedido existente + rascunho mudado (CHK-08)** ⇒ invalidado antes de criar o novo —
  `CheckoutPage.test.tsx:649` (segundo pedido criado após editar). A guarda é comum aos dois
  métodos (`CheckoutPage.tsx:224`), mas o teste exercita **só o caminho PIX**.
- [ ] **Carrinho muda o total com o Brick montado** ⇒ o valor do Brick acompanha —
  **sem teste**. O `useMemo` de `initialization` depende de `amount` (`CardPaymentBrick.tsx:47-58`),
  então o objeto novo dispara o `update` do wrapper; `CardPaymentBrick.test.tsx:46` prova o
  `amount` **inicial**, nunca um *rerender* com valor diferente. Lacuna pequena e antiga
  (o comportamento é do SDK), registrada por honestidade.

---

## Gate Check

Medições feitas entre **15:41 e 15:47**, na árvore da feature 15 (antes das edições concorrentes).

| Gate | Comando | Resultado |
| --- | --- | --- |
| Testes | `pnpm test --force` (sem cache, 4 pacotes) | ✅ exit 0 — **core 591 · store 602 · functions 232 · backoffice 878** = **2303 passed, 0 failed, 0 skipped** |
| Tipos (store) | `npx tsc --noEmit -p apps/store/tsconfig.app.json` | ✅ **0** (baseline 0) |
| Tipos (core) | `npx tsc --noEmit -p packages/core/tsconfig.json` | ⚠️ **12 erros, todos pré-existentes e fora da feature**: 10 em `packages/core/src/mockup/composeMockup.test.ts` (TS2740, mock de `HTMLImageElement`) + 2 em `packages/supabase/src/client.ts` (TS2339, `import.meta.env`). **Zero** em `validators/`, `checkout/` ou `payment/`. A `Success Criteria` da spec ("tsc core em 0") não se cumpre ao pé da letra — mas não por causa desta feature. |
| Lint (store) | `pnpm --filter @nanapin/store lint` | ✅ **5 erros / 7 warnings** vs baseline **5 / 8** — **zero erros novos**, um warning a menos. Os 5 erros são os de sempre (`ShippingCalc.tsx:39`, `CategoryPage.tsx:52`, e os 3 restantes do baseline) |
| Build | `pnpm build` | ✅ exit 0 (lembrando: **não** prova tipo) |

**Integridade da suíte**: contagem **subiu** em todos os pacotes tocados (o `tasks.md` registra
store em 547 no fecho do Batch 1 → 602 agora). Nenhum teste apagado. Um teste **reescrito** e
declarado no `tasks.md` (desvio 2 do Batch 1): `'três blocos completos deixam todos colapsados'`
→ `'…colapsam Contato e Entrega e deixam Pagamento aberto (FLW-05)'`. Conferido: a asserção nova é
**mais forte**, não mais fraca — passou a exigir `getAllByRole('button', { name: 'Alterar' })`
com comprimento **2** e o campo de documento presente, em vez de só contar colapsos.

---

## Sem prova de execução

O que **não** foi provado rodando, e por quê:

1. **PGM-07 (PIX ponta a ponta), PGM-08 (recusa real de cartão) e DOC-03 (o `type` chegando ao
   Mercado Pago)** — a edge function `mercado-pago` **não sobe local** (503 `BOOT_ERROR`:
   `packages/core/src/pricing/index.ts` importa o *bare specifier* `@nanapin/supabase/types`, que
   o Deno não resolve). Defeito **pré-existente** (commits `c6944b6` e `de63871`, 2026-08-01),
   registrado em `docs/qa/bugs/BUG-20260802-edge-function-mercado-pago-nao-sobe-local.md`. **Não é
   lacuna desta feature.**
   **A cobertura de teste compensa?** Para PGM-07 e PGM-08, **sim**: os dois são decisões de
   orquestração da **página** (quem cria, quantas vezes, com qual `order_id`), e os testes
   asseveram `order_id` e contagens de chamada por valor — o mutante #5 prova que discriminam.
   Para **DOC-03, parcialmente**: `buildPayer` está bem coberto em `@nanapin/core`, mas o mutante
   #8 mostrou que o suite de `@nanapin/functions` — o que exercita `handlers.ts`, o consumidor
   real — **não percebe** o `type` errado. Some-se a isso o `AD-002`/`AD-012` do `CLAUDE.md`
   (arquivo novo no grafo de imports Deno; tipo escrito à mão é afirmação, não verificação) e
   fica: **o `cnpj.ts` nunca foi carregado pelo runtime Deno**. É o único ponto da feature em que
   "verde" não significa "roda".
2. **A tokenização real do Brick** (`getFormData()` contra o SDK do MP) — o SDK é mockado em todo
   teste; o runtime provou o formulário montado (10 iframes, campos Número/Validade/CVV/Titular/
   Documento) e a ausência do botão e do e-mail, mas não um `token` real virando cobrança.
3. **PGM-01 (altura igual)** e **RSM-01/05 (medidas)** — jsdom não calcula layout. As asserções
   são de classe; os números (385×95 / 385×95, 24px, 32px/34px/−0.96px/Fredoka) vêm da medição em
   browser registrada abaixo.

**Prova de runtime confrontada com o código** — os itens medidos em browser (Chrome, loja em
:8080, Supabase local, 390×844 e 1440) foram todos reconferidos contra a fonte e **se sustentam**:

| Item medido | Confirmação no código |
| --- | --- |
| FLW-01 contato completo ⇒ bloco continua aberto | `blocks.ts:104-109` + `CheckoutPage.tsx:134-141` |
| FLW-03 `Continuar` colapsa e abre Entrega | `CheckoutPage.tsx:149-152, 470, 477` |
| PGM-01 cards 385×95 e 385×95 | `PaymentBlock.tsx:215,243` — `basis-0 grow`, altura por `stretch` |
| PGM-02 `viewBox="0 0 16 16"` | `PixIcon.tsx:15` |
| PGM-03 campo "CPF ou CNPJ do pagador", Brick ausente | `PaymentBlock.tsx:272-305` |
| PGM-04 Brick montado, campo ausente | `PaymentBlock.tsx:309-316` |
| PGM-05 um único botão de pagar, zero e-mail | `CardPaymentBrick.tsx:66-74` (`hidePaymentButton`, `hideFormTitle`, `payer.email`) |
| RSM-01/05 total 32/34/−0.96/Fredoka; 6 faixas com 24px | `OrderSummary.tsx:206` e `px-6` em `:63,80,120,141,151,198,268` |
| RSM-02 `border-y`, `padding 14px 24px`, `gap-[10px]`, `aria-label="Remover cupom"` | `OrderSummary.tsx:120-138` |
| RSM-04 `Cupom NANA10` | `OrderSummary.tsx:177` |
| RSM-06 `no cartão: 4x de R$ 41,98 sem juros`, some com `count < 2` | `OrderSummary.tsx:60,211-215` |
| RSM-07 `Resumo · 20 itens · frete grátis` | `OrderSummary.tsx:244-247` |
| Correção do scroll horizontal (452px → 390px) | `CheckoutPage.tsx:452` — `flex min-w-0 flex-col gap-3` **presente**, com teste de regressão em `CheckoutPage.test.tsx:1162` |
| Correção do alvo de toque do `Alterar` do Contato (28px → 44px) | `ContactBlock.tsx` — `flex min-h-11 shrink-0 items-center rounded-pill px-3` **presente**; `PaymentBlock.tsx:190` e `DeliveryBlock` já tinham |

**Nada da evidência de runtime contradiz o código.** As duas correções feitas durante a prova
(`min-w-0` e o alvo de toque) estão na árvore, e a primeira ganhou teste de regressão — com a
ressalva, honestamente escrita no próprio teste, de que ele assevera a **classe**, não a ausência
do scroll.

---

## Fix Plans

Todos **test-only**. Nenhum exige mudança de código de produção — o comportamento já está correto.

### Fix 1 — Bloco de Pagamento não pode ganhar um segundo botão de ação (mutante #15)
- **Causa raiz**: a assunção "Bloco 3 não ganha `Continuar`" (spec, tabela de assunções) e o
  objetivo "um pagamento, um botão" não têm asserção. Um segundo botão no bloco 3 passa em 99/99.
- **Task**: em `apps/store/src/features/checkout/ui/__tests__/PaymentBlock.test.tsx`, com o bloco
  aberto nos dois métodos: `expect(screen.queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument()`.
  Em `CheckoutPage.test.tsx`, com os três blocos válidos:
  `expect(within(screen.getByRole('region', { name: 'Pagamento' })).queryAllByRole('button', { name: /continuar|pagar/i })).toHaveLength(0)`.
- **Done when**: reinjetar o mutante #15 faz a suíte falhar.
- **Prioridade**: **Major** — guarda o objetivo central da frente 3.

### Fix 2 — RSM-05: a tipografia do total é parte do AC (mutante #13)
- **Causa raiz**: o AC diz "32px de corpo (**Fredoka**, **−0.03em**)"; o teste assevera só
  `text-[32px]` e `leading-[34px]`.
- **Task**: em `OrderSummary.test.tsx:431`, acrescentar
  `expect(total.className).toContain('font-heading')` e `toContain('tracking-[-0.03em]')`.
- **Done when**: reinjetar o mutante #13 faz a suíte falhar.
- **Prioridade**: **Minor** (cosmético, mas literal na spec).

### Fix 3 — RSM-02: o ícone de etiqueta é parte do AC (mutante #14a)
- **Causa raiz**: o AC enumera 5 elementos da faixa; o teste assevera 4.
- **Task**: em `OrderSummary.test.tsx:393`, acrescentar
  `expect(band.querySelector('svg.lucide-tag')).not.toBeNull()` (ou equivalente por `data-testid`).
- **Done when**: reinjetar a remoção do `<Tag>` faz a suíte falhar.
- **Prioridade**: **Minor**.

### Fix 4 — RSM-06: o alinhamento à direita é parte do AC (mutante #14b)
- **Causa raiz**: o AC diz "abaixo do total e **alinhada à direita**"; o teste assevera só o texto.
- **Task**: em `OrderSummary.test.tsx:439`,
  `expect(screen.getByText(/no cartão:/).className).toContain('text-right')`.
- **Done when**: reinjetar a remoção do `text-right` faz a suíte falhar.
- **Prioridade**: **Minor**.

### Fix 5 (opcional, fora do escopo desta feature) — DOC-03 sem sensor no grafo Deno
- **Causa raiz**: `@nanapin/functions` fica verde com `buildPayer` devolvendo `type:'CPF'` para 14
  dígitos, e a edge function não sobe local (`BUG-20260802-edge-function-mercado-pago-nao-sobe-local`).
  `cnpj.ts` é arquivo **novo** no grafo de imports Deno e nunca foi carregado por esse runtime.
- **Task**: um caso em `@nanapin/functions` que exercite `handlers.ts` com um pedido de CNPJ e
  assevere `payer.identification.type === 'CNPJ'` no corpo enviado ao MP.
- **Prioridade**: **Minor** (rede, não defeito) — mas é a lição do `AD-012` aplicada.

### Fix 6 (higiene) — `tasks.md` desatualizado
- A tabela de progresso ainda marca **Batch 2 "🔄 em execução"** e **Fecho "⏳"**, com todas as
  tasks entregues. Atualizar antes do commit.

---

## Requirement Traceability Update

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| FLW-01, FLW-02, FLW-03, FLW-04, FLW-05, FLW-07 | Design/Pending | ✅ Verified |
| FLW-06 | Design/Pending | ✅ Verified ⚠️ (spec-precision: "não confirmado" deveria ler "não resolvido") |
| PGM-01, PGM-02, PGM-03, PGM-04, PGM-05, PGM-06, PGM-09 | Design/Pending | ✅ Verified |
| PGM-07, PGM-08 | Design/Pending | ✅ Verified (por teste; sem prova de runtime — edge function não sobe local) |
| DOC-01, DOC-02, DOC-04, DOC-05 | Design/Pending | ✅ Verified |
| DOC-03 | Design/Pending | ✅ Verified ⚠️ (sem sensor no grafo Deno — Fix 5) |
| RSM-01, RSM-03, RSM-04, RSM-07 | Design/Pending | ✅ Verified |
| RSM-02, RSM-05, RSM-06 | Design/Pending | ⚠️ Needs test hardening (Fix 2, 3, 4) |

---

## Summary

**Overall**: ⚠️ **Issues — não é "não pronto", é "sem rede em 4 pontos"**

**Spec-anchored check**: 28/28 ACs rastreados a `arquivo:linha` · 25 com desfecho integralmente
asseverado · 3 parciais · 1 spec-precision gap
**Sensor**: 15 mutações, **12 mortas**, **3 sobreviveram**
**Gate**: 2303 passed, 0 failed, 0 skipped · `tsc` store **0** · lint store **5/7** (baseline 5/8)
· build ✅

**O que funciona** (e funciona bem):

- O auto-avanço acabou de verdade, e a prova é dupla — domínio puro **e** página, pelos campos
  reais. Mutar `resolveFlow` mata testes nos dois níveis.
- A ordem do CTA no cartão (**tokenizar → documento → gravar → pedido → cobrar**) é o coração da
  feature, e é o ponto mais bem defendido da suíte: inverter a ordem mata **6** testes.
- DOC-05 é asseverado **por valor**, não por chamada — e o teste que crava o rascunho num CPF
  **diferente** do que o Brick devolve é o que torna a asserção incontornável.
- A base da parcela (`cardTotal` por uma segunda passada na `calculateOrderTotals` do servidor) é
  uma decisão de engenharia acertada, e a suíte percebe se ela for simplificada.
- ADR-02 sobreviveu à mudança: sujar a semeadura do `is_default` mata 4 testes.

**Problemas encontrados** (todos de força de teste, nenhum de comportamento):

1. Um segundo botão de ação no bloco de Pagamento passaria despercebido — justamente o que a
   frente 3 veio eliminar.
2. A tipografia do total (Fredoka, −0.03em), o ícone da faixa de cupom e o alinhamento da linha de
   parcela são texto literal de AC sem asserção nenhuma.

**Next steps**: aplicar os Fixes 1–4 (quatro asserções, ~10 linhas), atualizar o `tasks.md`
(Fix 6), reverificar reinjetando os mutantes #13, #14 e #15, e então commitar. Fixes 5 é dívida
registrada, não bloqueio.
