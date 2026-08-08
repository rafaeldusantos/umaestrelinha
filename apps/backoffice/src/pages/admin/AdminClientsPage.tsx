import { useState } from 'react'
import { Users, Eye } from 'lucide-react'
import { useAdminCustomers } from '@/entities/customer/api/useAdminCustomers'
import CustomerDetailDialog from '@/features/customer-detail/ui/CustomerDetailDialog'
import { PageHeader, AdminTable, type AdminColumn } from '@/shared/ui'
import { Button } from '@nanapin/ui/button'
import type { AdminCustomer } from '@/entities/customer/api/useAdminCustomers'

const AdminClientsPage = () => {
  const { customers, loading, getCustomerOrders } = useAdminCustomers()
  const [selected, setSelected] = useState<AdminCustomer | null>(null)

  const columns: AdminColumn<AdminCustomer>[] = [
    { key: 'name', header: 'Nome', cell: c => <span className="font-medium">{c.name}</span> },
    { key: 'email', header: 'E-mail', cell: c => <span className="text-muted-foreground">{c.email}</span> },
    { key: 'order_count', header: 'Pedidos', align: 'center', cell: c => c.order_count ?? 0 },
    { key: 'created_at', header: 'Cadastro', align: 'right', cell: c => <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString('pt-BR')}</span> },
    {
      key: 'actions', header: 'Ações', align: 'center',
      cell: c => (
        <Button size="icon" variant="ghost" onClick={() => setSelected(c)}>
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Clientes" />

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <AdminTable
          columns={columns}
          data={customers}
          rowKey={c => c.id}
          empty={{ icon: Users, message: 'Nenhum cliente encontrado.' }}
          footer={<span>{customers.length} cliente(s)</span>}
        />
      )}

      <CustomerDetailDialog
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        customer={selected}
        getOrders={getCustomerOrders}
      />
    </div>
  )
}

export default AdminClientsPage
