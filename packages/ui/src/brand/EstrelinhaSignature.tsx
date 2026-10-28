import { SIGNATURE } from './paths'
import { EstrelinhaSymbol } from './EstrelinhaSymbol'
import { BrandSvg, type BrandTone } from './BrandSvg'

/**
 * **Piso da assinatura: 190px de largura.**
 *
 * Reduzir esta marca não borra a letra — **apaga a linha**. O traço mais fino
 * que carrega estrutura é o da marca (lua e estrela): 2,4 num quadro de 450,06,
 * ou 0,533% da largura. A 190px ele rende **1,01px**; abaixo disso não ocupa um
 * pixel inteiro e sai como cinza de antialias, não como a cor da marca.
 *
 * O board da loja (`5MC-0`) reserva **202×48** para a marca no header — acima
 * deste piso, e é de onde o número de uso vem.
 */
export const SIGNATURE_FLOOR = 190

export interface EstrelinhaSignatureProps {
  /** Largura em px. A altura sai da proporção 4,61:1 — não se passa altura. */
  width: number
  tone?: BrandTone
  className?: string
}

/**
 * A assinatura visual — marca + tipografia, sem a linha "ETERNIZANDO SUAS
 * LEMBRANÇAS" (prancha `734-0`, "01 · LOGO COMPLETO").
 *
 * **É a marca do chrome da loja**: header, folha do menu, checkout e auth.
 *
 * Abaixo do piso ela cai para o símbolo, **na mesma altura** — nunca renderiza
 * a assinatura borrada. É por isso que o header do celular e o do desktop
 * mostram marcas diferentes: a 150px a assinatura teria 0,80px de traço, e o
 * que aparece ali é o símbolo, que é o que o board mobile (`6AU-0`) desenha.
 */
export function EstrelinhaSignature({
  width,
  tone = 'brand',
  className,
}: EstrelinhaSignatureProps) {
  if (width < SIGNATURE_FLOOR) {
    // A altura é o que se preserva na queda: o degrau de baixo ocupa a mesma
    // faixa vertical, não a mesma largura. Passar `width` aqui devolveria um
    // símbolo 4,6× mais alto que a assinatura que ele substitui.
    return (
      <EstrelinhaSymbol
        size={Math.round((width / SIGNATURE.ratio) * 100) / 100}
        tone={tone}
        className={className}
      />
    )
  }

  return (
    <BrandSvg
      art={SIGNATURE}
      label="Uma Estrelinha"
      width={width}
      tone={tone}
      className={className}
    />
  )
}

export default EstrelinhaSignature
