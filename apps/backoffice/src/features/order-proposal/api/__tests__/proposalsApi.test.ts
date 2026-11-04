// O cliente da function `order-proposals` (feature 89, T13: `MON-11`, `LNK-03`..`LNK-06`).
//
// Duas réguas: o CORPO exato de cada ação (por igualdade, nunca "contém"), e a falha chegando com a
// frase e o `code` do servidor — `functions.invoke` joga o corpo fora, e sem ler o `context` a tela
// mostraria a mensagem crua do supabase-js no lugar de "Os preços mudaram…".

import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { functions: { invoke } } }))

import {
  PROPOSALS_KEY,
  PROPOSAL_LIST_KEY,
  ProposalError,
  cancelProposal,
  getProposal,
  invalidarPropostas,
  listProposals,
  logProposalSent,
  saveProposalNote,
  motivoDaFalha,
  proposalKey,
  renewProposal,
  saveProposal,
  type SaveProposalPayload,
} from '../proposalsApi'

const ID = '11111111-1111-4111-8111-111111111111'

const erroHttp = (corpo: unknown) => ({
  name: 'FunctionsHttpError',
  message: 'Edge Function returned a non-2xx status code',
  context: { json: async () => corpo },
})

beforeEach(() => invoke.mockReset())

describe('o corpo de cada ação', () => {
  it('list → POST sem campos, e devolve a lista', async () => {
    invoke.mockResolvedValueOnce({ data: { proposals: [{ id: ID }] }, error: null })
    expect(await listProposals()).toEqual([{ id: ID }])
    expect(invoke).toHaveBeenCalledWith('order-proposals?action=list', { body: {} })
  })

  it('list sem `proposals` no corpo é lista vazia', async () => {
    invoke.mockResolvedValueOnce({ data: {}, error: null })
    expect(await listProposals()).toEqual([])
  })

  it('get → { id }', async () => {
    invoke.mockResolvedValueOnce({ data: { proposal: { id: ID }, state: 'open' }, error: null })
    await getProposal(ID)
    expect(invoke).toHaveBeenCalledWith('order-proposals?action=get', { body: { id: ID } })
  })

  it('save → o payload inteiro, sem chave acrescentada', async () => {
    const payload: SaveProposalPayload = {
      idempotency_key: 'k',
      customer_id: null,
      customer_name: 'Ana',
      customer_email: 'ana@x.invalid',
      customer_phone: null,
      customer_document: null,
      address_zip: null,
      address_street: null,
      address_number: null,
      address_complement: null,
      address_neighborhood: null,
      address_city: null,
      address_state: null,
      lines: [{ product_id: ID, variant_id: null, quantity: 1, engraving_text: null }],
      coupon_code: null,
      manual_discount: null,
      expected_total: 100,
      admin_note: 'Embrulhar para presente',
    }
    invoke.mockResolvedValueOnce({ data: { id: ID, token: 't' }, error: null })
    await saveProposal(payload)
    expect(invoke).toHaveBeenCalledWith('order-proposals?action=save', { body: payload })
  })

  it('renew → { id } sem total, e { id, expected_total } quando a Adri confirmou o relido', async () => {
    invoke.mockResolvedValue({ data: {}, error: null })
    await renewProposal(ID)
    expect(invoke).toHaveBeenLastCalledWith('order-proposals?action=renew', { body: { id: ID } })
    await renewProposal(ID, 87.5)
    expect(invoke).toHaveBeenLastCalledWith('order-proposals?action=renew', { body: { id: ID, expected_total: 87.5 } })
  })

  it('cancel → { id }; log-sent → { id, channel }', async () => {
    invoke.mockResolvedValue({ data: {}, error: null })
    await cancelProposal(ID)
    expect(invoke).toHaveBeenLastCalledWith('order-proposals?action=cancel', { body: { id: ID } })
    await logProposalSent(ID, 'whatsapp')
    expect(invoke).toHaveBeenLastCalledWith('order-proposals?action=log-sent', { body: { id: ID, channel: 'whatsapp' } })
    await logProposalSent(ID, 'copy')
    expect(invoke).toHaveBeenLastCalledWith('order-proposals?action=log-sent', { body: { id: ID, channel: 'copy' } })
  })
})

describe('note — a observação da proposta', () => {
  it('note → { id, admin_note }; vazia vai null', async () => {
    invoke.mockResolvedValue({ data: { id: ID, admin_note: 'x' }, error: null })
    await saveProposalNote(ID, 'Ligar antes')
    expect(invoke).toHaveBeenLastCalledWith('order-proposals?action=note', { body: { id: ID, admin_note: 'Ligar antes' } })
    await saveProposalNote(ID, null)
    expect(invoke).toHaveBeenLastCalledWith('order-proposals?action=note', { body: { id: ID, admin_note: null } })
  })

  it('a recusa da proposta concluída chega com a frase do servidor', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: erroHttp({ error: 'Esta proposta já virou pedido: a observação agora é a do pedido.', code: 'completed' }),
    })
    const falha = await saveProposalNote(ID, 'x').catch((e) => e)
    expect(falha).toBeInstanceOf(ProposalError)
    expect(falha.message).toBe('Esta proposta já virou pedido: a observação agora é a do pedido.')
    expect(falha.code).toBe('completed')
  })
})

describe('a falha, com a frase do servidor', () => {
  it('PRC-02: prices_changed chega com a frase, o código e o resumo relido', async () => {
    const summary = { items_total: 90 }
    invoke.mockResolvedValueOnce({
      data: null,
      error: erroHttp({ error: 'Os preços mudaram enquanto você montava. Confira o resumo.', code: 'prices_changed', summary }),
    })
    const falha = await saveProposal({} as SaveProposalPayload).catch((e) => e)
    expect(falha).toBeInstanceOf(ProposalError)
    expect(falha.message).toBe('Os preços mudaram enquanto você montava. Confira o resumo.')
    expect(falha.code).toBe('prices_changed')
    expect(falha.summary).toEqual(summary)
  })

  it('version_conflict chega com o código', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: erroHttp({ error: 'Esta proposta mudou em outra aba. Recarreguei.', code: 'version_conflict' }) })
    const falha = await getProposal(ID).catch((e) => e)
    expect(falha.code).toBe('version_conflict')
    expect(falha.message).toBe('Esta proposta mudou em outra aba. Recarreguei.')
  })

  it('corpo ilegível cai no fallback em português, nunca na mensagem crua', async () => {
    const quebrado = { message: 'Edge Function returned a non-2xx status code', context: { json: async () => { throw new Error('x') } } }
    expect(await motivoDaFalha(quebrado, 'Não consegui ler a proposta.')).toEqual({
      message: 'Não consegui ler a proposta.',
      code: null,
      summary: null,
    })
    invoke.mockResolvedValueOnce({ data: null, error: quebrado })
    await expect(cancelProposal(ID)).rejects.toThrow('Não consegui cancelar a proposta.')
  })

  it('erro sem context (rede) também cai no fallback', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: new Error('Failed to fetch') })
    await expect(listProposals()).rejects.toThrow('Não consegui ler as propostas.')
  })
})

describe('as chaves do React Query', () => {
  it('lista e detalhe moram sob o mesmo prefixo, e invalidar por id alcança os dois', async () => {
    expect(PROPOSAL_LIST_KEY.slice(0, 2)).toEqual([...PROPOSALS_KEY])
    expect(proposalKey(ID).slice(0, 2)).toEqual([...PROPOSALS_KEY])
    const qc = new QueryClient()
    qc.setQueryData(PROPOSAL_LIST_KEY, [])
    qc.setQueryData(proposalKey(ID), {})
    qc.setQueryData(proposalKey('outra'), {})
    await invalidarPropostas(qc, ID)
    expect(qc.getQueryState(PROPOSAL_LIST_KEY)?.isInvalidated).toBe(true)
    expect(qc.getQueryState(proposalKey(ID))?.isInvalidated).toBe(true)
    expect(qc.getQueryState(proposalKey('outra'))?.isInvalidated).toBe(false)
  })
})
