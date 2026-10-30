// Feature `82` · `ENV-07`, `ENV-14` — o código do envelope que a CLIENTE posta (a remessa de ENTRADA,
// `orders.material_tracking_code`; nunca `tracking_code`, que é a de saída). **Só por RPC**:
// `set_material_tracking` autoriza (admin ou dona) e lê na mesma consulta, move
// `aguardando_material → material_enviado` sozinha e grava quem informou e quando (migration da `82`).
// Subiu de `useAdminOrders.setMaterialTracking` (painel); o app do ateliê chama a mesma sequência.
//
// O gatilho `material_tracking_set` — o MESMO que a loja dispara quando a própria cliente registra
// (`NTF-13`, um gatilho por fato) — sai SÓ no `ok`, e fora do `try`, pelo mesmo motivo de
// `material.ts`.
//
// Fase 5 (T19, `BL-054`): o código é NORMALIZADO aqui, antes da RPC (`normalizeMaterialTrackingCode`):
// o app, o painel e a loja gravam por este dono, e a forma no banco é uma só. Vazio depois de
// normalizar ⇒ `recusado` com `empty_code` (a mesma razão da RPC), sem rede. O comprimento NÃO é
// validado aqui: a recusa do curto continua sendo do app (`runAppAction`, A8 da `75`).

import { normalizeMaterialTrackingCode } from '../orders/tracking.ts'
import { notifyWrite } from './notify.ts'
import type { MaterialTrackingOutcome, OrderWriteDeps } from './types.ts'

export interface WriteMaterialTrackingInput {
  id: string
  code: string
  /** Padrão `true`. */
  avisar?: boolean
  /**
   * Feature `88`: `false` ⇒ o gatilho sai sem o e-mail da cliente; o aviso à dona
   * (`owner_material_incoming`) sai como sempre (`A-04`). Só vale com `avisar`.
   */
  avisarCliente?: boolean
}

interface RespostaDaRpc {
  ok?: boolean
  status?: string | null
  reason?: string | null
}

export async function writeMaterialTracking(
  { client, notify }: OrderWriteDeps,
  { id, code, avisar = true, avisarCliente }: WriteMaterialTrackingInput,
): Promise<MaterialTrackingOutcome> {
  const codigo = normalizeMaterialTrackingCode(code)
  if (codigo === '') return { tipo: 'recusado', reason: 'empty_code' }

  let resposta: { data: unknown; error: unknown }
  try {
    resposta = await client.rpc('set_material_tracking', { p_order_id: id, p_code: codigo })
  } catch (erro) {
    return { tipo: 'falhou', erro }
  }
  if (resposta.error) return { tipo: 'falhou', erro: resposta.error }

  const resultado = (resposta.data ?? {}) as RespostaDaRpc
  if (resultado.ok !== true) {
    // `not_allowed` responde igual a "não é seu" e "não existe" (de propósito, na RPC): quem decide o
    // que ele significa é o chamador — o app reconfere o papel (A8), o painel devolve `not_allowed`.
    if (resultado.reason === 'not_allowed') return { tipo: 'nao-permitido' }
    return { tipo: 'recusado', reason: resultado.reason ?? null }
  }

  const emailSent = avisar ? await notifyWrite(notify, id, 'material_tracking_set', avisarCliente) : false
  return { tipo: 'ok', status: resultado.status ?? null, emailSent }
}
