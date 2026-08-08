import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import OptionsEditor, { MAX_AXES } from './OptionsEditor'
import { parseOptionValues } from '../model/parseOptionValues'
import type { ProductOption } from '@nanapin/supabase/types'

// PFM-07 (P1.3 AC 2-5): até 3 eixos, nome livre com presets, colar-por-vírgula, cabeçalho com a
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

describe('OptionsEditor — teto de 3 eixos (AC 2)', () => {
  it('com 2 eixos, adicionar está habilitado', () => {
    render(<OptionsEditor options={TWO_AXES} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Adicionar eixo/ })).toBeEnabled()
  })

  it('com 3 eixos, adicionar o 4º fica DESABILITADO', () => {
    render(
      <OptionsEditor options={[...TWO_AXES, axis('Cor', ['Rosa'], 2)]} onChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /Adicionar eixo/ })).toBeDisabled()
    expect(MAX_AXES).toBe(3)
  })

  it('adicionar cria um eixo vazio com a position seguinte', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={TWO_AXES} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /Adicionar eixo/ }))

    expect(onChange).toHaveBeenCalledWith([
      ...TWO_AXES,
      { name: '', values: [], position: 2 },
    ])
  })
})

describe('OptionsEditor — cabeçalho com a conta do cruzamento (AC 4)', () => {
  it('2 eixos de 3 e 2 valores mostram `2 de 3 eixos · 3 × 2 = 6 variações`', () => {
    render(<OptionsEditor options={TWO_AXES} onChange={vi.fn()} />)

    expect(screen.getByTestId('options-summary').textContent).toBe(
      '2 de 3 eixos · 3 × 2 = 6 variações',
    )
  })

  it('um eixo só mostra a contagem dele', () => {
    render(<OptionsEditor options={[axis('Tamanho', ['3,5 cm', '4,5 cm'], 0)]} onChange={vi.fn()} />)

    expect(screen.getByTestId('options-summary').textContent).toBe('1 de 3 eixos · 2 = 2 variações')
  })

  it('eixo sem valores não entra na conta — não multiplica por zero', () => {
    render(
      <OptionsEditor
        options={[axis('Tamanho', ['3,5 cm', '4,5 cm'], 0), axis('Cor', [], 1)]}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('options-summary').textContent).toBe('2 de 3 eixos · 2 = 2 variações')
  })

  it('sem eixo, explica o que significa não ter grade', () => {
    render(<OptionsEditor options={[]} onChange={vi.fn()} />)

    expect(screen.getByTestId('options-summary').textContent).toBe('0 de 3 eixos')
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
    ])
  })

  it('sair do campo (blur) também confirma os valores digitados', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', [], 0)]} onChange={onChange} />)

    const input = screen.getByLabelText('Valores')
    fireEvent.change(input, { target: { value: 'Único' } })
    fireEvent.blur(input)

    expect(onChange).toHaveBeenCalledWith([{ name: 'Tamanho', values: ['Único'], position: 0 }])
  })

  it('cada valor é um chip removível', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Acabamento', ['Fosco', 'Brilhante'], 0)]} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remover valor Fosco' }))

    expect(onChange).toHaveBeenCalledWith([
      { name: 'Acabamento', values: ['Brilhante'], position: 0 },
    ])
  })

  it('trocar o nome do eixo preserva os valores', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={[axis('Tamanho', ['4,5 cm'], 0)]} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Eixo 1'), { target: { value: 'Diâmetro' } })

    expect(onChange).toHaveBeenCalledWith([
      { name: 'Diâmetro', values: ['4,5 cm'], position: 0 },
    ])
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
    ])
  })

  it('mover para baixo idem', () => {
    const onChange = vi.fn()
    render(<OptionsEditor options={TWO_AXES} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Mover Tamanho para baixo' }))

    expect(onChange.mock.calls[0][0].map((o: ProductOption) => [o.name, o.position])).toEqual([
      ['Acabamento', 0],
      ['Tamanho', 1],
    ])
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
    ])
  })

  it('a ordem exibida vem de position, não da ordem do array', () => {
    render(
      <OptionsEditor
        options={[axis('Acabamento', ['Fosco'], 1), axis('Tamanho', ['4,5 cm'], 0)]}
        onChange={vi.fn()}
      />,
    )

    expect((screen.getByLabelText('Eixo 1') as HTMLInputElement).value).toBe('Tamanho')
    expect((screen.getByLabelText('Eixo 2') as HTMLInputElement).value).toBe('Acabamento')
  })
})
