import { useQuery } from '@tanstack/react-query'
import { supabase } from '@nanapin/supabase/client'
import { descendantIds, type MenuCategory } from '@nanapin/core/menu'
import { mapDbToProduct, PRODUCT_SELECT } from '../lib/mapProduct'
import type { Product } from '@nanapin/supabase/types'

export const useProducts = (categorySlug?: string) =>
  useQuery({
    queryKey: ['products', categorySlug],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase.from('products').select(PRODUCT_SELECT)
      if (categorySlug) {
        // A árvore inteira, não só a categoria da rota: é dela que sai a descendência (MENU-03).
        // Duas colunas bastam — `descendantIds` só precisa de `id` e `parent_id`.
        const { data: tree } = await supabase.from('categories').select('id, parent_id, slug')
        const rows = (tree ?? []) as { id: string; parent_id: string | null; slug: string }[]
        const self = rows.find(c => c.slug === categorySlug)
        if (self) {
          /*
           * **Roll-up da descendência.** `/colecao/anime` tem de mostrar os produtos de "Naruto".
           *
           * Antes o filtro era `.eq('category_id', self.id)` — só o vínculo direto. Com hierarquia
           * isso quebra em silêncio: `/colecao/bottons` listava 4 produtos num catálogo de 32,
           * porque as 32 estão penduradas nas filhas. E o "Ver todos →" do mega menu levaria
           * exatamente a essa página — a que não tem os produtos que o menu acabou de listar.
           *
           * Não dá para resolver no cadastro: o `CategoryMultiSelect` do formulário de produto
           * **não** marca o pai automaticamente, então marcar "Naruto" não marca "Anime".
           *
           * `descendantIds` inclui a própria categoria, então o caso folha continua idêntico ao de
           * antes — e o `.in()` segue sendo UMA consulta, não uma por descendente.
           */
          const branch = descendantIds(rows as MenuCategory[], self.id)

          // PST-06 AC 4: o filtro é por `product_categories`, não por `products.category_id` — um
          // produto em 3 categorias tem de aparecer nas 3 páginas, e a coluna legada só guarda uma.
          const { data: links } = await supabase
            .from('product_categories')
            .select('product_id')
            .in('category_id', branch)
          // `Set`: um produto marcado no pai **e** na filha vem em duas linhas de vínculo, e sem
          // deduplicar o `.in('id', …)` carregaria a mesma listagem com o id repetido.
          const ids = [...new Set((links ?? []).map((l: { product_id: string }) => l.product_id))]
          // Sem nenhum vínculo a categoria está vazia. `in('id', [])` devolveria vazio de qualquer
          // forma, mas ser explícito evita depender desse detalhe do PostgREST.
          if (ids.length === 0) return []
          query = query.in('id', ids)
        }
      }
      const { data, error } = await query
      if (error || !data) return []
      return data.map(mapDbToProduct)
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
