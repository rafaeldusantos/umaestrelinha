// Feature `74` (`MAP-23`, A22, A23) — o bloco "Material afetivo" do detalhe do pedido no app do
// ateliê: os quatro passos do envelope, o estado de cada um e a linha sob o título.
//
// Mora ao lado de `MATERIAL_STATUS_LABELS` porque é o mesmo vocabulário em forma curta: os rótulos
// longos ("Aguardando material") não cabem quatro lado a lado em 360 px, e declarar os curtos no app
// seria um segundo dono do vocabulário do material (`MAP-49`).
//
// Todo especificador relativo leva `.ts`, e o grafo inteiro é de folhas (`stepsDenoReach.test.ts`).

import { relativeAge } from '../stats/labels.ts'
import { MATERIAL_STATUS_LABELS, toMaterialStatus, type MaterialStatus } from './material.ts'

/** Os quatro passos, na ordem da máquina de estado, com os rótulos curtos (A22). */
export const MATERIAL_STEPS: readonly { status: Exclude<MaterialStatus, 'nao_aplicavel'>; label: string }[] = [
  { status: 'aguardando_material', label: 'Aguardando' },
  { status: 'material_enviado', label: 'A caminho' },
  { status: 'material_recebido', label: 'Recebido' },
  { status: 'em_producao', label: 'Em produção' },
]

/** O título do bloco quando o pedido já saiu: o material virou joia. */
export const MATERIAL_USED_TITLE = 'Material usado na joia'

export type MaterialStepState = 'feito' | 'atual' | 'depois'

export interface MaterialProgress {
  /** O título do bloco: o rótulo do estado, ou "Material usado na joia" depois do envio. */
  titulo: string
  passos: { status: Exclude<MaterialStatus, 'nao_aplicavel'>; label: string; estado: MaterialStepState }[]
}

/** Os estados de pedido em que a joia já saiu do ateliê — o material foi usado. */
const JOIA_SAIU: readonly string[] = ['shipped', 'delivered']

/**
 * Onde o envelope está. `null` quando o pedido não tem material (`nao_aplicavel`): o bloco não
 * aparece. Com o pedido enviado ou entregue, os quatro passos estão feitos.
 */
export const materialProgress = (
  material_status: string | null | undefined,
  status: string | null | undefined,
): MaterialProgress | null => {
  const atual = toMaterialStatus(material_status)
  if (atual === 'nao_aplicavel') return null

  if (JOIA_SAIU.includes(status ?? '')) {
    return { titulo: MATERIAL_USED_TITLE, passos: MATERIAL_STEPS.map((p) => ({ ...p, estado: 'feito' as const })) }
  }

  const i = MATERIAL_STEPS.findIndex((p) => p.status === atual)
  return {
    titulo: MATERIAL_STATUS_LABELS[atual],
    passos: MATERIAL_STEPS.map((p, j) => ({
      ...p,
      estado: j < i ? ('feito' as const) : j === i ? ('atual' as const) : ('depois' as const),
    })),
  }
}

/** As colunas que a linha sob o título lê. */
export interface MaterialSublineInput {
  material_tracking_code: string | null
  material_received_at: string | null
  created_at: string
}

/**
 * A linha sob o título (A23): o rastreio do envelope quando existe; senão há quanto tempo chegou;
 * senão há quanto tempo o pedido foi feito. `agora` é o `lido_em` do servidor, nunca o relógio do
 * aparelho (A2).
 */
export const materialSubline = (o: MaterialSublineInput, agora: string): string => {
  const codigo = o.material_tracking_code?.trim()
  if (codigo) return `Rastreio do envelope: ${codigo}`
  if (o.material_received_at) return `Recebido ${relativeAge(o.material_received_at, agora)}`
  return `Pedido feito ${relativeAge(o.created_at, agora)}`
}
