// Feature 25 — a ponte, do lado que AGE (`PRV-07`, `PRV-08`, `PRV-09`, `PRV-10`).
//
// Duas classes de falha se medem aqui, e as duas são silenciosas em produção:
//
// 1. `targetOrigin` errado ou `'*'` — o navegador descarta **sem erro**, e a dona só vê "não
//    atualiza"; ou pior, o rascunho não publicado sai para um documento que não é o nosso.
// 2. Remetente aceito de menos ou de mais — o painel navega sozinho, ou nunca navega.

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PREVIEW_DEBOUNCE_MS, PREVIEW_SOURCE, type HomeSection } from '@estrelinha/core/home'
import { usePreviewBridge } from '../usePreviewBridge'

const ORIGEM = 'http://localhost:8082'

const janelaDoIframe = { postMessage: vi.fn() }
const iframeRef = { current: { contentWindow: janelaDoIframe } } as unknown as React.RefObject<HTMLIFrameElement>

const secao = (id: string): HomeSection => ({
  id,
  type: 'hero',
  position: 0,
  active: true,
  config: {},
})

const receber = (data: unknown, over: { origin?: string; source?: unknown } = {}) => {
  const evento = new MessageEvent('message', { data, origin: over.origin ?? ORIGEM })
  Object.defineProperty(evento, 'source', { value: over.source ?? janelaDoIframe })
  act(() => {
    window.dispatchEvent(evento)
  })
}

const montar = (over: Partial<Parameters<typeof usePreviewBridge>[0]> = {}) => {
  const onSelect = vi.fn()
  const view = renderHook(
    (props: { sections: HomeSection[]; highlightId: string | null }) =>
      usePreviewBridge({
        iframeRef,
        origin: ORIGEM,
        sections: props.sections,
        highlightId: props.highlightId,
        onSelect,
        ...over,
      }),
    { initialProps: { sections: [secao('a')], highlightId: null as string | null } },
  )
  return { ...view, onSelect }
}

beforeEach(() => {
  vi.useFakeTimers()
  janelaDoIframe.postMessage.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PRV-07 — o rascunho vai para a origem EXATA, nunca `*`', () => {
  it('o segundo argumento do postMessage é a origem da loja', () => {
    montar()
    act(() => vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS))

    expect(janelaDoIframe.postMessage).toHaveBeenCalledWith(
      { source: PREVIEW_SOURCE, type: 'draft', sections: [secao('a')] },
      ORIGEM,
    )
  })

  it('nenhuma mensagem sai com `*`', () => {
    const { rerender } = montar()
    act(() => vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS))
    rerender({ sections: [secao('b')], highlightId: 'a' })
    act(() => vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS))

    for (const chamada of janelaDoIframe.postMessage.mock.calls) {
      expect(chamada[1]).toBe(ORIGEM)
    }
    expect(janelaDoIframe.postMessage.mock.calls.length).toBeGreaterThan(1)
  })

  it('sem origem configurada nada é postado — o painel segue sem a loja', () => {
    montar({ origin: null })
    act(() => vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS))
    expect(janelaDoIframe.postMessage).not.toHaveBeenCalled()
  })
})

describe('PRV-09 — o rascunho tem debounce; o realce não', () => {
  it('rajada dentro da janela produz UM envio de rascunho', () => {
    const { rerender } = montar()
    rerender({ sections: [secao('b')], highlightId: null })
    rerender({ sections: [secao('c')], highlightId: null })
    act(() => vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS))

    const rascunhos = janelaDoIframe.postMessage.mock.calls.filter(c => c[0].type === 'draft')
    expect(rascunhos).toHaveLength(1)
    expect(rascunhos[0][0].sections).toEqual([secao('c')])
  })

  it('nada de rascunho antes de a janela do debounce fechar', () => {
    montar()
    act(() => vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS - 1))
    expect(janelaDoIframe.postMessage.mock.calls.filter(c => c[0].type === 'draft')).toHaveLength(0)
  })

  it('o realce sai IMEDIATAMENTE — 200 ms de atraso no cursor seriam lidos como travamento', () => {
    const { rerender } = montar()
    janelaDoIframe.postMessage.mockClear()
    rerender({ sections: [secao('a')], highlightId: 'sec-9' })

    expect(janelaDoIframe.postMessage).toHaveBeenCalledWith(
      { source: PREVIEW_SOURCE, type: 'highlight', sectionId: 'sec-9' },
      ORIGEM,
    )
  })

  it('realce `null` é postado — é como o contorno é APAGADO', () => {
    const { rerender } = montar()
    rerender({ sections: [secao('a')], highlightId: 'sec-9' })
    janelaDoIframe.postMessage.mockClear()
    rerender({ sections: [secao('a')], highlightId: null })

    expect(janelaDoIframe.postMessage).toHaveBeenCalledWith(
      { source: PREVIEW_SOURCE, type: 'highlight', sectionId: null },
      ORIGEM,
    )
  })
})

describe('PRV-03 — `ready` é respondido na hora, sem esperar o debounce', () => {
  it('o rascunho corrente sai assim que a loja diz que montou', () => {
    const { rerender } = montar()
    rerender({ sections: [secao('z')], highlightId: null })
    janelaDoIframe.postMessage.mockClear()

    receber({ source: PREVIEW_SOURCE, type: 'ready' })

    expect(janelaDoIframe.postMessage).toHaveBeenCalledWith(
      { source: PREVIEW_SOURCE, type: 'draft', sections: [secao('z')] },
      ORIGEM,
    )
  })
})

describe('PRV-08 — de quem o painel aceita ordem', () => {
  it('`select` da origem e da janela certas abre o editor', () => {
    const { onSelect } = montar()
    receber({ source: PREVIEW_SOURCE, type: 'select', sectionId: 'sec-4' })
    expect(onSelect).toHaveBeenCalledWith('sec-4')
  })

  it('ignora outra ORIGEM, mesmo vindo da janela do iframe', () => {
    const { onSelect } = montar()
    receber({ source: PREVIEW_SOURCE, type: 'select', sectionId: 'sec-4' }, {
      origin: 'https://evil.example',
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('ignora outra JANELA, mesmo com a origem certa — popup da loja tem a mesma origem', () => {
    const { onSelect } = montar()
    receber({ source: PREVIEW_SOURCE, type: 'select', sectionId: 'sec-4' }, {
      source: { postMessage: vi.fn() },
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('ignora mensagem sem o carimbo', () => {
    const { onSelect } = montar()
    receber({ type: 'select', sectionId: 'sec-4' })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('`ready` de origem errada não vaza o rascunho', () => {
    montar()
    janelaDoIframe.postMessage.mockClear()
    receber({ source: PREVIEW_SOURCE, type: 'ready' }, { origin: 'https://evil.example' })
    expect(janelaDoIframe.postMessage).not.toHaveBeenCalled()
  })
})
