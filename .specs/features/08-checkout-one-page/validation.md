# Checkout One-Page Validation

## Estado atual: PASS ✅ (iteração 2, 2026-07-28)

| Iteração | Quem | Veredito | Resultado |
| -------- | ---- | -------- | --------- |
| 1 | Verifier independente (sub-agent, autor ≠ verificador) | **FAIL ❌** | 3 gaps: 1 BLOCKER + 2 MAJOR · 12 mutações, 11 mortas, 1 sobreviveu |
| Fix 1 | Fix worker (sub-agent) | — | 3 gaps corrigidos · 652 → 674 testes |
| **2** | **Orquestrador — passe independente (`validate.md`, standalone fallback)** | **PASS ✅** | **3 gaps fechados e confirmados por sensor próprio · 5 mutações válidas, 5 mortas** |

O relatório completo da **iteração 1** está preservado abaixo, a partir de *"# Iteração 1"* — inclusive
o veredito FAIL, que é o registro de por que esta feature não passou de primeira.

---

## Iteração 2 — verificação independente do orquestrador

### GAP 1 (era BLOCKER) — "exibido == cobrado" era falso para cupom `percent`

**O defeito.** A regra do cupom estava implementada **duas vezes** com arredondamento diferente: a loja
arredondava a base (`round2(bumpedSubtotal)`), o servidor somava float cru. Reproduzido numericamente
pelo orquestrador **antes** da correção, com script próprio:

| Cenário | Loja exibia | Servidor cobrava |
| ------- | ----------- | ---------------- |
| 3 × R$ 29,90 + cupom `percent` 15% · PIX | R$ 72,43 | **R$ 72,44** |
| idem no cartão | R$ 76,24 | **R$ 76,25** |

Um centavo, e **contra a cliente**, num carrinho trivial e sem bump nenhum. Era exatamente a classe de
defeito que a feature existe para corrigir, reintroduzida no preço. Escapou do Execute porque (a) o
único teste que protegia a base do cupom usava cupom `fixed`, não `percent`, e (b) o Success Criterion
que pede *"asserção direta, não inspeção visual"* nunca havia sido escrito.

**A correção — estrutural.** `resolveCouponDiscount(subtotal, coupon)` em
`packages/core/src/payment/pricing.ts:58-71`, com `const base = round2(subtotal)` na **linha 66, dentro
da função**. Assim não importa se um lado passa base arredondada e o outro passa base crua: convergem
por construção. Chamada pelos dois lados e por mais ninguém:

- `apps/store/src/features/checkout/model/useCheckoutTotals.ts:102`
- `supabase/functions/mercado-pago/index.ts:246`
- `grep "type === 'percent'"` nos dois arquivos → **zero** (nenhum cálculo inline sobrou)

**O teste é honesto, não tautológico** — foi a verificação de maior valor desta iteração, porque um
teste que compara `f(x)` com `f(x)` não provaria nada.
`packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts` monta os dois caminhos **com a
assimetria real de cada lado**:

| Linha | Helper | Base do cupom |
| ----- | ------ | ------------- |
| `:54` | `storeTotals` | `resolveCouponDiscount(round2(bumpedSum(s)), ...)` — arredondada |
| `:69` | `serverTotals` | `resolveCouponDiscount(bumpedSum(s), ...)` — float cru |

Reforços que impedem falso verde: `:195` fixa o valor exato esperado (quebrar os dois lados junto ainda
falha), `:199` `expect(store).toEqual(server)` compara a decomposição inteira (o total não pode bater
por compensação de erros), e `:224` `expect(raw).not.toBe(89.7)` prova que o resíduo de ponto flutuante
existe de fato. **FECHADO.**

### GAP 2 (era MAJOR) — fronteira do frete grátis sem sensor

`subtotal >= threshold` → `>` deixava 21/21 testes verdes: todos usavam subtotal 200 contra threshold
150 (estritamente maior), então a **igualdade exata** — o caso de fronteira de SHP-06 — não era medida.
Corrigido com dois casos em `DeliveryBlock.test.tsx`: `subtotal === threshold` (150/150 → a mais barata
mostra "Grátis", preço riscado, `cost === 0`) e o lado de baixo (149,99). **FECHADO** — confirmado por
sensor próprio (mutação #2 abaixo).

### GAP 3 (era MAJOR) — ADR-02 não colapsava a Entrega no caso geral

A semeadura do endereço `is_default` preenchia os campos mas não colapsava, porque
`isDeliveryComplete` exige `shipping !== null` (`packages/core/src/checkout/blocks.ts:44-45`). Com 2+
opções cotadas o bloco abria expandido — ADR-02 diz "preenchido **e colapsado**". Estava `[x]` sem
teste do caso geral (`useDefaultAddress` fixado em `{ data: null }` em todos os cenários).

**Decisão tomada:** endereço vindo do default salvo + cotação com opções → pré-selecionar a mais barata
(`cheapestQuoteId`). Coerente com o edge case que a spec já define ("uma única opção → pré-selecionada")
e com SHP-06. Restrições com teste: endereço digitado na hora **não** pré-seleciona; trocar o CEP
descarta a seleção. Teste do caso geral em `apps/store/src/pages/__tests__/CheckoutPage.test.tsx:376`.
**FECHADO.**

Ressalva honesta, não gap: com a cotação **em voo** o bloco fica expandido por um instante e colapsa
quando resolve (estado de carregamento); `is_default` incompleto abre expandido, que é o correto.

### Gate (rodado pelo orquestrador)

| Comando | Resultado |
| ------- | --------- |
| `pnpm test` | **674 passed, 0 failed** — 240 core + 372 store + 62 backoffice · EXIT=0 |
| `pnpm build` | **2 successful, 2 total** · EXIT=0 |
| grep de paleta (`features/checkout` + `CheckoutPage` + `OrderConfirmationPage` + `entities/order`) | **zero** |
| grep `18.90` / `12.90` em `features/checkout` | **zero** |
| grep `.skip(` / `.only(` / `.todo(` no escopo | **zero** |
| `git diff` em `pricing.test.ts`, `status.test.ts`, `webhookSignature.test.ts` | **vazio** — pré-existentes intocados |
| Contagem | 652 → **674** (+22 na Fix 1) · nada removido |
| Fluxo de 5 passos | os 6 componentes não existem mais; `PaymentStep.test.tsx` migrado para `PaymentBlock.test.tsx` |
| Uma pílula geleia por tela | `/checkout` = 1 (o CTA — as outras 2 ocorrências no fonte estão em branches de retorno antecipado mutuamente exclusivas: gate de login e erro) · `/pedido/:id` = 1 |

### Sensor de discriminação (iteração 2)

Backup → `Edit` cirúrgico → rodar → restaurar → `diff` confirmando byte-identidade. **Sem `git stash`**
(o tree tem trabalho alheio). Os 4 arquivos mutados voltaram byte-idênticos.

| # | Mutação | Alvo | Resultado |
| - | ------- | ---- | --------- |
| 1 | `const base = round2(subtotal)` → `const base = subtotal` | `pricing.ts:66` | **MORTO** — 8 testes falharam, com as mensagens reproduzindo os centavos exatos (`expected 72.43 to be 72.44`) |
| 2 | `subtotal >= threshold` → `>` | `DeliveryBlock.tsx:152` | **MORTO** — falhou exatamente o teste de fronteira novo |
| 3 | `quantity === 1` → `>= 1` | — | **INVÁLIDA** — a única ocorrência dessa string em `pricing.ts` está num **comentário** (`:75`). Mutou texto, não código |
| 3b | `if (item.quantity !== 1) return items` → `< 1` | `pricing.ts:93` | **MORTO** — falhou "devolve a lista intacta quando o item que casa tem quantity > 1" |
| 4 | `isOrderStale` → `return false` sempre | `blocks.ts` | **MORTO** — 8 testes falharam |
| 5 | Remover `if (!data \|\| data.length === 0) throw` | `useSaveCustomerCpf.ts:36` | **MORTO** — 2 testes falharam (os que provam que RLS negando em silêncio não passa por gravação bem-sucedida) |

**5 mutações válidas, 5 mortas, 0 sobreviveram.** A #3 foi falso positivo do próprio sensor, corrigido
e re-executado como #3b — registrado por honestidade metodológica: sensor que muta comentário não mede
nada, e por um momento pareceu ter achado um gap de receita que não existia.

### A lição

A tese da feature era "uma função, os dois lados — divergência impossível por construção". O GAP 1
mostrou que a tese estava **certa e a execução não**: o desconto do cupom ficou fora da função
compartilhada e um centavo escapou por ali. O que pegou não foi revisão de código nem o gate de 652
testes verdes — foi **exigir a asserção direta que o Success Criterion pedia**, e rodar o sensor.
Carry-forward #39: desconto por item tem dono único no domínio, nunca espelhamento por disciplina.

---
---

# Iteração 1 (histórico — veredito FAIL, superado pela Fix 1)

**Date**: 2026-07-28
**Spec**: `.specs/features/08-checkout-one-page/spec.md` (rev. 2, 44 requisitos)
**Diff range**: **não há commit desta feature.** HEAD = `fa34e6c`; todo o trabalho está no working
tree, não commitado (o `CLAUDE.md` do projeto proíbe commits atômicos por task; os commits são do
fecho e não foram gerados). Superfície derivada de `git status --porcelain` + `git diff HEAD`, filtrada
para excluir a `04-store-login-ux` (ver *Diff Surface*).
**Verifier**: sub-agente independente (autor ≠ verificador). Re-derivação a partir da spec, do zero.

---

## Verdict: ❌ FAIL

Três achados impedem o `Verified`. Um deles é exatamente o defeito que a feature veio corrigir.

1. **BLOCKER — "exibido == cobrado" é falso para cupom `percent`.** Reproduzido numericamente: a loja
   exibe **R$ 87,33** e o servidor cobra **R$ 87,34** num carrinho trivial (3 × R$ 29,90 + cupom 15%).
   Contradiz o Success Criterion *"o total no rótulo do CTA é igual ao `total` que a edge function
   persiste em `orders`"* e CHK-06 (*"o valor exato a pagar"*). Detalhe em *Exibido == cobrado*.
2. **MAJOR — mutante sobrevivente (SHP-06).** A fronteira `subtotal >= free_shipping_threshold` não é
   discriminada por nenhum teste: trocá-la por `>` deixa as 21 asserções do `DeliveryBlock` verdes.
   Por `validate.md` §5, mutante sobrevivente ⇒ a feature não é marcada como pronta.
3. **MAJOR — ADR-02 não é satisfeito no caso geral e não tem teste.** O bloco Entrega **não** abre
   colapsado quando existe endereço `is_default`, porque colapsar exige `isDeliveryComplete`, que exige
   `shipping !== null`, e a semeadura de `useDefaultAddress` preenche só o endereço.

O resto está sólido: 652 testes verdes, build verde, os dois greps da spec voltam zero, 11 de 12
mutações mortas, e ADR-05 (`orders.address_zip`) está asseverado **por valor** nas duas camadas.

---

## Gate Check (rodado pelo Verifier, não herdado)

| Gate | Comando | Resultado |
| ---- | ------- | --------- |
| Quick (core) | `pnpm --filter @nanapin/core test` | **227 passed**, 0 failed, 14 arquivos |
| Quick (store) | `pnpm --filter @nanapin/store test` | **363 passed**, 0 failed, 37 arquivos |
| Quick (backoffice) | `pnpm --filter @nanapin/backoffice test` | **62 passed**, 0 failed, 11 arquivos |
| Build | `pnpm test && pnpm build` | **exit 0** — 62 arquivos / **652 testes**, build dos dois apps verde |

- **Test count antes da feature**: 419 (107 core + 262 store + 49 backoffice, por `tasks.md`).
  **Depois**: 652. **Delta: +233.** Nenhuma queda.
- **Skipped**: zero. `grep -rnE "\.(skip|only|todo)\(|^\s*(xit|xdescribe)\("` sobre
  `apps/store/src apps/backoffice/src packages/core/src packages/supabase/src packages/auth/src` → **zero
  ocorrências**. Nenhum teste enfraquecido, pulado ou apagado.
- **Integridade da deleção do fluxo de 5 passos**: os 6 componentes
  (`ReviewStep`, `StepIndicator`, `CustomerStep`, `AddressStep`, `ShippingStep`, `PaymentStep`) **não
  existem** mais; as únicas referências restantes são comentários de proveniência. `PaymentStep.test.tsx`
  foi **migrado** para `PaymentBlock.test.tsx` (13 testes), não apagado — a contagem do store subiu
  (312 → 363), não caiu.
- **Flake registrado, não contado como FAIL**: numa das execuções, `pnpm --filter @nanapin/store test`
  saiu **exit 1** com `ReferenceError: window is not defined` **pós-teardown** do `input-otp@1.4.2`, em
  `AuthResetCodeStep.test.tsx`. **Nenhum teste falhou** (363 passed). É pré-existente, vem da
  `04-store-login-ux` e é alheio ao checkout (carry-forward #9). Na execução final de `pnpm test` o
  flake não se manifestou (exit 0).
- **Segundo flake observado (novo, registrar)**: numa execução paralela do store, dois testes de
  `PixPayment.test.tsx` (`guard StrictMode` e `QR expirado`) falharam. Reexecutados isoladamente duas
  vezes: **19/19 verdes** nas duas. São testes baseados em timer, sensíveis a carga — não a uma
  regressão.

### Greps exigidos pela spec — os três voltam zero

```
grep -rnE "bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]" \
  apps/store/src/features/checkout apps/store/src/pages/CheckoutPage.tsx \
  apps/store/src/pages/OrderConfirmationPage.tsx apps/store/src/entities/order   → ZERO (exit 1)

grep -rnE "18\.90|12\.90|dias úteis" apps/store/src/features/checkout                → ZERO (exit 1)
```

⚠️ Observação fora do escopo do grep, mas relevante: `apps/store/src/pages/AccountPage.tsx:17-21,114`
carrega 6 utilitários de cor fora da paleta (`bg-yellow-100`, `bg-blue-100`, `bg-purple-100`,
`bg-green-100`, `bg-red-100`, `text-green-600`). `/conta` é o **destino das duas ações primárias** de
CNF-02 e CNF-05, então a cliente cai em markup fora da paleta um clique depois. Fora dos 4 paths da
spec ⇒ não conta como GAP desta feature; fica como dívida para a `09-conta-cliente`.

### Uma pílula geleia por tela (DESIGN.md §8)

| Tela | Asserção | Resultado |
| ---- | -------- | --------- |
| `/checkout` | `CheckoutPage.test.tsx:670-672` — `expect(jam).toHaveLength(1)` + `expect(jam[0].textContent).toMatch(/Pagar/)` | ✅ 1 (o CTA) |
| `/pedido/:id` | `OrderConfirmationPage.test.tsx:218-222` — `expect(jamPills).toHaveLength(1)` + `expect(jamPills[0].textContent).toContain('Acompanhar pedido')` | ✅ 1 |

O seletor de `/pedido/:id` filtra `bg-nanita-jam` **+** `rounded-pill` (correto: os discos da
`OrderTimeline` são forma, não ação — carry-forward #31). O de `/checkout` filtra só `bg-nanita-jam`,
o que é mais estrito na contagem mas não prova a forma de pílula. Carry-forward #25/#32 (duas pílulas
na tela do PIX) está **resolvido**: `PixPayment.test.tsx:262,272` assevera `toHaveLength(0)`.

---

## Exibido == cobrado — ❌ DIVERGÊNCIA ENCONTRADA

O coração da feature. Conferido por construção **e** numericamente.

### O que está certo (por construção)

Os dois lados chamam o **mesmo** módulo: a loja via `@nanapin/core/payment/pricing`
(`useCheckoutTotals.ts:15-21`), a edge function via caminho relativo
(`supabase/functions/mercado-pago/index.ts:6`). Mesmo `applyOrderBump`, mesmo `calculateOrderTotals`,
mesmo `bump` lido de `store_settings.checkout`, mesmo `pixDiscountPercent`. E o preço unitário bate:
`apps/store/src/entities/product/api/useProducts.ts:9` mapeia `price: p.base_price ?? p.price ?? 0`,
que é exatamente o `Number(p.base_price)` que o servidor usa em `index.ts:191`.

### O que está errado (a ordem de arredondamento da base do cupom)

A base do cupom **não** é código compartilhado — é lógica duplicada, espelhada por disciplina. E o
espelho está torto num passo:

| Lado | Arquivo:linha | Expressão |
| ---- | ------------- | --------- |
| Loja | `apps/store/src/features/checkout/model/useCheckoutTotals.ts:90-102` | `bumpedSubtotal = round2(...)` → `round2((bumpedSubtotal * coupon.value) / 100)` |
| Servidor | `supabase/functions/mercado-pago/index.ts:219,238` | `currentSubtotal = bumpedItems.reduce(...)` (**sem `round2`**) → `(currentSubtotal * coupon.value) / 100` |

A loja arredonda a base antes de aplicar o percentual; o servidor não. Quando a soma em ponto
flutuante cai logo abaixo do valor arredondado e o percentual pousa numa fronteira de meio centavo,
os dois divergem.

**Reproduzido** (script descartável em `packages/core`, executado e removido — ver *Discrimination
Sensor*, nota de limpeza):

| Cenário | `rawSubtotal` | Cupom loja | Cupom servidor | **Exibido** | **Cobrado** | Δ |
| ------- | ------------- | ---------- | -------------- | ----------- | ----------- | - |
| 3 × 29,90 + bump 50% + cupom **10%** + PIX 5% | `102.14999999999999` | `10.22` | `10.214999…` | **R$ 102,23** | **R$ 102,24** | **+0,01** |
| 3 × 29,90 (**sem bump**) + cupom **15%** + PIX 5% | `89.69999999999999` | `13.46` | `13.454999…` | **R$ 87,33** | **R$ 87,34** | **+0,01** |
| 3 × 29,90 (sem bump) + cupom 10% + PIX 5% | `89.69999999999999` | `8.97` | `8.969999…` | R$ 91,59 | R$ 91,59 | 0 |
| bump + cupom `fixed` 20 / 7,77 / percent 15 / 33 | — | — | — | igual | igual | 0 |

Três leituras importantes:

1. **Não é específico do bump.** O segundo caso não tem bump nenhum. O gatilho é o cupom `percent`
   sobre um subtotal cuja soma float fica abaixo do arredondado — `29,90 × 3` é um carrinho comum de
   uma loja de pins de R$ 9–30.
2. **O servidor cobra MAIS que o exibido.** A direção é contra a cliente.
3. **`useCheckoutTotals.ts:10-11` declara explicitamente que espelha a edge function** (*"A base do
   cupom é o subtotal já com o bump — igual à edge function"*). O espelho existe na intenção e falha
   no arredondamento.

### Por que o gate não pegou

- O teste que protege a base do cupom (`OrderSummary.test.tsx`, o que matou a mutação 12) usa cupom
  **`fixed`** (`−R$ 11,25`) — não exercita o caminho `percent`, que é onde o arredondamento morde.
- **Não existe nenhum teste comparando o total da loja com o total do servidor.** O Success Criterion
  pede *"asserção direta, não inspeção visual"*; essa asserção não foi implementada. A igualdade é um
  argumento de código compartilhado, e o argumento tem um furo justamente no trecho **não**
  compartilhado.

**Correção sugerida (uma linha, um lado):** remover o `round2` da base na loja
(`useCheckoutTotals.ts:101-102`, passar a usar a soma crua como o servidor) **ou** adicionar `round2`
ao `currentSubtotal` do servidor (`index.ts:219`). Depois, cravar a igualdade num teste que rode as
duas contas lado a lado com cupom `percent` — é o único jeito de o espelho parar de depender de
disciplina.

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero: sem `file:line` = não coberto. Caminhos relativos à raiz do repo.

### P1: Checkout em uma página — 3 blocos + resumo persistente

| Criterion | Spec-defined outcome | `file:line` + asserção | Result |
| --------- | -------------------- | ---------------------- | ------ |
| CHK-01 | 3 blocos numerados `1 Contato`/`2 Entrega`/`3 Pagamento`; "Revisão" inexistente | `apps/store/src/pages/__tests__/CheckoutPage.test.tsx:282-284` — `expect(screen.getByRole('region', { name: 'Contato' })).toBeInTheDocument()` (×3); `:291` — `expect(container.textContent).not.toMatch(/revis[ãa]o/i)` | ⚠️ Spec-precision gap |
| CHK-02 | overlay com `returnTo='/checkout'`, blocos não renderizados | `CheckoutPage.test.tsx:302-304` — `expect(state.returnTo).toBe('/checkout')` + `expect(screen.queryByRole('region', { name: 'Contato' })).not.toBeInTheDocument()` | ✅ PASS |
| CHK-03 | definição exata de completo por bloco | `packages/core/src/checkout/__tests__/blocks.test.ts:65,70,74,82,86,90,94,98` (contato: whatsapp 10 e 11 ok, 9 e 12 falham); `:108,114,120,124,130,134,142,150` (entrega); `:168,172,176,180,185` — `expect(isPaymentComplete({ method: 'pix', cpf: '529.982.247-26' })).toBe(false)` | ✅ PASS |
| CHK-04 | abre 1º incompleto; completo colapsa c/ resumo + "Alterar"; máx. 1 aberto; zero botão geleia | `blocks.test.ts:190,196,202,206,217` — `expect(resolveBlocks(draft)).toEqual({ open: 'delivery', complete: ['contact'] })`; `CheckoutPage.test.tsx:356` — `expect(screen.getAllByRole('button', { name: 'Alterar' })).toHaveLength(3)`; `:365-367` (campos dos outros ausentes); `ContactBlock.test.tsx:127`, `DeliveryBlock.test.tsx:399`, `PaymentBlock.test.tsx:216` — `expect(container.querySelectorAll('[class*="bg-nanita-jam"]')).toHaveLength(0)` | ✅ PASS |
| CHK-05 | resumo na mesma tela; ≥1024px coluna fixa, abaixo barra colapsável; itens+qtd, frete, cupom, desconto PIX, total | conteúdo: `features/checkout/ui/__tests__/OrderSummary.test.tsx:149-153,160-161,188-189,116-118,233` — `expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 107,00')`; barra: `:299-301` — `expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('Resumo · 2 itens')`. **Posicionamento (`sticky`/`lg:grid-cols`/`lg:hidden`): sem evidência** — grep `sticky\|lg:hidden\|lg:grid-cols\|inset-x-0` em todos os `__tests__` → zero | ⚠️ Parcial |
| CHK-06 | CTA com valor do método + método no rótulo, valores diferentes com `pix_discount_percent > 0`; incompleto ⇒ desabilitado | `CheckoutPage.test.tsx:392` — `expect(cta()).toHaveTextContent(/Pagar\s*R\$\s*109,90\s*com PIX/)`; `:400` — `/Pagar\s*R\$\s*114,90\s*no cartão/`; `:377` — `expect(cta()).toBeDisabled()`; `:384` — `toBeEnabled()` | ✅ PASS |
| CHK-07 | cria `pending` 1×; retentativa sem edição reusa o `order_id` | `CheckoutPage.test.tsx:410,414,415` — `expect(createOrderMutateAsync).toHaveBeenCalledTimes(1)` após 2 cliques + `expect(useCheckoutStore.getState().orderId).toBe('order-1')`; persistência: `checkoutStore.test.ts:72` — `expect(persisted.state.orderId).toBe('order-42')`. **`status: 'pending'` no payload do insert não é asseverado** (`useOrders.ts:115` o define; `useOrders.test.tsx` não o checa) | ⚠️ Parcial |
| CHK-08 | edição após criação ⇒ próximo CTA cria pedido novo | `CheckoutPage.test.tsx:431` — `expect(createOrderMutateAsync).toHaveBeenCalledTimes(2)` (edição via UI real, `:425-428`); `checkoutStore.test.ts:186,198,206,214` — `expect(useCheckoutStore.getState().isStale()).toBe(true)` / `false` só p/ `consent`; `blocks.test.ts:234-276` | ✅ PASS |
| CHK-09 | erro amigável + blocos e carrinho preservados + CTA reacionável | `CheckoutPage.test.tsx:505-512` — `expect(toast.error).toHaveBeenCalledWith(ORDER_FAILED_MESSAGE)` + `expect(useCartStore.getState().items).toHaveLength(1)` + `expect(cta()).toBeEnabled()` + 2ª chamada | ✅ PASS |
| CHK-10 | <1024px CTA fixo no rodapé c/ total; header próprio em todos os viewports | header: `CheckoutPage.test.tsx:652-654` — `expect(screen.queryByRole('navigation')).not.toBeInTheDocument()`. **CTA fixo no rodapé: sem evidência** — nenhum teste manipula viewport/matchMedia; `CheckoutPage.tsx:321` (`fixed inset-x-0 bottom-0 … lg:static`) não é asseverado | ⚠️ Parcial |
| CHK-11 | `setGuestEmail(email, consent)` chamado; consentimento no Contato | `ContactBlock.test.tsx:78` — `expect(setGuestEmail).toHaveBeenCalledWith('marina@email.com', false)`; `:88` — `(..., true)`; `:96` — `not.toHaveBeenCalled()` | ✅ PASS |
| CHK-12 | faixa imediatamente abaixo do CTA; só "Mercado Pago", "Embalagem protegida", troca c/ defeito em 7 dias; texto batendo com `PoliciesPage`; sem devolução por desistência | `CheckoutPage.test.tsx:660-663` — `expect(screen.getByText('Troca de produto com defeito em 7 dias')).toBeInTheDocument()` + `expect(screen.queryByText(/desist/i)).not.toBeInTheDocument()`. **Verificado por leitura**: `PoliciesPage.tsx` não contém "Mercado Pago" (diz "Pix e cartão de crédito", `:12`) nem nada sobre embalagem — só a troca em 7 dias (`:16`) casa. Posição ("imediatamente abaixo") sem asserção | ⚠️ Spec-precision gap |

**CHK-01 — por que spec-precision gap:** os numerais `1`/`2`/`3` existem na fonte
(`ContactBlock.tsx:58,87`) mas nenhum teste os assevera; o nome acessível é `'Contato'`, não
`'1 Contato'`. "**Exatamente** três blocos" também não: `getAllByRole('region')).toHaveLength(3)` não
existe no repo. E o "Revisão" é checado num único estado (após `fillAll()`), não "em nenhum estado".

**CHK-12 — por que spec-precision gap:** a spec é internamente ambígua. Ela enumera três strings e
**na mesma frase** exige que "o texto bata com `PoliciesPage.tsx`" — mas duas das três não têm
contrapartida naquela página. A implementação segue a enumeração da spec (o que é defensável) e a
parte que carrega risco jurídico (*"sem prometer devolução por desistência"*) **está** asseverada.
Não é blocker; é a spec que precisa escolher entre as duas metades da frase.

### P1: Frete cobrado = frete cotado no Melhor Envio

| Criterion | Spec-defined outcome | `file:line` + asserção | Result |
| --------- | -------------------- | ---------------------- | ------ |
| SHP-01 | por opção: `company`, `name`, `price` e **data** | `features/checkout/ui/__tests__/DeliveryBlock.test.tsx:240-241` — `expect(screen.getByText('Correios PAC')).toBeInTheDocument()`; `:250-251` — `expect(screen.getByText('R$ 14,90')).toBeInTheDocument()`; `:261` — `expect(screen.getByText('Chega entre 4 e 6 de agosto')).toBeInTheDocument()`; payload: `useShippingQuote.test.tsx:87` — `expect(bodyOf(0).postal_code_to).toBe('01310100')` | ✅ PASS |
| SHP-02 | dimensões/peso reais do produto; fallback 11/2/16/0.1 por item | `entities/cart/lib/__tests__/toQuotePayload.test.ts:59-62` — `expect(payload[0].width).toBe(25)` / `.weight).toBe(0.85)`; fallbacks `:70,77,83,89`; por item `:98-99`; mappers: `useProducts.test.tsx:56-59`, `useProduct.test.tsx:56-59` — `expect(mapped.weight_kg).toBe(0.85)` | ✅ PASS |
| SHP-03 | CEP <8 não cota; ViaCEP falha ⇒ manual **e ainda assim cota** | `useShippingQuote.test.tsx:76` — `expect(invokeMock).not.toHaveBeenCalled()`; `useCepLookup.test.tsx:38` — idem p/ ViaCEP; `:87-94` — `expect(result.current.data).toEqual({ street: '', …, manual: true })`; `DeliveryBlock.test.tsx:176-179` — 4 campos `toBeEnabled()`. **"ainda assim cotar pelo CEP informado": sem evidência** (o hook de cotação é mockado nos casos `manual`) | ⚠️ Parcial |
| SHP-04 | `shipping_cost` == `price` da opção; zero literal no checkout | `DeliveryBlock.test.tsx:276-283` — `expect(useCheckoutStore.getState().shipping).toEqual({ serviceId: '2', serviceName: 'SEDEX', carrier: 'Correios', cost: 24.8, … })` para `price: '24.80'`; `CheckoutPage.test.tsx:441-453` — `shipping_cost: 14.9` para `price: '14.90'`; grep → zero | ✅ PASS |
| SHP-05 | única opção "Frete padrão" c/ `default_shipping_cost` + aviso + compra prossegue | `DeliveryBlock.test.tsx:304-306` — `expect(screen.getByText('Correios Frete padrão')).toBeInTheDocument()` + `expect(useCheckoutStore.getState().shipping?.cost).toBe(9.9)`; `:315` — `expect(screen.getByRole('alert')).toHaveTextContent(QUOTE_UNAVAILABLE_MESSAGE)`; vazio ≠ erro: `useShippingQuote.test.tsx:156-157`. **"única" não é contado; "permite concluir a compra" sem evidência** (nenhum teste completa a compra pelo caminho de cotação falhada) | ⚠️ Parcial |
| SHP-06 | threshold zera a **mais barata** (preço riscado, cobra 0); demais mantêm preço | `DeliveryBlock.test.tsx:337-341` — `expect(screen.getByText('R$ 14,90')).toHaveClass('line-through')` + `expect(useCheckoutStore.getState().shipping?.cost).toBe(0)`; `:351,354` — `expect(screen.getAllByText('Grátis')).toHaveLength(1)` + `cost).toBe(24.8)`; `estimate.test.ts:135` — `expect(id).toBe(2)` (compara como número) | ❌ **GAP — mutante sobreviveu** |
| SHP-07 | snapshot: `shipping_method`, `shipping_carrier`, `shipping_cost`, `service_id`, janela; recotação não altera | `entities/order/api/__tests__/useOrders.test.tsx:115` — `expect(insertedOrder().shipping_service_id).toBe('2')`; `:121-122`, `:128`, `:134-135` — `expect(insertedOrder().delivery_estimate_min).toBe('2026-08-04')`; ausentes ⇒ `null`: `:149-155`. **Imutabilidade vs recotação: sem evidência**, e `apps/backoffice/src/entities/order/api/useAdminOrders.ts:137` faz `update({ tracking_code, shipping_carrier })` num pedido criado, sem teste | ⚠️ Parcial |
| SHP-08 | `orders` c/ `delivery_estimate_min`/`_max` (`date`) e `shipping_service_id` | `supabase/migrations/20260727120000_orders_shipping_snapshot.sql:12-15` — `ADD COLUMN IF NOT EXISTS delivery_estimate_min date` etc. | ✅ PASS (camada schema = build gate) |
| SHP-09 | `hoje + handling_days + range` em dias úteis; faixa vs data única; `delivery_time` como fallback | `packages/core/src/shipping/__tests__/estimate.test.ts:75-76` — `expect(iso(estimate.min)).toBe('2026-08-03')`; `:86-87` (range ausente); `:45,53,57` (seg–sex); `:92-93` (`handling_days=0`); `:113` — `expect(formatEstimate(…)).toBe('entre 4 e 6 de agosto')`; `:117` — `'em 30 de julho'`; default: `useStoreSettings.test.ts:100` — `expect(DEFAULT_SHIPPING.handling_days).toBe(2)` | ✅ PASS |
| SHP-10 | resposta obsoleta descartada; só o CEP mais recente | `useShippingQuote.test.tsx:189-195` — resolve `'01310100'` atrasado e assevera `expect(result.current.data).toEqual([quote({ id: 20, name: 'SEDEX' })])`; `:210` — `toBeUndefined()` sem flash | ✅ PASS |

**SHP-06 — o gap:** ver *Discrimination Sensor*, mutação 11. `DeliveryBlock.tsx:131`
(`subtotal >= free_shipping_threshold`) está **correto**, mas nenhum teste o protege: os dois casos de
SHP-06 usam `setCartSubtotal(200)` contra `free_shipping_threshold = 150` (estritamente maior). A
igualdade exata só aparece na faixa informativa do `OrderSummary` (`:285-289`), que é outro arquivo e
outro código. Uma cliente exatamente no threshold é o caso de fronteira do AC e está sem sensor.

### P1: PIX com pagador identificado (CPF)

| Criterion | Spec-defined outcome | `file:line` + asserção | Result |
| --------- | -------------------- | ---------------------- | ------ |
| PGD-01 | campo "CPF do pagador" obrigatório, máscara `000.000.000-00`, c/ justificativa | `features/checkout/ui/__tests__/PaymentBlock.test.tsx:126-128` — `expect(field).toBeRequired()` + `expect(screen.getByText(CPF_JUSTIFICATION)).toBeInTheDocument()`; `:136` — `expect(screen.getByLabelText('CPF do pagador')).toHaveValue('390.533.447-05')`; `validators/__tests__/cpf.test.ts:10` — `expect(maskCpf('12345678909')).toBe('123.456.789-09')` | ✅ PASS |
| PGD-02 | <11 dígitos ou DV inválido ⇒ mensagem no campo + CTA desabilitado | `PaymentBlock.test.tsx:145-147` — `expect(screen.getByRole('alert')).toHaveTextContent(CPF_ERROR_MESSAGE)` + `aria-invalid='true'` + `expect(isPaymentComplete(...)).toBe(false)`; `cpf.test.ts:53,57,66-68,73,78,82`. O elo "DV ruim ⇒ CTA desabilitado" é composto em 3 arquivos, não asseverado num cenário só | ✅ PASS |
| PGD-03 | CPF persistido em `customers.cpf` **antes** de `create-payment` | `CheckoutPage.test.tsx:536-539` — `expect(saveCpfMutateAsync).toHaveBeenCalledWith({ customerId: 'c1', cpf: CPF_VALIDO })` + `expect(saveCpf…invocationCallOrder[0]).toBeLessThan(createOrder…invocationCallOrder[0])`; `useSaveCustomerCpf.test.tsx:55-57,63` — `expect(updateMock).toHaveBeenCalledWith({ cpf: '39053344705' })` (sem máscara) | ✅ PASS |
| PGD-04 | `payer.identification = { type:'CPF', number }` do servidor + `first_name`/`last_name` de `customers.name`, p/ PIX e cartão; servidor vence o Brick | `packages/core/src/payment/__tests__/payer.test.ts:42` — `expect(payer.identification).toEqual({ type: 'CPF', number: '52998224725' })`; `:51-53`; `:79` — `expect(merged.identification).toEqual({ type: 'CPF', number: '52998224725' })` (Brick mandou `11144477735`); `:87-88`, `:96-98`, `:116` | ✅ PASS (domínio) + ⏳ manual (runtime) |
| PGD-05 | policy de UPDATE em `customers` escopada a `user_id = auth.uid()` | `supabase/migrations/20260727120100_customer_address_update_rls.sql:34-40` — `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`; roteiro manual + resultado medido no corpo (`:50-98`) | ⏳ manual (RLS em banco vivo) |
| PGD-06 | CPF pré-preenchido; CPF novo ⇒ pagamento usa o digitado e `customers.cpf` atualizado | `PaymentBlock.test.tsx:163` — `expect(screen.getByLabelText('CPF do pagador')).toHaveValue('390.533.447-05')` (de `customer.cpf`); `:171` — `toHaveValue('111.444.777-35')` c/ `customers.cpf` divergente. **O caminho "digitou diferente ⇒ grava o digitado" não é exercitado na página** (`authState.customer` nunca tem `cpf` em `CheckoutPage.test.tsx`) | ⚠️ Parcial |

### P1: Telas de PIX e de pedido confirmado

| Criterion | Spec-defined outcome | `file:line` + asserção | Result |
| --------- | -------------------- | ---------------------- | ------ |
| CNF-01 | valor exato a pagar em destaque + nota de desconto PIX | `features/checkout/ui/__tests__/PixPayment.test.tsx:171` — `expect(screen.getByText('R$ 46,55')).toBeInTheDocument()`; `:179` — `expect(screen.getByText('já com os 5% de desconto do PIX')).toBeInTheDocument()`; `:188-189` — `'R$ 49,00'` + `not.toMatch(/desconto do PIX/i)`; `PaymentBlock.test.tsx:181` — `expect(pix.getAttribute('data-amount')).toBe('46.55')` | ✅ PASS |
| CNF-02 | expirado ⇒ novo código **e** ponteiro p/ "Minha conta → Pedidos" com link `/conta` | `PixPayment.test.tsx:205` — `expect(screen.getByRole('link', { name: /minha conta/i })).toHaveAttribute('href', '/conta')`; `:197`, `:212-213` (as duas saídas coexistem) | ✅ PASS |
| CNF-03 | aprovação navega p/ `/pedido/:id`; confirmação sobrevive ao reload | `CheckoutPage.test.tsx:571` — `expect(screen.getByText('rota-confirmacao:order-1')).toBeInTheDocument()`; `:578-580` — nenhum estado inline sobra; `OrderConfirmationPage.test.tsx:88` — `expect(useOrderMock).toHaveBeenCalledWith('order-42')` e a página renderiza com carrinho vazio + store resetado | ✅ PASS |
| CNF-04 | mascote `wink`, nº, valor pago, e-mail, timeline de 4 estágios c/ atual destacado + janela | `OrderConfirmationPage.test.tsx:128` — `expect(mascotRects()).toBe(1)`; `:135` — `/PEDIDO NP-9001/`; `:142` — `'R$ 109,90'`; `:149` — `'marina.y@email.com'`; `:165-166` — `expect(screen.getAllByRole('listitem')).toHaveLength(4)` + `'Chega entre 4 e 6 de agosto'`; `entities/order/ui/__tests__/OrderTimeline.test.tsx:30-33,39` — `expect(states()).toEqual(['complete','current','future','future'])` | ✅ PASS |
| CNF-05 | uma primária ("Acompanhar pedido", geleia, `/conta`) + uma secundária (contorno tinta, `/`); carrinho/cupom limpos **só** na aprovação | `OrderConfirmationPage.test.tsx:199-201`, `:209-211`, `:221-222`; `CheckoutPage.test.tsx:607-609` — `expect(clearCartSpy).toHaveBeenCalledTimes(1)`; `:615-617` — `not.toHaveBeenCalled()` antes; `:628-629` (recusa não limpa) | ✅ PASS |
| CNF-06 | estados por forma + tokens `nanita-*`; grep de cores zero | `OrderTimeline.test.tsx:122-125` — `expect(complete).not.toMatch(/border/)` + `expect(new Set([complete, current, future]).size).toBe(3)` (com as classes de cor **removidas** antes, `:17-22`); greps: `:146-147`, `PixPayment.test.tsx:280-282`, `CheckoutPage.test.tsx:679-681`, `OrderSummary.test.tsx:335-337`, `OrderBump.test.tsx:180-182`, `PaymentBlock.test.tsx:223-225`; grep de repo → zero | ✅ PASS |

`expression="wink"` não é asseverado como prop, mas o proxy é válido: verifiquei
`packages/ui/src/nana-mascot.tsx:76-79` — `wink` é a **única** das 6 expressões com exatamente 1
`<rect>` (`happy`/`sad` têm 2, `heart`/`star`/`surprised` têm 0), então `toBe(1)` discrimina.

### P2: Endereço salvo, reaproveitado e gravado no pedido

| Criterion | Spec-defined outcome | `file:line` + asserção | Result |
| --------- | -------------------- | ---------------------- | ------ |
| ADR-01 | rua/bairro/cidade/UF travados; número e complemento editáveis | `DeliveryBlock.test.tsx:142-145` — `expect(screen.getByLabelText('Rua')).toHaveValue('Av. Brigadeiro Faria Lima')`; `:153-156` — 4× `toBeDisabled()`; `:164-168` — `toBeEnabled()` + `expect(useCheckoutStore.getState().address.number).toBe('3477')`; `:176-179` (`manual` destrava) | ✅ PASS |
| ADR-02 | endereço `is_default` ⇒ bloco Entrega abre **preenchido e colapsado**, c/ "Editar" | preenchimento: `DeliveryBlock.test.tsx:206-209` — `expect(screen.getByLabelText('CEP')).toHaveValue('04538-133')`. **"Colapsado": sem evidência e não implementado no caso geral** (verificado por leitura, ver abaixo) | ❌ GAP |
| ADR-03 | grava/atualiza `addresses` c/ `is_default = true`; policy de UPDATE escopada | `entities/address/api/__tests__/useSaveAddress.test.tsx:106-117` — `expect(insertMock).toHaveBeenCalledWith({ customer_id: 'cust-1', cep: '01310100', …, is_default: true })` + `expect(updateMock).not.toHaveBeenCalled()`; `:125-126`; migration `20260727120100_*.sql:42-48` (`USING`/`WITH CHECK` com o subselect por `customer_id`) | ✅ PASS (hook) + ⏳ manual (RLS) |
| ADR-04 | edição não cria 2º default | `useSaveAddress.test.tsx:142-144` — `expect(updateMock).toHaveBeenCalledWith(address)` + `expect(updateEqMock).toHaveBeenCalledWith('id', 'addr-77')` + `expect(insertMock).toHaveBeenCalledTimes(0)`; `:181-182` | ✅ PASS |
| ADR-05 | `orders.address_zip` **e** `address_complement` gravados | `entities/order/api/__tests__/useOrders.test.tsx:89` — `expect(insertedOrder().address_zip).toBe('01310100')`; `:95` — `expect(insertedOrder().address_complement).toBe('Apto 42')`; `CheckoutPage.test.tsx:441-453` — `address_zip: '04538133'` (prova o `stripCep` a partir de `'04538-133'`) | ✅ PASS |

**ADR-05 respondido explicitamente:** **sim**, existe teste que assevera **por valor** que o insert
leva o CEP — em duas camadas, com valores literais (`'01310100'` no hook, `'04538133'` na página).
Não é `expect.any(String)` nem checagem de presença. É o requisito com a evidência mais forte do
conjunto; o TypeError de `MelhorEnvioTab.tsx:71` está coberto na origem.

**ADR-02 — por que GAP (verificado por leitura, não por inferência):** `DeliveryBlock.tsx:67-75`
semeia **só** o endereço (`setAddress({ ...defaultAddress, manual: false })`). Colapsar exige
`isDeliveryComplete`, que exige `delivery.shipping !== null`
(`packages/core/src/checkout/blocks.ts:44-45`, provado em `blocks.test.ts:150`). A semeadura não
seleciona frete. Logo, com 2+ opções cotadas o bloco abre **expandido** — o AC não acontece. Só
colapsa quando a cotação devolve **uma** opção (pré-seleção automática) ou no fallback "Frete padrão".
Nenhum teste cobre o caminho: em `CheckoutPage.test.tsx:251` o `useDefaultAddress` é fixado em
`{ data: null }` em todos os cenários, e o teste de colapso do `DeliveryBlock` (`:221`) força
`open={false} complete` por prop com o store semeado à mão — prova a **apresentação** colapsada, nunca
que um `is_default` **causa** o colapso. `tasks.md:767` marca este item como `[x]`.

Nota menor: a spec diz **"Editar"** em ADR-02; a UI renderiza **"Alterar"** nos três blocos
(`ContactBlock.tsx:74`, `DeliveryBlock.tsx:213`, `PaymentBlock.tsx:142`) e o teste crava `'Alterar'`.
A própria spec usa "Alterar" em CHK-04 — inconsistência interna da spec, cosmética.

### P2: Order bump configurável, com preço calculado no servidor

| Criterion | Spec-defined outcome | `file:line` + asserção | Result |
| --------- | -------------------- | ---------------------- | ------ |
| BMP-01 | `store_settings.checkout` c/ 3 campos e defaults `false`/`null`/`50`; `SettingsKey`/`SettingsMap` + `DEFAULTS` incluem a chave; `handling_days` | `packages/core/src/hooks/__tests__/useStoreSettings.test.ts:57-61` — `expect(result.current.checkout).toEqual({ order_bump_enabled: false, order_bump_product_id: null, order_bump_discount_percent: 50 })`; `:76-80` — a linha `key='checkout'` **sobrevive** ao `fetchAllSettings`; `:86-88`, `:94`, `:99`, `:111-112`, `:119`; migration `20260727120200_*.sql` c/ os 3 defaults + `UPDATE … NOT value ? 'handling_days'` | ✅ PASS |
| BMP-02 | exibe c/ enabled + produto existe + `stock_total > 0` + fora do carrinho; entre PaymentBlock e CTA | `features/checkout/ui/__tests__/OrderBump.test.tsx:72-73` — `expect(screen.getByText('Porta-pins de feltro Nanita')).toBeInTheDocument()`; 5 negativos `:80,86,94,101,109` — `expect(container).toBeEmptyDOMElement()`. **Posição entre bloco e CTA: sem evidência** (`CheckoutPage.tsx:318` na fonte; nenhum teste de ordem no DOM) | ⚠️ Parcial |
| BMP-03 | item c/ `quantity=1` e `unit_price = round(base × (1 − pct/100), 2)`; total do resumo **e rótulo do CTA** atualizam na mesma interação | `CheckoutPage.test.tsx:472-480` — `expect(payload.items[1]).toEqual({ product_id: 'bump-1', …, quantity: 1, unit_price: 12.45 })`; `orderBump.test.ts:38` — `expect(result[0].unit_price).toBe(13.99)` (19.99 × 0.70); `OrderSummary.test.tsx:248-249` — `expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 112,45')`. **Rótulo do CTA com bump: sem evidência** (os 2 testes de rótulo rodam com `order_bump_enabled: false`); **"na mesma interação": sem evidência** (todo teste chama `toggleBump(true)` antes do render, ninguém clica o checkbox dentro da página) | ⚠️ Parcial |
| BMP-04 | desconto aplicado **no servidor**; valor cobrado **idêntico** ao exibido | `packages/core/src/payment/__tests__/orderBump.test.ts:84-85` (limite `quantity=1`), `:53-54` (só o 1º que casa), `:68,73,79` (negativos), `:114-115`, `:141-142` — `expect(totals.total).toBe(48)`. Servidor: `index.ts:217` aplica; `:270`/`:278` persiste e cobra. **A igualdade prometida é FALSA para cupom `percent`** — ver *Exibido == cobrado* | ❌ GAP |
| BMP-05 | marcar/desmarcar não duplica item nem acumula desconto | `OrderBump.test.tsx:151-152` — após 7 cliques, `expect(useCheckoutStore.getState().bumpChecked).toBe(true)` + `expect(screen.getByText('R$ 12,45')).toBeInTheDocument()`; `orderBump.test.ts:96-99` — `expect(second).toEqual(first)` e input não mutado; `checkoutStore.test.ts:117-124` (estado booleano, não contador) | ✅ PASS |
| BMP-06 | ativar/desativar, escolher produto, definir percentual em Configurações | `apps/backoffice/src/features/settings/ui/CheckoutSettingsCard.test.tsx:129-136` — `expect(mutateAsync).toHaveBeenCalledWith({ key: 'checkout', value: { order_bump_enabled: true, order_bump_product_id: null, order_bump_discount_percent: 50 } })`; `:147` — `…order_bump_product_id).toBe('prod-1')`; `:157` — `…discount_percent).toBe(35)`; fora de 1–99 rejeitado `:188,191` | ✅ PASS |

**Status geral**: ❌ 3 gaps + 9 parciais/spec-precision. **32/44 com valor conferido e integral**,
**3 ❌ GAP** (SHP-06, ADR-02, BMP-04), **9 ⚠️ parcial ou spec-precision**
(CHK-01, CHK-05, CHK-07, CHK-10, CHK-12, SHP-03, SHP-05, SHP-07, PGD-06, BMP-02, BMP-03 — 11
marcadores, contados como 9 requisitos distintos + 2 de CHK-01/CHK-12 que são spec-precision puros).

---

## Camadas manuais (não contam como gap automatizado)

A Test Coverage Matrix classifica três camadas como **`none — manual`**, e a spec já registra as
pendências no cabeçalho da traceability. Confirmo a classificação e o registro:

| Requisito | Camada | Situação |
| --------- | ------ | -------- |
| PGD-04 (runtime), BMP-04 (runtime) | Runtime de edge function + sandbox Mercado Pago | ⏳ **pendente.** Zero testes em `supabase/functions/**` (`find supabase -name "*test*"` → nada). A lógica testável foi de fato extraída para o domínio puro (T3/T4) e **está** coberta. Roteiro manual escrito em `index.ts:63-103`. Exige `supabase stop && supabase start` antes (carry-forward #12) |
| PGD-05, ADR-03 (metade migration) | RLS em banco vivo | ⏳ **pendente.** Nenhum teste lê SQL (`grep "migrations\|\.sql\|POLICY"` em `*.test.*` → zero); sem pgTAP nem harness. As policies estão corretas por leitura e há roteiro manual **com resultado medido** no corpo de `20260727120100_*.sql:50-98` — evidência humana, não reproduzível |
| SHP-08, BMP-01 (metade migration) | Schema SQL | ✅ Camada `none (build gate)` pela matriz; migrations lidas e corretas; as 3 já aplicadas no local |

⚠️ **BMP-04 é o caso onde a classificação "manual" deixou de ser suficiente.** O AC não é só "o
servidor aplica o desconto" (isso é runtime, legitimamente manual) — é "**idêntico** ao exibido", uma
propriedade **puramente aritmética** entre duas funções puras, testável sem MP nenhum. Foi o que eu
fiz, e é onde a divergência apareceu. O Success Criterion pedia exatamente essa asserção direta.

---

## Discrimination Sensor

**Depth**: P0-full (caminho de pagamento) — **12 mutações**, acima do mínimo de 5.
**Estado descartável**: cópia de cada arquivo em scratchpad antes de mutar; `Edit` cirúrgico;
reversão + `diff` contra o backup após cada mutação. **Sem `git stash`, `add`, `commit` ou branch** —
o working tree carrega trabalho da `04-store-login-ux`.

| # | File:line | Mutação | Comando | Killed? |
| - | --------- | ------- | ------- | ------- |
| 1 | `packages/core/src/payment/pricing.ts:61` | `item.quantity !== 1` → `item.quantity < 1` (aceita qty ≥ 1) | `pnpm --filter @nanapin/core test` | ✅ Killed — 1 falha (`devolve a lista intacta quando o item que casa tem quantity > 1`) |
| 2 | `pricing.ts:55` | remove `!bump.enabled` do guard (ignora o flag) | idem | ✅ Killed — 1 falha (`…quando enabled é false`) |
| 3 | `pricing.ts:66` | sinal do desconto: `(1 - pct/100)` → `(1 + pct/100)` | idem | ✅ Killed — **7 falhas** |
| 4 | `packages/core/src/checkout/blocks.ts:112` | `isOrderStale` retorna sempre `false` | idem | ✅ Killed — **8 falhas** (endereço, CEP, frete, método, bump, CPF, nome) |
| 5 | `blocks.ts:69` | `resolveBlocks` devolve o **último** incompleto (`.reverse().find`) | idem | ✅ Killed — 3 falhas |
| 6 | `packages/core/src/validators/cpf.ts:31` | `isValidCpf` aceita qualquer coisa com 11 dígitos (sem DV) | idem | ✅ Killed — **5 falhas** em 3 arquivos (`cpf`, `payer`, `blocks`) |
| 7 | `packages/core/src/shipping/estimate.ts:35-36` | `addBusinessDays` não pula fim de semana | idem | ✅ Killed — **9 falhas** |
| 8 | `estimate.ts:87` | `cheapestQuoteId`: `<` → `>` (devolve a mais **cara**) | idem | ✅ Killed — 1 falha (`…menor preço comparando como número`) |
| 9 | `apps/store/src/entities/customer/api/useSaveCustomerCpf.ts:36` | **remove a checagem `data.length === 0`** (o defeito que a feature existe para não repetir) | `npx vitest run src/entities/customer src/pages/__tests__/CheckoutPage.test.tsx` | ✅ Killed — 2 falhas (`0 linhas afetadas SEM error rejeita`, `data nulo SEM error também rejeita`) |
| 10 | `apps/store/src/features/checkout/model/checkoutStore.ts:91` | `sessionStorage` → `localStorage` | `npx vitest run src/features/checkout/model` | ✅ Killed — 3 falhas (incl. `NÃO escreve nada em localStorage`) |
| 11 | `apps/store/src/features/checkout/ui/DeliveryBlock.tsx:131` | `subtotal >= free_shipping_threshold` → `>` (fronteira do threshold) | `npx vitest run src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx` | ❌ **SURVIVED** — 21/21 verdes |
| 12 | `apps/store/src/features/checkout/model/useCheckoutTotals.ts:101-102` | base do cupom: `bumpedSubtotal` → `cartSubtotal` (quebra o espelho com a edge function) | `npx vitest run src/features/checkout/ui/__tests__/OrderSummary.test.tsx src/pages/__tests__/CheckoutPage.test.tsx` | ✅ Killed — 1 falha (`cupom fixo com bump incide sobre o subtotal JÁ com o bump`) |

**Resultado: 11/12 mortas, 1 sobreviveu.** ❌

**Mutação 11 — análise.** Numa execução da suíte **completa** do store sob esta mutação, 2 testes de
`PixPayment.test.tsx` falharam. Investiguei: reexecutados na árvore limpa, `PixPayment.test.tsx` passa
19/19 **duas vezes seguidas**; são testes de timer sensíveis a carga em execução paralela, e não têm
relação com `DeliveryBlock.tsx`. A suíte que de fato cobre o comportamento mutado (`DeliveryBlock`,
21 testes) passou **inteira**. Verdicto: **sobreviveu**.

**Limpeza.** Todos os 8 arquivos tocados conferidos por `diff` contra o backup: **RESTORED**
byte-idêntico. O arquivo de teste descartável usado na prova numérica
(`packages/core/src/__verifier_eq.test.ts`) foi **removido**. `git status --porcelain` volta as mesmas
134 entradas do início da sessão, sem artefato do Verifier. `pnpm test && pnpm build` reexecutados na
árvore restaurada: **exit 0**.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| No features beyond what was asked | ✅ |
| No abstractions for single-use code | ✅ — `useCheckoutTotals` é fonte única de propósito (carry-forward #21), não abstração especulativa |
| No unnecessary "flexibility" added | ✅ |
| Only touched files required for task | ⚠️ — 4 arquivos fora do `Where` declarado, todos justificados nos carry-forwards #21, #23 (`useDefaultAddress`, `useProductById`) e necessários para ACs |
| Didn't "improve" unrelated code | ✅ — `packages/ui/styles.css` e o preset do backoffice intocados (DESIGN.md §7) |
| Matches existing patterns/style | ✅ — FSD respeitado; `OrderTimeline` em `entities/order/ui` (reuso pela `09`) |
| Would senior engineer approve? | ⚠️ — sim quanto à estrutura; **não** com a divergência de arredondamento no caminho do dinheiro |
| Tests map to ACs and are non-shallow | ✅ — nenhum `toBeTruthy`/`expect.any` substituindo asserção de payload nos arquivos varridos |
| Spec-anchored outcome check | ❌ — 3 GAP + 9 parciais (tabelas acima) |
| Per-layer Coverage Expectation met | ⚠️ — domínio puro 1:1 com os ACs ✅; camada de página não cobre responsividade nem a interação do bump ponta a ponta |
| Every test maps to a spec requirement | ✅ — sem testes órfãos identificados |
| Documented guidelines followed | ✅ — `CLAUDE.md`, `DESIGN.md`, `tasks.md` (matriz + gates). Lint fora dos gates por dívida pré-existente registrada |

---

## Edge Cases

- [x] Carrinho vazio ⇒ redireciona ao carrinho — `CheckoutPage.test.tsx` (guarda `<Navigate to="/carrinho" replace />`)
- [x] Cupom `freeShipping` + cotação real ⇒ todas "Grátis" e desconto PIX sobre `(subtotal − cupom)` — `DeliveryBlock.test.tsx` (todas as opções free) + `orderBump.test.ts:141-142`
- [x] Produto do bump já no carrinho ⇒ bump não exibido — `OrderBump.test.tsx:101`
- [ ] **`stock_total` zera entre a marcação e o CTA ⇒ pedido segue sem o item e informa a remoção** — `OrderBump.test.tsx:163` prova que a inelegibilidade **desmarca** (`bumpChecked` → `false`), mas **não** existe teste do caminho "criação do pedido prossegue sem o item **e informa**". A metade "informa a remoção" não tem evidência
- [x] Troca de CEP após selecionar frete ⇒ seleção descartada, `cost` volta a 0, pedido invalidado — `DeliveryBlock.test.tsx:293` + `checkoutStore.test.ts:198`
- [x] Reload no meio ⇒ carrinho/cupom persistem, blocos recompõem, `order_id` de `sessionStorage` — `checkoutStore.test.ts:72` (+ mutação 10 confirma o storage)
- [x] `handling_days = 0` ⇒ não quebra — `estimate.test.ts:92-93`
- [x] Cotação com opção única ⇒ pré-selecionada — `DeliveryBlock.test.tsx:306`
- [x] Total abaixo de R$ 0,01 ⇒ pagamento bloqueado (herdado da `02`) — `pricing.ts:84-86` + `index.ts:263-265`
- [x] `customers.cpf` preenchido mas digita outro ⇒ usa o digitado — `PaymentBlock.test.tsx:171` (só no campo; ver PGD-06)

---

## Fix Plans

### Fix 1 — BLOCKER: alinhar a base do cupom entre loja e servidor

- **Root cause**: `useCheckoutTotals.ts:90` arredonda o subtotal antes de aplicar o cupom `percent`;
  `mercado-pago/index.ts:219` usa a soma crua. Divergência de 1 centavo, servidor cobrando mais.
- **Fix task**: escolher **um** dos dois arredondamentos e aplicá-lo nos dois lados (recomendo remover
  o `round2` da base na loja, para o cliente espelhar o servidor, que é a autoridade de cobrança).
  Depois, adicionar o teste que o Success Criterion pede: um teste que roda as duas contas lado a lado
  (`packages/core`, sem React) e assevera igualdade **com cupom `percent`**, `fixed`, com e sem bump,
  com e sem PIX — incluindo o caso `3 × 29,90 + 15%`.
- **Verify**: `expect(storeTotal).toBe(serverTotal)` para a matriz de cenários acima.
- **Priority**: **Blocker** — caminho do dinheiro, contradiz o Success Criterion central.

### Fix 2 — MAJOR: proteger a fronteira do frete grátis (mutante sobrevivente)

- **Root cause**: nenhum teste exercita `subtotal === free_shipping_threshold` no
  `DeliveryBlock`; ambos usam 200 contra 150.
- **Fix task**: em `DeliveryBlock.test.tsx`, adicionar caso com `setCartSubtotal(150)` e
  `free_shipping_threshold = 150` asseverando que a opção mais barata mostra "Grátis" e `cost === 0`;
  e um caso com 149,99 asseverando que **não**.
- **Verify**: reintroduzir a mutação `>=` → `>` e confirmar que agora **falha**.
- **Priority**: Major.

### Fix 3 — MAJOR: ADR-02 (bloco Entrega colapsado com endereço salvo)

- **Root cause**: a semeadura de `useDefaultAddress` (`DeliveryBlock.tsx:67-75`) não seleciona frete;
  `isDeliveryComplete` exige `shipping !== null`; logo o bloco não colapsa quando há 2+ opções.
- **Fix task**: decidir o comportamento — (a) colapsar com o endereço e abrir só a seleção de frete
  (exige separar "endereço completo" de "entrega completa" no domínio), ou (b) corrigir o AC na spec
  para "abre preenchido, com o frete pendente". Em qualquer caso, adicionar teste de integração no
  `CheckoutPage` com `useDefaultAddress` devolvendo um endereço.
- **Priority**: Major (P2, não bloqueia a compra).

### Fix 4 — MINOR: lacunas de cobertura sem defeito conhecido

CHK-01 (numerais + "exatamente três"), CHK-07 (`status: 'pending'` no payload), BMP-03 (rótulo do CTA
com bump marcado, na mesma interação), BMP-02 (posição no DOM), SHP-03/SHP-05 (metades sem asserção),
SHP-07 (imutabilidade vs `useAdminOrders.ts:137`), PGD-06 (CPF divergente ponta a ponta), edge case do
`stock_total` zerando. CHK-05/CHK-10 (responsividade) estão **fora** da expectativa declarada na
matriz para a camada de UI — registrar como verificação visual manual em vez de teste jsdom.
**Priority**: Minor.

### Fix 5 — MINOR: CHK-12, resolver a ambiguidade da própria spec

A spec enumera 3 selos e exige que "o texto bata com `PoliciesPage.tsx`", que só sustenta 1 deles.
Escolher: acrescentar as políticas de pagamento/embalagem ao `PoliciesPage`, ou reduzir a faixa ao que
a página afirma. **Priority**: Minor (a parte de risco — não prometer desistência — está correta).

---

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| CHK-02, CHK-03, CHK-04, CHK-06, CHK-08, CHK-09, CHK-11 | Implementing | ✅ Verified |
| SHP-01, SHP-02, SHP-04, SHP-08, SHP-09, SHP-10 | Implementing | ✅ Verified |
| PGD-01, PGD-02, PGD-03 | Implementing | ✅ Verified |
| CNF-01, CNF-02, CNF-03, CNF-04, CNF-05, CNF-06 | Implementing | ✅ Verified |
| ADR-01, ADR-04, ADR-05 | Implementing | ✅ Verified |
| BMP-01, BMP-05, BMP-06 | Implementing | ✅ Verified |
| PGD-04, ADR-03 | Implementing | ⚠️ Verified (domínio) · manual pendente (MP / RLS) |
| PGD-05 | Implementing | ⏳ Manual pendente (RLS em banco vivo) |
| CHK-01, CHK-05, CHK-07, CHK-10, CHK-12, SHP-03, SHP-05, SHP-07, PGD-06, BMP-02, BMP-03 | Implementing | ⚠️ Parcial — cobertura incompleta (Fix 4/5) |
| **SHP-06** | Implementing | ❌ **Needs Fix** (mutante sobrevivente — Fix 2) |
| **ADR-02** | Implementing | ❌ **Needs Fix** (não implementado no caso geral — Fix 3) |
| **BMP-04** | Implementing | ❌ **Needs Fix** (exibido ≠ cobrado — Fix 1) |

---

## Diff Surface (do checkout — não há range de commit)

**Excluído do escopo** (`04-store-login-ux` e outros): `apps/store/src/features/auth/**`,
`packages/auth/**`, `supabase/config.toml`, `supabase/templates/**`,
`apps/backoffice/src/pages/admin/AdminProductFormPage.tsx`, `.env.example`, `.playwright-cli/`,
`x.png`, e as specs `01`–`07`.

**`packages/core`** (novo): `checkout/{blocks.ts,types.ts,index.ts,__tests__/blocks.test.ts}` ·
`shipping/{estimate.ts,index.ts,__tests__/estimate.test.ts}` ·
`validators/{cpf.ts,cep.ts,index.ts,__tests__/{cpf,cep}.test.ts}` · `payment/payer.ts` ·
`payment/__tests__/{orderBump,payer}.test.ts` · `hooks/__tests__/useStoreSettings.test.ts`
**(modificado)**: `payment/pricing.ts` · `hooks/useStoreSettings.ts` · `constants.ts` ·
`package.json` · `vitest.config.ts`

**`packages/supabase`** (novo): `src/types/shipping.ts` · **(mod)**: `src/types/settings.ts`,
`src/types/index.ts`

**`supabase`** (novo): `migrations/20260727120000_orders_shipping_snapshot.sql` ·
`migrations/20260727120100_customer_address_update_rls.sql` ·
`migrations/20260727120200_store_settings_checkout.sql` · **(mod)**: `functions/mercado-pago/index.ts`

**`apps/store`** (novo): `features/checkout/model/{checkoutStore.ts,useCheckoutTotals.ts,__tests__/checkoutStore.test.ts}` ·
`features/checkout/api/{useCepLookup.ts,useShippingQuote.ts}` + seus `__tests__` ·
`features/checkout/ui/{ContactBlock,DeliveryBlock,PaymentBlock,OrderBump}.tsx` + seus `__tests__` ·
`entities/customer/**` · `entities/address/**` · `entities/cart/lib/toQuotePayload.ts` + teste ·
`entities/order/api/useOrder.ts` + `api/__tests__/{useOrder,useOrders}.test.tsx` ·
`entities/order/ui/OrderTimeline.tsx` + teste · `entities/product/api/__tests__/**` ·
`features/shipping-calc/ui/__tests__/**` · `pages/__tests__/OrderConfirmationPage.test.tsx`
**(mod)**: `app/App.tsx` · `pages/{CheckoutPage,OrderConfirmationPage}.tsx` +
`pages/__tests__/CheckoutPage.test.tsx` · `features/checkout/index.ts` ·
`features/checkout/ui/{PixPayment,OrderSummary,CardPaymentBrick}.tsx` + testes ·
`entities/order/{api/useOrders.ts,index.ts}` · `entities/cart/index.ts` ·
`entities/product/api/{useProduct,useProducts}.ts` · `features/shipping-calc/ui/ShippingCalc.tsx`
**(deletado)**: `features/checkout/ui/{ReviewStep,StepIndicator,CustomerStep,AddressStep,ShippingStep,PaymentStep}.tsx`
· `features/checkout/ui/__tests__/PaymentStep.test.tsx` (migrado para `PaymentBlock.test.tsx`)

**`apps/backoffice`** (novo): `features/settings/ui/CheckoutSettingsCard.tsx` + `.test.tsx` ·
**(mod)**: `pages/admin/AdminSettingsPage.tsx`

**Docs**: `.specs/features/08-checkout-one-page/{spec,design,tasks,context}.md` ·
`.specs/project/STATE.md` · `CLAUDE.md`

---

## Summary

**Overall**: ❌ **Not Ready**

**Spec-anchored check**: 32/44 integralmente conferidos por valor · **3 GAP** · 9 parciais/spec-precision
**Sensor**: 12 mutações, **11 mortas, 1 sobreviveu** (SHP-06)
**Gate**: 652 testes verdes (227 + 363 + 62), `pnpm build` verde, os 3 greps zero, 0 skip

**O que funciona**: o one-page de 3 blocos com resumo persistente e o passo Revisão eliminado; o frete
real do Melhor Envio com data em dias úteis; o pagador identificado montado no servidor; as telas de
PIX e de confirmação como rota que sobrevive ao reload; o CPF persistido com verificação de linhas
afetadas (o defeito silencioso do `AuthContext` **não** se repetiu — mutação 9 morta); e ADR-05, o
`orders.address_zip`, asseverado por valor em duas camadas — o TypeError do `MelhorEnvioTab` está
morto na origem. O domínio puro tem cobertura 1:1 com os ACs e discrimina de verdade: 11 mutações de
comportamento no núcleo do dinheiro foram todas mortas.

**Issues found**:
1. **Exibido ≠ cobrado com cupom `percent`** — 1 centavo, servidor cobrando mais, num carrinho comum.
   É o defeito que a feature veio corrigir, e sobreviveu porque a única asserção que protegia a base
   do cupom usa cupom `fixed`, e porque a comparação direta loja-vs-servidor que o Success Criterion
   pede nunca foi escrita. → Fix 1
2. **SHP-06 sem sensor na fronteira** — `>=` → `>` passa 21/21. → Fix 2
3. **ADR-02 não acontece no caso geral** — o bloco não colapsa porque a semeadura não escolhe frete;
   marcado `[x]` em `tasks.md` sem teste que o prove. → Fix 3

**Next steps**: aplicar Fix 1 (blocker), Fix 2 e Fix 3, e re-dispatch do Verifier. Iteração 1 de no
máximo 3. Os commits do T30 **não devem ser gerados** antes de Fix 1 — o defeito está no caminho do
dinheiro. As pendências manuais (sandbox MP, RLS em banco vivo) seguem legitimamente abertas pela
matriz e não bloqueiam; mas a parte **aritmética** de BMP-04 nunca foi manual e é o que falhou.
