import { useMemo } from 'react'
import {
  layoutSlots,
  pickHomeBanners,
  pickHomeCollections,
  pickTrendingCategories,
  resolveHomeSections,
  type HomeSection,
  type HomeSectionItem,
  type ResolvedItem,
  type ResolvedSection,
} from '@estrelinha/core/home'
import { categoryHref } from '@estrelinha/core/menu'
import { productPath } from '@estrelinha/core/routes'
import type { Category } from '@estrelinha/supabase/types'
import { useCategories } from '@/entities/category'

/**
 * O contexto de `resolveHomeSections`, montado com o catálogo da loja.
 *
 * **A derivação de hoje não é reescrita aqui, é injetada** — e desde a T35 ela vem de
 * `@estrelinha/core/home`, onde tem um dono só. `pickHomeBanners`, `pickHomeCollections` e
 * `pickTrendingCategories` carregam decisões medidas (só raiz vira fileira; quem virou fileira sai
 * da grade; chip é folha da árvore), e o painel lê exatamente as mesmas — é o que faz a linha dele
 * dizer "não vai aparecer" pelo mesmo motivo que a Home não desenha.
 *
 * O que continua injetado é `resolveItem`: dizer se a coleção de destino ainda está publicada exige
 * o catálogo, e o catálogo é de quem chama.
 */

const daCategoria = (
  categories: readonly Category[] | undefined,
  categoria: Category,
  over: Partial<ResolvedItem> = {},
): ResolvedItem => ({
  id: categoria.id,
  categoryId: categoria.id,
  productId: null,
  slug: categoria.slug,
  label: categoria.name,
  description: categoria.description?.trim() || null,
  href: categoryHref(categories ?? [], categoria.id),
  imageUrl: categoria.banner_url?.trim() || null,
  curated: false,
  ...over,
})

export const useResolvedHome = (sections: readonly HomeSection[]): ResolvedSection[] => {
  const { data: categories } = useCategories()

  return useMemo(() => {
    const fileiras = sections.find(s => s.type === 'collection_rows')

    /**
     * Quem já abre uma fileira de coleção sai da grade de banners: conteúdo tem prioridade sobre
     * campanha, e repetir a mesma arte a duas dobras de distância é o defeito que o `exclude`
     * fecha. A lista tem de sair da MESMA fonte que as fileiras usam — curadoria quando há, a
     * derivação quando não —, senão as duas discordariam sobre quem está em fileira.
     */
    const emFileira: string[] = !fileiras
      ? []
      : fileiras.items?.length
        ? fileiras.items.map(i => i.category_id).filter((id): id is string => !!id)
        : pickHomeCollections(categories, fileiras.config?.limit).map(c => c.id)

    /**
     * Um item curado, ou `null` quando o destino saiu do ar.
     *
     * Categoria despublicada ou apagada devolve `null` e entra em `droppedCount`: a loja pula, e o
     * painel conta "N de M escolhidos saíram do ar" (`HOME-34`). O `label_snapshot` não é lido aqui
     * — ele existe só para o painel poder **nomear** o que se perdeu.
     */
    const resolveItem = (item: HomeSectionItem): ResolvedItem | null => {
      if (item.category_id) {
        const categoria = categories?.find(c => c.id === item.category_id)
        if (!categoria || categoria.active === false) return null
        return daCategoria(categories, categoria, {
          id: item.id,
          label: item.alt?.trim() || categoria.name,
          // A arte própria vence a do destino: banner de campanha é a arte que a dona subiu.
          imageUrl: item.image_url?.trim() || categoria.banner_url?.trim() || null,
          curated: true,
        })
      }

      /**
       * Destino de PRODUTO — emenda `E5`, fechada na T28.
       *
       * O slug chega **embutido na mesma consulta** (`product:products(slug)`): a linha guarda o id,
       * e `/produtos/:slug` precisa do slug. Uma segunda consulta por id daria dois estados de
       * carregamento numa página só, e `useProducts(undefined)` baixaria o catálogo inteiro na Home
       * — o defeito que a feature 23 fechou.
       *
       * **Sem slug é fora do ar, e quem decide é a RLS**: produto despublicado ou apagado volta com
       * `product: null` e o `product_id` intacto (medido em probe), então o banner sai de cena e
       * entra em `droppedCount` — nunca vira link para 404 (`HOME-24`).
       */
      if (item.product_id) {
        const slug = item.product_slug?.trim()
        if (!slug) return null
        return {
          id: item.id,
          categoryId: null,
          productId: item.product_id,
          slug,
          label: item.alt?.trim() ?? '',
          description: null,
          href: productPath(slug),
          imageUrl: item.image_url?.trim() || null,
          curated: true,
        }
      }

      if (item.href?.trim()) {
        return {
          id: item.id,
          categoryId: null,
          productId: null,
          slug: null,
          label: item.alt?.trim() ?? '',
          description: null,
          href: item.href.trim(),
          imageUrl: item.image_url?.trim() || null,
          curated: true,
        }
      }

      // Zero destinos: o estado órfão que o `on delete set null` produz. A loja pula; quem nomeia o
      // que se perdeu é o painel, pelo `label_snapshot`.
      return null
    }

    const derive = (section: HomeSection): ResolvedItem[] => {
      const limit = section.config?.limit

      if (section.type === 'banner_grid') {
        return pickHomeBanners(categories, {
          limit: layoutSlots(section.config?.layout),
          exclude: emFileira,
        }).map(b => ({
          id: b.id,
          categoryId: b.id,
          productId: null,
          slug: null,
          label: b.name,
          description: null,
          href: b.href,
          imageUrl: b.bannerUrl,
          curated: false,
        }))
      }

      if (section.type === 'collection_rows') {
        return pickHomeCollections(categories, limit).map(c => ({
          id: c.id,
          categoryId: c.id,
          productId: null,
          slug: c.slug,
          label: c.name,
          description: c.description,
          href: c.href,
          imageUrl: c.bannerUrl,
          curated: false,
        }))
      }

      if (section.type === 'trending_tags') {
        // Sem limite declarado a derivação **não corta**: quem corta é o `limit` da seção, e o
        // widget tem o próprio padrão. Cortar aqui por um número inventado seria um terceiro dono.
        return pickTrendingCategories(categories, limit ?? (categories?.length ?? 0)).map(c =>
          daCategoria(categories, c),
        )
      }

      return []
    }

    return resolveHomeSections(sections, { resolveItem, derive })
  }, [sections, categories])
}
