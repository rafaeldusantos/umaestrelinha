// Feature `75` (A14, `MAA-01`, `MAA-06`, `MAA-16`, `MAA-38`) — "que ação este pedido oferece no app
// do ateliê, e com que plano", sem I/O.
//
// Uma função nova que COMPÕE `rowSummary` em vez de mudá-lo: o painel lê `rowSummary`, e
// `RowSummaryInput` continua sem `shipping_service_id` (`AD-056`, o painel não muda de tela). Ela
// corrige o que o `rowSummary` sozinho diria errado no app:
//
// 1. cancelado ou entregue não oferece ação — o `rowSummary` de um cancelado com material aguardando
//    diria "Recebi o material";
// 2. retirada em separação vai direto a `delivered` (`nextStep`, `RET-16`), e retirada nunca recebe
//    folha de rastreio (`MAA-16`);
// 3. o resto é o `rowSummary`, com `anotar-rastreio-envelope` (não produzida hoje) ⇒ `nenhuma`.
//
// A guarda de origem mora no PLANO, aqui, e não no app: `regraDePedidoSoNoCore` (`MAP-49`) acusa no
// app a comparação direta de uma coluna de estado (`status`, `payment_status`, `material_status`,
// `payment_method`) com um literal do vocabulário dela (`pedido.status !== 'cancelled'`), além dos mapas,
// `case` e predicados de recorte. NÃO alcança `includes`/`in` nem o literal guardado numa variável antes
// de comparar — o alcance está declarado no cabeçalho do guarda. O app só repassa o plano ao dono da
// escrita.
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { toMaterialStatus } from '../material/material.ts'
import type { NotificationEvent } from '../notifications/events.ts'
import { normalizeBrPhone } from '../notifications/phone.ts'
import { isPickupOrder } from '../shipping/pickup.ts'
import { formatOrderNumber } from './format.ts'
import { PICKUP_DONE_ACTION, nextStep } from './nextStep.ts'
import { rowSummary } from './rowSummary.ts'

export type AppActionId =
  | 'registrar-recebimento'
  | 'separar'
  | 'marcar-enviado'
  | 'salvar-rastreio'
  | 'marcar-retirado'
  | 'nenhuma'

/** As colunas que a ação lê — a `LinhaDaLista` da `74` as tem. */
export interface AppActionInput {
  status: string
  material_status: string | null
  tracking_code: string | null
  payment_method: string | null
  shipping_service_id: string | null
}

/** Discriminada por STRING: com `strictNullChecks: false`, união por booleano não estreita. */
export type AppActionPlan =
  | { tipo: 'material'; to: 'material_recebido' }
  | { tipo: 'separar'; materialAntes: boolean; from: 'paid'; to: 'separating' }
  | { tipo: 'folha' }
  | { tipo: 'status'; from: 'separating'; to: 'delivered' }
  | { tipo: 'nenhum' }

export interface AppAction {
  action: AppActionId
  /** O rótulo do rodapé e do botão do cartão. Vazio quando não há ação. */
  label: string
  plano: AppActionPlan
}

const NENHUMA: AppAction = { action: 'nenhuma', label: '', plano: { tipo: 'nenhum' } }

export const appPrimaryAction = (row: AppActionInput): AppAction => {
  if (row.status === 'cancelled' || row.status === 'delivered') return { ...NENHUMA, plano: { tipo: 'nenhum' } }

  const retirada = isPickupOrder(row)

  if (retirada && row.status === 'separating') {
    const passo = nextStep(row)
    return {
      action: 'marcar-retirado',
      label: passo.actionLabel ?? PICKUP_DONE_ACTION,
      plano: { tipo: 'status', from: 'separating', to: passo.status as 'delivered' },
    }
  }

  const resumo = rowSummary(row)

  switch (resumo.action) {
    case 'registrar-recebimento':
      return { action: resumo.action, label: resumo.actionLabel, plano: { tipo: 'material', to: 'material_recebido' } }
    case 'separar':
      return {
        action: resumo.action,
        label: resumo.actionLabel,
        plano: {
          tipo: 'separar',
          materialAntes: toMaterialStatus(row.material_status) === 'material_recebido',
          from: 'paid',
          to: 'separating',
        },
      }
    case 'marcar-enviado':
    case 'salvar-rastreio':
      // Retirada não tem rastreio em status nenhum (`MAA-16`) — nem a levada a `shipped` à mão.
      if (retirada) break
      return { action: resumo.action, label: resumo.actionLabel, plano: { tipo: 'folha' } }
    default:
      break
  }

  return { ...NENHUMA, plano: { tipo: 'nenhum' } }
}

// ---------------------------------------------------------------------------------------------
// A folha do rastreio (A10, A23, A25, `MAA-10`, `MAA-11`, `MAA-14`, `MAA-15`)
// ---------------------------------------------------------------------------------------------
// O critério da frase é o PAR (status, código anterior), porque o evento que o disparo do fim
// produz depende do status: `shipped` ⇒ `order_shipped` (único por pedido), `delivered` ⇒
// `order_delivered`, nunca um aviso de postagem. A frase 2 ("já recebeu") pede ainda o aviso de
// postagem SAÍDO (`contexto.avisoDePostagemSaiu`, de `shippedNoticeSent`).

/** De onde a folha foi aberta: o rodapé (a ação do estado) ou a linha do rastreio na Entrega. */
export type TrackingSheetOrigin = 'acao' | 'entrega'

export interface TrackingSheet {
  modo: 'enviar' | 'salvar' | 'alterar'
  titulo: 'Marcar como enviado' | 'Salvar rastreio' | 'Alterar rastreio'
  frase: string
  /** O código já salvo em "alterar" E em "enviar" (Q9-b); `''` em "salvar" por construção. */
  valorInicial: string
  /** A25: os status em que o `update` do código pode cair. */
  guarda: string[]
  /** Só a partir de `separating`. */
  avancaPara: 'shipped' | null
  /** A11: a confirmação PODE citar e-mail (só quando o evento do fim é o aviso de postagem). */
  citaEmailSeEnviado: boolean
}

// A frase 2 (A10) AFIRMA que ela recebeu o aviso de postagem — verdade só com o `order_shipped` em
// `sent`. Falho, pendente ou ausente (desligado, ou a leitura não disse), as duas metades seriam
// falsas: ela não recebeu, e o próximo disparo REENVIA o falho (`claim_order_notification` retoma um
// `failed`). Sem saber que saiu, a folha não promete nem nega: a frase neutra, a mesma de `delivered`.
// SPEC_DEVIATION (A10, decisão do QA, `BUG-20261024-folha-afirma-aviso-que-falhou`): o critério da
// frase 2 deixou de ser só o par (status, código) e passou a exigir o aviso SAÍDO.

const AVISO_DE_POSTAGEM: NotificationEvent = 'order_shipped'

/** O aviso de postagem deste pedido SAIU? As linhas são as de `order_notifications` do pedido. */
export const shippedNoticeSent = (rows: ReadonlyArray<{ event: string; status: string }>): boolean =>
  rows.some((r) => r.event === AVISO_DE_POSTAGEM && r.status === 'sent')

/** O que a folha sabe além da linha: o aviso de postagem saiu? Ausente ⇒ não sabe ⇒ não afirma. */
export interface TrackingSheetContext {
  avisoDePostagemSaiu?: boolean
}

const FOLHA_SEM_CODIGO = 'A cliente recebe o e-mail de postagem assim que você salvar o código.'
const FOLHA_TROCA =
  'A cliente já recebeu o aviso de postagem. O código novo aparece no pedido dela, mas não gera outro e-mail.'
const FOLHA_ENTREGUE = 'O código aparece no pedido dela.'

/** "Informar" / "Alterar" na linha do rastreio da Entrega, ou `null` quando não há o que editar. */
export const trackingEdit = (
  row: Pick<AppActionInput, 'status' | 'tracking_code' | 'shipping_service_id'>,
): { rotulo: 'Informar' | 'Alterar' } | null => {
  if (isPickupOrder(row)) return null
  if (row.status !== 'shipped' && row.status !== 'delivered') return null
  return { rotulo: row.tracking_code ? 'Alterar' : 'Informar' }
}

/**
 * A folha que esta origem oferece para este estado, ou `null` — retirada, status sem folha, ou uma
 * origem que não oferece folha neste estado (a Entrega em separação; o rodapé com o código já
 * salvo). A origem conta porque é ela que diz se a folha aberta AINDA vale quando o pedido muda com
 * a tela aberta (`MAA-26`): a folha cuja origem passa a devolver `null`, ou outro `modo`, fecha.
 */
export const trackingSheet = (
  row: AppActionInput,
  origem: TrackingSheetOrigin,
  contexto: TrackingSheetContext = {},
): TrackingSheet | null => {
  if (isPickupOrder(row)) return null

  const oferece =
    origem === 'acao'
      ? appPrimaryAction(row).plano.tipo === 'folha'
      : trackingEdit(row) !== null
  if (!oferece) return null

  const codigo = row.tracking_code ?? ''

  if (row.status === 'separating') {
    return {
      modo: 'enviar',
      titulo: 'Marcar como enviado',
      frase: FOLHA_SEM_CODIGO,
      valorInicial: codigo,
      guarda: ['separating', 'shipped'],
      avancaPara: 'shipped',
      citaEmailSeEnviado: true,
    }
  }

  if (row.status === 'shipped' || row.status === 'delivered') {
    const entregue = row.status === 'delivered'
    if (!codigo) {
      return {
        modo: 'salvar',
        titulo: 'Salvar rastreio',
        frase: entregue ? FOLHA_ENTREGUE : FOLHA_SEM_CODIGO,
        valorInicial: '',
        guarda: [row.status],
        avancaPara: null,
        citaEmailSeEnviado: !entregue,
      }
    }
    return {
      modo: 'alterar',
      titulo: 'Alterar rastreio',
      frase: !entregue && contexto.avisoDePostagemSaiu === true ? FOLHA_TROCA : FOLHA_ENTREGUE,
      valorInicial: codigo,
      guarda: [row.status],
      avancaPara: null,
      citaEmailSeEnviado: false,
    }
  }

  return null
}

// ---------------------------------------------------------------------------------------------
// O lembrete do material no WhatsApp (A17, `MAA-17`)
// ---------------------------------------------------------------------------------------------
// O corte é a CONDIÇÃO DE EXIBIÇÃO no app, não uma mudança em `chargeMaterialUrl` (que sobe byte a
// byte do painel, inclusive o caminho sem número). No celular, `wa.me` sem número abre uma conversa
// sem destinatário — por isso, sem telefone que normalize, o botão não aparece. E o app não oferece
// o ramo "Vi que você já postou…": só `aguardando_material`.

export const canChargeMaterial = (row: {
  status: string
  material_status: string | null
  customer_phone: string | null
}): boolean =>
  toMaterialStatus(row.material_status) === 'aguardando_material' &&
  row.status !== 'cancelled' &&
  normalizeBrPhone(row.customer_phone) !== null

// ---------------------------------------------------------------------------------------------
// A confirmação depois de gravar (A11, `MAA-02`, `MAA-05`, `MAA-14`, `MAA-24`, `MAA-38`)
// ---------------------------------------------------------------------------------------------
// E-mail citado SÓ com `emailSent === true` E quando o único evento que o disparo pode produzir é o
// que a frase nomeia: o `material_received` em "Recebi" (menos o idempotente), o `in_production` em
// "Iniciar separação" com o material, e o aviso de postagem no rastreio que a folha marca como
// `citaEmailSeEnviado`. A partir de `delivered`, nunca — o e-mail que saiu, se saiu, não é de
// postagem. O padrão de cada ausência é NÃO prometer.

/**
 * As ações que a confirmação conhece: as primárias do estado (`AppActionId`) e as duas do bloco
 * Material da feature `82` — o código do envelope e "Colocar em produção". Estas duas NÃO entram em
 * `AppActionId`, que é o vocabulário do rodapé (`appPrimaryAction`): nenhuma delas é ação primária.
 */
export type ConfirmationAction = Exclude<AppActionId, 'nenhuma'> | 'rastreio-do-material' | 'producao'

export interface ConfirmationInput {
  action: ConfirmationAction
  emailSent: boolean
  /** "Iniciar separação": o material foi a `em_producao` nesta ação. */
  materialMudou?: boolean
  /** "Recebi": o material já estava recebido (o idempotente de `MAA-05`). */
  materialJaEstava?: boolean
  /** Rastreio: o `citaEmailSeEnviado` da folha em que a ação partiu. */
  citaEmailSeEnviado?: boolean
  /**
   * Código do envelope (`ENV-08`): o material passou de `aguardando_material` para `material_enviado`
   * nesta gravação — o `materialPassou` do desfecho de `runAppAction`.
   */
  materialPassou?: boolean
  customer_name: string | null
  order_number: string
}

export interface Confirmation {
  titulo: string
  frase: string
}

/**
 * O primeiro nome da cliente, ou "A cliente" sem nome. Um dono para as frases da ação e as do bloco
 * Material (`core/material/envelope.ts`, feature `82`).
 */
export const customerFirstName = (nome: string | null | undefined): string =>
  (nome ?? '').trim().split(/\s+/)[0] || 'A cliente'

/**
 * Fase 5 da `82` (T20, `BUG-20261026-a-cliente-no-meio-da-frase`, decisão de 2026-10-27): as formas de
 * MEIO de frase. `customerFirstName` serve ao começo ("A cliente ainda não informou…"); no meio, sem
 * nome, "Use quando A cliente mandar…" e "O material de A cliente…" saíam com maiúscula e sem a
 * contração. Com nome, as três dão o mesmo primeiro nome.
 */
export const customerFirstNameMidSentence = (nome: string | null | undefined): string =>
  (nome ?? '').trim().split(/\s+/)[0] || 'a cliente'

/** Depois de "de": "de Maria", ou "da cliente" sem nome (a contração). */
export const customerFirstNameAfterDe = (nome: string | null | undefined): string => {
  const primeiro = (nome ?? '').trim().split(/\s+/)[0]
  return primeiro ? `de ${primeiro}` : 'da cliente'
}

const quemRecebe = customerFirstName

export const actionConfirmation = (input: ConfirmationInput): Confirmation => {
  const numero = formatOrderNumber(input.order_number)
  const quem = quemRecebe(input.customer_name)

  switch (input.action) {
    case 'registrar-recebimento': {
      const cita = input.emailSent === true && !input.materialJaEstava
      return {
        titulo: 'Material registrado.',
        frase: `O pedido ${numero} foi para a bancada.${cita ? ` ${quem} recebe a confirmação por e-mail.` : ''}`,
      }
    }
    case 'separar': {
      if (!input.materialMudou) return { titulo: 'Separação iniciada.', frase: `Pedido ${numero} em separação.` }
      // SPEC_DEVIATION (precisão): A11 não escreve a frase do e-mail de "Iniciar separação"; o texto
      // segue o molde de "Recebi" e fica sujeito à leitura da Adri (TQ5).
      const cita = input.emailSent === true
      return {
        titulo: 'Separação iniciada.',
        frase: `Pedido ${numero} em produção.${cita ? ` ${quem} recebe o aviso por e-mail.` : ''}`,
      }
    }
    case 'marcar-enviado':
    case 'salvar-rastreio': {
      const cita = input.emailSent === true && input.citaEmailSeEnviado === true
      return {
        titulo: 'Rastreio salvo.',
        frase: cita ? `${quem} recebe o aviso de postagem por e-mail.` : 'O código ficou no pedido.',
      }
    }
    case 'marcar-retirado':
      return { titulo: 'Retirada registrada.', frase: `Pedido ${numero} entregue.` }
    case 'rastreio-do-material':
      // `ENV-08`: "passou para A caminho" só quando ESTA gravação moveu o estado; senão o neutro.
      return {
        titulo: MATERIAL_TRACKING_SAVED,
        frase: input.materialPassou === true ? `O pedido ${numero} passou para "A caminho".` : `Pedido ${numero} atualizado.`,
      }
    case 'producao':
      // `ENV-25`.
      return { titulo: MATERIAL_IN_PRODUCTION, frase: `O material ${customerFirstNameAfterDe(input.customer_name)} está na bancada.` }
  }
}

// As frases fixas da ação — um dono, lido pelo app (`fraseDaAcaoSoNoCore`, §8.4 do design).

/** `MAA-22`: rede ou 5xx. Nunca a recusa. */
export const ACTION_FAILED = 'Não consegui salvar. Tente de novo.'
/** `MAA-21`, `MAA-26`: zero linhas sem recusa de papel, ou a folha que deixou de valer. */
export const ORDER_CHANGED = 'Este pedido mudou enquanto você olhava.'
/** `MAA-40`: o material foi a produção e o status não. */
export const PARTIAL_MATERIAL = 'A produção ficou registrada, mas o pedido não passou para separação.'
/** `MAA-15`: o código foi gravado e o status não. */
export const PARTIAL_TRACKING = 'O código ficou salvo, mas o pedido não foi marcado como enviado.'
/** `MAA-20`: o controle travado enquanto a ação está no ar. */
export const SAVING = 'Salvando…'

// Feature `82` — o bloco Material do app do ateliê.

/** `ENV-18`: o código do envelope foi para a área de transferência. */
export const TRACKING_COPIED = 'Código copiado.'
/** `ENV-18`, A9: a área de transferência recusou (sem permissão, sem contexto seguro). */
export const COPY_FAILED = 'Não consegui copiar. Toque e segure o código para copiar.'
/** `ENV-08`: o título do aviso depois de gravar o código do envelope. */
export const MATERIAL_TRACKING_SAVED = 'Código do envelope registrado.'
/** `ENV-25`: o título do aviso depois de "Colocar em produção". */
export const MATERIAL_IN_PRODUCTION = 'Pedido em produção.'
