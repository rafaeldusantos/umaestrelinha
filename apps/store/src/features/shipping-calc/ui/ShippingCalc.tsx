import { useMemo, useState } from 'react'
import { Truck, Loader2 } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatEstimate, quoteToEstimate } from '@estrelinha/core/shipping'
import { useShippingSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { supabase } from '@estrelinha/supabase/client'
import type { Product, ShippingQuote } from '@estrelinha/supabase/types'
import { toQuotePayload } from '@/entities/cart'

/**
 * Cálculo de frete da página do produto — boards de Produto (card de pó de açúcar à esquerda do
 * acordeão no desktop, bloco de largura cheia no mobile).
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
    const cleanCep = cep.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      setError('CEP inválido')
      return
    }
    setError('')
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
          onChange={e => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="00000-000"
          inputMode="numeric"
          aria-label="CEP"
          aria-invalid={Boolean(error)}
          /* Papelão, não Dobra — borda de campo precisa dos 3:1 da WCAG 1.4.11. */
          className="h-11 grow rounded-md border border-estrelinha-field bg-white px-3.5 text-[13px] text-estrelinha-ink placeholder:text-estrelinha-ink-soft focus:border-estrelinha-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 shrink-0 items-center justify-center rounded-md border-2 border-estrelinha-primary px-5 text-[13px] font-semibold text-estrelinha-primary transition-colors hover:bg-estrelinha-primary/[0.06] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Calculando" /> : 'Calcular'}
        </button>
      </form>

      {error && <p className="text-[12px] text-destructive">{error}</p>}

      {quotes.length > 0 && (
        <ul className="flex flex-col gap-1.5">
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
                    const { min, max } = quoteToEstimate(q, handling_days, today)
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
    </div>
  )
}

export default ShippingCalc
