# Checkout One-Page Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

### ⚠️ Project override on commits

`CLAUDE.md` → *Workflow de specs* estabelece, para este repositório:

> **Commits**: **não** criar commits atômicos em pequenos pedaços durante a implementação. Aguardar a
> conclusão e gerar os commits completos da implementação de uma vez (isso sobrepõe o comportamento
> padrão de commits atômicos da Skill).

Portanto, **Critical Rule #3 da skill ("one atomic commit per task") não se aplica aqui.** O que
permanece obrigatório e inalterado:

- o **gate de teste passa antes de a task ser considerada pronta** (o runner decide, não autoavaliação);
- **nenhum teste é enfraquecido, pulado ou apagado** para fazer o gate passar;
- o **Verifier roda automaticamente** depois da última task (autor ≠ verificador).

Os commits são gerados no fecho (T30), agrupados por camada. Cada task registra abaixo qual grupo de
commit ela alimenta, para o histórico continuar legível.

---

**Spec**: `.specs/features/08-checkout-one-page/spec.md` (rev. 2, 44 requisitos)
**Design**: `.specs/features/08-checkout-one-page/design.md`
**Status**: **Execute concluído — T1–T29 de 30.** Do T30 sobrou só a geração dos commits.

- **Batch 1 (P1 · T1–T6) ✅** · 227 testes verdes no core (107 → 227, +120)
- **Batch 2 (P2 · T7–T10) ✅** · 3 migrations aplicadas no banco local · 402 testes verdes
  (227 core + 126 store + 49 backoffice)
- **Batch 3 (P3 · T11–T17) ✅** · 480 testes verdes (227 core + 204 store [126 → 204, +78] + 49 backoffice)
- **Batch 4 (P4+P5 · T18–T25) ✅** · 588 testes verdes (227 core + 312 store [204 → 312, +108] + 49 backoffice)
- **Batch 5 (P6+P7 · T26–T29 + docs do T30) ✅** · **652 testes verdes**
  (227 core + 363 store [312 → 363, +51] + 62 backoffice [49 → 62, +13]) · `pnpm build` verde ·
  os dois greps da spec (paleta CNF-06 e literais de frete SHP-04) voltam zero · lint sem aviso novo
- **Fix iteration 1 (pós-Verifier) ✅** · **674 testes verdes**
  (240 core [227 → 240, +13] + 372 store [363 → 372, +9] + 62 backoffice) · `pnpm build` verde.
  Fechou os 3 gaps do `validation.md`: BMP-04 (exibido ≠ cobrado), SHP-06 (mutante sobrevivente na
  fronteira do frete grátis) e ADR-02 (bloco Entrega não colapsava no caso geral). Ver carry-forwards
  #39–#41.

**O que sobrou (fecho):**
1. **Commits** — não gerados. O working tree carrega trabalho não commitado da `04-store-login-ux`,
   então o orquestrador gera os commits de uma vez, agrupados pelos 7 `Commit group` abaixo, com
   escopo controlado.
2. **Verifier independente** (autor ≠ verificador) — rodou e **reprovou** (`validation.md`, 3 gaps).
   A Fix iteration 1 corrigiu os três; aguarda re-dispatch do Verifier.
3. **Pendências manuais** — restart do stack local antes de exercitar a edge function, sandbox do
   Mercado Pago (BMP-04, PGD-04) e RLS em banco vivo (PGD-05, ADR-03). Detalhadas em
   `.specs/project/STATE.md` → Handoff. **As 3 migrations já estão aplicadas no local** — não é pendência.
   ⚠️ A parte **aritmética** de BMP-04 nunca foi manual — é o que a Fix iteration 1 cravou em teste.

---

## ⚠️ Carry-forward — avisos que atravessam batches

Levantados pelo worker do Batch 1, verificados. **Batches seguintes devem ler isto antes de começar.**

1. **`applyOrderBump` NÃO é idempotente por composição.** T21 e T22 devem passar a lista de itens com
   **preço cheio** + o objeto `bump` para `calculateOrderTotals` — **nunca** uma lista já descontada.
   Passar item pré-descontado aplica o desconto duas vezes. Documentado no docblock da função.
2. **`AdminSettingsPage.tsx:26` declara uma união `SettingsKey` local duplicada**, sem `'checkout'`.
   **T29 tem de reconciliar** com a canônica de `@nanapin/supabase/types/settings`.
3. **`ShippingCalc.tsx:9-16` ainda declara um `ShippingQuote` local.** **T12** deve apontá-lo para
   `@nanapin/supabase/types/shipping` (o canônico, criado em T6).
4. **`packages/core/src/payment/payer.ts` importa `../validators/cpf.ts` COM extensão `.ts`** — de
   propósito, para o import relativo do Deno funcionar em **T10**. Não "corrigir" removendo a extensão.
5. **CHK-03 ficou meio implementado por desenho.** `isPaymentComplete` (T5) valida
   `method !== null && isValidCpf(cpf)`. A metade "método habilitado nas settings" **é
   responsabilidade de T20** — o domínio puro não conhece settings.
6. **Correção factual em T3:** o texto dizia "73 testes de `pricing.test.ts`". São **11** em
   `pricing.test.ts`; os 73 são o diretório `payment/__tests__` inteiro (50 status + 11 pricing +
   12 webhookSignature). Todos os 73 passam sem edição — o critério foi cumprido.
7. **`packages/core/vitest.config.ts` ganhou alias para `@nanapin/supabase`** — necessário porque T6 é
   o primeiro arquivo do core a importar algo em runtime daquele pacote (antes só importava tipos).
8. **`packages/*` está fora do alcance de `pnpm lint`** — não existe config eslint na raiz; `lint` só
   roda dentro de `apps/*`. Confirma que o gate de lint não se aplica ao core.

*Levantados no Batch 2:*

9. **⚠️ FLAKE CONHECIDO no gate.** `pnpm test` às vezes sai com código **1** por um erro
   **pós-teardown** do `input-otp@1.4.2` (`ReferenceError: window is not defined`), que alterna entre
   `AuthCodeStep.test.tsx` e `AuthResetCodeStep.test.tsx`. **Nenhum teste falha** — os 126 do store
   passam. É pré-existente, vem da feature `04-store-login-ux` (não commitada no working tree) e
   **não tem relação com o checkout**. Se acontecer: **rode de novo**. Não "conserte", não é seu
   escopo, e não trate como gate reprovado. Confirmado em 2026-07-28: a mesma suíte saiu `EXIT=0`
   com 21 arquivos / 126 testes.
10. **Base do cupom quando há order bump.** A spec não define. Decisão adotada em T10 e que **T22
    precisa espelhar**: o cupom incide sobre o subtotal **já com o desconto do bump aplicado**.
    Se a UI calcular sobre o subtotal cheio, "exibido == cobrado" quebra na combinação bump + cupom
    `fixed`.
11. **O guard de CPF ausente (422) vale para PIX *e* cartão.** A definição de T10 só citava PIX, mas
    PGD-04 exige `identification` nos dois. Implementado nos dois ramos.
12. **Restart do stack local necessário antes de exercitar a edge function.** O edge runtime monta um
    bind mount por arquivo importado, calculado quando o container sobe. Como T10 passou a importar
    `payer.ts` e `validators/cpf.ts`, o runtime local devolve **503 "Module not found"** até
    `supabase stop && supabase start`. Não é defeito de código — `deno check` passa. Fica para o
    momento de exercitar o Mercado Pago, no fim do processo.
13. **`WITH CHECK` — motivo corrigido.** Ver a nota em `design.md` → Data Models. O Postgres reusa o
    `USING` como check quando o `WITH CHECK` é omitido; o `WITH CHECK` explícito serve para desacoplar
    escrita de leitura, não para impedir reatribuição.

Levantados pelo worker do **Batch 2** (T7–T10), medidos no banco local:

9. **Correção factual ao `design.md` (RLS).** O design e a spec afirmam que, sem `WITH CHECK`, a
   cliente reatribuiria a própria linha para outro `user_id`. **Isso não é verdade no Postgres**:
   numa policy de UPDATE sem `WITH CHECK`, o `USING` é reaproveitado como check da linha nova, então
   `USING (user_id = auth.uid())` já barraria a reatribuição. Medido: com `USING (true)` **sem**
   `WITH CHECK` o UPDATE de reatribuição **passa** pela RLS; com `USING (true) WITH CHECK (...)` é
   barrado. O `WITH CHECK` explícito segue certo — mas o motivo real é **desacoplar** a garantia de
   escrita da expressão de leitura (alargar o `USING` amanhã não alarga o check junto). O texto
   correto está no cabeçalho de `20260727120100_customer_address_update_rls.sql`.
10. **Decisão de T10 que a T22 precisa espelhar (spec-precision gap).** A spec não define a base do
    cupom quando há bump. A edge function passou a calcular o cupom sobre o **subtotal já com o
    bump** (senão um cupom `fixed` descontaria mais que o subtotal realmente cobrado). **A T22 tem de
    usar a mesma base**, ou "exibido == cobrado" quebra justamente no caso bump + cupom.
11. **Edge runtime local monta um bind mount por arquivo importado**, calculado quando o container
    sobe. Como T10 passou a importar `payer.ts` (e, via ele, `validators/cpf.ts`), o worker local
    responde **503 "Module not found"** até rodar `supabase stop && supabase start`. Não é defeito de
    código: `deno check` no arquivo passa (exit 0). Quem for exercitar o MP precisa reiniciar antes.

Levantados pelo worker do **Batch 3** (T11–T17):

14. **O `checkoutStore` NÃO invalida o pedido sozinho.** `setContact`/`setAddress`/`setShipping`/
    `setPayment`/`toggleBump` só gravam; quem decide é `isStale()`. **T23 tem de checar `isStale()`
    antes de reusar o `orderId`** (e chamar `invalidateOrder()`), senão CHK-08 fica só no domínio.
15. **`useShippingQuote(cep)` lê o carrinho por dentro** (`useCartStore`), conforme a assinatura do
    `design.md`. T19 passa **só o CEP**. A chave é `['shipping-quote', cep, fingerprint]`, onde o
    fingerprint é o JSON do payload — mudar quantidade/dimensão recota sozinho.
16. **`useCepLookup` nunca rejeita.** CEP inexistente, resposta não-ok e falha de rede convergem para
    `data.manual === true` com `isSuccess`. T19 **não** deve olhar `isError` para decidir o modo
    manual — deve olhar `data.manual`.
17. **`useSaveAddress` resolve, nunca rejeita** (`{ saved: false }` em qualquer falha, com
    `console.warn`). **`useSaveCustomerCpf` rejeita** — assimetria proposital do `design.md` →
    Error Handling. T23 tem de tratar os dois de forma diferente: CPF bloqueia, endereço não.
18. **`CreateOrderInput` ganhou 7 campos, todos opcionais.** O `CheckoutPage` atual continua
    compilando e passando sem eles — ou seja, **T23 tem de passá-los explicitamente**, senão
    `address_zip` volta a ficar nulo e o bug do `MelhorEnvioTab` continua vivo. Ausentes viram
    `null` (não `undefined`).
19. **O gargalo de SHP-02 era o *mapper*, não o `select`.** `useProducts`/`useProduct` já usavam
    `select('*, categories(...)')`; as 4 colunas voltavam do banco e eram descartadas em
    `mapDbToProduct`. Corrigido no mapper; nenhum `select` mudou.
20. **`entities/customer` e `entities/address` nasceram com um único hook cada.** Se a spec `09`
    (conta) precisar de leitura de `customers`/`addresses`, é nesses slices que entra.

Levantados pelo worker do **Batch 4** (T18–T25):

21. **`useCheckoutTotals` (`features/checkout/model/useCheckoutTotals.ts`) é a única fonte do valor
    exibido.** Arquivo novo, fora do `Where` de T22/T23, criado de propósito: sem ele o resumo e o
    rótulo do CTA teriam duas contas parecidas e "exibido == cobrado" viraria disciplina em vez de
    construção. Ele espelha, passo a passo, o recálculo de `mercado-pago/index.ts` (preço cheio +
    `bump` para `calculateOrderTotals`; base do cupom = subtotal **já com o bump**). **Mudar um lado
    exige mudar o outro.**
22. **A rota `/checkout` saiu do `StoreLayout`** (`app/App.tsx`): CHK-10 pede header próprio sem
    navegação, e o CTA fixo do rodapé disputaria espaço com o `MobileNav`. Consequência: a
    `CheckoutPage` monta o **`AuthOverlay` por conta própria** — quem mexer nessa rota precisa
    manter o overlay, senão CHK-02 morre em silêncio.
23. **Dois hooks novos fora do `Where`, por necessidade de AC:** `entities/address/api/useDefaultAddress.ts`
    (ADR-02 precisa **ler** `addresses`; o slice só tinha escrita) e `useProductById` em
    `entities/product/api/useProducts.ts` (o bump guarda um **uuid**, e `useProduct` busca por
    `slug`). Ambos reusam os mappers existentes.
24. **`PixPayment.amount` é opcional e o ponteiro para `/conta` é uma âncora, não um `Link`.** As duas
    escolhas existem para T25 não editar os testes herdados da `02` (o critério pedia que passassem
    sem edição) e para o componente seguir sem depender de contexto de router — a spec `09` deve
    poder montá-lo de dentro de `/conta`. Quem tornar `amount` obrigatório precisa ajustar
    `PixPayment.test.tsx`.
25. **Duas pílulas geleia na tela quando o PIX falha ou expira** (o CTA da página + "Tentar
    novamente"/"Gerar novo código" do `PixPayment`, herdados da `02`). T25 proibia alterar
    regenerar, então ficou como está. O board `05` desenha a tela do PIX **sem** CTA de pagar —
    quando T28 mover a superfície do PIX para a rota própria (CNF-03), o conflito resolve sozinho.
    Enquanto isso, é a única violação conhecida do `DESIGN.md` §8 no escopo.
26. **O disco de "feito" dos blocos é tinta, não geleia como no board `04`.** O critério de T18–T20
    ("nenhum elemento com `bg-nanita-jam` no bloco") é mais estrito que CHK-04 ("nenhum **botão** de
    fundo geleia"), e os testes asseveram zero ocorrências. Desvio deliberado do board.
27. **`PaymentBlock` é o dono do invariante "método habilitado"** (fecha a metade de CHK-03 que o
    domínio puro não conhece, carry-forward #5): o efeito de fallback força `payment.method` para um
    método habilitado e para `null` quando nenhum está — aí `isPaymentComplete` fica falso.
28. **Comentário JSX dentro de `{cond && (...)}` quebra o SWC** (e passa no `tsc`). Aconteceu em
    `CardPaymentBrick.tsx`: o build/teste falha com `Expected '</', got 'ident'`. Comentário vai
    **antes** da chave.

Levantados pelo worker do **Batch 5** (T26–T29):

29. **`OrderTimeline` usa `paid_at` como fonte do estágio "Pago", não `orders.status`.**
    `apply_payment_approval` grava `payment_status = 'approved'` + `paid_at` e **deixa `status` em
    `pending`** — quem olhasse só `status` mostraria um pedido pago como não pago. A spec `09` precisa
    passar `paidAt` ao reusar o componente.
30. **`useOrder` devolve `OrderDetail extends Order { paid_at }`**, em vez de alargar a interface
    `Order` de `useOrders.ts` (fora do `Where` do T27). E ele **distingue erro de não-encontrado**
    (`maybeSingle()` + `throw` no erro, `null` no vazio) — o oposto de
    `useOrdersByEmail`/`useOrdersByCustomerId`, que engolem o erro devolvendo `[]`.
31. **A pílula geleia da confirmação é só o CTA "Acompanhar pedido".** Os discos da `OrderTimeline`
    também são `bg-nanita-jam` (é o board `06`), mas são **forma, não ação** — então a asserção de
    "uma única pílula geleia" filtra por `bg-nanita-jam` **+** `rounded-pill`, não por
    `bg-nanita-jam` sozinho como nos blocos.
32. **Carry-forward #25 resolveu-se de outro jeito.** Ele previa que mover a confirmação para a rota
    própria acabaria com as duas pílulas geleia da tela do PIX. **Não acaba:** o T28 move a
    *confirmação*, não a superfície do PIX — o CTA da página continua montado junto do `PixPayment`.
    Os CTAs "Tentar novamente" e "Gerar novo código" foram **rebaixados a secundários** (contorno
    tinta). Esconder o CTA da página quando existe `orderId` não é opção: CHK-07 exige que um segundo
    acionamento reuse o pedido, e o teste o aciona.
33. **`handlePaymentSuccess` navega ANTES de limpar o carrinho.** Com o carrinho já vazio, a guarda de
    carrinho vazio (`<Navigate to="/carrinho" replace />`) disputaria o redirecionamento com
    `/pedido/:id`. Ordem: `markCartRecovered` → `navigate` → `clearGuestEmail`/`clearCart`/
    `clearCoupon` → `reset()`.
34. **O mock de `PixPayment` no `CheckoutPage.test.tsx` passou a expor `onApproved`** como botão
    (`simular-aprovacao`). Sem isso a aprovação não é acionável no teste da página.
35. **`AdminSettingsPage` não redeclara mais `SettingsKey`** (carry-forward #2 resolvido): usa
    `Exclude<SettingsKey, 'checkout'>`, derivado do canônico. A chave `checkout` é salva pelo
    `CheckoutSettingsCard`, que é **auto-contido** (lê `useStoreSettings` e chama
    `useUpdateSettings` por conta própria) — é isso que torna "salva na chave `checkout`" asseverável
    por valor, em vez de por um `onSave` opaco.
36. **Testar o `Select` do shadcn no jsdom exige 3 polyfills:** pointer capture
    (`hasPointerCapture`/`setPointerCapture`/`releasePointerCapture`), `ResizeObserver` (o
    `SelectContent` do repo usa `position="popper"` → floating-ui) e **`PointerEvent`** — o gatilho do
    Radix só abre com `event.pointerType === 'mouse'`, propriedade que o `Event` genérico do jsdom não
    carrega. A receita está no topo de `CheckoutSettingsCard.test.tsx` (primeiro teste de `features/`
    no backoffice).
37. **Exportar função nomeada de um arquivo de componente gera aviso novo de lint**
    (`react-refresh/only-export-components`). `resolveStageProgress` ficou privado no
    `OrderTimeline.tsx`; os testes provam o estado pelo `data-state` renderizado, não chamando a função.
38. **`.specs/project/STATE.md` → `## Active Feature` segue desatualizado** ("Execute não iniciado"
    para a `08`). O worker do Batch 5 tinha instrução de tocar **só** o `## Handoff` — a correção
    dessa linha é do orquestrador.

### Fix iteration 1 (pós-Verifier)

39. **O desconto do cupom tem UM dono: `resolveCouponDiscount`** (`packages/core/src/payment/pricing.ts`).
    A loja (`useCheckoutTotals.ts`) e a edge function (`mercado-pago/index.ts`) **chamam** essa função;
    **nenhuma das duas calcula o desconto inline**. Isto substitui o carry-forward #10, que pedia
    "espelhar por disciplina" a base do cupom — a disciplina falhou: um lado arredondava a base
    (`round2(bumpedSubtotal)`), o outro somava float cru (`currentSubtotal`), e `3 × 29,90 + cupom 15%`
    exibia **72,43** cobrando **72,44** (PIX) / **76,24** vs **76,25** (cartão). Regra: `percent` →
    `round2((round2(subtotal) * value) / 100)`; `fixed` → `Math.min(value, round2(subtotal))`;
    `free_shipping`/`null` → `0`. **Arredondar a base antes do percentual é obrigatório** — é o que
    impede o resíduo de `29.90 * 3 === 89.69999999999999` de pousar do outro lado do meio centavo.
    `calculateOrderTotals` **não** mudou de assinatura: continua recebendo `couponDiscount` já
    resolvido, e os testes de `payment/__tests__` que dependem dela passam sem edição.
    O sensor é `payment/__tests__/displayedEqualsCharged.test.ts`: monta os dois caminhos (com a
    assimetria de arredondamento **real** de cada lado) e compara os totais por valor. Tirar o
    `round2` da base mata 8 testes, com as mensagens reproduzindo os centavos do defeito.
40. **A fronteira do frete grátis é `>=` e agora tem sensor.** `DeliveryBlock.tsx` usa
    `subtotal >= free_shipping_threshold`; antes, trocar por `>` deixava a suíte inteira verde porque
    todos os casos usavam subtotal 200 contra threshold 150 (estritamente maior). Há dois casos novos
    em `DeliveryBlock.test.tsx`: subtotal **exatamente** 150 (a mais barata é grátis) e 149,99 (nenhuma
    é). Ao mexer nessa comparação, confirmar que o primeiro deles falha antes de "consertar" o teste.
41. **ADR-02 exige pré-selecionar o frete, não só semear o endereço.** Colapsar o bloco depende de
    `isDeliveryComplete`, que exige `shipping !== null` (`packages/core/src/checkout/blocks.ts`) — com
    2+ opções cotadas o bloco abria **expandido** mesmo com o endereço preenchido. Agora, quando o
    endereço vem do `is_default` salvo, a **opção mais barata** (`cheapestQuoteId`) vem pré-selecionada.
    Limites deliberados, com teste cada: endereço **digitado na hora** com 2+ opções **não**
    pré-seleciona (a pessoa está escolhendo), e mexer no CEP zera a seleção **e** desliga a
    pré-seleção de vez (o ref `defaultCep` vira `null` e não volta nem se ela redigitar o CEP salvo).

---

## Test Coverage Matrix

> Gerada do codebase + guidelines + spec — confirmar antes do Execute.
> **Guidelines encontradas:** `CLAUDE.md` (comandos `pnpm test`/`build`/`lint`, dívida de lint conhecida),
> `apps/store/vitest.config.ts`, `apps/backoffice/vitest.config.ts`, `packages/core/vitest.config.ts`.
> **Nenhum threshold de cobertura configurado** → defaults fortes aplicados.
> Amostragem: 38 arquivos de teste existentes (`packages/core/src/payment/__tests__/*.test.ts`,
> `apps/store/src/features/**/__tests__/*.test.tsx`, `apps/backoffice/src/shared/ui/*.test.tsx`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domínio puro (`packages/core/src/{payment,checkout,shipping,validators}`) | unit | Todos os branches; 1:1 com os ACs da spec; todo edge case listado tem teste | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @nanapin/core test` |
| Store de estado (`features/*/model/*Store.ts`) | unit | Todas as ações + derivados; persistência e invalidação | `apps/store/src/features/**/model/__tests__/*.test.ts` | `pnpm --filter @nanapin/store test` |
| Hooks de dados (`features/*/api/*.ts`, `entities/*/api/*.ts`) | unit | Caminho felizes + erro + estado vazio; payload enviado asseverado por valor | `apps/store/src/**/api/__tests__/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| Componentes de UI (`features/*/ui/*.tsx`, `entities/*/ui/*.tsx`) | unit | Render por estado (aberto/colapsado/erro/vazio) + interação que muda valor exibido | `apps/store/src/**/ui/__tests__/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| Página (`pages/*.tsx`) | unit | Orquestração: habilitação do CTA, contagem de chamadas, navegação | `apps/store/src/pages/__tests__/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| UI do backoffice (`features/*/ui/*.tsx`) | unit | Render + submit do formulário | `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @nanapin/backoffice test` |
| Tipos / config / schema (`types/*.ts`, migrations SQL) | none | — (build gate) | — | build gate |
| **Runtime de edge function** (`supabase/functions/**`) | **none — manual** | Cola fina: a lógica testável foi extraída para o domínio puro (T3/T4). Runtime exercitado por roteiro manual | — | manual (roteiro em T10) |
| **Sandbox Mercado Pago / RLS em banco vivo** | **none — manual** | Roteiro manual documentado; **não conta como PASS automatizado** | — | manual |

> **Precedente honesto:** a `02-checkout-mercado-pago` classificou runtime de edge function, SQL e
> sandbox MP como camada **manual** e registrou as pendências em aberto na sua `validation.md`. A `08`
> mantém a mesma classificação e **não** herda a verificação — só o código.

## Gate Check Commands

> Gerados do codebase — confirmar antes do Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick (core) | Tasks que só tocam `packages/core` | `pnpm --filter @nanapin/core test` |
| Quick (store) | Tasks que só tocam `apps/store` | `pnpm --filter @nanapin/store test` |
| Quick (backoffice) | Tasks que só tocam `apps/backoffice` | `pnpm --filter @nanapin/backoffice test` |
| Full | Tasks que cruzam pacote e app | `pnpm --filter @nanapin/core test && pnpm --filter @nanapin/store test` |
| Build | Fim de fase, ou tasks de tipo/config/schema | `pnpm test && pnpm build` |

> **`pnpm lint` fica fora dos gates.** `CLAUDE.md` → *Estado conhecido / dívidas* registra que ele já
> falha por erros pré-existentes de `@typescript-eslint/no-explicit-any` nos hooks admin. Regra da task:
> **nenhum aviso novo** de lint nos arquivos tocados — verificado por `pnpm lint` filtrado nos paths da
> task, nunca pelo exit code global.

---

## Execution Plan

Fases ordenadas, executadas em sequência; tasks dentro da fase executam em ordem.

### Phase 1: Domínio puro em `@nanapin/core`

Nada depende de React. É aqui que "exibido == cobrado" e as regras dos blocos ganham teste real.

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Migrations + edge function

```
T7 → T8 → T9 → T10
```

### Phase 3: Estado e dados do checkout

```
T11 → T12 → T13 → T14 → T15 → T16 → T17
```

### Phase 4: Os três blocos + order bump

```
T18 → T19 → T20 → T21
```

### Phase 5: Página, resumo e limpeza do fluxo antigo

```
T22 → T23 → T24 → T25
```

### Phase 6: Confirmação como rota

```
T26 → T27 → T28
```

### Phase 7: Backoffice e fecho

```
T29 → T30
```

---

## Task Breakdown

### T1: `validators/cpf.ts` + `maskCep` no domínio

**What**: Módulo puro de máscara e validação de CPF por dígito verificador, mais `maskCep` movido de
`AddressStep.tsx:11`.
**Where**: `packages/core/src/validators/cpf.ts`, `packages/core/src/validators/cep.ts`
**Depends on**: None
**Reuses**: a implementação de `maskCep` em `apps/store/src/features/checkout/ui/AddressStep.tsx:11`
**Requirement**: PGD-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `maskCpf`, `stripCpf`, `isValidCpf`, `maskCep`, `stripCep` exportados de `@nanapin/core/validators`
- [x] `isValidCpf` rejeita: < 11 dígitos, > 11 dígitos, todos os dígitos iguais (`111...`), DV errado
- [x] `isValidCpf` aceita CPF válido com e sem máscara
- [x] Gate: `pnpm --filter @nanapin/core test`
- [x] Test count: ≥ 12 testes novos passam (sem deleção silenciosa)

**Tests**: unit · **Gate**: quick (core) · **Commit group**: `feat(core): domínio de checkout`

---

### T2: `shipping/estimate.ts` — data de entrega e opção mais barata

**What**: Módulo puro que converte a cotação do Melhor Envio em janela de datas e identifica a opção
mais barata.
**Where**: `packages/core/src/shipping/estimate.ts`
**Depends on**: None
**Reuses**: o shape de `ShippingQuote` de `features/shipping-calc/ui/ShippingCalc.tsx:9-16`
**Requirement**: SHP-06, SHP-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `addBusinessDays(from, days)` pula sábado e domingo; `days = 0` devolve a data de entrada
- [x] `quoteToEstimate(quote, handlingDays, today)` recebe `today` **como parâmetro** (nunca `new Date()` interno)
- [x] `delivery_range` ausente → usa `delivery_time` como min **e** max
- [x] `handling_days = 0` não quebra o cálculo (edge case da spec)
- [x] `formatEstimate` devolve `"entre 4 e 6 de agosto"` quando min ≠ max e `"em 30 de julho"` quando min = max
- [x] `cheapestQuoteId` devolve o `id` do menor `price` (string comparada como número) e `null` para lista vazia
- [x] Gate: `pnpm --filter @nanapin/core test`
- [x] Test count: ≥ 14 testes novos passam

**Tests**: unit · **Gate**: quick (core) · **Commit group**: `feat(core): domínio de checkout`

---

### T3: `payment/pricing.ts` — desconto do order bump no domínio compartilhado

**What**: Estender `calculateOrderTotals` com `applyOrderBump`, de modo que loja e edge function
calculem o mesmo total.
**Where**: `packages/core/src/payment/pricing.ts` (modificar)
**Depends on**: None
**Reuses**: `calculateOrderTotals`, `round2` e os 73 testes existentes de `pricing.test.ts`
**Requirement**: BMP-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `PricingItem` ganha `product_id?: string` (opcional — assinatura atual preservada)
- [x] `CalculateOrderTotalsInput` ganha `bump?: OrderBumpConfig` (opcional)
- [x] `applyOrderBump` aplica o desconto **apenas** ao primeiro item com `product_id === bump.product_id`, **apenas** com `bump.enabled === true` e `quantity === 1`
- [x] `applyOrderBump` devolve a lista **intacta** quando: `bump` nulo, `enabled` falso, `product_id` nulo, nenhum item casa, ou `quantity > 1`
- [x] Chamar `applyOrderBump` duas vezes sobre o mesmo input produz o mesmo resultado (não acumula) — BMP-05
- [x] Os **73 testes existentes** de `pricing.test.ts` continuam passando sem edição
- [x] **Fix iteration 1** — `resolveCouponDiscount` exportada do mesmo módulo, e é ela (não uma conta
      inline em cada lado) que resolve o desconto do cupom na loja e na edge function. Fecha a
      divergência de 1 centavo de BMP-04 registrada no `validation.md`. `calculateOrderTotals`
      **não** mudou de assinatura, e os testes acima seguem passando sem edição. Sensor novo:
      `payment/__tests__/displayedEqualsCharged.test.ts` (13 testes) — ver carry-forward #39
- [x] Gate: `pnpm --filter @nanapin/core test`
- [x] Test count: 73 existentes + ≥ 10 novos passam

**Tests**: unit · **Gate**: quick (core) · **Commit group**: `feat(core): domínio de checkout`

---

### T4: `payment/payer.ts` — montagem do pagador para o Mercado Pago

**What**: Função pura que monta o objeto `payer` (email, first_name, last_name, identification CPF) a
partir dos dados do pedido.
**Where**: `packages/core/src/payment/payer.ts`
**Depends on**: T1
**Reuses**: `stripCpf` de T1; o padrão de módulo puro de `payment/status.ts`
**Requirement**: PGD-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `splitName('Marina Yamashita')` → `{ first: 'Marina', last: 'Yamashita' }`
- [x] `splitName('Marina')` → `{ first: 'Marina', last: 'Marina' }` (token único repete)
- [x] `splitName('Ana Paula Souza Lima')` → `{ first: 'Ana', last: 'Paula Souza Lima' }`
- [x] `buildPayer({ name, email, cpf })` devolve `identification: { type: 'CPF', number: <11 dígitos sem máscara> }`
- [x] `buildPayer` **omite** `identification` quando o CPF é inválido, em vez de enviar valor sujo ao MP
- [x] `mergePayer(fromBrick, fromOrder)` — o `identification`, `first_name` e `last_name` do **pedido vencem** os do Brick; demais campos do Brick preservados
- [x] Gate: `pnpm --filter @nanapin/core test`
- [x] Test count: ≥ 12 testes novos passam

**Tests**: unit · **Gate**: quick (core) · **Commit group**: `feat(core): domínio de checkout`

---

### T5: `checkout/blocks.ts` — completude, bloco aberto e invalidação

**What**: Reducer puro com as regras de CHK-03 (completo por bloco), CHK-04 (qual abre) e CHK-08
(pedido obsoleto).
**Where**: `packages/core/src/checkout/blocks.ts`, `packages/core/src/checkout/types.ts`
**Depends on**: T1
**Reuses**: `isValidCpf` de T1
**Requirement**: CHK-03, CHK-04, CHK-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `CheckoutDraft` exportado com o shape do design (contact / address / shipping / payment / bumpChecked)
- [x] `isContactComplete` exige nome não vazio, e-mail com formato válido e WhatsApp com 10 **ou** 11 dígitos
- [x] `isDeliveryComplete` exige CEP com 8 dígitos, os 5 campos de endereço não vazios **e** `shipping !== null`
- [x] `isPaymentComplete` exige `method !== null` **e** `isValidCpf(cpf)`
- [x] `resolveBlocks` devolve `open` = primeiro incompleto na ordem contact → delivery → payment, e `null` quando os três estão completos
- [x] `resolveBlocks` nunca devolve mais de um bloco aberto
- [x] `isOrderStale(draft, snapshot)` → `false` quando `snapshot` é `null`; `false` quando draft e snapshot são iguais; `true` quando **qualquer** campo que afeta cobrança mudou (endereço, frete, método, bump)
- [x] `isOrderStale` → `false` quando só mudou campo que **não** afeta cobrança (ex.: `consent`)
- [x] Gate: `pnpm --filter @nanapin/core test`
- [x] Test count: ≥ 22 testes novos passam

**Tests**: unit · **Gate**: quick (core) · **Commit group**: `feat(core): domínio de checkout`

---

### T6: Tipos e settings — chave `checkout` + `handling_days`

**What**: Adicionar `CheckoutSettings`, `handling_days` em `ShippingSettings`, `ShippingQuote`, e o
hook `useCheckoutSettings`, garantindo que `fetchAllSettings` não descarte a chave nova.
**Where**: `packages/supabase/src/types/settings.ts`, `packages/supabase/src/types/shipping.ts` (novo),
`packages/core/src/hooks/useStoreSettings.ts`
**Depends on**: None
**Reuses**: `DEFAULTS` e `fetchAllSettings` de `useStoreSettings.ts:36-41`; o padrão de
`usePaymentSettings`/`useShippingSettings`
**Requirement**: BMP-01, SHP-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `CheckoutSettings` + `DEFAULT_CHECKOUT` exportados; `SettingsKey` e `SettingsMap` incluem `'checkout'`
- [x] `ShippingSettings` inclui `handling_days: number`; `DEFAULT_SHIPPING.handling_days === 2`
- [x] `ShippingQuote` movido para `packages/supabase/src/types/shipping.ts` e re-exportado
- [x] `useCheckoutSettings()` devolve os defaults quando a linha não existe no banco
- [x] Teste prova que uma linha `key = 'checkout'` **sobrevive** ao `fetchAllSettings` (a regressão de `useStoreSettings.ts:36-41` que descarta key fora de `DEFAULTS`)
- [x] Gate: `pnpm test && pnpm build`
- [x] Test count: ≥ 6 testes novos passam

**Tests**: unit · **Gate**: build · **Commit group**: `feat(core): domínio de checkout`

---

### T7: Migration M1 — snapshot de entrega em `orders`

**What**: Adicionar `shipping_service_id`, `delivery_estimate_min`, `delivery_estimate_max`.
**Where**: `supabase/migrations/<ts>_orders_shipping_snapshot.sql`
**Depends on**: None
**Reuses**: o padrão `ADD COLUMN IF NOT EXISTS` de `20260415175146_orders_melhor_envio_fields.sql`
**Requirement**: SHP-08

**Tools**: MCP: `supabase` (**bloqueado — não autenticado nesta sessão**; fallback documentado abaixo) · Skill: `supabase`

**Done when**:
- [x] Migration idempotente (`IF NOT EXISTS`), sem `DROP`, sem alterar coluna existente
- [x] `delivery_estimate_min` / `_max` são `date`; `shipping_service_id` é `text`
- [x] Tipos de `Order` em `entities/order/api/useOrders.ts` refletem as 3 colunas
- [x] **Aplicação registrada:** ou aplicada via MCP `supabase` / CLI local, ou a pendência anotada em `STATE.md` → Blockers, com o SQL pronto (mesmo protocolo da `05-mockup-generator`)
- [x] Gate: `pnpm test && pnpm build`

**Tests**: none (schema — build gate) · **Gate**: build · **Commit group**: `feat(db): migrations do checkout`

---

### T8: Migration M2 — policies de UPDATE em `customers` e `addresses`

**What**: Criar as policies de UPDATE escopadas ao próprio usuário, com `USING` **e** `WITH CHECK`.
**Where**: `supabase/migrations/<ts>_customer_address_update_rls.sql`
**Depends on**: None
**Reuses**: o formato de escopo de `20260414121021_*.sql:202-208`; a decisão de RLS escopada do
`STATE.md` (2026-07-18)
**Requirement**: PGD-05, ADR-03

**Tools**: MCP: `supabase` (bloqueado — fallback) · Skill: `supabase`

**Done when**:
- [x] `users update own customer`: `USING (user_id = auth.uid())` **e** `WITH CHECK (user_id = auth.uid())`
- [x] `users update own addresses`: `USING` e `WITH CHECK` com o subselect por `customer_id`
- [x] Comentário no arquivo explicando **por que** `WITH CHECK` é obrigatório (sem ele a cliente reatribui a linha para outro `user_id` no próprio UPDATE)
- [x] Roteiro manual de verificação escrito no corpo da migration: autenticado A não consegue atualizar registro de B
- [x] Aplicação registrada (mesmo protocolo de T7)
- [x] Gate: `pnpm test && pnpm build`

**Tests**: none (schema) + roteiro manual · **Gate**: build · **Commit group**: `feat(db): migrations do checkout`

---

### T9: Migration M3 — `store_settings.checkout` + `handling_days`

**What**: Inserir a chave `checkout` e adicionar `handling_days` à chave `shipping` existente.
**Where**: `supabase/migrations/<ts>_store_settings_checkout.sql`
**Depends on**: T6
**Reuses**: o `INSERT ... ON CONFLICT DO NOTHING` de `20260417015945_create_store_settings.sql:67-91`
**Requirement**: BMP-01, SHP-09

**Tools**: MCP: `supabase` (bloqueado — fallback) · Skill: `supabase`

**Done when**:
- [x] `INSERT` da chave `checkout` com os 3 campos e os defaults do design, `ON CONFLICT DO NOTHING`
- [x] `UPDATE` de `shipping` adiciona `handling_days: 2` **somente** quando a chave ainda não existe (`NOT value ? 'handling_days'`) — não sobrescreve valor já ajustado pelo lojista
- [x] Rodar a migration duas vezes não muda o resultado (idempotência verificada)
- [x] Aplicação registrada (mesmo protocolo de T7)
- [x] Gate: `pnpm test && pnpm build`

**Tests**: none (schema) · **Gate**: build · **Commit group**: `feat(db): migrations do checkout`

---

### T10: `create-payment` — pagador identificado e bump precificado no servidor

**What**: Ligar `applyOrderBump` e `buildPayer` na edge function: ler `store_settings.checkout`, ler
`customers.cpf`/`name` pelo `order.customer_id`, e montar o `payer` para PIX **e** cartão.
**Where**: `supabase/functions/mercado-pago/index.ts` (modificar)
**Depends on**: T3, T4, T9
**Reuses**: o padrão de leitura de settings de `:152-157`; `calculateOrderTotals` de `:161`; `log()`
**Requirement**: BMP-04, PGD-04

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [x] Importa `applyOrderBump`/`buildPayer`/`mergePayer` por caminho relativo, no mesmo formato de `:6-12`
      — a Fix iteration 1 acrescentou `resolveCouponDiscount` ao **mesmo** import de `pricing.ts`, logo
      **nenhum arquivo novo** entra no grafo: o bind mount local do edge runtime segue válido, sem
      `supabase stop && supabase start` (carry-forward #12 não se aplica a esta mudança)
- [x] Lê `store_settings.checkout` e repassa `bump` a `calculateOrderTotals` — **antes** do `UPDATE` que persiste o `total` em `:173-176`
- [x] **Fix iteration 1** — o desconto do cupom sai de `resolveCouponDiscount`, não de um `if/else`
      inline: era ali que nascia a divergência de 1 centavo contra a cliente (carry-forward #39)
- [x] Busca `customers.cpf` + `customers.name` por `order.customer_id`; ausência de CPF → 422 com mensagem clara (**não** cria pagamento PIX sem pagador)
- [x] Ramo PIX: `payer` de `buildPayer` (email + first_name + last_name + identification)
- [x] Ramo cartão: `mergePayer(body.card.payer, payerDoPedido)` — o CPF do pedido sobrescreve o do Brick
- [x] `log()` registra `bump_applied` (bool) e `payer_cpf_present` (bool) — nunca o CPF em si
- [x] Roteiro manual escrito no cabeçalho da função: como exercitar no sandbox MP (PIX com CPF, cartão com CPF divergente do Brick, pedido sem CPF)
- [x] Gate: `pnpm test && pnpm build`

**Tests**: none — manual (runtime de edge function; a lógica está coberta em T3/T4) · **Gate**: build · **Commit group**: `feat(payments): pagador identificado + bump server-side`

---

### T11: `checkoutStore` — rascunho, `order_id` e invalidação

**What**: Store Zustand com persistência em `sessionStorage`, delegando as regras a `@nanapin/core/checkout`.
**Where**: `apps/store/src/features/checkout/model/checkoutStore.ts`
**Depends on**: T5
**Reuses**: o padrão exato de `entities/cart/model/cartStore.ts` (Zustand + `persist`)
**Requirement**: CHK-07, CHK-08

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Estado e ações conforme o design; `blocks()` e `isStale()` delegam a `resolveBlocks`/`isOrderStale`
- [x] `persist` usa **`sessionStorage`** (não `localStorage`) — comprovado por teste
- [x] `setOrder(id, snapshot)` grava os dois; `invalidateOrder()` limpa `orderId` **e** `orderSnapshot`
- [x] Editar qualquer campo que afete cobrança com `orderId` presente → `isStale()` vira `true`
- [x] `reset()` limpa tudo, inclusive o storage
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 12 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T12: `toQuotePayload` + mappers de produto com dimensões

**What**: Extrair o mapper produto→payload de cotação e fazer os mappers de produto selecionarem
`weight_kg`, `width_cm`, `height_cm`, `length_cm`.
**Where**: `apps/store/src/entities/cart/lib/toQuotePayload.ts` (novo),
`apps/store/src/entities/product/api/useProducts.ts` e `useProduct.ts` (modificar)
**Depends on**: T6
**Reuses**: o payload de `features/shipping-calc/ui/ShippingCalc.tsx:36-49`
**Requirement**: SHP-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `toQuotePayload(items: CartItem[])` devolve um entry por item com `quantity` correto
- [x] Quando o produto **tem** `weight_kg`/`width_cm`/`height_cm`/`length_cm`, o payload leva **esses** valores (asserção por valor, não por presença)
- [x] Quando o campo é nulo, aplica os mesmos fallbacks do `shipping-calc` (11/2/16/0.1)
- [x] `useProducts` e `useProduct` passam a selecionar as 4 colunas — teste prova que o objeto mapeado as contém
- [x] `ShippingCalc.tsx` passa a usar `toQuotePayload` (uma única implementação)
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 10 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T13: `useShippingQuote` — cotação do carrinho

**What**: Hook React Query que cota o carrinho no Melhor Envio, com descarte de resposta obsoleta.
**Where**: `apps/store/src/features/checkout/api/useShippingQuote.ts`
**Depends on**: T12
**Reuses**: a chamada de `ShippingCalc.tsx:35-58`; `toQuotePayload` de T12
**Requirement**: SHP-01, SHP-03, SHP-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `queryKey: ['shipping-quote', cep, cartFingerprint]`; `enabled` só com CEP de 8 dígitos (SHP-03)
- [x] Teste prova que trocar o CEP não devolve o resultado do CEP anterior (SHP-10)
- [x] Filtra opções com `price` nulo ou `<= 0` (como o `shipping-calc` já faz)
- [x] Erro da function → `isError`, sem lançar para o componente
- [x] Lista vazia é distinguível de erro (`data: []` vs `isError`)
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 8 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T14: `useCepLookup` — ViaCEP com fallback manual

**What**: Hook que resolve o CEP no ViaCEP e sinaliza modo manual quando não resolve.
**Where**: `apps/store/src/features/checkout/api/useCepLookup.ts`
**Depends on**: T1
**Reuses**: o `fetch` de `AddressStep.tsx:23-38`; `stripCep` de T1
**Requirement**: SHP-03, ADR-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] CEP resolvido devolve `{ street, neighborhood, city, state, manual: false }`
- [x] `data.erro` do ViaCEP → `{ manual: true }` sem lançar
- [x] Falha de rede → `{ manual: true }` sem lançar
- [x] CEP com menos de 8 dígitos não dispara requisição
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 6 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T15: `useCreateOrder` — CEP, complemento e snapshot de entrega

**What**: Estender o mapper de criação de pedido com `address_zip`, `address_complement` e o snapshot
do serviço de envio.
**Where**: `apps/store/src/entities/order/api/useOrders.ts` (modificar)
**Depends on**: T7
**Reuses**: `useCreateOrder` existente (`:89-134`)
**Requirement**: ADR-05, SHP-07

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `CreateOrderInput` ganha `address_zip`, `address_complement`, `shipping_service_id`, `shipping_carrier`, `shipping_method`, `delivery_estimate_min`, `delivery_estimate_max`
- [x] Teste assevera **por valor** que o insert leva `address_zip` (o campo que hoje fica nulo e estoura `MelhorEnvioTab.tsx:71`)
- [x] Teste assevera que o snapshot de envio gravado é o da opção selecionada
- [x] Itens continuam sendo inseridos com `unit_price` (que o servidor recalcula) — nenhuma mudança de contrato ali
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 8 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T16: `useSaveCustomerCpf` — upsert que verifica linhas afetadas

**What**: Hook que persiste o CPF em `customers` **antes** do `create-payment`, checando linhas
afetadas em vez de só `error`.
**Where**: `apps/store/src/entities/customer/api/useSaveCustomerCpf.ts` (novo slice `entities/customer`)
**Depends on**: T1, T8
**Reuses**: o padrão de mutation de `useCreateOrder`
**Requirement**: PGD-03, PGD-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `.update({ cpf }).eq('id', customerId).select()` e **falha explicitamente quando `data.length === 0`** — porque RLS negado retorna 0 linhas sem `error` (o defeito de `AuthContext.tsx:160-164`)
- [x] CPF é gravado sem máscara (`stripCpf`)
- [x] CPF inválido nunca chega ao banco (guarda antes da chamada)
- [x] Teste cobre os três caminhos: sucesso, 0 linhas (RLS), erro de rede
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 6 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T17: `useSaveAddress` — upsert do endereço default

**What**: Hook que grava/atualiza o endereço `is_default` do cliente, sem criar um segundo default.
**Where**: `apps/store/src/entities/address/api/useSaveAddress.ts` (novo slice `entities/address`)
**Depends on**: T8
**Reuses**: o padrão de mutation de `useCreateOrder`; a mesma verificação de linhas afetadas de T16
**Requirement**: ADR-03, ADR-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Sem endereço default → `INSERT` com `is_default: true`
- [x] Com endereço default → `UPDATE` do existente (não insere um segundo) — asseverado por contagem
- [x] Verifica linhas afetadas como em T16
- [x] Falha **não** bloqueia o fluxo: o hook resolve com `{ saved: false }` e loga (o pedido já tem o endereço nas suas colunas)
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 7 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T18: `ContactBlock`

**What**: Bloco 1 do acordeão, com preservação da captação de carrinho abandonado.
**Where**: `apps/store/src/features/checkout/ui/ContactBlock.tsx`
**Depends on**: T11
**Reuses**: `CustomerStep.tsx` como base — em especial a chamada a `setGuestEmail` (`:19,32`) e o
checkbox de consentimento (`:69-78`)
**Requirement**: CHK-03, CHK-11

**Tools**: MCP: `paper` (board `04`, valores exatos por `get_computed_styles`) · Skill: NONE

**Done when**:
- [x] Aberto: campos nome, e-mail, WhatsApp + checkbox de consentimento; pré-preenchidos de `customers`
- [x] Colapsado: nome + e-mail em uma linha e ação "Alterar"
- [x] `setGuestEmail(email, consent)` chamado ao completar/alterar — teste assevera a chamada (CHK-11)
- [x] **Nenhum** elemento com `bg-nanita-jam` no bloco (CHK-04)
- [x] Sem campo de CPF (ele vive no bloco 3)
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 8 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T19: `DeliveryBlock`

**What**: Bloco 2 do acordeão: CEP, endereço, e as opções reais de frete com data.
**Where**: `apps/store/src/features/checkout/ui/DeliveryBlock.tsx`
**Depends on**: T11, T13, T14, T2
**Reuses**: `AddressStep.tsx` (estrutura de campos), `ShippingStep.tsx` (layout das opções — **o resto
dele é descartado**), `quoteToEstimate`/`cheapestQuoteId`/`formatEstimate` de T2
**Requirement**: SHP-01, SHP-03, SHP-04, SHP-05, SHP-06, ADR-01, ADR-02

**Tools**: MCP: `paper` (board `04`, lanes das opções de frete) · Skill: NONE

**Done when**:
- [x] CEP resolvido → rua/bairro/cidade/UF em campos **travados**; número e complemento editáveis (ADR-01)
- [x] `manual: true` → os 4 campos destravam (SHP-03)
- [x] Cada opção exibe transportadora, serviço, preço e **data** de `formatEstimate` (SHP-01)
- [x] `isError` ou lista vazia → opção única "Frete padrão" com `default_shipping_cost` + aviso visível (SHP-04)
- [x] `subtotal ≥ free_shipping_threshold` → a opção de `cheapestQuoteId` mostra "Grátis" com o preço riscado e `cost = 0`; as outras mantêm preço (SHP-05)
- [x] **Fronteira de SHP-06 com sensor** (Fix iteration 1): `subtotal === free_shipping_threshold`
      exatamente → a mais barata **é** grátis; 149,99 contra 150 → nenhuma é. Antes disso, trocar
      `>=` por `>` deixava as 21 asserções verdes (mutante sobrevivente do `validation.md`)
- [x] Cupom `freeShipping` → **todas** as opções mostram "Grátis" e custam 0 (edge case da spec)
- [x] Lista com uma única opção → vem pré-selecionada (edge case da spec)
- [x] Endereço `is_default` presente → bloco abre colapsado e preenchido (ADR-02) —
      **fechado na Fix iteration 1**: semear o endereço não bastava, porque colapsar exige
      `shipping !== null`. Agora o endereço vindo do default **pré-seleciona a opção mais barata**, e
      o caso geral (2+ opções cotadas) está provado na página em
      `pages/__tests__/CheckoutPage.test.tsx` → *"endereço salvo colapsa a Entrega (ADR-02)"*, não só
      no componente. Endereço digitado na hora **não** pré-seleciona
- [x] Trocar o CEP com frete já selecionado → seleção descartada e `cost` volta a 0 (edge case da spec)
      — inclusive quando o endereço vinha do default: a pré-seleção não retorna
- [x] Nenhum `bg-nanita-jam` e nenhuma cor fora da paleta
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 18 testes novos passam (26 no arquivo após a Fix iteration 1)

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T20: `PaymentBlock`

**What**: Bloco 3 do acordeão: método, CPF do pagador e montagem de `PixPayment`/`CardPaymentBrick`.
**Where**: `apps/store/src/features/checkout/ui/PaymentBlock.tsx`
**Depends on**: T11, T1
**Reuses**: `PaymentStep.tsx` (toggle filtrado por settings — a lógica de fallback de `:31-35` é boa e
migra), `PixPayment`, `CardPaymentBrick`, `isValidCpf`/`maskCpf` de T1
**Requirement**: PGD-01, PGD-02, PGD-06

**Tools**: MCP: `paper` (board `04`, cartões de método) · Skill: NONE

**Done when**:
- [x] Cards de PIX e cartão filtrados por `pix_enabled`/`card_enabled`; fallback quando o método ativo é desabilitado (comportamento de `PaymentStep.tsx:31-35` preservado)
- [x] Card do PIX exibe o badge de desconto quando `pix_discount_percent > 0`
- [x] Campo CPF com `maskCpf`, obrigatório, com a justificativa ao lado (PGD-01)
- [x] CPF inválido → mensagem no campo e `isPaymentComplete` falso (PGD-02)
- [x] CPF pré-preenchido de `customers.cpf` quando existir (PGD-06)
- [x] Nenhum `bg-nanita-jam` no bloco
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 12 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T21: `OrderBump`

**What**: A oferta marcável entre o bloco 3 e o CTA.
**Where**: `apps/store/src/features/checkout/ui/OrderBump.tsx`
**Depends on**: T11, T6, T3
**Reuses**: `entities/product` (`useProduct`), `useCheckoutSettings` de T6, `applyOrderBump` de T3
**Requirement**: BMP-02, BMP-03, BMP-05

**Tools**: MCP: `paper` (board `04`, superfície tinta + marca d'água) · Skill: NONE

**Done when**:
- [x] Renderiza **só** com `order_bump_enabled`, produto existente, `stock_total > 0` e produto fora do carrinho — os 4 casos negativos testados (BMP-02)
- [x] Preço exibido = `applyOrderBump` (mesma função do servidor), nunca cálculo local duplicado (BMP-03)
- [x] Marcar/desmarcar 3× → um único item e desconto aplicado uma vez (BMP-05)
- [x] Superfície tinta, badge em manteiga **sobre tinta** (permitido), rótulo em glacê — nenhuma cor fora da paleta
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 10 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T22: `OrderSummary` reescrito

**What**: O resumo persistente que substitui o passo Revisão, nas duas variantes.
**Where**: `apps/store/src/features/checkout/ui/OrderSummary.tsx` (reescrever)
**Depends on**: T11, T3
**Reuses**: o `OrderSummary` atual e seu teste (`__tests__/OrderSummary.test.tsx`) como ponto de
partida; `calculateOrderTotals` de T3
**Requirement**: CHK-05

**Tools**: MCP: `paper` (board `04`, coluna de resumo; board `07`, barra) · Skill: NONE

**Done when**:
- [x] `variant='sidebar'` e `variant='bar'` renderizam a mesma informação em layouts diferentes
- [x] Linhas: itens com quantidade, frete selecionado, cupom, **desconto PIX como linha própria**, total
- [x] Total vem de `calculateOrderTotals` — nunca soma local (asserção de valor exato)
- [x] Faixa de frete grátis: estado "faltam R$ X" e estado "liberado"
- [x] Nenhuma cor fora da paleta (o cart drawer usa manteiga sobre branco — **não** replicar)
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: testes existentes atualizados + ≥ 10 novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): checkout one-page`

---

### T23: `CheckoutPage` one-page

**What**: A página que orquestra os 3 blocos, o resumo, o bump, o CTA e o header próprio.
**Where**: `apps/store/src/pages/CheckoutPage.tsx` (reescrever)
**Depends on**: T18, T19, T20, T21, T22, T15, T16, T17
**Reuses**: `CheckoutPage.tsx` atual (guarda de auth `:50-63`, guarda de carrinho vazio `:65-72`);
`__tests__/CheckoutPage.test.tsx` existente
**Requirement**: CHK-01, CHK-02, CHK-04, CHK-06, CHK-07, CHK-09, CHK-10, CHK-12

**Tools**: MCP: `paper` (boards `04` e `07`) · Skill: NONE

**Done when**:
- [x] Três blocos numerados; **zero** ocorrência de "Revisão" ou `StepIndicator` na árvore renderizada (CHK-01)
- [x] Não autenticada → overlay com `returnTo='/checkout'` e blocos não renderizados (CHK-02)
- [x] Bloco aberto = `resolveBlocks().open`; no máximo um aberto (CHK-04)
- [x] Rótulo do CTA com valor **do método selecionado** — teste com `pix_discount_percent = 5` assevera valores **diferentes** entre PIX e cartão (CHK-06)
- [x] CTA desabilitado com qualquer bloco incompleto (CHK-06)
- [x] Dois acionamentos sem edição → `createOrder` chamado **1×** (CHK-07)
- [x] Editar bloco entre acionamentos → `createOrder` chamado **2×** (CHK-08 via store)
- [x] Falha de `createOrder` → toast, rascunho e carrinho intactos, CTA reacionável (CHK-09)
- [x] Falha de `useSaveCustomerCpf` → **bloqueia** e não chama `create-payment`
- [x] Header próprio sem navegação; faixa de confiança abaixo do CTA com texto coerente com `PoliciesPage` (CHK-10, CHK-12)
- [x] Carrinho vazio → redireciona ao carrinho (edge case)
- [x] Gate: `pnpm --filter @nanapin/core test && pnpm --filter @nanapin/store test`
- [x] Test count: testes existentes atualizados + ≥ 20 novos passam

**Tests**: unit · **Gate**: full · **Commit group**: `feat(store): checkout one-page`

---

### T24: Remover o fluxo de 5 passos e as cores fora da paleta

**What**: Apagar os componentes do fluxo antigo e limpar as classes de cor não-Nanita nas telas do
escopo.
**Where**: apagar `features/checkout/ui/{ReviewStep,StepIndicator,CustomerStep,AddressStep,ShippingStep,PaymentStep}.tsx`
e os testes órfãos; modificar `features/checkout/ui/PixPayment.tsx`
**Depends on**: T23
**Reuses**: —
**Requirement**: CHK-01, CNF-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Os 6 arquivos apagados; `features/checkout/index.ts` atualizado; nenhum import quebrado
- [x] `__tests__/PaymentStep.test.tsx` **migrado** para `PaymentBlock` (não apagado sem substituto)
- [x] `text-red-500/600` e `text-green-600` de `PixPayment.tsx:99,141,164` substituídos por tokens Nanita
- [x] `grep -rnE "bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]" apps/store/src/features/checkout apps/store/src/pages/CheckoutPage.tsx apps/store/src/pages/OrderConfirmationPage.tsx` retorna **zero**
- [x] Gate: `pnpm test && pnpm build`
- [x] Test count: contagem total do store não cai (migração, não deleção)

**Tests**: unit · **Gate**: build · **Commit group**: `refactor(store): remove fluxo de 5 passos`

---

### T25: `PixPayment` — valor a pagar e saída para a conta

**What**: Adicionar o valor em destaque e o ponteiro para "Minha conta → Pedidos" na tela do PIX.
**Where**: `apps/store/src/features/checkout/ui/PixPayment.tsx` (modificar)
**Depends on**: T24
**Reuses**: `PixPayment` inteiro (contador, QR, copiar, regenerar já verificados na `02`) e
`__tests__/PixPayment.test.tsx`
**Requirement**: CNF-01, CNF-02

**Tools**: MCP: `paper` (board `05`) · Skill: NONE

**Done when**:
- [x] Valor a pagar em destaque, com a nota de desconto PIX quando `pix_discount_percent > 0` (CNF-01)
- [x] Estado expirado exibe link para `/conta` com o texto de pedido guardado (CNF-02)
- [x] Contador, QR, copiar e regenerar **inalterados** — testes existentes passam sem edição
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: existentes + ≥ 5 novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): telas de PIX e confirmação`

---

### T26: `OrderTimeline`

**What**: Timeline monocromática de 4 estágios, em `entities/order` para a spec `09` reusar.
**Where**: `apps/store/src/entities/order/ui/OrderTimeline.tsx`
**Depends on**: T7
**Reuses**: — (novo). Padrão de forma do board `06`
**Requirement**: CNF-04, CNF-06

**Tools**: MCP: `paper` (board `06`, trilha de 4 estágios) · Skill: NONE

**Done when**:
- [x] 4 estágios; concluído = preenchido, atual = anel, futuro = contorno — distinguíveis **sem cor**
- [x] Recebe `estimate` e exibe a janela; `estimate` nulo → omite a linha sem quebrar
- [x] `status = 'cancelled'` renderiza estado próprio (não finge progresso)
- [x] Zero classe de cor fora de `nanita-*`
- [x] Fica em `entities/order/ui` (não em `features/`) — sem cross-import de feature
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 10 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): telas de PIX e confirmação`

---

### T27: `useOrder` + `OrderConfirmationPage` reescrita

**What**: Hook que busca um pedido por id e a confirmação como rota de verdade.
**Where**: `apps/store/src/entities/order/api/useOrder.ts` (novo),
`apps/store/src/pages/OrderConfirmationPage.tsx` (reescrever — hoje é **stub** que só fatia o `id`)
**Depends on**: T26
**Reuses**: o padrão de query de `useOrdersByCustomerId` (`:47-60`); `NanaMascot expression="wink"`
**Requirement**: CNF-03, CNF-04, CNF-05

**Tools**: MCP: `paper` (board `06`) · Skill: NONE

**Done when**:
- [x] `useOrder(id)` busca `orders` + `order_items` por id; erro e não-encontrado tratados
- [x] Página exibe mascote `wink`, número, valor pago, e-mail e `OrderTimeline` com a janela de entrega (CNF-04)
- [x] **Uma** ação primária ("Acompanhar pedido" → `/conta`, pílula geleia) e uma secundária ("Ver mais pins" → `/`, contorno tinta) — asseverado por classe (CNF-05)
- [x] Recarregar a rota mantém a confirmação (não depende de estado do checkout) (CNF-03)
- [x] Não promete e-mail de confirmação (sem infra de e-mail — herdado da `02`)
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 12 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): telas de PIX e confirmação`

---

### T28: Navegação da aprovação e limpeza do carrinho

**What**: Ligar a aprovação do pagamento à navegação para `/pedido/:id`, com `clearCart` acontecendo
só aí.
**Where**: `apps/store/src/pages/CheckoutPage.tsx` (modificar)
**Depends on**: T27
**Reuses**: `handlePaymentSuccess` atual (`:139-147`) — `markCartRecovered`, `clearGuestEmail`,
`clearCart`, `clearCoupon` já estão certos e migram
**Requirement**: CNF-03, CNF-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Aprovação → `navigate('/pedido/' + orderId)`; nenhum estado `submitted` inline sobra
- [x] `clearCart` e `clearCoupon` chamados **exatamente 1×**, e **só** na aprovação (recusa não limpa)
- [x] `markCartRecovered` e `clearGuestEmail` preservados
- [x] `checkoutStore.reset()` chamado após a navegação (o rascunho não sobrevive à compra)
- [x] Gate: `pnpm --filter @nanapin/store test`
- [x] Test count: ≥ 8 testes novos passam

**Tests**: unit · **Gate**: quick (store) · **Commit group**: `feat(store): telas de PIX e confirmação`

---

### T29: Configuração do order bump no backoffice

**What**: Bloco de order bump na tela de Configurações.
**Where**: `apps/backoffice/src/features/settings/ui/CheckoutSettingsCard.tsx` (ou o padrão de card já
usado na tela de Configurações do backoffice)
**Depends on**: T6, T9
**Reuses**: o `FormCard` de `apps/backoffice/src/shared/ui`; o padrão dos cards de settings existentes
**Requirement**: BMP-06

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Toggle de `order_bump_enabled`, seletor de produto e campo de percentual
- [x] Salvar persiste na chave `checkout` de `store_settings`
- [x] Usa tokens shadcn e `shared/ui` conforme a decisão de 2026-07-20 do `STATE.md` (não `nana-*` direto)
- [x] Percentual fora de 1–99 é rejeitado no formulário
- [x] Gate: `pnpm --filter @nanapin/backoffice test`
- [x] Test count: ≥ 6 testes novos passam

**Tests**: unit · **Gate**: quick (backoffice) · **Commit group**: `feat(backoffice): configuração do order bump`

---

### T30: Documentação, traceability e commits

**What**: Fechar a feature: atualizar docs, mover a traceability para `Implementing` e gerar os commits
agrupados.
**Where**: `.specs/features/08-checkout-one-page/spec.md`, `.specs/project/STATE.md`, `CLAUDE.md`,
`.env.example` (se novo secret aparecer — não previsto)
**Depends on**: T29
**Reuses**: o protocolo de fecho da `05-mockup-generator` (Handoff detalhado + pendências manuais)
**Requirement**: — (fecho)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Traceability da spec: os 44 requisitos com `Status: Implementing` e a task que os cobre
- [x] `STATE.md`: Handoff com tasks, contagem de testes, e as **pendências manuais explícitas** (aplicar 3 migrations, exercitar sandbox MP, verificar RLS em banco vivo)
- [x] `CLAUDE.md`: nota de que o checkout é one-page e de que o desconto por item é server-side
- [ ] Commits gerados **de uma vez**, agrupados por `Commit group` (7 grupos), conforme o override do
      `CLAUDE.md` — **pendente, do orquestrador.** O working tree tem trabalho não commitado da
      `04-store-login-ux`; o worker do Batch 5 não commitou nada por instrução explícita.
- [x] Gate: `pnpm test && pnpm build`

**Tests**: none (docs) · **Gate**: build · **Commit group**: `docs(checkout): spec, state e traceability`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

Phase 1:  T1 ─→ T2 ─→ T3 ─→ T4 ─→ T5 ─→ T6          (6 tasks · core puro)
Phase 2:  T7 ─→ T8 ─→ T9 ─→ T10                      (4 tasks · db + edge fn)
Phase 3:  T11 ─→ T12 ─→ T13 ─→ T14 ─→ T15 ─→ T16 ─→ T17   (7 tasks · estado + dados)
Phase 4:  T18 ─→ T19 ─→ T20 ─→ T21                   (4 tasks · blocos)
Phase 5:  T22 ─→ T23 ─→ T24 ─→ T25                   (4 tasks · página)
Phase 6:  T26 ─→ T27 ─→ T28                          (3 tasks · confirmação)
Phase 7:  T29 ─→ T30                                 (2 tasks · backoffice + fecho)
```

**Total: 30 tasks em 7 fases.** Nenhuma fase passa de 7 tasks, então o empacotamento em batches de ~7
cai em fronteira de fase sem partir nenhuma. Estimativa: **~5 batches** (P1 · P2 · P3 · P4+P5 · P6+P7),
logo o Execute vai oferecer sub-agents.

Execução é estritamente sequencial — não há paralelismo dentro da fase.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 2 arquivos coesos de validador puro | ✅ Granular |
| T2 | 1 módulo (4 funções da mesma responsabilidade) | ✅ Granular |
| T3 | 1 arquivo modificado (1 função nova) | ✅ Granular |
| T4 | 1 módulo (3 funções coesas) | ✅ Granular |
| T5 | 1 módulo + seus tipos | ✅ Granular |
| T6 | 3 arquivos de tipo/config, uma mudança | ✅ Granular (coeso) |
| T7 · T8 · T9 | 1 migration cada | ✅ Granular |
| T10 | 1 arquivo modificado | ✅ Granular |
| T11 | 1 store | ✅ Granular |
| T12 | 1 lib + 2 mappers (mesma mudança) | ✅ Granular (coeso) |
| T13 · T14 | 1 hook cada | ✅ Granular |
| T15 · T16 · T17 | 1 hook cada | ✅ Granular |
| T18 · T19 · T20 · T21 | 1 componente cada | ✅ Granular |
| T22 | 1 componente reescrito | ✅ Granular |
| T23 | 1 página reescrita | ✅ Granular (fat mas indivisível — é a orquestração) |
| T24 | deleção + 1 arquivo limpo | ✅ Granular |
| T25 | 1 componente modificado | ✅ Granular |
| T26 · T27 | 1 componente / 1 hook + 1 página | ✅ Granular |
| T28 | 1 função na página | ✅ Granular |
| T29 | 1 card de settings | ✅ Granular |
| T30 | fecho de docs | ✅ Granular |

Nenhum ❌ — nada a reestruturar.

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| ---- | ------------------ | --------------- | ------ |
| T1 | None | — (início da P1) | ✅ Match |
| T2 | None | T1 → T2 (ordem, não dependência) | ✅ Match |
| T3 | None | T2 → T3 (ordem) | ✅ Match |
| T4 | T1 | T3 → T4 (ordem); T1 é anterior na mesma fase | ✅ Match |
| T5 | T1 | T4 → T5 (ordem); T1 anterior | ✅ Match |
| T6 | None | T5 → T6 (ordem) | ✅ Match |
| T7 | None | início da P2 | ✅ Match |
| T8 | None | T7 → T8 (ordem) | ✅ Match |
| T9 | T6 | T6 está na P1 (anterior) | ✅ Match |
| T10 | T3, T4, T9 | todos anteriores (P1, P1, P2) | ✅ Match |
| T11 | T5 | T5 na P1 | ✅ Match |
| T12 | T6 | T6 na P1 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T1 | T1 na P1 | ✅ Match |
| T15 | T7 | T7 na P2 | ✅ Match |
| T16 | T1, T8 | P1, P2 | ✅ Match |
| T17 | T8 | P2 | ✅ Match |
| T18 | T11 | T11 na P3 | ✅ Match |
| T19 | T11, T13, T14, T2 | P3, P3, P3, P1 | ✅ Match |
| T20 | T11, T1 | P3, P1 | ✅ Match |
| T21 | T11, T6, T3 | P3, P1, P1 | ✅ Match |
| T22 | T11, T3 | P3, P1 | ✅ Match |
| T23 | T18–T22, T15, T16, T17 | P4 e P3 | ✅ Match |
| T24 | T23 | T23 → T24 | ✅ Match |
| T25 | T24 | T24 → T25 | ✅ Match |
| T26 | T7 | P2 | ✅ Match |
| T27 | T26 | T26 → T27 | ✅ Match |
| T28 | T27 | T27 → T28 | ✅ Match |
| T29 | T6, T9 | P1, P2 | ✅ Match |
| T30 | T29 | T29 → T30 | ✅ Match |

**Regra verificada:** nenhuma task depende de task em fase posterior. Todas as dependências apontam
para trás ou para a mesma fase.

---

## Test Co-location Validation

| Task | Code Layer criada/modificada | Matriz exige | Task diz | Status |
| ---- | ---------------------------- | ------------ | -------- | ------ |
| T1 | Domínio puro | unit | unit | ✅ OK |
| T2 | Domínio puro | unit | unit | ✅ OK |
| T3 | Domínio puro | unit | unit | ✅ OK |
| T4 | Domínio puro | unit | unit | ✅ OK |
| T5 | Domínio puro | unit | unit | ✅ OK |
| T6 | Tipos/config **+ hook de dados** | unit (o maior dos dois) | unit | ✅ OK |
| T7 | Schema SQL | none (build) | none | ✅ OK |
| T8 | Schema SQL | none (build) + manual | none + manual | ✅ OK |
| T9 | Schema SQL | none (build) | none | ✅ OK |
| T10 | Runtime de edge function | none — manual | none — manual | ✅ OK (lógica coberta em T3/T4) |
| T11 | Store de estado | unit | unit | ✅ OK |
| T12 | Hooks de dados + lib | unit | unit | ✅ OK |
| T13 | Hook de dados | unit | unit | ✅ OK |
| T14 | Hook de dados | unit | unit | ✅ OK |
| T15 | Hook de dados | unit | unit | ✅ OK |
| T16 | Hook de dados | unit | unit | ✅ OK |
| T17 | Hook de dados | unit | unit | ✅ OK |
| T18 | Componente de UI | unit | unit | ✅ OK |
| T19 | Componente de UI | unit | unit | ✅ OK |
| T20 | Componente de UI | unit | unit | ✅ OK |
| T21 | Componente de UI | unit | unit | ✅ OK |
| T22 | Componente de UI | unit | unit | ✅ OK |
| T23 | Página | unit | unit | ✅ OK |
| T24 | Componente de UI (deleção + limpeza) | unit | unit | ✅ OK (teste migrado, não apagado) |
| T25 | Componente de UI | unit | unit | ✅ OK |
| T26 | Componente de UI | unit | unit | ✅ OK |
| T27 | Hook de dados + Página | unit | unit | ✅ OK |
| T28 | Página | unit | unit | ✅ OK |
| T29 | UI do backoffice | unit | unit | ✅ OK |
| T30 | Docs | none (build) | none | ✅ OK |

Nenhuma ❌ VIOLATION. Nenhuma task usa "testado em outra task" como justificativa para `Tests: none` —
as duas ocorrências de `none` são schema SQL (build gate) e runtime de edge function, ambas classificadas
assim na matriz, com a lógica testável extraída para o domínio puro (T3/T4).

---

## Ferramentas por task — resumo e bloqueio conhecido

| Ferramenta | Onde | Situação |
| ---------- | ---- | -------- |
| MCP `paper` | T18–T23, T25–T27 (valores exatos por `get_computed_styles` / `get_jsx` dos boards `04`–`07`) | ✅ Disponível |
| MCP `supabase` | T7, T8, T9 (aplicar migrations) | ⚠️ **Bloqueado — não autenticado.** Fallback: CLI local (`supabase db reset`) ou registrar a pendência em `STATE.md` → Blockers com o SQL pronto, como fez a `05-mockup-generator` |
| Skill `supabase` | T7–T10 | ✅ Disponível |
| Sandbox Mercado Pago | T10 (roteiro manual) | ⚠️ Não exercitado desde a `02` — pendência herdada |

> **Aviso do `supabase db reset`:** a memória do projeto registra que o reset deixa a loja em 401
> porque os grants do schema `public` não estão nas migrations. Se o fallback local for usado, contar
> com esse passo extra.
