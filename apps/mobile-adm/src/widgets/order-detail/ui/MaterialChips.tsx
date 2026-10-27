import { cn } from '@estrelinha/ui/lib/utils'
import { materialKindLabel, materialWaitAge, materialWaitLabel, orderMaterialKinds } from '@estrelinha/core/material'

import type { Bloco, ItemComFoto, PedidoDoDetalhe } from '@/entities/order'

/**
 * Os materiais que o pedido exige e há quanto tempo o envelope é esperado (feature `82`, `ENV-23`,
 * `ENV-24`, A3, A4).
 *
 * - Um chip por material distinto do SNAPSHOT dos itens (`orderMaterialKinds`, `core`), na ordem de
 *   `MATERIAL_KINDS`; itens em falha de leitura ⇒ nenhum chip (nunca "nenhum material").
 * - A idade é `materialWaitAge` (`core`): a régua da fila, só enquanto o envelope não chegou e o
 *   pedido não foi cancelado, contra o `lido_em` do servidor. "Esperando há N dias" (`materialWaitLabel`,
 *   Fase 5, T21 — o "há N dias" solto não dizia do quê) em `ink-soft`; o degrau `stale` muda só a COR
 *   (`wait`) (A3).
 */
const MaterialChips = ({ pedido, itens, lidoEm }: { pedido: PedidoDoDetalhe; itens: Bloco<ItemComFoto[]>; lidoEm: string }) => {
  const kinds = itens.estado === 'ok' ? orderMaterialKinds((itens as { estado: 'ok'; dado: ItemComFoto[] }).dado) : []
  const idade = materialWaitAge(pedido, lidoEm)
  if (kinds.length === 0 && !idade) return null
  return (
    <div data-parte="materiais" className="mt-3 flex flex-wrap items-center gap-2">
      {kinds.length > 0 && (
        <ul aria-label="Materiais do pedido" className="flex min-w-0 flex-wrap gap-1.5">
          {kinds.map((k) => (
            <li
              key={k}
              data-parte="chip-do-material"
              className="rounded-pill bg-estrelinha-ground-deep px-2 py-0.5 text-xs text-estrelinha-ink [overflow-wrap:anywhere]"
            >
              {materialKindLabel(k)}
            </li>
          ))}
        </ul>
      )}
      {idade && (
        <span
          data-parte="espera"
          data-degrau={idade.tier}
          className={cn('ml-auto whitespace-nowrap text-xs font-semibold', idade.tier === 'stale' ? 'text-estrelinha-wait' : 'text-estrelinha-ink-soft')}
        >
          {materialWaitLabel(idade)}
        </span>
      )}
    </div>
  )
}

export default MaterialChips
