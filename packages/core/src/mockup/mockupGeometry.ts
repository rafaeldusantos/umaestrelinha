import type { ArtZone } from '@estrelinha/supabase/types/mockup'
import type { ArtTransform, PxZone } from './types'

// Mapeia uma art-zone normalizada (0..1) para pixels do fundo. ENG-03.
// cx/rx escalam pela largura; cy/ry pela altura (round-trip exato com pxZoneToArtZone).
export function resolveArtZone(zone: ArtZone, bgW: number, bgH: number): PxZone {
  return {
    shape: zone.shape,
    cx: zone.cx * bgW,
    cy: zone.cy * bgH,
    rx: zone.rx * bgW,
    ry: zone.ry * bgH,
    rotation: zone.rotation,
  }
}

// Inverso de resolveArtZone: pixels do fundo → normalizado (0..1). Usado pelo ArtZoneEditor.
export function pxZoneToArtZone(zone: PxZone, bgW: number, bgH: number): ArtZone {
  return {
    shape: zone.shape,
    cx: zone.cx / bgW,
    cy: zone.cy / bgH,
    rx: zone.rx / bgW,
    ry: zone.ry / bgH,
    rotation: zone.rotation,
  }
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

// Limita as coords normalizadas da art-zone a [0,1] antes de salvar (edge case).
// rotation (graus) não é uma coord normalizada e é preservada.
export function clampArtZone(zone: ArtZone): ArtZone {
  return {
    shape: zone.shape,
    cx: clamp01(zone.cx),
    cy: clamp01(zone.cy),
    rx: clamp01(zone.rx),
    ry: clamp01(zone.ry),
    rotation: zone.rotation,
  }
}

// Baseline "cover-fit" (a arte cobre a art-zone) + ajustes manuais do usuário. ENG-05.
// O baseline usa o MAIOR ratio para cobrir a zona; o transform do usuário multiplica a
// escala e repassa offset/rotação.
export function coverFitTransform(
  artW: number,
  artH: number,
  zone: PxZone,
  t?: Partial<ArtTransform>,
): { scale: number; dx: number; dy: number; rotation: number } {
  const zoneW = zone.rx * 2
  const zoneH = zone.ry * 2
  const baseScale = Math.max(zoneW / artW, zoneH / artH)
  return {
    scale: baseScale * (t?.scale ?? 1),
    dx: t?.offsetX ?? 0,
    dy: t?.offsetY ?? 0,
    rotation: t?.rotation ?? 0,
  }
}
