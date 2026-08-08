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
  type ContactDraft,
  type PaymentDraft,
  type ShippingDraft,
} from '@estrelinha/core/checkout'

export const CHECKOUT_STORAGE_KEY = 'nanapin-checkout'

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
  reset: () => void

  draft: () => CheckoutDraft
  blocks: () => { open: BlockId | null; complete: BlockId[] }
  isStale: () => boolean
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      ...emptyDraft(),
      orderId: null,
      orderSnapshot: null,
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
      invalidateOrder: () => set({ orderId: null, orderSnapshot: null }),
      reset: () => {
        set({ ...emptyDraft(), orderId: null, orderSnapshot: null, dirty: [] })
        useCheckoutStore.persist.clearStorage()
      },

      draft: () => {
        const { contact, address, shipping, payment, bumpChecked } = get()
        return { contact, address, shipping, payment, bumpChecked }
      },
      blocks: () => resolveBlocks(get().draft()),
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
      }),
    },
  ),
)
