// Feature 30 · GSH-22 — quantas ofertas o feed publica, e quantas ficaram de fora, por quê.
//
// ---------------------------------------------------------------------------------------------
// A CONTAGEM NÃO É UMA SEGUNDA REGRA
// ---------------------------------------------------------------------------------------------
// Quem decide se uma variação entra no feed é `feedExclusion` (`@estrelinha/core/shopping`), e é ele
// que roda aqui. Reimplementar a condição no painel — `is_active && price != null` escrito à mão —
// daria dois donos da mesma decisão, e a tela passaria a prometer um número que a edge function não
// produz. É o defeito que a `24` matou na derivação da Home e a `25` no desenho da prévia; a
// diferença é que aqui a divergência só apareceria comparando com o painel do Google.
//
// ---------------------------------------------------------------------------------------------
// ERRO DE LEITURA NÃO VIRA LISTA VAZIA
// ---------------------------------------------------------------------------------------------
// `BL-00Y` registra o padrão três vezes neste projeto: `if (error) return []` faz o React Query
// guardar o vazio como **sucesso** e não repetir a tentativa. Aqui seria pior que numa vitrine — a
// tela diria "0 ofertas publicadas" no dia do cutover, e a dona concluiria que o feed quebrou.
// Por isso a query **lança**, e quem renderiza distingue erro de vazio.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { FEED_EXCLUSIONS, feedExclusion, type FeedExclusion } from '@estrelinha/core/shopping'

/** O teto de linhas por requisição do PostgREST. A leitura pagina; truncar mentiria a contagem. */
const PAGE = 1000

export interface ExcludedRow {
  variantId: string
  productId: string
  productName: string
  productSlug: string
  motivo: FeedExclusion
}

export interface FeedInventory {
  /** Quantas ofertas o feed publica hoje. */
  publicadas: number
  /** Quantas variações existem no catálogo, elegíveis ou não. */
  total: number
  /** Contagem por motivo, com **todas** as chaves presentes — zero é informação. */
  porMotivo: Record<FeedExclusion, number>
  excluidas: ExcludedRow[]
}

const vazio = (): Record<FeedExclusion, number> =>
  Object.fromEntries(FEED_EXCLUSIONS.map(m => [m, 0])) as Record<FeedExclusion, number>

interface Linha {
  id: string
  is_active: boolean
  price: number | null
  products: {
    id: string
    name: string
    slug: string
    is_active: boolean
  } | null
}

const SELECT = 'id,is_active,price,products(id,name,slug,is_active)'

export const buildInventory = (linhas: readonly Linha[]): FeedInventory => {
  const porMotivo = vazio()
  const excluidas: ExcludedRow[] = []
  let publicadas = 0

  for (const linha of linhas) {
    const produto = linha.products
    // Variação órfã não existe (FK), mas o embed pode vir nulo se a policy esconder o produto.
    // Contá-la como publicável seria prometer uma oferta que a function não emite.
    if (!produto) continue

    const motivo = feedExclusion(produto, linha)
    if (motivo === null) {
      publicadas += 1
      continue
    }
    porMotivo[motivo] += 1
    excluidas.push({
      variantId: linha.id,
      productId: produto.id,
      productName: produto.name,
      productSlug: produto.slug,
      motivo,
    })
  }

  return { publicadas, total: linhas.length, porMotivo, excluidas }
}

const fetchInventory = async (): Promise<FeedInventory> => {
  const linhas: Linha[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('product_variants')
      .select(SELECT)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const pagina = (data ?? []) as unknown as Linha[]
    linhas.push(...pagina)
    if (pagina.length < PAGE) break
  }
  return buildInventory(linhas)
}

export const useFeedInventory = () =>
  useQuery({
    queryKey: ['google-shopping', 'inventory'],
    queryFn: fetchInventory,
    staleTime: 1000 * 60,
  })
