import { describe, expect, it } from 'vitest'
import {
  CATEGORY_LIST_MAX_ITEMS,
  categoryListRefusal as categoryListRefusalDoCore,
  ordinalF as ordinalFDoCore,
} from '@estrelinha/core/home'
import { categoryListRefusal, ordinalF } from '../sectionRefusals'
import { emptyDraftItem, type DraftItem } from '../sectionDraft'

/**
 * As recusas dos editores de seção do painel.
 *
 * Nenhuma regra nasce aqui (o cabeçalho de `sectionRefusals.ts` diz por quê), então o que este
 * arquivo prova é **fiação**: a palavra e a recusa que a tela mostra são as de `core`.
 */

describe('ordinalF — o feminino tem UM dono, e ele é `core` (feature 64)', () => {
  it('é a MESMA função de `core`, reexportada — não uma cópia', () => {
    // `toBe`, e não `toEqual`: duas funções com o mesmo corpo seriam iguais estruturalmente e
    // divergiriam no primeiro ajuste.
    expect(ordinalF).toBe(ordinalFDoCore)
  })

  it('escreve o número com o indicador feminino', () => {
    expect(ordinalF(3)).toBe('3ª')
  })
})

describe('categoryListRefusal — a recusa de `core` chega intacta à tela (feature 64, LCT-19, LCT-20)', () => {
  const pronto = (n: number): DraftItem => ({
    ...emptyDraftItem(),
    category_id: `cat-${n}`,
    image_url: `/circulo-${n}.png`,
    label_snapshot: `Coleção ${n}`,
  })

  it('rascunho válido (e vazio) não é recusado', () => {
    expect(categoryListRefusal({}, [pronto(1), pronto(2)])).toBeNull()
    // Lista vazia: o bloco nasce assim (LCT-15).
    expect(categoryListRefusal({}, [])).toBeNull()
  })

  it('item sem imagem: a frase de `core`, com a posição', () => {
    const itens = [pronto(1), pronto(2), { ...pronto(3), image_url: null }]
    expect(categoryListRefusal({}, itens)).toBe('A 3ª categoria está sem imagem.')
    expect(categoryListRefusal({}, itens)).toBe(categoryListRefusalDoCore({}, itens))
  })

  it('item sem coleção: a frase de `core`, com a posição', () => {
    const itens = [pronto(1), { ...pronto(2), category_id: null, label_snapshot: null }]
    expect(categoryListRefusal({}, itens)).toBe('A 2ª categoria está sem coleção.')
    expect(categoryListRefusal({}, itens)).toBe(categoryListRefusalDoCore({}, itens))
  })

  it(`acima de ${CATEGORY_LIST_MAX_ITEMS} itens: o teto de \`core\`, também na gravação`, () => {
    const itens = Array.from({ length: CATEGORY_LIST_MAX_ITEMS + 1 }, (_, i) => pronto(i + 1))
    const motivo = categoryListRefusal({}, itens)
    expect(motivo).toBe(categoryListRefusalDoCore({}, itens))
    expect(motivo).toContain(`Até ${CATEGORY_LIST_MAX_ITEMS} categorias por bloco`)
    // E 24 passa: o teto é recusa do que passa dele, não do que chega nele.
    expect(categoryListRefusal({}, itens.slice(0, CATEGORY_LIST_MAX_ITEMS))).toBeNull()
  })
})
