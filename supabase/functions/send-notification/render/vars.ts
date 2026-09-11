// Feature 42 — os valores das variáveis dos textos, montados a partir do pedido e das configurações.
//
// `variables.ts` de `core` diz QUAIS variáveis existem e como interpolar; este arquivo diz o que
// cada uma vale para um pedido concreto. A separação é o que permite o painel validar o texto sem
// ter um pedido na mão, e o motor renderizar sem duplicar a lista.
//
// Nenhum valor sai `undefined`: `interpolate` já troca variável conhecida sem valor por string
// vazia, mas o que a dona vê na prévia tem de ser o que a cliente recebe, e frase com buraco é pior
// que frase sem a informação.

import {
  type NotificationEvent,
  type NotificationVars,
  greeting,
} from '../../../../packages/core/src/notifications/index.ts'
import { formatPrice } from '../../../../packages/core/src/formatters/price.ts'
import { type EmailOrder, firstName, storeLink } from './layout.ts'

/**
 * O que o motor precisa saber além do pedido para montar os valores.
 *
 * `storeUrl` é a origem DA LOJA e `adminUrl` a do painel — duas implantações distintas (Vercel), e
 * é por isso que são duas envs. `whatsapp` e `enderecoAtelie` vêm de `store_settings`
 * (`general.whatsapp`, `material`), nunca literais no texto: dois donos do mesmo dado é o defeito 01.
 */
export interface VarsContext {
  storeUrl: string
  adminUrl: string
  whatsapp?: string | null
  enderecoAtelie?: string | null
  guiaPath?: string | null
}

/**
 * A transportadora quando ela existe; senão, "a transportadora".
 *
 * É a única divergência declarada dos quatro textos legados. Em `templates.ts` o lead tinha DUAS
 * formas — "Postamos seu pedido com PAC." e "Postamos seu pedido." — e o texto editável não tem como
 * ter duas. O recuo mantém a frase gramatical quando o painel não informou serviço nenhum, que é o
 * caso do rastreio digitado à mão.
 */
export function carrierLabel(carrier: string | null | undefined): string {
  const nome = (carrier ?? '').trim()
  return nome === '' ? 'a transportadora' : nome
}

/** O endereço do ateliê numa linha, como a cliente lê dentro de uma frase. */
export function atelieLine(endereco: string | null | undefined): string {
  return (endereco ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .join(', ')
}

export function buildVars(event: NotificationEvent, order: EmailOrder, ctx: VarsContext): NotificationVars {
  const nome = firstName(order.customer_name ?? '')
  const guia = (ctx.guiaPath ?? '/como-enviar-o-material').replace(/^\//, '')
  // Origem ausente vira string vazia, e não um throw: o motor promete NUNCA LANÇAR, e uma env
  // esquecida no deploy tem de custar um link torto — não um 500 no caixa. Medido na T12, quando o
  // dublê dos testes ainda não tinha `adminPublicUrl` e `storeLink(undefined, …)` derrubou 20 casos.
  const loja = ctx.storeUrl ?? ''
  const painel = ctx.adminUrl ?? ''

  return {
    saudacao: greeting(nome, event),
    primeiro_nome: nome,
    numero_pedido: order.order_number ?? '',
    // A remessa de SAÍDA (loja → cliente) nos eventos de envio; a de ENTRADA (cliente → ateliê) nos
    // de material. São dois códigos diferentes no mesmo pedido, e trocá-los mandaria a cliente
    // rastrear a própria encomenda achando que rastreia a joia.
    rastreio: (materialEvent(event) ? order.material_tracking_code : order.tracking_code) ?? '',
    transportadora: carrierLabel(order.shipping_carrier),
    link_conta: storeLink(loja, 'conta'),
    link_pedido: storeLink(loja, `pedido/${order.id ?? ''}`),
    link_pedido_admin: storeLink(painel, `admin/pedidos/${order.id ?? ''}`),
    link_guia_material: storeLink(loja, guia),
    endereco_atelie: atelieLine(ctx.enderecoAtelie),
    whatsapp_atendimento: (ctx.whatsapp ?? '').trim(),
    total: formatPrice(order.total ?? 0),
  }
}

/** Os eventos cujo `{{rastreio}}` é o do envelope da CLIENTE, não o da encomenda da loja. */
const RASTREIO_DO_MATERIAL: readonly NotificationEvent[] = [
  'material_tracking_registered',
  'owner_material_incoming',
]

const materialEvent = (event: NotificationEvent): boolean => RASTREIO_DO_MATERIAL.includes(event)
