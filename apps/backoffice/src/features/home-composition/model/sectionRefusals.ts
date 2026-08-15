// As recusas dos editores de seção (feature 24).
//
// Moram fora dos arquivos de componente por uma razão de ferramenta, a mesma que já separou o
// `sectionRenderers.tsx` da loja: um módulo que exporta um componente **e** uma função quebra o fast
// refresh do Vite, e o lint avisa. Aqui a separação também ficou boa por outro motivo — a recusa é
// domínio de tela, não desenho, e testá-la não devia exigir montar um formulário.
//
// **Nenhuma regra nova nasce aqui.** Toda cobrança vem de `@estrelinha/core/home`
// (`configRefusal`, `destinationRefusal`, `ctaHrefRefusal`): o formulário sabe **quais** perguntas
// fazer, não **qual** é a resposta certa. Uma segunda redação da mesma regra divergiria da loja no
// primeiro ajuste, que é o "defeito 01" do projeto.

import {
  configRefusal,
  ctaHrefRefusal,
  destinationRefusal,
  type HomeSectionConfig,
  type HomeSectionType,
} from '@estrelinha/core/home'
import type { DraftItem } from './sectionDraft'

/**
 * O número de um banner na tela.
 *
 * Um dono só porque a mesma palavra aparece em três lugares que **têm** de concordar: o botão
 * (“Acrescentar o 3º banner”), o rótulo do campo de arquivo e a recusa (“3º banner: envie a arte”).
 */
export const ordinal = (n: number): string => `${n}º`

/**
 * O mesmo número, no feminino — “3ª fileira”, “3ª coleção”.
 *
 * Vive ao lado de `ordinal` e não dentro do editor de fileiras pelo motivo que criou `ordinal`: a
 * palavra aparece no botão (“Acrescentar a 3ª fileira”), no rótulo do seletor e na recusa (“3ª
 * fileira: escolha a coleção”), e os três **têm** de dizer o mesmo número da mesma forma.
 */
export const ordinalF = (n: number): string => `${n}ª`

/**
 * O hero: `alt` obrigatório quando há foto (`HOME-18`) e destino que a loja serve (`HOME-20`).
 */
export const heroRefusal = (config: HomeSectionConfig): string | null =>
  configRefusal('hero', config) ?? ctaHrefRefusal(config.cta_href ?? '')

/**
 * A grade de banners.
 *
 * **Lista vazia NÃO é erro**: é a grade caindo na derivação por Categorias, que é o comportamento de
 * hoje (`HOME-25`). O que se cobra é de cada banner que existe — arte, descrição e destino. O número
 * entra na frente da mensagem porque uma tela com quatro linhas iguais precisa dizer **qual**.
 */
export const bannerGridRefusal = (
  config: HomeSectionConfig,
  items: readonly DraftItem[],
): string | null => {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (!item.image_url?.trim()) {
      return `${ordinal(i + 1)} banner: envie a arte. Sem imagem não há banner.`
    }
    const motivo = destinationRefusal(item)
    if (motivo) return `${ordinal(i + 1)} banner: ${motivo}`
  }
  return configRefusal('banner_grid', config)
}

/**
 * As fileiras de coleção.
 *
 * **Lista vazia NÃO é recusa**: é a seção no automático (`HOME-31`), que é o comportamento de hoje e
 * o que "Voltar ao automático" produz. O que se cobra é de cada fileira **que existe** — uma coleção.
 *
 * **Coleção que saiu do ar também não é recusa** (`HOME-34`): a loja pula e o painel avisa. Travar a
 * gravação por causa dela obrigaria a dona a mexer na vitrine para poder mexer em qualquer outra
 * coisa da seção, e o estado "escolhi uma coleção que hoje está desativada" é legítimo — ela pode
 * reativá-la em Categorias amanhã.
 */
export const collectionRowsRefusal = (
  config: HomeSectionConfig,
  items: readonly DraftItem[],
): string | null => {
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (item.category_id) continue
    // Sem destino e COM rótulo congelado é o estado que o `on delete set null` produz: a coleção foi
    // apagada de verdade. `HOME-24` pede que a tela diga **qual**, e o snapshot é a única fonte que
    // sobrou.
    const perdida = item.label_snapshot?.trim()
    return perdida
      ? `${ordinalF(i + 1)} fileira: “${perdida}” foi apagada. Escolha outra coleção ou remova a fileira.`
      : `${ordinalF(i + 1)} fileira: escolha a coleção.`
  }
  return configRefusal('collection_rows', config)
}

/**
 * As seções de texto: limite dentro da faixa do tipo (`HOME-42`) e link de escape que a loja serve.
 *
 * Recebe o tipo por fora porque **um editor serve quatro tipos**, e a faixa aceita é de cada um.
 */
export const textSectionRefusal =
  (type: HomeSectionType) =>
  (config: HomeSectionConfig): string | null =>
    configRefusal(type, config) ?? ctaHrefRefusal(config.link_href ?? '')
