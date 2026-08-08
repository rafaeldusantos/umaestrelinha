import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@nanapin/ui/dialog'
import { formatPrice } from '@nanapin/core/formatters'
import StatusBadge from '@/entities/order/ui/StatusBadge'
import type { AdminCustomer } from '@/entities/customer/api/useAdminCustomers'
import type { DbOrder } from '@nanapin/supabase/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  customer: AdminCustomer | null
  getOrders: (customerId: string) => Promise<DbOrder[]>
}

const CustomerDetailDialog = ({ open, onOpenChange, customer, getOrders }: Props) => {
  const [orders, setOrders] = useState<DbOrder[]>([])

  useEffect(() => {
    if (customer && open) {
      getOrders(customer.id).then(setOrders)
    }
  }, [customer, open])

  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{customer.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-xl p-4 space-y-1 text-sm">
            <p><strong>E-mail:</strong> {customer.email}</p>
            {customer.phone && <p><strong>Telefone:</strong> {customer.phone}</p>}
            {customer.cpf && <p><strong>CPF:</strong> {customer.cpf}</p>}
            <p><strong>Cadastro:</strong> {new Date(customer.created_at).toLocaleDateString('pt-BR')}</p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Pedidos ({orders.length})</h4>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
            ) : (
              <div className="space-y-2">
                {orders.map(o => (
                  <div key={o.id} className="flex items-center justify-between bg-background rounded-lg p-3 border border-border text-sm">
                    <div>
                      <span className="font-medium">#{o.order_number}</span>
                      <span className="ml-2 text-muted-foreground">{new Date(o.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={o.status} />
                      <span className="font-semibold">{formatPrice(o.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CustomerDetailDialog
