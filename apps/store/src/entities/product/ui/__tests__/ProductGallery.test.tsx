import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ProductImage } from '@estrelinha/supabase/types'

// VAR-11 AC 2 e AC 3: a galeria recebe `ProductImage[]` (não `string[]`), usa o `alt` cadastrado
// quando existe, e produto sem imagem não deixa `undefined` chegar em `src` — um `<img>` sem `src`
// faz o browser requisitar o HTML da própria página como imagem.

// `ImageZoom` só existe no caminho desktop e depende de medida de layout, que jsdom não tem.
vi.mock('../ImageZoom', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

import ProductGallery from '../ProductGallery'

const image = (overrides: Partial<ProductImage> = {}): ProductImage => ({
  url: 'sailor.webp',
  alt: null,
  source: 'upload',
  ...overrides,
})

describe('ProductGallery — leitores de images (VAR-11)', () => {
  it('usa o alt cadastrado quando existe', () => {
    render(<ProductGallery images={[image({ alt: 'Botton da Lua Prateada' })]} name="Botton Sailor Moon" />)

    expect(screen.getAllByAltText('Botton da Lua Prateada').length).toBeGreaterThan(0)
  })

  it('sem alt cadastrado cai no genérico posicional, nunca em alt vazio', () => {
    render(<ProductGallery images={[image()]} name="Botton Sailor Moon" />)

    expect(screen.getAllByAltText('Botton Sailor Moon - imagem 1').length).toBeGreaterThan(0)
  })

  it('renderiza a url do objeto em src — não o objeto inteiro', () => {
    const { container } = render(
      <ProductGallery images={[image({ url: 'https://cdn.umaestrelinha/sailor.webp' })]} name="Botton" />,
    )

    // Miniatura tem `alt=""`, cujo role ARIA é `presentation` e não `img` — por isso a consulta é
    // pelo elemento, não pelo role: o que se afirma aqui é "todo `<img>` da árvore tem src bom".
    const sources = [...container.querySelectorAll('img')].map(img => img.getAttribute('src'))
    expect(sources.length).toBeGreaterThan(0)
    sources.forEach(src => expect(src).toBe('https://cdn.umaestrelinha/sailor.webp'))
  })

  it('produto sem imagem não renderiza nenhum <img> — zero src indefinido (AC 3)', () => {
    const { container } = render(<ProductGallery images={[]} name="Botton Sailor Moon" />)

    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(screen.getByText('Botton Sailor Moon sem imagem')).toBeInTheDocument()
  })

  it('com 2 imagens, cada miniatura aponta para a url da sua própria entrada', () => {
    const { container } = render(
      <ProductGallery
        images={[image({ url: 'a.webp' }), image({ url: 'b.webp', alt: 'costas do botton' })]}
        name="Botton"
      />,
    )

    const sources = [...container.querySelectorAll('img')].map(img => img.getAttribute('src'))
    expect(sources).toContain('a.webp')
    expect(sources).toContain('b.webp')
    // Nenhuma imagem sai sem src — é o modo de falha que a AC 3 descreve.
    sources.forEach(src => expect(src).toBeTruthy())
  })
})
