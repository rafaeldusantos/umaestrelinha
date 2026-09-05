import { describe, expect, it } from 'vitest'

import {
  type ProdutoLocal,
  type VariacaoLocal,
  buildIndex,
  matchItem,
  normalizar,
  orphanProductId,
  suggestBySku,
  splitVariantValues,
  stripVariant,
  variantKey,
  variantPart,
} from '../catalogMatch.ts'

/**
 * O casamento de item, e a recusa de casar errado.
 *
 * Os nomes e SKUs daqui reproduzem **arranjos** medidos no catálogo real — parêntese aninhado,
 * variação com três eixos, SKU compartilhado por dois produtos — com conteúdo inventado.
 */

const produto = (id: string, name: string, nuvemshopId: number): ProdutoLocal => ({
  id, name, nuvemshop_id: nuvemshopId, requires_material: null, material_kinds: [],
})

const variacao = (
  id: string, product_id: string, sku: string | null, option_values: Record<string, string> | null,
): VariacaoLocal => ({ id, product_id, sku, option_values })

const P_ARVORE = produto('uuid-arvore', 'Joia Afetiva Árvore da Vida com Flores', 1)
const P_CORRENTE = produto('uuid-corrente', 'Corrente Veneziana em Aço Inoxidável', 2)
const P_REDONDA = produto('uuid-redonda', 'Joia afetiva redonda com base em prata 925', 3)
const P_OUTRO = produto('uuid-outro', 'Pingente Afetivo Redondo', 4)

const index = buildIndex(
  [P_ARVORE, P_CORRENTE, P_REDONDA, P_OUTRO],
  [
    variacao('v-arvore-ouro', 'uuid-arvore', 'ARV-01', { Material: 'Folheado a ouro (Prata 925)' }),
    variacao('v-arvore-prata', 'uuid-arvore', 'ARV-02', { Material: 'Prata 925' }),
    variacao('v-corrente', 'uuid-corrente', 'CORR-01', null),
    variacao('v-redonda', 'uuid-redonda', 'AMBIGUO', {
      Tamanho: '2 cm', Gravação: 'Não', Corrente: 'Sem Corrente',
    }),
    // O MESMO SKU em outro produto — é o caso dos 61 medidos no catálogo real.
    variacao('v-outro', 'uuid-outro', 'AMBIGUO', { Cor: 'Dourado' }),
  ],
)

describe('normalizar', () => {
  it('tira acento e caixa e colapsa espaço', () => {
    expect(normalizar('  Joia   AFETIVA  Árvore ')).toBe('joia afetiva arvore')
  })

  it('NÃO tira pontuação — hífen e parêntese distinguem produtos de verdade', () => {
    expect(normalizar('Corrente (45cm)')).toBe('corrente (45cm)')
    expect(normalizar('Joia - Teste')).toBe('joia - teste')
  })
})

describe('stripVariant — o recorte tem de ser BALANCEADO', () => {
  it('remove um grupo simples', () => {
    expect(stripVariant('Joia Afetiva de Teste (Prata 925)')).toBe('Joia Afetiva de Teste')
  })

  it('remove o grupo ANINHADO inteiro', () => {
    expect(stripVariant('Joia Afetiva de Teste (Folheado a ouro (Prata 925))'))
      .toBe('Joia Afetiva de Teste')
  })

  it('remove grupo com vários valores', () => {
    expect(stripVariant('Joia afetiva redonda com base em prata 925 (2 cm, Não, Sem Corrente)'))
      .toBe('Joia afetiva redonda com base em prata 925')
  })

  it('devolve null quando o nome não termina em parêntese', () => {
    expect(stripVariant('Pirâmide com cabelo')).toBeNull()
  })

  it('SENSOR: o recorte ingênuo (primeiro `(`) daria outro resultado no caso aninhado', () => {
    // É a diferença medida entre 50,8% e 40,7% de casamento. Se algum dia alguém "simplificar"
    // `stripVariant` para um `indexOf('(')`, este teste é quem acusa.
    const nome = 'Joia Afetiva de Teste (Folheado a ouro (Prata 925))'
    const ingenuo = nome.slice(0, nome.indexOf('(')).trimEnd()
    expect(ingenuo).toBe('Joia Afetiva de Teste')
    // ...igual neste caso. O que os separa é quando o NOME tem parêntese e a variação também:
    const comParenteseNoNome = 'Corrente Veneziana de Prata 925 (45cm) (Prata 925)'
    expect(stripVariant(comParenteseNoNome)).toBe('Corrente Veneziana de Prata 925 (45cm)')
    expect(comParenteseNoNome.slice(0, comParenteseNoNome.indexOf('(')).trimEnd())
      .toBe('Corrente Veneziana de Prata 925')
    expect(stripVariant(comParenteseNoNome)).not.toBe(
      comParenteseNoNome.slice(0, comParenteseNoNome.indexOf('(')).trimEnd(),
    )
  })
})

describe('valores da variação', () => {
  it('`variantPart` devolve o conteúdo do grupo final', () => {
    expect(variantPart('Joia (Folheado a ouro (Prata 925))')).toBe('Folheado a ouro (Prata 925)')
    expect(variantPart('Pirâmide com cabelo')).toBeNull()
  })

  it('separa por vírgula de NÍVEL ZERO — parêntese interno não conta', () => {
    expect(splitVariantValues('2 cm, Não, Sem Corrente')).toEqual(['2 cm', 'Não', 'Sem Corrente'])
    expect(splitVariantValues('Folheado a ouro (Prata 925)')).toEqual(['Folheado a ouro (Prata 925)'])
  })

  it('a chave de variação não depende da ordem dos eixos', () => {
    expect(variantKey(['2 cm', 'Não', 'Sem Corrente']))
      .toBe(variantKey(['Sem Corrente', '2 cm', 'Não']))
  })
})

describe('matchItem — a ordem é fixa', () => {
  it('1º: nome completo, exato', () => {
    const m = matchItem('Corrente Veneziana em Aço Inoxidável', index)
    expect(m?.kind).toBe('nome')
    expect(m?.produto.id).toBe('uuid-corrente')
  })

  it('2º: nome sem o grupo de parênteses, com a variação resolvida', () => {
    const m = matchItem('Joia Afetiva Árvore da Vida com Flores (Folheado a ouro (Prata 925))', index)
    expect(m?.kind).toBe('nome-base')
    expect(m?.produto.id).toBe('uuid-arvore')
    expect(m?.variacao?.id).toBe('v-arvore-ouro')
  })

  it('não há terceiro caminho: nome desconhecido é órfão, mesmo com SKU no catálogo', () => {
    // O SKU saiu da cadeia de propósito — ver o bloco "o SKU NÃO identifica", abaixo.
    expect(matchItem('Nome Que Nao Existe No Catalogo', index)).toBeNull()
  })

  it('casa o produto mesmo quando a variação não resolve', () => {
    // Duas perguntas diferentes: o eixo pode ter sido renomeado sem o produto mudar de nome.
    const m = matchItem('Joia Afetiva Árvore da Vida com Flores (Cor Inventada)', index)
    expect(m?.produto.id).toBe('uuid-arvore')
    expect(m?.variacao).toBeNull()
  })

  it('acento e caixa não impedem o casamento', () => {
    expect(matchItem('JOIA AFETIVA ARVORE DA VIDA COM FLORES', index)?.produto.id)
      .toBe('uuid-arvore')
  })
})

describe('o SKU NÃO identifica — nem quando parece único', () => {
  it('SKU único no catálogo local NÃO produz vínculo', () => {
    // `ARV-02` aponta para uma variação só AQUI. Ainda assim não casa: a unicidade local é
    // fabricada por `dedupeSkus`, que nulifica o SKU de todas as variações menos a primeira. No
    // catálogo real `BA-002` aparece 316× em 68 produtos e sobrevive numa variação arbitrária.
    expect(index.porSku.get('ARV-02')?.size).toBe(1)
    expect(matchItem('Nome Que Nao Existe', index)).toBeNull()
  })

  it('SKU compartilhado por dois produtos tampouco casa', () => {
    expect(index.porSku.get('AMBIGUO')?.size).toBe(2)
    expect(matchItem('Outro Nome Que Nao Existe', index)).toBeNull()
  })

  it('SENSOR: o SKU ESTÁ no índice — a recusa é decisão, não ausência de dado', () => {
    // Sem isto, os dois testes acima passariam mesmo que `buildIndex` tivesse parado de indexar SKU.
    expect(index.variacaoPorSku.has('ARV-02')).toBe(true)
    expect(index.variacaoPorSku.has('AMBIGUO')).toBe(true)
  })

  it('`suggestBySku` devolve o candidato para o RELATÓRIO, sem gravá-lo', () => {
    // A informação não se perde: quem lê o relatório vê "este órfão talvez seja aquele produto" e
    // decide à mão. Gravar seria o vínculo fabricado que `matchItem` recusa.
    expect(suggestBySku('ARV-02', index)?.id).toBe('uuid-arvore')
    expect(suggestBySku('AMBIGUO', index)).toBeNull()
    expect(suggestBySku(null, index)).toBeNull()
    expect(suggestBySku('NAO-EXISTE', index)).toBeNull()
  })

  it('nome desconhecido é órfão', () => {
    expect(matchItem('Pirâmide com cabelo', index)).toBeNull()
    expect(matchItem('Manutenção de joia de resina', index)).toBeNull()
  })

  it('o `product_id` do órfão é derivado do nome normalizado', () => {
    expect(orphanProductId('Pirâmide com cabelo')).toBe('nuvemshop:piramide com cabelo')
  })
})

describe('taxa de casamento — o piso da feature', () => {
  it('os dois caminhos de nome funcionam', () => {
    // Âncora da régua: se qualquer um dos dois deixar de funcionar, a taxa cai e o gate reprova.
    const casos = [
      'Corrente Veneziana em Aço Inoxidável',
      'Joia Afetiva Árvore da Vida com Flores (Prata 925)',
    ]
    expect(casos.filter(nome => matchItem(nome, index) !== null)).toHaveLength(2)
  })
})
