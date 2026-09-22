import { useState, useEffect } from 'react'
import { User, Package, ChevronDown, ChevronUp, Clock, CheckCircle2, Truck, XCircle, LogOut, QrCode } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@estrelinha/ui/card'
import { Badge } from '@estrelinha/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@estrelinha/ui/collapsible'
import { Link } from 'react-router-dom'
import { useOrdersByCustomerId, type Order } from '@/entities/order/api/useOrders'
import { orderPaymentPath, podePagarComPix } from '@/entities/order'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'
import { useAuthContext } from '@estrelinha/auth'
import { useAuthUiStore } from '@/features/auth'

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: 'Pendente', icon: Clock, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  confirmed: { label: 'Confirmado', icon: CheckCircle2, className: 'bg-blue-100 text-blue-800 border-blue-200' },
  shipped: { label: 'Enviado', icon: Truck, className: 'bg-purple-100 text-purple-800 border-purple-200' },
  delivered: { label: 'Entregue', icon: CheckCircle2, className: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: 'Cancelado', icon: XCircle, className: 'bg-red-100 text-red-800 border-red-200' },
}

const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon
  return (
    <Badge variant="outline" className={`${config.className} gap-1 font-medium`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

const OrderCard = ({ order }: { order: Order }) => {
  const [open, setOpen] = useState(false)
  const date = new Date(order.created_at).toLocaleDateString('pt-BR')

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="bg-white border border-estrelinha-line rounded-2xl overflow-hidden hover:border-estrelinha-primary/30 transition-colors">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-estrelinha-ground-deep/50 transition-colors p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base font-bold text-estrelinha-ink">
                    {formatOrderNumber(order.order_number)}
                  </CardTitle>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-estrelinha-ink-soft">{date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-heading font-bold text-estrelinha-primary text-lg">
                  {formatPrice(order.total)}
                </span>
                {open ? <ChevronUp className="w-4 h-4 text-estrelinha-ink-soft" /> : <ChevronDown className="w-4 h-4 text-estrelinha-ink-soft" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        {/*
          `PIX-P3-04` (feature `58`): **a conta LINKA, não monta o pagamento.**

          Aqui existia um `<Dialog>` que montava a superfície do PIX dentro da lista. Duas
          superfícies montando o mesmo pagamento são dois donos de "onde se paga um pedido
          pendente" — e esta já nascia errada: o diálogo montava sem `amount`, então o valor em
          destaque (`CNF-01`) simplesmente não aparecia, e o QR vivia dentro de um `DialogContent`,
          que é a forma que `dialogGridTrack.test.ts` existe para vigiar.

          O link leva ao endereço do pedido, que é a mesma casa a que `/pedido/:id` leva — e que
          sobrevive a fechar a aba.
        */}
        {podePagarComPix(order) && (
          <div className="px-4 pb-3">
            <Button
              asChild
              size="sm"
              className="rounded-sm bg-estrelinha-primary text-white border-0 hover:bg-estrelinha-primary hover:opacity-95 transition-all gap-1.5"
            >
              <Link to={orderPaymentPath(order.id)}>
                <QrCode className="w-4 h-4" /> Pagar com PIX
              </Link>
            </Button>
          </div>
        )}
        <CollapsibleContent>
          <CardContent className="p-4 pt-0 border-t border-estrelinha-line">
            <div className="space-y-3 mt-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.product_image && (
                    <img src={item.product_image} alt={item.product_name} className="w-12 h-12 rounded-lg object-cover border border-estrelinha-line" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-estrelinha-ink truncate">{item.product_name}</p>
                    <p className="text-xs text-estrelinha-ink-soft">
                      {[item.size, item.finish].filter(Boolean).join(' · ')}
                      {' · '}Qtd: {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-estrelinha-ink">
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-estrelinha-line text-sm text-estrelinha-ink-soft space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.shipping_cost > 0 && <div className="flex justify-between"><span>Frete</span><span>{formatPrice(order.shipping_cost)}</span></div>}
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Desconto</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between font-bold text-estrelinha-ink"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

const AccountPage = () => {
  const { user, customer, loading, signOut } = useAuthContext()
  const openAuth = useAuthUiStore((s) => s.open)
  const { data: orders, isLoading } = useOrdersByCustomerId(customer?.id)

  useEffect(() => {
    if (!loading && !user) {
      openAuth({ returnTo: '/conta' })
    }
  }, [loading, user, openAuth])

  if (loading) {
    return <div className="container py-20 text-center text-estrelinha-ink-soft">Carregando...</div>
  }

  if (!user) return null

  const initials = (customer?.name || user.email || '?').slice(0, 2).toUpperCase()

  return (
    <div className="container py-12 max-w-2xl">
      <div className="bg-white rounded-2xl border border-estrelinha-line p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-estrelinha-primary flex items-center justify-center text-white font-bold text-lg">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-xl font-bold text-estrelinha-ink">{customer?.name || 'Minha Conta'}</h1>
            <p className="text-sm text-estrelinha-ink-soft">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="min-h-11 rounded-xl border-2 border-estrelinha-primary text-estrelinha-primary hover:bg-estrelinha-ground-deep gap-1.5">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </div>

      <h2 className="font-heading text-lg font-bold text-estrelinha-ink mb-4">Meus Pedidos</h2>

      {isLoading && (
        <div className="text-center py-8 text-estrelinha-ink-soft">Carregando pedidos...</div>
      )}

      {!isLoading && (!orders || orders.length === 0) && (
        <div className="bg-white rounded-2xl border border-estrelinha-line p-8 text-center">
          <Package className="w-12 h-12 text-estrelinha-ink-soft mx-auto mb-3" />
          <p className="text-estrelinha-ink-soft">Você ainda não fez nenhum pedido.</p>
          <Button asChild variant="outline" className="mt-4 min-h-11 rounded-xl border-2 border-estrelinha-primary text-estrelinha-primary hover:bg-estrelinha-ground-deep">
            <Link to="/"><Package className="w-4 h-4 mr-2" /> Continuar Comprando</Link>
          </Button>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

export default AccountPage
