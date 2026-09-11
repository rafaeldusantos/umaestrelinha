// Feature 22 / T5 — o cadastro que determina o material afetivo (MAT-02, MAT-03).
//
// **Este arquivo já congelou "exige material" e "quais materiais" como DOIS dados.** A lista saiu do
// formulário (`BL-015`: `material_kinds` diz menos que a descrição, e a loja parou de anunciá-la), e
// o que sobra aqui é o interruptor — que continua sendo dois dados com a coluna, só que agora um
// deles não se edita mais por esta tela.
//
// O que este arquivo existe para congelar hoje: **o interruptor não é texto de vitrine, é operação**
// (fila de material, cobrança, folha de separação), e **ele não pode voltar a mexer na coluna**.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MaterialCard from './MaterialCard'

const montar = (
  over: Partial<{
    requiresMaterial: boolean | null
    engravingMaxChars: number | null
    offersEngraving: boolean
  }> = {},
) => {
  const onChange = vi.fn()
  render(
    <MaterialCard
      requiresMaterial={over.requiresMaterial ?? null}
      engravingMaxChars={over.engravingMaxChars ?? null}
      offersEngraving={over.offersEngraving ?? false}
      onChange={onChange}
    />,
  )
  return onChange
}

describe('MaterialCard — o interruptor (MAT-02)', () => {
  it('o card oferece o interruptor, e diz o que ele liga', () => {
    montar()
    expect(screen.getByText('Esta peça exige material da cliente')).toBeInTheDocument()
    // O rótulo sozinho não diz consequência nenhuma. Sem esta frase, a Adri não tem como saber que
    // este switch é o que põe o pedido na fila e libera a cobrança.
    expect(screen.getByText(/fila de material/i)).toBeInTheDocument()
  })

  it('ligar o interruptor emite `requires_material: true` e NÃO mexe na lista', () => {
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

  it('a lista "Quais materiais" não existe mais — nenhum dos dez é editável aqui', () => {
    // Inverso do caso que este arquivo tinha até a remoção. Ele é o guarda da volta: reintroduzir os
    // checkboxes traria de volta a curadoria que `BL-015` mostrou ser menos verdadeira que a
    // descrição — e a loja, que não a anuncia mais, continuaria calada, sem nada acusar.
    montar({ requiresMaterial: true })

    expect(screen.queryByText('Quais materiais')).not.toBeInTheDocument()
    for (const rotulo of [
      'Leite materno', 'Mecha de cabelo', 'Cinzas', 'Pelo do pet', 'Dente de leite',
      'Coto umbilical', 'Placenta', 'Flores', 'Penas', 'Outro material',
    ]) {
      expect(screen.queryByLabelText(rotulo), `voltou ${rotulo}`).not.toBeInTheDocument()
    }
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('o card não emite `material_kinds` em interação nenhuma', () => {
    // O par do caso acima, pelo lado do dado: a coluna continua gravada no banco e precisa chegar
    // intacta ao próximo save. Emitir `material_kinds: []` daqui apagaria a curadoria de 689 linhas
    // com o formulário parecendo não ter mexido em nada.
    const onChange = montar({ requiresMaterial: true, offersEngraving: true })
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.change(screen.getByLabelText(/limite de caracteres/i), { target: { value: '30' } })

    for (const [patch] of onChange.mock.calls) {
      expect(patch).not.toHaveProperty('material_kinds')
    }
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
