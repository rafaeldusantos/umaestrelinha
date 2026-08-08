import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { mapDbToProduct, PRODUCT_SELECT } from '../lib/mapProduct'
import type { Product } from '@estrelinha/supabase/types'

/**
 * O produto de um slug, resolvendo URL antiga por `product_redirects` (PST-07).
 *
 * O redirect **não** muda a forma do retorno: quando o produto vem de um slug antigo, o
 * `product.slug` devolvido é o **atual** e difere do pedido — é esse desencontro que a
 * `ProductPage` usa como sinal para navegar. A consulta por slug é `.eq('slug', slug)`, então o
 * slug só pode divergir por redirect, e depois de redirecionar os dois coincidem: não há loop.
 */
export const useProduct = (slug: string) =>
  useQuery({
    queryKey: ['product', slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('slug', slug)
        .single()
      if (!error && data) return mapDbToProduct(data)

      // Slug não encontrado: pode ser uma URL antiga salva no Instagram ou nos favoritos.
      const { data: redirect } = await supabase
        .from('product_redirects')
        .select('product_id')
        .eq('from_slug', slug)
        .maybeSingle()
      if (!redirect?.product_id) return null

      // Redirect apontando para produto já apagado devolve `null` e cai no 404 da página — a FK é
      // `ON DELETE CASCADE`, então isto é a rede para uma linha órfã, não o caso comum.
      const { data: target, error: targetError } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('id', redirect.product_id)
        .maybeSingle()
      if (targetError || !target) return null
      return mapDbToProduct(target)
    },
    enabled: !!slug,
  })
