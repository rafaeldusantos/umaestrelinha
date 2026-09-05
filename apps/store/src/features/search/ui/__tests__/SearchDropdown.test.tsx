import { beforeEach, describe, expect, it, vi } from 'vitest'
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

/**
 * O dublê **registra o `enabled` recebido**, e não só devolve dados.
 *
 * Antes ele era `() => ({ data: [...] })`, e um dublê que ignora as opções não consegue provar
 * `PRF-09`: a consulta seguiria saindo em toda rota e nenhum teste notaria. É a mesma família do
 * que o Verifier encontrou na `CategoryPage` — comportamento sem quem o prove.
 */
const chamadasDeCatalogo: ({ enabled?: boolean } | undefined)[] = []

vi.mock('@/entities/product/api/useProducts', () => ({
  useAllProducts: (options?: { enabled?: boolean }) => {
    chamadasDeCatalogo.push(options)
    return {
      data: [
        product('Pingente com cinzas', { image_url: STORAGE }),
        product('Pingente sem foto'),
      ],
    }
  },
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

/**
 * `PRF-09` — **o catálogo não é baixado por quem só abriu a página.**
 *
 * Este componente vive no `Header`, que está no `StoreLayout`, que está em toda rota. Sem
 * interruptor, abrir qualquer página baixava 680 produtos. O `SearchOverlay` — o irmão de celular —
 * já usava `enabled: open` desde sempre; a divergência entre os dois é que passou despercebida, e
 * foi medida na auditoria que abriu a feature 38.
 */
describe('o catálogo só é buscado quando alguém digita (PRF-09)', () => {
  beforeEach(() => {
    chamadasDeCatalogo.length = 0
  })

  it('na montagem, a consulta nasce DESLIGADA', () => {
    renderDropdown()

    expect(chamadasDeCatalogo.length).toBeGreaterThan(0)
    expect(chamadasDeCatalogo[0]).toEqual({ enabled: false })
  })

  it('abrir o campo ainda não liga — foco não é intenção de buscar', () => {
    renderDropdown()
    fireEvent.focus(screen.getByPlaceholderText('O que você está procurando?'))

    expect(chamadasDeCatalogo.every((c) => c?.enabled === false)).toBe(true)
  })

  it('a primeira letra digitada LIGA a consulta', () => {
    renderDropdown()
    type('c')

    expect(chamadasDeCatalogo[chamadasDeCatalogo.length - 1]).toEqual({ enabled: true })
  })

  it('apagar o que foi digitado NÃO desliga — o cache já respondeu', () => {
    renderDropdown()
    type('cinzas')
    type('')

    expect(chamadasDeCatalogo[chamadasDeCatalogo.length - 1]).toEqual({ enabled: true })
  })

  it('espaço em branco não conta como digitar', () => {
    renderDropdown()
    type('   ')

    expect(chamadasDeCatalogo.every((c) => c?.enabled === false)).toBe(true)
  })

  it('a opção é sempre passada — `undefined` faria o hook cair no padrão ligado', () => {
    renderDropdown()

    expect(chamadasDeCatalogo.every((c) => c !== undefined)).toBe(true)
  })
})
