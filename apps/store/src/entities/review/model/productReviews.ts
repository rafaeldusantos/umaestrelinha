// As avaliações da página do produto.
//
// ⚠️ **CONTEÚDO DE DEMONSTRAÇÃO.** Não existe tabela `product_reviews` no banco: nem migration, nem
// RLS, nem moderação no backoffice. Estas três linhas são as mesmas que a loja já exibia antes dos
// boards de Produto — a aplicação do desenho reestilizou a seção, não criou a origem do dado.
//
// Estão isoladas aqui, e não espalhadas no JSX, por um motivo prático: **o dia em que a tabela
// existir, é este arquivo que some.** `useProductReviews` vira uma query, `summarizeReviews`
// continua igual, e nenhuma tela muda. Enquanto isso, a nota do cabeçalho e a da seção saem daqui
// — as duas do mesmo lugar, para a página não anunciar 4.9 no topo e 4.7 embaixo.

export interface ProductReview {
  id: string
  name: string
  /** Cidade/UF como no board. `null` quando a pessoa não informou. */
  location: string | null
  rating: number
  text: string
  /** ISO. Ainda não é exibida — o board não mostra data. */
  date: string
  verified: boolean
}

const PLACEHOLDER: ProductReview[] = [
  {
    id: '1',
    name: 'Marina S.',
    location: 'São Paulo, SP',
    rating: 5,
    text: 'Amei meus bottons! A qualidade é incrível e chegaram super rápido. Já estou montando minha coleção!',
    date: '2025-12-10',
    verified: true,
  },
  {
    id: '2',
    name: 'Lucas P.',
    location: 'Rio de Janeiro, RJ',
    rating: 5,
    text: 'Comprei o kit de 10 e valeu demais! Dei de presente para as amigas e todas adoraram.',
    date: '2025-12-08',
    verified: true,
  },
  {
    id: '3',
    name: 'Camila R.',
    location: 'Belo Horizonte, MG',
    rating: 4,
    text: 'Adorei o acabamento e a entrega foi rápida. Só achei o alfinete um pouquinho duro no começo.',
    date: '2025-12-05',
    verified: false,
  },
]

/**
 * As avaliações de um produto.
 *
 * Recebe `productId` de propósito, mesmo ignorando-o hoje: é a assinatura que a versão com banco
 * vai ter, e chamar sem o id agora significaria mudar todos os chamadores depois.
 */
export const useProductReviews = (productId: string): ProductReview[] => {
  void productId
  return PLACEHOLDER
}

export interface ReviewSummary {
  average: number
  count: number
  /** Quantas avaliações em cada nota, de 5 a 1 — o histograma do board. */
  histogram: { rating: number; count: number; percent: number }[]
}

/** Nota média e distribuição. `null` sem avaliação nenhuma: 0 estrelas seria pior que nada. */
export const summarizeReviews = (reviews: readonly ProductReview[]): ReviewSummary | null => {
  if (reviews.length === 0) return null

  const total = reviews.reduce((sum, r) => sum + r.rating, 0)
  const histogram = [5, 4, 3, 2, 1].map(rating => {
    const count = reviews.filter(r => r.rating === rating).length
    return { rating, count, percent: Math.round((count / reviews.length) * 100) }
  })

  return {
    average: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
    histogram,
  }
}

/** "Marina S." → "MS". O avatar do board é a inicial do nome e do sobrenome, nada mais. */
export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('')
