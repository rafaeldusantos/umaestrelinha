// A foto de capa das peças que uma lista de escolha está MOSTRANDO (feature 89, ajuste de
// 2026-11-01).
//
// O pool (`useProductPool`) continua enxuto e sem foto — as outras superfícies da busca não mostram
// imagem, e levar `images` ao pool faria cada tela do painel baixar a galeria do catálogo inteiro.
// Esta leitura pede a capa só dos ids que estão na tela (no máximo o teto da busca, 20), POR ID
// (nunca por nome: a busca por nome tem um dono só, `AD-036`), e só a primeira URL da galeria —
// `images->0->>url` — em vez do jsonb inteiro.
//
// A capa é `images[0]` e, na falta dela, `image_url` (a coluna antiga). A falha degrada para "sem
// foto": a lista continua escolhível, com o quadrado neutro no lugar.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { idsConsultaveis } from './useProductsByIds'

export const PRODUCT_COVER_COLUMNS = 'id, image_url, capa:images->0->>url'

export const PRODUCT_COVERS_KEY = ['products', 'covers'] as const

interface LinhaDeCapa {
  id: string
  image_url: string | null
  capa: string | null
}

/** A capa de uma linha: a primeira da galeria, senão a coluna antiga. */
export const capaDaLinha = (l: Pick<LinhaDeCapa, 'image_url' | 'capa'>): string | null =>
  (l.capa && l.capa.trim()) || (l.image_url && l.image_url.trim()) || null

export const useProductCovers = (ids: readonly string[], ligado = true): Record<string, string | null> => {
  const lista = idsConsultaveis(ids)
  const { data } = useQuery({
    queryKey: [...PRODUCT_COVERS_KEY, lista.join(',')],
    queryFn: async (): Promise<Record<string, string | null>> => {
      const { data: linhas, error } = await supabase.from('products').select(PRODUCT_COVER_COLUMNS).in('id', lista)
      const mapa: Record<string, string | null> = {}
      for (const l of error ? [] : ((linhas ?? []) as unknown as LinhaDeCapa[])) mapa[l.id] = capaDaLinha(l)
      return mapa
    },
    enabled: ligado && lista.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: (anterior) => anterior,
  })
  return data ?? {}
}
