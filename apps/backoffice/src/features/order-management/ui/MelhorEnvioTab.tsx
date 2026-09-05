import { useState } from 'react'
import { Button } from '@estrelinha/ui/button'
import { Card } from '@estrelinha/ui/card'
import { supabase } from '@estrelinha/supabase/client'
import { toast } from 'sonner'
import { Truck, Printer, Package, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { toQuoteProducts } from '@estrelinha/core/shipping'
import type { DbOrder, DbOrderItem } from '@estrelinha/supabase/types'

interface ShippingQuote {
  id: number
  name: string
  company: string
  company_picture: string
  price: string
  discount: string
  delivery_time: number
  delivery_range: { min: number; max: number }
  currency: string
}

interface Props {
  order: DbOrder
  items: DbOrderItem[]
  onUpdate: () => void
}

const MelhorEnvioTab = ({ order, items, onUpdate }: Props) => {
  const [quotes, setQuotes] = useState<ShippingQuote[]>([])
  const [quoting, setQuoting] = useState(false)
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [trackingInfo, setTrackingInfo] = useState<any>(null)
  const [checkingTracking, setCheckingTracking] = useState(false)

  const hasLabel = !!order.melhor_envio_id

  const handleQuote = async () => {
    if (!order.address_zip) {
      toast.error('Pedido sem CEP de entrega')
      return
    }
    setQuoting(true)
    try {
      // Fetch product dimensions from DB
      const productIds = items.map(i => i.product_id)
      const { data: productsData } = await supabase
        .from('products')
        .select('id, weight_kg, width_cm, height_cm, length_cm')
        .in('id', productIds)

      const dimMap = new Map((productsData || []).map((p: any) => [p.id, p]))

      // Dono único da regra: `@estrelinha/core/shipping`. Este `map` é só adaptação de formato.
      //
      // Antes de 2026-09-05 esta tela montava o payload à mão e mandava
      // `insurance_value: unit_price * quantity`, enquanto a loja mandava por unidade. A API do
      // Melhor Envio **já multiplica** por `quantity` (medido: qty 1 → PAC R$ 23,28 · qty 4 →
      // R$ 34,47), então este lado segurava a carga pelo QUADRADO da quantidade — e a cotação que a
      // Adri via aqui saía acima da que a cliente pagou. Nada quebrava: as duas cópias eram
      // coerentes sozinhas.
      const products = toQuoteProducts(
        items.map(item => ({
          id: item.product_id,
          unitPrice: item.unit_price,
          quantity: item.quantity,
          dimensions: dimMap.get(item.product_id),
        })),
      )

      const { data, error } = await supabase.functions.invoke('melhor-envio?action=quote', {
        body: {
          postal_code_to: order.address_zip.replace(/\D/g, ''),
          products,
        },
      })

      if (error) throw error
      setQuotes(data || [])
      if (!data?.length) toast.info('Nenhum serviço disponível para este CEP')
    } catch (err: any) {
      toast.error('Erro na cotação: ' + (err.message || 'Tente novamente'))
    } finally {
      setQuoting(false)
    }
  }

  const handleCreate = async () => {
    if (!selectedService) {
      toast.error('Selecione um serviço de envio')
      return
    }
    setCreating(true)
    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio?action=create', {
        body: { order_id: order.id, service_id: selectedService },
      })
      if (error) throw error
      toast.success('Etiqueta gerada com sucesso!')
      onUpdate()
    } catch (err: any) {
      toast.error('Erro ao gerar etiqueta: ' + (err.message || 'Tente novamente'))
    } finally {
      setCreating(false)
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio?action=print', {
        body: { shipment_id: order.melhor_envio_id, order_id: order.id },
      })
      if (error) throw error
      if (data?.label_url) {
        window.open(data.label_url, '_blank')
        onUpdate()
      } else {
        toast.info('Etiqueta ainda sendo processada. Tente novamente em alguns segundos.')
      }
    } catch (err: any) {
      toast.error('Erro ao imprimir: ' + (err.message || 'Tente novamente'))
    } finally {
      setPrinting(false)
    }
  }

  const handleCheckTracking = async () => {
    setCheckingTracking(true)
    try {
      const { data, error } = await supabase.functions.invoke('melhor-envio?action=tracking', {
        body: { shipment_id: order.melhor_envio_id },
      })
      if (error) throw error
      setTrackingInfo(data)
    } catch (err: any) {
      toast.error('Erro ao consultar rastreio: ' + (err.message || 'Tente novamente'))
    } finally {
      setCheckingTracking(false)
    }
  }

  // Label already generated
  if (hasLabel) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-800 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            Etiqueta Gerada
          </div>
          {order.melhor_envio_protocol && (
            <p className="text-sm text-green-700">
              <strong>Protocolo:</strong> {order.melhor_envio_protocol}
            </p>
          )}
          {order.tracking_code && (
            <p className="text-sm text-green-700">
              <strong>Rastreio:</strong>{' '}
              <span className="font-mono">{order.tracking_code}</span>
            </p>
          )}
          {order.shipping_carrier && (
            <p className="text-sm text-green-700">
              <strong>Transportadora:</strong> {order.shipping_carrier}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handlePrint}
            disabled={printing}
            className="gradient-cta text-white"
          >
            {printing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Printer className="w-4 h-4 mr-1" />}
            Imprimir Etiqueta
          </Button>

          {order.melhor_envio_label_url && (
            <Button variant="outline" asChild>
              <a href={order.melhor_envio_label_url} target="_blank" rel="noopener noreferrer">
                <Printer className="w-4 h-4 mr-1" /> Abrir PDF
              </a>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleCheckTracking}
            disabled={checkingTracking}
          >
            {checkingTracking ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Consultar Status
          </Button>
        </div>

        {trackingInfo && (
          <Card className="p-4 bg-muted/30">
            <h4 className="font-semibold text-sm mb-2">Status do Envio</h4>
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-48">
              {JSON.stringify(trackingInfo, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    )
  }

  // No label yet — quote flow
  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Truck className="w-4 h-4" />
          Gere uma etiqueta de envio via Melhor Envio
        </div>
        <p className="text-xs text-muted-foreground">
          CEP destino: <strong>{order.address_zip || 'Não informado'}</strong>
        </p>
      </div>

      {/* Step 1: Quote */}
      {quotes.length === 0 && (
        <Button
          onClick={handleQuote}
          disabled={quoting || !order.address_zip}
          className="gradient-cta text-white"
        >
          {quoting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Package className="w-4 h-4 mr-1" />}
          {quoting ? 'Cotando...' : 'Cotar Frete'}
        </Button>
      )}

      {/* Quote results */}
      {quotes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Selecione o serviço de envio:</h4>
          {quotes.map(q => (
            <Card
              key={q.id}
              className={`p-3 cursor-pointer transition-all border-2 ${
                selectedService === q.id
                  ? 'border-estrelinha-admin-violet bg-estrelinha-admin-violet/5'
                  : 'border-transparent hover:border-estrelinha-admin-border'
              }`}
              onClick={() => setSelectedService(q.id)}
            >
              <div className="flex items-center gap-3">
                {q.company_picture && (
                  <img src={q.company_picture} alt={q.company} className="w-8 h-8 rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{q.company} — {q.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.delivery_range
                      ? `${q.delivery_range.min}-${q.delivery_range.max} dias úteis`
                      : `${q.delivery_time} dias úteis`}
                  </p>
                </div>
                <span className="text-sm font-bold text-estrelinha-admin-violet">
                  {formatPrice(Number(q.price))}
                </span>
              </div>
            </Card>
          ))}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleCreate}
              disabled={creating || !selectedService}
              className="gradient-cta text-white"
            >
              {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Truck className="w-4 h-4 mr-1" />}
              {creating ? 'Gerando...' : 'Gerar Etiqueta'}
            </Button>
            <Button variant="outline" onClick={() => { setQuotes([]); setSelectedService(null) }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MelhorEnvioTab
