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
   * `IDN-07`: **quem era a pessoa quando o pedido em curso nasceu.** `null` é convidada, e é um
   * valor legítimo — não "não sei".
   *
   * Isto era um `useRef` dentro do `CheckoutPage`, e o ref **nasce cego a cada montagem**: para ele
   * a primeira passada nunca é troca, porque não há passada anterior. Enquanto o checkout ficava
   * montado atrás do QR isso era invisível; desde a feature `58` sair da página é o fluxo normal
   * (`PIX-P1-02` entrega o bastão para `/pedido/:id/pagamento`, e `PIX-P1-08` preserva `orderId` de
   * propósito). O percurso que o ref deixa passar é real e termina em 403: convidada cria o pedido,
   * não paga, entra na conta, volta ao `/checkout` — e o CTA **reusa** o pedido de convidada, que
   * `create-payment` recusa por não ser dela.
   *
   * Aqui ele sobrevive à remontagem e ao reload, porque nasce e morre com os outros três campos do
   * pedido em curso.
   */
  orderIdentity: string | null
  /**
   * FLW-01/FLW-04: blocos que a **pessoa** editou nesta tela. Fica no store porque quem edita são
   * os blocos, e eles já falam com o store — a alternativa seria um `onDirty` em cada `onChange`.
   * Semear de `customers`/`addresses` não suja: é o que preserva ADR-02.
   */
  dirty: BlockId[]
  /**
   * O Brick de cartão reconheceu o número (`CardFormSignal`, em `core`). Estado da TELA, não do
   * rascunho: fica de fora do `partialize` — recarregar remonta o Brick vazio, e um `true` velho
   * habilitaria "Pagar" com o formulário em branco — e de `draft()`, para digitar o cartão não
   * contar como "o rascunho mudou desde o pedido" (CHK-08).
   */
  cardNumberRecognized: boolean

  setContact: (patch: Partial<ContactDraft>) => void
  setAddress: (patch: Partial<AddressDraft>) => void
  setShipping: (shipping: ShippingDraft | null) => void
  setPayment: (patch: Partial<PaymentDraft>) => void
  toggleBump: (checked?: boolean) => void
  markDirty: (id: BlockId) => void
  setCardNumberRecognized: (recognized: boolean) => void
  /**
   * `identity` é o `user.id` de quem acionou o CTA — `null` para convidada (`IDN-07`). Opcional
   * para os chamadores que não decidem identidade nenhuma, e nesses o valor é `null`, que é o
   * mesmo "convidada" de sempre.
   */
  setOrder: (id: string, snapshot: CheckoutDraft, identity?: string | null) => void
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
      orderIdentity: null,
      dirty: [],
      cardNumberRecognized: false,

      setContact: (patch) => set((s) => ({ contact: { ...s.contact, ...patch } })),
      setAddress: (patch) => set((s) => ({ address: { ...s.address, ...patch } })),
      setShipping: (shipping) => set({ shipping }),
      setPayment: (patch) => set((s) => ({ payment: { ...s.payment, ...patch } })),
      toggleBump: (checked) => set((s) => ({ bumpChecked: checked ?? !s.bumpChecked })),
      // Patch vazio quando o bloco já está sujo: devolver um array novo a cada tecla faria a
      // página re-renderizar à toa (o seletor compara por referência).
      markDirty: (id) => set((s) => (s.dirty.includes(id) ? {} : { dirty: [...s.dirty, id] })),
      setCardNumberRecognized: (recognized) =>
        set((s) => (s.cardNumberRecognized === recognized ? {} : { cardNumberRecognized: recognized })),

      setOrder: (id, snapshot, identity = null) =>
        set({ orderId: id, orderSnapshot: snapshot, orderIdentity: identity }),
      // A chave de idempotência morre COM o pedido: mantê-la faria a próxima tentativa, já com o
      // rascunho alterado, reaproveitar o pedido antigo — e cobrar o valor que a cliente mudou.
      // A identidade cai junto pelo mesmo motivo: ela responde "de quem é o pedido em curso?", e
      // sem pedido em curso a pergunta não tem sujeito.
      invalidateOrder: () =>
        set({ orderId: null, orderSnapshot: null, clientRequestId: null, orderIdentity: null }),
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
          orderIdentity: null,
          dirty: [],
          cardNumberRecognized: false,
        })
        useCheckoutStore.persist.clearStorage()
      },

      draft: () => {
        const { contact, address, shipping, payment, bumpChecked } = get()
        return { contact, address, shipping, payment, bumpChecked }
      },
      blocks: (identity) =>
        resolveBlocks(get().draft(), identity, {
          cardNumberRecognized: get().cardNumberRecognized,
        }),
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
        // tentativa não pode fazer a retentativa criar um SEGUNDO pedido (`PED-04`). Os quatro
        // nascem e morrem juntos.
        clientRequestId: s.clientRequestId,
        // `IDN-07`: sem persistir, voltar ao checkout depois de entrar na conta compararia a
        // identidade nova com "não sei" e o pedido de convidada seria reusado — 403 no caixa.
        orderIdentity: s.orderIdentity,
      }),
    },
  ),
)
