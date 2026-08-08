import * as React from 'react'
import { cn } from './lib/utils'

/**
 * Nana — a mascote da Nanita.
 *
 * Geometria normalizada em um viewBox 130×130, derivada do board
 * "03 · Home Desktop — menos cores" no Paper (rosto de 284px do hero).
 *
 * Duas leituras, e só duas:
 * - `tone="glaze"` (padrão) — rosto glacê com traços em tinta, bochechas e laço.
 *   É a aplicação de destaque: hero, estados vazios, ilustração.
 * - `tone="ink"` — disco de tinta com traços em glacê, sem bochecha e sem laço.
 *   É a aplicação pequena e reversa: header, favicon, avatar.
 *
 * Expressões dão vida a estados e interações:
 * - happy     → padrão, boas-vindas
 * - heart     → favoritos, "amei"
 * - wink      → sucesso, item adicionado
 * - star      → novo drop, "uau"
 * - surprised → novidade, atenção
 * - sad       → carrinho vazio, 404
 */
export type NanaExpression = 'happy' | 'heart' | 'wink' | 'star' | 'surprised' | 'sad'

export type NanaTone = 'glaze' | 'ink'

export interface NanaMascotProps extends Omit<React.SVGProps<SVGSVGElement>, 'color'> {
  /** Diâmetro do rosto em px. Default 40. */
  size?: number
  /** Expressão facial. Default "happy". */
  expression?: NanaExpression
  /** Leitura de cor. Default "glaze". */
  tone?: NanaTone
  /** Laço de framboesa no canto superior direito. Default: só no tom glacê. */
  showBow?: boolean
  /** Bochechas rosadas. Default: só no tom glacê. Some em tamanhos pequenos. */
  showCheeks?: boolean
  /** Sobrescreve a cor do corpo (círculo). */
  bodyColor?: string
  /** Sobrescreve a cor dos traços do rosto. */
  faceColor?: string
}

// Paleta Nanita — ver DESIGN.md.
const GLAZE = '#FF86B5'
const RASPBERRY = '#FF51B9'
const INK = '#2B1622'
const CHEEK = '#FFE3EF'

// Centros dos olhos no sistema de coordenadas 130×130.
const LEFT_EYE = { x: 45.5, y: 53.5 }
const RIGHT_EYE = { x: 84.5, y: 53.5 }

// Traço do rosto proporcional ao board (stroke de 6 num viewBox de 46).
const FACE_STROKE = 4.6

function Eyes({ expression, color }: { expression: NanaExpression; color: string }) {
  switch (expression) {
    case 'heart':
      // Coração de 18×16 (centro ~9,8) sobre cada olho.
      return (
        <>
          <path
            d="M9 15.5C9 15.5 0.8 10.3 0.8 4.9C0.8 2.1 2.8 0.7 4.6 0.7C6.4 0.7 8.1 2.1 9 3.9C9.9 2.1 11.6 0.7 13.4 0.7C15.2 0.7 17.2 2.1 17.2 4.9C17.2 10.3 9 15.5 9 15.5Z"
            fill={color}
            transform={`translate(${LEFT_EYE.x - 9} ${LEFT_EYE.y - 8})`}
          />
          <path
            d="M9 15.5C9 15.5 0.8 10.3 0.8 4.9C0.8 2.1 2.8 0.7 4.6 0.7C6.4 0.7 8.1 2.1 9 3.9C9.9 2.1 11.6 0.7 13.4 0.7C15.2 0.7 17.2 2.1 17.2 4.9C17.2 10.3 9 15.5 9 15.5Z"
            fill={color}
            transform={`translate(${RIGHT_EYE.x - 9} ${RIGHT_EYE.y - 8})`}
          />
        </>
      )
    case 'wink':
      return (
        <>
          <rect x={LEFT_EYE.x - 7.1} y={LEFT_EYE.y - 9.9} width={14.2} height={19.7} rx={7.1} fill={color} />
          <path
            d={`M${RIGHT_EYE.x - 8.6} ${RIGHT_EYE.y - 1} Q${RIGHT_EYE.x} ${RIGHT_EYE.y + 8.4} ${RIGHT_EYE.x + 8.6} ${RIGHT_EYE.y - 1}`}
            fill="none"
            stroke={color}
            strokeWidth={FACE_STROKE}
            strokeLinecap="round"
          />
        </>
      )
    case 'star':
      // Brilho de 4 pontas, 20×20 (centro 10,10).
      return (
        <>
          <path
            d="M10 0C10.7 5.6 14.4 9.3 20 10C14.4 10.7 10.7 14.4 10 20C9.3 14.4 5.6 10.7 0 10C5.6 9.3 9.3 5.6 10 0Z"
            fill={color}
            transform={`translate(${LEFT_EYE.x - 10} ${LEFT_EYE.y - 10})`}
          />
          <path
            d="M10 0C10.7 5.6 14.4 9.3 20 10C14.4 10.7 10.7 14.4 10 20C9.3 14.4 5.6 10.7 0 10C5.6 9.3 9.3 5.6 10 0Z"
            fill={color}
            transform={`translate(${RIGHT_EYE.x - 10} ${RIGHT_EYE.y - 10})`}
          />
        </>
      )
    case 'surprised':
      return (
        <>
          <circle cx={LEFT_EYE.x} cy={LEFT_EYE.y} r={7.6} fill={color} />
          <circle cx={RIGHT_EYE.x} cy={RIGHT_EYE.y} r={7.6} fill={color} />
        </>
      )
    case 'happy':
    case 'sad':
    default:
      // Olhos pílula — 14,2 × 19,7, a proporção do board.
      return (
        <>
          <rect x={LEFT_EYE.x - 7.1} y={LEFT_EYE.y - 9.9} width={14.2} height={19.7} rx={7.1} fill={color} />
          <rect x={RIGHT_EYE.x - 7.1} y={RIGHT_EYE.y - 9.9} width={14.2} height={19.7} rx={7.1} fill={color} />
        </>
      )
  }
}

function Mouth({ expression, color }: { expression: NanaExpression; color: string }) {
  switch (expression) {
    case 'star':
      // Sorriso aberto.
      return <path d="M51 74.5 Q65 77.5 79 74.5 Q76.5 88.5 65 88.5 Q53.5 88.5 51 74.5Z" fill={color} />
    case 'surprised':
      return <ellipse cx={65} cy={79.5} rx={6.5} ry={7.5} fill={color} />
    case 'sad':
      return (
        <path
          d="M53.5 84.5 Q65 73.5 76.5 84.5"
          fill="none"
          stroke={color}
          strokeWidth={FACE_STROKE}
          strokeLinecap="round"
        />
      )
    case 'happy':
    case 'heart':
    case 'wink':
    default:
      // Sorriso largo do board — vai de 50,6 a 79,4 no eixo x.
      return (
        <path
          d="M50.6 75.6C50.6 75.6 54.4 83.7 65 83.7C75.6 83.7 79.4 75.6 79.4 75.6"
          fill="none"
          stroke={color}
          strokeWidth={FACE_STROKE}
          strokeLinecap="round"
        />
      )
  }
}

export function NanaMascot({
  size = 40,
  expression = 'happy',
  tone = 'glaze',
  showBow,
  showCheeks,
  bodyColor,
  faceColor,
  className,
  ...props
}: NanaMascotProps) {
  const body = bodyColor ?? (tone === 'ink' ? INK : GLAZE)
  const face = faceColor ?? (tone === 'ink' ? GLAZE : INK)
  // No tom reverso a mascote vira símbolo: sem bochecha e sem laço.
  const withBow = showBow ?? tone === 'glaze'
  const withCheeks = showCheeks ?? tone === 'glaze'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 130 130"
      fill="none"
      role="img"
      aria-label="Nana, mascote da Nanita"
      className={cn('shrink-0', className)}
      {...props}
    >
      {/* Corpo — círculo chapado, sem contorno. A silhueta basta. */}
      <circle cx={65} cy={65} r={65} fill={body} />

      {/* Laço — encostado na borda superior direita, por cima da cabeça.
          Posição calibrada para vazar da silhueta sem estourar o viewBox. */}
      {withBow && (
        <g transform="translate(89.5 -1.5) rotate(14) scale(0.89)">
          <path d="M23 17C17 8 8 2 4 4C0 7 0 27 4 30C8 32 17 26 23 18Z" fill={RASPBERRY} />
          <path d="M23 17C29 8 38 2 42 4C46 7 46 27 42 30C38 32 29 26 23 18Z" fill={RASPBERRY} />
          <ellipse cx="23" cy="17.5" rx="4.6" ry="5.2" fill={RASPBERRY} />
        </g>
      )}

      {withCheeks && (
        <>
          <ellipse cx={30.6} cy={80} rx={10.7} ry={5} fill={CHEEK} />
          <ellipse cx={99.4} cy={80} rx={10.7} ry={5} fill={CHEEK} />
        </>
      )}

      <Eyes expression={expression} color={face} />
      <Mouth expression={expression} color={face} />
    </svg>
  )
}

export default NanaMascot
