import type { RawProduct } from '../nuvemshop/types.ts'
import { loc } from './loc.ts'
import { decimal, effectivePrice } from './price.ts'

/** Um eixo de escolha, na forma que `products.options` guarda. */
export interface ProductOption {
  name: string
  values: string[]
  position: number
}

/** Uma linha de `public.products`, sem as imagens (que dependem do Storage) nem o `id` local. */
export interface ProductRow {
  nuvemshop_id: number
  name: string
  slug: string
  description: string | null
  is_active: boolean
  seo_title: string | null
  seo_description: string | null
  video_url: string | null
  options: ProductOption[]
  stock_policy: 'track' | 'backorder' | 'none'
  /** Semente para o `NOT NULL`. Depois do insert das variações, o trigger do banco é o dono. */
  base_price: number
  /**
   * Saldo do produto SEM grade — e não é campo legado que dá para ignorar.
   *
   * A loja decide "esgotado" com `hasSellableGrid`, que exige `options.length > 0`
   * (`entities/product/lib/availability.ts:17`). Produto **sem eixo** não tem grade, então a
   * disponibilidade dele sai de `products.stock_total`, não do saldo da variação. E a baixa em
   * `apply_payment_approval` segue a mesma divisão: item sem `variant_id` desconta daqui.
   *
   * Deixar em 0 fez **60 produtos com estoque real aparecerem como "Indisponível"** no primeiro
   * import — achado ao abrir a página de produto, não por teste.
   */
  stock_total: number
  weight_kg: number | null
  width_cm: number | null
  height_cm: number | null
  length_cm: number | null
  /** Ids da Nuvemshop; o layer de escrita resolve para uuid e grava em `product_categories`. */
  category_nuvemshop_ids: number[]
}

export type SkipReason = 'sem_nome' | 'sem_preco'

/**
 * Discriminado por literal de **string**, e não por booleano: com `strictNullChecks: false` — que é
 * o modo deste repositório — união discriminada por literal booleano **não estreita**, e ler o campo
 * do outro ramo vira TS2339. Registrado no `CLAUDE.md`.
 */
export type ProductMapping =
  | { kind: 'product'; row: ProductRow }
  | { kind: 'skip'; reason: SkipReason; slug: string; nuvemshop_id: number }

/**
 * Os eixos do produto, com os valores DISTINTOS que as variações de fato usam.
 *
 * `attributes` dá só os nomes (`[{pt:'Cor'},{pt:'Com gravação'}]`); os valores vivem em
 * `variants[].values`, na mesma ordem. Medido: `values.length === attributes.length` em todos os
 * 690 produtos, e no máximo 3 eixos — o mesmo teto que a UI da loja impõe.
 *
 * A ordem é a de **primeira aparição**, e não alfabética: é a ordem em que a Adri montou a grade, e
 * é ela que a loja vai exibir nos chips do `VariantPicker`.
 */
const buildOptions = (raw: RawProduct): ProductOption[] =>
  raw.attributes.map((attr, index) => {
    const values: string[] = []
    for (const variant of raw.variants) {
      const value = loc(variant.values[index])
      if (value !== '' && !values.includes(value)) values.push(value)
    }
    return { name: loc(attr), values, position: index }
  })

/**
 * `stock_policy` a partir de como a origem gerencia o estoque.
 *
 * `stock_management: false` significa estoque ilimitado na Nuvemshop — medido em 3.181 das 3.357
 * variações, o que faz sentido num negócio que produz sob encomenda com o material da cliente. O
 * equivalente exato no schema da loja é `'none'` ("nunca esgota — personalizados e sob demanda").
 *
 * `'backorder'` (vender no negativo) **nunca** é inferido: a origem não expressa essa intenção, e
 * inventá-la faria a loja aceitar pedido de peça que a Adri não vai produzir.
 */
const stockPolicy = (raw: RawProduct): 'track' | 'none' =>
  raw.variants.every(v => v.stock_management === false) ? 'none' : 'track'

export const mapProduct = (raw: RawProduct): ProductMapping => {
  const slug = loc(raw.handle)
  const name = loc(raw.name)

  if (name === '') {
    return { kind: 'skip', reason: 'sem_nome', slug, nuvemshop_id: raw.id }
  }

  const precos = raw.variants.map(effectivePrice).filter((p): p is number => p !== null)
  if (precos.length === 0) {
    // `products.base_price` é NOT NULL e não tem default: sem nenhum preço não há linha a gravar.
    return { kind: 'skip', reason: 'sem_preco', slug, nuvemshop_id: raw.id }
  }

  // Peso e dimensões são POR VARIAÇÃO na origem; o produto guarda os da primeira, como referência
  // de frete. A cotação real usa a variação escolhida.
  const primeira = raw.variants[0]

  return {
    kind: 'product',
    row: {
      nuvemshop_id: raw.id,
      name,
      slug,
      description: loc(raw.description) || null,
      is_active: raw.published === true,
      seo_title: loc(raw.seo_title) || null,
      seo_description: loc(raw.seo_description) || null,
      video_url: raw.video_url || null,
      options: buildOptions(raw),
      stock_policy: stockPolicy(raw),
      base_price: Math.min(...precos),
      // Soma só das linhas VENDÁVEIS, que é a mesma condição do `is_active` da variação: uma linha
      // pausada ou sem preço não é saldo que a loja possa vender.
      stock_total: raw.variants
        .filter(v => v.visible === true && effectivePrice(v) !== null)
        .reduce((total, v) => total + (v.stock ?? 0), 0),
      weight_kg: decimal(primeira?.weight),
      width_cm: decimal(primeira?.width),
      height_cm: decimal(primeira?.height),
      length_cm: decimal(primeira?.depth),
      category_nuvemshop_ids: raw.categories.map(c => c.id),
    },
  }
}
