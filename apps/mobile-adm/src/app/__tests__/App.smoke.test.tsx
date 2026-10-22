// Feature 72, T04 (`MAF-03`, parte): o app existe — monta sem sessão e chega ao Login.
//
// Desde a T08 o `AuthProvider` mora DENTRO do `App` (abaixo da checagem de rede), então o teste monta
// só `<App />` — exatamente o que o `main.tsx` monta.
import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

beforeEach(() => {
  fake.reset()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => vi.useRealTimers())

describe('o app do ateliê monta', () => {
  it('sem sessão, a raiz cai no Login', async () => {
    await montarApp('/')
    expect(await screen.findByRole('heading', { name: 'Entrar no ateliê' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(fake.leiturasDeDado()).toEqual([])
  })
})
