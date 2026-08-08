import { Truck, CreditCard, Zap, RefreshCw } from 'lucide-react'

const items = [
  { icon: Truck, label: 'Frete Grátis', desc: 'Acima de R$ 150' },
  { icon: CreditCard, label: 'Parcele em 12x', desc: 'No cartão de crédito' },
  { icon: Zap, label: 'PIX com 5% off', desc: 'Pagamento instantâneo' },
  { icon: RefreshCw, label: 'Troca em 7 dias', desc: 'Garantia de troca' },
]

const TrustBar = () => (
  <section className="border-y border-nanita-border bg-white">
    <div className="container py-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="rounded-md bg-nanita-sugar p-2">
              <item.icon className="h-4 w-4 text-nanita-jam" strokeWidth={1.8} aria-label={item.label} />
            </div>
            <div>
              <p className="text-xs font-semibold text-nanita-ink">{item.label}</p>
              <p className="text-[11px] text-nanita-plum">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default TrustBar
