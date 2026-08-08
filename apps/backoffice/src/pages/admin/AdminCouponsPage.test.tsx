// Feature 18 / T11 — a listagem de `/admin/cupons` padronizada (DSC-06, DSC-07, DSC-08 AC 1).
//
// As rotas-sentinela provam PARA ONDE cada ação navega, com qual `id` e com qual query — um dublê de
// `useNavigate` diria apenas que navegou.

import { MemoryRouter, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Coupon } from '@estrelinha/supabase/types/coupon'

const state = vi.hoisted(() => ({ coupons: [] as unknown[], isLoading: false }))

const hook = vi.hoisted(() => ({
  updateMutate: vi.fn().mockResolvedValue(undefined),
  deleteMutate: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: {} }))

vi.mock('@estrelinha/core/hooks/useCoupons', () => ({
  useAdminCoupons: () => ({ data: state.coupons, isLoading: state.isLoading }),
  useUpdateCoupon: () => ({ mutateAsync: hook.updateMutate, isPending: false }),
  useDeleteCoupon: () => ({ mutateAsync: hook.deleteMutate, isPending: false }),
}))

vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminCouponsPage from './AdminCouponsPage'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { isoFromDateOnly } from '@/shared/lib/dateOnly'

const coupon = (over: Partial<Coupon> = {}): Coupon =>
  ({
    id: 'cup-nana10',
    code: 'NANA10',
    description: null,
    type: 'percent',
    value: 10,
    min_order: 0,
    max_uses: null,
    used_count: 12,
    first_order_only: false,
    active: true,
    valid_from: null,
    valid_until: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...over,
  }) as Coupon

const NovoSentinel = () => {
  const [params] = useSearchParams()
  return <div>NOVO from={params.get('from') ?? 'nenhum'}</div>
}
const EditorSentinel = () => <div>EDITOR DE {useParams().id}</div>

const renderPage = (coupons: Coupon[] = [coupon()], over: { isLoading?: boolean } = {}) => {
  state.coupons = coupons
  state.isLoading = over.isLoading ?? false
  return render(
    <MemoryRouter initialEntries={['/admin/cupons']}>
      <Routes>
        <Route path="/admin/cupons" element={<AdminCouponsPage />} />
        <Route path="/admin/cupons/novo" element={<NovoSentinel />} />
        <Route path="/admin/cupons/:id/editar" element={<EditorSentinel />} />
      </Routes>
    </MemoryRouter>,
  )
}

const rowOf = (code: string) => screen.getByText(code).closest('tr') as HTMLElement

/**
 * O valor de um `StatCard` a partir do rótulo (o segundo `<p>` do cartão).
 *
 * O espaço de `formatPrice` é NBSP — comparar com espaço comum falha com as duas strings parecendo
 * idênticas no diff.
 */
const cardValue = (label: string) => {
  const card = screen.getByText(label).closest('div')?.parentElement as HTMLElement
  return card.querySelectorAll('p')[1]?.textContent?.replace(/\u00a0/g, ' ')
}

beforeEach(() => {
  hook.updateMutate.mockClear().mockResolvedValue(undefined)
  hook.deleteMutate.mockClear().mockResolvedValue(undefined)
  vi.mocked(toast).mockClear()
})

describe('DSC-06 — a língua da listagem de promoções', () => {
  it('a coluna de datas se chama `Vigência` e usa o mesmo vocabulário (AC 1)', () => {
    renderPage([
      coupon({ id: 'a', code: 'SEMFIM' }),
      coupon({ id: 'b', code: 'ATE', valid_until: isoFromDateOnly('2026-09-30') }),
      coupon({
        id: 'c',
        code: 'FAIXA',
        valid_from: isoFromDateOnly('2026-08-01'),
        valid_until: isoFromDateOnly('2026-08-31'),
      }),
      coupon({ id: 'd', code: 'DESDE', valid_from: isoFromDateOnly('2026-08-01') }),
    ])

    expect(screen.getByRole('columnheader', { name: 'Vigência' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Validade' })).not.toBeInTheDocument()
    expect(rowOf('SEMFIM')).toHaveTextContent('Sem fim')
    expect(rowOf('SEMFIM')).not.toHaveTextContent('Sem prazo')
    expect(rowOf('ATE')).toHaveTextContent('até 30/09')
    expect(rowOf('FAIXA')).toHaveTextContent('01/08 – 31/08')
    expect(rowOf('DESDE')).toHaveTextContent('a partir de 01/08')
  })

  it('os quatro estados de status, cada um com sua paleta (AC 4)', () => {
    renderPage([
      coupon({ id: 'a', code: 'ATIVO' }),
      coupon({ id: 'b', code: 'INATIVO', active: false }),
      coupon({ id: 'c', code: 'VENCIDO', valid_until: '2026-01-01T00:00:00.000Z' }),
      coupon({ id: 'd', code: 'CHEIO', max_uses: 40, used_count: 40 }),
    ])

    expect(rowOf('ATIVO')).toHaveTextContent('Ativo')
    expect(rowOf('INATIVO')).toHaveTextContent('Inativo')
    expect(rowOf('VENCIDO')).toHaveTextContent('Expirado')
    expect(rowOf('CHEIO')).toHaveTextContent('Esgotado')

    // Expirado e esgotado NÃO podem sair na mesma cor: o remédio de cada um é diferente.
    const vencido = within(rowOf('VENCIDO')).getByText('Expirado')
    const cheio = within(rowOf('CHEIO')).getByText('Esgotado')
    expect(vencido.className).not.toBe(cheio.className)
    expect(cheio.className).toContain('amber')
  })

  it('o teto de usos batido é marcado no próprio valor (AC 5)', () => {
    renderPage([
      coupon({ id: 'a', code: 'CHEIO', max_uses: 40, used_count: 40 }),
      coupon({ id: 'b', code: 'FOLGA', max_uses: 40, used_count: 12 }),
    ])

    expect(within(rowOf('CHEIO')).getByText('40 / 40').className).toContain('amber')
    expect(within(rowOf('FOLGA')).getByText('12 / 40').className).not.toContain('amber')
  })

  it('as ações vêm na ordem das promoções: pausar, duplicar, editar, excluir (AC 6)', () => {
    renderPage()

    const acoes = within(rowOf('NANA10'))
      .getAllByRole('button')
      .map(button => button.getAttribute('aria-label'))

    expect(acoes).toEqual([
      'Pausar NANA10',
      'Duplicar NANA10',
      'Editar NANA10',
      'Excluir NANA10',
    ])
  })
})

describe('DSC-06 AC 2-3 — os três cartões deixam de ser calculados no vazio', () => {
  const carteira = [
    coupon({ id: 'a', code: 'A', used_count: 12 }),
    coupon({ id: 'b', code: 'B', used_count: 96 }),
    coupon({ id: 'c', code: 'C', active: false, used_count: 0 }),
    coupon({ id: 'd', code: 'D', max_uses: 40, used_count: 40 }),
    coupon({ id: 'e', code: 'E', valid_until: '2026-01-01T00:00:00.000Z', used_count: 0 }),
  ]

  it('renderiza ativos, usos totais e o que pede decisão', () => {
    renderPage(carteira)

    expect(cardValue('Cupons ativos')).toBe('2')
    expect(cardValue('Usos totais')).toBe('148')
    expect(cardValue('Pedem decisão')).toBe('2')
  })

  it('`ativos` não conta a coluna `active` crua — expirado e esgotado ficam fora', () => {
    renderPage(carteira)

    expect(carteira.filter(c => c.active)).toHaveLength(4)
    expect(cardValue('Cupons ativos')).not.toBe('4')
    expect(screen.getByText('de 5 cadastrados')).toBeInTheDocument()
  })

  it('carregando, os cartões mostram travessão em vez de zero', () => {
    renderPage([], { isLoading: true })

    expect(cardValue('Cupons ativos')).toBe('—')
    expect(cardValue('Usos totais')).toBe('—')
  })

  it('sem cupom nenhum, convida a criar o primeiro', () => {
    renderPage([])

    expect(screen.getByText('Nenhum cupom cadastrado.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /novo cupom/i }).length).toBeGreaterThan(0)
  })
})

describe('DSC-07 — pausar sem abrir o formulário', () => {
  it('pausa gravando `active: false` e só isso (AC 2-3)', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Pausar NANA10' }))

    await waitFor(() => expect(hook.updateMutate).toHaveBeenCalledTimes(1))
    // O patch é exatamente `{ id, active }`: qualquer campo a mais reescreveria o cupom com o que
    // esta tela tem em cache, que pode estar velho.
    expect(hook.updateMutate).toHaveBeenCalledWith({ id: 'cup-nana10', active: false })
    expect(vi.mocked(toast)).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cupom pausado.',
        description: expect.stringContaining('deixa de aceitar o código'),
      }),
    )
  })

  it('o botão do cupom pausado reativa', async () => {
    renderPage([coupon({ active: false })])

    fireEvent.click(screen.getByRole('button', { name: 'Reativar NANA10' }))

    await waitFor(() => expect(hook.updateMutate).toHaveBeenCalledTimes(1))
    expect(hook.updateMutate).toHaveBeenCalledWith({ id: 'cup-nana10', active: true })
    expect(vi.mocked(toast)).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Cupom reativado.' }),
    )
  })

  it('o botão segue a coluna `active`, não o selo — expirado ainda é algo que se pausa', () => {
    renderPage([coupon({ valid_until: '2026-01-01T00:00:00.000Z' })])

    expect(rowOf('NANA10')).toHaveTextContent('Expirado')
    expect(screen.getByRole('button', { name: 'Pausar NANA10' })).toBeInTheDocument()
  })

  it('falha ao pausar avisa e não finge que deu certo (AC 4)', async () => {
    hook.updateMutate.mockRejectedValue(new Error('permission denied'))
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Pausar NANA10' }))

    await waitFor(() =>
      expect(vi.mocked(toast)).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro ao pausar cupom',
          description: 'permission denied',
          variant: 'destructive',
        }),
      ),
    )
  })
})

describe('DSC-08 AC 1 / DSC-02 — a listagem navega', () => {
  it('`Novo cupom` leva a `/admin/cupons/novo`, sem `from`', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /novo cupom/i }))

    expect(screen.getByText('NOVO from=nenhum')).toBeInTheDocument()
  })

  it('duplicar leva a `/admin/cupons/novo?from=<id>` — e não grava nada (AC 4)', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Duplicar NANA10' }))

    expect(screen.getByText('NOVO from=cup-nana10')).toBeInTheDocument()
    // O original não sofre escrita nenhuma enquanto a cópia não é salva.
    expect(hook.updateMutate).not.toHaveBeenCalled()
  })

  it('o lápis leva à edição daquele cupom', () => {
    renderPage([coupon({ id: 'cup-frete', code: 'FRETE' }), coupon()])

    fireEvent.click(screen.getByRole('button', { name: 'Editar FRETE' }))

    expect(screen.getByText('EDITOR DE cup-frete')).toBeInTheDocument()
  })

  it('nenhuma modal de cupom sobra na tela', () => {
    renderPage()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('excluir cupom', () => {
  it('confirmar chama a mutação com o id, e avisa que pedidos pagos não mudam', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir NANA10' }))
    expect(screen.getByText(/mantêm o desconto que praticaram/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(hook.deleteMutate).toHaveBeenCalledWith('cup-nana10'))
  })

  it('cancelar não exclui', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir NANA10' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(hook.deleteMutate).not.toHaveBeenCalled()
  })
})
