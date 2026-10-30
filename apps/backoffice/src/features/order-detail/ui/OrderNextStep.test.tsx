// Feature `88` · T14 — o Próximo passo mostra o trabalho (`CRG-01`, `CRG-02`) e o "Outro status" volta
// ao vazio quando o gesto termina, gravado ou desistido (`AVS-05`).
//
// jsdom não mede layout: a prova é por atributo (`aria-busy`, `disabled`), texto e o valor do gatilho
// do seletor.

import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
import { enableRadixSelectInJsdom, RADIX_POINTER_DOWN } from '@/test/radix'

import OrderNextStep from './OrderNextStep'

const order = (over: Partial<DbOrder> & Record<string, unknown> = {}): DbOrder =>
  ({
    id: 'o1', order_number: '1042', status: 'separating', material_status: 'nao_aplicavel',
    tracking_code: 'BR1', shipping_service_id: '1', customer_email: 'a@b.c',
    ...over,
  }) as unknown as DbOrder

beforeAll(enableRadixSelectInJsdom)

const escolher = (rotulo: string) => {
  fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Outro status' }), RADIX_POINTER_DOWN)
  fireEvent.click(screen.getByRole('option', { name: rotulo }))
}

describe('o botão mostra o gerúndio do status que grava (CRG-01)', () => {
  it('gravando o próximo status: "Marcando como enviado…", aria-busy e desabilitado', () => {
    render(<OrderNextStep order={order()} onAdvance={vi.fn()} busy gravando="shipped" />)
    const botao = screen.getByRole('button', { name: /Marcando como enviado…/ })
    expect(botao).toHaveAttribute('aria-busy', 'true')
    expect(botao).toBeDisabled()
    expect(screen.queryByText('Enviado')).not.toBeInTheDocument()
  })

  it('retirada que vai a Entregue diz "Marcando como retirado…"', () => {
    render(
      <OrderNextStep order={order({ shipping_service_id: 'retirada' })} onAdvance={vi.fn()} busy gravando="delivered" />,
    )
    expect(screen.getByRole('button', { name: /Marcando como retirado…/ })).toHaveAttribute('aria-busy', 'true')
  })

  it('sem gravação, o rótulo de sempre e nada de aria-busy', () => {
    render(<OrderNextStep order={order()} onAdvance={vi.fn()} />)
    const botao = screen.getByRole('button', { name: /^Enviado/ })
    expect(botao).not.toHaveAttribute('aria-busy')
    expect(botao).not.toBeDisabled()
  })

  it('outra gravação do pedido (não esta): desabilitado SEM o gerúndio (CRG-02)', () => {
    render(<OrderNextStep order={order()} onAdvance={vi.fn()} busy gravando={null} />)
    const botao = screen.getByRole('button', { name: /^Enviado/ })
    expect(botao).toBeDisabled()
    expect(botao).not.toHaveAttribute('aria-busy')
  })

  it('o seletor "Outro status" fica desabilitado com uma gravação em curso (CRG-02)', () => {
    render(<OrderNextStep order={order()} onAdvance={vi.fn()} busy />)
    expect(screen.getByRole('combobox', { name: 'Outro status' })).toBeDisabled()
  })
})

describe('o "Outro status" guarda a escolha enquanto o gesto corre e volta ao vazio (AVS-05)', () => {
  it('a escolha aparece no seletor até o gesto terminar, e então ele volta a "Outro status"', async () => {
    let terminar!: () => void
    const onAdvance = vi.fn(() => new Promise<void>(r => { terminar = r }))
    render(<OrderNextStep order={order()} onAdvance={onAdvance} />)

    escolher('Pago')
    // Conserto do QA (foco): o seletor vai junto, como a ORIGEM do gesto — é a ele que o foco volta.
    expect(onAdvance).toHaveBeenCalledWith('paid', screen.getByRole('combobox', { name: 'Outro status' }))
    expect(screen.getByRole('combobox', { name: 'Outro status' })).toHaveTextContent('Pago')

    await act(async () => terminar())
    expect(screen.getByRole('combobox', { name: 'Outro status' })).toHaveTextContent('Outro status')
  })

  it('o gesto que REJEITA também devolve o seletor ao vazio', async () => {
    let falhar!: (e: Error) => void
    const onAdvance = vi.fn(() => new Promise<void>((_, rej) => { falhar = rej }))
    render(<OrderNextStep order={order()} onAdvance={onAdvance} />)

    escolher('Pago')
    expect(screen.getByRole('combobox', { name: 'Outro status' })).toHaveTextContent('Pago')
    await act(async () => {
      falhar(new Error('x'))
    })
    expect(screen.getByRole('combobox', { name: 'Outro status' })).toHaveTextContent('Outro status')
  })
})
