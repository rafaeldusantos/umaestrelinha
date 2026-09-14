import { describe, expect, it } from 'vitest'
import { FEATURED_PRODUCTS_MAX, featuredDisplay, featuredProductsRefusal } from '../featured'
import type { HomeSectionConfig, HomeSectionItem } from '../types'

/**
 * Feature 50 — `DST-07`..`DST-11`.
 *
 * O vocabulário do bloco **Produtos em destaque**: como ele se apresenta e por que um rascunho não
 * pode ser salvo. As duas perguntas moram aqui, e não na tela, porque **duas telas as fazem** — o
 * editor do painel cobra, e a loja confia. Respondidas em cada uma, divergiriam sem nada quebrar.
 */

const peca = (id: string, over: Partial<HomeSectionItem> = {}): Partial<HomeSectionItem> => ({
  product_id: id,
  ...over,
})

const comTitulo = (over: Partial<HomeSectionConfig> = {}): HomeSectionConfig => ({
  title: 'Peças do Dia das Mães',
  ...over,
})

/** N peças distintas, na ordem — o rascunho que **passa**, para a régua ter os dois lados. */
const pecas = (n: number): Partial<HomeSectionItem>[] =>
  Array.from({ length: n }, (_, i) => peca(`p${i + 1}`))

// ---------------------------------------------------------------------------
// O teto
// ---------------------------------------------------------------------------

describe('FEATURED_PRODUCTS_MAX — o teto do bloco', () => {
  it('cabem 12 peças', () => {
    // Resposta da dona: três linhas de quatro na grade, e ainda legível como fita.
    expect(FEATURED_PRODUCTS_MAX).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// `featuredDisplay` — DST-10
// ---------------------------------------------------------------------------

describe('featuredDisplay — como o bloco se apresenta (DST-10)', () => {
  it('`grid` é a única entrada que devolve grade', () => {
    expect(featuredDisplay('grid')).toBe('grid')
  })

  it('`slider` devolve fita', () => {
    expect(featuredDisplay('slider')).toBe('slider')
  })

  it('ausente devolve fita', () => {
    // `config.display` não existe nas seções gravadas antes desta feature: o bloco tem de desenhar
    // assim mesmo.
    expect(featuredDisplay(undefined)).toBe('slider')
  })

  it('`null` devolve fita', () => {
    expect(featuredDisplay(null)).toBe('slider')
  })

  it('string vazia devolve fita', () => {
    expect(featuredDisplay('')).toBe('slider')
  })

  it('valor desconhecido devolve fita, e NÃO recusa', () => {
    // Config gravado por uma versão mais nova ou por escrita direta não pode apagar o bloco da
    // Home. Cair no padrão é a mesma escolha de `heroCarouselWidth`.
    expect(featuredDisplay('mosaico')).toBe('slider')
  })

  it('`GRID` em caixa alta NÃO é grade — o valor gravado é o literal, não uma aproximação', () => {
    expect(featuredDisplay('GRID')).toBe('slider')
  })
})

// ---------------------------------------------------------------------------
// `featuredProductsRefusal` — DST-07, DST-08, DST-09, DST-11
// ---------------------------------------------------------------------------

describe('featuredProductsRefusal — o rascunho que pode ser salvo', () => {
  it('título e peças distintas: nada a cobrar', () => {
    expect(featuredProductsRefusal(comTitulo(), pecas(3))).toBeNull()
  })

  it('exatamente 12 peças passa — o teto recusa o 13º, não o 12º', () => {
    expect(featuredProductsRefusal(comTitulo(), pecas(FEATURED_PRODUCTS_MAX))).toBeNull()
  })
})

describe('featuredProductsRefusal — o título (DST-07)', () => {
  it('sem título, a recusa diz que é ele que abre a seção', () => {
    const motivo = featuredProductsRefusal({}, pecas(3))
    expect(motivo).toBe(
      'Dê um título ao bloco. É ele que abre a seção na loja — sem título, a vitrine começa com uma fileira de peças sem dizer por quê.',
    )
  })

  it('título só com espaço é título vazio', () => {
    expect(featuredProductsRefusal({ title: '   ' }, pecas(3))).toContain('Dê um título ao bloco.')
  })

  it('`config` ausente também cobra o título', () => {
    expect(featuredProductsRefusal(null, pecas(3))).toContain('Dê um título ao bloco.')
    expect(featuredProductsRefusal(undefined, pecas(3))).toContain('Dê um título ao bloco.')
  })
})

describe('featuredProductsRefusal — a lista vazia (DST-11)', () => {
  it('sem peça escolhida, a recusa diz que o bloco não aparece na loja', () => {
    expect(featuredProductsRefusal(comTitulo(), [])).toBe(
      'Escolha ao menos uma peça. Um bloco sem peça escolhida não aparece na loja.',
    )
  })

  it('lista ausente é lista vazia', () => {
    expect(featuredProductsRefusal(comTitulo(), null)).toContain('Escolha ao menos uma peça.')
    expect(featuredProductsRefusal(comTitulo(), undefined)).toContain('Escolha ao menos uma peça.')
  })
})

describe('featuredProductsRefusal — o teto (DST-08)', () => {
  it('a 13ª peça é recusada com o teto NOMEADO e a saída do segundo bloco', () => {
    const motivo = featuredProductsRefusal(comTitulo(), pecas(13))
    // `L-036`: a AC diz "uma mensagem que **nomeia o teto** e sugere um segundo bloco". As duas
    // metades são asseridas pelo literal — a segunda é exatamente a que some sem ninguém notar.
    expect(motivo).toBe(
      'Cabem 12 peças neste bloco, e há 13. Remova as que sobram, ou acrescente um segundo bloco “Produtos em destaque” para as outras.',
    )
  })

  it('a recusa conta quantas há, não só que passou do teto', () => {
    expect(featuredProductsRefusal(comTitulo(), pecas(20))).toContain('e há 20.')
  })
})

describe('featuredProductsRefusal — a peça órfã', () => {
  it('item sem `product_id` é cobrado pela POSIÇÃO dele', () => {
    const motivo = featuredProductsRefusal(comTitulo(), [
      peca('p1'),
      { product_id: null },
      peca('p3'),
    ])
    expect(motivo).toBe(
      '2º item: escolha a peça, ou remova esta linha. Ela perdeu o produto do catálogo.',
    )
  })

  it('`product_id` só com espaço é órfão também', () => {
    expect(featuredProductsRefusal(comTitulo(), [peca('   ')])).toContain('1º item:')
  })
})

describe('featuredProductsRefusal — a repetição (DST-09)', () => {
  it('a segunda ocorrência é recusada, dizendo que a peça já está no bloco', () => {
    const motivo = featuredProductsRefusal(comTitulo(), [peca('p1'), peca('p2'), peca('p1')])
    expect(motivo).toBe('3º item: esta peça já está no bloco. Cada uma aparece uma vez.')
  })
})

describe('featuredProductsRefusal — a ORDEM das cobranças é regra', () => {
  it('título vazio vence lista vazia', () => {
    expect(featuredProductsRefusal({}, [])).toContain('Dê um título ao bloco.')
  })

  it('título vazio vence o teto', () => {
    expect(featuredProductsRefusal({}, pecas(13))).toContain('Dê um título ao bloco.')
  })

  it('lista vazia é cobrada antes do laço item a item', () => {
    // Vizinha e não substituta da asserção de `DST-11`: com a lista vazia não há item para cobrar,
    // e é a ordem que garante que a frase seja a da lista, nunca um laço que não roda.
    expect(featuredProductsRefusal(comTitulo(), [])).toContain('Escolha ao menos uma peça.')
  })

  it('o teto vence a repetição — 13 peças iguais cobram o teto, não o repetido', () => {
    const treze = Array.from({ length: 13 }, () => peca('p1'))
    expect(featuredProductsRefusal(comTitulo(), treze)).toContain('Cabem 12 peças neste bloco')
  })

  it('a peça órfã vence a repetição quando vem antes', () => {
    const motivo = featuredProductsRefusal(comTitulo(), [
      { product_id: null },
      peca('p2'),
      peca('p2'),
    ])
    expect(motivo).toContain('1º item: escolha a peça')
  })

  it('a repetição vence quando a órfã vem depois — o laço cobra na ORDEM da lista', () => {
    const motivo = featuredProductsRefusal(comTitulo(), [
      peca('p2'),
      peca('p2'),
      { product_id: null },
    ])
    expect(motivo).toContain('2º item: esta peça já está no bloco.')
  })
})
