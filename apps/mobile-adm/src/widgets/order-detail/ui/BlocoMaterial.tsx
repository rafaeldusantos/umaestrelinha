import type { ReactNode } from 'react'
import { cn } from '@estrelinha/ui/lib/utils'
import { materialCancelledNote, materialProgress, materialSubline } from '@estrelinha/core/material'
import type { Bloco, ItemComFoto, PedidoDoDetalhe } from '@/entities/order'
import { BlocoDoDetalhe } from './BlocoDoDetalhe'
import MaterialChips from './MaterialChips'

/**
 * O bloco "Material afetivo" do detalhe (feature `74`, `MAP-23`, A22, A23). Não decide nada: o
 * título, os quatro passos e o estado de cada um são de `materialProgress`, e a linha sob o título é
 * de `materialSubline` contra o `lido_em` do SERVIDOR — os dois em `core/material`.
 *
 * Sem material (`nao_aplicavel`) o bloco não existe: `materialProgress` devolve `null`.
 * O passo atual leva `aria-current="step"`; com a joia já enviada ou entregue, os quatro estão feitos.
 *
 * **`lembrete`** (feature `75`, `MAA-17`): o "Lembrar do envio no WhatsApp" no fim do bloco. O bloco
 * não decide quando ele aparece — quem compõe é a página (`LembreteDoEnvio`, que lê
 * `canChargeMaterial` de `core`).
 *
 * **Feature `82`** (`ENV-23`..`ENV-27`), na ordem do protótipo: título, linha, passos, os chips do
 * material com a idade da espera (`MaterialChips`, dos `itens` do detalhe), o `envelope` ("Envelope da
 * cliente"), e então OU a frase do cancelado (`materialCancelledNote`, `core` — a mesma constante do
 * painel) OU o nó `producao` ("Colocar em produção"), e o `lembrete` por último. Os nós vêm da página
 * (`features/order-actions`); o bloco só os posiciona, e nunca compara `status`.
 */
export interface BlocoMaterialProps {
  pedido: PedidoDoDetalhe
  lidoEm: string
  /** Os itens do detalhe, para os chips (`ENV-23`). Ausente ou em falha ⇒ nenhum chip. */
  itens?: Bloco<ItemComFoto[]>
  envelope?: ReactNode
  producao?: ReactNode
  lembrete?: ReactNode
}

const BlocoMaterial = ({ pedido, lidoEm, itens, envelope, producao, lembrete }: BlocoMaterialProps) => {
  const progresso = materialProgress(pedido.material_status, pedido.status)
  if (!progresso) return null
  const cancelado = materialCancelledNote(pedido)
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
      <MaterialChips pedido={pedido} itens={itens ?? { estado: 'falhou' }} lidoEm={lidoEm} />
      {envelope}
      {cancelado ? (
        <p data-parte="material-cancelado" className="mt-3.5 border-t border-estrelinha-line pt-3 text-[13px] text-estrelinha-ink-soft [overflow-wrap:anywhere]">
          {cancelado}
        </p>
      ) : (
        producao
      )}
      {lembrete}
    </BlocoDoDetalhe>
  )
}

export default BlocoMaterial
