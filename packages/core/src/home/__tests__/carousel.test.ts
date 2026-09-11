import { describe, expect, it } from 'vitest'
import {
  HERO_CAROUSEL_INTERVAL_MS,
  HERO_CAROUSEL_MAX_SLIDES,
  HERO_CAROUSEL_SLOTS,
  HERO_CAROUSEL_WIDTHS,
  heroCarouselSlidesRefusal,
  heroCarouselWidth,
  heroSlideArt,
  nextSlideIndex,
  slideIndexFromScroll,
} from '../carousel'
import { surfaceArt } from '../../media/surfaceArt'
import type { HomeSectionItem } from '../types'

/**
 * Feature 41 — `BNR-10`..`BNR-13`, `BNR-20`, `BNR-22`, `BNR-26`, `BNR-30`.
 *
 * Este arquivo guarda a parte do carrossel que **dá para provar sem DOM**, e não é uma escolha de
 * conveniência: jsdom devolve 0 para toda medida de layout, então a aritmética que decide qual slide
 * está na frente não tem como ser medida num teste de componente. Ela mora aqui por isso.
 */

const slide = (over: Partial<HomeSectionItem> = {}): Partial<HomeSectionItem> => ({
  image_url: '/d.jpg',
  image_mobile_url: '/m.jpg',
  alt: 'coleção de leite materno',
  category_id: 'cat-1',
  ...over,
})

// ---------------------------------------------------------------------------
// As medidas
// ---------------------------------------------------------------------------

/**
 * **A régua da vaga do celular, escrita como PREDICADO** — para a asserção e o sensor chamarem a
 * mesma função, e não duas descrições da mesma regra que divergem na terceira edição.
 *
 * O que `BNR-26` compra não é "retrato": é **altura de leitura em 390px**, porque a frase da
 * campanha está desenhada dentro da arte. Quadrado cumpre (390px de altura numa viewport de 390); a
 * tira 3:1 do computador não (130px). A régua antiga dizia `height > width` e teria **reprovado a
 * arte real da Adri**, que é 720 × 720 — congelava um formato em vez da propriedade.
 */
const paisagem = (slot: { width: number; height: number }): boolean => slot.width > slot.height
const alturaEm390 = (slot: { width: number; height: number }): number =>
  Math.round(390 / (slot.width / slot.height))

describe('as vagas do banner (BNR-26)', () => {
  // Números MEDIDOS contra a arte real da Adri — a mesma do site anterior —, não mais a suposição
  // que a `41` registrou. Com 1440 × 540 aqui, `object-cover` comia 90px de cada lado da arte 3:1.
  it('a arte de computador é a do site anterior: 1680 × 560 (3:1)', () => {
    expect(HERO_CAROUSEL_SLOTS.desktop).toEqual({ width: 1680, height: 560 })
  })

  it('a arte de celular é a do site anterior: 720 × 720 (1:1)', () => {
    expect(HERO_CAROUSEL_SLOTS.mobile).toEqual({ width: 720, height: 720 })
  })

  it('a vaga do celular NUNCA é paisagem — é o que impede a tira ilegível em 390px', () => {
    expect(paisagem(HERO_CAROUSEL_SLOTS.mobile), 'a vaga do celular virou paisagem').toBe(false)
    // Sensor: a vaga do computador **reprova** na mesma régua. Sem ele, um predicado que devolvesse
    // `false` para tudo passaria aqui e não guardaria nada.
    expect(paisagem(HERO_CAROUSEL_SLOTS.desktop), 'a régua deixou de acusar paisagem').toBe(true)
  })

  it('em 390px a arte do celular tem altura de leitura, e a do computador não teria', () => {
    expect(alturaEm390(HERO_CAROUSEL_SLOTS.mobile)).toBe(390)
    expect(alturaEm390(HERO_CAROUSEL_SLOTS.desktop)).toBe(130)
  })

  it('as duas vagas são declaradas, e nenhuma tem medida zero', () => {
    for (const surface of ['desktop', 'mobile'] as const) {
      expect(HERO_CAROUSEL_SLOTS[surface].width).toBeGreaterThan(0)
      expect(HERO_CAROUSEL_SLOTS[surface].height).toBeGreaterThan(0)
    }
  })

  it('o teto é de seis slides', () => {
    expect(HERO_CAROUSEL_MAX_SLIDES).toBe(6)
  })

  it('o giro é de seis segundos', () => {
    expect(HERO_CAROUSEL_INTERVAL_MS).toBe(6000)
  })

  it('as larguras oferecidas são exatamente duas', () => {
    expect(HERO_CAROUSEL_WIDTHS).toEqual(['full', 'wide'])
  })
})

// ---------------------------------------------------------------------------
// BNR-20 — a largura
// ---------------------------------------------------------------------------

describe('heroCarouselWidth (BNR-20)', () => {
  it('`wide` é respeitado', () => {
    expect(heroCarouselWidth({ width: 'wide' })).toBe('wide')
  })

  it('`full` é respeitado', () => {
    expect(heroCarouselWidth({ width: 'full' })).toBe('full')
  })

  it('ausente cai em `full`', () => {
    expect(heroCarouselWidth({})).toBe('full')
  })

  it('`null` e `undefined` caem em `full`', () => {
    expect(heroCarouselWidth(null)).toBe('full')
    expect(heroCarouselWidth(undefined)).toBe('full')
  })

  it('valor desconhecido cai em `full` em vez de quebrar', () => {
    // Config gravado por escrita direta ou por uma versão mais nova. Devolver o valor cru faria a
    // seção sair sem classe de largura nenhuma, que é uma faixa sem forma.
    expect(heroCarouselWidth({ width: 'gigante' } as never)).toBe('full')
    expect(heroCarouselWidth({ width: '' } as never)).toBe('full')
  })
})

// ---------------------------------------------------------------------------
// BNR-22 / AD-030 — a arte delega no dono único
// ---------------------------------------------------------------------------

describe('heroSlideArt (BNR-22, AD-030)', () => {
  it('usa a arte da superfície pedida', () => {
    expect(heroSlideArt(slide(), 'desktop')).toEqual({ image: '/d.jpg', imageReused: false })
    expect(heroSlideArt(slide(), 'mobile')).toEqual({ image: '/m.jpg', imageReused: false })
  })

  it('sem a arte do celular, reaproveita a do computador e DECLARA', () => {
    expect(heroSlideArt(slide({ image_mobile_url: null }), 'mobile')).toEqual({
      image: '/d.jpg',
      imageReused: true,
    })
  })

  it('sem arte nenhuma, devolve `null`', () => {
    expect(heroSlideArt(slide({ image_url: null, image_mobile_url: null }), 'desktop')).toEqual({
      image: null,
      imageReused: false,
    })
  })

  it('item ausente não quebra', () => {
    expect(heroSlideArt(null, 'desktop')).toEqual({ image: null, imageReused: false })
    expect(heroSlideArt(undefined, 'mobile')).toEqual({ image: null, imageReused: false })
  })

  it('é o MESMO veredito de `surfaceArt` — a régua não ganhou uma segunda escrita', () => {
    // O sensor da delegação: sem ele, alguém pode reescrever o predicado aqui com um comportamento
    // ligeiramente diferente e todos os casos acima continuam passando.
    for (const item of [
      slide(),
      slide({ image_mobile_url: null }),
      slide({ image_url: null }),
      slide({ image_url: '   ', image_mobile_url: '   ' }),
    ]) {
      for (const surface of ['desktop', 'mobile'] as const) {
        expect(heroSlideArt(item, surface)).toEqual(
          surfaceArt(item.image_url, item.image_mobile_url, surface),
        )
      }
    }
  })
})

// ---------------------------------------------------------------------------
// BNR-10..BNR-13 — o que impede salvar
// ---------------------------------------------------------------------------

describe('heroCarouselSlidesRefusal (BNR-10..BNR-13)', () => {
  it('lista vazia NÃO é recusa — a seção sem slide simplesmente não aparece', () => {
    expect(heroCarouselSlidesRefusal([])).toBeNull()
    expect(heroCarouselSlidesRefusal(null)).toBeNull()
    expect(heroCarouselSlidesRefusal(undefined)).toBeNull()
  })

  it('slide completo passa', () => {
    expect(heroCarouselSlidesRefusal([slide()])).toBeNull()
  })

  it('slide com a arte de UM dispositivo só passa — a loja reaproveita a outra', () => {
    expect(heroCarouselSlidesRefusal([slide({ image_mobile_url: null })])).toBeNull()
    expect(heroCarouselSlidesRefusal([slide({ image_url: null })])).toBeNull()
  })

  it('slide sem arte nenhuma é recusado, nomeando o slide (BNR-10)', () => {
    expect(heroCarouselSlidesRefusal([slide({ image_url: null, image_mobile_url: null })])).toBe(
      '1º banner: envie a arte. Sem imagem não há banner.',
    )
  })

  it('arte só de espaço conta como ausente', () => {
    expect(heroCarouselSlidesRefusal([slide({ image_url: '  ', image_mobile_url: '   ' })])).toBe(
      '1º banner: envie a arte. Sem imagem não há banner.',
    )
  })

  it('slide sem descrição é recusado (BNR-11)', () => {
    const motivo = heroCarouselSlidesRefusal([slide({ alt: null })])
    expect(motivo).toContain('1º banner: descreva a arte.')
    expect(motivo).toContain('leitor de tela')
  })

  it('descrição só de espaço não conta como descrição', () => {
    expect(heroCarouselSlidesRefusal([slide({ alt: '   ' })])).toContain('descreva a arte')
  })

  it('slide sem destino é recusado pela régua que já existe (BNR-12)', () => {
    expect(heroCarouselSlidesRefusal([slide({ category_id: null })])).toBe(
      '1º banner: Escolha o destino: uma coleção, um produto ou um caminho da loja.',
    )
  })

  it('slide com destino apagado é NOMEADO pelo rótulo congelado (BNR-48)', () => {
    const motivo = heroCarouselSlidesRefusal([
      slide({ category_id: null, label_snapshot: 'Prata 925' }),
    ])
    expect(motivo).toContain('Prata 925')
    expect(motivo).toContain('foi apagado')
  })

  it('slide com dois destinos é recusado', () => {
    expect(heroCarouselSlidesRefusal([slide({ product_id: 'p-1' })])).toBe(
      '1º banner: Escolha um destino só: uma coleção, um produto ou um caminho da loja.',
    )
  })

  it('caminho livre que a loja não serve é recusado pela mesma régua', () => {
    const motivo = heroCarouselSlidesRefusal([
      slide({ category_id: null, href: 'https://instagram.com/x' }),
    ])
    expect(motivo).toContain('1º banner:')
    expect(motivo).not.toBeNull()
  })

  it('a recusa nomeia o slide CERTO quando o problema está no terceiro', () => {
    // Uma tela com seis linhas iguais precisa dizer qual. Sem o número, a dona procura a esmo.
    expect(heroCarouselSlidesRefusal([slide(), slide(), slide({ alt: null })])).toContain(
      '3º banner:',
    )
  })

  it('a ordem das cobranças é arte → descrição → destino', () => {
    // Não é arrumação: pedir a descrição de uma arte que ainda não existe é pedir o impossível.
    const semNada: Partial<HomeSectionItem> = {
      image_url: null,
      image_mobile_url: null,
      alt: null,
      category_id: null,
    }
    expect(heroCarouselSlidesRefusal([semNada])).toContain('envie a arte')

    const semAltNemDestino: Partial<HomeSectionItem> = { image_url: '/d.jpg', alt: null, category_id: null }
    expect(heroCarouselSlidesRefusal([semAltNemDestino])).toContain('descreva a arte')
  })

  it('seis slides passam; o sétimo é recusado com o teto e a saída (BNR-13)', () => {
    const seis = Array.from({ length: HERO_CAROUSEL_MAX_SLIDES }, () => slide())
    expect(heroCarouselSlidesRefusal(seis)).toBeNull()

    const motivo = heroCarouselSlidesRefusal([...seis, slide()])
    expect(motivo).toContain('Cabem 6 banners')
    expect(motivo).toContain('7')
    // A saída faz parte da recusa: sem ela, a dona lê um teto e não sabe o que fazer com o resto.
    expect(motivo).toContain('segundo bloco')
  })

  it('o teto é cobrado ANTES do conteúdo — senão a dona conserta seis para ouvir que sobram', () => {
    const seteQuebrados = Array.from({ length: 7 }, () => slide({ alt: null }))
    expect(heroCarouselSlidesRefusal(seteQuebrados)).toContain('Cabem 6 banners')
  })

  it('o veredito é `string | null`, nunca união por booleano', () => {
    expect(heroCarouselSlidesRefusal([slide()])).toBeNull()
    expect(typeof heroCarouselSlidesRefusal([slide({ alt: null })])).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// BNR-30 — a aritmética do giro
// ---------------------------------------------------------------------------

describe('nextSlideIndex (BNR-30)', () => {
  it('avança', () => {
    expect(nextSlideIndex(0, 4)).toBe(1)
    expect(nextSlideIndex(2, 4)).toBe(3)
  })

  it('circula do último para o primeiro', () => {
    expect(nextSlideIndex(3, 4)).toBe(0)
  })

  it('volta, e circula do primeiro para o último', () => {
    expect(nextSlideIndex(1, 4, -1)).toBe(0)
    expect(nextSlideIndex(0, 4, -1)).toBe(3)
  })

  it('com um slide não há para onde ir', () => {
    expect(nextSlideIndex(0, 1)).toBe(0)
    expect(nextSlideIndex(0, 1, -1)).toBe(0)
  })

  it('com zero slides devolve 0 em vez de `NaN`', () => {
    expect(nextSlideIndex(0, 0)).toBe(0)
  })

  it('índice fracionário ou inválido não vaza para fora da lista', () => {
    expect(nextSlideIndex(1.7, 4)).toBe(2)
    expect(nextSlideIndex(Number.NaN, 4)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// BNR-26 — o índice vem da rolagem real
// ---------------------------------------------------------------------------

describe('slideIndexFromScroll', () => {
  it('a posição zero é o primeiro slide', () => {
    expect(slideIndexFromScroll(0, 390, 4)).toBe(0)
  })

  it('uma vaga rolada é o segundo slide', () => {
    expect(slideIndexFromScroll(390, 390, 4)).toBe(1)
  })

  it('arredonda para a vaga mais próxima — arrasto para no meio do caminho', () => {
    expect(slideIndexFromScroll(500, 390, 4)).toBe(1)
    expect(slideIndexFromScroll(600, 390, 4)).toBe(2)
  })

  it('satura no último em vez de sair da lista', () => {
    // Rolagem elástica do iOS passa do fim, e um índice 4 numa lista de 4 apagaria as bolinhas.
    expect(slideIndexFromScroll(99999, 390, 4)).toBe(3)
  })

  it('satura no primeiro com posição negativa', () => {
    expect(slideIndexFromScroll(-50, 390, 4)).toBe(0)
  })

  it('largura zero devolve 0 — é o que jsdom e o primeiro quadro entregam', () => {
    // Dividir por zero daria `Infinity`, e o índice sairia da lista sem nada acusar.
    expect(slideIndexFromScroll(120, 0, 4)).toBe(0)
  })

  it('lista vazia devolve 0', () => {
    expect(slideIndexFromScroll(120, 390, 0)).toBe(0)
  })
})
