// Feature 67 (T09) — "Aprovar N" e "Recusar N" (`VFL-20`, `VFL-21`, `VFL-23`, `VFL-27`).
//
// As funções de escrita de `entities/filter` são as REAIS; o dublê é o client, e ele enxerga tabela,
// linhas, `onConflict`, `ignoreDuplicates` e os filtros do `delete`. A ordem da troca (`VFL-27`) é
// provada TEMPORALMENTE: o dublê é perguntado de dentro do `delete` da peça toda, e nesse instante o
// `upsert` da opção já tem de ter RESPONDIDO.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Suggestion, SuggestionGroup } from '@estrelinha/core/filters'
import { criarDuble, type Registro } from '@/test/dubleSupabase'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { aprovarSugestoes, recusarSugestoes } from '../aprovar'

let calls: Registro[] = []
let falhar: string | null = null
let opcaoRespondeu = false
let noDelete: boolean | null = null

beforeEach(() => {
  falhar = null
  opcaoRespondeu = false
  noDelete = null
  const d = criarDuble(r => {
    if (r.table === 'product_filter_values' && r.delete) noDelete = opcaoRespondeu
    const erro = falhar === r.table ? { message: 'boom' } : null
    // A resposta da opção chega num tique DEPOIS: gravar as duas em paralelo faria o delete ser
    // perguntado antes dela, e a régua acusaria.
    if (r.table === 'product_option_filter_values' && r.upsert && !erro)
      return new Promise(res =>
        setTimeout(() => {
          opcaoRespondeu = true
          res({ error: null })
        }, 0),
      )
    return { error: erro }
  })
  calls = d.calls
  fromMock.mockReset().mockImplementation(d.from)
})

const sug = (product_id: string, over: Partial<Suggestion> = {}): Suggestion => ({
  product_id,
  value_id: 'prata',
  source: 'option',
  option_name: 'Cor',
  option_value: 'Prata 925',
  evidence: 'Prata 925',
  replacesWholeMark: false,
  ...over,
})

const grupo = (suggestions: Suggestion[], target: 'option' | 'product' = 'option'): SuggestionGroup => ({
  key: 'k',
  source: target === 'option' ? 'option' : 'tag',
  value_id: 'prata',
  target,
  option_name: target === 'option' ? 'Cor' : '',
  evidence: 'Prata 925',
  reason: 'r',
  suggestions,
})

describe('aprovar — VFL-20', () => {
  it('alvo opção: UM upsert só com as SELECIONADAS, chave inteira e ignoreDuplicates', async () => {
    const r = await aprovarSugestoes(grupo([sug('a'), sug('b'), sug('c')]), new Set(['a', 'c']))
    expect(r).toEqual({ erro: null, gravou: true })
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('product_option_filter_values')
    expect(calls[0].upsert).toEqual({
      rows: [
        { product_id: 'a', option_name: 'Cor', option_value: 'Prata 925', value_id: 'prata' },
        { product_id: 'c', option_name: 'Cor', option_value: 'Prata 925', value_id: 'prata' },
      ],
      options: { onConflict: 'product_id,option_name,option_value,value_id', ignoreDuplicates: true },
    })
  })

  it('alvo peça toda: UM upsert em product_filter_values', async () => {
    const g = grupo([sug('a', { source: 'tag', option_name: '', option_value: '' })], 'product')
    await aprovarSugestoes(g, new Set(['a']))
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('product_filter_values')
    expect(calls[0].upsert).toEqual({
      rows: [{ product_id: 'a', value_id: 'prata' }],
      options: { onConflict: 'product_id,value_id', ignoreDuplicates: true },
    })
  })

  // Rodada 2 (B09): com UMA sugestão, "uma requisição" e "uma requisição por peça" dão o mesmo
  // número. Com três (duas selecionadas), só a escrita única passa.
  it('alvo peça toda com VÁRIAS sugestões: UMA requisição, com todas as selecionadas nas linhas', async () => {
    const tag = { source: 'tag' as const, option_name: '', option_value: '' }
    const g = grupo([sug('a', tag), sug('b', tag), sug('c', tag)], 'product')
    const r = await aprovarSugestoes(g, new Set(['a', 'c']))
    expect(r).toEqual({ erro: null, gravou: true })
    expect(calls).toHaveLength(1)
    expect(calls.filter(c => c.table === 'product_filter_values')).toHaveLength(1)
    expect(calls[0].upsert).toEqual({
      rows: [
        { product_id: 'a', value_id: 'prata' },
        { product_id: 'c', value_id: 'prata' },
      ],
      options: { onConflict: 'product_id,value_id', ignoreDuplicates: true },
    })
  })

  it('nada selecionado: nada vai ao banco', async () => {
    expect(await aprovarSugestoes(grupo([sug('a')]), new Set())).toEqual({ erro: null, gravou: false })
    expect(calls).toEqual([])
  })
})

describe('a troca peça toda → opção — VFL-27', () => {
  it('grava a opção ANTES de apagar a peça toda, e apaga só as que trocam', async () => {
    const r = await aprovarSugestoes(
      grupo([sug('a', { replacesWholeMark: true }), sug('b'), sug('c', { replacesWholeMark: true })]),
      new Set(['a', 'b', 'c']),
    )
    expect(r).toEqual({ erro: null, gravou: true })
    expect(calls.map(c => `${c.delete ? 'delete' : 'upsert'} ${c.table}`)).toEqual([
      'upsert product_option_filter_values',
      'delete product_filter_values',
    ])
    // Perguntado de DENTRO do delete: a opção já tinha respondido.
    expect(noDelete).toBe(true)
    expect(calls[1].filters).toEqual([
      { method: 'eq', args: ['value_id', 'prata'] },
      { method: 'in', args: ['product_id', ['a', 'c']] },
    ])
  })

  it('a opção falhou: a peça toda NÃO é apagada (nunca fica sem marcação)', async () => {
    falhar = 'product_option_filter_values'
    const r = await aprovarSugestoes(grupo([sug('a', { replacesWholeMark: true })]), new Set(['a']))
    expect(r).toEqual({ erro: 'boom', gravou: false })
    expect(calls.some(c => c.delete)).toBe(false)
  })

  it('a peça toda falhou depois: a peça fica em dobro (inofensivo), o erro diz isso e houve gravação', async () => {
    falhar = 'product_filter_values'
    const r = await aprovarSugestoes(grupo([sug('a', { replacesWholeMark: true })]), new Set(['a']))
    expect(r).toEqual({ erro: 'As opções foram marcadas, mas a marcação da peça toda não saiu: boom', gravou: true })
  })
})

describe('recusar — VFL-21', () => {
  it('UMA chamada com o alvo de cada selecionada', async () => {
    const r = await recusarSugestoes(grupo([sug('a'), sug('b')]), new Set(['b']))
    expect(r).toEqual({ erro: null, gravou: true })
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('filter_suggestion_dismissals')
    expect(calls[0].upsert).toEqual({
      rows: [{ product_id: 'b', value_id: 'prata', option_name: 'Cor', option_value: 'Prata 925' }],
      options: { onConflict: 'product_id,value_id,option_name,option_value', ignoreDuplicates: true },
    })
  })

  // Rodada 3 (R09): com UMA selecionada, "uma requisição" e "uma por peça" dão o mesmo número. Com
  // três sugestões e duas selecionadas, só a escrita única passa.
  it('recusar — várias selecionadas: UMA requisição, com todas as selecionadas nas linhas', async () => {
    const r = await recusarSugestoes(grupo([sug('a'), sug('b'), sug('c')]), new Set(['a', 'c']))
    expect(r).toEqual({ erro: null, gravou: true })
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('filter_suggestion_dismissals')
    expect(calls[0].upsert).toEqual({
      rows: [
        { product_id: 'a', value_id: 'prata', option_name: 'Cor', option_value: 'Prata 925' },
        { product_id: 'c', value_id: 'prata', option_name: 'Cor', option_value: 'Prata 925' },
      ],
      options: { onConflict: 'product_id,value_id,option_name,option_value', ignoreDuplicates: true },
    })
  })

  it('a falha não conta como gravação (VFL-23)', async () => {
    falhar = 'filter_suggestion_dismissals'
    expect(await recusarSugestoes(grupo([sug('a')]), new Set(['a']))).toEqual({ erro: 'boom', gravou: false })
  })
})
