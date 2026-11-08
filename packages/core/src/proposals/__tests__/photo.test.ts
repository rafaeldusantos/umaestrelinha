// A foto da linha do pedido montado: variação → primeira da galeria → coluna antiga → nada.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { capaDaLinha, fotoDaLinha } from '../photo.ts'

const PECA = { capa: 'https://x.invalid/galeria.webp', image_url: 'https://x.invalid/antiga.jpg' }

describe('capaDaLinha — a capa da peça', () => {
  it('a primeira da galeria; sem ela, a coluna antiga; sem as duas, nada', () => {
    expect(capaDaLinha({ capa: 'g.webp', image_url: 'antiga.jpg' })).toBe('g.webp')
    expect(capaDaLinha({ capa: null, image_url: 'antiga.jpg' })).toBe('antiga.jpg')
    expect(capaDaLinha({ capa: '  ', image_url: '' })).toBeNull()
    expect(capaDaLinha({ capa: null, image_url: null })).toBeNull()
  })

  it('apara o espaço em volta da URL', () => {
    expect(capaDaLinha({ capa: '  g.webp ', image_url: null })).toBe('g.webp')
  })
})

describe('fotoDaLinha — os três recuos', () => {
  it('variação com foto própria: a dela, mesmo com galeria e coluna antiga na peça', () => {
    expect(fotoDaLinha({ image_url: 'https://x.invalid/v1.webp' }, PECA)).toBe('https://x.invalid/v1.webp')
  })

  it('variação sem foto (nula, vazia ou só espaço): a primeira da galeria', () => {
    expect(fotoDaLinha({ image_url: null }, PECA)).toBe(PECA.capa)
    expect(fotoDaLinha({ image_url: '' }, PECA)).toBe(PECA.capa)
    expect(fotoDaLinha({ image_url: '   ' }, PECA)).toBe(PECA.capa)
  })

  it('sem variação (peça sem grade): a primeira da galeria', () => {
    expect(fotoDaLinha(null, PECA)).toBe(PECA.capa)
    expect(fotoDaLinha(undefined, PECA)).toBe(PECA.capa)
  })

  it('sem foto na variação e sem galeria: a coluna antiga', () => {
    expect(fotoDaLinha({ image_url: null }, { capa: null, image_url: PECA.image_url })).toBe(PECA.image_url)
    expect(fotoDaLinha({ image_url: null }, { image_url: PECA.image_url })).toBe(PECA.image_url)
  })

  it('nada em lugar nenhum: null', () => {
    expect(fotoDaLinha({ image_url: null }, { capa: null, image_url: null })).toBeNull()
    expect(fotoDaLinha(null, null)).toBeNull()
  })
})

describe('photo.ts é folha — a function `order-proposals` a importa por caminho', () => {
  const fonte = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'photo.ts'), 'utf8')
  const semComentario = fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

  it('âncora: o arquivo foi lido e declara a regra', () => {
    expect(semComentario).toContain('export const fotoDaLinha')
  })

  it('nenhum import nem export de outro módulo', () => {
    expect(semComentario).not.toMatch(/\bimport\b|\bfrom\s+['"]/)
  })
})
