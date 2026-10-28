import { useId, type CSSProperties } from 'react'
import { EstrelinhaSymbol } from '@estrelinha/ui/brand'
import {
  INSTAGRAM_GLYPH_STOPS,
  INSTAGRAM_RING_GRADIENT,
} from '@/shared/config/instagram'

/**
 * As duas marcas do Instagram no convite (V2): o ícone colorido ao lado do rótulo e o anel de story
 * em volta do avatar. As duas são decorativas — o rótulo "NO INSTAGRAM" e o @ já dizem o que elas
 * dizem —, então saem do leitor de tela.
 */

/**
 * O ícone do Instagram com o gradiente do app: o quadrado arredondado preenchido, com a câmera em
 * traço branco por cima. O gradiente é radial, saindo do canto inferior esquerdo (amarelo) para o
 * superior direito (azul), que é o desenho do ícone oficial.
 */
export const InstagramGlyph = ({ size = 28 }: { size?: number }) => {
  // `useId` devolve `:r0:`; os dois-pontos não são problema para o React, mas `url(#…)` com eles é
  // frágil em alguns navegadores — o id do gradiente sai só com letras e números.
  const id = `ig-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const ultima = INSTAGRAM_GLYPH_STOPS.length - 1

  return (
    <svg
      aria-hidden
      data-testid="glifo-instagram"
      width={size}
      height={size}
      viewBox="0 0 28 28"
      className="shrink-0"
    >
      <defs>
        <radialGradient id={id} cx="30%" cy="107%" r="130%">
          {INSTAGRAM_GLYPH_STOPS.map((cor, i) => (
            <stop key={cor} offset={`${Math.round((i / ultima) * 100)}%`} stopColor={cor} />
          ))}
        </radialGradient>
      </defs>
      <rect width="28" height="28" rx="8" fill={`url(#${id})`} />
      <rect x="6.5" y="6.5" width="15" height="15" rx="4.5" fill="none" stroke="#FFFFFF" strokeWidth="1.75" />
      <circle cx="14" cy="14" r="3.6" fill="none" stroke="#FFFFFF" strokeWidth="1.75" />
      <circle cx="18.6" cy="9.4" r="1.05" fill="#FFFFFF" />
    </svg>
  )
}

/**
 * O avatar do perfil com o anel de story. Dentro vai o avatar claro das redes — o mesmo que o perfil
 * usa —, e não uma foto: não há foto da Adri no repositório, e foto inventada não entra
 * (`plan.md`, pergunta 10).
 */
export const InstagramAvatar = () => (
  <span
    aria-hidden
    data-testid="anel-de-story"
    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full [background-image:var(--ig-gradiente)]"
    // Variável e não `backgroundImage` direto: o jsdom descarta `linear-gradient` do estilo em
    // silêncio, e o teste não teria como provar que o anel recebe o gradiente do dono.
    style={{ '--ig-gradiente': INSTAGRAM_RING_GRADIENT } as CSSProperties}
  >
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-estrelinha-surface">
      {/* O avatar claro das redes (Paper, board da marca, "Avatar claro"): `ground`, fio `line` e o
          símbolo positivo a 52% do círculo. Abaixo de 48px o próprio símbolo troca para a arte
          reduzida — a regra é do componente, não daqui. */}
      <span
        data-testid="avatar-das-redes"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-estrelinha-line bg-estrelinha-ground"
      >
        <EstrelinhaSymbol size={20} />
      </span>
    </span>
  </span>
)
