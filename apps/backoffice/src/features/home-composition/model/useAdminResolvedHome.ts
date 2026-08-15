// O contexto de `resolveHomeSections` visto do PAINEL (feature 24).
//
// O painel precisa da MESMA resposta que a loja — é o que faz a linha dizer "não vai aparecer" pelo
// mesmo motivo que a Home não desenha.
//
// **E agora ela vem da mesma função** (T35). Até a Fase 4 as três derivações viviam em
// `apps/store/src/widgets/**`, e como `apps/backoffice` não importa `apps/store`, este arquivo
// carregava uma **segunda escrita** delas: mesmos filtros, mesma ordenação, mesmo `slice`, em ~40
// linhas paralelas. Era o "defeito 01" do projeto no lugar mais caro — duas cópias divergentes
// fariam o painel prometer uma seção que a Home não renderiza —, e a deriva já havia começado (a
// cópia daqui usava `limit ?? 4` literal onde a loja usava `HOME_COLLECTION_ROWS`). As três foram
// movidas para `@estrelinha/core/home`, que é onde as duas pontas as leem.

import { useMemo } from 'react'
import {
  layoutSlots,
  pickHomeBanners,
  pickHomeCollections,
  pickTrendingCategories,
  resolveHomeSections,
  type HomeSection,
  type HomeSectionItem,
  type ResolveContext,
  type ResolvedItem,
  type ResolvedSection,
} from '@estrelinha/core/home'
import { categoryHref, type MenuCategory } from '@estrelinha/core/menu'
import { productPath } from '@estrelinha/core/routes'
import type { AdminCategory } from '@/entities/category'

type Candidata = MenuCategory & {
  active?: boolean
  banner_url?: string | null
  description?: string | null
}

const daCategoria = (
  categories: readonly Candidata[],
  categoria: Candidata,
  over: Partial<ResolvedItem> = {},
): ResolvedItem => ({
  id: categoria.id,
  categoryId: categoria.id,
  productId: null,
  slug: categoria.slug,
  label: categoria.name,
  description: categoria.description?.trim() || null,
  href: categoryHref(categories, categoria.id),
  imageUrl: categoria.banner_url?.trim() || null,
  curated: false,
  ...over,
})

export const useAdminResolvedHome = (
  sections: readonly HomeSection[],
  categories: readonly AdminCategory[],
): ResolvedSection[] =>
  useMemo(() => {
    const pool = categories as unknown as Candidata[]

    const secaoFileiras = sections.find(s => s.type === 'collection_rows')
    // Quem já abre uma fileira sai da grade de banners: conteúdo tem prioridade sobre campanha, e a
    // lista tem de sair da MESMA fonte que as fileiras usam — curadoria quando há, derivação quando
    // não —, senão as duas discordariam sobre quem está em fileira.
    const emFileira: string[] = !secaoFileiras
      ? []
      : secaoFileiras.items?.length
        ? secaoFileiras.items.map(i => i.category_id).filter((id): id is string => !!id)
        : pickHomeCollections(pool, secaoFileiras.config?.limit).map(c => c.id)

    const ctx: ResolveContext = {
      resolveItem: (item: HomeSectionItem): ResolvedItem | null => {
        if (item.category_id) {
          const categoria = pool.find(c => c.id === item.category_id)
          // Destino apagado ou despublicado sai da conta e entra em `droppedCount` — é o que
          // alimenta "N de M escolhidos saíram do ar" (`HOME-34`).
          if (!categoria || categoria.active === false) return null
          return daCategoria(pool, categoria, {
            id: item.id,
            label: item.alt?.trim() || categoria.name,
            imageUrl: item.image_url?.trim() || categoria.banner_url?.trim() || null,
            curated: true,
          })
        }

        // Destino de PRODUTO (emenda `E5`): o slug vem embutido na consulta, igual ao da loja. Sem
        // slug o produto está despublicado ou apagado, e a linha entra em `droppedCount` — é o que
        // faz o painel dizer a MESMA coisa que a Home desenha, em vez de prometer um banner que
        // nunca aparece.
        if (item.product_id) {
          const slug = item.product_slug?.trim()
          if (!slug) return null
          return {
            id: item.id,
            categoryId: null,
            productId: item.product_id,
            slug,
            label: item.alt?.trim() || item.label_snapshot?.trim() || slug,
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
            label: item.alt?.trim() || item.label_snapshot?.trim() || item.href.trim(),
            description: null,
            href: item.href.trim(),
            imageUrl: item.image_url?.trim() || null,
            curated: true,
          }
        }

        return null
      },

      derive: (section: HomeSection): ResolvedItem[] => {
        const limit = section.config?.limit

        // As três derivações são as MESMAS da loja, lidas de `core/home`. O que o painel faz de
        // diferente é só a forma de saída: ele precisa de `ResolvedItem` para a prévia e para o
        // resumo da linha, então cada uma volta à categoria de origem por id.
        const daId = (id: string): ResolvedItem | null => {
          const categoria = pool.find(c => c.id === id)
          return categoria ? daCategoria(pool, categoria) : null
        }
        const resolvidas = (ids: string[]): ResolvedItem[] =>
          ids.map(daId).filter((item): item is ResolvedItem => item !== null)

        if (section.type === 'banner_grid') {
          return resolvidas(
            pickHomeBanners(pool, {
              limit: layoutSlots(section.config?.layout),
              exclude: emFileira,
            }).map(b => b.id),
          )
        }
        if (section.type === 'collection_rows') {
          return resolvidas(pickHomeCollections(pool, limit).map(c => c.id))
        }
        if (section.type === 'trending_tags') {
          // Sem limite declarado a derivação **não corta**: quem corta é o `limit` da seção. Cortar
          // aqui por um número inventado seria um terceiro dono — a mesma leitura que a loja faz.
          return resolvidas(
            pickTrendingCategories(pool, limit ?? pool.length).map(c => c.id),
          )
        }
        return []
      },
    }

    return resolveHomeSections(sections, ctx)
  }, [sections, categories])
