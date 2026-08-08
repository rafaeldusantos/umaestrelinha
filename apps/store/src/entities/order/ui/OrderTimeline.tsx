// Timeline de 4 estágios do pedido — `Pago · Em preparo · Postado · Entregue` (CNF-04, CNF-06).
//
// Fica em `entities/order/ui` **de propósito**: a spec `09` (conta) reusa o mesmo componente na
// lista de pedidos e no rastreio. Em `features/checkout/ui` seria cross-import de feature.
//
// CNF-06: os estados se distinguem por **forma**, não por cor — concluído = disco preenchido com
// check, atual = anel (contorno grosso + miolo), futuro = contorno fino com o ícone do estágio.
// A hierarquia se sustenta em preto e branco (checklist do `DESIGN.md` §8) e cada estágio expõe
// `data-state`, para o estado ser legível sem depender de classe de cor.
import { Check, Home, PackageCheck, Truck } from 'lucide-react'
import { formatEstimate } from '@nanapin/core/shipping'

export type OrderStageState = 'complete' | 'current' | 'future'

export interface OrderTimelineProps {
  /** `orders.status`: `pending` | `paid` | `separating` | `shipped` | `delivered` | `cancelled`. */
  status: string
  /**
   * `orders.paid_at`. É ele — não `status` — que marca o estágio "Pago":
   * `apply_payment_approval` grava `paid_at` + `payment_status = 'approved'` e deixa
   * `status` em `pending`.
   */
  paidAt: string | null
  /** Janela de entrega de `delivery_estimate_min`/`_max` (SHP-08), em `YYYY-MM-DD`. */
  estimate: { min: string; max: string } | null
}

const STAGES = [
  { label: 'Pago', Icon: Check },
  { label: 'Em preparo', Icon: PackageCheck },
  { label: 'Postado', Icon: Truck },
  { label: 'Entregue', Icon: Home },
] as const

const MONTHS_SHORT_PT_BR = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
]

/** `YYYY-MM-DD` → data local. `new Date('2026-08-04')` seria meia-noite UTC e voltaria um dia. */
const parseIsoDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

const formatShortDate = (value: string): string | null => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getDate()} ${MONTHS_SHORT_PT_BR[date.getMonth()]}`
}

/**
 * Quantos estágios estão concluídos e qual é o atual. `current = -1` significa "nenhum atual" —
 * é o pedido entregue, em que os quatro discos estão preenchidos.
 *
 * `paid_at` é a fonte do estágio "Pago"; `status` governa os de logística.
 */
function resolveStageProgress(
  status: string,
  paidAt: string | null,
): { completed: number; current: number } {
  if (status === 'delivered') return { completed: STAGES.length, current: -1 }
  if (status === 'shipped') return { completed: 2, current: 2 }
  if (paidAt) return { completed: 1, current: 1 }
  return { completed: 0, current: 0 }
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <section
    aria-label="Onde seu pedido está"
    className="flex flex-col gap-[22px] rounded-lg border border-nanita-border bg-white px-6 py-7 sm:px-8"
  >
    {children}
  </section>
)

const Heading = ({ detail }: { detail?: string | null }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
    <h2 className="font-heading text-xl font-semibold tracking-[-0.02em] text-nanita-ink">
      Onde seu pedido está
    </h2>
    {detail && <p className="text-sm font-medium text-nanita-plum">{detail}</p>}
  </div>
)

const Connector = ({ filled }: { filled: boolean }) => (
  <span
    aria-hidden
    className={`h-[3px] grow ${filled ? 'bg-nanita-jam' : 'bg-nanita-border'}`}
  />
)

const Disc = ({ state, Icon }: { state: OrderStageState; Icon: typeof Check }) => {
  if (state === 'complete') {
    return (
      <span
        data-testid="stage-disc"
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-nanita-jam"
      >
        <Check className="h-[17px] w-[17px] text-white" strokeWidth={3.2} aria-hidden />
      </span>
    )
  }

  if (state === 'current') {
    return (
      <span
        data-testid="stage-disc"
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-[3px] border-nanita-jam bg-white"
      >
        <span className="h-[11px] w-[11px] rounded-full bg-nanita-jam" />
      </span>
    )
  }

  return (
    <span
      data-testid="stage-disc"
      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-2 border-nanita-border bg-nanita-sugar"
    >
      <Icon className="h-4 w-4 text-nanita-plum" aria-hidden />
    </span>
  )
}

const OrderTimeline = ({ status, paidAt, estimate }: OrderTimelineProps) => {
  // `cancelled` não finge progresso: nenhum disco, nenhuma trilha — só o que aconteceu.
  if (status === 'cancelled') {
    return (
      <Card>
        <Heading />
        <div className="flex flex-col gap-1">
          <p className="font-heading text-lg font-semibold text-nanita-ink">Pedido cancelado</p>
          <p className="text-sm text-nanita-plum">
            Este pedido foi cancelado e não segue em preparo. Se você pagou, o valor é devolvido pelo
            Mercado Pago.
          </p>
        </div>
      </Card>
    )
  }

  const { completed, current } = resolveStageProgress(status, paidAt)

  const min = estimate ? parseIsoDate(estimate.min) : null
  const max = estimate ? parseIsoDate(estimate.max) : null
  const estimateLabel = min && max ? `Chega ${formatEstimate(min, max)}` : null

  const paidLabel = paidAt ? formatShortDate(paidAt) : null

  const stageState = (index: number): OrderStageState => {
    if (index < completed) return 'complete'
    if (index === current) return 'current'
    return 'future'
  }

  const stageDetail = (index: number, state: OrderStageState): string | null => {
    if (index === 0) return paidLabel
    if (index === 1 && state === 'current') return 'agora'
    return null
  }

  return (
    <Card>
      <Heading detail={estimateLabel} />
      <ol className="flex items-start">
        {STAGES.map(({ label, Icon }, index) => {
          const state = stageState(index)
          const detail = stageDetail(index, state)

          return (
            <li
              key={label}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              className="flex grow basis-0 flex-col items-center gap-3"
            >
              <span className="flex w-full items-center">
                {index === 0 ? <span aria-hidden className="h-[3px] grow" /> : (
                  <Connector filled={index <= completed} />
                )}
                <Disc state={state} Icon={Icon} />
                {index === STAGES.length - 1 ? <span aria-hidden className="h-[3px] grow" /> : (
                  <Connector filled={index + 1 <= completed} />
                )}
              </span>
              <span className="flex flex-col items-center gap-[2px] text-center">
                <span
                  className={`text-[15px] leading-[18px] ${
                    state === 'future'
                      ? 'font-medium text-nanita-plum'
                      : 'font-semibold text-nanita-ink'
                  }`}
                >
                  {label}
                </span>
                {detail && (
                  <span
                    className={`text-[13px] leading-4 ${
                      state === 'current' ? 'font-medium text-nanita-jam' : 'text-nanita-plum'
                    }`}
                  >
                    {detail}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export default OrderTimeline
