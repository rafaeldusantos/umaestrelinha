// O catálogo de filtros do painel — feature 66 (`FLT-01`..`FLT-10`).
//
// Uma leitura só traz os grupos, os valores de cada grupo e quantas peças estão marcadas em cada
// valor. A contagem é o agregado do PostgREST sobre o embed (`product_filter_values(count)`), e a
// forma dele foi PROVADA por probe HTTP contra o banco local antes deste arquivo existir
// (2026-10-18, como admin): cada valor volta com `"product_filter_values": [{"count": N}]`, e com
// `[{"count": 0}]` quando ninguém está marcado — nunca com a lista vazia. O servidor conta; nenhuma
// marcação atravessa a rede.
//
// O desenho de leitura é o de `useAdminCategories` (feature 50): `fetchCatalog(modo)` com o
// `FetchMode` de `shared/lib/fetchMode.ts`, token de sequência, e `'revalidar'` que não liga o
// esqueleto nem esvazia a lista quando falha. Toda escrita relê com `'revalidar'`.
//
// **Quem recusa é `@estrelinha/core/filters`**, e a recusa acontece AQUI, antes da rede: a tela
// mostra a frase que volta, e nenhum caminho de gravação consegue pular a régua (`FLT-03`..`FLT-06`).
// O banco recusa as mesmas coisas que dependem só da linha (formato, reservado, unicidade do slug);
// os tetos de contagem e a unicidade do NOME só a régua conhece.

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import {
  FILTER_SLUG_TAKEN_REFUSAL,
  groupRefusal,
  valueRefusal,
  type FilterDraft,
} from '@estrelinha/core/filters'
import type { DbFilterGroup, DbFilterValue } from '@estrelinha/supabase/types'
import type { FetchMode } from '@/shared/lib/fetchMode'

export interface AdminFilterValue extends DbFilterValue {
  /** Quantas peças têm esta marcação. Exato: a chave de `product_filter_values` é produto × valor. */
  marked_count: number
}

export interface AdminFilterGroup extends DbFilterGroup {
  /** Os valores do grupo, na ordem de `sort_order`. */
  values: AdminFilterValue[]
}

/**
 * A projeção, nomeada — e o agregado dentro do embed.
 *
 * `product_filter_values(count)` é o que faz o servidor contar. Um `product_filter_values(product_id)`
 * traria cada marcação para o navegador só para ser contada aqui.
 */
export const FILTER_CATALOG_SELECT =
  'id, name, slug, is_active, sort_order, created_at, filter_values(id, group_id, name, slug, sort_order, product_filter_values(count))'

/** A mensagem que o painel mostra quando o banco recusa o endereço do VALOR por repetição. */
export const VALUE_SLUG_TAKEN_REFUSAL = 'Este endereço já é usado por outro valor deste grupo.'

/* eslint-disable @typescript-eslint/no-explicit-any */
const contagemDe = (embed: any): number => {
  const primeiro = Array.isArray(embed) ? embed[0] : embed
  const n = Number(primeiro?.count ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Comparação numérica crescente — nomeada para a ordem do painel não ler como a régua editorial
 *  da categoria de exibição, que tem dono próprio em `core` (`medicaoComDonoUnico.test.ts`). */
const crescente = (x: number, y: number): number => (x < y ? -1 : x > y ? 1 : 0)

const porOrdem = <T extends { sort_order: number; name: string }>(a: T, b: T): number =>
  crescente(a.sort_order, b.sort_order) || a.name.localeCompare(b.name, 'pt-BR')

/** Linha do banco → grupo do painel. Exportada para teste: é aqui que o agregado vira número. */
export const toAdminFilterGroup = (row: any): AdminFilterGroup => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  is_active: row.is_active === true,
  sort_order: Number(row.sort_order ?? 0),
  created_at: row.created_at,
  values: (Array.isArray(row.filter_values) ? row.filter_values : [])
    .map((v: any) => ({
      id: v.id,
      group_id: v.group_id ?? row.id,
      name: v.name,
      slug: v.slug,
      sort_order: Number(v.sort_order ?? 0),
      marked_count: contagemDe(v.product_filter_values),
    }))
    .sort(porOrdem),
})
/* eslint-enable @typescript-eslint/no-explicit-any */

interface ErroDoBanco {
  message?: string
  code?: string
}

/**
 * A frase do erro de gravação.
 *
 * `23505` (único) e `23514` (`check` — o reservado e o formato) sobre o endereço viram a MESMA frase
 * que a régua de `core` usa: o banco e a tela recusam a mesma coisa com as mesmas palavras.
 */
const motivoDoErro = (erro: ErroDoBanco, endereco: string): string => {
  if (erro.code === '23505' || erro.code === '23514') return endereco
  return erro.message && erro.message.trim() !== '' ? erro.message : 'Não foi possível salvar.'
}

export interface GroupPatch {
  name?: string
  slug?: string
  is_active?: boolean
}

export interface ValuePatch {
  name?: string
  slug?: string
}

export const useAdminFilterCatalog = () => {
  const [groups, setGroups] = useState<AdminFilterGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** O token de sequência (`VIV-08`) — o mesmo desenho de `useAdminCategories`. */
  const pedido = useRef(0)
  /**
   * O estado mais recente, para as mutações recusarem contra o que está NA TELA agora, e não contra
   * o fechamento do render em que a função foi criada.
   */
  const atual = useRef<AdminFilterGroup[]>([])
  atual.current = groups

  const fetchCatalog = useCallback(async (modo: FetchMode = 'inicial') => {
    const meu = ++pedido.current
    if (modo === 'inicial') setLoading(true)
    setError(null)

    const { data, error: erro } = await supabase
      .from('filter_groups')
      .select(FILTER_CATALOG_SELECT)
      .order('sort_order')

    if (meu !== pedido.current) return

    if (erro || !data) {
      // Na revalidação a lista FICA (`VIV-07`): a faixa de erro aparece sobre o que já estava ali.
      if (modo === 'inicial') setGroups([])
      setError(erro?.message ?? 'Não foi possível carregar os filtros.')
      setLoading(false)
      return
    }

    setGroups((data as unknown[]).map(toAdminFilterGroup).sort(porOrdem))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCatalog('inicial')
  }, [fetchCatalog])

  const outrosGrupos = () => atual.current.map(g => ({ id: g.id, name: g.name, slug: g.slug }))
  const irmaosDe = (groupId: string) =>
    (atual.current.find(g => g.id === groupId)?.values ?? []).map(v => ({ id: v.id, name: v.name, slug: v.slug }))

  /** Cria o grupo no fim da lista. Recusa antes da rede; devolve a frase ou o id novo. */
  const createGroup = async (draft: { name: string; slug: string }) => {
    const recusa = groupRefusal({ name: draft.name, slug: draft.slug }, outrosGrupos())
    if (recusa) return { error: recusa, id: null as string | null }

    const proxima = atual.current.reduce((max, g) => Math.max(max, g.sort_order + 1), 0)
    const { data, error: erro } = await supabase
      .from('filter_groups')
      .insert({ name: draft.name.trim(), slug: draft.slug.trim(), sort_order: proxima })
      .select('id')
      .maybeSingle()
    if (erro) return { error: motivoDoErro(erro, FILTER_SLUG_TAKEN_REFUSAL), id: null }
    await fetchCatalog('revalidar')
    return { error: null as string | null, id: (data as { id?: string } | null)?.id ?? null }
  }

  /** Renomeia, troca o endereço ou liga/desliga. Nome e endereço passam pela régua inteira. */
  const updateGroup = async (id: string, patch: GroupPatch): Promise<string | null> => {
    const grupo = atual.current.find(g => g.id === id)
    if (!grupo) return 'Este grupo não existe mais.'
    if (patch.name !== undefined || patch.slug !== undefined) {
      const draft: FilterDraft = { id, name: patch.name ?? grupo.name, slug: patch.slug ?? grupo.slug }
      const recusa = groupRefusal(draft, outrosGrupos())
      if (recusa) return recusa
    }
    const valores = {
      ...patch,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug.trim() } : {}),
    }
    const { error: erro } = await supabase.from('filter_groups').update(valores).eq('id', id)
    if (erro) return motivoDoErro(erro, FILTER_SLUG_TAKEN_REFUSAL)
    await fetchCatalog('revalidar')
    return null
  }

  /** Apaga o grupo; o banco leva valores, marcações e o "escondido" junto (`on delete cascade`). */
  const deleteGroup = async (id: string): Promise<string | null> => {
    const { error: erro } = await supabase.from('filter_groups').delete().eq('id', id)
    if (erro) return motivoDoErro(erro, erro.message ?? '')
    await fetchCatalog('revalidar')
    return null
  }

  /** Acrescenta um valor no fim do grupo. */
  const createValue = async (groupId: string, draft: { name: string; slug: string }) => {
    const recusa = valueRefusal({ name: draft.name, slug: draft.slug }, irmaosDe(groupId))
    if (recusa) return { error: recusa, id: null as string | null }

    const grupo = atual.current.find(g => g.id === groupId)
    const proxima = (grupo?.values ?? []).reduce((max, v) => Math.max(max, v.sort_order + 1), 0)
    const { data, error: erro } = await supabase
      .from('filter_values')
      .insert({ group_id: groupId, name: draft.name.trim(), slug: draft.slug.trim(), sort_order: proxima })
      .select('id')
      .maybeSingle()
    if (erro) return { error: motivoDoErro(erro, VALUE_SLUG_TAKEN_REFUSAL), id: null }
    await fetchCatalog('revalidar')
    return { error: null as string | null, id: (data as { id?: string } | null)?.id ?? null }
  }

  const updateValue = async (id: string, patch: ValuePatch): Promise<string | null> => {
    const valor = atual.current.flatMap(g => g.values).find(v => v.id === id)
    if (!valor) return 'Este valor não existe mais.'
    const draft: FilterDraft = { id, name: patch.name ?? valor.name, slug: patch.slug ?? valor.slug }
    const recusa = valueRefusal(draft, irmaosDe(valor.group_id))
    if (recusa) return recusa
    const { error: erro } = await supabase
      .from('filter_values')
      .update({ name: draft.name.trim(), slug: draft.slug.trim() })
      .eq('id', id)
    if (erro) return motivoDoErro(erro, VALUE_SLUG_TAKEN_REFUSAL)
    await fetchCatalog('revalidar')
    return null
  }

  /** Apaga o valor; as marcações saem junto (`on delete cascade`). */
  const deleteValue = async (id: string): Promise<string | null> => {
    const { error: erro } = await supabase.from('filter_values').delete().eq('id', id)
    if (erro) return motivoDoErro(erro, erro.message ?? '')
    await fetchCatalog('revalidar')
    return null
  }

  /**
   * A ordem dos grupos, gravada inteira numa chamada só (o `upsert` por `id`).
   *
   * As colunas obrigatórias vão junto porque `upsert` é `insert … on conflict`, e o `insert` precisa
   * delas; vêm da leitura que a tela acabou de fazer.
   */
  const reorderGroups = async (idsNaOrdem: readonly string[]): Promise<string | null> => {
    const porId = new Map(atual.current.map(g => [g.id, g]))
    const linhas = idsNaOrdem
      .map((id, i) => {
        const g = porId.get(id)
        return g ? { id: g.id, name: g.name, slug: g.slug, is_active: g.is_active, sort_order: i } : null
      })
      .filter(Boolean)
    if (linhas.length === 0) return null
    const { error: erro } = await supabase.from('filter_groups').upsert(linhas, { onConflict: 'id' })
    if (erro) return motivoDoErro(erro, erro.message ?? '')
    await fetchCatalog('revalidar')
    return null
  }

  /** A ordem dos valores de um grupo, inteira, numa chamada só. */
  const reorderValues = async (groupId: string, idsNaOrdem: readonly string[]): Promise<string | null> => {
    const porId = new Map((atual.current.find(g => g.id === groupId)?.values ?? []).map(v => [v.id, v]))
    const linhas = idsNaOrdem
      .map((id, i) => {
        const v = porId.get(id)
        return v ? { id: v.id, group_id: groupId, name: v.name, slug: v.slug, sort_order: i } : null
      })
      .filter(Boolean)
    if (linhas.length === 0) return null
    const { error: erro } = await supabase.from('filter_values').upsert(linhas, { onConflict: 'id' })
    if (erro) return motivoDoErro(erro, erro.message ?? '')
    await fetchCatalog('revalidar')
    return null
  }

  return {
    groups,
    loading,
    error,
    fetchCatalog,
    createGroup,
    updateGroup,
    deleteGroup,
    createValue,
    updateValue,
    deleteValue,
    reorderGroups,
    reorderValues,
  }
}

export type AdminFilterCatalog = ReturnType<typeof useAdminFilterCatalog>
