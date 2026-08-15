// T31 — a curadoria das fileiras de coleção (feature 24, `HOME-31`..`HOME-36`).
//
// Como nos outros editores, os testes rodam pelo CASCO: "voltar ao automático apaga os itens" só se
// prova apertando salvar e olhando o que foi gravado — a tela pode dizer o que quiser.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_HOME_COMPOSITION, type HomeSection, type HomeSectionItem } from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category'
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

const CATALOGO: AdminCategory[] = [
  cat({ id: 'leite', name: 'Joias com leite materno', sort_order: 1, product_count: 42, banner_url: 'https://cdn/leite.webp' }),
  cat({ id: 'cinzas', name: 'Eternize as cinzas', sort_order: 2, product_count: 28 }),
  cat({ id: 'cabelo', name: 'Mecha de cabelo', sort_order: 3, product_count: 15 }),
  cat({ id: 'black', name: 'Coleção Black Friday', sort_order: 4, active: false }),
]

const fileirasBase = DEFAULT_HOME_COMPOSITION.find(s => s.type === 'collection_rows')!

const item = (over: Partial<HomeSectionItem> & { id: string }): HomeSectionItem => ({
  section_id: 'collection_rows',
  position: 1,
  category_id: null,
  product_id: null,
  href: null,
  image_url: null,
  alt: null,
  label_snapshot: null,
  ...over,
})

const ESCOLHIDAS: HomeSectionItem[] = [
  item({ id: 'i1', position: 1, category_id: 'leite', label_snapshot: 'Joias com leite materno' }),
  item({ id: 'i2', position: 2, category_id: 'cinzas', label_snapshot: 'Eternize as cinzas' }),
  item({ id: 'i3', position: 3, category_id: 'black', label_snapshot: 'Coleção Black Friday' }),
]

const onSave = vi.fn().mockResolvedValue(null)

const renderEditor = (over: Partial<HomeSection> = {}) => {
  const section: HomeSection = {
    ...fileirasBase,
    ...over,
    config: { ...fileirasBase.config, ...(over.config ?? {}) },
  }
  return render(
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
      products={[]}
      saving={false}
      onCancel={vi.fn()}
      onSave={onSave}
    />,
  )
}

const salvar = () => fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
const gravado = () =>
  onSave.mock.calls[0][0] as {
    config: Record<string, unknown>
    items: { category_id: string | null }[]
  }

beforeEach(() => {
  vi.clearAllMocks()
  onSave.mockResolvedValue(null)
})

describe('CollectionRowsEditor — sem curadoria, a Home se arruma sozinha (HOME-31)', () => {
  it('seção sem itens abre no modo Automático, e a lista de escolhidas nem existe', () => {
    renderEditor({ items: [] })

    expect(screen.getByRole('radio', { name: /Automático/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /Eu escolho/ })).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByText('Coleções escolhidas')).toBeNull()
  })

  it('a opção explica que coleção nova entra sozinha — é a diferença entre os dois modos', () => {
    renderEditor({ items: [] })

    expect(screen.getByRole('radio', { name: /Automático/ })).toHaveTextContent(
      'As 4 primeiras coleções na ordem de Categorias. Coleção nova entra sozinha.',
    )
    expect(screen.getByRole('radio', { name: /Eu escolho/ })).toHaveTextContent(
      'Você define quais e em que ordem. Coleção nova só entra se você acrescentar.',
    )
  })

  it('salvar no automático grava lista vazia — e nenhuma flag de modo', async () => {
    renderEditor({ items: [] })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items).toEqual([])
    expect(gravado().config).toEqual(fileirasBase.config)
  })
})

describe('CollectionRowsEditor — com curadoria, a lista é dela (HOME-32)', () => {
  it('seção com itens abre em “Eu escolho”, com as coleções na ordem gravada', () => {
    renderEditor({ items: ESCOLHIDAS })

    expect(screen.getByRole('radio', { name: /Eu escolho/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Coleção da 1ª fileira')).toHaveValue('leite')
    expect(screen.getByLabelText('Coleção da 2ª fileira')).toHaveValue('cinzas')
    expect(screen.getByLabelText('Coleção da 3ª fileira')).toHaveValue('black')
  })

  it('acrescentar uma coleção grava o destino E o rótulo congelado no mesmo gesto', async () => {
    renderEditor({ items: [] })

    fireEvent.click(screen.getByRole('radio', { name: /Eu escolho/ }))
    fireEvent.click(screen.getByRole('button', { name: /Acrescentar coleção/ }))
    fireEvent.change(screen.getByLabelText('Coleção da 1ª fileira'), {
      target: { value: 'cabelo' },
    })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items).toEqual([
      expect.objectContaining({ category_id: 'cabelo', label_snapshot: 'Mecha de cabelo' }),
    ])
  })

  it('arrastar uma fileira grava a ordem NOVA, e é ela que a loja desenha', async () => {
    renderEditor({ items: ESCOLHIDAS })

    fireEvent.dragStart(screen.getByTestId('fileira-1'))
    fireEvent.drop(screen.getByTestId('fileira-0'))
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items.map(i => i.category_id)).toEqual(['cinzas', 'leite', 'black'])
  })

  it('fileira sem coleção é recusada ao salvar, dizendo qual', async () => {
    renderEditor({ items: [ESCOLHIDAS[0], item({ id: 'novo', position: 2 })] })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      '2ª fileira: escolha a coleção.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('coleção apagada é nomeada pelo rótulo congelado na recusa', async () => {
    renderEditor({ items: [item({ id: 'i9', category_id: null, label_snapshot: 'Prata 925' })] })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      '1ª fileira: “Prata 925” foi apagada.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('CollectionRowsEditor — voltar ao automático APAGA os itens (HOME-33)', () => {
  it('o botão limpa a lista e grava zero itens, sem flag nenhuma no config', async () => {
    renderEditor({ items: ESCOLHIDAS })

    fireEvent.click(screen.getByRole('button', { name: /Voltar ao automático/ }))
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items).toEqual([])
    // A curadoria é a PRESENÇA de itens. Uma flag `mode: 'auto'` aqui seria o segundo dono do mesmo
    // dado, com um estado (`manual` + zero itens) que a loja não sabe distinguir.
    expect(gravado().config).toEqual(fileirasBase.config)
  })

  it('depois de voltar, a tela está no modo Automático e a lista sumiu', () => {
    renderEditor({ items: ESCOLHIDAS })

    fireEvent.click(screen.getByRole('button', { name: /Voltar ao automático/ }))

    expect(screen.getByRole('radio', { name: /Automático/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByLabelText('Coleção da 1ª fileira')).toBeNull()
  })

  it('marcar o rádio “Automático” faz o mesmo que o botão — apaga a lista', async () => {
    renderEditor({ items: ESCOLHIDAS })

    fireEvent.click(screen.getByRole('radio', { name: /Automático/ }))
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items).toEqual([])
  })
})

describe('CollectionRowsEditor — escolhida fora do ar (HOME-34, HOME-36)', () => {
  it('diz quantas das escolhidas saíram do ar', () => {
    renderEditor({ items: ESCOLHIDAS })

    expect(screen.getByTestId('fileiras-fora-do-ar')).toHaveTextContent('1 das 3 saiu do ar')
  })

  it('a linha da que saiu está marcada, com o motivo', () => {
    renderEditor({ items: ESCOLHIDAS })

    expect(screen.getByTestId('fileira-motivo-2')).toHaveTextContent(
      '“Coleção Black Friday” desativada em Categorias · a loja pula esta fileira',
    )
    expect(screen.queryByTestId('fileira-motivo-0')).toBeNull()
  })

  it('a vaga que sobra fica VAZIA — a tela diz o número e diz por que não completa', () => {
    renderEditor({ items: ESCOLHIDAS })

    const nota = screen.getByTestId('fileiras-vaga-vazia')
    expect(nota).toHaveTextContent('A vaga que sobra fica vazia')
    expect(nota).toHaveTextContent('Você pediu 4 e uma escolhida saiu do ar, então a Home mostra 2.')
    expect(nota).toHaveTextContent('entraria na sua vitrine algo que você não escolheu')
  })

  it('coleção que saiu do ar NÃO some do seletor — a fileira não troca de destino sozinha', () => {
    renderEditor({ items: ESCOLHIDAS })

    expect(screen.getByLabelText('Coleção da 3ª fileira')).toHaveValue('black')
    expect(
      screen.getByRole('option', { name: 'Coleção Black Friday (fora do ar)' }),
    ).toBeInTheDocument()
  })

  it('todas fora do ar ⇒ a tela diz que a seção não vai aparecer (HOME-36)', () => {
    renderEditor({ items: [ESCOLHIDAS[2]] })

    expect(screen.getByTestId('fileiras-vaga-vazia')).toHaveTextContent(
      'Nenhuma das escolhidas está no ar, então esta seção não vai aparecer.',
    )
  })

  it('sem nenhuma fora do ar, não há aviso nenhum', () => {
    renderEditor({ items: [ESCOLHIDAS[0], ESCOLHIDAS[1]] })

    expect(screen.queryByTestId('fileiras-fora-do-ar')).toBeNull()
    expect(screen.queryByTestId('fileiras-vaga-vazia')).toBeNull()
  })
})

describe('CollectionRowsEditor — reordenar aqui NÃO mexe em categories.sort_order (HOME-35)', () => {
  it('a tela afirma isso, com todas as letras', () => {
    renderEditor({ items: ESCOLHIDAS })

    expect(screen.getByTestId('fileiras-sort-order')).toHaveTextContent(
      'Reordenar aqui não mexe na barra do topo — a ordem do menu continua sendo a de Categorias.',
    )
  })

  it('reordenar não escreve em categoria nenhuma: a `sort_order` de todas fica igual', async () => {
    const antes = JSON.parse(JSON.stringify(CATALOGO))
    renderEditor({ items: ESCOLHIDAS })

    fireEvent.dragStart(screen.getByTestId('fileira-2'))
    fireEvent.drop(screen.getByTestId('fileira-0'))
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    // A ordem da Home mudou…
    expect(gravado().items.map(i => i.category_id)).toEqual(['black', 'leite', 'cinzas'])
    // …e o catálogo, que é a fonte da barra do topo, não foi tocado.
    expect(CATALOGO).toEqual(antes)
    expect(CATALOGO.map(c => c.sort_order)).toEqual([1, 2, 3, 4])
  })

  it('o que vai para o banco não carrega `sort_order` — a ordem daqui é a `position` do item', async () => {
    renderEditor({ items: ESCOLHIDAS })

    fireEvent.dragStart(screen.getByTestId('fileira-1'))
    fireEvent.drop(screen.getByTestId('fileira-0'))
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    for (const gravadoItem of gravado().items) {
      expect(gravadoItem).not.toHaveProperty('sort_order')
    }
  })
})

describe('CollectionRowsEditor — quantas fileiras (HOME-42)', () => {
  it('o + e o − mexem no limite, e o gravado é o número da tela', async () => {
    renderEditor({ items: ESCOLHIDAS })

    fireEvent.click(screen.getByRole('button', { name: 'Uma fileira a mais' }))
    fireEvent.click(screen.getByRole('button', { name: 'Uma fileira a mais' }))
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().config).toMatchObject({ limit: 6 })
  })

  it('a faixa aceita sai de `sectionMeta`, e o limite fora dela é recusado ao salvar', async () => {
    renderEditor({ items: ESCOLHIDAS })

    expect(screen.getByText('de 1 a 8 — acima disso a Home vira rolagem sem fim')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Quantas fileiras'), { target: { value: '9' } })
    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      '“Fileiras de coleção” aceita de 1 a 8 itens.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })
})
