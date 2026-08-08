// Regras dos blocos do checkout one-page — domínio puro (sem React).
// CHK-03: o que torna cada bloco "completo".
// CHK-04: qual bloco fica aberto (o primeiro incompleto), nunca mais de um.
// CHK-08: pedido em curso invalidado quando o rascunho muda depois de criado.
// FLW-01 … FLW-07: `resolveFlow` separa **completude** de **navegação** — completar um campo
// deixou de fechar o bloco embaixo do dedo de quem digita.
import { stripCep } from '../validators/cep'
import { isValidDocument } from '../validators/document'
import type {
  BlockId,
  CheckoutDraft,
  ContactDraft,
  DeliveryDraft,
  FlowState,
  PaymentDraft,
} from './types'

const BLOCK_ORDER: BlockId[] = ['contact', 'delivery', 'payment']

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const filled = (value: string) => (value ?? '').trim().length > 0

/** CHK-03: nome não vazio, e-mail com formato válido e WhatsApp com 10 ou 11 dígitos. */
export function isContactComplete(contact: ContactDraft): boolean {
  const whatsappDigits = (contact?.whatsapp ?? '').replace(/\D/g, '')

  return (
    filled(contact?.name) &&
    EMAIL_PATTERN.test((contact?.email ?? '').trim()) &&
    (whatsappDigits.length === 10 || whatsappDigits.length === 11)
  )
}

/** CHK-03: CEP com 8 dígitos, os 5 campos de endereço preenchidos e uma opção de envio marcada. */
export function isDeliveryComplete(delivery: DeliveryDraft): boolean {
  const address = delivery?.address

  return (
    !!address &&
    stripCep(address.cep).length === 8 &&
    filled(address.street) &&
    filled(address.number) &&
    filled(address.neighborhood) &&
    filled(address.city) &&
    filled(address.state) &&
    delivery.shipping !== null &&
    delivery.shipping !== undefined
  )
}

/**
 * CHK-03: método escolhido e, no PIX, documento válido (CPF ou CNPJ — DOC-02).
 *
 * PGM-06: no cartão basta o método. O documento e os dados do cartão vêm do Brick, que valida
 * no submit — apertar o CTA com o formulário vazio pinta os erros de campo e não cobra nada.
 * Espelhar essa validação aqui exigiria ler estado interno do Brick.
 *
 * O filtro "método habilitado nas settings" é do `PaymentBlock` — aqui só existe o rascunho.
 */
export function isPaymentComplete(payment: PaymentDraft): boolean {
  if (payment?.method === 'card') return true
  if (payment?.method === 'pix') return isValidDocument(payment?.cpf ?? '')
  return false
}

/**
 * CHK-04: `open` é o **primeiro** bloco incompleto na ordem contact → delivery → payment,
 * e `null` quando os três estão completos. Por construção nunca há mais de um aberto.
 */
export function resolveBlocks(draft: CheckoutDraft): { open: BlockId | null; complete: BlockId[] } {
  const done: Record<BlockId, boolean> = {
    contact: isContactComplete(draft.contact),
    delivery: isDeliveryComplete(draft),
    payment: isPaymentComplete(draft.payment),
  }

  return {
    open: BLOCK_ORDER.find((id) => !done[id]) ?? null,
    complete: BLOCK_ORDER.filter((id) => done[id]),
  }
}

/**
 * FLW-01 … FLW-07: quem abre e fecha bloco. Duas regras, e só:
 *
 *   settled(b) = temSucessor(b) && completo(b) && (confirmado(b) || !sujo(b))
 *   open       = editing ?? primeiro b não-settled ?? null
 *
 * `temSucessor` resolve FLW-05 sem exceção especial: `payment` é o último de `BLOCK_ORDER`, então
 * nunca *settle* — fica aberto sempre que Contato e Entrega estiverem resolvidos, que é onde
 * PGM-04 precisa do formulário de cartão montado. Consequência: `open` nunca é `null`, e por isso
 * FLW-07 tira o gate do CTA de `open` e o põe em `complete.length === 3`.
 *
 * `!sujo(b)` preserva ADR-02 (FLW-04): bloco semeado nasce completo e limpo ⇒ *settled* ⇒
 * colapsado. Da primeira tecla do usuário em diante, só `Continuar` o fecha (FLW-01).
 */
export function resolveFlow(
  draft: CheckoutDraft,
  flow: FlowState,
): { open: BlockId | null; complete: BlockId[]; settled: BlockId[] } {
  const { complete } = resolveBlocks(draft)

  const settled = BLOCK_ORDER.filter(
    (id, index) =>
      index < BLOCK_ORDER.length - 1 &&
      complete.includes(id) &&
      (flow.confirmed.includes(id) || !flow.dirty.includes(id)),
  )

  return {
    open: flow.editing ?? BLOCK_ORDER.find((id) => !settled.includes(id)) ?? null,
    complete,
    settled,
  }
}

/**
 * Projeção dos campos que definem o pedido cobrado. Fora dela ficam `contact.consent`
 * (marketing) e `address.manual` (modo de edição da UI) — nenhum dos dois muda a cobrança.
 */
function billingFingerprint(draft: CheckoutDraft): string {
  return JSON.stringify({
    name: draft.contact.name,
    email: draft.contact.email,
    whatsapp: draft.contact.whatsapp,
    cep: draft.address.cep,
    street: draft.address.street,
    number: draft.address.number,
    complement: draft.address.complement,
    neighborhood: draft.address.neighborhood,
    city: draft.address.city,
    state: draft.address.state,
    shipping: draft.shipping
      ? {
          serviceId: draft.shipping.serviceId,
          serviceName: draft.shipping.serviceName,
          carrier: draft.shipping.carrier,
          cost: draft.shipping.cost,
          estimateMin: draft.shipping.estimateMin,
          estimateMax: draft.shipping.estimateMax,
        }
      : null,
    method: draft.payment.method,
    cpf: draft.payment.cpf,
    bumpChecked: draft.bumpChecked,
  })
}

/**
 * CHK-08: `true` quando o rascunho mudou em algum campo que define o pedido depois de ele
 * ter sido criado. Sem snapshot não há pedido em curso — nada a invalidar.
 */
export function isOrderStale(draft: CheckoutDraft, snapshot: CheckoutDraft | null): boolean {
  if (!snapshot) return false
  return billingFingerprint(draft) !== billingFingerprint(snapshot)
}
