import { describe, expect, it } from 'vitest'
import type { ProductVariant } from '@estrelinha/supabase/types'
import {
  applyOrphanChecks,
  mergePausedIds,
  mergePausedLabels,
  orphanVerdict,
  stillPausedLabels,
} from './orphans'

// Feature 81, T02 — as órfãs: OPV-04 (vendida ou consulta falhou ⇒ fica pausada; sem pedido ⇒ sai)
// e OPV-25 (o resultado é aplicado por id sobre a grade ATUAL).

const v = (id: string, over: Partial<ProductVariant> = {}): ProductVariant => ({
  id,
  product_id: 'p1',
  option_values: { Tamanho: id },
  name: null,
  sku: null,
  price: 10,
  compare_price: null,
  stock: 1,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

describe('orphanVerdict — a régua de OPV-04', () => {
  it('sem pedido e consulta respondida ⇒ remove', () => {
    expect(orphanVerdict('a', '3,5 cm', { orders: 0 }).outcome).toBe('remove')
    expect(orphanVerdict('a', '3,5 cm', { orders: 0, verified: true }).outcome).toBe('remove')
  })

  it('vendida ⇒ pausa', () => {
    expect(orphanVerdict('a', '3,5 cm', { orders: 2 })).toEqual({ id: 'a', label: '3,5 cm', outcome: 'pause' })
  })

  it('um pedido só já é vendida ⇒ pausa (o limite da régua)', () => {
    expect(orphanVerdict('a', '3,5 cm', { orders: 1 }).outcome).toBe('pause')
  })

  it('consulta que falhou ⇒ pausa, nunca remove', () => {
    expect(orphanVerdict('a', '3,5 cm', { orders: 0, verified: false }).outcome).toBe('pause')
  })
})

describe('applyOrphanChecks', () => {
  it('remove a linha sem pedido', () => {
    const grade = [v('a'), v('b')]
    const r = applyOrphanChecks(grade, [{ id: 'b', outcome: 'remove', label: 'B' }])
    expect(r.variants.map(x => x.id)).toEqual(['a'])
    expect(r.paused).toEqual([])
  })

  it('pausa a vendida, mantendo o resto da linha, e devolve o rótulo dela para o aviso', () => {
    const vendida = v('b', { price: 33, stock: 4, sku: 'X' })
    const r = applyOrphanChecks([v('a'), vendida], [{ id: 'b', outcome: 'pause', label: '4,5 cm' }])
    expect(r.variants.map(x => x.id)).toEqual(['a', 'b'])
    expect(r.variants[1]).toEqual({ ...vendida, is_active: false })
    expect(r.paused).toEqual(['4,5 cm'])
  })

  it('id que não está mais na grade é ignorado — nem volta, nem conta no aviso', () => {
    const grade = [v('a')]
    const r = applyOrphanChecks(grade, [
      { id: 'sumiu', outcome: 'pause', label: 'Sumiu' },
      { id: 'outra', outcome: 'remove', label: 'Outra' },
    ])
    expect(r.variants).toEqual(grade)
    expect(r.paused).toEqual([])
  })

  it('OPV-25: aplicado sobre a grade editada DEPOIS da consulta, preserva a edição e não restaura o estado antigo', () => {
    // Grade quando a consulta saiu: a, b(órfã), c(órfã). Enquanto ela estava no ar, a Adri mudou
    // o preço de `a` e uma linha nova `tmp-1` entrou.
    const atual = [v('a', { price: 99 }), v('b'), v('c'), v('tmp-1', { price: 5 })]
    const r = applyOrphanChecks(atual, [
      { id: 'b', outcome: 'remove', label: 'B' },
      { id: 'c', outcome: 'pause', label: 'C' },
    ])
    expect(r.variants.map(x => [x.id, x.price, x.is_active])).toEqual([
      ['a', 99, true],
      ['c', 10, false],
      ['tmp-1', 5, true],
    ])
    expect(r.paused).toEqual(['C'])
  })
  it('OPV-25 (G2): uma linha ANTERIOR à órfã saiu antes da resposta — o veredito alcança a órfã, nunca a vizinha que herdou a posição', () => {
    // Quando a pergunta saiu a grade era a, b(órfã), c. Antes da resposta, `a` saiu: `c` está agora
    // na posição que `b` tinha. Aplicar pela posição apagaria `c`, que continua no cruzamento.
    const atual = [v('b'), v('c', { price: 33 })]
    const r = applyOrphanChecks(atual, [{ id: 'b', outcome: 'remove', label: 'B' }])
    expect(r.variants.map(x => [x.id, x.price, x.is_active])).toEqual([['c', 33, true]])
    expect(r.variants[0]).toBe(atual[1])
    expect(r.paused).toEqual([])
  })

  it('OPV-25 (G2): o mesmo, com a órfã vendida — a pausa cai na órfã e a vizinha segue ativa', () => {
    const atual = [v('b'), v('c')]
    const r = applyOrphanChecks(atual, [{ id: 'b', outcome: 'pause', label: 'B' }])
    expect(r.variants.map(x => [x.id, x.is_active])).toEqual([
      ['b', false],
      ['c', true],
    ])
    expect(r.paused).toEqual(['B'])
  })
})

describe('mergePausedLabels — o aviso acumula sem repetir rótulo (OPV-04, G12)', () => {
  it('rótulo que o aviso já mostra não entra de novo; os novos entram depois, na ordem do lote', () => {
    expect(mergePausedLabels(['3,5 cm'], ['3,5 cm', '5,5 cm'])).toEqual(['3,5 cm', '5,5 cm'])
  })

  it('aviso vazio recebe o lote inteiro, como veio', () => {
    expect(mergePausedLabels([], ['3,5 cm', '4,5 cm'])).toEqual(['3,5 cm', '4,5 cm'])
  })

  it('dentro do MESMO lote, duas linhas com o mesmo rótulo aparecem as duas (são duas variações)', () => {
    expect(mergePausedLabels([], ['3,5 cm', '3,5 cm'])).toEqual(['3,5 cm', '3,5 cm'])
  })

  it('não muda o aviso anterior', () => {
    const prev = ['3,5 cm']
    mergePausedLabels(prev, ['4,5 cm'])
    expect(prev).toEqual(['3,5 cm'])
  })
})

describe('o aviso nomeia só as que AINDA estão pausadas (BUG-20261026-aviso-de-pausa-continua-depois-de-reativar)', () => {
  it('mergePausedIds guarda os ids das pausadas por rótulo, sem repetir id e ignorando as removidas', () => {
    const ids = mergePausedIds(new Map(), [
      { id: 'a', label: '3,5 cm', outcome: 'pause' },
      { id: 'b', label: '4,5 cm', outcome: 'remove' },
    ])
    expect([...ids]).toEqual([['3,5 cm', ['a']]])
    const de_novo = mergePausedIds(ids, [{ id: 'a', label: '3,5 cm', outcome: 'pause' }])
    expect([...de_novo]).toEqual([['3,5 cm', ['a']]])
    expect([...ids]).toEqual([['3,5 cm', ['a']]])
  })

  it('a linha religada sai do aviso; a que segue pausada fica; a que saiu da grade também sai', () => {
    const ids = new Map([['3,5 cm', ['a']], ['5,5 cm', ['c']], ['6,5 cm', ['d']]])
    const grade = [v('a', { is_active: true }), v('c', { is_active: false })]
    expect(stillPausedLabels(['3,5 cm', '5,5 cm', '6,5 cm'], ids, grade)).toEqual(['5,5 cm'])
  })

  it('rótulo sem id conhecido não aparece', () => {
    expect(stillPausedLabels(['3,5 cm'], new Map(), [v('a', { is_active: false })])).toEqual([])
  })
})
