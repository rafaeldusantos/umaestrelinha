// Feature `75` · `MAA-02`..`MAA-05`, A1, A3 — a transição do material. **Só por RPC**, nunca
// `update` direto: `set_material_status` guarda os estados de origem no próprio `where`, o que a
// torna idempotente sob concorrência. Subiu de `useAdminOrders.setMaterialStatus` (painel); o app
// chama a mesma sequência em "Recebi o material" e no primeiro passo de "Iniciar separação".
//
// O aviso `material_status_changed` sai SÓ no `ok` (escrita duas vezes, uma cópia poderia avisar em
// `ok: false`). Ele fica fora do `try`, pelo mesmo motivo de `status.ts`.

import type { MaterialOutcome, OrderWriteDeps } from './types.ts'

export interface WriteMaterialStatusInput {
  id: string
  to: string
  /** Padrão `true`. */
  avisar?: boolean
}

interface RespostaDaRpc {
  ok?: boolean
  status?: string | null
  reason?: string | null
}

export async function writeMaterialStatus(
  { client, notify }: OrderWriteDeps,
  { id, to, avisar = true }: WriteMaterialStatusInput,
): Promise<MaterialOutcome> {
  let resposta: { data: unknown; error: unknown }
  try {
    resposta = await client.rpc('set_material_status', { p_order_id: id, p_status: to })
  } catch (erro) {
    return { tipo: 'falhou', erro }
  }
  if (resposta.error) return { tipo: 'falhou', erro: resposta.error }

  const resultado = (resposta.data ?? {}) as RespostaDaRpc
  if (resultado.ok !== true) {
    if (resultado.reason === 'not_admin') return { tipo: 'sem-papel' }
    return { tipo: 'material-recusado', reason: resultado.reason ?? null, status: resultado.status ?? null }
  }

  const emailSent = avisar ? await notify(id, 'material_status_changed') : false
  return { tipo: 'ok', status: resultado.status ?? to, emailSent }
}
