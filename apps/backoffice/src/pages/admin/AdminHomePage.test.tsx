// `/admin/home` — a tela (feature 24).
//
// As ACs provadas aqui são as duas da T25 mais as três que a tela junta: falha de LEITURA é
// superfície explícita com "Tentar de novo" e nunca lista vazia (`HOME-14`); em 390px a tela
// ALTERNA `Seções | Prévia` em vez de espremer as duas colunas (`HOME-15`); e ligar, reordenar e
// acrescentar chegam ao hook com o payload certo (`HOME-08`, `HOME-10`, `HOME-11`).
//
// O dublê do hook é o que permite provar **o que foi para o banco** sem subir Supabase.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { RADIX_POINTER_DOWN, enableRadixSelectInJsdom } from '@/test/radix'
import { DEFAULT_HOME_COMPOSITION } from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

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
  cat({ id: 'leite', name: 'Joias com leite materno', sort_order: 1, banner_url: 'leite.webp' }),
  cat({ id: 'cinzas', name: 'Eternize as cinzas', sort_order: 2, banner_url: 'cinzas.webp' }),
  cat({ id: 'cabelo', name: 'Mecha de cabelo', sort_order: 3 }),
  cat({ id: 'pet', name: 'Pelo de pet', sort_order: 4 }),
]

const hook = vi.hoisted(() => ({
  fetchSections: vi.fn(),
  createSection: vi.fn().mockResolvedValue({ error: null, id: 'nova' }),
  updateSectionConfig: vi.fn().mockResolvedValue(null),
  setSectionActive: vi.fn().mockResolvedValue(null),
  deleteSection: vi.fn().mockResolvedValue(null),
  reorderSectionsTo: vi.fn().mockResolvedValue(null),
  curateSection: vi.fn().mockResolvedValue(null),
}))

const state = vi.hoisted(() => ({
  sections: [] as unknown[],
  loading: false,
  error: null as string | null,
}))

const toastMock = vi.hoisted(() => vi.fn())

vi.mock('@/entities/home', () => ({
  useAdminHomeSections: () => ({
    sections: state.sections,
    loading: state.loading,
    error: state.error,
    ...hook,
  }),
}))

vi.mock('@/entities/category', () => ({
  useAdminCategories: () => ({ categories: CATALOGO, loading: false, error: null }),
}))

// O catálogo de peças, como a página o recebe. `slug` e `is_active` são obrigatórios desde a
// feature 50: é por eles que o painel decide se uma peça escolhida está no ar, e é o `slug` que a
// escolha congela para a prévia (`DST-24`).
const PECAS = vi.hoisted(() => [
  { id: 'p1', name: 'Pingente Gota', slug: 'pingente-gota', is_active: true },
  { id: 'p2', name: 'Colar de Cinzas', slug: 'colar-de-cinzas', is_active: true },
  { id: 'p3', name: 'Broche Pena', slug: 'broche-pena', is_active: false },
])

vi.mock('@/entities/product', () => ({
  useAdminProducts: () => ({ products: PECAS, loading: false }),
}))

vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: toastMock }))

/**
 * O palco, dublado — e é o dublê que torna as ACs da prévia **mais** verificáveis do que eram.
 *
 * Antes da feature 25 a prévia era um desenho do painel, e dava para asserir o contorno pela classe
 * CSS. Agora ela é a loja num iframe, e jsdom não carrega o documento dele: asserir o contorno aqui
 * seria asserir dentro de outro app. A responsabilidade **desta página** é outra e é exatamente esta
 * — entregar ao palco a composição certa e o realce certo. Quem prova que o `postMessage` sai com a
 * origem certa é `usePreviewBridge.test.tsx`; quem prova que a loja desenha o contorno é
 * `HomeRendererPreview.test.tsx`, na loja.
 */
vi.mock('@/features/home-composition/ui/HomeLivePreview', () => ({
  default: ({
    sections,
    highlightId,
  }: {
    sections: {
      id: string
      config?: { title_line1?: string; title?: string }
      items?: { product_slug?: string | null }[]
    }[]
    highlightId: string | null
  }) => (
    <div
      data-testid="palco-previa"
      data-highlight={highlightId ?? ''}
      data-secoes={sections.map(s => s.id).join(',')}
      data-titulos={sections.map(s => s.config?.title_line1 ?? s.config?.title ?? '').join('|')}
      // Feature 50: o palco precisa expor os slugs que recebeu, senão `DST-24` — "a prévia mostra a
      // peça escolhida antes de salvar" — não tem como ser asserido nesta camada. O dublê mostra o
      // que a página entregou; quem prova que a LOJA desenha é a suíte dela.
      data-slugs={sections
        .flatMap(s => s.items ?? [])
        .map(i => i.product_slug)
        .filter(Boolean)
        .join(',')}
    >
      {/*
        O dublê monta um `<iframe>` de verdade porque `VIV-03` é sobre ELE.
        A AC não é "a prévia continua na tela" — é "é o MESMO elemento". Um `<div>` provaria a
        identidade de um nó qualquer; o que remonta e recarrega a loja é o iframe, e é a identidade
        dele que precisa sobreviver a uma gravação. Quem carrega o documento da loja de verdade é
        `HomeLivePreview`, provado na suíte dele.
      */}
      <iframe data-testid="palco-iframe" title="Prévia da loja" />
    </div>
  ),
}))

import AdminHomePage from './AdminHomePage'

/**
 * As DUAS rotas, montando o MESMO componente (T30).
 *
 * É assim que a tela roda de verdade, e é a única montagem em que a AC central do editor pode ser
 * provada: se o teste montasse `AdminHomePage` solto, a navegação não trocaria coluna nenhuma e a
 * pergunta "a prévia remonta?" não teria como ser feita.
 */
beforeAll(enableRadixSelectInJsdom)

const renderPage = (initial = '/admin/home') =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/admin/home" element={<AdminHomePage />} />
        <Route path="/admin/home/:sectionId" element={<AdminHomePage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  state.sections = DEFAULT_HOME_COMPOSITION.map(s => ({ ...s }))
  state.loading = false
  state.error = null
})

describe('AdminHomePage — a tela junta lista, bandeja e prévia', () => {
  it('mostra as duas colunas, cada uma com o próprio conteúdo', () => {
    renderPage()
    expect(within(screen.getByTestId('coluna-secoes')).getByText('Seções da Home')).toBeInTheDocument()
    expect(within(screen.getByTestId('coluna-previa')).getByTestId('palco-previa')).toBeInTheDocument()
  })

  // PRV-12 — a inversão. As larguras de antes eram lista 748 / prévia 380, e é o número da prévia
  // que impedia qualquer representação de desktop.
  // FOCO-12 — a coluna de edição subiu de 380 para **440** na feature 47: em 380 as legendas
  // embrulhavam em três linhas e os dois campos de uma linha não cabiam lado a lado.
  // E de 440 para **560**: em 440 os pares `sm:grid-cols-2` dos editores davam colunas
  // de ~180px, o `<input type="file">` nativo não encolhia até lá, e a coluna — que declara
  // `overflow-y-auto`, o que promove o outro eixo a `auto` junto — ganhava rolagem HORIZONTAL.
  it('o rail tem 560px e vem PRIMEIRO; o palco ocupa o resto', () => {
    const { container } = renderPage()
    const grade = container.querySelector('.grid') as HTMLElement

    expect(grade.className).toContain('lg:grid-cols-[560px_minmax(0,1fr)]')
    const colunas = Array.from(grade.children)
    expect(colunas[0]).toBe(screen.getByTestId('coluna-secoes'))
    expect(colunas[1]).toBe(screen.getByTestId('coluna-previa'))
  })

  it('a bandeja fica DENTRO do cartão da lista, não num modal', () => {
    renderPage()
    const coluna = screen.getByTestId('coluna-secoes')
    expect(within(coluna).getByText('Blocos que você pode acrescentar')).toBeInTheDocument()
    expect(within(coluna).getByTestId('bloco-collection_feature')).toBeInTheDocument()
  })
})

describe('AdminHomePage — falha de leitura é superfície explícita (HOME-14)', () => {
  it('mostra o erro e o botão "Tentar de novo" — nunca uma lista vazia sem explicação', () => {
    state.error = 'permission denied for table home_sections'
    state.sections = []
    renderPage()

    const surface = screen.getByTestId('home-erro')
    expect(surface).toHaveTextContent('Não foi possível carregar as seções da Home')
    expect(surface).toHaveTextContent('permission denied for table home_sections')
    expect(within(surface).getByRole('button', { name: /Tentar de novo/ })).toBeInTheDocument()
  })

  it('"Tentar de novo" refaz a leitura', () => {
    state.error = 'network'
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(hook.fetchSections).toHaveBeenCalled()
  })

  it('sem erro, nenhuma superfície de erro aparece', () => {
    renderPage()
    expect(screen.queryByTestId('home-erro')).toBeNull()
  })
})

describe('AdminHomePage — 390px alterna Seções | Prévia (HOME-15)', () => {
  it('as abas existem só abaixo de `lg` — no desktop as duas colunas cabem', () => {
    renderPage()
    expect(screen.getByTestId('abas-mobile').className).toContain('lg:hidden')
  })

  it('começa em Seções: a prévia fica escondida no celular e visível no desktop', () => {
    renderPage()
    expect(screen.getByTestId('coluna-secoes').className).not.toContain('hidden')
    expect(screen.getByTestId('coluna-previa').className).toContain('hidden lg:block')
  })

  it('trocar para Prévia esconde a lista — as duas NÃO ficam lado a lado no celular', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Prévia' }))
    expect(screen.getByTestId('coluna-previa').className).not.toContain('hidden')
    expect(screen.getByTestId('coluna-secoes').className).toContain('hidden lg:block')
  })

  it('cada aba tem 44px de alvo e diz qual está ativa', () => {
    renderPage()
    const secoes = screen.getByRole('button', { name: 'Seções' })
    expect(secoes.className).toContain('min-h-11')
    expect(secoes).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Prévia' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('AdminHomePage — o que chega ao banco', () => {
  it('ligar/desligar manda id e estado', async () => {
    renderPage()
    fireEvent.click(within(screen.getByTestId('secao-newsletter')).getByRole('switch'))
    await waitFor(() => expect(hook.setSectionActive).toHaveBeenCalledWith('newsletter', false))
  })

  it('acrescentar um bloco chama o hook com o tipo escolhido', async () => {
    renderPage()
    fireEvent.click(screen.getByTestId('bloco-collection_feature'))
    await waitFor(() => expect(hook.createSection).toHaveBeenCalledWith('collection_feature'))
  })

  it('arrastar grava posições absolutas só das linhas que mudaram', async () => {
    renderPage()
    fireEvent.drop(screen.getByTestId('secao-hero'), {
      dataTransfer: { getData: () => 'newsletter', setData: vi.fn() },
    })
    await waitFor(() => expect(hook.reorderSectionsTo).toHaveBeenCalled())
    const [moves] = hook.reorderSectionsTo.mock.calls[0] as [{ id: string; position: number }[]]
    expect(moves[0]).toEqual({ id: 'newsletter', position: 1 })
    expect(moves.every(m => typeof m.position === 'number')).toBe(true)
  })

  it('falha de gravação vira toast com a mensagem do banco, e a tela não é remontada', async () => {
    hook.setSectionActive.mockResolvedValueOnce({ message: 'permission denied' })
    renderPage()
    fireEvent.click(within(screen.getByTestId('secao-newsletter')).getByRole('switch'))
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'permission denied', variant: 'destructive' }),
      ),
    )
    // O que a dona já via continua lá — a tela não some por causa de uma gravação recusada.
    expect(screen.getByTestId('secao-newsletter')).toBeInTheDocument()
  })
})

describe('AdminHomePage — a prévia acompanha a seleção (PRV-11)', () => {
  it('o cursor sobre uma linha aponta o bloco dela', () => {
    renderPage()
    fireEvent.mouseEnter(screen.getByTestId('secao-trending_tags'))
    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-highlight', 'trending_tags')
  })

  it('sair da linha apaga o realce', () => {
    renderPage()
    fireEvent.mouseEnter(screen.getByTestId('secao-trending_tags'))
    fireEvent.mouseLeave(screen.getByTestId('secao-trending_tags'))
    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-highlight', '')
  })

  it('sem cursor e sem editor, nada é apontado', () => {
    renderPage()
    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-highlight', '')
  })

  it('a seção EM EDIÇÃO vence a que está sob o cursor', () => {
    renderPage('/admin/home/newsletter')
    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-highlight', 'newsletter')
  })

  it('PRV-10 — o palco recebe um `onSelect` que abre o editor daquela seção', () => {
    renderPage()
    // O caminho de volta da prévia é o mesmo da lista: navegar para `/admin/home/:id`. Provado aqui
    // pela porta que a página oferece, e não pelo `postMessage` — esse é de `usePreviewBridge`.
    fireEvent.click(screen.getByRole('button', { name: /Abrir Chips de tema/ }))
    expect(screen.getByTestId('editor-secao')).toHaveAttribute('data-section', 'trending_tags')
  })
})

// ───────────────────────────────────────────────────────────────────────────
// DST-02, DST-16, DST-24 — a fiação do bloco Produtos em destaque (feature 50)
// ───────────────────────────────────────────────────────────────────────────
//
// Provado **pela página**, e não montando o editor à mão: o que estes casos medem é o FIO — a página
// entregando `products` a três consumidores (o editor, o seletor e a derivação). Um teste que
// montasse `FeaturedProductsEditor` diretamente provaria o editor e **nada** sobre a fiação, que é
// exatamente o defeito que a verificação da `41` e da `44` achou duas vezes.

describe('Produtos em destaque — o editor novo monta pela rota (DST-02)', () => {
  const comBloco = (items: unknown[] = []) => [
    ...DEFAULT_HOME_COMPOSITION.map(s => ({ ...s })),
    {
      id: 'destaques',
      type: 'product_carousel',
      position: 99,
      active: true,
      config: { title: 'Feitas à mão neste mês' },
      items,
    },
  ]

  const itemDe = (productId: string, nome: string, slug: string | null) => ({
    id: `i-${productId}`,
    section_id: 'destaques',
    position: 1,
    category_id: null,
    product_id: productId,
    product_slug: slug,
    href: null,
    image_url: null,
    image_mobile_url: null,
    alt: null,
    label_snapshot: nome,
  })

  it('abrir `/admin/home/:id` de um `product_carousel` monta o editor de peças', () => {
    state.sections = comBloco()
    renderPage('/admin/home/destaques')

    expect(screen.getByTestId('editor-secao')).toHaveAttribute('data-section', 'destaques')
    expect(screen.getByLabelText('Título do bloco')).toHaveValue('Feitas à mão neste mês')
    expect(screen.getByTestId('apresentacao-slider')).toHaveAttribute('aria-pressed', 'true')
  })

  it('o seletor recebe a LISTA DE PRODUTOS da página — sem ela não há o que escolher', () => {
    // O fio que a `41` provou tarde: as duas pontas existiam e a ligação entre elas, não. Apagar o
    // `products` da chamada do editor deixaria o seletor vazio com a suíte verde.
    state.sections = comBloco()
    renderPage('/admin/home/destaques')

    expect(screen.getByTestId('peca-p1')).toHaveTextContent('Pingente Gota')
    expect(screen.getByTestId('peca-p2')).toHaveTextContent('Colar de Cinzas')
    expect(screen.getByTestId('contador-encontrados')).toHaveTextContent('3 no catálogo')
  })

  it('escolher uma peça leva o `product_slug` até a PRÉVIA, antes de salvar (DST-24)', () => {
    // O percurso inteiro: seletor → rascunho → `applyDraft` → palco. É o caso que reprova se
    // `product_slug` deixar de ser copiado em qualquer um dos três degraus.
    state.sections = comBloco()
    renderPage('/admin/home/destaques')

    fireEvent.click(screen.getByTestId('peca-p1'))

    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-slugs', 'pingente-gota')
  })

  it('a peça despublicada é marcada no editor — o painel diz o que a loja vai pular (DST-16)', () => {
    state.sections = comBloco([itemDe('p3', 'Broche Pena', 'broche-pena')])
    renderPage('/admin/home/destaques')

    expect(screen.getByTestId('peca-fora-do-ar-0')).toHaveTextContent('fora do ar')
  })

  // ── O FIO que faltava ───────────────────────────────────────────────────
  //
  // Os dois casos abaixo são os únicos da suíte que reprovam quando a página deixa de passar
  // `products` a `useAdminResolvedHome`. Sem eles a mutação sobrevivia com 59 verdes — medido —,
  // porque tudo o que se asseria sobre peça fora do ar vinha do `products` que o EDITOR recebe, que
  // é outra ligação. É a assinatura da `41` e da `44`: as duas pontas provadas, e o fio não.

  it('DST-20 — a LISTA diz que o bloco não vai aparecer quando a peça saiu do ar', () => {
    // `p3` é `is_active: false`. O slug embutido CHEGA (o painel lê como admin), então sem o
    // catálogo a página daria a seção como no ar — que é o defeito de `R-02` em uma linha.
    state.sections = comBloco([itemDe('p3', 'Broche Pena', 'broche-pena')])
    renderPage()

    expect(screen.getByTestId('aviso-destaques')).toHaveTextContent('saiu do ar')
  })

  it('e o par: com a peça NO AR, a lista não avisa nada', () => {
    // Sem este caso, a asserção acima seria verdadeira num mundo em que toda peça é dada como fora
    // do ar — que é exatamente o que acontece se `products` chegar vazio.
    state.sections = comBloco([itemDe('p1', 'Pingente Gota', 'pingente-gota')])
    renderPage()

    expect(screen.queryByTestId('aviso-destaques')).toBeNull()
  })

  it('DST-13 — a falha do `insert` DIZ que a lista ficou vazia, e o rascunho fica na tela', async () => {
    // A notícia nasce em `curateSection` (provado em `useAdminHomeSections.test.ts`); aqui se prova
    // que ela **chega inteira à dona** e que o formulário não é limpo — as duas metades da AC.
    const recusa =
      'A lista ficou vazia — as peças foram removidas e as novas não entraram. Salve de novo. ' +
      'Motivo do banco: new row violates row-level security policy'
    hook.curateSection.mockResolvedValueOnce({ message: recusa })
    state.sections = comBloco([itemDe('p1', 'Pingente Gota', 'pingente-gota')])
    renderPage('/admin/home/destaques')

    // A curadoria precisa MUDAR, senão a página nem chama `curateSection` (`DST-14`).
    fireEvent.click(screen.getByTestId('peca-p2'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
    })
    await waitFor(() => expect(hook.curateSection).toHaveBeenCalled())

    const aviso = screen.getByTestId('editor-recusa')
    // A CONSEQUÊNCIA — é ela que não existia: a dona lia o erro do PostgREST e salvava de novo sem
    // saber que a Home já estava sem o bloco.
    expect(aviso).toHaveTextContent('A lista ficou vazia')
    // E o motivo do banco, LITERAL: sem ele ninguém sabe por que não entrou.
    expect(aviso).toHaveTextContent('new row violates row-level security policy')

    // "…e SHALL manter o rascunho na tela para ela salvar de novo" (`HOME-14`). As duas peças
    // escolhidas continuam ali — inclusive a que ela acabou de acrescentar.
    expect(screen.getByLabelText('Título do bloco')).toHaveValue('Feitas à mão neste mês')
    expect(screen.getByTestId('palco-previa')).toHaveAttribute(
      'data-slugs',
      'pingente-gota,colar-de-cinzas',
    )
    expect(screen.queryByText('Salvo')).toBeNull()
  })

  it('o par: gravou a curadoria, nenhuma faixa de recusa aparece', () => {
    // Sem ele, "a tela diz que a lista ficou vazia" seria verdade num mundo em que ela diz isso
    // sempre — inclusive quando gravou.
    state.sections = comBloco([itemDe('p1', 'Pingente Gota', 'pingente-gota')])
    renderPage('/admin/home/destaques')
    fireEvent.click(screen.getByTestId('peca-p2'))
    fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))

    expect(screen.queryByTestId('editor-recusa')).toBeNull()
  })

  it('a bandeja oferece o bloco, e acrescentá-lo chama o hook com o tipo certo (DST-01)', () => {
    renderPage()
    const bloco = screen.getByTestId('bloco-product_carousel')

    expect(bloco).not.toBeDisabled()
    fireEvent.click(bloco)
    expect(hook.createSection).toHaveBeenCalledWith('product_carousel')
  })
})

describe('PRV-09 — a prévia recebe o RASCUNHO, não o que está salvo', () => {
  it('sem editor aberto, a composição é a do banco', () => {
    renderPage()
    const palco = screen.getByTestId('palco-previa')
    expect(palco.getAttribute('data-secoes')?.split(',')).toEqual(
      DEFAULT_HOME_COMPOSITION.map(s => s.id),
    )
  })

  it('digitar no hero muda o que o palco recebe ANTES de salvar', () => {
    renderPage('/admin/home/hero')
    const campo = screen.getByLabelText(/1ª linha/i)

    fireEvent.change(campo, { target: { value: 'O que você guarda,' } })

    expect(screen.getByTestId('palco-previa').getAttribute('data-titulos')).toContain(
      'O que você guarda,',
    )
    // E nada foi gravado — o rascunho é da tela, não do banco.
    expect(hook.updateSectionConfig).not.toHaveBeenCalled()
  })

  it('trocar de seção zera o rascunho — a seção B não herda o que foi digitado na A', () => {
    const { unmount } = renderPage('/admin/home/hero')
    fireEvent.change(screen.getByLabelText(/1ª linha/i), { target: { value: 'Rascunho da A' } })
    unmount()

    renderPage('/admin/home/newsletter')

    expect(screen.getByTestId('palco-previa').getAttribute('data-titulos')).not.toContain(
      'Rascunho da A',
    )
  })
})

describe('T30 — o editor é rota, e a prévia não paga por isso', () => {
  it('a PRÉVIA NÃO REMONTA ao entrar no editor — é a razão de a rota ter este formato (PRV-13)', () => {
    renderPage()
    // O nó do DOM guardado ANTES da navegação. Se `AdminHomePage` desmontasse, o React criaria
    // outro nó e a identidade se perderia — que é exatamente o custo que o editor-como-página-inteira
    // cobraria. Com a prévia sendo um **iframe**, o preço subiu: remontar recarregaria o documento da
    // loja e apagaria o rascunho já entregue.
    const antes = screen.getByTestId('palco-previa')

    fireEvent.click(screen.getByRole('button', { name: /Abrir Chips de tema/ }))

    expect(screen.getByTestId('editor-secao')).toBeInTheDocument()
    expect(screen.getByTestId('palco-previa')).toBe(antes)
  })

  it('a rota troca SÓ a coluna da esquerda: a lista sai, a prévia fica', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Abrir Chips de tema/ }))

    const esquerda = screen.getByTestId('coluna-secoes')
    expect(within(esquerda).getByTestId('editor-secao')).toBeInTheDocument()
    expect(within(esquerda).queryByText('Seções da Home')).toBeNull()
    expect(within(screen.getByTestId('coluna-previa')).getByTestId('palco-previa')).toBeInTheDocument()
  })

  it('o cabeçalho do editor NÃO sangra: a coluna que rola não tem padding para cobrir', () => {
    // A FIAÇÃO, não a peça: quem monta é a página de verdade. `FormPageHeader.test.tsx` prova que
    // `bleed={false}` funciona; sem este caso, alguém podia apagar o `bleed={false}` do
    // `HomeSectionEditor` e a barra de rolagem horizontal voltaria com a suíte verde.
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Abrir Chips de tema/ }))

    const barra = within(screen.getByTestId('editor-secao')).getByRole('navigation', {
      name: 'Trilha',
    }).closest('header') as HTMLElement

    expect(barra).not.toBeNull()
    // Token exato: `-mx-4` contém `mx-4`, e `px-4` é substring de `px-40`.
    expect(barra.className).not.toMatch(/(?:^|\s)-mx-4(?![-\w])/)
    expect(barra.className).toMatch(/(?:^|\s)sticky(?![-\w])/)
  })

  it('o bloco em edição é o apontado na prévia', () => {
    renderPage('/admin/home/newsletter')
    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-highlight', 'newsletter')
  })

  it('sobrevive ao F5: abrir a URL direto já mostra o editor daquela seção', () => {
    renderPage('/admin/home/trending_tags')
    expect(screen.getByTestId('editor-secao')).toHaveAttribute('data-section', 'trending_tags')
    expect(screen.getByRole('heading', { level: 1, name: 'Chips de tema' })).toBeInTheDocument()
  })

  it('a trilha volta para a Home, e `Cancelar` também', () => {
    renderPage('/admin/home/newsletter')
    expect(screen.getByLabelText('Trilha')).toHaveTextContent('Loja')
    expect(screen.getByLabelText('Trilha')).toHaveTextContent('Home')

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Seções da Home')).toBeInTheDocument()
    expect(screen.queryByTestId('editor-secao')).toBeNull()
  })

  it('id que não existe mais cai na lista — link velho não vira tela quebrada', () => {
    renderPage('/admin/home/secao-apagada')
    expect(screen.getByText('Seções da Home')).toBeInTheDocument()
    expect(screen.queryByTestId('editor-secao')).toBeNull()
  })

  it('acrescentar um bloco abre o editor dele', async () => {
    hook.createSection.mockResolvedValueOnce({ error: null, id: 'newsletter' })
    renderPage()
    fireEvent.click(screen.getByTestId('bloco-collection_feature'))
    await waitFor(() => expect(screen.getByTestId('editor-secao')).toBeInTheDocument())
  })

  it('o cabeçalho da tela dá lugar ao do formulário — não há dois títulos', () => {
    renderPage('/admin/home/newsletter')
    expect(screen.queryByRole('button', { name: /Adicionar seção/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Salvar seção/ })).toBeInTheDocument()
  })
})

describe('T30 — a gravação do editor (HOME-14)', () => {
  /**
   * ⚠️ **O caso "salvar volta para a lista" foi VIRADO pela feature 50**, não removido: `VIV-05`
   * manda o editor **permanecer aberto**, e a asserção antiga defendia exatamente o que a AC tira.
   * Ele vive agora em `AdminHomePage — salvar mantém o editor aberto`, no fim deste arquivo, com o
   * `config` gravado asserido do mesmo jeito.
   */

  it('curadoria intocada NÃO é reescrita — `curateSection` apaga e reinsere a lista inteira', async () => {
    renderPage('/admin/home/newsletter')
    fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))

    await waitFor(() => expect(hook.updateSectionConfig).toHaveBeenCalled())
    expect(hook.curateSection).not.toHaveBeenCalled()
  })

  it('falha de gravação diz o motivo E preserva o formulário — o editor não fecha', async () => {
    hook.updateSectionConfig.mockResolvedValueOnce({ message: 'permission denied' })
    renderPage('/admin/home/newsletter')
    fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))

    await waitFor(() =>
      expect(screen.getByTestId('editor-recusa')).toHaveTextContent('permission denied'),
    )
    expect(screen.getByTestId('editor-secao')).toBeInTheDocument()
    expect(screen.queryByText('Seções da Home')).toBeNull()
  })
})

describe('AdminHomePage — enquanto carrega', () => {
  it('mostra o esqueleto, não uma lista vazia', () => {
    state.loading = true
    renderPage()
    expect(screen.queryByTestId('coluna-secoes')).toBeNull()
  })
})

/**
 * `BNR-40`, `BNR-41`, `BNR-44` — **a junção**, e ela existe porque o meio já esteve solto.
 *
 * `deleteSection` viveu uma feature inteira exportada pelo hook e **sem nenhuma tela a consumindo**;
 * ninguém percebeu porque as duas pontas — o hook e a lista — estavam cada uma provada por conta
 * própria. É o mesmo formato do defeito que a verificação da 41 pegou um nível abaixo: peças certas,
 * fio faltando.
 *
 * Por isso estes casos não checam a existência do botão (a lista já faz isso) nem o payload (o hook
 * já faz): eles checam que **apertar o botão chega ao banco**.
 */
describe('AdminHomePage — remover uma seção (BNR-41)', () => {
  const confirmar = (resposta: boolean) =>
    vi.spyOn(window, 'confirm').mockReturnValue(resposta)

  /**
   * Remove uma seção **pela linha**, que desde a feature 47 é o `⋯` (`FOCO-23`..`FOCO-25`).
   *
   * `pointerDown` e não `click`: o Radix decide a abertura por `pointerType === 'mouse'`, e um
   * `click` cru no jsdom chega sem isso — o menu não abriria e o teste falharia por um motivo que
   * não tem nada a ver com o fio que ele existe para provar.
   */
  const removerPelaLinha = async (id: string) => {
    fireEvent.pointerDown(
      within(screen.getByTestId(`secao-${id}`)).getByLabelText(/^Ações de /),
      RADIX_POINTER_DOWN,
    )
    fireEvent.click(await screen.findByRole('menuitem', { name: /^Remover / }))
  }

  afterEach(() => vi.restoreAllMocks())

  it('o botão Remover da linha chega em `deleteSection`, com o id da seção', async () => {
    confirmar(true)
    renderPage()

    await removerPelaLinha('newsletter')
    await waitFor(() => expect(hook.deleteSection).toHaveBeenCalledWith('newsletter'))
  })

  it('a CHAMADA PRINCIPAL também pode ser removida — é o pedido da feature (BNR-40)', async () => {
    // Sem isto, um recorte por tipo em qualquer camada do caminho passaria: a lista mostra o botão,
    // o hook aceita o id, e o meio decidiria sozinho que o hero é diferente.
    confirmar(true)
    renderPage()

    await removerPelaLinha('hero')
    await waitFor(() => expect(hook.deleteSection).toHaveBeenCalledWith('hero'))
  })

  it('desistir da confirmação NÃO apaga nada', async () => {
    confirmar(false)
    renderPage()

    await removerPelaLinha('newsletter')
    await waitFor(() => expect(window.confirm).toHaveBeenCalled())
    expect(hook.deleteSection).not.toHaveBeenCalled()
  })

  it('a confirmação NOMEIA a seção e avisa que os itens vão junto', async () => {
    // A exclusão leva a curadoria pelo `on delete cascade`. Uma confirmação genérica ("tem certeza?")
    // esconderia justamente a parte que a dona não pode desfazer.
    const confirm = confirmar(false)
    renderPage()

    await removerPelaLinha('newsletter')
    expect(confirm.mock.calls[0][0]).toContain('Newsletter')
    expect(confirm.mock.calls[0][0]).toContain('itens escolhidos')
  })

  it('FOCO-26: o rodapé do EDITOR remove a seção aberta, pelo mesmo caminho', async () => {
    // O fio que falta é sempre o mesmo tipo: `HomeSectionEditor` pode ter o botão e a página pode
    // ter o `handleRemove`, e ninguém ligar os dois. Por isso o caso renderiza a PÁGINA na rota do
    // editor — apagar `onRemove={handleRemove}` de `AdminHomePage.tsx` faz este caso reprovar.
    confirmar(true)
    renderPage('/admin/home/newsletter')

    fireEvent.click(await screen.findByTestId('remover-secao-do-editor'))

    await waitFor(() => expect(hook.deleteSection).toHaveBeenCalledWith('newsletter'))
  })

  it('FOCO-26: a confirmação do editor é a MESMA da lista — nomeia a seção e os itens', async () => {
    const confirm = confirmar(false)
    renderPage('/admin/home/newsletter')

    fireEvent.click(await screen.findByTestId('remover-secao-do-editor'))

    expect(confirm.mock.calls[0][0]).toContain('Newsletter')
    expect(confirm.mock.calls[0][0]).toContain('itens escolhidos')
    expect(hook.deleteSection).not.toHaveBeenCalled()
  })

  it('FOCO-27: a recusa do banco pelo EDITOR também chega com a mensagem dele', async () => {
    const doBanco = 'A Home precisa de pelo menos uma secao ativa, e esta e a ultima.'
    confirmar(true)
    hook.deleteSection.mockResolvedValueOnce({ message: doBanco })
    renderPage('/admin/home/newsletter')

    fireEvent.click(await screen.findByTestId('remover-secao-do-editor'))

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: doBanco, variant: 'destructive' }),
      ),
    )
  })

  it('a recusa do banco vira toast com a mensagem DELE, sem reescrita (BNR-44)', async () => {
    // A frase tem um dono só, e é o trigger. Igualdade e não `contains`: reescrevê-la aqui, mesmo
    // "melhorando-a", criaria a segunda versão da regra que `AD-029` unificou.
    const doBanco = 'A Home precisa de pelo menos uma secao ativa, e esta e a ultima.'
    confirmar(true)
    hook.deleteSection.mockResolvedValueOnce({ message: doBanco })
    renderPage()

    await removerPelaLinha('newsletter')
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: doBanco, variant: 'destructive' }),
      ),
    )
  })

  it('desligar a última ativa NÃO é antecipado pela tela — o toast vem do banco', async () => {
    const doBanco = 'A Home precisa de pelo menos uma secao ativa, e esta e a ultima.'
    hook.setSectionActive.mockResolvedValueOnce({ message: doBanco })
    renderPage()

    fireEvent.click(within(screen.getByTestId('secao-hero')).getByRole('switch'))

    // A gravação ACONTECE — a tela não recusa por conta própria.
    await waitFor(() => expect(hook.setSectionActive).toHaveBeenCalledWith('hero', false))
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ description: doBanco })),
    )
  })
})

/**
 * A grade, lida do disco — features 47 e 48.
 *
 * jsdom devolve 0 para toda medida de layout, então o que dá para travar é a **declaração**. A
 * asserção pelo DOM, acima, prova que a classe chegou ao elemento; esta lê o fonte, porque é aqui
 * que o par altura-da-tela × largura-da-coluna se declara — e é ele que `/admin/menu` copia em
 * `FOCO-13`.
 *
 * A mudança de 2026-09-13 partiu o par em DOIS elementos: a **altura** subiu para a raiz e a **largura** ficou na
 * grade. Por isso são dois extratores, e a régua da altura tem de dizer em qual dos dois ela mora —
 * senão um `lg:h-[calc(…)]` de volta na grade passaria, e o cabeçalho voltaria a ser descontado
 * duas vezes.
 */
describe('AdminHomePage — a grade declarada (FOCO-12, FOCO-14, altura cheia)', () => {
  /**
   * O removedor de comentário — linha e bloco na MESMA varredura.
   *
   * Sem ele a régua casaria MENÇÃO em vez de USO, e foi exatamente o que aconteceu na primeira
   * escrita desta feature: o comentário da página explica que a altura **era** `100vh-11rem`, e
   * `alturaDe` extraía a prosa em vez da declaração — acusando o arquivo que está certo. `[^\n\r]`
   * fecha o comentário de linha antes do `\r`, senão um arquivo com CRLF come a linha seguinte.
   */
  const semComentarios = (texto: string): string =>
    texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

  const fonte = semComentarios(
    readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'AdminHomePage.tsx'), 'utf8'),
  )

  /** O extrator da grade, escrito uma vez e chamado duas: pela asserção e pelo sensor. */
  const gradeDe = (texto: string) =>
    texto.match(/className="grid[^"]*lg:grid-cols-\[[^"]*"/)?.[0] ?? ''

  /** O da raiz: a única declaração da página com `lg:flex-col`. */
  const raizDe = (texto: string) => texto.match(/className="[^"]*lg:flex-col[^"]*"/)?.[0] ?? ''

  const grade = gradeDe(fonte)
  const raiz = raizDe(fonte)

  it('ÂNCORA: a varredura achou a grade E a raiz', () => {
    // Sem ela, um refator que movesse qualquer das duas para `cn()` faria as asserções abaixo
    // passarem sobre string vazia — verde sobre nada.
    expect(grade).not.toBe('')
    expect(grade).toContain('lg:grid-cols-')
    expect(raiz).not.toBe('')
  })

  it('a coluna de edição declara 560px e o palco fica com o resto', () => {
    expect(grade).toContain('lg:grid-cols-[560px_minmax(0,1fr)]')
  })

  it('SENSOR: a declaração de 440px REPROVA na MESMA régua', () => {
    // O sensor tem de passar pelo **extrator**, não comparar dois literais escritos aqui: sem isso
    // ele mediria uma régua parecida com a da asserção, em vez da mesma. Com o fonte sintético, um
    // `gradeDe` quebrado devolve string vazia e as duas asserções abaixo reprovam.
    const fonteAntiga = `<div className="grid gap-6 lg:h-[calc(100vh-11rem)] lg:grid-cols-[440px_minmax(0,1fr)]">`

    expect(gradeDe(fonteAntiga)).not.toBe('')
    expect(gradeDe(fonteAntiga)).not.toContain('lg:grid-cols-[560px_minmax(0,1fr)]')
    expect(gradeDe(fonteAntiga)).toContain('lg:grid-cols-[440px_minmax(0,1fr)]')
  })

  it('a altura mora na RAIZ, e desconta só o `p-6` do `<main>`', () => {
    // `3rem` não é gosto: é o padding vertical do `<main>` do `AdminLayout` (p-6 — 24px em cima,
    // 24 embaixo) e mais nada. Qualquer número maior volta a descontar um cabeçalho ADIVINHADO, e
    // no editor — onde o `PageHeader` nem é renderizado — esse desconto é espaço morto no fim da
    // tela, que foi o defeito relatado.
    expect(raiz).toContain('lg:h-[calc(100vh-3rem)]')
    expect(raiz).toContain('lg:flex')
  })

  it('a grade toma o que sobra, e o `min-h-0` é o que a deixa encolher', () => {
    // Sem `min-h-0` um filho de flex não encolhe abaixo do próprio conteúdo: a grade empurraria a
    // raiz para além da janela e as duas colunas voltariam a rolar com o documento.
    expect(grade).toContain('lg:flex-1')
    expect(grade).toContain('lg:min-h-0')
  })

  it('a altura NÃO volta para a grade — cabeçalho descontado duas vezes é o defeito de origem', () => {
    expect(grade).not.toContain('lg:h-[calc(')
    expect(fonte).not.toContain('100vh-11rem')
  })

  it('SENSOR: o removedor de comentário — a régua mede USO, nunca menção', () => {
    // Esta página CITA a forma antiga em prosa, para explicar por que ela saiu. Sem o removedor,
    // `alturaDe`/`raizDe` extrairiam a citação e a suíte reprovaria o arquivo correto.
    expect(semComentarios('// era lg:h-[calc(100vh-11rem)] aqui\nconst x = 1')).not.toContain('11rem')
    expect(semComentarios('/* lg:h-[calc(100vh-11rem)] */\nconst x = 1')).not.toContain('11rem')
    // Com CRLF, e sem comer a linha seguinte: a declaração de verdade CONTINUA sendo lida.
    expect(semComentarios('// nota\r\n<div className="lg:flex-col">')).toContain('lg:flex-col')
  })

  it('SENSOR: a forma antiga — altura na grade, raiz sem flex — reprova nas MESMAS réguas', () => {
    const fonteAntiga = `  return (
    <div>
      <div className="grid gap-6 lg:h-[calc(100vh-11rem)] lg:grid-cols-[440px_minmax(0,1fr)]">`

    // A raiz não é achada: não há `lg:flex-col` nenhum para extrair — a âncora derrubaria a suíte.
    expect(raizDe(fonteAntiga)).toBe('')
    // E a grade carrega a altura, que é exatamente o que a régua acima recusa.
    expect(gradeDe(fonteAntiga)).toContain('lg:h-[calc(')
    expect(gradeDe(fonteAntiga)).not.toContain('lg:flex-1')
  })

  it('o cabeçalho não encolhe: ele é a medida, e o corpo é que se ajusta', () => {
    // Sem `shrink-0` o `PageHeader` é um filho de flex como outro qualquer: numa janela baixa ele
    // cederia altura antes da grade, e o título sairia espremido em vez de a prévia encolher.
    expect(fonte).toMatch(/<PageHeader\s+className="shrink-0"/)
  })

  it('FOCO-14: a página NÃO lê o estado do trilho — a largura tem um dono só', () => {
    // Se ela importasse de `admin-layout`, a coluna poderia encolher ao expandir a navegação, e a
    // largura passaria a ter dois donos: o widget do layout e esta tela.
    expect(fonte).not.toContain('admin-layout')
    expect(fonte).not.toContain('useNavRail')
    expect(fonte).not.toContain('isFocusRoute')
  })
})

// ───────────────────────────────────────────────────────────────────────────
// VIV-01, VIV-03, VIV-05, VIV-06, VIV-11, VIV-12 — o painel para de recarregar (feature 50)
// ───────────────────────────────────────────────────────────────────────────
//
// **A AC central é `VIV-03`, e só uma asserção a prova: IDENTIDADE DE NÓ.** `toBeInTheDocument`
// passa nos dois mundos — o iframe remontado também está presente, e é justamente ele que
// recarrega a loja, perde a rolagem e apaga a prévia. O que separa é `expect(depois).toBe(antes)`.
//
// Quem garante que a releitura não liga `loading` é `useAdminHomeSections.test.ts`, com a leitura
// no ar; aqui se prova a consequência na tela: gravar não desmonta nada.

describe('AdminHomePage — gravar não desmonta a tela (VIV-01, VIV-03, VIV-12)', () => {
  const salvar = () => screen.getByRole('button', { name: /Salvar seção/ })

  it('o `<iframe>` da prévia é o MESMO NÓ depois de salvar — não remonta, não recarrega', async () => {
    renderPage('/admin/home/newsletter')
    const antes = screen.getByTestId('palco-iframe')

    await act(async () => {
      fireEvent.click(salvar())
    })

    await waitFor(() => expect(hook.updateSectionConfig).toHaveBeenCalled())
    // Identidade, não presença: um iframe remontado também estaria "no documento".
    expect(screen.getByTestId('palco-iframe')).toBe(antes)
    expect(screen.getByTestId('palco-previa')).toBe(antes.parentElement)
  })

  it('`VIV-12` — a coluna que ROLA é o mesmo nó: é o que preserva o `scrollTop`', async () => {
    // jsdom devolve 0 para toda medida de layout, então "a rolagem fica onde estava" não tem como
    // ser medida aqui. O que TEM é a causa: `scrollTop` é do elemento, e um elemento desmontado o
    // perde. Identidade do contêiner que declara `overflow-y-auto` é o proxy honesto — e é o mesmo
    // nó que o esqueleto substituiria.
    renderPage('/admin/home/newsletter')
    const coluna = screen.getByTestId('coluna-secoes')
    expect(coluna.className).toContain('lg:overflow-y-auto')

    await act(async () => {
      fireEvent.click(salvar())
    })

    await waitFor(() => expect(hook.updateSectionConfig).toHaveBeenCalled())
    expect(screen.getByTestId('coluna-secoes')).toBe(coluna)
  })

  it('o mesmo vale para ligar uma seção pela lista — a gravação mais comum da tela', async () => {
    renderPage()
    const antes = screen.getByTestId('palco-iframe')

    fireEvent.click(within(screen.getByTestId('secao-newsletter')).getByRole('switch'))

    await waitFor(() => expect(hook.setSectionActive).toHaveBeenCalled())
    expect(screen.getByTestId('palco-iframe')).toBe(antes)
  })

  it('e para remover uma seção pelo editor', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage('/admin/home/newsletter')
    const antes = screen.getByTestId('palco-iframe')

    fireEvent.click(screen.getByTestId('remover-secao-do-editor'))

    await waitFor(() => expect(hook.deleteSection).toHaveBeenCalledWith('newsletter'))
    expect(screen.getByTestId('palco-iframe')).toBe(antes)
  })

  it('depois de salvar, o esqueleto NÃO está na tela — as duas colunas continuam de pé', async () => {
    renderPage('/admin/home/newsletter')

    await act(async () => {
      fireEvent.click(salvar())
    })

    expect(screen.queryByTestId('skeleton-row')).toBeNull()
    expect(screen.getByTestId('coluna-secoes')).toBeInTheDocument()
    expect(screen.getByTestId('coluna-previa')).toBeInTheDocument()
  })

  it('o esqueleto continua aparecendo na PRIMEIRA carga (VIV-11)', () => {
    // O par do caso acima: sem ele, "não mostra esqueleto" seria verdade num mundo em que o
    // esqueleto deixou de existir.
    state.loading = true
    renderPage()
    expect(screen.getAllByTestId('skeleton-row').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('coluna-secoes')).toBeNull()
  })
})

describe('AdminHomePage — a gravação em curso APARECE no botão (VIV-04, ANI-01)', () => {
  const salvar = () => screen.getByRole('button', { name: /Salvar seção/ })

  /*
    ⚠️ **O mutante que a rodada 2 da verificação independente achou.** Trocar `saving={saving}` por
    `saving={false}` na chamada do `HomeSectionEditor` (`AdminHomePage.tsx:359`) deixava a suíte
    inteira do painel verde — 2537 casos. As duas PONTAS estavam provadas (o `FormPageHeader` sabe
    desenhar os três estados; a página sabe calcular o `saving`) e **o FIO entre elas não**: nenhum
    caso desta tela continha a palavra `Salvando`. É a mesma assinatura que reprovou as features
    `41`, `44` e `49`.

    Na prática, com a mutação: durante a gravação o botão nunca diria `Salvando…`, e `Cancelar` e
    `Salvar` continuariam clicáveis — dois cliques, duas gravações.

    O par em repouso existe porque "diz Salvando…" sozinho seria verdade num mundo em que ele diz
    isso SEMPRE.
  */
  it('com a gravação no ar, o botão diz `Salvando…` e as ações ficam travadas', async () => {
    let concluir: (v: unknown) => void = () => {}
    hook.updateSectionConfig.mockReturnValueOnce(
      new Promise(r => {
        concluir = r
      }),
    )

    renderPage('/admin/home/newsletter')

    await act(async () => {
      fireEvent.click(salvar())
    })

    // A gravação não respondeu: é exatamente a janela que a mutação apagava.
    expect(screen.getByTestId('botao-salvando')).toHaveTextContent('Salvando…')
    expect(salvar()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()

    await act(async () => {
      concluir(null)
    })

    expect(screen.queryByTestId('botao-salvando')).toBeNull()
  })

  it('em repouso o botão NÃO diz `Salvando…`, e o rótulo de repouso está à vista', () => {
    renderPage('/admin/home/newsletter')

    expect(screen.queryByTestId('botao-salvando')).toBeNull()
    expect(salvar()).not.toBeDisabled()
    // `invisible` é o que apaga o rótulo de repouso quando há estado por cima; em repouso ele é a
    // única coisa na célula, e precisa estar visível.
    expect(screen.getByTestId('rotulo-de-repouso').className).not.toContain('invisible')
  })
})

describe('AdminHomePage — salvar mantém o editor aberto (VIV-05, VIV-06)', () => {
  const salvar = () => screen.getByRole('button', { name: /Salvar seção/ })

  it('salvar grava o `config` e o editor CONTINUA ABERTO — a lista não volta', async () => {
    // ⚠️ Esta asserção é a INVERSÃO do caso anterior a esta feature, que dizia "volta para a
    // lista". Ela defendia o comportamento que `VIV-05` remove: voltar para a lista era a metade
    // barata do recibo, e custava a seção em que a dona estava a cada gravação. Virada, não apagada.
    renderPage('/admin/home/newsletter')

    await act(async () => {
      fireEvent.click(salvar())
    })

    await waitFor(() => expect(hook.updateSectionConfig).toHaveBeenCalled())
    const [id, config] = hook.updateSectionConfig.mock.calls[0] as [string, Record<string, unknown>]
    expect(id).toBe('newsletter')
    expect(config).toMatchObject({ title: 'Quer saber das novidades?' })

    expect(screen.getByTestId('editor-secao')).toHaveAttribute('data-section', 'newsletter')
    expect(screen.queryByText('Seções da Home')).toBeNull()
  })

  it('o selo vira `Salvo` e some sozinho em ~2 s', async () => {
    vi.useFakeTimers()
    try {
      renderPage('/admin/home/newsletter')
      expect(screen.queryByText('Salvo')).toBeNull()

      await act(async () => {
        fireEvent.click(salvar())
      })
      expect(screen.getByText('Salvo')).toBeInTheDocument()

      // Ainda está lá um instante antes — senão "some em 2 s" seria verdade para qualquer duração.
      act(() => {
        vi.advanceTimersByTime(1900)
      })
      expect(screen.getByText('Salvo')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(screen.queryByText('Salvo')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('mexer num campo depois de salvar devolve o selo de pendência (VIV-06)', async () => {
    renderPage('/admin/home/hero')

    await act(async () => {
      fireEvent.click(salvar())
    })
    expect(screen.getByText('Salvo')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/1ª linha/i), { target: { value: 'Outra chamada' } })

    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    expect(screen.queryByText('Salvo')).toBeNull()
  })

  it('desfazer a digitação dentro dos 2 s NÃO faz o `Salvo` voltar (VIV-06)', async () => {
    // ⚠️ **O mutante que a verificação independente achou.** Apagar `setSalvo(false)` de
    // `handleDraftChange` deixava os 73 casos deste arquivo verdes, porque `isDirty` MASCARAVA: com
    // pendência na tela o `Salvo` não aparece de qualquer jeito, e toda asserção existente era
    // verdadeira nos dois mundos.
    //
    // A janela em que eles diferem é esta: mexer e **desfazer**, dentro dos 2 s. A pendência some
    // (nada está pendente), a máscara some com ela, e sem a linha o `Salvo` reaparece — recibo de
    // uma gravação que não aconteceu.
    vi.useFakeTimers()
    try {
      renderPage('/admin/home/hero')
      const campo = () => screen.getByLabelText(/1ª linha/i) as HTMLInputElement
      const original = campo().value

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
      })
      expect(screen.getByText('Salvo')).toBeInTheDocument()

      fireEvent.change(campo(), { target: { value: 'Outra chamada' } })
      expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()

      // Desfaz. Daqui em diante não há pendência nenhuma para esconder o recibo.
      fireEvent.change(campo(), { target: { value: original } })
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Ainda **dentro** dos 2 s: se o `Salvo` fosse embora aqui por tempo, o caso mediria o timer
      // em vez da linha.
      expect(screen.queryByText('Alterações não salvas')).toBeNull()
      expect(screen.queryByText('Salvo')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('gravação recusada NÃO mostra `Salvo` — o selo é recibo, não otimismo', async () => {
    hook.updateSectionConfig.mockResolvedValueOnce({ message: 'permission denied' })
    renderPage('/admin/home/newsletter')

    await act(async () => {
      fireEvent.click(salvar())
    })

    expect(screen.getByTestId('editor-recusa')).toHaveTextContent('permission denied')
    expect(screen.queryByText('Salvo')).toBeNull()
  })

  it('trocar de seção apaga o `Salvo` — recibo de uma seção não vale para outra', async () => {
    renderPage('/admin/home/newsletter')
    await act(async () => {
      fireEvent.click(salvar())
    })
    expect(screen.getByText('Salvo')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: /Abrir Chips de tema/ }))

    expect(screen.getByTestId('editor-secao')).toHaveAttribute('data-section', 'trending_tags')
    expect(screen.queryByText('Salvo')).toBeNull()
  })
})

describe('R-05 — a releitura não sobrescreve o que a dona digitou', () => {
  it('com o editor ABERTO, uma releitura que traz outro texto não mexe no campo', () => {
    // Antes desta feature a releitura só acontecia com o editor fechado (salvar navegava de volta).
    // Agora ela acontece **enquanto ela digita**, e a semeadura única do rascunho
    // (`useState(() => …)` + `key={sectionId}`) deixa de ser detalhe e vira invariante: trocá-la por
    // um `useEffect` reagindo a `section` apagaria o que ainda não foi salvo.
    renderPage('/admin/home/hero')
    fireEvent.change(screen.getByLabelText(/1ª linha/i), {
      target: { value: 'Digitado pela dona' },
    })

    // A releitura que segue qualquer gravação vizinha: a seção volta do banco com o texto anterior.
    state.sections = DEFAULT_HOME_COMPOSITION.map(s =>
      s.id === 'hero'
        ? { ...s, config: { ...(s.config ?? {}), title_line1: 'O que veio do banco' } }
        : { ...s },
    )
    // Re-renderiza a página SEM trocar de rota — é assim que a releitura chega ao editor aberto.
    fireEvent.click(screen.getByRole('button', { name: 'Prévia' }))

    expect(screen.getByLabelText(/1ª linha/i)).toHaveValue('Digitado pela dona')
    // E a prévia continua mostrando o rascunho, não o que voltou do banco.
    expect(screen.getByTestId('palco-previa').getAttribute('data-titulos')).toContain(
      'Digitado pela dona',
    )
  })

  it('o par: trocar de SEÇÃO recomeça o formulário — é o `key` que faz isso, e ele fica', () => {
    // Sem este caso, "a releitura não sobrescreve" seria verdade num mundo em que o editor nunca
    // lê a seção — inclusive ao abrir outra.
    renderPage('/admin/home/hero')
    fireEvent.change(screen.getByLabelText(/1ª linha/i), { target: { value: 'Digitado' } })

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: /Abrir Chamada principal/ }))

    expect(screen.getByLabelText(/1ª linha/i)).not.toHaveValue('Digitado')
  })
})
