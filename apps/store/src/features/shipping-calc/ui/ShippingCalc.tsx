import { useMemo, useState } from 'react'
import { Truck, Loader2 } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatEstimate, isRsCep, quoteToEstimate } from '@estrelinha/core/shipping'
import { useShippingSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { maskCep, stripCep } from '@estrelinha/core/validators'
import { supabase } from '@estrelinha/supabase/client'
import type { Product, ShippingQuote } from '@estrelinha/supabase/types'
import { toQuotePayload } from '@/entities/cart'
import { usePickupOption, type PickupOption } from '@/entities/pickup'

/**
 * Cálculo de frete da página do produto, na coluna de informação (`ProductInfo`) — no lugar em
 * que o board original desenhava a faixa de selos "Compra segura / Troca em 7 dias / Pix com
 * desconto" (`ProductTrustBadges`, apagado). A troca é decisão do usuário: o que a cliente decide
 * antes de comprar é quanto custa chegar até ela, não um selo genérico de confiança.
 *
 * O "Calcular" é contorno, não geleia chapada: numa tela onde o CTA de compra é a única ação
 * primária (DESIGN.md §8), um segundo botão sólido na mesma cor disputaria o clique.
 */
const ShippingCalc = ({ product }: { product: Product }) => {
  const [cep, setCep] = useState('')
  const [quotes, setQuotes] = useState<ShippingQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  /**
   * Feature 63 — o CEP que foi de fato CONSULTADO (o mesmo enviado à cotação), e não o que está
   * sendo digitado: a retirada responde à mesma pergunta que a lista dos Correios ao lado dela.
   */
  const [consulted, setConsulted] = useState('')

  /**
   * SHP-09 também vale aqui. Antes esta tela exibia o prazo CRU da transportadora
   * (`5-6 dias úteis`) enquanto o checkout somava `handling_days` e exibia uma data — então a
   * página do produto prometia dois dias a menos que o caixa, para o mesmo CEP e o mesmo item.
   * Ninguém compara as duas telas lado a lado, que é justamente por que a divergência sobreviveu.
   *
   * Mesma função, mesma configuração, mesmo formato de saída que o `DeliveryBlock`.
   */
  const { handling_days } = useShippingSettings()
  // Fixo por montagem: a data exibida não pode pular enquanto a cliente olha a tela.
  const today = useMemo(() => new Date(), [])

  const handleCalc = async () => {
    const cleanCep = stripCep(cep)
    if (cleanCep.length !== 8) {
      setError('CEP inválido')
      setConsulted('')
      return
    }
    setError('')
    setConsulted(cleanCep)
    setLoading(true)
    setQuotes([])

    try {
      const { data, error: fnError } = await supabase.functions.invoke('melhor-envio?action=quote', {
        body: {
          postal_code_to: cleanCep,
          products: toQuotePayload([{
            product, size: '', finish: '', quantity: 1,
            variantId: null, variantLabel: '', optionValues: {}, unitPrice: product.price,
          }]),
        },
      })

      if (fnError) throw fnError

      const available = (data || []).filter((q: any) => q.price && parseFloat(q.price) > 0)
      if (available.length === 0) {
        setError('Nenhuma opção de frete disponível para este CEP')
      } else {
        setQuotes(available.slice(0, 3))
      }
    } catch {
      setError('Erro ao calcular frete. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md bg-estrelinha-ground-deep p-5">
      <div className="flex items-center gap-2">
        <Truck className="h-[18px] w-[18px] shrink-0 text-estrelinha-primary" strokeWidth={1.8} aria-hidden />
        <h2 className="text-[14px] font-bold leading-[18px] text-estrelinha-ink">
          Calcular frete e prazo
        </h2>
      </div>

      <form
        className="flex gap-2"
        onSubmit={e => {
          e.preventDefault()
          void handleCalc()
        }}
      >
        <input
          value={cep}
          onChange={e => setCep(maskCep(e.target.value))}
          placeholder="00000-000"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={9}
          aria-label="CEP"
          aria-invalid={Boolean(error)}
          /* `min-w-0` é o que permite o campo encolher abaixo de 360px: sem ele, o mínimo
             automático de um item flex é o seu min-content (o mesmo hazard do grid, documentado
             no CLAUDE.md), e o botão "Calcular" — que não encolhe — estourava para fora do box.
             Papelão, não Dobra — borda de campo precisa dos 3:1 da WCAG 1.4.11. */
          className="h-11 min-w-0 grow rounded-md border border-estrelinha-field bg-white px-3.5 text-[13px] text-estrelinha-ink placeholder:text-estrelinha-ink-soft focus:border-estrelinha-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 shrink-0 items-center justify-center rounded-md border-2 border-estrelinha-primary px-5 text-[13px] font-semibold text-estrelinha-primary transition-colors hover:bg-estrelinha-primary/[0.06] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Calculando" /> : 'Calcular'}
        </button>
      </form>

      {/* A retirada só existe para CEP do RS; fora dele a tela é a de sempre, sem os títulos de
          grupo (RET-02). O componente que lê a configuração da retirada só monta para CEP do RS. */}
      {!loading && isRsCep(consulted) ? (
        <CalcResultsWithPickup
          cep={consulted}
          quotes={quotes}
          error={error}
          handlingDays={handling_days}
          today={today}
        />
      ) : (
        <CalcResults
          quotes={quotes}
          error={error}
          handlingDays={handling_days}
          today={today}
          pickup={null}
        />
      )}
    </div>
  )
}

interface CalcResultsProps {
  quotes: ShippingQuote[]
  error: string
  handlingDays: number
  today: Date
  /** Feature 63 — a retirada no escritório, ou `null` quando ela não aparece. */
  pickup: PickupOption | null
}

/**
 * O resultado do cálculo: a mensagem, as opções dos Correios e, para CEP do RS, o grupo
 * "Retirar em" (RET-01). Com a retirada, as duas listas ganham título de grupo; sem ela a tela é
 * exatamente a de antes da feature 63.
 *
 * A retirada aparece também quando a cotação falha ou volta vazia (RET-04): ela não depende do
 * Melhor Envio, e a mensagem de falha continua acima dela.
 */
const CalcResults = ({ quotes, error, handlingDays, today, pickup }: CalcResultsProps) => (
  <>
    {error && <p className="text-[12px] text-destructive">{error}</p>}

    {quotes.length > 0 && pickup && (
      <h3 className="text-[13px] font-semibold leading-4 text-estrelinha-ink">Envio a domicílio</h3>
    )}

    {quotes.length > 0 && (
      // RET-06: com a retirada na tela, a lista dos Correios é nomeada como a de "Retirar em".
      <ul className="flex flex-col gap-1.5" aria-label={pickup ? 'Envio a domicílio' : undefined}>
        {quotes.map(q => (
          <li
            key={q.id}
            className="flex items-center justify-between gap-3 rounded-sm border border-estrelinha-line bg-white px-3.5 py-2.5"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[13px] font-semibold leading-4 text-estrelinha-ink">
                {q.name} — {q.company}
              </span>
              <span className="text-[12px] leading-4 text-estrelinha-ink-soft">
                {(() => {
                  const { min, max } = quoteToEstimate(q, handlingDays, today)
                  return `Chega ${formatEstimate(min, max)}`
                })()}
              </span>
            </span>
            <span className="shrink-0 font-display text-[16px] font-semibold leading-5 text-estrelinha-primary">
              {formatPrice(parseFloat(q.price))}
            </span>
          </li>
        ))}
      </ul>
    )}

    {pickup && (
      <>
        <h3 className="text-[13px] font-semibold leading-4 text-estrelinha-ink">Retirar em</h3>
        <ul className="flex flex-col gap-1.5" aria-label="Retirar em">
          <li className="flex items-center justify-between gap-3 rounded-sm border border-estrelinha-line bg-white px-3.5 py-2.5">
            <span className="flex min-w-0 flex-col gap-0.5">
              {/* Sem `truncate`: a linha do endereço é longa e precisa caber inteira em 390px. */}
              <span className="break-words text-[13px] font-semibold leading-4 text-estrelinha-ink">
                {pickup.location}
              </span>
              <span className="text-[12px] leading-4 text-estrelinha-ink-soft">
                {`Pronta para retirada ${pickup.readyLabel}`}
              </span>
            </span>
            <span className="shrink-0 font-display text-[16px] font-semibold leading-5 text-estrelinha-primary">
              Grátis
            </span>
          </li>
        </ul>
      </>
    )}
  </>
)

/** Só monta para CEP do RS: é aqui, e só aqui, que a configuração da retirada é lida. */
const CalcResultsWithPickup = ({
  cep,
  ...props
}: Omit<CalcResultsProps, 'pickup'> & { cep: string }) => {
  const pickup = usePickupOption(cep)
  return <CalcResults {...props} pickup={pickup} />
}

export default ShippingCalc
