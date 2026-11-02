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
import { FALHA_DE_LEITURA, NAO_ATUALIZOU, TENTAR_DE_NOVO, Traco, type Leitura } from '@/shared/ui/leitura'

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
 * - Releitura que falhou com número na tela (`naoAtualizou`, `MAI-18`): o número, o funil e o gráfico
 *   ficam, como na Loja ao vivo, e o cartão acrescenta "Não consegui atualizar agora." e "Tentar de
 *   novo". Enquanto o aviso está na tela, o toque no cartão RELÊ (nunca um botão dentro do botão), e o
 *   nome acessível diz o número e que não atualizou. Quando a leitura volta, o aviso some.
 * - Com dado ou carregando, o toque grava o período da faixa na entrada da Início e abre `/ao-vivo`.
 * - Fonte grande: a linha embrulha. A coluna de texto tem piso em rem e o gráfico com a seta descem
 *   juntos para baixo dela, em vez de espremê-la até largura zero. A cauda e o gráfico CEDEM
 *   (`min-w-0 max-w-full`, nunca `shrink-0`): a 200 % em 320 o gráfico de 6rem não cabe, e encolhe.
 */
const CartaoAgoraNaLoja = ({
  leitura,
  periodo,
  naoAtualizou = false,
}: {
  leitura: Leitura<StoreLive>
  periodo: MovementPeriodKey
  /** A releitura falhou com dado na tela (`MAI-18`). */
  naoAtualizou?: boolean
}) => {
  const navigate = useNavigate()
  const l = leitura.dado
  const velho = !!l && naoAtualizou
  const falhou = !l && leitura.falhou
  const carregando = !l && !leitura.falhou
  const naoMedida = l ? liveNotMeasuredLine(l) : null
  const total = l?.agora.total ?? 0
  const linha = l && !naoMedida ? liveCardLine(l.agora) : null

  const nome = velho
    ? `${naoMedida ? `${LIVE_CARD_TITLE}. ${naoMedida}` : `${LIVE_CARD_TITLE}, ${formatCount(total)} ${peopleWord(total)}.`} ${NAO_ATUALIZOU} ${TENTAR_DE_NOVO}`
    : l
      ? naoMedida
        ? liveCardNotMeasuredLabel(l)
        : liveCardLabel(total)
      : falhou
        ? liveCardFailedLabel
        : liveCardLoadingLabel

  const tocar = () => {
    if (falhou || velho) {
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
      className="flex min-h-11 w-full flex-wrap items-center gap-3.5 rounded-[20px] border border-estrelinha-line bg-estrelinha-surface p-4 text-left shadow-[0_14px_28px_-10px_rgba(52,73,94,.16)]"
    >
      <span data-testid="texto-agora-na-loja" className="flex min-w-[min(100%,8rem)] flex-1 flex-col gap-1">
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
            <span className="flex flex-wrap items-baseline gap-x-2">
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
          <span data-testid="funil-agora-na-loja" className="text-[13px] text-estrelinha-ink-soft [overflow-wrap:anywhere]">
            {linha}
          </span>
        ) : null}
        {velho && (
          <span data-testid="aviso-agora-na-loja" className="flex flex-col text-[13px]">
            <span className="font-medium text-estrelinha-ink">{NAO_ATUALIZOU}</span>
            <span className="text-estrelinha-ink-soft">{TENTAR_DE_NOVO}</span>
          </span>
        )}
      </span>
      <span data-testid="cauda-agora-na-loja" className="ml-auto flex min-w-0 max-w-full items-center gap-3.5 self-stretch">
        {l ? (
          <span
            data-testid="mini-grafico"
            aria-hidden="true"
            className="flex h-10 w-24 min-w-0 max-w-full items-end gap-0.5 self-end"
          >
            {liveMiniBars(l.minutos).map((b, i) => (
              <span
                key={i}
                style={{ height: `${b.altura}px` }}
                className={cn('min-w-0 flex-1 rounded-[2px]', b.atual ? 'bg-estrelinha-accent' : 'bg-estrelinha-line')}
              />
            ))}
          </span>
        ) : carregando ? (
          <Traco className="h-10 w-24 min-w-0 max-w-full self-end" />
        ) : null}
        <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-estrelinha-ink-soft" strokeWidth={1.5} />
      </span>
    </button>
  )
}

export default CartaoAgoraNaLoja
