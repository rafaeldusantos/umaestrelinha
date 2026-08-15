import type { HomeBannerLayout } from './types'

/**
 * A vaga que uma fileira declara — é dela que sai a medida recomendada do aviso de proporção
 * (`HOME-27`), e é dela que a grade tira quantos banners cabem.
 */
export interface SlotSpec {
  width: number
  height: number
}

/**
 * **Quantas vagas cada arranjo tem, e com que proporção.**
 *
 * Mora em `core` e não no widget (emenda `E3`): a grade da loja (`HomeBannerGrid`) e o editor do
 * painel (`BannerGridEditor`) leem a **mesma** medida, e "quantos banners cabem em `hero_pair`"
 * respondido em dois lugares divergiria no primeiro ajuste — é o mesmo argumento que tirou a regra
 * do menu de dentro do `Header`.
 *
 * As medidas são as do desenho, em pixels, porque é o que a dona precisa para reexportar a arte. Os
 * dois pares de números de `hero_pair` são a grade de hoje em dobro (`588/510` e `588/243` no CSS,
 * `1176 × 1020` e `1176 × 486` no arquivo) — a densidade 2× é o que faz a arte não sair borrada em
 * tela retina.
 *
 * **A proporção é o que a loja usa; os pixels são o que o painel recomenda.** Por isso a grade
 * compara razões e não números absolutos.
 */
const LAYOUTS: Record<HomeBannerLayout, readonly SlotSpec[]> = {
  single: [{ width: 1176, height: 1020 }],
  pair: [
    { width: 588, height: 510 },
    { width: 588, height: 510 },
  ],
  hero_pair: [
    { width: 1176, height: 1020 },
    { width: 1176, height: 486 },
    { width: 1176, height: 486 },
  ],
  quad: [
    { width: 588, height: 510 },
    { width: 588, height: 510 },
    { width: 588, height: 510 },
    { width: 588, height: 510 },
  ],
}

/**
 * O arranjo de quem não declara um.
 *
 * `hero_pair` **é a grade de hoje** — um grande à esquerda e dois empilhados à direita —, e é o
 * default por isso: `HOME-04` exige que a virada não mude a página.
 */
export const DEFAULT_BANNER_LAYOUT: HomeBannerLayout = 'hero_pair'

/**
 * As vagas do arranjo, em ordem.
 *
 * Arranjo desconhecido (config gravado por uma versão mais nova) cai no default em vez de devolver
 * vazio: uma grade com zero vagas apagaria os banners que a dona já subiu, e a Home perderia a
 * seção sem nada acusar.
 *
 * Devolve **cópia**: a tabela acima é compartilhada pelo processo inteiro, e quem consome isto é uma
 * tela que ordena, corta e mapeia.
 */
export const layoutRatios = (layout: HomeBannerLayout | null | undefined): SlotSpec[] =>
  (LAYOUTS[layout] ?? LAYOUTS[DEFAULT_BANNER_LAYOUT]).map(slot => ({ ...slot }))

/** Quantos banners o arranjo desenha. */
export const layoutSlots = (layout: HomeBannerLayout | null | undefined): number =>
  layoutRatios(layout).length
