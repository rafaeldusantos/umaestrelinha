// Feature 61 · `ANL-01`/`ANL-02` — as três rotas da seção Google, provadas no `App` DE VERDADE.
//
// A fiação de rota não se prova com uma árvore de `<Routes>` escrita dentro do teste: ela passaria
// com o `App.tsx` errado. Aqui quem monta é o próprio `App` — com o `BrowserRouter` dele, o bloco do
// `RequireAdmin` e as rotas como estão no disco. Só o que não é rota é dublado: a guarda de
// autenticação (deixa passar), o casco do layout (vira `<Outlet/>`) e as leituras de dados.
//
// O que se prova:
// - `/admin/google` abre a seção **Analytics** (a rota-mãe renderiza, sem redirect);
// - `/admin/google/shopping` abre a seção **Shopping**;
// - `/admin/google-shopping` (o endereço da feature 30) **redireciona** para `/admin/google/shopping`,
//   com `replace` — o endereço antigo não fica no histórico;
// - slug inexistente cai em Analytics, sem tela vazia.
//
// A FORMA das rotas (irmãs auto-fechadas, um `</Route>` só) é de `rotasSobGuarda.test.ts` e
// `rotasDeConfiguracoes.test.ts`, que leem o arquivo do disco — este arquivo prova o comportamento.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

vi.mock('@estrelinha/auth', async () => {
  const { Fragment, createElement } = await import('react')
  return {
    RequireAdmin: ({ children }: { children: React.ReactNode }) =>
      createElement(Fragment, null, children),
  }
})

vi.mock('@/widgets/admin-layout/ui/AdminLayout', async () => {
  const { Outlet } = await import('react-router-dom')
  const { createElement } = await import('react')
  return { default: () => createElement(Outlet) }
})

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useAnalyticsSettings: () => ({
    enabled: true,
    measurement_id: 'G-SQL517XDQZ',
    production_host: 'umaestrelinha.com.br',
  }),
  useGoogleShoppingSettings: () => ({
    enabled: false,
    ever_enabled: false,
    merchant_id: '685367464',
    default_product_category: 'Apparel & Accessories > Jewelry',
    last_fetched_at: null,
  }),
  useUpdateSettings: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStoreSettings: () => ({ data: undefined, isLoading: false }),
}))

vi.mock('@/features/google-analytics/model/useAnalyticsSecret', () => ({
  ANALYTICS_SECRET_STATUS_KEY: ['google-analytics', 'secret-status'],
  useAnalyticsSecretStatus: () => ({
    isLoading: false,
    isError: false,
    isSuccess: true,
    data: { secret_configured: true, secret_updated_at: '2026-10-05T15:00:00.000Z' },
    refetch: vi.fn(),
  }),
  useSaveAnalyticsSecret: () => ({ save: vi.fn(), saving: false }),
}))

vi.mock('@/features/google-analytics/model/useLastPurchaseSend', () => ({
  useLastPurchaseSend: () => ({
    isLoading: false,
    isError: false,
    data: { last: null, declined: 0, failed: 0 },
  }),
}))

vi.mock('@/features/google-shopping/model/useFeedInventory', () => ({
  useFeedInventory: () => ({ data: undefined, isLoading: true, isError: false }),
}))

import App from '../App'

const abrir = (caminho: string) => {
  window.history.replaceState(null, '', caminho)
  return render(<App />)
}

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('a seção Google, montada pelo App de verdade', () => {
  it('`/admin/google` abre a seção Analytics, sem trocar o endereço', async () => {
    abrir('/admin/google')
    expect(await screen.findByTestId('google-panel-analytics')).toBeTruthy()
    expect(screen.queryByTestId('google-panel-shopping')).toBeNull()
    expect(window.location.pathname).toBe('/admin/google')
  })

  it('`/admin/google/shopping` abre a seção Shopping', async () => {
    abrir('/admin/google/shopping')
    expect(await screen.findByTestId('google-panel-shopping')).toBeTruthy()
    expect(screen.queryByTestId('google-panel-analytics')).toBeNull()
  })

  it('`/admin/google-shopping` REDIRECIONA para `/admin/google/shopping` (ANL-02)', async () => {
    abrir('/admin/google-shopping')
    expect(await screen.findByTestId('google-panel-shopping')).toBeTruthy()
    await waitFor(() => expect(window.location.pathname).toBe('/admin/google/shopping'))
  })

  it('o redirect usa `replace` — o endereço antigo não fica no histórico', async () => {
    const antes = window.history.length
    abrir('/admin/google-shopping')
    await waitFor(() => expect(window.location.pathname).toBe('/admin/google/shopping'))
    // `replace` troca a entrada corrente; `push` somaria uma.
    expect(window.history.length).toBe(antes)
  })

  it('slug inexistente cai em Analytics, nunca numa tela vazia', async () => {
    abrir('/admin/google/xpto')
    expect(await screen.findByTestId('google-panel-analytics')).toBeTruthy()
  })
})

describe('o redirect está escrito com `replace` no fonte', () => {
  it('a rota antiga é um `<Navigate … replace />` para a seção nova', () => {
    // O caso do histórico acima depende do jsdom contar entradas como um navegador; este lê o
    // fonte, e é o que continua valendo se essa contagem mudar.
    const fonte = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')
    expect(fonte).toMatch(
      /<Route\s+path="\/admin\/google-shopping"\s+element=\{<Navigate\s+to="\/admin\/google\/shopping"\s+replace\s*\/>\}\s*\/>/,
    )
  })
})
