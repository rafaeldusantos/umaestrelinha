# Decisões do orquestrador — 92

Perguntas da sessão e quem respondeu: o árbitro (agente validador), a página de review técnico ou o humano.

## G1 — gate da página (17 itens)

- Etapa: Planejamento · humano respondeu na página · página web da wi-workflow

**Página:** http://127.0.0.1:8477/

**Respostas (answers.json):**

```json
{
  "wi": "92",
  "respostas": [
    {
      "id": "Q-01",
      "escolha": "Até a quantidade da joia principal: com 2 joias, até 2 correntes com desconto, o resto a preço cheio (o cálculo parte a linha)",
      "texto": ""
    },
    {
      "id": "Q-03",
      "escolha": "Acumula com o cupom, como o order bump: vale nos dois caminhos",
      "texto": ""
    },
    {
      "id": "Q-02",
      "escolha": "Sim: preço com desconto em cada peça e o total do conjunto já descontado, com o aviso de que vale com a joia no mesmo pedido (revisa a RNF-04)",
      "texto": ""
    },
    {
      "id": "Q-06",
      "escolha": "'De/por' na peça e a linha 'Desconto do Compre Junto' no resumo",
      "texto": ""
    },
    {
      "id": "Q-05",
      "escolha": "De 1% a 50%, inteiro",
      "texto": ""
    },
    {
      "id": "Q-10",
      "escolha": "A sacola relê a configuração e mostra o valor novo; se o desconto caiu depois de ela ver o total, o pagamento recusa e pede para recarregar",
      "texto": ""
    },
    {
      "id": "Q-09",
      "escolha": "Só uma: a de menor preço cheio",
      "texto": ""
    },
    {
      "id": "Q-07",
      "escolha": "Não: a montagem já tem o desconto combinado, e a proposta segue igual",
      "texto": ""
    },
    {
      "id": "Q-08",
      "escolha": "Segue contando pela marca; o valor passa a ser o pago, líquido do desconto, e ganha uma coluna 'desconto concedido'",
      "texto": ""
    },
    {
      "id": "C-01",
      "escolha": "Corrigir neste WI: a linha do pedido guarda o preço cobrado (com bump, promoção ou desconto casado), e as telas mostram a linha do desconto",
      "texto": ""
    },
    {
      "id": "Q-11",
      "escolha": "Só (c) e (d) neste WI; (a), (b) e (e) num WI seguinte",
      "texto": ""
    },
    {
      "id": "P-01",
      "escolha": "Ratificar: O percentual mora na própria linha do adicional (product_buy_together), numa coluna nova, nula = sem desconto.",
      "texto": ""
    },
    {
      "id": "P-02",
      "escolha": "Ratificar: Num adicional do tipo lista, um percentual só vale para qualquer peça da lista que a cliente escolher.",
      "texto": ""
    },
    {
      "id": "P-03",
      "escolha": "Ratificar: Variação da peça que a dona não liberou, e adicional escondido pela variação escolhida da joia (ex.: correntes com 'Chaveiro'), não recebem desconto.",
      "texto": ""
    },
    {
      "id": "P-04",
      "escolha": "Ratificar: Com duas joias principais na sacola que dão percentuais diferentes à mesma peça, vale o maior percentual (o menor preço, coerente com AD-015).",
      "texto": ""
    },
    {
      "id": "P-05",
      "escolha": "Ratificar: O desconto casado é gravado no pedido numa coluna própria (teto para a guarda do pagamento e registro), no molde de orders.promotion_discount.",
      "texto": ""
    },
    {
      "id": "P-06",
      "escolha": "Ratificar: A linha do resumo na sacola, no checkout e no pedido diz 'Desconto do Compre Junto − R$ X'.",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-03T20:17:44.564Z"
}
```

## G2 — gate da página (2 itens)

- Etapa: Planejamento · humano respondeu na página · página web da wi-workflow

**Página:** http://127.0.0.1:8477/

**Respostas (answers.json):**

```json
{
  "wi": "92",
  "respostas": [
    {
      "id": "pedido-recusado-pelo-teto-sem-saida",
      "escolha": "CA-04.3 (complemento) Recusado o pagamento, no checkout a cliente vê o total novo e confirma a compra outra vez; pelo link do pedido ou por Minha conta, a página diz que o valor deste pedido mudou e mostra o contato da loja.",
      "texto": ""
    },
    {
      "id": "reciproco-menor-preco-contradiz-o-bloco",
      "escolha": "CA-03.10 No par recíproco vale o desconto da peça levada pelo bloco (a que tem a marca 'acompanha')",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-03T20:32:48.512Z"
}
```

## G3 — gate da página

- Etapa: Planejamento · humano respondeu na página · página web da wi-workflow

**Página:** /private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/4f135cc2-bb19-4b97-9560-91a5fd1223a7/scratchpad/wi/92

**Respostas (answers.json):**

```json
{
  "wi": "92",
  "respostas": [
    {
      "id": "H-01",
      "escolha": "Desenhar antes no Claude Design as telas da loja (checkout, confirmação, e-mail, pedido recusado) e seguir o padrão no painel e no app",
      "texto": ""
    },
    {
      "id": "H-02",
      "escolha": "Todo desconto das peças levadas junto (preço cheio − pago), qualquer que seja a origem",
      "texto": ""
    },
    {
      "id": "H-03",
      "escolha": "'Desconto do Compre Junto' em todo lugar; tirar a frase do cabeçalho; tirar a frase da sacola",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-03T20:46:27.769Z"
}
```

## G4 — aprovação da fila de 8 tarefas e do plano de ondas

- Etapa: Planejamento · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>   - `packages/supabase/src/types/buyTogether.ts`;
>   - the admin `features/product-form` (`addons.ts`, `persistAddons.ts`, `BuyTogetherTab.tsx`, `useProductForm.ts`);
>   - the new schema test in store `shared/lib/__tests__`.
> - **W2 {02, 03}**, separate files:
>   - 02 owns `core/buy-together/total.ts`, store `entities/product` (`useBuyTogetherData`, `useBuyTogether`, `ui/buy-together/*`) and `widgets/product-buy-bar`;
>   - 03 owns `core/payment/pricing.ts`, `core/pricing/*`, the new rule file in `core/buy-together`, the `core/buy-together/index.ts` barrel, `availability.ts` (precedence), `purity.test.ts`, the new hook in store `entities/cart`, `widgets/cart-drawer`, `features/checkout/model/useCheckoutTotals.ts`, `features/checkout/ui/OrderSummary.tsx` and `.specs/STATE.md`.
>   - 02 doesn't add exports to the barrel.
> - **W3 {04}**, owns:
>   - its migration (`orders`, `order_items`);
>   - `buildOrderPayload.ts`;
>   - `supabase/functions/checkout` and `supabase/functions/mercado-pago`;
>   - store `features/order-payment` and `features/checkout` (`useCreatePayment`, the 422 screen);
>   - the `chavesDoItemDoPedido` test and its sibling.
> - **W4 {05, 08}**, separate files:
>   - 05 owns `core/orders` (new file), store `entities/order` and `supabase/functions/send-notification`;
>   - 08 owns its migration (RPC), admin `features/buy-together-adoption`, `compreJuntoAdesaoSchema.test.ts` and the `05-adesao` probe.
> - **W5 {06, 07}**, separate files:
>   - 06 owns admin `pages/admin/AdminOrderPage.tsx` and `tomDoCompreJunto.test.ts`;
>   - 07 owns its migration (`order_list`), `apps/mobile-adm/src/entities/order` and `widgets/order-detail` (`BlocoValores`, `BlocoItens`).
> - **Migration timestamps for parallel tasks:** 08 and 07 don't run together, but each still uses the latest existing migration's prefix + 1 hour. That way no two migrations in the WI share a prefix.
> - **No relaxed dependency.**
> 
> Once approved, this also authorizes execution. I'll then write `tasks/` and `waves.md`, run the queue audit, apply what it rejects, and move to `fase: implement`.
> 
> [[WI:PLAN:ASK:aprovação da fila de 8 tarefas e do plano de ondas]]

**Resposta:**

Decidiu: a fila ainda não está aprovada. A cobertura está completa e o corte por tela está certo, mas falta corrigir quatro pontos antes da aprovação.

**O que está certo**
- Cada caso de uso e critério do `prd.md` tem uma tarefa:
  - UC-01 → 01; UC-02 → 02; UC-03 → 03; UC-04 e CA-05.1 → 04; CA-05.2 e CA-05.4 → 05; CA-05.3 → 06 e 07; UC-06 → 08.
  - As decisões D-01 a D-24 do `spec.md` (linhas 224-247) também caem em tarefas, por exemplo D-09 → 06, D-10, D-11, D-13, D-17 e D-18 → 04, D-12 e D-21 → 03.
- Nada da lista "Fora" do PRD entrou (`prd.md:31-37`).
- Uma tarefa por tela, nunca por camada.
- Nenhum par da mesma onda edita o mesmo arquivo:
  - W2: `availability.ts` é editado em 01 (W1) e em 03 (W2), ondas diferentes.
  - W4 e W5: as migrations ficam em ondas distintas.

**Correções exigidas**

1. **A conta do preço descontado não tem dono — é o "defeito 01" dentro da W2.**
   - A conta "preço × (1 − p/100), arredondado a centavo" tem três leitores: a prévia do painel (01, CA-01.5), o bloco (02, CA-02.1/02.2) e `pricing.ts` (03, CA-03.1).
   - 02 e 03 correm em paralelo e nenhuma tarefa diz onde essa função mora. `bundleTotal` hoje só soma preços (`packages/core/src/buy-together/total.ts:13-19`).
   - A obrigação transversal pede um dono em `packages/core` (`spec.md:166`).
   - Correção: a tarefa 01 cria essa função numa folha de `core/buy-together` que ela já possui (`rules.ts` ou folha nova), alcançável pelo Deno, e exporta pelo barrel na W1. Nos "Done when" de 01, 02 e 03 entra "chama a função de 01, sem conta própria".

2. **O teste de paridade bloco = sacola (CA-02.4) não está atribuído.**
   - Ele precisa do trabalho de 02 (`total.ts`) e de 03 (`pricing.ts`), que correm juntos na W2 (`spec.md:183`, a linha "CA-02.4 (bloco = sacola sem promoção nem cupom)").
   - Correção: atribuir a 04 este teste e a extensão de `displayedEqualsCharged.test.ts` (RNF-01, CA-04.2), e acrescentar a dependência `02→04`.
   - As ondas não mudam: 02 já fecha na W2.

3. **Três arquivos que o `spec.md` manda mudar não têm dono na fila:**
   - `apps/store/src/entities/cart/model/useCartPromotion.ts` (`spec.md:130`) → 03, ao lado do hook novo de `entities/cart`.
   - `apps/backoffice/src/features/buy-together-lists/api/useBuyTogetherLists.ts` (`spec.md:132`, o `base_price` da faixa da prévia) → 01.
   - `packages/supabase/src/types/index.ts` (`spec.md:135`, o tipo da linha do pedido com `full_unit_price` e as colunas novas) → 04.

4. **O plano de ondas precisa listar as dependências novas:** `02→04`, e `01→02` e `01→03` passam a incluir a função do item 1.

**Como seguir**
- Aplique as correções em `tasks/` e `waves.md` e traga a fila de volta.
- Sem dependência afrouxada e com os itens 1 a 4 resolvidos, eu aprovo e mando "pode executar", por decisão delegada pela política do humano ("Aprovação da fila e 'pode executar'", depois da conferência de cobertura da costura). O precedente do WI-01 vai no mesmo sentido.
- O `wi-task-audit` continua obrigatório depois de escrever a `tasks/` (8 tarefas).

Uma observação, sem exigência: o guarda de tom (D-09) só é ampliado na tarefa 06 (W5). Até lá, as frases novas de 02 a 05 ficam sem guarda. Pode ficar assim, mas a âncora de 06 precisa nomear um arquivo de cada ponta, como diz a própria D-09.

## G5 — aprovação da fila corrigida de 8 tarefas e do plano de ondas

- Etapa: Planejamento · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>   - the new migration (`discount_percent`);
>   - `core/buy-together/rules.ts`, **the new discount-helper file**, the `core/buy-together/index.ts` barrel (that export only), `availability.ts` (type) and `purity.test.ts` (count and list for the new file);
>   - `packages/supabase/src/types/buyTogether.ts`;
>   - admin `features/product-form` (`addons.ts`, `persistAddons.ts`, `BuyTogetherTab.tsx`, `useProductForm.ts`) and **`features/buy-together-lists/api/useBuyTogetherLists.ts`**;
>   - the new schema test in store `shared/lib/__tests__`.
> - **W2 {02, 03}**, separate files:
>   - 02 owns `core/buy-together/total.ts`, store `entities/product` (`useBuyTogetherData`, `useBuyTogether`, `ui/buy-together/*`) and `widgets/product-buy-bar`;
>   - 03 owns `core/payment/pricing.ts`, `core/pricing/*`, the discount-rule file in `core/buy-together`, the barrel and `purity.test.ts` (both edited in W1, now again in W2 by 03 only), `availability.ts` (precedence), store `entities/cart` (the new hook **and `model/useCartPromotion.ts`**), `widgets/cart-drawer`, `features/checkout/model/useCheckoutTotals.ts`, `features/checkout/ui/OrderSummary.tsx` and `.specs/STATE.md`.
>   - 02 doesn't edit the barrel or `purity.test.ts`.
> - **W3 {04}**, owns:
>   - its migration;
>   - `buildOrderPayload.ts`;
>   - `supabase/functions/checkout` and `supabase/functions/mercado-pago`;
>   - store `features/order-payment` and `features/checkout/api/useCreatePayment.ts`;
>   - **`packages/supabase/src/types/index.ts`**;
>   - the `chavesDoItemDoPedido` test and its sibling;
>   - **`displayedEqualsCharged.test.ts`** and **the new block = bag parity test** in `core`.
> - **W4 {05, 08}:** unchanged.
> - **W5 {06, 07}:** unchanged.
> - **Migration timestamps:** each migration uses the latest existing prefix + 1 hour.
> - **No relaxed dependency.**
> 
> Once approved, I'll write `tasks/` and `waves.md` and run `wi-task-audit`, then move to `fase: implement`.
> 
> [[WI:PLAN:ASK:aprovação da fila corrigida de 8 tarefas e do plano de ondas]]

**Resposta:**

Decidiu: a fila corrigida de 8 tarefas e o plano de ondas `01 | 02,03 | 04 | 05,08 | 06,07` estão aprovados. Pode executar. É decisão delegada pela política do humano ("Aprovação da fila e 'pode executar'", depois da conferência de cobertura da costura), e vai no mesmo sentido do precedente do WI-01 ("fila aprovada, siga").

**Conferido nos arquivos**

As quatro correções da G4 estão aplicadas:

1. **A conta do preço com desconto tem um dono só.** A tarefa 01 cria a função numa folha nova de `core/buy-together`, com imports `.ts` explícitos, e a exporta pelo barrel na W1. As tarefas 02 (`bundleTotal`) e 03 (`pricing.ts`) chamam essa função e não fazem conta própria. Isso atende a obrigação transversal do "defeito 01" (`spec.md`, seção "Obrigações transversais").
2. **A paridade bloco = sacola (CA-02.4) e a extensão de `displayedEqualsCharged.test.ts` ficam com a tarefa 04**, e a dependência `02→04` entrou (`spec.md`, seção "Testes", Unidade).
3. **Os três arquivos sem dono agora têm dono:**
   - `useCartPromotion.ts` → 03 (`spec.md:130`);
   - `useBuyTogetherLists.ts` → 01 (`spec.md:132`);
   - `packages/supabase/src/types/index.ts` → 04 (`spec.md:135`).
4. **As dependências estão listadas no plano de ondas:** `01→02` e `01→03` incluem a função, e `02→04` é nova.

**Arquivos por onda**

Nenhum par da mesma onda edita o mesmo arquivo:
- O barrel e o `purity.test.ts` são editados em 01 (W1) e depois só por 03 (W2). 02 não os toca.
- `availability.ts` é editado em 01 (W1) e em 03 (W2), ondas diferentes.
- O arquivo da regra do desconto (de 03) é separado da folha da função de preço (de 01).
- `render/layout.ts` é editado por 05 (W4). A tarefa 06 (W5) só o cita na âncora do guarda de tom, sem editar.

A cobertura dos UCs e critérios continua a da G4, nada da lista "Fora" do PRD entrou e o corte segue por tela.

**Como seguir**
- Escreva `tasks/` e `waves.md` fiéis a esta fila, com "chama a função de 01, sem conta própria" no "Done when" de 01, 02 e 03.
- Rode o `wi-task-audit`, que é obrigatório com 8 tarefas, e aplique o que ele recusar.
- Se o audit não mudar a cobertura nem as dependências, passe a `fase: implement` e comece pela W1.
- Se ele mudar uma dependência ou a divisão de arquivos entre as ondas, traga a fila de volta antes de executar.

## G6 — gate da página (2 itens)

- Etapa: Plano de QA · humano respondeu na página · página web da wi-workflow

**Página:** http://127.0.0.1:8477/

**Respostas (answers.json):**

```json
{
  "wi": "92",
  "respostas": [
    {
      "id": "Q-01",
      "escolha": "C. A ordem do painel vale; a loja e o app passam a segui-la, e a diferença vira bug nas outras duas pontas",
      "texto": ""
    },
    {
      "id": "Q-02",
      "escolha": "B. Exigir a faixa neste WI; a diferença vira bug",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-04T00:56:51.606Z"
}
```

## G8 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> 
> **Uma decisão que vale tomar agora:** o planner aplicou a ordem do painel só aos resumos que têm a linha do Frete. A gaveta da sacola não tem essa linha e continua seguindo o protótipo. Se a Q-01 também vale para a gaveta, os casos dela mudam antes da execução.
> 
> **Premissas 🟡 que limitam o que o QA alcança no local:**
> - **Valor cobrado:** é o que o `create-payment` local grava antes de chamar o Mercado Pago. O QR do PIX não é condição de nenhum caso.
> - **Cartão:** não fecha no local, porque o Brick do Mercado Pago não carrega sem SDK e sem chave. O CA-04.2 fica coberto só pela metade na tela.
> - **Protótipos:** não foram lidos no planejamento, porque o MCP `claude-design` não estava na sessão do planner. O CH-09 (design-check) lê os protótipos na execução; sem o MCP, fica `not-run`.
> - **Massa:** a thread grava no banco local os pedidos pagos que a Adesão precisa (M-07) e o contato em `store_settings` que habilita os botões da tela "o valor mudou" (M-08).
> - **Mudança de percentual no meio da compra (CH-04):** quem troca o percentual é a thread, no painel ou por fixture, para a persona não trocar de conta.
> - **Pedido montado pelo painel:** o TC-REG-002 depende de a function `order-proposals` subir no local; se não subir, o caso fica `blocked`.
> - **Teto de charters:** são 7 exploratórios, um acima do teto de 6, porque o app do ateliê tem persona própria e ganhou um charter só dele (CH-07).
> 
> **Pontos 🟢, só registrados, sem achado:**
> - A frase da peça sem "acompanha" não é cobrada ao pé da letra.
> - O número do relatório de promoções muda para os pedidos novos (D-22).
> - O rótulo "Desconto da oferta" não está em nenhum protótipo.
> - A ajuda do protótipo do painel diz que o desconto concorre com o cupom, o que contradiz o CA-03.6; vale o PRD.
> 
> O planner disse que o CH-01 e o J-05 já tinham parte das respostas aplicada por outra sessão, e que regravou os dois por inteiro.
> 
> Os arquivos estão em `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/qa/test-plans/` e `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/qa/test-cases/`. O test-plan continua com `**Gate 1:** pendente`. Nada foi commitado.
> 
> Aprova o plano para seguir para a execução?
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decidiu: o plano de QA do WI 92 está aprovado no Gate 1. É decisão delegada pela política do humano: "QA local: aprovar o plano de QA (Gate 1) quando bate com o relatório dos agentes e com o que está em `qa/`".

O que conferi em `.specs/work-items/92-desconto-da-compra-casada/qa/`:
- **Casos:** o JSON de `test-plans/desconto-compre-junto-test-plan.md` lista 60 TC, e há 60 arquivos em `test-cases/`. São P0 24, P1 31 e P2 5. Na automação, 5 são integration, 14 são manuais e os 41 restantes são e2e. Bate com o resumo da sessão.
- **Charters:** são 9 em `test-plans/charters/` (CH-01 a CH-09), com o CFR no CH-08 e o design-check no CH-09.
- **Cobertura:** a matriz cobre 37 de 38 critérios. Só o RNF-07 fica sem caso, e o motivo está escrito (linhas 294–299: é condição do ambiente, provada por `compreJuntoDescontoSchema.test.ts` e `compreJuntoAdesaoSchema.test.ts`).
- **Perguntas 🔴:** nenhuma está aberta. A Q-01 está respondida como C e a Q-02 como B (linhas 319–327), e as duas estão registradas no `spec.md` como D-38 e D-39 (linhas 260–261). As 🟡 são limites do ambiente local, não decisões de produto.

**A "decisão que vale tomar agora" sobre a gaveta já tem resposta no que o humano decidiu.** O D-38 (`spec.md:260`) enumera onde a ordem do painel vale: "a loja (confirmação, Minha conta, e-mail) e o app". A gaveta não está na lista, e a regra é "descontos e PIX antes do Frete", mas a gaveta não tem linha de Frete. O D-38 também diz que "o preço por item (unidade × total da linha) não muda". Por isso a leitura do planner, de que a gaveta segue o rodapé do protótipo (test-plan, linhas 186–188 e 345–347), é a aplicação literal do D-38, não uma escolha nova. Os casos da gaveta (TC-FUNC-019, TC-UI-002) ficam como estão. Se o humano quiser estender a regra à gaveta, isso é uma resposta nova pela página, não uma correção deste plano.

A sessão pode seguir:
1. Grave `**Gate 1:** aprovado (Têmis, decisão delegada pela política do humano)` no test-plan, na linha 88.
2. Registre a decisão em `orquestrador-decisoes.md`.
3. Siga para a execução dos charters.

## G7 — Gate 1 — aprovação do plano de QA

- Etapa: Plano de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>   Automação: e2e 41 (missing 41) · integration 5 · manual 14
>   Respostas aplicadas:
>     - Q-01 → a ordem do painel vale: Subtotal · Compre Junto · progressivo/oferta · Cupom · PIX · Frete · Total, com o "de/por" por unidade. A loja (checkout, confirmação, Minha conta, e-mail) e o app do ateliê são conferidos contra ela, e a diferença vira bug. Títulos novos do TC-FUNC-030 e do TC-FUNC-031.
>     - Q-02 → a faixa que rola dentro das peças de uma lista é exigida. A grade vira bug no TC-FUNC-006 e no TC-UI-004, e a massa M-01 passa a ter 3 ou mais correntes na lista.
>   Perguntas 🟡:
>     - A ordem do painel valeria só para os resumos que têm a linha do Frete, e a gaveta da sacola seguiria o rodapé do protótipo. Recomendo decidir agora: se a Q-01 também alcança a gaveta, os casos dela mudam.
>     - O valor cobrado é o que o `create-payment` local grava (ele recalcula e dá o 422 antes do Mercado Pago). O QR do PIX não é condição de caso nenhum.
>     - O cartão não fecha no local, porque o Brick não carrega sem SDK e sem chave. A tela confere só o total mostrado, e o CA-04.2 fica coberto pela metade na tela.
>     - Massa gravada pela thread no banco local: os pedidos pagos para a Adesão (M-07) e o contato em `store_settings` para os botões da tela "o valor mudou" (M-08).
>     - O planner não leu os protótipos, porque o MCP `claude-design` não estava na sessão dele. O CH-09 (design-check) lê os protótipos na execução; sem o MCP, fica `not-run`.
>     - No CH-04, a troca do percentual no meio da compra é feita pela thread, no painel ou por fixture.
>     - O TC-REG-002 depende de a function `order-proposals` subir no local. Se não subir, o caso fica `blocked`.
>     - 7 exploratórios, um acima do teto de 6: o app do ateliê tem persona própria e ganhou um charter só dele (CH-07).
>   Perguntas 🟢: a frase da peça sem "acompanha" não é cobrada literalmente; o número do relatório de promoções muda para pedidos novos (D-22); o rótulo "Desconto da oferta" não está em protótipo nenhum; a ajuda do protótipo do painel diz "concorre com o cupom", contra o CA-03.6 (vale o PRD).
>   Arquivos:
>     /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/qa/test-plans/
>     /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/qa/test-cases/
> 
> O planner disse que o CH-01 e o J-05 já tinham parte das respostas aplicada por outra sessão, e que regravou os dois inteiros.
> 
> Nada foi commitado.
> 
> Aprova o plano para seguir para a execução?
> 
> [[WI:QA_REPORT:ASK:Gate 1 — aprovação do plano de QA]]

**Resposta:**

Decidi pela política do humano ("QA local: aprovar o plano de QA (Gate 1)…"). O plano está aprovado, mas só depois de uma correção. Fora ela, o resumo da sessão confere com os arquivos.

**O que conferi**
- São 60 arquivos em `qa/test-cases/`, os mesmos 60 TC do plano.
- 37 dos 38 critérios têm caso. O que fica sem, RNF-07, está dito com o motivo em `desconto-compre-junto-test-plan.md:294-297`.
- Q-01 e Q-02 estão aplicadas, com as respostas da G6 registradas (`orquestrador-decisoes.md`, seção G6). Nenhuma 🔴 está aberta.
- O sétimo exploratório (CH-07, o app do ateliê) tem justificativa, porque a persona é própria.
- As 🟡 do cobrado (precedente D-02 do WI-01), do cartão, da massa M-07/M-08, do CH-04 e do TC-REG-002 que pode ficar `blocked` são limites declarados do ambiente local. Aceito todas.
- O CH-09 fica `not-run` sem o MCP, e isso é aceitável: a faixa da Q-02 continua cobrada por TC-FUNC-006 e TC-UI-004, que não dependem do protótipo.

**A correção (o plano foi além da resposta do humano)**
A escolha C da página diz só: "A ordem do painel vale; a loja e o app passam a segui-la". O plano acrescentou à régua "o preço por unidade com 'de/por' nas linhas dos itens". Isso contraria a decisão registrada que veio dessa mesma resposta, a D-38 (`spec.md:260`): "O preço por item (unidade × total da linha) não muda". Com o texto atual, a QA abriria bug contra a loja e o app por mostrarem o total da linha, e a D-38 diz que isso continua como está.

Tire o "preço por unidade com 'de/por'" da régua da Q-01 e deixe só a ordem: Subtotal · Compre Junto · progressivo/oferta · Cupom · PIX · Frete · Total. Os pontos a mudar:
- `desconto-compre-junto-test-plan.md:14, 186, 320, 346-347`
- TC-FUNC-026:13/33/41, TC-FUNC-030:32/40, TC-FUNC-031:32, TC-INT-004:32/38, TC-JOURNEY-001:41/57
- os outros casos e charters que a linha 320 lista: J-01:13-14, J-03:11, J-05:10/23, J-06:9, CH-02:11, CH-03:11, CH-07:11

Nas linhas dos itens, cada ponta segue a própria Design do `spec.md`. O "de/por" da linha continua cobrado por CA-03.8 e CA-05.2, só não como "por unidade" vindo do painel.

**A 🟡 da gaveta, decidida**
A leitura do plano fica: a gaveta da sacola segue o rodapé do protótipo, e a linha dela mostra o valor da linha (`desconto-compre-junto-test-plan.md:187-188`, `CH-02:48`). É a leitura literal da resposta, porque a Q-01 trata da ordem em relação ao Frete e a gaveta não tem Frete. Também é coerente com a D-38.

**Como seguir**
Se a correção for só essa, mecânica e sem mudar casos nem prioridades, o plano está aprovado: pode seguir para a execução sem voltar a mim. Registre em `orquestrador-decisoes.md` como "Gate 1 aprovado, decisão delegada pela política do humano, com o ajuste da régua da Q-01 à D-38".

## G7/G8 — registro do Gate 1 da QA (sessão do plano de QA, 2026-11-04)

Gate 1 aprovado, decisão delegada pela política do humano, com o ajuste da régua da Q-01 à D-38: o planner (modo `revisar`) tirou da régua da Q-01 o "preço por unidade com de/por" e deixou só a ordem (Subtotal · Compre Junto · progressivo/oferta · Cupom · PIX · Frete · Total); as linhas dos itens seguem a Design de cada ponta, e o total da linha na loja e no app não é bug. A 🟡 da gaveta ficou decidida: segue o rodapé do protótipo e mostra o valor da linha. Sem mudança de casos, IDs, prioridades nem contagens (60 TC). Registrado: `qa/test-plans/desconto-compre-junto-test-plan.md:88` e `item.md` › Gates › `QA · Gate 1 — plano`.

## G9 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis escalou ao humano

**Pergunta (fim da resposta de Maestro, a sessão):**

>     BUG-006 · high · [Painel · aba Compre junto] A faixa da prévia da lista inclui o preço de uma peça que a loja não oferece na lista
>     BUG-007 · high · [App do ateliê] O pedido montado com "Desconto combinado" aparece sem essa linha, e as linhas não somam o Total
>     BUG-008 · high · [Sacola, checkout e pedido] O preço com desconto é lido como dois números soltos pelo leitor de tela
>     BUG-009 · high · [Checkout · o valor mudou] Para a convidada, "Confirmar com o novo total" apaga o aviso e pede um código de e-mail sem dizer por quê
>     BUG-010 · medium · [App do ateliê] O Frete aparece antes dos descontos, fora da ordem do painel (Q-01)
>     BUG-011 · low · [Loja · resumo do pedido] O checkout e a página do pedido põem o Frete antes dos descontos (Q-01)
>     BUG-012 · low · [E-mail · Pedido recebido] O e-mail põe o Frete antes dos descontos (Q-01)
>     BUG-013 · low · [Página do produto] As peças da lista aparecem em grade, não na faixa que rola (Q-02)
>   Transições: resolved 0 · still-open 0 · cannot-reproduce 0 · reabertos 0 (primeira rodada)
>   Evidências: 41 screenshots citadas, em …/qa/screenshots/
>   Perguntas ao produto (≤3): 1 — vai pela página, depois deste gate. P-1: na linha mista, a unidade a preço cheio de uma peça que veio pelo bloco conta como "levada junto" na Adesão? Hoje a Adesão conta essa unidade sem a marca "Acompanha".
>   Sugestões de backlog: 22. As principais estão no qa-result.md: a oferta do checkout em "Seu pedido", foco e uma ação só no aviso de valor mudado, o caminho de volta na tela "o valor deste pedido mudou", nunca mostrar a mensagem crua do Mercado Pago e o PIX na gaveta. Nenhuma volta a este Work Item.
> 
> Notas para o gate:
> - O BUG-001 e o BUG-002 podem ser anteriores ao WI. O triager os registrou como bug por serem critical e high no caminho do dinheiro.
> - A ordem do Frete ficou registrada como um bug por superfície (BUG-010, BUG-011, BUG-012).
> - Lotes de correção sugeridos: L1 = BUG-001 e BUG-002; L2 = BUG-003 e BUG-008; L3 = BUG-007 e BUG-010; os demais saem sozinhos.
> - O `executed_at` e o `duration_min` do qa-result.md ficaram aproximados, porque o briefing do triager não trazia a hora de início e fim.
> - Massa que os charters criaram e que ficou no banco local: os pedidos pendentes #0364, #0366, #0367 e #0368; a proposta P-0014; a conta sonia.ch08@exemplo.com.
> 
> Arquivos: `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/qa/qa-result.md` (Gate 3: pendente), `…/qa/issues/BUG-001.md`..`BUG-013.md`, `…/qa/sessions/CH-01..CH-09`. Nada foi commitado.
> 
> Confirma o veredito, os bugs novos e as transições?
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Por que Têmis escalou:**

o árbitro não terminou (error)

## G10 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis escalou ao humano

**Pergunta (fim da resposta de Maestro, a sessão):**

> O relatório do Gate 3 já foi entregue ao orquestrador. Esta notificação é só o aviso de que o triager terminou e não há nada novo a fazer. O próximo passo é a confirmação do Gate 3.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Por que Têmis escalou:**

o árbitro não terminou (error)

## G10 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · humano decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> O relatório do Gate 3 já foi entregue ao orquestrador. Esta notificação é só o aviso de que o triager terminou e não há nada novo a fazer. O próximo passo é a confirmação do Gate 3.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Parecer de Têmis:**

o árbitro não terminou (error)

**O humano respondeu:**

Siga

## G11 — gate da página (2 itens)

- Etapa: Execução de QA · humano respondeu na página · página web da wi-workflow

**Página:** http://127.0.0.1:8477/

**Respostas (answers.json):**

```json
{
  "wi": "92",
  "respostas": [
    {
      "id": "P-01",
      "escolha": "Só a unidade com desconto conta (corrigir a Adesão)",
      "texto": ""
    },
    {
      "id": "P-01-destino",
      "escolha": "WI novo",
      "texto": ""
    }
  ],
  "enviadoEm": "2026-11-04T10:56:55.307Z"
}
```

## G12 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

>   Perguntas ao produto (≤3): 0 (é rodada de confirmação)
>   Sugestões de backlog: 9 (4 novas, 5 reconfirmadas). Não voltam a este Work Item. As novas:
>     - A gaveta e o checkout dizem o mesmo preço quando a oferta vence o casado
>     - O motivo do desconto combinado no app do ateliê
>     - Largura do cartão da faixa da lista pelo protótipo
>     - Código do cupom na linha do e-mail do pedido
> Confirma o veredito, os bugs novos e as transições?
> ```
> 
> **BUG-006 continua aberto:** a correção só cobriu o caso relatado. O piso da prévia no painel agora vem da "QA Corrente Esgotada", que não tem variação à venda e que a loja não mostra: o painel diz R$ 71,91 e a loja, R$ 80,91. Lote L2: a prévia precisa pular as mesmas peças que a loja pula.
> 
> **BUG-014 é bug novo, não reabertura do BUG-005.** O Total cobrado está certo; o que fica errado é a linha do cupom gravada no pedido.
> - Com o adicional a 25 %, o cupom aparece como −47,90 quando deveria ser −46,85, e as linhas somam 265,75 contra um Total de 266,80.
> - A mesma conta errada aparece na loja, no painel, no app do ateliê e no e-mail.
> - Lote L1.
> 
> **Massa deixada no banco local, toda pendente:**
> - pedidos #0373 a #0384;
> - contas de convidada `*@exemplo.invalid` e `*@exemplo.com`.
> 
> Os percentuais do QA Pingente Estrela foram devolvidos (10 · 15 · vazio).
> 
> **O que ainda é rascunho:** `qa/qa-result.md` (com `**Gate 3:** pendente`) e `qa/issues/BUG-014.md`. Nenhum status de bug mudou e nada foi commitado. Depois da confirmação eu gravo as transições e o Histórico dos 13 bugs, marco o Gate 3 como confirmado no qa-result.md e acrescento a linha `QA · Gate 3 — veredito` no item.md.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Gate 3 da rodada 2 confirmado. Decisão delegada pela política do humano ("QA local: [...] confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`"). Sigo também o precedente do humano neste mesmo WI: na rodada 1, ele respondeu "Siga" no Gate 3.

O que conferi em `.specs/work-items/92-desconto-da-compra-casada/qa/`:
- **Veredito fail:** o mesmo em `qa-result.md` (envelope `"verdict": "fail"`) e no resumo da sessão. Ficam abertos dois `high`, o BUG-014 e o BUG-006.
- **Contagens:** batem. São 57 TC com veredito (os 60 do plano menos TC-INT-001, 002 e 005, que são de integração). Na rodada 1 foram 38 pass, 14 fail, 4 blocked e 1 skip. Nesta rodada foram refeitos 18: 15 passaram, 1 falhou e 2 ficaram blocked. O acumulado dá 53 · 1 · 2 · 1. Cobertura 32/38, com as lacunas justificadas: CA-03.10 em skip, CA-04.1 e RNF-04 de integração, CA-06.1 bloqueado por massa e RNF-07 condição de ambiente.
- **Transições:** `retest.md` traz `resolved` para BUG-001 a 005 e BUG-007 a 013, e `still-open` para o BUG-006 (linha 199). Nenhum `cannot-reproduce`, nenhuma reabertura. Igual ao que a sessão declarou.
- **BUG-014 tem evidência.** Os quatro screenshots citados existem: `RT-r2-retest-BUG-005-N1-loja-0381-390.png`, `...-N1-painel-0381.png`, `RT-r2-retest-BUG-010-0381-390.png` e `RT-r2-retest-BUG-012-email-0381.png`. A aritmética do bug também confere:
  - as linhas exibidas somam 329,80 − 17,47 − 47,90 − 18,58 + 19,90 = 265,75, contra um Total de 266,80;
  - o cupom esperado é 15 % × 312,33 = 46,85.
- **BUG-014 é bug novo, não reabertura do BUG-005:** o BUG-005 era o Total da tela de pagamento, que agora está certo. O BUG-014 é a linha do cupom gravada no pedido.
- **Severidade high:** sustentada. O resumo não fecha no caminho do dinheiro, em quatro superfícies, sem contorno. Viola CA-03.6, CA-05.2 e CA-05.3.

Uma correção antes de gravar: o bloco JSON de `qa/issues/BUG-014.md` não tem `"status": "open"` nem `"tc_ref"`, e os outros issues têm (por exemplo `BUG-006.md:9-10`). Acrescente `"status": "open"`. No `tc_ref`, ponha o TC mais próximo (TC-JOURNEY-004) ou deixe o campo de fora, de forma coerente com a seção Relacionados, que diz que nenhum TC falhou.

Próximo passo:
1. Gravar as transições e o Histórico dos 13 bugs.
2. Marcar `**Gate 3:** confirmado` no `qa-result.md`.
3. Acrescentar a linha `QA · Gate 3 — veredito` no `item.md`, registrando a decisão em `orquestrador-decisoes.md`.
4. Seguir para as fix tasks da rodada 2: BUG-014 no lote L1 e BUG-006 no lote L2.

A massa pendente no banco local (#0373 a #0384 e as convidadas `*@exemplo.*`) fica registrada como está. Não é ação destrutiva.

## G13 — a etapa parou sem marcador mais de uma vez

- Etapa: Correções · Têmis (árbitro) decidiu · etapa parada

**Pergunta (fim da resposta de Maestro, a sessão):**

> Functions passou (exit 0). Aguardando backoffice, loja, tipos, lint e build.

**Resposta:**

Decidiu: siga. A sessão parou sem marcador no meio da Validation 3, que roda depois das fix tasks 19 e 20 (`waves-fix.md`, ONDAS: 19,20). O próximo passo já está definido na skill e na costura: terminar a medição que estava em curso. Nada nisso pede decisão do humano.

Próximo passo:
1. Esperar o fim das suítes que faltam e capturar o exit code fora de pipe. Use `--testTimeout=20000`, sem o `--` antes da flag (CLAUDE.md, "Baselines"):
   - backoffice: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`
   - loja: `pnpm --filter @estrelinha/store test --testTimeout=20000`. O gate de uma mudança no painel inclui a suíte da loja.
2. Rodar os tipos com `npx tsc --noEmit -p apps/<app>/tsconfig.app.json`:
   - a referência é a da Validation 2: 0 erros na loja e no mobile-adm;
   - no backoffice são aceitos os 7 erros alheios ao WI, que vêm do `ProposalStateBadge.test.tsx`;
   - no core são aceitos os 11 erros herdados.
3. Rodar o lint com `npx eslint .` em cada app. A baseline é 25/7.
4. Rodar o build: `pnpm build`.
5. Comparar as contagens com as da Validation 2:
   - store 6997/373, backoffice 5117/282, mobile-adm 2375/149, functions 1461/40;
   - functions só pode ter crescido, pela tarefa 19;
   - backoffice só pela tarefa 20.
6. Fechar a Validation 3 com o marcador da skill e registrar a linha no `item.md`. Os bugs BUG-014 e BUG-006 continuam `open` até o reteste da QA (rodada 3). Depois, seguir para o reteste.

Se alguma suíte reprovar com `Test timed out in 5000ms`, meça de novo esse workspace sozinho antes de tratar como defeito.

## G14 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis escalou ao humano

**Pergunta (fim da resposta de Maestro, a sessão):**

> - As variáveis `QA_ADMIN_PAINEL_*` não estão definidas, então usei o admin de desenvolvimento do `seed.sql`, como nas rodadas anteriores.
> - Subi os dev servers e o `supabase functions serve` e os derrubei ao fim. As portas 8082, 8083 e 8084 não respondem mais.
> - Nenhum container novo ficou de pé. O único container de edge parado é o do ProductDock, que já estava assim antes.
> 
> O `qa-result.md` está gravado com `**Gate 3:** pendente`. Nenhum status de bug foi alterado ainda.
> 
> ```
> Resultado de QA — 92 · Desconto da compra casada (rodada 3 de 3, confirmação)
>   Veredito: partial (nenhum bug aberto; TC-UI-005 blocked porque o design-check não rodou: falta /design-login)
>   TC: pass 55 · fail 0 · blocked 1 · skip 1   ·   critérios cobertos 33 de 38
>   Bugs novos: 0
>   Transições: resolved 2 (BUG-006 still-open → resolved; BUG-014 open → resolved) · still-open 0 · cannot-reproduce 0 · reabertos 0
>   Evidências: 17 screenshots em .specs/work-items/92-desconto-da-compra-casada/qa/screenshots/ (CH-05-r3-*, CH-06-r3-*, RT3-retest-*)
>   Perguntas ao produto: 0 (rodada de confirmação)
>   Sugestões de backlog: 1 — "Alterações não salvas" só quando algo mudou na edição do produto (pré-existente)
>   Ainda sem cobertura: CA-01.2 está parcial (TC-INT-001 não executado). CA-03.10, CA-04.1, RNF-04 e RNF-07 não têm TC executado; as integrações estão cobertas na Validation. TC-UI-005 só sai de blocked com um /design-login e uma nova sessão do CH-09.
> Confirma o veredito, os bugs novos e as transições?
> ```
> 
> Arquivos:
> - `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/qa/qa-result.md`
> - `/Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92/.specs/work-items/92-desconto-da-compra-casada/qa/retest.md`
> - os logs das sessões CH-05, CH-06 e CH-09, em `qa/sessions/`.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Por que Têmis escalou:**

Escalo ao humano. A pergunta é sobre um login, e a skill manda esse caso ao humano antes do Gate 3.

**O que conferi bate com o relatório.** Fora o CH-09, eu confirmaria o veredito:
- O `qa/qa-result.md` traz o veredito `partial`, 55 TC passando, 0 falhando, 1 bloqueado (TC-UI-005) e 1 pulado (TC-FUNC-021). Cobre 33 de 38 critérios, os mesmos quatro que faltavam continuam faltando, e o arquivo está com `**Gate 3:** pendente`.
- O `qa/retest.md` resolve os dois bugs:
  - **BUG-006:** a prévia mostra "R$ 80,91 a R$ 125,91", igual à loja, e a peça esgotada saiu do piso.
  - **BUG-014:** as contas fecham em R$ 266,80 no #0386 e em R$ 264,03 no #0387, em todas as telas e no banco.
- As 17 capturas listadas existem em `qa/screenshots/`. Os bugs ainda estão `still-open` e `open`, como deve ser antes do Gate 3. O HEAD `17ef0715` é o commit da fix task 20.

**Por que não decidi sozinha.** O único motivo do `partial` é o CH-09, que não rodou. Ele precisava ler o protótipo pelo MCP do Claude Design, e o MCP recusou com `needs_design_scopes`, pedindo `/design-login` (`qa/sessions/CH-09-design-check.md`, passo 01). O `references/setup/gates.md:72` diz que um charter bloqueado por algo que o humano tem (credencial) se pergunta antes da triagem, oferecendo rodar de novo só aquele charter. Credencial e login são decisão sua, não minha.

**A pergunta:** como fechar o Gate 3 da rodada 3?
- **(a) Recomendo:** você roda `/design-login`, a sessão roda de novo só o CH-09 (TC-UI-005, prioridade P2) e depois apresenta o Gate 3. Esse é o único caminho para o `pass`. O teste confere as telas "o valor mudou" e a de Confirmação e Minha conta contra o protótipo, que nunca foram conferidas. Na rodada 2 o mesmo acesso funcionou, então o custo é baixo.
- **(b)** Confirmar agora o veredito `partial`, com o BUG-006 e o BUG-014 resolvidos. O CH-09 fica registrado como pendente. Não fica nenhum bug aberto.

## G15 — Gate 3 — confirmação do veredito de QA

- Etapa: Execução de QA · Têmis (árbitro) decidiu

**Pergunta (fim da resposta de Maestro, a sessão):**

> O relatório da triagem já está no Gate 3 que enviei, e não há trabalho pendente. Aguardo a confirmação do Gate 3.
> 
> [[WI:QA_EXEC:ASK:Gate 3 — confirmação do veredito de QA]]

**Resposta:**

Gate 3 da rodada 3 (confirmação) está **confirmado**. Esta é uma decisão delegada pela política do humano. A regra aplicada é "QA local: [...] confirmar o veredito (Gate 3) quando batem com o relatório dos agentes e com o que está em `qa/`". Ela segue também o precedente deste WI: na rodada 1 o humano respondeu "Siga", e na G12 o Gate 3 da rodada 2 foi confirmado da mesma forma.

**O que conferi** (pasta `.specs/work-items/92-desconto-da-compra-casada/qa/`):
- **Veredito `partial`:** o envelope de `qa-result.md` e o texto concordam. Não fica nenhum bug aberto. O `partial` vem só de duas coisas: o CH-09 ficou `not-run` e o TC-UI-005 segue `blocked`. O motivo está registrado em `sessions/CH-09-design-check.md` (rodada 3): o MCP `claude-design` respondeu `needs_design_scopes`, as ações gastas foram 0 de 13, e nada foi conferido de memória.
- **Contagens:** o acumulado é pass 55 · fail 0 · blocked 1 (TC-UI-005) · skip 1 (TC-FUNC-021), o que dá 57 TC no envelope. A cobertura é 33 de 38: 4 `missing` (CA-03.10, CA-04.1, RNF-04, RNF-07) e 1 `partial` (CA-01.2). Os motivos estão escritos (os TC de `integration` ficam com o Dev, o RNF-07 é condição de ambiente) e a soma fecha.
- **Transições:** batem com `retest.md` (resolved 2 · still-open 0 · cannot-reproduce 0 · blocked 0).
  - O BUG-006 vai de `still-open` para `resolved`. A prévia mostra "de R$ 80,91 a R$ 125,91", igual à loja, e com 20 % não salvo mostra "R$ 71,92 a R$ 111,92". A outra joia (Pingente Lua) também bate.
  - O BUG-014 vai de `open` para `resolved`. No #0386 e no #0387 o resumo fecha nas quatro superfícies, e o banco ficou com `discount 46.85` · `total 266.80`.
  - As evidências `RT3-retest-*` existem em `screenshots/`.
  - Hoje `issues/BUG-006.md:9` ainda diz `still-open` e `issues/BUG-014.md:9` diz `open`. Está certo: o status só muda no registro deste gate.
  - Não há nenhum `cannot-reproduce` que dependa do humano.
- **Bugs novos e perguntas ao produto:** 0 bugs novos e 0 perguntas. Não há página a abrir.

**Próximos passos, conforme `wi-qa-validation/references/setup/gates.md:98-108`:**
1. Gravar as transições nos envelopes de `issues/BUG-006.md` e `issues/BUG-014.md`, com a linha de Histórico que o triager propôs.
2. Em `qa-result.md`, trocar `**Gate 3:** pendente` por `confirmado em 2026-11-07`.
3. Acrescentar a linha `QA · Gate 3 — veredito` (rodada 3) no `item.md`, citando "Têmis, decisão delegada pela política do humano".

**O que fica em aberto, para o fechamento:** o design-check do TC-UI-005 (P2) só sai de `blocked` se o humano rodar `/design-login`. Isso é credencial dele e não impede o registro deste gate. Os riscos residuais e o backlog já estão em `qa-result.md`. A migration `20261107170000` continua só no banco local, e a ordem de publicação é migration e depois bundle.
