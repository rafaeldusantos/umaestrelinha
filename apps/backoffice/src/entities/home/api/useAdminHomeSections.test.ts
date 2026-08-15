// O que se prova aqui é **O QUE VAI PARA O SUPABASE**, não que o hook "funciona".
//
// As quatro ACs deste CRUD são todas sobre o payload: seção nova nasce desligada (`HOME-10`);
// ligar/desligar manda `{ id, active }` e nada mais (senão reescreve a seção com o cache velho da
// listagem); reordenar manda posições absolutas só das linhas alteradas, com o `type` que o upsert
// do PostgREST exige (`HOME-11`); e falha de gravação volta tipada em vez de engolida (`HOME-14`).
// Nenhuma delas se vê no estado do hook — só no objeto que foi enviado.

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useAdminHomeSections } from './useAdminHomeSections'

interface Recorded {
  table: string
  select?: string
  insert?: unknown
  update?: unknown
  upsert?: unknown
  delete?: boolean
  filters: { method: string; args: unknown[] }[]
}

let calls: Recorded[] = []
let readResponse: { data: unknown[] | null; error: { message: string } | null }
let writeResponse: { error: { message: string } | null }

const linhas = () => [
  {
    id: 'sec-hero',
    type: 'hero',
    position: 1,
    active: true,
    config: { title_line1: 'O que você ama,' },
    created_at: 'x',
    updated_at: 'x',
    items: [],
  },
  {
    id: 'sec-banners',
    type: 'banner_grid',
    position: 2,
    active: true,
    config: { layout: 'hero_pair' },
    created_at: 'x',
    updated_at: 'x',
    items: [],
  },
  {
    id: 'sec-news',
    type: 'newsletter',
    position: 3,
    active: false,
    config: {},
    created_at: 'x',
    updated_at: 'x',
    items: [],
  },
]

const makeBuilder = (record: Recorded, resolve: () => unknown) => {
  const builder: Record<string, unknown> = {}
  for (const method of ['eq', 'in', 'order'] as const) {
    builder[method] = (...args: unknown[]) => {
      record.filters.push({ method, args })
      return builder
    }
  }
  builder.select = (arg: string) => {
    record.select = arg
    return builder
  }
  builder.maybeSingle = () =>
    Promise.resolve(
      writeResponse.error ? { data: null, error: writeResponse.error } : { data: { id: 'nova' }, error: null },
    )
  builder.then = (onFulfilled: (value: unknown) => unknown) =>
    Promise.resolve(resolve()).then(onFulfilled)
  return builder
}

beforeEach(() => {
  calls = []
  readResponse = { data: linhas(), error: null }
  writeResponse = { error: null }

  fromMock.mockReset().mockImplementation((table: string) => {
    const record: Recorded = { table, filters: [] }
    calls.push(record)

    const resolve = () => {
      const escrita =
        record.insert !== undefined ||
        record.update !== undefined ||
        record.upsert !== undefined ||
        record.delete
      return escrita ? writeResponse : readResponse
    }

    const builder = makeBuilder(record, resolve) as Record<string, unknown>
    builder.insert = (rows: unknown) => {
      record.insert = rows
      return makeBuilder(record, resolve)
    }
    builder.update = (values: unknown) => {
      record.update = values
      return makeBuilder(record, resolve)
    }
    builder.upsert = (rows: unknown) => {
      record.upsert = rows
      return makeBuilder(record, resolve)
    }
    builder.delete = () => {
      record.delete = true
      return makeBuilder(record, resolve)
    }
    return builder
  })
})

const montar = async () => {
  const hook = renderHook(() => useAdminHomeSections())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

/** As gravações de uma tabela, na ordem em que saíram. */
const escritas = (table: string) =>
  calls.filter(
    c =>
      c.table === table &&
      (c.insert !== undefined || c.update !== undefined || c.upsert !== undefined || c.delete),
  )

describe('useAdminHomeSections — leitura', () => {
  it('traz as desligadas também: é a única tela onde elas podem ser religadas', async () => {
    const { result } = await montar()
    expect(result.current.sections.map(s => s.id)).toEqual(['sec-hero', 'sec-banners', 'sec-news'])
    expect(result.current.sections.find(s => s.id === 'sec-news')!.active).toBe(false)
  })

  it('falha de leitura vira `error` com mensagem, e a lista NÃO finge estar vazia', async () => {
    readResponse = { data: null, error: { message: 'permission denied for table home_sections' } }
    const { result } = await montar()
    expect(result.current.error).toBe('permission denied for table home_sections')
    expect(result.current.sections).toEqual([])
  })

  it('a ordem sai de `orderSections`, e o empate de `position` desempata por id (HOME-12)', async () => {
    readResponse = {
      data: [
        { id: 'zz', type: 'banner_grid', position: 2, active: true, config: {}, items: [] },
        { id: 'aa', type: 'collection_feature', position: 2, active: true, config: {}, items: [] },
        { id: 'mm', type: 'hero', position: 1, active: true, config: {}, items: [] },
      ],
      error: null,
    }
    const { result } = await montar()
    expect(result.current.sections.map(s => s.id)).toEqual(['mm', 'aa', 'zz'])
  })
})

describe('useAdminHomeSections — criar (HOME-10)', () => {
  it('a seção nova nasce DESLIGADA, e o `false` vai explícito no payload', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.createSection('collection_feature')
    })
    const criacao = escritas('home_sections')[0]
    expect(criacao.insert).toEqual({
      type: 'collection_feature',
      position: 4,
      active: false,
      config: {},
    })
  })

  it('entra no FIM da lista: a posição é a maior existente mais um', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.createSection('banner_grid')
    })
    expect((escritas('home_sections')[0].insert as { position: number }).position).toBe(4)
  })
})

describe('useAdminHomeSections — ligar/desligar', () => {
  it('manda `{ active }` e NADA MAIS, filtrado pelo id', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.setSectionActive('sec-news', true)
    })
    const escrita = escritas('home_sections')[0]
    // A asserção é de igualdade e não de "contém": o defeito que esta regra existe para impedir é
    // justamente um campo A MAIS no payload, reescrevendo a seção com o cache velho da listagem.
    expect(escrita.update).toEqual({ active: true })
    expect(escrita.filters).toEqual([{ method: 'eq', args: ['id', 'sec-news'] }])
  })

  it('desligar manda `{ active: false }`, sem `config` nem `position` de carona', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.setSectionActive('sec-banners', false)
    })
    expect(escritas('home_sections')[0].update).toEqual({ active: false })
  })

  it('a recusa do hero volta TIPADA, com a mensagem do trigger (HOME-08, HOME-14)', async () => {
    writeResponse = { error: { message: 'A chamada principal da Home nao pode ser desligada.' } }
    const { result } = await montar()
    let devolvido: { message: string } | null = null
    await act(async () => {
      devolvido = await result.current.setSectionActive('sec-hero', false)
    })
    expect(devolvido).toEqual({ message: 'A chamada principal da Home nao pode ser desligada.' })
  })
})

describe('useAdminHomeSections — reordenar (HOME-11)', () => {
  it('o upsert manda `type` junto de id e posição — sem ele o banco devolve 23502', async () => {
    // Medido no probe da T11: o upsert do PostgREST é um `insert ... on conflict`, e `type` é
    // `not null` sem default. `{ id, position }` sozinho falha.
    const { result } = await montar()
    await act(async () => {
      await result.current.reorderSectionsTo([
        { id: 'sec-news', position: 1 },
        { id: 'sec-hero', position: 2 },
      ])
    })
    expect(escritas('home_sections')[0].upsert).toEqual([
      { id: 'sec-news', type: 'newsletter', position: 1 },
      { id: 'sec-hero', type: 'hero', position: 2 },
    ])
  })

  it('manda SÓ as linhas recebidas, com posição absoluta — repetir dá o mesmo payload', async () => {
    const { result } = await montar()
    const movimento = [{ id: 'sec-banners', position: 1 }]
    await act(async () => {
      await result.current.reorderSectionsTo(movimento)
      await result.current.reorderSectionsTo(movimento)
    })
    const [primeira, segunda] = escritas('home_sections')
    expect(primeira.upsert).toEqual([{ id: 'sec-banners', type: 'banner_grid', position: 1 }])
    expect(segunda.upsert).toEqual(primeira.upsert)
  })

  it('lista vazia não vai ao banco', async () => {
    const { result } = await montar()
    await act(async () => {
      expect(await result.current.reorderSectionsTo([])).toBeNull()
    })
    expect(escritas('home_sections')).toHaveLength(0)
  })

  it('id que não está mais na lista é RECUSADO, com motivo — não vai com `type` nulo', async () => {
    const { result } = await montar()
    let devolvido: { message: string } | null = null
    await act(async () => {
      devolvido = await result.current.reorderSectionsTo([{ id: 'sumiu', position: 1 }])
    })
    expect(devolvido!.message).toContain('Recarregue a página')
    expect(escritas('home_sections')).toHaveLength(0)
  })
})

describe('useAdminHomeSections — curar', () => {
  it('grava as linhas com as MESMAS chaves, com `null` explícito no que não se aplica', async () => {
    // `insert` em lote com chaves diferentes devolve `PGRST102 All object keys must match` — medido
    // no probe da T11. Item com destino de coleção e item com destino de caminho têm de ter a mesma
    // forma.
    const { result } = await montar()
    await act(async () => {
      await result.current.curateSection('sec-banners', [
        { category_id: 'cat-1', image_url: 'a.webp', alt: 'Leite materno', label_snapshot: 'Leite materno' },
        { href: '/como-enviar', image_url: 'b.webp', alt: 'Como enviar' },
      ])
    })
    const insercao = escritas('home_section_items').find(c => c.insert !== undefined)!
    expect(insercao.insert).toEqual([
      {
        section_id: 'sec-banners',
        position: 1,
        category_id: 'cat-1',
        product_id: null,
        href: null,
        image_url: 'a.webp',
        alt: 'Leite materno',
        label_snapshot: 'Leite materno',
      },
      {
        section_id: 'sec-banners',
        position: 2,
        category_id: null,
        product_id: null,
        href: '/como-enviar',
        image_url: 'b.webp',
        alt: 'Como enviar',
        label_snapshot: null,
      },
    ])
  })

  it('lista vazia é "voltar ao automático": só o delete, nenhum insert', async () => {
    const { result } = await montar()
    await act(async () => {
      expect(await result.current.curateSection('sec-banners', [])).toBeNull()
    })
    const itens = escritas('home_section_items')
    expect(itens).toHaveLength(1)
    expect(itens[0].delete).toBe(true)
    expect(itens[0].filters).toEqual([{ method: 'eq', args: ['section_id', 'sec-banners'] }])
  })

  it('falha no delete aborta ANTES do insert — nenhuma seção fica sem curadoria por engano', async () => {
    writeResponse = { error: { message: 'network' } }
    const { result } = await montar()
    let devolvido: { message: string } | null = null
    await act(async () => {
      devolvido = await result.current.curateSection('sec-banners', [{ category_id: 'cat-1' }])
    })
    expect(devolvido).toEqual({ message: 'network' })
    expect(escritas('home_section_items').some(c => c.insert !== undefined)).toBe(false)
  })
})

describe('useAdminHomeSections — salvar conteúdo (HOME-14)', () => {
  it('manda só o `config` da própria linha', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.updateSectionConfig('sec-hero', { title_line1: 'Nova chamada' })
    })
    const escrita = escritas('home_sections')[0]
    expect(escrita.update).toEqual({ config: { title_line1: 'Nova chamada' } })
    expect(escrita.filters).toEqual([{ method: 'eq', args: ['id', 'sec-hero'] }])
  })

  it('falha de gravação volta com a mensagem do banco, não engolida', async () => {
    writeResponse = { error: { message: 'PGRST204 column does not exist' } }
    const { result } = await montar()
    let devolvido: { message: string } | null = null
    await act(async () => {
      devolvido = await result.current.updateSectionConfig('sec-hero', { title_line1: 'x' })
    })
    expect(devolvido).toEqual({ message: 'PGRST204 column does not exist' })
  })
})
