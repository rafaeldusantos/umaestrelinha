// O catálogo para MARCAR filtros em massa — feature 66 (`FLT-15`, `FLT-42`).
//
// É o pool da feature 51 com duas colunas a mais, e mora na mesma pasta por regra: "quais peças
// existem" tem UM dono no painel (`entities/product/api`, `AD-036`), e a busca por nome continua
// sendo a régua pura `buscarProdutos` — esta leitura não filtra por nome no servidor, traz o
// catálogo enxuto uma vez e a tela recorta em memória.
//
// As duas colunas a mais são as que os recortes da marcação em massa precisam: as **tags** (o
// recorte "Com a tag…", que só filtra a lista) e as **categorias** (o recorte por categoria). Nada de
// `description` nem de imagem: a lista é lista (`AD-019`).
//
// A chave começa por `PRODUCT_POOL_KEY`, então quem grava produto e invalida o pool
// (`invalidarPoolDeProdutos`) alcança esta leitura também — o React Query invalida por prefixo.

import { useQuery } from '@tanstack/react-query'
import { readAllPages } from '@estrelinha/core/paging'
import { supabase } from '@estrelinha/supabase/client'
import type { ProdutoDoPool } from '../lib/buscarProdutos'
import { PRODUCT_POOL_COLUMNS, PRODUCT_POOL_KEY, PRODUCT_POOL_STALE_TIME } from './useProductPool'

export interface ProdutoParaMarcar extends ProdutoDoPool {
  tags: string[]
  category_ids: string[]
}

export const PRODUCT_MARKING_COLUMNS = `${PRODUCT_POOL_COLUMNS}, tags, product_categories(category_id)`

export const PRODUCT_MARKING_KEY = [...PRODUCT_POOL_KEY, 'marcacao'] as const

const mensagem = (erro: unknown, padrao: string): string => {
  const texto = (erro as { message?: string } | null)?.message
  return texto && texto.trim() !== '' ? texto : padrao
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const toProdutoParaMarcar = (row: any): ProdutoParaMarcar => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  is_active: row.is_active === true,
  base_price: row.base_price ?? null,
  tags: Array.isArray(row.tags) ? row.tags.filter((t: unknown) => typeof t === 'string') : [],
  category_ids: Array.isArray(row.product_categories)
    ? row.product_categories.map((l: any) => String(l?.category_id ?? '')).filter((id: string) => id !== '')
    : [],
})
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Conta primeiro e pagina depois — a leitura truncada FALHA, nunca vira um catálogo menor. */
export const lerCatalogoParaMarcar = async (): Promise<ProdutoParaMarcar[]> => {
  const { count, error } = await supabase.from('products').select('id', { count: 'exact', head: true })
  if (error) throw new Error(mensagem(error, 'não foi possível contar o catálogo'))
  const total = count ?? 0
  if (total === 0) return []

  return readAllPages<ProdutoParaMarcar>({
    total,
    label: 'catálogo de produtos',
    consequence: 'a marcação em massa diria que uma peça não existe',
    readPage: async (de, ate) => {
      const { data, error: erroDaPagina } = await supabase
        .from('products')
        .select(PRODUCT_MARKING_COLUMNS)
        .order('name')
        .order('id')
        .range(de, ate)
      if (erroDaPagina) throw new Error(mensagem(erroDaPagina, 'não foi possível carregar o catálogo'))
      return ((data ?? []) as unknown[]).map(toProdutoParaMarcar)
    },
  })
}

export const useProductMarkingPool = () => {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: PRODUCT_MARKING_KEY,
    queryFn: lerCatalogoParaMarcar,
    staleTime: PRODUCT_POOL_STALE_TIME,
  })
  return {
    produtos: data ?? [],
    carregando: isPending,
    erro: error ? mensagem(error, 'não foi possível carregar o catálogo') : null,
    recarregar: () => {
      void refetch()
    },
  }
}
