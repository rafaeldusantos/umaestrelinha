import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { descendantIds, type MenuCategory } from '@estrelinha/core/menu'
import {
  CATEGORY_FILTER_COLUMN,
  mapDbToProduct,
  PRODUCT_CARD_SELECT,
  PRODUCT_CARD_SELECT_BY_CATEGORY,
  PRODUCT_SELECT,
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

/**
 * **O teto de toda leitura de listagem — declarado, e não herdado.**
 *
 * Sem `.limit()` o PostgREST não devolve tudo: ele corta em `db-max-rows` (1.000 nesta instância) e
 * responde 200 com a lista truncada. Um catálogo que cruze essa marca perderia produtos na vitrine
 * **sem erro em lugar nenhum** — o mesmo modo de falha que a `21` mediu em `product_variants` e que
 * `@estrelinha/core/paging` existe para fechar.
 *
 * Declarar o teto não conserta a truncagem; conserta a **invisibilidade** dela. O fecho de verdade
 * é `BL-020`, que tira a busca e a listagem do "baixa o catálogo inteiro" — enquanto ele não vem, o
 * número está escrito aqui, num lugar só, em vez de morar na configuração de um servidor.
 */
export const LISTING_LIMIT = 1000

/**
 * A ordenação declarada da listagem.
 *
 * **Limite sem ordem é lista indefinida.** Sem `.order`, o PostgREST devolve as linhas na ordem que
 * o plano de execução produzir — hoje isso não incomoda porque a resposta é completa e a tela ordena
 * o que quiser em memória (`sortProducts`, `LST-*`). Com teto, "as primeiras N" passa a ser uma
 * pergunta que o banco precisa responder sempre igual: sem ordem, a fileira da home poderia mostrar
 * quatro peças diferentes a cada recarga.
 *
 * `created_at` ascendente aproxima a ordem de inserção, que é a que a vitrine já pratica. O
 * desempate por `id` não é preciosismo: o importador grava em lotes dentro de uma transação, e
 * `now()` é o tempo da TRANSAÇÃO — centenas de produtos compartilham o mesmo `created_at`, e sem o
 * segundo critério o empate voltaria a ser indefinido.
 */
const LISTING_ORDER = 'created_at'
const LISTING_ORDER_TIEBREAK = 'id'

/** O builder do PostgREST devolve `this` em `order`/`limit`, então a janela é encadeável. */
interface ListingWindow<Q> {
  order(column: string, options: { ascending: boolean }): Q
  limit(count: number): Q
}

/** Ordem declarada + teto explícito. Todo caminho de listagem passa por aqui. */
const listingWindow = <Q extends ListingWindow<Q>>(query: Q, limit = LISTING_LIMIT): Q =>
  query
    .order(LISTING_ORDER, { ascending: true })
    .order(LISTING_ORDER_TIEBREAK, { ascending: true })
    .limit(limit)

/**
 * As opções das listagens: o interruptor de `URL-04` e o teto por chamada.
 *
 * **`limit` entra na chave do React Query de propósito.** A fileira da home pede 4 e a página da
 * categoria pede o catálogo da categoria — com a mesma chave, quem chegasse primeiro serviria o
 * outro, e a categoria inteira apareceria com quatro produtos (ou a home baixaria os 505).
 */
export interface ProductListOptions {
  enabled?: boolean
  /** Quantas linhas o SERVIDOR devolve. Ausente = o teto de `LISTING_LIMIT`. */
  limit?: number
}

/**
 * Os produtos de uma categoria — ou o catálogo inteiro quando não há slug.
 *
 * `enabled` entra com `URL-04`: com a categoria servida na **raiz do domínio** (`AD-018`), toda URL
 * errada passa por esta página, e sem o interruptor a loja baixaria 689 produtos antes de mostrar a
 * 404. Quem liga é a `CategoryPage`, e só quando a resolução da rota é `ok`. Mesmo padrão de
 * `useAllProducts`, logo abaixo.
 *
 * `limit` entra com `PRF-09`: quem desenha quatro cards não precisa da árvore inteira. Medido em
 * 2026-09-05, a home disparava **quatro** consultas de categoria-raiz — `joias-afetivas` sozinha
 * trazia 505 produtos e 1,10 MB comprimidos para mostrar **quatro**. O filtro, a ordenação e a
 * janela de rolagem da categoria continuam onde estavam, no cliente e sobre a lista inteira
 * (`LST-*`, feature `32`): quem passa `limit` é só quem desenha uma vitrine de tamanho fixo.
 */
export const useProducts = (categorySlug?: string, options?: ProductListOptions) =>
  useQuery({
    queryKey: ['products', categorySlug, options?.limit ?? null],
    queryFn: async (): Promise<Product[]> => {
      if (!categorySlug) {
        const { data, error } = await listingWindow(
          supabase.from('products').select(PRODUCT_CARD_SELECT),
          options?.limit,
        )
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
      /*
       * **Slug informado que não casa com categoria nenhuma devolve VAZIO — e essa é a virada de
       * `URL-04`.**
       *
       * Até a feature 23 este ramo seguia sem filtrar e devolvia o catálogo completo. Fazia sentido
       * enquanto categoria morava em `/colecao/:slug`: quem chegava ali tinha digitado um endereço
       * de coleção, e quem respondia pelo "não encontrada" era a página, por `useCategoryBySlug`.
       *
       * Com a categoria na raiz do domínio, **qualquer** URL errada da loja cai nesta consulta —
       * e devolver o catálogo inteiro é literalmente o que `URL-04` proíbe ("nunca tela branca nem
       * listagem completa do catálogo"), além de baixar 689 produtos para mostrar uma 404.
       */
      if (!self) return []

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
       * O filtro roda NO SERVIDOR, por um embed aliased — ver `PRODUCT_CARD_SELECT_BY_CATEGORY`.
       *
       * A versão anterior trazia os `product_id` da árvore e mandava a lista de uuids de volta na
       * URL. Com 508 produtos isso virou uma URL de 14.309 caracteres, recusada pelo gateway
       * (`BUG-20260809`). O que viaja agora são os ids das CATEGORIAS da descendência — dezenas, e
       * limitado pela profundidade da árvore, não pelo tamanho do catálogo.
       *
       * PST-06 AC 4 continua valendo: o filtro é por `product_categories` e não por
       * `products.category_id`, porque um produto em 3 categorias aparece nas 3 páginas.
       */
      const { data, error } = await listingWindow(
        supabase
          .from('products')
          .select(PRODUCT_CARD_SELECT_BY_CATEGORY)
          .in(CATEGORY_FILTER_COLUMN, branch),
        options?.limit,
      )
      if (error) fail(`carregar produtos de ${categorySlug}`, error)

      return (data ?? []).map(mapDbToProduct)
    },
    enabled: options?.enabled ?? true,
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
      const { data, error } = await listingWindow(
        supabase.from('products').select(PRODUCT_CARD_SELECT).eq('is_featured', true),
      )
      if (error || !data) return []
      return data.map(mapDbToProduct)
    },
  })

export const useNewProducts = () =>
  useQuery({
    queryKey: ['products', 'new'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await listingWindow(
        supabase.from('products').select(PRODUCT_CARD_SELECT).eq('is_new', true),
      )
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
      const { data, error } = await listingWindow(
        supabase.from('products').select(PRODUCT_CARD_SELECT),
      )
      if (error || !data) return []
      return data.map(mapDbToProduct)
    },
    enabled: options?.enabled ?? true,
  })
