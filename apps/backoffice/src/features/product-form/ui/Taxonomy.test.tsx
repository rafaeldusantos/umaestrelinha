import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import CategoryMultiSelect from './CategoryMultiSelect'
import TagInput from './TagInput'
import { categoryPath, depthOf, flattenTree, parentPath } from '@/entities/category'
import { findSimilarTag, isSameTag, normalizeTag, parseTags } from '../model/normalizeTag'
import { MAX_TAGS, selectionLabel, tagCounterLabel } from '../model/taxonomyLabels'
import type { DbCategory } from '@estrelinha/supabase/types'

// PFM-05 (P1.4 AC 1-4) e PFM-06 (AC 6-11): categorias múltiplas com chips, caminho hierárquico,
// contagem e criar-inline; tags como tokens com dedupe TOLERANTE que sugere e não substitui.

const category = (id: string, name: string, parent_id: string | null = null): DbCategory => ({
  id,
  name,
  slug: id,
  description: null,
  image_url: null,
  banner_url: null,
  color_accent: null,
  active: true,
  sort_order: 0,
  parent_id,
  // Feature 39 — as duas booleanas por superfície e a derivada. Ver `CategoryFormDialog.test.tsx`.
  menu_desktop: false,
  menu_mobile: false,
  show_in_menu: false,
  menu_promo: null,
  menu_banners: null,
  icon: null,
})

const CATEGORIES = [
  category('anime', 'Anime'),
  category('kpop', 'K-Pop'),
  category('girl-groups', 'Girl Groups', 'kpop'),
  category('games', 'Games'),
]

describe('normalizeTag — a chave de comparação (PFM-06 AC 9)', () => {
  it('tira acento', () => {
    expect(normalizeTag('Ação')).toBe('acao')
  })

  it('baixa a caixa', () => {
    expect(normalizeTag('NARUTO')).toBe('naruto')
  })

  it('apara espaço nas pontas e colapsa o do meio', () => {
    expect(normalizeTag('  anos   90  ')).toBe('anos 90')
  })

  it('`Naruto` e `naruto ` são a mesma tag', () => {
    expect(isSameTag('Naruto', 'naruto ')).toBe(true)
  })

  it('tags de fato diferentes não colidem', () => {
    expect(isSameTag('naruto', 'narutinho')).toBe(false)
  })

  it('findSimilarTag acha a colisão sutil e ignora a igualdade exata', () => {
    expect(findSimilarTag('Naruto', ['naruto', 'shonen'])).toBe('naruto')
    expect(findSimilarTag('naruto', ['naruto'])).toBeNull()
  })

  it('parseTags separa por vírgula SEM exigir espaço — tag não tem decimal', () => {
    expect(parseTags('naruto,shonen, anos 90')).toEqual(['naruto', 'shonen', 'anos 90'])
  })

  it('parseTags descarta vazio e duplicata exata', () => {
    expect(parseTags('naruto, , naruto')).toEqual(['naruto'])
  })
})

describe('CategoryMultiSelect — múltipla escolha com chips (P1.4 AC 1-2)', () => {
  /**
   * O dropdown só existe em uso — ele abre no foco do campo. `renderSelect` já entrega a lista
   * aberta porque é sobre ela que quase toda AC fala; `{ closed: true }` para o estado em repouso.
   */
  const renderSelect = (
    over: Partial<React.ComponentProps<typeof CategoryMultiSelect>> & { closed?: boolean } = {},
  ) => {
    const { closed, ...props } = over
    const onChange = vi.fn()
    const onCreateCategory = vi.fn()
    render(
      <CategoryMultiSelect
        categories={CATEGORIES}
        selected={[]}
        onChange={onChange}
        countByCategory={{ anime: 12, kpop: 3 }}
        onCreateCategory={onCreateCategory}
        {...props}
      />,
    )
    if (!closed) fireEvent.focus(screen.getByLabelText('Buscar categoria'))
    return { onChange, onCreateCategory }
  }

  // A contagem é RENDERIZADA pelo cabeçalho do card `Categorias` (artboard), não pelo componente —
  // ele só é dono do texto. Onde ela aparece na tela está coberto em `AdminProductFormPage.test`.
  it('três categorias selecionadas dizem `3 selecionadas`', () => {
    expect(selectionLabel(3)).toBe('3 selecionadas')
  })

  it('uma só usa o singular', () => {
    expect(selectionLabel(1)).toBe('1 selecionada')
  })

  it('nenhuma usa o plural — `0 selecionadas`', () => {
    expect(selectionLabel(0)).toBe('0 selecionadas')
  })

  it('selecionar acrescenta no FIM — a ordem de seleção é a position gravada', () => {
    const { onChange } = renderSelect({ selected: ['anime'] })

    fireEvent.click(within(screen.getByTestId('category-results')).getByText(/^Games$/))

    expect(onChange).toHaveBeenCalledWith(['anime', 'games'])
  })

  it('remover tira só aquela e preserva a ordem das outras', () => {
    const { onChange } = renderSelect({ selected: ['anime', 'kpop', 'games'] })

    fireEvent.click(screen.getByLabelText('Remover K-Pop'))

    expect(onChange).toHaveBeenCalledWith(['anime', 'games'])
  })

  it('cada resultado mostra o nome e a contagem de produtos', () => {
    renderSelect()

    const results = within(screen.getByTestId('category-results'))
    expect(results.getByRole('option', { name: /Girl Groups/ })).toBeInTheDocument()
    expect(results.getByText('12 produtos')).toBeInTheDocument()
  })

  it('a filha vem recuada — o recuo é a hierarquia da lista em repouso', () => {
    renderSelect()

    const results = within(screen.getByTestId('category-results'))
    const raiz = results.getByRole('option', { name: /^K-Pop/ })
    const filha = results.getByRole('option', { name: /Girl Groups/ })

    expect(raiz.style.paddingLeft).toBe('12px')
    expect(filha.style.paddingLeft).toBe('28px')
  })

  it('a lista vem em ordem de ÁRVORE, não na ordem global de sort_order', () => {
    // O fixture entrega `girl-groups` depois de `kpop` por acidente de ordem; o que garante o par
    // pai→filha é o achatamento, não o `sort_order`.
    render(
      <CategoryMultiSelect
        categories={[CATEGORIES[2], CATEGORIES[0], CATEGORIES[1]]}
        selected={[]}
        onChange={vi.fn()}
      />,
    )
    fireEvent.focus(screen.getByLabelText('Buscar categoria'))

    const names = within(screen.getByTestId('category-results'))
      .getAllByRole('option')
      .map(option => option.textContent)

    expect(names[0]).toContain('Anime')
    expect(names[1]).toContain('K-Pop')
    expect(names[2]).toContain('Girl Groups')
  })

  it('na BUSCA a filha carrega o pai apagado — o filtro pode trazê-la sem a mãe', () => {
    renderSelect()

    fireEvent.change(screen.getByLabelText('Buscar categoria'), { target: { value: 'girl' } })

    const results = within(screen.getByTestId('category-results'))
    expect(results.getByText('K-Pop ›')).toBeInTheDocument()
    expect(results.getByRole('option', { name: /Girl Groups/ })).toBeInTheDocument()
  })

  it('categoria sem produto mostra 0 — a contagem não fica em branco', () => {
    renderSelect()

    // Duas categorias do fixture não têm contagem (`girl-groups` e `games`), então a busca é por
    // TODAS as ocorrências: a asserção é "categoria sem uso mostra zero", não "existe exatamente
    // uma delas".
    const zeros = within(screen.getByTestId('category-results')).getAllByText('0 produtos')
    expect(zeros).toHaveLength(2)
  })

  it('a busca filtra pelo caminho, não só pelo nome', () => {
    renderSelect()

    fireEvent.change(screen.getByLabelText('Buscar categoria'), { target: { value: 'k-pop › girl' } })

    const results = within(screen.getByTestId('category-results'))
    expect(results.getByRole('option', { name: /Girl Groups/ })).toBeInTheDocument()
    expect(results.queryByRole('option', { name: /Anime/ })).not.toBeInTheDocument()
  })

  it('o cabeçalho conta os resultados da busca', () => {
    renderSelect()

    expect(screen.getByText('Todas as categorias')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Buscar categoria'), { target: { value: 'k-pop' } })

    expect(screen.getByText('2 resultados para "k-pop"')).toBeInTheDocument()
  })

  it('resultado único usa o singular no cabeçalho', () => {
    renderSelect()

    fireEvent.change(screen.getByLabelText('Buscar categoria'), { target: { value: 'games' } })

    expect(screen.getByText('1 resultado para "games"')).toBeInTheDocument()
  })

  it('busca sem resultado oferece `Criar categoria "X"` (AC 3)', () => {
    const { onCreateCategory } = renderSelect()

    fireEvent.change(screen.getByLabelText('Buscar categoria'), { target: { value: 'Vaporwave' } })
    fireEvent.click(screen.getByRole('button', { name: /Criar categoria "Vaporwave"/ }))

    expect(onCreateCategory).toHaveBeenCalledWith('Vaporwave')
  })

  it('criar é oferecido mesmo COM resultado — a busca achar parecida não decide por quem digita', () => {
    renderSelect()

    fireEvent.change(screen.getByLabelText('Buscar categoria'), { target: { value: 'Anime' } })

    expect(screen.getByRole('option', { name: /Anime/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Criar categoria "Anime"/ })).toBeInTheDocument()
  })

  it('sem termo digitado não há o que criar', () => {
    renderSelect()
    expect(screen.queryByRole('button', { name: /Criar categoria/ })).not.toBeInTheDocument()
  })

  it('⌘⏎ cria direto, sem tirar a mão do teclado', () => {
    const { onCreateCategory } = renderSelect()

    const input = screen.getByLabelText('Buscar categoria')
    fireEvent.change(input, { target: { value: 'Vaporwave' } })
    fireEvent.keyDown(input, { key: 'Enter', metaKey: true })

    expect(onCreateCategory).toHaveBeenCalledWith('Vaporwave')
  })

  it('categoryPath monta o caminho e não entra em laço com parent circular', () => {
    expect(categoryPath(CATEGORIES[2], CATEGORIES)).toBe('K-Pop › Girl Groups')
    const circular = [category('a', 'A', 'b'), category('b', 'B', 'a')]
    expect(categoryPath(circular[0], circular).length).toBeGreaterThan(0)
  })

  it('parentPath dá só o caminho do pai; depthOf dá o recuo', () => {
    expect(parentPath(CATEGORIES[2], CATEGORIES)).toBe('K-Pop ›')
    expect(parentPath(CATEGORIES[0], CATEGORIES)).toBe('')
    expect(depthOf(CATEGORIES[2], CATEGORIES)).toBe(1)
    expect(depthOf(CATEGORIES[0], CATEGORIES)).toBe(0)
  })

  it('flattenTree não perde categoria órfã nem entra em laço com ciclo', () => {
    const orfa = category('sem-pai', 'Sem pai', 'nao-existe')
    expect(flattenTree([...CATEGORIES, orfa]).map(c => c.id)).toContain('sem-pai')

    const circular = [category('a', 'A', 'b'), category('b', 'B', 'a')]
    expect(flattenTree(circular)).toHaveLength(2)
  })
})

describe('CategoryMultiSelect — o dropdown só existe em uso', () => {
  const renderSelect = (over: Partial<React.ComponentProps<typeof CategoryMultiSelect>> = {}) => {
    const onChange = vi.fn()
    render(
      <CategoryMultiSelect categories={CATEGORIES} selected={[]} onChange={onChange} {...over} />,
    )
    return { onChange, input: screen.getByLabelText('Buscar categoria') }
  }

  it('em repouso a lista não está montada — ela não ocupa o card à espera de uso', () => {
    renderSelect()
    expect(screen.queryByTestId('category-results')).not.toBeInTheDocument()
  })

  it('o foco no campo abre', () => {
    const { input } = renderSelect()

    fireEvent.focus(input)

    expect(screen.getByTestId('category-results')).toBeInTheDocument()
  })

  it('Escape fecha', () => {
    const { input } = renderSelect()
    fireEvent.focus(input)

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByTestId('category-results')).not.toBeInTheDocument()
  })

  it('clicar fora fecha; clicar DENTRO não — senão marcar com o mouse nunca funcionaria', () => {
    const { input } = renderSelect()
    fireEvent.focus(input)

    fireEvent.pointerDown(screen.getByRole('option', { name: /Anime/ }))
    expect(screen.getByTestId('category-results')).toBeInTheDocument()

    fireEvent.pointerDown(document.body)
    expect(screen.queryByTestId('category-results')).not.toBeInTheDocument()
  })

  it('escolher NÃO fecha — o artboard mostra três chips, escolhidos em sequência', () => {
    const { input } = renderSelect()
    fireEvent.focus(input)

    fireEvent.click(screen.getByRole('option', { name: /Anime/ }))

    expect(screen.getByTestId('category-results')).toBeInTheDocument()
  })
})

describe('CategoryMultiSelect — a marcada continua na lista (P1.4 AC 1)', () => {
  const renderSelect = (selected: string[]) => {
    const onChange = vi.fn()
    render(<CategoryMultiSelect categories={CATEGORIES} selected={selected} onChange={onChange} />)
    fireEvent.focus(screen.getByLabelText('Buscar categoria'))
    return { onChange }
  }

  it('a escolhida segue visível e marcada, em vez de desaparecer dos resultados', () => {
    renderSelect(['anime'])

    expect(screen.getByRole('option', { name: /Anime/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: /^K-Pop/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('clicar na marcada DESMARCA — o chip deixa de ser o único jeito de desescolher', () => {
    const { onChange } = renderSelect(['anime', 'games'])

    fireEvent.click(screen.getByRole('option', { name: /Anime/ }))

    expect(onChange).toHaveBeenCalledWith(['games'])
  })
})

describe('CategoryMultiSelect — teclado', () => {
  const renderSelect = () => {
    const onChange = vi.fn()
    const onCreateCategory = vi.fn()
    render(
      <CategoryMultiSelect
        categories={CATEGORIES}
        selected={[]}
        onChange={onChange}
        onCreateCategory={onCreateCategory}
      />,
    )
    const input = screen.getByLabelText('Buscar categoria')
    fireEvent.focus(input)
    return { onChange, onCreateCategory, input }
  }

  it('↓ e Enter marcam sem tocar no mouse', () => {
    const { onChange, input } = renderSelect()

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    // A primeira em ordem de árvore é `Anime`.
    expect(onChange).toHaveBeenCalledWith(['anime'])
  })

  it('↑ do topo dá a volta na lista', () => {
    const { onChange, input } = renderSelect()

    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'Enter' })

    // A última em ordem de árvore é `Games`.
    expect(onChange).toHaveBeenCalledWith(['games'])
  })

  it('Enter sem opção sob o cursor cai no criar — é o que sobra de significado', () => {
    const { onCreateCategory, input } = renderSelect()

    fireEvent.change(input, { target: { value: 'Vaporwave' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onCreateCategory).toHaveBeenCalledWith('Vaporwave')
  })

  it('Backspace em campo VAZIO tira o último chip, como no TagInput ao lado', () => {
    const onChange = vi.fn()
    render(
      <CategoryMultiSelect
        categories={CATEGORIES}
        selected={['anime', 'games']}
        onChange={onChange}
      />,
    )

    fireEvent.keyDown(screen.getByLabelText('Buscar categoria'), { key: 'Backspace' })

    expect(onChange).toHaveBeenCalledWith(['anime'])
  })

  it('Backspace COM texto no campo não mexe nos chips', () => {
    const onChange = vi.fn()
    render(
      <CategoryMultiSelect categories={CATEGORIES} selected={['anime']} onChange={onChange} />,
    )
    const input = screen.getByLabelText('Buscar categoria')

    fireEvent.change(input, { target: { value: 'gam' } })
    fireEvent.keyDown(input, { key: 'Backspace' })

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('TagInput — tokens (PFM-06 AC 6-7)', () => {
  const renderTags = (over: Partial<React.ComponentProps<typeof TagInput>> = {}) => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onChange={onChange} suggestions={['naruto', 'shonen']} {...over} />)
    return { onChange }
  }

  it('Enter cria o chip', () => {
    const { onChange } = renderTags()
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'anos 90' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(['anos 90'])
  })

  it('vírgula cria o chip', () => {
    const { onChange } = renderTags()
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'shonen' } })
    fireEvent.keyDown(input, { key: ',' })

    expect(onChange).toHaveBeenCalledWith(['shonen'])
  })

  it('Tab cria o chip', () => {
    const { onChange } = renderTags()
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'retro' } })
    fireEvent.keyDown(input, { key: 'Tab' })

    expect(onChange).toHaveBeenCalledWith(['retro'])
  })

  it('Backspace em campo VAZIO remove o último chip', () => {
    const { onChange } = renderTags({ tags: ['naruto', 'shonen'] })

    fireEvent.keyDown(screen.getByLabelText('Tags'), { key: 'Backspace' })

    expect(onChange).toHaveBeenCalledWith(['naruto'])
  })

  it('Backspace COM texto no campo não remove chip — apaga letra', () => {
    const { onChange } = renderTags({ tags: ['naruto'] })
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'sho' } })
    fireEvent.keyDown(input, { key: 'Backspace' })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('colar `naruto, shonen, anos 90` cria três chips de uma vez (AC 7)', () => {
    const { onChange } = renderTags()
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'naruto, shonen, anos 90' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(['naruto', 'shonen', 'anos 90'])
  })

  it('a mesma tag exata duas vezes fica uma só (AC 11)', () => {
    const { onChange } = renderTags({ tags: ['naruto'] })
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'naruto' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(['naruto'])
  })

  it('chip é removível pelo X', () => {
    const { onChange } = renderTags({ tags: ['naruto', 'shonen'] })

    fireEvent.click(screen.getByLabelText('Remover tag naruto'))

    expect(onChange).toHaveBeenCalledWith(['shonen'])
  })
})

describe('TagInput — dedupe tolerante SUGERE, não substitui (AC 9)', () => {
  it('`Naruto` com `naruto` existente gera aviso com o par de ações', () => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onChange={onChange} suggestions={['naruto']} />)
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'Naruto' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // A tag entra COMO DIGITADA: a decisão é de quem cadastra.
    expect(onChange).toHaveBeenCalledWith(['Naruto'])
    expect(screen.getByRole('alert').textContent).toContain('já existe no catálogo')
    expect(screen.getByRole('button', { name: 'Usar a existente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manter' })).toBeInTheDocument()
  })

  it('`Usar a existente` troca pela do catálogo', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <TagInput tags={[]} onChange={onChange} suggestions={['naruto']} />,
    )
    const input = screen.getByLabelText('Tags')
    fireEvent.change(input, { target: { value: 'Naruto' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    rerender(<TagInput tags={['Naruto']} onChange={onChange} suggestions={['naruto']} />)

    fireEvent.click(screen.getByRole('button', { name: 'Usar a existente' }))

    expect(onChange).toHaveBeenLastCalledWith(['naruto'])
  })

  it('`Manter` fecha o aviso sem mexer nas tags', () => {
    const onChange = vi.fn()
    const { rerender } = render(<TagInput tags={[]} onChange={onChange} suggestions={['naruto']} />)
    const input = screen.getByLabelText('Tags')
    fireEvent.change(input, { target: { value: 'Naruto' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    rerender(<TagInput tags={['Naruto']} onChange={onChange} suggestions={['naruto']} />)
    onChange.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Manter' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('tag sem colisão não gera aviso nenhum', () => {
    render(<TagInput tags={[]} onChange={vi.fn()} suggestions={['naruto']} />)
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'vaporwave' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('TagInput — teto de 15 (AC 10)', () => {
  const fifteen = Array.from({ length: MAX_TAGS }, (_, i) => `tag-${i}`)

  // Como na contagem de categorias: o texto é do componente, o lugar na tela é do cabeçalho do card.
  it('o contador diz `15 de 15`', () => {
    expect(tagCounterLabel(MAX_TAGS)).toBe('15 de 15')
  })

  it('com 15 tags, o campo fica bloqueado e a saída é dita em voz alta', () => {
    render(<TagInput tags={fifteen} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Tags')).toBeDisabled()
    expect(screen.getByText('Remova uma tag para adicionar outra.')).toBeInTheDocument()
  })

  it('abaixo do teto não sobra aviso de limite no card', () => {
    render(<TagInput tags={fifteen.slice(0, 14)} onChange={vi.fn()} />)
    expect(screen.queryByText('Remova uma tag para adicionar outra.')).not.toBeInTheDocument()
  })

  it('colar 5 quando faltam 2 acrescenta só 2 — o teto não é ultrapassado', () => {
    const onChange = vi.fn()
    render(<TagInput tags={fifteen.slice(0, 13)} onChange={onChange} />)
    const input = screen.getByLabelText('Tags')

    fireEvent.change(input, { target: { value: 'a, b, c, d, e' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange.mock.calls[0][0]).toHaveLength(MAX_TAGS)
  })
})

describe('TagInput — sugestões por uso (AC 8)', () => {
  it('lista as tags do catálogo com a contagem', () => {
    render(
      <TagInput
        tags={[]}
        onChange={vi.fn()}
        suggestions={['naruto', 'shonen']}
        countByTag={{ naruto: 9, shonen: 4 }}
      />,
    )

    const box = within(screen.getByTestId('tag-suggestions'))
    expect(box.getByRole('button', { name: 'naruto · 9' })).toBeInTheDocument()
    expect(box.getByRole('button', { name: 'shonen · 4' })).toBeInTheDocument()
  })

  it('sugestão já usada some da lista, mesmo escrita com caixa diferente', () => {
    render(<TagInput tags={['Naruto']} onChange={vi.fn()} suggestions={['naruto', 'shonen']} />)

    const box = within(screen.getByTestId('tag-suggestions'))
    expect(box.queryByRole('button', { name: 'naruto' })).not.toBeInTheDocument()
    expect(box.getByRole('button', { name: 'shonen' })).toBeInTheDocument()
  })

  it('clicar na sugestão adiciona a tag', () => {
    const onChange = vi.fn()
    render(<TagInput tags={[]} onChange={onChange} suggestions={['naruto']} />)

    fireEvent.click(within(screen.getByTestId('tag-suggestions')).getByRole('button', { name: 'naruto' }))

    expect(onChange).toHaveBeenCalledWith(['naruto'])
  })
})
