// === DB types (mirror Supabase tables) ===

/**
 * O card promocional do menu, como gravado em `categories.menu_promo` (jsonb).
 *
 * **A declaração mora em `@estrelinha/core/menu` e é reexportada aqui** (feature 33). O tipo estava
 * neste arquivo e era importado por `core/menu/menu.ts` — o que tornava `core/menu` **inalcançável
 * pelo Deno**: ele resolve o grafo de tipos também, e um especificador nu (`@estrelinha/supabase/...`)
 * derruba o worker com `Failed resolving types` antes da primeira linha rodar. Medido em 2026-08-29,
 * na primeira execução da function do sitemap.
 *
 * A inversão é a resposta certa e não um contorno: quem **usa** este tipo é a regra do menu, que
 * vive em `core`; este pacote só descreve a coluna que o guarda. Duplicá-lo aqui daria dois donos ao
 * mesmo formato, que é o "defeito 01" do projeto.
 *
 * `category_id` é obrigatório porque o card **aponta para uma coleção de verdade**, não para uma URL
 * digitada: link com typo deixa de ser possível e a contagem ("12 pins") sai da view
 * `category_product_counts`. O preço é que a referência mora dentro de jsonb, onde **não cabe FK** —
 * apagar o destino não dispara `on delete set null`. Por isso quem lê **precisa** resolver o destino
 * em runtime (`resolvePromo`, em `@estrelinha/core/menu`); é critério de aceite, não zelo.
 *
 * `title` e `subtitle` ausentes caem no nome e na descrição da categoria de destino.
 */
export type { MenuPromo } from '../../../core/src/menu/menu.ts'
import type { MenuPromo } from '../../../core/src/menu/menu.ts'

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
  /**
   * A taxonomia do Google herdada pelos produtos desta categoria (feature 30, `GSH-23`).
   *
   * `null` = não define; o produto cai no padrão da loja. Precedência: produto > categoria > loja,
   * aplicada por `resolveOffer` — ninguém lê a coluna crua.
   *
   * **Provada por probe HTTP contra o banco antes de existir aqui** (`AD-012`): tipo escrito à mão é
   * afirmação, e `DbCategory` já custou `PGRST204` em toda gravação de categoria uma vez.
   */
  google_product_category?: string | null
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
  /**
   * O id da variação na Nuvemshop. `null` = linha criada no admin.
   *
   * É a **identidade pública** da linha (feature 30): o `<g:id>` do feed do Google Shopping e o
   * valor do `?variant=` que a cliente traz ao clicar num anúncio. Quem a lê é
   * `publicVariantId` (`@estrelinha/core/shopping`), nunca a coluna crua.
   */
  nuvemshop_id?: number | null
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
  /**
   * O **RECADO DA CLIENTE**, escrito por ela no checkout — `PED-11`, feature 34.
   *
   * A coluna existe desde a migration inicial (2026-04-14) e **nunca esteve neste tipo**, então
   * nunca chegou a tela nenhuma do painel: o que a cliente escreveu simplesmente não era lido. Foi
   * conferida contra o `information_schema` do banco local antes de ser declarada aqui — tipo
   * escrito à mão é afirmação, não verificação (`AD-012`).
   *
   * ⚠️ **Não confundir com `order_notes`**, que é nota **interna** da Adri e a cliente nunca vê. A
   * tela rotula as duas com a origem explícita, pelo mesmo motivo que separa os dois rastreios.
   */
  notes: string | null
  /**
   * Feature 22 — o estado do material, **independente** do de pagamento (`MAT-08 AC 5`).
   *
   * Só muda por RPC guardada (`set_material_status`, `set_material_tracking`). Um `update` direto
   * nesta coluna pelo backoffice contornaria a máquina de estado inteira.
   */
  material_status?: string
  /**
   * A remessa **DE ENTRADA** (cliente → ateliê): o envelope com o material.
   *
   * ⚠️ **Não confundir com `tracking_code`**, que é a de saída (ateliê → cliente) e alimenta o
   * e-mail `order_shipped`. Trocar as duas faria "postamos sua joia" sair com o código do envelope
   * que a cliente mandou.
   */
  material_tracking_code?: string | null
  material_received_at?: string | null
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

/**
 * Nota **interna** sobre a cliente — `CLI-10`, feature 34. A cliente nunca vê, e a tela escreve isso.
 *
 * `customer_id` aponta para o id de `customer_directory`, que **inclui a convidada** e por isso não
 * é FK para `customers`: a convidada não tem cadastro, e uma FK tornaria impossível anotar
 * exatamente sobre quem o painel mais precisa anotar.
 */
export interface DbCustomerNote {
  id: string
  customer_id: string
  note: string
  created_by: string | null
  created_at: string
}

/**
 * Uma linha de `public.addresses`. A tabela existe desde a migration inicial e **o painel nunca a
 * leu** — só a loja (`useDefaultAddress`, `useSaveAddress`). `CLI-09` a traz para a ficha.
 */
export interface DbAddress {
  id: string
  customer_id: string
  label: string | null
  cep: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  is_default: boolean | null
  created_at: string | null
}

/**
 * Uma pessoa da lista de Clientes — a view `customer_directory`.
 *
 * **`public.customers` não é a lista de clientes da loja.** Aquela tabela só recebe linha do trigger
 * `on_auth_user_created_customer`, que dispara em `auth.users`: quem comprou como convidada nunca
 * aparece ali, porque o checkout grava `orders.customer_id = null` e não cria cadastro.
 *
 * `has_account = false` é a convidada, e o `id` dela é `md5(lower(email))::uuid` — determinístico e
 * estável, então `/admin/clientes/:id` funciona igual para as duas.
 */
export interface DbCustomerDirectory {
  id: string
  user_id: string | null
  name: string | null
  email: string
  cpf: string | null
  phone: string | null
  created_at: string | null
  has_account: boolean
}

/**
 * O agregado por pessoa — a view `customer_stats`. `CLI-03`..`CLI-06`.
 *
 * **É view, nunca coluna**: materializar daria um segundo dono do número, e qualquer importação o
 * desatualizaria em silêncio (mesma decisão de `faq_usage` na feature 28).
 *
 * ⚠️ `orders_paid` e `total_spent` contam **só `payment_status = 'approved'`**, e `orders_total`
 * conta tudo. Os dois existem de propósito: um número de dinheiro que inclui Pix expirado não é um
 * número de dinheiro, e a tela **declara o critério em texto** para ele não ter dois donos.
 *
 * `avg_ticket` é `null`, e não `0`, para quem nunca teve pedido pago — "ticket R$ 0,00" é uma
 * afirmação falsa sobre quem nunca comprou.
 *
 * As contagens chegam como `number` pelo PostgREST, apesar de serem `bigint` no banco.
 */
export interface DbCustomerStats {
  customer_id: string
  orders_paid: number
  orders_total: number
  total_spent: number
  avg_ticket: number | null
  first_order_at: string | null
  last_order_at: string | null
  /** O último pedido de **qualquer** estado — é o "em aberto" da coluna Última compra (`CLI-05`). */
  last_activity_at: string | null
  orders_with_material: number
  material_kinds: string[]
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
  /**
   * Feature 22 — **snapshot**, redundante em relação a `products` de propósito: mudar a exigência no
   * cadastro não pode alterar pedido já criado (`MAT-05`).
   */
  requires_material?: boolean
  material_kinds?: string[]
  /** O texto pedido para gravar. Sobrevive a uma mudança do limite no cadastro. */
  engraving_text?: string | null
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
  /**
   * Feature 22 — o material afetivo é propriedade do PRODUTO, não escolha de compra.
   *
   * **`requires_material` e `material_kinds` são DOIS dados.** Lista vazia com `requires_material`
   * verdadeiro é a peça de material livre: exige, entra na fila, e a escolha acontece no WhatsApp.
   * Ler "lista vazia ⇒ não exige" apagaria exatamente essa peça — use `requiresMaterial()` e
   * `materialSummary()` de `@estrelinha/core/material`, nunca comparação crua.
   *
   * `null` em `requires_material` significa "nunca decidido" e lê como `false`.
   *
   * `material_kinds` é `string[]`, e **não** o union `MaterialKind[]`, de propósito: tipá-lo aqui
   * faria `@estrelinha/supabase` importar de `@estrelinha/core`, que já importa daqui — ciclo entre
   * pacotes por causa de um tipo. A lista chega normalizada por `toMaterialKinds` no mapeador da
   * loja, e as funções de `@estrelinha/core/material` aceitam `readonly string[]` e filtram o que
   * não reconhecem.
   *
   * Os três são **opcionais** no tipo, como `weight_kg` e as dimensões já eram: ausente e `null`
   * significam a mesma coisa aqui ("não exige" / "sem teto declarado"), e todo consumidor passa por
   * `requiresMaterial()`, `materialKindsOf()` ou `engravingLimit()`, que tratam os dois casos.
   */
  requires_material?: boolean | null
  material_kinds?: string[]
  /** Teto do texto de gravação desta peça. Ausente ou `null` cai em `DEFAULT_ENGRAVING_MAX_CHARS`. */
  engraving_max_chars?: number | null
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
  /**
   * A imagem larga da categoria. Na loja ela é a **curadoria da grade de banners da home**: quem
   * sobe um banner em `/admin/categorias` está dizendo que aquela linha merece vitrine.
   *
   * A coluna existe desde `20260801150000_categories-hierarchy-and-counts.sql` e o admin já a
   * grava; ela só não chegava à loja porque o mapper de `useCategories` a descartava.
   */
  banner_url: string | null
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

// === Home gerenciável (a composição da Home como dado) ===

export * from './home'
