// Feature 39, T29 — o palco e a ponte (`NAV-43`, `NAV-45`, `NAV-46`, `NAV-47`).
//
// jsdom não carrega o documento de um iframe, então **o desenho do menu não se mede aqui** — quem o
// mede é `MegaMenu.test.tsx` e `MobileMenu.test.tsx`, na loja, que é exatamente o ponto da feature:
// existe um desenho só. O que se mede aqui é o quadro, o que sai pelo `postMessage`, e de quem o
// painel aceita ordem.

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MENU_PREVIEW_SOURCE, type MenuCategory, type MenuLink } from '@estrelinha/core/menu'
import { PREVIEW_SOURCE } from '@estrelinha/core/home'

const { storeUrl } = vi.hoisted(() => ({ storeUrl: { valor: 'http://localhost:8082' } }))

vi.mock('@/shared/lib/storeOrigin', () => ({
  get STORE_URL() {
    return storeUrl.valor
  },
  storeOrigin: () => (storeUrl.valor ? new URL(storeUrl.valor).origin : null),
}))

import MenuLivePreview from './MenuLivePreview'

const CATEGORIAS: MenuCategory[] = [
  {
    id: 'joias',
    name: 'Joias afetivas',
    slug: 'joias',
    parent_id: null,
    sort_order: 0,
    active: true,
    menu_desktop: true,
    menu_mobile: true,
  },
]

const LINKS: MenuLink[] = [
  { id: 'sobre', label: 'Sobre', href: '/sobre', desktop: true, mobile: true, sort_order: 100 },
]

const montar = (over: Partial<Parameters<typeof MenuLivePreview>[0]> = {}) =>
  render(
    <MenuLivePreview
      surface="desktop"
      categories={CATEGORIAS}
      links={LINKS}
      openId="joias"
      {...over}
    />,
  )

const quadro = () => document.querySelector('iframe') as HTMLIFrameElement | null

/** A janela do iframe, dublada — jsdom não lhe dá `contentWindow` utilizável para `postMessage`. */
const janelaDoQuadro = () => {
  const postMessage = vi.fn()
  Object.defineProperty(quadro()!, 'contentWindow', { value: { postMessage }, configurable: true })
  return postMessage
}

/** Simula a loja respondendo: `event.source` é somente-leitura e precisa ser plantado no evento. */
const receber = (data: unknown, origin: string, source: unknown) => {
  const evento = new MessageEvent('message', { data, origin })
  Object.defineProperty(evento, 'source', { value: source })
  act(() => {
    window.dispatchEvent(evento)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  storeUrl.valor = 'http://localhost:8082'
})

afterEach(() => {
  vi.useRealTimers()
})

describe('NAV-45 — o dispositivo é a superfície, e a redução é por escala', () => {
  it('a superfície do computador mede 1024 × 768', () => {
    montar({ surface: 'desktop' })
    expect(quadro()).toHaveAttribute('width', '1024')
    expect(quadro()).toHaveAttribute('height', '768')
    expect(quadro()).toHaveAttribute('data-device', 'desktop')
  })

  it('a do celular mede 390 × 844 — o viewport de projeto da loja', () => {
    montar({ surface: 'mobile' })
    expect(quadro()).toHaveAttribute('width', '390')
    expect(quadro()).toHaveAttribute('height', '844')
    expect(screen.getByTestId('metrica-previa-menu')).toHaveTextContent('390 × 844 · 100%')
  })

  it('a medida vai no atributo e a redução é `transform` — encolher mostraria o layout errado', () => {
    // A barra de departamentos é `hidden md:block`: um iframe de 1024 encolhido por CSS continuaria
    // medindo 1024 na media query, e o botão "Celular" mostraria a barra do computador.
    montar({ surface: 'mobile' })
    expect(quadro()!.getAttribute('width')).toBe('390')
    expect(quadro()!.style.transform).toContain('scale(')
    expect(quadro()!.style.transformOrigin).toBe('top left')
  })

  it('NÃO há um segundo alternador de dispositivo dentro do palco (NAV-37)', () => {
    // O alternador da tela é o dono. Um botão aqui deixaria a Adri editar a curadoria do celular
    // olhando a barra do computador — dois donos de "que dispositivo estou conferindo".
    montar()
    expect(screen.queryByRole('button', { name: 'Celular' })).toBeNull()
    expect(screen.queryByRole('group', { name: /dispositivo/i })).toBeNull()
    // O dispositivo é MOSTRADO, e o rótulo vem do catálogo genérico da feature 25.
    expect(screen.getByTestId('dispositivo-previa')).toHaveTextContent('Computador')
  })
})

describe('NAV-43 — a barra do palco', () => {
  it('o `src` é a loja em modo prévia, e não muda com a superfície', () => {
    const { rerender } = montar({ surface: 'desktop' })
    expect(quadro()).toHaveAttribute('src', 'http://localhost:8082/?preview=1')

    rerender(
      <MenuLivePreview surface="mobile" categories={CATEGORIAS} links={LINKS} openId="joias" />,
    )
    // O `src` não carrega o dispositivo de propósito: se carregasse, cada clique no alternador
    // remontaria o documento e a prévia perderia o rascunho já entregue.
    expect(quadro()).toHaveAttribute('src', 'http://localhost:8082/?preview=1')
  })

  it('recarregar REMONTA o quadro, mantendo o mesmo endereço', () => {
    montar()
    const antes = quadro()

    fireEvent.click(screen.getByRole('button', { name: 'Recarregar a prévia' }))

    expect(quadro()).not.toBe(antes)
    expect(quadro()).toHaveAttribute('src', 'http://localhost:8082/?preview=1')
  })

  it('o link de nova aba abre a loja SEM o modo prévia', () => {
    montar()
    expect(screen.getByRole('link', { name: 'Abrir a loja em nova aba' })).toHaveAttribute(
      'href',
      'http://localhost:8082/',
    )
  })
})

describe('NAV-46 — sem `VITE_STORE_URL` a ausência é declarada, e a tela segue editável', () => {
  beforeEach(() => {
    storeUrl.valor = ''
  })

  it('nenhum iframe é montado', () => {
    montar()
    expect(quadro()).toBeNull()
  })

  it('a tela diz o que falta e que o resto continua funcionando', () => {
    montar()
    const vazio = screen.getByTestId('previa-menu-sem-loja')
    expect(vazio).toHaveTextContent('VITE_STORE_URL')
    expect(vazio).toHaveTextContent('continua editável')
  })
})

describe('NAV-44 / NAV-47 — o que sai, para onde, e de quem o painel aceita ordem', () => {
  it('o rascunho sai com DEBOUNCE, na origem exata — nunca `\'*\'`', () => {
    montar()
    const postMessage = janelaDoQuadro()

    act(() => vi.advanceTimersByTime(200))

    const rascunho = postMessage.mock.calls.find(([m]) => m.type === 'draft')
    expect(rascunho).toBeTruthy()
    expect(rascunho![0].draft.categories).toEqual(CATEGORIAS)
    expect(rascunho![0].draft.links).toEqual(LINKS)
    expect(rascunho![1]).toBe('http://localhost:8082')
    // A prova de que o alvo curinga não existe em chamada nenhuma deste componente.
    expect(postMessage.mock.calls.every(([, alvo]) => alvo !== '*')).toBe(true)
  })

  it('o `open` sai SEM debounce — a seleção acompanha o clique', () => {
    const { rerender } = montar({ openId: 'joias' })
    const postMessage = janelaDoQuadro()
    postMessage.mockClear()

    rerender(
      <MenuLivePreview
        surface="desktop"
        categories={CATEGORIAS}
        links={LINKS}
        openId="correntes"
      />,
    )

    // Sem avançar timer nenhum: 200ms aqui seriam lidos como travamento — o painel da prévia
    // abriria depois de a Adri já ter clicado na entrada seguinte.
    expect(postMessage.mock.calls.map(([m]) => m.type)).toEqual(['open'])
    expect(postMessage.mock.calls[0][0].itemId).toBe('correntes')
    expect(postMessage.mock.calls[0][1]).toBe('http://localhost:8082')
  })

  it('respondido o `ready`, o painel entrega rascunho E seleção na hora', () => {
    montar()
    const postMessage = janelaDoQuadro()
    postMessage.mockClear()

    receber(
      { source: MENU_PREVIEW_SOURCE, type: 'ready' },
      'http://localhost:8082',
      quadro()!.contentWindow,
    )

    const tipos = postMessage.mock.calls.map(([m]) => m.type)
    expect(tipos).toContain('draft')
    expect(tipos).toContain('open')
    expect(postMessage.mock.calls.every(([, alvo]) => alvo === 'http://localhost:8082')).toBe(true)
  })

  it('o `load` do iframe entrega tudo — é o caminho que NÃO depende do `ready`', () => {
    // A loja só posta `ready` quando consegue deduzir a origem do painel pelo referrer. Com
    // `Referrer-Policy: no-referrer` ela fica calada de propósito, em vez de postar para `'*'`; esta
    // é a entrega feita pelo lado que conhece a origem certa.
    montar()
    const postMessage = janelaDoQuadro()
    postMessage.mockClear()

    fireEvent.load(quadro()!)

    expect(postMessage.mock.calls.map(([m]) => m.type)).toEqual(['draft', 'open'])
  })

  it('ignora `ready` de OUTRA origem, mesmo vindo da janela do iframe', () => {
    montar()
    const postMessage = janelaDoQuadro()
    postMessage.mockClear()

    receber(
      { source: MENU_PREVIEW_SOURCE, type: 'ready' },
      'https://evil.example',
      quadro()!.contentWindow,
    )

    expect(postMessage).not.toHaveBeenCalled()
  })

  it('ignora `ready` de outra JANELA, mesmo com a origem certa', () => {
    // Origem sozinha não basta: outra aba da própria loja, aberta como popup, teria a origem certa
    // e não é a prévia.
    montar()
    const postMessage = janelaDoQuadro()
    postMessage.mockClear()

    receber({ source: MENU_PREVIEW_SOURCE, type: 'ready' }, 'http://localhost:8082', {
      postMessage: vi.fn(),
    })

    expect(postMessage).not.toHaveBeenCalled()
  })

  it('ignora o `ready` do canal da HOME — o carimbo é o que separa os dois', () => {
    montar()
    const postMessage = janelaDoQuadro()
    postMessage.mockClear()

    receber(
      { source: PREVIEW_SOURCE, type: 'ready' },
      'http://localhost:8082',
      quadro()!.contentWindow,
    )

    expect(postMessage).not.toHaveBeenCalled()
  })

  it('sem loja configurada a ponte fica desligada, e a tela não quebra', () => {
    // `origin: null` desliga o envio, a escuta e o `onLoad`. Sem esse recorte o efeito tocaria em
    // `contentWindow` de um iframe que não existe — e derrubaria a tela inteira do menu por causa de
    // uma variável de ambiente, que é justamente o oposto de `NAV-46`.
    storeUrl.valor = ''
    montar()
    act(() => vi.advanceTimersByTime(200))

    expect(quadro()).toBeNull()
    expect(screen.getByTestId('previa-menu-sem-loja')).toBeInTheDocument()
  })
})
