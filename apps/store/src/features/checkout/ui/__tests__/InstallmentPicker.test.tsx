import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { cardInstallmentOptions } from '@estrelinha/core/payment/installments'
import InstallmentPicker, { INSTALLMENTS_ERROR, INSTALLMENTS_IDLE, MORE_INSTALLMENTS } from '../InstallmentPicker'
import { useCheckoutStore } from '../../model/checkoutStore'
import type { CardInstallmentsState } from '../../model/useCardInstallmentOptions'

// A lista desenha o que `useCardInstallmentOptions` entrega; o corte (teto, parcela mínima, o que é
// "sem juros") é provado em `core/payment/__tests__/installments.test.ts`. Aqui o estado é montado
// pela MESMA regra pura, a partir de uma tabela do Mercado Pago — não escrito à mão.

const TABELA = [
  { installments: 1, installment_rate: 0, installment_amount: 277.25, total_amount: 277.25 },
  { installments: 2, installment_rate: 0, installment_amount: 138.63, total_amount: 277.25 },
  { installments: 3, installment_rate: 0, installment_amount: 92.42, total_amount: 277.25 },
  { installments: 4, installment_rate: 11.36, installment_amount: 77.19, total_amount: 308.75 },
  { installments: 10, installment_rate: 20.65, installment_amount: 33.45, total_amount: 334.5 },
]

const pronto = (chosen = useCheckoutStore.getState().cardInstallments): CardInstallmentsState => {
  const options = cardInstallmentOptions(277.25, TABELA, 10)
  return { status: 'ready', options, selected: options.find((o) => o.count === chosen) ?? options[0] }
}

/** Remonta com o estado derivado do store, como o hook faz a cada mudança. */
const renderComStore = () => {
  const view = render(<InstallmentPicker state={pronto()} />)
  const rerender = () => view.rerender(<InstallmentPicker state={pronto()} />)
  return { ...view, rerender }
}

const radio = (name: RegExp) => screen.getByRole('radio', { name })

beforeEach(() => {
  useCheckoutStore.getState().reset()
})

describe('InstallmentPicker — as parcelas sem juros primeiro', () => {
  it('as sem juros aparecem de cara, com selo; as com juros ficam atrás de um toque', () => {
    renderComStore()
    expect(radio(/À vista/)).toBeChecked()
    expect(radio(/2x de/)).toBeInTheDocument()
    expect(radio(/3x de R\$\s?92,42/)).toBeInTheDocument()
    expect(screen.getAllByText('Sem juros')).toHaveLength(2) // 2x e 3x — o à vista não leva selo
    expect(screen.queryByRole('radio', { name: /4x de/ })).not.toBeInTheDocument()
  })

  it('as com juros mostram o total que a cliente vai pagar, sem selo', () => {
    renderComStore()
    const mais = screen.getByRole('button', { name: new RegExp(MORE_INSTALLMENTS) })
    expect(mais).toHaveAttribute('aria-expanded', 'false')
    expect(mais).toHaveTextContent('(até 10x)')
    fireEvent.click(mais)

    const quatro = radio(/4x de R\$\s?77,19/)
    const linha = quatro.closest('label') as HTMLElement
    expect(linha).toHaveTextContent(/Total R\$\s?308,75/)
    expect(linha).not.toHaveTextContent('Sem juros')
  })

  it('escolher uma parcela grava no store — é esse número que vai no pagamento', () => {
    const { rerender } = renderComStore()
    fireEvent.click(radio(/3x de/))
    expect(useCheckoutStore.getState().cardInstallments).toBe(3)
    rerender()
    expect(radio(/3x de/)).toBeChecked()
    expect(radio(/À vista/)).not.toBeChecked()
  })

  it('com uma parcela com juros escolhida, a lista não se recolhe por cima dela', () => {
    useCheckoutStore.getState().setCardInstallments(4)
    renderComStore()
    expect(radio(/4x de/)).toBeChecked()
    expect(screen.getByRole('button', { name: new RegExp(MORE_INSTALLMENTS) })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('a conta SEM parcelamento sem juros: só o à vista de cara, e nenhum selo inventado', () => {
    const semPromo = TABELA.map((c) =>
      c.installments === 1 ? c : { ...c, installment_rate: 9.64, total_amount: c.total_amount + 26 },
    )
    const options = cardInstallmentOptions(277.25, semPromo, 10)
    render(<InstallmentPicker state={{ status: 'ready', options, selected: options[0] }} />)
    expect(screen.getAllByRole('radio')).toHaveLength(1)
    expect(screen.queryByText('Sem juros')).not.toBeInTheDocument()
  })

  it('cada linha é um alvo de toque de pelo menos 56px de altura (a linha inteira é o rótulo)', () => {
    renderComStore()
    const linha = radio(/À vista/).closest('label') as HTMLElement
    expect(linha.className.split(/\s+/)).toContain('min-h-14')
  })
})

describe('InstallmentPicker — antes e sem a tabela', () => {
  it('sem número reconhecido, pede o número', () => {
    render(<InstallmentPicker state={{ status: 'idle', options: [], selected: null }} />)
    expect(screen.getByText(INSTALLMENTS_IDLE)).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('carregando, mostra o esqueleto e marca o grupo como ocupado', () => {
    render(<InstallmentPicker state={{ status: 'loading', options: [], selected: null }} />)
    expect(screen.getByTestId('parcelas-carregando')).toBeInTheDocument()
    expect(screen.getByRole('group')).toHaveAttribute('aria-busy', 'true')
  })

  it('a tabela falhou: o à vista continua escolhível, e o aviso diz por quê', () => {
    const options = cardInstallmentOptions(277.25, [], 10)
    render(<InstallmentPicker state={{ status: 'error', options, selected: options[0] }} />)
    expect(radio(/À vista/)).toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent(INSTALLMENTS_ERROR)
  })
})
