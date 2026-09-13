// Rascunho do checkout one-page (CHK-07, CHK-08).
//
// As regras não moram aqui: `blocks()` e `isStale()` delegam a `resolveBlocks`/`isOrderStale`
// de `@estrelinha/core/checkout`, que são domínio puro e já têm suíte própria. O store só guarda
// estado e o repassa.
//
// Diferença deliberada em relação a `entities/cart/model/cartStore.ts` (que persiste em
// localStorage): aqui a persistência é em **sessionStorage**. O rascunho e o `order_id` em
// curso são da sessão — localStorage traria de volta um pedido `pending` de dias atrás.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  isOrderStale,
  resolveBlocks,
  type AddressDraft,
  type BlockId,
  type CheckoutDraft,
  type CheckoutIdentity,
  type ContactDraft,
  type PaymentDraft,
  type ShippingDraft,
} from '@estrelinha/core/checkout'

export const CHECKOUT_STORAGE_KEY = 'estrelinha-checkout'

const emptyDraft = (): CheckoutDraft => ({
  contact: { name: '', email: '', whatsapp: '', consent: false },
  address: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    manual: false,
  },
  shipping: null,
  payment: { method: null, cpf: '' },
  bumpChecked: false,
})

interface CheckoutState extends CheckoutDraft {
  /** Pedido `pending` em curso; `null` enquanto o CTA não foi acionado. */
  orderId: string | null
  /** O rascunho no momento em que o pedido foi criado — base da comparação de CHK-08. */
  orderSnapshot: CheckoutDraft | null
  /**
   * `PED-04`: a chave de idempotência da tentativa em curso.
   *
   * Ela **tem** de sobreviver à retentativa — é isso que faz o servidor devolver o mesmo pedido em
   * vez de criar um segundo. Gerada uma vez por tentativa de CTA e descartada junto com o pedido:
   * chave que sobrevive à invalidação faria a tentativa seguinte, com rascunho JÁ ALTERADO,
   * reaproveitar o pedido antigo — cobrando o valor que a cliente acabou de mudar.
   */
  clientRequestId: string | null
  /**
   * FLW-01/FLW-04: blocos que a **pessoa** editou nesta tela. Fica no store porque quem edita são
   * os blocos, e eles já falam com o store — a alternativa seria um `onDirty` em cada `onChange`.
   * Semear de `customers`/`addresses` não suja: é o que preserva ADR-02.
   */
  dirty: BlockId[]

  setContact: (patch: Partial<ContactDraft>) => void
  setAddress: (patch: Partial<AddressDraft>) => void
  setShipping: (shipping: ShippingDraft | null) => void
  setPayment: (patch: Partial<PaymentDraft>) => void
  toggleBump: (checked?: boolean) => void
  markDirty: (id: BlockId) => void
  setOrder: (id: string, snapshot: CheckoutDraft) => void
  invalidateOrder: () => void
  /** Devolve a chave da tentativa em curso, criando uma na primeira vez (`PED-04`). */
  ensureRequestId: () => string
  reset: () => void

  draft: () => CheckoutDraft
  /** `IDN-04`: a identidade entra na régua porque desafio pendente impede o contato de completar. */
  blocks: (identity: CheckoutIdentity) => { open: BlockId | null; complete: BlockId[] }
  isStale: () => boolean
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      ...emptyDraft(),
      orderId: null,
      orderSnapshot: null,
      clientRequestId: null,
      dirty: [],

      setContact: (patch) => set((s) => ({ contact: { ...s.contact, ...patch } })),
      setAddress: (patch) => set((s) => ({ address: { ...s.address, ...patch } })),
      setShipping: (shipping) => set({ shipping }),
      setPayment: (patch) => set((s) => ({ payment: { ...s.payment, ...patch } })),
      toggleBump: (checked) => set((s) => ({ bumpChecked: checked ?? !s.bumpChecked })),
      // Patch vazio quando o bloco já está sujo: devolver um array novo a cada tecla faria a
      // página re-renderizar à toa (o seletor compara por referência).
      markDirty: (id) => set((s) => (s.dirty.includes(id) ? {} : { dirty: [...s.dirty, id] })),

      setOrder: (id, snapshot) => set({ orderId: id, orderSnapshot: snapshot }),
      // A chave de idempotência morre COM o pedido: mantê-la faria a próxima tentativa, já com o
      // rascunho alterado, reaproveitar o pedido antigo — e cobrar o valor que a cliente mudou.
      invalidateOrder: () => set({ orderId: null, orderSnapshot: null, clientRequestId: null }),
      ensureRequestId: () => {
        const atual = get().clientRequestId
        if (atual) return atual
        const nova =
          globalThis.crypto?.randomUUID?.() ??
          `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
        set({ clientRequestId: nova })
        return nova
      },
      reset: () => {
        set({
          ...emptyDraft(),
          orderId: null,
          orderSnapshot: null,
          clientRequestId: null,
          dirty: [],
        })
        useCheckoutStore.persist.clearStorage()
      },

      draft: () => {
        const { contact, address, shipping, payment, bumpChecked } = get()
        return { contact, address, shipping, payment, bumpChecked }
      },
      blocks: (identity) => resolveBlocks(get().draft(), identity),
      isStale: () => isOrderStale(get().draft(), get().orderSnapshot),
    }),
    {
      name: CHECKOUT_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      // `dirty` fica DE FORA de propósito: recarregar a página volta ao estado "nada editado
      // nesta sessão de tela", e o bloco já preenchido reabre colapsado (FLW-04).
      partialize: (s) => ({
        contact: s.contact,
        address: s.address,
        shipping: s.shipping,
        payment: s.payment,
        bumpChecked: s.bumpChecked,
        orderId: s.orderId,
        orderSnapshot: s.orderSnapshot,
        // Persistida junto com o pedido, e pelo mesmo motivo: recarregar a aba no meio de uma
        // tentativa não pode fazer a retentativa criar um SEGUNDO pedido (`PED-04`). Os três
        // nascem e morrem juntos.
        clientRequestId: s.clientRequestId,
      }),
    },
  ),
)
