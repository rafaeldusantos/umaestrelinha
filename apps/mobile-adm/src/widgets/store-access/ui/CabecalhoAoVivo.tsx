import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { freshnessLine } from '@estrelinha/core/live'
import { useSegundosDesde } from '@/shared/lib/useSegundosDesde'
import { NAO_ATUALIZOU } from '@/shared/ui/leitura'

/** O título da tela e do documento (`LAV-62`). */
export const TITULO_AO_VIVO = 'Loja ao vivo'

/**
 * O "Voltar" (`LAV-06`, molde do `BotaoVoltar` do pedido): com `state.doApp` (o cartão da Início
 * trouxe até aqui) volta UMA entrada; sem ele (link colado, F5 sem estado), vai à Início por
 * substituição.
 */
const BotaoVoltar = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const doApp = (state as { doApp?: boolean } | null)?.doApp === true
  return (
    <button
      type="button"
      onClick={() => (doApp ? navigate(-1) : navigate('/', { replace: true }))}
      aria-label="Voltar"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-estrelinha-ink"
    >
      <ChevronLeft aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={1.5} />
    </button>
  )
}

/** "Atualizado agora / há {s} s / há {m} min", pela duração desde a chegada. Não é região viva. */
const Atualizado = ({ desde }: { desde: number }) => (
  <p data-testid="frescor-ao-vivo" className="text-xs text-estrelinha-ink-soft">
    {freshnessLine(useSegundosDesde(desde))}
  </p>
)

/**
 * O cabeçalho da Loja ao vivo (feature `83`, `LAV-07`): 60 px, `surface`, fio embaixo, preso no topo,
 * sangrando o recuo do `<main>` (`-mx-4 -mt-4`, como `CabecalhoDoPedido`). O `h1` existe em todo
 * estado (`LAV-62`: o foco da troca de rota vai a ele).
 *
 * A linha de frescor: com a releitura falhada e dado na tela, `NAO_ATUALIZOU` (`role="status"`); com
 * dado, a duração desde a chegada (`atualizadoEm`, um instante LOCAL); sem dado, nada.
 */
const CabecalhoAoVivo = ({ atualizadoEm, naoAtualizou }: { atualizadoEm: number | null; naoAtualizou: boolean }) => (
  <header
    data-testid="cabecalho-ao-vivo"
    className="sticky top-0 z-10 -mx-4 -mt-4 flex min-h-[60px] items-center gap-1.5 border-b border-estrelinha-line bg-estrelinha-surface py-2 pl-2 pr-4"
  >
    <BotaoVoltar />
    <div className="min-w-0 flex-1">
      <h1 className="font-display text-[17px] font-bold leading-tight">{TITULO_AO_VIVO}</h1>
      {naoAtualizou ? (
        <p data-testid="frescor-ao-vivo" role="status" className="text-xs text-estrelinha-ink-soft">
          {NAO_ATUALIZOU}
        </p>
      ) : atualizadoEm !== null ? (
        <Atualizado desde={atualizadoEm} />
      ) : null}
    </div>
  </header>
)

export default CabecalhoAoVivo
