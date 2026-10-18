// Feature 66 — a seção "Filtros nesta categoria" sozinha (os estados que a página não exercita).

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ groups: [] as unknown[] }))
vi.mock('@/entities/filter', () => ({
  useAdminFilterCatalog: () => ({ groups: h.groups, loading: false, error: null }),
  useCategoryHiddenGroups: () => ({ hidden: new Set<string>(), loading: false, error: null, setGroupVisible: vi.fn() }),
}))

import CategoryFilterGroups from '../CategoryFilterGroups'

const montar = () =>
  render(
    <MemoryRouter>
      <CategoryFilterGroups categoryId="c1" />
    </MemoryRouter>,
  )

beforeEach(() => {
  h.groups = []
})

describe('CategoryFilterGroups', () => {
  it('sem grupo nenhum, diz isso e leva para /admin/filtros', () => {
    montar()
    expect(screen.getByText(/Nenhum grupo de filtro criado ainda\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar os filtros da loja' })).toHaveAttribute('href', '/admin/filtros')
  })

  it('grupo sem linha de "escondido" aparece LIGADO (FLT-35, FLT-37)', () => {
    h.groups = [{ id: 'novo', name: 'Para quem', is_active: true, values: [] }]
    montar()
    expect(screen.getByRole('switch', { name: 'Mostrar “Para quem” nesta categoria' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Aparece nesta categoria')).toBeInTheDocument()
  })

  it('grupo desligado na loja diz isso', () => {
    h.groups = [{ id: 'x', name: 'Ocasião', is_active: false, values: [] }]
    montar()
    expect(screen.getByText('Desligado na loja')).toBeInTheDocument()
  })
})
