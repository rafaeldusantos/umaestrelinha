import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import SectionHeading from '@/shared/ui/SectionHeading'

const KIT_ROUTE = '/crie-seu-botton'

interface Tier {
  qty: number
  price: string
  unit: string
  /** O tier recomendado inverte para Grafite — é o único destaque da seção. */
  featured?: boolean
  badge?: string
}

const TIERS: Tier[] = [
  { qty: 3, price: 'R$ 15', unit: 'R$ 5,00 cada' },
  { qty: 5, price: 'R$ 23', unit: 'R$ 4,60 cada', featured: true, badge: 'Mais popular' },
  { qty: 10, price: 'R$ 42', unit: 'R$ 4,20 cada' },
]

/** Um ponto por botton — Carimbo nos dois fundos, e a quantidade é lida antes do número. */
const Dots = ({ count }: { count: number }) => (
  <div className="flex flex-wrap justify-center gap-1.5">
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} className="h-3 w-3 rounded-full bg-nanita-glaze md:h-5 md:w-5" />
    ))}
  </div>
)

const TierCard = ({ tier }: { tier: Tier }) => (
  <div
    className={`relative flex flex-1 flex-col items-center gap-4 overflow-hidden rounded-lg px-6 py-9 md:gap-5 md:px-8 ${
      tier.featured ? 'bg-nanita-ink' : 'border border-nanita-border bg-white'
    }`}
  >
    {tier.badge && (
      /* Aba cantada no topo direito — não pílula flutuante. A fita "sai" do
         card, que é o gesto de papelaria que dá nome à paleta. */
      <span className="nanita-eyebrow absolute right-0 top-0 rounded-bl-md bg-nanita-butter py-2 pl-5 pr-[18px] text-[11px] font-bold tracking-[0.1em] text-nanita-ink">
        {tier.badge}
      </span>
    )}

    <Dots count={tier.qty} />

    <div className="flex flex-col items-center gap-1">
      <span
        /* Carimbo, não branco: no artboard 22 o número e o preço do tier
           destacado são a mesma cor, e é ela que amarra a superfície escura à
           marca. Branco ali deixaria o card sem rosa nenhum. */
        className={`font-display text-[44px] font-semibold leading-none tracking-[-0.03em] md:text-[52px] ${
          tier.featured ? 'text-nanita-glaze' : 'text-nanita-ink'
        }`}
      >
        {tier.qty}
      </span>
      <span
        className={`text-[14px] font-medium tracking-[0.06em] ${
          tier.featured ? 'text-nanita-border' : 'text-nanita-plum'
        }`}
      >
        bottons por
      </span>
      <span
        className={`font-display text-[26px] font-semibold leading-tight md:text-[32px] ${
          tier.featured ? 'text-nanita-glaze' : 'text-nanita-jam'
        }`}
      >
        {tier.price}
      </span>
      <span className={`text-[13px] ${tier.featured ? 'text-nanita-border' : 'text-nanita-plum'}`}>
        {tier.unit}
      </span>
    </div>

    <Link
      to={KIT_ROUTE}
      className={`mt-1 w-full rounded-button py-3 text-center font-display text-[15px] font-semibold transition-transform hover:scale-[1.02] ${
        tier.featured
          ? 'bg-nanita-glaze text-nanita-ink'
          : 'border-2 border-nanita-ink text-nanita-ink hover:bg-nanita-sugar'
      }`}
    >
      Montar kit
    </Link>
  </div>
)

const MonteSeuKit = () => (
  <section className="py-10 md:py-14">
    <div className="container">
      <SectionHeading
        className="mb-6"
        title="Monte seu kit"
        subtitle="Quanto mais pins, mais barato sai cada um"
      />

      <div className="flex flex-col gap-4 md:flex-row">
        {TIERS.map((tier) => (
          <TierCard key={tier.qty} tier={tier} />
        ))}
      </div>

      {/* Só no celular. No artboard 22 os três CTAs dos tiers bastam; empilhar
          um quarto botão em Carmim embaixo deles põe quatro ações primárias na
          mesma tela, que é o que o §8 do DESIGN.md proíbe. No 390px os tiers
          rolam na vertical e o CTA fixo embaixo é o que fecha a seção. */}
      <Link
        to={KIT_ROUTE}
        className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-button bg-nanita-jam py-4 font-display text-[16px] font-semibold text-white transition-transform hover:scale-[1.01] md:hidden"
      >
        Montar meu kit
        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
      </Link>
    </div>
  </section>
)

export default MonteSeuKit
