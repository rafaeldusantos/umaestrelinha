// Feature 64 — o que a loja e o painel precisam concordar sobre o bloco **Lista de categorias**.
//
// O bloco é uma fileira de círculos: cada item é a arte que a dona enviou, um título curto e a
// coleção para onde ele leva. Nada aqui desenha e nada aqui conhece React — as respostas que este
// módulo guarda são exatamente as que, dadas em duas telas, divergiriam: quantos itens cabem, que
// rótulo sai embaixo do círculo, que arte entra nele e por que um rascunho não pode ser salvo.
//
// **O teto é RECUSA, não `config.limit`** (LCT-30), pelo motivo escrito em `featured.ts`:
// `resolveHomeSections` corta a lista pelo `limit`, e com ele "quantos itens aparecem" teria dois
// donos — a curadoria e o número.

import { ordinalF } from './carousel.ts'
import type { SlotSpec } from './layout.ts'
import type { ResolvedItem } from './resolve.ts'
import type { HomeSectionConfig, HomeSectionItem } from './types.ts'

/**
 * Quantos itens cabem num bloco (A-07).
 *
 * Teto de bloco, não de curadoria: quem quer mais acrescenta um segundo bloco, e é o que a recusa diz.
 */
export const CATEGORY_LIST_MAX_ITEMS = 24

/**
 * Quantos caracteres cabem no título embaixo do círculo.
 *
 * É o PAR do `check` de `home_section_items.title` (migration `20261012120000_64-…`), e
 * `categoryListSchema.test.ts` lê a migration do disco para comparar os dois números (LCT-27).
 */
export const CATEGORY_LIST_ITEM_TITLE_MAX = 28

/** Quantos caracteres cabem no título da seção, acima da fileira (A-08). */
export const CATEGORY_LIST_TITLE_MAX = 60

/**
 * A vaga da arte: quadrada, 800 × 800 (A-04). O aviso de proporção do upload sai daqui.
 *
 * Quadrada porque a loja mostra a arte **como ela é**, sem recorte: o círculo é desenhado dentro da
 * arte, com cantos transparentes, e não pela tela.
 */
export const CATEGORY_LIST_ART: SlotSpec = { width: 800, height: 800 }

/**
 * O rótulo embaixo do círculo — **o dono único** (LCT-02).
 *
 * Precedência **título > `alt` > nome da coleção**, igual nos dois lados: a resolução da loja (e da
 * prévia) chama esta função com o nome resolvido, e a linha fechada do editor chama com o nome do
 * catálogo cruzado. O editor deste tipo nunca grava `alt`, mas um `alt` chegado por escrita direta
 * tem de produzir o MESMO rótulo na tela e na loja.
 *
 * O `label_snapshot` **não** entra: ele é só o ramo de aviso do item cuja coleção foi apagada.
 * Espaço em branco não é título.
 */
export const categoryListLabel = (
  item: { title?: string | null; alt?: string | null } | null | undefined,
  collectionName: string,
): string => item?.title?.trim() || item?.alt?.trim() || collectionName

/**
 * O item como a Lista de categorias o desenha — ou `null` quando ele não desenha.
 *
 * Recebe o item cru **e** o que o `resolveItem` do app devolveu, e corrige o que o resolvedor
 * genérico faz certo para os outros blocos e errado para este:
 *
 * - destino que não é coleção (peça, endereço — só por escrita direta) não desenha (LCT-12);
 * - o rótulo é o de `categoryListLabel`; o nome que chega em `resolved.label` é lido AO VIVO da
 *   coleção, então renomeá-la muda o rótulo de quem não tem título (LCT-39);
 * - a arte é **só** a enviada: nunca o `banner_url` da coleção, que é largo e viraria um retângulo
 *   espremido num círculo de 80px. Sem arte, `imageUrl` é `null` e a loja desenha um círculo na cor
 *   principal com o rótulo dentro — a arte é **opcional**.
 */
export const categoryListItem = (
  item: HomeSectionItem,
  resolved: ResolvedItem,
): ResolvedItem | null => {
  if (!resolved.categoryId) return null
  return {
    ...resolved,
    label: categoryListLabel(item, resolved.label),
    imageUrl: item.image_url?.trim() || null,
    imageMobileUrl: null,
    description: null,
  }
}

const vazio = (valor: string | null | undefined): boolean => (valor ?? '').trim() === ''

/**
 * Por que este bloco não pode ser salvo — ou `null` quando pode.
 *
 * **A ordem das cobranças é regra**: o título da seção, o teto, e só então cada item na posição —
 * sem coleção, título longo. Lista **vazia não é recusa**: o bloco nasce sem itens (LCT-15), e quem
 * diz que ele não aparece é o `hiddenReason` da resolução (LCT-24).
 *
 * **Item sem imagem também não é recusa**: a arte é opcional, e sem ela a loja desenha um círculo na
 * cor principal com o rótulo dentro.
 *
 * `string | null`, e não união discriminada: `strictNullChecks: false` não estreita união por
 * literal booleano.
 */
export const categoryListRefusal = (
  config: HomeSectionConfig | null | undefined,
  items: readonly Partial<HomeSectionItem>[] | null | undefined,
): string | null => {
  if ((config?.title ?? '').length > CATEGORY_LIST_TITLE_MAX) {
    return `O título da seção passa de ${CATEGORY_LIST_TITLE_MAX} caracteres. Encurte-o para salvar.`
  }

  const lista = items ?? []

  if (lista.length > CATEGORY_LIST_MAX_ITEMS) {
    return (
      `Até ${CATEGORY_LIST_MAX_ITEMS} categorias por bloco, e há ${lista.length}. ` +
      'Remova as que sobram, ou acrescente um segundo bloco “Lista de categorias” para as outras.'
    )
  }

  for (let i = 0; i < lista.length; i += 1) {
    const item = lista[i]
    const numero = ordinalF(i + 1)

    if (vazio(item.category_id)) {
      // Sem coleção e com o nome congelado é o órfão que o `on delete set null` produz: a coleção
      // foi apagada depois de escolhida, e a frase diz QUAL — o snapshot é a única fonte que sobrou.
      const perdida = item.label_snapshot?.trim()
      return perdida
        ? `A ${numero} categoria perdeu a coleção “${perdida}”, que foi apagada. Escolha outra ou remova a categoria.`
        : `A ${numero} categoria está sem coleção.`
    }

    // Conta o texto CRU, como o `check` do banco (`char_length(title) <= 28`): aparar aqui deixaria
    // passar um título que o banco recusa.
    if ((item.title ?? '').length > CATEGORY_LIST_ITEM_TITLE_MAX) {
      return `O título da ${numero} categoria passa de ${CATEGORY_LIST_ITEM_TITLE_MAX} caracteres.`
    }
  }

  return null
}
