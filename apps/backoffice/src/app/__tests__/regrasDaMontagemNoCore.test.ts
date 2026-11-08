// As regras da montagem do pedido que o painel e o app do ateliê leem — a busca de produto e a dobra
// (`@estrelinha/core/product-search`), a capa, a foto da linha, o mapeamento da peça, o texto do
// estoque e a frase do link sem loja (`@estrelinha/core/proposals`) — moram em `core`, e o painel as
// REEXPORTA. A régua é `toBe` (identidade), nunca `toEqual`: uma cópia colada com o mesmo valor
// passaria por igualdade estrutural e seria exatamente o segundo dono que a subida existe para
// impedir (o defeito 01).
//
// Mora em `app/__tests__` porque lê `entities`, `shared` E `features` — de `entities` o import de
// `features` é fronteira FSD ao contrário.
//
// A lista é LITERAL (um símbolo por linha, pelo caminho que os chamadores do painel usam), e não
// derivada de `Object.keys`: derivar provaria que o painel reexporta o que reexporta.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import * as busca from '@estrelinha/core/product-search'
import * as propostas from '@estrelinha/core/proposals'

import * as texto from '@/shared/lib/texto'
import * as buscarProdutos from '@/entities/product/lib/buscarProdutos'
import * as estoque from '@/entities/product/lib/estoque'
import * as capas from '@/entities/product/api/useProductCovers'
import * as produto from '@/entities/product'
import * as copy from '@/features/order-proposal/model/copy'
import * as proposta from '@/features/order-proposal'

const PARES: [string, unknown, unknown][] = [
  // `shared/lib/texto.ts`
  ['shared/lib/texto.dobrarTexto', texto.dobrarTexto, busca.dobrarTexto],
  ['shared/lib/texto.palavrasDoTermo', texto.palavrasDoTermo, busca.palavrasDoTermo],
  // `entities/product/lib/buscarProdutos.ts` e o slice
  ['entities/product/lib/buscarProdutos.buscarProdutos', buscarProdutos.buscarProdutos, busca.buscarProdutos],
  ['entities/product/lib/buscarProdutos.RESULTADOS_VISIVEIS', buscarProdutos.RESULTADOS_VISIVEIS, busca.RESULTADOS_VISIVEIS],
  ['entities/product.buscarProdutos', produto.buscarProdutos, busca.buscarProdutos],
  // `entities/product/api/useProductCovers.ts` e o slice
  ['entities/product/api/useProductCovers.capaDaLinha', capas.capaDaLinha, propostas.capaDaLinha],
  ['entities/product.capaDaLinha', produto.capaDaLinha, propostas.capaDaLinha],
  // `entities/product/lib/estoque.ts` e o slice
  ['entities/product/lib/estoque.textoDoEstoque', estoque.textoDoEstoque, propostas.textoDoEstoque],
  ['entities/product.textoDoEstoque', produto.textoDoEstoque, propostas.textoDoEstoque],
  // `features/order-proposal/model/copy.ts` e a feature
  ['order-proposal/model/copy.LINK_WITHOUT_STORE', copy.LINK_WITHOUT_STORE, propostas.LINK_WITHOUT_STORE],
  ['order-proposal.LINK_WITHOUT_STORE', proposta.LINK_WITHOUT_STORE, propostas.LINK_WITHOUT_STORE],
]

describe('o painel reexporta as regras da montagem de core — identidade, não cópia', () => {
  it('âncora: a lista tem os 11 caminhos e nenhum valor ausente', () => {
    expect(PARES).toHaveLength(11)
    for (const [nome, painel, dono] of PARES) {
      expect(painel, `${nome} existe no painel`).toBeDefined()
      expect(dono, `${nome} existe em core`).toBeDefined()
    }
  })

  it.each(PARES)('%s é a mesma referência de core', (_nome, painel, dono) => {
    expect(painel).toBe(dono)
  })

  it('sensor: uma cópia com o mesmo valor reprova na régua', () => {
    const copiaDeFuncao = (valor: string) => busca.dobrarTexto(valor)
    expect(copiaDeFuncao('Coração')).toBe(busca.dobrarTexto('Coração'))
    expect(copiaDeFuncao).not.toBe(busca.dobrarTexto)
    // Uma string colada é `toBe` à original (primitivo), então a frase é provada pela FONTE, abaixo.
  })
})

describe('o painel não guarda uma segunda escrita do que subiu (lido do disco)', () => {
  const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const ler = (rel: string) =>
    readFileSync(resolve(SRC, rel), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

  const declaraAFrase = (fonte: string) => fonte.includes('a loja não está configurada')
  const REGRAS_DO_MAPEAMENTO = ['variantLabel(', 'isVariantAvailable(', 'hasEngraving(', 'requiresMaterial(', 'capaDaLinha(']
  const refazOMapeamento = (fonte: string) => REGRAS_DO_MAPEAMENTO.filter((r) => fonte.includes(r))

  const COPY = ler('features/order-proposal/model/copy.ts')
  const VARIANTS = ler('entities/product/api/useProductVariants.ts')
  const CAPAS = ler('entities/product/api/useProductCovers.ts')

  it('âncora: os três arquivos foram lidos e não estão vazios', () => {
    expect(COPY).toContain('PROPOSAL_PAGE_PATH')
    expect(VARIANTS).toContain('lerPecaParaProposta')
    expect(CAPAS).toContain('useProductCovers')
  })

  it('a frase do link sem loja não é escrita no painel, só reexportada', () => {
    expect(declaraAFrase(COPY)).toBe(false)
    expect(COPY).toMatch(/export \{ LINK_WITHOUT_STORE \} from '@estrelinha\/core\/proposals'/)
  })

  it('a leitura da peça delega o mapeamento a core e não o refaz', () => {
    expect(VARIANTS).toContain('mapearPecaParaProposta(')
    expect(refazOMapeamento(VARIANTS)).toEqual([])
  })

  it('a capa não é declarada no painel', () => {
    expect(CAPAS).not.toMatch(/const capaDaLinha\s*=/)
  })

  it('sensor: a escrita antiga da frase e do mapeamento É acusada pelas mesmas réguas', () => {
    const fraseAntiga = "export const LINK_WITHOUT_STORE =\n  'O link foi criado, mas a loja não está configurada neste painel para montá-lo.'"
    expect(declaraAFrase(fraseAntiga)).toBe(true)
    const mapeamentoAntigo = "rotulo: variantLabel(opcoes, valores) || 'Variação sem nome',\n grava: hasEngraving(valores),"
    expect(refazOMapeamento(mapeamentoAntigo)).toEqual(['variantLabel(', 'hasEngraving('])
  })
})
