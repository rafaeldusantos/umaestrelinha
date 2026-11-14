import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STYLE_PROFILE_ATTRIBUTE, STYLE_PROFILE_PREVIEW_SOURCE } from '@estrelinha/core/appearance'
import { ANNOUNCEMENT_PREVIEW_SOURCE } from '@estrelinha/core/announcements'

/**
 * O aplicador do perfil de estilo: quem decide o perfil do `<html>` na carga, depois da primeira
 * troca de rota e dentro da prévia do painel.
 *
 * A configuração é dublada no hook do React Query (o mesmo dublê da faixa de avisos), e o atributo do
 * perfil é escrito no `<html>` do jsdom, como o servidor o escreveria.
 */

const settings = vi.hoisted(() => ({ atual: { data: undefined as unknown, isLoading: true } }))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => settings.atual,
}))

import StyleProfileApplier from '../StyleProfileApplier'

const html = document.documentElement
const perfil = () => html.getAttribute(STYLE_PROFILE_ATTRIBUTE)

/** A configuração salva; `undefined` é "ainda chegando". */
const configurar = (profile: unknown) => {
  settings.atual =
    profile === undefined
      ? { data: undefined, isLoading: true }
      : { data: { appearance: { profile } }, isLoading: false }
}

const atributo = (valor: string | null) => {
  if (valor === null) html.removeAttribute(STYLE_PROFILE_ATTRIBUTE)
  else html.setAttribute(STYLE_PROFILE_ATTRIBUTE, valor)
}

const Navegar = () => {
  const navigate = useNavigate()
  return (
    <>
      <button type="button" onClick={() => navigate('/outra')}>
        navegar
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        voltar
      </button>
    </>
  )
}

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <StyleProfileApplier />
      <Routes>
        <Route path="*" element={<Navegar />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  atributo(null)
  configurar(undefined)
})

afterEach(() => {
  atributo(null)
})

describe('na carga do documento', () => {
  it('vale o perfil do atributo, e a configuração diferente não o troca enquanto não houver troca de rota', () => {
    atributo('black-friday')
    configurar(undefined)
    const { rerender } = montar()
    expect(perfil()).toBe('black-friday')

    // A configuração chega dizendo Padrão — a página parada não muda de cor.
    configurar('padrao')
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <StyleProfileApplier />
        <Routes>
          <Route path="*" element={<Navegar />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(perfil()).toBe('black-friday')
  })

  it('o atributo Padrão também segura a carga contra a configuração Black Friday', () => {
    atributo('padrao')
    configurar('black-friday')
    montar()
    expect(perfil()).toBe('padrao')
  })
})

describe('depois da primeira troca de rota', () => {
  it('vale a configuração', () => {
    atributo('black-friday')
    configurar('padrao')
    montar()
    expect(perfil()).toBe('black-friday')

    fireEvent.click(screen.getByRole('button', { name: 'navegar' }))
    expect(perfil()).toBe('padrao')
  })

  it('voltar à rota da carga não devolve a decisão ao atributo', () => {
    atributo('black-friday')
    configurar('padrao')
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'navegar' }))
    fireEvent.click(screen.getByRole('button', { name: 'voltar' }))
    expect(perfil()).toBe('padrao')
  })

  it('com a configuração ainda chegando, o perfil da carga continua', () => {
    atributo('black-friday')
    configurar(undefined)
    montar()

    fireEvent.click(screen.getByRole('button', { name: 'navegar' }))
    expect(perfil()).toBe('black-friday')
  })
})

describe('sem o atributo da carga', () => {
  it('decide a configuração', () => {
    configurar('black-friday')
    montar()
    expect(perfil()).toBe('black-friday')
  })

  it('a configuração desconhecida vale Padrão', () => {
    atributo('black-friday')
    configurar('Black Friday')
    montar()
    // Com o atributo, a carga segura; depois de navegar, o valor gravado errado cai no Padrão.
    fireEvent.click(screen.getByRole('button', { name: 'navegar' }))
    expect(perfil()).toBe('padrao')
  })

  it('a configuração desconhecida vale Padrão também na carga sem atributo', () => {
    configurar(42)
    montar()
    expect(perfil()).toBe('padrao')
  })

  it('o atributo da carga com valor desconhecido é "não sei", e decide a configuração', () => {
    atributo('natal')
    configurar('black-friday')
    montar()
    expect(perfil()).toBe('black-friday')
  })

  it('com a configuração ainda chegando, o <html> não é tocado', () => {
    configurar(undefined)
    montar()
    expect(html.hasAttribute(STYLE_PROFILE_ATTRIBUTE)).toBe(false)
  })
})

describe('na prévia do painel', () => {
  const paiFalso = { postMessage: vi.fn() }
  const parentOriginal = Object.getOwnPropertyDescriptor(window, 'parent')
  const referrerOriginal = Object.getOwnPropertyDescriptor(document, 'referrer')

  const receber = (data: unknown, source: unknown = paiFalso) => {
    const evento = new MessageEvent('message', { data })
    Object.defineProperty(evento, 'source', { value: source })
    act(() => {
      window.dispatchEvent(evento)
    })
  }

  const rascunho = (profile: string) => ({ source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'draft', profile })

  const dentroDoIframe = () =>
    Object.defineProperty(window, 'parent', { value: paiFalso, configurable: true })

  beforeEach(() => {
    paiFalso.postMessage.mockClear()
    window.history.replaceState({}, '', '/?preview=1')
  })

  afterEach(() => {
    if (parentOriginal) Object.defineProperty(window, 'parent', parentOriginal)
    if (referrerOriginal) Object.defineProperty(document, 'referrer', referrerOriginal)
    else delete (document as { referrer?: string }).referrer
    window.history.replaceState({}, '', '/')
  })

  it('a mensagem de rascunho do pai aplica o perfil, por cima do salvo', () => {
    dentroDoIframe()
    configurar('padrao')
    montar()
    expect(perfil()).toBe('padrao')

    receber(rascunho('black-friday'))
    expect(perfil()).toBe('black-friday')

    receber(rascunho('padrao'))
    expect(perfil()).toBe('padrao')
  })

  it('o rascunho vence também o atributo da carga', () => {
    dentroDoIframe()
    atributo('padrao')
    configurar('padrao')
    montar()

    receber(rascunho('black-friday'))
    expect(perfil()).toBe('black-friday')
  })

  it('o "ready" sai para a origem do painel, nunca para "*"', () => {
    dentroDoIframe()
    Object.defineProperty(document, 'referrer', {
      value: 'https://painel.exemplo.invalid/admin/configuracoes',
      configurable: true,
    })
    configurar('padrao')
    montar()

    expect(paiFalso.postMessage).toHaveBeenCalledTimes(1)
    expect(paiFalso.postMessage).toHaveBeenCalledWith(
      { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'ready' },
      'https://painel.exemplo.invalid',
    )
  })

  it('sem referrer, nenhum "ready" sai', () => {
    dentroDoIframe()
    Object.defineProperty(document, 'referrer', { value: '', configurable: true })
    configurar('padrao')
    montar()
    expect(paiFalso.postMessage).not.toHaveBeenCalled()
  })

  it('mensagem de outra janela não muda nada', () => {
    dentroDoIframe()
    configurar('padrao')
    montar()

    receber(rascunho('black-friday'), window)
    expect(perfil()).toBe('padrao')
  })

  it('mensagem de outro carimbo não muda nada', () => {
    dentroDoIframe()
    configurar('padrao')
    montar()

    receber({ ...rascunho('black-friday'), source: ANNOUNCEMENT_PREVIEW_SOURCE })
    expect(perfil()).toBe('padrao')
  })

  it('com ?preview=1 fora de iframe, o rascunho não muda nada', () => {
    // `window.parent === window`: a cliente que abriu um link com o parâmetro.
    configurar('padrao')
    montar()

    receber(rascunho('black-friday'), window.parent)
    expect(perfil()).toBe('padrao')
  })
})
