# Product Catalog — Fundação e Caminho do Dinheiro — Specification

**Criada:** 2026-07-27 · **Fatiada:** 2026-07-31 (`AD-009`)
**Contexto:** [`context.md`](./context.md) — **contexto de programa**, decodifica os 9 artboards do Paper
e serve as quatro features. Desenho no Paper (arquivo **Nanapin**, página **Backoffice - Produtos**):
<https://app.paper.design/file/01KPBGSMF2DP3MQVAEB171ZMDZ/6-0>
**Escopo:** frentes **A** (modelo/schema) e **E** (loja/checkout) — o modelo de variação e todo o
caminho do dinheiro. **23 requisitos · 21 tasks.**

> ### Esta feature faz parte de um programa de quatro
>
> A spec original cobria as frentes A–E numa peça só (55 requisitos, 42 tasks). `AD-009` a fatiou pelas
> **costuras de deploy**. Esta é a primeira e é **pré-condição das outras três**.
>
> | Feature | Escopo | Req | Tasks | Depende de |
> | ------- | ------ | --- | ----- | ---------- |
> | **07 — fundação e dinheiro** (esta) | modelo, `@nanapin/core`, `create-payment`, RPC de baixa, loja lendo o modelo novo | 23 | 21 | — |
> | [11 — formulário v2](../11-product-form-v2/spec.md) | opções, grade, categorias, tags, URL/301, integridade | 15 | 11 | 07 |
> | [12 — mídia e estúdio](../12-product-media-studio/spec.md) | alt-text, upload honesto, estúdio 1360 px, imagem por variação | 7 | 5 | 07, 11 |
> | [13 — listagem e lote](../13-product-bulk-ops/spec.md) | listagem v2, edição em massa, grade rápida, limpeza do legado | 10 | 5 | 07 (paralela à 11) |
>
> **Numeração preservada.** Os IDs de requisito (`VAR-*`, `PST-*`, `PFM-*`, `PMD-*`, `PLS-*`) e os
> números de task (`T1`–`T42`) são os da spec original, distribuídos sem renumerar. Cada ID aparece
> **exatamente uma vez** nas quatro features — é o que torna o fatiamento conferível. Por isso os
> números de task **não são contíguos** dentro de uma feature.

---

## Problem Statement

O catálogo tem **duas verdades sobre variação**: `products.variants` (JSONB, o que o formulário grava,
sem coluna de preço) e a tabela `product_variants` (que `order_items.variant_id` referencia). A própria
migration que criou o JSONB registra a dívida como aberta
([`20260726000000:60-62`](../../../supabase/migrations/20260726000000_products_extended_fields.sql#L60-L62)).
Nem o pedido sabe qual linha foi vendida — na prática `order_items.variant_id` **nunca é escrito**: o
carrinho guarda `size` e `finish` como strings livres
([`cartStore.ts:25`](../../../apps/store/src/entities/cart/model/cartStore.ts#L25)) e a coluna, com FK
desde a migration inicial, está morta.

Isso não é dívida cosmética: é o que impede o preço por variação de existir. Um 5,5 cm custa mais caro
que um 3,5 cm e não há onde dizer isso. E se houvesse, o caixa não obedeceria — `create-payment`
recalcula o total lendo só `products.base_price`
([`handlers.ts:317-327`](../../../supabase/functions/mercado-pago/handlers.ts#L317-L327)) e
`apply_payment_approval` baixa estoque de `products.stock_total`
([migration `20260726000000:99-107`](../../../supabase/migrations/20260726000000_products_extended_fields.sql#L99-L107)).
Publicar uma grade que cobra R$ 18,40 sobre esse servidor é vender por R$ 14,90 e perder a diferença
em **todo** pedido.

Por isso o modelo e o dinheiro vêm primeiro, juntos e indivisíveis. Formulário, mídia e listagem são
valor visível — mas escrevê-los antes seria escrever duas vezes.

---

## Goals

- [x] **Uma verdade sobre variação:** `product_variants` é a fonte de preço, promo, estoque, SKU, peso e
      imagem de cada linha vendável; `products.variants` (JSONB) deixa de ser lido.
- [x] **Preço por variação correto ponta a ponta:** o valor cobrado pelo Mercado Pago e a baixa de
      estoque no webhook batem com a linha da grade — zero divergência entre vitrine, carrinho e caixa.
- [x] **A loja lê o modelo novo:** eixos genéricos no lugar de `sizes`/`finishes`, categorias N:N,
      redirect de URL antiga e disponibilidade que respeita a política de estoque.
- [x] **Nada quebra na conversão:** `products.images` vira `jsonb` e os 12 pontos de leitura acompanham
      na mesma fase — a conversão é destrutiva.
- [x] **Base compartilhada pronta:** formatters puros e os três inputs mascarados existem antes de 11 e
      13 precisarem deles.

---

## Out of Scope

Explicitamente excluído. Documentado para evitar scope creep.

| Item | Motivo |
| ---- | ------ |
| **Formulário de produto** (abas, opções, grade, categorias, tags, URL, integridade) | Feature [`11-product-form-v2`](../11-product-form-v2/spec.md). Aqui só o **modelo** que ela grava |
| **Mídia e estúdio de mockup** (alt-text, upload, 1360 px, imagem por variação) | Feature [`12-product-media-studio`](../12-product-media-studio/spec.md). Aqui só a coluna `images` virando `jsonb` e os leitores acompanhando |
| **Listagem v2, edição em massa e grade rápida** | Feature [`13-product-bulk-ops`](../13-product-bulk-ops/spec.md) |
| **Remoção de `products.variants`, `sizes` e `finishes`** (`VAR-13`) | Fecha na `13`, quando nada mais lê o legado. Aqui a coluna para de ser **lida**, não de existir |
| **Geração de texto por IA** — só "Sugerir com IA" (descrição) e "Gerar com IA" (SEO) | `AD-011`. Desenhados sem uma única AC e sem provedor no projeto. O **alt-text** continua no escopo (`PMD-01`, na `12`): é template determinístico, não IA |
| Pin personalizado (`CustomPinPage`) virar produto real | Decidido: fica sintético. A spec só garante que `stock_policy: none` existe e que a baixa ignora `product_id` não-UUID (A3) |
| Preço por variação como delta (`+R$ 2,00`) | D2 escolheu preço absoluto |
| Categoria principal + secundárias | D3 escolheu conjunto plano; a categoria de exibição é derivada de `sort_order` (A-tabela, PST-06) |
| Política de estoque **por variação** | Nenhum caso real tem uma variação sob demanda e outra controlada. Política é do produto |
| Janela de vigência (de/até) no preço promocional por variação | A5 → assumido "sem janela" |
| Prazo de produção entrar na cotação do Melhor Envio | A6 → assumido "só exibição" |
| Reescrever a autenticação / RLS de `products` | Fora do escopo; tabelas novas seguem o padrão de RLS escopada decidido em 2026-07-18 |

---

## Assumptions & Open Questions

Numeração **herdada da spec original** — A4 migrou para a `13`, A12 para a `12`. Os buracos na sequência
são de propósito.

| # | Assumção / decisão | Default escolhido | Rationale | Confirmado? |
| - | ------------------ | ----------------- | --------- | ----------- |
| A1 | Fatiamento dos artefatos | **Quatro features pela costura de deploy** (`AD-009`): 07 fundação+dinheiro, 11 formulário, 12 mídia, 13 lote. **Supera** a A1 original ("uma spec só"), que estava confirmada pelo usuário | Fatiar por tela cortaria o caminho do dinheiro em quatro donos. Pela costura de deploy, o trecho com risco financeiro fica indivisível e primeiro, e sobram três frentes que fecham sozinhas | **sim** (usuário, 2026-07-31) |
| A2 | Volume de dados em `products.variants` | **Catálogo pequeno / seed.** Migração direta: copia JSONB → `product_variants`, sem período de convivência longo | Reduz o risco e o custo da migração | **sim** (usuário) |
| A3 | Pin personalizado | **Continua sintético**, fora do escopo | Virar produto real adiciona escopo de loja + seed sem resolver dor de cadastro | **sim** (usuário) |
| A5 | Preço promocional por variação com janela de/até | **Sem janela.** `compare_price` por variação é só valor; vigência é assunto de cupom. É decisão de **schema**, por isso mora aqui | O desenho no Paper tem só o valor; janela por linha multiplica o estado sem demanda | não |
| A6 | Prazo de produção e frete | **Só exibição.** `products.production_lead_days` entra na promessa de entrega da página do produto, **não** na cotação do Melhor Envio | Mexer na edge function de frete é escopo próprio e não é o problema desta feature | não |
| A7 | Quantos eixos a loja aguenta | **Página do produto: até 3 seletores. Card da vitrine: no máximo 2** (os dois primeiros eixos por `position`); com 3 eixos o card leva para a página | Preserva o comportamento atual do `ProductCard` (que já mostra 2 selects) sem apertar o card | não |
| A8 | Produto **sem** variações | Continua precificado por `products.base_price` / `stock_total`. A grade é opcional; não há backfill de "variação padrão". **O caminho de precificação é congelado no pedido** em `order_items.price_source`, não reavaliado no pagamento (P1.2 AC 6) | Evita reescrever todo produto simples do catálogo; congelar no pedido remove a janela em que criar/pausar uma variação muda o preço de um pedido pendente | não |
| A9 | Guarda-corpo da grade | **Sem flag de UI.** A ordem das fases (schema → dinheiro → loja) garante que o checkout já entende variação antes de a grade ficar editável na `11`. **Há uma flag de servidor**, de 3 linhas: a rejeição 422 por item sem variação só liga depois que o bundle da loja estiver em produção (P1.2 AC 17) | A ordem das fases não cobre o intervalo de deploy entre a edge function e o SPA, nem as abas já abertas | não |
| A10 | `product_variants` já existe | A migração é **`ALTER` + unificação**, não `CREATE`. A tabela nasceu em [`20260414121021`](../../../supabase/migrations/20260414121021_305804ba-a826-4a90-9d43-6c78231e94d7.sql#L49-L57) com `{name, sku, price_override, stock}` e é populada por `seed.sql` | `order_items.variant_id` já tem FK para ela | **sim** (código) |
| A11 | `products.stock_total` | Vira **legado para produtos sem variação**. Produto **com** variação nunca tem `stock_total` baixado; a listagem exibe a soma das variações | Duas baixas na mesma venda é oversell garantido | não |
| A13 | Idioma da UI | Português (pt-BR), como o resto do backoffice | Convenção do projeto | **sim** |
| A14 | Papel de `products.base_price` quando há grade | `base_price` continua `NOT NULL` e SHALL refletir o **menor `price` ativo** da grade, mantido por trigger. Serve só ao "a partir de R$ X" da vitrine — nunca é o preço cobrado de um item com `price_source = 'variant'` | A coluna é obrigatória no schema e não pode ficar sem dono; deixá-la desatualizada faria a vitrine anunciar um preço que a grade não pratica | não |
| A15 | Semântica de `price_override` no seed | **Indeterminada — não será inferida.** As variações legadas migram pausadas e sem preço (P1.1 AC 3) | `('5.5 cm (grande)', 'g55', 2.00)` contra `base_price` de R$ 4,90 lê como delta, mas a coluna se chama `override`; qualquer palpite deixa o tamanho grande mais barato que o pequeno | não |
| A16 | `T27` (inputs mascarados) nesta feature | **Sim** (`AD-010`). Os 3 componentes só dependem dos formatters puros e são consumidos por 11 **e** 13; deixá-los na 11 faria a 13 esperar uma task no meio do formulário | O paralelismo prometido pelo fatiamento seria falso sem isso | **sim** (usuário, 2026-07-31) |

**Open questions:** nenhuma bloqueante. A5–A11, A14 e A15 seguem como assumções registradas — se o
usuário discordar de qualquer uma, o ajuste é local.

> **Revisão independente (2026-07-27).** Um revisor cético confrontou a spec original com o código e
> apontou 6 achados bloqueantes, todos verificados e incorporados. Os que caem **nesta** feature: a
> conversão destrutiva de `images` sem os leitores (→ P1.1b), o mapeamento de preço da migração que
> produzia variação ativa sem preço e invertia o preço do tamanho grande (→ P1.1 AC 2-3 / A15), as
> variações do `seed` virando ativas sem eixo e tornando 5 produtos impagáveis (→ P1.1 AC 3 / PST-10), o
> carrinho persistido sem `version`/`migrate` (→ PST-04) e a reavaliação do caminho de preço no pagamento
> em vez de congelá-lo no pedido (→ `price_source` / A8 / A14). Não-bloqueantes incorporados: persistir
> `unit_price` recalculado, 422 para preço não resolvível, RLS de `product_variants` escopada, coluna de
> prazo de produção e flag de deploy da function.

---

## User Stories

### P1.1 — Variação como fonte de verdade ⭐ MVP

**User Story**: Como sistema, preciso de **uma** tabela que responda "quanto custa e quanto tem desta
linha", para que vitrine, carrinho, caixa e estoque nunca discordem.

**Why P1**: É o alicerce de D11. Sem isso, tudo o que vem depois é escrito duas vezes — e o preço por
variação não é real.

**Acceptance Criteria**:

1. WHEN a migração roda THEN `product_variants` SHALL ter as colunas `option_values jsonb NOT NULL DEFAULT '{}'`, `price numeric(10,2)`, `compare_price numeric(10,2)`, `stock int NOT NULL DEFAULT 0`, `sku text`, `weight_kg numeric(6,3)`, `image_url text`, `is_active boolean NOT NULL DEFAULT true`, `position int NOT NULL DEFAULT 0`, preservando `id`, `product_id` e a FK de `order_items.variant_id`.
2. WHEN a migração roda THEN cada objeto de `products.variants` (`{size, finish, stock, sku}`) SHALL virar uma linha em `product_variants` com `option_values = {"Tamanho": <size>, "Acabamento": <finish>}`, `stock` e `sku` copiados, `price = NULL` e **`is_active = false`** — nenhuma variação migrada nasce vendável, porque o JSONB não tem preço e uma variação ativa sem preço é undercharge.
3. WHEN a migração roda THEN as linhas legadas de `product_variants` (formato `{name, price_override}`) SHALL receber `option_values = {}`, `price = NULL` e `is_active = false`, **preservando `id`** — nenhum `order_items.variant_id` fica órfão. A migração SHALL **não** inferir preço a partir de `price_override`: no `seed.sql` o valor é ambíguo (`'5.5 cm (grande)'` tem `price_override = 2.00` contra `base_price` de R$ 4,90 — semanticamente um delta, apesar do nome da coluna), e adivinhar aqui é vender o tamanho grande mais barato que o pequeno.
4. WHEN a migração termina THEN SHALL emitir no log a contagem de variações pausadas, para que o admin saiba quantas precisam de preço antes de voltar à loja.
5. WHEN a migração roda THEN `products` SHALL ganhar `options jsonb NOT NULL DEFAULT '[]'` (`[{name, values[], position}]`), `stock_policy text NOT NULL DEFAULT 'track' CHECK (stock_policy IN ('track','backorder','none'))` e `production_lead_days int` (nullable).
6. WHEN a migração roda THEN `products.images` SHALL passar de `text[]` para `jsonb`, convertendo cada URL em `{"url": <url>, "alt": null, "source": "upload"}`.
7. WHEN a migração roda THEN `product_categories (product_id, category_id, position)` SHALL existir com PK composta e backfill de `products.category_id` (`position = 0`); `products.category_id` permanece como coluna legada.
8. WHEN a migração roda THEN `product_redirects (from_slug text PRIMARY KEY, product_id uuid REFERENCES products(id) ON DELETE CASCADE, created_at timestamptz)` SHALL existir.
9. WHEN a migração roda THEN `order_items` SHALL ganhar `price_source text NOT NULL DEFAULT 'base' CHECK (price_source IN ('base','variant'))`, `variant_label text` e `variant_options jsonb` — as linhas existentes ficam em `'base'`, que é exatamente o comportamento de hoje.
10. WHEN um cliente anônimo lê `product_variants` THEN o `SELECT` SHALL ser permitido **apenas** para variações de produtos ativos (`EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_active)`) — a policy atual é `USING (true)` ([`20260414121021:193`](../../../supabase/migrations/20260414121021_305804ba-a826-4a90-9d43-6c78231e94d7.sql#L193)) e passaria a vazar preço, custo indireto, estoque e SKU de produtos em rascunho.
11. WHEN um cliente anônimo lê `product_categories` ou `product_redirects` THEN o `SELECT` SHALL ser permitido e `INSERT`/`UPDATE`/`DELETE` SHALL exigir `has_role(auth.uid(), 'admin')`.
12. WHEN `products.variants` (JSONB) é removido em migração posterior THEN nenhum código de app SHALL referenciá-lo. *(A remoção em si é `VAR-13`, na [`13`](../13-product-bulk-ops/spec.md); aqui garante-se que esta feature para de **ler**.)*

**Independent Test**: rodar `supabase db reset` com o `seed.sql` atual e conferir por query que
(a) toda linha de `products.variants` tem correspondente em `product_variants` com `is_active = false`,
(b) todo `order_items.variant_id` continua resolvendo e todo `order_items.price_source` vale `'base'`,
(c) `products.images` é `jsonb` com `source` preenchido,
(d) um `SELECT` anônimo em `product_variants` não retorna linhas de produto inativo.

---

### P1.1b — Leitores de `images` acompanham o `jsonb` ⭐ MVP

**User Story**: Como sistema, preciso que toda tela que hoje lê `products.images` como `string[]`
continue funcionando depois que a coluna virar `jsonb`.

**Why P1**: A conversão é destrutiva e existem **12 pontos de leitura** que assumem `string[]`. Sem isto,
a loja e o admin quebram na fase 1 e só voltam três features depois.

**Acceptance Criteria**:

1. WHEN qualquer app precisa das imagens de um produto THEN SHALL usar um único helper puro em `@nanapin/core` que aceite `string[]` **ou** `{url, alt, source}[]` e devolva sempre `{url, alt, source}[]` — tolerar as duas formas evita quebrar por ordem de deploy.
2. WHEN a fase 1 termina THEN os pontos de leitura SHALL estar migrados: `apps/store` — [`useProducts.ts:14-15`](../../../apps/store/src/entities/product/api/useProducts.ts#L14-L15), [`useProduct.ts:20-21`](../../../apps/store/src/entities/product/api/useProduct.ts#L20-L21), [`useRecoverCart.ts:20-21`](../../../apps/store/src/features/recover-cart/model/useRecoverCart.ts#L20-L21), [`useAbandonedCartTracker.ts:44`](../../../apps/store/src/features/abandoned-cart/model/useAbandonedCartTracker.ts#L44), [`CheckoutPage.tsx:121`](../../../apps/store/src/pages/CheckoutPage.tsx#L121), [`ProductGallery.tsx:8`](../../../apps/store/src/entities/product/ui/ProductGallery.tsx#L8), [`CustomPinPage.tsx:396`](../../../apps/store/src/pages/CustomPinPage.tsx#L396); `apps/backoffice` — [`useAdminProducts.ts:25,49`](../../../apps/backoffice/src/entities/product/api/useAdminProducts.ts#L25), [`AdminProductsPage.tsx:99`](../../../apps/backoffice/src/pages/admin/AdminProductsPage.tsx#L99), [`AdminCollectionsPage.tsx:23`](../../../apps/backoffice/src/pages/admin/AdminCollectionsPage.tsx#L23), [`AdminProductFormPage.tsx:91,152`](../../../apps/backoffice/src/pages/admin/AdminProductFormPage.tsx#L91).
3. WHEN um produto tem `images` vazio THEN o helper SHALL devolver lista vazia e as telas SHALL exibir o placeholder atual, sem `undefined` chegando em `src`.
4. WHEN o produto é salvo pelo formulário THEN o payload de `images` SHALL ser `jsonb` — SHALL não gravar `string[]` de volta.

**Independent Test**: rodar `pnpm build && pnpm test` após a migração e abrir a home, a página de produto,
a listagem do admin e o checkout com um produto que tem 3 imagens — nenhuma imagem quebrada.

---

### P1.2 — Preço e estoque por variação ponta a ponta ⭐ MVP

**User Story**: Como lojista, quero que o valor cobrado e o estoque baixado sejam os da **linha
escolhida pelo cliente**, para não vender barato o que a grade cobra caro nem vender o que acabou.

**Why P1**: É o único trecho com risco de dinheiro. Publicar a grade sem isso é prejuízo por pedido.

**Acceptance Criteria**:

1. WHEN o cliente escolhe uma combinação de opções na loja THEN o item do carrinho SHALL guardar o `variant_id` correspondente e SHALL exibir o `price` daquela variação (não `products.base_price`).
2. WHEN dois itens do carrinho têm o mesmo produto e variações diferentes THEN o carrinho SHALL tratá-los como linhas separadas, chaveadas por `variant_id`.
3. WHEN o `cartStore` é reidratado de uma versão anterior do storage THEN os itens antigos SHALL ser descartados com aviso ("sua sacola foi atualizada"), via `persist({ version: 2, migrate })` — hoje o store persiste em `nanapin-cart` **sem** `version` nem `migrate` ([`cartStore.ts:76`](../../../apps/store/src/entities/cart/model/cartStore.ts#L76)) e um carrinho antigo entraria no checkout sem `variant_id`.
4. WHEN o pedido é criado THEN `order_items` SHALL gravar `variant_id`, `price_source` (`'variant'` quando houve variação escolhida, `'base'` caso contrário), `variant_label` (ex.: `4,5 cm · Fosco`) e `variant_options` como **snapshot** — o histórico do pedido SHALL ser legível sem `join` em `product_variants`.
5. WHEN a loja vai criar um pedido E algum item não traz `variant_id` E o produto tem variações ativas THEN a criação SHALL ser bloqueada **antes** do insert em `orders` — a rejeição do `create-payment` é a última linha de defesa, não a primeira, e um pedido gravado que nunca poderá ser pago é um beco sem saída.
6. WHEN `create-payment` recalcula o total THEN o servidor SHALL respeitar o `price_source` **gravado no item**, sem reavaliar se o produto tem variações — assim o preço não muda porque o admin criou ou pausou uma variação entre o pedido e o pagamento.
7. WHEN `price_source = 'variant'` THEN o servidor SHALL usar `product_variants.price` da linha referenciada.
8. WHEN `price_source = 'base'` THEN o servidor SHALL usar `products.base_price`.
9. WHEN o preço de um item não é resolvível no servidor — `variant_id` inexistente, `variant_id` de outro `product_id`, variação com `price IS NULL`, ou `product_id` UUID sem linha em `products` — THEN o servidor SHALL rejeitar com HTTP 422 nomeando o item, sem criar pagamento. SHALL **não** cair no `unit_price` vindo do client, como hoje faz [`handlers.ts:327`](../../../supabase/functions/mercado-pago/handlers.ts#L327).
10. WHEN `create-payment` persiste o recálculo THEN SHALL gravar também os `order_items.unit_price` recalculados e o `orders.subtotal` — hoje só `pix_discount` e `total` são persistidos, o que deixaria o item mostrando 14,90 num pedido que cobrou 18,40.
11. WHEN um produto tem variações ativas mas `products.options` está vazio THEN o produto SHALL ser tratado como produto sem variação (precificado por `base_price`) e a listagem do admin SHALL sinalizá-lo como `grade incompleta` — é o estado em que as variações migradas do `seed` ficam. *(A metade "loja" fecha aqui; o badge da listagem é consumido por `PLS-04` na [`13`](../13-product-bulk-ops/spec.md).)*
12. WHEN `apply_payment_approval` aprova um pedido E o item tem `variant_id` E o produto tem `stock_policy = 'track'` ou `'backorder'` THEN a RPC SHALL descontar a quantidade de `product_variants.stock` da linha vendida (`greatest(stock - qty, 0)` para `track`; sem floor para `backorder`), e **não** de `products.stock_total`.
13. WHEN `apply_payment_approval` aprova um pedido E o produto tem `stock_policy = 'none'` THEN a RPC SHALL não alterar estoque algum daquele produto.
14. WHEN `apply_payment_approval` aprova um item **sem** `variant_id` THEN a RPC SHALL manter a baixa em `products.stock_total`, respeitando a mesma política.
15. WHEN o mesmo webhook chega duas vezes THEN a baixa de estoque SHALL ocorrer exatamente uma vez (idempotência atual via `paid_at is null` preservada — verificada como correta sob concorrência em READ COMMITTED).
16. WHEN um produto tem `stock_policy = 'track'` e uma variação com `stock = 0` THEN a loja SHALL exibir aquela combinação como indisponível e SHALL impedir adicioná-la ao carrinho.
17. WHEN a rejeição 422 por item sem variação (AC 9) é implantada THEN SHALL ficar atrás de uma variável de ambiente da edge function, ligada só depois que o bundle da loja com as ACs 1–5 estiver em produção — a function e o SPA não sobem no mesmo instante, e abas abertas seguem com o bundle antigo.

**Independent Test**: criar produto com 2 variações de preços distintos (14,90 e 18,40), adicionar a de
18,40 ao carrinho, chegar em `create-payment` e conferir que `transaction_amount` usa 18,40 e que
`order_items.unit_price` foi atualizado; simular webhook aprovado e conferir que só a linha de 18,40
teve `stock` decrementado.

---

### P1.2b — A loja honra o modelo novo ⭐ MVP

**User Story**: Como cliente, quero que a loja mostre os eixos, a categoria e a disponibilidade certos —
e que o link que salvei do Instagram continue funcionando.

**Why P1**: São as leituras da loja que o modelo novo torna possíveis. Ficam **aqui**, e não na feature
do formulário, porque quem escreve esses dados é a migração de backfill desta feature — a loja precisa
ler o modelo novo antes de o admin poder editá-lo.

> **Carve-out declarado.** Estas ACs vieram das stories P1.4 (AC 5) e P1.5 (AC 8) da spec original, que
> agora vivem na [`11`](../11-product-form-v2/spec.md). Lá permanecem apenas as metades **de admin**.

**Acceptance Criteria**:

1. WHEN a página do produto é exibida THEN os seletores SHALL ser gerados de `products.options` na ordem de `position` (até 3), no lugar de `sizes`/`finishes`.
2. WHEN o card da vitrine é exibido THEN SHALL mostrar no máximo **2** seletores (os dois primeiros eixos por `position`); com 3 eixos o card SHALL levar para a página do produto (A7).
3. WHEN a loja precisa de **uma** categoria (selo do card, breadcrumb) THEN SHALL usar a de menor `categories.sort_order` entre as do produto; em empate, a de menor `product_categories.position`.
4. WHEN a página de coleção filtra por categoria THEN SHALL consultar `product_categories` — SHALL deixar de filtrar por `.eq('category_id')`.
5. WHEN a loja recebe `/produto/<slug-antigo>` E existe registro em `product_redirects` THEN SHALL redirecionar para o slug atual do produto.
6. WHEN o produto tem `stock_policy = 'none'` THEN a loja SHALL nunca marcá-lo como esgotado, independentemente de saldo.
7. WHEN o produto tem `stock_policy = 'backorder'` THEN a loja SHALL permitir compra com saldo zero ou negativo.

**Independent Test**: publicar um produto com 2 eixos em 2 categorias, conferir o selo do card contra a
de menor `sort_order`; trocar o slug e abrir a URL antiga — deve chegar ao produto.

---

## Edge Cases

- WHEN um pedido antigo referencia uma variação THEN o histórico SHALL continuar legível pelo snapshot `variant_label` / `variant_options` gravado no `order_items`, sem depender de `join`. Excluir a variação continua **proibido**: a FK é `NO ACTION` (a UI que recusa é `PFM-08 AC 9a`, na [`11`](../11-product-form-v2/spec.md)).
- WHEN um pedido pendente criado antes desta feature chega ao pagamento THEN SHALL ser cobrado por `products.base_price`, porque `order_items.price_source` tem `DEFAULT 'base'` nas linhas existentes — o comportamento é idêntico ao de hoje, sem regressão.
- WHEN as colunas `order_items.size` / `order_items.finish` (legadas, de [`20260415090935:68-69`](../../../supabase/migrations/20260415090935_create_orders_and_order_items.sql#L68-L69)) existem em pedidos antigos THEN SHALL continuar sendo lidas na exibição do histórico; pedidos novos preenchem `variant_label` e as legadas ficam nulas.
- WHEN um produto tem variações mas **todas** estão pausadas THEN a loja SHALL tratá-lo como indisponível.
- WHEN `create-payment` encontra `product_id` que não é UUID (pin personalizado) THEN SHALL manter o comportamento atual de usar `unit_price` do item, sem tentar resolver variação (A3).

---

## Requirement Traceability

**Frentes:** A = modelo/schema · E = loja/checkout. A coluna **Melhoria** referencia as 22 melhorias do
artboard *Produtos — sugestões de melhoria e mapa de código* (Paper).

| ID | Requisito | Story | Frente | Melhoria | Fase | Status |
| -- | --------- | ----- | ------ | -------- | ---- | ------ |
| VAR-01 | `product_variants` estendida como fonte de verdade (preço, promo, estoque, SKU, peso, imagem, ativa, posição) | P1.1 | A | 18 | 1 | Done |
| VAR-02 | `products.options jsonb` com os eixos | P1.1 | A | 04 | 1 | Done |
| VAR-03 | `products.stock_policy` (`track`/`backorder`/`none`) | P1.1 | A | 05 | 1 | Done |
| VAR-04 | `products.images` `text[]` → `jsonb {url, alt, source}` | P1.1 | A | 14 | 1 | Done |
| VAR-05 | `product_categories` N:N com backfill | P1.1 | A | 02, 21 | 1 | Done |
| VAR-06 | `product_redirects` | P1.1 | A | 22 | 1 | Done |
| VAR-07 | RLS escopada nas tabelas novas/alteradas | P1.1 | A | — | 1 | Done |
| VAR-08 | Tipos `@nanapin/supabase` alinhados ao schema novo | P1.1 | A | 18 | 1 | Done |
| VAR-09 | `order_items` ganha `price_source`, `variant_label`, `variant_options` | P1.1 | A | 19, 20 | 1 | Done |
| VAR-10 | `products.production_lead_days` | P1.1 | A | 05 | 1 | Done |
| VAR-11 | Helper único de imagens em `@nanapin/core` + 12 leitores migrados | P1.1b | A | 14 | 1, 4 | Done |
| VAR-12 | `base_price` mantido como menor preço ativo da grade (trigger) | P1.1 | A | 18, 19 | 1 | Done |
| PFM-10 | Máscaras BRL / gramas / cm / % — funções puras **e** os 3 inputs (`AD-010`) | P1.2 | A | 06 | 2 | Done |
| PST-01 | `create-payment` precifica por `price_source`, 422 em preço não resolvível, persistência do recálculo | P1.2 | E | 19 | 3 | Done |
| PST-02 | `apply_payment_approval` baixa por variação respeitando `stock_policy` | P1.2 | E | 20 | 3 | Done |
| PST-03 | Pedido grava `variant_id`, `price_source` e snapshot; loja bloqueia pedido sem variação | P1.2 | E | 19 | 3 | Done |
| PST-04 | `cartStore` chaveia e precifica por variação, com `version`/`migrate` | P1.2 | E | 19 | 3 | Done |
| PST-05 | Loja lê eixos genéricos (`options`) no lugar de `sizes`/`finishes` | P1.2b | E | 04 | 4 | Done |
| PST-06 | Vitrine lê categorias N:N; categoria de exibição = menor `sort_order` | P1.2b | E | 21 | 4 | Done |
| PST-07 | `/produto/:slug` resolve `product_redirects` | P1.2b | E | 22 | 4 | Done |
| PST-08 | Disponibilidade da variação na vitrine respeita `stock_policy` | P1.2b | E | 05 | 4 | Done |
| PST-09 | Flag de servidor para a rejeição 422, ligada após o deploy do bundle da loja | P1.2 | E | 19 | 3 | Done |
| PST-10 | Produto com variações ativas e `options` vazio é tratado como sem variação | P1.2 | E | 18 | 3 | Done |

**Coverage:** 23 requisitos · 23 mapeados para tasks · **23 Done** (verificados em [`validation.md`](./validation.md)) em [`tasks.md`](./tasks.md)

**Melhorias do Paper cobertas aqui:** 04 (parcial — a loja lê os eixos; o editor é da `11`) · 05 · 06
(parcial — funções e inputs; os 3 modos na UI são da `11`) · 13 (parcial — só o helper) · 14 (parcial —
só a coluna `jsonb` e os leitores) · 18 · 19 · 20 · 21 (parcial — só a loja) · 22 (parcial — só a loja).

---

## Fases de entrega

A ordem é o guarda-corpo: nada que precifique por variação chega à loja antes de o caixa entender
variação.

| Fase | Conteúdo | Requisitos | Por que nesta ordem |
| ---- | -------- | ---------- | ------------------- |
| **1 — Alicerce** | Migrações, RLS, tipos | VAR-01…VAR-10, VAR-12 | Grade, política, listagem e checkout leem o mesmo modelo |
| **2 — Núcleo e primitivos** | `@nanapin/core` (media, formatters, pricing) + os 3 inputs mascarados | VAR-11 (AC 1), PFM-10, parte de PST-01 | Lógica pura testável antes de qualquer I/O; os inputs são consumidos por 11 **e** 13 (`AD-010`) |
| **3 — Dinheiro** | Checkout, baixa de estoque, carrinho | PST-01…PST-04, PST-09, PST-10 | Único trecho com risco financeiro; entra antes de qualquer preço por variação ser editável |
| **4 — Loja** | Leitores de `images`, eixos, categorias N:N, redirect, disponibilidade | VAR-11 (AC 2, 4), PST-05…PST-08 | Fecha a conversão destrutiva de `images` e entrega as leituras do modelo novo |

---

## Success Criteria

- [ ] Um produto com 2 variações de preços distintos é comprado e pago com o valor **da variação
      escolhida** — divergência de zero centavos entre carrinho, `orders.total` e `transaction_amount`
      do Mercado Pago.
- [ ] Após um webhook aprovado, apenas a variação vendida tem `stock` decrementado; produtos com
      `stock_policy = 'none'` não sofrem baixa alguma.
- [ ] `supabase db reset` com o `seed.sql` atual não deixa nenhum `order_items.variant_id` órfão e
      nenhuma variação migrada ativa sem preço.
- [ ] A home, a página de produto, a listagem do admin e o checkout abrem sem imagem quebrada depois de
      `images` virar `jsonb`.
- [ ] Alterar o slug de um produto publicado não quebra a URL antiga.
- [ ] Nenhum código desta feature lê `products.variants`.
- [x] `pnpm build`, `pnpm test` e o gate de lint continuam na baseline conhecida — sem novos erros
      introduzidos. **Medido no fecho (2026-08-01): 37 err / 16 warn contra a baseline real de
      41/16** (o "28 / 7" escrito aqui na abertura já estava defasado das features 09/10; a queda de
      4 erros veio da consolidação dos mappers duplicados da loja na T18).
