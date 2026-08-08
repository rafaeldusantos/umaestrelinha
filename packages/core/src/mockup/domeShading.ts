import type { PxZone } from './types'

// Sombreamento de domo derivado do PRÓPRIO fundo do template.
//
// Por que não constantes fixas: a arte é desenhada chapada sobre a foto e apaga a
// iluminação real que a foto já tem naquela região (curvatura, brilho da borda, sombra).
// Em vez de inventar gradientes, medimos o sombreamento do substrato na foto e o
// reaplicamos sobre a arte — assim cada template usa a sua própria luz.
//
// Por que percentil + ajuste polinomial: a foto do template pode já ter uma arte impressa.
// O percentil alto por célula polar descarta a tinta (mais escura que o substrato) e o
// ajuste de baixa ordem (7 termos) é liso por construção — não consegue representar
// detalhe de impressão, então é impossível a arte antiga "vazar" na nova.

const DEG_TO_RAD = Math.PI / 180

// Resolução de amostragem do fundo dentro da art-zone: barata, mas densa o bastante
// para o percentil separar substrato de tinta.
const SAMPLE_SIZE = 192
const N_RADIAL = 16
const N_ANGULAR = 32
// 0.90 (e não menos): em templates com arte impressa densa no centro, um percentil mais
// baixo ainda cai em tinta e escurece o modelo onde deveria ser substrato.
const PERCENTILE = 0.9
const SMOOTH_PASSES = 3
// Base polinomial: [1, u, v, u², uv, v², r⁴].
const BASIS_N = 7
// O modelo é ancorado no seu quantil alto sobre o disco (≈ ponto mais claro), não na
// média: assim o sombreamento SÓ escurece (fator ≤ ~1), como iluminação real. Ancorar
// na média deixa metade do disco com fator > 1 — arte clara satura em branco chapado
// (a foto de referência nunca chega a 255).
const ANCHOR_QUANTILE = 0.95

// Intensidade do sombreamento reaplicado. 1 = reproduz a iluminação medida na foto —
// que é o objetivo: a arte colada fica com a MESMA luz do resto da foto. Exagerar
// (ex.: 2) suja o centro de arte clara e lava as cores perto da borda.
export const DEFAULT_SHADING_GAIN = 1

// Assentamento sob a "aba" do botton: escurecimento extra só nos últimos 6% do raio.
const EDGE_START = 0.94
const EDGE_DARK = 0.13

// Piso físico da face: um botton convexo raso varia ~10-12% de luminância na face (fora
// da borda). Em templates cujo fundo JÁ tem estampa densa no centro, o percentil ainda
// mede tinta em vez de substrato e exagera o escuro central ("sombra no centro") — o
// piso limita o modelo ao fisicamente plausível, qualquer que seja o template.
const MIN_FACE_SHADING = 0.88

// Fator final de um pixel da face: piso físico + ganho + assentamento de borda + clamps.
// (O teto por headroom de cor é aplicado à parte, no loop, pois depende do pixel.)
export function faceShadingFactor(fit: number, r2: number, gain: number): number {
  const f = fit < MIN_FACE_SHADING ? MIN_FACE_SHADING : fit
  let s = 1 + (f - 1) * gain
  if (r2 > EDGE_START * EDGE_START) {
    const t = (Math.sqrt(r2) - EDGE_START) / (1 - EDGE_START)
    s *= 1 - EDGE_DARK * t * t
  }
  if (s < 0.25) s = 0.25
  else if (s > 2) s = 2
  return s
}

export interface ShadingModel {
  coef: number[]
  // Valor de normalização (quantil ANCHOR_QUANTILE do ajuste sobre o disco).
  anchor: number
}

// Bins radiais de ÁREA igual (bordas em √(i/n)), não de raio igual: com raio igual as
// células centrais cobrem uma área minúscula, ficam com pouquíssimas amostras e o
// percentil delas vira ruído. Com área igual toda célula tem ~o mesmo nº de amostras,
// e a média simples da grade já é a média por área.
const radialBin = (rn: number, nr: number): number => Math.min(nr - 1, Math.floor(rn * rn * nr))
const cellRadius = (i: number, nr: number): number => Math.sqrt((i + 0.5) / nr)

export function shadingBasis(u: number, v: number): number[] {
  const r2 = u * u + v * v
  return [1, u, v, u * u, u * v, v * v, r2 * r2]
}

// Fator de sombreamento em coords locais da elipse (u,v ∈ [-1,1]).
// ~1 no ponto mais claro do domo; < 1 no restante (só escurece).
export function evalShading(model: ShadingModel, u: number, v: number): number {
  const f = shadingBasis(u, v)
  let acc = 0
  for (let i = 0; i < BASIS_N; i++) acc += model.coef[i] * f[i]
  return acc / model.anchor
}

// Eliminação de Gauss com pivotamento parcial. null se o sistema for singular.
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r
    if (Math.abs(A[piv][c]) < 1e-12) return null
    ;[A[c], A[piv]] = [A[piv], A[c]]
    ;[b[c], b[piv]] = [b[piv], b[c]]
    const d = A[c][c]
    for (let q = c; q < n; q++) A[c][q] /= d
    b[c] /= d
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = A[r][c]
      if (f === 0) continue
      for (let q = c; q < n; q++) A[r][q] -= f * A[c][q]
      b[r] -= f * b[c]
    }
  }
  return b
}

// Ajusta a base polinomial a uma grade polar (radial × angular) de luminâncias
// relativas, ponderando por raio (células externas cobrem mais área).
export function fitShadingModel(grid: number[][]): ShadingModel | null {
  const nr = grid.length
  if (nr === 0) return null
  const na = grid[0].length
  if (na === 0) return null

  const A: number[][] = Array.from({ length: BASIS_N }, () => new Array(BASIS_N).fill(0))
  const b = new Array(BASIS_N).fill(0)

  // Células de área igual → peso uniforme.
  for (let i = 0; i < nr; i++) {
    const rn = cellRadius(i, nr)
    for (let j = 0; j < na; j++) {
      const th = ((j + 0.5) / na) * 2 * Math.PI
      const f = shadingBasis(rn * Math.cos(th), rn * Math.sin(th))
      const y = grid[i][j]
      for (let p = 0; p < BASIS_N; p++) {
        b[p] += f[p] * y
        for (let q = 0; q < BASIS_N; q++) A[p][q] += f[p] * f[q]
      }
    }
  }

  const coef = solve(A, b)
  if (!coef || coef.some((c) => !Number.isFinite(c))) return null

  // Âncora = quantil alto da superfície ajustada sobre o disco (≈ ponto mais claro).
  const values: number[] = []
  for (let i = 0; i < nr; i++) {
    const rn = cellRadius(i, nr)
    for (let j = 0; j < na; j++) {
      const th = ((j + 0.5) / na) * 2 * Math.PI
      const f = shadingBasis(rn * Math.cos(th), rn * Math.sin(th))
      let s = 0
      for (let p = 0; p < BASIS_N; p++) s += coef[p] * f[p]
      values.push(s)
    }
  }
  values.sort((a, b2) => a - b2)
  const anchor = values[Math.min(values.length - 1, Math.floor(ANCHOR_QUANTILE * values.length))]
  if (!Number.isFinite(anchor) || Math.abs(anchor) < 1e-6) return null

  return { coef, anchor }
}

// Grade polar de luminância "do substrato" (percentil alto = ignora a tinta),
// suavizada e normalizada pela média. Exportada para teste.
export function buildShadingGrid(
  samples: { u: number; v: number; lum: number }[],
  nr = N_RADIAL,
  na = N_ANGULAR,
): number[][] | null {
  const cells: number[][][] = Array.from({ length: nr }, () =>
    Array.from({ length: na }, () => [] as number[]),
  )
  for (const s of samples) {
    const rn = Math.sqrt(s.u * s.u + s.v * s.v)
    if (rn >= 1) continue
    const th = Math.atan2(s.v, s.u)
    const ai = Math.floor((((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * na) % na
    cells[radialBin(rn, nr)][ai].push(s.lum)
  }

  let filled = 0
  let grid: number[][] = cells.map((row) =>
    row.map((c) => {
      if (c.length === 0) return NaN
      filled++
      c.sort((a, b) => a - b)
      return c[Math.min(c.length - 1, Math.floor(PERCENTILE * c.length))]
    }),
  )
  if (filled < nr * na * 0.5) return null

  // Buracos → média das células preenchidas (evita NaN se propagar na suavização).
  let acc = 0
  let n = 0
  for (const row of grid) for (const v of row) if (Number.isFinite(v)) { acc += v; n++ }
  if (n === 0) return null
  const fallback = acc / n
  grid = grid.map((row) => row.map((v) => (Number.isFinite(v) ? v : fallback)))

  for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
    const next: number[][] = grid.map((row) => row.slice())
    for (let i = 0; i < nr; i++) {
      for (let j = 0; j < na; j++) {
        let sum = 0
        let cnt = 0
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ii = Math.min(nr - 1, Math.max(0, i + di))
            const jj = (j + dj + na) % na
            sum += grid[ii][jj]
            cnt++
          }
        }
        next[i][j] = sum / cnt
      }
    }
    grid = next
  }

  let total = 0
  for (const row of grid) for (const v of row) total += v
  const mean = total / (nr * na)
  if (!Number.isFinite(mean) || mean <= 0) return null
  return grid.map((row) => row.map((v) => v / mean))
}

// Meia-extensão da AABB da elipse rotacionada (usada para recortar a região de trabalho).
function ellipseBounds(zone: PxZone): { hw: number; hh: number } {
  const a = zone.rotation * DEG_TO_RAD
  const c = Math.cos(a)
  const s = Math.sin(a)
  return {
    hw: Math.sqrt(zone.rx * c * (zone.rx * c) + zone.ry * s * (zone.ry * s)),
    hh: Math.sqrt(zone.rx * s * (zone.rx * s) + zone.ry * c * (zone.ry * c)),
  }
}

// Mede o sombreamento do substrato do fundo dentro da art-zone.
// null (→ composição segue sem sombreamento) quando o ambiente não suporta leitura de
// pixels, o canvas está "tainted" (CORS) ou a zona é degenerada.
export function extractShadingModel(
  background: CanvasImageSource,
  zone: PxZone,
): ShadingModel | null {
  if (!(zone.rx > 0) || !(zone.ry > 0)) return null
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null

  const { hw, hh } = ellipseBounds(zone)
  if (!(hw > 0) || !(hh > 0)) return null

  try {
    const sample = document.createElement('canvas')
    sample.width = SAMPLE_SIZE
    sample.height = SAMPLE_SIZE
    const sctx = sample.getContext('2d')
    if (!sctx || typeof sctx.getImageData !== 'function' || typeof sctx.drawImage !== 'function') {
      return null
    }

    const sx = zone.cx - hw
    const sy = zone.cy - hh
    const sw = hw * 2
    const sh = hh * 2
    sctx.drawImage(background, sx, sy, sw, sh, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    const data = sctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data

    const a = zone.rotation * DEG_TO_RAD
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const samples: { u: number; v: number; lum: number }[] = []
    for (let py = 0; py < SAMPLE_SIZE; py++) {
      const Y = sy + ((py + 0.5) * sh) / SAMPLE_SIZE
      const dy = Y - zone.cy
      for (let px = 0; px < SAMPLE_SIZE; px++) {
        const X = sx + ((px + 0.5) * sw) / SAMPLE_SIZE
        const dx = X - zone.cx
        const u = (dx * cos + dy * sin) / zone.rx
        const v = (-dx * sin + dy * cos) / zone.ry
        if (u * u + v * v >= 1) continue
        const i = (py * SAMPLE_SIZE + px) * 4
        if (data[i + 3] === 0) continue
        samples.push({ u, v, lum: 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] })
      }
    }

    const grid = buildShadingGrid(samples)
    if (!grid) return null
    return fitShadingModel(grid)
  } catch {
    // getImageData em canvas "tainted" (imagem sem CORS) → segue sem sombreamento.
    return null
  }
}

// Reaplica o sombreamento medido sobre o que já foi desenhado na art-zone.
// Opera direto nos pixels porque o fator é um campo polinomial 2D arbitrário —
// não é expressável como gradiente radial/linear de canvas com blend.
export function applyShading(
  ctx: CanvasRenderingContext2D,
  zone: PxZone,
  model: ShadingModel,
  gain: number = DEFAULT_SHADING_GAIN,
): boolean {
  if (typeof ctx.getImageData !== 'function' || typeof ctx.putImageData !== 'function') return false

  const canvas = ctx.canvas
  if (!canvas) return false
  const { hw, hh } = ellipseBounds(zone)

  const x0 = Math.max(0, Math.floor(zone.cx - hw))
  const y0 = Math.max(0, Math.floor(zone.cy - hh))
  const x1 = Math.min(canvas.width, Math.ceil(zone.cx + hw))
  const y1 = Math.min(canvas.height, Math.ceil(zone.cy + hh))
  const w = x1 - x0
  const h = y1 - y0
  if (w <= 0 || h <= 0) return false

  try {
    const img = ctx.getImageData(x0, y0, w, h)
    const data = img.data
    const a = zone.rotation * DEG_TO_RAD
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const [c0, c1, c2, c3, c4, c5, c6] = model.coef
    const inv = 1 / model.anchor

    for (let y = 0; y < h; y++) {
      const dy = y0 + y + 0.5 - zone.cy
      for (let x = 0; x < w; x++) {
        const dx = x0 + x + 0.5 - zone.cx
        const u = (dx * cos + dy * sin) / zone.rx
        const v = (-dx * sin + dy * cos) / zone.ry
        const r2 = u * u + v * v
        if (r2 >= 1) continue

        const fit = (c0 + c1 * u + c2 * v + c3 * u * u + c4 * u * v + c5 * v * v + c6 * r2 * r2) * inv
        let s = faceShadingFactor(fit, r2, gain)

        const i = (y * w + x) * 4
        const cr = data[i]
        const cg = data[i + 1]
        const cb = data[i + 2]

        // Limita o clareamento pela folga do próprio pixel: saturar um canal em 255
        // escurece o matiz relativo (uma arte lavanda vira branca). Assim o lado claro
        // se auto-modera em arte clara e continua cheio em arte escura, sem perder cor.
        if (s > 1) {
          const maxc = cr > cg ? (cr > cb ? cr : cb) : cg > cb ? cg : cb
          if (maxc > 0) {
            const room = 255 / maxc
            if (s > room) s = room
          }
        }

        data[i] = cr * s
        data[i + 1] = cg * s
        data[i + 2] = cb * s
      }
    }

    ctx.putImageData(img, x0, y0)
    return true
  } catch {
    return false
  }
}
