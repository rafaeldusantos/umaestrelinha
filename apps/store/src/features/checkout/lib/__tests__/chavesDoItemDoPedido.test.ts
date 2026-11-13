import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { buildOrderItems } from '../buildOrderPayload'

/**
 * As chaves que a loja manda em cada item do pedido × as colunas que o `create-order` grava.
 *
 * As duas pontas não se importam: a loja monta o item em `buildOrderItems`, e a function `checkout`
 * copia para `order_items` só o que está em `COLUNAS_DOS_ITENS` (mais a marca do Compre Junto, em
 * `COLUNAS_DA_MARCA`, que passa pela regra antes). Uma chave nova na loja que a function não lista é
 * DESCARTE SILENCIOSO — o pedido nasce, o teste da loja passa, o da function passa, e a coluna fica
 * nula para sempre. Uma coluna listada na function que a loja nunca manda é lista morta.
 *
 * Este guarda lê a function do DISCO e compara as duas listas por igualdade, nos dois sentidos.
 * Âncora dupla: as duas constantes foram achadas (com contagem) e o item montado tem chaves.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../../..')
const HANDLERS = resolve(ROOT, 'supabase/functions/checkout/handlers.ts')
const fonte = readFileSync(HANDLERS, 'utf8')

/** As strings de um `const NOME = [ ... ] as const`, ou `null` se a constante não for achada. */
const listaDe = (texto: string, nome: string): string[] | null => {
  const m = new RegExp(`const\\s+${nome}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as\\s+const`).exec(texto)
  if (!m) return null
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

const colunasDaFunction = (texto: string): string[] | null => {
  const itens = listaDe(texto, 'COLUNAS_DOS_ITENS')
  const marca = listaDe(texto, 'COLUNAS_DA_MARCA')
  return itens && marca ? [...itens, ...marca].sort() : null
}

/**
 * A linha de campanha leva, além das colunas de sempre, o percentual EXIBIDO — que a function lê para
 * comparar e não grava (`COLUNAS_DA_CAMPANHA_EXIBIDA`).
 */
const colunasDaLinhaDeCampanha = (texto: string): string[] | null => {
  const sempre = colunasDaFunction(texto)
  const campanha = listaDe(texto, 'COLUNAS_DA_CAMPANHA_EXIBIDA')
  return sempre && campanha ? [...sempre, ...campanha].sort() : null
}

/** As chaves da linha de uma peça de campanha, como a loja a monta. */
const chavesDaLinhaDeCampanha = (): string[] =>
  Object.keys(
    buildOrderItems({
      items: [
        {
          product: produto('peca-black'),
          size: '',
          finish: '',
          variantId: null,
          variantLabel: '',
          optionValues: {},
          unitPrice: 167.92,
          quantity: 1,
        },
      ] as never,
      pricingItems: [{ product_id: 'peca-black', unit_price: 209.9, quantity: 1, campaign: { percent: 20 } }],
      lines: [{ index: 0, quantity: 1, fullUnitPrice: 209.9, unitPrice: 167.92 }],
      bumpProduct: null,
    })[0],
  ).sort()

const produto = (id: string) =>
  ({ id, name: id, images: [{ url: 'https://cdn.test/x.jpg', is_primary: true }], requires_material: false }) as never

/** As chaves de cada linha — a da sacola com variação e marca, e a do bump. */
const chavesDaLoja = (): string[][] =>
  buildOrderItems({
    items: [
      {
        product: produto('joia'),
        size: '',
        finish: '',
        variantId: null,
        variantLabel: '',
        optionValues: {},
        unitPrice: 100,
        quantity: 1,
      },
      {
        product: produto('corrente'),
        size: '',
        finish: '',
        variantId: 'v1',
        variantLabel: '45 cm',
        optionValues: { Tamanho: '45 cm' },
        unitPrice: 50,
        quantity: 1,
        engravingText: 'Ana',
        accompanies: [{ mainProductId: 'joia', listId: null }],
      },
    ] as never,
    lines: [
      { index: 0, quantity: 1, fullUnitPrice: 100, unitPrice: 100 },
      { index: 1, quantity: 1, fullUnitPrice: 50, unitPrice: 45 },
      { index: 2, quantity: 1, fullUnitPrice: 40, unitPrice: 36 },
    ],
    bumpProduct: produto('bump'),
  }).map((linha) => Object.keys(linha).sort())

describe('as chaves do item do pedido batem com as colunas do create-order', () => {
  it('âncora: a function foi lida e as duas listas foram achadas, com 15 e 2 colunas', () => {
    expect(fonte).toContain('export async function createOrder')
    expect(listaDe(fonte, 'COLUNAS_DOS_ITENS')).toHaveLength(15)
    expect(listaDe(fonte, 'COLUNAS_DA_MARCA')).toEqual(['accompanies_product_ids', 'accompanies_list_ids'])
    expect(listaDe(fonte, 'COLUNAS_DA_CAMPANHA_EXIBIDA')).toEqual(['campaign_percent'])
  })

  it('a campanha vinda do corpo nunca é copiada: ela não está entre as colunas gravadas como vieram', () => {
    const copiadas = listaDe(fonte, 'COLUNAS_DOS_ITENS') ?? []
    for (const coluna of ['campaign_percent', 'campaign_id', 'compare_unit_price']) {
      expect(copiadas).not.toContain(coluna)
    }
  })

  it('sensor — a campanha posta na lista copiada é acusada', () => {
    const mutante = fonte.replace("  'engraving_text',\n] as const", "  'engraving_text',\n  'campaign_percent',\n] as const")
    expect(mutante).not.toBe(fonte)
    expect(listaDe(mutante, 'COLUNAS_DOS_ITENS')).toContain('campaign_percent')
  })

  it('âncora: as três linhas da loja (comum, adicional e bump) têm chaves', () => {
    const linhas = chavesDaLoja()
    expect(linhas).toHaveLength(3)
    for (const chaves of linhas) expect(chaves).toContain('product_id')
  })

  it('cada linha que a loja monta tem EXATAMENTE as colunas que a function grava', () => {
    const colunas = colunasDaFunction(fonte)
    for (const chaves of chavesDaLoja()) expect(chaves).toEqual(colunas)
  })

  it('a linha de campanha tem as colunas de sempre mais o percentual exibido, e nada além', () => {
    expect(chavesDaLinhaDeCampanha()).toEqual(colunasDaLinhaDeCampanha(fonte))
  })

  it('sensor — a lista da campanha exibida apagada reprova, em vez de virar lista vazia', () => {
    const mutante = fonte.replace('const COLUNAS_DA_CAMPANHA_EXIBIDA', 'const OUTRA_LISTA')
    expect(mutante).not.toBe(fonte)
    expect(colunasDaLinhaDeCampanha(mutante)).toBeNull()
  })

  it('sensor — uma coluna a menos na function reprova (a chave da loja seria descartada)', () => {
    const mutante = fonte.replace("  'engraving_text',\n", '')
    expect(mutante).not.toBe(fonte)
    expect(chavesDaLoja()[0]).not.toEqual(colunasDaFunction(mutante))
  })

  it('sensor — a constante renomeada ou apagada reprova, em vez de virar lista vazia', () => {
    const mutante = fonte.replace('const COLUNAS_DA_MARCA', 'const OUTRA_LISTA')
    expect(mutante).not.toBe(fonte)
    expect(colunasDaFunction(mutante)).toBeNull()
    expect(chavesDaLoja()[0]).not.toEqual(colunasDaFunction(mutante))
  })
})
