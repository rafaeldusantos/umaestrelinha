import { useState } from 'react'
import { Truck, Loader2 } from 'lucide-react'
import { formatPrice } from '@nanapin/core/formatters'
import { supabase } from '@nanapin/supabase/client'
import type { Product, ShippingQuote } from '@nanapin/supabase/types'
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
    <div className="flex flex-col gap-3 rounded-md bg-nanita-sugar p-5">
      <div className="flex items-center gap-2">
        <Truck className="h-[18px] w-[18px] shrink-0 text-nanita-jam" strokeWidth={1.8} aria-hidden />
        <h2 className="text-[14px] font-bold leading-[18px] text-nanita-ink">
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
          className="h-11 grow rounded-md border border-nanita-rule bg-white px-3.5 text-[13px] text-nanita-ink placeholder:text-nanita-plum focus:border-nanita-jam focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 shrink-0 items-center justify-center rounded-md border-2 border-nanita-jam px-5 text-[13px] font-semibold text-nanita-jam transition-colors hover:bg-nanita-jam/[0.06] disabled:opacity-60"
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
              className="flex items-center justify-between gap-3 rounded-sm border border-nanita-border bg-white px-3.5 py-2.5"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-semibold leading-4 text-nanita-ink">
                  {q.name} — {q.company}
                </span>
                <span className="text-[12px] leading-4 text-nanita-plum">
                  {q.delivery_range ? `${q.delivery_range.min}-${q.delivery_range.max}` : q.delivery_time} dias úteis
                </span>
              </span>
              <span className="shrink-0 font-display text-[16px] font-semibold leading-5 text-nanita-jam">
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
