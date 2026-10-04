// A escolha de parcelas do cartão — desenhada pela loja, não pelo Brick.
//
// O Brick do Mercado Pago monta com `maxInstallments: 1` e não desenha lista nenhuma (medido em
// navegador, 2026-10-04); a lista dele não deixava destacar o que importa para quem parcela: quais
// opções são **sem juros**. Aqui elas vêm primeiro, com selo, e as com juros ficam atrás de um
// toque, com o total que a cliente vai pagar escrito ao lado — nunca escondido.
//
// O que é "sem juros" vem da tabela do Mercado Pago (`cardInstallmentOptions`), não do painel da
// loja: é a tabela dele que a cobrança segue.
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import type { CardInstallmentOption } from '@estrelinha/core/payment/installments'
import { useCheckoutStore } from '../model/checkoutStore'
import type { CardInstallmentsState } from '../model/useCardInstallmentOptions'

export const INSTALLMENTS_TITLE = 'Em quantas vezes?'
export const INSTALLMENTS_IDLE = 'Digite o número do cartão para ver as parcelas.'
export const INSTALLMENTS_ERROR =
  'Não conseguimos carregar as parcelas deste cartão agora. Você pode pagar à vista ou tentar de novo em instantes.'
export const MORE_INSTALLMENTS = 'Mais parcelas, com juros'

const Row = ({
  option,
  checked,
  onSelect,
}: {
  option: CardInstallmentOption
  checked: boolean
  onSelect: () => void
}) => {
  const avista = option.count === 1
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border-2 px-4 py-3 transition-colors motion-reduce:transition-none ${
        checked
          ? 'border-estrelinha-primary bg-estrelinha-ground-deep'
          : 'border-estrelinha-line bg-white'
      }`}
    >
      <input
        type="radio"
        name="card-installments"
        value={option.count}
        checked={checked}
        onChange={onSelect}
        className="peer sr-only"
      />
      {/* O disco do rádio é desenho; quem recebe o toque é a linha inteira (o `<label>`). */}
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-estrelinha-primary peer-focus-visible:ring-offset-2 ${
          checked ? 'border-estrelinha-primary' : 'border-estrelinha-field'
        }`}
      >
        {checked && <span className="h-[10px] w-[10px] rounded-full bg-estrelinha-primary" />}
      </span>
      {/* Uma linha só no celular: com o total embaixo, as nove opções com juros ocupavam ~650px
          (72px cada, medido em 390). `flex-wrap` deixa o total descer só quando não couber. */}
      <span className="flex min-w-0 grow flex-wrap items-baseline justify-between gap-x-3 gap-y-[2px]">
        <span className="text-[15px] font-semibold text-estrelinha-ink">
          {avista ? `À vista · ${formatPrice(option.value)}` : `${option.count}x de ${formatPrice(option.value)}`}
        </span>
        {!option.interestFree && (
          <span className="text-[13px] text-estrelinha-ink-soft">
            Total {formatPrice(option.total)}
          </span>
        )}
      </span>
      {option.interestFree && !avista && (
        <span className="shrink-0 rounded-pill border border-estrelinha-primary px-[10px] py-[4px] text-xs font-bold tracking-[0.04em] text-estrelinha-primary">
          Sem juros
        </span>
      )}
    </label>
  )
}

const InstallmentPicker = ({ state }: { state: CardInstallmentsState }) => {
  const setCardInstallments = useCheckoutStore((s) => s.setCardInstallments)
  const [showMore, setShowMore] = useState(false)
  const { status, options, selected } = state

  const free = options.filter((o) => o.interestFree)
  const withInterest = options.filter((o) => !o.interestFree)
  // Escolher uma parcela com juros e depois recolher a lista a esconderia: a escolhida fica à vista.
  const expanded = showMore || (selected !== null && !selected.interestFree)

  const row = (o: CardInstallmentOption) => (
    <Row
      key={o.count}
      option={o}
      checked={selected?.count === o.count}
      onSelect={() => setCardInstallments(o.count)}
    />
  )

  return (
    <fieldset className="flex flex-col gap-3" aria-busy={status === 'loading'}>
      <legend className="mb-3 font-heading text-[17px] font-semibold text-estrelinha-ink">
        {INSTALLMENTS_TITLE}
      </legend>

      {status === 'idle' && <p className="text-[13px] text-estrelinha-ink-soft">{INSTALLMENTS_IDLE}</p>}

      {status === 'loading' && (
        <div className="flex flex-col gap-2" data-testid="parcelas-carregando">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 rounded-md bg-estrelinha-ground-deep motion-safe:animate-pulse"
            />
          ))}
        </div>
      )}

      {(status === 'ready' || status === 'error') && (
        <>
          <div className="flex flex-col gap-2">{free.map(row)}</div>

          {status === 'error' && (
            <p role="status" className="text-[13px] text-estrelinha-ink-soft">
              {INSTALLMENTS_ERROR}
            </p>
          )}

          {withInterest.length > 0 && (
            <>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setShowMore((v) => !v)}
                className="flex min-h-11 items-center justify-between gap-2 rounded-sm text-left text-sm font-semibold text-estrelinha-primary"
              >
                {MORE_INSTALLMENTS} (até {withInterest[withInterest.length - 1].count}x)
                <ChevronDown
                  aria-hidden
                  className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
                />
              </button>
              {expanded && (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] text-estrelinha-ink-soft">
                    Juros do Mercado Pago, já somados ao total de cada opção.
                  </p>
                  {withInterest.map(row)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </fieldset>
  )
}

export default InstallmentPicker
