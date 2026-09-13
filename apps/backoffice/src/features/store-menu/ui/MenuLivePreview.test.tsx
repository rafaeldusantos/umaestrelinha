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

/**
 * Dá ao palco uma medida de verdade.
 *
 * jsdom **não implementa `ResizeObserver`**, então sem isto a caixa fica `{0,0}`, `previewFrame`
 * devolve o piso nos dois modos, e a tela cheia passa a ser indistinguível do modo normal — foi
 * exatamente esse ponto cego que deixou o gêmeo deste arquivo sobreviver a uma mutação que trocava a
 * altura do quadro pela nominal do dispositivo. O dublê chama o callback no `observe`, como o
 * observador real faz no primeiro quadro.
 */
const comPalcoDe = (caixa: { width: number; height: number }) => {
  class ObservadorFalso {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(alvo: Element) {
      this.callback(
        [{ target: alvo, contentRect: caixa } as unknown as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      )
    }
    unobserve() {}
    disconnect() {}
  }
  // Atribuição direta: o setup do workspace define `ResizeObserver` como propriedade não
  // reconfigurável, e `vi.stubGlobal` tenta redefini-la.
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ObservadorFalso
}

const observadorOriginal = (globalThis as { ResizeObserver?: unknown }).ResizeObserver

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
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = observadorOriginal
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

  it('FOCO-15: sem loja NÃO se oferece tela cheia — não há o que ampliar', () => {
    storeUrl.valor = ''
    montar()
    expect(screen.queryByRole('button', { name: 'Tela cheia' })).toBeNull()
  })
})

/**
 * A tela cheia — FOCO-15, 19, 21 (feature 47).
 *
 * Mesmas réguas do palco da Home, e é de propósito que sejam as mesmas: o estado e as classes saem
 * do MESMO hook (`useFullscreenStage`), então divergir aqui seria divergir do dono.
 */
describe('MenuLivePreview — a tela cheia', () => {
  const palco = () => screen.getByTestId('palco-previa-menu')
  const entrar = () => fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }))
  const sair = () => fireEvent.click(screen.getByRole('button', { name: 'Sair da tela cheia' }))

  it('FOCO-15: o controle existe, rotulado, na barra do palco', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Tela cheia' })).toBeInTheDocument()
  })

  it('acionar o controle aplica o modo na `<section>` do palco', () => {
    montar()
    expect(palco()).not.toHaveAttribute('data-fullscreen')

    entrar()

    expect(palco()).toHaveAttribute('data-fullscreen', 'true')
    expect(palco().className).toContain('fixed')
    expect(palco().className).toContain('inset-0')
  })

  it('FOCO-19: o controle de sair devolve a tela ao normal', () => {
    montar()
    entrar()

    sair()

    expect(palco()).not.toHaveAttribute('data-fullscreen')
  })

  it('FOCO-19: `Escape` também sai — pelo componente real', () => {
    montar()
    entrar()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(palco()).not.toHaveAttribute('data-fullscreen')
  })

  it('FOCO-21: o `<iframe>` é o MESMO nó antes e depois, e o `src` não muda', () => {
    montar()
    const antes = quadro()
    const endereco = antes?.getAttribute('src')

    entrar()
    const durante = quadro()
    sair()
    const depois = quadro()

    expect(durante).toBe(antes)
    expect(depois).toBe(antes)
    expect(depois?.getAttribute('src')).toBe(endereco)
  })

  it('FOCO-16/17: com palco MEDIDO, o quadro cresce em altura e a escala fica em 1', () => {
    // **O gêmeo do palco da Home, e ele precisa da própria prova.** `FOCO-15` nomeia `/admin/menu`
    // por extenso, então `FOCO-16` (1024 a 100%) e `FOCO-17` (altura real, piso 768) governam aqui
    // também. `folgaDoPalco.test.ts` não alcança isto: ele cobra que `previewFrame` seja **chamada**,
    // nunca que o resultado seja **usado** — uma mutação que chama e descarta passa por ele.
    comPalcoDe({ width: 1440, height: 988 })
    montar({ surface: 'desktop' })

    expect(quadro()).toHaveAttribute('height', '768')

    fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }))

    expect(quadro()).toHaveAttribute('width', '1024')
    expect(quadro()).toHaveAttribute('height', '948')
    expect(quadro()?.style.transform).toBe('scale(1)')
    expect(screen.getByTestId('metrica-previa-menu')).toHaveTextContent('1024 × 948 · 100%')
  })

  it('FOCO-16: num palco APERTADO a tela cheia mantém 100%', () => {
    comPalcoDe({ width: 900, height: 700 })
    montar({ surface: 'desktop' })

    expect(screen.getByTestId('metrica-previa-menu')).not.toHaveTextContent('100%')
    // **E o quadro REALMENTE encolhe** (`PRV-14`). Sem esta linha, cravar `scale(1)` no iframe
    // sobrevive: a barra diria `84%` e a prévia renderizaria a 100% dentro de uma caixa reservada
    // para o tamanho reduzido — o menu aparece cortado, e a métrica mente sobre o que está na tela.
    expect(quadro()?.style.transform).not.toBe('scale(1)')

    fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }))

    expect(quadro()?.style.transform).toBe('scale(1)')
    expect(screen.getByTestId('metrica-previa-menu')).toHaveTextContent('1024 × 768 · 100%')
  })

  it('FOCO-18: a superfície do celular NÃO estica em tela cheia', () => {
    comPalcoDe({ width: 1440, height: 1400 })
    montar({ surface: 'mobile' })

    fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }))

    // A altura do celular é a **dobra**, e a curadoria que se edita aqui é a dele.
    expect(quadro()).toHaveAttribute('width', '390')
    expect(quadro()).toHaveAttribute('height', '844')
    expect(screen.getByTestId('metrica-previa-menu')).toHaveTextContent('390 × 844 · 100%')
  })

  it('NAV-37 intacto: o dispositivo continua MOSTRADO, e não escolhido no palco', () => {
    montar()
    entrar()

    // Em tela cheia a tentação é acrescentar o alternador "já que sobra espaço" — e aí a Adri
    // editaria a curadoria do celular olhando a barra do computador.
    expect(screen.getByTestId('dispositivo-previa')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Celular' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Computador' })).toBeNull()
  })
})
