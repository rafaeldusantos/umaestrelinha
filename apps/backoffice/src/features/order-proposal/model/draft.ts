// O rascunho da montagem da proposta — puro (feature 89, `MON-08`, `MON-09`, `MON-12`).
//
// Três coisas moram aqui, e nenhuma conta dinheiro:
//   1. A FORMA do rascunho e as operações sobre ele (acrescentar peça, trocar quantidade…).
//   2. O resumo, que vem de `priceProposalDraft` (`core/proposals`) — a MESMA função que a function
//      `order-proposals` chama ao gravar. Nenhuma soma de desconto é escrita na tela (`MON-09`): se o
//      painel calculasse por conta própria, o total da tela e o do servidor divergiriam sem nada
//      quebrar, e quem descobre é a cliente.
//   3. O motivo de "Criar link" estar indisponível (`MON-12`), escrito, e a tradução do rascunho no
//      corpo do `save` (`toSavePayload`), com as chaves por igualdade no teste.

import {
  manualDiscountRefusal,
  priceProposalDraft,
  type ManualDiscountDraft,
  type ProposalDraftPrice,
  type ProposalLine,
} from '@estrelinha/core/proposals'
import type { CouponRule, ProgressivePromotion } from '@estrelinha/core/payment/pricing'
import { engravingRefusal, normalizeEngraving } from '@estrelinha/core/material'
import { isValidEmail, normalizeEmail, stripCep, stripCpf, stripPhone } from '@estrelinha/core/validators'
import type { QuoteDimensions } from '@estrelinha/core/shipping'
import type { ProposalDetail, SaveProposalPayload } from '../api/proposalsApi'

// ---------------------------------------------------------------------------------------------
// A forma
// ---------------------------------------------------------------------------------------------

export type CustomerMode = 'nenhuma' | 'existente' | 'nova'

export interface DraftCustomer {
  mode: CustomerMode
  /** O id em `customers`; `null` para a convidada e para a cliente nova (a ficha nasce no save). */
  fichaId: string | null
  name: string
  email: string
  phone: string
  document: string
  /**
   * Campo de TELA, só para mostrar quem foi escolhida (tem conta, quantos pedidos). `null` quando a
   * tela não sabe — a proposta relida para editar não traz isso. Nunca vai ao servidor.
   */
  perfil?: { temConta: boolean; pedidos: number } | null
}

export interface DraftAddress {
  zip: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  /** `MON-04` — "Salvar no cadastro da cliente". NÃO vai para o `save`: a página grava em `addresses`. */
  saveToCustomer: boolean
  /** O endereço salvo escolhido, para a lista marcar qual é. */
  savedId: string | null
}

export interface DraftLine {
  /** Identidade de tela (React `key`); nunca vai ao servidor. */
  key: string
  product_id: string
  product_name: string
  /** A peça tem grade ativa: sem variação escolhida a linha não é gravável. */
  needsVariant: boolean
  variant_id: string | null
  variant_label: string | null
  /** Preço cheio da linha escolhida; `null` enquanto falta a variação. */
  list_price: number | null
  quantity: number
  /** A linha escolhida grava (`hasEngraving`). */
  engraves: boolean
  engraving_text: string
  engraving_max: number | null
  requires_material: boolean
  dimensions: QuoteDimensions
  /** Campo de TELA: a foto da variação escolhida (ou da peça). Nunca vai ao servidor. */
  image_url?: string | null
  /** Campo de TELA: o estoque da variação escolhida, para o teto do contador. `null` = livre. */
  stock_cap?: number | null
}

export interface DraftCoupon {
  code: string
  rule: CouponRule
}

export interface DraftManual {
  kind: 'amount' | 'percent'
  /** `null` enquanto o campo está vazio. */
  value: number | null
  reason: string
}

export interface ProposalDraft {
  customer: DraftCustomer
  address: DraftAddress
  lines: DraftLine[]
  coupon: DraftCoupon | null
  manual: DraftManual | null
}

export const emptyCustomer = (): DraftCustomer => ({
  mode: 'nenhuma',
  fichaId: null,
  name: '',
  email: '',
  phone: '',
  document: '',
})

export const emptyAddress = (): DraftAddress => ({
  zip: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  saveToCustomer: false,
  savedId: null,
})

export const emptyDraft = (): ProposalDraft => ({
  customer: emptyCustomer(),
  address: emptyAddress(),
  lines: [],
  coupon: null,
  manual: null,
})

let sequencia = 0
/** Uma chave de linha nova. Não é identidade de dado — só de tela. */
export const novaChave = (): string => `linha-${Date.now().toString(36)}-${(sequencia++).toString(36)}`

// ---------------------------------------------------------------------------------------------
// As operações (puras: devolvem um rascunho novo)
// ---------------------------------------------------------------------------------------------

export const addLine = (d: ProposalDraft, line: DraftLine): ProposalDraft => ({ ...d, lines: [...d.lines, line] })

export const updateLine = (d: ProposalDraft, key: string, patch: Partial<DraftLine>): ProposalDraft => ({
  ...d,
  lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)),
})

export const removeLine = (d: ProposalDraft, key: string): ProposalDraft => ({
  ...d,
  lines: d.lines.filter((l) => l.key !== key),
})

/** A linha está pronta para preço? Tem preço e, se a peça tem grade, a variação. */
export const lineReady = (l: DraftLine): boolean =>
  l.list_price !== null && Number.isFinite(l.list_price) && (!l.needsVariant || l.variant_id !== null)

// ---------------------------------------------------------------------------------------------
// O resumo — `priceProposalDraft`, nunca conta escrita aqui (MON-09)
// ---------------------------------------------------------------------------------------------

export interface DraftProposalLine extends ProposalLine {
  key: string
}

/** O avulso na forma de `core`, ou `null` quando não há. Valor vazio vira `NaN` (a recusa diz qual). */
export const toManualDraft = (m: DraftManual | null): ManualDiscountDraft | null =>
  m ? { kind: m.kind, value: m.value === null ? NaN : m.value, reason: m.reason } : null

export interface DraftPricing {
  price: ProposalDraftPrice<DraftProposalLine>
  /** A primeira recusa do preço (linhas, avulso, A-12), ou `null`. */
  refusal: string | null
}

export const priceDraft = (d: ProposalDraft, promotions: readonly ProgressivePromotion[]): DraftPricing => {
  const lines: DraftProposalLine[] = d.lines.filter(lineReady).map((l) => ({
    key: l.key,
    product_id: l.product_id,
    variant_id: l.variant_id,
    list_price: l.list_price as number,
    quantity: l.quantity,
  }))
  const manual = toManualDraft(d.manual)
  // O avulso inválido (vazio, sem motivo, fora da faixa) não entra no preço: os números do resumo
  // ficam os de sem ele, e a recusa diz o que falta. Com ele dentro, um `NaN` contaminaria o total.
  const manualRefusal = manualDiscountRefusal(manual)
  const price = priceProposalDraft<DraftProposalLine>({
    lines,
    coupon: d.coupon?.rule ?? null,
    promotions,
    manualDiscount: manualRefusal ? null : manual,
  })
  return { price, refusal: price.refusal ?? manualRefusal }
}

// ---------------------------------------------------------------------------------------------
// MON-12 — o motivo de "Criar link" indisponível
// ---------------------------------------------------------------------------------------------

export const NO_CUSTOMER = 'Escolha a cliente ou cadastre uma nova.'
export const NO_NAME = 'Informe o nome da cliente.'
export const NO_EMAIL = 'Informe um e-mail válido.'
export const NO_ITEMS = 'Acrescente pelo menos uma peça.'

/**
 * Por que o link ainda não pode ser criado — a frase que aparece AO LADO do botão. `null` = pode.
 * Endereço é opcional (`MON-12`): a cliente pode preencher no link.
 */
export const createLinkRefusal = (d: ProposalDraft, pricing: DraftPricing): string | null => {
  if (d.customer.mode === 'nenhuma') return NO_CUSTOMER
  if (d.customer.name.trim() === '') return NO_NAME
  if (!isValidEmail(d.customer.email)) return NO_EMAIL
  if (d.lines.length === 0) return NO_ITEMS
  for (const l of d.lines) {
    if (l.needsVariant && l.variant_id === null) return `Escolha a variação de ${l.product_name}.`
    if (l.list_price === null) return `Não consegui o preço de ${l.product_name}.`
  }
  for (const l of d.lines) {
    if (!l.engraves) continue
    const recusa = engravingRefusal(l.engraving_text, l.engraving_max)
    if (recusa) return `${l.product_name}: ${recusa}`
  }
  return pricing.refusal
}

// ---------------------------------------------------------------------------------------------
// O corpo do `save`
// ---------------------------------------------------------------------------------------------

export interface SaveTarget {
  /** Criar: a chave de idempotência (uma por montagem, contra o duplo clique). */
  idempotencyKey?: string
  /** Editar: a proposta e a versão lida. */
  id?: string
  version?: number
}

const ouNulo = (v: string): string | null => {
  const t = v.trim()
  return t === '' ? null : t
}

/** As chaves por igualdade no teste: campo de tela (`key`, `saveToCustomer`…) nunca chega à function. */
export const toSavePayload = (d: ProposalDraft, pricing: DraftPricing, alvo: SaveTarget): SaveProposalPayload => {
  const editando = !!alvo.id
  const cep = stripCep(d.address.zip)
  const payload: SaveProposalPayload = {
    customer_id: d.customer.mode === 'existente' ? d.customer.fichaId : null,
    customer_name: d.customer.name.trim(),
    customer_email: normalizeEmail(d.customer.email),
    customer_phone: ouNulo(stripPhone(d.customer.phone)),
    customer_document: ouNulo(stripCpf(d.customer.document)),
    address_zip: cep === '' ? null : cep,
    address_street: ouNulo(d.address.street),
    address_number: ouNulo(d.address.number),
    address_complement: ouNulo(d.address.complement),
    address_neighborhood: ouNulo(d.address.neighborhood),
    address_city: ouNulo(d.address.city),
    address_state: ouNulo(d.address.state.toUpperCase()),
    lines: d.lines.map((l) => ({
      product_id: l.product_id,
      variant_id: l.variant_id,
      quantity: l.quantity,
      engraving_text: l.engraves ? normalizeEngraving(l.engraving_text) : null,
    })),
    coupon_code: d.coupon?.code ?? null,
    manual_discount:
      d.manual && d.manual.value !== null
        ? { kind: d.manual.kind, value: d.manual.value, reason: d.manual.reason.trim() }
        : null,
    expected_total: pricing.price.itemsTotal,
  }
  if (editando) return { id: alvo.id, version: alvo.version, ...payload }
  return { idempotency_key: alvo.idempotencyKey, ...payload }
}

// ---------------------------------------------------------------------------------------------
// De uma proposta gravada (editar e duplicar, `LNK-05`, `DUP-01`)
// ---------------------------------------------------------------------------------------------

/**
 * O rascunho a partir da proposta. Os preços das linhas são os TRAVADOS (o `list_price` gravado); a
 * linha relê a peça ao montar e troca pelo preço de hoje, e o servidor confere de novo no save
 * (`PRC-01`/`PRC-02`). Duplicar (`DUP-01`) leva peças e desconto, e deixa a cliente para escolher.
 */
export const draftFromProposal = (p: ProposalDetail, modo: 'editar' | 'duplicar'): ProposalDraft => {
  const lines: DraftLine[] = (p.items ?? []).map((i) => ({
    key: novaChave(),
    product_id: i.product_id,
    product_name: i.product_name,
    needsVariant: i.variant_id !== null,
    variant_id: i.variant_id,
    variant_label: i.variant_label,
    list_price: Number(i.list_price),
    quantity: i.quantity,
    engraves: i.engraving_text !== null,
    engraving_text: i.engraving_text ?? '',
    engraving_max: null,
    requires_material: i.requires_material === true,
    dimensions: {},
  }))
  const manual: DraftManual | null =
    p.manual_discount_kind && p.manual_discount_value !== null
      ? { kind: p.manual_discount_kind, value: Number(p.manual_discount_value), reason: p.manual_discount_reason ?? '' }
      : null
  // O cupom vem travado como VALOR; sem a regra original, editar pede que a Adri o aplique de novo
  // (a regra pode ter mudado — é exatamente o que o servidor reconfere). Duplicar idem.
  const base: ProposalDraft = { ...emptyDraft(), lines, manual }
  if (modo === 'duplicar') return base
  return {
    ...base,
    customer: {
      mode: 'existente',
      fichaId: p.customer_id,
      name: p.customer_name ?? '',
      email: p.customer_email ?? '',
      phone: p.customer_phone ?? '',
      document: p.customer_document ?? '',
    },
    address: {
      ...emptyAddress(),
      zip: p.address_zip ?? '',
      street: p.address_street ?? '',
      number: p.address_number ?? '',
      complement: p.address_complement ?? '',
      neighborhood: p.address_neighborhood ?? '',
      city: p.address_city ?? '',
      state: p.address_state ?? '',
    },
  }
}
