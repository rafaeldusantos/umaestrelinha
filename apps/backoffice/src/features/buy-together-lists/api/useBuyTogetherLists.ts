// As listas do Compre Junto — leitura e escrita (painel).
//
// Colunas **nomeadas**, nunca `*`: uma coluna nova entra aqui de propósito, e não de carona. O uso
// ("em N joias") sai da view `buy_together_list_usage`, e não de uma coluna na lista: uma coluna
// seria um segundo dono do número.

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { listDeleteRefusal, listNameRefusal, type PieceProduct } from '@estrelinha/core/buy-together'
import { normalizeOptions, normalizeVariants, toStockPolicy } from '@estrelinha/core/product'
import { capaDaLinha } from '@/entities/product'
import { toRows, type DraftItem } from '../model/draft'

export const LIST_COLUMNS = 'id, name, updated_at'
export const LIST_ITEM_COLUMNS =
  'list_id, product_id, position, variant_ids, product:products(id, name, is_active, base_price, image_url, capa:images->0->>url, stock_policy, stock_total, options, product_variants(id, price, is_active, stock, position))'
export const USAGE_COLUMNS = 'list_id, product_id, product_name'

export const BUY_TOGETHER_LISTS_KEY = ['buy-together', 'lists'] as const

export interface PecaDaLista {
  productId: string
  nome: string
  ativa: boolean
  imagem: string | null
  variantIds: string[]
  /** O preço da peça sem grade. */
  precoBase: number
  /**
   * A peça na forma que `resolveAddons` (`core/buy-together`) lê — política, saldo, eixos e as
   * variações com estoque —, para a prévia do desconto no produto pular o que a loja pula. `null`
   * quando a leitura não trouxe a peça.
   */
  produto: PieceProduct | null
}

export interface ListaDoCompreJunto {
  id: string
  name: string
  updatedAt: string
  pecas: PecaDaLista[]
  /** Nomes das joias que usam a lista, na ordem em que a view os devolve. */
  usadaEm: string[]
}

interface LinhaDeItem {
  list_id: string
  product_id: string
  position: number
  variant_ids: string[] | null
  product: {
    name: string
    is_active: boolean
    base_price: number | string | null
    image_url: string | null
    capa: string | null
    stock_policy?: string | null
    stock_total?: number | null
    options?: unknown
    product_variants?: Array<{
      id: string
      price: number | string | null
      is_active: boolean
      stock?: number | null
      position?: number | null
    }> | null
  } | null
}

const mensagemDoErro = (codigo: string | undefined, mensagem: string): string => {
  if (codigo === '23503') {
    return 'Esta lista está em uso e não pode ser excluída. Tire-a das joias que a usam antes.'
  }
  if (codigo === '23514') return 'O nome da lista tem de ter de 1 a 40 caracteres.'
  return mensagem
}

/** Lê todas as listas, com as peças e o uso. Falha quando uma leitura falha. */
export const lerListas = async (): Promise<ListaDoCompreJunto[]> => {
  const [listas, itens, usos] = await Promise.all([
    supabase.from('buy_together_lists').select(LIST_COLUMNS).order('name', { ascending: true }),
    supabase.from('buy_together_list_items').select(LIST_ITEM_COLUMNS).order('position', { ascending: true }),
    supabase.from('buy_together_list_usage').select(USAGE_COLUMNS).order('product_name', { ascending: true }),
  ])
  const erro = listas.error ?? itens.error ?? usos.error
  if (erro) throw new Error(erro.message)

  const pecasPorLista = new Map<string, PecaDaLista[]>()
  for (const l of (itens.data ?? []) as unknown as LinhaDeItem[]) {
    const peca: PecaDaLista = {
      productId: l.product_id,
      nome: l.product?.name ?? 'Peça sem nome',
      ativa: l.product?.is_active === true,
      imagem: l.product ? capaDaLinha(l.product) : null,
      variantIds: l.variant_ids ?? [],
      precoBase: Number(l.product?.base_price ?? 0) || 0,
      // A mesma normalização da loja (`mapDbToProduct`), para a regra ler a peça como a página lê.
      produto: l.product
        ? {
            id: l.product_id,
            stock_policy: toStockPolicy(l.product.stock_policy),
            stock_total: Number(l.product.stock_total ?? 0) || 0,
            options: normalizeOptions(l.product.options),
            variants: normalizeVariants(
              (l.product.product_variants ?? []).map(v => ({
                ...v,
                id: String(v.id),
                price: v.price === null || v.price === undefined || v.price === '' ? null : Number(v.price),
              })),
              l.product_id,
            ),
          }
        : null,
    }
    pecasPorLista.set(l.list_id, [...(pecasPorLista.get(l.list_id) ?? []), peca])
  }

  const usoPorLista = new Map<string, string[]>()
  for (const u of (usos.data ?? []) as Array<{ list_id: string; product_name: string }>) {
    usoPorLista.set(u.list_id, [...(usoPorLista.get(u.list_id) ?? []), u.product_name])
  }

  return ((listas.data ?? []) as Array<{ id: string; name: string; updated_at: string }>).map(l => ({
    id: l.id,
    name: l.name,
    updatedAt: l.updated_at,
    pecas: pecasPorLista.get(l.id) ?? [],
    usadaEm: usoPorLista.get(l.id) ?? [],
  }))
}

export const useBuyTogetherLists = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: BUY_TOGETHER_LISTS_KEY,
    queryFn: lerListas,
  })
  return {
    listas: data ?? [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => void refetch(),
  }
}

export interface EscritaDeLista {
  /** O id da lista gravada; `null` com `refusal` quando não gravou. */
  id: string | null
  refusal: string | null
}

/** As escritas. Cada uma devolve o motivo da recusa, ou `null`, e revalida a leitura. */
export const useBuyTogetherListWrites = () => {
  const queryClient = useQueryClient()
  const revalidar = useCallback(
    () => queryClient.invalidateQueries({ queryKey: BUY_TOGETHER_LISTS_KEY }),
    [queryClient],
  )

  /**
   * Grava o nome e as peças. A lista nova nasce primeiro (precisa do id); as peças tiradas saem
   * ANTES de as novas entrarem, porque a posição é única na lista e uma peça que saiu ainda ocupa a
   * posição de quem entra no lugar dela.
   */
  const save = useCallback(
    async (id: string | null, name: string, items: readonly DraftItem[]): Promise<EscritaDeLista> => {
      const recusa = listNameRefusal(name)
      if (recusa) return { id, refusal: recusa }

      let listId = id
      if (listId === null) {
        const { data, error } = await supabase
          .from('buy_together_lists')
          .insert({ name: name.trim() })
          .select('id')
          .maybeSingle()
        if (error || !data) return { id: null, refusal: mensagemDoErro(error?.code, error?.message ?? 'Não foi possível criar a lista.') }
        listId = (data as { id: string }).id
      } else {
        const { error } = await supabase.from('buy_together_lists').update({ name: name.trim() }).eq('id', listId)
        if (error) return { id: listId, refusal: mensagemDoErro(error.code, error.message) }
      }

      const mantidos = items.map(i => i.productId)
      const { data: atuais, error: erroLeitura } = await supabase
        .from('buy_together_list_items')
        .select('product_id')
        .eq('list_id', listId)
      if (erroLeitura) return { id: listId, refusal: erroLeitura.message }

      const sobram = ((atuais ?? []) as Array<{ product_id: string }>)
        .map(a => a.product_id)
        .filter(p => !mantidos.includes(p))
      if (sobram.length > 0) {
        const { error } = await supabase.from('buy_together_list_items').delete().eq('list_id', listId).in('product_id', sobram)
        if (error) return { id: listId, refusal: error.message }
      }

      if (items.length > 0) {
        const { error } = await supabase
          .from('buy_together_list_items')
          .upsert(toRows(listId, items), { onConflict: 'list_id,product_id' })
        if (error) return { id: listId, refusal: mensagemDoErro(error.code, error.message) }
      }

      await revalidar()
      return { id: listId, refusal: null }
    },
    [revalidar],
  )

  /** Apaga a lista. Em uso: recusa antes de ir ao banco, nomeando as joias; o banco recusa também. */
  const remove = useCallback(
    async (id: string, usadaEm: readonly string[]): Promise<string | null> => {
      const recusa = listDeleteRefusal(usadaEm)
      if (recusa) return recusa
      const { error } = await supabase.from('buy_together_lists').delete().eq('id', id)
      if (error) return mensagemDoErro(error.code, error.message)
      await revalidar()
      return null
    },
    [revalidar],
  )

  return { save, remove }
}
