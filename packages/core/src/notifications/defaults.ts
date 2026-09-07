// Feature 42 — os textos com que a loja nasce (`PNL-06`), e o interruptor de cada um.
//
// Este arquivo é ao mesmo tempo a SEMENTE da migration `20260907120000_42-notificacoes.sql` e o
// PISO do motor: `storeSettingsDefaults.test.ts` lê o `.sql` do disco e exige que o jsonb semeado
// seja exatamente este objeto serializado, e `resolveEventSettings` cai aqui quando a linha do
// banco não existe (banco anterior à migration) ou não conhece um campo.
//
// OS QUATRO QUE JÁ SAEM NASCEM LIGADOS, COM O TEXTO DE HOJE
//
// `order_received`, `order_paid`, `order_shipped` e `material_received` são os e-mails de
// `send-email/templates.ts`, copiados byte a byte — a saudação virou `{{saudacao}}` (a regra de
// `greet`/`greetCalm` mora em `variables.ts`) e o número do pedido virou `{{numero_pedido}}`.
// Desligá-los seria regressão silenciosa de coisa que funciona.
//
// OS ONZE NOVOS NASCEM DESLIGADOS
//
// Decisão do usuário, mesmo molde do frete grátis (`AD-027`): a Adri lê o texto antes de a primeira
// cliente receber. O custo é declarado no `CLAUDE.md` — sem alguém ligar em `/admin/configuracoes`
// → Notificações, a loja continua avisando só nos quatro momentos de hoje.
//
// Todo texto daqui passa por `notificationCopyRefusal` e `limitsRefusal`
// (`notificationCopyGuard.test.ts`): um default que a régua recusaria seria a loja violando a
// própria regra antes de a dona escrever uma linha.

import type { NotificationEvent } from './events.ts'
import type { EmailFields, NotificationSettings } from './settings.ts'

/** O rótulo do botão dos e-mails legados. O destino é sempre `{{link_conta}}`, e não é editável. */
const CTA_LABEL = 'Acompanhar em Minha conta'

const email = (enabled: boolean, fields: EmailFields) => ({ email: { enabled, fields } })

const EVENTS: Record<NotificationEvent, { email: { enabled: boolean; fields: EmailFields } }> = {
  // ── Os quatro legados — `templates.ts`, byte a byte ─────────────────────────────────────────
  order_received: email(true, {
    subject: 'Pedido {{numero_pedido}} recebido — aguardando o PIX',
    heading: 'Recebemos seu pedido!',
    lead:
      '{{saudacao}}Seu PIX foi gerado e o pedido está reservado por 30 minutos. Assim que o pagamento cair, a gente te avisa por aqui.',
    extra: ['Status: aguardando pagamento do PIX (30 minutos)'],
    cta_label: CTA_LABEL,
  }),

  order_paid: email(true, {
    subject: 'Pagamento aprovado — pedido {{numero_pedido}}',
    heading: 'Pagamento aprovado!',
    lead: '{{saudacao}}Recebemos seu pagamento. Agora é com a gente — seu pedido entra na fila de produção.',
    extra: ['Status: pagamento aprovado'],
    cta_label: CTA_LABEL,
  }),

  // A transportadora entra pela variável. Em `templates.ts` a frase tinha DUAS formas ("com PAC" ou
  // sem a transportadora) e a linha "Transportadora: …" da versão texto era condicional; aqui o
  // texto é um só, e quem monta as variáveis (`render/vars.ts`) resolve `{{transportadora}}` para o
  // nome do serviço ou, quando o painel não informou nenhum, para "a transportadora". A versão texto
  // perde a linha redundante — o nome já está no lead. É a única divergência declarada dos quatro.
  order_shipped: email(true, {
    subject: 'Pedido {{numero_pedido}} enviado — código de rastreio',
    heading: 'Seu pedido saiu para entrega!',
    lead: '{{saudacao}}Postamos seu pedido com {{transportadora}}. Use o código abaixo para acompanhar.',
    extra: ['Código de rastreio: {{rastreio}}'],
    cta_label: CTA_LABEL,
  }),

  material_received: email(true, {
    subject: 'Recebemos seu material — pedido {{numero_pedido}}',
    heading: 'Seu material chegou até nós',
    lead:
      '{{saudacao}}Seu material chegou em segurança ao ateliê e já está guardado com cuidado. A partir de agora, sua joia entra em produção — e a gente avisa assim que ela for postada.',
    extra: [
      'Status: material recebido — em produção',
      'Usamos apenas a quantidade necessária, e todo o excedente volta junto com a sua joia.',
    ],
    cta_label: CTA_LABEL,
  }),

  // ── Os onze novos — texto inicial, desligados ────────────────────────────────────────────────
  material_instructions: email(false, {
    subject: 'Pedido {{numero_pedido}} pago — agora é a sua parte',
    heading: 'Agora é a sua parte',
    lead:
      '{{saudacao}}Recebemos seu pagamento. Para começar a sua joia, precisamos do material que você vai enviar. O guia em {{link_guia_material}} explica como preparar e postar, com calma e sem pressa.',
    extra: [
      'Endereço do ateliê: {{endereco_atelie}}',
      'Dúvidas: WhatsApp {{whatsapp_atendimento}}',
      'Status: aguardando o seu material',
    ],
    cta_label: CTA_LABEL,
  }),

  payment_rejected: email(false, {
    subject: 'Não conseguimos aprovar o pagamento do pedido {{numero_pedido}}',
    heading: 'O pagamento não foi aprovado',
    lead:
      '{{saudacao}}A operadora do cartão não aprovou o pagamento do pedido {{numero_pedido}}. Nada foi cobrado. Se quiser, tente de novo com outro cartão ou por PIX em {{link_pedido}}.',
    extra: ['Status: pagamento recusado'],
    cta_label: CTA_LABEL,
  }),

  pix_expired: email(false, {
    subject: 'O PIX do pedido {{numero_pedido}} expirou',
    heading: 'O PIX expirou',
    lead:
      '{{saudacao}}O PIX do pedido {{numero_pedido}} não foi pago dentro do prazo e perdeu a validade. Se ainda quiser a peça, é só gerar um novo em {{link_pedido}} — o pedido continua guardado.',
    extra: ['Status: PIX expirado — pedido não pago'],
    cta_label: CTA_LABEL,
  }),

  // O parágrafo sobre a devolução do material é BLOCO FIXO do renderizador, condicionado ao estado
  // do pedido (spec, AC 6): entra só quando a cliente já postou ou o material já chegou.
  order_cancelled: email(false, {
    subject: 'Pedido {{numero_pedido}} cancelado',
    heading: 'Seu pedido foi cancelado',
    lead:
      '{{saudacao}}O pedido {{numero_pedido}} foi cancelado. Se houve pagamento, o valor volta pelo mesmo meio em que foi feito. Qualquer dúvida, fale com a gente pelo WhatsApp {{whatsapp_atendimento}}.',
    extra: ['Status: cancelado'],
    cta_label: CTA_LABEL,
  }),

  payment_refunded: email(false, {
    subject: 'Estorno do pedido {{numero_pedido}}',
    heading: 'O valor foi estornado',
    lead:
      '{{saudacao}}Fizemos o estorno de {{total}} do pedido {{numero_pedido}}. O prazo para o valor aparecer depende do banco ou da operadora do cartão — em geral, de alguns dias a duas faturas.',
    extra: ['Status: estornado'],
    cta_label: CTA_LABEL,
  }),

  material_tracking_registered: email(false, {
    subject: 'Rastreio do material registrado — pedido {{numero_pedido}}',
    heading: 'Registramos o rastreio do seu material',
    lead:
      '{{saudacao}}Anotamos o código {{rastreio}} do envelope com o seu material. Vamos acompanhar a chegada e avisar assim que ele estiver aqui, em segurança.',
    extra: ['Código de rastreio do material: {{rastreio}}', 'Status: material a caminho do ateliê'],
    cta_label: CTA_LABEL,
  }),

  in_production: email(false, {
    subject: 'Sua joia entrou em produção — pedido {{numero_pedido}}',
    heading: 'Sua joia está sendo feita',
    lead:
      '{{saudacao}}A produção da sua joia começou. Cada peça é feita à mão e leva o tempo que precisa — a gente avisa assim que ela for postada.',
    extra: ['Status: em produção'],
    cta_label: CTA_LABEL,
  }),

  order_delivered: email(false, {
    subject: 'Pedido {{numero_pedido}} entregue',
    heading: 'Sua joia chegou',
    lead:
      '{{saudacao}}O pedido {{numero_pedido}} consta como entregue. Esperamos que a peça esteja do jeito que você imaginou. Se algo não estiver certo, fale com a gente pelo WhatsApp {{whatsapp_atendimento}}.',
    extra: ['Status: entregue'],
    cta_label: CTA_LABEL,
  }),

  post_delivery_care: email(false, {
    subject: 'Como cuidar da sua joia — pedido {{numero_pedido}}',
    heading: 'Como cuidar da sua joia',
    lead:
      '{{saudacao}}Faz alguns dias que a sua joia chegou. Para ela durar, evite perfume, álcool e produtos de limpeza sobre a resina, guarde longe do sol e limpe com um pano macio e seco. Se sobrou material, ele voltou junto com a peça, para você guardar como preferir.',
    extra: ['Dúvidas sobre cuidados: WhatsApp {{whatsapp_atendimento}}'],
    cta_label: CTA_LABEL,
  }),

  // ── Os dois da dona — destino é `general.email`, nunca a cliente ─────────────────────────────
  owner_order_paid: email(false, {
    subject: 'Pedido {{numero_pedido}} pago — {{primeiro_nome}}',
    heading: 'Pedido pago',
    lead:
      'O pedido {{numero_pedido}} de {{primeiro_nome}} foi pago: {{total}}. Confira os itens e se há material a esperar em {{link_pedido_admin}}.',
    extra: ['Abrir no painel: {{link_pedido_admin}}'],
    cta_label: 'Abrir o pedido no painel',
  }),

  owner_material_incoming: email(false, {
    subject: 'Material a caminho — pedido {{numero_pedido}}',
    heading: 'Material a caminho',
    lead:
      '{{primeiro_nome}} registrou o rastreio {{rastreio}} do material do pedido {{numero_pedido}}. Acompanhe a chegada e confirme o recebimento em {{link_pedido_admin}}.',
    extra: ['Rastreio do material: {{rastreio}}', 'Abrir no painel: {{link_pedido_admin}}'],
    cta_label: 'Abrir o pedido no painel',
  }),
}

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  events: EVENTS,
  post_delivery_days: 7,
}

/** Os quatro que nascem ligados — e só eles. É o que `defaults.test.ts` e a migration cobram. */
export const LEGACY_ENABLED_EVENTS: readonly NotificationEvent[] = [
  'order_received',
  'order_paid',
  'order_shipped',
  'material_received',
]
