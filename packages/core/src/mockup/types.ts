import type { ArtZone, ArtZoneShape, MockupBlendMode } from '@nanapin/supabase/types/mockup'

// Art-zone resolvida para pixels do fundo (via resolveArtZone).
export interface PxZone {
  shape: ArtZoneShape
  cx: number
  cy: number
  rx: number
  ry: number
  rotation: number
}

// Ajuste manual da arte sobre o baseline cover-fit.
export interface ArtTransform {
  scale: number
  offsetX: number
  offsetY: number
  rotation: number
}

export interface ComposeInput {
  background: HTMLImageElement
  art: HTMLImageElement
  overlay?: HTMLImageElement | null
  artZone: ArtZone
  transform?: Partial<ArtTransform>
  blendMode?: MockupBlendMode
  // Ganho do sombreamento do domo (0 = desligado, 1 = luz medida da foto). Default 1.
  shadingGain?: number
}

export interface ComposeResult {
  canvas: HTMLCanvasElement
  toBlob: (type?: string, quality?: number) => Promise<Blob>
  toDataURL: (type?: string, quality?: number) => string
}
