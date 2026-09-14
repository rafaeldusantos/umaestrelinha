// Feature 50 — o que a loja e o painel precisam saber sobre o bloco **Produtos em destaque**.
//
// O bloco é uma curadoria: a dona escolhe estas peças, nesta ordem, e diz se elas saem em fita ou em
// grade. Nada aqui desenha e nada aqui conhece React — as três respostas que este módulo guarda são
// exatamente as que, dadas em duas telas, divergiriam: quantas peças cabem, como o bloco se
// apresenta e por que um rascunho não pode ser salvo.
//
// **O teto é RECUSA, não `config.limit`.** `resolveHomeSections` corta a lista pelo `limit`, e com
// ele "quantos produtos aparecem" teria dois donos — a curadoria e o número. Molde de
// `heroCarouselSlidesRefusal`, que também é teto sem `limit`.

import { ordinal } from './carousel.ts'
import type { HomeFeaturedDisplay, HomeSectionConfig, HomeSectionItem } from './types.ts'

/**
 * Quantas peças cabem num bloco.
 *
 * Doze é a resposta da dona: três linhas de quatro na grade, e ainda legível como fita. **É teto de
 * bloco, não de curadoria** — quem quer mais acrescenta um segundo bloco, que continua sendo decisão
 * dela, e é o que a recusa diz por extenso.
 */
export const FEATURED_PRODUCTS_MAX = 12

/**
 * Como este bloco se apresenta — `slider` para tudo o que não é `grid`.
 *
 * Molde literal de `heroCarouselWidth`, e pelo mesmo motivo: `config` gravado por uma versão mais
 * nova, por escrita direta ou por importação **não pode apagar o bloco da Home**. Valor desconhecido
 * cai no padrão em vez de recusar (`DST-10`), e o padrão é `slider` porque é a fileira que a Home já
 * pratica.
 */
export const featuredDisplay = (
  valor: string | null | undefined,
): HomeFeaturedDisplay => (valor === 'grid' ? 'grid' : 'slider')

/**
 * Por que este bloco não pode ser salvo — ou `null` quando pode.
 *
 * **A ordem das cobranças é regra, e não arrumação**: título primeiro (é ele que abre a seção na
 * loja), lista depois (bloco sem peça não aparece), teto em seguida, e só então cada item. Trocar a
 * ordem faria a tela cobrar a 13ª peça de um bloco que ainda não tem nome.
 *
 * Devolve `string | null`, e não união discriminada: `strictNullChecks: false` não estreita união por
 * literal booleano, e ler o motivo no ramo do `else` seria TS2339.
 */
export const featuredProductsRefusal = (
  config: HomeSectionConfig | null | undefined,
  items: readonly Partial<HomeSectionItem>[] | null | undefined,
): string | null => {
  if ((config?.title ?? '').trim() === '') {
    return 'Dê um título ao bloco. É ele que abre a seção na loja — sem título, a vitrine começa com uma fileira de peças sem dizer por quê.'
  }

  const lista = items ?? []

  if (lista.length === 0) {
    return 'Escolha ao menos uma peça. Um bloco sem peça escolhida não aparece na loja.'
  }

  if (lista.length > FEATURED_PRODUCTS_MAX) {
    return (
      `Cabem ${FEATURED_PRODUCTS_MAX} peças neste bloco, e há ${lista.length}. ` +
      'Remova as que sobram, ou acrescente um segundo bloco “Produtos em destaque” para as outras.'
    )
  }

  const vistos = new Set<string>()

  for (let i = 0; i < lista.length; i += 1) {
    const numero = ordinal(i + 1)
    const id = (lista[i].product_id ?? '').trim()

    // Item sem produto é o estado órfão que o `on delete set null` produz — a peça foi apagada do
    // catálogo depois de escolhida. A loja o pula; aqui ele é cobrado, porque salvar de novo com
    // ele dentro gravaria uma linha que nunca vai desenhar.
    if (id === '') {
      return `${numero} item: escolha a peça, ou remova esta linha. Ela perdeu o produto do catálogo.`
    }

    if (vistos.has(id)) {
      return `${numero} item: esta peça já está no bloco. Cada uma aparece uma vez.`
    }

    vistos.add(id)
  }

  return null
}
