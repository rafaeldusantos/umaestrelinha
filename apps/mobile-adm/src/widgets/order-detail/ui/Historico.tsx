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
        <ol className="space-y-3">
          {eventos.map((ev) => {
            const falhou = ev.kind === 'email' && ev.emailSent === false
            return (
              <li key={ev.id} data-testid="evento-do-historico" data-tipo={ev.kind} data-falhou={falhou ? 'true' : undefined} className="text-sm">
                <p className={cn('font-medium [overflow-wrap:anywhere]', falhou && 'text-estrelinha-alert')}>{ev.title}</p>
                {ev.detail && (
                  <p className={cn('[overflow-wrap:anywhere]', falhou ? 'text-estrelinha-alert' : 'text-estrelinha-ink-soft')}>{ev.detail}</p>
                )}
                <p data-parte="quando" className="text-xs text-estrelinha-ink-soft">
                  {[formatShortDate(ev.at), relativeAge(ev.at, lidoEm)].filter(Boolean).join(' · ')}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </BlocoDoDetalhe>
  )
}

export default Historico
