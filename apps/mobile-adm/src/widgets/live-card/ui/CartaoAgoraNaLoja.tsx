import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  LIVE_CARD_TITLE,
  NOBODY_IN_STORE,
  liveCardFailedLabel,
  liveCardLabel,
  liveCardLine,
  liveCardLoadingLabel,
  liveCardNotMeasuredLabel,
  liveMiniBars,
  liveNotMeasuredLine,
  peopleWord,
  type StoreLive,
} from '@estrelinha/core/live'
import { formatCount, type MovementPeriodKey } from '@estrelinha/core/stats'
import { cn } from '@estrelinha/ui/lib/utils'
import { AO_VIVO_PATH, estadoDaEntrada, gravarPeriodoNaEntrada } from '@/entities/stats'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO, Traco, type Leitura } from '@/shared/ui/leitura'

/**
 * O cartão "Agora na loja" da Início: quantas pessoas estão na loja, a linha do funil e os últimos 15
 * minutos, a partir de `store_live`. É a porta da Loja ao vivo.
 *
 * - Nenhum número sai do aparelho: o total, o funil e as barras chegam prontos do servidor; as frases
 *   e as alturas são de `core/live`.
 * - O ponto do eyebrow é dourado e PARADO (animação infinita é proibida). O número é `primary`: ouro
 *   como texto só sobre `ink`.
 * - Nunca some: carregando (traços), falha (a frase e "Tentar de novo" — o toque relê), ninguém na
 *   loja ("Ninguém na loja agora", com o gráfico), e a loja ainda não medida (a frase de Acessos).
 * - Com dado ou carregando, o toque grava o período da faixa na entrada da Início e abre `/ao-vivo`.
 */
const CartaoAgoraNaLoja = ({ leitura, periodo }: { leitura: Leitura<StoreLive>; periodo: MovementPeriodKey }) => {
  const navigate = useNavigate()
  const l = leitura.dado
  const falhou = !l && leitura.falhou
  const carregando = !l && !leitura.falhou
  const naoMedida = l ? liveNotMeasuredLine(l) : null
  const total = l?.agora.total ?? 0
  const linha = l && !naoMedida ? liveCardLine(l.agora) : null

  const nome = l
    ? naoMedida
      ? liveCardNotMeasuredLabel(l)
      : liveCardLabel(total)
    : falhou
      ? liveCardFailedLabel
      : liveCardLoadingLabel

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
      data-testid="cartao-agora-na-loja"
      aria-label={nome}
      aria-busy={carregando ? 'true' : undefined}
      onClick={tocar}
      className="flex min-h-11 w-full items-center gap-3.5 rounded-[20px] border border-estrelinha-line bg-estrelinha-surface p-4 text-left shadow-[0_14px_28px_-10px_rgba(52,73,94,.16)]"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft">
          <span data-testid="ponto-ao-vivo" aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-estrelinha-accent" />
          {LIVE_CARD_TITLE}
        </span>
        {l ? (
          naoMedida ? (
            <span className="text-sm text-estrelinha-ink">{naoMedida}</span>
          ) : total === 0 ? (
            <span className="text-[15px] font-semibold text-estrelinha-ink">{NOBODY_IN_STORE}</span>
          ) : (
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span
                data-testid="numero-agora-na-loja"
                className="font-display text-[30px] font-bold leading-tight tracking-[-0.02em] text-estrelinha-primary"
              >
                {formatCount(total)}
              </span>
              <span className="text-sm text-estrelinha-ink-soft">{peopleWord(total)}</span>
            </span>
          )
        ) : falhou ? (
          <span className="text-sm text-estrelinha-ink">{FALHA_DE_LEITURA}</span>
        ) : (
          <Traco className="my-1.5 h-7 w-16" />
        )}
        {falhou ? (
          <span className="text-[13px] text-estrelinha-ink-soft">{TENTAR_DE_NOVO}</span>
        ) : linha ? (
          <span className="text-[13px] text-estrelinha-ink-soft">{linha}</span>
        ) : null}
      </span>
      {l ? (
        <span data-testid="mini-grafico" aria-hidden="true" className="flex h-10 w-24 shrink-0 items-end gap-0.5 self-end">
          {liveMiniBars(l.minutos).map((b, i) => (
            <span
              key={i}
              style={{ height: `${b.altura}px` }}
              className={cn('flex-1 rounded-[2px]', b.atual ? 'bg-estrelinha-accent' : 'bg-estrelinha-line')}
            />
          ))}
        </span>
      ) : carregando ? (
        <Traco className="h-10 w-24 shrink-0 self-end" />
      ) : null}
      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-estrelinha-ink-soft" strokeWidth={1.5} />
    </button>
  )
}

export default CartaoAgoraNaLoja
