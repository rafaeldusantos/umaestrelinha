// O editor do Banner principal (feature 41 — `BNR-07`..`BNR-16`, `BNR-47`, `BNR-48`, `BNR-50`).
//
// Os testes rodam pelo CASCO (`HomeSectionEditor`), como os dos vizinhos: "cada banner exige arte,
// descrição e destino **para salvar**" só se prova apertando salvar e vendo que a gravação não
// aconteceu — a recusa vive no caminho de gravação, não num campo vermelho.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HERO_CAROUSEL_MAX_SLIDES,
  HERO_CAROUSEL_SLOTS,
  heroSlideArt,
  type HomeSection,
  type HomeSectionItem,
} from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category'
import { PRODUCT_POOL_KEY } from '@/entities/product'

const upload = vi.hoisted(() => ({ uploadHomeImage: vi.fn() }))
vi.mock('../lib/uploadHomeImage', () => upload)

import HomeSectionEditor from './HomeSectionEditor'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory =>
  ({
    slug: over.slug ?? over.id,
    description: null,
    image_url: null,
    banner_url: null,
    color_accent: null,
    active: true,
    sort_order: 0,
    parent_id: null,
    product_count: 0,
    show_in_menu: false,
    menu_promo: null,
    ...over,
  }) as AdminCategory

const CATALOGO = [
  cat({ id: 'leite', name: 'Joias com leite materno', sort_order: 1 }),
  cat({ id: 'cinzas', name: 'Eternize as cinzas', sort_order: 2 }),
]
const PRODUTOS = [{ id: 'prod-1', name: 'Pingente Gota', slug: 'pingente-gota', is_active: true }]

const slide = (over: Partial<HomeSectionItem> = {}): HomeSectionItem => ({
  id: 'i1',
  section_id: 'carrossel',
  position: 1,
  category_id: 'leite',
  product_id: null,
  href: null,
  image_url: 'https://cdn/arte-computador.webp',
  image_mobile_url: 'https://cdn/arte-celular.webp',
  alt: 'Coleção de leite materno',
  label_snapshot: 'Joias com leite materno',
  ...over,
})

const onSave = vi.fn().mockResolvedValue(null)

/**
 * O palco de React Query, com o POOL semeado (feature 51).
 *
 * O ramo *Produto* do `DestinoDoItem` virou o `ProductSearchField`, que lê o pool compartilhado de
 * `entities/product`. Sem o provedor, abrir esse ramo lança "No QueryClient set" no RENDER, e não
 * na asserção (`L-030`). Semeado e com `staleTime: Infinity`, o render fica síncrono.
 */
const Palco = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(PRODUCT_POOL_KEY, PRODUTOS.map(p => ({ ...p, base_price: 189 })))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const renderEditor = (over: Partial<HomeSection> = {}) => {
  const section: HomeSection = {
    id: 'carrossel',
    type: 'hero_carousel',
    position: 1,
    active: true,
    config: {},
    items: [],
    ...over,
  }
  return render(
    <Palco>
    <HomeSectionEditor
      entry={{
        section,
        renders: true,
        hiddenReason: null,
        items: [],
        droppedCount: 0,
        nestedUnder: null,
      }}
      categories={CATALOGO}
      products={PRODUTOS}
      saving={false}
      onCancel={vi.fn()}
      onSave={onSave}
    />
    </Palco>,
  )
}

const salvar = () => fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
const gravado = () => onSave.mock.calls[0][0] as { config: Record<string, unknown>; items: HomeSectionItem[] }

beforeEach(() => {
  vi.clearAllMocks()
  onSave.mockResolvedValue(null)
  upload.uploadHomeImage.mockResolvedValue({
    url: 'https://cdn/nova.webp',
    error: null,
    warning: null,
  })
})

// ---------------------------------------------------------------------------
// BNR-07, BNR-19, BNR-20 — a largura
// ---------------------------------------------------------------------------

describe('a largura (BNR-18, BNR-19)', () => {
  it('oferece as duas, e nenhuma terceira', () => {
    renderEditor()

    expect(screen.getByTestId('largura-full')).toBeInTheDocument()
    expect(screen.getByTestId('largura-wide')).toBeInTheDocument()
    expect(screen.getAllByTestId(/^largura-/)).toHaveLength(2)
  })

  it('grava a escolhida', async () => {
    renderEditor({ items: [slide()] })

    fireEvent.click(screen.getByTestId('largura-wide'))
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().config).toMatchObject({ width: 'wide' })
  })

  it('sem largura gravada, `full` aparece como a escolhida', () => {
    // O padrão sai de `heroCarouselWidth`, não de um `??` nesta tela: com duas escritas, a loja
    // desenharia uma largura e o painel mostraria outra selecionada.
    renderEditor()
    expect(screen.getByTestId('largura-full').getAttribute('aria-pressed')).toBe('true')
  })

  it('largura desconhecida no `config` mostra `full`, e não nenhuma', () => {
    renderEditor({ config: { width: 'gigante' } as never })
    expect(screen.getByTestId('largura-full').getAttribute('aria-pressed')).toBe('true')
  })
})

// ---------------------------------------------------------------------------
// BNR-07 — os quatro campos do slide
// ---------------------------------------------------------------------------

describe('os campos de um banner (BNR-07)', () => {
  it('oferece as DUAS vagas de arte, com a medida de cada uma', () => {
    renderEditor({ items: [slide()] })

    expect(screen.getByLabelText('Arte do computador do 1º banner')).toBeInTheDocument()
    expect(screen.getByLabelText('Arte do celular do 1º banner')).toBeInTheDocument()
    expect(
      screen.getByText(`${HERO_CAROUSEL_SLOTS.desktop.width} × ${HERO_CAROUSEL_SLOTS.desktop.height} px`),
    ).toBeInTheDocument()
    expect(
      screen.getByText(`${HERO_CAROUSEL_SLOTS.mobile.width} × ${HERO_CAROUSEL_SLOTS.mobile.height} px`),
    ).toBeInTheDocument()
  })

  it('oferece descrição e destino', () => {
    renderEditor({ items: [slide()] })

    expect(screen.getByLabelText('Descrição da imagem')).toBeInTheDocument()
    expect(screen.getByLabelText('Leva para · 1º banner')).toBeInTheDocument()
  })

  it('a miniatura tem a proporção DA VAGA, e as duas vagas não têm a mesma', () => {
    // Ela era `aspect-video` nas duas: a dona conferia o recorte em 16:9 e a loja entregava 3:1 e
    // 1:1. O corte que ela precisa enxergar era justamente o que a miniatura escondia — e nada
    // acusava, porque a foto aparecia.
    renderEditor({ items: [slide()] })

    const computador = screen.getByTestId('miniatura-image_url-0')
    const celular = screen.getByTestId('miniatura-image_mobile_url-0')

    expect(computador.style.aspectRatio).toBe(
      `${HERO_CAROUSEL_SLOTS.desktop.width} / ${HERO_CAROUSEL_SLOTS.desktop.height}`,
    )
    expect(celular.style.aspectRatio).toBe(
      `${HERO_CAROUSEL_SLOTS.mobile.width} / ${HERO_CAROUSEL_SLOTS.mobile.height}`,
    )

    // **Âncora**: se um dia as duas vagas tiverem a mesma proporção, as asserções acima passam a
    // valer com uma única escrita e param de provar que a miniatura lê a SUA vaga.
    expect(
      HERO_CAROUSEL_SLOTS.desktop.width / HERO_CAROUSEL_SLOTS.desktop.height,
      'as duas vagas passaram a ter a mesma proporção — este teste deixou de separar as duas',
    ).not.toBe(HERO_CAROUSEL_SLOTS.mobile.width / HERO_CAROUSEL_SLOTS.mobile.height)

    // A classe fixa de 16:9 não pode voltar por baixo do `style` — ela venceria em nada, mas é o
    // rastro de que alguém reintroduziu a terceira proporção.
    expect(computador.className).not.toContain('aspect-video')
    expect(celular.className).not.toContain('aspect-video')
  })

  it('a arte enviada vai para a vaga certa e é gravada', async () => {
    renderEditor({ items: [slide({ image_mobile_url: null })] })

    const arquivo = new File(['x'], 'celular.webp', { type: 'image/webp' })
    fireEvent.change(screen.getByLabelText('Arte do celular do 1º banner'), {
      target: { files: [arquivo] },
    })

    await waitFor(() => expect(upload.uploadHomeImage).toHaveBeenCalled())
    // A vaga do celular é a que vai para o aviso de proporção: a arte do celular é quadrada e a do
    // computador é 3:1, e cobrar a medida errada mandaria a dona reexportar no tamanho errado —
    // que foi exatamente o que aconteceu enquanto as duas vagas eram suposição.
    expect(upload.uploadHomeImage.mock.calls[0][1]).toEqual(HERO_CAROUSEL_SLOTS.mobile)

    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items[0].image_mobile_url).toBe('https://cdn/nova.webp')
  })

  it('a ordem dos banners é a ordem gravada (BNR-16)', async () => {
    renderEditor({
      items: [
        slide({ id: 'i1', alt: 'primeiro' }),
        slide({ id: 'i2', alt: 'segundo', category_id: 'cinzas' }),
      ],
    })

    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items.map(i => i.alt)).toEqual(['primeiro', 'segundo'])
  })
})

// ---------------------------------------------------------------------------
// BNR-10..BNR-13 — as recusas
// ---------------------------------------------------------------------------

describe('o que impede salvar (BNR-10, BNR-11, BNR-12)', () => {
  it('banner sem arte nenhuma NÃO é gravado, e a tela diz por quê', async () => {
    renderEditor({ items: [slide({ image_url: null, image_mobile_url: null })] })

    salvar()

    await waitFor(() => expect(screen.getByText(/envie a arte/i)).toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()
  })

  it('banner sem descrição NÃO é gravado', async () => {
    renderEditor({ items: [slide({ alt: null })] })

    salvar()

    await waitFor(() => expect(screen.getByText(/descreva a arte/i)).toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()
  })

  it('banner sem destino NÃO é gravado', async () => {
    renderEditor({ items: [slide({ category_id: null, label_snapshot: null })] })

    salvar()

    await waitFor(() => expect(screen.getByText(/Escolha o destino/i)).toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()
  })

  it('banner com arte de UM dispositivo só é gravado normalmente', async () => {
    // O par das recusas acima: a herança de arte é comportamento previsto, não erro.
    renderEditor({ items: [slide({ image_mobile_url: null })] })

    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })
})

describe('o teto de banners (BNR-13, BNR-50)', () => {
  const muitos = (n: number) =>
    Array.from({ length: n }, (_, i) => slide({ id: `i${i}`, alt: `banner ${i}` }))

  it('o botão de acrescentar NÃO é apagado no teto', () => {
    // `disabled` some num atalho de teclado e não diz por quê. A AC pede motivo em texto.
    renderEditor({ items: muitos(HERO_CAROUSEL_MAX_SLIDES) })
    expect(screen.getByTestId('acrescentar-slide')).not.toBeDisabled()
  })

  it('o sétimo banner impede a gravação, com o teto e a saída', async () => {
    renderEditor({ items: muitos(HERO_CAROUSEL_MAX_SLIDES + 1) })

    salvar()

    await waitFor(() =>
      expect(screen.getByTestId('editor-recusa')).toHaveTextContent(
        `Cabem ${HERO_CAROUSEL_MAX_SLIDES} banners neste bloco, e há ${HERO_CAROUSEL_MAX_SLIDES + 1}`,
      ),
    )
    // A saída faz parte da recusa: sem ela a dona lê um teto e não sabe o que fazer com o resto.
    expect(screen.getByTestId('editor-recusa')).toHaveTextContent('segundo bloco “Banner principal”')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('o excedente é AVISADO na tela, e continua apagável', () => {
    // Estado alcançável por escrita direta. Um estado gravado que nenhuma tela mostra é como dado
    // errado sobrevive por meses — e indeletável, porque a tela também não o desenharia.
    renderEditor({ items: muitos(HERO_CAROUSEL_MAX_SLIDES + 2) })

    expect(screen.getByTestId('slides-excedentes')).toHaveTextContent(
      `Cabem ${HERO_CAROUSEL_MAX_SLIDES} banners neste bloco, e há ${HERO_CAROUSEL_MAX_SLIDES + 2}`,
    )
    expect(screen.getByTestId(`slide-${HERO_CAROUSEL_MAX_SLIDES + 1}`)).toBeInTheDocument()
  })

  it('seis banners não disparam aviso nenhum', () => {
    renderEditor({ items: muitos(HERO_CAROUSEL_MAX_SLIDES) })
    expect(screen.queryByTestId('slides-excedentes')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// BNR-47 — o aviso de arte reaproveitada, com o MESMO predicado da loja
// ---------------------------------------------------------------------------

describe('o aviso de arte reaproveitada (BNR-47, AD-030)', () => {
  it('com as duas artes, nenhum aviso e as duas marcadas como enviadas', () => {
    renderEditor({ items: [slide()] })

    expect(screen.getByTestId('arte-image_url-0')).toHaveTextContent('arte do computador · enviada')
    expect(screen.getByTestId('arte-image_mobile_url-0')).toHaveTextContent('arte do celular · enviada')
    expect(screen.queryByTestId(/^arte-reaproveitada-/)).toBeNull()
  })

  it('sem a arte do celular, avisa que a loja vai usar a do computador', () => {
    renderEditor({ items: [slide({ image_mobile_url: null })] })

    expect(screen.getByTestId('arte-image_mobile_url-0')).toHaveTextContent('arte do celular · falta')
    expect(screen.getByTestId('arte-reaproveitada-image_mobile_url-0')).toHaveTextContent(
      'A loja vai reaproveitar a arte do computador.',
    )
  })

  it('sem a arte do computador, avisa o contrário', () => {
    renderEditor({ items: [slide({ image_url: null })] })

    expect(screen.getByTestId('arte-reaproveitada-image_url-0')).toHaveTextContent(
      'A loja vai reaproveitar a arte do celular.',
    )
  })

  it('arte só de ESPAÇO conta como ausente — o painel e a loja dão o mesmo veredito', () => {
    // O caso exato que fez painel e loja discordarem na feature 39: a tela lia truthiness da string
    // crua e `core` apara espaço. Aqui a tela pergunta a `core`, então o veredito é um só.
    const item = slide({ image_mobile_url: '   ' })
    renderEditor({ items: [item] })

    expect(screen.getByTestId('arte-image_mobile_url-0')).toHaveTextContent('arte do celular · falta')
    // E o par: o mesmo veredito, medido direto na função que a loja chama.
    expect(heroSlideArt(item, 'mobile')).toEqual({
      image: 'https://cdn/arte-computador.webp',
      imageReused: true,
    })
  })
})

// ---------------------------------------------------------------------------
// BNR-14, BNR-15, BNR-48 — os avisos e a falha
// ---------------------------------------------------------------------------

describe('o aviso de proporção (BNR-14)', () => {
  it('avisa e GRAVA assim mesmo', async () => {
    // Arte com texto embutido não pode ser recortada em silêncio — mas só a dona sabe se o corte
    // importa naquela peça, então o aviso traz a medida para reexportar em vez de recusar.
    upload.uploadHomeImage.mockResolvedValue({
      url: 'https://cdn/torta.webp',
      error: null,
      warning: 'Esta arte é 1:1 e a vaga é 2,67:1 — o tamanho recomendado é 1440 × 540 px.',
    })
    renderEditor({ items: [slide()] })

    fireEvent.change(screen.getByLabelText('Arte do computador do 1º banner'), {
      target: { files: [new File(['x'], 'a.webp', { type: 'image/webp' })] },
    })

    await waitFor(() =>
      expect(screen.getByTestId('recado-image_url-0')).toHaveTextContent('1440 × 540 px'),
    )

    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items[0].image_url).toBe('https://cdn/torta.webp')
  })
})

describe('a falha de envio (BNR-15)', () => {
  it('mostra o motivo e NÃO escreve no rascunho', async () => {
    upload.uploadHomeImage.mockResolvedValue({
      url: null,
      error: 'A imagem tem 12 MB e o limite é 5 MB.',
      warning: null,
    })
    renderEditor({ items: [slide()] })

    fireEvent.change(screen.getByLabelText('Arte do computador do 1º banner'), {
      target: { files: [new File(['x'], 'a.webp', { type: 'image/webp' })] },
    })

    await waitFor(() =>
      expect(screen.getByTestId('recado-image_url-0')).toHaveTextContent('12 MB'),
    )

    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    // A arte anterior continua lá: sem URL não há o que gravar, e apagar a que existia por causa de
    // um envio que falhou seria perder trabalho da dona.
    expect(gravado().items[0].image_url).toBe('https://cdn/arte-computador.webp')
  })

  it('o resto do rascunho sobrevive à falha', async () => {
    upload.uploadHomeImage.mockResolvedValue({ url: null, error: 'falhou', warning: null })
    renderEditor({ items: [slide()] })

    fireEvent.change(screen.getByLabelText('Descrição da imagem'), {
      target: { value: 'texto que a dona digitou' },
    })
    fireEvent.change(screen.getByLabelText('Arte do computador do 1º banner'), {
      target: { files: [new File(['x'], 'a.webp', { type: 'image/webp' })] },
    })

    await waitFor(() => expect(screen.getByTestId('recado-image_url-0')).toBeInTheDocument())
    expect(screen.getByLabelText('Descrição da imagem')).toHaveValue('texto que a dona digitou')
  })
})

describe('o destino apagado é nomeado (BNR-48)', () => {
  it('diz QUAL coleção se perdeu, e que a arte fica guardada', () => {
    renderEditor({
      items: [slide({ category_id: null, label_snapshot: 'Prata 925' })],
    })

    expect(screen.getByTestId('slide-perdido-0')).toHaveTextContent('“Prata 925” foi apagado.')
    expect(screen.getByTestId('slide-perdido-0')).toHaveTextContent('a arte fica guardada aqui')
  })

  it('banner sem destino e SEM rótulo congelado não é chamado de apagado', () => {
    // "Ainda não escolhi" e "perdi o que tinha" são estados diferentes, e o `label_snapshot` é a
    // única coisa que os distingue depois do `set null`.
    renderEditor({ items: [slide({ category_id: null, label_snapshot: null })] })
    expect(screen.queryByTestId('slide-perdido-0')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// A lista vazia
// ---------------------------------------------------------------------------

describe('o bloco sem banner nenhum (BNR-29)', () => {
  it('a tela diz que ele não aparece na loja', () => {
    renderEditor({ items: [] })
    expect(screen.getByTestId('carrossel-vazio')).toHaveTextContent('não aparece na loja')
  })

  it('lista vazia NÃO impede salvar — a dona pode montar o bloco em duas sessões', async () => {
    renderEditor({ items: [] })

    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })
})

// ---------------------------------------------------------------------------
// BNR-08, BNR-09 — o destino, e o rótulo congelado junto com ele
// ---------------------------------------------------------------------------

describe('o destino do banner (BNR-08, BNR-09)', () => {
  it('oferece os três modos: coleção, peça e endereço da loja', () => {
    // **Retargetado na feature 51.** O ramo da peça continua, e o que saiu do `<select>` foi o
    // CATÁLOGO: uma `<option>` por produto, sem busca, que a dona precisava rolar inteira (`A-12`,
    // `BUS-07`). O par abaixo mede as duas metades — o ramo está, a lista não.
    renderEditor({ items: [slide()] })
    const seletor = screen.getByLabelText('Leva para · 1º banner') as HTMLSelectElement
    const opcoes = Array.from(seletor.querySelectorAll('option'))
    const textos = opcoes.map(o => o.textContent)

    expect(textos).toContain('Coleção · Joias com leite materno')
    expect(textos).toContain('Produto…')
    expect(textos).toContain('Outro endereço da loja…')

    expect(textos).not.toContain('Produto · Pingente Gota')
    expect(opcoes.map(o => o.value).some(v => v.startsWith('prod:'))).toBe(false)
  })

  it('escolher a coleção grava UM destino e zera os outros dois', () => {
    renderEditor({ items: [slide({ href: null })] })

    fireEvent.change(screen.getByLabelText('Leva para · 1º banner'), {
      target: { value: 'cat:cinzas' },
    })
    salvar()

    return waitFor(() => {
      expect(gravado().items[0].category_id).toBe('cinzas')
      expect(gravado().items[0].product_id).toBeNull()
      expect(gravado().items[0].href).toBeNull()
    })
  })

  it('escolher a peça troca o destino, sem deixar a coleção pendurada', () => {
    renderEditor({ items: [slide()] })

    fireEvent.change(screen.getByLabelText('Leva para · 1º banner'), {
      target: { value: '__produto' },
    })
    fireEvent.change(screen.getByLabelText('Leva para · 1º banner · qual peça'), {
      target: { value: 'gota' },
    })
    fireEvent.click(screen.getByTestId('peca-prod-1'))
    salvar()

    return waitFor(() => {
      expect(gravado().items[0].product_id).toBe('prod-1')
      expect(gravado().items[0].category_id).toBeNull()
      // `BUS-19` — o slug e o rótulo são congelados JUNTO com a escolha, também no carrossel.
      expect(gravado().items[0].product_slug).toBe('pingente-gota')
      expect(gravado().items[0].label_snapshot).toBe('Pingente Gota')
    })
  })

  it('o rótulo do destino é CONGELADO junto com a escolha (BNR-09)', () => {
    // Não é desnormalização preguiçosa: depois do `on delete set null` não há de onde ler o nome da
    // coleção apagada, e é ele que faz o painel dizer "«Prata 925» foi apagado" em vez de "este
    // banner perdeu o destino". Congelar DEPOIS seria tarde.
    renderEditor({ items: [slide({ label_snapshot: null })] })

    fireEvent.change(screen.getByLabelText('Leva para · 1º banner'), {
      target: { value: 'cat:cinzas' },
    })
    salvar()

    return waitFor(() => expect(gravado().items[0].label_snapshot).toBe('Eternize as cinzas'))
  })

  it('o endereço livre zera as duas FKs', () => {
    renderEditor({ items: [slide()] })

    fireEvent.change(screen.getByLabelText('Leva para · 1º banner'), {
      target: { value: '__outro' },
    })
    fireEvent.change(screen.getByLabelText('Endereço do banner'), {
      target: { value: '/como-enviar' },
    })
    salvar()

    return waitFor(() => {
      expect(gravado().items[0].href).toBe('/como-enviar')
      expect(gravado().items[0].category_id).toBeNull()
      expect(gravado().items[0].product_id).toBeNull()
    })
  })
})
