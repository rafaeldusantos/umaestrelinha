import { Link } from 'react-router-dom'
import {
  CAMPAIGN_OFFERS_PIECES,
  CAMPAIGN_OFFERS_PIECES_TITLE,
  CAMPAIGN_OFFERS_SEE_ALL,
  campaignOffersHref,
  campaignOffersIntro,
  campaignPercentCards,
} from '@estrelinha/core/home'
import { useLiveCampaign } from '@/entities/campaign'
import { ProductCarousel } from '@/widgets/product-carousel'
import { useCampaignOfferProducts } from '../model/useCampaignOfferProducts'

/**
 * O bloco **Joias em oferta** da Home — os percentuais e algumas peças da campanha em vigência.
 *
 * Não tem campo: o rótulo (o texto do selo), o título (o nome) e os percentuais são da campanha, e
 * uma campanha com outro nome aparece com ele sem mudança de código. **Sem campanha em vigência o
 * bloco não desenha nada** — nem enquanto a leitura não respondeu, porque reservar a vaga afirmaria
 * uma campanha que a loja ainda não sabe se existe.
 *
 * Um cartão por percentual, cada um levando à vitrine recortada (`/ofertas?percentual=<p>`); a
 * fileira de peças é a do `ProductCarousel`, dono das vagas e do esqueleto. A fileira falhar não
 * derruba o bloco: os cartões continuam levando à vitrine.
 *
 * Tom: os percentuais e que o valor já aparece com o desconto. Nada de contagem regressiva,
 * "últimas horas" ou escassez.
 */

/**
 * Os tons dos cartões, da paleta da loja, nesta ordem: fundo claro, ouro, e escuro com o número em
 * ouro. Cada par tem contraste AA medido: `ink` sobre `ground-deep` (~11:1), `ink` CHEIO sobre
 * `accent` (4,78:1 — sem opacidade, que derrubaria a margem) e o número `accent` sobre `ink`
 * (4,78:1), com o resto do cartão escuro em `on-primary`.
 */
const TONS = [
  { cartao: 'bg-estrelinha-ground-deep text-estrelinha-ink', numero: '' },
  { cartao: 'bg-estrelinha-accent text-estrelinha-ink', numero: '' },
  { cartao: 'bg-estrelinha-ink text-estrelinha-on-primary', numero: 'text-estrelinha-accent' },
] as const

const CampaignOffers = () => {
  // Carregando ou com a leitura em erro, `data` é `undefined`: as duas caem no mesmo `null`.
  const { data: campanha } = useLiveCampaign()
  const pecas = useCampaignOfferProducts(campanha?.id)

  if (!campanha) return null

  const cartoes = campaignPercentCards(campanha.percents)
  if (cartoes.length === 0) return null

  const tituloId = `joias-em-oferta-${campanha.id}`

  return (
    <div data-testid="joias-em-oferta">
      <section aria-labelledby={tituloId} className="bg-estrelinha-surface pt-12 md:pt-20">
        <div className="container">
          <p className="estrelinha-eyebrow text-estrelinha-ink-soft">{campanha.badge_text}</p>
          <h2
            id={tituloId}
            className="mt-2 font-display text-[22px] font-semibold leading-[1.27] tracking-[-0.03em] text-estrelinha-ink md:text-[44px] md:leading-[1.09]"
          >
            {campanha.name}
          </h2>
          <p className="mt-2 max-w-[640px] text-[13px] text-estrelinha-ink-soft md:text-[17px]">
            {campaignOffersIntro(campanha.percents)}
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {cartoes.map((cartao, i) => (
              <li key={cartao.percent} className="min-w-0">
                <Link
                  to={cartao.href}
                  aria-label={cartao.label}
                  data-testid="cartao-percentual"
                  className={`flex min-h-[120px] flex-col justify-between gap-3 rounded-lg p-5 transition-opacity hover:opacity-90 motion-reduce:transition-none md:min-h-[160px] md:p-6 ${TONS[i % TONS.length].cartao}`}
                >
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span
                      data-testid="numero-percentual"
                      className={`font-display text-[44px] font-semibold leading-none md:text-[56px] ${TONS[i % TONS.length].numero}`}
                    >
                      {cartao.percent}%
                    </span>
                    <span className="text-[15px] font-medium">de desconto</span>
                  </span>
                  <span className="text-[15px] font-semibold">Ver as peças →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Sem peça (vazio resolvido ou consulta em erro) o `ProductCarousel` não desenha nada. */}
      <ProductCarousel
        title={CAMPAIGN_OFFERS_PIECES_TITLE}
        products={pecas.data ?? []}
        loading={pecas.isLoading}
        skeletonCount={CAMPAIGN_OFFERS_PIECES}
        tone="surface"
        linkHref={campaignOffersHref()}
        linkText={CAMPAIGN_OFFERS_SEE_ALL}
        linkOnMobile
        list={{ id: `ofertas-${campanha.id}`, name: campanha.name || CAMPAIGN_OFFERS_PIECES_TITLE }}
      />
    </div>
  )
}

export default CampaignOffers
