// Feature `63` (RET-15): a decisão de `handleCreate` ANTES da primeira chamada ao Melhor Envio.
//
// Mora num arquivo próprio porque `index.ts` não é carregável por teste nenhum (importa de `esm.sh`
// e lê `Deno.env` no topo). Aqui a decisão é pura: recebe a LINHA do pedido, como o `select` a
// devolveu, e responde se a etiqueta é recusada. Quem testa: `__tests__/pickupGate.test.ts` (a
// decisão) e `_shared/__tests__/retiradaSemEtiqueta.test.ts` (a fiação no `index.ts`).
//
// Import por caminho relativo com a extensão explícita: o Deno não resolve o especificador sem ela.
import { isPickupOrder } from "../../../packages/core/src/shipping/pickup.ts"

/** A recusa: `422` com o motivo que o painel trata. */
export interface PickupGateRefusal {
  status: 422
  error: "pickup_order"
}

/**
 * O pedido é de retirada no escritório? Então não há etiqueta: devolve a recusa. Qualquer outro
 * pedido (Correios, ou sem serviço gravado) segue para a API — `null`.
 *
 * Recebe a linha INTEIRA, nunca a coluna: o dono de "este pedido é de retirada?" é `isPickupOrder`,
 * e é ele quem sabe qual coluna ler.
 */
export function pickupGate(
  order: { shipping_service_id?: string | null } | null | undefined,
): PickupGateRefusal | null {
  return isPickupOrder(order) ? { status: 422, error: "pickup_order" } : null
}
