import { AlertTriangle, Clock, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@nanapin/ui/card'
import { Badge } from '@nanapin/ui/badge'
import { Link } from 'react-router-dom'

interface Props {
  lowStock: number
  pendingOrders: number
}

const AlertsPanel = ({ lowStock, pendingOrders }: Props) => {
  const alerts = [
    {
      icon: AlertTriangle,
      label: 'Estoque crítico',
      count: lowStock,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      link: '/admin/produtos',
    },
    {
      icon: Clock,
      label: 'Aguardando pagamento',
      count: pendingOrders,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      link: '/admin/pedidos',
    },
  ]

  const hasAlerts = alerts.some(a => a.count > 0)

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading font-bold">Alertas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasAlerts ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum alerta no momento ✓</p>
        ) : (
          alerts.filter(a => a.count > 0).map((alert) => (
            <Link
              key={alert.label}
              to={alert.link}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${alert.bgColor}`}>
                <alert.icon className={`w-4 h-4 ${alert.color}`} />
              </div>
              <span className="text-sm flex-1">{alert.label}</span>
              <Badge variant="secondary" className="text-xs">{alert.count}</Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default AlertsPanel
