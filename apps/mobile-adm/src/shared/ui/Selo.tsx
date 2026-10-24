import type { ReactNode } from 'react'
import type { SituationTone } from '@estrelinha/core/orders'

/**
 * A pílula de um tom (feature `74`, `MAP-16`, `MAP-25`, `MAP-43`) — extraída de `SituacaoDoPedido`
 * (feature `73`) para o selo de PAGAMENTO do detalhe usar a mesma régua de cor. **O mapa tom → classe
 * mora só aqui**: um segundo mapa (o do selo de pagamento) divergiria sem nada quebrar.
 *
 * Não decide tom nem rótulo: quem decide é `core` (`orderSituation`, `PAYMENT_STATUS_TONES`). Aqui
 * mora só a APRESENTAÇÃO do tom, a da loja (`OrderSituationBadge`, a "Régua dos selos"), com os
 * tokens de texto do tom no ponto em vez dos dois hex que a loja escreve à mão — o app não declara cor
 * fora da paleta.
 *
 * **O rótulo nunca é cortado** (`BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima`, `MAP-43`):
 * sem `truncate` e sem `whitespace-nowrap`. Com a fonte do sistema a 165 %+ numa tela de 360, a
 * pílula sozinha é mais larga que a linha: o texto desce para uma segunda linha dentro dela, em vez
 * de virar "Aguardando pag…".
 */
const PILULA_DO_TOM: Record<SituationTone, string> = {
  wait: 'bg-estrelinha-wait-soft text-estrelinha-wait',
  alert: 'bg-estrelinha-alert-soft text-estrelinha-alert',
  done: 'bg-estrelinha-done-soft text-estrelinha-done',
  progress: 'bg-estrelinha-serenity text-estrelinha-primary-strong',
  neutral: 'bg-estrelinha-ground-deep text-estrelinha-ink',
}

const PONTO_DO_TOM: Record<SituationTone, string> = {
  wait: 'bg-estrelinha-accent',
  alert: 'bg-estrelinha-alert',
  done: 'bg-estrelinha-done',
  progress: 'bg-estrelinha-primary',
  neutral: 'bg-estrelinha-ink-soft',
}

interface SeloProps {
  tom: SituationTone
  children: ReactNode
  /** Atributos de dado (`data-situation`, `data-pagamento`…) para quem mede o selo. */
  dados?: Record<`data-${string}`, string>
}

const Selo = ({ tom, children, dados }: SeloProps) => (
  <span
    {...dados}
    data-tone={tom}
    className={`inline-flex max-w-full items-center gap-1.5 rounded-pill px-2.5 py-[3px] text-xs font-medium leading-4 ${PILULA_DO_TOM[tom]}`}
  >
    <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${PONTO_DO_TOM[tom]}`} />
    <span className="min-w-0">{children}</span>
  </span>
)

export default Selo
