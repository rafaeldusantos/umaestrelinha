import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { viewItemEvent } from '@estrelinha/core/analytics'

/**
 * Feature 61 · T15 — o aviso de cookies e a folha de preferências (`AVS-01..08`).
 *
 * Os textos são asseridos LITERAIS (`L-036`): a copy é da spec, aguarda a aprovação da dona, e uma
 * reescrita "para melhorar" mudaria o que a política promete sem nada quebrar.
 *
 * A recusa (`AVS-05`) é medida no que SAI — a fila do gtag —, nunca no estado da store: um
 * `statistics: false` com eventos ainda chegando ao Google seria exatamente o defeito.
 */
const { settingsRows } = vi.hoisted(() => ({
  settingsRows: { atual: [] as { key: string; value: unknown }[] },
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => Promise.resolve({ data: settingsRows.atual, error: null }) }),
  },
}))

import CookieNotice from '../CookieNotice'
import { useCookieConsentStore } from '@/entities/cookie-consent'
import {
  loadGtag,
  resetAnalyticsForTests,
  setAnalyticsSettings,
  setConsentReader,
  track,
} from '@/shared/lib/analytics'

const ANALYTICS = {
  enabled: true,
  measurement_id: 'G-SQL517XDQZ',
  production_host: 'umaestrelinha.com.br',
}

const AVISO =
  'Usamos cookies para melhorar a sua experiência. Ao continuar navegando, você concorda com a nossa Política de Privacidade.'

type Janela = Window & { dataLayer?: unknown[]; gtag?: unknown }

const renderAviso = (path = '/') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <CookieNotice />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const aviso = () => screen.queryByRole('region', { name: 'Aviso de cookies' })
const folha = () => screen.queryByRole('dialog', { name: 'Preferências de cookies' })

const eventosNaFila = () =>
  ((window as Janela).dataLayer ?? [])
    .map(e => Array.from(e as ArrayLike<unknown>))
    .filter(a => a[0] === 'event')

beforeEach(() => {
  settingsRows.atual = [{ key: 'analytics', value: ANALYTICS }]
  window.localStorage.clear()
  useCookieConsentStore.setState({ notice: null, statistics: true, preferencesOpen: false })
  resetAnalyticsForTests()
  // `resetAnalyticsForTests` devolve o leitor padrão; o de verdade é o da store.
  setConsentReader(() => useCookieConsentStore.getState().statistics)
  delete (window as Janela).dataLayer
  delete (window as Janela).gtag
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('o aviso (AVS-01)', () => {
  it('sem resposta, aparece com o texto EXATO e o link para a política', () => {
    renderAviso()
    expect(aviso()).not.toBeNull()
    expect(aviso()!.textContent).toContain(AVISO)
    const link = within(aviso()!).getByRole('link', { name: 'Política de Privacidade' })
    expect(link).toHaveAttribute('href', '/politica-de-privacidade')
  })

  it('não nomeia o Google — quem nomeia é a política', () => {
    renderAviso()
    expect(aviso()!.textContent).not.toMatch(/google/i)
  })

  it('"Aceitar" é o botão principal (cheio, primary); "Preferências" é link discreto, sem contorno', () => {
    renderAviso()
    const aceitar = within(aviso()!).getByRole('button', { name: 'Aceitar' })
    const prefs = within(aviso()!).getByRole('button', { name: 'Preferências' })
    expect(aceitar.className).toMatch(/(^|\s)bg-estrelinha-primary(\s|$)/)
    expect(aceitar.className).toMatch(/(^|\s)h-12(\s|$)/)
    expect(prefs.className).not.toMatch(/(^|\s)border(\s|$)/)
    expect(prefs.className).not.toMatch(/bg-estrelinha-primary/)
    expect(prefs.className).toContain('underline')
  })

  it('o X e "Preferências" têm alvo de 44px (TAP_44 / TAP_ROW)', () => {
    renderAviso()
    const x = within(aviso()!).getByRole('button', { name: 'Fechar aviso de cookies' })
    const prefs = within(aviso()!).getByRole('button', { name: 'Preferências' })
    expect(x.className).toContain('before:h-11 before:w-11')
    expect(prefs.className).toContain('before:h-11')
  })

  it('fica ACIMA da barra fixa do rodapé no celular (AVS-07)', () => {
    const { unmount } = renderAviso('/')
    expect(aviso()!.getAttribute('style')).toContain('--aviso-rodape: calc(4rem')
    unmount()
    renderAviso('/produtos/pingente')
    expect(aviso()!.getAttribute('style')).toContain('--aviso-rodape: calc(5.5rem')
  })

  it('nas telas de dinheiro (checkout e pagamento PIX) o aviso NÃO aparece (AVS-07)', () => {
    // No celular ele cobria ~150px do fim da página, onde está o CTA de pagar. A medição segue
    // valendo sem aceite (legítimo interesse) — esconder o aviso aqui não muda o que se mede.
    for (const rota of ['/checkout', '/pedido/abc-123/pagamento', '/pedido/abc-123/pagamento/']) {
      const { unmount } = renderAviso(rota)
      expect(aviso(), rota).toBeNull()
      unmount()
    }
  })

  it('INVERSO: as vizinhas das telas de dinheiro continuam com o aviso', () => {
    // A confirmação do pedido e a conta não são tela de pagar; um recorte por prefixo as levaria junto.
    for (const rota of ['/pedido/abc-123', '/conta', '/checkout-presente']) {
      const { unmount } = renderAviso(rota)
      expect(aviso(), rota).not.toBeNull()
      unmount()
    }
  })
})

describe('responder o aviso (AVS-03)', () => {
  it('"Aceitar" fecha e persiste — e a medição continua', () => {
    renderAviso()
    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Aceitar' }))
    expect(aviso()).toBeNull()
    expect(useCookieConsentStore.getState().statistics).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('estrelinha-cookie-consent')!)).toMatchObject({
      notice: 'answered',
    })
  })

  it('o X fecha e persiste, e NÃO recusa', () => {
    renderAviso()
    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Fechar aviso de cookies' }))
    expect(aviso()).toBeNull()
    expect(useCookieConsentStore.getState().statistics).toBe(true)
    expect(window.localStorage.getItem('estrelinha-cookie-consent')).not.toBeNull()
  })

  it('seguir navegando não fecha nem recusa', () => {
    renderAviso()
    // Nenhum toque no aviso: ele continua lá, e a escolha continua "medir".
    expect(aviso()).not.toBeNull()
    expect(useCookieConsentStore.getState().statistics).toBe(true)
    expect(useCookieConsentStore.getState().notice).toBeNull()
  })

  it('com o aviso já respondido, ele não aparece', () => {
    useCookieConsentStore.setState({ notice: 'answered' })
    renderAviso()
    expect(aviso()).toBeNull()
  })
})

describe('a folha "Preferências de cookies" (AVS-04)', () => {
  it('"Preferências" abre a folha, com Necessários sem interruptor e Estatísticas LIGADA', async () => {
    renderAviso()
    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Preferências' }))
    await waitFor(() => expect(folha()).not.toBeNull())
    const f = folha()!
    expect(within(f).getByText('Necessários')).toBeInTheDocument()
    expect(
      within(f).getByText(
        'Guardam a sua sacola, os favoritos e o andamento da compra. Sem eles a loja não funciona.',
      ),
    ).toBeInTheDocument()
    expect(within(f).getByText('Sempre ativos')).toBeInTheDocument()
    // A categoria depende da configuração, que chega depois do primeiro render.
    expect(await within(f).findByText('Estatísticas')).toBeInTheDocument()
    expect(
      within(f).getByText(
        'Ajudam a entender como a loja é visitada, de forma anônima, para melhorá-la.',
      ),
    ).toBeInTheDocument()
    const interruptores = within(f).getAllByRole('switch')
    // UM interruptor: Necessários não tem.
    expect(interruptores).toHaveLength(1)
    await waitFor(() =>
      expect(within(f).getByRole('switch', { name: 'Estatísticas' })).toHaveAttribute(
        'aria-checked',
        'true',
      ),
    )
    expect(within(f).getByRole('button', { name: 'Aceitar todos' })).toBeInTheDocument()
    expect(within(f).getByRole('button', { name: 'Salvar escolhas' })).toBeInTheDocument()
    // O aviso sai de cena enquanto a folha está aberta.
    expect(aviso()).toBeNull()
  })

  it('o X da folha fecha sem mudar a escolha', async () => {
    renderAviso()
    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Preferências' }))
    await waitFor(() => expect(folha()).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Fechar preferências de cookies' }))
    await waitFor(() => expect(folha()).toBeNull())
    expect(useCookieConsentStore.getState().statistics).toBe(true)
  })

  it('o gesto de voltar fecha a folha (AVS-07)', async () => {
    renderAviso()
    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Preferências' }))
    await waitFor(() => expect(folha()).not.toBeNull())
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await waitFor(() => expect(folha()).toBeNull())
  })

  it('medição DESLIGADA no painel ⇒ a folha não mostra Estatísticas (AVS-02)', async () => {
    settingsRows.atual = [{ key: 'analytics', value: { ...ANALYTICS, enabled: false } }]
    renderAviso()
    // O aviso continua existindo: os cookies necessários existem de qualquer forma.
    expect(aviso()).not.toBeNull()
    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Preferências' }))
    await waitFor(() => expect(folha()).not.toBeNull())
    // Dá tempo à configuração chegar (o padrão já é desligado — a asserção vale nos dois instantes).
    await new Promise(r => setTimeout(r, 20))
    expect(within(folha()!).queryByText('Estatísticas')).toBeNull()
    expect(within(folha()!).queryByRole('switch')).toBeNull()
    expect(within(folha()!).getByText('Necessários')).toBeInTheDocument()
  })

  it('sensor do caso acima: com a medição LIGADA, Estatísticas aparece', async () => {
    renderAviso()
    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Preferências' }))
    await waitFor(() => expect(within(folha()!).queryByText('Estatísticas')).not.toBeNull())
  })
})

describe('recusar (AVS-05) — medido no gtag, não no estado', () => {
  const pronto = () => {
    vi.stubEnv('PROD', true)
    setAnalyticsSettings(ANALYTICS)
    loadGtag(ANALYTICS.measurement_id)
  }
  const evento = viewItemEvent({ item: { id: 'p', name: 'Pingente', price: 10 } })

  it('desligar Estatísticas e salvar ⇒ nenhum evento sai dali em diante', async () => {
    pronto()
    track(evento)
    expect(eventosNaFila()).toHaveLength(1)

    renderAviso()
    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Preferências' }))
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Estatísticas' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('switch', { name: 'Estatísticas' }))
    expect(screen.getByRole('switch', { name: 'Estatísticas' })).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar escolhas' }))

    track(evento)
    track(evento)
    expect(eventosNaFila()).toHaveLength(1)
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-SQL517XDQZ']).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('estrelinha-cookie-consent')!)).toMatchObject({
      statistics: false,
    })
  })

  it('sensor: salvar com Estatísticas LIGADA continua medindo', async () => {
    pronto()
    renderAviso()
    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Preferências' }))
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Estatísticas' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Salvar escolhas' }))
    track(evento)
    expect(eventosNaFila()).toHaveLength(1)
  })

  it('"Aceitar todos" depois de recusar volta a medir', async () => {
    pronto()
    useCookieConsentStore.setState({ statistics: false, notice: 'answered' })
    renderAviso()
    act(() => useCookieConsentStore.getState().openPreferences())
    await waitFor(() => expect(folha()).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar todos' }))
    track(evento)
    expect(eventosNaFila()).toHaveLength(1)
  })
})
