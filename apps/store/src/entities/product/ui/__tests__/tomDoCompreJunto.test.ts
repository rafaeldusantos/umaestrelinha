import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * O registro do negócio é memorial: o Compre Junto não usa urgência, contagem, escassez, prova
 * social, apelo à economia, exclamação nem emoji. Este guarda lê do disco, sem comentário, os textos
 * do bloco (`buy-together/` e `core/buy-together`) e os das outras pontas onde o desconto da compra
 * casada é dito: o resumo do checkout (`features/checkout/ui/OrderSummary.tsx`), o resumo do pedido
 * (`core/orders/summary.ts` e `entities/order/ui/OrderItemsSummary.tsx`), o e-mail do pedido
 * (`send-notification/render/layout.ts`) e a página do pedido no painel (`AdminOrderPage.tsx`).
 * A régua procura as formas proibidas; a prosa que as explica mora em `.specs/`.
 *
 * Fora do escopo, declarado: `entities/product/ui/ProductInfo.tsx`. O selo do preço comparativo
 * dele usa o verbo de economia no imperativo desde antes do Compre Junto, e não é texto do desconto
 * da compra casada.
 */

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '../../../../../../..')
const BLOCO = join(AQUI, '..', 'buy-together')
const CORE = join(RAIZ, 'packages/core/src/buy-together')

/** As pontas fora do bloco, uma por arquivo, escritas por extenso. */
const PONTAS = [
  'apps/store/src/features/checkout/ui/OrderSummary.tsx',
  'apps/store/src/entities/order/ui/OrderItemsSummary.tsx',
  'packages/core/src/orders/summary.ts',
  'supabase/functions/send-notification/render/layout.ts',
  'apps/backoffice/src/pages/admin/AdminOrderPage.tsx',
]

const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

const lidos = [
  ...[BLOCO, CORE].flatMap(dir =>
    readdirSync(dir)
      .filter(f => /\.tsx?$/.test(f))
      .map(f => ({ nome: f, fonte: semComentarios(readFileSync(join(dir, f), 'utf8')) })),
  ),
  ...PONTAS.map(caminho => ({
    nome: basename(caminho),
    fonte: semComentarios(readFileSync(join(RAIZ, caminho), 'utf8')),
  })),
]

/** Literais de texto: o que a cliente lê. */
const literais = (fonte: string): string[] =>
  [...fonte.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].map(m => m[1] ?? m[2] ?? m[3] ?? '')

export const tomProibido = (texto: string): boolean =>
  /economiz|últim[ao]s?\b|\brestam?\b|\bresta\b|corra|aproveite|\bhoje\b|por tempo limitado|\bsó (?:até|hoje)|esgotando|poucas unidades|mais (?:vendid|comprad)|\bclientes? (?:amam|escolheram)|!|\p{Extended_Pictographic}/iu.test(
    texto,
  )

describe('o Compre Junto mantém o tom memorial', () => {
  it('âncora: o bloco, as regras e as quatro pontas foram lidos', () => {
    const nomes = lidos.map(l => l.nome)
    expect(nomes).toContain('BuyTogetherBlock.tsx')
    expect(nomes).toContain('AddonRow.tsx')
    expect(nomes).toContain('total.ts')
    // Uma de cada ponta: o bloco (acima), o checkout, o e-mail e o painel.
    expect(nomes).toContain('OrderSummary.tsx')
    expect(nomes).toContain('layout.ts')
    expect(nomes).toContain('AdminOrderPage.tsx')
    expect(nomes).toContain('summary.ts')
    expect(nomes).not.toContain('ProductInfo.tsx')
    // As frases novas estão mesmo entre os literais lidos (a régua não varre o arquivo errado).
    const todos = lidos.flatMap(l => literais(l.fonte))
    expect(todos).toContain('Desconto do Compre Junto')
    expect(lidos.flatMap(l => literais(l.fonte)).length).toBeGreaterThan(30)
  })

  it('nenhum literal usa urgência, contagem regressiva, escassez, prova social, apelo à economia, exclamação ou emoji', () => {
    const achados = lidos.flatMap(l =>
      literais(l.fonte)
        .filter(tomProibido)
        .map(t => `${l.nome}: ${t}`),
    )
    expect(achados).toEqual([])
  })

  it('sensor — cada forma proibida É acusada', () => {
    for (const frase of [
      'Últimas unidades',
      'Restam 2',
      'Corra, é só hoje',
      'Aproveite agora',
      'Oferta por tempo limitado',
      'Os mais vendidos',
      'Clientes amam',
      'Levei junto!',
      'Peça especial ✨',
      'Economize no conjunto',
      'Você economizou R$ 20,00',
    ]) {
      expect(tomProibido(frase), frase).toBe(true)
    }
  })

  it('sensor — o verbo de economia com exclamação num arquivo do escopo reprova a régua', () => {
    const fonte = semComentarios(readFileSync(join(RAIZ, PONTAS[4]), 'utf8'))
    const mutado = fonte.replace("'Grátis'", "'Economize! Grátis'")
    expect(mutado).not.toBe(fonte)
    expect(literais(fonte).filter(tomProibido)).toEqual([])
    expect(literais(mutado).filter(tomProibido)).toEqual(['Economize! Grátis'])
  })

  it('sensor inverso — os textos do bloco NÃO são acusados', () => {
    for (const frase of [
      'Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar.',
      'O botão de compra leva a joia e as peças marcadas.',
      'Escolha a peça · 3 modelos',
      'Essa combinação está indisponível no momento.',
      'Desconto do Compre Junto',
      'Desconto progressivo',
    ]) {
      expect(tomProibido(frase), frase).toBe(false)
    }
  })
})
