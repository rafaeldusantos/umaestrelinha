import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrollDirection } from '../useScrollDirection'

// As três armadilhas do padrão "esconde no scroll", que é o motivo de o hook existir em vez de meia
// dúzia de linhas dentro do `Header`:
//
// 1. histerese — sem ela, jitter sub-pixel e inércia alternam a direção a cada frame (pisca-pisca);
// 2. clamp — o rubber-band do Safari iOS reporta `scrollY` negativo e acima do máximo, e cada
//    esticada no fim da página lia como "rolou para cima";
// 3. reset por rota — a loja não tem `ScrollRestoration`, então uma navegação que preserve a posição
//    herdava "escondido" e a nova página abria sem cabeçalho.

const Probe = () => {
  const { direction, atTop } = useScrollDirection()
  return <span data-testid="probe">{`${direction}|${atTop ? 'top' : 'away'}`}</span>
}

const probe = () => screen.getByTestId('probe').textContent

/** jsdom não rola de verdade: mexe-se no `scrollY` e dispara-se o evento, como o browser faria. */
const scrollTo = (y: number) => {
  act(() => {
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: y })
    window.dispatchEvent(new Event('scroll'))
  })
}

/** Documento alto o bastante para o clamp ter um máximo real com que trabalhar. */
const setDocumentHeight = (scrollHeight: number, clientHeight = 667) => {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    writable: true,
    configurable: true,
    value: scrollHeight,
  })
  Object.defineProperty(document.documentElement, 'clientHeight', {
    writable: true,
    configurable: true,
    value: clientHeight,
  })
}

beforeEach(() => {
  // `requestAnimationFrame` síncrono: o hook agenda a medição num frame, e sem isso nada acontece
  // dentro de um `act` do teste.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  setDocumentHeight(4000)
  Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useScrollDirection — estado inicial', () => {
  it('nasce revelado e no topo', () => {
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )

    expect(probe()).toBe('up|top')
  })

  it('página que nasce rolada já sabe que saiu do topo', () => {
    // Recarregar no meio da página, ou voltar no histórico: a medida da montagem tem de valer.
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 900 })

    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )

    expect(probe()).toBe('up|away')
  })
})

describe('useScrollDirection — histerese', () => {
  it('rolar bem para baixo vira a direção', () => {
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )

    scrollTo(400)

    expect(probe()).toBe('down|away')
  })

  it('jitter de 3px NÃO vira a direção — é o pisca-pisca que a histerese evita', () => {
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )
    scrollTo(400)
    expect(probe()).toBe('down|away')

    // Tremida típica de rolagem por inércia: sobe 3px, desce 3px, sobe 2px.
    scrollTo(397)
    scrollTo(400)
    scrollTo(398)

    expect(probe()).toBe('down|away')
  })

  it('rolar de volta acima do limiar revela', () => {
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )
    scrollTo(400)

    scrollTo(380)

    expect(probe()).toBe('up|away')
  })

  it('passos pequenos e seguidos contra a direção somam e acabam virando', () => {
    // O modo de falha oposto ao pisca-pisca: se a âncora não acompanhasse o extremo alcançado, uma
    // sequência de passos de 7px nunca somaria o limiar e a direção congelaria para sempre.
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )
    scrollTo(400)
    expect(probe()).toBe('down|away')

    scrollTo(394)
    scrollTo(388)
    scrollTo(382)

    expect(probe()).toBe('up|away')
  })
})

describe('useScrollDirection — zona do topo', () => {
  it('dentro dos 64px do header, ainda é topo', () => {
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )

    scrollTo(60)

    // A direção já é "down", mas `atTop` segurando o header é o que impede a primeira rolagem de
    // esconder o cabeçalho antes de a pessoa ter percebido que ele existe.
    expect(probe()).toBe('down|top')
  })

  it('passando dos 64px, deixou o topo', () => {
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )

    scrollTo(65)

    expect(probe()).toBe('down|away')
  })
})

describe('useScrollDirection — rubber-band do iOS', () => {
  it('scrollY negativo não conta como rolagem para cima', () => {
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )
    scrollTo(400)
    expect(probe()).toBe('down|away')

    // Esticar no topo: o Safari iOS reporta negativo. Clampado a 0, isso É uma rolagem para cima de
    // verdade (400 → 0), então o header volta — o que se prova aqui é que não explode e que o
    // estado fica coerente com o topo.
    scrollTo(-120)

    expect(probe()).toBe('up|top')
  })

  it('esticar além do fim da página não vira a direção', () => {
    // 4000 de altura por 667 de janela ⇒ máximo real de 3333.
    render(
      <MemoryRouter>
        <Probe />
      </MemoryRouter>,
    )
    scrollTo(3333)
    expect(probe()).toBe('down|away')

    // Sem o clamp isto seria "rolou 200px para baixo" e depois "rolou 200px para cima" ao soltar,
    // trazendo o header de volta sozinho no fim de toda página.
    scrollTo(3533)

    expect(probe()).toBe('down|away')
  })
})

describe('useScrollDirection — troca de rota', () => {
  const Jumper = () => {
    const navigate = useNavigate()
    return (
      <>
        <Probe />
        <button onClick={() => navigate('/outra')}>ir</button>
      </>
    )
  }

  it('navegar volta ao estado revelado, mesmo com a posição preservada', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Jumper />} />
          <Route path="/outra" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    )

    scrollTo(400)
    expect(probe()).toBe('down|away')

    act(() => {
      screen.getByText('ir').click()
    })

    // A posição segue em 400 (não há `ScrollRestoration`), mas a página nova abre com cabeçalho.
    expect(probe()).toBe('up|away')
  })
})
