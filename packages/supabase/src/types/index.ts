// === DB types (mirror Supabase tables) ===

/**
 * O card promocional do menu, como gravado em `categories.menu_promo` (jsonb).
 *
 * `category_id` é obrigatório porque o card **aponta para uma coleção de verdade**, não para uma URL
 * digitada: link com typo deixa de ser possível e a contagem ("12 pins") sai da view
 * `category_product_counts`. O preço é que a referência mora dentro de jsonb, onde **não cabe FK** —
 * apagar o destino não dispara `on delete set null`. Por isso quem lê **precisa** resolver o destino
 * em runtime (`resolvePromo`, em `@estrelinha/core/menu`); é critério de aceite, não zelo.
 *
 * `title` e `subtitle` ausentes caem no nome e na descrição da categoria de destino.
 */
export interface MenuPromo {
  category_id: string
  badge?: string
  title?: string
  subtitle?: string
}

/**
 * `show_in_menu` e `menu_promo` nasceram na migration `20260803120000_16-store-menu.sql`, e a
 * gravação das duas foi **provada por probe HTTP** antes desta linha existir (`AD-012`): `PATCH` com
 * `Prefer: return=representation` devolvendo os valores persistidos, não `PGRST204`.
 *
 * O `return=representation` não é detalhe: o primeiro probe devolveu **204 sem gravar nada**, porque
 * PostgREST responde 204 a um update que casou zero linhas sob RLS. Um probe que só olha o status
 * teria "provado" uma coluna que não existia.
 */
export interface DbCategory {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  banner_url: string | null
  color_accent: string | null
  active: boolean
  sort_order: number
  parent_id: string | null
  /** Ocupa uma das 4 vagas da barra do topo da loja. Vale em qualquer profundidade da árvore. */
  show_in_menu: boolean
  menu_promo: MenuPromo | null
}

// `DbCollection` e `CollectionRule` foram removidos na feature 16.
//
// Descreviam `public.collections` — uma tabela que **nunca existiu**: não estava em migration
// nenhuma, nem em `.lovable/sql/`, nem no banco (`PGRST205`). A tela `/admin/colecoes` inteira
// caía nesse erro e o hook o engolia (`setCollections([])`), então ela mostrava grade vazia para
// sempre, em qualquer ambiente. Terceira ocorrência do `AD-012`, e a pior: nas outras duas
// (`DbCategory`, `DbAbandonedCart`) ao menos existia DDL em algum lugar.
//
// E o conceito já tinha dono. Na loja, **coleção é a categoria**: `/colecao/:slug` renderiza
// `CategoryPage` a partir de `categories`, o widget da home se chama "Coleções" e o 404 diz
// "Coleção não encontrada". `categories` ainda faz tudo o que `collections` prometia — e melhor:
// vínculo N:N **ordenado** por `product_categories` (contra `product_ids text[]`), hierarquia por
// `parent_id`, e uma página de verdade. O único recurso exclusivo era conjunto por regra
// (`type: 'auto'`); virou backlog "categoria automática" na spec da 16, e os cinco campos que as
// regras liam (`is_featured`, `is_new`, `compare_price`, `created_at`, `stock_total`) seguem sendo
// colunas reais de `products`.

// === Modelo de produto: variação como fonte de verdade (feature 07) ===

/** Como a loja decide se pode vender. `none` é o modo dos personalizados. */
export type StockPolicy = 'track' | 'backorder' | 'none'

/**
 * De onde a imagem veio (PMD-03). É a origem gravada em `products.images`, não uma capacidade do
 * produto: `mockup` sobrevive à remoção do estúdio (feature 20, PIN-01) porque descreve linhas que
 * já existem — `normalizeImages` cai em `upload` para qualquer valor fora desta lista.
 */
export type ImageSource = 'upload' | 'mockup' | 'import'

/** Os eixos desta variação: `{ Tamanho: '4,5 cm', Acabamento: 'Fosco' }`. */
export type OptionValues = Record<string, string>

/** Um eixo de escolha do produto. Máximo de 3 por produto (regra de UI). */
export interface ProductOption {
  name: string
  values: string[]
  position: number
}

export interface ProductImage {
  url: string
  alt: string | null
  source: ImageSource
}

/**
 * Uma linha vendável — o que o cliente de fato compra.
 *
 * Espelha `public.product_variants` **depois** da migration `20260801120000`.
 * O formato anterior (`{ size, finish, stock, sku? }`) vivia no JSONB `products.variants`, que não
 * tinha preço — coluna removida em `VAR-13` (migration `20260801140000`).
 */
export interface ProductVariant {
  id: string
  product_id: string
  option_values: OptionValues
  name: string | null
  sku: string | null
  /** `null` = variação sem preço: não é vendável e bloqueia a publicação. */
  price: number | null
  compare_price: number | null
  stock: number
  /** Quando `null`, vale o `weight_kg` do produto. */
  weight_kg: number | null
  image_url: string | null
  is_active: boolean
  position: number
}

export interface DbProduct {
  id: string
  /** @deprecated A verdade é `category_ids` (`product_categories`, N:N). Mantida até PST-06/PFM-05. */
  category_id: string
  name: string
  slug: string
  description: string
  price: number
  compare_price: number | null
  cost_price: number | null
  /** `text[]` virou `jsonb` na migration `20260801120200`. Leia sempre via `normalizeImages`. */
  images: ProductImage[]
  /** Os eixos do produto, na ordem de `position`. Até 3. */
  options: ProductOption[]
  stock_policy: StockPolicy
  /** Dias úteis. Só exibição — não entra na cotação de frete (A6). */
  production_lead_days: number | null
  /** Derivado de `product_categories`, na ordem de `position`. */
  category_ids: string[]
  /** @deprecated Legado para produto SEM variação. Produto com grade nunca baixa daqui. */
  stock_total: number
  low_stock_threshold: number
  is_active: boolean
  is_featured: boolean
  is_new: boolean
  tags: string[]
  seo_title: string | null
  seo_description: string | null
  video_url: string | null
  weight_kg: number | null
  width_cm: number | null
  height_cm: number | null
  length_cm: number | null
  scheduled_at: string | null
  related_product_ids: string[]
  buy_together_ids: string[]
  /** As variações vindas da tabela `product_variants`. O JSONB legado saiu em `VAR-13`. */
  variants: ProductVariant[]
  created_at: string
}

// === Payment (Mercado Pago) ===

export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'expired'
  | 'cancelled'

export interface CardPaymentFormData {
  token: string
  installments: number
  payment_method_id: string
  issuer_id: string | number
  transaction_amount: number
  payer: {
    email: string
    identification?: { type: string; number: string }
  }
}

export interface CreatePaymentRequest {
  order_id: string
  method: 'pix' | 'card'
  idempotency_key: string
  card?: CardPaymentFormData
}

export interface PixPaymentResponse {
  qr_code: string
  qr_code_base64: string | null
  expires_at: string
}

export interface CardPaymentResponse {
  status: string
  status_detail: string
}

export type CreatePaymentResponse = PixPaymentResponse | CardPaymentResponse

export interface DbOrder {
  id: string
  order_number: string
  customer_id: string | null
  customer_name: string
  customer_email: string
  status: string
  payment_method: string
  payment_status: PaymentStatus
  mp_payment_id: string | null
  mp_status_detail: string | null
  paid_at: string | null
  pix_discount: number
  address_street: string | null
  address_number: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  address_complement: string | null
  subtotal: number
  discount: number
  shipping_cost: number
  total: number
  tracking_code: string | null
  shipping_carrier: string | null
  cancel_reason: string | null
  melhor_envio_id: string | null
  melhor_envio_label_url: string | null
  melhor_envio_protocol: string | null
  coupon_code: string | null
  coupon_id: string | null
  created_at: string
}

export interface DbOrderStatusHistory {
  id: string
  order_id: string
  from_status: string | null
  to_status: string
  note: string | null
  created_by: string | null
  created_at: string
}

export interface DbOrderNote {
  id: string
  order_id: string
  note: string
  created_by: string | null
  created_at: string
}

/** Como o item foi precificado. **Congelado no pedido** — o servidor respeita
 *  o valor gravado e não reavalia se o produto tem grade (A8). */
export type PriceSource = 'base' | 'variant'

export interface DbOrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_image: string | null
  /** @deprecated Pedidos novos preenchem `variant_label`. Mantido para o histórico antigo. */
  size: string | null
  /** @deprecated Pedidos novos preenchem `variant_label`. Mantido para o histórico antigo. */
  finish: string | null
  variant_id: string | null
  price_source: PriceSource
  /** Snapshot legível: `4,5 cm · Fosco`. O histórico não depende de join. */
  variant_label: string | null
  /** Snapshot de `option_values` no momento da compra. */
  variant_options: OptionValues | null
  quantity: number
  unit_price: number
}

// === Frontend types (used by storefront components) ===

export interface Product {
  id: string
  name: string
  slug: string
  price: number
  compare_price: number | null
  category_id: string
  category_slug: string
  description: string
  /** A URL da imagem principal, ou `''`. Derivada de `images` por `primaryImage`. */
  image_url: string
  /**
   * `products.images` é `jsonb [{url, alt, source}]` desde a migration `20260801120200`.
   * Era `string[]` aqui também; o tipo mudou de propósito na T17 para que **o compilador**
   * aponte cada leitor cru em vez de a tela mostrar `src="[object Object]"`.
   * A conversão de qualquer forma de entrada é de `normalizeImages` (`@estrelinha/core/media`).
   */
  images: ProductImage[]
  /** Os eixos de escolha, na ordem de `position`. Vazio = produto sem grade. */
  options: ProductOption[]
  /** As linhas vendáveis, de `product_variants`. Vazio = produto sem grade. */
  variants: ProductVariant[]
  /** Decide se a loja pode marcar o produto como esgotado (PST-08). */
  stock_policy: StockPolicy
  /**
   * As categorias do produto, de `product_categories` (N:N), com a `position` do vínculo.
   * A categoria **de exibição** (selo, breadcrumb) é derivada por `displayCategory`, nunca
   * escolhida arbitrariamente daqui.
   */
  category_links: ProductCategoryLink[]
  stock_total: number
  low_stock_threshold: number
  is_new: boolean
  is_featured: boolean
  tags: string[]
  weight_kg?: number
  width_cm?: number
  height_cm?: number
  length_cm?: number
}

/** Um vínculo produto↔categoria. `position` é a ordem que o admin arrastou (PST-06 AC 3). */
export interface ProductCategoryLink {
  category_id: string
  position: number
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  color_accent: string | null
  emoji: string
  parent_id: string | null
  /** Ordem editorial da categoria. É o **primeiro** critério da categoria de exibição (PST-06). */
  sort_order: number
  /**
   * A loja carrega `active` **explicitamente** desde a 16, e não confia só na RLS.
   *
   * `public read categories using (active = true)` esconde a categoria oculta da cliente — mas a
   * policy `admin full categories` é `FOR ALL`, então um admin logado **na loja** veria no menu uma
   * categoria que ninguém mais vê. Filtrar no domínio faz as duas sessões enxergarem o mesmo menu.
   */
  active: boolean
  /** Ocupa uma vaga na barra do topo (feature 16). Curadoria em `/admin/menu`. */
  show_in_menu: boolean
  menu_promo: MenuPromo | null
}

export interface CartItem {
  product: Product
  size: string
  finish: string
  quantity: number
}

export interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  items: OrderItem[]
}

export interface OrderItem {
  id: string
  productName: string
  size: string | null
  finish: string | null
  quantity: number
  unitPrice: number
}

// === Frete (Melhor Envio) ===

export * from './shipping'

// === Promoções (desconto progressivo por quantidade) ===

export * from './promotion'
