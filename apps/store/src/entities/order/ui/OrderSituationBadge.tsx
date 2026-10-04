// O selo da situação do pedido — "em que pé está?" num rótulo (feature 59, `SIT-11..13`).
//
// **Este componente não decide nada.** Quem responde a situação é `orderSituation`
// (`@estrelinha/core/orders`), e quem acrescenta a data é `situationDetail`. Aqui mora só a
// APRESENTAÇÃO: o tom vira um par de tokens (texto × fundo) e um ponto. Uma segunda tabela de
// rótulos de status em `apps/store` é exatamente o defeito que abriu a feature — a conta antiga
// conhecia 5 dos 6 status e mostrava pedido pago como "Pendente" —, e `situacaoComDonoUnico.test.ts`
// recusa a volta.
//
// As cores são a "Régua dos selos" do Paper. Os textos são tokens com contraste medido em
// `contrast.test.ts` (≥ 4,5:1 sobre o próprio fundo e sobre as três superfícies claras). O PONTO é
// ornamento ao lado do texto, não carrega informação sozinho — por isso os dois tons sem token
// próprio (o rosa-terra e o musgo do ponto) entram como valor de fundo, e nunca como cor de texto.
import {
  orderSituation,
  situationDetail,
  type SituationInput,
  type SituationTone,
  type StatusEvent,
} from '@estrelinha/core/orders'

/** Texto e fundo da pílula, por tom. Nenhuma cor padrão do Tailwind (`SIT-13`). */
const PILULA: Record<SituationTone, string> = {
  wait: 'bg-estrelinha-wait-soft text-estrelinha-wait',
  alert: 'bg-estrelinha-alert-soft text-estrelinha-alert',
  done: 'bg-estrelinha-done-soft text-estrelinha-done',
  progress: 'bg-estrelinha-serenity text-estrelinha-primary-strong',
  neutral: 'bg-estrelinha-ground-deep text-estrelinha-ink',
}

/** O ponto de 6px, por tom. */
const PONTO: Record<SituationTone, string> = {
  wait: 'bg-estrelinha-accent',
  alert: 'bg-[#A6534F]',
  done: 'bg-[#5E7A5A]',
  progress: 'bg-estrelinha-primary',
  neutral: 'bg-estrelinha-ink-soft',
}

export interface OrderSituationBadgeProps {
  /** As colunas que a régua lê: `status`, `payment_status`, `material_status`, a previsão. */
  order: SituationInput
  /** O histórico do pedido — é dele que sai o " em 12 ago" do "Entregue" (`SIT-12`). */
  events?: StatusEvent[] | null
  className?: string
}

const OrderSituationBadge = ({ order, events, className }: OrderSituationBadgeProps) => {
  const { key, label, tone } = orderSituation(order)
  const detalhe = situationDetail(order, events) ?? ''

  return (
    <span
      data-situation={key}
      data-tone={tone}
      className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-[3px] font-body text-xs font-medium leading-4 ${PILULA[tone]}${
        className ? ` ${className}` : ''
      }`}
    >
      <span aria-hidden data-testid="situation-dot" className={`h-1.5 w-1.5 shrink-0 rounded-full ${PONTO[tone]}`} />
      <span className="truncate">
        {label}
        {detalhe}
      </span>
    </span>
  )
}

export default OrderSituationBadge
