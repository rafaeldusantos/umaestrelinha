import { useState, useEffect } from 'react'
import { User, Package, ChevronDown, ChevronUp, Clock, CheckCircle2, Truck, XCircle, LogOut, QrCode } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@estrelinha/ui/card'
import { Badge } from '@estrelinha/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@estrelinha/ui/collapsible'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useOrdersByCustomerId, type Order } from '@/entities/order/api/useOrders'
import PixPayment from '@/features/checkout/ui/PixPayment'
import { formatPrice } from '@estrelinha/core/formatters'
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
  const [pixOpen, setPixOpen] = useState(false)
  const qc = useQueryClient()
  const date = new Date(order.created_at).toLocaleDateString('pt-BR')

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="bg-white border border-nanita-border rounded-2xl overflow-hidden hover:border-nanita-jam/30 transition-colors">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-nanita-sugar/50 transition-colors p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base font-bold text-nanita-ink">
                    #{order.order_number}
                  </CardTitle>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-sm text-nanita-plum">{date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-heading font-bold text-nanita-jam text-lg">
                  {formatPrice(order.total)}
                </span>
                {open ? <ChevronUp className="w-4 h-4 text-nanita-plum" /> : <ChevronDown className="w-4 h-4 text-nanita-plum" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        {order.payment_status === 'pending' && (
          <div className="px-4 pb-3">
            <Button
              size="sm"
              onClick={() => setPixOpen(true)}
              className="rounded-button bg-nanita-jam text-white border-0 hover:bg-nanita-jam hover:opacity-95 transition-all gap-1.5"
            >
              <QrCode className="w-4 h-4" /> Pagar com PIX
            </Button>
            <Dialog open={pixOpen} onOpenChange={setPixOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Pagar pedido #{order.order_number} com PIX</DialogTitle>
                </DialogHeader>
                <PixPayment
                  orderId={order.id}
                  onApproved={() => {
                    setPixOpen(false)
                    qc.invalidateQueries({ queryKey: ['orders'] })
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
        <CollapsibleContent>
          <CardContent className="p-4 pt-0 border-t border-nanita-border">
            <div className="space-y-3 mt-3">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.product_image && (
                    <img src={item.product_image} alt={item.product_name} className="w-12 h-12 rounded-lg object-cover border border-nanita-border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-nanita-ink truncate">{item.product_name}</p>
                    <p className="text-xs text-nanita-plum">
                      {[item.size, item.finish].filter(Boolean).join(' · ')}
                      {' · '}Qtd: {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-nanita-ink">
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-nanita-border text-sm text-nanita-plum space-y-1">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.shipping_cost > 0 && <div className="flex justify-between"><span>Frete</span><span>{formatPrice(order.shipping_cost)}</span></div>}
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Desconto</span><span>-{formatPrice(order.discount)}</span></div>}
              <div className="flex justify-between font-bold text-nanita-ink"><span>Total</span><span>{formatPrice(order.total)}</span></div>
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
    return <div className="container py-20 text-center text-nanita-plum">Carregando...</div>
  }

  if (!user) return null

  const initials = (customer?.name || user.email || '?').slice(0, 2).toUpperCase()

  return (
    <div className="container py-12 max-w-2xl">
      <div className="bg-white rounded-2xl border border-nanita-border p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-nanita-jam flex items-center justify-center text-white font-bold text-lg">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-xl font-bold text-nanita-ink">{customer?.name || 'Minha Conta'}</h1>
            <p className="text-sm text-nanita-plum">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="rounded-xl border-2 border-nanita-jam text-nanita-jam hover:bg-nanita-sugar gap-1.5">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </div>

      <h2 className="font-heading text-lg font-bold text-nanita-ink mb-4">Meus Pedidos</h2>

      {isLoading && (
        <div className="text-center py-8 text-nanita-plum">Carregando pedidos...</div>
      )}

      {!isLoading && (!orders || orders.length === 0) && (
        <div className="bg-white rounded-2xl border border-nanita-border p-8 text-center">
          <Package className="w-12 h-12 text-nanita-plum mx-auto mb-3" />
          <p className="text-nanita-plum">Você ainda não fez nenhum pedido.</p>
          <Button asChild variant="outline" className="mt-4 rounded-xl border-2 border-nanita-jam text-nanita-jam hover:bg-nanita-sugar">
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
