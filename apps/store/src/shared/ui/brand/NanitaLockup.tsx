import { DESCRIPTOR_D, LOCKUP_RATIO, WORDMARK_D } from './paths'
import { NanitaWordmark, type BrandTone } from './NanitaWordmark'

/**
 * **Piso do lockup: 140px de largura** (prancha 21).
 *
 * O descritor tem 45 unidades de caixa alta em 690 de largura. Abaixo de 140px
 * ele cai para 9px e deixa de ser texto — vira textura. Menor que isso, use o
 * wordmark sem descritor, que é o que este componente faz sozinho.
 */
export const LOCKUP_FLOOR = 140

/**
 * Wordmark e descritor têm cores independentes — e sobre Grafite isso importa.
 *
 * **`ink` é a marca EM Grafite, para superfície clara — não é "sobre Grafite".**
 * Quem quer superfície Grafite pede `onInk`. Os dois mapas discordavam nesse
 * ponto: aqui o wordmark de `ink` saía Grafite (a tinta) e o descritor saía
 * Dobra (a superfície), então metade do lockup do rodapé lia a 11,72:1 e a outra
 * metade a **1,00:1**. Era o "Nanita" invisível no rodapé da loja.
 */
const WORDMARK_FILL: Record<BrandTone, string> = {
  brand: '#F1678D', // Carimbo
  ink: '#2E2028', // Grafite — superfície CLARA
  paper: '#F9F1EE', // Papel
  onInk: '#F1678D', // Carimbo sobre Grafite — 5,22:1
  mono: 'currentColor',
}

/**
 * **Sobre Grafite o descritor é Dobra, não Carbono.**
 *
 * Carbono (`#7E5769`) sobre Grafite dá **2,55:1** — o descritor simplesmente
 * desaparece, e o lockup vira um wordmark com uma sombra embaixo. Dobra
 * (`#EBDDD7`) lê a 11,72:1. É a única diferença de cor entre `brand` e `onInk`,
 * e está congelada na suíte de paleta.
 */
const DESCRIPTOR_FILL: Record<BrandTone, string> = {
  brand: '#7E5769', // Carbono — sobre Papel
  ink: '#7E5769', // Carbono — `ink` também é superfície clara, só com a marca pesada
  paper: '#EBDDD7',
  onInk: '#EBDDD7', // Dobra — sobre Grafite. NÃO Carbono.
  mono: 'currentColor',
}

export interface NanitaLockupProps {
  /** Largura em px. A altura sai da proporção 2,90:1. */
  width: number
  /** `onInk` significa "sobre superfície Grafite" — é o rodapé da loja. */
  tone?: BrandTone
  className?: string
}

/**
 * O lockup completo — wordmark + "PERSONALIZADOS" (prancha 18).
 *
 * **O rodapé é o lugar dele na loja.** Em 150px está acima do piso, e ali o
 * descritor ainda cumpre a única função que tem: dizer o que a loja vende. No
 * header não cabe — na altura de 40px o lockup mede 116px de largura, 24px
 * abaixo do próprio piso.
 *
 * Abaixo de 140px cai para o wordmark, que tem piso próprio e sabe cair de novo
 * para o monograma.
 */
export function NanitaLockup({ width, tone = 'brand', className }: NanitaLockupProps) {
  if (width < LOCKUP_FLOOR) {
    return <NanitaWordmark width={width} tone={tone} className={className} />
  }

  return (
    <svg
      role="img"
      aria-label="Nanita Personalizados"
      viewBox="0 0 690.06 237.8"
      width={width}
      height={Math.round((width / LOCKUP_RATIO) * 100) / 100}
      className={className}
    >
      <title>Nanita Personalizados</title>
      <path fillRule="evenodd" d={WORDMARK_D} fill={WORDMARK_FILL[tone]} />
      <path fillRule="evenodd" d={DESCRIPTOR_D} fill={DESCRIPTOR_FILL[tone]} />
    </svg>
  )
}

export default NanitaLockup
