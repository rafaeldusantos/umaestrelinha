import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'

export interface SectionHeadingProps {
  /** Título em Fredoka. É o maior tipo da seção — não competir com ele. */
  title: string
  /** Linha de apoio em DM Sans/Carbono. Opcional. */
  subtitle?: string
  /** Selo colado no título (ex.: "HOT"). Fita sobre Grafite. */
  badge?: string
  /** Link de escape à direita. */
  linkTo?: string
  linkLabel?: string
  /** Slot livre à direita (ex.: setas do carrossel). Substitui o link. */
  action?: React.ReactNode
  className?: string
}

/**
 * Cabeçalho de seção da loja.
 *
 * Uma só forma para toda a home e para as listagens: título grande em Fredoka
 * Grafite, apoio discreto em Carbono e um único link em Carmim. O contraste de
 * ESCALA — 44px contra 15–17px no desktop, 22 contra 13 no celular — é o que dá
 * hierarquia, não a cor. Um título grande em Grafite ao lado de um apoio
 * pequeno em Carbono já resolve; colorir o título seria pedir à cor o que o
 * tamanho já faz.
 *
 * O selo (`badge`) é Fita sobre Grafite, a única superfície em que a manteiga
 * lê (10,17:1).
 */
export function SectionHeading({
  title,
  subtitle,
  badge,
  linkTo,
  linkLabel = 'Ver todos',
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('flex items-end justify-between gap-6', className)}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-[22px] font-semibold leading-[1.27] tracking-[-0.03em] text-nanita-ink md:text-[44px] md:leading-[1.09]">
            {title}
          </h2>
          {badge && (
            <span className="nanita-eyebrow rounded-pill bg-nanita-ink px-2.5 py-1 text-[11px] text-nanita-butter">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-[13px] text-nanita-plum md:text-[17px]">{subtitle}</p>}
      </div>

      {action ??
        (linkTo && (
          <Link
            to={linkTo}
            className="flex shrink-0 items-center gap-1.5 pb-1 text-[13px] font-semibold text-nanita-jam transition-opacity hover:opacity-70 md:gap-2 md:text-[15px]"
          >
            {linkLabel}
            <ArrowRight size={15} strokeWidth={2.2} />
          </Link>
        ))}
    </div>
  )
}

export default SectionHeading
