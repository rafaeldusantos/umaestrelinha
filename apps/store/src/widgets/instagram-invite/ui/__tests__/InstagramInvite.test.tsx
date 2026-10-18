import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * O convite para o Instagram na Home: quando abre, quando não abre, como fecha e o que diz.
 *
 * Os textos são asseridos LITERAIS: a copy é da dona, e uma reescrita "para melhorar" mudaria o tom
 * da loja sem nada quebrar.
 *
 * O relógio é falso com `shouldAdvanceTime`: o atraso de abertura é avançado à mão, e o resto (a
 * carga preguiçosa da folha, as esperas do Testing Library) segue no tempo real.
 */
vi.mock('@/shared/lib/analytics', () => ({
  applyConsent: () => {},
  clearGaCookies: () => {},
  setConsentReader: () => {},
}))

import InstagramInvite from '../InstagramInvite'
import { ATRASO_DO_CONVITE_MS } from '../InstagramInvite'
import { INSTAGRAM_INVITE_KEY, resetInviteSeenForTests } from '../../model/inviteSeen'
import { useCookieConsentStore } from '@/entities/cookie-consent'
import {
  INSTAGRAM_CTA_GRADIENT,
  INSTAGRAM_GLYPH_STOPS,
  INSTAGRAM_RING_GRADIENT,
} from '@/shared/config/instagram'

const convite = () => screen.queryByRole('dialog')

const TITULO = 'Acompanhe de perto o meu trabalho'
const TEXTO =
  'Lá eu mostro cada joia sendo feita, do material que chega até a peça pronta. Se quiser acompanhar, vai ser um carinho ter você por lá.'

const abrir = async () => {
  render(<InstagramInvite />)
  await esperarOAtraso()
  return screen.findByRole('dialog', { name: TITULO })
}

const fechou = () => waitFor(() => expect(convite()).toBeNull())

const esperarOAtraso = async () => {
  await act(async () => {
    vi.advanceTimersByTime(ATRASO_DO_CONVITE_MS)
  })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  window.localStorage.clear()
  resetInviteSeenForTests()
  useCookieConsentStore.setState({ notice: 'answered', statistics: true, preferencesOpen: false })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('quando abre', () => {
  it('com o storage vazio e o aviso de cookies respondido, abre depois do atraso', async () => {
    render(<InstagramInvite />)
    expect(convite()).toBeNull()

    await esperarOAtraso()

    expect(
      await screen.findByRole('dialog', { name: 'Acompanhe de perto o meu trabalho' }),
    ).toBeInTheDocument()
  })

  it('não abre antes do atraso', async () => {
    render(<InstagramInvite />)
    await act(async () => {
      vi.advanceTimersByTime(ATRASO_DO_CONVITE_MS - 100)
    })
    expect(convite()).toBeNull()
  })
})

describe('uma vez só por navegador', () => {
  it('com a marca gravada, não abre', async () => {
    window.localStorage.setItem(INSTAGRAM_INVITE_KEY, '1')
    render(<InstagramInvite />)
    await esperarOAtraso()
    expect(convite()).toBeNull()
  })

  it('a marca é gravada ao abrir, na chave `estrelinha-instagram-invite`', async () => {
    render(<InstagramInvite />)
    await esperarOAtraso()
    await screen.findByRole('dialog')
    expect(INSTAGRAM_INVITE_KEY).toBe('estrelinha-instagram-invite')
    expect(window.localStorage.getItem('estrelinha-instagram-invite')).not.toBeNull()
  })

  it('ao remontar, não reabre', async () => {
    const primeira = render(<InstagramInvite />)
    await esperarOAtraso()
    await screen.findByRole('dialog')
    primeira.unmount()
    resetInviteSeenForTests() // visita nova: só o que ficou no storage conta

    render(<InstagramInvite />)
    await esperarOAtraso()
    expect(convite()).toBeNull()
  })
})

describe('sem `localStorage`', () => {
  it('lançando na leitura e na escrita, abre sem quebrar e não reabre na mesma sessão', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    const primeira = render(<InstagramInvite />)
    await esperarOAtraso()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    primeira.unmount()

    render(<InstagramInvite />)
    await esperarOAtraso()
    expect(convite()).toBeNull()
  })
})

describe('como fecha', () => {
  it('pelo X, que tem rótulo em português e alvo de 44px', async () => {
    await abrir()
    const x = screen.getByRole('button', { name: 'Fechar convite do Instagram' })
    expect(x).toHaveClass('h-11', 'w-11')
    fireEvent.click(x)
    await fechou()
  })

  it('por "Agora não", que tem a área de 44px de altura', async () => {
    await abrir()
    const agoraNao = screen.getByRole('button', { name: 'Agora não' })
    expect(agoraNao.className).toContain('before:h-11')
    fireEvent.click(agoraNao)
    await fechou()
  })

  it('pela tecla Esc', async () => {
    const dialogo = await abrir()
    fireEvent.keyDown(dialogo, { key: 'Escape' })
    await fechou()
  })

  it('pelo toque no véu, que é `ink` a 55%', async () => {
    await abrir()
    const veu = document.querySelector('.bg-estrelinha-ink\\/55')
    expect(veu).not.toBeNull()
    fireEvent.pointerDown(veu!)
    await fechou()
  })
})

describe('o botão do perfil', () => {
  it('aponta para o perfil com `www`, em nova aba e com `noopener`, e fecha o convite', async () => {
    await abrir()
    const perfil = screen.getByRole('link', { name: 'Ver o perfil no Instagram' })
    expect(perfil).toHaveAttribute('href', 'https://www.instagram.com/umaestrelinha.adri')
    expect(perfil).toHaveAttribute('target', '_blank')
    expect(perfil.getAttribute('rel')?.split(/\s+/)).toContain('noopener')
    expect(perfil).toHaveClass('min-h-11', 'h-[52px]', 'rounded-sm')
    fireEvent.click(perfil)
    await fechou()
  })
})

describe('acessibilidade', () => {
  it('o diálogo tem o título como nome, o texto como descrição, e o foco entra nele', async () => {
    const dialogo = await abrir()
    expect(dialogo).toHaveAccessibleName(TITULO)
    expect(dialogo).toHaveAccessibleDescription(TEXTO)
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true))
  })
})

describe('o que o convite diz', () => {
  it('rótulo, título, texto e o arroba saem literais', async () => {
    const dialogo = await abrir()
    expect(screen.getByText('NO INSTAGRAM', { normalizer: s => s })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: TITULO })).toBeInTheDocument()
    expect(screen.getByText(TEXTO, { normalizer: s => s.replace(/\s+/g, ' ').trim() })).toBeInTheDocument()
    expect(screen.getByText('@umaestrelinha.adri', { normalizer: s => s })).toBeInTheDocument()
    expect(dialogo).toHaveTextContent(/Ver o perfil no Instagram/)
    expect(dialogo).toHaveTextContent(/Agora não/)
  })

  it('V2: o rótulo leva o ícone colorido do Instagram no lugar do fio ouro', async () => {
    const dialogo = await abrir()
    const glifo = screen.getByTestId('glifo-instagram')
    expect(glifo).toHaveAttribute('aria-hidden')
    // O gradiente do ícone sai das paradas do dono, na ordem — nenhuma cor escrita no widget.
    const paradas = Array.from(glifo.querySelectorAll('stop')).map(st => st.getAttribute('stop-color'))
    expect(paradas).toEqual([...INSTAGRAM_GLYPH_STOPS])
    // O retângulo aponta para o gradiente DESTE ícone, e não para um id que não existe.
    const id = glifo.querySelector('radialGradient')!.getAttribute('id')
    expect(glifo.querySelector('rect')!.getAttribute('fill')).toBe(`url(#${id})`)
    expect(screen.queryByTestId('fio-ouro')).toBeNull()
    expect(dialogo.innerHTML).not.toContain('text-estrelinha-accent')
  })

  it('V2: o @ vem com o avatar no anel de story e a linha "Adri Muniz · joias afetivas"', async () => {
    await abrir()
    const anel = screen.getByTestId('anel-de-story')
    expect(anel).toHaveAttribute('aria-hidden')
    expect(anel.style.getPropertyValue('--ig-gradiente')).toBe(INSTAGRAM_RING_GRADIENT)
    expect(anel).toHaveClass('[background-image:var(--ig-gradiente)]')
    expect(screen.getByText('Adri Muniz · joias afetivas', { normalizer: s => s })).toBeInTheDocument()
  })

  it('V2: dentro do anel vai o avatar claro das redes — `ground`, fio `line` e o símbolo da marca', async () => {
    await abrir()
    const avatar = screen.getByTestId('avatar-das-redes')
    expect(avatar.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['rounded-full', 'border', 'border-estrelinha-line', 'bg-estrelinha-ground']),
    )
    // Era `ground-deep` no placeholder; o avatar das redes é o claro.
    expect(avatar).not.toHaveClass('bg-estrelinha-ground-deep')
    // O símbolo, no tom positivo (`primary-strong`), e nada de foto.
    const simbolo = avatar.querySelector('svg')!
    expect(simbolo).not.toBeNull()
    expect(simbolo.querySelector('path')!.getAttribute('stroke')).toBe('#283A4A')
    expect(avatar.querySelector('img')).toBeNull()
  })

  it('V2: o botão do perfil tem o gradiente do Instagram e texto branco, e segue com raio de ação', async () => {
    await abrir()
    const perfil = screen.getByRole('link', { name: 'Ver o perfil no Instagram' })
    expect(perfil.style.getPropertyValue('--ig-gradiente')).toBe(INSTAGRAM_CTA_GRADIENT)
    expect(perfil).toHaveClass('[background-image:var(--ig-gradiente)]')
    expect(perfil.style.color).toBe('rgb(255, 255, 255)')
    expect(perfil).toHaveClass('rounded-sm')
    expect(perfil).not.toHaveClass('rounded-md')
  })

  it('não há fileira de fotos — nenhuma imagem no convite', async () => {
    const dialogo = await abrir()
    expect(dialogo.querySelectorAll('img')).toHaveLength(0)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('não há exclamação na copy', async () => {
    const dialogo = await abrir()
    expect(dialogo.textContent).not.toContain('!')
  })
})

describe('o aviso de cookies', () => {
  it('com o aviso pendente, o convite não abre', async () => {
    useCookieConsentStore.setState({ notice: null })
    render(<InstagramInvite />)
    await esperarOAtraso()
    expect(convite()).toBeNull()
  })

  it('quando o aviso é respondido, o convite abre', async () => {
    useCookieConsentStore.setState({ notice: null })
    render(<InstagramInvite />)
    await esperarOAtraso()
    expect(convite()).toBeNull()

    act(() => useCookieConsentStore.getState().accept())

    expect(await screen.findByRole('dialog', { name: TITULO })).toBeInTheDocument()
  })

  it('com as preferências de cookies abertas, o convite espera', async () => {
    useCookieConsentStore.setState({ notice: 'answered', preferencesOpen: true })
    render(<InstagramInvite />)
    await esperarOAtraso()
    expect(convite()).toBeNull()
  })
})
