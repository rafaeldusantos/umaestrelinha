// Feature 85 — o Resumo com as imagens, o modal Mídia e o visualizador, na PÁGINA real do produto
// (RES-01, RES-02, RES-06, RES-07, RES-08, MOD-01, MOD-03, MOD-05, MOD-06, ADI-03, ZOM-01).
//
// A página é a de verdade: `ProductMediaSummary`, `ProductMediaDialog`, `ImageGallery`,
// `ImageLightbox`, `PublishChecklist`, `VariantImagePicker` e o `useProductImageUpload` reais.
// Remontar a composição no teste provaria uma árvore que a página pode não montar ("teste não monta
// a árvore que prova") — cada fio aqui só existe se a página o liga.
//
// Inventário de `vi.mock` (`L-030`): o client do supabase (diário de escritas, o produto da carga),
// `useAdminProducts` (a escrita de `products`, no mesmo diário), `useAdminCategories`, `useAdminFaqs`,
// o catálogo de filtros, o motor de upload (`uploadProductImages`), a origem da loja (`STORE_URL` —
// sem fixá-la o link de RES-07 dependeria do `.env` da máquina, que o CI não tem), o editor rico e o
// toast.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY } from '@/entities/product'
import { storeUrlFor } from '@/features/product-form/lib/storeUrl'

const h = vi.hoisted(() => ({
  diario: [] as { op: string; table: string; payload?: unknown }[],
  produto: null as Record<string, unknown> | null,
  upload: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => {
  const from = (table: string) => {
    let op = 'select'
    let payload: unknown
    const fim = async () => {
      if (op !== 'select') h.diario.push({ op, table, payload })
      return { data: null, error: null, count: 0 }
    }
    const b: Record<string, unknown> = {}
    for (const m of ['eq', 'in', 'neq', 'ilike', 'order', 'limit', 'range']) b[m] = () => b
    b.select = () => b
    b.insert = (p: unknown) => ((op = 'insert'), (payload = p), b)
    b.update = (p: unknown) => ((op = 'update'), (payload = p), b)
    b.upsert = (p: unknown) => ((op = 'upsert'), (payload = p), b)
    b.delete = () => ((op = 'delete'), b)
    b.maybeSingle = () => {
      if (table === 'products' && op === 'select') return Promise.resolve({ data: h.produto, error: null })
      return fim()
    }
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => fim().then(ok, ko)
    return b
  }
  return { supabase: { from, storage: { from: () => ({ upload: vi.fn(), remove: vi.fn() }) } } }
})
vi.mock('@/entities/product/api/useAdminProducts', () => ({
  useAdminProducts: () => ({
    createProduct: vi.fn(async (payload: unknown) => {
      h.diario.push({ op: 'insert', table: 'products', payload })
      return { error: null, id: 'novo' }
    }),
    updateProduct: vi.fn(async (_id: string, payload: unknown) => {
      h.diario.push({ op: 'update', table: 'products', payload })
      return null
    }),
  }),
}))
vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({ categories: [] }),
}))
vi.mock('@/features/faq-library/api/useAdminFaqs', () => ({
  useAdminFaqs: () => ({ faqs: [], loading: false, error: null }),
}))
vi.mock('@/entities/filter', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/filter')>()),
  useAdminFilterCatalog: () => ({ groups: [], loading: false, error: null }),
}))
vi.mock('@/features/product-form/lib/uploadProductImage', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/product-form/lib/uploadProductImage')>()),
  uploadProductImages: h.upload,
}))
vi.mock('@/shared/lib/storeOrigin', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/lib/storeOrigin')>()),
  STORE_URL: 'https://loja.test',
}))
vi.mock('@/shared/ui/RichTextEditor', () => ({ default: () => <div>editor</div> }))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminProductFormPage from './AdminProductFormPage'

const foto = (n: number) => ({ url: `https://cdn/foto-${n}.webp`, alt: `Foto ${n}`, source: 'upload' })

const produtoBase = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Pingente Estrela',
  slug: 'pingente-estrela',
  base_price: 89.9,
  original_price: 120,
  weight_kg: 0.05,
  is_active: false,
  options: [],
  images: [1, 2, 3, 4, 5].map(foto),
  video_url: '',
  product_variants: [],
  product_categories: [],
  product_faqs: [],
  product_filter_values: [],
  product_suppliers: null,
  ...over,
})

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.sessionStorage.clear()
  window.localStorage.clear()
  h.diario = []
  h.upload.mockReset()
  h.produto = produtoBase()
})

const montar = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(PRODUCT_POOL_KEY, [])
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/produtos/p1/editar']}>
        <Routes>
          <Route path="/admin/produtos/:id/editar" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos" element={<p>lista</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await waitFor(() => expect(screen.getByDisplayValue('Pingente Estrela')).toBeInTheDocument())
  return view
}

/** O título de um `FormCard` (é um `CardTitle`, e o texto é exato). */
const tituloDoCard = (titulo: string) => screen.getByText(titulo, { selector: 'h3' })

const resumo = () => screen.getByTestId('product-media-summary')

const salvarRascunho = () => screen.getByRole('button', { name: 'Salvar', hidden: true })

describe('RES-01, RES-02, RES-06 — onde o Resumo mora', () => {
  it('a coluna lateral vai do Resumo a Fornecedor, com o Resumo no topo, acima de Publicação (RES-01)', async () => {
    h.produto = produtoBase({
      product_suppliers: [{ url: 'https://exemplo.com/peca', position: 0, suppliers: { name: 'Ateliê Prata' } }],
    })
    await montar()

    const titulos = ['Resumo', 'Publicação', 'Pronto para publicar', 'Fornecedor']
    // A régua é dupla, porque a coluna tem duas ordens: no DOM o Resumo vem PRIMEIRO (RES-06, o
    // celular), e a partir de `lg` as áreas da grade o mantêm no topo da coluna direita, acima de Publicação (RES-01).
    // 1) DOM: Resumo → Publicação → Pronto para publicar → Fornecedor.
    const antes = (a: string, b: string) =>
      expect(tituloDoCard(a).compareDocumentPosition(tituloDoCard(b)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    antes('Resumo', 'Publicação')
    antes('Publicação', 'Pronto para publicar')
    antes('Pronto para publicar', 'Fornecedor')
    // 2) `lg`: Resumo → Publicação → Pronto → Fornecedor nas linhas da coluna direita (token exato).
    const grade = resumo().closest('[class*="grid-template-areas"]')!
    expect(grade.className.split(/\s+/)).toContain(
      "lg:[grid-template-areas:'main_res'_'main_pub'_'main_chk'_'main_sup'_'main_.']",
    )
    const area = (titulo: string) => {
      let el: HTMLElement | null = tituloDoCard(titulo)
      while (el && el.parentElement !== grade) el = el.parentElement
      return el!.className.split(/\s+/).find(c => c.startsWith('lg:[grid-area:'))
    }
    expect(titulos.map(area)).toEqual([
      'lg:[grid-area:res]',
      'lg:[grid-area:pub]',
      'lg:[grid-area:chk]',
      'lg:[grid-area:sup]',
    ])
  })

  it('o card "Prévia na loja" não existe (RES-02)', async () => {
    await montar()
    expect(screen.queryByText('Prévia na loja')).toBeNull()
    expect(screen.getByText('Resumo')).toBeInTheDocument()
  })

  it('o Resumo existe UMA vez, e no DOM antes da lista de abas (RES-06)', async () => {
    await montar()
    expect(screen.getAllByTestId('product-media-summary')).toHaveLength(1)
    expect(screen.getAllByText('Resumo')).toHaveLength(1)
    const abas = screen.getByRole('tablist')
    expect(resumo().compareDocumentPosition(abas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a lista de abas não tem Mídia, e o conteúdo dela não está na página (MOD-01)', async () => {
    await montar()
    expect(screen.queryByRole('tab', { name: /Mídia/ })).toBeNull()
    // O campo de vídeo mora no modal: fechado, ele não existe na página.
    expect(screen.queryByLabelText('Vídeo (URL YouTube/Vimeo)')).toBeNull()
  })
})

describe('RES-07, RES-08, MOD-05 — o cabeçalho e os fatos do Resumo', () => {
  it('"Abrir na loja ↗" leva à URL pública do produto, em nova aba (RES-07)', async () => {
    await montar()
    const link = screen.getByRole('link', { name: 'Abrir na loja ↗' })
    expect(link).toHaveAttribute('href', storeUrlFor('pingente-estrela'))
    expect(link).toHaveAttribute('href', 'https://loja.test/produtos/pingente-estrela')
    expect(link).toHaveAttribute('target', '_blank')
    // O link mora no cabeçalho do PRÓPRIO card Resumo.
    expect(tituloDoCard('Resumo').closest('.rounded-2xl')!.contains(link)).toBe(true)
  })

  it('os fatos de antes continuam no Resumo, e a linha Vídeo diz "não" sem vídeo (RES-08, MOD-05)', async () => {
    await montar()
    const card = resumo()
    expect(within(card).getByTestId('summary-price')).toBeInTheDocument()
    expect(within(card).getByTestId('summary-stock')).toBeInTheDocument()
    expect(within(card).getByText('Imagens')).toBeInTheDocument()
    expect(within(card).getByText('Peso de envio')).toBeInTheDocument()
    expect(within(card).getByText('Vídeo')).toBeInTheDocument()
    expect(within(card).getByTestId('summary-video').textContent).toBe('não')
  })

  it('vídeo digitado no modal faz a linha dizer "sim", ao vivo (MOD-05)', async () => {
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Editar mídia/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Mídia' })
    fireEvent.change(within(dialog).getByLabelText('Vídeo (URL YouTube/Vimeo)'), {
      target: { value: 'https://youtube.com/watch?v=abc' },
    })
    expect(screen.getByTestId('summary-video').textContent).toBe('sim')
  })
})

describe('ZOM-01 — as imagens do Resumo abrem o visualizador', () => {
  it('clicar na 3ª miniatura abre o visualizador em "3 / 5"', async () => {
    await montar()
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar imagem 3 de 5' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('3 / 5')).toBeInTheDocument()
    expect(within(dialog).getByText('Foto 3')).toBeInTheDocument()
  })
})

describe('MOD-02, MOD-03 — o modal Mídia', () => {
  it('"Editar mídia" abre o modal; remover a principal faz o Resumo mostrar a seguinte, ao vivo, e marca alterado', async () => {
    await montar()
    expect(screen.queryByText('Alterações não salvas')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Editar mídia/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Mídia' })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remover imagem 1' }))

    // O modal continua aberto, e o Resumo atrás dele já mostra a foto 2 como principal.
    expect(screen.getByRole('dialog', { name: 'Mídia' })).toBeInTheDocument()
    const principal = screen.getByRole('button', { name: 'Ampliar imagem 1 de 4', hidden: true })
    expect(principal.querySelector('img')).toHaveAttribute('src', 'https://cdn/foto-2.webp')
    expect(principal.querySelector('img')).toHaveAttribute('alt', 'Foto 2')
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
  })

  it('"Tornar a imagem 4 principal" no modal ⇒ o Resumo mostra a foto 4 como principal e marca alterado (MOD-08)', async () => {
    await montar()
    expect(screen.queryByText('Alterações não salvas')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Editar mídia/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Mídia' })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Tornar a imagem 4 principal' }))

    // A contagem não muda (5), a principal do Resumo é a antiga 4ª, e a antiga 1ª desceu para a 2ª.
    const principal = screen.getByRole('button', { name: 'Ampliar imagem 1 de 5', hidden: true })
    expect(principal.querySelector('img')).toHaveAttribute('src', 'https://cdn/foto-4.webp')
    expect(principal.querySelector('img')).toHaveAttribute('alt', 'Foto 4')
    const segunda = screen.getByRole('button', { name: 'Ampliar imagem 2 de 5', hidden: true })
    expect(segunda.querySelector('img')).toHaveAttribute('src', 'https://cdn/foto-1.webp')
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    // E no próprio modal o foco ficou com a foto movida (MOD-09).
    expect(within(dialog).getByRole('button', { name: 'Mover a imagem 1 para depois' })).toHaveFocus()
  })

  it('fechar o modal não desfaz a remoção (MOD-04)', async () => {
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Editar mídia/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Mídia' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remover imagem 1' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Concluir' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('button', { name: 'Ampliar imagem 1 de 4' }).querySelector('img')).toHaveAttribute(
      'src',
      'https://cdn/foto-2.webp',
    )
  })
})

// Prova em navegador da 85, defeito 2: fechar o modal deixava o foco no <body>. Ele volta a quem
// abriu, como o visualizador já faz (ZOM-05).
describe('o foco volta ao "Editar mídia" ao fechar o modal', () => {
  it.each(['Concluir', 'Esc'])('fechando por %s', async modo => {
    await montar()
    const editar = screen.getByRole('button', { name: /^Editar mídia/ })
    editar.focus()
    fireEvent.click(editar)
    const dialog = await screen.findByRole('dialog', { name: 'Mídia' })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    if (modo === 'Concluir') fireEvent.click(within(dialog).getByRole('button', { name: 'Concluir' }))
    else fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(editar))
  })
})

describe('MOD-06 — a pendência de imagens do checklist abre o modal', () => {
  it('produto sem imagem: "Ao menos uma imagem" abre o modal Mídia', async () => {
    h.produto = produtoBase({ images: [] })
    await montar()
    expect(within(resumo()).getByText('Nenhuma imagem ainda')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Ao menos uma imagem/ }))

    expect(await screen.findByRole('dialog', { name: 'Mídia' })).toBeInTheDocument()
  })
})

describe('ADI-03, ADI-04 — o envio pelo Resumo trava o salvar', () => {
  const arquivo = (nome: string) => new File(['x'], nome, { type: 'image/png' })

  it('envio no ar pelo Resumo ⇒ salvar desabilitado; terminado ⇒ a foto entra no FIM e o salvar volta', async () => {
    let terminar: (v: { uploaded: string[]; failed: never[] }) => void = () => {}
    h.upload.mockReturnValue(new Promise(r => (terminar = r)))
    await montar()
    expect(salvarRascunho()).not.toBeDisabled()

    await act(async () => {
      fireEvent.change(screen.getByTestId('summary-file-input'), { target: { files: [arquivo('nova.png')] } })
    })
    expect(salvarRascunho()).toBeDisabled()

    await act(async () => terminar({ uploaded: ['https://cdn/nova.webp'], failed: [] }))

    expect(salvarRascunho()).not.toBeDisabled()
    const sexta = screen.getByRole('button', { name: 'Ampliar imagem 6 de 6' })
    expect(sexta.querySelector('img')!.getAttribute('src')).toContain('nova.webp')
  })

  it('envio da variação no ar + envio da galeria terminando ⇒ o salvar CONTINUA desabilitado', async () => {
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm'], position: 0 }],
      product_variants: [
        {
          id: 'v1', product_id: 'p1', option_values: { Tamanho: '3,5 cm' }, name: null, sku: 'SKU-v1',
          price: 50, compare_price: null, stock: 3, weight_kg: null, image_url: null, is_active: true, position: 0,
        },
      ],
    })
    let terminarVariacao: (v: { uploaded: string[]; failed: never[] }) => void = () => {}
    let terminarGaleria: (v: { uploaded: string[]; failed: never[] }) => void = () => {}
    h.upload
      .mockReturnValueOnce(new Promise(r => (terminarVariacao = r)))
      .mockReturnValueOnce(new Promise(r => (terminarGaleria = r)))
    await montar()

    // 1) A foto pela linha da grade (o `VariantImagePicker`, aba Preços).
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Preços & variações/ }), { button: 0 })
    fireEvent.click(await screen.findByRole('button', { name: 'Imagem de 3,5 cm' }))
    await act(async () => {
      fireEvent.change(screen.getByTestId('variant-image-input'), { target: { files: [arquivo('linha.png')] } })
    })
    // 2) Uma foto pelo Resumo, ao mesmo tempo.
    await act(async () => {
      fireEvent.change(screen.getByTestId('summary-file-input'), { target: { files: [arquivo('resumo.png')] } })
    })
    expect(h.upload).toHaveBeenCalledTimes(2)
    expect(salvarRascunho()).toBeDisabled()

    // A galeria termina primeiro: a variação ainda está no ar, e o salvar não pode destravar.
    await act(async () => terminarGaleria({ uploaded: ['https://cdn/resumo.webp'], failed: [] }))
    expect(salvarRascunho()).toBeDisabled()

    await act(async () => terminarVariacao({ uploaded: ['https://cdn/linha.webp'], failed: [] }))
    expect(salvarRascunho()).not.toBeDisabled()
  })
})

// Conserto r1 da verificação da 85. As duas superfícies que enviam (o Resumo e o modal) leem o MESMO
// `useProductImageUpload` da página; o componente desenhar o `progress` que recebe não prova que a
// página o passa. Cada fio é provado aqui, pela página real (M32, M33, M35 da rodada 1).
describe('ADI-03 — o estado único de envio chega ao Resumo e ao modal pela página', () => {
  const arquivo = (nome: string) => new File(['x'], nome, { type: 'image/png' })

  it('envio pelo Resumo ⇒ a linha do arquivo no Resumo; abrir o modal ⇒ a mesma linha e o "Enviando..." da galeria', async () => {
    // O motor dublado emite o progresso do arquivo e segura a promessa: o envio fica no ar.
    h.upload.mockImplementation(
      (files: File[], onProgress: (e: { file: string; size: number; status: string }) => void) => {
        for (const f of files) onProgress({ file: f.name, size: f.size, status: 'uploading' })
        return new Promise(() => {})
      },
    )
    await montar()

    await act(async () => {
      fireEvent.change(screen.getByTestId('summary-file-input'), { target: { files: [arquivo('x.png')] } })
    })

    // M35: a linha só aparece no Resumo se a página lhe passa o progresso do hook.
    const noResumo = within(resumo()).getByRole('list', { name: 'Progresso do envio' })
    expect(within(noResumo).getByText('x.png')).toBeInTheDocument()
    expect(within(noResumo).getByText('enviando')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Editar mídia/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Mídia' })

    // M32: o modal mostra o MESMO progresso, iniciado fora dele.
    const noModal = within(dialog).getByRole('list', { name: 'Progresso do envio' })
    expect(within(noModal).getByText('x.png')).toBeInTheDocument()
    expect(within(noModal).getByText('enviando')).toBeInTheDocument()
    // M33: a área de envio da galeria está no estado "enviando", e não no convite para selecionar.
    expect(within(dialog).getByText('Enviando...')).toBeInTheDocument()
    expect(within(dialog).queryByText(/clique para selecionar/)).toBeNull()
  })
})

// Conserto r1, sonda 1 do verificador (ADI-04): dois lotes que terminam no MESMO tique. A página
// anexava sobre o `form.images` do último render, e o segundo lote escrevia por cima do primeiro —
// a foto ia ao Storage e sumia do formulário, sem aviso.
describe('ADI-04 — dois lotes terminando juntos somam as duas fotos', () => {
  const arquivo = (nome: string) => new File(['x'], nome, { type: 'image/png' })

  it('um envio pelo Resumo e outro pelo modal, resolvidos no mesmo act ⇒ 7 imagens, as duas novas no fim', async () => {
    let terminarResumo: (v: { uploaded: string[]; failed: never[] }) => void = () => {}
    let terminarModal: (v: { uploaded: string[]; failed: never[] }) => void = () => {}
    h.upload
      .mockReturnValueOnce(new Promise(r => (terminarResumo = r)))
      .mockReturnValueOnce(new Promise(r => (terminarModal = r)))
    await montar()

    await act(async () => {
      fireEvent.change(screen.getByTestId('summary-file-input'), { target: { files: [arquivo('resumo.png')] } })
    })
    fireEvent.click(screen.getByRole('button', { name: /^Editar mídia/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Mídia' })
    const inputDoModal = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      fireEvent.change(inputDoModal, { target: { files: [arquivo('modal.png')] } })
    })
    expect(h.upload).toHaveBeenCalledTimes(2)

    await act(async () => {
      terminarResumo({ uploaded: ['https://cdn/resumo.webp'], failed: [] })
      terminarModal({ uploaded: ['https://cdn/modal.webp'], failed: [] })
    })

    expect(screen.getByRole('button', { name: 'Ampliar imagem 1 de 7', hidden: true })).toBeInTheDocument()
    const sexta = screen.getByRole('button', { name: 'Ampliar imagem 6 de 7', hidden: true })
    const setima = screen.getByRole('button', { name: 'Ampliar imagem 7 de 7', hidden: true })
    expect(sexta.querySelector('img')!.getAttribute('src')).toContain('resumo.webp')
    expect(setima.querySelector('img')!.getAttribute('src')).toContain('modal.webp')
  })
})

// Conserto r2 da verificação da 85. R06: a forma funcional de `setFields` mesclando sobre o default
// zerava o nome e o preço a cada envio que terminava — e nenhum caso da página olhava o produto
// depois de um envio. R03: o badge depois do envio só era conferido no hook. R12/R13 (ADI-04): a
// imagem nova é `{ url, alt: null, source: 'upload' }`, conferida POR VALOR no payload gravado.
describe('ADI-04 — depois de um envio, o produto continua o mesmo e a foto nova é gravada como envio', () => {
  const arquivo = (nome: string) => new File(['x'], nome, { type: 'image/png' })

  it('envio pelo Resumo termina ⇒ badge de alteração, nome e preço intactos, e o salvar grava a foto nova por valor', async () => {
    let terminar: (v: { uploaded: string[]; failed: never[] }) => void = () => {}
    h.upload.mockReturnValue(new Promise(r => (terminar = r)))
    await montar()
    expect(screen.queryByText('Alterações não salvas')).toBeNull()

    await act(async () => {
      fireEvent.change(screen.getByTestId('summary-file-input'), {
        target: { files: [arquivo('a.png'), arquivo('b.png')] },
      })
    })
    await act(async () => terminar({ uploaded: ['https://cdn/nova-a.webp', 'https://cdn/nova-b.webp'], failed: [] }))

    // R03: terminar um envio é uma alteração do formulário.
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    // R06: o nome do produto continua no campo.
    expect(screen.getByDisplayValue('Pingente Estrela')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(salvarRascunho())
    })
    const gravado = await waitFor(() => {
      const e = h.diario.find(d => d.op === 'update' && d.table === 'products')
      expect(e).toBeTruthy()
      return e!.payload as Record<string, unknown>
    })

    // R06: o que vai ao banco é o produto, e não o formulário vazio.
    expect(gravado.name).toBe('Pingente Estrela')
    expect(gravado.slug).toBe('pingente-estrela')
    expect(gravado.base_price).toBe(89.9)
    expect(gravado.original_price).toBe(120)
    expect(gravado.weight_kg).toBe(0.05)
    // R12/R13: as cinco de antes intactas, e as novas no fim como envio, sem descrição.
    expect(gravado.images).toEqual([
      ...[1, 2, 3, 4, 5].map(foto),
      { url: 'https://cdn/nova-a.webp', alt: null, source: 'upload' },
      { url: 'https://cdn/nova-b.webp', alt: null, source: 'upload' },
    ])
  })
})

// BUG-20261028-resumo-corta-fatos-e-adicionar-com-fonte-200: a 200 % de fonte o valor "Não controla"
// terminava além da borda do card. jsdom não mede, então a prova é o token exato: cada linha de fato
// embrulha, rótulo e valor podem encolher, e o valor quebra palavra e se alinha à direita.
describe('os fatos do Resumo embrulham com a fonte grande', () => {
  it('cada linha do <dl> é flex-wrap; <dt> e <dd> com min-w-0; <dd> quebra e alinha à direita', async () => {
    h.produto = produtoBase({ stock_policy: 'none' })
    await montar()
    const dl = resumo().querySelector('dl')!
    const linhas = Array.from(dl.children)
    expect(linhas.length).toBeGreaterThanOrEqual(4)
    const tokens = (el: Element) => el.className.split(/\s+/)
    for (const linha of linhas) {
      expect(tokens(linha)).toContain('flex-wrap')
      const dt = linha.querySelector('dt')!
      const dd = linha.querySelector('dd')!
      expect(tokens(dt)).toContain('min-w-0')
      for (const t of ['min-w-0', 'break-words', 'text-right', 'ml-auto']) expect(tokens(dd)).toContain(t)
      // O ícone do rótulo não encolhe (a 200 % ele sumia ao lado de "Peso de envio").
      expect(dt.querySelector('svg')!.getAttribute('class')!.split(/\s+/)).toContain('shrink-0')
    }
  })
})

// BUG-20261028-foco-cai-no-body-quando-a-pendencia-de-imagem-se-resolve: aberto pela pendência
// "Ao menos uma imagem", o modal devolvia o foco a ela — e ela some quando a primeira foto entra.
// O foco caía no <body>. Origem desconectada ⇒ o foco vai ao "Editar mídia" do Resumo.
describe('o foco ao fechar o modal aberto pela pendência que deixou de existir', () => {
  it('produto sem imagem: abrir pela pendência, enviar 1 foto, fechar ⇒ foco no "Editar mídia"', async () => {
    h.produto = produtoBase({ images: [] })
    h.upload.mockResolvedValue({ uploaded: ['https://cdn/primeira.webp'], failed: [] })
    await montar()
    const pendencia = screen.getByRole('button', { name: /Ao menos uma imagem/ })
    pendencia.focus()
    fireEvent.click(pendencia)
    const dialog = await screen.findByRole('dialog', { name: 'Mídia' })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    const input = dialog.querySelector<HTMLInputElement>('input[type="file"]')!
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['x'], 'primeira.png', { type: 'image/png' })] } })
    })
    await waitFor(() => expect(screen.queryByRole('button', { name: /Ao menos uma imagem/, hidden: true })).toBeNull())
    expect(pendencia.isConnected).toBe(false)

    fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /^Editar mídia/ })),
    )
  })

  it('sem enviar nada a pendência continua lá, e o foco volta a ela (o caso de antes não muda)', async () => {
    h.produto = produtoBase({ images: [] })
    await montar()
    const pendencia = screen.getByRole('button', { name: /Ao menos uma imagem/ })
    pendencia.focus()
    fireEvent.click(pendencia)
    const dialog = await screen.findByRole('dialog', { name: 'Mídia' })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(pendencia))
  })
})

// BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor: o Resumo e o modal mostram o MESMO
// progresso. Com os dois falando, o leitor ouviria cada linha duas vezes; com o modal aberto, só a
// região do modal fica visível ao leitor (o Radix esconde o resto da página).
describe('o envio é anunciado uma vez só', () => {
  it('modal fechado: uma região viva com o progresso, a do Resumo; modal aberto: uma, a do modal', async () => {
    let terminar: (v: { uploaded: string[]; failed: never[] }) => void = () => {}
    h.upload.mockImplementation((_files: File[], onProgress: (e: unknown) => void) => {
      onProgress({ file: 'nova.png', size: 1, status: 'uploading' })
      return new Promise(r => (terminar = r))
    })
    await montar()
    await act(async () => {
      fireEvent.change(screen.getByTestId('summary-file-input'), {
        target: { files: [new File(['x'], 'nova.png', { type: 'image/png' })] },
      })
    })
    // As regiões que FALAM (polite) e carregam a linha do arquivo.
    const falando = () =>
      Array.from(document.querySelectorAll<HTMLElement>('[aria-live="polite"]')).filter(r =>
        r.textContent?.includes('nova.png'),
      )
    expect(falando()).toHaveLength(1)
    expect(resumo().contains(falando()[0])).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /^Editar mídia/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Mídia' })
    await waitFor(() => expect(falando()).toHaveLength(1))
    expect(dialog.contains(falando()[0])).toBe(true)

    await act(async () => terminar({ uploaded: ['https://cdn/nova.webp'], failed: [] }))
  })
})
