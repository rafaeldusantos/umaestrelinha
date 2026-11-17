import { Link } from 'react-router-dom'
import {
  CAMPAIGN_OFFERS_PIECES,
  CAMPAIGN_OFFERS_PIECES_TITLE,
  CAMPAIGN_OFFERS_SEE_ALL,
  campaignOffersDescription,
  campaignOffersHref,
  campaignOffersShows,
  campaignOffersTitle,
  campaignPercentCards,
  type HomeSection,
  type ResolvedItem,
} from '@estrelinha/core/home'
import { useLiveCampaign } from '@/entities/campaign'
import { useProductsByIds } from '@/entities/product'
import { ProductCarousel } from '@/widgets/product-carousel'
import { useCampaignOfferProducts } from '../model/useCampaignOfferProducts'

/**
 * O bloco **Joias em oferta** da Home — os percentuais e as peças de UMA campanha, a do bloco.
 *
 * **O bloco aparece só quando a campanha dele é a vigente que o banco entrega** — a comparação é
 * por id (`campaignOffersShows`), nunca por data: a hora do aparelho da cliente pode estar errada.
 * Sem campanha escolhida, com outra em vigência, ou enquanto a leitura não respondeu, ele não
 * desenha nada nem reserva vaga, porque reservar afirmaria um bloco que a loja ainda não sabe se
 * existe.
 *
 * O rótulo acima do título é o texto do selo da campanha; o título e a descrição são os da dona,
 * com recuo para o nome da campanha e para a frase dos percentuais. Um cartão por percentual, cada
 * um levando à vitrine recortada (`/ofertas?percentual=<p>`).
 *
 * A fileira é a do `ProductCarousel`, dono das vagas e do esqueleto:
 * - **com peças escolhidas**, elas na ordem da dona, em fita, com uma vaga de esqueleto por peça. A
 *   que deixou de valer — tirada da campanha, ou que a campanha não barateia (o mapeador a entrega
 *   sem `campaign`) — some, e a vaga fica vazia: completar poria no bloco peça que a dona não
 *   escolheu. Todas fora, só os cartões;
 * - **sem peça escolhida**, as primeiras da campanha, como sempre.
 *
 * A fileira falhar não derruba o bloco: os cartões continuam levando à vitrine.
 *
 * Tom: os percentuais e que o valor já aparece com o desconto. Nada de contagem regressiva,
 * "últimas horas" ou escassez.
 */

interface Props {
  section: HomeSection
  items: ResolvedItem[]
}

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

const CampaignOffers = ({ section, items }: Props) => {
  // Carregando ou com a leitura em erro, `data` é `undefined`: as duas caem no mesmo `null`.
  const { data: campanha } = useLiveCampaign()
  const aparece = campaignOffersShows(section, campanha?.id)

  // Curadoria é a PRESENÇA de linhas na seção — e não de itens resolvidos: a escolhida que saiu do
  // ar não resolve, e o bloco cujas escolhidas saíram todas mostra só os cartões, sem completar.
  const temEscolha = (section.items ?? []).length > 0
  const ids = items.map(i => i.productId).filter((id): id is string => !!id)

  const automaticas = useCampaignOfferProducts(aparece && !temEscolha ? campanha!.id : null)
  const lidas = useProductsByIds(aparece && temEscolha ? ids : [])

  if (!aparece || !campanha) return null

  const cartoes = campaignPercentCards(campanha.percents)
  if (cartoes.length === 0) return null

  const tituloId = `joias-em-oferta-${campanha.id}`
  const titulo = campaignOffersTitle(section.config, campanha.name)

  const porId = new Map((lidas.data ?? []).map(p => [p.id, p]))
  const fileira = temEscolha
    ? {
        products: ids
          .map(id => porId.get(id))
          .filter(p => !!p && p.campaign?.id === campanha.id),
        loading: lidas.isLoading,
        skeletonCount: ids.length,
        layout: 'slider' as const,
      }
    : {
        products: automaticas.data ?? [],
        loading: automaticas.isLoading,
        skeletonCount: CAMPAIGN_OFFERS_PIECES,
        layout: undefined,
      }

  return (
    <div data-testid="joias-em-oferta">
      <section aria-labelledby={tituloId} className="bg-estrelinha-surface pt-12 md:pt-20">
        <div className="container">
          <p className="estrelinha-eyebrow text-estrelinha-ink-soft">{campanha.badge_text}</p>
          <h2
            id={tituloId}
            className="mt-2 font-display text-[22px] font-semibold leading-[1.27] tracking-[-0.03em] text-estrelinha-ink md:text-[44px] md:leading-[1.09]"
          >
            {titulo}
          </h2>
          <p className="mt-2 max-w-[640px] text-[13px] text-estrelinha-ink-soft md:text-[17px]">
            {campaignOffersDescription(section.config, campanha.percents)}
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
        products={fileira.products}
        loading={fileira.loading}
        skeletonCount={fileira.skeletonCount}
        layout={fileira.layout}
        tone="surface"
        linkHref={campaignOffersHref()}
        linkText={CAMPAIGN_OFFERS_SEE_ALL}
        linkOnMobile
        list={{ id: `ofertas-${campanha.id}`, name: titulo || CAMPAIGN_OFFERS_PIECES_TITLE }}
      />
    </div>
  )
}

export default CampaignOffers
