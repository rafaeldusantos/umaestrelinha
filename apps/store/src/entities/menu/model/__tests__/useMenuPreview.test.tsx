// Feature 39, T28 — o lado da LOJA da ponte do menu (`NAV-44`, `NAV-47`).
//
// jsdom não carrega o documento de um iframe, então a ponte é medida onde ela de fato mora: nas
// mensagens. O que se prova aqui é quando o modo liga, de quem a loja aceita ordem, e para onde vai
// o aperto de mão.
//
// Molde: `entities/home/model/__tests__/useHomePreview.test.tsx` (feature 25). A diferença que
// importa está no `ready`: o da home vai com `'*'`, e este vai para a **origem exata** do painel,
// deduzida do referrer.

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MENU_PREVIEW_SOURCE, type MenuPreviewDraft } from '@estrelinha/core/menu'
// De `core/home` de propósito: o carimbo do outro canal é o caso mais realista de mensagem alheia
// com forma parecida, e ele chega na MESMA janela — os dois canais convivem no mesmo `?preview=1`.
import { PREVIEW_SOURCE } from '@estrelinha/core/home'
import { useMenuPreview } from '../useMenuPreview'

const paiFalso = { postMessage: vi.fn() }
const parentOriginal = Object.getOwnPropertyDescriptor(window, 'parent')
const referrerOriginal = Object.getOwnPropertyDescriptor(Document.prototype, 'referrer')

/** Põe a janela dentro de um "iframe": `window.parent` deixa de ser `window`. */
const emIframe = () => {
  Object.defineProperty(window, 'parent', { value: paiFalso, configurable: true })
}

const semIframe = () => {
  Object.defineProperty(window, 'parent', { value: window, configurable: true })
}

const referrer = (valor: string) => {
  Object.defineProperty(document, 'referrer', { value: valor, configurable: true })
}

const url = (search: string) => window.history.replaceState({}, '', `/${search}`)

/**
 * `event.source` é somente-leitura em `MessageEvent`, e o construtor de jsdom não aceita um objeto
 * qualquer ali. Definir a propriedade no evento já criado é o único jeito de simular o remetente — e
 * simular o remetente é justamente o que a régua da loja mede.
 */
const receber = (data: unknown, source: unknown = paiFalso) => {
  const evento = new MessageEvent('message', { data })
  Object.defineProperty(evento, 'source', { value: source })
  act(() => {
    window.dispatchEvent(evento)
  })
}

const rascunho = (nome = 'Joias afetivas'): MenuPreviewDraft => ({
  categories: [
    {
      id: 'joias',
      name: nome,
      slug: 'joias',
      parent_id: null,
      sort_order: 0,
      active: true,
      menu_desktop: true,
      menu_mobile: true,
    },
  ],
  links: [],
})

beforeEach(() => {
  paiFalso.postMessage.mockClear()
  url('?preview=1')
  referrer('http://localhost:8083/admin/menu')
  emIframe()
})

afterEach(() => {
  if (parentOriginal) Object.defineProperty(window, 'parent', parentOriginal)
  else semIframe()
  if (referrerOriginal) Object.defineProperty(Document.prototype, 'referrer', referrerOriginal)
  url('')
})

describe('NAV-44 — o modo só liga com as duas condições', () => {
  it('liga com `?preview=1` dentro de iframe', () => {
    const { result } = renderHook(() => useMenuPreview())
    expect(result.current.preview).toBe(true)
  })

  it('FORA de iframe, `?preview=1` não muda nada — o parâmetro é adivinhável', () => {
    semIframe()
    const { result } = renderHook(() => useMenuPreview())

    expect(result.current.preview).toBe(false)
    expect(result.current.draft).toBeNull()
    expect(paiFalso.postMessage).not.toHaveBeenCalled()
  })

  it('dentro de iframe, sem o parâmetro, também não liga', () => {
    url('')
    const { result } = renderHook(() => useMenuPreview())
    expect(result.current.preview).toBe(false)
  })
})

describe('o aperto de mão vai para a ORIGEM do painel, nunca para `\'*\'`', () => {
  it('posta `ready` uma vez, na origem deduzida do referrer', () => {
    renderHook(() => useMenuPreview())

    expect(paiFalso.postMessage).toHaveBeenCalledTimes(1)
    expect(paiFalso.postMessage).toHaveBeenCalledWith(
      { source: MENU_PREVIEW_SOURCE, type: 'ready' },
      'http://localhost:8083',
    )
  })

  it('sem referrer, o `ready` NÃO sai — o palco entrega pelo `load` do iframe', () => {
    // Política `no-referrer` é estado alcançável. A escolha é ficar sem o aperto de mão em vez de
    // abrir um alvo curinga: o palco posta o rascunho ao `load`, que é a entrega feita pelo lado que
    // conhece a origem certa.
    referrer('')
    renderHook(() => useMenuPreview())
    expect(paiFalso.postMessage).not.toHaveBeenCalled()
  })

  it('referrer que não é URL não derruba o hook', () => {
    referrer('lixo')
    const { result } = renderHook(() => useMenuPreview())
    expect(result.current.preview).toBe(true)
    expect(paiFalso.postMessage).not.toHaveBeenCalled()
  })
})

describe('NAV-44 — o rascunho substitui a leitura do banco', () => {
  it('começa `null` — e `null` é "ainda não chegou", nunca "menu vazio"', () => {
    const { result } = renderHook(() => useMenuPreview())
    expect(result.current.draft).toBeNull()
  })

  it('recebido `draft`, a curadoria passa a ser a do painel', () => {
    const { result } = renderHook(() => useMenuPreview())

    receber({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft: rascunho() })

    expect(result.current.draft?.categories.map(c => c.name)).toEqual(['Joias afetivas'])
  })

  it('um `draft` novo SUBSTITUI o anterior — o rascunho não se acumula', () => {
    const { result } = renderHook(() => useMenuPreview())

    receber({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft: rascunho('Antes') })
    receber({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft: rascunho('Depois') })

    expect(result.current.draft?.categories.map(c => c.name)).toEqual(['Depois'])
  })
})

describe('NAV-43 — o palco pede qual painel abrir', () => {
  it('`open` com id guarda o id', () => {
    const { result } = renderHook(() => useMenuPreview())
    receber({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: 'joias' })
    expect(result.current.openId).toBe('joias')
  })

  it('`open` com `null` fecha', () => {
    const { result } = renderHook(() => useMenuPreview())
    receber({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: 'joias' })
    receber({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: null })
    expect(result.current.openId).toBeNull()
  })
})

describe('NAV-47 — de quem a loja aceita ordem', () => {
  it('ignora mensagem de outra janela, mesmo com a forma certa', () => {
    const { result } = renderHook(() => useMenuPreview())
    const outraJanela = { postMessage: vi.fn() }

    receber({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft: rascunho() }, outraJanela)
    receber({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: 'joias' }, outraJanela)

    expect(result.current.draft).toBeNull()
    expect(result.current.openId).toBeNull()
  })

  it('ignora o carimbo do canal da HOME — os dois convivem no mesmo `?preview=1`', () => {
    const { result } = renderHook(() => useMenuPreview())

    receber({ source: PREVIEW_SOURCE, type: 'draft', sections: [] })

    expect(result.current.draft).toBeNull()
  })

  it('ignora mensagem sem carimbo — `window.message` é barramento compartilhado', () => {
    const { result } = renderHook(() => useMenuPreview())

    receber({ type: 'draft', draft: rascunho() })
    receber({ source: 'vite:hmr', type: 'open', itemId: 'joias' })

    expect(result.current.draft).toBeNull()
    expect(result.current.openId).toBeNull()
  })

  it('fora do modo prévia não escuta nada', () => {
    semIframe()
    const { result } = renderHook(() => useMenuPreview())

    receber({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft: rascunho() }, window)

    expect(result.current.draft).toBeNull()
  })
})

describe('a escuta é removida ao desmontar', () => {
  it('depois do unmount, `draft` não muda mais nada', () => {
    const { result, unmount } = renderHook(() => useMenuPreview())
    receber({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft: rascunho('Antes') })
    unmount()

    receber({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft: rascunho('Depois') })

    expect(result.current.draft?.categories[0].name).toBe('Antes')
  })
})
