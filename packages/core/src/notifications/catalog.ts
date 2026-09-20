// Feature 56 — como cada evento se APRESENTA na tela de configuração.
//
// ## Por que isto não é um segundo dono de `NOTIFICATION_EVENT_LABELS`
//
// É a primeira pergunta que este arquivo vai receber, e a resposta precisa estar escrita: os dois
// mapas respondem coisas diferentes.
//
// | Mapa | Pergunta | Tempo verbal | Onde aparece |
// | --- | --- | --- | --- |
// | `NOTIFICATION_EVENT_LABELS` (feature 42) | "o que aconteceu com este pedido?" | passado | histórico do pedido |
// | `NOTIFICATION_EVENT_NAMES` (aqui) | "que evento é este?" | nome | Configurações → Notificações |
//
// Até esta feature a tela de configuração usava o rótulo de histórico como título de card, e o
// resultado se lia como registro de log: a Adri abria "quais avisos eu quero ligar?" e encontrava
// "Confirmação do pedido enviada" — no passado, afirmando que algo já saiu, ao lado de um
// interruptor desligado.
//
// O risco de alguém achar que são cópias e apagar uma é real. A contenção é `catalog.test.ts`, que
// **recusa a igualdade nos 15**: um nome que vire cópia do rótulo de histórico reprova a suíte.
//
// ## Por que a chave de ícone, e não o componente
//
// `purity.test.ts` deste módulo proíbe React aqui — o motor de notificação importa este grafo por
// caminho relativo, e o Deno resolve tipos junto. Então `core` guarda a CHAVE e o painel guarda o
// mapa chave → componente, no molde de `core/menu/icons.ts`. O par é guardado nos dois sentidos por
// `eventIcons.test.ts`, do lado do painel.
//
// ## Por que em `core` e não em `entities/` do painel
//
// `AD-033` manda `entities/` quando os dois consumidores estão no mesmo app. Aqui não há escolha:
// `notificationSingleOwner.test.ts` (feature 42) proíbe qualquer arquivo de `apps/**` escrever nome
// de evento como literal, e um `Record<NotificationEvent, …>` escrito no painel teria os quinze
// literais como chaves.
//
// Todo import relativo traz `.ts` explícito — ver o cabeçalho de `index.ts`.

import { type NotificationEvent } from './events.ts'

/**
 * O vocabulário fechado de ícones dos eventos.
 *
 * São **chaves semânticas**, não nomes de componente: trocar a biblioteca de ícones do painel não
 * pode obrigar `core` a mudar. Quem traduz é `features/notification-settings/ui/eventIcons.ts`.
 */
export const NOTIFICATION_ICON_KEYS = [
  'mail',
  'check',
  'mail-open',
  'x',
  'clock',
  'ban',
  'undo',
  'tracking',
  'inbox',
  'craft',
  'truck',
  'delivered',
  'care',
  'coins',
  'bell',
] as const

export type NotificationIconKey = (typeof NOTIFICATION_ICON_KEYS)[number]

/**
 * O NOME do evento na tela de configuração — `LEG-01`.
 *
 * Curto o bastante para caber ao lado de um interruptor em 390px, e no presente: ele nomeia o
 * evento, não relata que ele ocorreu.
 *
 * Os dois de `owner_*` ficam sem "avisar a dona" de propósito: o grupo onde eles aparecem já se
 * chama **"Avisos para você"**, e a tela é da própria Adri. Repetir na linha seria dizer em terceira
 * pessoa o que o grupo já diz em segunda. A audiência vai na descrição, abaixo.
 *
 * `Record` completo: evento novo sem nome é erro de compilação, nunca fallback.
 */
export const NOTIFICATION_EVENT_NAMES: Record<NotificationEvent, string> = {
  order_received: 'Pedido recebido',
  order_paid: 'Pagamento aprovado',
  material_instructions: 'Como enviar o material',
  payment_rejected: 'Pagamento recusado',
  pix_expired: 'PIX expirado',
  order_cancelled: 'Pedido cancelado',
  payment_refunded: 'Pagamento estornado',
  material_tracking_registered: 'Rastreio do material registrado',
  material_received: 'Material recebido no ateliê',
  in_production: 'Peça em produção',
  order_shipped: 'Pedido postado',
  order_delivered: 'Pedido entregue',
  post_delivery_care: 'Cuidados com a joia',
  owner_order_paid: 'Pedido pago',
  owner_material_incoming: 'Material a caminho',
}

/**
 * QUANDO cada evento dispara — `LEG-02`.
 *
 * Uma linha, no presente, dita do ponto de vista de quem administra a loja. É o que responde a
 * pergunta que a tela de configuração deixava sem resposta: ligar este aviso significa que a cliente
 * recebe um e-mail **em que momento**?
 *
 * Nenhuma leva exclamação, e as de material não fazem promessa de prazo: valem as mesmas réguas de
 * tom que `notificationCopyRefusal` aplica ao texto dos e-mails, porque quem lê esta linha está
 * decidindo o que a enlutada vai receber.
 */
export const NOTIFICATION_EVENT_DESCRIPTIONS: Record<NotificationEvent, string> = {
  order_received: 'Enviado assim que o pedido é registrado, antes do pagamento',
  order_paid: 'Enviado quando o pagamento é confirmado',
  material_instructions: 'Enviado com o endereço do ateliê, quando a peça pede material',
  payment_rejected: 'Enviado quando a operadora recusa o pagamento',
  pix_expired: 'Enviado quando o código PIX vence sem pagamento',
  order_cancelled: 'Enviado quando o pedido é cancelado',
  payment_refunded: 'Enviado quando o valor é devolvido à cliente',
  material_tracking_registered: 'Enviado quando a cliente informa o código de postagem do material',
  material_received: 'Enviado quando o material chega às suas mãos',
  in_production: 'Enviado quando a peça entra na bancada',
  order_shipped: 'Enviado quando a peça é postada, com o código de rastreio',
  order_delivered: 'Enviado quando a transportadora confirma a entrega',
  post_delivery_care: 'Enviado alguns dias depois da entrega',
  owner_order_paid: 'Enviado para o seu e-mail quando um pedido é pago',
  owner_material_incoming: 'Enviado para o seu e-mail quando uma cliente posta o material',
}

/**
 * O ícone de cada evento — `LEG-03`.
 *
 * Um por evento, todos distintos: dois eventos do mesmo grupo com o mesmo desenho fariam a linha
 * recolhida deixar de distinguir, que é justamente o trabalho que o ícone faz num card de 62px.
 */
export const NOTIFICATION_EVENT_ICONS: Record<NotificationEvent, NotificationIconKey> = {
  order_received: 'mail',
  order_paid: 'check',
  material_instructions: 'mail-open',
  payment_rejected: 'x',
  pix_expired: 'clock',
  order_cancelled: 'ban',
  payment_refunded: 'undo',
  material_tracking_registered: 'tracking',
  material_received: 'inbox',
  in_production: 'craft',
  order_shipped: 'truck',
  order_delivered: 'delivered',
  post_delivery_care: 'care',
  owner_order_paid: 'coins',
  owner_material_incoming: 'bell',
}
