import type { Localized } from '../map/loc.ts'

/**
 * O que a API da Nuvemshop DEVOLVE — não o que a loja gostaria de receber.
 *
 * Cada campo aqui foi confrontado com a resposta real do catálogo da Uma Estrelinha em 2026-08-09
 * (690 produtos, 3.357 variações, 3.660 imagens, 39 categorias). `AD-012` é o motivo de este arquivo
 * ter um teste próprio: tipo escrito à mão é uma AFIRMAÇÃO, não uma verificação — e aqui ele afirma
 * algo sobre um servidor de terceiro, que ninguém controla. `apiShape.test.ts` confronta cada campo
 * usado no mapeamento com bytes que vieram do servidor.
 *
 * Armadilhas medidas, todas visíveis na assinatura abaixo:
 *  - **Preço é STRING** (`"84.00"`), nunca número. Somar sem converter concatena.
 *  - `parent: 0` significa RAIZ. Não é `null`.
 *  - `stock: null` quando `stock_management === false` — 3.181 das 3.357 variações.
 *  - `alt` volta ora como `{ pt }`, ora como `[]`, no mesmo catálogo.
 *  - `tags` é string separada por vírgula, não array.
 *  - `images[].position` começa em **1**, não em 0.
 */

export interface RawCategory {
  id: number
  /** `0` = raiz. Medido: 10 das 39. */
  parent: number
  /** Ids das filhas, **na ordem de exibição** — a única ordenação que a origem expressa. */
  subcategories: number[]
  /** Medido: `'visible'` em todas as 39 hoje. */
  visibility: string
  name: Localized
  /** É o slug. Medido: 39 distintos, zero colisão. */
  handle: Localized
  description: Localized
  seo_title: Localized
  seo_description: Localized
  google_shopping_category?: string
  created_at: string
  updated_at: string
}

export interface RawImage {
  id: number
  product_id: number
  src: string
  /** Começa em 1. */
  position: number
  /** Vazio em 3.640 das 3.660; escrito pela vendedora em 20. */
  alt: Localized
  width?: number
  height?: number
}

export interface RawVariant {
  id: number
  product_id: number
  /** Aponta para `RawImage.id`. Pode ser `null`. */
  image_id: number | null
  position: number
  /** STRING decimal, ex.: `"84.00"`. `null` em 11 das 3.357. */
  price: string | null
  /** Quando presente, é o preço que a loja de fato cobra. Medido em 94 variações. */
  promotional_price: string | null
  /** Medido: **igual** ao preço em 3.346 das 3.357. Só é "de" verdadeiro quando MAIOR. */
  compare_at_price: string | null
  /** `false` = estoque ilimitado (produto sob demanda). Medido em 3.181 das 3.357. */
  stock_management: boolean
  /** `null` quando `stock_management === false`. */
  stock: number | null
  /** STRING decimal em kg, ex.: `"0.030"`. */
  weight: string | null
  width: string | null
  height: string | null
  depth: string | null
  /** Medido: 952 vazios, e 1.466 DUPLICADOS entre os preenchidos. Não é chave nesta loja. */
  sku: string | null
  /** Um valor por eixo de `RawProduct.attributes`, na mesma ordem. Vazio quando não há eixo. */
  values: Localized[]
  visible: boolean
  created_at: string
  updated_at: string
}

export interface RawProduct {
  id: number
  name: Localized
  description: Localized
  /** É o slug. Medido: 690 distintos, zero colisão. */
  handle: Localized
  seo_title: Localized
  seo_description: Localized
  /** Os eixos, ex.: `[{pt:'Com Base'},{pt:'Cor'},{pt:'Com gravação'}]`. Máximo medido: 3. */
  attributes: Localized[]
  /** `false` em 9 dos 690. Entram na loja como `is_active = false`, com o slug preservado. */
  published: boolean
  visibility: string
  free_shipping: boolean
  requires_shipping: boolean
  /** `https://umaestrelinha.com.br/produtos/<handle>/` — note o prefixo no PLURAL. */
  canonical_url: string
  video_url: string | null
  brand: string | null
  /** String separada por vírgula, não array. */
  tags: string
  variants: RawVariant[]
  images: RawImage[]
  /** Categoria completa embutida; o import usa só o `id` e resolve pelo mapa já gravado. */
  categories: RawCategory[]
  created_at: string
  updated_at: string
}
