// Feature 72, T05 — o manifest do app do ateliê (`MAF-01`, `MAF-02`, `MAF-03`).
//
// O plugin de PWA só resolve as opções dentro do ciclo do Vite, então a régua lê o objeto que o
// `vite.config.ts` entrega a ele (`pwa.config.ts`) e confere a FIAÇÃO pelo fonte: um objeto
// perfeito que ninguém passa ao `VitePWA` não gera manifest nenhum. Os ícones são lidos do disco,
// com a largura e a altura do cabeçalho do PNG — o arquivo existir não prova que ele tem o tamanho
// que o manifest anuncia, e o Chrome recusa a instalação quando não tem.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ESTRELINHA_COLORS } from '@estrelinha/ui/tokens/estrelinha'
import { pwaOptions } from '../../../pwa.config'

const APP = resolve(__dirname, '../../..')
const semComentario = (fonte: string) =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')

/** Largura e altura do cabeçalho IHDR. Lança se não for PNG — nunca devolve 0 em silêncio. */
function tamanhoDoPng(buf: Buffer): { width: number; height: number } {
  const assinatura = '89504e470d0a1a0a'
  if (buf.subarray(0, 8).toString('hex') !== assinatura || buf.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error('não é um PNG')
  }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

const manifest = pwaOptions.manifest as Record<string, unknown> & {
  icons: { src: string; sizes: string; type: string; purpose: string }[]
}

describe('manifest do app do ateliê (MAF-01)', () => {
  it('nome, idioma e escopo', () => {
    expect(manifest.name).toBe('Ateliê · Uma Estrelinha')
    expect(manifest.short_name).toBe('Ateliê')
    expect(manifest.lang).toBe('pt-BR')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
  })

  it('abre em tela cheia, em retrato (MAF-02)', () => {
    expect(manifest.display).toBe('standalone')
    expect(manifest.orientation).toBe('portrait')
  })

  it('theme_color e background_color SÃO o primary-strong do dono da paleta', () => {
    expect(manifest.theme_color).toBe(ESTRELINHA_COLORS['primary-strong'])
    expect(manifest.background_color).toBe(ESTRELINHA_COLORS['primary-strong'])
  })

  it('a cor não é digitada no pwa.config.ts: nenhum hex no código', () => {
    const fonte = semComentario(readFileSync(resolve(APP, 'pwa.config.ts'), 'utf8'))
    expect(fonte).toMatch(/ESTRELINHA_COLORS\["primary-strong"\]/)
    expect(fonte).not.toMatch(/#[0-9a-fA-F]{6}\b/)
  })

  it('ícones: 192 e 512 `any` e um 512 `maskable`', () => {
    expect(manifest.icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual([
      '192x192 any',
      '512x512 any',
      '512x512 maskable',
    ])
    for (const icon of manifest.icons) expect(icon.type).toBe('image/png')
  })

  it.each(manifest.icons.map((i) => [i.src, i.sizes]))('%s existe no disco e mede %s', (src, sizes) => {
    const buf = readFileSync(resolve(APP, 'public', src.replace(/^\//, '')))
    const { width, height } = tamanhoDoPng(buf)
    expect(`${width}x${height}`).toBe(sizes)
  })

  it('sensor: o leitor do cabeçalho mede um PNG sintético e recusa o que não é PNG', () => {
    const png = Buffer.alloc(24)
    Buffer.from('89504e470d0a1a0a', 'hex').copy(png, 0)
    png.write('IHDR', 12, 'ascii')
    png.writeUInt32BE(192, 16)
    png.writeUInt32BE(96, 20)
    expect(tamanhoDoPng(png)).toEqual({ width: 192, height: 96 })
    expect(() => tamanhoDoPng(Buffer.from('<svg/>'))).toThrow('não é um PNG')
  })
})

describe('a fiação no vite.config.ts', () => {
  const vite = semComentario(readFileSync(resolve(APP, 'vite.config.ts'), 'utf8'))

  it('o VitePWA recebe ESTE objeto', () => {
    expect(vite).toMatch(/VitePWA\(pwaOptions\)/)
    expect(vite).toMatch(/from "\.\/pwa\.config"/)
  })

  it('a meta theme-color do HTML sai da MESMA constante do manifest, sem hex no config', () => {
    expect(vite).toMatch(/name="theme-color" content="\$\{ATELIE_THEME_COLOR\}"/)
    expect(vite).not.toMatch(/#[0-9a-fA-F]{6}\b/)
  })
})
