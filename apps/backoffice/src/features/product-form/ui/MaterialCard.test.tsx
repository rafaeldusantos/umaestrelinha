// Feature 22 / T5 — o cadastro que determina o material afetivo (MAT-02, MAT-03).
//
// O que este arquivo existe para congelar: **"exige material" e "quais materiais" são DOIS dados**.
// A leitura preguiçosa ("lista vazia ⇒ não exige") apaga a peça de material livre — a que exige,
// entra na fila, e ainda não sabe qual. Um teste que só cobrisse "marquei cabelo, salvou cabelo"
// passaria com o modelo errado.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MaterialKind } from '@estrelinha/core/material'
import MaterialCard from './MaterialCard'

const montar = (
  over: Partial<{
    requiresMaterial: boolean | null
    materialKinds: MaterialKind[]
    engravingMaxChars: number | null
    offersEngraving: boolean
  }> = {},
) => {
  const onChange = vi.fn()
  render(
    <MaterialCard
      requiresMaterial={over.requiresMaterial ?? null}
      materialKinds={over.materialKinds ?? []}
      engravingMaxChars={over.engravingMaxChars ?? null}
      offersEngraving={over.offersEngraving ?? false}
      onChange={onChange}
    />,
  )
  return onChange
}

describe('MaterialCard — os dois dados (MAT-02)', () => {
  it('o switch e a lista são controles SEPARADOS', () => {
    montar()
    expect(screen.getByText('Esta peça exige material da cliente')).toBeInTheDocument()
    expect(screen.getByText('Quais materiais')).toBeInTheDocument()
  })

  it('os dez materiais aparecem como opção', () => {
    montar({ requiresMaterial: true })
    for (const rotulo of [
      'Leite materno', 'Mecha de cabelo', 'Cinzas', 'Pelo do pet', 'Dente de leite',
      'Coto umbilical', 'Placenta', 'Flores', 'Penas', 'Outro material',
    ]) {
      expect(screen.getByLabelText(rotulo), `faltou ${rotulo}`).toBeInTheDocument()
    }
  })

  it('com o switch DESLIGADO, os tipos ficam inacessíveis', () => {
    montar({ requiresMaterial: false })
    expect(screen.getByLabelText('Cinzas')).toBeDisabled()
  })

  it('com o switch LIGADO e nada marcado, a tela diz que o material é combinado — não cobra escolha', () => {
    // É o estado válido que a leitura preguiçosa apagaria.
    montar({ requiresMaterial: true, materialKinds: [] })
    expect(screen.getByText(/o material será combinado com você/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Cinzas')).not.toBeDisabled()
  })

  it('com material marcado, o aviso de "a combinar" some', () => {
    montar({ requiresMaterial: true, materialKinds: ['cinzas'] })
    expect(screen.queryByText(/o material será combinado com você/i)).not.toBeInTheDocument()
  })

  it('ligar o switch emite `requires_material: true` e NÃO mexe na lista', () => {
    const onChange = montar({ requiresMaterial: null })
    fireEvent.click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledWith({ requires_material: true })
    expect(onChange.mock.calls[0][0]).not.toHaveProperty('material_kinds')
  })

  it('desligar emite `false` explícito — decisão registrada, não `null`', () => {
    // `false` é o que tira a linha de "nunca decidido" e faz o importador parar de semeá-la.
    const onChange = montar({ requiresMaterial: true })
    fireEvent.click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledWith({ requires_material: false })
  })

  it('desligar NÃO apaga os materiais já escolhidos', () => {
    const onChange = montar({ requiresMaterial: true, materialKinds: ['cabelo'] })
    fireEvent.click(screen.getByRole('switch'))

    expect(onChange.mock.calls[0][0].material_kinds).toBeUndefined()
  })

  it('marcar um material emite a lista nova', () => {
    const onChange = montar({ requiresMaterial: true, materialKinds: [] })
    fireEvent.click(screen.getByLabelText('Cinzas'))

    expect(onChange).toHaveBeenCalledWith({ material_kinds: ['cinzas'] })
  })

  it('desmarcar remove só aquele material', () => {
    const onChange = montar({ requiresMaterial: true, materialKinds: ['cabelo', 'cinzas'] })
    fireEvent.click(screen.getByLabelText('Cinzas'))

    expect(onChange).toHaveBeenCalledWith({ material_kinds: ['cabelo'] })
  })

  it('a ordem gravada é a de `MATERIAL_KINDS`, não a de clique', () => {
    // Sem isto, "cabelo e coto umbilical" sairia numa ordem em um save e noutra no seguinte, e o
    // rótulo do pedido mudaria sem ninguém ter mexido em nada.
    const onChange = montar({ requiresMaterial: true, materialKinds: ['coto_umbilical'] })
    fireEvent.click(screen.getByLabelText('Mecha de cabelo'))

    expect(onChange).toHaveBeenCalledWith({ material_kinds: ['cabelo', 'coto_umbilical'] })
  })
})

describe('MaterialCard — limite de gravação (MAT-03)', () => {
  it('produto SEM o eixo `Com gravação` não mostra o campo', () => {
    // São 654 dos 689 do catálogo. Mostrar em todos é ruído num formulário com ~30 campos.
    montar({ offersEngraving: false })
    expect(screen.queryByLabelText(/limite de caracteres/i)).not.toBeInTheDocument()
  })

  it('produto COM o eixo mostra o campo, com o default no placeholder', () => {
    montar({ offersEngraving: true })
    const campo = screen.getByLabelText(/limite de caracteres/i)
    expect(campo).toBeInTheDocument()
    expect(campo).toHaveAttribute('placeholder', '20')
  })

  it('o valor gravado do produto aparece', () => {
    montar({ offersEngraving: true, engravingMaxChars: 35 })
    expect(screen.getByLabelText(/limite de caracteres/i)).toHaveValue(35)
  })

  it('digitar um número emite `engraving_max_chars`', () => {
    const onChange = montar({ offersEngraving: true })
    fireEvent.change(screen.getByLabelText(/limite de caracteres/i), { target: { value: '42' } })

    expect(onChange).toHaveBeenCalledWith({ engraving_max_chars: 42 })
  })

  it('esvaziar o campo emite `null`, NUNCA `0`', () => {
    // `0` é recusado pelo `check` do banco e se leria como "esta peça não grava" — que é outra coisa.
    const onChange = montar({ offersEngraving: true, engravingMaxChars: 35 })
    fireEvent.change(screen.getByLabelText(/limite de caracteres/i), { target: { value: '  ' } })

    expect(onChange).toHaveBeenCalledWith({ engraving_max_chars: null })
  })

  it('não existe liga/desliga de gravação — quem decide é a variação, que já precifica', () => {
    // Um segundo controle para o mesmo dado seria o "defeito 01". O eixo `Com gravação` tem 626
    // variações e 33 dos 35 produtos cobram a mais por ele.
    montar({ offersEngraving: true })
    expect(screen.getAllByRole('switch')).toHaveLength(1)
  })
})
