import { cn } from '@estrelinha/ui/lib/utils'
import { materialProgress, materialSubline } from '@estrelinha/core/material'
import type { PedidoDoDetalhe } from '@/entities/order'
import { BlocoDoDetalhe } from './BlocoDoDetalhe'

/**
 * O bloco "Material afetivo" do detalhe (feature `74`, `MAP-23`, A22, A23). Não decide nada: o
 * título, os quatro passos e o estado de cada um são de `materialProgress`, e a linha sob o título é
 * de `materialSubline` contra o `lido_em` do SERVIDOR — os dois em `core/material`.
 *
 * Sem material (`nao_aplicavel`) o bloco não existe: `materialProgress` devolve `null`.
 * O passo atual leva `aria-current="step"`; com a joia já enviada ou entregue, os quatro estão feitos.
 */
const BlocoMaterial = ({ pedido, lidoEm }: { pedido: PedidoDoDetalhe; lidoEm: string }) => {
  const progresso = materialProgress(pedido.material_status, pedido.status)
  if (!progresso) return null
  return (
    <BlocoDoDetalhe id="material" titulo="Material afetivo">
      <p data-parte="titulo-do-material" className="text-sm font-medium [overflow-wrap:anywhere]">
        {progresso.titulo}
      </p>
      <p data-parte="linha-do-material" className="mt-0.5 text-xs text-estrelinha-ink-soft [overflow-wrap:anywhere]">
        {materialSubline(pedido, lidoEm)}
      </p>
      <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Passos do material">
        {progresso.passos.map((p) => (
          <li
            key={p.status}
            data-estado={p.estado}
            aria-current={p.estado === 'atual' ? 'step' : undefined}
            className="flex min-w-0 flex-col items-center gap-1 text-center"
          >
            <span
              aria-hidden="true"
              className={cn(
                'h-2 w-full rounded-full',
                p.estado === 'depois' ? 'bg-estrelinha-ground-deep' : 'bg-estrelinha-primary',
                p.estado === 'atual' && 'bg-estrelinha-accent',
              )}
            />
            <span
              className={cn(
                'text-[11px] leading-tight [overflow-wrap:anywhere]',
                p.estado === 'atual' ? 'font-semibold text-estrelinha-ink' : 'text-estrelinha-ink-soft',
              )}
            >
              {p.label}
            </span>
          </li>
        ))}
      </ol>
    </BlocoDoDetalhe>
  )
}

export default BlocoMaterial
