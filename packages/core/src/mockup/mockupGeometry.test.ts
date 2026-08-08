import { describe, expect, it } from 'vitest'
import {
  resolveArtZone,
  pxZoneToArtZone,
  clampArtZone,
  coverFitTransform,
} from './mockupGeometry'

// ENG-03: art-zone normalizada 0..1 → pixels do fundo (circle e ellipse).
// ENG-05: cover-fit por padrão (arte cobre a zona) + transform do usuário sobre o baseline.
// Edge case: valores fora de 0..1 são clampados antes de salvar.
// Done-when: ida-e-volta px↔normalizado (usado pelo ArtZoneEditor).

describe('resolveArtZone', () => {
  it('mapeia um círculo normalizado para pixels (basis por eixo)', () => {
    const px = resolveArtZone(
      { shape: 'circle', cx: 0.5, cy: 0.5, rx: 0.25, ry: 0.25, rotation: 0 },
      400,
      400,
    )
    expect(px).toEqual({ shape: 'circle', cx: 200, cy: 200, rx: 100, ry: 100, rotation: 0 })
  })

  it('mapeia uma elipse em fundo não-quadrado, preservando shape e rotation', () => {
    const px = resolveArtZone(
      { shape: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.25, ry: 0.125, rotation: 30 },
      800,
      400,
    )
    // cx/rx escalam por largura; cy/ry por altura
    expect(px).toEqual({ shape: 'ellipse', cx: 400, cy: 200, rx: 200, ry: 50, rotation: 30 })
  })
})

describe('pxZoneToArtZone (inverso)', () => {
  it('faz o round-trip exato de uma elipse em fundo não-quadrado', () => {
    const zone = { shape: 'ellipse' as const, cx: 0.5, cy: 0.25, rx: 0.375, ry: 0.125, rotation: 42 }
    const px = resolveArtZone(zone, 800, 400)
    expect(pxZoneToArtZone(px, 800, 400)).toEqual(zone)
  })

  it('faz o round-trip de valores não exatos com precisão', () => {
    const zone = { shape: 'circle' as const, cx: 0.3, cy: 0.7, rx: 0.15, ry: 0.15, rotation: 10 }
    const back = pxZoneToArtZone(resolveArtZone(zone, 1000, 1000), 1000, 1000)
    expect(back.cx).toBeCloseTo(0.3, 10)
    expect(back.cy).toBeCloseTo(0.7, 10)
    expect(back.rx).toBeCloseTo(0.15, 10)
    expect(back.ry).toBeCloseTo(0.15, 10)
    expect(back.shape).toBe('circle')
    expect(back.rotation).toBe(10)
  })
})

describe('clampArtZone', () => {
  it('limita cx/cy/rx/ry a [0,1] e não altera shape nem rotation', () => {
    const clamped = clampArtZone({
      shape: 'ellipse',
      cx: 1.5,
      cy: -0.2,
      rx: 2,
      ry: -1,
      rotation: 400,
    })
    expect(clamped).toEqual({ shape: 'ellipse', cx: 1, cy: 0, rx: 1, ry: 0, rotation: 400 })
  })

  it('mantém valores já dentro de [0,1] inalterados', () => {
    const zone = { shape: 'circle' as const, cx: 0.3, cy: 0.7, rx: 0.2, ry: 0.2, rotation: 15 }
    expect(clampArtZone(zone)).toEqual(zone)
  })
})

describe('coverFitTransform', () => {
  it('arte MENOR que a zona: escala p/ cobrir (baseline), sem transform', () => {
    // zona 200x200 (rx=ry=100); arte 50x50 → cover = max(200/50, 200/50) = 4
    const fit = coverFitTransform(50, 50, { shape: 'circle', cx: 0, cy: 0, rx: 100, ry: 100, rotation: 0 })
    expect(fit).toEqual({ scale: 4, dx: 0, dy: 0, rotation: 0 })
  })

  it('arte MAIOR que a zona: reduz p/ cobrir', () => {
    // zona 200x200; arte 400x400 → cover = max(0.5, 0.5) = 0.5
    const fit = coverFitTransform(400, 400, { shape: 'circle', cx: 0, cy: 0, rx: 100, ry: 100, rotation: 0 })
    expect(fit.scale).toBe(0.5)
  })

  it('aspecto não-uniforme: cover usa o MAIOR ratio (cobre, não cabe)', () => {
    // zona 200x100 (rx=100, ry=50); arte 100x200 → scaleX=2, scaleY=0.5 → cover = 2
    const fit = coverFitTransform(100, 200, { shape: 'ellipse', cx: 0, cy: 0, rx: 100, ry: 50, rotation: 0 })
    expect(fit.scale).toBe(2)
  })

  it('aplica o transform do usuário sobre o baseline cover-fit', () => {
    // baseline cover = 4; scale usuário 1.5 → 6; offsets/rotation repassados
    const fit = coverFitTransform(
      50,
      50,
      { shape: 'circle', cx: 0, cy: 0, rx: 100, ry: 100, rotation: 0 },
      { scale: 1.5, offsetX: 10, offsetY: -5, rotation: 30 },
    )
    expect(fit).toEqual({ scale: 6, dx: 10, dy: -5, rotation: 30 })
  })

  it('transform parcial usa defaults (scale=1, offsets=0, rotation=0)', () => {
    const fit = coverFitTransform(
      50,
      50,
      { shape: 'circle', cx: 0, cy: 0, rx: 100, ry: 100, rotation: 0 },
      { offsetX: 20 },
    )
    expect(fit).toEqual({ scale: 4, dx: 20, dy: 0, rotation: 0 })
  })
})
