import { Star } from 'lucide-react'

interface Props {
  /** Nota de 0 a 5. Meia estrela arredonda para cima — 4.9 acende as cinco, como no board. */
  value: number
  /** Lado da estrela em px. 16 no cabeçalho, 12 dentro do card de avaliação. */
  size?: number
  className?: string
}

/**
 * A fileira de estrelas — cabeçalho do produto, cabeçalho da seção e cada card de avaliação.
 *
 * Amarelo, não geleia: estrela de avaliação é convenção de mercado e a única exceção de cor da
 * página. O `nanita-butter` da marca é proibido sobre branco (DESIGN.md §2), então usa-se o
 * amarelo do próprio board, que tem contraste de forma — a estrela lê pelo desenho, não pela cor.
 *
 * O grupo inteiro é um `img` com rótulo: cinco ícones soltos fariam o leitor de tela anunciar
 * "estrela" cinco vezes sem nunca dizer a nota.
 */
const RatingStars = ({ value, size = 14, className = '' }: Props) => {
  const filled = Math.round(value)

  return (
    <span
      role="img"
      aria-label={`${value.toFixed(1)} de 5 estrelas`}
      className={`inline-flex gap-[2px] ${className}`}
    >
      {[0, 1, 2, 3, 4].map(i => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i < filled ? 'fill-[#FFC400] text-[#FFC400]' : 'fill-nanita-border text-nanita-border'}
          aria-hidden
        />
      ))}
    </span>
  )
}

export default RatingStars
