import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@nanapin/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@nanapin/ui/tabs'
import { formatPrice } from '@nanapin/core/formatters'

interface Props {
  data: { date: string; revenue: number }[]
}

const SalesChart = ({ data }: Props) => {
  const [range, setRange] = useState<'7' | '30'>('7')
  const filtered = range === '7' ? data.slice(-7) : data

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-heading font-bold">Vendas</CardTitle>
        <Tabs value={range} onValueChange={(v) => setRange(v as '7' | '30')}>
          <TabsList className="h-8">
            <TabsTrigger value="7" className="text-xs px-2 h-6">7 dias</TabsTrigger>
            <TabsTrigger value="30" className="text-xs px-2 h-6">30 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filtered} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number) => [formatPrice(value), 'Faturamento']}
                labelFormatter={formatDate}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default SalesChart
