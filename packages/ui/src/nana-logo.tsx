import { NanaMascot } from './nana-mascot'
import { cn } from './lib/utils'

const GLAZE = '#FF86B5'
const JAM = '#B0176B'
const RASPBERRY = '#FF51B9'
const BERKSHIRE = '"Berkshire Swash", Georgia, serif'
const DM_SANS = '"DM Sans", system-ui, sans-serif'

export interface NanaLogoProps {
  /** Diâmetro da mascote em px. O wordmark escala junto. Default 36. */
  size?: number
  /** Mostra o slogan "bottons de cultura pop". Default false. */
  showSlogan?: boolean
  /** Só a mascote, sem o wordmark. Default false. */
  iconOnly?: boolean
  /**
   * Contexto de fundo. Muda só o wordmark — o avatar é sempre o mesmo.
   * - "light" (padrão) — sobre branco/pó de açúcar: wordmark em geleia.
   * - "ink" — sobre tinta: wordmark em glacê.
   */
  tone?: 'light' | 'ink'
  className?: string
}

/**
 * Logo institucional da Nanita: avatar da Nana + wordmark em Berkshire Swash.
 *
 * O símbolo é sempre o **avatar glacê** — rosto rosa, traços em tinta, laço de
 * framboesa (board "02 · Avatar Nana — Antes / Depois", coluna "Depois"). O tom
 * reverso do `NanaMascot` fica só para aplicações onde a mascote precisa virar
 * ícone monocromático (favicon).
 *
 * O wordmark é o único lugar onde Berkshire Swash aparece. Em texto corrido a
 * marca é escrita em Fredoka ou DM Sans como qualquer outra palavra.
 */
export function NanaLogo({
  size = 36,
  showSlogan = false,
  iconOnly = false,
  tone = 'light',
  className,
}: NanaLogoProps) {
  // Com o avatar em glacê, o wordmark precisa carregar o contraste do conjunto:
  // sobre branco ele vai de geleia (6,6:1), não de glacê — senão o lockup inteiro
  // vira um rosa pálido só. Sobre tinta, glacê já tem contraste de sobra.
  const wordColor = tone === 'ink' ? GLAZE : JAM
  const wordSize = Math.round(size * 0.83)
  const sloganSize = Math.max(10, Math.round(size * 0.28))

  return (
    <span className={cn('inline-flex items-center', className)} style={{ gap: Math.round(size * 0.33) }}>
      <NanaMascot size={size} expression="happy" tone="glaze" />

      {!iconOnly && (
        <span className="inline-flex flex-col" style={{ gap: Math.round(size * 0.1) }}>
          <span
            style={{
              fontFamily: BERKSHIRE,
              fontWeight: 400,
              fontSize: wordSize,
              lineHeight: 1.26,
              color: wordColor,
            }}
          >
            Nanita
          </span>

          {showSlogan && (
            <span className="inline-flex items-center" style={{ gap: 6 }}>
              <span
                style={{
                  width: sloganSize * 1.3,
                  height: 2,
                  borderRadius: 2,
                  background: RASPBERRY,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: DM_SANS,
                  fontWeight: 500,
                  fontSize: sloganSize,
                  lineHeight: 1,
                  letterSpacing: '0.02em',
                  color: tone === 'ink' ? 'rgba(255,255,255,0.62)' : '#7A5C6B',
                  whiteSpace: 'nowrap',
                }}
              >
                bottons de cultura pop
              </span>
            </span>
          )}
        </span>
      )}
    </span>
  )
}

export default NanaLogo
