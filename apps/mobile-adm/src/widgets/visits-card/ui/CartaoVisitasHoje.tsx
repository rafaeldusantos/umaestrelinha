import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  VISITS_TODAY_HINT,
  VISITS_TODAY_TITLE,
  visitsTodayFailedLabel,
  visitsTodayLabel,
  visitsTodayLoadingLabel,
} from '@estrelinha/core/live'
import { formatCount, type MovementPeriodKey, type StoreMovement } from '@estrelinha/core/stats'
import { AO_VIVO_PATH, estadoDaEntrada, gravarPeriodoNaEntrada } from '@/entities/stats'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO, Traco, type Leitura } from '@/shared/ui/leitura'

/**
 * O cartão "Visitas hoje" da Início (feature `83`, `LAV-04`): a porta da Loja ao vivo.
 *
 * - O número é `periodos.hoje.visitas` da MESMA leitura da faixa (a mesma resposta), em pt-BR.
 *   Nenhum número ao vivo, nenhum ponto dourado, nenhuma "pessoa" (critério 7 do PRD, `VIS-41`).
 * - Com dado ou carregando, o toque grava o período escolhido na faixa NA ENTRADA DA INÍCIO (voltar
 *   reabre a faixa nele) e abre `/ao-vivo` com `{ doApp: true, periodo }`. Em falha (ou recusa), o
 *   toque RELÊ — e o nome acessível diz isso.
 */
const CartaoVisitasHoje = ({ leitura, periodo }: { leitura: Leitura<StoreMovement>; periodo: MovementPeriodKey }) => {
  const navigate = useNavigate()
  const m = leitura.dado
  const falhou = !m && leitura.falhou
  const carregando = !m && !leitura.falhou
  const nome = m ? visitsTodayLabel(m.periodos.hoje.visitas) : falhou ? visitsTodayFailedLabel : visitsTodayLoadingLabel

  const tocar = () => {
    if (falhou) {
      leitura.tentarDeNovo()
      return
    }
    gravarPeriodoNaEntrada(periodo)
    navigate(AO_VIVO_PATH, { state: estadoDaEntrada(periodo) })
  }

  return (
    <button
      type="button"
      data-testid="cartao-visitas-hoje"
      aria-label={nome}
      aria-busy={carregando ? 'true' : undefined}
      onClick={tocar}
      className="flex min-h-11 w-full items-center gap-3.5 rounded-[20px] border border-estrelinha-line bg-estrelinha-surface p-4 text-left shadow-[0_14px_28px_-10px_rgba(52,73,94,.16)]"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft">{VISITS_TODAY_TITLE}</span>
        {m ? (
          <span data-testid="numero-visitas-hoje" className="font-display text-[30px] font-bold leading-tight tracking-[-0.02em] text-estrelinha-primary">
            {formatCount(m.periodos.hoje.visitas)}
          </span>
        ) : falhou ? (
          <span className="text-sm text-estrelinha-ink">{FALHA_DE_LEITURA}</span>
        ) : (
          <Traco className="my-1.5 h-7 w-16" />
        )}
        <span className="text-[13px] text-estrelinha-ink-soft">{falhou ? TENTAR_DE_NOVO : VISITS_TODAY_HINT}</span>
      </span>
      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-estrelinha-ink-soft" strokeWidth={1.5} />
    </button>
  )
}

export default CartaoVisitasHoje
