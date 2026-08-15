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
  previewMetrics,
  previewScale,
  previewSrc,
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

describe('previewMetrics — PRV-15: a barra diz a medida e a escala', () => {
  it('celular a 100%', () => {
    expect(previewMetrics('mobile', 1)).toBe('390 × 844 · 100%')
  })

  it('computador reduzido, com a escala arredondada ao inteiro', () => {
    expect(previewMetrics('desktop', previewScale(706, 1024))).toBe('1024 × 768 · 69%')
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
