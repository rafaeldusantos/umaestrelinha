import type { BrandArt } from './paths'

/**
 * Cor do traço da marca — nunca a forma.
 *
 * A marca é **monoline**: uma cor só, no traço. Não há par de cores para
 * resolver como havia na marca anterior (wordmark + descritor), então o mapa é
 * direto — e os quatro nomes são as quatro aplicações que o board aprova
 * ("05 · APLICAÇÕES APROVADAS", prancha `734-0`).
 *
 * `mono` existe para quando o contexto já define a cor (herda `currentColor`),
 * e é o que permite a marca viver dentro de um link colorido sem receber uma
 * cor fixa que brigue com o hover.
 */
export type BrandTone = 'brand' | 'onInk' | 'accent' | 'mono'

const STROKE: Record<BrandTone, string> = {
  /** `primary-strong` — o positivo, sobre `ground` / `surface` (11,03:1). */
  brand: '#283A4A',
  /** `on-primary` — o negativo, sobre `ink` / `primary` / `primary-strong`. */
  onInk: '#F7F3EC',
  /** `accent` — a aplicação de acento do board, sobre `ground-deep`. */
  accent: '#B8945F',
  mono: 'currentColor',
}

export interface BrandSvgProps {
  art: BrandArt
  /** Nome acessível. Cada degrau tem o seu — o lockup diz a assinatura junto. */
  label: string
  /** Largura em px. A altura sai da proporção do próprio desenho. */
  width: number
  tone?: BrandTone
  className?: string
}

/**
 * Renderiza um degrau da marca como SVG **inline**.
 *
 * Inline e não `<img src>` por duas razões que não são preferência: a marca do
 * header não pode ter estado de carregamento nem 404 possível, e
 * `currentColor` só funciona inline.
 *
 * **Um `<path>` por papel de traço.** A espessura é geometria nesta marca —
 * fundir dois papéis muda o desenho —, e os papéis já vêm consolidados de
 * `paths.ts`. `fill-rule` não aparece aqui de propósito: com `fill="none"` ele
 * não tem efeito nenhum, e um atributo inerte sugeriria uma regra que não está
 * valendo.
 */
export function BrandSvg({ art, label, width, tone = 'brand', className }: BrandSvgProps) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={art.viewBox}
      width={width}
      height={Math.round((width / art.ratio) * 100) / 100}
      className={className}
    >
      <title>{label}</title>
      {art.strokes.map((stroke) => (
        <path
          key={stroke.role}
          d={stroke.d}
          fill="none"
          stroke={STROKE[tone]}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
