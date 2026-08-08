// PMD-01, PMD-03, PMD-04 — a aba Mídia.
//
// A prova é de comportamento observável: estados do alt-text, selo de origem, progresso por
// arquivo, colar, reordenar. A validação de tipo/tamanho tem teste próprio em
// `lib/uploadProductImage.test.ts`; aqui só se prova que a galeria REPORTA o que a lib devolve.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductImage } from '@estrelinha/supabase/types'

const { uploadMock, toastMock } = vi.hoisted(() => ({ uploadMock: vi.fn(), toastMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { storage: { from: () => ({ upload: vi.fn(), remove: vi.fn() }) } },
}))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: toastMock }))
// Só o envio é dublado. `uploadFailureMessage` continua sendo o real — a mensagem que o admin lê é
// justamente o que esta task promete.
vi.mock('../lib/uploadProductImage', async importOriginal => ({
  ...(await importOriginal<typeof import('../lib/uploadProductImage')>()),
  uploadProductImages: uploadMock,
}))

import ImageGallery from './ImageGallery'

const image = (over: Partial<ProductImage> = {}): ProductImage => ({
  url: 'https://cdn/foto-1.webp',
  alt: null,
  source: 'upload',
  ...over,
})

const fileOf = (name: string, type = 'image/png', size = 2 * 1024 * 1024): File => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const setup = (over: Partial<React.ComponentProps<typeof ImageGallery>> = {}) => {
  const onChange = vi.fn()
  const props = {
    images: [] as ProductImage[],
    onChange,
    productName: 'Botton Sailor Moon',
    ...over,
  }
  render(<ImageGallery {...props} />)
  return { onChange }
}

/** Cola: o ouvinte é de `window`, e jsdom não constrói `ClipboardEvent` com arquivos. */
const pasteFiles = async (files: File[]) => {
  const event = new Event('paste')
  Object.defineProperty(event, 'clipboardData', { value: { files } })
  await act(async () => {
    window.dispatchEvent(event)
  })
}

beforeEach(() => {
  toastMock.mockReset()
  uploadMock.mockReset().mockImplementation(
    async (
      files: File[],
      onProgress?: (p: { file: string; size: number; status: string; reason?: string }) => void,
    ) => {
      for (const file of files) {
        onProgress?.({ file: file.name, size: file.size, status: 'uploading' })
        onProgress?.({ file: file.name, size: file.size, status: 'done' })
      }
      return { uploaded: files.map(f => `https://cdn/${f.name}.webp`), failed: [] }
    },
  )
})

describe('ImageGallery — copy da dropzone (PMD-02 AC 6)', () => {
  it('diz exatamente o que o código faz, palavra por palavra', () => {
    setup()

    const dropzone = screen.getByLabelText('Enviar imagens')
    // A AC 6 fixa a frase inteira, não só os números — é o texto que a spec cita.
    expect(dropzone).toHaveTextContent(
      'PNG, JPG ou WebP até 8 MB · convertidas para WebP 1600 px',
    )
    // A copy antiga mentia: dizia 5 MB e o código não validava tamanho nenhum.
    expect(dropzone).not.toHaveTextContent('5MB')
  })
})

describe('ImageGallery — tile de 196 px (PMD-01 AC 1)', () => {
  it('a grade usa a medida do artboard', () => {
    setup({ images: [image()] })

    const grade = screen.getAllByTestId('image-tile')[0].parentElement
    expect(grade?.className).toContain('minmax(196px,1fr)')
  })
})

describe('ImageGallery — alt-text (PMD-01 AC 1-2)', () => {
  it('alt vazio mostra `faltando` com a ação `Gerar`', () => {
    setup({ images: [image()] })

    expect(screen.getByText('faltando')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gerar$/ })).toBeEnabled()
  })

  it('`Gerar` grava o alt do template e marca `gerado automaticamente`', async () => {
    const { onChange } = setup({ images: [image()], productName: 'Botton Sailor Moon' })

    fireEvent.click(screen.getByRole('button', { name: /Gerar$/ }))

    expect(onChange).toHaveBeenCalledWith([
      { url: 'https://cdn/foto-1.webp', alt: 'Botton Sailor Moon', source: 'upload' },
    ])
  })

  it('imagem com alt preenchido pela ação exibe `gerado automaticamente`, não `faltando`', () => {
    // O componente é controlado: a página devolve o alt gravado. Re-renderizar com o alt do
    // `onChange` é exatamente o que acontece em produção.
    const { rerender } = renderControlled([image()], 'Botton Sailor Moon')

    fireEvent.click(screen.getByRole('button', { name: /Gerar$/ }))
    rerender()

    expect(screen.getByText('gerado automaticamente')).toBeInTheDocument()
    expect(screen.queryByText('faltando')).not.toBeInTheDocument()
  })

  it('digitar por cima do alt gerado apaga a marca de automático', () => {
    const { rerender } = renderControlled([image()], 'Botton Sailor Moon')

    fireEvent.click(screen.getByRole('button', { name: /Gerar$/ }))
    rerender()
    fireEvent.change(screen.getByLabelText('Alt-text da imagem 1'), {
      target: { value: 'Foto tirada na bancada' },
    })
    rerender()

    expect(screen.queryByText('gerado automaticamente')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Alt-text da imagem 1')).toHaveValue('Foto tirada na bancada')
  })

  it('produto sem nome deixa `Gerar` desabilitado — nunca alt vazio', () => {
    const { onChange } = setup({ images: [image()], productName: '   ' })

    const gerar = screen.getByRole('button', { name: /Gerar$/ })
    expect(gerar).toBeDisabled()
    fireEvent.click(gerar)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('editar o alt à mão grava no estado; campo vazio volta a null', () => {
    const { onChange } = setup({ images: [image({ alt: 'Lua prateada' })] })

    fireEvent.change(screen.getByLabelText('Alt-text da imagem 1'), { target: { value: '' } })

    expect(onChange).toHaveBeenCalledWith([
      { url: 'https://cdn/foto-1.webp', alt: null, source: 'upload' },
    ])
  })

  it('o `alt` do jsonb vai para o atributo alt da imagem, com o índice como fallback', () => {
    setup({ images: [image({ alt: 'Lua prateada' }), image({ url: 'https://cdn/foto-2.webp' })] })

    expect(screen.getByAltText('Lua prateada')).toBeInTheDocument()
    expect(screen.getByAltText('Imagem 2')).toBeInTheDocument()
  })
})

describe('ImageGallery — origem e principal (PMD-03, PMD-01 AC 1)', () => {
  it('imagem com `source: mockup` mostra o selo; upload não mostra', () => {
    setup({
      images: [
        image({ url: 'https://cdn/foto-1.webp', source: 'upload' }),
        image({ url: 'https://cdn/mock-1.webp', source: 'mockup' }),
      ],
    })

    const tiles = screen.getAllByTestId('image-tile')
    expect(within(tiles[0]).queryByText('Mockup')).not.toBeInTheDocument()
    expect(within(tiles[1]).getByText('Mockup')).toBeInTheDocument()
  })

  it('só a primeira imagem leva o badge `Principal`', () => {
    setup({
      images: [image({ url: 'https://cdn/a.webp' }), image({ url: 'https://cdn/b.webp' })],
    })

    const tiles = screen.getAllByTestId('image-tile')
    expect(within(tiles[0]).getByText('Principal')).toBeInTheDocument()
    expect(within(tiles[1]).queryByText('Principal')).not.toBeInTheDocument()
  })

  it('remover tira a imagem da lista sem tocar nas outras', () => {
    const { onChange } = setup({
      images: [image({ url: 'https://cdn/a.webp' }), image({ url: 'https://cdn/b.webp', alt: 'B' })],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem 1' }))

    expect(onChange).toHaveBeenCalledWith([{ url: 'https://cdn/b.webp', alt: 'B', source: 'upload' }])
  })
})

describe('ImageGallery — reordenar (PMD-01 AC 9)', () => {
  it('arrastar a segunda para a primeira posição troca a principal e preserva alt/source', () => {
    const { onChange } = setup({
      images: [
        image({ url: 'https://cdn/a.webp', alt: 'A' }),
        image({ url: 'https://cdn/b.webp', alt: 'B', source: 'mockup' }),
      ],
    })

    const tiles = screen.getAllByTestId('image-tile')
    fireEvent.dragStart(tiles[1].querySelector('[draggable="true"]')!)
    fireEvent.dragOver(tiles[0])
    fireEvent.drop(tiles[0])

    expect(onChange).toHaveBeenCalledWith([
      { url: 'https://cdn/b.webp', alt: 'B', source: 'mockup' },
      { url: 'https://cdn/a.webp', alt: 'A', source: 'upload' },
    ])
  })
})

describe('ImageGallery — envio (PMD-04)', () => {
  it('soltar arquivos envia e anexa com `source: upload`', async () => {
    const { onChange } = setup({ images: [image({ url: 'https://cdn/ja-existia.webp' })] })

    await act(async () => {
      fireEvent.drop(screen.getByLabelText('Enviar imagens'), {
        dataTransfer: { files: [fileOf('nova.png')] },
      })
    })

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith([
        { url: 'https://cdn/ja-existia.webp', alt: null, source: 'upload' },
        { url: 'https://cdn/nova.png.webp', alt: null, source: 'upload' },
      ]),
    )
  })

  it('colar (⌘V) sobre a aba entra pelo MESMO caminho do arraste', async () => {
    const { onChange } = setup()

    await pasteFiles([fileOf('print.png')])

    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1))
    expect(uploadMock.mock.calls[0][0].map((f: File) => f.name)).toEqual(['print.png'])
    expect(onChange).toHaveBeenCalledWith([
      { url: 'https://cdn/print.png.webp', alt: null, source: 'upload' },
    ])
  })

  it('mostra nome, tamanho e estado de cada arquivo do lote', async () => {
    setup()

    await act(async () => {
      fireEvent.drop(screen.getByLabelText('Enviar imagens'), {
        dataTransfer: { files: [fileOf('um.png', 'image/png', 3 * 1024 * 1024), fileOf('dois.png')] },
      })
    })

    const linhas = await screen.findByLabelText('Progresso do envio')
    expect(within(linhas).getByText('um.png')).toBeInTheDocument()
    expect(within(linhas).getByText('3.0 MB')).toBeInTheDocument()
    expect(within(linhas).getByText('dois.png')).toBeInTheDocument()
    expect(within(linhas).getAllByText('enviada')).toHaveLength(2)
  })

  it('arquivo rejeitado é nomeado com o motivo, e os válidos sobem assim mesmo', async () => {
    uploadMock.mockResolvedValue({
      uploaded: ['https://cdn/ok.webp'],
      failed: [{ file: 'grande.png', reason: 'size' }],
    })
    const { onChange } = setup()

    await act(async () => {
      fireEvent.drop(screen.getByLabelText('Enviar imagens'), {
        dataTransfer: { files: [fileOf('ok.png'), fileOf('grande.png')] },
      })
    })

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'grande.png: maior que 8 MB', variant: 'destructive' }),
      ),
    )
    expect(onChange).toHaveBeenCalledWith([
      { url: 'https://cdn/ok.webp', alt: null, source: 'upload' },
    ])
  })
})

/**
 * Renderiza a galeria como a página faz: o `onChange` volta como `images`. Sem isso, testar o
 * estado "alt preenchido pela ação" exigiria acreditar no componente em vez de observá-lo.
 */
function renderControlled(initial: ProductImage[], productName: string) {
  let current = initial
  const onChange = vi.fn((next: ProductImage[]) => {
    current = next
  })
  const view = render(
    <ImageGallery
      images={current}
      onChange={onChange}
      productName={productName}
    />,
  )
  return {
    onChange,
    rerender: () =>
      view.rerender(
        <ImageGallery
          images={current}
          onChange={onChange}
          productName={productName}
        />,
      ),
  }
}
