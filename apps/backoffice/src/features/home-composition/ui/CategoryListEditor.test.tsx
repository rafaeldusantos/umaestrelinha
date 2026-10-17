// O editor da **Lista de categorias** (feature 64 — `LCT-15`..`LCT-25`).
//
// Duas camadas, e cada uma prova uma coisa diferente:
//
// - **o editor sozinho**, com um palco que guarda o rascunho como o `HomeSectionEditor` guarda:
//   campos, ordem, os quatro estados de uma coleção, o teto, o arrasto e o envio de arte;
// - **o casco de verdade** (`HomeSectionEditor` + `SECTION_EDITORS`), no fim do arquivo: a recusa
//   ao salvar só se prova apertando salvar e vendo que a gravação não aconteceu — ela mora no
//   registro, não num campo vermelho.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CATEGORY_LIST_ART,
  CATEGORY_LIST_ITEM_TITLE_MAX,
  CATEGORY_LIST_MAX_ITEMS,
  CATEGORY_LIST_TITLE_MAX,
  type HomeSection,
  type HomeSectionConfig,
  type ResolvedSection,
} from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category'

const upload = vi.hoisted(() => ({ uploadHomeImage: vi.fn() }))
vi.mock('../lib/uploadHomeImage', () => upload)

import CategoryListEditor from './CategoryListEditor'
import HomeSectionEditor from './HomeSectionEditor'
import { SECTION_EDITORS } from './sectionEditors'
import { emptyDraftItem, type DraftItem } from '../model/sectionDraft'
import { categoryListRefusal } from '../model/sectionRefusals'

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
  cat({ id: 'cinzas', name: 'Eternize as cinzas', sort_order: 2 }),
  cat({ id: 'leite', name: 'Joias com leite materno', sort_order: 1 }),
  cat({ id: 'penas', name: 'Penas', sort_order: 3, active: false }),
]

const SECAO: HomeSection = {
  id: 'lista',
  type: 'category_grid',
  position: 1,
  active: false,
  config: {},
  items: [],
}

const pronto = (over: Partial<DraftItem> = {}): DraftItem => ({
  ...emptyDraftItem(),
  category_id: 'leite',
  image_url: 'https://cdn/leite.png',
  label_snapshot: 'Joias com leite materno',
  ...over,
})

/** O último rascunho que o editor entregou. */
let ultimo: { config: HomeSectionConfig; items: DraftItem[] } = { config: {}, items: [] }

/** O palco: guarda o rascunho como o casco guarda, e repassa as mudanças ao editor. */
const Palco = ({ inicio, config: config0 = {} }: { inicio: DraftItem[]; config?: HomeSectionConfig }) => {
  const [config, setConfig] = useState<HomeSectionConfig>(config0)
  const [items, setItems] = useState<DraftItem[]>(inicio)
  ultimo = { config, items }
  return (
    <CategoryListEditor
      section={SECAO}
      config={config}
      onConfigChange={p => setConfig(c => ({ ...c, ...p }))}
      items={items}
      onItemsChange={setItems}
      categories={CATALOGO}
      products={[]}
    />
  )
}

const desenha = (inicio: DraftItem[] = [], config: HomeSectionConfig = {}) =>
  render(<Palco inicio={inicio} config={config} />)

const abrir = (indice: number) => fireEvent.click(screen.getByTestId(`categoria-resumo-${indice}`))

beforeEach(() => {
  vi.clearAllMocks()
  ultimo = { config: {}, items: [] }
  upload.uploadHomeImage.mockResolvedValue({ url: 'https://cdn/nova.png', error: null, warning: null })
})

// ---------------------------------------------------------------------------
// LCT-15, LCT-16 — o bloco novo e o título da seção
// ---------------------------------------------------------------------------

describe('o bloco recém-acrescentado (LCT-15)', () => {
  it('abre com "Título da seção" vazio, a lista vazia explicada e "Adicionar categoria"', () => {
    desenha()

    expect(screen.getByLabelText('Título da seção')).toHaveValue('')
    expect(screen.getByTestId('lista-vazia')).toHaveTextContent('Nenhuma categoria ainda.')
    expect(screen.getByRole('button', { name: /Adicionar categoria/ })).toBeEnabled()
    expect(screen.queryByTestId('categoria-0')).toBeNull()
  })
})

describe('o título da seção (LCT-16)', () => {
  it('o `maxLength` e o contador leem a MESMA constante de `core`', () => {
    desenha([], { title: 'Escolha pelo material' })

    expect(screen.getByLabelText('Título da seção')).toHaveAttribute(
      'maxLength',
      String(CATEGORY_LIST_TITLE_MAX),
    )
    expect(screen.getByTestId('contador-titulo-secao')).toHaveTextContent(
      `21/${CATEGORY_LIST_TITLE_MAX}`,
    )
    // E a constante é a da spec: sem esta linha as duas acima passariam com ela zerada.
    expect(CATEGORY_LIST_TITLE_MAX).toBe(60)
  })

  it('o apoio diz o que acontece com o campo vazio', () => {
    desenha()
    expect(screen.getByText('Vazio, a fileira aparece sem título.')).toBeInTheDocument()
  })

  it('digitar escreve no `config`', () => {
    desenha()
    fireEvent.change(screen.getByLabelText('Título da seção'), { target: { value: 'Pelo material' } })
    expect(ultimo.config.title).toBe('Pelo material')
  })
})

// ---------------------------------------------------------------------------
// LCT-17, LCT-18, LCT-22 — o item aberto
// ---------------------------------------------------------------------------

describe('o item aberto (LCT-17)', () => {
  it('o item novo nasce ABERTO, e só ele', () => {
    desenha([pronto()])
    fireEvent.click(screen.getByRole('button', { name: /Adicionar categoria/ }))

    expect(ultimo.items).toHaveLength(2)
    expect(screen.getByTestId('categoria-aberta-1')).toBeInTheDocument()
    expect(screen.queryByTestId('categoria-aberta-0')).toBeNull()
  })

  it('os campos, NESTA ordem: Imagem · Leva para a coleção · Título · Remover', () => {
    desenha([pronto()])
    abrir(0)

    const corpo = screen.getByTestId('categoria-aberta-0')
    const campos = Array.from(corpo.querySelectorAll('[data-campo]')).map(n =>
      n.getAttribute('data-campo'),
    )
    expect(campos).toEqual(['imagem', 'colecao', 'titulo'])

    const remover = within(corpo).getByRole('button', { name: /Remover categoria/ })
    const titulo = corpo.querySelector('[data-campo="titulo"]')!
    expect(titulo.compareDocumentPosition(remover) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a orientação da arte é a da spec, literal', () => {
    desenha([pronto()])
    abrir(0)
    expect(
      screen.getByText(
        'Arte circular em PNG com cantos transparentes, quadrada (800 × 800 px). A loja mostra a imagem como ela é — sem fundo e sem recorte.',
      ),
    ).toBeInTheDocument()
  })

  it('a imagem é rotulada como opcional, e a tela diz o que a loja mostra sem ela', () => {
    desenha([pronto()])
    abrir(0)
    expect(screen.getByText('Imagem (opcional)')).toBeInTheDocument()
    expect(
      screen.getByText(
        'A imagem é opcional. Sem ela, a loja mostra um círculo na cor da loja com o nome da categoria.',
      ),
    ).toBeInTheDocument()
  })

  it('"Remover imagem" limpa a arte do rascunho e mantém o resto do item', () => {
    desenha([pronto({ title: 'Leite' })])
    abrir(0)
    fireEvent.click(screen.getByRole('button', { name: /Remover imagem/ }))

    expect(ultimo.items[0]).toMatchObject({ image_url: null, category_id: 'leite', title: 'Leite' })
    // Sem arte, não há o que remover.
    expect(screen.queryByRole('button', { name: /Remover imagem/ })).toBeNull()
  })

  it('sem arte, "Remover imagem" não é oferecido', () => {
    desenha([pronto({ image_url: null })])
    abrir(0)
    expect(screen.queryByRole('button', { name: /Remover imagem/ })).toBeNull()
  })

  it('o campo da arte aceita só PNG, JPEG e WebP (LCT-17)', () => {
    desenha([pronto()])
    abrir(0)
    expect(screen.getByLabelText('Imagem da 1ª categoria')).toHaveAttribute(
      'accept',
      'image/png,image/jpeg,image/webp',
    )
  })

  it('o título do item: `maxLength` e contador de `core`, e o apoio', () => {
    desenha([pronto({ title: 'Cinzas' })])
    abrir(0)

    expect(screen.getByLabelText('Título embaixo do círculo')).toHaveAttribute(
      'maxLength',
      String(CATEGORY_LIST_ITEM_TITLE_MAX),
    )
    expect(screen.getByTestId('contador-titulo-0')).toHaveTextContent(
      `6/${CATEGORY_LIST_ITEM_TITLE_MAX}`,
    )
    expect(CATEGORY_LIST_ITEM_TITLE_MAX).toBe(28)
    expect(screen.getByText('Vazio, usa o nome da coleção.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Título embaixo do círculo'), {
      target: { value: 'Leite materno' },
    })
    expect(ultimo.items[0].title).toBe('Leite materno')
  })

  it('a coleção oferece só as ATIVAS, por `sort_order`', () => {
    desenha([pronto({ category_id: null, label_snapshot: null })])
    abrir(0)

    const opcoes = Array.from(
      (screen.getByLabelText('Leva para a coleção') as HTMLSelectElement).options,
    ).map(o => o.textContent)
    expect(opcoes).toEqual(['Escolha uma coleção', 'Joias com leite materno', 'Eternize as cinzas'])
  })

  it('a coleção desativada já escolhida aparece "(fora do ar)", e continua selecionada', () => {
    desenha([pronto({ category_id: 'penas', label_snapshot: 'Penas' })])
    abrir(0)

    const select = screen.getByLabelText('Leva para a coleção') as HTMLSelectElement
    expect(select.value).toBe('penas')
    expect(select.selectedOptions[0].textContent).toBe('Penas (fora do ar)')
  })

  it('escolher a coleção congela o nome NO MESMO gesto (LCT-18)', () => {
    desenha([pronto({ category_id: null, label_snapshot: null })])
    abrir(0)

    fireEvent.change(screen.getByLabelText('Leva para a coleção'), { target: { value: 'cinzas' } })
    expect(ultimo.items[0]).toMatchObject({
      category_id: 'cinzas',
      label_snapshot: 'Eternize as cinzas',
    })
  })

  it('só um aberto por vez: abrir outro fecha o primeiro', () => {
    desenha([pronto(), pronto({ category_id: 'cinzas' })])
    abrir(0)
    expect(screen.getByTestId('categoria-aberta-0')).toBeInTheDocument()

    abrir(1)
    expect(screen.getByTestId('categoria-aberta-1')).toBeInTheDocument()
    expect(screen.queryByTestId('categoria-aberta-0')).toBeNull()

    // E clicar no aberto o fecha.
    abrir(1)
    expect(screen.queryByTestId('categoria-aberta-1')).toBeNull()
  })

  it('"Remover categoria" tira o item do rascunho', () => {
    desenha([pronto(), pronto({ category_id: 'cinzas' })])
    abrir(0)
    fireEvent.click(screen.getByRole('button', { name: /Remover categoria/ }))
    expect(ultimo.items.map(i => i.category_id)).toEqual(['cinzas'])
  })
})

// ---------------------------------------------------------------------------
// LCT-17, LCT-25 — a arte
// ---------------------------------------------------------------------------

describe('o envio da arte (LCT-17, LCT-25)', () => {
  const enviar = (indice = 0) =>
    fireEvent.change(screen.getByLabelText(`Imagem da ${indice + 1}ª categoria`), {
      target: { files: [new File(['x'], 'circulo.png', { type: 'image/png' })] },
    })

  it('sobe pelo caminho da Home, com a vaga QUADRADA da Lista, e grava a URL no item', async () => {
    desenha([pronto({ image_url: null })])
    abrir(0)
    enviar()

    await waitFor(() => expect(ultimo.items[0].image_url).toBe('https://cdn/nova.png'))
    expect(upload.uploadHomeImage.mock.calls[0][1]).toEqual(CATEGORY_LIST_ART)
    expect(CATEGORY_LIST_ART).toEqual({ width: 800, height: 800 })
  })

  it('arte fora da proporção entra COM o aviso — avisa, não recusa', async () => {
    upload.uploadHomeImage.mockResolvedValue({
      url: 'https://cdn/larga.png',
      error: null,
      warning: 'A arte não é quadrada.',
    })
    desenha([pronto({ image_url: null })])
    abrir(0)
    enviar()

    await waitFor(() => expect(ultimo.items[0].image_url).toBe('https://cdn/larga.png'))
    expect(screen.getByTestId('recado-0')).toHaveTextContent('A arte não é quadrada.')
  })

  it('falha de envio vira recado e NÃO muda o rascunho', async () => {
    upload.uploadHomeImage.mockResolvedValue({ url: null, error: 'Não foi possível enviar.', warning: null })
    const antes = pronto({ image_url: 'https://cdn/antiga.png', title: 'Cinzas' })
    desenha([antes])
    abrir(0)
    enviar()

    await waitFor(() => expect(screen.getByTestId('recado-0')).toHaveTextContent('Não foi possível enviar.'))
    expect(ultimo.items[0]).toEqual(antes)
  })
})

// ---------------------------------------------------------------------------
// LCT-22, LCT-23 — o item fechado e os quatro estados
// ---------------------------------------------------------------------------

describe('o item fechado (LCT-22, LCT-23)', () => {
  it('a miniatura é a arte inteira sobre o neutro do painel — sem recorte', () => {
    desenha([pronto()])
    const mini = screen.getByTestId('miniatura-0')
    const t = mini.className.split(/\s+/)

    expect(mini).toHaveAttribute('src', 'https://cdn/leite.png')
    expect(t).toEqual(expect.arrayContaining(['object-contain', 'bg-muted']))
    expect(t).not.toContain('rounded-full')
    expect(t).not.toContain('object-cover')
  })

  it('o rótulo é o de `core`: título > nome da coleção', () => {
    desenha([pronto({ title: 'Leite materno' }), pronto({ category_id: 'cinzas' })])
    expect(screen.getByTestId('categoria-resumo-0')).toHaveTextContent('Leite materno')
    expect(screen.getByTestId('categoria-resumo-1')).toHaveTextContent('Eternize as cinzas')
  })

  it('o rótulo segue a precedência de `core` também para um `alt` de escrita direta', () => {
    // O editor nunca grava `alt`, mas a loja o lê antes do nome; a linha tem de dizer o mesmo.
    desenha([pronto({ alt: 'Joias de leite' })])
    expect(screen.getByTestId('categoria-resumo-0')).toHaveTextContent('Joias de leite')
  })

  it('estado 1 — ainda não escolhida: "Escolha a coleção", sem aviso', () => {
    desenha([pronto({ category_id: null, label_snapshot: null })])
    const destino = screen.getByTestId('categoria-destino-0')
    expect(destino).toHaveTextContent('Escolha a coleção')
    expect(destino.className).not.toContain('text-estrelinha-admin-amber')
  })

  it('estado 2 — apagada: nomeia pelo `label_snapshot`, no tom de aviso', () => {
    desenha([pronto({ category_id: null, label_snapshot: 'Pelos de pet' })])
    const destino = screen.getByTestId('categoria-destino-0')
    expect(destino).toHaveTextContent('A coleção Pelos de pet foi apagada — não aparece na loja')
    expect(destino.className).toContain('text-estrelinha-admin-amber')
    // O nome congelado também é o rótulo do item.
    expect(screen.getByTestId('categoria-resumo-0')).toHaveTextContent('Pelos de pet')
  })

  it('estado 2 — apagada também quando o id não está mais no catálogo', () => {
    desenha([pronto({ category_id: 'sumiu', label_snapshot: 'Dentes de leite' })])
    expect(screen.getByTestId('categoria-destino-0')).toHaveTextContent(
      'A coleção Dentes de leite foi apagada — não aparece na loja',
    )
  })

  it('estado 3 — DESATIVADA: nomeia a coleção e diz onde se resolve, no tom de aviso', () => {
    desenha([pronto({ category_id: 'penas', label_snapshot: 'Penas' })])
    const destino = screen.getByTestId('categoria-destino-0')
    expect(destino).toHaveTextContent(
      'A coleção Penas está desativada em Categorias — não aparece na loja',
    )
    expect(destino.className).toContain('text-estrelinha-admin-amber')
  })

  it('estado 4 — no ar: "Coleção · <nome>", sem aviso', () => {
    desenha([pronto()])
    const destino = screen.getByTestId('categoria-destino-0')
    expect(destino).toHaveTextContent('Coleção · Joias com leite materno')
    expect(destino.className).not.toContain('text-estrelinha-admin-amber')
  })
})

// ---------------------------------------------------------------------------
// LCT-20 — o teto
// ---------------------------------------------------------------------------

describe('o teto de 24 (LCT-20)', () => {
  const lista = (n: number) => Array.from({ length: n }, () => pronto())

  it(`com ${CATEGORY_LIST_MAX_ITEMS} itens o botão fica indisponível E o motivo aparece em texto`, () => {
    desenha(lista(CATEGORY_LIST_MAX_ITEMS))

    expect(screen.getByRole('button', { name: /Adicionar categoria/ })).toBeDisabled()
    expect(screen.getByText('Até 24 categorias por bloco.')).toBeVisible()
    expect(CATEGORY_LIST_MAX_ITEMS).toBe(24)
  })

  it('com 23 o botão funciona e o motivo não aparece — o teto é o 24º, não antes', () => {
    desenha(lista(CATEGORY_LIST_MAX_ITEMS - 1))

    expect(screen.queryByText('Até 24 categorias por bloco.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Adicionar categoria/ }))
    expect(ultimo.items).toHaveLength(CATEGORY_LIST_MAX_ITEMS)
    // E ao chegar nele, o botão para.
    expect(screen.getByRole('button', { name: /Adicionar categoria/ })).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// LCT-21 — o arrasto
// ---------------------------------------------------------------------------

describe('a ordem por arrasto (LCT-21)', () => {
  it('soltar o terceiro sobre o primeiro leva a nova ordem ao rascunho', () => {
    desenha([
      pronto({ category_id: 'leite' }),
      pronto({ category_id: 'cinzas' }),
      pronto({ category_id: 'penas' }),
    ])

    fireEvent.dragStart(screen.getByTestId('categoria-2'))
    fireEvent.dragOver(screen.getByTestId('categoria-0'))
    fireEvent.drop(screen.getByTestId('categoria-0'))

    expect(ultimo.items.map(i => i.category_id)).toEqual(['penas', 'leite', 'cinzas'])
  })
})

// ---------------------------------------------------------------------------
// LCT-23, AD-019 — nada aqui desenha a fileira
// ---------------------------------------------------------------------------

describe('o editor não desenha a loja (LCT-23)', () => {
  const fonte = readFileSync(resolve(__dirname, 'CategoryListEditor.tsx'), 'utf8')
  const codigo = fonte.replace(/\r\n/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')

  it('âncora: o arquivo lido é o editor', () => {
    expect(codigo).toContain('const CategoryListEditor')
  })

  it('nenhuma mecânica de trilho, nenhum iframe', () => {
    expect(codigo).not.toMatch(/(?<![-\w])snap-|scroll-snap|<iframe/)
  })

  it('nenhuma classe de movimento sem par — e nenhuma, de fato', () => {
    // Sem `transition-*`/`animate-*` o editor fica fora do escopo de `animacaoRespeitaMovimento`.
    expect(codigo).not.toMatch(/(?<![-\w:])(?:transition|animate)(?:-[\w-]+)?(?![-\w])/)
  })
})

// ---------------------------------------------------------------------------
// LCT-15, LCT-19, LCT-20 — pelo CASCO de verdade (`HomeSectionEditor` + `SECTION_EDITORS`)
// ---------------------------------------------------------------------------

describe('pelo casco: o registro monta o editor e a recusa barra a gravação (LCT-19, LCT-20)', () => {
  const linha = (n: number, over: Partial<HomeSection['items'][number]> = {}) => ({
    id: `i${n}`,
    section_id: 'lista',
    position: n,
    category_id: 'leite',
    product_id: null,
    href: null,
    image_url: `https://cdn/c${n}.png`,
    image_mobile_url: null,
    alt: null,
    title: null,
    label_snapshot: 'Joias com leite materno',
    ...over,
  })

  const montarCasco = (items: HomeSection['items'] = []) => {
    const onSave = vi.fn().mockResolvedValue(null)
    render(
      <HomeSectionEditor
        entry={
          {
            section: { ...SECAO, items },
            renders: false,
            hiddenReason: null,
            items: [],
            droppedCount: 0,
            nestedUnder: null,
          } as unknown as ResolvedSection
        }
        categories={CATALOGO}
        products={[]}
        saving={false}
        onCancel={vi.fn()}
        onSave={onSave}
      />,
    )
    return onSave
  }

  const salvar = () => fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
  const recusa = () => screen.queryByTestId('editor-recusa')?.textContent ?? ''

  it('o registro tem a entrada, com o editor e a recusa do painel', () => {
    expect(SECTION_EDITORS.category_grid?.Body).toBe(CategoryListEditor)
    expect(SECTION_EDITORS.category_grid?.refusal).toBe(categoryListRefusal)
  })

  it('abrir a seção pelo casco monta a Lista de categorias, vazia, como nasce (LCT-15)', () => {
    montarCasco()
    expect(screen.getByLabelText('Título da seção')).toHaveValue('')
    expect(screen.getByTestId('lista-vazia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Adicionar categoria/ })).toBeEnabled()
  })

  it('sem imagem GRAVA — a arte é opcional, e o item vai sem `image_url`', async () => {
    const onSave = montarCasco([linha(0), linha(1, { image_url: null, title: 'Cinzas do pet' })])
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(recusa()).toBe('')
    const gravado = onSave.mock.calls[0][0] as { items: DraftItem[] }
    expect(gravado.items[1]).toMatchObject({ image_url: null, title: 'Cinzas do pet' })
  })

  it('sem coleção: a frase com a posição, e nenhuma gravação', async () => {
    const onSave = montarCasco([linha(0, { category_id: null, label_snapshot: null })])
    salvar()

    await waitFor(() => expect(recusa()).toContain('A 1ª categoria está sem coleção.'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('acima do teto (escrita direta): recusa também na gravação', async () => {
    const onSave = montarCasco(
      Array.from({ length: CATEGORY_LIST_MAX_ITEMS + 1 }, (_, n) => linha(n)),
    )
    salvar()

    await waitFor(() => expect(recusa()).toContain(`Até ${CATEGORY_LIST_MAX_ITEMS} categorias por bloco`))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('o par: rascunho válido GRAVA, com o título indo junto', async () => {
    // Sem este caso, as três recusas acima passariam num casco que nunca grava nada.
    const onSave = montarCasco([linha(0, { title: 'Leite' })])
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(recusa()).toBe('')
    const gravado = onSave.mock.calls[0][0] as { items: DraftItem[] }
    expect(gravado.items[0]).toMatchObject({ category_id: 'leite', title: 'Leite' })
  })
})
