// Monta `favicon.ico` (16 · 32 · 48, formato Vista+ com PNG embutido) e MEDE a
// haste do N no render de 16px — que é o piso de aceite da prancha 19b: abaixo
// de 2px a haste sai cinza de antialias, não Grafite.
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const PUBLIC = 'apps/store/public/'
const SIZES = [16, 32, 48]

// ── ICO ──────────────────────────────────────────────────────────────────────
const pngs = SIZES.map((s) => readFileSync(`${PUBLIC}favicon-${s}.png`))

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reservado
header.writeUInt16LE(1, 2) // 1 = ícone
header.writeUInt16LE(SIZES.length, 4)

let offset = 6 + SIZES.length * 16
const entries = SIZES.map((size, i) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(size === 256 ? 0 : size, 0) // largura
  e.writeUInt8(size === 256 ? 0 : size, 1) // altura
  e.writeUInt8(0, 2) // paleta: nenhuma
  e.writeUInt8(0, 3) // reservado
  e.writeUInt16LE(1, 4) // planos
  e.writeUInt16LE(32, 6) // bits por pixel
  e.writeUInt32LE(pngs[i].length, 8)
  e.writeUInt32LE(offset, 12)
  offset += pngs[i].length
  return e
})

writeFileSync(`${PUBLIC}favicon.ico`, Buffer.concat([header, ...entries, ...pngs]))
console.log(`favicon.ico: ${SIZES.join(' · ')} — ${offset} bytes`)

// ── medição da haste ─────────────────────────────────────────────────────────
/** Decodifica um PNG RGBA/8bit sem filtro exótico. Suficiente para o que a WPF emite. */
function decodePng(buffer) {
  let pos = 8
  let width = 0
  let height = 0
  let colorType = 0
  const idat = []

  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos)
    const type = buffer.toString('ascii', pos + 4, pos + 8)
    const data = buffer.subarray(pos + 8, pos + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      colorType = data.readUInt8(9)
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + length
  }

  if (colorType !== 6) throw new Error(`colorType ${colorType} — esperava RGBA`)

  const raw = inflateSync(Buffer.concat(idat))
  const bpp = 4
  const stride = width * bpp
  const out = Buffer.alloc(height * stride)

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0
      const b = y > 0 ? out[(y - 1) * stride + x] : 0
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0
      let v = line[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      out[y * stride + x] = v & 0xff
    }
  }

  return { width, height, pixels: out }
}

/**
 * Largura da haste ESQUERDA do N, em px, na linha do meio da letra.
 * "Grafite" = pixel escuro o bastante para não ser antialias: luminância < 50%
 * do Carimbo, o que na prática separa o traço da borda esfumada.
 */
function stemWidth(file) {
  const { width, height, pixels } = decodePng(readFileSync(PUBLIC + file))
  const row = Math.round(height * 0.5)
  let run = 0
  let best = 0

  for (let x = 0; x < width; x++) {
    const i = (row * width + x) * 4
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]]
    const dark = 0.2126 * r + 0.7152 * g + 0.0722 * b < 100 // Carimbo ~ 140
    if (dark) {
      run++
      best = Math.max(best, run)
      if (best > 0 && !dark) break
    } else if (run > 0) break
  }

  return best
}

console.log('\nhaste do N, medida no raster:')
for (const size of [16, 32, 48]) {
  const w = stemWidth(`favicon-${size}.png`)
  const at16 = (w * 16) / size
  console.log(`  ${size}px → ${w}px de haste   (equivale a ${at16.toFixed(2)}px a 16px)`)
}
const apple = stemWidth('apple-touch-icon.png')
console.log(`  180px (quadrado) → ${apple}px   (equivale a ${((apple * 16) / 180).toFixed(2)}px a 16px)`)
