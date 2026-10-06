import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Feature 61 · T18 — `search` (`EVT-09`) sai no ENVIO, nunca a cada tecla.
 *
 * Medido nos dois gestos de envio que a cliente tem: o formulário do cabeçalho (`SearchDropdown`) e
 * o Enter no campo da página de busca — que reescreve `?q=` a cada tecla, e por isso é a superfície
 * onde "digitar = buscar" mais tentaria alguém.
 */
const { trackSpy } = vi.hoisted(() => ({ trackSpy: vi.fn() }))

vi.mock('@/shared/lib/analytics', async importOriginal => {
  const real = await importOriginal<typeof import('@/shared/lib/analytics')>()
  return { ...real, track: (e: unknown) => trackSpy(e) }
})
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) },
}))
vi.mock('@/entities/product/api/useProducts', () => ({ useAllProducts: () => ({ data: [] }) }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))

import SearchDropdown from '@/features/search/ui/SearchDropdown'
import SearchPage from '../SearchPage'

const buscas = () =>
  trackSpy.mock.calls.map(c => c[0]).filter(e => e && (e as { name: string }).name === 'search') as {
    params: { search_term: string }
  }[]

beforeEach(() => trackSpy.mockClear())

describe('SearchDropdown', () => {
  const montar = () =>
    render(
      <MemoryRouter>
        <SearchDropdown />
      </MemoryRouter>,
    )
  const campo = () => screen.getByPlaceholderText('O que você está procurando?')

  it('digitar sem enviar ⇒ zero search', () => {
    montar()
    fireEvent.change(campo(), { target: { value: 'pin' } })
    fireEvent.change(campo(), { target: { value: 'pingente' } })
    expect(buscas()).toHaveLength(0)
  })

  it('enviar ⇒ UM search com o termo aparado', () => {
    montar()
    fireEvent.change(campo(), { target: { value: '  pingente de cinzas ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(buscas()).toHaveLength(1)
    expect(buscas()[0].params.search_term).toBe('pingente de cinzas')
  })
})

describe('SearchPage', () => {
  const montar = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/busca']}>
          <Routes>
            <Route path="/busca" element={<SearchPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  const campo = () => screen.getByRole('textbox', { name: 'Buscar joias' })

  it('digitar (que reescreve a URL a cada tecla) ⇒ zero search', () => {
    montar()
    fireEvent.change(campo(), { target: { value: 'co' } })
    fireEvent.change(campo(), { target: { value: 'colar' } })
    expect(buscas()).toHaveLength(0)
  })

  it('Enter ⇒ UM search', () => {
    montar()
    fireEvent.change(campo(), { target: { value: 'colar' } })
    fireEvent.keyDown(campo(), { key: 'Enter' })
    expect(buscas()).toHaveLength(1)
    expect(buscas()[0].params.search_term).toBe('colar')
  })
})
