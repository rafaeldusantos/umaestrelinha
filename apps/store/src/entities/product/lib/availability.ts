import { hasSellableGrid } from './variantSelection'
import type { Product } from '@estrelinha/supabase/types'

/**
 * O produto está esgotado **para a vitrine**?
 *
 * PST-08 / AC 6-7: com `stock_policy` diferente de `track` a loja nunca marca esgotado; com grade,
 * o saldo que vale é o da linha, não o `stock_total` do produto.
 *
 * Vive aqui, e não inline no card, porque a listagem passou a filtrar por disponibilidade
 * ("Apenas em estoque", board do sheet de Filtros). Duas cópias da regra dariam um selo "Esgotado"
 * num card que o filtro considerou em estoque.
 */
export const isProductOutOfStock = (product: Product): boolean =>
  hasSellableGrid(product)
    ? !product.variants.some(v => v.is_active && v.price !== null)
    : product.stock_policy === 'track' && product.stock_total === 0
