# Contexto — Promoções: desconto progressivo por quantidade

Decisões do usuário nas áreas cinzentas, e o que foi levantado no código antes de perguntar.
Feature **17**. A **18 (Monte seu kit)** consome o que nasce aqui e não define regra de preço nenhuma.

---

## O que o código já disse (Knowledge Verification Chain, passo 1)

| Achado | Onde | Consequência para esta spec |
|---|---|---|
| `applyOrderBump(items, bump)` recebe itens com **preço cheio** + a config e devolve itens com `unit_price` alterado, **antes** da soma. É exatamente a forma da regra que falta. | `packages/core/src/payment/pricing.ts:83` | A promoção progressiva entra como **irmã** dela, no mesmo módulo e no mesmo ponto do fluxo. Não se inventa arquitetura nova. |
| `resolveCouponDiscount(subtotal, coupon)` roda sobre o subtotal **que já inclui** o bump. | `packages/core/src/payment/pricing.ts:58` | Empilhar cupom sobre promoção acontece **por construção**. Sem decisão explícita, o switch do admin nasce ligado e mentindo. → decisão **D2**. |
| A edge function lê `products.base_price` e `product_variants` para recalcular. **Não** sabe a que categoria um item pertence. | `supabase/functions/mercado-pago/handlers.ts:331` | Elegibilidade por categoria é dado novo no caminho do dinheiro. → decisão **D1**. |
| `displayedEqualsCharged.test.ts` já existe e guarda "exibido == cobrado". | `packages/core/src/payment/__tests__/` | A regra nova **estende** esse teste; não ganha um harness próprio. |
| `@nanapin/core/pricing` (preço do item) e `@nanapin/core/payment/pricing` (total do pedido) são módulos distintos e o comentário no topo do primeiro proíbe confundi-los. | `packages/core/src/pricing/index.ts:1-17` | A regra progressiva é **total do pedido**, então mora em `payment/`. |
| `import` da edge function para `core` é por caminho relativo **com extensão `.ts` obrigatória**, senão `supabase start` morre no bind mount. | `packages/core/src/pricing/index.ts:228-233` | Vale para qualquer arquivo novo que a function importar. |
| `AD-014`: `menu_promo.category_id` mora em jsonb, **onde não cabe FK** — apagar o destino não dispara `on delete`, e validar na leitura virou critério de aceite. | `.specs/STATE.md` | → decisão **D5**. |

---

## Decisões

### D1 — Elegibilidade: view no banco, lida na hora
**Confirmado pelo usuário.**

Uma view resolve categoria + **descendentes** (`parent_id`), e a edge function faz **uma leitura a mais**
dentro do `create-payment`. Mesmo precedente da view `category_product_counts` da `AD-012`, que passou a
ser a única fonte de contagem por categoria.

**Por que não snapshot materializado:** envelhecer aqui significa **cobrar diferente do que a loja
mostrou** — a falha exata que esta feature existe para impedir.
**Por que não congelar no item:** o `price_source` é congelado porque o **admin** pode mudar a grade entre
o pedido e o pagamento; elegibilidade congelada seria um dado sobre desconto escrito na criação do pedido,
e a criação do pedido é caminho que o cliente influencia.
**Custo aceito:** +1 query no caminho do pagamento, declarada.

### D2 — Cupom: vale o melhor dos dois
**Confirmado pelo usuário.**

O pedido é calculado **duas vezes** — com promoção e sem cupom, e com cupom e sem promoção — e vale o
**total final menor**. O resumo diz qual venceu.

Comparar pelo **total final**, não pelo desconto, porque cupom `free_shipping` mexe no frete e não no
subtotal: comparar descontos faria um cupom de frete perder de uma promoção que desconta menos dinheiro.

Isso é o que faz o switch **"Acumula com cupom"** do desenho significar algo: desligado ⇒ melhor dos dois;
ligado ⇒ o comportamento que já acontece por construção (cupom sobre o já descontado).

### D3 — Sidebar: grupo `Descontos` novo
**Confirmado pelo usuário.**

`Cupons` **sai** de `Vendas` e vira o grupo `Descontos`, com `Promoções` ao lado, posicionado **entre
`Vendas` e `Catálogo`**. Coerente com a régua dos três eixos já registrada: cupom nunca foi fila — nada
apodrece esperando.

Alcance real: `navGroups`, a ordem das rotas em `app/App.tsx`, **o teste que guarda as duas**, e o
`CLAUDE.md`, que hoje descreve `Vendas` com quatro itens.

### D4 — A 17 entrega a loja exibindo o desconto
**Confirmado pelo usuário.**

P1 é **fatia vertical**: regra + admin + gaveta + checkout. É o que permite provar exibido == cobrado
ponta a ponta **dentro da 17**, sem esperar a tela de kit. A 18 fica só com a tela guiada.

### D5 — Escopo por categoria é tabela de vínculo com FK real, não array nem jsonb
**Decisão do agente**, ancorada na `AD-014`. Não perguntada — a lição já está paga.

`promotion_categories (promotion_id, category_id)` com FK e `on delete cascade`, em vez de
`category_ids uuid[]` ou jsonb. Motivo: array e jsonb **não têm FK**, então apagar uma categoria deixaria
a promoção apontando para um id morto — exatamente o que `menu_promo` obrigou a validar na leitura, e o
que a `AD-014` registrou como custo. Com FK, apagar a categoria remove o vínculo; e promoção que ficou
**sem nenhum** vínculo passa a não aplicar desconto a ninguém, o que é AC e não zelo.

### D6 — Sobreposição de promoções: maior desconto por item vence
**Decisão do agente.** Não é evitável: um botton em `Bottons` e em `Kawaii` casa com duas regras.

Por **item**, vence a faixa que produzir o menor `unit_price`; empate resolve pela promoção mais antiga
(`created_at`). Determinístico e testável, sem coluna de prioridade para o lojista administrar.

---

## Sweep de dimensões implícitas

Escopo **Large** ⇒ toda dimensão resolve em requisito ou `N/A` explícito.

| Dimensão | Resolução |
|---|---|
| Validação de entrada e limites | `min_qty ≥ 2` e único por promoção; valor > 0; `% off` em 1–90; faixas ordenadas na leitura, não na escrita. `min_qty = 1` é recusado — isso é mudança de preço, não promoção. → `PRM-04` |
| Falha / falha parcial | Salvar promoção é uma transação: faixas e vínculos de categoria entram junto ou nada entra. → `PRM-05` |
| Idempotência / retry / duplicata | `N/A because` a promoção é estado declarativo (CRUD), não efeito externo: salvar duas vezes o mesmo corpo dá o mesmo resultado. O caminho com efeito externo (cobrança) já é idempotente pela `apply_payment_approval`. |
| Fronteira de auth e rate limit | Escrita só com papel `admin` via RLS (`has_role`), leitura pública apenas de promoção **ativa e vigente**. Rate limit: `N/A because` é tela de admin com volume de dígito único por semana. → `PRM-06` |
| Concorrência / ordenação | Duas abas do admin editando a mesma promoção: última escrita vence, sem lock — mas `updated_at` por trigger dá evidência. Ordenação das faixas é resolvida **na leitura** (`sort by min_qty`), então ordem de inserção não é contrato. → `PRM-07` |
| Ciclo de vida / expiração | `valid_from`/`valid_until` são filtro de leitura, não job: promoção vencida simplesmente para de casar. **Promoção que vence entre a criação do pedido e o pagamento ⇒ 422, nunca cobrança maior que a exibida.** → `PRM-12` |
| Observabilidade | O log estruturado do `create-payment` ganha `promotion_id` e `tier_min_qty` aplicados, no mesmo molde do `bump_applied` que o roteiro de sandbox já confere. → `PRM-13` |
| Falha de dependência externa | `N/A because` a regra é função pura e a leitura é do próprio Postgres; nenhuma chamada de terceiro entra neste caminho. A falha do Mercado Pago já tem tratamento próprio. |
| Integridade de transição de estado | Promoção tem dois estados (`active` true/false) e nenhuma máquina: qualquer transição é válida e reversível. Pausar **não** afeta pedido já pago. → `PRM-08` |

---

## Fronteira com a 18

O que a 18 pode assumir como pronto, e não redefinir:

1. `promotions` + faixas + `promotion_categories`, com a flag **`is_kit_showcase`** apontando qual regra a
   tela de kit exibe (uma só por vez).
2. `resolveProgressiveTier` / `applyProgressiveDiscount` em `@nanapin/core/payment/pricing`.
3. A view de elegibilidade, que a tela de kit usa para saber **quais produtos podem entrar na cartela**.
4. O desconto já aparecendo na gaveta e no checkout — a 18 não mexe em totais.
