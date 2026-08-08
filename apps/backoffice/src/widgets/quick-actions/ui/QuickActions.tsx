import { Plus, ClipboardList, Tags, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@nanapin/ui/card'
import { Button } from '@nanapin/ui/button'
import { useNavigate } from 'react-router-dom'

const QuickActions = () => {
  const navigate = useNavigate()

  const actions = [
    { icon: Plus, label: 'Novo Produto', path: '/admin/produtos/novo', variant: 'default' as const },
    { icon: ClipboardList, label: 'Ver Pedidos', path: '/admin/pedidos', variant: 'outline' as const },
    { icon: Tags, label: 'Categorias', path: '/admin/categorias', variant: 'outline' as const },
    { icon: Users, label: 'Clientes', path: '/admin/clientes', variant: 'outline' as const },
  ]

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading font-bold">Atalhos Rápidos</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Button
            key={a.label}
            variant={a.variant}
            size="sm"
            className="h-auto py-3 flex-col gap-1.5 text-xs"
            onClick={() => navigate(a.path)}
          >
            <a.icon className="w-4 h-4" />
            {a.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

export default QuickActions
