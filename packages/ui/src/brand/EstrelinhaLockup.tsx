import { LOCKUP } from './paths'
import { EstrelinhaSignature } from './EstrelinhaSignature'
import { BrandSvg, type BrandTone } from './BrandSvg'

/**
 * **Piso do lockup: 600px de largura.**
 *
 * Quem quebra primeiro é a assinatura — "ETERNIZANDO SUAS LEMBRANÇAS", 25
 * glifos a traço **1,5** num quadro de 900, ou 0,167% da largura. A 600px o
 * traço rende **1,00px** e a caixa alta mede 10px; a 400px o traço cai para
 * 0,67px e a linha inteira vira uma sombra cinza sob a tipografia.
 *
 * **Isso põe o lockup fora do chrome da loja, e é um resultado, não um
 * descuido.** A coluna de marca do rodapé no board (`5MC-0`) tem 337px e a
 * viewport principal do projeto tem 390px: em nenhuma das duas cabe um desenho
 * de 600px. O lockup é o formato de e-mail, papelaria e embalagem — quem
 * assina a loja na tela é a `EstrelinhaSignature`.
 */
export const LOCKUP_FLOOR = 600

export interface EstrelinhaLockupProps {
  /** Largura em px. A altura sai da proporção 3,67:1. */
  width: number
  tone?: BrandTone
  className?: string
}

/**
 * O logotipo completo — marca + tipografia + assinatura (prancha `78R-0`).
 *
 * Abaixo de 600px cai para a assinatura visual, que tem piso próprio e sabe
 * cair de novo para o símbolo.
 */
export function EstrelinhaLockup({ width, tone = 'brand', className }: EstrelinhaLockupProps) {
  if (width < LOCKUP_FLOOR) {
    return <EstrelinhaSignature width={width} tone={tone} className={className} />
  }

  return (
    <BrandSvg
      art={LOCKUP}
      label="Uma Estrelinha — Eternizando suas lembranças"
      width={width}
      tone={tone}
      className={className}
    />
  )
}

export default EstrelinhaLockup
