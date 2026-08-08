# Promoções: desconto progressivo por quantidade — Especificação

## Problem Statement

A loja anuncia kits de bottons com preço fechado (R$ 15 / 23 / 42 para 3 / 5 / 10) em constantes dentro de
um componente da home, e **não existe nenhuma forma de a dona da loja mudar isso sem deploy**. Pior: como
`supabase/functions/mercado-pago` recalcula `unit_price` a partir de `products.base_price` e descarta o
valor enviado pelo cliente, qualquer desconto por quantidade calculado no front seria **exibido e não
cobrado** — o mesmo motivo pelo qual o "Compre Junto" do board nunca foi implementado.

Esta feature dá dono ao desconto por quantidade: uma promoção cadastrada no admin, uma regra pura em
`@nanapin/core`, e o servidor cobrando exatamente o que a loja mostrou.

## Goals

- [ ] A dona da loja cria a regra do kit (3 / 5 / 10, escopo `Bottons`) **pelo admin, sem deploy**, e a
      loja passa a praticar o preço no mesmo carregamento.
- [ ] Exibido == cobrado **ao centavo**, provado por teste de propriedade em `@nanapin/core` e por probe
      HTTP contra o banco — não por inspeção de tipo (`AD-012`).
- [ ] O desconto vale em **qualquer** superfície que junte itens elegíveis (página de categoria, gaveta),
      não só numa futura tela de kit — a tela da 18 é atalho, não produto diferente.
- [ ] Zero erro novo de lint e de tipo contra a baseline vigente (backoffice 28/7 · store 2/2 · `tsc` 0/0).

## Out of Scope

| Feature | Reason |
|---|---|
| A tela `Monte seu kit` da loja | É a feature **18**. Consome esta regra e não define preço nenhum. |
| Outros tipos de promoção (compre-junto, brinde, frete progressivo) | A coluna `type` nasce com `check (type = 'progressive_qty')`; abrir o enum sem AC seria a armadilha da `AD-011`. |
| Segmentação por cliente (primeira compra, VIP, grupo) | `coupons.first_order_only` já cobre o caso de primeira compra; segmento é feature própria. |
| Coluna de prioridade administrável entre promoções | Sobreposição resolve por regra determinística (**D6**), não por número que a lojista precise manter. |
| Cupom empilhando por padrão | Decisão **D2**: desligado ⇒ vale o melhor dos dois. O modo empilhado existe como switch, não como default. |
| Desconto progressivo por **valor** (gaste R$ X, ganhe Y%) | Faixa por quantidade é o que o desenho pede; por valor muda a unidade da faixa e a matriz de teste inteira. |
| Exibir a promoção na vitrine e no card de produto | Nenhum artboard cobre isso. A promoção aparece onde há **contagem**: gaveta e checkout. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| A1 — Elegibilidade no caminho do pagamento | View no banco, lida no `create-payment` | Snapshot pode envelhecer, e envelhecer aqui é cobrar diferente do exibido (**D1**) | **y** |
| A2 — Promoção + cupom | Vale o melhor dos dois, comparado pelo **total final** | Cupom `free_shipping` mexe no frete: comparar descontos faria ele perder injustamente (**D2**) | **y** |
| A3 — Sidebar | Grupo `Descontos` novo, entre `Vendas` e `Catálogo` | Cupom nunca foi fila, pela régua dos três eixos (**D3**) | **y** |
| A4 — Alcance da 17 na loja | Inclui gaveta e checkout | Fatia vertical: sem exibição não há como provar exibido == cobrado (**D4**) | **y** |
| A5 — Escopo por categoria | Tabela de vínculo com FK e `on delete cascade` | Array e jsonb não têm FK; a `AD-014` já pagou essa lição (**D5**) | n — decisão do agente |
| A6 — Sobreposição | Por item vence o menor `unit_price`; empate pelo `created_at` mais antigo | Determinístico e sem coluna para administrar (**D6**) | n — decisão do agente |
| A7 — Unidade da faixa | Conta **unidades** (soma de `quantity`), não produtos distintos | 5 unidades do mesmo botton é um kit de 5; foi o que o desenho da cartela já assumiu ("dois Narutos ocupam dois slots") | n — decisão do agente |
| A8 — Escopo por produto avulso | A tabela suporta, o editor **não** expõe nesta feature | O board tem o segmento `Produtos`, mas o caso de uso real é por categoria; expor sem AC arrastaria seletor de produto, busca e paginação | n — decisão do agente |
| A9 — Elegibilidade inclui descendentes | Sim, via `parent_id` | No banco real os universos são filhas de `Bottons`: escopo sem roll-up não pegaria nenhum produto (mesma razão do `descendantIds` da 16) | n — decisão do agente |
| A10 — Faixa nunca aumenta preço | `unit_price = min(cheio, valor da faixa)` | Botton de R$ 3,90 numa faixa de R$ 4,60 não pode subir de preço ao entrar em promoção | n — decisão do agente |

**Open questions:** nenhuma — tudo resolvido acima ou registrado como assunção com default e razão.

---

## User Stories

### P1-A: A dona da loja define a regra ⭐ MVP

**User Story**: Como dona da loja, quero cadastrar faixas de desconto por quantidade com escopo por
categoria, para praticar preço de kit sem pedir deploy.

**Why P1**: Sem isso o preço continua sendo constante em componente — o problema que abre esta spec.

**Acceptance Criteria**:

1. WHEN o admin abre `/admin/promocoes` THEN o sistema SHALL listar as promoções com nome, tipo, escopo,
   faixas resumidas (`3 · 5 · 10 un`), vigência e status, ordenadas por `created_at` desc.
2. WHEN o admin salva uma promoção com nome, tipo `progressive_qty`, escopo `Categorias` com ao menos uma
   categoria, e ao menos uma faixa válida THEN o sistema SHALL persistir promoção + faixas + vínculos e
   exibi-la na listagem sem recarregar a página.
3. WHEN o admin informa uma faixa com `min_qty < 2` THEN o sistema SHALL recusar o salvamento com a
   mensagem "A faixa precisa começar em 2 unidades ou mais" e **não** gravar nada.
4. WHEN o admin informa duas faixas com o mesmo `min_qty` THEN o sistema SHALL recusar o salvamento
   nomeando a quantidade duplicada e **não** gravar nada.
5. WHEN o desconto é `unit_price` e o valor é `≤ 0`, ou é `percent` e o valor está fora de 1–90 THEN o
   sistema SHALL recusar o salvamento com mensagem por campo.
6. WHEN o admin edita as faixas THEN o sistema SHALL exibir, ao lado de cada faixa, o **total que o
   cliente paga** calculado na hora (faixa `5 un` a `R$ 4,60` ⇒ `R$ 23,00`) e o percentual equivalente.
7. WHEN o admin liga `Vitrine do kit` numa promoção e outra já a tinha ligada THEN o sistema SHALL
   desligar a anterior na mesma transação, garantindo **no máximo uma** promoção de vitrine.
8. WHEN o salvamento falha em qualquer parte (faixa, vínculo, promoção) THEN o sistema SHALL não deixar
   promoção parcial: nada é gravado e o erro é exibido.

**Independent Test**: cadastrar a regra do kit pelo admin com o banco local e conferir por probe HTTP que
`promotions`, `promotion_tiers` e `promotion_categories` têm as linhas esperadas — a prova de que a tela
grava é gravar (`AD-012`).

---

### P1-B: O servidor cobra a faixa ⭐ MVP

**User Story**: Como dona da loja, quero que o desconto seja aplicado pelo servidor, para nunca cobrar
diferente do que a loja mostrou.

**Why P1**: É o requisito que impede a repetição do defeito que barrou o "Compre Junto".

**Acceptance Criteria**:

1. WHEN a contagem de unidades elegíveis é `n` THEN o sistema SHALL aplicar a **maior** faixa cujo
   `min_qty ≤ n`, a **todas** as unidades elegíveis.
2. WHEN nenhuma faixa é alcançada (`n` menor que o menor `min_qty`) THEN o sistema SHALL devolver a lista
   de itens **inalterada**, sem mutar o input.
3. WHEN a faixa é `unit_price` e o preço cheio do item é menor que o valor da faixa THEN o sistema SHALL
   manter o preço cheio (A10).
4. WHEN a faixa é `percent` THEN o sistema SHALL cobrar `round2(cheio × (1 − pct/100))` por unidade,
   arredondando **por item** antes de somar — a mesma disciplina que o defeito de 1 centavo do cupom
   ensinou.
5. WHEN um item é elegível a mais de uma promoção vigente THEN o sistema SHALL aplicar, para aquele item,
   a faixa que produzir o menor `unit_price`; em empate, a promoção com `created_at` mais antigo (A6).
6. WHEN `create-payment` recalcula o pedido THEN o sistema SHALL resolver a elegibilidade pela view (não
   por dado vindo do cliente) e cobrar o total de `calculateOrderTotals` com a promoção aplicada.
7. WHEN a promoção deixou de ser vigente (pausada, expirada, categoria desvinculada) entre a criação do
   pedido e o pagamento THEN o sistema SHALL responder **422 `promotion_no_longer_valid`**, **não** criar
   order no Mercado Pago, e deixar o pedido pagável após a loja recarregar — nunca cobrar mais do que a
   loja exibiu.
8. WHEN uma promoção é aplicada THEN o log estruturado do `create-payment` SHALL incluir `promotion_id` e
   `tier_min_qty`, no mesmo molde de `bump_applied`.
9. WHEN a promoção existe mas está sem nenhuma categoria vinculada THEN o sistema SHALL não descontar de
   ninguém (A5).

**Independent Test**: roteiro de sandbox — criar pedido com 5 bottons elegíveis, acionar o pagamento e
conferir que `orders.total` == `total_amount` da order no MP == R$ 23,00, com `promotion_id` no log.

---

### P1-C: A loja mostra o mesmo número ⭐ MVP

**User Story**: Como cliente, quero ver o desconto por quantidade na sacola e no checkout, para entender
por que o total caiu.

**Why P1**: Sem exibição não existe invariante para provar, e o desconto ficaria invisível até a 18.

**Acceptance Criteria**:

1. WHEN a sacola tem unidades elegíveis suficientes para uma faixa THEN a gaveta SHALL exibir o
   subtotal **cheio**, a linha `Desconto progressivo −R$ 21,50` e o **total** já descontado — e o
   resumo do checkout SHALL usar a mesma forma.
   - *Redação corrigida durante a validação (2026-08-03): o texto original pedia a linha de desconto
     "**e o subtotal já descontado**", que se contradiz — subtotal já líquido exibido ao lado de uma
     linha de desconto conta o desconto duas vezes para quem lê. A gaveta praticava a forma acima e o
     `OrderSummary` do checkout foi alinhado a ela.*
2. WHEN o checkout calcula o total THEN o valor do CTA SHALL ser idêntico, **ao centavo**, ao que
   `create-payment` cobra para o mesmo pedido.
3. WHEN há cupom e promoção e a promoção **não** acumula com cupom THEN o sistema SHALL aplicar o de
   **menor total final** e o resumo SHALL nomear o descartado: "Cupom BEMVINDA não foi aplicado — a
   promoção Kit de bottons desconta mais" (A2).
4. WHEN a promoção acumula com cupom (`stacks_with_coupon = true`) THEN o cupom SHALL incidir sobre o
   subtotal já descontado, e o resumo SHALL mostrar as duas linhas.
5. WHEN a promoção não alcança nenhuma faixa THEN nenhuma linha de desconto progressivo SHALL aparecer —
   a gaveta não anuncia desconto de R$ 0,00.

**Independent Test**: com a regra do kit ativa, adicionar 5 bottons pela página de categoria (sem passar
por tela de kit nenhuma) e conferir gaveta, CTA do checkout e `orders.total` com o mesmo número.

---

### P2-A: `Descontos` ganha grupo próprio na sidebar

**User Story**: Como dona da loja, quero cupons e promoções lado a lado, para achar as duas onde procuro
desconto.

**Why P2**: Organização de navegação — a feature funciona com `Promoções` em qualquer grupo.

**Acceptance Criteria**:

1. WHEN o admin renderiza a sidebar THEN os grupos SHALL ser, nesta ordem: (sem cabeçalho) `Dashboard`;
   `Vendas` (Pedidos, Carrinhos abandonados, Clientes); `Descontos` (Cupons, Promoções); `Catálogo`
   (Produtos, Categorias, Mockups); `Loja` (Menu da loja); rodapé `Configurações`.
2. WHEN as rotas de `app/App.tsx` são lidas THEN sua sequência SHALL casar com a de `navGroups`, e o teste
   existente que guarda esse par SHALL ser atualizado para o novo grupo — não removido.

**Independent Test**: o teste de ordem da sidebar passa com o grupo novo, e `CLAUDE.md` descreve quatro
eixos em vez de três.

---

### P2-B: Pausar, duplicar e convidar para a próxima faixa

**User Story**: Como dona da loja, quero pausar uma promoção sem apagá-la e duplicar uma parecida; como
cliente, quero saber que falta pouco para a próxima faixa.

**Why P2**: Conveniência de operação e conversão — nenhuma das duas bloqueia o preço correto.

**Acceptance Criteria**:

1. WHEN o admin pausa uma promoção THEN o sistema SHALL parar de aplicá-la em pedidos novos e **não**
   alterar pedido já pago.
2. WHEN o admin duplica uma promoção THEN o sistema SHALL criar uma cópia inativa com faixas e categorias,
   com nome sufixado `(cópia)`.
3. WHEN faltam `k` unidades para a próxima faixa THEN a gaveta SHALL exibir "Falta 1 para cada botton sair
   a R$ 4,20", com `k` e o valor vindos da mesma função pura que calcula o desconto.

---

### P3-A: Números da listagem

**User Story**: Como dona da loja, quero ver quanto desconto concedi e se o pedido cresceu.

**Acceptance Criteria**:

1. WHEN a listagem carrega THEN o sistema SHALL exibir promoções ativas, desconto concedido nos últimos 30
   dias e itens por pedido com e sem promoção.

---

## Edge Cases

- WHEN a promoção está ativa e vigente mas **sem faixas** THEN nenhum desconto SHALL ser aplicado.
- WHEN a categoria vinculada é apagada THEN o vínculo SHALL cair por `on delete cascade`, e a promoção sem
  vínculo nenhum SHALL parar de descontar (nunca virar "toda a loja").
- WHEN o cliente altera a sacola depois de o pedido nascer THEN o servidor SHALL recontar a partir dos
  itens **persistidos** do pedido, nunca do payload.
- WHEN a contagem elegível cai abaixo da faixa por remoção de item THEN a gaveta SHALL recalcular e
  remover a linha de desconto no mesmo render.
- WHEN duas abas do admin salvam a mesma promoção THEN a última escrita SHALL vencer, com `updated_at`
  atualizado por trigger como evidência.
- WHEN as faixas são gravadas fora de ordem THEN a leitura SHALL ordenar por `min_qty` — ordem de inserção
  não é contrato.
- WHEN o total do pedido ficaria abaixo de `MIN_ORDER_TOTAL` THEN `calculateOrderTotals` SHALL lançar como
  já lança hoje, e o checkout SHALL exibir erro em vez de cobrar R$ 0.
- WHEN um item elegível tem preço por variação THEN a faixa SHALL incidir sobre o preço da **variação**
  resolvido por `resolveItemPrice`, não sobre `base_price`.

---

## Requirement Traceability

| Requirement ID | Story | Fase | Status |
|---|---|---|---|
| PRM-01 | P1-A: listagem `/admin/promocoes` | Design | Pending |
| PRM-02 | P1-A: editor salva promoção + faixas + categorias em transação | Design | Pending |
| PRM-03 | P1-A: validação de faixa (`min_qty ≥ 2`, sem duplicata, valor por tipo) | Design | Pending |
| PRM-04 | P1-A: prévia do total por faixa no editor | Design | Pending |
| PRM-05 | P1-A: `is_kit_showcase` exclusiva | Design | Pending |
| PRM-06 | P1-A: RLS — escrita admin, leitura pública só de vigente | Design | Pending |
| PRM-07 | P1-A: `updated_at` por trigger | Design | Pending |
| PRM-08 | P1-B: `resolveProgressiveTier` — maior faixa alcançada | Design | Pending |
| PRM-09 | P1-B: `applyProgressiveDiscount` — pura, sem mutar, nunca aumenta preço | Design | Pending |
| PRM-10 | P1-B: view de elegibilidade com descendentes | Design | Pending |
| PRM-11 | P1-B: `create-payment` cobra a faixa | Design | Pending |
| PRM-12 | P1-B: 422 `promotion_no_longer_valid` | Design | Pending |
| PRM-13 | P1-B: log com `promotion_id` e `tier_min_qty` | Design | Pending |
| PRM-14 | P1-B: sobreposição — menor `unit_price`, empate por `created_at` | Design | Pending |
| PRM-15 | P1-C: linha de desconto na gaveta | Design | Pending |
| PRM-16 | P1-C: exibido == cobrado ao centavo | Design | Pending |
| PRM-17 | P1-C: melhor dos dois com cupom, nomeando o descartado | Design | Pending |
| PRM-18 | P1-C: modo empilhado quando `stacks_with_coupon` | Design | Pending |
| PRM-19 | P2-A: grupo `Descontos` em `navGroups` | - | Pending |
| PRM-20 | P2-A: rotas de `App.tsx` na mesma ordem + teste atualizado | - | Pending |
| PRM-21 | P2-B: pausar sem afetar pedido pago | - | Pending |
| PRM-22 | P2-B: duplicar promoção | - | Pending |
| PRM-23 | P2-B: convite para a próxima faixa na gaveta | - | Pending |
| PRM-24 | P3-A: números da listagem | - | Pending |

**Coverage:** 24 total · 24 mapeados para tasks (T1–T24) · **24 verificados** — Verifier PASS em
2026-08-03, 24/24 ACs casando com o resultado definido pela spec, 0 lacunas abertas, sensor 7/7.
Evidência por AC (`file:line` + expressão da asserção) em
[`validation.md`](./validation.md).

---

## Success Criteria

- [ ] A regra do kit (3/5/10 sobre `Bottons`) é criada **pelo admin** e a loja pratica o preço sem deploy.
- [ ] Em 5 bottons elegíveis: gaveta, CTA do checkout, `orders.total` e `total_amount` da order no MP
      mostram **R$ 23,00** — o mesmo número nos quatro lugares.
- [ ] Promoção expirada entre pedido e pagamento devolve 422 e **nenhuma** order é criada no MP.
- [ ] `displayedEqualsCharged.test.ts` cobre a promoção progressiva, incluindo o caso com cupom.
- [ ] Probe HTTP prova que o editor grava as três tabelas (`AD-012`: a prova de que a tela grava é gravar).
- [ ] Sem erro novo de lint ou de tipo contra a baseline vigente.
