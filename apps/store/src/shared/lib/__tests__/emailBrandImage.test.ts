import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { inflateSync, deflateSync, crc32 } from 'node:zlib'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SIGNATURE_FLOOR } from '@/shared/ui/brand'

/**
 * O arquivo da marca nos e-mails (feature 60, `LOGO-10`…`LOGO-14`, `AD-045`).
 *
 * Os e-mails apontam para `apps/store/public/email/assinatura-v1@3x.png` por URL absoluta. Nada no
 * build olha esse arquivo: um PNG trocado por outro, exportado com fundo transparente ou com a arte
 * POSITIVA (traço escuro sobre fundo escuro, invisível) passaria em build, `tsc` e em todo teste de
 * componente — e quem descobriria seria a cliente, na caixa de entrada.
 *
 * A caixa exibida (`EMAIL_BRAND`) é lida de `layout.ts` como TEXTO, pelo mesmo motivo de
 * `authEmailTemplates.test.ts`: ele mora no workspace das functions (Deno) e não é importado daqui.
 * O piso da assinatura é IMPORTADO do módulo da marca da loja — nunca copiado (`L-022`).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const PNG_PATH = resolve(ROOT, 'apps/store/public/email/assinatura-v1@3x.png')
const LAYOUT_TS_PATH = resolve(ROOT, 'supabase/functions/send-notification/render/layout.ts')

/**
 * O conteúdo do `v1` é IMUTÁVEL (`LOGO-14`): e-mails entregues apontam para ele para sempre. Arte
 * nova entra como `assinatura-v2@3x.png`, com o caminho novo em `EMAIL_BRAND` — nunca trocando
 * este hash.
 */
const SHA256_DO_V1 = 'aa05717dc6c17941a6f4aeab9e20bf3e9f8d369b8508173ac47503ec20b31b28'

const PLACA: Rgb = [0x28, 0x3a, 0x4a] // primary-strong — a cor da faixa
const TRACO: Rgb = [0xf7, 0xf3, 0xec] // on-primary — o traço da assinatura negativa
const TOLERANCIA = 8
const TETO_BYTES = 40 * 1024

type Rgb = readonly [number, number, number]

interface Png {
  width: number
  height: number
  /** RGBA, 4 bytes por pixel, linha a linha. */
  rgba: Uint8Array
}

// =================================================================================================
// O decodificador — mínimo, e que LANÇA fora do que sabe ler
// =================================================================================================

const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Lê PNG de 8 bits, tipo de cor 2 (RGB) ou 6 (RGBA), sem entrelaçamento — o que o WPF produz.
 * Qualquer outra coisa LANÇA: um decodificador que devolvesse pixels errados para um formato que
 * não entende faria as réguas de pixel abaixo medirem lixo, e passarem.
 */
function decodePng(buf: Buffer): Png {
  if (!buf.subarray(0, 8).equals(ASSINATURA_PNG)) throw new Error('não é PNG')

  let pos = 8
  let width = 0
  let height = 0
  let canais = 0
  const idat: Buffer[] = []

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const tipo = buf.toString('latin1', pos + 4, pos + 8)
    const dado = buf.subarray(pos + 8, pos + 8 + len)

    if (tipo === 'IHDR') {
      width = dado.readUInt32BE(0)
      height = dado.readUInt32BE(4)
      const profundidade = dado[8]
      const tipoDeCor = dado[9]
      const entrelacado = dado[12]
      if (profundidade !== 8) throw new Error(`profundidade ${profundidade} não suportada`)
      if (entrelacado !== 0) throw new Error('PNG entrelaçado não suportado')
      if (tipoDeCor === 6) canais = 4
      else if (tipoDeCor === 2) canais = 3
      else throw new Error(`tipo de cor ${tipoDeCor} não suportado`)
    } else if (tipo === 'IDAT') {
      idat.push(dado)
    } else if (tipo === 'IEND') {
      break
    }
    pos += 12 + len
  }

  if (!width || !canais) throw new Error('PNG sem IHDR')

  const bruto = inflateSync(Buffer.concat(idat))
  const passo = width * canais
  const linhas = Buffer.alloc(passo * height)

  for (let y = 0; y < height; y++) {
    const filtro = bruto[y * (passo + 1)]
    const entrada = bruto.subarray(y * (passo + 1) + 1, (y + 1) * (passo + 1))
    const saida = linhas.subarray(y * passo, (y + 1) * passo)
    const acima = y > 0 ? linhas.subarray((y - 1) * passo, y * passo) : null

    for (let x = 0; x < passo; x++) {
      const a = x >= canais ? saida[x - canais] : 0
      const b = acima ? acima[x] : 0
      const c = acima && x >= canais ? acima[x - canais] : 0
      let v: number
      switch (filtro) {
        case 0: v = entrada[x]; break
        case 1: v = entrada[x] + a; break
        case 2: v = entrada[x] + b; break
        case 3: v = entrada[x] + ((a + b) >> 1); break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          v = entrada[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
          break
        }
        default: throw new Error(`filtro ${filtro} inválido na linha ${y}`)
      }
      saida[x] = v & 0xff
    }
  }

  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = linhas[i * canais]
    rgba[i * 4 + 1] = linhas[i * canais + 1]
    rgba[i * 4 + 2] = linhas[i * canais + 2]
    rgba[i * 4 + 3] = canais === 4 ? linhas[i * canais + 3] : 255
  }
  return { width, height, rgba }
}

/** PNG sintético para os sensores: RGBA, 8 bits, filtro 0. */
function encodePng(width: number, height: number, pixel: (x: number, y: number) => [number, number, number, number], tipoDeCor = 6): Buffer {
  const chunk = (tipo: string, dado: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(dado.length)
    const corpo = Buffer.concat([Buffer.from(tipo, 'latin1'), dado])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(corpo) >>> 0)
    return Buffer.concat([len, corpo, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = tipoDeCor
  const linhas = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = y * (width * 4 + 1) + 1 + x * 4
      const [r, g, b, a] = pixel(x, y)
      linhas[o] = r
      linhas[o + 1] = g
      linhas[o + 2] = b
      linhas[o + 3] = a
    }
  }
  return Buffer.concat([ASSINATURA_PNG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(linhas)), chunk('IEND', Buffer.alloc(0))])
}

// =================================================================================================
// As réguas — funções, para a asserção e o sensor chamarem a MESMA coisa
// =================================================================================================

const px = (png: Png, x: number, y: number) => {
  const i = (y * png.width + x) * 4
  return [png.rgba[i], png.rgba[i + 1], png.rgba[i + 2], png.rgba[i + 3]] as const
}
const perto = (cor: readonly number[], alvo: Rgb) => alvo.every((canal, i) => Math.abs(cor[i] - canal) <= TOLERANCIA)

/** `LOGO-10`: o arquivo mede EXATAMENTE 3× a caixa declarada no `<img>`. */
function recusaDimensao(png: Png, caixa: { width: number; height: number }): string | null {
  if (png.width !== caixa.width * 3 || png.height !== caixa.height * 3) {
    return `${png.width}×${png.height}, esperava ${caixa.width * 3}×${caixa.height * 3}`
  }
  return null
}

/** `LOGO-11`: nenhum pixel transparente — o modo escuro de um cliente não pode apagar a marca. */
function recusaTransparencia(png: Png): string | null {
  for (let i = 3; i < png.rgba.length; i += 4) {
    if (png.rgba[i] !== 255) return `pixel ${(i - 3) / 4} com alfa ${png.rgba[i]}`
  }
  return null
}

/** `LOGO-11`: os quatro cantos são a cor da faixa. */
function recusaCantos(png: Png): string | null {
  const cantos: [number, number][] = [[0, 0], [png.width - 1, 0], [0, png.height - 1], [png.width - 1, png.height - 1]]
  for (const [x, y] of cantos) {
    if (!perto(px(png, x, y), PLACA)) return `canto (${x}, ${y}) = ${px(png, x, y).slice(0, 3).join(',')}`
  }
  return null
}

/** `LOGO-11`: existe traço claro — é o que recusa a arte POSITIVA, escura sobre escuro. */
function recusaSemTraco(png: Png): string | null {
  for (let i = 0; i < png.rgba.length; i += 4) {
    if (perto([png.rgba[i], png.rgba[i + 1], png.rgba[i + 2]], TRACO)) return null
  }
  return 'nenhum pixel de traço #F7F3EC'
}

/** `EMAIL_BRAND` lido de `layout.ts` como texto. Recorte que falha LANÇA, nunca devolve zero. */
function caixaDeclarada(): { path: string; width: number; height: number } {
  const src = readFileSync(LAYOUT_TS_PATH, 'utf8').replace(/\r\n/g, '\n')
  const bloco = src.match(/export const EMAIL_BRAND = \{([\s\S]*?)\} as const/)
  if (!bloco) throw new Error('não achei EMAIL_BRAND em layout.ts')
  const path = bloco[1].match(/path:\s*'([^']+)'/)
  const width = bloco[1].match(/width:\s*(\d+)/)
  const height = bloco[1].match(/height:\s*(\d+)/)
  if (!path || !width || !height) throw new Error('EMAIL_BRAND sem path/width/height legíveis')
  return { path: path[1], width: Number(width[1]), height: Number(height[1]) }
}

// =================================================================================================

const BYTES = readFileSync(PNG_PATH)
const PNG = decodePng(BYTES)
const CAIXA = caixaDeclarada()

describe('o arquivo da marca nos e-mails — âncoras', () => {
  it('leu o PNG do disco e achou EMAIL_BRAND em layout.ts', () => {
    expect(BYTES.length).toBeGreaterThan(0)
    expect(PNG.width * PNG.height).toBeGreaterThan(0)
    expect(CAIXA.width).toBeGreaterThan(0)
    expect(CAIXA.height).toBeGreaterThan(0)
  })

  it('o arquivo medido é o que EMAIL_BRAND aponta', () => {
    // Sem isto, trocar o caminho em EMAIL_BRAND para um `v2` deixaria este guarda medindo o `v1`
    // enquanto os e-mails apontam para outro arquivo.
    expect(PNG_PATH.replace(/\\/g, '/').endsWith(`apps/store/public${CAIXA.path}`)).toBe(true)
  })
})

describe('LOGO-10 — 606 × 132, exatamente 3× a caixa exibida', () => {
  it('a caixa declarada é 202 × 44', () => {
    expect(CAIXA).toMatchObject({ width: 202, height: 44 })
  })

  it('o PNG mede 606 × 132', () => {
    expect([PNG.width, PNG.height]).toEqual([606, 132])
    expect(recusaDimensao(PNG, CAIXA)).toBeNull()
  })
})

describe('LOGO-11 — opaco, na cor da faixa, com o traço claro', () => {
  it('nenhum pixel transparente', () => {
    expect(recusaTransparencia(PNG)).toBeNull()
  })

  it('os quatro cantos são #283A4A', () => {
    expect(recusaCantos(PNG)).toBeNull()
  })

  it('há traço #F7F3EC (é a arte negativa)', () => {
    expect(recusaSemTraco(PNG)).toBeNull()
  })
})

describe('LOGO-12 / LOGO-13 — piso de legibilidade e peso', () => {
  it('a largura exibida não fica abaixo do piso da assinatura', () => {
    expect(SIGNATURE_FLOOR).toBe(190)
    expect(CAIXA.width).toBeGreaterThanOrEqual(SIGNATURE_FLOOR)
  })

  it('o arquivo tem no máximo 40 KB', () => {
    expect(BYTES.length).toBeLessThanOrEqual(TETO_BYTES)
  })
})

describe('LOGO-14 — o v1 é imutável', () => {
  it('o conteúdo é o publicado', () => {
    expect(createHash('sha256').update(BYTES).digest('hex')).toBe(SHA256_DO_V1)
  })
})

describe('sensores — cada régua reprova o defeito que ela existe para pegar', () => {
  const W = 606
  const H = 132
  const traco = (x: number, y: number) => x === 300 && y === 66
  const bom = (x: number, y: number): [number, number, number, number] =>
    traco(x, y) ? [...TRACO, 255] : [...PLACA, 255]

  it('o inverso: um PNG certo passa nas quatro réguas', () => {
    const png = decodePng(encodePng(W, H, bom))
    expect(recusaDimensao(png, CAIXA)).toBeNull()
    expect(recusaTransparencia(png)).toBeNull()
    expect(recusaCantos(png)).toBeNull()
    expect(recusaSemTraco(png)).toBeNull()
  })

  it('exportado em 2× reprova a dimensão', () => {
    expect(recusaDimensao(decodePng(encodePng(404, 88, bom)), CAIXA)).toMatch(/404×88/)
  })

  it('fundo transparente reprova a opacidade e os cantos', () => {
    const png = decodePng(encodePng(W, H, (x, y) => (traco(x, y) ? [...TRACO, 255] : [0, 0, 0, 0])))
    expect(recusaTransparencia(png)).not.toBeNull()
    expect(recusaCantos(png)).not.toBeNull()
  })

  it('a arte POSITIVA (traço #283A4A sobre a faixa) reprova a régua do traço', () => {
    const png = decodePng(encodePng(W, H, () => [...PLACA, 255]))
    expect(recusaTransparencia(png)).toBeNull()
    expect(recusaCantos(png)).toBeNull()
    expect(recusaSemTraco(png)).not.toBeNull()
  })

  it('o decodificador LANÇA em formato que não sabe ler, em vez de medir lixo', () => {
    expect(() => decodePng(encodePng(2, 2, bom, 3))).toThrow(/tipo de cor 3/)
    expect(() => decodePng(Buffer.from('não sou png'))).toThrow(/não é PNG/)
  })
})
