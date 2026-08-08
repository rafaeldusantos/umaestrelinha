import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MONOGRAM_D } from '@/shared/ui/brand/paths'

/**
 * Os assets de marca e a cabeça do documento (`PAP-06`, `PAP-07`).
 *
 * Ícone é a categoria de bug mais silenciosa que existe: o arquivo some, o
 * `<link>` aponta para o lugar errado, o `theme-color` fica na cor da paleta
 * velha — e nada disso quebra build, tipo ou teste de componente. Só a aba do
 * navegador muda, e ninguém olha para a aba da própria loja.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const STORE = resolve(HERE, '../../..')
const PUBLIC = resolve(STORE, 'public')
const INDEX = readFileSync(resolve(STORE, 'index.html'), 'utf8')

describe('os arquivos de ícone existem e não estão vazios', () => {
  it.each(['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-512.png'])(
    '`public/%s`',
    (file) => {
      const path = resolve(PUBLIC, file)
      expect(existsSync(path)).toBe(true)
      expect(statSync(path).size).toBeGreaterThan(500)
    },
  )
})

describe('favicon.svg — base B, squircle', () => {
  const svg = readFileSync(resolve(PUBLIC, 'favicon.svg'), 'utf8')

  it('é 64×64', () => {
    expect(svg).toMatch(/viewBox="0 0 64 64"/)
  })

  it('tem canto de 28% — squircle, não disco nem quadrado', () => {
    // 18 / 64 = 28,1%. A prancha 19b mediu que essa é a base que dá 2,5px de
    // haste a 16px, contra 2,1px do disco.
    const rx = Number(svg.match(/rx="(\d+)"/)?.[1])
    expect(rx).toBe(18)
    expect(rx / 64).toBeCloseTo(0.28, 2)
  })

  it('é Carimbo com o N em Grafite', () => {
    expect(svg).toMatch(/fill="#F1678D"/)
    expect(svg).toMatch(/fill="#2E2028"/)
  })

  it('usa o MESMO path do lockup — nada foi redesenhado para caber em 16px', () => {
    expect(svg).toContain(MONOGRAM_D)
  })

  it('o path preserva `fill-rule="evenodd"`, senão o contador do N fecha', () => {
    expect(svg).toMatch(/fill-rule="evenodd"/)
  })
})

describe('apple-touch-icon — base C, quadrado sangrado', () => {
  it('é 180×180', () => {
    // Os oito primeiros bytes são a assinatura do PNG; largura e altura vêm no
    // IHDR, em big-endian, a partir do byte 16.
    const png = readFileSync(resolve(PUBLIC, 'apple-touch-icon.png'))
    expect(png.readUInt32BE(16)).toBe(180)
    expect(png.readUInt32BE(20)).toBe(180)
  })
})

describe('favicon.ico — três tamanhos', () => {
  const ico = readFileSync(resolve(PUBLIC, 'favicon.ico'))

  it('é um ícone com 3 entradas', () => {
    expect(ico.readUInt16LE(0)).toBe(0) // reservado
    expect(ico.readUInt16LE(2)).toBe(1) // 1 = ícone
    expect(ico.readUInt16LE(4)).toBe(3)
  })

  it('traz 16, 32 e 48', () => {
    const sizes = [0, 1, 2].map((i) => ico.readUInt8(6 + i * 16))
    expect(sizes).toEqual([16, 32, 48])
  })
})

describe('index.html — a cabeça do documento', () => {
  it.each([
    ['icon svg', /rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/],
    ['icon ico', /rel="icon" type="image\/x-icon" href="\/favicon\.ico"/],
    ['icon 512', /rel="icon"[^>]*sizes="512x512" href="\/icon-512\.png"/],
    ['apple-touch-icon', /rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png"/],
  ])('declara %s', (_label, pattern) => {
    expect(INDEX).toMatch(pattern)
  })

  it('`theme-color` é Carmim, não a geleia velha', () => {
    expect(INDEX).toMatch(/name="theme-color" content="#A62348"/)
    expect(INDEX).not.toContain('#B0176B')
  })
})

describe('index.html — as fontes', () => {
  it('pede Fredoka e DM Sans', () => {
    expect(INDEX).toMatch(/family=Fredoka/)
    expect(INDEX).toMatch(/family=DM\+Sans/)
  })

  it('NÃO pede Berkshire Swash', () => {
    // A fonte perdeu as duas funções que tinha na v2 — o wordmark virou SVG e a
    // inicial do card de coleção virou Fredoka 700. Carregada e não usada, ela
    // seria só uma requisição a mais no caminho crítico de uma loja de celular.
    const fontLink = INDEX.match(/<link href="https:\/\/fonts\.googleapis[^>]*>/)?.[0] ?? ''
    expect(fontLink).not.toMatch(/Berkshire/)
  })
})
