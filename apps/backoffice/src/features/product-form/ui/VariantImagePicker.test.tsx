// Feature 81 — a imagem da variação na própria linha (OPV-11..15, OPV-26, OPV-28).
//
// Só o envio é dublado (`uploadProductImages`); `uploadFailureMessage` é o real, porque a frase que
// a Adri lê na falha é exatamente o que OPV-15 promete.

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductImage } from '@estrelinha/supabase/types'

const { uploadMock } = vi.hoisted(() => ({ uploadMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { storage: { from: () => ({ upload: vi.fn(), remove: vi.fn() }) } },
}))
vi.mock('../lib/uploadProductImage', async importOriginal => ({
  ...(await importOriginal<typeof import('../lib/uploadProductImage')>()),
  uploadProductImages: uploadMock,
}))

import VariantImagePicker from './VariantImagePicker'

const img = (n: number): ProductImage => ({ url: `https://cdn/foto-${n}.webp`, alt: null, source: 'upload' })
const IMAGES = [img(1), img(2), img(3)]

const fileOf = (name: string) => new File(['x'], name, { type: 'image/png' })

const setup = (over: Partial<React.ComponentProps<typeof VariantImagePicker>> = {}) => {
  const spies = { onSelect: vi.fn(), onImagesAdded: vi.fn(), onUploadingChange: vi.fn() }
  render(
    <VariantImagePicker
      label="Tamanho: 4,5 cm"
      imageUrl={null}
      images={IMAGES}
      {...spies}
      {...over}
    />,
  )
  return spies
}

const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Imagem de Tamanho: 4,5 cm' }))
const modal = () => screen.getByRole('dialog')
const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)

beforeEach(() => {
  uploadMock.mockReset()
})

describe('VariantImagePicker — o botão na linha (OPV-11, OPV-28)', () => {
  it('mede 48 × 48 (`h-12 w-12`, por token exato) e se chama "Imagem de <variação>"', () => {
    setup()
    const botao = screen.getByRole('button', { name: 'Imagem de Tamanho: 4,5 cm' })
    expect(tokens(botao)).toEqual(expect.arrayContaining(['h-12', 'w-12']))
  })

  it('com imagem escolhida, mostra a miniatura dela', () => {
    setup({ imageUrl: img(2).url })
    const botao = screen.getByRole('button', { name: 'Imagem de Tamanho: 4,5 cm' })
    expect(botao.querySelector('img')).toHaveAttribute('src', img(2).url)
  })

  it('com uma URL que não está na galeria, mostra o marcador vazio e marca "Usar a principal" (OPV-27, G10)', () => {
    // A segunda camada de OPV-27: mesmo que a linha ainda carregue a URL de uma foto removida, o
    // picker não desenha imagem quebrada nem finge que ela está escolhida.
    setup({ imageUrl: 'https://cdn/removida.webp' })
    const botao = screen.getByRole('button', { name: 'Imagem de Tamanho: 4,5 cm' })
    expect(botao.querySelector('img')).toBeNull()
    expect(tokens(botao)).toContain('border-dashed')

    abrir()
    expect(within(modal()).getByRole('button', { name: 'Usar a principal' })).toHaveAttribute('aria-pressed', 'true')
    for (const n of [1, 2, 3]) {
      expect(within(modal()).getByRole('button', { name: `Imagem ${n}` })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('usando a principal, mostra o marcador vazio e nenhuma miniatura', () => {
    setup({ imageUrl: null })
    const botao = screen.getByRole('button', { name: 'Imagem de Tamanho: 4,5 cm' })
    expect(botao.querySelector('img')).toBeNull()
    expect(botao.querySelector('svg')).not.toBeNull()
    expect(tokens(botao)).toContain('border-dashed')
  })
})

describe('VariantImagePicker — o modal (OPV-12, OPV-13)', () => {
  it('lista TODAS as imagens do produto, na ordem da galeria, mais "Usar a principal"', () => {
    setup()
    abrir()

    const botoes = within(modal())
      .getAllByRole('button', { pressed: undefined })
      .filter(b => b.hasAttribute('aria-pressed'))
    expect(botoes.map(b => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
      'Usar a principal',
      'Imagem 1',
      'Imagem 2',
      'Imagem 3',
    ])
    expect([...modal().querySelectorAll('img')].map(i => i.getAttribute('src'))).toEqual(
      IMAGES.map(i => i.url),
    )
  })

  it('a imagem atual vem marcada', () => {
    setup({ imageUrl: img(3).url })
    abrir()
    expect(within(modal()).getByRole('button', { name: 'Imagem 3' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(modal()).getByRole('button', { name: 'Imagem 1' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(modal()).getByRole('button', { name: 'Usar a principal' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('sem imagem própria, "Usar a principal" vem marcada', () => {
    setup({ imageUrl: null })
    abrir()
    expect(within(modal()).getByRole('button', { name: 'Usar a principal' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('escolher uma imagem entrega a URL dela e FECHA o modal', () => {
    const props = setup()
    abrir()

    fireEvent.click(within(modal()).getByRole('button', { name: 'Imagem 2' }))

    expect(props.onSelect).toHaveBeenCalledTimes(1)
    expect(props.onSelect).toHaveBeenCalledWith(img(2).url)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('"Usar a principal" entrega `null` e fecha', () => {
    const props = setup({ imageUrl: img(1).url })
    abrir()

    fireEvent.click(within(modal()).getByRole('button', { name: 'Usar a principal' }))

    expect(props.onSelect).toHaveBeenCalledWith(null)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('os itens do modal têm alvo ≥ 44px (`min-h-11 min-w-11`) e "Adicionar imagens" é `h-11` (OPV-28)', () => {
    setup()
    abrir()
    for (const nome of ['Usar a principal', 'Imagem 1']) {
      expect(tokens(within(modal()).getByRole('button', { name: nome }))).toEqual(
        expect.arrayContaining(['min-h-11', 'min-w-11']),
      )
    }
    expect(tokens(within(modal()).getByRole('button', { name: 'Adicionar imagens' }))).toContain('h-11')
  })
})

describe('VariantImagePicker — o modal cabe na tela (QA da 81)', () => {
  // BUG-20261026-modal-de-imagem-passa-da-tela: com as 28 imagens do maior produto do catálogo
  // (ou com a fonte a 200 %), o modal media mais que a viewport e, centrado por `translate`, perdia
  // o topo — o título e "Usar a principal" ficavam fora da tela e sem rolagem. A régua é o token
  // exato; a medida é a prova em navegador.
  it('tem altura máxima da viewport e rola por dentro', () => {
    setup()
    abrir()
    expect(tokens(modal())).toEqual(
      expect.arrayContaining(['max-h-[calc(100dvh-2rem)]', 'overflow-y-auto']),
    )
  })
})

describe('VariantImagePicker — produto sem imagens (OPV-26)', () => {
  it('mostra só "Usar a principal", "Adicionar imagens" e a frase', () => {
    setup({ images: [] })
    abrir()

    expect(within(modal()).getByText('Este produto ainda não tem imagens.')).toBeInTheDocument()
    expect(within(modal()).queryByRole('button', { name: /^Imagem \d/ })).toBeNull()
    expect(within(modal()).getByRole('button', { name: 'Usar a principal' })).toBeInTheDocument()
    expect(within(modal()).getByRole('button', { name: 'Adicionar imagens' })).toBeInTheDocument()
  })

  it('com imagens, a frase NÃO aparece', () => {
    setup()
    abrir()
    expect(within(modal()).queryByText('Este produto ainda não tem imagens.')).toBeNull()
  })
})

describe('VariantImagePicker — enviar pelo modal (OPV-14, OPV-15)', () => {
  const enviar = async (files: File[]) => {
    const input = screen.getByTestId('variant-image-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files } })
    })
  }

  it('o campo de arquivo aceita várias imagens', () => {
    setup()
    abrir()
    const input = screen.getByTestId('variant-image-input')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('multiple')
    expect(input).toHaveAttribute('accept', 'image/*')
  })

  it('"Adicionar imagens" abre o seletor de arquivo', () => {
    setup()
    abrir()
    const input = screen.getByTestId('variant-image-input') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    fireEvent.click(within(modal()).getByRole('button', { name: 'Adicionar imagens' }))
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('sucesso: usa o motor da galeria, as fotos entram como `upload`, a PRIMEIRA fica escolhida e o modal fecha', async () => {
    uploadMock.mockResolvedValue({ uploaded: ['https://cdn/nova-a.webp', 'https://cdn/nova-b.webp'], failed: [] })
    const props = setup()
    abrir()
    const a = fileOf('a.png')
    const b = fileOf('b.png')

    await enviar([a, b])

    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(uploadMock.mock.calls[0][0]).toEqual([a, b])
    expect(props.onImagesAdded).toHaveBeenCalledWith([
      { url: 'https://cdn/nova-a.webp', alt: null, source: 'upload' },
      { url: 'https://cdn/nova-b.webp', alt: null, source: 'upload' },
    ])
    expect(props.onSelect).toHaveBeenCalledWith('https://cdn/nova-a.webp')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('`onUploadingChange` vai a true durante o envio e volta a false no fim; o botão diz "Enviando…"', async () => {
    let resolver: (v: { uploaded: string[]; failed: never[] }) => void = () => {}
    uploadMock.mockReturnValue(new Promise(r => (resolver = r)))
    const props = setup()
    abrir()

    await enviar([fileOf('a.png')])

    expect(props.onUploadingChange).toHaveBeenLastCalledWith(true)
    expect(within(modal()).getByRole('button', { name: 'Enviando…' })).toBeDisabled()
    expect(props.onImagesAdded).not.toHaveBeenCalled()

    await act(async () => resolver({ uploaded: ['https://cdn/x.webp'], failed: [] }))

    expect(props.onUploadingChange.mock.calls.map(c => c[0])).toEqual([true, false])
  })

  it('falha: aparece a mensagem de `uploadFailureMessage`, nada é escolhido nem acrescentado, e o modal fica', async () => {
    uploadMock.mockResolvedValue({ uploaded: [], failed: [{ file: 'grande.png', reason: 'upload' }] })
    const props = setup()
    abrir()

    await enviar([fileOf('grande.png')])

    expect(within(modal()).getByRole('alert').textContent).toBe('grande.png: falha ao enviar')
    expect(props.onImagesAdded).not.toHaveBeenCalled()
    expect(props.onSelect).not.toHaveBeenCalled()
    expect(props.onUploadingChange.mock.calls.map(c => c[0])).toEqual([true, false])
  })

  it('falha de formato usa a frase do motor', async () => {
    uploadMock.mockResolvedValue({ uploaded: [], failed: [{ file: 'doc.pdf', reason: 'type' }] })
    setup()
    abrir()
    await enviar([fileOf('doc.pdf')])
    expect(within(modal()).getByRole('alert').textContent).toBe(
      'doc.pdf: formato não aceito — use PNG, JPG ou WebP',
    )
  })
})
