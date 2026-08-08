// Feature 18 / T9 — o cupom em tela própria (DSC-02, DSC-03, DSC-05, DSC-08).

import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Coupon } from '@nanapin/supabase/types/coupon'

const state = vi.hoisted(() => ({ coupons: [] as unknown[], isLoading: false }))

const hook = vi.hoisted(() => ({
  createMutate: vi.fn().mockResolvedValue(undefined),
  updateMutate: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@nanapin/supabase/client', () => ({ supabase: {} }))

vi.mock('@nanapin/core/hooks/useCoupons', () => ({
  useAdminCoupons: () => ({ data: state.coupons, isLoading: state.isLoading }),
  useCreateCoupon: () => ({ mutateAsync: hook.createMutate, isPending: false }),
  useUpdateCoupon: () => ({ mutateAsync: hook.updateMutate, isPending: false }),
}))

vi.mock('@nanapin/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminCouponFormPage from './AdminCouponFormPage'
import { toast } from '@nanapin/ui/hooks/use-toast'
import { isoFromDateOnly } from '@/shared/lib/dateOnly'

const LISTAGEM = 'LISTAGEM DE CUPONS'

const coupon = (over: Partial<Coupon> = {}): Coupon =>
  ({
    id: 'cup-nana10',
    code: 'NANA10',
    description: 'Boas-vindas',
    type: 'percent',
    value: 10,
    min_order: 80,
    max_uses: 40,
    used_count: 12,
    first_order_only: true,
    active: true,
    valid_from: isoFromDateOnly('2026-08-01'),
    valid_until: isoFromDateOnly('2026-09-30'),
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...over,
  }) as Coupon

const renderAt = (path: string, coupons: Coupon[] = [], over: { isLoading?: boolean } = {}) => {
  state.coupons = coupons
  state.isLoading = over.isLoading ?? false
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/cupons" element={<div>{LISTAGEM}</div>} />
        <Route path="/admin/cupons/novo" element={<AdminCouponFormPage />} />
        <Route path="/admin/cupons/:id/editar" element={<AdminCouponFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const save = () => fireEvent.click(screen.getByRole('button', { name: /Salvar cupom/ }))
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const switchIn = (testid: string) => within(screen.getByTestId(testid)).getByRole('switch')

beforeEach(() => {
  hook.createMutate.mockClear().mockResolvedValue(undefined)
  hook.updateMutate.mockClear().mockResolvedValue(undefined)
  vi.mocked(toast).mockClear()
})

describe('DSC-02 — a tela substitui a modal', () => {
  it('renderiza em tela cheia, com a mesma moldura da promoção (AC 1)', () => {
    renderAt('/admin/cupons/novo')

    expect(screen.getByRole('heading', { name: 'Novo cupom' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(trilha).toHaveTextContent('Descontos')
    expect(trilha).toHaveTextContent('Cupons')
    expect(trilha).toHaveTextContent('Novo cupom')
  })

  it('organiza os campos nos cards do board (AC 3)', () => {
    renderAt('/admin/cupons/novo')

    for (const card of ['Identidade', 'Desconto', 'Vigência', 'Uso']) {
      expect(screen.getByText(card)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Código')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
    expect(screen.getByLabelText('Pedido mínimo (R$)')).toBeInTheDocument()
    expect(screen.getByLabelText('Limite de usos')).toBeInTheDocument()
    expect(switchIn('switch-ativo')).toBeInTheDocument()
    expect(switchIn('switch-primeiro-pedido')).toBeInTheDocument()
  })

  it('editar carrega os campos gravados e titula com o código (AC 2)', () => {
    renderAt('/admin/cupons/cup-nana10/editar', [coupon()])

    expect(screen.getByRole('heading', { name: 'NANA10' })).toBeInTheDocument()
    expect(screen.getByLabelText('Código')).toHaveValue('NANA10')
    expect(screen.getByLabelText('Descrição')).toHaveValue('Boas-vindas')
    expect(screen.getByLabelText('Percentual')).toHaveValue(10)
    expect(screen.getByLabelText('Pedido mínimo (R$)')).toHaveValue(80)
    expect(screen.getByLabelText('Limite de usos')).toHaveValue(40)
    expect(switchIn('switch-primeiro-pedido')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Válido de' })).toHaveTextContent('01/08/2026')
    expect(screen.getByRole('button', { name: 'Válido até' })).toHaveTextContent('30/09/2026')
  })

  it('`id` inexistente mostra "não encontrado" e nenhum formulário (AC 2)', () => {
    renderAt('/admin/cupons/nao-existe/editar', [])

    expect(screen.getByText('Cupom não encontrado')).toBeInTheDocument()
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para Cupons' }))
    expect(screen.getByText(LISTAGEM)).toBeInTheDocument()
  })

  it('enquanto a listagem carrega, a edição não decide que não achou', () => {
    renderAt('/admin/cupons/cup-nana10/editar', [], { isLoading: true })

    expect(screen.getByText('Carregando...')).toBeInTheDocument()
    expect(screen.queryByText('Cupom não encontrado')).not.toBeInTheDocument()
  })
})

describe('DSC-02 — o desconto', () => {
  it('`Frete grátis` desabilita o valor e grava zero (AC 4)', async () => {
    renderAt('/admin/cupons/novo')
    type('Código', 'FRETEGRATIS')
    type('Percentual', '99')
    fireEvent.click(screen.getByRole('button', { name: 'Frete grátis' }))

    expect(screen.getByLabelText('Valor')).toBeDisabled()
    save()

    await waitFor(() => expect(hook.createMutate).toHaveBeenCalledTimes(1))
    expect(hook.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'free_shipping', value: 0 }),
    )
  })

  it('trocar o tipo troca o rótulo do valor', () => {
    renderAt('/admin/cupons/novo')
    expect(screen.getByLabelText('Percentual')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Valor fixo' }))

    expect(screen.getByLabelText('Valor (R$)')).toBeInTheDocument()
  })

  it('código curto bloqueia o save, sem chamar o banco (AC 5)', async () => {
    renderAt('/admin/cupons/novo')
    type('Código', 'A')

    save()

    await waitFor(() =>
      expect(screen.getByText('O código precisa de ao menos 2 caracteres')).toBeInTheDocument(),
    )
    expect(hook.createMutate).not.toHaveBeenCalled()
  })

  it('o código vai para o banco em maiúsculas (AC 6)', async () => {
    renderAt('/admin/cupons/novo')
    type('Código', 'nana10')

    expect(screen.getByLabelText('Código')).toHaveValue('NANA10')
    save()

    await waitFor(() => expect(hook.createMutate).toHaveBeenCalledTimes(1))
    expect(hook.createMutate).toHaveBeenCalledWith(expect.objectContaining({ code: 'NANA10' }))
  })
})

describe('DSC-02 AC 7 — o desfecho do save', () => {
  it('criar com sucesso navega para a listagem', async () => {
    renderAt('/admin/cupons/novo')
    type('Código', 'NANA10')

    save()

    await waitFor(() => expect(screen.getByText(LISTAGEM)).toBeInTheDocument())
    expect(vi.mocked(toast)).toHaveBeenCalledWith(expect.objectContaining({ title: 'Cupom criado.' }))
  })

  it('editar manda o `id` no update, não um insert novo', async () => {
    renderAt('/admin/cupons/cup-nana10/editar', [coupon()])

    save()

    await waitFor(() => expect(hook.updateMutate).toHaveBeenCalledTimes(1))
    expect(hook.updateMutate).toHaveBeenCalledWith(expect.objectContaining({ id: 'cup-nana10' }))
    expect(hook.createMutate).not.toHaveBeenCalled()
  })

  it('erro mantém a tela com o que foi preenchido e avisa', async () => {
    hook.createMutate.mockRejectedValue(
      new Error('duplicate key value violates unique constraint "coupons_code_key"'),
    )
    renderAt('/admin/cupons/novo')
    type('Código', 'NANA10')

    save()

    await waitFor(() => expect(hook.createMutate).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(LISTAGEM)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Código')).toHaveValue('NANA10')
    expect(vi.mocked(toast)).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Erro ao salvar cupom', variant: 'destructive' }),
    )
  })
})

describe('DSC-03 — o cabeçalho', () => {
  it('o selo de pendência aparece só depois de mexer em algo', () => {
    renderAt('/admin/cupons/novo')
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()

    type('Código', 'NANA10')

    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
  })

  it('`Cancelar` volta à listagem sem gravar', () => {
    renderAt('/admin/cupons/novo')

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText(LISTAGEM)).toBeInTheDocument()
    expect(hook.createMutate).not.toHaveBeenCalled()
  })

  it('`Ctrl+S` submete', async () => {
    renderAt('/admin/cupons/novo')
    type('Código', 'NANA10')

    fireEvent.keyDown(window, { key: 's', ctrlKey: true })

    await waitFor(() => expect(hook.createMutate).toHaveBeenCalledTimes(1))
  })
})

describe('DSC-05 — a vigência por calendário', () => {
  it('não usa `<input type="date">`, e o vazio diz o que significa', () => {
    renderAt('/admin/cupons/novo')

    expect(document.querySelector('input[type="date"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Válido de' })).toHaveTextContent('Vale desde já')
    expect(screen.getByRole('button', { name: 'Válido até' })).toHaveTextContent('Sem fim')
  })

  it('limpar a data grava nulo', async () => {
    renderAt('/admin/cupons/cup-nana10/editar', [coupon()])

    fireEvent.click(screen.getByRole('button', { name: 'Limpar Válido até' }))
    save()

    await waitFor(() => expect(hook.updateMutate).toHaveBeenCalledTimes(1))
    expect(hook.updateMutate.mock.calls[0][0].valid_until).toBeNull()
  })

  it('o dia escolhido no calendário vai para o payload como o MESMO dia', async () => {
    renderAt('/admin/cupons/cup-nana10/editar', [coupon()])

    fireEvent.click(screen.getByRole('button', { name: 'Válido de' }))
    fireEvent.click(screen.getByRole('gridcell', { name: '15' }))
    save()

    await waitFor(() => expect(hook.updateMutate).toHaveBeenCalledTimes(1))
    expect(hook.updateMutate.mock.calls[0][0].valid_from).toBe(isoFromDateOnly('2026-08-15'))
  })
})

describe('DSC-08 — a cópia chega para ser batizada', () => {
  it('`?from=` traz tudo menos o código, e desligada (AC 1-3)', async () => {
    renderAt('/admin/cupons/novo?from=cup-nana10', [coupon()])

    expect(screen.getByLabelText('Código')).toHaveValue('')
    expect(screen.getByLabelText('Descrição')).toHaveValue('Boas-vindas')
    expect(screen.getByLabelText('Percentual')).toHaveValue(10)
    expect(screen.getByLabelText('Pedido mínimo (R$)')).toHaveValue(80)
    expect(screen.getByLabelText('Limite de usos')).toHaveValue(40)
    expect(switchIn('switch-primeiro-pedido')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Válido de' })).toHaveTextContent('01/08/2026')
    expect(switchIn('switch-ativo')).not.toBeChecked()
  })

  it('o campo de código chega focado — é a única decisão que falta', () => {
    renderAt('/admin/cupons/novo?from=cup-nana10', [coupon()])

    expect(screen.getByLabelText('Código')).toHaveFocus()
  })

  it('a cópia é um insert novo, e nada é escrito no original (AC 4)', async () => {
    renderAt('/admin/cupons/novo?from=cup-nana10', [coupon()])
    type('Código', 'NANA15')

    save()

    await waitFor(() => expect(hook.createMutate).toHaveBeenCalledTimes(1))
    expect(hook.updateMutate).not.toHaveBeenCalled()
    expect(hook.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NANA15', active: false, min_order: 80, max_uses: 40 }),
    )
  })

  it('`?from=` de um id que não existe não vira "não encontrado" — é uma criação normal', () => {
    renderAt('/admin/cupons/novo?from=nao-existe', [coupon()])

    expect(screen.queryByText('Cupom não encontrado')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Novo cupom' })).toBeInTheDocument()
  })
})

describe('DSC-02 — o card "No checkout vai aparecer"', () => {
  it('monta a frase com o código e o efeito', () => {
    renderAt('/admin/cupons/novo')
    type('Código', 'nana10')

    expect(screen.getByTestId('checkout-linha')).toHaveTextContent(
      'Cupom NANA10 aplicado — 10% off',
    )
  })

  it('a frase acompanha o tipo', () => {
    renderAt('/admin/cupons/novo')
    type('Código', 'FRETE')
    fireEvent.click(screen.getByRole('button', { name: 'Frete grátis' }))

    expect(screen.getByTestId('checkout-linha')).toHaveTextContent(
      'Cupom FRETE aplicado — frete grátis',
    )
  })

  it('avisa que cupom e promoção nunca somam (AD-015)', () => {
    renderAt('/admin/cupons/novo')

    expect(
      screen.getByText(/vale o que descontar mais — cupom ou promoção, nunca os dois/),
    ).toBeInTheDocument()
  })

  it('diz o mínimo quando existe, e diz que não há quando é zero', () => {
    renderAt('/admin/cupons/cup-nana10/editar', [coupon()])
    expect(screen.getByText('Só a partir de R$ 80,00 em produtos.')).toBeInTheDocument()

    renderAt('/admin/cupons/novo')
    expect(screen.getByText('Vale em qualquer valor de pedido.')).toBeInTheDocument()
  })
})
