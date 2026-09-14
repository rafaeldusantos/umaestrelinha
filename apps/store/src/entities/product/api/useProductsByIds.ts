import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { mapDbToProduct, PRODUCT_CARD_SELECT } from '../lib/mapProduct'
import { listingWindow, ProductQueryError } from './useProducts'
import type { Product } from '@estrelinha/supabase/types'

/**
 * Os produtos de uma curadoria, **numa consulta só** — feature 50.
 *
 * O bloco "Produtos em destaque" tem até 12 peças escolhidas a dedo. Um `useProductById` por item
 * seriam 12 requisições e 12 estados de carregamento numa página só; `useAllProducts` baixaria o
 * catálogo inteiro para mostrar 12 cards, que é o defeito que a feature 23 fechou.
 *
 * **A ordem da resposta NÃO é a da dona, e não dá para pedir que seja**: `.in()` não garante ordem, e
 * ordenar no servidor exigiria `order by array_position`, que o PostgREST não expõe. Quem reordena é
 * quem desenha (`DST-22`) — e é por isso que a chave abaixo pode ser ordenada sem perder nada.
 *
 * **A chave é ORDENADA de propósito**: dois blocos com o mesmo conjunto de peças, em ordens
 * diferentes, compartilham o cache em vez de disparar duas consultas idênticas.
 *
 * **Produto despublicado simplesmente não volta** — quem decide "está no ar" é a RLS de `products`,
 * a mesma que a vitrine já usa. A loja pula o que faltar; quem conta o que se perdeu é o painel.
 */
export const useProductsByIds = (ids: readonly string[]) =>
  useQuery({
    queryKey: ['products', 'ids', [...ids].sort().join(',')],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await listingWindow(
        supabase.from('products').select(PRODUCT_CARD_SELECT).in('id', ids as string[]),
        ids.length,
      )
      /*
       * **Falha SOBE, nunca vira lista vazia** (`BUG-20260809`): com `return []` a tela não teria
       * como distinguir "os escolhidos saíram do ar" de "a consulta morreu" — e a primeira faz o
       * bloco sumir com motivo, enquanto a segunda tem de fazê-lo sumir sem derrubar a Home
       * (`DST-17`).
       */
      if (error) {
        throw new ProductQueryError(
          `carregar produtos escolhidos: ${error.message ?? 'erro desconhecido'}`,
        )
      }
      return (data ?? []).map(mapDbToProduct)
    },
    /*
     * Sem peça escolhida a consulta **não sai**. Um `.in('id', [])` é uma ida ao banco garantida a
     * devolver nada — e a seção sem curadoria nem chega a desenhar, porque `resolveHomeSections` já
     * a escondeu com motivo.
     */
    enabled: ids.length > 0,
  })
