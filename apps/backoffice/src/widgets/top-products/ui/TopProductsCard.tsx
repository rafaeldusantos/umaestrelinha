import { Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@estrelinha/ui/card'

interface TopProduct {
  id: string
  name: string
  image: string | null
  quantity: number
}

interface Props {
  products: TopProduct[]
}

const TopProductsCard = ({ products }: Props) => (
  <Card className="bg-card border-border h-full">
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-heading font-bold flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        Top Produtos da Semana
      </CardTitle>
    </CardHeader>
    <CardContent>
      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Sem vendas esta semana</p>
      ) : (
        <div className="space-y-3">
          {products.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
              <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
              </div>
              <span className="text-sm flex-1 truncate">{p.name}</span>
              <span className="text-xs font-medium text-muted-foreground">{p.quantity} un.</span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
)

export default TopProductsCard
