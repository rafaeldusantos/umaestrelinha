import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ANNOUNCEMENT_PREVIEW_SOURCE, type Announcement } from '@estrelinha/core/announcements'
import { PREVIEW_SOURCE } from '@estrelinha/core/home'

/**
 * A faixa de avisos acima do cabeçalho: quando ela existe, o giro, as setas, o que cada aviso
 * desenha e a prévia do painel.
 *
 * A configuração é dublada no hook do React Query (o mesmo dublê dos outros testes da loja), e o
 * atributo `data-faixa` é escrito no `<html>` do jsdom, como o servidor o escreveria.
 */

const settings = vi.hoisted(() => ({ atual: { data: undefined as unknown } }))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => settings.atual,
}))

import AnnouncementBar from '../AnnouncementBar'

const texto = (n: number, extra: Partial<Announcement> = {}): Announcement =>
  ({
    id: `a${n}`,
    kind: 'text',
    highlight: `Destaque ${n}`,
    text: `texto ${n}`,
    linkLabel: 'Ver',
    href: `/colecao-${n}`,
    ...extra,
  }) as Announcement

const configurar = (items: Announcement[] | null, enabled = true) => {
  settings.atual = items === null ? { data: undefined } : { data: { announcements: { enabled, items } } }
}

const atributo = (valor: '1' | '0' | null) => {
  if (valor === null) document.documentElement.removeAttribute('data-faixa')
  else document.documentElement.setAttribute('data-faixa', valor)
}

/** Um botão que troca de rota sem sair do layout — a "primeira troca de rota no navegador". */
const Navegar = () => {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate('/outra')}>
      navegar
    </button>
  )
}

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <AnnouncementBar />
              <Navegar />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

const faixa = () => screen.queryByRole('region', { name: 'Avisos da loja' })

const comMovimentoReduzido = (reduzido: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduzido && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

const matchMediaOriginal = Object.getOwnPropertyDescriptor(window, 'matchMedia')

beforeEach(() => {
  atributo(null)
  configurar(null)
})

afterEach(() => {
  atributo(null)
  vi.useRealTimers()
  if (matchMediaOriginal) Object.defineProperty(window, 'matchMedia', matchMediaOriginal)
})

describe('quando a faixa existe', () => {
  it('com o atributo "1", ocupa a vaga já na primeira renderização, antes de a configuração chegar', () => {
    atributo('1')
    configurar(null)
    montar()

    const regiao = faixa()
    expect(regiao).not.toBeNull()
    // A vaga é a altura de `core`, por variável CSS — reservada sem aviso nenhum dentro.
    expect(regiao!.className).toMatch(/(?:^|\s)h-\[var\(--faixa-celular\)\](?:\s|$)/)
    expect(regiao!.className).toMatch(/(?:^|\s)md:h-\[var\(--faixa-computador\)\](?:\s|$)/)
    expect(regiao!.style.getPropertyValue('--faixa-computador')).toBe('3rem')
    expect(regiao!.textContent).toBe('')
  })

  it('com o atributo "0", nada é desenhado mesmo com a configuração ligada', () => {
    atributo('0')
    configurar([texto(1)])
    montar()

    expect(faixa()).toBeNull()
  })

  it('sem o atributo, decide a configuração', () => {
    configurar([texto(1)])
    const { unmount } = montar()
    expect(faixa()).not.toBeNull()
    unmount()

    configurar([texto(1)], false)
    montar()
    expect(faixa()).toBeNull()
  })

  it('sem o atributo e com a configuração ainda chegando, nada é desenhado', () => {
    configurar(null)
    montar()
    expect(faixa()).toBeNull()
  })

  it('com o atributo "1" e a configuração ligada, os avisos preenchem a vaga', () => {
    atributo('1')
    configurar([texto(1)])
    montar()

    expect(faixa()!.textContent).toContain('Destaque 1')
  })

  it('depois da primeira troca de rota, a configuração decide — "0" deixa de valer', () => {
    atributo('0')
    configurar([texto(1)])
    montar()
    expect(faixa()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'navegar' }))

    expect(faixa()).not.toBeNull()
  })

  it('com "1" e a configuração sem aviso válido, a vaga fica sem texto até a troca de rota', () => {
    atributo('1')
    configurar([], true)
    montar()

    expect(faixa()).not.toBeNull()
    expect(faixa()!.textContent).toBe('')

    fireEvent.click(screen.getByRole('button', { name: 'navegar' }))

    expect(faixa()).toBeNull()
  })
})

/** Volta uma entrada no histórico do roteador — o "voltar" do navegador, sem recarregar. */
const Voltar = () => {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(-1)}>
      voltar
    </button>
  )
}

const montarComVolta = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <AnnouncementBar />
              <Navegar />
              <Voltar />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

const clicar = (nome: string) => fireEvent.click(screen.getByRole('button', { name: nome }))

describe('depois da primeira troca de rota, decide a configuração', () => {
  it('entrada "0" com a faixa ligada: sem faixa na carga, com os avisos depois de navegar', () => {
    atributo('0')
    configurar([texto(1), texto(2)])
    montarComVolta()
    expect(faixa()).toBeNull()

    clicar('navegar')

    expect(faixa()).not.toBeNull()
    expect(faixa()!.textContent).toContain('Destaque 1')
  })

  it('entrada "1" com a faixa desligada: a vaga na carga, e ela some depois de navegar', () => {
    atributo('1')
    configurar([texto(1)], false)
    montarComVolta()
    expect(faixa()).not.toBeNull()
    expect(faixa()!.textContent).toBe('')

    clicar('navegar')

    expect(faixa()).toBeNull()
  })

  it('voltar pelo histórico à entrada da carga não devolve a decisão ao atributo "0"', () => {
    atributo('0')
    configurar([texto(1)])
    montarComVolta()

    clicar('navegar')
    clicar('voltar')

    expect(faixa()).not.toBeNull()
    expect(faixa()!.textContent).toContain('Destaque 1')
  })

  it('voltar pelo histórico à entrada da carga não devolve a decisão ao atributo "1"', () => {
    atributo('1')
    configurar([texto(1)], false)
    montarComVolta()

    clicar('navegar')
    clicar('voltar')

    expect(faixa()).toBeNull()
  })
})

describe('o giro', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    comMovimentoReduzido(false)
  })

  const tres = () => configurar([texto(1), texto(2), texto(3)])

  it('troca de aviso a cada 6 s', () => {
    tres()
    montar()
    expect(faixa()!.textContent).toContain('Destaque 1')

    act(() => vi.advanceTimersByTime(5999))
    expect(faixa()!.textContent).toContain('Destaque 1')

    act(() => vi.advanceTimersByTime(1))
    expect(faixa()!.textContent).toContain('Destaque 2')
  })

  it('para com o ponteiro em cima e retoma ao sair', () => {
    tres()
    montar()

    fireEvent.mouseEnter(faixa()!)
    act(() => vi.advanceTimersByTime(12000))
    expect(faixa()!.textContent).toContain('Destaque 1')

    fireEvent.mouseLeave(faixa()!)
    act(() => vi.advanceTimersByTime(6000))
    expect(faixa()!.textContent).toContain('Destaque 2')
  })

  it('para com o foco dentro e retoma ao sair', () => {
    tres()
    montar()
    const link = screen.getByRole('link')

    act(() => link.focus())
    act(() => vi.advanceTimersByTime(12000))
    expect(faixa()!.textContent).toContain('Destaque 1')

    act(() => link.blur())
    act(() => vi.advanceTimersByTime(6000))
    expect(faixa()!.textContent).toContain('Destaque 2')
  })

  it('para enquanto o dedo está na faixa e retoma ao soltar', () => {
    tres()
    montar()

    fireEvent.pointerDown(faixa()!)
    act(() => vi.advanceTimersByTime(12000))
    expect(faixa()!.textContent).toContain('Destaque 1')

    fireEvent.pointerUp(faixa()!)
    act(() => vi.advanceTimersByTime(6000))
    expect(faixa()!.textContent).toContain('Destaque 2')
  })

  it('com movimento reduzido, não gira', () => {
    comMovimentoReduzido(true)
    tres()
    montar()

    act(() => vi.advanceTimersByTime(6000))
    expect(faixa()!.textContent).toContain('Destaque 1')
    act(() => vi.advanceTimersByTime(6000))
    expect(faixa()!.textContent).toContain('Destaque 1')
  })

  it('com movimento reduzido, as setas continuam', () => {
    comMovimentoReduzido(true)
    tres()
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'Próximo aviso' }))
    expect(faixa()!.textContent).toContain('Destaque 2')
  })

  it('um aviso só não liga temporizador', () => {
    configurar([texto(1)])
    montar()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('com três avisos, o temporizador existe', () => {
    tres()
    montar()

    expect(vi.getTimerCount()).toBeGreaterThan(0)
  })
})

describe('as setas', () => {
  it('próximo e anterior dão a volta na lista e têm rótulo', () => {
    configurar([texto(1), texto(2), texto(3)])
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'Aviso anterior' }))
    expect(faixa()!.textContent).toContain('Destaque 3')

    fireEvent.click(screen.getByRole('button', { name: 'Próximo aviso' }))
    expect(faixa()!.textContent).toContain('Destaque 1')
  })

  it('ficam no computador: escondidas abaixo de 768 px, alvo de 44 px', () => {
    configurar([texto(1), texto(2)])
    montar()

    for (const nome of ['Aviso anterior', 'Próximo aviso']) {
      const seta = screen.getByRole('button', { name: nome })
      const classes = seta.className.split(/\s+/)
      expect(classes).toEqual(expect.arrayContaining(['hidden', 'md:flex', 'h-11', 'w-11']))
      expect(classes).not.toContain('absolute')
    }
  })

  it('ausentes com um aviso só', () => {
    configurar([texto(1)])
    montar()

    expect(screen.queryByRole('button', { name: 'Aviso anterior' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Próximo aviso' })).toBeNull()
  })
})

describe('o que cada aviso desenha', () => {
  it('o aviso de texto é um link inteiro, com o destaque, o texto e o rótulo', () => {
    configurar([texto(1)])
    montar()

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/colecao-1')
    // O texto cru, sem a normalização de espaço do matcher.
    expect(link.textContent).toBe('Destaque 1 · texto 1 · Ver')
    const destaque = [...link.querySelectorAll('span')].find(s => s.textContent === 'Destaque 1')
    expect(destaque?.className).toContain('font-bold')
    const rotulo = [...link.querySelectorAll('span')].find(s => s.textContent === 'Ver')
    expect(rotulo?.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['underline', 'whitespace-nowrap', 'font-semibold']),
    )
  })

  it('sem destino, é texto sem link e sem rótulo', () => {
    configurar([texto(1, { href: '', linkLabel: '' })])
    montar()

    expect(screen.queryByRole('link')).toBeNull()
    expect(faixa()!.textContent).toBe('Destaque 1 · texto 1')
  })

  it('o aviso inválido é pulado — a faixa mostra só os que o painel aceitaria', () => {
    configurar([texto(1, { highlight: '', text: '' }), texto(2)])
    montar()

    expect(faixa()!.textContent).toContain('Destaque 2')
    expect(screen.queryByRole('button', { name: 'Próximo aviso' })).toBeNull()
  })

  it('a região tem o rótulo "Avisos da loja" e nenhum aria-live', () => {
    configurar([texto(1), texto(2)])
    montar()

    const regiao = faixa()!
    expect(regiao.getAttribute('aria-live')).toBeNull()
    expect(regiao.querySelector('[aria-live]')).toBeNull()
  })

  it('aviso de imagem: um <picture> com uma fonte por dispositivo, a rendição da vaga e o texto alternativo', () => {
    const base = 'https://projeto.supabase.co/storage/v1/object/public/announcements'
    configurar([
      {
        id: 'img',
        kind: 'image',
        imageDesktop: `${base}/computador.png`,
        imageMobile: `${base}/celular.png`,
        alt: 'Black Friday: novembro inteiro com joias em oferta',
        href: '/black-friday',
      },
    ])
    montar()

    const pictures = faixa()!.querySelectorAll('picture')
    expect(pictures).toHaveLength(1)
    const fontes = pictures[0].querySelectorAll('source')
    expect(fontes).toHaveLength(1)
    expect(fontes[0].getAttribute('media')).toBe('(min-width: 768px)')
    expect(fontes[0].getAttribute('srcset')).toContain('/render/image/public/announcements/computador.png?width=1440')

    const img = pictures[0].querySelector('img')!
    expect(img.getAttribute('src')).toContain('/render/image/public/announcements/celular.png?width=780')
    expect(img.getAttribute('alt')).toBe('Black Friday: novembro inteiro com joias em oferta')
    expect(img.className.split(/\s+/)).toContain('object-contain')
    expect(screen.getByRole('link').getAttribute('href')).toBe('/black-friday')
  })
})

describe('em prévia no painel', () => {
  const paiFalso = { postMessage: vi.fn() }
  const parentOriginal = Object.getOwnPropertyDescriptor(window, 'parent')

  const receber = (data: unknown, source: unknown = paiFalso) => {
    const evento = new MessageEvent('message', { data })
    Object.defineProperty(evento, 'source', { value: source })
    act(() => {
      window.dispatchEvent(evento)
    })
  }

  const rascunho = (items: Announcement[], enabled = true) => ({
    source: ANNOUNCEMENT_PREVIEW_SOURCE,
    type: 'draft',
    announcements: { enabled, items },
  })

  beforeEach(() => {
    window.history.replaceState({}, '', '/?preview=1')
    Object.defineProperty(window, 'parent', { value: paiFalso, configurable: true })
  })

  afterEach(() => {
    if (parentOriginal) Object.defineProperty(window, 'parent', parentOriginal)
    window.history.replaceState({}, '', '/')
  })

  it('o rascunho substitui o publicado', () => {
    configurar([texto(1)])
    montar()
    expect(faixa()!.textContent).toContain('Destaque 1')

    receber(rascunho([texto(7)]))

    expect(faixa()!.textContent).toContain('Destaque 7')
    expect(faixa()!.textContent).not.toContain('Destaque 1')
  })

  it('o rascunho desligado tira a faixa, mesmo com o publicado ligado', () => {
    configurar([texto(1)])
    montar()

    receber(rascunho([texto(7)], false))

    expect(faixa()).toBeNull()
  })

  it('não gira sozinha', () => {
    vi.useFakeTimers()
    comMovimentoReduzido(false)
    configurar([])
    montar()
    receber(rascunho([texto(1), texto(2), texto(3)]))

    act(() => vi.advanceTimersByTime(6000))
    expect(faixa()!.textContent).toContain('Destaque 1')
    act(() => vi.advanceTimersByTime(6000))
    expect(faixa()!.textContent).toContain('Destaque 1')
  })

  it('"mostre o aviso N" troca o aviso', () => {
    configurar([])
    montar()
    receber(rascunho([texto(1), texto(2), texto(3)]))

    receber({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'show', index: 2 })

    expect(faixa()!.textContent).toContain('Destaque 3')
  })

  it('depois de "mostre o aviso N", as setas continuam andando', () => {
    configurar([])
    montar()
    receber(rascunho([texto(1), texto(2), texto(3)]))
    receber({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'show', index: 1 })
    expect(faixa()!.textContent).toContain('Destaque 2')

    fireEvent.click(screen.getByRole('button', { name: 'Próximo aviso' }))
    expect(faixa()!.textContent).toContain('Destaque 3')

    fireEvent.click(screen.getByRole('button', { name: 'Aviso anterior' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aviso anterior' }))
    expect(faixa()!.textContent).toContain('Destaque 1')

    // Pedir o mesmo aviso de novo, depois de andar pelas setas, volta a valer.
    receber({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'show', index: 1 })
    expect(faixa()!.textContent).toContain('Destaque 2')
  })

  it('mensagem de outro carimbo é ignorada', () => {
    configurar([texto(1)])
    montar()

    receber({ ...rascunho([texto(7)]), source: PREVIEW_SOURCE })

    expect(faixa()!.textContent).toContain('Destaque 1')
  })

  it('mensagem que não vem do pai é ignorada', () => {
    configurar([texto(1)])
    montar()

    receber(rascunho([texto(7)]), window)

    expect(faixa()!.textContent).toContain('Destaque 1')
  })
})
