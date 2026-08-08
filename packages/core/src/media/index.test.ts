import { describe, expect, it } from 'vitest'
import { normalizeImages, primaryImage } from './index'

// Testes derivados de VAR-11 (AC 1, 3) e do "Done when" da T7.
//
// O ponto desta função é sobreviver ao intervalo de deploy entre a migration que converte
// `products.images` para jsonb e o bundle que lê o formato novo. Por isso os testes de lixo pesam
// tanto quanto os de caminho feliz: em produção, "lixo" aqui é uma tela sem foto, não uma exceção.

describe('normalizeImages — forma antiga (string[])', () => {
  it('converte URL crua no objeto completo, com source upload', () => {
    expect(normalizeImages(['a.webp'])).toEqual([{ url: 'a.webp', alt: null, source: 'upload' }])
  })

  it('preserva a ordem — a primeira é a principal da vitrine', () => {
    expect(normalizeImages(['a.webp', 'b.webp', 'c.webp']).map(i => i.url))
      .toEqual(['a.webp', 'b.webp', 'c.webp'])
  })

  it('apara espaço em volta da URL', () => {
    expect(normalizeImages(['  a.webp  '])[0].url).toBe('a.webp')
  })

  it('descarta string vazia ou só espaço em vez de virar <img src="">', () => {
    expect(normalizeImages(['', '   ', 'a.webp'])).toEqual([
      { url: 'a.webp', alt: null, source: 'upload' },
    ])
  })
})

describe('normalizeImages — forma nova (jsonb)', () => {
  it('devolve o objeto idêntico quando já está no formato', () => {
    const input = [{ url: 'a.webp', alt: 'Botton do Naruto', source: 'mockup' }]
    expect(normalizeImages(input)).toEqual([
      { url: 'a.webp', alt: 'Botton do Naruto', source: 'mockup' },
    ])
  })

  it.each(['upload', 'mockup', 'import'])('preserva o source válido %s', source => {
    expect(normalizeImages([{ url: 'a.webp', alt: null, source }])[0].source).toBe(source)
  })

  it('source desconhecido cai em upload — foi o que a migration usou no backfill', () => {
    expect(normalizeImages([{ url: 'a.webp', alt: null, source: 'sei-la' }])[0].source).toBe('upload')
    expect(normalizeImages([{ url: 'a.webp', alt: null, source: 42 }])[0].source).toBe('upload')
    expect(normalizeImages([{ url: 'a.webp', alt: null }])[0].source).toBe('upload')
  })

  it('alt vazio ou só espaço vira null — "sem alt" tem UMA representação', () => {
    expect(normalizeImages([{ url: 'a.webp', alt: '' }])[0].alt).toBeNull()
    expect(normalizeImages([{ url: 'a.webp', alt: '   ' }])[0].alt).toBeNull()
    expect(normalizeImages([{ url: 'a.webp', alt: 123 }])[0].alt).toBeNull()
  })

  it('mistura de formatos na mesma lista funciona — é o estado durante o deploy', () => {
    expect(normalizeImages(['a.webp', { url: 'b.webp', alt: 'B', source: 'mockup' }])).toEqual([
      { url: 'a.webp', alt: null, source: 'upload' },
      { url: 'b.webp', alt: 'B', source: 'mockup' },
    ])
  })
})

describe('normalizeImages — entrada inválida nunca lança', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string solta', ''],
    ['string não-vazia solta', 'a.webp'],
    ['número', 42],
    ['objeto que não é array', { url: 'a.webp' }],
    ['array vazio', []],
  ])('%s → []', (_label, input) => {
    expect(normalizeImages(input)).toEqual([])
  })

  it('objeto sem url utilizável é descartado, não vira <img src="undefined">', () => {
    expect(normalizeImages([{}, { alt: 'só alt' }, { url: '' }, { url: '  ' }, { url: 7 }])).toEqual([])
  })

  it('entradas inválidas somem e as válidas sobrevivem no mesmo array', () => {
    expect(normalizeImages([null, 'a.webp', {}, { url: 'b.webp' }, undefined]).map(i => i.url))
      .toEqual(['a.webp', 'b.webp'])
  })
})

describe('primaryImage', () => {
  it('devolve a primeira imagem válida', () => {
    expect(primaryImage(['a.webp', 'b.webp'])).toEqual({
      url: 'a.webp', alt: null, source: 'upload',
    })
  })

  it('pula as inválidas do começo em vez de devolver null', () => {
    expect(primaryImage([{}, 'b.webp'])?.url).toBe('b.webp')
  })

  it.each([
    ['array vazio', []],
    ['null', null],
    ['undefined', undefined],
    ['só entradas inválidas', [{}, '', null]],
  ])('%s → null', (_label, input) => {
    expect(primaryImage(input)).toBeNull()
  })
})
