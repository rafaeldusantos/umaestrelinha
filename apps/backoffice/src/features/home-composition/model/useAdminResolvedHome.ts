// O contexto de `resolveHomeSections` visto do PAINEL (feature 24).
//
// A loja monta o dela com `pickHomeBanners` / `pickHomeCollections` / `pickTrendingCategories`
// (`store/widgets/home-*/model` e `features/search/lib`). O painel precisa da MESMA resposta — é o
// que faz a linha dizer "não vai aparecer" pelo mesmo motivo que a loja não desenha —, mas
// `apps/backoffice` não importa `apps/store`.
//
// SPEC_DEVIATION: a derivação abaixo é uma segunda escrita das três regras da loja.
// Reason: as três são funções puras que vivem em `apps/store/src/widgets/**`, e o backoffice não
// tem como importá-las — não há alias entre os dois apps, e criar um traria os tokens e a árvore de
// dependências da loja junto. Movê-las para `@estrelinha/core/home` é a correção certa e está FORA
// do escopo desta task: mexeria em três widgets da loja, nos testes deles e nos barrels — o tipo de
// refatoração que a T25 não pode carregar sem virar outra coisa. **Registrado para o orquestrador**:
// enquanto as duas cópias existirem, um ajuste na derivação da loja pode fazer o painel prometer
// uma seção que a Home não desenha. As regras estão transcritas com o porquê de cada uma, e os
// primitivos compartilhados (`bySortOrder`, `categoryHref`) vêm de `@estrelinha/core/menu` — o que
// diverge é a seleção, não a ordenação nem o destino.

import { useMemo } from 'react'
import {
  layoutSlots,
  resolveHomeSections,
  type HomeSection,
  type HomeSectionItem,
  type ResolveContext,
  type ResolvedItem,
  type ResolvedSection,
} from '@estrelinha/core/home'
import { bySortOrder, categoryHref, type MenuCategory } from '@estrelinha/core/menu'
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

/** Só RAIZ vira fileira: pai e filha na mesma página mostrariam os mesmos produtos duas vezes. */
const fileiras = (categories: readonly Candidata[], limit?: number): Candidata[] =>
  [...categories].filter(c => c.active && c.parent_id === null).sort(bySortOrder).slice(0, limit ?? 4)

/** A curadoria da grade é a IMAGEM: quem subiu `banner_url` está dizendo "esta merece vitrine". */
const banners = (
  categories: readonly Candidata[],
  limit: number,
  exclude: readonly string[],
): Candidata[] => {
  const fora = new Set(exclude)
  return [...categories]
    .filter(c => c.active !== false && !!c.banner_url?.trim() && !fora.has(c.id))
    .sort(bySortOrder)
    .slice(0, limit)
}

/** Chip é FOLHA, não raiz: ninguém busca a categoria que contém tudo, busca o tema. */
const folhas = (categories: readonly Candidata[], limit?: number): Candidata[] => {
  const pais = new Set(categories.map(c => c.parent_id).filter(Boolean))
  const leaves = categories.filter(c => !pais.has(c.id))
  const lista = leaves.length > 0 ? leaves : [...categories]
  return typeof limit === 'number' ? lista.slice(0, limit) : lista
}

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
        : fileiras(pool, secaoFileiras.config?.limit).map(c => c.id)

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

        // Destino de produto ainda não resolve — o par da emenda `E5`, com dono na T28. Enquanto o
        // slug não vier embutido na consulta, o painel trata como fora do ar, que é o mesmo que a
        // loja faz: as duas pontas erram junto em vez de discordarem.
        return null
      },

      derive: (section: HomeSection): ResolvedItem[] => {
        const limit = section.config?.limit

        if (section.type === 'banner_grid') {
          return banners(pool, layoutSlots(section.config?.layout), emFileira).map(c =>
            daCategoria(pool, c),
          )
        }
        if (section.type === 'collection_rows') {
          return fileiras(pool, limit).map(c => daCategoria(pool, c))
        }
        if (section.type === 'trending_tags') {
          return folhas(pool, limit).map(c => daCategoria(pool, c))
        }
        return []
      },
    }

    return resolveHomeSections(sections, ctx)
  }, [sections, categories])
