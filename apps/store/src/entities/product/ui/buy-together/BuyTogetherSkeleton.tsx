import { BUY_TOGETHER_SURFACE } from './panel'

/**
 * O espaço reservado do bloco Compre Junto enquanto as peças chegam.
 *
 * Só é desenhado quando a configuração já disse que há adicionais — sem adicional o bloco nem
 * existe, e reservar espaço para nada empurraria a página de toda joia sem eles. A altura mínima é a
 * do bloco com uma linha e três cartões de peça, para a chegada dos dados não deslocar o que está
 * abaixo (`CLS`, como o esqueleto da Home).
 */
export const BUY_TOGETHER_RESERVED_MIN_H = 'min-h-[320px]'

const Bloco = ({ className }: { className: string }) => (
  <div
    className={`animate-pulse rounded-sm bg-estrelinha-ground-deep motion-reduce:animate-none ${className}`}
  />
)

const BuyTogetherSkeleton = () => (
  <section
    aria-busy="true"
    aria-label="Compre junto"
    className={`${BUY_TOGETHER_SURFACE} ${BUY_TOGETHER_RESERVED_MIN_H}`}
  >
    <Bloco className="h-6 w-40" />
    <Bloco className="h-14 w-full" />
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
      <Bloco className="h-28" />
      <Bloco className="h-28" />
      <Bloco className="h-28" />
    </div>
  </section>
)

export default BuyTogetherSkeleton
