// RES-03, RES-04, RES-05, RES-09, ZOM-01, ADI-01..03 — o bloco de imagens do card Resumo.
//
// jsdom mede 0 de layout: os 72px das miniaturas e o 1:1 da principal são provados por token exato
// de classe. O envio é do hook da página; aqui `upload` é um dublê, e a prova é que o Resumo o
// CHAMA com os arquivos certos (e não chama quando não deve).

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import type { ProductImage } from '@estrelinha/supabase/types'
import type { UploadProgress } from '../lib/uploadProductImage'
import ProductMediaSummary from './ProductMediaSummary'
import { SUMMARY_IMAGE_ACCEPT } from '../model/useFileDrop'

// Objeto público do Storage: é o que `renditionUrl` transforma (um host qualquer voltaria inalterado,
// e a asserção de rendição seria verdadeira nos dois mundos).
const urlDe = (n: number) => `https://proj.supabase.co/storage/v1/object/public/product-images/foto-${n}.webp`

const imagens = (n: number, over: Partial<ProductImage> = {}): ProductImage[] =>
  Array.from({ length: n }, (_, i) => ({ url: urlDe(i + 1), alt: `Joia ${i + 1}`, source: 'upload', ...over }))

const temToken = (el: Element, token: string) => el.className.split(/\s+/).includes(token)

const setup = (over: Partial<Omit<React.ComponentProps<typeof ProductMediaSummary>, 'upload'>> = {}) => {
  const props = {
    images: imagens(3),
    upload: vi.fn<(files: FileList | File[]) => unknown>(),
    progress: [] as UploadProgress[],
    onOpenImage: vi.fn(),
    onOpenMedia: vi.fn(),
    ...over,
  }
  const utils = render(<ProductMediaSummary {...props} />)
  return { ...props, ...utils, root: screen.getByTestId('product-media-summary') }
}

const fileOf = (name: string) => new File(['x'], name, { type: 'image/png' })

describe('RES-03 — a principal', () => {
  it('é images[0], com o alt dela, srcset de rendição e o botão "Ampliar imagem 1 de N"', () => {
    const { onOpenImage } = setup({ images: imagens(3) })
    const botao = screen.getByRole('button', { name: 'Ampliar imagem 1 de 3' })
    const img = within(botao).getByRole('img')
    expect(img).toHaveAttribute('alt', 'Joia 1')
    expect(img).toHaveAttribute('srcset', renditionSrcSet(urlDe(1)))
    expect(img.getAttribute('srcset')).not.toBe('')
    expect(img).toHaveAttribute('sizes')
    // 1:1 e object-cover, por token exato.
    expect(temToken(botao, 'aspect-square')).toBe(true)
    expect(temToken(img, 'object-cover')).toBe(true)
    fireEvent.click(botao)
    expect(onOpenImage).toHaveBeenCalledWith(0)
  })

  it.each([null, '', '   '])('alt %j ⇒ "Imagem 1"', alt => {
    setup({ images: imagens(1, { alt }) })
    expect(screen.getByRole('img', { name: 'Imagem 1' })).toBeInTheDocument()
  })

  it('uma imagem só: nenhuma miniatura, nenhum "+N"', () => {
    setup({ images: imagens(1) })
    expect(screen.queryByRole('button', { name: /Ampliar imagem 2/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Ver mais/ })).toBeNull()
  })
})

describe('RES-04 / RES-09 — as miniaturas e o "+N"', () => {
  it.each([2, 5, 8])('%i imagens ⇒ n−1 miniaturas, sem "+N"', n => {
    setup({ images: imagens(n) })
    const miniaturas = screen.getAllByRole('button', { name: new RegExp(`^Ampliar imagem \\d+ de ${n}$`) })
    // a principal + n−1 miniaturas
    expect(miniaturas).toHaveLength(n)
    expect(screen.queryByRole('button', { name: /Ver mais/ })).toBeNull()
  })

  it('miniatura: 72×72 (token exato), src de rendição de 144, e pede o próprio índice', () => {
    const { onOpenImage } = setup({ images: imagens(4) })
    const terceira = screen.getByRole('button', { name: 'Ampliar imagem 3 de 4' })
    expect(temToken(terceira, 'h-[72px]')).toBe(true)
    expect(temToken(terceira, 'w-[72px]')).toBe(true)
    const img = within(terceira).getByRole('img')
    expect(img).toHaveAttribute('src', renditionUrl(urlDe(3), 144))
    // A rendição de fato mudou a URL: não é a original de 1600px.
    expect(img.getAttribute('src')).not.toBe(urlDe(3))
    fireEvent.click(terceira)
    expect(onOpenImage).toHaveBeenCalledWith(2)
  })

  it.each([
    [9, 1],
    [28, 20],
  ])('%i imagens ⇒ 7 miniaturas e o "+%i" que pede o índice 8', (n, resto) => {
    const { onOpenImage } = setup({ images: imagens(n) })
    const ampliar = screen.getAllByRole('button', { name: new RegExp(`^Ampliar imagem \\d+ de ${n}$`) })
    expect(ampliar).toHaveLength(1 + 7)
    expect(screen.queryByRole('button', { name: `Ampliar imagem 9 de ${n}` })).toBeNull()
    const mais = screen.getByRole('button', { name: `Ver mais ${resto} ${resto === 1 ? 'imagem' : 'imagens'}` })
    expect(mais).toHaveTextContent(`+${resto}`)
    expect(temToken(mais, 'h-[72px]')).toBe(true)
    expect(temToken(mais, 'w-[72px]')).toBe(true)
    // O "+N" vem DEPOIS da 7ª miniatura (RES-09).
    const setima = screen.getByRole('button', { name: `Ampliar imagem 8 de ${n}` })
    expect(setima.compareDocumentPosition(mais) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(mais)
    expect(onOpenImage).toHaveBeenCalledWith(8)
  })

  // Prova em navegador da 85, defeito 3: com 9 fotos saía "Ver mais 1 imagens".
  it.each([
    [9, 'Ver mais 1 imagem'],
    [10, 'Ver mais 2 imagens'],
  ])('%i imagens ⇒ o ladrilho diz "%s" (singular só com 1)', (n, rotulo) => {
    setup({ images: imagens(n) })
    expect(screen.getByRole('button', { name: /^Ver mais/ })).toHaveAccessibleName(rotulo)
  })

  it('a lista embrulha (flex-wrap), nunca rola de lado', () => {
    setup({ images: imagens(8) })
    const lista = screen.getByRole('list', { name: 'Outras imagens' })
    expect(temToken(lista, 'flex-wrap')).toBe(true)
    expect(lista.className).not.toMatch(/overflow-x-(auto|scroll)/)
  })
})

describe('RES-05 — sem imagem', () => {
  it('mostra "Nenhuma imagem ainda", o controle de adicionar e nenhuma principal', () => {
    setup({ images: [] })
    expect(screen.getByText('Nenhuma imagem ainda')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar imagens' })).toBeInTheDocument()
    expect(screen.getByText('ou arraste os arquivos para cá')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ampliar imagem/ })).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('ADI-01 — o seletor de arquivo', () => {
  it('o input é múltiplo, com o accept da galeria', () => {
    setup()
    const input = screen.getByTestId('summary-file-input')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('multiple')
    expect(input).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp')
    expect(SUMMARY_IMAGE_ACCEPT).toBe('image/png,image/jpeg,image/webp')
  })

  it.each([
    ['com imagens, o ladrilho "Adicionar"', imagens(2)],
    ['sem imagem, o botão do vazio', []],
  ])('%s abre o seletor', (_rotulo, images) => {
    setup({ images })
    const input = screen.getByTestId('summary-file-input') as HTMLInputElement
    const clique = vi.spyOn(input, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar imagens' }))
    expect(clique).toHaveBeenCalledTimes(1)
  })

  it('o ladrilho "Adicionar" mede 72×72 (alvo ≥ 44)', () => {
    setup({ images: imagens(2) })
    const tile = screen.getByRole('button', { name: 'Adicionar imagens' })
    expect(temToken(tile, 'h-[72px]')).toBe(true)
    expect(temToken(tile, 'w-[72px]')).toBe(true)
  })

  // BUG-20261028-resumo-corta-fatos-e-adicionar-com-fonte-200: a 200 % de fonte o rótulo
  // "Adicionar" media 87px dentro do ladrilho de 72 e passava por cima da borda tracejada. A caixa
  // continua 72×72; o rótulo visível é cortado DENTRO dela, e o nome acessível segue inteiro.
  it('o rótulo visível do "Adicionar" fica dentro dos 72px: o botão corta, o rótulo trunca', () => {
    setup({ images: imagens(2) })
    const tile = screen.getByRole('button', { name: 'Adicionar imagens' })
    expect(temToken(tile, 'overflow-hidden')).toBe(true)
    const rotulo = within(tile).getByText('Adicionar')
    expect(temToken(rotulo, 'truncate')).toBe(true)
    expect(temToken(rotulo, 'max-w-full')).toBe(true)
    // O ícone não encolhe para dar lugar ao texto.
    expect(tile.querySelector('svg')!.getAttribute('class')!.split(/\s+/)).toContain('shrink-0')
  })

  it('escolher arquivos chama upload com eles, na ordem', () => {
    const { upload } = setup()
    const a = fileOf('a.png')
    const b = fileOf('b.png')
    fireEvent.change(screen.getByTestId('summary-file-input'), { target: { files: [a, b] } })
    expect(upload).toHaveBeenCalledTimes(1)
    expect(Array.from(upload.mock.calls[0][0] as File[])).toEqual([a, b])
  })
})

describe('ADI-02 — soltar arquivo no card', () => {
  const comArquivos = (files: File[]) => ({ dataTransfer: { types: ['Files'], files, dropEffect: 'none' } })

  it('arrastar arquivo mostra "Solte para enviar"; o véu não intercepta o ponteiro', () => {
    const { root } = setup()
    expect(screen.queryByText('Solte para enviar')).toBeNull()
    fireEvent.dragEnter(root, comArquivos([]))
    fireEvent.dragOver(root, comArquivos([]))
    const veu = screen.getByText('Solte para enviar').closest('[role="status"]') as HTMLElement
    expect(temToken(veu, 'pointer-events-none')).toBe(true)
    fireEvent.dragLeave(root, comArquivos([]))
    expect(screen.queryByText('Solte para enviar')).toBeNull()
  })

  it('o véu não pisca ao cruzar um filho (entra no card, entra na miniatura, sai da miniatura)', () => {
    const { root } = setup()
    const filho = screen.getByRole('button', { name: 'Ampliar imagem 2 de 3' })
    fireEvent.dragEnter(root, comArquivos([]))
    fireEvent.dragEnter(filho, comArquivos([]))
    fireEvent.dragLeave(filho, comArquivos([]))
    expect(screen.getByText('Solte para enviar')).toBeInTheDocument()
  })

  it('soltar arquivos chama upload com eles e apaga o véu', () => {
    const { root, upload } = setup()
    const a = fileOf('a.png')
    fireEvent.dragEnter(root, comArquivos([a]))
    fireEvent.drop(root, comArquivos([a]))
    expect(upload).toHaveBeenCalledTimes(1)
    expect(Array.from(upload.mock.calls[0][0] as File[])).toEqual([a])
    expect(screen.queryByText('Solte para enviar')).toBeNull()
  })

  it('soltar sobre os fatos (children) também envia — o alvo é o card inteiro', () => {
    const upload = vi.fn()
    render(
      <ProductMediaSummary images={imagens(1)} upload={upload} progress={[]} onOpenImage={vi.fn()} onOpenMedia={vi.fn()}>
        <p>Preço · R$ 100</p>
      </ProductMediaSummary>,
    )
    const fato = screen.getByText('Preço · R$ 100')
    fireEvent.drop(fato, comArquivos([fileOf('a.png')]))
    expect(upload).toHaveBeenCalledTimes(1)
  })

  it('arrastar ou soltar TEXTO não mostra o véu nem chama upload', () => {
    const { root, upload } = setup()
    const texto = { dataTransfer: { types: ['text/plain'], files: [], getData: () => 'oi' } }
    fireEvent.dragEnter(root, texto)
    fireEvent.dragOver(root, texto)
    expect(screen.queryByText('Solte para enviar')).toBeNull()
    fireEvent.drop(root, texto)
    expect(upload).not.toHaveBeenCalled()
  })
})

describe('ADI-03 — o progresso', () => {
  it('uma linha por arquivo, com nome e estado no vocabulário da galeria', () => {
    setup({
      progress: [
        { file: 'a.png', size: 1, status: 'uploading' },
        { file: 'b.png', size: 1, status: 'done' },
        { file: 'c.png', size: 1, status: 'error', reason: 'type' },
      ],
    })
    const lista = screen.getByRole('list', { name: 'Progresso do envio' })
    const linhas = within(lista).getAllByRole('listitem')
    expect(linhas).toHaveLength(3)
    expect(linhas[0]).toHaveTextContent('a.png')
    expect(linhas[0]).toHaveTextContent('enviando')
    expect(linhas[1]).toHaveTextContent('b.png')
    expect(linhas[1]).toHaveTextContent('enviada')
    expect(linhas[2]).toHaveTextContent('c.png')
    expect(linhas[2]).toHaveTextContent('falhou')
  })

  it('sem progresso, nenhuma lista', () => {
    setup()
    expect(screen.queryByRole('list', { name: 'Progresso do envio' })).toBeNull()
  })

  // BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor: a lista ficava fora de região viva, e o
  // leitor não ouvia "enviando" nem "enviada". A região existe ANTES do primeiro evento (uma região
  // que nasce junto com o texto não é anunciada) e é `polite`: não interrompe a leitura.
  it('o progresso mora numa região viva polite, que existe antes de o envio começar', () => {
    const { rerender, root, images, upload, onOpenImage, onOpenMedia } = setup()
    const props = { images, upload, onOpenImage, onOpenMedia }
    const regiao = root.querySelector<HTMLElement>('[data-upload-live-region]')!
    expect(regiao).toHaveAttribute('aria-live', 'polite')
    expect(regiao).toBeEmptyDOMElement()

    rerender(
      <ProductMediaSummary
        {...props}
        progress={[{ file: 'a.png', size: 1, status: 'uploading' }]}
      />,
    )
    const mesma = root.querySelector<HTMLElement>('[data-upload-live-region]')!
    expect(mesma).toBe(regiao)
    expect(within(mesma).getByRole('list')).toHaveTextContent('a.png')
    expect(mesma).toHaveTextContent('enviando')
  })

  // O `aria-hidden` que o Radix põe na página com o modal aberto POUPA regiões vivas de propósito
  // (medido: a do Resumo seguia na árvore de acessibilidade). Com o modal aberto quem fala é a
  // galeria; o Resumo se cala, senão cada linha seria anunciada duas vezes.
  it('announce={false}: a lista continua na tela, mas a região deixa de ser viva', () => {
    setup({ announce: false, progress: [{ file: 'a.png', size: 1, status: 'uploading' }] })
    const lista = screen.getByRole('list', { name: 'Progresso do envio' })
    expect(lista.parentElement).toHaveAttribute('aria-live', 'off')
  })
})

describe('"Editar mídia"', () => {
  it('conta os alt vazios (nulo, vazio, só espaço)', () => {
    const images: ProductImage[] = [
      { url: urlDe(1), alt: 'Joia', source: 'upload' },
      { url: urlDe(2), alt: null, source: 'upload' },
      { url: urlDe(3), alt: '', source: 'upload' },
      { url: urlDe(4), alt: '  ', source: 'upload' },
    ]
    const { onOpenMedia } = setup({ images })
    const botao = screen.getByRole('button', { name: 'Editar mídia · 3 sem descrição' })
    fireEvent.click(botao)
    expect(onOpenMedia).toHaveBeenCalledTimes(1)
  })

  it('sem faltantes, só "Editar mídia"', () => {
    setup({ images: imagens(3) })
    const botao = screen.getByRole('button', { name: /^Editar mídia/ })
    expect(botao).toHaveTextContent(/^Editar mídia$/)
  })
})

describe('edge case — a imagem que não carrega', () => {
  it('a miniatura vira o fundo com o número, e o botão continua lá', () => {
    setup({ images: imagens(4) })
    const terceira = screen.getByRole('button', { name: 'Ampliar imagem 3 de 4' })
    fireEvent.error(within(terceira).getByRole('img'))
    const mesma = screen.getByRole('button', { name: 'Ampliar imagem 3 de 4' })
    expect(within(mesma).queryByRole('img')).toBeNull()
    expect(mesma).toHaveTextContent('3')
    expect(temToken(mesma, 'h-[72px]')).toBe(true)
    // As vizinhas seguem com a foto.
    expect(within(screen.getByRole('button', { name: 'Ampliar imagem 2 de 4' })).getByRole('img')).toBeInTheDocument()
  })

  it('a principal também', () => {
    setup({ images: imagens(2) })
    const principal = screen.getByRole('button', { name: 'Ampliar imagem 1 de 2' })
    fireEvent.error(within(principal).getByRole('img'))
    expect(within(principal).queryByRole('img')).toBeNull()
    expect(principal).toHaveTextContent('1')
  })
})
