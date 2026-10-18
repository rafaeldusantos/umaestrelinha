// Feature 66 — o catálogo de filtros da loja: os grupos ativos e os valores deles.
//
// Uma consulta só, com os valores embutidos no grupo: a RLS entrega a anon só grupo `is_active` e só
// valor de grupo ativo, então o embed devolve exatamente o que a loja pode mostrar. A ordem NÃO é
// pedida ao banco — quem ordena (por `sort_order`) é `@estrelinha/core/filters`, que é o dono da
// regra; pedir aqui seria um segundo lugar dizendo a mesma coisa.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { FilterCatalog, FilterGroup, FilterValue } from '@estrelinha/core/filters'

export const FILTER_CATALOG_KEY = ['filter-catalog'] as const

/** O `select` do catálogo: grupo com os valores embutidos. */
export const FILTER_CATALOG_SELECT =
  'id, name, slug, is_active, sort_order, filter_values(id, group_id, name, slug, sort_order)'

/**
 * O catálogo muda quando a Adri cura no painel — raro, e nunca no meio de uma visita. Dez minutos
 * acima do padrão da loja (5) porque a categoria e a busca o leem a cada navegação.
 */
export const FILTER_CATALOG_STALE_TIME = 10 * 60_000

/** O catálogo vazio: o que a página usa enquanto carrega e quando a leitura falha (`FLT-26`). */
export const EMPTY_FILTER_CATALOG: FilterCatalog = Object.freeze({ groups: [], values: [] })

/** Falha com tipo, irmã de `CategoryQueryError`: a leitura repete em vez de guardar `[]` como sucesso. */
export class FilterCatalogQueryError extends Error {}

interface ValueRow {
  id?: unknown
  group_id?: unknown
  name?: unknown
  slug?: unknown
  sort_order?: unknown
}

interface GroupRow extends ValueRow {
  is_active?: unknown
  filter_values?: unknown
}

const texto = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
const ordem = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/** As linhas cruas → o catálogo da regra. Linha sem id, nome ou slug é descartada, nunca quebra. */
export const toFilterCatalog = (rows: readonly unknown[]): FilterCatalog => {
  const groups: FilterGroup[] = []
  const values: FilterValue[] = []
  for (const raw of rows ?? []) {
    const g = (raw ?? {}) as GroupRow
    const id = texto(g.id)
    const name = texto(g.name)
    const slug = texto(g.slug)
    if (!id || !name || !slug) continue
    groups.push({ id, name, slug, is_active: g.is_active === true, sort_order: ordem(g.sort_order) })
    for (const rawValue of Array.isArray(g.filter_values) ? g.filter_values : []) {
      const v = (rawValue ?? {}) as ValueRow
      const vid = texto(v.id)
      const vname = texto(v.name)
      const vslug = texto(v.slug)
      if (!vid || !vname || !vslug) continue
      values.push({ id: vid, group_id: texto(v.group_id) ?? id, name: vname, slug: vslug, sort_order: ordem(v.sort_order) })
    }
  }
  return { groups, values }
}

export const filterCatalogQueryOptions = () => ({
  queryKey: FILTER_CATALOG_KEY,
  queryFn: async (): Promise<FilterCatalog> => {
    const { data, error } = await supabase.from('filter_groups').select(FILTER_CATALOG_SELECT)
    if (error) {
      throw new FilterCatalogQueryError(`carregar filtros: ${error.message ?? 'erro desconhecido'}`)
    }
    return toFilterCatalog((data ?? []) as unknown[])
  },
  staleTime: FILTER_CATALOG_STALE_TIME,
})

/**
 * O catálogo, **nunca `undefined`**: carregando ou falhando, a página recebe o catálogo vazio e
 * abre com os filtros de sistema — os grupos simplesmente não aparecem, e nenhum erro chega à tela
 * (`FLT-26`). A falha continua sendo falha no cache (o React Query repete), só não vira tela.
 */
export const useFilterCatalog = (): FilterCatalog => {
  const { data } = useQuery(filterCatalogQueryOptions())
  return data ?? EMPTY_FILTER_CATALOG
}
