// O rascunho da montagem (feature 89, T14: `MON-08`, `MON-09`, `MON-12`).
//
// A régua do resumo é IGUALDADE com `priceProposalDraft` sobre a mesma entrada — o teste independente
// de `MON` ("o total no resumo bate com resolveOrderPricing para a mesma entrada"). Uma conta escrita
// na tela poderia acertar estes números e errar outros; quem prova que não há conta na tela é o
// mutante que troca a chamada.

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { priceProposalDraft, PROPOSAL_ZERO_REFUSAL } from '@estrelinha/core/proposals'
import type { ProgressivePromotion } from '@estrelinha/core/payment/pricing'
import { ORDER_ADMIN_NOTE_MAX } from '@estrelinha/core/orders'

vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: [], isLoading: false }),
}))

import {
  NO_CUSTOMER,
  NO_EMAIL,
  NO_ITEMS,
  NO_NAME,
  addLine,
  createLinkRefusal,
  draftFromProposal,
  emptyDraft,
  lineReady,
  priceDraft,
  removeLine,
  toSavePayload,
  updateLine,
  type DraftLine,
  type ProposalDraft,
} from '../draft'
import { useProposalDraft } from '../useProposalDraft'
import type { ProposalDetail } from '../../api/proposalsApi'

const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const V1 = '33333333-3333-4333-8333-333333333333'
const FICHA = '44444444-4444-4444-8444-444444444444'

const linha = (over: Partial<DraftLine> = {}): DraftLine => ({
  key: 'k1',
  product_id: P1,
  product_name: 'Colar de Cinzas',
  needsVariant: true,
  variant_id: V1,
  variant_label: 'P · Sim',
  list_price: 150,
  quantity: 1,
  engraves: true,
  engraving_text: 'Ana',
  engraving_max: 10,
  requires_material: true,
  dimensions: {},
  ...over,
})

const completo = (over: Partial<ProposalDraft> = {}): ProposalDraft => ({
  ...emptyDraft(),
  customer: { mode: 'nova', fichaId: null, name: 'Ana Souza', email: 'Ana@X.invalid ', phone: '(51) 99999-0000', document: '111.222.333-44' },
  lines: [
    linha(),
    linha({ key: 'k2', product_id: P2, product_name: 'Anel', needsVariant: false, variant_id: null, variant_label: null, list_price: 80, quantity: 2, engraves: false, engraving_text: 'não vai' }),
  ],
  ...over,
})

describe('priceDraft — o resumo é de priceProposalDraft (MON-09)', () => {
  it('teste independente de MON: duas peças, cupom de 10% e R$ 20 combinados — mesmos números que core', () => {
    const d = completo({
      coupon: { code: 'DEZ', rule: { type: 'percent', value: 10 } },
      manual: { kind: 'amount', value: 20, reason: 'combinado no WhatsApp' },
    })
    const { price, refusal } = priceDraft(d, [])
    const esperado = priceProposalDraft({
      lines: [
        { product_id: P1, variant_id: V1, list_price: 150, quantity: 1 },
        { product_id: P2, variant_id: null, list_price: 80, quantity: 2 },
      ],
      coupon: { type: 'percent', value: 10 },
      promotions: [],
      manualDiscount: { kind: 'amount', value: 20, reason: 'combinado no WhatsApp' },
    })
    expect(refusal).toBeNull()
    expect(price.subtotal).toBe(310)
    expect(price.couponDiscount).toBe(esperado.couponDiscount)
    expect(price.manualDiscount).toBe(20)
    expect(price.itemsTotal).toBe(esperado.itemsTotal)
    expect(price.itemsTotal).toBe(259)
  })

  it('a promoção vigente entra pelo mesmo cálculo', () => {
    const promo: ProgressivePromotion = {
      id: 'p', discount_kind: 'percent', tiers: [{ min_qty: 1, value: 10 }], scope: 'all',
      eligibleProductIds: [], stacks_with_coupon: false, created_at: '2026-01-01',
    }
    const { price } = priceDraft(completo(), [promo])
    expect(price.promotionDiscount).toBeGreaterThan(0)
    expect(price.itemsTotal).toBe(priceProposalDraft({
      lines: [
        { product_id: P1, variant_id: V1, list_price: 150, quantity: 1 },
        { product_id: P2, variant_id: null, list_price: 80, quantity: 2 },
      ],
      coupon: null, promotions: [promo], manualDiscount: null,
    }).itemsTotal)
  })

  it('a linha sem variação escolhida fica FORA do preço (e o motivo diz qual)', () => {
    const d = completo({ lines: [linha({ variant_id: null, list_price: null })] })
    expect(lineReady(d.lines[0])).toBe(false)
    expect(priceDraft(d, []).price.subtotal).toBe(0)
    expect(createLinkRefusal(d, priceDraft(d, []))).toBe('Escolha a variação de Colar de Cinzas.')
  })

  it('MON-08: cupom + avulso que zeram os itens recusam com a frase de A-12, mesmo cabendo sozinhos', () => {
    const d = completo({
      lines: [linha({ list_price: 100 })],
      coupon: { code: 'C', rule: { type: 'fixed', value: 60 } },
      manual: { kind: 'amount', value: 39.5, reason: 'presente' },
    })
    expect(priceDraft({ ...d, manual: null }, []).refusal).toBeNull()
    expect(priceDraft({ ...d, coupon: null }, []).refusal).toBeNull()
    const juntos = priceDraft(d, [])
    expect(juntos.refusal).toBe(PROPOSAL_ZERO_REFUSAL)
    expect(createLinkRefusal(d, juntos)).toBe('O desconto não pode zerar o pedido.')
  })

  it('MON-08: avulso sem motivo, sem valor ou % fora da faixa recusa, e o preço segue SEM ele', () => {
    const semMotivo = completo({ manual: { kind: 'amount', value: 10, reason: '  ' } })
    const r = priceDraft(semMotivo, [])
    expect(r.refusal).toBe('Escreva o motivo do desconto combinado.')
    expect(r.price.manualDiscount).toBe(0)
    expect(priceDraft(completo({ manual: { kind: 'amount', value: null, reason: 'x' } }), []).refusal).toBe('Informe o valor do desconto combinado.')
    expect(priceDraft(completo({ manual: { kind: 'percent', value: 100, reason: 'x' } }), []).refusal).toBe('O desconto em percentual vai de 0,01% a 99,99%.')
    expect(priceDraft(completo({ manual: { kind: 'amount', value: 10, reason: 'x'.repeat(121) } }), []).refusal).toBe('O motivo do desconto vai até 120 caracteres.')
  })
})

describe('createLinkRefusal — cada motivo de MON-12, escrito', () => {
  const motivo = (d: ProposalDraft) => createLinkRefusal(d, priceDraft(d, []))

  it('na ordem: cliente → nome → e-mail → peça → variação → gravação → preço', () => {
    expect(motivo(emptyDraft())).toBe(NO_CUSTOMER)
    expect(NO_CUSTOMER).toBe('Escolha a cliente ou cadastre uma nova.')
    expect(motivo(completo({ customer: { ...completo().customer, name: ' ' } }))).toBe(NO_NAME)
    expect(motivo(completo({ customer: { ...completo().customer, email: 'ana@' } }))).toBe(NO_EMAIL)
    expect(motivo(completo({ lines: [] }))).toBe(NO_ITEMS)
    expect(motivo(completo({ lines: [linha({ engraving_text: 'nome longo demais' })] }))).toBe(
      'Colar de Cinzas: A gravação tem 17 caracteres e o limite desta peça é 10.',
    )
    expect(motivo(completo())).toBeNull()
  })

  it('endereço é opcional (a cliente preenche no link)', () => {
    expect(motivo(completo({ address: emptyDraft().address }))).toBeNull()
  })

  it('a observação acima do teto recusa com a frase de core; no teto (aparado, por ponto de código) não', () => {
    expect(motivo(completo({ adminNote: 'a'.repeat(ORDER_ADMIN_NOTE_MAX + 1) }))).toBe(
      `A observação vai até ${ORDER_ADMIN_NOTE_MAX} caracteres.`,
    )
    expect(motivo(completo({ adminNote: ` ${'🌟'.repeat(ORDER_ADMIN_NOTE_MAX)} ` }))).toBeNull()
  })

  it('a gravação de uma linha que NÃO grava não recusa', () => {
    expect(motivo(completo({ lines: [linha({ engraves: false, engraving_text: 'x'.repeat(40) })] }))).toBeNull()
  })
})

describe('toSavePayload — o corpo do save, por igualdade', () => {
  const CHAVES = [
    'customer_id', 'customer_name', 'customer_email', 'customer_phone', 'customer_document',
    'address_zip', 'address_street', 'address_number', 'address_complement', 'address_neighborhood',
    'address_city', 'address_state', 'lines', 'coupon_code', 'manual_discount', 'expected_total',
    'admin_note',
  ]

  it('criar: só as chaves do contrato + idempotency_key; campo de tela nunca chega', () => {
    const d = completo({
      address: { ...emptyDraft().address, zip: '90000-000', street: 'Rua A', number: '10', city: 'Porto Alegre', state: 'rs', saveToCustomer: true, savedId: 'e1' },
      coupon: { code: 'DEZ', rule: { type: 'percent', value: 10 } },
      manual: { kind: 'percent', value: 5, reason: ' combinado ' },
      adminNote: '  Embrulhar para presente  ',
    })
    const p = toSavePayload(d, priceDraft(d, []), { idempotencyKey: 'chave-1' })
    expect(Object.keys(p).sort()).toEqual(['idempotency_key', ...CHAVES].sort())
    expect(p).toEqual({
      idempotency_key: 'chave-1',
      customer_id: null,
      customer_name: 'Ana Souza',
      customer_email: 'ana@x.invalid',
      customer_phone: '51999990000',
      customer_document: '11122233344',
      address_zip: '90000000',
      address_street: 'Rua A',
      address_number: '10',
      address_complement: null,
      address_neighborhood: null,
      address_city: 'Porto Alegre',
      address_state: 'RS',
      lines: [
        { product_id: P1, variant_id: V1, quantity: 1, engraving_text: 'Ana' },
        // A linha que não grava manda `null`, nunca o texto que sobrou no campo.
        { product_id: P2, variant_id: null, quantity: 2, engraving_text: null },
      ],
      coupon_code: 'DEZ',
      manual_discount: { kind: 'percent', value: 5, reason: 'combinado' },
      expected_total: priceDraft(d, []).price.itemsTotal,
      admin_note: 'Embrulhar para presente',
    })
    for (const l of p.lines) expect(Object.keys(l).sort()).toEqual(['engraving_text', 'product_id', 'quantity', 'variant_id'])
  })

  it('editar: id + version, sem idempotency_key', () => {
    const d = completo()
    const p = toSavePayload(d, priceDraft(d, []), { id: 'pid', version: 3 })
    expect(Object.keys(p).sort()).toEqual(['id', 'version', ...CHAVES].sort())
    expect(p.id).toBe('pid')
    expect(p.version).toBe(3)
  })

  it('a observação vazia (ou só espaço) vai null — a chave vai sempre, e apaga', () => {
    for (const vazia of ['', '   ']) {
      const d = completo({ adminNote: vazia })
      const p = toSavePayload(d, priceDraft(d, []), { id: 'pid', version: 3 })
      expect(p).toHaveProperty('admin_note', null)
    }
  })

  it('a ficha só vai como customer_id para a cliente EXISTENTE', () => {
    const existente = completo({ customer: { ...completo().customer, mode: 'existente', fichaId: FICHA } })
    expect(toSavePayload(existente, priceDraft(existente, []), { idempotencyKey: 'k' }).customer_id).toBe(FICHA)
    const nova = completo({ customer: { ...completo().customer, mode: 'nova', fichaId: FICHA } })
    expect(toSavePayload(nova, priceDraft(nova, []), { idempotencyKey: 'k' }).customer_id).toBeNull()
  })
})

describe('operações e draftFromProposal', () => {
  it('acrescentar, mudar e tirar uma linha são puras', () => {
    const d0 = emptyDraft()
    const d1 = addLine(d0, linha())
    expect(d0.lines).toHaveLength(0)
    expect(updateLine(d1, 'k1', { quantity: 3 }).lines[0].quantity).toBe(3)
    expect(removeLine(d1, 'k1').lines).toHaveLength(0)
  })

  const proposta = {
    customer_id: FICHA, customer_name: 'Ana', customer_email: 'ana@x.invalid', customer_phone: '51999990000',
    customer_document: null, address_zip: '90000000', address_street: 'Rua A', address_number: '1',
    address_complement: null, address_neighborhood: 'Centro', address_city: 'POA', address_state: 'RS',
    manual_discount_kind: 'amount', manual_discount_value: 15, manual_discount_reason: 'amiga',
    admin_note: 'Embrulhar para presente',
    items: [{ position: 0, product_id: P1, variant_id: V1, product_name: 'Colar', product_image: null, variant_label: 'P', variant_options: null, quantity: 2, list_price: 150, unit_price: 140, engraving_text: 'Ana', requires_material: true, material_kinds: [] }],
  } as unknown as ProposalDetail

  it('editar leva a cliente, o endereço, as peças e o desconto', () => {
    const d = draftFromProposal(proposta, 'editar')
    expect(d.customer).toMatchObject({ mode: 'existente', fichaId: FICHA, name: 'Ana' })
    expect(d.address).toMatchObject({ zip: '90000000', city: 'POA' })
    expect(d.lines[0]).toMatchObject({ product_id: P1, variant_id: V1, quantity: 2, list_price: 150, engraving_text: 'Ana' })
    expect(d.manual).toEqual({ kind: 'amount', value: 15, reason: 'amiga' })
    expect(d.adminNote).toBe('Embrulhar para presente')
  })

  it('DUP-01: duplicar leva peças e desconto e deixa a cliente por escolher', () => {
    const d = draftFromProposal(proposta, 'duplicar')
    expect(d.customer.mode).toBe('nenhuma')
    expect(d.address.zip).toBe('')
    expect(d.lines).toHaveLength(1)
    expect(d.manual?.value).toBe(15)
    // A observação é daquela proposta, não das peças: duplicar não a copia.
    expect(d.adminNote).toBe('')
  })
})

describe('useProposalDraft', () => {
  it('o motivo e o resumo acompanham o rascunho, e a chave de idempotência é uma por montagem', () => {
    const { result, rerender } = renderHook(() => useProposalDraft())
    expect(result.current.refusal).toBe(NO_CUSTOMER)
    const chave = result.current.idempotencyKey
    act(() => result.current.setCustomer({ mode: 'nova', name: 'Ana', email: 'ana@x.invalid' }))
    expect(result.current.refusal).toBe(NO_ITEMS)
    act(() => result.current.addLine(linha({ engraving_text: '' })))
    expect(result.current.refusal).toBeNull()
    expect(result.current.pricing.price.itemsTotal).toBe(150)
    rerender()
    expect(result.current.idempotencyKey).toBe(chave)
    expect(result.current.payload().idempotency_key).toBe(chave)
    expect(result.current.payload({ id: 'p', version: 2 }).idempotency_key).toBeUndefined()
  })

  it('setAdminNote leva a observação ao payload', () => {
    const { result } = renderHook(() => useProposalDraft())
    act(() => result.current.setAdminNote('  Ligar antes  '))
    expect(result.current.draft.adminNote).toBe('  Ligar antes  ')
    expect(result.current.payload().admin_note).toBe('Ligar antes')
  })
})
