import { CheckCircle2 } from 'lucide-react'
import {
  initialsOf,
  summarizeReviews,
  type ProductReview,
} from '../model/productReviews'
import RatingStars from './RatingStars'

interface Props {
  reviews: ProductReview[]
  /** Quantos cards a tela mostra antes do "Ver todas". O board pede 2 no desktop e 1 no mobile. */
  limit?: number
}

/**
 * A seção de avaliações — boards "Desktop Product Detail - v3" e "Mobile Product Detail - v3".
 *
 * Desktop: histograma de 240px à esquerda, cards à direita. Mobile: o histograma sai (cinco barras
 * de 6px numa coluna de 350px não somam informação que a média já não dê) e sobra um card com o
 * link "Ver todas avaliações".
 *
 * A origem do dado é `model/productReviews` — ver o aviso lá: hoje é conteúdo de demonstração.
 */
const ReviewList = ({ reviews, limit = 2 }: Props) => {
  const summary = summarizeReviews(reviews)
  if (!summary) return null

  const shown = reviews.slice(0, limit)
  const rest = reviews.length - shown.length

  return (
    <section className="flex flex-col gap-4 pt-10 md:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-[24px] font-semibold leading-[30px] tracking-[-0.02em] text-nanita-ink md:text-[30px]">
            Avaliações
          </h2>
          <RatingStars value={summary.average} size={16} />
          <span className="text-[14px] font-semibold leading-[18px] text-nanita-ink">
            {summary.average.toFixed(1)}
          </span>
          <span className="text-[13px] leading-4 text-nanita-plum">
            ({summary.count} {summary.count === 1 ? 'avaliação' : 'avaliações'})
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <div className="hidden w-[240px] shrink-0 flex-col gap-1.5 md:flex">
          {summary.histogram.map(row => (
            <div key={row.rating} className="flex items-center gap-2">
              <span className="w-3 shrink-0 text-[12px] leading-4 text-nanita-plum">
                {row.rating}
              </span>
              <span className="h-1.5 grow overflow-hidden rounded-pill bg-nanita-sugar">
                <span
                  className="block h-full rounded-pill bg-[#FFC400]"
                  style={{ width: `${row.percent}%` }}
                />
              </span>
              <span className="w-5 shrink-0 text-right text-[12px] leading-4 text-nanita-plum">
                {row.count}
              </span>
            </div>
          ))}
        </div>

        <div className="flex min-w-0 grow flex-col gap-3">
          {shown.map(review => (
            <article
              key={review.id}
              className="flex flex-col gap-2 rounded-md border border-nanita-border bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nanita-jam text-[12px] font-bold text-white"
                >
                  {initialsOf(review.name)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-semibold leading-4 text-nanita-ink">
                    {review.name}
                  </span>
                  {review.location && (
                    <span className="truncate text-[11px] leading-[14px] text-nanita-plum">
                      {review.location}
                    </span>
                  )}
                </span>
                <RatingStars value={review.rating} size={12} className="ml-auto shrink-0" />
              </div>

              <p className="text-[14px] leading-[22px] text-nanita-plum">“{review.text}”</p>

              {review.verified && (
                <p className="flex items-center gap-1 text-[11px] leading-[14px] text-[hsl(142_71%_30%)]">
                  <CheckCircle2 className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                  Compra verificada
                </p>
              )}
            </article>
          ))}

          {rest > 0 && (
            <p className="pt-1 text-center text-[14px] font-semibold text-nanita-plum md:text-left">
              {/* Ainda não há para onde levar: a lista completa depende da tabela de avaliações
                  que não existe. Texto, e não link morto — um "Ver todas" que não navega é pior
                  que a contagem honesta. */}
              +{rest} {rest === 1 ? 'avaliação' : 'avaliações'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default ReviewList
