// Normalização da FORMA do produto vindo do banco — domínio puro, sem I/O.
//
// Por que em `core` e não dentro de cada app: a loja e o backoffice leem as MESMAS colunas
// (`products.options`, `product_variants`, `product_categories`) e precisam concordar sobre o que
// cada linha significa. Se o admin considerasse vendável uma variação que a loja descarta — ou o
// contrário — o lojista publicaria uma grade que a vitrine não mostra, sem nenhum erro em lugar
// nenhum. Foi o mesmo raciocínio que colocou `resolveItemPrice` aqui na feature 07.
//
// Regra de ouro, herdada de `normalizeImages`: NUNCA lança. Um `options` corrompido faz o produto
// perder os seletores, não a página.

import type {
  OptionValues,
  ProductCategoryLink,
  ProductOption,
  ProductVariant,
  StockPolicy,
} from '@estrelinha/supabase/types'

const STOCK_POLICIES: readonly StockPolicy[] = ['track', 'backorder', 'none']

/** `stock_policy` desconhecida cai em `track` — é o default da coluna e o mais conservador. */
export const toStockPolicy = (value: unknown): StockPolicy =>
  typeof value === 'string' && (STOCK_POLICIES as readonly string[]).includes(value)
    ? (value as StockPolicy)
    : 'track'

/** `option_values` só aceita par eixo→valor com string não vazia dos dois lados. */
export const toOptionValues = (raw: unknown): OptionValues => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: OptionValues = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string' && value !== '') out[key] = value
  }
  return out
}

/** Eixo sem `name` ou sem `values` não é eixo: viraria um seletor vazio e sem rótulo. */
export const normalizeOptions = (raw: unknown): ProductOption[] => {
  if (!Array.isArray(raw)) return []
  const out: ProductOption[] = []
  raw.forEach((entry, index) => {
    if (entry === null || typeof entry !== 'object') return
    const o = entry as Record<string, unknown>
    if (typeof o.name !== 'string' || o.name.trim() === '') return
    const values = Array.isArray(o.values)
      ? o.values.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      : []
    if (values.length === 0) return
    out.push({
      name: o.name.trim(),
      values,
      position: typeof o.position === 'number' && Number.isFinite(o.position) ? o.position : index,
    })
  })
  return out
}

/**
 * Linhas de `product_variants`. Sem `id` a linha é inútil — o `variant_id` do pedido vem dela, e
 * uma variação sem id viraria um item que o `create-payment` recusa com 422.
 */
export const normalizeVariants = (raw: unknown, productId: string): ProductVariant[] => {
  if (!Array.isArray(raw)) return []
  const out: ProductVariant[] = []
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue
    const v = entry as Record<string, unknown>
    if (typeof v.id !== 'string' || v.id === '') continue
    out.push({
      id: v.id,
      product_id: typeof v.product_id === 'string' ? v.product_id : productId,
      option_values: toOptionValues(v.option_values),
      name: typeof v.name === 'string' ? v.name : null,
      sku: typeof v.sku === 'string' ? v.sku : null,
      price: typeof v.price === 'number' && Number.isFinite(v.price) ? v.price : null,
      compare_price:
        typeof v.compare_price === 'number' && Number.isFinite(v.compare_price)
          ? v.compare_price
          : null,
      stock: typeof v.stock === 'number' && Number.isFinite(v.stock) ? v.stock : 0,
      weight_kg:
        typeof v.weight_kg === 'number' && Number.isFinite(v.weight_kg) ? v.weight_kg : null,
      image_url: typeof v.image_url === 'string' ? v.image_url : null,
      // Ausente vira pausada, não ativa: uma linha sem `is_active` legível não deve entrar na loja
      // sem que alguém tenha dito que ela entra.
      is_active: v.is_active === true,
      position: typeof v.position === 'number' && Number.isFinite(v.position) ? v.position : 0,
    })
  }
  return out
}

/**
 * Os vínculos N:N do produto. Linha sem `category_id` legível é descartada: viraria um candidato de
 * selo que nenhuma categoria resolve.
 */
export const normalizeCategoryLinks = (raw: unknown): ProductCategoryLink[] => {
  if (!Array.isArray(raw)) return []
  const out: ProductCategoryLink[] = []
  raw.forEach((entry, index) => {
    if (entry === null || typeof entry !== 'object') return
    const link = entry as Record<string, unknown>
    if (typeof link.category_id !== 'string' || link.category_id === '') return
    out.push({
      category_id: link.category_id,
      position:
        typeof link.position === 'number' && Number.isFinite(link.position) ? link.position : index,
    })
  })
  return out
}

/**
 * Os `category_id` na ordem de `position` — é o que o formulário edita e persiste
 * (`product_categories.position` = ordem de seleção).
 */
export const categoryIdsFromLinks = (raw: unknown): string[] =>
  [...normalizeCategoryLinks(raw)]
    .sort((a, b) => a.position - b.position)
    .map(link => link.category_id)
