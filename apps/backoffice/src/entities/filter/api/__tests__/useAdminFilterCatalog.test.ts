// Feature 66 — `useAdminFilterCatalog` (`FLT-01`..`FLT-10`, T06).
//
// O que se prova é O QUE VAI PARA O SUPABASE: a projeção com o agregado, cada escrita com a tabela,
// o filtro e o payload exatos, a recusa de `core` ANTES da rede (prova por ausência de chamada), e a
// releitura que não volta ao esqueleto. O dublê ENXERGA o filtro (`eq`/`in`/`order`) e as opções do
// `upsert` — sem isso, "uma chamada por lote" e "o filtro certo" seriam inauditáveis.

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FILTER_GROUPS_MAX, FILTER_SLUG_TAKEN_REFUSAL, FILTER_VALUES_MAX } from '@estrelinha/core/filters'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { FILTER_CATALOG_SELECT, VALUE_SLUG_TAKEN_REFUSAL, useAdminFilterCatalog } from '../useAdminFilterCatalog'

interface Gravado {
  table: string
  select?: string
  filters: { method: string; args: unknown[] }[]
  insert?: unknown
  update?: unknown
  upsert?: { rows: unknown; options: unknown }
  delete?: boolean
}

type Leitura = { data: unknown[] | null; error: unknown }

let calls: Gravado[] = []
let leitura: Leitura
let erroDeEscrita: { message: string; code?: string } | null
let segurarLeituras = false
let pendentes: ((r: Leitura) => void)[] = []

const linhaGrupo = (id: string, sort: number, valores: unknown[] = [], extra: Record<string, unknown> = {}) => ({
  id,
  name: `Grupo ${id}`,
  slug: `grupo-${id}`,
  is_active: true,
  sort_order: sort,
  created_at: '2026-10-18T00:00:00Z',
  filter_values: valores,
  ...extra,
})

const linhaValor = (id: string, groupId: string, sort: number, count: number, extra: Record<string, unknown> = {}) => ({
  id,
  group_id: groupId,
  name: `Valor ${id}`,
  slug: `valor-${id}`,
  sort_order: sort,
  product_filter_values: [{ count }],
  ...extra,
})

beforeEach(() => {
  calls = []
  segurarLeituras = false
  pendentes = []
  erroDeEscrita = null
  leitura = {
    data: [
      // Chega FORA de ordem de propósito: quem ordena é o hook.
      linhaGrupo('b', 1, [linhaValor('b1', 'b', 0, 0)], { name: 'Para quem', slug: 'para-quem' }),
      linhaGrupo(
        'a',
        0,
        [
          linhaValor('a2', 'a', 1, 152, { name: 'Folheado a ouro', slug: 'folheado-a-ouro' }),
          linhaValor('a1', 'a', 0, 183, { name: 'Prata 925', slug: 'prata-925' }),
        ],
        { name: 'Acabamento', slug: 'acabamento' },
      ),
    ],
    error: null,
  }

  fromMock.mockReset().mockImplementation((table: string) => {
    const rec: Gravado = { table, filters: [] }
    calls.push(rec)
    const resolve = () => {
      const escrita = rec.insert !== undefined || rec.update !== undefined || rec.upsert || rec.delete
      if (escrita) return { data: { id: 'novo' }, error: erroDeEscrita }
      if (!segurarLeituras) return leitura
      return new Promise<Leitura>(res => pendentes.push(res))
    }
    const builder: Record<string, unknown> = {}
    for (const m of ['eq', 'in', 'order'] as const) {
      builder[m] = (...args: unknown[]) => {
        rec.filters.push({ method: m, args })
        return builder
      }
    }
    builder.select = (arg: string) => {
      rec.select = arg
      return builder
    }
    builder.insert = (rows: unknown) => {
      rec.insert = rows
      return builder
    }
    builder.update = (v: unknown) => {
      rec.update = v
      return builder
    }
    builder.upsert = (rows: unknown, options: unknown) => {
      rec.upsert = { rows, options }
      return builder
    }
    builder.delete = () => {
      rec.delete = true
      return builder
    }
    builder.maybeSingle = () => Promise.resolve(resolve())
    builder.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
      Promise.resolve(resolve()).then(ok, ko)
    return builder
  })
})

let loadings: boolean[] = []

const renderCatalog = async () => {
  loadings = []
  const view = renderHook(() => {
    const atual = useAdminFilterCatalog()
    loadings.push(atual.loading)
    return atual
  })
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

const escritas = () => calls.filter(c => c.insert !== undefined || c.update !== undefined || c.upsert || c.delete)
const leituras = () => calls.filter(c => c.table === 'filter_groups' && c.select === FILTER_CATALOG_SELECT)

describe('useAdminFilterCatalog — a leitura (FLT-01)', () => {
  it('lê os grupos com os valores e o AGREGADO de contagem, ordenado por sort_order', async () => {
    await renderCatalog()
    const primeira = calls[0]
    expect(primeira.table).toBe('filter_groups')
    expect(primeira.select).toBe(FILTER_CATALOG_SELECT)
    expect(FILTER_CATALOG_SELECT).toContain('product_filter_values(count)')
    expect(primeira.filters).toContainEqual({ method: 'order', args: ['sort_order'] })
  })

  it('ordena grupos e valores por sort_order, e o agregado vira número', async () => {
    const { result } = await renderCatalog()
    expect(result.current.groups.map(g => g.name)).toEqual(['Acabamento', 'Para quem'])
    expect(result.current.groups[0].values.map(v => [v.name, v.marked_count])).toEqual([
      ['Prata 925', 183],
      ['Folheado a ouro', 152],
    ])
  })

  it('valor sem marcação vem `[{count: 0}]` do servidor e vale zero', async () => {
    const { result } = await renderCatalog()
    expect(result.current.groups[1].values[0].marked_count).toBe(0)
  })

  it('falha na primeira carga vira erro, nunca lista vazia silenciosa', async () => {
    leitura = { data: null, error: { message: 'boom' } }
    const { result } = await renderCatalog()
    expect(result.current.error).toBe('boom')
    expect(result.current.groups).toEqual([])
  })
})

describe('useAdminFilterCatalog — revalidar não volta ao esqueleto (VIV-02/VIV-07)', () => {
  it('a escrita relê com `revalidar`: `loading` nunca volta a true, e a lista fica na tela', async () => {
    const { result } = await renderCatalog()
    segurarLeituras = true
    loadings = []
    let promessa!: Promise<unknown>
    await act(async () => {
      promessa = result.current.updateGroup('a', { is_active: false })
      await waitFor(() => expect(pendentes).toHaveLength(1))
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.groups.map(g => g.id)).toEqual(['a', 'b'])
    await act(async () => {
      pendentes.shift()!({ data: null, error: { message: 'caiu' } })
      await promessa
    })
    expect(loadings).not.toContain(true)
    // A releitura falhou e a lista FICOU (VIV-07).
    expect(result.current.groups.map(g => g.id)).toEqual(['a', 'b'])
    expect(result.current.error).toBe('caiu')
  })

  it('SENSOR: a primeira carga liga o esqueleto (o par que torna a de cima discriminante)', async () => {
    segurarLeituras = true
    const view = renderHook(() => useAdminFilterCatalog())
    await waitFor(() => expect(pendentes).toHaveLength(1))
    expect(view.result.current.loading).toBe(true)
    await act(async () => {
      pendentes.shift()!(leitura)
    })
  })
})

describe('useAdminFilterCatalog — o token de sequência (VIV-08)', () => {
  // Verificação independente, rodada 2 (P02): sem este caso, apagar o `meu !== pedido.current`
  // deixava a suíte verde. Duas releituras no ar, e a MAIS VELHA responde por último: ela tem de
  // ser descartada, senão a tela volta a mostrar o catálogo de antes da última gravação.
  it('duas leituras fora de ordem: vale a mais nova, e a velha chegando depois é descartada', async () => {
    const { result } = await renderCatalog()
    segurarLeituras = true
    let velha!: Promise<unknown>
    let nova!: Promise<unknown>
    await act(async () => {
      velha = result.current.fetchCatalog('revalidar')
      nova = result.current.fetchCatalog('revalidar')
      await waitFor(() => expect(pendentes).toHaveLength(2))
    })
    await act(async () => {
      pendentes[1]({ data: [linhaGrupo('n', 0, [], { name: 'Nova', slug: 'nova' })], error: null })
      await nova
    })
    expect(result.current.groups.map(g => g.name)).toEqual(['Nova'])
    await act(async () => {
      pendentes[0]({ data: [linhaGrupo('v', 0, [], { name: 'Velha', slug: 'velha' })], error: null })
      await velha
    })
    expect(result.current.groups.map(g => g.name)).toEqual(['Nova'])
    expect(result.current.error).toBeNull()
  })
})

describe('useAdminFilterCatalog — grupo (FLT-02..05, FLT-08, FLT-09)', () => {
  it('cria no fim da lista com o payload exato e relê', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    let r!: { error: string | null }
    await act(async () => {
      r = await result.current.createGroup({ name: '  Ocasião ', slug: 'ocasiao' })
    })
    expect(r.error).toBeNull()
    expect(escritas()).toHaveLength(1)
    expect(escritas()[0].table).toBe('filter_groups')
    expect(escritas()[0].insert).toEqual({ name: 'Ocasião', slug: 'ocasiao', sort_order: 2 })
    expect(leituras()).toHaveLength(1)
  })

  it.each([
    ['nome vazio', { name: '   ', slug: 'x' }, 'Dê um nome ao grupo.'],
    ['nome com 41 caracteres', { name: 'a'.repeat(41), slug: 'x' }, 'O nome pode ter até 40 caracteres.'],
    ['nome repetido sem acento nem maiúscula', { name: 'ACABAMENTÓ', slug: 'outro' }, 'Já existe um grupo com este nome.'],
    ['endereço reservado', { name: 'Faixa', slug: 'preco' }, FILTER_SLUG_TAKEN_REFUSAL],
    ['prefixo de campanha', { name: 'Campanha', slug: 'utm_x' }, FILTER_SLUG_TAKEN_REFUSAL],
    ['endereço repetido', { name: 'Outro', slug: 'para-quem' }, FILTER_SLUG_TAKEN_REFUSAL],
  ])('recusa %s ANTES da rede, com o motivo em texto', async (_caso, draft, motivo) => {
    const { result } = await renderCatalog()
    calls.length = 0
    let r!: { error: string | null }
    await act(async () => {
      r = await result.current.createGroup(draft)
    })
    expect(r.error).toBe(motivo)
    expect(calls).toHaveLength(0)
  })

  it(`recusa o ${FILTER_GROUPS_MAX + 1}º grupo antes da rede (FLT-05)`, async () => {
    leitura = {
      data: Array.from({ length: FILTER_GROUPS_MAX }, (_, i) => linhaGrupo(`g${i}`, i)),
      error: null,
    }
    const { result } = await renderCatalog()
    calls.length = 0
    let r!: { error: string | null }
    await act(async () => {
      r = await result.current.createGroup({ name: 'Mais um', slug: 'mais-um' })
    })
    expect(r.error).toBe(`A loja aceita até ${FILTER_GROUPS_MAX} grupos de filtro.`)
    expect(calls).toHaveLength(0)
  })

  it('o banco recusando o endereço (23505) devolve a mesma frase da régua, e não relê', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    erroDeEscrita = { message: 'duplicate key value violates unique constraint', code: '23505' }
    let r!: { error: string | null }
    await act(async () => {
      r = await result.current.createGroup({ name: 'Novo', slug: 'novo' })
    })
    expect(r.error).toBe(FILTER_SLUG_TAKEN_REFUSAL)
    expect(leituras()).toHaveLength(0)
  })

  // Verificação independente (2026-10-18): o ramo do `check` (23514 — reservado ou formato) não
  // tinha caso, e trocá-lo por mensagem genérica sobrevivia. É a rede de baixo de FLT-04: se a régua
  // de `core` e o `check` do banco divergirem, a tela ainda diz a frase da loja, não o SQL.
  it('o banco recusando pelo check (23514) também devolve a frase da régua, e não relê (FLT-04)', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    erroDeEscrita = { message: 'new row violates check constraint "filter_groups_slug_reserved"', code: '23514' }
    let r!: { error: string | null }
    await act(async () => {
      r = await result.current.createGroup({ name: 'Novo', slug: 'novo' })
    })
    expect(r.error).toBe(FILTER_SLUG_TAKEN_REFUSAL)
    expect(leituras()).toHaveLength(0)
  })

  it('desligar grava só `is_active`, filtrado pelo id (FLT-09)', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    await act(async () => {
      await result.current.updateGroup('a', { is_active: false })
    })
    expect(escritas()).toHaveLength(1)
    expect(escritas()[0].update).toEqual({ is_active: false })
    expect(escritas()[0].filters).toEqual([{ method: 'eq', args: ['id', 'a'] }])
  })

  it('renomear para o próprio nome NÃO é recusado como repetido', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.updateGroup('a', { name: 'Acabamento', slug: 'acabamento' })
    })
    expect(erro).toBeNull()
    expect(escritas()[0].update).toEqual({ name: 'Acabamento', slug: 'acabamento' })
  })

  // Rodada 2 (P07): criar já provava o aparo; renomear não, e tirar o `.trim()` sobrevivia.
  it('renomear com espaço nas pontas grava o nome APARADO, payload exato', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.updateGroup('a', { name: ' Ouro ' })
    })
    expect(erro).toBeNull()
    expect(escritas()).toHaveLength(1)
    expect(escritas()[0].update).toEqual({ name: 'Ouro' })
  })

  it('apagar é um delete por id — as cascatas são do banco (FLT-08)', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    await act(async () => {
      await result.current.deleteGroup('b')
    })
    expect(escritas()).toHaveLength(1)
    expect(escritas()[0]).toMatchObject({ table: 'filter_groups', delete: true })
    expect(escritas()[0].filters).toEqual([{ method: 'eq', args: ['id', 'b'] }])
  })

  it('reordenar grava a lista INTEIRA numa chamada só (upsert por id)', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    await act(async () => {
      await result.current.reorderGroups(['b', 'a'])
    })
    expect(escritas()).toHaveLength(1)
    expect(escritas()[0].upsert).toEqual({
      rows: [
        { id: 'b', name: 'Para quem', slug: 'para-quem', is_active: true, sort_order: 0 },
        { id: 'a', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 1 },
      ],
      options: { onConflict: 'id' },
    })
  })
})

describe('useAdminFilterCatalog — valor (FLT-06, FLT-07)', () => {
  it('acrescenta no fim do grupo, com o group_id', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    await act(async () => {
      await result.current.createValue('a', { name: 'Ródio', slug: 'rodio' })
    })
    expect(escritas()[0].table).toBe('filter_values')
    expect(escritas()[0].insert).toEqual({ group_id: 'a', name: 'Ródio', slug: 'rodio', sort_order: 2 })
  })

  it('o endereço repetido só conta DENTRO do grupo', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    let repetido!: { error: string | null }
    let emOutroGrupo!: { error: string | null }
    await act(async () => {
      repetido = await result.current.createValue('a', { name: 'Prata', slug: 'prata-925' })
      emOutroGrupo = await result.current.createValue('b', { name: 'Prata 925', slug: 'prata-925' })
    })
    expect(repetido.error).toBe('Este endereço já é usado por outro valor deste grupo.')
    expect(emOutroGrupo.error).toBeNull()
  })

  it(`recusa o ${FILTER_VALUES_MAX + 1}º valor antes da rede`, async () => {
    leitura = {
      data: [linhaGrupo('a', 0, Array.from({ length: FILTER_VALUES_MAX }, (_, i) => linhaValor(`v${i}`, 'a', i, 0)))],
      error: null,
    }
    const { result } = await renderCatalog()
    calls.length = 0
    let r!: { error: string | null }
    await act(async () => {
      r = await result.current.createValue('a', { name: 'Mais', slug: 'mais' })
    })
    expect(r.error).toBe(`Um grupo aceita até ${FILTER_VALUES_MAX} valores.`)
    expect(calls).toHaveLength(0)
  })

  it('o banco recusando o endereço do valor vira a frase do grupo de valores', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    erroDeEscrita = { message: 'dup', code: '23505' }
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.updateValue('a1', { name: 'Prata 950', slug: 'prata-950' })
    })
    expect(erro).toBe(VALUE_SLUG_TAKEN_REFUSAL)
  })

  // Rodada 2 (P04): o mesmo aparo, no valor.
  it('renomear o valor com espaço nas pontas grava o nome APARADO, payload exato', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.updateValue('a1', { name: ' Ouro ' })
    })
    expect(erro).toBeNull()
    expect(escritas()).toHaveLength(1)
    expect(escritas()[0].table).toBe('filter_values')
    expect(escritas()[0].update).toEqual({ name: 'Ouro', slug: 'prata-925' })
  })

  it('apagar o valor é um delete por id (as marcações saem por cascata)', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    await act(async () => {
      await result.current.deleteValue('a1')
    })
    expect(escritas()[0]).toMatchObject({ table: 'filter_values', delete: true })
    expect(escritas()[0].filters).toEqual([{ method: 'eq', args: ['id', 'a1'] }])
  })

  it('reordenar os valores é UMA chamada com o grupo inteiro', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    await act(async () => {
      await result.current.reorderValues('a', ['a2', 'a1'])
    })
    expect(escritas()).toHaveLength(1)
    expect(escritas()[0].upsert).toEqual({
      rows: [
        { id: 'a2', group_id: 'a', name: 'Folheado a ouro', slug: 'folheado-a-ouro', sort_order: 0 },
        { id: 'a1', group_id: 'a', name: 'Prata 925', slug: 'prata-925', sort_order: 1 },
      ],
      options: { onConflict: 'id' },
    })
  })

  it('falha de gravação devolve a frase e NÃO relê (nada aparece como salvo — FLT-10)', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    erroDeEscrita = { message: 'sem rede' }
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.updateValue('a1', { name: 'Prata 950' })
    })
    expect(erro).toBe('sem rede')
    expect(leituras()).toHaveLength(0)
    expect(result.current.groups[0].values[0].name).toBe('Prata 925')
  })
})

// Feature 67 (T05/T11) — o catálogo traz os termos de sugestão e a contagem por opção.
describe('useAdminFilterCatalog — as colunas da 67', () => {
  it('o select pede `suggest_terms` e o agregado das marcações por opção', async () => {
    await renderCatalog()
    expect(FILTER_CATALOG_SELECT).toBe(
      'id, name, slug, is_active, sort_order, created_at, filter_values(id, group_id, name, slug, sort_order, suggest_terms, product_filter_values(count), product_option_filter_values(count))',
    )
  })

  it('os termos e a contagem por opção chegam ao valor; ausentes, viram vazio e zero', async () => {
    leitura = {
      data: [
        linhaGrupo('a', 0, [
          linhaValor('a1', 'a', 0, 3, {
            suggest_terms: ['Dourado', 7],
            product_option_filter_values: [{ count: 71 }],
          }),
          linhaValor('a2', 'a', 1, 0),
        ]),
      ],
      error: null,
    }
    const { result } = await renderCatalog()
    const [a1, a2] = result.current.groups[0].values
    expect(a1).toMatchObject({ marked_count: 3, option_marked_count: 71, suggest_terms: ['Dourado'] })
    expect(a2).toMatchObject({ marked_count: 0, option_marked_count: 0, suggest_terms: [] })
  })
})

// Feature 67 (T11, `VFL-35`..`VFL-37`) — os termos de sugestão gravados inteiros, pela régua de core.
describe('useAdminFilterCatalog — updateValueTerms', () => {
  it('grava a lista INTEIRA, aparada, no valor certo, e relê (a fila vê o termo sem recarregar)', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    leitura = {
      data: [linhaGrupo('a', 0, [linhaValor('a1', 'a', 0, 183, { name: 'Prata 925', suggest_terms: ['Dourado', 'Prateada'] })])],
      error: null,
    }
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.updateValueTerms('a1', ['Dourado', '  Prateada '])
    })
    expect(erro).toBeNull()
    expect(escritas()).toHaveLength(1)
    expect(escritas()[0]).toMatchObject({ table: 'filter_values', update: { suggest_terms: ['Dourado', 'Prateada'] } })
    expect(escritas()[0].filters).toEqual([{ method: 'eq', args: ['id', 'a1'] }])
    expect(leituras()).toHaveLength(1)
    expect(result.current.groups[0].values[0].suggest_terms).toEqual(['Dourado', 'Prateada'])
  })

  it.each([
    [['  '], 'Escreva o termo.'],
    [['prata  925'], 'O nome do valor já sugere sozinho.'],
    [['Dourado', 'dourado'], 'Este termo já está na lista.'],
    [['x'.repeat(41)], 'O termo pode ter até 40 caracteres.'],
    [Array.from({ length: 11 }, (_, i) => `t${i}`), 'Um valor aceita até 10 termos.'],
  ])('recusa ANTES da rede: %j → %s', async (termos, frase) => {
    const { result } = await renderCatalog()
    calls.length = 0
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.updateValueTerms('a1', termos)
    })
    expect(erro).toBe(frase)
    expect(escritas()).toHaveLength(0)
  })

  it('o 23514 do banco vira a frase dos tetos, e não relê', async () => {
    const { result } = await renderCatalog()
    calls.length = 0
    erroDeEscrita = { message: 'violates check constraint', code: '23514' } as never
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.updateValueTerms('a1', ['Dourado'])
    })
    expect(erro).toBe('Um valor aceita até 10 termos, de até 40 caracteres cada.')
    expect(leituras()).toHaveLength(0)
  })
})
