// Feature 61 · `ANL-01` — a página `/admin/google`: o título, a fileira das duas seções com o estado
// de cada uma, e a montagem condicional do painel da seção aberta.
//
// Os dois painéis são dublados aqui: cada um tem a própria suíte. O que esta prova é a página — qual
// painel ela escolhe pela URL, o que a fileira diz, e que só um painel existe no DOM.
// As rotas reais (inclusive o redirect) são provadas no `App` de verdade, em
// `app/__tests__/rotasDoGoogle.test.tsx`.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const estado = vi.hoisted(() => ({ analytics: true, shopping: false }))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useAnalyticsSettings: () => ({
    enabled: estado.analytics,
    measurement_id: 'G-SQL517XDQZ',
    production_host: 'umaestrelinha.com.br',
  }),
  useGoogleShoppingSettings: () => ({
    enabled: estado.shopping,
    ever_enabled: false,
    merchant_id: '685367464',
    default_product_category: '',
    last_fetched_at: null,
  }),
}))

vi.mock('@/features/google-analytics', () => ({
  AnalyticsPanel: () => <p>corpo do analytics</p>,
}))
vi.mock('@/features/google-shopping', () => ({
  GoogleShoppingPanel: () => <p>corpo do shopping</p>,
}))

import AdminGooglePage from './AdminGooglePage'

const renderPage = (caminho: string) =>
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/admin/google" element={<AdminGooglePage />} />
        <Route path="/admin/google/:secao" element={<AdminGooglePage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  estado.analytics = true
  estado.shopping = false
})

describe('o cabeçalho', () => {
  it('a página se chama "Google" e diz o que as duas integrações fazem', () => {
    renderPage('/admin/google')
    expect(screen.getByRole('heading', { level: 1, name: 'Google' })).toBeTruthy()
    expect(screen.getByText(/o Analytics, que mede a navegação e as vendas/)).toBeTruthy()
    expect(screen.getByText(/o Shopping, que publica o catálogo/)).toBeTruthy()
  })
})

describe('a fileira das seções (ANL-01, AD-046)', () => {
  it('são dois LINKS, para o endereço de cada seção — não abas de estado local', () => {
    renderPage('/admin/google')
    const nav = screen.getByRole('navigation', { name: 'Integrações com o Google' })
    const links = within(nav).getAllByRole('link')
    expect(links.map(l => l.getAttribute('href'))).toEqual([
      '/admin/google/analytics',
      '/admin/google/shopping',
    ])
    expect(within(nav).queryByRole('tab')).toBeNull()
  })

  it('cada seção exibe o próprio estado — Analytics ligado, Shopping desligado', () => {
    renderPage('/admin/google')
    expect(screen.getByTestId('google-section-status-analytics').textContent).toBe('Ligado')
    expect(screen.getByTestId('google-section-status-shopping').textContent).toBe('Desligado')
  })

  it('o estado é de CADA seção, não um só para as duas — o inverso também aparece', () => {
    estado.analytics = false
    estado.shopping = true
    renderPage('/admin/google')
    expect(screen.getByTestId('google-section-status-analytics').textContent).toBe('Desligado')
    expect(screen.getByTestId('google-section-status-shopping').textContent).toBe('Ligado')
  })

  it('o selo "Ligado" usa o esmeralda semântico do painel, e "Desligado" o neutro', () => {
    renderPage('/admin/google')
    const ligado = screen.getByTestId('google-section-status-analytics').className
    const desligado = screen.getByTestId('google-section-status-shopping').className
    expect(ligado).toMatch(/(?:^|\s)text-estrelinha-admin-emerald(?![-\w])/)
    expect(desligado).toMatch(/(?:^|\s)text-muted-foreground(?![-\w])/)
    expect(desligado).not.toMatch(/estrelinha-admin-emerald/)
  })

  it('cada link tem altura de 44px (ANL-09)', () => {
    renderPage('/admin/google')
    for (const slug of ['analytics', 'shopping']) {
      expect(screen.getByTestId(`google-section-link-${slug}`).className).toMatch(
        /(?:^|\s)h-11(?![-\w])/,
      )
    }
  })
})

describe('qual seção abre', () => {
  it('a rota-mãe abre Analytics, marcada como a página corrente', () => {
    renderPage('/admin/google')
    expect(screen.getByText('corpo do analytics')).toBeTruthy()
    expect(screen.getByTestId('google-section-link-analytics').getAttribute('aria-current')).toBe(
      'page',
    )
    expect(screen.getByTestId('google-section-link-shopping').getAttribute('aria-current')).toBeNull()
  })

  it('`/admin/google/shopping` abre Shopping, e SÓ ele está no DOM', () => {
    renderPage('/admin/google/shopping')
    expect(screen.getByText('corpo do shopping')).toBeTruthy()
    // Montagem condicional: o rascunho de uma seção não sobrevive escondido atrás da outra.
    expect(screen.queryByText('corpo do analytics')).toBeNull()
    expect(screen.getByTestId('google-section-link-shopping').getAttribute('aria-current')).toBe(
      'page',
    )
  })

  it('slug inexistente abre Analytics', () => {
    renderPage('/admin/google/xpto')
    expect(screen.getByText('corpo do analytics')).toBeTruthy()
    expect(screen.queryByText('corpo do shopping')).toBeNull()
  })

  it('clicar na outra seção troca o painel, e o painel anterior sai do DOM', () => {
    renderPage('/admin/google')
    fireEvent.click(screen.getByTestId('google-section-link-shopping'))
    expect(screen.getByText('corpo do shopping')).toBeTruthy()
    expect(screen.queryByText('corpo do analytics')).toBeNull()
  })
})
