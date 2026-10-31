import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@estrelinha/supabase/client'
import { PICKUP_REFUSAL } from '@estrelinha/core/shipping'
import {
  ProposalChangedError,
  ProposalItemUnavailableError,
  ProposalUnavailableError,
  PickupUnavailableError,
  createProposalOrder,
  fetchProposal,
  PROPOSAL_READ_FAILED_MESSAGE,
  type ProposalOrderInput,
} from '../proposalApi'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Feature 89 · T24 — a API da proposta na loja: o corpo EXATO que vai à function `checkout`, e o
// mapeamento de cada recusa do servidor (contrato da T09: 404 `unavailable`, 409 `proposal_changed`,
// 422 `item_unavailable`) para um tipo que a página distingue.

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { functions: { invoke: vi.fn() } } }))
const invoke = vi.mocked(supabase.functions.invoke)

/** O que `functions.invoke` devolve num 4xx/5xx: `data` nulo e o corpo dentro do `context`. */
const falha = (status: number, corpo: unknown) => ({
  data: null,
  error: { message: 'Edge Function returned a non-2xx status code', context: { status, json: async () => corpo } },
})

beforeEach(() => invoke.mockReset())

const PROPOSTA = { id: 'p1', number: 'P-0001', version: 2, lines: [] }

describe('fetchProposal (CON-01, CON-07, CON-08)', () => {
  it('manda só o token, no corpo', async () => {
    invoke.mockResolvedValue({ data: { proposal: PROPOSTA }, error: null } as any)
    await fetchProposal('tok')
    expect(invoke).toHaveBeenCalledWith('checkout?action=get-proposal', { body: { token: 'tok' } })
  })

  it('aberta ⇒ a proposta', async () => {
    invoke.mockResolvedValue({ data: { proposal: PROPOSTA }, error: null } as any)
    expect(await fetchProposal('tok')).toEqual({ kind: 'open', proposal: PROPOSTA })
  })

  it('concluída ⇒ o pedido e o acesso reemitido (CON-07)', async () => {
    invoke.mockResolvedValue({ data: { completed: true, order_id: 'o1', access_token: 'acc' }, error: null } as any)
    expect(await fetchProposal('tok')).toEqual({ kind: 'completed', orderId: 'o1', accessToken: 'acc' })
  })

  it('404 unavailable ⇒ indisponível, sem lançar (CON-08)', async () => {
    invoke.mockResolvedValue(falha(404, { error: 'x', code: 'unavailable' }) as any)
    expect(await fetchProposal('tok')).toEqual({ kind: 'unavailable' })
  })

  it.each([
    ['429', falha(429, { error: 'Muitas consultas.' })],
    ['502', falha(502, { error: 'Não consegui abrir.' })],
    ['rede', { data: null, error: { message: 'Failed to fetch' } }],
  ])('%s ⇒ falha de leitura, NUNCA "indisponível"', async (_n, resposta) => {
    invoke.mockResolvedValue(resposta as any)
    await expect(fetchProposal('tok')).rejects.toThrow(PROPOSAL_READ_FAILED_MESSAGE)
  })
})

const ENTRADA: ProposalOrderInput = {
  proposal_token: 'tok',
  proposal_version: 2,
  client_request_id: 'req-1',
  payment_method: 'pix',
  customer_name: 'Maria Souza',
  customer_phone: '51988887777',
  customer_document: '39053344705',
  address_zip: '90010000',
  address_street: 'Rua A',
  address_number: '10',
  address_complement: '',
  address_neighborhood: 'Centro',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  shipping_service_id: '1',
  shipping_carrier: 'Correios',
  shipping_method: 'PAC',
  shipping_cost: 14.9,
  delivery_estimate_min: '2026-11-04',
  delivery_estimate_max: '2026-11-06',
}

describe('createProposalOrder (CON-05, CON-06, CON-09, CON-10)', () => {
  it('manda o corpo EXATO a create-order — sem itens, preços nem e-mail (PRC-03, A-07)', async () => {
    invoke.mockResolvedValue({ data: { order_id: 'o1', order_number: '0244', access_token: 'acc' }, error: null } as any)
    await createProposalOrder(ENTRADA)
    expect(invoke).toHaveBeenCalledWith('checkout?action=create-order', { body: ENTRADA })
    const corpo = invoke.mock.calls[0][1]?.body as Record<string, unknown>
    for (const proibido of ['items', 'subtotal', 'total', 'discount', 'customer_email', 'coupon_code']) {
      expect(corpo).not.toHaveProperty(proibido)
    }
  })

  it('sucesso ⇒ id, acesso e número', async () => {
    invoke.mockResolvedValue({ data: { order_id: 'o1', order_number: '0244', access_token: 'acc' }, error: null } as any)
    expect(await createProposalOrder(ENTRADA)).toEqual({ id: 'o1', access_token: 'acc', order_number: '0244', reused: false })
  })

  it('reused ⇒ o MESMO pedido (CON-06)', async () => {
    invoke.mockResolvedValue({ data: { order_id: 'o1', order_number: null, access_token: 'acc', reused: true }, error: null } as any)
    expect((await createProposalOrder(ENTRADA)).reused).toBe(true)
  })

  it('404 unavailable ⇒ ProposalUnavailableError', async () => {
    invoke.mockResolvedValue(falha(404, { error: 'x', code: 'unavailable' }) as any)
    await expect(createProposalOrder(ENTRADA)).rejects.toBeInstanceOf(ProposalUnavailableError)
  })

  it('409 proposal_changed ⇒ ProposalChangedError', async () => {
    invoke.mockResolvedValue(falha(409, { error: 'x', code: 'proposal_changed' }) as any)
    await expect(createProposalOrder(ENTRADA)).rejects.toBeInstanceOf(ProposalChangedError)
  })

  it('422 item_unavailable ⇒ o erro com as posições', async () => {
    invoke.mockResolvedValue(falha(422, { error: 'x', code: 'item_unavailable', positions: [1, 3] }) as any)
    const erro = await createProposalOrder(ENTRADA).catch((e) => e)
    expect(erro).toBeInstanceOf(ProposalItemUnavailableError)
    expect(erro.positions).toEqual([1, 3])
  })

  it('422 da retirada ⇒ PickupUnavailableError (a mesma de /checkout)', async () => {
    invoke.mockResolvedValue(falha(422, { error: PICKUP_REFUSAL }) as any)
    await expect(createProposalOrder(ENTRADA)).rejects.toBeInstanceOf(PickupUnavailableError)
  })

  it('500 ⇒ erro genérico, que não é nenhum dos tipos acima', async () => {
    invoke.mockResolvedValue(falha(500, { error: 'Não conseguimos criar seu pedido.' }) as any)
    const erro = await createProposalOrder(ENTRADA).catch((e) => e)
    expect(erro).toBeInstanceOf(Error)
    expect(erro).not.toBeInstanceOf(ProposalChangedError)
    expect(erro).not.toBeInstanceOf(ProposalUnavailableError)
    expect(erro.message).toBe('Não conseguimos criar seu pedido.')
  })
})
