// Feature 41 — o que a loja e o painel precisam saber sobre o **Banner principal**, num lugar só.
//
// O bloco é um carrossel de arte enviada pela dona: um slide é uma arte de computador, uma arte de
// celular, uma descrição e um destino. Nada de texto sobreposto — a arte já carrega a frase, que é
// como a Adri monta campanha hoje.
//
// **Nada aqui desenha, e nada aqui conhece React.** As três coisas que este módulo guarda são
// exatamente as que, respondidas em duas telas, divergiriam: a medida da vaga (o painel recomenda, a
// loja reserva), a aritmética do carrossel (o hook usa, o teste prova) e a régua do que pode ser
// salvo (o editor cobra, a loja confia).

import { surfaceArt, type DeviceSurface, type SurfaceArt } from '../media/surfaceArt.ts'
import type { SlotSpec } from './layout.ts'
import { destinationRefusal } from './refusals.ts'
import type { HomeSectionConfig, HomeSectionItem, HomeBannerWidth } from './types.ts'

/**
 * As vagas do banner, **uma por dispositivo**.
 *
 * Não é uma proporção com dois recortes: são dois enquadramentos do mesmo anúncio. Uma arte 8:3 de
 * topo, servida em 390px, vira uma tira de 146px de altura — e o texto embutido nela fica ilegível
 * justamente em ~90% dos acessos. Por isso o celular é **retrato**.
 *
 * **A proporção é o que a loja reserva; os pixels são o que o painel recomenda.** Mesmo par que
 * `layoutRatios` já usa para a grade de banners, e pelo mesmo motivo: ter as duas medidas no mesmo
 * lugar é o que impede a tela de inventar a sua.
 *
 * Números registrados como suposição a confirmar contra uma arte real da Adri (`spec.md`,
 * *Assumptions*). Trocá-los é trocar estes dois objetos — a loja e o painel leem daqui.
 */
export const HERO_CAROUSEL_SLOTS: Record<DeviceSurface, SlotSpec> = {
  desktop: { width: 1440, height: 540 },
  mobile: { width: 780, height: 975 },
}

/**
 * Quantos slides cabem numa seção.
 *
 * **É teto de PESO DE PÁGINA, não de curadoria** — e a diferença importa, porque a feature 39 removeu
 * um teto por ser exatamente o contrário disso (número de código recusando quais coleções a dona
 * mostra no menu). Aqui cada slide é uma imagem que alguém baixa, e a saída para quem quer mais é
 * criar uma segunda seção, que continua sendo decisão dela.
 *
 * Seis com a loja de referência usando quatro: folga suficiente para nunca ser sentido no uso normal.
 */
export const HERO_CAROUSEL_MAX_SLIDES = 6

/**
 * Quanto tempo cada slide fica na frente.
 *
 * Fixo, e **sem campo no painel**: duração configurável é número sem origem, do tipo que ninguém
 * depois consegue justificar. Seis segundos é o tempo de ler uma arte com frase curta — e esta loja
 * não tem pressa fabricada em lugar nenhum.
 */
export const HERO_CAROUSEL_INTERVAL_MS = 6000

/** As duas larguras, escritas por extenso — o painel oferece exatamente estas. */
export const HERO_CAROUSEL_WIDTHS: readonly HomeBannerWidth[] = ['full', 'wide']

/**
 * A largura desta seção — `full` para tudo o que não é `wide`.
 *
 * Config gravado por uma versão mais nova, por escrita direta ou por importação **não pode derrubar a
 * Home**: cair no padrão é a mesma escolha que `layoutRatios` faz com arranjo desconhecido. E o
 * padrão é `full` porque é o modelo da loja de referência.
 */
export const heroCarouselWidth = (config: HomeSectionConfig | null | undefined): HomeBannerWidth =>
  config?.width === 'wide' ? 'wide' : 'full'

/**
 * A arte deste slide para esta superfície, com recuo para a da outra.
 *
 * **Delega no dono único** (`AD-030`). A porta existe para o chamador não precisar saber que
 * `image_url` é a arte de computador — esse é o nome herdado da feature 24, quando havia uma arte só.
 */
export const heroSlideArt = (
  item: Pick<HomeSectionItem, 'image_url' | 'image_mobile_url'> | null | undefined,
  surface: DeviceSurface,
): SurfaceArt => surfaceArt(item?.image_url, item?.image_mobile_url, surface)

/** O ordinal masculino, como a tela o escreve. Um dono só, porque a frase aparece em três lugares. */
const ordinal = (n: number): string => `${n}º`

const vazio = (valor: string | null | undefined): boolean => (valor ?? '').trim() === ''

/**
 * Por que esta lista de slides não pode ser salva — ou `null` quando pode.
 *
 * A ordem das cobranças **é** regra, e não arrumação: arte primeiro (sem imagem não há banner),
 * descrição depois (a arte carrega a frase da campanha, e sem `alt` ela é invisível para leitor de
 * tela e para o Google), destino por último. Trocar a ordem faria a tela pedir a descrição de uma
 * arte que ainda não existe.
 *
 * **Nenhuma régua nova nasce aqui**: o destino é cobrado por `destinationRefusal`, a mesma que a
 * grade de banners usa — inclusive a validação do caminho livre, que é dela e não do chamador.
 *
 * Devolve `string | null`, e não união discriminada: `strictNullChecks: false` não estreita união por
 * literal booleano, e ler o motivo no ramo do `else` seria TS2339.
 */
export const heroCarouselSlidesRefusal = (
  items: readonly Partial<HomeSectionItem>[] | null | undefined,
): string | null => {
  const lista = items ?? []

  if (lista.length > HERO_CAROUSEL_MAX_SLIDES) {
    return (
      `Cabem ${HERO_CAROUSEL_MAX_SLIDES} banners neste bloco, e há ${lista.length}. ` +
      'Remova os que sobram, ou acrescente um segundo bloco “Banner principal” para os outros.'
    )
  }

  for (let i = 0; i < lista.length; i += 1) {
    const item = lista[i]
    const numero = ordinal(i + 1)

    if (vazio(item.image_url) && vazio(item.image_mobile_url)) {
      return `${numero} banner: envie a arte. Sem imagem não há banner.`
    }

    if (vazio(item.alt)) {
      return `${numero} banner: descreva a arte. A frase da campanha está dentro da imagem, e quem usa leitor de tela só tem essa descrição.`
    }

    const motivo = destinationRefusal(item)
    if (motivo) return `${numero} banner: ${motivo}`
  }

  return null
}

/**
 * O próximo índice, circulando.
 *
 * Puro e fora do DOM de propósito: **jsdom devolve 0 para toda medida de layout**, então a única
 * parte do carrossel que dá para provar em teste de componente é a que não depende de medida. Esta é
 * ela.
 *
 * `total <= 1` devolve 0 em vez de circular: com um slide não há para onde ir, e o hook usa isso para
 * nem criar o temporizador.
 */
export const nextSlideIndex = (current: number, total: number, step = 1): number => {
  if (!(total > 1)) return 0
  const base = Number.isFinite(current) ? Math.trunc(current) : 0
  return ((((base + step) % total) + total) % total)
}

/**
 * Qual slide está na frente, a partir da posição real de rolagem.
 *
 * **A posição manda, nunca um contador paralelo.** O trilho é um container com `scroll-snap`: a
 * cliente arrasta o dedo e o navegador decide onde parar, sem passar por nós. Um índice mantido à
 * parte discordaria dele no primeiro arrasto — e as bolinhas passariam a apontar para outro banner.
 * É o mesmo princípio de `useOverflowAffordance`, que a barra do menu já usa (`BL-028`).
 *
 * `slideWidth <= 0` devolve 0: é o que jsdom entrega, e é o que um container ainda não medido
 * entrega no primeiro quadro. Dividir por ele daria `Infinity` e um índice fora da lista.
 */
export const slideIndexFromScroll = (
  scrollLeft: number,
  slideWidth: number,
  total: number,
): number => {
  if (!(total > 0)) return 0
  if (!(slideWidth > 0) || !Number.isFinite(scrollLeft)) return 0
  const bruto = Math.round(scrollLeft / slideWidth)
  return Math.min(Math.max(bruto, 0), total - 1)
}
