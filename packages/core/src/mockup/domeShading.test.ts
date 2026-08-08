import { describe, expect, it } from 'vitest'
import {
  buildShadingGrid,
  evalShading,
  extractShadingModel,
  faceShadingFactor,
  fitShadingModel,
  shadingBasis,
} from './domeShading'

// O sombreamento é medido no fundo do template e reaplicado sobre a arte. Os testes
// cobrem as partes puras (grade percentil + ajuste polinomial), que são onde mora a
// lógica; a cola de canvas degrada para "sem sombreamento" e é coberta pelo teste de
// ambiente sem pixels no fim.

// Amostra um campo de luminância conhecido sobre o disco unitário.
function sampleField(f: (u: number, v: number) => number, n = 120) {
  const out: { u: number; v: number; lum: number }[] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const u = (i + 0.5) / n * 2 - 1
      const v = (j + 0.5) / n * 2 - 1
      if (u * u + v * v >= 1) continue
      out.push({ u, v, lum: f(u, v) })
    }
  }
  return out
}

function modelFrom(f: (u: number, v: number) => number) {
  const grid = buildShadingGrid(sampleField(f))
  expect(grid).not.toBeNull()
  const model = fitShadingModel(grid!)
  expect(model).not.toBeNull()
  return model!
}

describe('shadingBasis', () => {
  it('tem 7 termos e é neutra no centro', () => {
    expect(shadingBasis(0, 0)).toEqual([1, 0, 0, 0, 0, 0, 0])
    expect(shadingBasis(0.5, -0.25)).toHaveLength(7)
  })
})

describe('buildShadingGrid', () => {
  it('normaliza a grade em torno de 1', () => {
    const grid = buildShadingGrid(sampleField(() => 200))!
    const flat = grid.flat()
    for (const v of flat) expect(v).toBeCloseTo(1, 6)
  })

  it('rejeita tinta escura: percentil alto recupera o substrato', () => {
    // Substrato uniforme 240 com "tinta" escura cobrindo ~40% do disco. A média cairia
    // para ~150; o percentil tem de devolver o substrato, senão a arte antiga do template
    // vaza como sombreamento na arte nova.
    const hash = (u: number, v: number) => {
      const x = Math.sin(u * 127.1 + v * 311.7) * 43758.5453
      return x - Math.floor(x)
    }
    const grid = buildShadingGrid(sampleField((u, v) => (hash(u, v) < 0.4 ? 20 : 240)))!
    for (const v of grid.flat()) {
      expect(v).toBeGreaterThan(0.95)
      expect(v).toBeLessThan(1.05)
    }
  })

  it('devolve null quando há amostras de menos para preencher a grade', () => {
    expect(buildShadingGrid([{ u: 0, v: 0, lum: 100 }])).toBeNull()
  })
})

describe('fitShadingModel + evalShading', () => {
  it('recupera um gradiente vertical (topo mais claro) ancorado no ponto mais claro', () => {
    // v é para baixo: luminância cai conforme v cresce → topo mais claro.
    const model = modelFrom((_u, v) => 220 - 30 * v)
    const top = evalShading(model, 0, -0.7)
    const bottom = evalShading(model, 0, 0.7)
    expect(top).toBeGreaterThan(bottom)
    // Âncora no quantil alto: o topo fica ~1 e o resto abaixo (sombreamento só escurece).
    expect(evalShading(model, 0, -0.95)).toBeGreaterThan(0.95)
    expect(evalShading(model, 0, -0.95)).toBeLessThan(1.1)
    expect(evalShading(model, 0, 0)).toBeLessThan(1)
  })

  it('recupera curvatura radial (borda mais clara que o centro), borda ~1', () => {
    const model = modelFrom((u, v) => 200 + 40 * (u * u + v * v))
    expect(evalShading(model, 0, 0)).toBeLessThan(evalShading(model, 0.9, 0))
    expect(evalShading(model, 0.95, 0)).toBeGreaterThan(0.9)
    expect(evalShading(model, 0.95, 0)).toBeLessThan(1.1)
  })

  it('campo plano → fator ~1 em todo o disco', () => {
    const model = modelFrom(() => 180)
    for (const [u, v] of [[0, 0], [0.5, 0.5], [-0.8, 0.2], [0, 0.95]]) {
      expect(evalShading(model, u, v)).toBeCloseTo(1, 3)
    }
  })

  it('é liso: não reproduz detalhe de alta frequência (impossível "vazar" a arte antiga)', () => {
    // Campo com xadrez de alta frequência sobre um fundo plano.
    const model = modelFrom((u, v) => 200 + (Math.sin(u * 40) * Math.sin(v * 40) > 0 ? 45 : 0))
    // Dois pontos vizinhos cairiam em quadrados opostos do xadrez; o modelo ajustado
    // deve dar praticamente o mesmo valor nos dois.
    const a = evalShading(model, 0.20, 0.20)
    const b = evalShading(model, 0.24, 0.24)
    expect(Math.abs(a - b)).toBeLessThan(0.02)
  })

  it('devolve null para grade vazia', () => {
    expect(fitShadingModel([])).toBeNull()
  })
})

describe('faceShadingFactor', () => {
  it('neutro no ponto mais claro, fora da borda', () => {
    expect(faceShadingFactor(1, 0, 1)).toBe(1)
  })

  it('aplica piso físico: contaminação por estampa não escurece além do plausível', () => {
    // fit 0.5 (centro medido através de tinta) → tratado como 0.88, não 0.5.
    expect(faceShadingFactor(0.5, 0, 1)).toBeCloseTo(0.88, 6)
    // acima do piso, passa direto
    expect(faceShadingFactor(0.92, 0, 1)).toBeCloseTo(0.92, 6)
  })

  it('assenta a borda: escurecimento extra só no anel final', () => {
    const face = faceShadingFactor(1, 0.9 * 0.9, 1) // r=0.90 < início do anel
    const edge = faceShadingFactor(1, 1, 1) // r=1.0
    expect(face).toBe(1)
    expect(edge).toBeCloseTo(1 - 0.13, 6)
  })

  it('ganho escala o desvio a partir do piso', () => {
    expect(faceShadingFactor(0.9, 0, 2)).toBeCloseTo(0.8, 6)
    // ganho 0 → fator neutro na face (sombreamento desligado)
    expect(faceShadingFactor(0.9, 0, 0)).toBe(1)
  })
})

describe('extractShadingModel', () => {
  it('devolve null (segue sem sombreamento) quando não há leitura de pixels', () => {
    const zone = { shape: 'ellipse' as const, cx: 400, cy: 300, rx: 200, ry: 150, rotation: 0 }
    expect(extractShadingModel({} as CanvasImageSource, zone)).toBeNull()
  })

  it('devolve null para zona degenerada', () => {
    const zone = { shape: 'circle' as const, cx: 10, cy: 10, rx: 0, ry: 0, rotation: 0 }
    expect(extractShadingModel({} as CanvasImageSource, zone)).toBeNull()
  })
})
