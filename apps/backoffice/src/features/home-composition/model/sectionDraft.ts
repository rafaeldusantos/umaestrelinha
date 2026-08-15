// O rascunho de uma seção em edição (feature 24, T30).
//
// O editor de seção nunca escreve direto no que veio do banco: ele trabalha sobre uma cópia, e é
// isso que faz `HOME-14` valer — falha de gravação **preserva o que a dona preencheu**, porque o que
// ela preencheu está aqui e não numa releitura do servidor.

import type { HomeSection, HomeSectionConfig, HomeSectionItem } from '@estrelinha/core/home'
import type { NewHomeSectionItem } from '@/entities/home'

/**
 * Um item da curadoria enquanto está sendo editado.
 *
 * **`key` é de interface e não vai para o banco.** O item recém-acrescentado ainda não tem `id`, e a
 * lista é arrastável: sem uma chave estável o React reconciliaria por posição e o texto digitado num
 * campo saltaria para outra linha ao reordenar. Quem grava é `curateSection`, que apaga e reescreve
 * a lista inteira — então o `id` do banco não sobrevive à gravação e não serve de chave.
 */
export interface DraftItem {
  key: string
  category_id: string | null
  product_id: string | null
  href: string | null
  image_url: string | null
  alt: string | null
  label_snapshot: string | null
}

let sequencia = 0

/** Uma chave nova. Contador de processo, não `crypto.randomUUID`: isto nunca sai da tela. */
export const draftKey = (): string => {
  sequencia += 1
  return `rascunho-${sequencia}`
}

export const emptyDraftItem = (): DraftItem => ({
  key: draftKey(),
  category_id: null,
  product_id: null,
  href: null,
  image_url: null,
  alt: null,
  label_snapshot: null,
})

export const toDraftItems = (items: readonly HomeSectionItem[] | undefined): DraftItem[] =>
  [...(items ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(item => ({
      key: item.id,
      category_id: item.category_id ?? null,
      product_id: item.product_id ?? null,
      href: item.href ?? null,
      image_url: item.image_url ?? null,
      alt: item.alt ?? null,
      label_snapshot: item.label_snapshot ?? null,
    }))

/** O que vai para `curateSection` — a ordem da lista é a `position` gravada. */
export const toNewItems = (drafts: readonly DraftItem[]): NewHomeSectionItem[] =>
  drafts.map(({ key: _key, ...resto }) => resto)

/**
 * O rascunho mudou em relação ao que está no banco?
 *
 * Compara **o que seria gravado**, não a estrutura de tela: a `key` fica de fora, senão reabrir a
 * mesma seção acusaria alteração sem ninguém ter digitado nada.
 */
export const draftChanged = (section: HomeSection, config: HomeSectionConfig, items: readonly DraftItem[]): boolean =>
  JSON.stringify(config ?? {}) !== JSON.stringify(section.config ?? {}) ||
  JSON.stringify(toNewItems(items)) !== JSON.stringify(toNewItems(toDraftItems(section.items)))

/** A curadoria mudou? Só então vale apagar e reescrever a lista inteira. */
export const itemsChanged = (section: HomeSection, items: readonly DraftItem[]): boolean =>
  JSON.stringify(toNewItems(items)) !== JSON.stringify(toNewItems(toDraftItems(section.items)))

/**
 * A composição **como a prévia deve mostrá-la** — o que está no banco, com o rascunho por cima
 * (feature 25, `PRV-09`).
 *
 * Vive aqui, junto do rascunho, e não na página: é a tradução de `DraftItem` (forma de tela) para
 * `HomeSectionItem` (forma que a loja lê), e ela precisa de teste próprio. A `position` sai do índice
 * porque é a ordem da lista arrastável que manda, e o `id` sai da `key` porque a loja só o usa como
 * chave de React — **nenhum id de rascunho chega ao banco**, quem grava é `curateSection`.
 *
 * Sem seção aberta ou sem rascunho devolve a lista intacta: a prévia mostra o que está salvo.
 */
export const applyDraft = (
  sections: readonly HomeSection[],
  sectionId: string | null,
  draft: { config: HomeSectionConfig; items: readonly DraftItem[] } | null,
): HomeSection[] => {
  if (!sectionId || !draft) return [...sections]

  return sections.map(section =>
    section.id === sectionId
      ? {
          ...section,
          config: draft.config,
          items: draft.items.map((item, index) => ({
            id: item.key,
            section_id: section.id,
            position: index,
            category_id: item.category_id,
            product_id: item.product_id,
            href: item.href,
            image_url: item.image_url,
            alt: item.alt,
            label_snapshot: item.label_snapshot,
          })) as HomeSectionItem[],
        }
      : section,
  )
}
