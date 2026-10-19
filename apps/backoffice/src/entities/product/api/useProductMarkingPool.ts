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
// **A feature 67 acrescentou o que a fila de sugestões e o "Hoje" da marcação em massa precisam**: os
// eixos (`options`), as variações com `option_values`, `is_active` e `position`, as duas marcações
// (peça toda e por opção) e a miniatura. A miniatura é UM campo (`images->0->>url`), não a lista de
// imagens: a fila mostra a foto da peça ao lado do nome, e nada além disso. Medido no banco local
// (2026-10-18, como admin): 702 peças e 3.380 variações em **1,16 MB**, 45 ms numa página só.
//
// A chave começa por `PRODUCT_POOL_KEY`, então quem grava produto e invalida o pool
// (`invalidarPoolDeProdutos`) alcança esta leitura também — o React Query invalida por prefixo.

import { useQuery } from '@tanstack/react-query'
import { readAllPages } from '@estrelinha/core/paging'
import { supabase } from '@estrelinha/supabase/client'
import type { ProdutoDoPool } from '../lib/buscarProdutos'
import { PRODUCT_POOL_COLUMNS, PRODUCT_POOL_KEY, PRODUCT_POOL_STALE_TIME } from './useProductPool'

/** Um eixo da peça, como em `products.options`. */
export interface EixoDaPeca {
  name: string
  values: string[]
  position: number
}

/** O mínimo de uma variação que a regra de `core/filters` lê. */
export interface VariacaoParaMarcar {
  id: string
  option_values: Record<string, string>
  is_active: boolean
  position: number
}

export interface MarcacaoPorOpcao {
  option_name: string
  option_value: string
  value_id: string
}

export interface ProdutoParaMarcar extends ProdutoDoPool {
  tags: string[]
  category_ids: string[]
  /** Feature 67. A foto da peça (a primeira imagem), ou `null`. */
  thumb: string | null
  options: EixoDaPeca[]
  variants: VariacaoParaMarcar[]
  /** Os valores marcados na peça toda (`product_filter_values`). */
  filter_value_ids: string[]
  /** As marcações por opção (`product_option_filter_values`). */
  option_marks: MarcacaoPorOpcao[]
}

export const PRODUCT_MARKING_COLUMNS =
  `${PRODUCT_POOL_COLUMNS}, tags, product_categories(category_id), options, thumb:images->0->>url, ` +
  'product_variants(id, option_values, is_active, position), product_filter_values(value_id), ' +
  'product_option_filter_values(option_name, option_value, value_id)'

export const PRODUCT_MARKING_KEY = [...PRODUCT_POOL_KEY, 'marcacao'] as const

const mensagem = (erro: unknown, padrao: string): string => {
  const texto = (erro as { message?: string } | null)?.message
  return texto && texto.trim() !== '' ? texto : padrao
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const texto = (v: unknown): string => (typeof v === 'string' ? v : '')

const valoresDaOpcao = (v: unknown): Record<string, string> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, string> = {}
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (typeof x === 'string') out[k] = x
  return out
}

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
  thumb: typeof row.thumb === 'string' && row.thumb !== '' ? row.thumb : null,
  options: (Array.isArray(row.options) ? row.options : [])
    .map((o: any, i: number) => ({
      name: texto(o?.name),
      values: Array.isArray(o?.values) ? o.values.filter((x: unknown) => typeof x === 'string') : [],
      position: typeof o?.position === 'number' ? o.position : i,
    }))
    .filter((o: EixoDaPeca) => o.name !== '')
    .sort((a: EixoDaPeca, b: EixoDaPeca) => a.position - b.position),
  variants: (Array.isArray(row.product_variants) ? row.product_variants : []).map((v: any, i: number) => ({
    id: String(v?.id ?? ''),
    option_values: valoresDaOpcao(v?.option_values),
    is_active: v?.is_active === true,
    position: typeof v?.position === 'number' ? v.position : i,
  })),
  filter_value_ids: [
    ...new Set<string>(
      (Array.isArray(row.product_filter_values) ? row.product_filter_values : [])
        .map((l: any) => texto(l?.value_id))
        .filter((id: string) => id !== ''),
    ),
  ],
  option_marks: (Array.isArray(row.product_option_filter_values) ? row.product_option_filter_values : [])
    .map((m: any) => ({ option_name: texto(m?.option_name), option_value: texto(m?.option_value), value_id: texto(m?.value_id) }))
    .filter((m: MarcacaoPorOpcao) => m.option_name !== '' && m.option_value !== '' && m.value_id !== ''),
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
