// Feature 25 — o contrato da prévia real.
//
// O que se mede aqui é a parte que **não tem DOM**: quando o modo prévia liga, o que conta como
// mensagem da ponte, e como o dispositivo cabe no palco. É de propósito que essas três decisões sejam
// funções puras — jsdom não renderiza o conteúdo de um iframe, então se elas morassem dentro do
// componente não haveria onde prendê-las.

import { describe, expect, it } from 'vitest'
import {
  PREVIEW_DEBOUNCE_MS,
  PREVIEW_DEVICES,
  PREVIEW_SOURCE,
  isPreviewWindow,
  parsePreviewMessage,
  previewFrame,
  previewMetrics,
  previewScale,
  previewSrc,
  type PreviewBox,
  type PreviewFrame,
} from '../preview'
import type { HomeSection } from '../types'

const secao = (id: string): HomeSection => ({
  id,
  type: 'hero',
  position: 0,
  active: true,
  config: {},
})

describe('isPreviewWindow — PRV-01: parâmetro E iframe, nunca só um', () => {
  it('liga com `?preview=1` dentro de um iframe', () => {
    expect(isPreviewWindow('?preview=1', true)).toBe(true)
  })

  it('NÃO liga fora de iframe, mesmo com o parâmetro — a URL é adivinhável e viraliza por link', () => {
    expect(isPreviewWindow('?preview=1', false)).toBe(false)
  })

  it('NÃO liga dentro de iframe sem o parâmetro — a loja embutida em outra página segue normal', () => {
    expect(isPreviewWindow('', true)).toBe(false)
    expect(isPreviewWindow('?utm_source=x', true)).toBe(false)
  })

  it('aceita `?preview` sem valor — é a forma que alguém digita à mão', () => {
    expect(isPreviewWindow('?preview', true)).toBe(true)
  })

  it('recusa os desligamentos explícitos', () => {
    expect(isPreviewWindow('?preview=0', true)).toBe(false)
    expect(isPreviewWindow('?preview=false', true)).toBe(false)
  })
})

describe('parsePreviewMessage — PRV-04: só o que carrega o carimbo', () => {
  it('recusa o que não é objeto', () => {
    expect(parsePreviewMessage(null)).toBeNull()
    expect(parsePreviewMessage('draft')).toBeNull()
    expect(parsePreviewMessage(42)).toBeNull()
  })

  it('recusa mensagem sem o carimbo — `window.message` é barramento compartilhado', () => {
    expect(parsePreviewMessage({ type: 'draft', sections: [] })).toBeNull()
    expect(parsePreviewMessage({ source: 'vite:hmr', type: 'draft', sections: [] })).toBeNull()
  })

  it('recusa tipo desconhecido', () => {
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'reboot' })).toBeNull()
  })

  it('aceita `ready`', () => {
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'ready' })).toEqual({
      source: PREVIEW_SOURCE,
      type: 'ready',
    })
  })

  it('aceita `select` com id, recusa sem id e com id vazio', () => {
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'select', sectionId: 'sec-1' })).toEqual(
      { source: PREVIEW_SOURCE, type: 'select', sectionId: 'sec-1' },
    )
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'select' })).toBeNull()
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'select', sectionId: '' })).toBeNull()
  })

  it('aceita `highlight` com id E com `null` — `null` é como o painel APAGA o contorno', () => {
    expect(
      parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'highlight', sectionId: 'sec-2' }),
    ).toEqual({ source: PREVIEW_SOURCE, type: 'highlight', sectionId: 'sec-2' })
    expect(
      parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'highlight', sectionId: null }),
    ).toEqual({ source: PREVIEW_SOURCE, type: 'highlight', sectionId: null })
  })

  it('recusa `highlight` com id que não é string nem `null`', () => {
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'highlight', sectionId: 7 })).toBeNull()
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'highlight' })).toBeNull()
  })

  it('aceita `draft` com lista, inclusive vazia, e recusa `sections` que não é lista', () => {
    const sections = [secao('a'), secao('b')]
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'draft', sections })).toEqual({
      source: PREVIEW_SOURCE,
      type: 'draft',
      sections,
    })
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'draft', sections: [] })).toEqual({
      source: PREVIEW_SOURCE,
      type: 'draft',
      sections: [],
    })
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'draft', sections: {} })).toBeNull()
    expect(parsePreviewMessage({ source: PREVIEW_SOURCE, type: 'draft' })).toBeNull()
  })
})

describe('previewScale — PRV-14: cabe no palco, e nunca amplia', () => {
  it('reduz quando o palco é menor que o dispositivo', () => {
    expect(previewScale(512, 1024)).toBe(0.5)
  })

  it('NÃO amplia quando o palco sobra — alvo de toque ampliado mentiria sobre o próprio tamanho', () => {
    expect(previewScale(900, 390)).toBe(1)
  })

  it('devolve 1 sem medida — é o que jsdom e o primeiro quadro do ResizeObserver informam', () => {
    expect(previewScale(0, 390)).toBe(1)
    expect(previewScale(-10, 390)).toBe(1)
    expect(previewScale(NaN, 390)).toBe(1)
  })

  it('devolve 1 quando o dispositivo não tem largura', () => {
    expect(previewScale(700, 0)).toBe(1)
  })
})

describe('previewFrame — FOCO-16/17/18: um dono só para o tamanho do quadro', () => {
  describe('computador, modo normal', () => {
    it('mede 1024 × 768 e escala pelo eixo mais apertado — aqui, a largura', () => {
      // 872 de palco − 40 de folga = 832 ⇒ 832/1024. A altura sobra (1200 − 40 = 1160 > 768).
      expect(previewFrame('desktop', { width: 872, height: 1200 }, false)).toEqual({
        width: 1024,
        height: 768,
        scale: 832 / 1024,
      })
    })

    it('escala pela ALTURA quando é ela que aperta — senão o rodapé da loja fica fora do palco', () => {
      // 1600 − 40 = 1560 de largura sobra; 424 − 40 = 384 de altura ⇒ 384/768 = 0,5.
      expect(previewFrame('desktop', { width: 1600, height: 424 }, false)).toEqual({
        width: 1024,
        height: 768,
        scale: 0.5,
      })
    })

    it('NÃO amplia quando o palco sobra nos dois eixos', () => {
      expect(previewFrame('desktop', { width: 1920, height: 1400 }, false).scale).toBe(1)
    })

    it('palco em zero — jsdom antes do layout — devolve escala 1, e não um quadro invisível', () => {
      expect(previewFrame('desktop', { width: 0, height: 0 }, false)).toEqual({
        width: 1024,
        height: 768,
        scale: 1,
      })
    })
  })

  describe('computador, tela cheia', () => {
    it('a largura é 1024 e a escala é EXATAMENTE 1 — 100% é o número que a feature entrega', () => {
      const frame = previewFrame('desktop', { width: 1440, height: 988 }, true)
      expect(frame.width).toBe(1024)
      expect(frame.scale).toBe(1)
    })

    it('a altura é o espaço vertical que existe, menos a folga', () => {
      expect(previewFrame('desktop', { width: 1440, height: 988 }, true).height).toBe(948)
    })

    it('palco baixo NÃO encolhe o quadro abaixo de 768 — encurta a leitura, não as letras', () => {
      expect(previewFrame('desktop', { width: 1440, height: 600 }, true)).toEqual({
        width: 1024,
        height: 768,
        scale: 1,
      })
    })

    it('palco em zero cai no piso de 768, sem propagar NaN', () => {
      expect(previewFrame('desktop', { width: 0, height: 0 }, true)).toEqual({
        width: 1024,
        height: 768,
        scale: 1,
      })
    })

    it('SENSOR: a fórmula antiga — escalar o computador para caber — REPROVA na mesma régua', () => {
      // A régua de FOCO-16/17, escrita **uma vez** e chamada duas: pela asserção e pelo sensor.
      // O 40 aqui é a EXPECTATIVA da spec ("o espaço vertical disponível no palco"), não uma
      // importação do dono — se `previewFrame` mudar a folga por conta própria, esta régua reprova.
      const FOLGA_DA_SPEC = 40
      const ehTelaCheiaDeVerdade = (frame: PreviewFrame, box: PreviewBox): boolean =>
        frame.width === PREVIEW_DEVICES.desktop.width &&
        frame.scale === 1 &&
        frame.height ===
          Math.max(PREVIEW_DEVICES.desktop.height, Math.round(box.height - FOLGA_DA_SPEC))

      // O que os dois palcos faziam antes desta feature: caber por `transform`, altura nominal.
      const formulaAntiga = (box: PreviewBox): PreviewFrame => ({
        width: 1024,
        height: 768,
        scale: Math.min(
          previewScale(box.width - FOLGA_DA_SPEC, 1024),
          previewScale(box.height - FOLGA_DA_SPEC, 768),
        ),
      })

      // Palco alto: a diferença está na ALTURA — a antiga trava em 768 e desperdiça a tela.
      const alto = { width: 1440, height: 1400 }
      expect(ehTelaCheiaDeVerdade(previewFrame('desktop', alto, true), alto)).toBe(true)
      expect(ehTelaCheiaDeVerdade(formulaAntiga(alto), alto)).toBe(false)

      // Palco apertado: a diferença está na ESCALA — a antiga encolhe abaixo de 100%, que é
      // exatamente o que a feature existe para não fazer.
      const apertado = { width: 900, height: 700 }
      expect(ehTelaCheiaDeVerdade(previewFrame('desktop', apertado, true), apertado)).toBe(true)
      expect(ehTelaCheiaDeVerdade(formulaAntiga(apertado), apertado)).toBe(false)
    })
  })

  describe('celular — FOCO-18: a altura é a dobra, e a dobra não estica', () => {
    it('tela cheia devolve EXATAMENTE o mesmo quadro do modo normal', () => {
      const box = { width: 1440, height: 1200 }
      expect(previewFrame('mobile', box, true)).toEqual(previewFrame('mobile', box, false))
    })

    it('continua 390 × 844 mesmo num palco enorme', () => {
      expect(previewFrame('mobile', { width: 1920, height: 1600 }, true)).toEqual({
        width: 390,
        height: 844,
        scale: 1,
      })
    })

    it('reduz para caber num palco apertado, como sempre fez', () => {
      // 235 − 40 = 195 ⇒ 195/390 = 0,5.
      expect(previewFrame('mobile', { width: 235, height: 1200 }, false).scale).toBe(0.5)
    })
  })
})

describe('previewMetrics — PRV-15: a barra diz a medida e a escala', () => {
  it('celular a 100%', () => {
    expect(previewMetrics(previewFrame('mobile', { width: 1920, height: 1600 }, false))).toBe(
      '390 × 844 · 100%',
    )
  })

  it('computador reduzido, com a escala arredondada ao inteiro', () => {
    expect(previewMetrics(previewFrame('desktop', { width: 746, height: 1200 }, false))).toBe(
      '1024 × 768 · 69%',
    )
  })

  it('FOCO-17: em tela cheia imprime a altura REALMENTE usada, não a nominal do dispositivo', () => {
    expect(previewMetrics(previewFrame('desktop', { width: 1440, height: 988 }, true))).toBe(
      '1024 × 948 · 100%',
    )
  })
})

describe('PREVIEW_DEVICES — o padrão é o celular', () => {
  it('celular é 390 × 844, o viewport de projeto', () => {
    expect(PREVIEW_DEVICES.mobile).toEqual({ label: 'Celular', width: 390, height: 844 })
  })

  it('computador é 1024 × 768 — o `lg`, o desktop mais estreito que existe', () => {
    expect(PREVIEW_DEVICES.desktop).toEqual({ label: 'Computador', width: 1024, height: 768 })
  })
})

describe('previewSrc — o endereço não carrega o estado do alternador', () => {
  it('monta sobre a origem da loja, normalizando a barra final', () => {
    expect(previewSrc('http://localhost:8082')).toBe('http://localhost:8082/?preview=1')
    expect(previewSrc('http://localhost:8082/')).toBe('http://localhost:8082/?preview=1')
  })

  it('o mesmo endereço para os dois dispositivos — trocar não pode remontar o documento', () => {
    expect(previewSrc('https://umaestrelinha.com.br')).toBe(
      previewSrc('https://umaestrelinha.com.br'),
    )
  })
})

describe('o debounce é do rascunho, não do realce', () => {
  it('200 ms', () => {
    expect(PREVIEW_DEBOUNCE_MS).toBe(200)
  })
})
