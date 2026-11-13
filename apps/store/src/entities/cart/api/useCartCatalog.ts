import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { Product } from '@estrelinha/supabase/types'
import { mapDbToProduct, PRODUCT_CARD_SELECT } from '@/entities/product/lib/mapProduct'
import { useCartStore } from '../model/cartStore'

/**
 * A releitura do catálogo das peças da sacola — a MESMA consulta e o MESMO mapeador da vitrine
 * (`PRODUCT_CARD_SELECT` + `mapDbToProduct`), então cada peça volta com o preço efetivo e a campanha
 * em vigência que a vitrine mostraria agora.
 *
 * O preço da linha que entrou na sacola é o daquela hora: a campanha pode ter acabado (ou começado)
 * desde então. Quando a leitura chega, `syncCatalog` troca o preço e a campanha de cada linha pelos
 * de agora — e a sacola, o checkout, o frete grátis por faixa e o seguro da cotação passam a ler o
 * de agora. Quem cobra é o servidor; o que esta leitura evita é a tela mostrar outro valor.
 *
 * `staleTime: 0`: relê ao abrir a sacola ou o checkout e ao voltar o foco à aba (o React Query relê
 * a consulta velha no foco). Erro ou carregamento deixam as linhas como estão.
 *
 * Quem a monta é `useCartBuyTogether` — a leitura da sacola —, que a gaveta e o checkout já chamam.
 */
export const useCartCatalog = (productIds: readonly string[]) => {
  const ids = [...new Set(productIds.filter(Boolean))].sort()
  const query = useQuery({
    queryKey: ['cart-catalog', ids],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from('products').select(PRODUCT_CARD_SELECT).in('id', ids)
      if (error) throw new Error(`reler a sacola: ${error.message ?? 'erro desconhecido'}`)
      return ((data ?? []) as unknown[]).map(mapDbToProduct)
    },
    enabled: ids.length > 0,
    staleTime: 0,
  })
  const data = query.data
  useEffect(() => {
    if (data && data.length > 0) useCartStore.getState().syncCatalog(data)
  }, [data])
  return query
}
