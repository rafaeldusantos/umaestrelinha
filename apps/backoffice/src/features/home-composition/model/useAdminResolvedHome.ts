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

/**
 * Uma peça, como o painel precisa dela para responder **"está no ar?"** (feature 50, `R-02`).
 *
 * `AdminProduct` satisfaz, e `EditorProduct` também — os dois saem da mesma linha de `products`.
 * Estrutural de propósito: este arquivo não precisa do nome nem do preço, e pedir o tipo inteiro
 * obrigaria todo teste a montar um produto completo para provar uma regra de uma linha.
 *
 * **O campo é `is_active`, e não `active`.** Categoria usa `active`; produto usa `is_active`. Os
 * dois convivem a três linhas de distância no `resolveItem` abaixo, e trocar um pelo outro não é
 * erro de tipo em nenhum dos dois sentidos: `categoria.is_active` seria `undefined` (nunca
 * `false`), então **toda** peça passaria a ser considerada no ar, e o painel voltaria a prometer o
 * que a loja pula. É `AD-012` na forma mais barata de cometer — conferido em `DbProduct`, não de
 * memória.
 */
type Peca = {
  id: string
  slug: string
  is_active: boolean
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
  imageMobileUrl: null,
  curated: false,
  ...over,
})

export const useAdminResolvedHome = (
  sections: readonly HomeSection[],
  categories: readonly AdminCategory[],
  products: readonly Peca[] = [],
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
            imageMobileUrl: item.image_mobile_url?.trim() || null,
            curated: true,
          })
        }

        // Destino de PRODUTO (emenda `E5`, corrigido na feature 50).
        //
        // Quem responde "está no ar?" é o **catálogo**, e não o slug embutido. A leitura do painel é
        // feita como admin, e admin enxerga produto despublicado: o embed devolvia o slug de uma
        // peça que a cliente — que lê como `anon`, sob a RLS — nunca receberia. O painel dizia
        // "tudo certo" sobre um bloco que a Home desenhava pela metade (`R-02`, `AD-024`).
        //
        // O ramo espelha o de categoria, logo acima: ausente do catálogo (apagada) ou
        // `is_active === false` (despublicada) sai de cena e entra em `droppedCount`. O
        // `label_snapshot` continua sendo o que **nomeia** a perda — é a única fonte que sobra
        // depois do `on delete set null`.
        //
        // O recuo para `item.product_slug` existe para o RASCUNHO: a peça recém-escolhida no editor
        // chega com o slug congelado pela escolha, e a prévia precisa dela antes de qualquer
        // gravação (`DST-24`).
        if (item.product_id) {
          const produto = products.find(p => p.id === item.product_id)
          if (!produto || produto.is_active === false) return null

          const slug = produto.slug?.trim() || item.product_slug?.trim()
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
            imageMobileUrl: item.image_mobile_url?.trim() || null,
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
            imageMobileUrl: item.image_mobile_url?.trim() || null,
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
  }, [sections, categories, products])
