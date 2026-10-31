// `MON-05` — a peça por id, com só as variações ativas e o estoque de cada uma (feature 89, T11).
//
// O dublê ENXERGA os filtros (`criarDuble`): sem isso "só ativas" seria inauditável — apagar o
// `.eq('is_active', true)` deixaria a suíte verde com uma resposta que já viesse filtrada. E ele
// devolve uma linha pausada MESMO com o filtro, para provar a segunda trava (a do código).

import { describe, expect, it } from 'vitest'
import { criarDuble, type Registro } from '@/test/dubleSupabase'
import {
  PROPOSAL_PRODUCT_COLUMNS,
  PROPOSAL_VARIANT_COLUMNS,
  lerPecaParaProposta,
} from '../useProductVariants'

const PECA = '11111111-1111-4111-8111-111111111111'

const produto = {
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
  // Pausada, devolvida apesar do filtro: a trava do código tem de tirá-la.
  { id: 'v-3', product_id: PECA, price: 150, option_values: { Tamanho: 'M' }, image_url: null, is_active: false, stock: 9, position: 2, weight_kg: null },
]

const encenar = (over: Partial<Record<string, unknown>> = {}) =>
  criarDuble((r: Registro) => {
    if (r.table === 'products') return { data: over.produto === undefined ? produto : over.produto, error: (over.erroProduto as never) ?? null }
    return { data: variacoes, error: (over.erroVariacoes as never) ?? null }
  })

describe('lerPecaParaProposta — a leitura (MON-05)', () => {
  it('lê a peça POR ID com as colunas nomeadas, e as variações só ativas, na ordem do cadastro', async () => {
    const duble = encenar()
    await lerPecaParaProposta(PECA, duble)

    const [p, v] = duble.calls
    expect(p.table).toBe('products')
    expect(p.select).toEqual([PROPOSAL_PRODUCT_COLUMNS])
    expect(p.filters).toEqual([{ method: 'eq', args: ['id', PECA] }])
    expect(PROPOSAL_PRODUCT_COLUMNS).not.toMatch(/description|\*/)

    expect(v.table).toBe('product_variants')
    expect(v.select).toEqual([PROPOSAL_VARIANT_COLUMNS])
    expect(v.filters).toEqual([
      { method: 'eq', args: ['product_id', PECA] },
      { method: 'eq', args: ['is_active', true] },
      { method: 'order', args: ['position'] },
    ])
  })

  it('só ativas: a linha pausada que o banco devolvesse não chega à tela', async () => {
    const peca = await lerPecaParaProposta(PECA, encenar())
    expect(peca?.variacoes.map((x) => x.id)).toEqual(['v-1', 'v-2'])
  })

  it('cada variação traz rótulo, preço, estoque e se pode ser vendida agora', async () => {
    const peca = await lerPecaParaProposta(PECA, encenar())
    expect(peca?.variacoes[0]).toMatchObject({ rotulo: 'P · Sim', preco: 199, estoque: 3, disponivel: true, grava: true })
    // Política `track` com estoque zero: não vende.
    expect(peca?.variacoes[1]).toMatchObject({ rotulo: 'G · Não', preco: 179, estoque: 0, disponivel: false, grava: false })
  })

  it('a política que não controla estoque vende com estoque zero', async () => {
    const duble = encenar({ produto: { ...produto, stock_policy: 'none' } })
    const peca = await lerPecaParaProposta(PECA, duble)
    expect(peca?.variacoes[1].disponivel).toBe(true)
  })

  it('traz o que a linha da proposta precisa: material, teto de gravação, preço base e medidas', async () => {
    const peca = await lerPecaParaProposta(PECA, encenar())
    expect(peca).toMatchObject({
      nome: 'Colar de Cinzas',
      precoBase: 189.9,
      pedeMaterial: true,
      limiteDeGravacao: 12,
      politica: 'track',
      medidas: { weight_kg: 0.02, width_cm: null, height_cm: 3, length_cm: null },
    })
  })

  it('peça inexistente devolve null (não uma peça sem grade)', async () => {
    expect(await lerPecaParaProposta(PECA, encenar({ produto: null }))).toBeNull()
  })

  it('falha de leitura LANÇA — nunca vira "peça sem variação", que venderia pelo preço base', async () => {
    await expect(lerPecaParaProposta(PECA, encenar({ erroVariacoes: { message: 'caiu' } }))).rejects.toThrow('caiu')
    await expect(lerPecaParaProposta(PECA, encenar({ erroProduto: { message: 'fora' } }))).rejects.toThrow('fora')
  })
})
