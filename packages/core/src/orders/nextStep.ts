// `PED-29` — "Próximo passo: X", com o motivo quando há pendência, e **sem bloquear**.
//
// Feature `74` (`MAP-21`, `MAP-47`, `MAP-48`): subiu BYTE A BYTE de
// `apps/backoffice/src/features/order-detail/model/nextStep.ts` — o detalhe do painel e o do app do
// ateliê dizem o mesmo próximo passo. A entrada é estrutural (`NextStepInput`): o `DbOrder` do painel
// a satisfaz. Os rótulos de status vêm de `ORDER_STATUS_LABELS`, que o `STATUS_LABELS` do painel já
// era por referência (conserto do QA da `73`) — as palavras são as mesmas.
//
// ---------------------------------------------------------------------------------------------
// A REGRA `UX-01`, APLICADA AO STATUS
// ---------------------------------------------------------------------------------------------
// Um botão desabilitado não ensina nada: quem olha não sabe se falta um dado, se não tem permissão,
// ou se a tela travou. E a operação real tem exceções legítimas — a Adri combina no WhatsApp de
// mandar antes, ou o material chegou em mãos e ninguém registrou.
//
// Então a tela **diz o que falta** e oferece `Avançar mesmo assim`. Mesma decisão da dica de
// rastreio ausente, que já estava no modal e não desabilitava o salvar.
//
// ⚠️ `separating` era RECUSADO pelo banco até a migration da feature 34 — o CHECK de `orders.status`
// só permitia cinco dos seis estados que esta tela sempre ofereceu, e a gravação falhava com 23514.
// Este arquivo assume o vocabulário corrigido.
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { toMaterialStatus } from '../material/material.ts'
import { isPickupOrder } from '../shipping/pickup.ts'
import { ORDER_STATUS_LABELS } from './labels.ts'

const STATUS_LABELS: Record<string, string> = ORDER_STATUS_LABELS

export interface NextStep {
  /** O status que o botão principal aplica. `null` em fim de linha. */
  status: string | null
  label: string
  /**
   * O que segura, em texto — `null` quando nada segura.
   *
   * **`string | null`, e não união discriminada por booleano.** Com `strictNullChecks: false`, ler
   * `.reason` no ramo do `else` de `{ ok: true } | { ok: false; reason }` é erro de compilação
   * (TS2339). Um veredito sem ramo não tem ramo para esquecer.
   */
  blockedReason: string | null
  /**
   * O texto do botão principal, quando ele não é só o nome do status. Hoje só a retirada no
   * escritório usa (`RET-16`): "Entregue" num pedido que a cliente buscou no balcão diz a coisa
   * errada. Ausente ⇒ a tela usa o rótulo do status.
   */
  actionLabel?: string
}

/** As colunas que o próximo passo lê. */
export interface NextStepInput {
  status: string
  material_status?: string | null
  payment_status?: string | null
  tracking_code?: string | null
  shipping_service_id?: string | null
}

/** RET-16 (feature 63): o rótulo do passo final de um pedido de retirada. */
export const PICKUP_DONE_ACTION = 'Marcar como retirado'

const PROXIMO: Record<string, string | undefined> = {
  pending: 'paid',
  paid: 'separating',
  separating: 'shipped',
  shipped: 'delivered',
}

export const nextStep = (order: NextStepInput): NextStep => {
  // RET-16 (feature 63): retirada no escritório não passa por `shipped` — não há postagem, e um
  // pedido "enviado sem rastreio" viraria pendência que não se resolve. `separating` vai direto a
  // `delivered`, e o botão diz o que aconteceu de verdade.
  if (isPickupOrder(order) && order.status === 'separating') {
    return {
      status: 'delivered',
      label: 'Próximo passo: Retirado no escritório',
      blockedReason: null,
      actionLabel: PICKUP_DONE_ACTION,
    }
  }

  const proximo = PROXIMO[order.status]

  if (!proximo) {
    return {
      status: null,
      // `delivered` e `cancelled` são fim de linha. Oferecer "avançar" faria pedido entregue andar.
      label: order.status === 'cancelled' ? 'Pedido cancelado' : 'Pedido concluído',
      blockedReason: null,
    }
  }

  const material = toMaterialStatus(order.material_status)
  const rotulo = `Próximo passo: ${STATUS_LABELS[proximo] ?? proximo}`

  // O material segura a SEPARAÇÃO, e só ela: não há o que separar antes de a peça existir, e a peça
  // não existe antes do material. Não segura o pagamento nem a entrega.
  if (proximo === 'separating' && (material === 'aguardando_material' || material === 'material_enviado')) {
    return {
      status: proximo,
      label: rotulo,
      blockedReason:
        material === 'aguardando_material'
          ? 'Disponível quando o material for registrado como recebido. Você pode avançar assim mesmo.'
          : 'O material está a caminho e ainda não foi registrado como recebido. Você pode avançar assim mesmo.',
    }
  }

  // A pendência do rastreio é de POSTAGEM: um pedido de retirada levado a `shipped` à mão (pelo
  // "Outro status") não tem rastreio a cobrar.
  if (proximo === 'delivered' && !order.tracking_code && !isPickupOrder(order)) {
    return {
      status: proximo,
      label: rotulo,
      blockedReason:
        'Este pedido não tem rastreio de saída, então a cliente não recebeu o aviso de postagem.',
    }
  }

  if (proximo === 'paid' && order.payment_status !== 'approved') {
    return {
      status: proximo,
      label: rotulo,
      blockedReason:
        'O pagamento ainda não foi aprovado pelo Mercado Pago. Marcar como pago aqui não cobra ninguém.',
    }
  }

  return { status: proximo, label: rotulo, blockedReason: null }
}
