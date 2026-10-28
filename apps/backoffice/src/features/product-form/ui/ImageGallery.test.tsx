// PMD-01, PMD-03, PMD-04 — a galeria, corpo do modal Mídia (era a aba Mídia até a feature 85).
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
import { useProductImageUpload } from '../model/useProductImageUpload'

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

type GalleryProps = React.ComponentProps<typeof ImageGallery>
type HarnessProps = Omit<GalleryProps, 'upload' | 'progress' | 'uploading'>

/**
 * Feature 85 (T05): a galeria deixou de ter estado de envio — quem envia é `useProductImageUpload`,
 * instanciado pela página. A montagem compõe o HOOK REAL com a galeria, como a página faz, e anexa
 * as URLs no fim da lista (ADI-04). Assim os casos de envio de antes continuam asserindo o mesmo
 * `onChange`, o mesmo progresso e os mesmos toasts, sem afrouxar nada: só o motor é dublado.
 */
const ComHookReal = (props: HarnessProps) => {
  const { upload, progress, uploading } = useProductImageUpload({
    onUploaded: urls =>
      props.onChange([...props.images, ...urls.map(url => ({ url, alt: null, source: 'upload' as const }))]),
  })
  return <ImageGallery {...props} upload={upload} progress={progress} uploading={uploading} />
}

const setup = (over: Partial<HarnessProps> = {}) => {
  const onChange = vi.fn()
  const props = {
    images: [] as ProductImage[],
    onChange,
    productName: 'Botton Sailor Moon',
    ...over,
  }
  render(<ComHookReal {...props} />)
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

describe('ImageGallery — o envio é de fora (feature 85, MOD-02, ADI-06)', () => {
  // Um espião no lugar do hook: prova que as TRÊS entradas (soltar, colar, escolher) chamam o
  // `upload` recebido, e que a galeria não envia nada por conta própria (o motor nunca é chamado).
  const setupSpy = (over: Partial<GalleryProps> = {}) => {
    const upload = vi.fn()
    render(
      <ImageGallery
        images={[]}
        onChange={vi.fn()}
        productName="Botton Sailor Moon"
        upload={upload}
        progress={[]}
        uploading={false}
        {...over}
      />,
    )
    return { upload }
  }

  it('soltar arquivos chama o `upload` recebido', () => {
    const { upload } = setupSpy()
    const file = fileOf('nova.png')

    fireEvent.drop(screen.getByLabelText('Enviar imagens'), { dataTransfer: { files: [file] } })

    expect(upload).toHaveBeenCalledTimes(1)
    expect(Array.from(upload.mock.calls[0][0] as File[]).map(f => f.name)).toEqual(['nova.png'])
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('colar chama o `upload` recebido', async () => {
    const { upload } = setupSpy()

    await pasteFiles([fileOf('print.png')])

    expect(upload).toHaveBeenCalledTimes(1)
    expect(Array.from(upload.mock.calls[0][0] as File[]).map(f => f.name)).toEqual(['print.png'])
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('escolher arquivo no seletor chama o `upload` recebido', () => {
    const { upload } = setupSpy()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [fileOf('escolhida.png')] } })

    expect(upload).toHaveBeenCalledTimes(1)
    expect(Array.from(upload.mock.calls[0][0] as File[]).map(f => f.name)).toEqual(['escolhida.png'])
  })

  it('`uploading` e `progress` vêm da prop: a galeria desenha o que recebe', () => {
    setupSpy({
      uploading: true,
      progress: [{ file: 'um.png', size: 2 * 1024 * 1024, status: 'uploading' }],
    })

    expect(screen.getByText('Enviando...')).toBeInTheDocument()
    const linhas = screen.getByLabelText('Progresso do envio')
    expect(within(linhas).getByText('um.png')).toBeInTheDocument()
    expect(within(linhas).getByText('enviando')).toBeInTheDocument()
  })

  // BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor: no modal, a mesma região viva do Resumo.
  // Com o modal aberto o Radix esconde o resto da página do leitor, então só esta é anunciada.
  it('o progresso mora numa região viva polite, que existe antes de o envio começar', () => {
    const { rerender, container } = render(
      <ImageGallery images={[]} onChange={vi.fn()} productName="P" upload={vi.fn()} progress={[]} uploading={false} />,
    )
    const regiao = container.querySelector<HTMLElement>('[data-upload-live-region]')!
    expect(regiao).toHaveAttribute('aria-live', 'polite')
    expect(regiao).toBeEmptyDOMElement()
    rerender(
      <ImageGallery
        images={[]}
        onChange={vi.fn()}
        productName="P"
        upload={vi.fn()}
        progress={[{ file: 'um.png', size: 1, status: 'done' }]}
        uploading={false}
      />,
    )
    const mesma = container.querySelector<HTMLElement>('[data-upload-live-region]')!
    expect(mesma).toBe(regiao)
    expect(mesma).toHaveTextContent('um.png')
    expect(mesma).toHaveTextContent('enviada')
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
    <ComHookReal
      images={current}
      onChange={onChange}
      productName={productName}
    />,
  )
  return {
    onChange,
    rerender: () =>
      view.rerender(
        <ComHookReal
          images={current}
          onChange={onChange}
          productName={productName}
        />,
      ),
  }
}

// MOD-07 (prova em navegador da 85, defeito 1): no modal Mídia a galeria é usada no toque, em 390.
// Medido: remover 18×18 e só no hover, "Gerar" 73×24, alt 32 de altura. Token exato, porque jsdom
// mede 0 (`min-h-11` contém `h-11` como substring).
describe('ImageGallery — alvos de toque de 44px no modal (MOD-07)', () => {
  const tokens = (el: Element) => el.className.split(/\s+/)

  it('"Remover imagem n" é 44×44 e visível sem hover', () => {
    setup({ images: [image(), image({ url: 'https://cdn/foto-2.webp' })] })
    const remover = screen.getByRole('button', { name: 'Remover imagem 2' })
    expect(tokens(remover)).toEqual(expect.arrayContaining(['h-11', 'w-11']))
    expect(tokens(remover)).not.toContain('opacity-0')
    expect(remover.className).not.toMatch(/group-hover:opacity/)
  })

  it('"Gerar" e o campo do alt têm 44px de altura', () => {
    setup({ images: [image()] })
    const gerar = screen.getByRole('button', { name: /Gerar/ })
    expect(tokens(gerar)).toContain('h-11')
    expect(tokens(gerar)).not.toContain('h-6')
    const alt = screen.getByRole('textbox', { name: 'Alt-text da imagem 1' })
    expect(tokens(alt)).toContain('h-11')
    expect(tokens(alt)).not.toContain('h-8')
  })
})
