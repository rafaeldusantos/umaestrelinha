import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'

/**
 * `PRF-02` (AC 5) — a sugestão do dropdown pede rendição.
 *
 * A vaga tem 40px e o dropdown desenha até cinco sugestões **a cada tecla**. Servir o original de
 * 1024px ali fazia a busca do desktop baixar meio catálogo em fotos enquanto a cliente digitava.
 *
 * O que se afirma é o **DOM renderizado**: o `src` que o navegador vai buscar.
 */

/** A forma real de um objeto público do Storage deste projeto — a única que vira rendição. */
const STORAGE =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pingente.webp'

const product = (name: string, over: Partial<Product> = {}): Product =>
  ({
    id: name,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    price: 149,
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'ignore',
    category_links: [],
    stock_total: 0,
    tags: [],
    ...over,
  }) as Product

vi.mock('@/entities/product/api/useProducts', () => ({
  useAllProducts: () => ({
    data: [
      product('Pingente com cinzas', { image_url: STORAGE }),
      product('Pingente sem foto'),
    ],
  }),
}))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))

import SearchDropdown from '../SearchDropdown'

const renderDropdown = () =>
  render(
    <MemoryRouter>
      <SearchDropdown />
    </MemoryRouter>,
  )

const type = (value: string) =>
  fireEvent.change(screen.getByPlaceholderText('O que você está procurando?'), {
    target: { value },
  })

describe('SearchDropdown — a sugestão pede o tamanho da vaga (PRF-02 AC 5)', () => {
  it('a vaga de 40px busca a rendição, e não o objeto original de 1024px', () => {
    renderDropdown()
    type('cinzas')

    const foto = screen.getByRole('link', { name: /Pingente com cinzas/ }).querySelector('img')
    expect(foto?.getAttribute('src')).toContain('/render/image/public/')
    expect(foto?.getAttribute('src')).toContain('width=160')
    expect(foto?.getAttribute('src')).toContain('quality=75')
    expect(foto?.getAttribute('src')).not.toContain('/object/public/')
  })

  it('produto sem foto não ganha URL inventada — a entrada vazia volta vazia', () => {
    renderDropdown()
    type('sem foto')

    const foto = screen.getByRole('link', { name: /Pingente sem foto/ }).querySelector('img')
    expect(foto).toHaveAttribute('src', '')
  })
})
