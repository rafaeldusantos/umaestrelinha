// Promoção de desconto progressivo por quantidade (feature 17).
//
// `AD-012` — TIPO ESCRITO À MÃO É AFIRMAÇÃO, NÃO VERIFICAÇÃO. As três interfaces abaixo não foram
// escritas de memória nem a partir do `design.md`: foram derivadas do `information_schema` do banco
// local **depois** de as migrations `20260803130000` / `20260803130100` / `20260803130200` rodarem do
// zero, e a gravação de cada tabela foi provada por probe HTTP na mesma sessão (criar promoção +
// faixas + vínculos pela RPC `upsert_promotion`, ler de volta pelo PostgREST).
//
// Isso importa porque a alternativa já custou caro três vezes neste repo: `DbCategory` declarou
// `parent_id`/`banner_url`/`color_accent` por meses sem que o banco as tivesse (toda gravação de
// categoria falhava com `PGRST204`), `DbAbandonedCart` descrevia uma tabela que não existia em
// migration nenhuma, e `DbCollection` descrevia uma que nunca existiu em lugar nenhum. Em todos os
// casos o `tsc` achou o código certo — porque o tipo mentia — e só um probe contra o banco real
// acusou.
//
// Snapshot do schema conferido (ordem e nulidade incluídas):
//
//   promotions            id uuid NN · name text NN · type text NN d'progressive_qty' ·
//                         scope text NN d'categories' · discount_kind text NN ·
//                         stacks_with_coupon bool NN dfalse · is_kit_showcase bool NN dfalse ·
//                         active bool NN dtrue · valid_from timestamptz NULL ·
//                         valid_until timestamptz NULL · created_at timestamptz NN dnow() ·
//                         updated_at timestamptz NN dnow()
//   promotion_tiers       id uuid NN · promotion_id uuid NN · min_qty integer NN · value numeric NN
//   promotion_categories  promotion_id uuid NN · category_id uuid NN   (PK composta)

/**
 * Como a faixa interpreta `promotion_tiers.value`.
 *
 * `unit_price` — `value` é o preço que a unidade passa a custar.
 * `percent`    — `value` é o percentual de desconto, restrito a 1–90 pelo trigger
 *                `validate_promotion_tier()`. O limite é trigger e não `check` porque o intervalo
 *                válido depende de `discount_kind`, que mora na tabela-mãe.
 *
 * Em nenhum dos dois a faixa pode AUMENTAR o preço (A10): quem lê aplica `min(cheio, faixa)`.
 */
export type PromotionDiscountKind = 'unit_price' | 'percent'

/**
 * Alcance da promoção.
 *
 * `categories` — vale para os produtos das categorias vinculadas em `promotion_categories` **e de
 *                toda a descendência delas** (A9), resolvido pela view `promotion_eligible_products`.
 *                Sem nenhum vínculo, não desconta de ninguém — nunca vira "toda a loja".
 * `all`        — vale para o pedido inteiro; a lista de elegíveis é ignorada.
 *
 * Escopo por produto avulso **não existe** nesta versão (A8): o editor renderiza o segmento
 * `Produtos` desabilitado, e a coluna não tem o valor.
 */
export type PromotionScope = 'all' | 'categories'

/** Uma faixa: "a partir de `min_qty` unidades, `value`". `min_qty >= 2` e único por promoção. */
export interface DbPromotionTier {
  id: string
  promotion_id: string
  /** `integer not null check (min_qty >= 2)`. Faixa de 1 unidade seria mudança de preço, não promoção. */
  min_qty: number
  /** `numeric(10,2) not null check (value > 0)`. Lido conforme `promotions.discount_kind`. */
  value: number
}

export interface DbPromotion {
  id: string
  name: string
  /** `check (type = 'progressive_qty')` — o enum só abre quando um segundo tipo tiver AC (`AD-011`). */
  type: 'progressive_qty'
  scope: PromotionScope
  discount_kind: PromotionDiscountKind
  /** Opt-in por promoção (`AD-015`). Desligado ⇒ vale o melhor dos dois; ligado ⇒ o cupom compõe. */
  stacks_with_coupon: boolean
  /** Qual regra a tela "Monte seu kit" (feature 18) exibe. No máximo uma linha marcada no banco. */
  is_kit_showcase: boolean
  active: boolean
  valid_from: string | null
  valid_until: string | null
  created_at: string
  updated_at: string
}

/** Vínculo de escopo. PK composta `(promotion_id, category_id)`, FK real com `on delete cascade`. */
export interface DbPromotionCategory {
  promotion_id: string
  category_id: string
}

/**
 * Uma linha da view `promotion_eligible_products` — o par (promoção, produto) que a CTE recursiva
 * produz a partir de `promotion_categories` mais **toda a descendência** das categorias vinculadas
 * (A9). `select distinct`, então o par nunca repete.
 *
 * É a **única** fonte de elegibilidade nos dois lados (D1): a edge function a lê no `create-payment`
 * e a loja a lê em `useActivePromotions`. Ler `Product.category_links` em vez dela seria decidir
 * dinheiro por um snapshot de `localStorage` que pode ter dias.
 *
 * Existe como tipo próprio porque a alternativa era `any` na chamada do PostgREST, e `any` no
 * caminho do pagamento não passa da baseline de lint (`CLAUDE.md`).
 */
export interface DbPromotionEligibleProduct {
  promotion_id: string
  product_id: string
}
