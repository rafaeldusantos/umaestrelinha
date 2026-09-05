import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

/**
 * `PRF-02` (AC 5-6) — a galeria pede a foto do tamanho do palco, e o original fica com a lupa.
 *
 * A página do produto entregava o original de 1024px em toda superfície: no palco de 390px do
 * celular, nas miniaturas de 56px e na tela cheia. Duas dessas três não precisam dele.
 */
const STORAGE =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pingente.webp'
const RENDER =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/render/image/public/product-images/pingente.webp'
const SEGUNDA =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/verso.webp'

const galeria = (urls: string[] = [STORAGE]) =>
  render(<ProductGallery images={urls.map(url => image({ url }))} name="Pingente com cinzas" />)

describe('ProductGallery — a foto do tamanho do palco (PRF-02 AC 5-6)', () => {
  it('o palco declara `srcset` com as três larguras', () => {
    const { container } = galeria()
    const palco = container.querySelector('img[sizes]')!

    expect(palco.getAttribute('srcset')).toBe(
      `${RENDER}?width=360&quality=75 360w, ` +
        `${RENDER}?width=480&quality=75 480w, ` +
        `${RENDER}?width=720&quality=75 720w`,
    )
  })

  it('o `sizes` do palco descreve metade da tela no desktop e a tela toda no celular', () => {
    const { container } = galeria()

    expect(container.querySelector('img[sizes]')!.getAttribute('sizes')).toBe(
      '(min-width: 768px) 50vw, 100vw',
    )
  })

  it('o palco é `eager` com `fetchpriority="high"` — é o LCP da página do produto', () => {
    const { container } = galeria()
    const palco = container.querySelector('img[sizes]')!

    expect(palco.getAttribute('loading')).toBe('eager')
    expect(palco.getAttribute('fetchpriority')).toBe('high')
  })

  it('o `src` do palco pede a rendição de 720, e não o original', () => {
    const { container } = galeria()

    expect(container.querySelector('img[sizes]')!.getAttribute('src')).toBe(
      `${RENDER}?width=720&quality=75`,
    )
  })

  it('as DUAS leituras do palco pedem a MESMA URL — uma foto baixada, não duas', () => {
    // As duas coexistem no DOM (`md:hidden` e `hidden md:block`), e imagem escondida por CSS
    // continua sendo baixada. Larguras diferentes fariam o celular baixar o palco duas vezes —
    // a economia da rendição viraria prejuízo, e nada acusaria.
    const { container } = galeria()
    const palcos = [...container.querySelectorAll('img')]
      .map(img => img.getAttribute('src'))
      .filter(src => src!.includes('width=720'))

    expect(palcos).toHaveLength(2)
    expect(new Set(palcos).size).toBe(1)
  })

  it('as miniaturas pedem rendição de 160, nunca o original', () => {
    // 56px no celular, 80px no desktop: 160 cobre os dois em DPR 2. O original ali eram 113 KB
    // por miniatura, multiplicados pelo número de fotos do produto.
    const { container } = galeria([STORAGE, SEGUNDA])
    const fita = [...container.querySelectorAll('button[aria-current] img')]

    expect(fita).toHaveLength(2)
    fita.forEach(img => {
      expect(img.getAttribute('src')).toContain('/render/image/public/')
      expect(img.getAttribute('src')).toContain('width=160&quality=75')
    })
    expect(fita.map(img => img.getAttribute('src'))).not.toContain(STORAGE)
  })

  it('a tela cheia continua no ORIGINAL — é onde a lupa existe', () => {
    galeria([STORAGE, SEGUNDA])
    fireEvent.click(screen.getByLabelText('Ver imagem em tela cheia'))

    const dialogo = document.querySelector('[role="dialog"]')!
    const fontes = [...dialogo.querySelectorAll('img')].map(img => img.getAttribute('src'))

    expect(fontes.length).toBeGreaterThan(0)
    expect(fontes).toContain(STORAGE)
    fontes.forEach(src => expect(src).not.toContain('/render/image/public/'))
  })

  it('imagem de host externo passa inalterada e sem `srcset`', () => {
    // Foto que veio de CDN de terceiro: reescrevê-la seria inventar um endpoint que não existe.
    const externa = 'https://cdn.parceiro.example/foto.jpg'
    const { container } = galeria([externa])
    const palco = container.querySelector('img[sizes]')!

    expect(palco.getAttribute('src')).toBe(externa)
    expect(palco.hasAttribute('srcset')).toBe(false)
  })

  it('a foto ativa segue a miniatura escolhida, e a rendição vai junto', () => {
    // Sem isto, trocar de foto poderia voltar ao original em silêncio — o palco mostraria a foto
    // certa e baixaria 1024px para mostrá-la.
    const { container } = galeria([STORAGE, SEGUNDA])
    fireEvent.click(screen.getByLabelText('Ver imagem 2 de 2'))

    // O palco do desktop (o `ImageZoom`) troca na hora; o do celular vive dentro de um
    // `AnimatePresence`, cuja transição de saída não termina em jsdom. Quem responde à pergunta
    // "a foto ativa mudou, e mudou por rendição?" é o primeiro, e é nele que se mede.
    const ativas = [...container.querySelectorAll('img')]
      .map(img => img.getAttribute('src'))
      .filter(src => src!.includes('width=720'))

    expect(ativas).toContain(
      SEGUNDA.replace('/object/public/', '/render/image/public/') + '?width=720&quality=75',
    )
    expect(ativas.every(src => src!.includes('/render/image/public/'))).toBe(true)
  })
})
