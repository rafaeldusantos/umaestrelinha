// A peça da proposta a partir das linhas lidas — o mapeamento puro que o painel e o app do ateliê
// chamam depois de ler a peça e as variações (cada um com o client dele).
import { describe, expect, it } from 'vitest'

import { mapearPecaParaProposta, textoDoEstoque, type LinhaDaPeca } from '../piece.ts'

const PECA = '11111111-1111-4111-8111-111111111111'

const produto: LinhaDaPeca = {
  id: PECA,
  name: 'Colar de Cinzas',
  base_price: 189.9,
  image_url: 'https://x.invalid/colar.webp',
  is_active: true,
  stock_policy: 'track',
  stock_total: 7,
  requires_material: true,
  engraving_max_chars: 12,
  options: [
    { name: 'Tamanho', values: ['P', 'G'], position: 0 },
    { name: 'Com gravação', values: ['Sim', 'Não'], position: 1 },
  ],
  weight_kg: 0.02,
  width_cm: null,
  height_cm: 3,
  length_cm: null,
}

const variacoes = [
  { id: 'v-1', product_id: PECA, price: 199, option_values: { Tamanho: 'P', 'Com gravação': 'Sim' }, image_url: null, is_active: true, stock: 3, position: 0, weight_kg: null },
  { id: 'v-2', product_id: PECA, price: 179, option_values: { Tamanho: 'G', 'Com gravação': 'Não' }, image_url: null, is_active: true, stock: 0, position: 1, weight_kg: 0.05 },
  // Pausada: a trava do mapeamento tem de tirá-la, mesmo que a leitura a devolva.
  { id: 'v-3', product_id: PECA, price: 150, option_values: { Tamanho: 'M' }, image_url: null, is_active: false, stock: 9, position: 2, weight_kg: null },
]

describe('mapearPecaParaProposta — as variações oferecíveis', () => {
  it('só ativas, na ordem recebida', () => {
    expect(mapearPecaParaProposta(produto, variacoes).variacoes.map((v) => v.id)).toEqual(['v-1', 'v-2'])
  })

  it('cada variação traz rótulo, preço, estoque, se vende agora e se grava', () => {
    const [a, b] = mapearPecaParaProposta(produto, variacoes).variacoes
    expect(a).toMatchObject({ rotulo: 'P · Sim', preco: 199, estoque: 3, disponivel: true, grava: true, peso: null })
    // Política `track` com estoque zero: não vende.
    expect(b).toMatchObject({ rotulo: 'G · Não', preco: 179, estoque: 0, disponivel: false, grava: false, peso: 0.05 })
  })

  it('a política que não controla estoque vende com estoque zero', () => {
    const peca = mapearPecaParaProposta({ ...produto, stock_policy: 'none' }, variacoes)
    expect(peca.politica).toBe('none')
    expect(peca.variacoes[1].disponivel).toBe(true)
  })

  it('política desconhecida vira `track`', () => {
    expect(mapearPecaParaProposta({ ...produto, stock_policy: 'outra' }, variacoes).politica).toBe('track')
  })

  it('variação sem preço fica com `null` (o servidor recusaria), e sem rótulo vira "Variação sem nome"', () => {
    const [v] = mapearPecaParaProposta({ ...produto, options: [] }, [{ ...variacoes[0], price: null, option_values: {} }]).variacoes
    expect(v.preco).toBeNull()
    expect(v.rotulo).toBe('Variação sem nome')
  })

  it('sem variações (nulo ou vazio) é peça sem grade', () => {
    expect(mapearPecaParaProposta(produto, null).variacoes).toEqual([])
    expect(mapearPecaParaProposta(produto, []).variacoes).toEqual([])
  })
})

describe('mapearPecaParaProposta — a peça', () => {
  it('traz o que a linha da proposta precisa: material, teto de gravação, preço base e medidas', () => {
    expect(mapearPecaParaProposta(produto, variacoes)).toMatchObject({
      id: PECA,
      nome: 'Colar de Cinzas',
      ativa: true,
      precoBase: 189.9,
      estoqueTotal: 7,
      pedeMaterial: true,
      limiteDeGravacao: 12,
      politica: 'track',
      medidas: { weight_kg: 0.02, width_cm: null, height_cm: 3, length_cm: null },
    })
  })

  it('peça fora do ar, sem material e sem teto', () => {
    const peca = mapearPecaParaProposta(
      { ...produto, is_active: false, requires_material: null, engraving_max_chars: null },
      variacoes,
    )
    expect(peca).toMatchObject({ ativa: false, pedeMaterial: false, limiteDeGravacao: null })
  })
})

describe('mapearPecaParaProposta — a foto da peça e da variação', () => {
  it('a capa da galeria vence a coluna antiga, e a variação sem foto própria mostra a capa', () => {
    const peca = mapearPecaParaProposta(
      { ...produto, image_url: 'https://x.invalid/antiga.jpg', capa: 'https://x.invalid/galeria.webp' },
      [
        { ...variacoes[0], image_url: 'https://x.invalid/v1.webp' },
        { ...variacoes[1], image_url: '  ' },
      ],
    )
    expect(peca.imagem).toBe('https://x.invalid/galeria.webp')
    expect(peca.variacoes.map((v) => v.imagem)).toEqual(['https://x.invalid/v1.webp', 'https://x.invalid/galeria.webp'])
  })

  it('sem galeria, a capa é a coluna antiga; sem as duas, nada', () => {
    expect(mapearPecaParaProposta(produto, variacoes).imagem).toBe(produto.image_url)
    const sem = mapearPecaParaProposta({ ...produto, image_url: null, capa: null }, variacoes)
    expect(sem.imagem).toBeNull()
    expect(sem.variacoes[0].imagem).toBeNull()
  })
})

describe('textoDoEstoque', () => {
  it('controlado: "N em estoque", "1 em estoque" e "Sem estoque"', () => {
    expect(textoDoEstoque({ estoque: 3, disponivel: true }, 'track')).toBe('3 em estoque')
    expect(textoDoEstoque({ estoque: 1, disponivel: true }, 'track')).toBe('1 em estoque')
    expect(textoDoEstoque({ estoque: 0, disponivel: false }, 'track')).toBe('Sem estoque')
  })

  it('sem controle: "Estoque livre", qualquer que seja o número', () => {
    expect(textoDoEstoque({ estoque: 0, disponivel: true }, 'none')).toBe('Estoque livre')
    expect(textoDoEstoque({ estoque: 0, disponivel: true }, 'backorder')).toBe('Estoque livre')
  })
})
