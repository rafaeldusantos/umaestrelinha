// A linha do tempo do pedido — vertical, com a data real de cada etapa (feature 59, `DET-05..08`).
//
// Substitui a `OrderTimeline` horizontal de 4 estágios (`CNF-04`, revogado no design da `59`):
// seis etapas com data não cabem lado a lado em 390px, e as datas de "A caminho" e "Entregue"
// passaram a existir (`LIN-01..05`). O painel tem a SUA `OrderTimeline` e não é tocado.
//
// **Este componente não decide nada.** Quais etapas, em que estado e com que data é
// `orderJourney` (`@estrelinha/core/orders`) — a mesma montagem para a cliente logada e para a
// convidada. Aqui mora o desenho.
//
// Herdado do `CNF-06`: os estados se distinguem por FORMA, não só por cor — concluído = disco
// preenchido com check, atual = anel com miolo, futuro = anel vazio. Cada etapa expõe `data-state`,
// e a atual leva `aria-current="step"`.
import { Check } from 'lucide-react'
import {
  calendarParts,
  formatShortDate,
  orderJourney,
  type JourneyInput,
  type JourneyStep,
  type JourneyStepState,
  type StatusEvent,
} from '@estrelinha/core/orders'

export interface OrderJourneyProps {
  order: JourneyInput
  /** O histórico do pedido (`status` + data). Ausente, as etapas do histórico ficam sem data. */
  events?: StatusEvent[] | null
}

/**
 * "Previsão: entre 6 e 8 out" — `DET-07`, e "Previsão: 8 out" quando a janela é de um dia só.
 *
 * Composta das datas curtas de `core`, nunca de um segundo formatador: dentro do mesmo mês o mês
 * sai uma vez só, que é o desenho do Paper.
 */
const previsao = (min: string | null | undefined, max: string | null | undefined): string | null => {
  const fim = formatShortDate(max)
  if (!fim) return null
  const a = calendarParts(min)
  const b = calendarParts(max)
  if (!a || !b) return `Previsão: ${fim}`
  if (a.year === b.year && a.month === b.month && a.day === b.day) return `Previsão: ${fim}`
  if (a.year === b.year && a.month === b.month) return `Previsão: entre ${a.day} e ${fim}`
  return `Previsão: entre ${formatShortDate(min)} e ${fim}`
}

const Card = ({ children }: { children: React.ReactNode }) => (
  <section
    aria-label="Onde seu pedido está"
    className="flex flex-col gap-4 rounded-md border border-estrelinha-line bg-estrelinha-surface p-4"
  >
    <h2 className="font-heading text-lg font-semibold text-estrelinha-ink">Onde seu pedido está</h2>
    {children}
  </section>
)

/** O disco de 20px. A forma carrega o estado; a cor só reforça. */
const Disc = ({ state }: { state: JourneyStepState }) => {
  if (state === 'complete') {
    return (
      <span
        data-testid="stage-disc"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-estrelinha-primary"
      >
        <Check className="h-3 w-3 text-estrelinha-on-primary" strokeWidth={3} aria-hidden />
      </span>
    )
  }

  if (state === 'current') {
    return (
      <span
        data-testid="stage-disc"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-estrelinha-primary bg-estrelinha-surface"
      >
        <span className="h-2 w-2 rounded-full bg-estrelinha-primary" />
      </span>
    )
  }

  return (
    <span
      data-testid="stage-disc"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-estrelinha-line bg-estrelinha-surface"
    />
  )
}

const OrderJourney = ({ order, events }: OrderJourneyProps) => {
  const journey = orderJourney(order, events)

  // `DET-08`: cancelado não finge progresso — nenhum disco, nenhuma trilha, só o que aconteceu.
  if (journey.kind === 'cancelled') {
    const em = formatShortDate(journey.cancelledAt)
    return (
      <Card>
        <div className="flex flex-col gap-1">
          <p className="font-heading text-base font-semibold text-estrelinha-ink">Pedido cancelado</p>
          {em && <p className="text-[13px] text-estrelinha-ink-soft">Cancelado em {em}</p>}
          <p className="text-sm text-estrelinha-ink-soft">
            Este pedido foi cancelado e não segue em preparo. Se você pagou, o valor é devolvido pelo
            Mercado Pago.
          </p>
        </div>
      </Card>
    )
  }

  const { steps } = journey

  /** A linha de baixo de cada etapa: a data da fonte, ou a previsão na entrega que não aconteceu. */
  const detalhe = (step: JourneyStep): string | null => {
    const data = formatShortDate(step.at)
    if (data) return data
    if (step.key === 'delivered' && step.state !== 'complete') {
      return previsao(order.delivery_estimate_min, order.delivery_estimate_max)
    }
    return null
  }

  return (
    <Card>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const ultima = index === steps.length - 1
          // O trilho até a próxima etapa é cheio quando o pedido já chegou nela.
          const trilhoCheio = !ultima && steps[index + 1].state !== 'future'
          const linha = detalhe(step)

          return (
            <li
              key={step.key}
              data-state={step.state}
              data-step={step.key}
              aria-current={step.state === 'current' ? 'step' : undefined}
              className="flex gap-3"
            >
              <span className="flex w-5 shrink-0 flex-col items-center">
                <Disc state={step.state} />
                {!ultima && (
                  <span
                    aria-hidden
                    data-testid="stage-connector"
                    className={`w-0.5 grow ${trilhoCheio ? 'bg-estrelinha-primary' : 'bg-estrelinha-line'}`}
                  />
                )}
              </span>
              <span className={`flex min-w-0 flex-col gap-0.5 ${ultima ? '' : 'pb-5'}`}>
                <span
                  data-testid="stage-label"
                  className={`text-[15px] leading-5 ${
                    step.state === 'current'
                      ? 'font-semibold text-estrelinha-ink'
                      : step.state === 'complete'
                        ? 'font-medium text-estrelinha-ink'
                        : 'font-medium text-estrelinha-ink-soft'
                  }`}
                >
                  {step.label}
                </span>
                {linha && (
                  <span data-testid="stage-date" className="text-[13px] leading-4 text-estrelinha-ink-soft">
                    {linha}
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

export default OrderJourney
