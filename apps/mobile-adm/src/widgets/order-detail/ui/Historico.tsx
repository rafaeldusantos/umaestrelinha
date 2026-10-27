import { cn } from '@estrelinha/ui/lib/utils'
import { formatShortDate, type HistoryEvent } from '@estrelinha/core/orders'
import { relativeAge } from '@estrelinha/core/stats'
import type { Bloco } from '@/entities/order'
import { BlocoDoDetalhe, BlocoEmFalha } from './BlocoDoDetalhe'

export const TITULO_DO_HISTORICO = 'Histórico'
export const HISTORICO_VAZIO = 'Nada registrado ainda.'

/**
 * O histórico do pedido (feature `74`, `MAP-28`, A19, Q6): os eventos de `buildHistory` (`core`, o
 * MESMO do painel) — status, avisos e notas internas num fio só, do mais recente para o mais antigo —
 * já fundidos pelo hook. Aqui só se desenha: o título e o texto do evento são de `core`, e a data é
 * "<dia em Brasília> · <há quanto tempo>" contra o `lido_em` do SERVIDOR.
 *
 * Um aviso que FALHOU aparece em alerta: o texto de `core` já diz que falhou e, sem erro registrado,
 * que a cliente não foi avisada. Com qualquer das três fontes em falha o bloco inteiro está em falha
 * (Q6): fundir com um fio faltando contaria uma história errada.
 */
const Historico = ({
  historico,
  lidoEm,
  tentarDeNovo,
}: {
  historico: Bloco<HistoryEvent[]>
  lidoEm: string
  tentarDeNovo: () => void
}) => {
  if (historico.estado === 'falhou') return <BlocoEmFalha id="historico" titulo={TITULO_DO_HISTORICO} tentarDeNovo={tentarDeNovo} />
  const eventos = (historico as { estado: 'ok'; dado: HistoryEvent[] }).dado ?? []
  return (
    <BlocoDoDetalhe id="historico" titulo={TITULO_DO_HISTORICO}>
      {eventos.length === 0 ? (
        <p className="text-sm text-estrelinha-ink-soft">{HISTORICO_VAZIO}</p>
      ) : (
        // A linha do tempo do protótipo: um ponto por evento e um fio até o próximo. O mais recente
        // (o primeiro) leva o ponto em `primary`; aviso que falhou, em `alert`.
        <ol className="pt-1">
          {eventos.map((ev, i) => {
            const falhou = ev.kind === 'email' && ev.emailSent === false
            const ultimo = i === eventos.length - 1
            return (
              <li key={ev.id} data-testid="evento-do-historico" data-tipo={ev.kind} data-falhou={falhou ? 'true' : undefined} className="flex gap-3 text-sm">
                <div aria-hidden="true" className="flex w-2.5 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      'mt-[5px] h-[9px] w-[9px] shrink-0 rounded-full',
                      falhou ? 'bg-estrelinha-alert' : i === 0 ? 'bg-estrelinha-primary' : 'bg-estrelinha-line',
                    )}
                  />
                  {!ultimo && <span className="w-px flex-1 bg-estrelinha-line" />}
                </div>
                <div className={cn('min-w-0 flex-1', !ultimo && 'pb-3.5')}>
                  <p className={cn('[overflow-wrap:anywhere]', falhou && 'text-estrelinha-alert')}>{ev.title}</p>
                  {ev.detail && (
                    <p className={cn('text-[13px] [overflow-wrap:anywhere]', falhou ? 'text-estrelinha-alert' : 'text-estrelinha-ink-soft')}>{ev.detail}</p>
                  )}
                  <p data-parte="quando" className="mt-0.5 text-xs text-estrelinha-ink-soft">
                    {[formatShortDate(ev.at), relativeAge(ev.at, lidoEm)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </BlocoDoDetalhe>
  )
}

export default Historico
