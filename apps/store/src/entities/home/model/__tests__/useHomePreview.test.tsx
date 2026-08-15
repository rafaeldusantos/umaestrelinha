// Feature 25 — o lado da loja da ponte (`PRV-01`, `PRV-03`, `PRV-04`).
//
// O que se prova aqui é o que **não** dá para provar renderizando um iframe: quando o modo liga, o
// aperto de mão, e de quem a loja aceita ordem. jsdom não carrega o documento de um iframe, então a
// ponte é medida pelas mensagens, que é onde ela de fato mora.

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREVIEW_SOURCE, type HomeSection } from '@estrelinha/core/home'
import { useHomePreview } from '../useHomePreview'

const paiFalso = { postMessage: vi.fn() }
const parentOriginal = Object.getOwnPropertyDescriptor(window, 'parent')

/** Põe a janela dentro de um "iframe": `window.parent` deixa de ser `window`. */
const emIframe = () => {
  Object.defineProperty(window, 'parent', { value: paiFalso, configurable: true })
}

const semIframe = () => {
  Object.defineProperty(window, 'parent', { value: window, configurable: true })
}

const url = (search: string) => window.history.replaceState({}, '', `/${search}`)

/**
 * `event.source` é somente-leitura em `MessageEvent`, e o construtor de jsdom não aceita um objeto
 * qualquer ali. Definir a propriedade no evento já criado é o único jeito de simular "veio do pai" —
 * e simular o remetente é justamente o que `PRV-04` pede para medir.
 */
const receber = (data: unknown, source: unknown = paiFalso) => {
  const evento = new MessageEvent('message', { data })
  Object.defineProperty(evento, 'source', { value: source })
  act(() => {
    window.dispatchEvent(evento)
  })
}

const secao = (id: string, position = 0): HomeSection => ({
  id,
  type: 'hero',
  position,
  active: true,
  config: {},
})

beforeEach(() => {
  paiFalso.postMessage.mockClear()
  url('?preview=1')
  emIframe()
})

afterEach(() => {
  if (parentOriginal) Object.defineProperty(window, 'parent', parentOriginal)
  else semIframe()
  url('')
})

describe('PRV-01 — o modo só liga com as duas condições', () => {
  it('liga com `?preview=1` dentro de iframe', () => {
    const { result } = renderHook(() => useHomePreview())
    expect(result.current.preview).toBe(true)
  })

  it('NÃO liga fora de iframe, e nada é postado', () => {
    semIframe()
    const { result } = renderHook(() => useHomePreview())
    expect(result.current.preview).toBe(false)
    expect(paiFalso.postMessage).not.toHaveBeenCalled()
  })

  it('NÃO liga sem o parâmetro', () => {
    url('')
    const { result } = renderHook(() => useHomePreview())
    expect(result.current.preview).toBe(false)
  })
})

describe('PRV-03 — o aperto de mão', () => {
  it('posta `ready` uma vez ao montar', () => {
    renderHook(() => useHomePreview())
    expect(paiFalso.postMessage).toHaveBeenCalledTimes(1)
    expect(paiFalso.postMessage).toHaveBeenCalledWith(
      { source: PREVIEW_SOURCE, type: 'ready' },
      '*',
    )
  })

  it('a composição começa VAZIA — `[]` é "ainda não chegou", nunca o piso semeado', () => {
    const { result } = renderHook(() => useHomePreview())
    expect(result.current.sections).toEqual([])
  })

  it('recebido `draft`, a composição passa a ser a do painel, na ordem recebida', () => {
    const { result } = renderHook(() => useHomePreview())
    const sections = [secao('b', 1), secao('a', 0)]

    receber({ source: PREVIEW_SOURCE, type: 'draft', sections })

    expect(result.current.sections.map(s => s.id)).toEqual(['b', 'a'])
  })

  it('um `draft` novo SUBSTITUI o anterior — o rascunho não se acumula', () => {
    const { result } = renderHook(() => useHomePreview())

    receber({ source: PREVIEW_SOURCE, type: 'draft', sections: [secao('a')] })
    receber({ source: PREVIEW_SOURCE, type: 'draft', sections: [secao('z')] })

    expect(result.current.sections.map(s => s.id)).toEqual(['z'])
  })
})

describe('PRV-06 — o contorno', () => {
  it('`highlight` com id contorna aquele bloco', () => {
    const { result } = renderHook(() => useHomePreview())
    receber({ source: PREVIEW_SOURCE, type: 'highlight', sectionId: 'sec-9' })
    expect(result.current.highlightId).toBe('sec-9')
  })

  it('`highlight` com `null` apaga o contorno', () => {
    const { result } = renderHook(() => useHomePreview())
    receber({ source: PREVIEW_SOURCE, type: 'highlight', sectionId: 'sec-9' })
    receber({ source: PREVIEW_SOURCE, type: 'highlight', sectionId: null })
    expect(result.current.highlightId).toBeNull()
  })
})

describe('PRV-04 — de quem a loja aceita ordem', () => {
  it('ignora mensagem de outra janela, mesmo com a forma certa', () => {
    const { result } = renderHook(() => useHomePreview())
    const outraJanela = { postMessage: vi.fn() }

    receber({ source: PREVIEW_SOURCE, type: 'draft', sections: [secao('a')] }, outraJanela)

    expect(result.current.sections).toEqual([])
  })

  it('ignora mensagem sem o carimbo — `window.message` é barramento compartilhado', () => {
    const { result } = renderHook(() => useHomePreview())

    receber({ type: 'draft', sections: [secao('a')] })
    receber({ source: 'vite:hmr', type: 'highlight', sectionId: 'sec-1' })

    expect(result.current.sections).toEqual([])
    expect(result.current.highlightId).toBeNull()
  })

  it('fora do modo prévia não escuta nada', () => {
    semIframe()
    const { result } = renderHook(() => useHomePreview())

    receber({ source: PREVIEW_SOURCE, type: 'draft', sections: [secao('a')] }, window)

    expect(result.current.sections).toEqual([])
  })
})

describe('PRV-05 — o clique volta ao painel', () => {
  it('`selectSection` posta o id do bloco', () => {
    const { result } = renderHook(() => useHomePreview())
    paiFalso.postMessage.mockClear()

    act(() => result.current.selectSection('sec-7'))

    expect(paiFalso.postMessage).toHaveBeenCalledWith(
      { source: PREVIEW_SOURCE, type: 'select', sectionId: 'sec-7' },
      '*',
    )
  })
})

describe('a escuta é removida ao desmontar', () => {
  it('depois do unmount, `draft` não muda mais nada', () => {
    const { result, unmount } = renderHook(() => useHomePreview())
    receber({ source: PREVIEW_SOURCE, type: 'draft', sections: [secao('a')] })
    unmount()

    receber({ source: PREVIEW_SOURCE, type: 'draft', sections: [secao('z')] })

    expect(result.current.sections.map(s => s.id)).toEqual(['a'])
  })
})
