import type { ComposeInput, ComposeResult } from './types'
import { coverFitTransform, resolveArtZone } from './mockupGeometry'
import { applyShading, DEFAULT_SHADING_GAIN, extractShadingModel } from './domeShading'

const DEG_TO_RAD = Math.PI / 180

const intrinsicW = (img: HTMLImageElement): number => img.naturalWidth || img.width
const intrinsicH = (img: HTMLImageElement): number => img.naturalHeight || img.height

// Rotina de desenho: recebe um ctx (CanvasRenderingContext2D) e compõe a mockup.
// Separada de composeMockup para ser testável com um ctx fake (sem DOM). ENG-01/ENG-04.
export function drawMockup(
  ctx: CanvasRenderingContext2D,
  input: ComposeInput,
  bgW: number,
  bgH: number,
): void {
  const { background, art, overlay, artZone, transform, blendMode, shadingGain } = input

  // 1. Fundo na resolução natural
  ctx.drawImage(background, 0, 0, bgW, bgH)

  // 2. Arte recortada na art-zone (elipse) + transform (cover-fit + ajustes)
  const zone = resolveArtZone(artZone, bgW, bgH)
  const artW = intrinsicW(art)
  const artH = intrinsicH(art)
  const fit = coverFitTransform(artW, artH, zone, transform)

  // Sombreamento medido no fundo ANTES de a arte cobrir a art-zone (depois já é tarde).
  // Só vale medir se o ganho não zera o efeito e se este ctx souber reaplicar (pixels);
  // null → composição segue chapada.
  const gain = shadingGain ?? DEFAULT_SHADING_GAIN
  const canApplyShading =
    gain > 0 && typeof ctx.getImageData === 'function' && typeof ctx.putImageData === 'function'
  const shading = canApplyShading ? extractShadingModel(background, zone) : null

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(zone.cx, zone.cy, zone.rx, zone.ry, zone.rotation * DEG_TO_RAD, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  const w = artW * fit.scale
  const h = artH * fit.scale
  ctx.translate(zone.cx + fit.dx, zone.cy + fit.dy)
  // A estampa fica RETA na tela (como no produto real fotografado de frente) — a rotação
  // da art-zone orienta só a elipse do clip e o sombreamento, não o print. Só o ajuste
  // manual do usuário (fit.rotation) gira a arte.
  ctx.rotate(fit.rotation * DEG_TO_RAD)
  ctx.drawImage(art, -w / 2, -h / 2, w, h)
  ctx.restore()

  // 3. Reaplica sobre a arte a luz que a foto tinha ali (curvatura, borda, sombra).
  // Fora do clip porque escreve pixels direto (putImageData ignora clip); a própria
  // função limita a escrita ao interior da elipse.
  if (shading) applyShading(ctx, zone, shading, gain)

  // 4. Overlay com blend — só quando há overlay (ENG-04)
  if (overlay) {
    ctx.globalCompositeOperation = (blendMode ?? 'multiply') as GlobalCompositeOperation
    ctx.drawImage(overlay, 0, 0, bgW, bgH)
  }
}

// Compõe a arte sobre o template em um canvas na resolução natural do fundo (ENG-06),
// exportável sem SecurityError quando as imagens vêm de loadImage (ENG-02).
export function composeMockup(input: ComposeInput): ComposeResult {
  const bgW = intrinsicW(input.background)
  const bgH = intrinsicH(input.background)

  const canvas = document.createElement('canvas')
  canvas.width = bgW
  canvas.height = bgH
  const ctx = canvas.getContext('2d')!

  drawMockup(ctx, input, bgW, bgH)

  return {
    canvas,
    toDataURL: (type = 'image/png', quality?: number) => canvas.toDataURL(type, quality),
    toBlob: (type = 'image/png', quality?: number) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob retornou null'))),
          type,
          quality,
        )
      }),
  }
}
