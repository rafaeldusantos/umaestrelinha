// === Mockup templates (mirror public.mockup_templates) ===

export type ArtZoneShape = 'circle' | 'ellipse'

export type MockupBlendMode = 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'normal'

// Área onde a arte é aplicada sobre o fundo, em coords normalizadas 0..1 (resolução-independente).
export interface ArtZone {
  shape: ArtZoneShape
  cx: number // centro X normalizado 0..1
  cy: number // centro Y normalizado 0..1
  rx: number // raio X normalizado 0..1 (circle: rx = ry)
  ry: number // raio Y normalizado 0..1
  rotation: number // graus
}

export interface MockupTemplate {
  id: string
  name: string
  background_url: string
  overlay_url: string | null
  art_zone: ArtZone
  blend_mode: MockupBlendMode
  // Ganho do sombreamento procedural do domo (0 = desligado, 1 = luz medida da foto).
  shading_gain: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}
