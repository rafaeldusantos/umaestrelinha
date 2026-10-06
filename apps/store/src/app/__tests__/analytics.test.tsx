import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { Outlet } from 'react-router-dom'

/**
 * Feature 61 · T14 — `AnalyticsLoader` e `PageViewTracker`, medidos pelo `App` REAL.
 *
 * A régua é o que sai: o `<script>` do gtag no documento e os `page_view` entregues ao `track`. Montar
 * os dois componentes soltos num roteador de teste provaria os componentes e nada sobre o `App` —
 * apagar a montagem deles deixaria esse teste verde. Aqui quem monta é o `App`.
 *
 * As páginas viram marcadores (como em `routing.test.tsx`): o que se mede é a moldura, não a página.
 */
const { settingsRows, trackSpy } = vi.hoisted(() => ({
  settingsRows: {
    atual: [] as { key: string; value: unknown }[],
    atraso: null as Promise<unknown> | null,
  },
  trackSpy: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () =>
        (settingsRows.atraso ?? Promise.resolve()).then(() => ({ data: settingsRows.atual, error: null })),
    }),
  },
}))

vi.mock('@/shared/lib/analytics', async importOriginal => {
  const real = await importOriginal<typeof import('@/shared/lib/analytics')>()
  return {
    ...real,
    track: (e: Parameters<typeof real.track>[0]) => {
      trackSpy(e)
      real.track(e)
    },
  }
})

vi.mock('@/app/RuntimeSettingsLoader', () => ({ default: () => null }))
vi.mock('@/features/abandoned-cart/ui/AbandonedCartTracker', () => ({ default: () => null }))
vi.mock('@/widgets/store-layout/ui/StoreLayout', () => ({
  default: () => (
    <div data-testid="store-layout">
      <Outlet />
    </div>
  ),
}))
vi.mock('@/pages/HomePage', () => ({ default: () => <div>pagina:home</div> }))
vi.mock('@/pages/SearchPage', () => ({ default: () => <div>pagina:busca</div> }))
vi.mock('@/pages/AboutPage', () => ({ default: () => <div>pagina:sobre</div> }))
vi.mock('@/pages/CheckoutPage', () => ({ default: () => <div>pagina:checkout</div> }))
vi.mock('@/pages/OrderPaymentPage', () => ({ default: () => <div>pagina:pagamento</div> }))

const LIGADA = {
  key: 'analytics',
  value: { enabled: true, measurement_id: 'G-SQL517XDQZ', production_host: 'umaestrelinha.com.br' },
}

const scriptsDoGtag = () =>
  Array.from(document.querySelectorAll('script')).filter(s =>
    s.src.startsWith('https://www.googletagmanager.com/gtag/js'),
  )

const pageViews = () =>
  trackSpy.mock.calls.map(c => c[0]).filter(e => e?.name === 'page_view')

/** Navega como o navegador: `pushState` + `popstate`, que é o que o `BrowserRouter` escuta. */
const navegar = (path: string) =>
  act(() => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })

const parentOriginal = Object.getOwnPropertyDescriptor(window, 'parent')

const montarApp = async (path: string) => {
  window.history.replaceState({}, '', path)
  vi.resetModules()
  const { default: App } = await import('../App')
  return render(<App />)
}

beforeAll(async () => {
  await import('../App')
}, 120_000)

beforeEach(async () => {
  // O módulo de medição de verdade (o que o dublê embrulha) é carregado UMA vez e sobrevive ao
  // `resetModules` — o estado dele (o ID já carregado, a fila) vazaria de um caso para o outro.
  ;(await import('@/shared/lib/analytics')).resetAnalyticsForTests()
  trackSpy.mockClear()
  settingsRows.atual = [LIGADA]
  settingsRows.atraso = null
  for (const s of scriptsDoGtag()) s.remove()
  delete (window as unknown as { dataLayer?: unknown }).dataLayer
  delete (window as unknown as { gtag?: unknown }).gtag
  window.localStorage.clear()
  vi.stubEnv('PROD', true)
})

afterEach(() => {
  vi.unstubAllEnvs()
  // Fora do iframe de novo: `window.parent` volta a ser a própria janela, ou a prévia vazaria para
  // o caso seguinte (o descritor original pode não ser próprio da janela no jsdom).
  if (parentOriginal) Object.defineProperty(window, 'parent', parentOriginal)
  else Object.defineProperty(window, 'parent', { value: window, configurable: true })
})

describe('AnalyticsLoader pelo App', () => {
  it('medição ligada ⇒ UM script do gtag com o ID da configuração', async () => {
    await montarApp('/')
    await screen.findByText('pagina:home')
    await waitFor(() => expect(scriptsDoGtag()).toHaveLength(1))
    expect(scriptsDoGtag()[0].src).toContain('id=G-SQL517XDQZ')
  })

  it('medição desligada no painel ⇒ nenhum script', async () => {
    settingsRows.atual = [{ ...LIGADA, value: { ...LIGADA.value, enabled: false } }]
    await montarApp('/')
    await screen.findByText('pagina:home')
    // Espera a configuração chegar e o efeito rodar com ela.
    await new Promise(r => setTimeout(r, 50))
    expect(scriptsDoGtag()).toHaveLength(0)
  })

  it('sem a chave no banco (leitura que não traz nada) ⇒ desligado, nenhum script', async () => {
    settingsRows.atual = []
    await montarApp('/')
    await screen.findByText('pagina:home')
    await new Promise(r => setTimeout(r, 50))
    expect(scriptsDoGtag()).toHaveLength(0)
  })

  // CMP-08 na CONFIGURAÇÃO, pelo App: `loadGtag` decide o `traffic_type` lendo a configuração que o
  // carregador gravou ANTES de chamá-lo. A ordem é implícita — e um rearranjo que chamasse `loadGtag`
  // com o estado ainda vazio faria TODO evento automático de produção sair `internal` (sumindo dos
  // relatórios), com os testes do módulo verdes, porque lá a configuração é gravada à mão.
  const configDoGtag = () =>
    ((window as unknown as { dataLayer?: unknown[] }).dataLayer ?? [])
      .map(e => Array.from(e as ArrayLike<unknown>))
      .filter(a => a[0] === 'config')

  it('CMP-08: no host de PRODUÇÃO, a configuração do gtag sai SEM traffic_type', async () => {
    // O host do jsdom é declarado o de produção — lido, não cravado, para a régua não depender dele.
    const host = window.location.hostname
    expect(host).not.toBe('') // âncora: há um host para comparar
    settingsRows.atual = [{ ...LIGADA, value: { ...LIGADA.value, production_host: host } }]
    await montarApp('/')
    await screen.findByText('pagina:home')
    await waitFor(() => expect(configDoGtag()).toHaveLength(1))
    expect(configDoGtag()[0][1]).toBe('G-SQL517XDQZ')
    expect(configDoGtag()[0][2]).toEqual({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    })
  })

  it('CMP-08 (inverso): fora do host de produção, a configuração do gtag leva traffic_type internal', async () => {
    expect(window.location.hostname).not.toBe(LIGADA.value.production_host) // âncora
    await montarApp('/')
    await screen.findByText('pagina:home')
    await waitFor(() => expect(configDoGtag()).toHaveLength(1))
    expect(configDoGtag()[0][2]).toEqual({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      traffic_type: 'internal',
    })
  })

  it('prévia do painel ⇒ nenhum script e nenhum page_view', async () => {
    Object.defineProperty(window, 'parent', { value: { postMessage: vi.fn() }, configurable: true })
    await montarApp('/?preview=1')
    await screen.findByText('pagina:home')
    await new Promise(r => setTimeout(r, 700))
    expect(scriptsDoGtag()).toHaveLength(0)
    expect(pageViews()).toHaveLength(0)
  })
})

describe('PageViewTracker pelo App (EVT-01)', () => {
  it('a primeira página gera UM page_view, com location e title', async () => {
    await montarApp('/')
    await screen.findByText('pagina:home')
    await waitFor(() => expect(pageViews()).toHaveLength(1), { timeout: 2000 })
    expect(pageViews()[0].params).toEqual({
      page_location: 'http://localhost:3000/',
      page_title: document.title,
    })
  })

  it('troca de pathname ⇒ mais um page_view, com o endereço novo', async () => {
    await montarApp('/')
    await waitFor(() => expect(pageViews()).toHaveLength(1), { timeout: 2000 })
    navegar('/sobre')
    await screen.findByText('pagina:sobre')
    await waitFor(() => expect(pageViews()).toHaveLength(2), { timeout: 2000 })
    expect(pageViews()[1].params.page_location).toBe('http://localhost:3000/sobre')
  })

  it('mudança SÓ de query string ⇒ nenhum page_view a mais', async () => {
    await montarApp('/busca?q=a')
    await screen.findByText('pagina:busca')
    await waitFor(() => expect(pageViews()).toHaveLength(1), { timeout: 2000 })
    navegar('/busca?q=ab')
    navegar('/busca?q=abc')
    await new Promise(r => setTimeout(r, 700))
    expect(pageViews()).toHaveLength(1)
  })

  it('o checkout, fora do StoreLayout, também gera page_view', async () => {
    await montarApp('/checkout')
    await screen.findByText('pagina:checkout')
    await waitFor(() => expect(pageViews()).toHaveLength(1), { timeout: 2000 })
  })
})

describe('CookieNotice pelo App (AVS-01, AVS-07, AVS-08)', () => {
  const aviso = () => screen.queryByRole('region', { name: 'Aviso de cookies' })

  it('o App monta o aviso — na home ele aparece', async () => {
    await montarApp('/')
    await screen.findByText('pagina:home')
    expect(aviso()).not.toBeNull()
  })

  it('AVS-07: no checkout o aviso NÃO aparece — ele cobria o CTA de pagar no celular', async () => {
    await montarApp('/checkout')
    await screen.findByText('pagina:checkout')
    expect(aviso()).toBeNull()
  })

  it('AVS-07: no pagamento PIX (/pedido/:id/pagamento) o aviso também não aparece', async () => {
    await montarApp('/pedido/abc-123/pagamento')
    await screen.findByText('pagina:pagamento')
    expect(aviso()).toBeNull()
  })

  it('AVS-07: sair do checkout para a loja faz o aviso VOLTAR — a cliente ainda não respondeu', async () => {
    await montarApp('/checkout')
    await screen.findByText('pagina:checkout')
    expect(aviso()).toBeNull()
    navegar('/')
    await screen.findByText('pagina:home')
    expect(aviso()).not.toBeNull()
  })

  it('na prévia do painel o aviso não aparece', async () => {
    Object.defineProperty(window, 'parent', { value: { postMessage: vi.fn() }, configurable: true })
    await montarApp('/?preview=1')
    await screen.findByText('pagina:home')
    expect(aviso()).toBeNull()
  })
})

describe('o primeiro page_view chega ao gtag mesmo com a configuração lenta', () => {
  it('a configuração responde depois do page_view, e ele sai mesmo assim', async () => {
    let responder: (v: unknown) => void = () => {}
    // A leitura só responde quando o teste mandar — depois de o page_view já ter sido emitido.
    settingsRows.atraso = new Promise(r => {
      responder = r
    })
    await montarApp('/')
    await waitFor(() => expect(pageViews()).toHaveLength(1), { timeout: 2000 })
    // A ordem é a prova: o page_view já foi emitido e o gtag ainda nem existe.
    expect(scriptsDoGtag()).toHaveLength(0)
    expect((window as unknown as { dataLayer?: unknown[] }).dataLayer).toBeUndefined()
    responder(null)
    await new Promise(r => setTimeout(r, 300))
    await waitFor(() => {
      const fila = ((window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []).map(e =>
        Array.from(e as ArrayLike<unknown>),
      )
      expect(fila.some(a => a[0] === 'event' && a[1] === 'page_view')).toBe(true)
    })
  })
})
