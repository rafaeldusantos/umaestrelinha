// PMD-01, PMD-03, PMD-04 — a galeria, corpo do modal Mídia (era a aba Mídia até a feature 85).
//
// A prova é de comportamento observável: estados do alt-text, selo de origem, progresso por
// arquivo, colar, reordenar. A validação de tipo/tamanho tem teste próprio em
// `lib/uploadProductImage.test.ts`; aqui só se prova que a galeria REPORTA o que a lib devolve.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
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
      'PNG, JPG ou WebP até 8 MB · até 2400 px no maior lado',
    )
    // A copy antiga mentia: dizia 5 MB e o código não validava tamanho nenhum.
    expect(dropzone).not.toHaveTextContent('5MB')
    // IMG-18: nem o teto antigo, nem a promessa de conversão que o caminho sem canvas não cumpre.
    expect(dropzone).not.toHaveTextContent('1600')
    expect(dropzone).not.toHaveTextContent('convertidas')
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

// MOD-08..MOD-10 (BUG-20261028-ordenar-fotos-so-arrastando): a ordem também muda sem arrastar, por
// botões que o teclado e o leitor alcançam, e o modal em 390 mostra 2 colunas.
const quatro = (): ProductImage[] => [
  { url: 'https://cdn/a.webp', alt: 'A', source: 'upload' },
  { url: 'https://cdn/b.webp', alt: 'B', source: 'mockup' },
  { url: 'https://cdn/c.webp', alt: null, source: 'upload' },
  { url: 'https://cdn/d.webp', alt: 'D', source: 'mockup' },
]

/** A galeria com o `onChange` voltando como `images`, como a página faz — o foco só se prova assim. */
const Controlada = ({ initial, spy }: { initial: ProductImage[]; spy: (next: ProductImage[]) => void }) => {
  const [imgs, setImgs] = useState(initial)
  return (
    <ImageGallery
      images={imgs}
      onChange={next => {
        spy(next)
        setImgs(next)
      }}
      productName="P"
      upload={vi.fn()}
      progress={[]}
      uploading={false}
    />
  )
}

const montarControlada = (initial = quatro()) => {
  const spy = vi.fn()
  const view = render(<Controlada initial={initial} spy={spy} />)
  return { spy, ...view }
}

const urls = (list: ProductImage[]) => list.map(i => i.url.replace('https://cdn/', '').replace('.webp', ''))

describe('ImageGallery — botões de ordem (MOD-08)', () => {
  it('cada foto tem "←", "Tornar principal" e "→" com nome que cita a posição', () => {
    montarControlada()
    for (const n of [1, 2, 3, 4]) {
      expect(screen.getByRole('button', { name: `Mover a imagem ${n} para antes` })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Tornar a imagem ${n} principal` })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Mover a imagem ${n} para depois` })).toBeInTheDocument()
    }
  })

  it('na 1ª, "←" e "Tornar principal" desabilitados e "→" habilitado; na última, só "→" desabilitado', () => {
    montarControlada()
    expect(screen.getByRole('button', { name: 'Mover a imagem 1 para antes' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Tornar a imagem 1 principal' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mover a imagem 1 para depois' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Mover a imagem 4 para antes' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Tornar a imagem 4 principal' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Mover a imagem 4 para depois' })).toBeDisabled()
    // A 1ª diz por escrito por que o botão do meio está parado.
    expect(screen.getByRole('button', { name: 'Tornar a imagem 1 principal' })).toHaveTextContent('É a principal')
  })

  it('"←" na 3ª troca com a 2ª; alt e source viajam com a foto', () => {
    const { spy } = montarControlada()
    fireEvent.click(screen.getByRole('button', { name: 'Mover a imagem 3 para antes' }))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith([
      { url: 'https://cdn/a.webp', alt: 'A', source: 'upload' },
      { url: 'https://cdn/c.webp', alt: null, source: 'upload' },
      { url: 'https://cdn/b.webp', alt: 'B', source: 'mockup' },
      { url: 'https://cdn/d.webp', alt: 'D', source: 'mockup' },
    ])
  })

  it('"→" na 2ª troca com a 3ª', () => {
    const { spy } = montarControlada()
    fireEvent.click(screen.getByRole('button', { name: 'Mover a imagem 2 para depois' }))
    expect(urls(spy.mock.calls[0][0])).toEqual(['a', 'c', 'b', 'd'])
    expect(spy.mock.calls[0][0][2]).toEqual({ url: 'https://cdn/b.webp', alt: 'B', source: 'mockup' })
  })

  it('"Tornar principal" na 4ª leva ela ao topo e mantém a ordem relativa das outras', () => {
    const { spy } = montarControlada()
    fireEvent.click(screen.getByRole('button', { name: 'Tornar a imagem 4 principal' }))
    expect(spy.mock.calls[0][0]).toEqual([
      { url: 'https://cdn/d.webp', alt: 'D', source: 'mockup' },
      { url: 'https://cdn/a.webp', alt: 'A', source: 'upload' },
      { url: 'https://cdn/b.webp', alt: 'B', source: 'mockup' },
      { url: 'https://cdn/c.webp', alt: null, source: 'upload' },
    ])
    // O selo "Principal" passou para a foto D.
    const tiles = screen.getAllByTestId('image-tile')
    expect(within(tiles[0]).getByText('Principal')).toBeInTheDocument()
    expect(tiles[0].querySelector('img')).toHaveAttribute('src', 'https://cdn/d.webp')
  })

  // Reescrito na prova de fonte grande (T14b): com as setas `w-11` (rem) e o meio `minmax(0,1fr)` numa
  // linha só, o ladrilho de 168 px em 390 deixava o "Tornar principal" com 23 px a 130 % e jogava 56
  // botões para fora a 200 %. A fileira virou duas linhas: "←" e "→" lado a lado, cada um com metade
  // do ladrilho, e "Tornar principal" com a largura inteira embaixo. Nenhuma largura em rem cravada.
  it('os botões de ordem medem 44 de altura e dividem a largura do ladrilho em duas linhas', () => {
    montarControlada()
    const tokens = (el: Element) => el.className.split(/\s+/)
    const antes = screen.getByRole('button', { name: 'Mover a imagem 2 para antes' })
    const depois = screen.getByRole('button', { name: 'Mover a imagem 2 para depois' })
    const meio = screen.getByRole('button', { name: 'Tornar a imagem 2 principal' })
    const fileira = meio.parentElement!
    expect(antes.parentElement).toBe(fileira)
    expect(depois.parentElement).toBe(fileira)
    // Duas colunas iguais que encolhem (nunca a trilha `auto` do min-content).
    expect(tokens(fileira)).toEqual(expect.arrayContaining(['grid', 'grid-cols-2']))
    expect(tokens(fileira)).not.toContain('grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]')
    for (const seta of [antes, depois]) {
      expect(tokens(seta)).toEqual(expect.arrayContaining(['h-11', 'w-full']))
      // Largura cravada em rem cresce com a fonte e sai do ladrilho a 200 % (o defeito).
      expect(tokens(seta)).not.toContain('w-11')
    }
    // O do meio ocupa a linha inteira de baixo, com 44 de altura MÍNIMA (o rótulo pode ganhar 2ª linha).
    expect(tokens(meio)).toEqual(expect.arrayContaining(['min-h-11', 'w-full', 'col-span-2', 'min-w-0']))
    expect(tokens(meio)).not.toContain('h-11')
    expect(meio).toHaveTextContent('Tornar principal')
    // Na prova de navegador (T14b) o `truncate` cortava o rótulo a 130 %+ de fonte em 390 ("Torn…"):
    // o texto quebra em vez de cortar, e nenhum `truncate` volta.
    expect(tokens(meio)).toContain('whitespace-normal')
    expect(meio.querySelector('.truncate')).toBeNull()
  })

  it('a ordem do DOM é a ordem visual: "←", "→" na 1ª linha e "Tornar principal" na 2ª', () => {
    montarControlada()
    const fileira = screen.getByRole('button', { name: 'Tornar a imagem 2 principal' }).parentElement!
    expect(Array.from(fileira.children).map(b => b.getAttribute('data-order-button'))).toEqual([
      'prev',
      'next',
      'principal',
    ])
  })
})

describe('ImageGallery — foco e anúncio depois de mover (MOD-09)', () => {
  const regiao = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-order-live-region]')!

  it('"→" na 2ª: o foco fica no "→" da mesma foto, agora na 3ª; anuncia a posição nova', () => {
    const { container } = montarControlada()
    fireEvent.click(screen.getByRole('button', { name: 'Mover a imagem 2 para depois' }))
    const alvo = screen.getByRole('button', { name: 'Mover a imagem 3 para depois' })
    expect(alvo).toHaveFocus()
    expect(screen.getAllByTestId('image-tile')[2].contains(alvo)).toBe(true)
    expect(screen.getAllByTestId('image-tile')[2].querySelector('img')).toHaveAttribute('src', 'https://cdn/b.webp')
    expect(regiao(container)).toHaveAttribute('aria-live', 'polite')
    expect(regiao(container)).toHaveTextContent('Imagem movida para a posição 3 de 4')
  })

  it('"←" na 3ª: o foco fica no "←" da mesma foto na 2ª', () => {
    const { container } = montarControlada()
    fireEvent.click(screen.getByRole('button', { name: 'Mover a imagem 3 para antes' }))
    expect(screen.getByRole('button', { name: 'Mover a imagem 2 para antes' })).toHaveFocus()
    expect(regiao(container)).toHaveTextContent('Imagem movida para a posição 2 de 4')
  })

  it('"→" leva à última: o "→" fica desabilitado e o foco vai ao vizinho habilitado, o "←" da mesma foto', () => {
    montarControlada()
    fireEvent.click(screen.getByRole('button', { name: 'Mover a imagem 3 para depois' }))
    expect(screen.getByRole('button', { name: 'Mover a imagem 4 para depois' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mover a imagem 4 para antes' })).toHaveFocus()
  })

  it('"←" leva à 1ª: "←" e "Tornar principal" ficam desabilitados e o foco vai ao "→" da mesma foto', () => {
    montarControlada()
    fireEvent.click(screen.getByRole('button', { name: 'Mover a imagem 2 para antes' }))
    expect(screen.getAllByTestId('image-tile')[0].querySelector('img')).toHaveAttribute('src', 'https://cdn/b.webp')
    expect(screen.getByRole('button', { name: 'Mover a imagem 1 para depois' })).toHaveFocus()
  })

  it('"Tornar principal" na 4ª: o foco vai ao "→" da foto, agora 1ª; anuncia "Imagem 4 agora é a principal"', () => {
    const { container } = montarControlada()
    fireEvent.click(screen.getByRole('button', { name: 'Tornar a imagem 4 principal' }))
    expect(screen.getByRole('button', { name: 'Mover a imagem 1 para depois' })).toHaveFocus()
    expect(regiao(container)).toHaveTextContent('Imagem 4 agora é a principal')
    expect(regiao(container)).not.toHaveTextContent('posição')
  })

  // T14b: em 390 o botão focado depois de mover para a linha de baixo ficava sob o rodapé "Concluir"
  // (y 724–768 com a área rolável terminando em 730). O foco programático não rola o corpo do modal;
  // a galeria pede a rolagem ao PRÓPRIO botão focado, com `block: 'nearest'` (sem saltar quando já
  // está visível). jsdom não tem layout, então a prova aqui é o pedido; a posição se mede no navegador.
  it('depois de mover, pede ao botão focado que role para a vista (block nearest)', () => {
    const original = Element.prototype.scrollIntoView
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
      rolar(this, arg)
    }
    try {
      montarControlada()
      fireEvent.click(screen.getByRole('button', { name: 'Mover a imagem 2 para depois' }))
      const alvo = screen.getByRole('button', { name: 'Mover a imagem 3 para depois' })
      expect(alvo).toHaveFocus()
      expect(rolar).toHaveBeenCalledTimes(1)
      expect(rolar).toHaveBeenCalledWith(alvo, { block: 'nearest' })
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  // O anel de foco (ring-2 + offset 2) passa 4 px da borda do botão: rolado em `nearest`, o botão
  // encostava na borda do corpo (730 = 730 na prova T14b) e o anel era cortado. `scroll-my-2` dá a folga.
  it('os três botões de ordem têm folga de rolagem para o anel de foco não ser cortado', () => {
    montarControlada()
    for (const nome of ['Mover a imagem 2 para antes', 'Tornar a imagem 2 principal', 'Mover a imagem 2 para depois']) {
      expect(screen.getByRole('button', { name: nome }).className.split(/\s+/)).toContain('scroll-my-2')
    }
  })

  it('o vizinho que recebe o foco na ponta também é rolado para a vista', () => {
    const original = Element.prototype.scrollIntoView
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
      rolar(this, arg)
    }
    try {
      montarControlada()
      fireEvent.click(screen.getByRole('button', { name: 'Mover a imagem 3 para depois' }))
      const vizinho = screen.getByRole('button', { name: 'Mover a imagem 4 para antes' })
      expect(vizinho).toHaveFocus()
      expect(rolar).toHaveBeenCalledWith(vizinho, { block: 'nearest' })
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('sem mover nada, nada é rolado (abrir o modal não salta a lista)', () => {
    const original = Element.prototype.scrollIntoView
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
      rolar(this, arg)
    }
    try {
      montarControlada()
      expect(rolar).not.toHaveBeenCalled()
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('a região da ordem é irmã da do envio, não a mesma: mover não apaga a linha do arquivo', () => {
    const { container } = render(
      <ImageGallery
        images={quatro()}
        onChange={vi.fn()}
        productName="P"
        upload={vi.fn()}
        progress={[{ file: 'um.png', size: 1, status: 'done' }]}
        uploading={false}
      />,
    )
    const envio = container.querySelector<HTMLElement>('[data-upload-live-region]')!
    expect(regiao(container)).not.toBe(envio)
    expect(envio.contains(regiao(container))).toBe(false)
    expect(regiao(container)).toBeEmptyDOMElement()
    fireEvent.click(screen.getByRole('button', { name: 'Tornar a imagem 2 principal' }))
    expect(envio).toHaveTextContent('um.png')
    expect(envio).not.toHaveTextContent('principal')
  })

  it('as chaves dos ladrilhos são da foto, não da posição: o campo de alt focado acompanha a foto', () => {
    montarControlada()
    const altC = screen.getByRole('textbox', { name: 'Alt-text da imagem 3' })
    fireEvent.click(screen.getByRole('button', { name: 'Tornar a imagem 3 principal' }))
    // O mesmo nó DOM, agora na 1ª posição (com chave por posição o React reaproveitaria o nó para outra foto).
    expect(screen.getByRole('textbox', { name: 'Alt-text da imagem 1' })).toBe(altC)
  })
})

describe('ImageGallery — 2 colunas em 390 (MOD-10)', () => {
  it('a grade é grid-cols-2 abaixo de sm e volta ao tile de 196 px a partir de sm', () => {
    setup({ images: [image()] })
    const grade = screen.getAllByTestId('image-tile')[0].parentElement!
    const tokens = grade.className.split(/\s+/)
    expect(tokens).toContain('grid-cols-2')
    expect(tokens).toContain('sm:[grid-template-columns:repeat(auto-fill,minmax(196px,1fr))]')
    // Sem o prefixo `sm:`, o auto-fill de 196 valeria também em 390 e daria 1 coluna (o defeito).
    expect(tokens).not.toContain('[grid-template-columns:repeat(auto-fill,minmax(196px,1fr))]')
  })

  it('a copy cita as setas além do arrasto', () => {
    setup({ images: [image()] })
    expect(
      screen.getByText('Arraste ou use as setas para reordenar. A primeira imagem será a principal.'),
    ).toBeInTheDocument()
  })
})
