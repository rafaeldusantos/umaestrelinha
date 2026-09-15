// O nome (e a `description`) das peças **já escolhidas** (feature 51).
//
// É a metade `porId` que `useMenuProducts` tinha, com o dono trocado. Ela sobrevive à mudança porque
// responde outra pergunta: o pool responde *"quais peças existem?"* e é enxuto de propósito; esta
// responde *"como se chama a peça que este banner já aponta?"*, para no máximo quatro ids, e por
// isso pode carregar a `description` — que é 876 KB dos 3.217 do catálogo e **nunca** desce para
// resultado de busca.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { MenuProduct } from '@estrelinha/core/menu'

/** Exatamente o que `resolveMenuBanners` precisa de um alvo já apontado. */
export const PRODUCTS_BY_IDS_COLUMNS = 'id, name, slug, description, is_active'

/**
 * `products.id` é `uuid`, e um valor que não seja uuid dentro de `in('id', …)` derruba a consulta
 * INTEIRA com `22P02` — medido na feature 34, no importador da Nuvemshop, que grava
 * `nuvemshop:<nome>` no item que não casou. O destino do banner mora em jsonb, onde qualquer string
 * cabe; sem este recorte, um destino escrito à mão apagaria o nome de **todos** os outros.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Os ids que valem a pena consultar: só uuid, sem repetição e **ordenados**.
 *
 * A ordem é o que torna a chave estável: quem chama monta a lista a cada render, e duas listas com
 * o mesmo conjunto em ordens diferentes disparariam duas leituras idênticas. A resposta de `.in()`
 * não tem ordem garantida de qualquer forma — quem precisa de ordem é quem desenha.
 */
export const idsConsultaveis = (ids: readonly string[]): string[] =>
  [...new Set(ids.filter(id => UUID.test(id)))].sort()

export interface ProdutosPorId {
  porId: Record<string, MenuProduct>
  carregando: boolean
}

export const useProductsByIds = (ids: readonly string[]): ProdutosPorId => {
  const lista = idsConsultaveis(ids)

  const { data, isFetching } = useQuery({
    queryKey: ['products', 'by-ids', lista.join(',')],
    queryFn: async (): Promise<Record<string, MenuProduct>> => {
      const { data: linhas, error } = await supabase
        .from('products')
        .select(PRODUCTS_BY_IDS_COLUMNS)
        .in('id', lista)

      const mapa: Record<string, MenuProduct> = {}
      // A falha aqui degrada para "sem nome", e não para tela de erro: o editor de banner continua
      // editável com o destino sem rótulo, que é o comportamento que `useMenuProducts` já tinha. O
      // que **não** pode degradar é o pool — lá a lista vazia seria lida como "não há peça".
      for (const linha of error ? [] : ((linhas ?? []) as unknown as MenuProduct[])) {
        mapa[linha.id] = linha
      }
      return mapa
    },
    // Sem id nenhum a consulta não sai: um `.in('id', [])` é uma ida ao banco garantida a não
    // devolver nada.
    enabled: lista.length > 0,
  })

  return { porId: data ?? {}, carregando: isFetching }
}
