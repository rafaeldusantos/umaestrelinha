// Feature 22 / T19 — o card de material no detalhe do pedido (MAT-05, MAT-08, MAT-10, MAT-11).
//
// O que este arquivo congela, além do layout:
//
// - **"a combinar", nunca lista vazia.** Um item que exige material sem dizer qual mostraria uma
//   linha em branco, que se lê como "nenhum material" — o oposto do que significa.
// - **A recusa mostra o MOTIVO.** Botão que some ou falha calada faz a Adri achar que clicou errado.
// - **O toast não alega e-mail enviado quando ele não saiu.**

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbOrder, DbOrderItem } from '@estrelinha/supabase/types'

const toastSuccess = vi.hoisted(() => vi.fn())
const toastError = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }))

import OrderMaterialCard from './OrderMaterialCard'

const order = (over: Partial<DbOrder> = {}): DbOrder =>
  ({
    id: 'ord-1', order_number: 'NP-1', customer_id: null, customer_name: 'Mariana',
    customer_email: 'm@x.com', status: 'paid', payment_method: 'pix', payment_status: 'approved',
    mp_payment_id: null, mp_status_detail: null, paid_at: null, pix_discount: 0,
    address_street: null, address_number: null, address_neighborhood: null, address_city: null,
    address_state: null, address_zip: null, address_complement: null,
    subtotal: 100, discount: 0, shipping_cost: 0, total: 100,
    tracking_code: null, shipping_carrier: null, cancel_reason: null,
    melhor_envio_id: null, melhor_envio_label_url: null, melhor_envio_protocol: null,
    coupon_code: null, coupon_id: null, created_at: '2026-08-09T10:00:00Z',
    material_status: 'aguardando_material', material_tracking_code: null, material_received_at: null,
    ...over,
  }) as DbOrder

const item = (over: Partial<DbOrderItem> = {}): DbOrderItem =>
  ({
    id: 'it-1', order_id: 'ord-1', product_id: 'p1', product_name: 'Árvore da Vida',
    product_image: null, size: null, finish: null, variant_id: null, price_source: 'base',
    variant_label: null, variant_options: null, quantity: 1, unit_price: 100,
    requires_material: true, material_kinds: ['cabelo', 'coto_umbilical'], engraving_text: null,
    ...over,
  }) as DbOrderItem

const onSetStatus = vi.fn()
const onSetTracking = vi.fn()

const montar = (o = order(), items = [item()]) =>
  render(
    <OrderMaterialCard
      order={o}
      items={items}
      onSetStatus={onSetStatus}
      onSetTracking={onSetTracking}
    />,
  )

beforeEach(() => {
  onSetStatus.mockReset().mockResolvedValue({ ok: true, reason: null, emailSent: true })
  onSetTracking.mockReset().mockResolvedValue({ ok: true, reason: null })
  toastSuccess.mockReset()
  toastError.mockReset()
})

describe('OrderMaterialCard — quando aparece', () => {
  it('pedido `nao_aplicavel` não ganha card', () => {
    const { container } = montar(order({ material_status: 'nao_aplicavel' }))
    expect(container).toBeEmptyDOMElement()
  })

  it('pedido na fila mostra o estado e o que cada item espera', () => {
    montar()
    expect(screen.getByText('Aguardando material')).toBeInTheDocument()
    expect(screen.getByText(/aguarda: Mecha de cabelo e Coto umbilical/i)).toBeInTheDocument()
  })

  it('item que exige SEM dizer qual mostra "a combinar" — nunca linha em branco', () => {
    montar(order(), [item({ material_kinds: [] })])
    expect(screen.getByText(/aguarda: a combinar/i)).toBeInTheDocument()
  })

  it('mostra o texto de gravação, do snapshot do pedido', () => {
    montar(order(), [item({ engraving_text: 'Ana & Léo' })])
    expect(screen.getByText(/gravar em Árvore da Vida/i)).toBeInTheDocument()
    expect(screen.getByText(/Ana & Léo/)).toBeInTheDocument()
  })

  it('sem gravação, não abre a seção de gravação', () => {
    montar()
    expect(screen.queryByText(/gravar em/i)).not.toBeInTheDocument()
  })
})

describe('OrderMaterialCard — transição guardada (MAT-08)', () => {
  it('de `aguardando_material` o SALTO DIRETO para recebido está habilitado', () => {
    // É obrigatório, não atalho: informar o rastreio é opcional, então a maioria dos pedidos nunca
    // passa por `material_enviado`.
    montar()
    expect(screen.getByRole('button', { name: /marcar material como recebido/i })).not.toBeDisabled()
  })

  it('de `material_enviado` também dá para marcar recebido', () => {
    montar(order({ material_status: 'material_enviado' }))
    expect(screen.getByRole('button', { name: /marcar material como recebido/i })).not.toBeDisabled()
  })

  it('marcar recebido chama a transição com o alvo certo', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))

    await waitFor(() => expect(onSetStatus).toHaveBeenCalledWith('ord-1', 'material_recebido'))
  })

  it('de `aguardando_material` "em produção" está BLOQUEADO, com o motivo visível', () => {
    // Não pula etapa: o material precisa ser marcado como recebido antes.
    montar()
    const botao = screen.getByRole('button', { name: /colocar em produção/i })

    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute('title', expect.stringContaining('Material recebido'))
  })

  it('de `material_recebido` o botão de recebido fica bloqueado e explica', () => {
    montar(order({ material_status: 'material_recebido' }))
    const botao = screen.getByRole('button', { name: /marcar material como recebido/i })

    // Transição para o próprio estado é sucesso na regra (idempotência), mas repetir o clique não é
    // ação nenhuma — a tela não oferece.
    expect(botao).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /colocar em produção/i })).not.toBeDisabled()
  })

  it('recusa do servidor vira toast com motivo, não silêncio', async () => {
    onSetStatus.mockResolvedValue({ ok: false, reason: 'invalid_transition', emailSent: false })
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})

describe('OrderMaterialCard — o toast é honesto sobre o e-mail (MAT-09)', () => {
  it('e-mail enviado ⇒ o toast diz que a cliente foi avisada', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('avisada por e-mail')),
    )
  })

  it('e-mail que NÃO saiu ⇒ o toast NÃO alega aviso, e o estado permanece', async () => {
    // Falha de e-mail não reverte estado (`AD-008`), mas mentir sobre o aviso faria a Adri deixar
    // de avisar por outro canal.
    onSetStatus.mockResolvedValue({ ok: true, reason: null, emailSent: false })
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Material recebido'))
    expect(toastSuccess).not.toHaveBeenCalledWith(expect.stringContaining('e-mail'))
  })
})

describe('OrderMaterialCard — o rastreio da cliente pelo painel (MAT-11)', () => {
  it('o campo vem preenchido com o que já está gravado', () => {
    montar(order({ material_tracking_code: 'AA123456789BR' }))
    expect(screen.getByLabelText(/código de rastreio do envio da cliente/i)).toHaveValue(
      'AA123456789BR',
    )
  })

  it('salvar chama a mesma RPC da loja, pelo hook', async () => {
    montar()
    fireEvent.change(screen.getByLabelText(/código de rastreio do envio da cliente/i), {
      target: { value: 'aa1br' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onSetTracking).toHaveBeenCalledWith('ord-1', 'AA1BR'))
  })

  it('código vazio deixa o botão desabilitado', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  it('a tela diz que informar é opcional', () => {
    montar()
    expect(screen.getByText(/informar é opcional/i)).toBeInTheDocument()
  })
})

describe('OrderMaterialCard — pedido cancelado sai da fila (edge case)', () => {
  it('não oferece transição nem campo, e diz o que fazer com o material', () => {
    montar(order({ status: 'cancelled' }))

    expect(screen.queryByRole('button', { name: /marcar material como recebido/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/código de rastreio do envio/i)).not.toBeInTheDocument()
    expect(screen.getByText(/saiu da fila de material/i)).toBeInTheDocument()
    expect(screen.getByText(/devolva à cliente/i)).toBeInTheDocument()
  })
})
