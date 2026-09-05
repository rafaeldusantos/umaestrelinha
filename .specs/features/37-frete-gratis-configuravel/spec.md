# Frete grátis configurável — o interruptor que hoje não existe

## Problem Statement

A loja **anuncia e concede** frete grátis, sempre. Não há como a Adri desligar: a aba `Frete` do
painel oferece um único campo, `Frete grátis a partir de (R$)`, e nenhum interruptor.

O caminho óbvio — zerar o campo — é pior que não ter saída, porque `free_shipping_threshold = 0`
significa **coisas opostas** em arquivos diferentes. Sete superfícies leem a mesma configuração e se
dividem em dois grupos, lido do fonte:

| Superfície | O que faz com `threshold = 0` | Efeito |
| --- | --- | --- |
| `widgets/home-sections/ui/TrustBar.tsx:52` | `threshold > 0 ? … : 'para todo o Brasil'` | esconde a promessa |
| `entities/product/ui/ProductTrustBadges.tsx:31` | `threshold > 0 && {…}` | esconde o selo |
| `pages/PoliciesPage.tsx:27` | `threshold > 0 && (…)` | esconde o parágrafo |
| `widgets/cart-drawer/model/drawerFacts.ts:24` | `if (!(threshold > 0)) return { reached: true, percent: 100 }` | **"Frete grátis liberado"** |
| `features/checkout/ui/OrderSummary.tsx:56` | `cartSubtotal >= 0` ⇒ sempre verdadeiro | **"Frete grátis liberado"** |
| `features/checkout/ui/DeliveryBlock.tsx:174` | `subtotal >= 0` ⇒ sempre verdadeiro | **zera a opção mais barata** |
| `entities/cart/model/cartStore.ts:157` | `sub >= 0 ? 0 : SHIPPING_COST` | **zera o frete** |

Ou seja: **zerar o campo hoje esconde o anúncio e libera o frete grátis para todo mundo no caixa.**
A dona veria a loja parar de prometer frete grátis e continuaria pagando por ele, pedido a pedido,
sem nada em tela dizendo por quê. É o "defeito 01" do `CLAUDE.md` — dois donos da mesma regra — com a
agravante de estar no caminho do dinheiro e de o campo que o dispara ser justamente aquele que
alguém usaria para desligar a funcionalidade.

Dois achados menores do mesmo levantamento:

- **`features/auth/ui/AuthOverlay.tsx:35` crava o número**: `Frete grátis acima de R$150`, literal
  no JSX, num painel que a cliente vê ao entrar. É a falha que a `PDP-24` já corrigiu na
  `PoliciesPage` e a `24` na `MarqueeBar` — sobreviveu aqui.
- **`features/shipping-calc/ui/FreeShippingBar.tsx` não tem consumidor nenhum.** Está exportado pelo
  barrel e nunca é importado. É uma **oitava** leitura da regra, esperando para divergir das outras
  sete, e ainda divide por `threshold` sem guarda (`0` ⇒ `Infinity`/`NaN` na largura da barra).

## Goals

- [ ] A Adri **liga e desliga** o frete grátis no painel, com um ato explícito e reversível, sem
      perder o valor da faixa que ela configurou.
- [ ] Com o interruptor **desligado**, nenhuma superfície da loja anuncia frete grátis **e** o frete
      é cobrado no caixa. As duas coisas juntas, sempre — nunca uma sem a outra.
- [ ] A pergunta "esta loja pratica frete grátis, e falta quanto?" ter **um dono só**, em
      `@estrelinha/core`, lido por todas as superfícies e por nenhuma reimplementado.
- [ ] Um guarda que **derruba a suíte** se alguma tela voltar a ler `free_shipping_threshold` direto.
- [ ] Nenhum número de frete grátis cravado em JSX.

## Out of Scope

Explicitamente excluído. Documentado para impedir alargamento.

| Item | Motivo |
| --- | --- |
| Cupom do tipo `free_shipping` | **Decisão do usuário** (ver `context.md` Q2). O interruptor governa a faixa **automática por valor de compra**; cupom é ato explícito da dona, criado um a um em `/admin/cupons`. Desligar a faixa não invalida campanha que ela montou. |
| `packages/core/src/payment/pricing.ts` e `supabase/functions/mercado-pago/**` | Consequência direta do item acima: o único caminho de frete grátis que o **servidor** conhece é o do cupom, e ele não muda. Nenhuma linha de código de dinheiro é alterada — conferido por `git diff --name-only` no gate, como nas features 22–25. |
| Frete grátis por região, por categoria ou por produto | Regra nova de negócio, com modelo de dados próprio. Esta feature dá um interruptor à regra **que já existe**. |
| Frete grátis incondicional (`enabled` com faixa em zero) | Nunca foi pedido, e teria copy própria em cinco superfícies ("+R$ 0" no selo do produto não diz nada). O estado é recusado na gravação (`FRG-12`), não interpretado em silêncio. Quem quiser o efeito configura R$ 0,01. |
| Rever o teto de `default_shipping_cost` ou a cotação do Melhor Envio | Outro assunto. O frete **cobrado** quando não é grátis já funciona e não é tocado. |
| Programar a faixa por data (campanha) | Seria `starts_at`/`ends_at` na configuração — segundo mecanismo de agendamento, sendo que cupom já tem o dele. |

---

## Assumptions & Open Questions

| Assunção / decisão | Default escolhido | Racional | Confirmado? |
| --- | --- | --- | --- |
| **Forma do interruptor** | campo novo `free_shipping_enabled: boolean` em `ShippingSettings`, ao lado de `free_shipping_threshold` | Reusar `threshold > 0` como interruptor faria a dona **perder o número** ao desligar (ela desliga em março e em maio precisa lembrar que era 150) e colapsaria dois estados num campo só. O precedente do próprio `store_settings` é unânime: `pix_enabled`+`pix_discount_percent`, `card_enabled`+`max_installments`, `order_bump_enabled`+`order_bump_product_id`, `google_shopping.enabled`. A regra do `CLAUDE.md` contra coluna derivável não alcança este caso: o booleano carrega **um bit que o número não carrega sem destruir o valor configurado**. | n |
| **Estado inicial** | **desligado** (`false`) no SQL e no TypeScript | **Decisão do usuário.** O custo é conhecido e aceito: no dia do deploy a loja **para** de anunciar e de conceder frete grátis, até a Adri ligar no painel. Mesmo molde do `google_shopping.enabled`, que nasce desligado por ato explícito da dona. | **y** |
| **Cupom `free_shipping` com o interruptor desligado** | **continua zerando o frete** | **Decisão do usuário.** Ver *Out of Scope*. | **y** |
| **Faixa "Complete o frete grátis" da gaveta** (`CrossSell`) | **some junto** com o resto | **Decisão do usuário.** Todo o enquadramento dela é "complete o frete" — sem a faixa de progresso, o título promete o que a loja não faz. Copy nova num negócio memorial precisa de revisão de tom, e não foi pedida. | **y** |
| **Onde mora a regra** | `packages/core/src/shipping/freeShipping.ts`, exportado por `@estrelinha/core/shipping` | Já existem **sete** consumidores; o critério do `CLAUDE.md` ("se dois consumidores leem a mesma regra, ela vai para `packages/core`") está satisfeito sete vezes. O módulo `core/shipping` já existe (`estimate.ts`) e é o vizinho certo. | n |
| **Extensões `.ts` explícitas nos imports do módulo novo** | sim, desde o primeiro import | Regra do `CLAUDE.md` medida na feature 33: módulo de `core` só é alcançável fora do Vite quando todo especificador relativo do grafo tem `.ts` explícito, **inclusive `import type`**. Hoje nenhuma edge function lê frete grátis, mas escrever a extensão custa zero agora e é retrabalho depois. | n |
| **O que o `reached` vale com o interruptor desligado** | **`false`, sempre** | É a asserção que mata o defeito de hoje. As quatro superfícies que zeram frete perguntam "atingiu?"; se `reached` puder ser verdadeiro com a funcionalidade desligada, o defeito volta pela porta dos fundos. | n |
| **`enabled: true` com faixa `<= 0`** | **dado inválido**: o painel recusa gravar (`FRG-12`), e a regra pura o trata como inativo | Deixar a loja se comportar como "desligada" enquanto o painel exibe "ligado" é divergência silenciosa entre o que a dona lê e o que a cliente vive — a família de defeito que esta feature existe para fechar. A recusa na gravação é a barreira; a regra pura é o cinto. | n |
| **Frete cobrado quando a faixa está desligada** | o cotado pelo Melhor Envio, ou `default_shipping_cost` no fallback | Já é o comportamento para quem não atinge a faixa. Desligar não inventa preço novo. | n |
| **`FreeShippingBar`** | **apagado**, junto do export no barrel | Zero consumidores. Mantê-lo obrigaria a adaptá-lo e a testá-lo para um estado que ninguém renderiza — e ele é, hoje, a oitava leitura divergente da regra. | n |
| **Item do `AuthOverlay`** | derivado das settings; **some** quando a faixa está desligada | Os outros dois itens ("Peça única, feita à mão", "Acompanhe seu pedido do início ao fim") não dependem de configuração e seguram o painel sozinhos. | n |
| **Baseline de testes** | sobe; nenhuma queda sem contrapartida | `FreeShippingBar` não tem teste, então apagá-lo não derruba contagem. | n |

**Open questions:** nenhuma.

---

## User Stories

### P1: A dona liga e desliga o frete grátis ⭐ MVP

**User Story**: Como dona da loja, quero decidir no painel se a loja pratica frete grátis, para que a
vitrine pare de prometer — e o caixa pare de conceder — algo que eu não escolhi bancar.

**Why P1**: É o pedido. Sem isto não há feature.

**Acceptance Criteria**:

1. WHEN a aba `Frete` de `/admin/configuracoes` é aberta THEN o sistema SHALL exibir um interruptor
   rotulado para o frete grátis, refletindo o valor de `shipping.free_shipping_enabled`.
2. WHEN a dona alterna o interruptor e salva THEN o sistema SHALL persistir
   `shipping.free_shipping_enabled` em `store_settings`, **preservando** `free_shipping_threshold`
   com o valor que ela configurou.
3. WHEN o interruptor está desligado THEN o campo do valor da faixa SHALL continuar exibindo o número
   guardado, em estado desabilitado — desligar não apaga a configuração.
4. WHEN a chave `shipping` do banco não tem o campo `free_shipping_enabled` THEN o sistema SHALL usar
   `DEFAULT_SHIPPING.free_shipping_enabled` sem perder os demais campos da linha.

**Independent Test**: abrir `/admin/configuracoes` → aba Frete, desligar, salvar, recarregar a página
e ver o interruptor desligado com o valor da faixa intacto.

---

### P1: Desligado, a loja não promete frete grátis ⭐ MVP

**User Story**: Como cliente, quero não ler em lugar nenhum da loja uma promessa de frete grátis que
não vou receber no checkout.

**Why P1**: Promessa não cumprida num negócio memorial é o pior tipo de erro que esta loja pode
cometer — a cliente já está numa perda.

**Acceptance Criteria**:

5. WHEN o frete grátis está desligado THEN a faixa de vantagens da home (`TrustBar`) SHALL exibir
   `para todo o Brasil` na segunda linha do item de envio, e **não** um valor de faixa.
6. WHEN o frete grátis está desligado THEN a faixa de garantias da página do produto
   (`ProductTrustBadges`) SHALL **omitir** o selo de frete grátis, mantendo os demais.
7. WHEN o frete grátis está desligado THEN a página `/politicas` SHALL **omitir** o parágrafo do frete
   grátis, mantendo o parágrafo de envio.
8. WHEN o frete grátis está desligado THEN a gaveta do carrinho SHALL **omitir** a faixa de progresso
   e a barra, e SHALL **omitir** a faixa `Complete o frete grátis` (`CrossSell`).
9. WHEN o frete grátis está desligado THEN o resumo do pedido do checkout SHALL **omitir** a faixa
   `Frete grátis liberado` / `Faltam … para o frete grátis`, na variante `sidebar` **e** na `bar`, e o
   resumo colapsado do mobile SHALL **omitir** o sufixo ` · frete grátis`.
10. WHEN o frete grátis está desligado THEN o painel de marca do `AuthOverlay` SHALL **omitir** o item
    de frete grátis; WHEN está ligado THEN o item SHALL declarar o valor vindo das settings — em
    nenhum caso um número literal do JSX.
11. WHEN o frete grátis está **ligado** THEN todas as superfícies acima SHALL voltar a exibir o que
    exibem hoje, com o valor lido das settings.

**Independent Test**: com o interruptor desligado, varrer home, página de produto, `/politicas`,
gaveta do carrinho, checkout e overlay de login à procura da expressão "frete grátis" — não deve
aparecer nenhuma vez fora do fluxo de cupom.

---

### P1: Desligado, o frete é cobrado ⭐ MVP

**User Story**: Como dona da loja, quero que desligar o frete grátis realmente pare de zerar o frete,
para que a decisão que eu tomo no painel seja a que a loja pratica.

**Why P1**: É a metade da feature que custa dinheiro. Esconder o texto e continuar zerando o frete é
o defeito de hoje, invertido.

**Acceptance Criteria**:

12. WHEN o frete grátis está desligado THEN a opção mais barata da cotação de entrega
    (`DeliveryBlock`, SHP-06) SHALL manter o preço cotado, qualquer que seja o subtotal.
13. WHEN o frete grátis está desligado THEN `cartStore.shippingCost()` SHALL devolver
    `default_shipping_cost`, qualquer que seja o subtotal.
14. WHEN o frete grátis está desligado E a cliente tem um cupom `free_shipping` aplicado THEN o frete
    SHALL continuar zerado — o cupom não é governado pelo interruptor.
15. WHEN o frete grátis está **ligado** e o subtotal atinge a faixa THEN o comportamento de hoje SHALL
    ser preservado: a opção mais barata vai a zero exibindo `Grátis`, e as demais mantêm o preço.

**Independent Test**: com o interruptor desligado e um carrinho acima de R$ 150, chegar ao checkout e
conferir que a linha `Frete` do resumo mostra o valor cotado, não `Grátis`.

---

### P1: A regra tem um dono só ⭐ MVP

**User Story**: Como quem mantém este código, quero que "a loja pratica frete grátis, e falta quanto?"
seja respondida por uma função só, para que a próxima superfície não vire a oitava resposta
divergente.

**Why P1**: Sem isto, a feature conserta sete arquivos hoje e reabre o defeito no oitavo.

**Acceptance Criteria**:

16. WHEN qualquer superfície precisa saber se há frete grátis, se a faixa foi atingida ou quanto falta
    THEN ela SHALL obter a resposta de uma única função pura exportada por `@estrelinha/core/shipping`.
17. WHEN a função é chamada com o frete grátis desligado THEN `reached` SHALL ser `false` e `remaining`
    SHALL ser `0`, **qualquer que seja o subtotal** — inclusive um subtotal acima da faixa guardada.
18. WHEN a função é chamada com o frete grátis ligado e faixa menor ou igual a zero THEN ela SHALL
    tratar a configuração como **inativa**, sem produzir `Infinity` nem `NaN` em `percent`.
19. WHEN um arquivo de `apps/**` que não seja teste lê `free_shipping_threshold` fora do módulo de
    settings THEN a suíte SHALL reprovar, com âncora dupla (arquivos varridos **e** ocorrências
    legítimas encontradas).
20. WHEN o módulo novo de `core/shipping` é lido THEN nenhum arquivo dele SHALL importar React,
    Supabase ou Deno, e todo import relativo SHALL trazer a extensão `.ts` explícita.

**Independent Test**: `grep -rn "free_shipping_threshold" apps/ --include=*.tsx` não deve casar nada
fora de teste; o guarda deve reprovar quando uma leitura direta é reintroduzida à mão.

---

### P2: A configuração nova diz o mesmo nos dois lados

**User Story**: Como quem mantém este código, quero que o default do interruptor no TypeScript e no
SQL não possam divergir, porque divergir não quebra nada — a loja só mostra um estado antes do fetch
e outro depois.

**Acceptance Criteria**:

21. WHEN a migration nova é aplicada THEN ela SHALL acrescentar `free_shipping_enabled` à chave
    `shipping` **sem sobrescrever** os campos existentes e **sem reescrever** migration já aplicada
    (`AD-017`).
22. WHEN a migration roda uma segunda vez THEN ela SHALL ser no-op — o campo só é escrito quando ainda
    não existe, no molde de `20260727120200_store_settings_checkout.sql`.
23. WHEN `storeSettingsDefaults.test.ts` roda THEN ele SHALL ler a migration nova **do disco** e
    comparar o valor de `free_shipping_enabled` com `DEFAULT_SHIPPING`, com âncora que reprove se o
    caminho do arquivo estiver errado.

**Independent Test**: trocar o `false` do `.sql` para `true` e ver a suíte reprovar.

---

### P2: O interruptor ligado nunca fica sem faixa

**User Story**: Como dona da loja, quero que o painel me impeça de salvar "frete grátis ligado, a
partir de R$ 0", porque a loja se comportaria como desligada enquanto o painel me diz que está ligada.

**Acceptance Criteria**:

24. WHEN a dona tenta salvar a aba Frete com o interruptor ligado e a faixa menor ou igual a zero
    THEN o sistema SHALL recusar a gravação e exibir o motivo junto do campo.
25. WHEN a gravação é recusada por este motivo THEN nenhuma escrita SHALL chegar a `store_settings`.

**Independent Test**: ligar o interruptor, zerar a faixa, salvar — a tela recusa e o banco não muda.

---

## Edge Cases

| Caso | Comportamento esperado |
| --- | --- |
| Settings ainda carregando (`useStoreSettings` sem `data`) | `DEFAULT_SHIPPING` vale, ou seja **desligado** — a loja nunca pisca uma promessa de frete grátis que pode não se confirmar. |
| Linha `shipping` antiga, sem o campo | O merge de `fetchAllSettings` preenche pelo default (`false`). Mesmo caminho já provado para `handling_days`. |
| `free_shipping_enabled: true`, `threshold: 0` | Regra pura devolve inativo; painel recusa gravar esse par (`FRG-12`). |
| `threshold` negativo | Idem — inativo, sem `percent` negativo. |
| Subtotal `0` com faixa ligada | `remaining = threshold`, `percent = 0`, `reached = false`. Comportamento de hoje. |
| Cupom `free_shipping` com interruptor desligado | Frete zerado pelo cupom; nenhuma copy de faixa aparece. As duas coisas convivem sem se contradizer. |
| `cartStore` (zustand, fora do React) | Continua lendo o valor hidratado por `RuntimeSettingsLoader`, que passa a hidratar **também** o interruptor. |

---

## Requirement Traceability

| ID | Requisito | AC |
| --- | --- | --- |
| `FRG-01` | Campo `free_shipping_enabled` em `ShippingSettings` + default | 4, 21 |
| `FRG-02` | Interruptor na aba Frete do painel | 1, 2, 3 |
| `FRG-03` | Regra pura única em `@estrelinha/core/shipping` | 16, 17, 18, 20 |
| `FRG-04` | Superfícies de vitrine respeitam o interruptor | 5, 6, 7, 10, 11 |
| `FRG-05` | Gaveta do carrinho respeita o interruptor | 8 |
| `FRG-06` | Resumo do checkout respeita o interruptor | 9 |
| `FRG-07` | Frete cobrado quando desligado | 12, 13, 15 |
| `FRG-08` | Cupom `free_shipping` intocado | 14 |
| `FRG-09` | Guarda contra leitura direta do threshold | 19 |
| `FRG-10` | Migration aditiva e idempotente | 21, 22 |
| `FRG-11` | Guarda de default SQL ↔ TypeScript | 23 |
| `FRG-12` | Painel recusa ligado-sem-faixa | 24, 25 |
| `FRG-13` | Nenhum número de frete grátis literal em JSX | 10 |

---

## Success Criteria

- Com o interruptor desligado, a expressão "frete grátis" não aparece em nenhuma superfície da loja
  fora do fluxo de cupom — conferido em navegador real, **390px primeiro**, depois 1440.
- Com o interruptor desligado e carrinho acima da faixa guardada, o checkout cobra o frete cotado.
- Com o interruptor ligado, tudo o que a loja faz hoje continua igual.
- Nenhuma linha de `packages/core/src/payment/**` nem de `supabase/functions/**` alterada.
- Sem regressão contra a baseline do `CLAUDE.md`: lint **27/5**, tipos **0·0·0**, testes **6019 em
  328 arquivos** (a contagem sobe; nenhuma queda sem contrapartida declarada).
