import type { ReactNode } from 'react'

/**
 * A faixa de uma seção do guia.
 *
 * **Largura cheia, coluna centrada dentro** — o mesmo arranjo da `AboutPage` (`SOB-01`), e pelo mesmo
 * motivo: das oito seções, cinco têm cor de fundo própria, incluindo uma em `primary`. Cor de faixa
 * dentro de um `container` deixaria o chão da loja aparecendo dos dois lados.
 *
 * A coluna é 350 no mobile (390 − 2×20) e 1200 no desktop (1440 − 2×120), que são as medidas dos dois
 * artboards. O `max-w` carrega o padding junto (1240 = 1200 + 2×20) para a coluna medir 1200 de
 * conteúdo sem depender de `box-sizing` de ninguém.
 */
export type GuideTone = 'ground' | 'ground-deep' | 'surface' | 'primary'

const FUNDO: Record<GuideTone, string> = {
  ground: 'bg-estrelinha-ground',
  'ground-deep': 'bg-estrelinha-ground-deep',
  surface: 'bg-white',
  primary: 'bg-estrelinha-primary',
}

interface GuideSectionProps {
  tone?: GuideTone
  id?: string
  /** Rótulo acessível da seção — vira `aria-labelledby` quando o título tem `id`. */
  labelledBy?: string
  children: ReactNode
  className?: string
}

export const GUIDE_COLUMN = 'mx-auto w-full max-w-[1240px] px-5 md:max-w-[1440px] md:px-[120px]'

const GuideSection = ({
  tone = 'ground',
  id,
  labelledBy,
  children,
  className = '',
}: GuideSectionProps) => (
  <section
    id={id}
    aria-labelledby={labelledBy}
    className={`w-full py-12 md:py-24 ${FUNDO[tone]} ${className}`}
  >
    <div className={GUIDE_COLUMN}>{children}</div>
  </section>
)

export default GuideSection
