// Feature 72, conserto r1 da verificação da Fase 6 — a corrida P1 no PAINEL, sobre o `AuthProvider`
// REAL, a `AdminLoginPage` real e o `RequireAdmin` real.
//
// A lojista entra; a consulta do papel fica em voo; a sessão cai (outra aba saiu, o token foi
// revogado); a resposta do papel chega depois. Antes do conserto em `packages/auth` a resposta velha
// promovia a admin a conta que já tinha saído, e o efeito da página a levava ao painel. Agora ela é
// descartada pela geração da resolução.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

type Sessao = { user: { id: string; email: string } } | null
type Ouvinte = (evento: string, sessao: Sessao) => void

/** Dublê mínimo do client: a sessão, os ouvintes, e a resposta do papel SEGURADA até `soltar`. */
const dub = vi.hoisted(() => {
  const estado = {
    sessao: null as Sessao,
    ouvintes: new Set<Ouvinte>(),
    soltarPapel: () => {},
    papel: Promise.resolve() as Promise<void>,
  }
  const emitir = (evento: string) => {
    for (const o of estado.ouvintes) o(evento, estado.sessao)
  }
  const client = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: estado.sessao }, error: null }),
      onAuthStateChange: (cb: Ouvinte) => {
        estado.ouvintes.add(cb)
        return { data: { subscription: { unsubscribe: () => estado.ouvintes.delete(cb) } } }
      },
      signInWithPassword: async ({ email }: { email: string }) => {
        estado.sessao = { user: { id: `id-${email}`, email } }
        emitir('SIGNED_IN')
        return { data: { session: estado.sessao }, error: null }
      },
      signOut: async () => {
        estado.sessao = null
        emitir('SIGNED_OUT')
        return { error: null }
      },
    },
    from: (tabela: string) => {
      const cadeia = {
        select: () => cadeia,
        eq: () => cadeia,
        maybeSingle: async () => {
          if (tabela === 'user_roles') {
            await estado.papel
            return { data: { role: 'admin' }, error: null }
          }
          return { data: null, error: null }
        },
      }
      return cadeia
    },
  }
  return { estado, emitir, client }
})

vi.mock('@estrelinha/supabase/client', () => ({ supabase: dub.client }))

import { AuthProvider, RequireAdmin } from '@estrelinha/auth'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'

beforeEach(() => {
  dub.estado.sessao = null
  dub.estado.ouvintes.clear()
  dub.estado.papel = new Promise<void>((r) => (dub.estado.soltarPapel = r))
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/admin/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin loginPath="/admin/login">
                <h1>Painel da loja</h1>
              </RequireAdmin>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )

const entrar = async () => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'admin@umaestrelinha.dev' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'admin123' } })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Entrar/ }))
    await vi.advanceTimersByTimeAsync(10)
  })
}

describe('a resposta do papel depois de a sessão cair (P1, painel)', () => {
  it('é descartada: a conta que saiu NÃO entra no painel', async () => {
    montar()
    await andar(10)
    await entrar()
    // O papel está em voo. A sessão cai.
    dub.estado.sessao = null
    dub.emitir('SIGNED_OUT')
    await andar(10)
    dub.estado.soltarPapel()
    await andar(10)
    expect(screen.queryByRole('heading', { name: 'Painel da loja' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })

  it('VIZINHA — sem a sessão cair, a mesma resposta leva ao painel', async () => {
    montar()
    await andar(10)
    await entrar()
    dub.estado.soltarPapel()
    await andar(10)
    expect(screen.getByRole('heading', { name: 'Painel da loja' })).toBeInTheDocument()
  })
})
