// Feature `82` (`ENV-02`, `05`, `09`, `16`, `20`, `24`, `26`) — o envelope da cliente no bloco
// "Material afetivo" do app do ateliê: pode editar o código? que folha abre? quem informou e quando?
// o que dizer sem código? há quanto tempo a espera? e a frase do pedido cancelado.
//
// Mora em `core` porque o app não escreve regra nem frase (`regraDePedidoSoNoCore`,
// `fraseDaAcaoSoNoCore`), e porque dois leitores já existem: o bloco do app e a guarda de
// `runAppAction` (`core/order-actions`), que recusa gravar o código numa linha que a tela não deixaria
// editar. A frase do cancelado tem um terceiro, o `OrderMaterialCard` do painel.
//
// `agora` é sempre o `lido_em` do servidor (A2 da `74`), nunca o relógio do aparelho.
//
// Todo especificador relativo leva `.ts`, e o grafo inteiro é de folhas (`stepsDenoReach.test.ts`).

import { ACTION_FAILED, customerFirstName, customerFirstNameMidSentence } from '../orders/appAction.ts'
import { rowQueueAge } from '../orders/row.ts'
import { relativeAge } from '../stats/labels.ts'
import { queueAgeLabel, type QueueAge } from './aging.ts'
import { toMaterialStatus, type MaterialStatus } from './material.ts'

/** `ENV-26`: o pedido cancelado, no app e no painel. */
export const MATERIAL_CANCELLED_NOTE =
  'Pedido cancelado, saiu da fila de material. Se o envelope já tiver chegado, devolva à cliente.'

/** As colunas que as regras do envelope leem — a linha do detalhe do app as tem. */
export interface MaterialTrackingRow {
  status: string
  material_status: string | null
  material_tracking_code: string | null
  material_received_at: string | null
  created_at: string
  customer_name: string | null
  /** Nulas antes da migration da `82` e nas linhas gravadas antes dela (A2). */
  material_tracking_set_at?: string | null
  material_tracking_set_by?: string | null
}

/** Os estados em que o envelope ainda não chegou — o código pode ser informado ou trocado. */
const ESPERANDO_O_ENVELOPE: readonly MaterialStatus[] = ['aguardando_material', 'material_enviado']

/** Os estados em que o envelope já está no ateliê. */
const ENVELOPE_CHEGOU: readonly MaterialStatus[] = ['material_recebido', 'em_producao']

const esperando = (row: Pick<MaterialTrackingRow, 'status' | 'material_status'>): boolean =>
  ESPERANDO_O_ENVELOPE.includes(toMaterialStatus(row.material_status)) && row.status !== 'cancelled'

const codigoDe = (row: Pick<MaterialTrackingRow, 'material_tracking_code'>): string =>
  row.material_tracking_code?.trim() ?? ''

/**
 * `ENV-02`, `ENV-03`, `ENV-04`: editável ⇔ o envelope ainda não chegou e o pedido não foi cancelado.
 * `rotulo` é o link do cabeçalho: "Alterar" com código; `null` sem código (aí o bloco oferece o botão
 * "Informar código do envelope"). Fora disso, `null` — nem botão nem link.
 */
export const materialTrackingEdit = (
  row: Pick<MaterialTrackingRow, 'status' | 'material_status'> & { material_tracking_code?: string | null },
): { rotulo: 'Alterar' | null } | null => {
  if (!esperando(row)) return null
  return { rotulo: codigoDe({ material_tracking_code: row.material_tracking_code ?? null }) ? 'Alterar' : null }
}

export interface MaterialTrackingSheetCopy {
  titulo: 'Código do envelope' | 'Alterar código do envelope'
  frase: string
  valorInicial: string
  rotulo: string
  placeholder: string
}

/** `ENV-05`: o rótulo do campo da folha — o mesmo do card do painel. */
export const MATERIAL_TRACKING_FIELD_LABEL = 'Código de rastreio do envio da cliente'
export const MATERIAL_TRACKING_PLACEHOLDER = 'Ex.: AN123456789BR'

/**
 * `ENV-05`: a folha do código do envelope, ou `null` quando a linha não é editável (`ENV-13`: a folha
 * aberta fecha quando isto vira `null`). A frase só promete "A caminho" e o e-mail enquanto o envelope
 * ainda é esperado (`aguardando_material`); com ele já a caminho, nada muda além do código (A6).
 */
export const materialTrackingSheet = (
  row: Pick<MaterialTrackingRow, 'status' | 'material_status' | 'material_tracking_code' | 'customer_name'>,
): MaterialTrackingSheetCopy | null => {
  if (!materialTrackingEdit(row)) return null
  const codigo = codigoDe(row)
  // T20: o nome no MEIO da frase — sem nome, "a cliente" (minúscula), nunca "A cliente".
  const nome = customerFirstNameMidSentence(row.customer_name)
  const base = `Use quando ${nome} mandar o código pelo WhatsApp.`
  return {
    titulo: codigo ? 'Alterar código do envelope' : 'Código do envelope',
    frase:
      toMaterialStatus(row.material_status) === 'aguardando_material'
        ? `${base} O pedido passa para "A caminho" e ela recebe a confirmação por e-mail.`
        : base,
    valorInicial: codigo,
    rotulo: MATERIAL_TRACKING_FIELD_LABEL,
    placeholder: MATERIAL_TRACKING_PLACEHOLDER,
  }
}

/**
 * `ENV-16`: quem informou e quando, sob o código. Sem código, `null`. A autoria só é afirmada com a
 * coluna gravada pela RPC da `82`; linha anterior a ela diz "Código informado" com a idade do PEDIDO
 * (A2 — nunca inventar quem foi).
 */
export const materialTrackingOrigin = (row: MaterialTrackingRow, agora: string): string | null => {
  if (!codigoDe(row)) return null
  const quando = row.material_tracking_set_at
  let frase: string
  if (quando && row.material_tracking_set_by === 'customer') frase = `Informado pela cliente ${relativeAge(quando, agora)}`
  else if (quando && row.material_tracking_set_by === 'admin') frase = `Registrado por você ${relativeAge(quando, agora)}`
  else frase = `Código informado ${relativeAge(row.created_at, agora)}`
  return row.material_received_at ? `${frase} · chegou ${relativeAge(row.material_received_at, agora)}` : frase
}

/**
 * `ENV-20`: a frase do "sem código", na precedência recebido → cancelado → esperando. Com código,
 * `null`. Pedido sem material (`nao_aplicavel`), `null` — o bloco nem aparece.
 *
 * SPEC_DEVIATION (precisão — a spec diz "recebido"): conta como recebido também `em_producao`, e o
 * envelope que chegou sem `material_received_at` gravado (pedido importado) diz só a primeira frase,
 * sem a idade — inventar uma data seria pior que omiti-la.
 */
export const materialTrackingEmpty = (row: MaterialTrackingRow, agora: string): string | null => {
  if (codigoDe(row)) return null
  const estado = toMaterialStatus(row.material_status)
  if (estado === 'nao_aplicavel') return null
  if (row.material_received_at) return `Chegou sem código registrado. Recebido ${relativeAge(row.material_received_at, agora)}.`
  if (ENVELOPE_CHEGOU.includes(estado)) return 'Chegou sem código registrado.'
  if (row.status === 'cancelled') return 'Nenhum código registrado.'
  return `${customerFirstName(row.customer_name)} ainda não informou o rastreio. É opcional: se ela mandar pelo WhatsApp, registre aqui. Também dá para marcar o recebimento direto.`
}

/** `ENV-09`: a recusa da RPC `set_material_tracking`, em português. `not_allowed` não chega aqui (A8). */
export const materialTrackingRefusal = (reason: string | null): string => {
  if (reason === 'empty_code') return 'Digite o código do envelope.'
  if (reason === 'material_not_applicable') return 'Este pedido não espera material.'
  return ACTION_FAILED
}

/**
 * `ENV-24` (A3, A4): há quanto tempo o envelope é esperado — a mesma régua da linha da lista
 * (`rowQueueAge`), só enquanto ele não chegou e o pedido não foi cancelado. Fora disso, `null`.
 */
export const materialWaitAge = (
  row: Pick<MaterialTrackingRow, 'status' | 'material_status' | 'created_at' | 'material_received_at'>,
  agora: string,
): QueueAge | null => {
  if (!esperando(row)) return null
  return rowQueueAge(row, new Date(agora))
}

/**
 * Fase 5 da `82` (T21, `BUG-20261026-idade-da-espera-sem-contexto`, decisão de 2026-10-27): a idade ao
 * lado dos chips diz DO QUÊ — "Esperando há 10 dias", e não um "há 10 dias" solto que se lia como a
 * data do envio (ou um número sem contexto no leitor de tela). A frase é a mesma nos três degraus; o
 * `stale` muda só a cor (A3). O número e o plural continuam de `queueAgeLabel`, que fica INTACTO para o
 * painel e a Início.
 */
export const materialWaitLabel = (age: QueueAge): string => `Esperando ${queueAgeLabel(age)}`

/**
 * `ENV-25` (A10): "Colocar em produção" no bloco Material — só com o envelope na bancada
 * (`material_recebido`) e o pedido não cancelado. Um dono para o botão do app e para a guarda de
 * `runAppAction` (`{ tipo: 'producao' }`), que devolve `mudou` sem rede quando isto é falso.
 */
export const canStartProduction = (row: Pick<MaterialTrackingRow, 'status' | 'material_status'>): boolean =>
  toMaterialStatus(row.material_status) === 'material_recebido' && row.status !== 'cancelled'

/**
 * `ENV-26`: a frase do pedido cancelado que tem material, ou `null`. O bloco do app a desenha no lugar
 * das ações do envelope e da produção — o app não compara `status` (`regraDePedidoSoNoCore`).
 */
export const materialCancelledNote = (row: Pick<MaterialTrackingRow, 'status' | 'material_status'>): string | null =>
  row.status === 'cancelled' && toMaterialStatus(row.material_status) !== 'nao_aplicavel' ? MATERIAL_CANCELLED_NOTE : null
