import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Textarea } from '@estrelinha/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@estrelinha/ui/tabs'
import { formatPrice } from '@estrelinha/core/formatters'
import StatusBadge from '@/entities/order/ui/StatusBadge'
import PaymentStatusBadge from '@/entities/order/ui/PaymentStatusBadge'
import OrderTimeline from '@/entities/order/ui/OrderTimeline'
import OrderCancelDialog from './OrderCancelDialog'
import { ORDER_STATUSES, STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import { Copy, Printer, XCircle } from 'lucide-react'
import MelhorEnvioTab from './MelhorEnvioTab'
import { toast } from 'sonner'
import type { DbOrder, DbOrderItem, DbOrderStatusHistory, DbOrderNote } from '@estrelinha/supabase/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  order: DbOrder | null
  onStatusChange: (id: string, status: string, note?: string) => Promise<any>
  getItems: (orderId: string) => Promise<DbOrderItem[]>
  getStatusHistory: (orderId: string) => Promise<DbOrderStatusHistory[]>
  getNotes: (orderId: string) => Promise<DbOrderNote[]>
  onCancel: (id: string, reason: string) => Promise<any>
  onAddTracking: (id: string, code: string, carrier: string) => Promise<any>
  onAddNote: (orderId: string, note: string) => Promise<any>
}

const OrderDetailDialog = ({
  open, onOpenChange, order,
  onStatusChange, getItems, getStatusHistory, getNotes,
  onCancel, onAddTracking, onAddNote,
}: Props) => {
  const [items, setItems] = useState<DbOrderItem[]>([])
  const [history, setHistory] = useState<DbOrderStatusHistory[]>([])
  const [notes, setNotes] = useState<DbOrderNote[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [trackingCode, setTrackingCode] = useState('')
  const [carrier, setCarrier] = useState('')
  const [newNote, setNewNote] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)

  useEffect(() => {
    if (order && open) {
      setNewStatus(order.status)
      setStatusNote('')
      setTrackingCode(order.tracking_code ?? '')
      setCarrier(order.shipping_carrier ?? '')
      getItems(order.id).then(setItems)
      setHistoryLoading(true)
      getStatusHistory(order.id).then(h => { setHistory(h); setHistoryLoading(false) })
      getNotes(order.id).then(setNotes)
    }
  }, [order, open])

  if (!order) return null

  const handleSaveStatus = async () => {
    if (newStatus === order.status) return
    setSaving(true)
    const { error, emailSent } = await onStatusChange(order.id, newStatus, statusNote || undefined)
    setSaving(false)
    // O erro era DESCARTADO aqui: o dialog fechava e o admin achava que tinha salvo.
    if (error) {
      toast.error(`Não foi possível alterar o status: ${error.message ?? 'erro desconhecido'}`)
      return
    }
    // Só com `sent: true`. Sucesso silencioso é indistinguível de falha silenciosa, e avisar a
    // cliente é justamente o ponto deste fluxo.
    toast.success(emailSent ? 'Status atualizado e cliente avisado por e-mail' : 'Status atualizado')
    onOpenChange(false)
  }

  const handleSaveTracking = async () => {
    if (!trackingCode.trim()) return
    setSaving(true)
    const { error, emailSent } = await onAddTracking(order.id, trackingCode.trim(), carrier.trim())
    setSaving(false)
    if (error) {
      toast.error(`Não foi possível salvar o rastreio: ${error.message ?? 'erro desconhecido'}`)
      return
    }
    toast.success(emailSent ? 'Rastreio salvo e cliente avisado por e-mail' : 'Rastreio salvo')
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    await onAddNote(order.id, newNote.trim())
    setNewNote('')
    const updated = await getNotes(order.id)
    setNotes(updated)
    setSaving(false)
    toast.success('Nota adicionada')
  }

  const handleCancel = async (reason: string) => {
    await onCancel(order.id, reason)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-3">
              Pedido #{order.order_number}
              <StatusBadge status={order.status} />
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="summary" className="mt-2">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="tracking">Rastreio</TabsTrigger>
              <TabsTrigger value="envio">Envio</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
            </TabsList>

            {/* RESUMO */}
            <TabsContent value="summary" className="space-y-4">
              <div className="bg-muted/30 rounded-xl p-4 space-y-1 text-sm">
                <p><strong>Cliente:</strong> {order.customer_name}</p>
                <p><strong>E-mail:</strong> {order.customer_email}</p>
                {order.address_street && (
                  <p><strong>Endereço:</strong> {order.address_street}, {order.address_number}
                    {order.address_complement && ` - ${order.address_complement}`}
                    {' — '}{order.address_neighborhood}, {order.address_city}/{order.address_state}
                    {order.address_zip && ` · CEP: ${order.address_zip}`}
                  </p>
                )}
                <p><strong>Pagamento:</strong> {order.payment_method}</p>
                <p className="flex items-center gap-2">
                  <strong>Status do pagamento:</strong> <PaymentStatusBadge status={order.payment_status} />
                </p>
                <p><strong>Pagamento MP:</strong> {order.mp_payment_id ? <span className="font-mono">{order.mp_payment_id}</span> : '—'}</p>
                <p><strong>Detalhe MP:</strong> {order.mp_status_detail ?? '—'}</p>
                <p><strong>Pago em:</strong> {order.paid_at ? new Date(order.paid_at).toLocaleString('pt-BR') : '—'}</p>
                <p><strong>Data:</strong> {new Date(order.created_at).toLocaleString('pt-BR')}</p>
                {order.cancel_reason && (
                  <p className="text-destructive"><strong>Motivo do cancelamento:</strong> {order.cancel_reason}</p>
                )}
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Itens</h4>
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-background rounded-lg p-2 border border-border">
                      {item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">{item.size} · {item.finish} · Qtd: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold">{formatPrice(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-border pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto{order.coupon_code ? ` (cupom ${order.coupon_code})` : ''}</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                {order.coupon_code && order.discount === 0 && (
                  <div className="flex justify-between text-nana-violet">
                    <span>Cupom aplicado</span>
                    <span className="font-mono">{order.coupon_code}</span>
                  </div>
                )}
                <div className="flex justify-between"><span>Frete</span><span>{order.shipping_cost === 0 ? 'Grátis' : formatPrice(order.shipping_cost)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border"><span>Total</span><span>{formatPrice(order.total)}</span></div>
              </div>

              {/* Status change + actions */}
              <div className="flex items-end gap-3 border-t border-border pt-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium">Alterar status</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Observação (opcional)" value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                  {/* UX-01: avisa, mas NÃO bloqueia — postar sem código é caso legítimo. */}
                  {newStatus === 'shipped' && !order.tracking_code && (
                    <p className="text-xs text-amber-700">
                      Sem código de rastreio: o e-mail de envio só sai quando o código for salvo na aba Rastreio.
                    </p>
                  )}
                </div>
                <Button className="gradient-cta text-white" disabled={saving || newStatus === order.status} onClick={handleSaveStatus}>
                  {saving ? 'Salvando...' : 'Atualizar'}
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                {order.status !== 'cancelled' && (
                  <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                    <XCircle className="w-4 h-4 mr-1" /> Cancelar Pedido
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-1" /> Imprimir
                </Button>
              </div>
            </TabsContent>

            {/* RASTREIO */}
            <TabsContent value="tracking" className="space-y-4">
              {order.tracking_code && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1">
                  <p className="text-sm font-semibold text-blue-800">Rastreio Atual</p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-900">{order.tracking_code}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(order.tracking_code!); toast.success('Copiado!') }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  {order.shipping_carrier && <p className="text-xs text-blue-600">Transportadora: {order.shipping_carrier}</p>}
                </div>
              )}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">{order.tracking_code ? 'Atualizar Rastreio' : 'Adicionar Rastreio'}</h4>
                <Input placeholder="Código de rastreio" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} />
                <Input placeholder="Transportadora (ex: Correios, Jadlog)" value={carrier} onChange={e => setCarrier(e.target.value)} />
                <Button className="gradient-cta text-white" disabled={saving || !trackingCode.trim()} onClick={handleSaveTracking}>
                  Salvar Rastreio
                </Button>
              </div>
            </TabsContent>

            {/* ENVIO — Melhor Envio */}
            <TabsContent value="envio" className="py-2">
              <MelhorEnvioTab order={order} items={items} onUpdate={() => onOpenChange(false)} />
            </TabsContent>

            {/* TIMELINE */}
            <TabsContent value="timeline" className="py-2">
              <OrderTimeline history={history} loading={historyLoading} />
            </TabsContent>

            {/* NOTAS */}
            <TabsContent value="notes" className="space-y-4">
              <div className="space-y-2">
                <Textarea placeholder="Adicionar nota interna..." value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} />
                <Button size="sm" className="gradient-cta text-white" disabled={saving || !newNote.trim()} onClick={handleAddNote}>
                  Adicionar Nota
                </Button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota interna.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map(n => (
                    <div key={n.id} className="bg-muted/30 rounded-lg p-3 border border-border">
                      <p className="text-sm">{n.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <OrderCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        orderNumber={order.order_number}
        onConfirm={handleCancel}
      />
    </>
  )
}

export default OrderDetailDialog
