// Rascunho do checkout one-page — tipos do domínio puro (sem React).
// CHK-03: os campos de cada bloco. CHK-04: os três blocos do acordeão.

export type BlockId = 'contact' | 'delivery' | 'payment'

export interface ContactDraft {
  name: string
  email: string
  whatsapp: string
  /** Consentimento de marketing (CHK-11). Não entra na definição de "completo". */
  consent: boolean
}

export interface AddressDraft {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  /** ViaCEP não resolveu => os campos travados liberam para digitação (SHP-03/ADR-01). */
  manual: boolean
}

export interface ShippingDraft {
  serviceId: string
  serviceName: string
  carrier: string
  cost: number
  estimateMin: string
  estimateMax: string
}

export interface PaymentDraft {
  method: 'pix' | 'card' | null
  cpf: string
}

export interface CheckoutDraft {
  contact: ContactDraft
  address: AddressDraft
  shipping: ShippingDraft | null
  payment: PaymentDraft
  bumpChecked: boolean
}

/** O bloco Entrega depende do endereço **e** da opção de envio selecionada. */
export type DeliveryDraft = Pick<CheckoutDraft, 'address' | 'shipping'>

/**
 * FLW-01 … FLW-06: o que a **pessoa** fez na tela, separado do que o rascunho tem preenchido.
 * Completude diz se o bloco está válido; isto diz se ele já pode sair do caminho dela.
 */
export interface FlowState {
  /** Blocos que o usuário editou de fato. Semear de `customers`/`addresses` NÃO suja (FLW-04). */
  dirty: BlockId[]
  /** Blocos confirmados por clique em `Continuar` (FLW-03). */
  confirmed: BlockId[]
  /** Bloco que o usuário pediu para alterar; vence a ordem natural (FLW-06). */
  editing: BlockId | null
}
