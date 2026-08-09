import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { descendantIds, type MenuCategory } from '@estrelinha/core/menu'
import {
  CATEGORY_FILTER_COLUMN,
  mapDbToProduct,
  PRODUCT_SELECT,
  PRODUCT_SELECT_BY_CATEGORY,
} from '../lib/mapProduct'
import type { Product } from '@estrelinha/supabase/types'

/**
 * Erro de consulta de catálogo.
 *
 * Existe para que a falha **suba** em vez de virar lista vazia. `BUG-20260809`: a consulta de
 * categoria falhava e `if (error) return []` transformava isso em "0 produtos encontrados" — a tela
 * não tinha como distinguir "categoria sem produto" de "a consulta morreu". Segunda ocorrência do
 * padrão que `AD-014` registrou em `useAdminCollections`.
 */
export class ProductQueryError extends Error {}

const fail = (operacao: string, error: { message?: string }): never => {
  throw new ProductQueryError(`${operacao}: ${error.message ?? 'erro desconhecido'}`)
}

export const useProducts = (categorySlug?: string) =>
  useQuery({
    queryKey: ['products', categorySlug],
    queryFn: async (): Promise<Product[]> => {
      if (!categorySlug) {
        const { data, error } = await supabase.from('products').select(PRODUCT_SELECT)
        if (error) fail('carregar produtos', error)
        return (data ?? []).map(mapDbToProduct)
      }

      // A árvore inteira, não só a categoria da rota: é dela que sai a descendência (MENU-03).
      // Duas colunas bastam — `descendantIds` só precisa de `id` e `parent_id`.
      const { data: tree, error: treeError } = await supabase
        .from('categories')
        .select('id, parent_id, slug')
      if (treeError) fail('carregar categorias', treeError)

      const rows = (tree ?? []) as { id: string; parent_id: string | null; slug: string }[]
      const self = rows.find(c => c.slug === categorySlug)
      // Slug que não casa com categoria nenhuma segue sem filtrar, como sempre foi — quem responde
      // pelo "não encontrada" é a página, por `useCategoryBySlug`. Preservado de propósito: mudar
      // isto aqui seria alterar comportamento que este conserto não precisa tocar.
      if (!self) {
        const { data, error } = await supabase.from('products').select(PRODUCT_SELECT)
        if (error) fail('carregar produtos', error)
        return (data ?? []).map(mapDbToProduct)
      }

      /*
       * **Roll-up da descendência.** `/colecao/joias-afetivas` tem de mostrar os produtos das
       * filhas — as 508 peças estão penduradas nelas, não na raiz. E o "Ver todos →" do mega menu
       * leva exatamente a essa página.
       *
       * Não dá para resolver no cadastro: o `CategoryMultiSelect` do formulário **não** marca o pai
       * automaticamente.
       */
      const branch = descendantIds(rows as MenuCategory[], self.id)

      /*
       * O filtro roda NO SERVIDOR, por um embed aliased — ver `PRODUCT_SELECT_BY_CATEGORY`.
       *
       * A versão anterior trazia os `product_id` da árvore e mandava a lista de uuids de volta na
       * URL. Com 508 produtos isso virou uma URL de 14.309 caracteres, recusada pelo gateway
       * (`BUG-20260809`). O que viaja agora são os ids das CATEGORIAS da descendência — dezenas, e
       * limitado pela profundidade da árvore, não pelo tamanho do catálogo.
       *
       * PST-06 AC 4 continua valendo: o filtro é por `product_categories` e não por
       * `products.category_id`, porque um produto em 3 categorias aparece nas 3 páginas.
       */
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT_BY_CATEGORY)
        .in(CATEGORY_FILTER_COLUMN, branch)
      if (error) fail(`carregar produtos de ${categorySlug}`, error)

      return (data ?? []).map(mapDbToProduct)
    },
  })

/**
 * Produto por `id` — usado pelo order bump, cuja oferta é guardada em
 * `store_settings.checkout.order_bump_product_id` (uuid). `useProduct` busca por `slug` e não
 * serve aqui. Reusa `mapDbToProduct`, então herda as dimensões de SHP-02.
 */
export const useProductById = (id: string | null | undefined) =>
  useQuery({
    queryKey: ['product', 'id', id],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('id', id!)
        .maybeSingle()
      if (error || !data) return null
      return mapDbToProduct(data)
    },
    enabled: !!id,
  })

export const useFeaturedProducts = () =>
  useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('is_featured', true)
      if (error || !data) return []
      return data.map(mapDbToProduct)
    },
  })

export const useNewProducts = () =>
  useQuery({
    queryKey: ['products', 'new'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('is_new', true)
      if (error || !data) return []
      return data.map(mapDbToProduct)
    },
  })

/**
 * `enabled` existe para a gaveta do carrinho, que fica montada em toda rota: sem ele, o catálogo
 * inteiro era buscado na montagem só para alimentar sugestões que talvez ninguém abra. A chave é a
 * mesma das outras telas, então quem chega depois do cache não dispara requisição nova.
 */
export const useAllProducts = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['products', 'all'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase.from('products').select(PRODUCT_SELECT)
      if (error || !data) return []
      return data.map(mapDbToProduct)
    },
    enabled: options?.enabled ?? true,
  })
