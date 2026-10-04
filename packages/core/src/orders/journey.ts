// As etapas de um pedido, com a data de cada uma — a linha do tempo do detalhe (feature `59`,
// `DET-05..08`, `LIN-05`).
//
// **Uma** montagem, chamada igual pelos dois caminhos de leitura do detalhe: a cliente logada recebe
// os eventos pela RPC `customer_order_events`, a convidada pelo `checkout?action=get-order`, e os
// dois chegam aqui no mesmo formato. Duas montagens dariam à mesma entrega uma data na conta e
// outra no link do e-mail, sem nada quebrar.
//
// A regra de data (`DET-06`) é a da fonte de cada etapa — `created_at`, `paid_at`,
// `material_received_at` e o PRIMEIRO registro do histórico com `separating`, `shipped` e
// `delivered`. Sem fonte, sem data. **Nunca `updated_at`** (`L-017`): ele muda a cada ajuste do
// painel e mentiria sobre quando a etapa aconteceu.

import { firstEventAt, type StatusEvent } from './situation.ts'

export interface JourneyInput {
  status: string | null
  payment_status: string | null
  material_status?: string | null
  created_at: string
  paid_at: string | null
  material_received_at?: string | null
  delivery_estimate_min?: string | null
  delivery_estimate_max?: string | null
}

export type JourneyStepKey = 'received' | 'paid' | 'material' | 'production' | 'shipped' | 'delivered'

export type JourneyStepState = 'complete' | 'current' | 'future'

export interface JourneyStep {
  key: JourneyStepKey
  label: string
  state: JourneyStepState
  /** O instante da fonte da etapa, cru. `null` quando a fonte não existe — nunca inventado. */
  at: string | null
}

/**
 * Discriminada por **string**, não por booleano: com `strictNullChecks: false`, uma união por
 * `cancelled: true | false` não estreita, e ler `steps` no ramo certo seria erro de compilação.
 */
export type Journey =
  | { kind: 'cancelled'; cancelledAt: string | null }
  | { kind: 'steps'; steps: JourneyStep[] }

export const JOURNEY_STEP_LABELS: Record<JourneyStepKey, string> = {
  received: 'Pedido recebido',
  paid: 'Pagamento aprovado',
  material: 'Material recebido no ateliê',
  production: 'Em produção no ateliê',
  shipped: 'A caminho',
  delivered: 'Entregue',
}

/** Os estados do material em que ele já está no ateliê. */
const MATERIAL_NO_ATELIE = ['material_recebido', 'em_producao']

interface Rascunho {
  key: JourneyStepKey
  /** A etapa, sozinha, já aconteceu? A monotonia é aplicada depois. */
  aconteceu: boolean
  at: string | null
}

export function orderJourney(o: JourneyInput, events: StatusEvent[] | null | undefined): Journey {
  if (o.status === 'cancelled') {
    return { kind: 'cancelled', cancelledAt: firstEventAt(events, 'cancelled') }
  }

  const enviado = o.status === 'shipped' || o.status === 'delivered'
  const exigeMaterial = !!o.material_status && o.material_status !== 'nao_aplicavel'

  const rascunho: Rascunho[] = [
    { key: 'received', aconteceu: true, at: o.created_at ?? null },
    { key: 'paid', aconteceu: o.payment_status === 'approved', at: o.paid_at ?? null },
  ]
  if (exigeMaterial) {
    rascunho.push({
      key: 'material',
      aconteceu: MATERIAL_NO_ATELIE.includes(o.material_status ?? ''),
      at: o.material_received_at ?? null,
    })
  }
  rascunho.push(
    // A produção só se dá por concluída quando o pacote sai — antes disso ela é a etapa em curso.
    { key: 'production', aconteceu: enviado, at: firstEventAt(events, 'separating') },
    { key: 'shipped', aconteceu: enviado, at: firstEventAt(events, 'shipped') },
    { key: 'delivered', aconteceu: o.status === 'delivered', at: firstEventAt(events, 'delivered') },
  )

  // Uma etapa posterior concluída implica as anteriores. É o que mantém coerente o pedido
  // importado da Nuvemshop, entregue com o pagamento num vocabulário que esta régua não lê.
  const ultimaConcluida = rascunho.map((r) => r.aconteceu).lastIndexOf(true)
  const atual = ultimaConcluida + 1

  const steps = rascunho.map<JourneyStep>((r, i) => ({
    key: r.key,
    label: JOURNEY_STEP_LABELS[r.key],
    state: i <= ultimaConcluida ? 'complete' : i === atual ? 'current' : 'future',
    at: r.at,
  }))

  return { kind: 'steps', steps }
}
