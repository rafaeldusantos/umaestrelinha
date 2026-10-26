import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import OptionsEditor, { MAX_AXES } from './OptionsEditor'
import { parseOptionValues } from '../model/parseOptionValues'
import type { ProductOption } from '@estrelinha/supabase/types'
import type { OptionLibraryEntry } from '@/entities/product'

// PFM-07 (P1.3 AC 2-5): até 3 opções, nome livre, colar-por-vírgula, cabeçalho com a
// conta do cruzamento, e reordenação que persiste em `position`.

const axis = (name: string, values: string[], position: number): ProductOption => ({
  name,
  values,
  position,
})

const TWO_AXES = [
  axis('Tamanho', ['3,5 cm', '4,5 cm', '5,5 cm'], 0),
  axis('Acabamento', ['Fosco', 'Brilhante'], 1),
]

describe('parseOptionValues — a armadilha da vírgula decimal (PFM-07 AC 3)', () => {
  it('cola `3,5 cm, 4,5 cm, 5,5 cm` e cria TRÊS valores, não seis', () => {
    expect(parseOptionValues('3,5 cm, 4,5 cm, 5,5 cm')).toEqual(['3,5 cm', '4,5 cm', '5,5 cm'])
  })

  it('vírgula sem espaço depois NÃO separa — é decimal', () => {
    expect(parseOptionValues('3,5')).toEqual(['3,5'])
  })

  it('ponto e vírgula e quebra de linha separam sempre', () => {
    expect(parseOptionValues('Fosco;Brilhante')).toEqual(['Fosco', 'Brilhante'])
    expect(parseOptionValues('Fosco\nBrilhante')).toEqual(['Fosco', 'Brilhante'])
  })

  it('apara espaços e descarta vazios', () => {
    expect(parseOptionValues('  Fosco  , , Brilhante ')).toEqual(['Fosco', 'Brilhante'])
  })

  it('descarta duplicado dentro da colagem', () => {
    expect(parseOptionValues('Fosco, Brilhante, Fosco')).toEqual(['Fosco', 'Brilhante'])
  })

  it('descarta valor que já existe no eixo', () => {
    expect(parseOptionValues('Fosco, Acetinado', ['Fosco'])).toEqual(['Acetinado'])
  })

  it('texto vazio não cria nada', () => {
    expect(parseOptionValues('   ')).toEqual([])
  })
})

describe('OptionsEditor — teto de 3 opções (AC 2)', () => {
  it('com 2 eixos, adicionar está habilitado', () => {
    render(<OptionsEditor options={TWO_AXES} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Adicionar opção/ })).toBeEnabled()
  })

  it('com 3 eixos, adicionar o 4º fica DESABILITADO', () => {
    render(
      <OptionsEditor options={[...TWO_AXES, axis('Cor', ['Rosa'], 2)]} onChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /Adicionar opção/ })).toBeDisabled()
    expect(MAX_AXES).toBe(3)
  })

  it('adicionar cria um eixo vazio com a position seguinte', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={TWO_AXES} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Adicionar opção/ }))

    expect(onChange).toHaveBeenCalledWith([
      ...TWO_AXES,
      { name: '', values: [], position: 2 },
    ], { kind: 'addOption' })
  })
})

describe('OptionsEditor — cabeçalho com a conta do cruzamento (AC 4)', () => {
  it('2 eixos de 3 e 2 valores mostram `2 de 3 opções · 3 × 2 = 6 variações`', () => {
    render(<OptionsEditor options={TWO_AXES} onChange={vi.fn()} />)

    expect(screen.getByTestId('options-summary').textContent).toBe(
      '2 de 3 opções · 3 × 2 = 6 variações',
    )
  })

  it('um eixo só mostra a contagem dele', () => {
    render(<OptionsEditor options={[axis('Tamanho', ['3,5 cm', '4,5 cm'], 0)]} onChange={vi.fn()} />)

    expect(screen.getByTestId('options-summary').textContent).toBe('1 de 3 opções · 2 = 2 variações')
  })

  it('eixo sem valores não entra na conta — não multiplica por zero', () => {
    render(
      <OptionsEditor
        options={[axis('Tamanho', ['3,5 cm', '4,5 cm'], 0), axis('Cor', [], 1)]}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('options-summary').textContent).toBe('2 de 3 opções · 2 = 2 variações')
  })

  it('sem eixo, explica o que significa não ter grade', () => {
    render(<OptionsEditor options={[]} onChange={vi.fn()} />)

    expect(screen.getByTestId('options-summary').textContent).toBe('0 de 3 opções')
    expect(screen.getByText(/o produto tem um preço só/)).toBeInTheDocument()
  })
})

describe('OptionsEditor — valores', () => {
  it('colar no campo e apertar Enter cria os chips', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', [], 0)]} onChange={onChange} />)

    const input = screen.getByLabelText('Valores')
    fireEvent.change(input, { target: { value: '3,5 cm, 4,5 cm, 5,5 cm' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith([
      { name: 'Tamanho', values: ['3,5 cm', '4,5 cm', '5,5 cm'], position: 0 },
    ], { kind: 'values', index: 0 })
  })

  it('sair do campo (blur) também confirma os valores digitados', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', [], 0)]} onChange={onChange} />)

    const input = screen.getByLabelText('Valores')
    fireEvent.change(input, { target: { value: 'Único' } })
    fireEvent.blur(input)

    expect(onChange).toHaveBeenCalledWith([{ name: 'Tamanho', values: ['Único'], position: 0 }], {
      kind: 'values',
      index: 0,
    })
  })

  it('cada valor é um chip removível', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Acabamento', ['Fosco', 'Brilhante'], 0)]} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remover valor Fosco' }))

    expect(onChange).toHaveBeenCalledWith([
      { name: 'Acabamento', values: ['Brilhante'], position: 0 },
    ], { kind: 'values', index: 0 })
  })

  it('trocar o nome da opção preserva os valores', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', ['4,5 cm'], 0)]} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Nome da opção'), { target: { value: 'Diâmetro' } })

    expect(onChange).toHaveBeenCalledWith([
      { name: 'Diâmetro', values: ['4,5 cm'], position: 0 },
    ], { kind: 'rename', index: 0 })
  })
})

describe('OptionsEditor — reordenação atualiza position (AC 5)', () => {
  it('mover para cima troca a ordem E reindexa a position', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={TWO_AXES} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mover Acabamento para cima' }))

    expect(onChange).toHaveBeenCalledWith([
      { name: 'Acabamento', values: ['Fosco', 'Brilhante'], position: 0 },
      { name: 'Tamanho', values: ['3,5 cm', '4,5 cm', '5,5 cm'], position: 1 },
    ], { kind: 'move', from: 1, to: 0 })
  })

  it('mover para baixo idem', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={TWO_AXES} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mover Tamanho para baixo' }))

    expect(onChange.mock.calls[0][0].map((o: ProductOption) => [o.name, o.position])).toEqual([
      ['Acabamento', 0],
      ['Tamanho', 1],
    ])
    expect(onChange.mock.calls[0][1]).toEqual({ kind: 'move', from: 0, to: 1 })
  })

  it('o primeiro não sobe e o último não desce', () => {
    render(<OptionsEditor options={TWO_AXES} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Mover Tamanho para cima' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mover Acabamento para baixo' })).toBeDisabled()
  })

  it('arrastar um eixo sobre o outro reordena — o mesmo padrão de arraste das imagens da página', () => {
    const onChange = vi.fn()
    const { container } = render(<OptionsEditor options={TWO_AXES} onChange={onChange} />)
    const cards = container.querySelectorAll('[draggable="true"]')

    fireEvent.dragStart(cards[1])
    fireEvent.drop(cards[0])

    expect(onChange.mock.calls[0][0].map((o: ProductOption) => o.name)).toEqual([
      'Acabamento',
      'Tamanho',
    ])
    expect(onChange.mock.calls[0][1]).toEqual({ kind: 'move', from: 1, to: 0 })
  })

  it('remover um eixo reindexa os que sobraram', () => {
    const onChange = vi.fn()
    render(
      <OptionsEditor options={[...TWO_AXES, axis('Cor', ['Rosa'], 2)]} onChange={onChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remover Tamanho' }))

    expect(onChange).toHaveBeenCalledWith([
      { name: 'Acabamento', values: ['Fosco', 'Brilhante'], position: 0 },
      { name: 'Cor', values: ['Rosa'], position: 1 },
    ], { kind: 'removeOption', index: 0 })
  })

  it('a ordem exibida vem de position, não da ordem do array', () => {
    render(
      <OptionsEditor
        options={[axis('Acabamento', ['Fosco'], 1), axis('Tamanho', ['4,5 cm'], 0)]}
        onChange={vi.fn()}
      />,
    )

    const nomes = screen.getAllByLabelText('Nome da opção') as HTMLInputElement[]
    expect(nomes.map(n => n.value)).toEqual(['Tamanho', 'Acabamento'])
  })
})

// ---------------------------------------------------------------------------------------------
// Feature 81 — rótulos (OPV-17), sugestões do catálogo (OPV-18..21) e nome repetido (OPV-23).
// ---------------------------------------------------------------------------------------------

// A ordem dos valores NÃO é a alfabética ("10 cm" viria antes de "3,5 cm"): é a do catálogo (A2), e
// o editor tem de mostrá-la como veio, sem reordenar.
//
// Os conjuntos de "Tamanho" vêm na ordem de USO, e em ordem alfabética do rótulo seriam "10 cm",
// "3,5 cm, …", "4,5 cm, …": o editor tem de mostrá-los como vieram (A1, decidido em 2026-10-26).
const LIBRARY: OptionLibraryEntry[] = [
  {
    name: 'Tamanho',
    count: 200,
    values: ['3,5 cm', '4,5 cm', '5,5 cm', '10 cm'],
    sets: [
      { values: ['3,5 cm', '4,5 cm', '5,5 cm'], count: 120 },
      { values: ['10 cm'], count: 50 },
      { values: ['4,5 cm', '5,5 cm'], count: 30 },
      { values: ['3,5 cm'], count: 1 },
    ],
  },
  { name: 'Tamanho do pingente', count: 12, values: ['P', 'M'], sets: [{ values: ['P', 'M'], count: 12 }] },
  { name: 'Acabamento', count: 90, values: ['Fosco', 'Brilhante'], sets: [{ values: ['Fosco'], count: 90 }] },
  { name: 'Cor', count: 40, values: ['Rosa', 'Azul'], sets: [{ values: ['Rosa', 'Azul'], count: 40 }] },
  { name: 'Pack', count: 3, values: ['Único'], sets: [{ values: ['Único'], count: 1 }] },
]

const CHIPS = 'Valores usados em outros produtos'
const CONJUNTOS = 'Conjuntos mais usados'

const nomesNaLista = (nome = 'Nomes usados no catálogo') =>
  within(screen.getByRole('listbox', { name: nome }))
    .getAllByRole('option')
    .map(o => o.textContent)

describe('OptionsEditor — rótulos (OPV-17)', () => {
  it('"Nome da opção", "Valores", "Adicionar opção" e o resumo "N de 3 opções"', () => {
    render(<OptionsEditor options={[axis('Tamanho', ['4,5 cm'], 0)]} onChange={vi.fn()} />)

    expect(screen.getByLabelText('Nome da opção')).toBeInTheDocument()
    expect(screen.getByLabelText('Valores')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar opção' })).toBeInTheDocument()
    expect(screen.getByTestId('options-summary').textContent).toBe('1 de 3 opções · 1 = 1 variações')
  })

  it('o estado vazio diz o que é não ter opção', () => {
    render(<OptionsEditor options={[]} onChange={vi.fn()} />)

    expect(
      screen.getByText(
        'Sem opções, o produto tem um preço só. Adicione uma opção (Tamanho, Cor…) para vender por variação.',
      ),
    ).toBeInTheDocument()
  })

  it('nenhum texto do editor usa a palavra "eixo" — nem rótulo, nem aria-label, nem title', () => {
    const { container } = render(
      <OptionsEditor
        options={[axis('', ['3,5 cm'], 0), axis('Cor', ['Rosa'], 1), axis('Pack', [], 2)]}
        onChange={vi.fn()}
        library={LIBRARY}
      />,
    )
    const textos = [
      container.textContent ?? '',
      ...[...container.querySelectorAll('[aria-label],[title],[placeholder]')].flatMap(el => [
        el.getAttribute('aria-label') ?? '',
        el.getAttribute('title') ?? '',
        el.getAttribute('placeholder') ?? '',
      ]),
    ].join(' ')

    expect(textos).not.toMatch(/eixo/i)
    // Sensor: a régua acha a palavra quando ela está lá.
    expect('Mover eixo 1 para cima').toMatch(/eixo/i)
  })

  it('o nome vazio vira "opção N" nos controles da linha', () => {
    render(<OptionsEditor options={[axis('Tamanho', ['4,5 cm'], 0), axis('', [], 1)]} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Mover opção 2 para cima' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover opção 2' })).toBeInTheDocument()
  })

  it('com 3 opções o botão diz o teto no title', () => {
    render(
      <OptionsEditor
        options={[...TWO_AXES, axis('Cor', ['Rosa'], 2)]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /Adicionar opção/ })).toHaveAttribute(
      'title',
      'Máximo de 3 opções por produto',
    )
  })
})

describe('OptionsEditor — nome sugerido do catálogo (OPV-18)', () => {
  it('focar o campo vazio mostra os nomes do catálogo, na ordem da biblioteca', () => {
    render(<OptionsEditor options={[axis('', [], 0)]} onChange={vi.fn()} library={LIBRARY} />)

    fireEvent.focus(screen.getByLabelText('Nome da opção'))

    expect(nomesNaLista()).toEqual(['Tamanho', 'Tamanho do pingente', 'Acabamento', 'Cor', 'Pack'])
  })

  it('digitar filtra pela dobra de busca — "tam" acha os dois "Tamanho", e acento não atrapalha', () => {
    const { rerender } = render(
      <OptionsEditor options={[axis('tam', [], 0)]} onChange={vi.fn()} library={LIBRARY} />,
    )
    fireEvent.focus(screen.getByLabelText('Nome da opção'))
    expect(nomesNaLista()).toEqual(['Tamanho', 'Tamanho do pingente'])

    rerender(<OptionsEditor options={[axis('ACABAMÊNTO', [], 0)]} onChange={vi.fn()} library={LIBRARY} />)
    expect(nomesNaLista()).toEqual(['Acabamento'])
  })

  it('no máximo 8 sugestões', () => {
    const muitas = Array.from({ length: 12 }, (_, i) => ({
      name: `Nome ${String(i).padStart(2, '0')}`,
      count: 12 - i,
      values: ['x'],
      sets: [],
    }))
    render(<OptionsEditor options={[axis('', [], 0)]} onChange={vi.fn()} library={muitas} />)
    fireEvent.focus(screen.getByLabelText('Nome da opção'))

    expect(nomesNaLista()).toHaveLength(8)
  })

  it('clicar numa sugestão grava o nome, como renomear', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('tam', [], 0)]} onChange={onChange} library={LIBRARY} />)
    fireEvent.focus(screen.getByLabelText('Nome da opção'))

    fireEvent.click(screen.getByRole('option', { name: 'Tamanho' }))

    expect(onChange).toHaveBeenCalledWith([{ name: 'Tamanho', values: [], position: 0 }], {
      kind: 'rename',
      index: 0,
    })
  })

  it('teclado: seta para baixo marca a 1ª, desce para a 2ª, Enter escolhe a marcada', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('tam', [], 0)]} onChange={onChange} library={LIBRARY} />)
    const campo = screen.getByLabelText('Nome da opção')
    fireEvent.focus(campo)

    fireEvent.keyDown(campo, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { name: 'Tamanho' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(campo, { key: 'ArrowDown' })
    expect(campo).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Tamanho do pingente' }).id,
    )
    fireEvent.keyDown(campo, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith([{ name: 'Tamanho do pingente', values: [], position: 0 }], {
      kind: 'rename',
      index: 0,
    })
  })

  it('texto livre: Enter sem ter descido na lista NÃO troca o nome digitado pela sugestão', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tam', [], 0)]} onChange={onChange} library={LIBRARY} />)
    const campo = screen.getByLabelText('Nome da opção')
    fireEvent.focus(campo)

    fireEvent.keyDown(campo, { key: 'Enter' })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('Esc fecha a lista', () => {
    render(<OptionsEditor options={[axis('', [], 0)]} onChange={vi.fn()} library={LIBRARY} />)
    const campo = screen.getByLabelText('Nome da opção')
    fireEvent.focus(campo)
    expect(screen.getByRole('listbox', { name: 'Nomes usados no catálogo' })).toBeInTheDocument()

    fireEvent.keyDown(campo, { key: 'Escape' })

    expect(screen.queryByRole('listbox', { name: 'Nomes usados no catálogo' })).toBeNull()
    expect(campo).toHaveAttribute('aria-expanded', 'false')
  })

  it('o campo é um combobox', () => {
    render(<OptionsEditor options={[axis('', [], 0)]} onChange={vi.fn()} library={LIBRARY} />)
    expect(screen.getByRole('combobox', { name: 'Nome da opção' })).toBeInTheDocument()
  })
})

describe('OptionsEditor — valores do catálogo para um nome conhecido (OPV-19)', () => {
  // Decidido em 2026-10-26 pela recomendação do QA (BUG-20261026-usar-os-valores-junta-o-catalogo-
  // inteiro e BUG-20261026-sugestao-de-valores-some-no-primeiro-clique): os CONJUNTOS mais usados no
  // lugar da união, e os chips enquanto sobrar algum.
  it('nome conhecido e nenhum valor: os chips na ordem do catálogo, sem botão de usar todos', () => {
    render(<OptionsEditor options={[axis('tamanho', [], 0)]} onChange={vi.fn()} library={LIBRARY} />)

    const bloco = screen.getByRole('group', { name: CHIPS })
    const chips = within(bloco)
      .getAllByRole('button')
      .map(b => b.textContent)
    expect(chips).toEqual(['3,5 cm', '4,5 cm', '5,5 cm', '10 cm'])
    expect(screen.queryByRole('button', { name: /^Usar os \d+ valores$/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Usar o valor' })).toBeNull()
  })

  it('os 3 conjuntos mais usados, na ordem de uso (NÃO alfabética), cada um com a contagem de produtos', () => {
    render(<OptionsEditor options={[axis('Tamanho', [], 0)]} onChange={vi.fn()} library={LIBRARY} />)

    const grupo = screen.getByRole('group', { name: CONJUNTOS })
    const botoes = within(grupo).getAllByRole('button')
    expect(botoes.map(b => b.getAttribute('aria-label'))).toEqual([
      'Usar 3,5 cm, 4,5 cm, 5,5 cm (120 produtos)',
      'Usar 10 cm (50 produtos)',
      'Usar 4,5 cm, 5,5 cm (30 produtos)',
    ])
    expect(botoes.map(b => b.textContent)).toEqual([
      '3,5 cm, 4,5 cm, 5,5 cmem 120 produtos',
      '10 cmem 50 produtos',
      '4,5 cm, 5,5 cmem 30 produtos',
    ])
  })

  it('o conjunto de um produto só diz "1 produto", no singular', () => {
    render(<OptionsEditor options={[axis('Pack', [], 0)]} onChange={vi.fn()} library={LIBRARY} />)
    expect(screen.getByRole('button', { name: 'Usar Único (1 produto)' }).textContent).toBe('Únicoem 1 produto')
  })

  it('tocar num conjunto acrescenta o conjunto inteiro, na ordem dele, num gesto só', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', [], 0)]} onChange={onChange} library={LIBRARY} />)

    fireEvent.click(screen.getByRole('button', { name: 'Usar 4,5 cm, 5,5 cm (30 produtos)' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(
      [{ name: 'Tamanho', values: ['4,5 cm', '5,5 cm'], position: 0 }],
      { kind: 'values', index: 0 },
    )
  })

  it('com parte do conjunto já na opção, o conjunto acrescenta só o que falta (pela dobra)', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', ['3,5 CM'], 0)]} onChange={onChange} library={LIBRARY} />)

    fireEvent.click(screen.getByRole('button', { name: 'Usar 3,5 cm, 4,5 cm, 5,5 cm (120 produtos)' }))

    expect(onChange).toHaveBeenCalledWith(
      [{ name: 'Tamanho', values: ['3,5 CM', '4,5 cm', '5,5 cm'], position: 0 }],
      { kind: 'values', index: 0 },
    )
  })

  it('clicar num chip acrescenta só aquele valor', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', [], 0)]} onChange={onChange} library={LIBRARY} />)

    const bloco = screen.getByRole('group', { name: CHIPS })
    fireEvent.click(within(bloco).getByRole('button', { name: '4,5 cm' }))

    expect(onChange).toHaveBeenCalledWith([{ name: 'Tamanho', values: ['4,5 cm'], position: 0 }], {
      kind: 'values',
      index: 0,
    })
  })

  it('nada é acrescentado sem clique: os blocos aparecem e onChange não é chamado (A1)', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', [], 0)]} onChange={onChange} library={LIBRARY} />)

    expect(screen.getByRole('group', { name: CHIPS })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: CONJUNTOS })).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('depois do primeiro valor, os chips que sobraram CONTINUAM, sem os já usados (pela dobra)', () => {
    render(<OptionsEditor options={[axis('Tamanho', ['4,5 CM'], 0)]} onChange={vi.fn()} library={LIBRARY} />)

    const bloco = screen.getByRole('group', { name: CHIPS })
    expect(within(bloco).getAllByRole('button').map(b => b.textContent)).toEqual(['3,5 cm', '5,5 cm', '10 cm'])
  })

  it('com todos os valores usados, nem chips nem conjuntos', () => {
    render(
      <OptionsEditor
        options={[axis('Tamanho', ['3,5 cm', '4,5 cm', '5,5 cm', '10 cm'], 0)]}
        onChange={vi.fn()}
        library={LIBRARY}
      />,
    )
    expect(screen.queryByRole('group', { name: CHIPS })).toBeNull()
    expect(screen.queryByRole('group', { name: CONJUNTOS })).toBeNull()
  })

  it('com os conjuntos esgotados e um valor ainda não usado, os chips CONTINUAM sozinhos (decisão 2, G11)', () => {
    // "Acabamento" tem um conjunto só (`Fosco`), já inteiro na opção; "Brilhante" ainda não foi usado.
    // No catálogo real é o valor que mora num 4º conjunto (fora do limite de 3) ou em nenhum restante.
    render(<OptionsEditor options={[axis('Acabamento', ['Fosco'], 0)]} onChange={vi.fn()} library={LIBRARY} />)

    expect(screen.queryByRole('group', { name: CONJUNTOS })).toBeNull()
    const bloco = screen.getByRole('group', { name: CHIPS })
    expect(within(bloco).getAllByRole('button').map(b => b.textContent)).toEqual(['Brilhante'])
  })

  it('nome desconhecido NÃO mostra os blocos', () => {
    render(<OptionsEditor options={[axis('Gravação', [], 0)]} onChange={vi.fn()} library={LIBRARY} />)
    expect(screen.queryByRole('group', { name: CHIPS })).toBeNull()
    expect(screen.queryByRole('group', { name: CONJUNTOS })).toBeNull()
  })

  it('os chips e os conjuntos têm alvo de 44px (token exato `min-h-11`)', () => {
    render(<OptionsEditor options={[axis('Tamanho', [], 0)]} onChange={vi.fn()} library={LIBRARY} />)
    const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)

    expect(tokens(within(screen.getByRole('group', { name: CHIPS })).getByRole('button', { name: '3,5 cm' }))).toContain(
      'min-h-11',
    )
    expect(tokens(screen.getByRole('button', { name: 'Usar 10 cm (50 produtos)' }))).toContain('min-h-11')
  })
})

describe('OptionsEditor — valores sugeridos ao digitar (OPV-20)', () => {
  it('digitar mostra os valores conhecidos daquele nome que casam e ainda não estão na opção', () => {
    render(
      <OptionsEditor options={[axis('Tamanho', ['3,5 cm'], 0)]} onChange={vi.fn()} library={LIBRARY} />,
    )
    const campo = screen.getByLabelText('Valores')
    fireEvent.focus(campo)
    fireEvent.change(campo, { target: { value: ',5' } })

    expect(nomesNaLista('Valores usados no catálogo')).toEqual(['4,5 cm', '5,5 cm'])
  })

  it('escolher uma sugestão acrescenta o valor e limpa o campo', () => {
    const onChange = vi.fn()
    render(
      <OptionsEditor options={[axis('Tamanho', ['3,5 cm'], 0)]} onChange={onChange} library={LIBRARY} />,
    )
    const campo = screen.getByLabelText('Valores') as HTMLInputElement
    fireEvent.focus(campo)
    fireEvent.change(campo, { target: { value: '10' } })

    fireEvent.click(screen.getByRole('option', { name: '10 cm' }))

    expect(onChange).toHaveBeenCalledWith(
      [{ name: 'Tamanho', values: ['3,5 cm', '10 cm'], position: 0 }],
      { kind: 'values', index: 0 },
    )
    expect(campo.value).toBe('')
  })

  it('teclado no campo de valores: seta + Enter escolhe a sugestão, não o texto digitado', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', ['3,5 cm'], 0)]} onChange={onChange} library={LIBRARY} />)
    const campo = screen.getByLabelText('Valores')
    fireEvent.focus(campo)
    fireEvent.change(campo, { target: { value: '5,5' } })

    fireEvent.keyDown(campo, { key: 'ArrowDown' })
    fireEvent.keyDown(campo, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0][0].values).toEqual(['3,5 cm', '5,5 cm'])
  })

  it('valor novo digitado com Enter continua entrando como texto livre', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', ['3,5 cm'], 0)]} onChange={onChange} library={LIBRARY} />)
    const campo = screen.getByLabelText('Valores')
    fireEvent.focus(campo)
    fireEvent.change(campo, { target: { value: '7 cm' } })
    fireEvent.keyDown(campo, { key: 'Enter' })

    expect(onChange.mock.calls[0][0][0].values).toEqual(['3,5 cm', '7 cm'])
  })
})

// Verifier r2, G8 (N29): `parseOptionValues` compara EXATO, então para o texto digitado a dobra de
// `addValues` é a única guarda. Os casos acima chegam a `addValues` pela sugestão ou pelo conjunto,
// que já excluíram o repetido — por isso estes entram pelo teclado e pela colagem.
describe('OptionsEditor — o acréscimo digitado também compara pela dobra (OPV-20)', () => {
  it('digitar "3,5 cm" + Enter com "3,5 CM" já na opção não cria um segundo valor', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', ['3,5 CM'], 0)]} onChange={onChange} />)
    const campo = screen.getByLabelText('Valores') as HTMLInputElement
    fireEvent.change(campo, { target: { value: '3,5 cm' } })
    fireEvent.keyDown(campo, { key: 'Enter' })

    expect(onChange).not.toHaveBeenCalled()
    expect(campo.value).toBe('')
  })

  it('colar uma lista acrescenta só o que é novo pela dobra — caixa e acento não contam', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Acabamento', ['Único', '3,5 CM'], 0)]} onChange={onChange} />)
    const campo = screen.getByLabelText('Valores')
    fireEvent.change(campo, { target: { value: 'unico, 3,5 cm, Fosco' } })
    fireEvent.keyDown(campo, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0][0].values).toEqual(['Único', '3,5 CM', 'Fosco'])
  })
})

describe('OptionsEditor — sem biblioteca, texto livre (OPV-21)', () => {
  it('sem `library`: nenhuma lista, nenhum bloco de sugestão, e o editor funciona', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', [], 0)]} onChange={onChange} />)
    fireEvent.focus(screen.getByLabelText('Nome da opção'))

    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.queryByRole('group', { name: CHIPS })).toBeNull()
    expect(screen.queryByRole('group', { name: CONJUNTOS })).toBeNull()

    const valores = screen.getByLabelText('Valores')
    fireEvent.change(valores, { target: { value: 'Único' } })
    fireEvent.keyDown(valores, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith([{ name: 'Tamanho', values: ['Único'], position: 0 }], {
      kind: 'values',
      index: 0,
    })
  })

  it('biblioteca vazia (leitura falhou ou não chegou): idem', () => {
    render(<OptionsEditor options={[axis('', [], 0)]} onChange={vi.fn()} library={[]} />)
    fireEvent.focus(screen.getByLabelText('Nome da opção'))
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('OptionsEditor — nome repetido (OPV-23)', () => {
  it('a SEGUNDA opção com o mesmo nome pela dobra recebe o aviso; a primeira não', () => {
    render(
      <OptionsEditor
        options={[axis('Tamanho', ['3,5 cm'], 0), axis('Cor', ['Rosa'], 1), axis('TAMANHO ', ['P'], 2)]}
        onChange={vi.fn()}
      />,
    )

    const alertas = screen.getAllByRole('alert')
    expect(alertas).toHaveLength(1)
    expect(alertas[0].textContent).toBe('Já existe uma opção com este nome.')
    // O aviso fica no cartão da 3ª opção, não no da 1ª.
    const cartoes = document.querySelectorAll('[draggable="true"]')
    expect(within(cartoes[2] as HTMLElement).getByRole('alert')).toBeInTheDocument()
    expect(within(cartoes[0] as HTMLElement).queryByRole('alert')).toBeNull()
  })

  it('nomes vazios não se acusam entre si', () => {
    render(<OptionsEditor options={[axis('', [], 0), axis('', [], 1)]} onChange={vi.fn()} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

// QA da 81 (BUG-20261026-aba-de-precos-rola-com-fonte-grande): com a fonte do sistema a 200 % em
// 390, o `whitespace-nowrap` do `<Button>` deixava "Adicionar opção" mais largo que o card, e o body
// rolava na horizontal. jsdom não mede layout: a régua é o token exato, e a medida é a prova em
// navegador (`prova-navegador.md`, seção da QA).
const tokens = (el: Element) => el.className.split(/\s+/)

describe('OptionsEditor — fonte grande não estoura a largura', () => {
  it('"Adicionar opção" pode quebrar linha e nunca passa da largura do card', () => {
    render(<OptionsEditor options={TWO_AXES} onChange={vi.fn()} />)
    const botao = tokens(screen.getByRole('button', { name: /Adicionar opção/ }))
    expect(botao).toContain('whitespace-normal')
    expect(botao).not.toContain('whitespace-nowrap')
    expect(botao).toContain('max-w-full')
    expect(botao).toContain('h-auto')
  })
})

// QA da 81 (BUG-20261026-conta-do-cruzamento-com-nome-vazio): com o nome de uma opção apagado
// (OPV-24, estado de passagem), o resumo dizia "3 × 2 × 1 = 2 variações" — o fator da opção sem
// nome entrava na conta escrita e não no resultado. A conta só lista as opções que entram no
// cruzamento.
describe('OptionsEditor — a conta do cruzamento não se contradiz com um nome vazio', () => {
  it('opção com valores e sem nome fica fora dos fatores, como fica fora do resultado', () => {
    render(
      <OptionsEditor
        options={[axis('', ['16', '17', '18'], 0), axis('Cor', ['Prata', 'Ouro'], 1), axis('Gravação', ['X'], 2)]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('options-summary').textContent).toBe('3 de 3 opções · 2 × 1 = 2 variações')
  })
})
