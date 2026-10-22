// Feature 72, conserto r2 da verificação da Fase 6 (a lacuna nº 2) — a `AccountPage` REAL, sob o
// `AuthProvider` REAL, sobre o supabase-js REAL (`src/test/clientReal.ts`).
//
// A loja desenha "Carregando..." no lugar da página inteira enquanto `loading` é verdadeiro
// (`AccountPage.tsx`, e `CheckoutPage.tsx` do mesmo jeito). Desde a `72` o papel que falhou fica
// `unknown` e é reperguntado no próximo evento do mesmo usuário — e o supabase-js emite `SIGNED_IN` a
// cada volta da aba. Se a repergunta piscasse `loading`, a página se desmontaria e levaria junto o que
// a cliente estava preenchendo (no checkout, o Brick do cartão). A regra: recarregar o papel ou o
// cadastro de quem já está presente nunca mexe em `loading`. Relógio falso, sem rede.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@estrelinha/auth'
import { real } from '@/test/clientReal'
import AccountPage from '../AccountPage'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

// Só a fronteira de dados da página é dublada (o molde de `AccountPage.test.tsx`); o contexto de auth
// é o de verdade.
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({ useGeneralSettings: () => ({ whatsapp: '' }) }))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: (s: { open: () => void }) => unknown) => sel({ open: () => {} }) }))
vi.mock('@/entities/address/api/useDefaultAddress', () => ({
  DEFAULT_ADDRESS_KEY: 'default-address',
  useDefaultAddress: () => ({ data: null, isLoading: false }),
}))
vi.mock('@/entities/order/api/useOrders', () => ({
  useOrdersByCustomerId: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
}))

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/conta/dados']}>
        <AuthProvider>
          <AccountPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  real.atual?.client.auth.stopAutoRefresh()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Abre a edição de "Dados pessoais" e digita um nome que ainda não foi salvo. */
const comecarAEditar = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Nome completo' }), { target: { value: 'Adri Muniz da Silva' } })
}

describe('a conta continua montada através da volta da aba (SIGNED_IN do mesmo usuário)', () => {
  it('o papel falhou (`unknown`): a volta da aba repergunta, e a edição em curso continua na tela, sem "Carregando..."', async () => {
    const r = real.criar({ sessao: 'valida', papel: 'falha', cadastro: 'ok' })
    montar()
    await andar(9000)
    comecarAEditar()
    const campo = screen.getByRole('textbox', { name: 'Nome completo' })
    const papelAntes = r.quantos('/rest/v1/user_roles')

    r.estado.atrasoMs = 500 // a repergunta demora: é a janela em que o defeito desmontava a página
    r.voltarAba()
    for (let t = 0; t < 600; t += 50) {
      await andar(50)
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    }

    expect(r.eventos).toContain('SIGNED_IN:com')
    expect(r.quantos('/rest/v1/user_roles')).toBeGreaterThan(papelAntes) // a repergunta aconteceu
    // O MESMO nó: a página não foi desmontada e remontada — e o que foi digitado ficou.
    expect(screen.getByRole('textbox', { name: 'Nome completo' })).toBe(campo)
    expect(campo).toHaveValue('Adri Muniz da Silva')
  })

  it('VIZINHA — a sessão cai de verdade (SIGNED_OUT): aí a página sai, e a edição vai junto', async () => {
    const r = real.criar({ sessao: 'valida', papel: 'falha', cadastro: 'ok' })
    montar()
    await andar(9000)
    comecarAEditar()
    await act(async () => {
      await r.client.auth.signOut()
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(screen.queryByRole('textbox', { name: 'Nome completo' })).not.toBeInTheDocument()
  })
})
