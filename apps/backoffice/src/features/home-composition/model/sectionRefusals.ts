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
 * As seções de texto: limite dentro da faixa do tipo (`HOME-42`) e link de escape que a loja serve.
 *
 * Recebe o tipo por fora porque **um editor serve quatro tipos**, e a faixa aceita é de cada um.
 */
export const textSectionRefusal =
  (type: HomeSectionType) =>
  (config: HomeSectionConfig): string | null =>
    configRefusal(type, config) ?? ctaHrefRefusal(config.link_href ?? '')
