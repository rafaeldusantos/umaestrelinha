// Feature 42 — o vocabulário das notificações, com UM dono.
//
// Antes desta feature o que existia era `EmailType` dentro da edge function `send-email` (quatro
// literais), um `check` no banco com os mesmos quatro, e um `Record<string, string>` de rótulos no
// backoffice que nomeava DOIS eventos que nunca existiram (`order_confirmed`, `payment_approved`) e
// deixava os reais caírem no fallback "E-mail order_received enviado". Três lugares, três verdades.
//
// Aqui mora a lista — na ORDEM DA JORNADA do pedido, que é a ordem da seção Notificações do painel —,
// o rótulo de cada evento (o `Record` não compila com um faltando: é isso que fecha o D2), a
// audiência (cliente ou dona) e o recorte dos eventos de material, que têm régua de tom própria.
//
// Todo import deste módulo traz `.ts` explícito: a edge function `send-notification` importa daqui
// por caminho relativo, e o Deno resolve o grafo inteiro — inclusive o de tipos.

/**
 * Os quinze eventos, na ordem em que acontecem na vida de um pedido.
 *
 * A ordem é regra, não estética: a aba do painel lista **nesta** sequência, e o `check` da migration
 * `20260907120000_42-notificacoes.sql` copia **esta** lista — `orderNotificationsSchema.test.ts` lê o
 * `.sql` do disco e compara nos dois sentidos.
 */
export const NOTIFICATION_EVENTS = [
  'order_received',
  'order_paid',
  'material_instructions',
  'payment_rejected',
  'pix_expired',
  'order_cancelled',
  'payment_refunded',
  'material_tracking_registered',
  'material_received',
  'in_production',
  'order_shipped',
  'order_delivered',
  'post_delivery_care',
  'owner_order_paid',
  'owner_material_incoming',
] as const

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]

export type NotificationAudience = 'customer' | 'owner'

export const isNotificationEvent = (value: unknown): value is NotificationEvent =>
  typeof value === 'string' && (NOTIFICATION_EVENTS as readonly string[]).includes(value)

/**
 * Quem recebe cada evento. `owner` vai para `store_settings.general.email`, **nunca** para a cliente.
 */
export const EVENT_AUDIENCE: Record<NotificationEvent, NotificationAudience> = {
  order_received: 'customer',
  order_paid: 'customer',
  material_instructions: 'customer',
  payment_rejected: 'customer',
  pix_expired: 'customer',
  order_cancelled: 'customer',
  payment_refunded: 'customer',
  material_tracking_registered: 'customer',
  material_received: 'customer',
  in_production: 'customer',
  order_shipped: 'customer',
  order_delivered: 'customer',
  post_delivery_care: 'customer',
  owner_order_paid: 'owner',
  owner_material_incoming: 'owner',
}

/**
 * O rótulo que o histórico do pedido mostra quando a notificação saiu (`FIX-02`).
 *
 * `Record` completo de propósito: evento novo sem rótulo é erro de compilação, não fallback. Os dois
 * de postagem e material recebido mantêm o texto que o backoffice já exibia. Nenhum leva exclamação
 * — é o histórico de um pedido, não um anúncio.
 */
export const NOTIFICATION_EVENT_LABELS: Record<NotificationEvent, string> = {
  order_received: 'Confirmação do pedido enviada',
  order_paid: 'Aviso de pagamento aprovado enviado',
  material_instructions: 'Instruções de envio do material enviadas',
  payment_rejected: 'Aviso de pagamento recusado enviado',
  pix_expired: 'Aviso de PIX expirado enviado',
  order_cancelled: 'Aviso de cancelamento enviado',
  payment_refunded: 'Aviso de estorno enviado',
  material_tracking_registered: 'Confirmação do rastreio do material enviada',
  material_received: 'Aviso de material recebido enviado',
  in_production: 'Aviso de produção iniciada enviado',
  order_shipped: 'Aviso de postagem enviado',
  order_delivered: 'Aviso de entrega enviado',
  post_delivery_care: 'Mensagem de cuidados pós-entrega enviada',
  owner_order_paid: 'Aviso à dona de pedido pago enviado',
  owner_material_incoming: 'Aviso à dona de material a caminho enviado',
}

/**
 * Os eventos que falam do material afetivo — cinzas, leite materno, cabelo de quem morreu.
 *
 * É a régua que `renderMaterialReceived` tinha em prosa e agora é lista: nenhum destes leva `!`
 * (ver `notificationCopyRefusal`), e a `{{saudacao}}` deles sai com ponto, não com exclamação.
 * Os avisos para a dona sobre material ficam fora: são operacionais, e ela não é a enlutada.
 */
export const MATERIAL_EVENTS: readonly NotificationEvent[] = [
  'material_instructions',
  'material_tracking_registered',
  'material_received',
  'in_production',
]

export const isMaterialEvent = (event: NotificationEvent): boolean => MATERIAL_EVENTS.includes(event)

/**
 * O evento cujo texto carrega `{{endereco_atelie}}` — a aba de Notificações do painel (feature `53`,
 * `ABN-08`) precisa identificá-lo para o gate de "endereço vazio bloqueia ligar". Nomeado aqui, e não
 * como literal em `apps/**`, porque `notificationSingleOwner.test.ts` (feature `42`) proíbe qualquer
 * arquivo de `apps/**`/`supabase/functions/**` escrever um nome de evento como string solta — "quem
 * responde que eventos existem, e como se chamam" é `core`, sempre.
 */
export const MATERIAL_INSTRUCTIONS_EVENT: NotificationEvent = 'material_instructions'
