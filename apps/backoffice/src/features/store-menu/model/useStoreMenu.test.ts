// Feature 86, T12 — `useStoreMenu`: ler, gravar com conflito por `updated_at`, voltar na falha.
//
// O dublê do client REGISTRA cada chamada (tabela, método, argumentos) e devolve, por tabela, só o
// que o `select` pediu. É o que torna auditáveis as três promessas que a tela não mostra:
//   1. a gravação filtra por `key = 'menu'` **e** `updated_at = visto` (sem o segundo filtro, a
//      última janela sobrescreve a primeira em silêncio — `MNM-37`);
//   2. **nenhuma** escrita em `categories` (`MNM-18`): reordenar o menu não pode mexer na árvore;
//   3. recusa local não vai à rede.

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseMenuDocument, type MenuDocument } from '@estrelinha/core/menu'
import { addChildNode, addRootNode, moveNode, removeNode, toggleSurface, updateNode } from './documentOps'

type Chamada = { tabela: string; metodo: string; args: unknown[] }

const db = vi.hoisted(() => ({
  chamadas: [] as Chamada[],
  categorias: [] as Record<string, unknown>[],
  linha: null as { value: unknown; updated_at: string } | null,
  erroLeitura: null as { message: string } | null,
  /** G04 — a leitura de `categories` falha (a árvore, que o hook lê pelo `useAdminCategories`). */
  erroCategorias: null as { message: string } | null,
  /** Resposta da escrita em `store_settings`: linhas devolvidas pelo `select`, ou erro. */
  escrita: { data: null as unknown, error: null as { message: string; code?: string } | null },
  /** Promessa que segura a escrita (para medir o estado otimista). */
  segurar: null as Promise<void> | null,
  /** Efeito da escrita no "banco" antes da resposta (a resposta perdida do Q02 grava e erra). */
  aoEscrever: null as ((args: unknown[]) => void) | null,
  /** Com ligado, o `update` só devolve linha se o `updated_at` filtrado for o do banco (a guarda real). */
  conferirVersao: false,
  /** S03 — as próximas N leituras de `store_settings` falham (a rede que volta aos poucos). */
  leiturasComErro: 0,
}))

vi.mock('@estrelinha/supabase/client', () => {
  const from = (tabela: string) => {
    const registro = (metodo: string, args: unknown[]) => db.chamadas.push({ tabela, metodo, args })
    let escreve = false
    let colunas = ''
    let argsDaEscrita: unknown[] = []
    let versaoFiltrada: unknown = undefined
    const resposta = async () => {
      if (tabela === 'categories') return db.erroCategorias ? { data: null, error: db.erroCategorias } : { data: db.categorias, error: null }
      if (tabela === 'category_product_counts') return { data: [], error: null }
      if (tabela === 'store_settings') {
        if (escreve) {
          if (db.segurar) await db.segurar
          if (db.conferirVersao && versaoFiltrada !== undefined && versaoFiltrada !== db.linha?.updated_at) {
            return { data: [], error: null }
          }
          db.aoEscrever?.(argsDaEscrita)
          return db.escrita
        }
        if (db.leiturasComErro > 0) {
          db.leiturasComErro -= 1
          return { data: null, error: { message: 'TypeError: Failed to fetch' } }
        }
        if (db.erroLeitura) return { data: null, error: db.erroLeitura }
        if (!db.linha) return { data: null, error: null }
        // Só o que o `select` pediu.
        const row: Record<string, unknown> = {}
        for (const c of colunas.split(',').map(s => s.trim())) row[c] = (db.linha as Record<string, unknown>)[c]
        return { data: row, error: null }
      }
      return { data: null, error: { message: `tabela inesperada: ${tabela}` } }
    }
    const builder: Record<string, unknown> = {}
    for (const metodo of ['eq', 'in', 'order'] as const) {
      builder[metodo] = (...args: unknown[]) => {
        registro(metodo, args)
        if (metodo === 'eq' && args[0] === 'updated_at') versaoFiltrada = args[1]
        return builder
      }
    }
    builder.select = (...args: unknown[]) => {
      registro('select', args)
      if (!escreve) colunas = String(args[0] ?? '')
      return builder
    }
    for (const metodo of ['update', 'insert', 'upsert', 'delete'] as const) {
      builder[metodo] = (...args: unknown[]) => {
        registro(metodo, args)
        escreve = true
        argsDaEscrita = args
        return builder
      }
    }
    builder.maybeSingle = () => {
      registro('maybeSingle', [])
      return resposta()
    }
    builder.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) => resposta().then(ok, erro)
    registro('from', [])
    return builder
  }
  return { supabase: { from } }
})

import {
  STORE_MENU_CONFLICT_MESSAGE,
  STORE_MENU_LOAD_FAILURE,
  STORE_MENU_RELEITURA_MS,
  STORE_MENU_SALVO_MS,
  STORE_MENU_SAVE_FAILURE,
  STORE_MENU_SAVE_UNKNOWN,
  useStoreMenu,
} from './useStoreMenu'

const cat = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: id.toUpperCase(),
  slug: id,
  parent_id: null,
  sort_order: 0,
  active: true,
  icon: null,
  menu_desktop: false,
  menu_mobile: false,
  menu_banners: null,
  ...over,
})

const V2: MenuDocument = {
  version: 2,
  items: [
    { id: 'n1', target: { kind: 'category', category_id: 'a' }, label: null, desktop: true, mobile: true, icon: null, banners: null, children: [] },
    { id: 'n2', target: { kind: 'link', href: '/sobre' }, label: 'Sobre', desktop: true, mobile: false, icon: null, banners: null, children: [] },
  ],
}

const VISTO = '2026-10-28T12:00:00.123456+00:00'
const NOVO = '2026-10-28T12:00:05.654321+00:00'

const escritas = () =>
  db.chamadas.filter(c => ['update', 'insert', 'upsert', 'delete'].includes(c.metodo))
const filtrosDaEscrita = () => {
  const i = db.chamadas.findIndex(c => c.tabela === 'store_settings' && ['update', 'insert'].includes(c.metodo))
  return db.chamadas.slice(i + 1).filter(c => c.tabela === 'store_settings' && c.metodo === 'eq').map(c => c.args)
}

const montar = async () => {
  const hook = renderHook(() => useStoreMenu())
  await waitFor(() => expect(hook.result.current.state).toBe('ready'))
  return hook
}

beforeEach(() => {
  db.chamadas = []
  db.categorias = [cat('a'), cat('b'), cat('b1', { parent_id: 'b', sort_order: 1 }), cat('b2', { parent_id: 'b', sort_order: 2, active: false })]
  db.linha = { value: { ...V2, links: [{ id: 'velho', label: 'Velho', href: '/x', desktop: true, mobile: true, sort_order: 0 }] }, updated_at: VISTO }
  db.erroLeitura = null
  db.erroCategorias = null
  db.escrita = { data: [{ updated_at: NOVO }], error: null }
  db.segurar = null
  db.aoEscrever = null
  db.conferirVersao = false
  db.leiturasComErro = 0
  vi.useRealTimers()
})

describe('leitura (MNM-05, MNM-34)', () => {
  it('com v2 gravado, o documento é o gravado; categorias são lidas sem escrita', async () => {
    const { result } = await montar()
    expect(result.current.document).toEqual(V2)
    expect(result.current.categories.map(c => c.id)).toEqual(['a', 'b', 'b1', 'b2'])
    const leitura = db.chamadas.filter(c => c.tabela === 'store_settings')
    expect(leitura.find(c => c.metodo === 'select')?.args[0]).toBe('value, updated_at')
    expect(leitura.filter(c => c.metodo === 'eq').map(c => c.args)).toEqual([['key', 'menu']])
    expect(escritas()).toEqual([])
  })

  it('sem v2, o documento é a conversão do legado (o menu de hoje)', async () => {
    db.categorias = [cat('a', { menu_desktop: true }), cat('b', { menu_mobile: true, sort_order: 1 })]
    db.linha = { value: { links: [] }, updated_at: VISTO }
    const { result } = await montar()
    expect(result.current.document?.items.map(i => [i.id, i.desktop, i.mobile])).toEqual([
      ['cat:a', true, false],
      ['cat:b', false, true],
    ])
  })

  it('falha de leitura ⇒ estado de erro, nunca menu vazio; reload relê', async () => {
    db.erroLeitura = { message: 'TypeError: Failed to fetch' }
    const { result } = renderHook(() => useStoreMenu())
    await waitFor(() => expect(result.current.state).toBe('error'))
    expect(result.current.document).toBeNull()
    // Q08: a frase da loja, nunca o erro cru do fetch (que chega em inglês).
    expect(result.current.error).toBe(STORE_MENU_LOAD_FAILURE)

    db.erroLeitura = null
    await act(() => result.current.reload())
    expect(result.current.state).toBe('ready')
    expect(result.current.document).toEqual(V2)
  })

  // G04 da verificação r2 (N38): só a falha de `store_settings` tinha caso. A da árvore de
  // categorias também é "não sei qual é o menu", e chega crua do fetch como a outra.
  it('falha na leitura das CATEGORIAS ⇒ estado de erro com a frase da loja, nunca o erro cru; reload relê', async () => {
    db.erroCategorias = { message: 'TypeError: Failed to fetch' }
    const { result } = renderHook(() => useStoreMenu())
    await waitFor(() => expect(result.current.state).toBe('error'))
    expect(result.current.error).toBe(STORE_MENU_LOAD_FAILURE)
    expect(result.current.document).toBeNull()

    db.erroCategorias = null
    await act(() => result.current.reload())
    await waitFor(() => expect(result.current.state).toBe('ready'))
    expect(result.current.error).toBeNull()
    expect(result.current.document).toEqual(V2)
  })
})

describe('gravação com conflito por updated_at (MNM-37, MNM-41)', () => {
  it('grava o documento inteiro filtrando por key E updated_at visto, e mostra Salvo ~2 s', async () => {
    const { result } = await montar()
    let r: unknown
    await act(async () => {
      r = await result.current.apply(d => moveNode(d, null, 0, 1))
    })
    expect(r).toBeNull()

    const update = escritas()
    expect(update).toHaveLength(1)
    expect(update[0].tabela).toBe('store_settings')
    expect(update[0].metodo).toBe('update')
    const { value } = update[0].args[0] as { value: Record<string, unknown> }
    expect(value.version).toBe(2)
    expect((value.items as { id: string }[]).map(i => i.id)).toEqual(['n2', 'n1'])
    // as outras chaves do value são preservadas (os links legados ficam inertes)
    expect(value.links).toEqual((db.linha!.value as Record<string, unknown>).links)
    expect(filtrosDaEscrita()).toEqual([
      ['key', 'menu'],
      ['updated_at', VISTO],
    ])
    expect(db.chamadas.at(-1)).toMatchObject({ tabela: 'store_settings', metodo: 'select', args: ['updated_at'] })

    expect(result.current.saving).toBe('saved')
    expect(result.current.document?.items.map(i => i.id)).toEqual(['n2', 'n1'])
    await waitFor(() => expect(result.current.saving).toBe('idle'), { timeout: STORE_MENU_SALVO_MS + 1000 })
  })

  it('a segunda gravação usa o updated_at NOVO, devolvido pela primeira', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.apply(d => moveNode(d, null, 0, 1))
    })
    db.chamadas = []
    db.escrita = { data: [{ updated_at: '2026-10-28T12:00:09.000001+00:00' }], error: null }
    await act(async () => {
      await result.current.apply(d => moveNode(d, null, 0, 1))
    })
    expect(filtrosDaEscrita()).toEqual([
      ['key', 'menu'],
      ['updated_at', NOVO],
    ])
  })

  it('duas ações seguidas (sem esperar) gravam em fila, cada uma com a versão da anterior', async () => {
    const { result } = await montar()
    let p1: Promise<unknown>, p2: Promise<unknown>
    await act(async () => {
      p1 = result.current.apply(d => moveNode(d, null, 0, 1))
      p2 = result.current.apply(d => updateNode(d, 'n1', { label: 'Joias' }))
      await Promise.all([p1, p2])
    })
    const filtros = db.chamadas
      .filter(c => c.tabela === 'store_settings' && c.metodo === 'eq' && c.args[0] === 'updated_at')
      .map(c => c.args[1])
    expect(filtros).toEqual([VISTO, NOVO])
    const ultimo = (escritas().at(-1)!.args[0] as { value: MenuDocument }).value
    expect(ultimo.items.map(i => [i.id, i.label])).toEqual([
      ['n2', 'Sobre'],
      ['n1', 'Joias'],
    ])
  })

  it('zero linhas ⇒ conflito: o documento volta ao gravado e nunca mostra Salvo', async () => {
    db.escrita = { data: [], error: null }
    const { result } = await montar()
    let r: { kind: string; message: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => moveNode(d, null, 0, 1))
    })
    expect(r).toEqual({ kind: 'conflito', message: STORE_MENU_CONFLICT_MESSAGE })
    expect(result.current.document).toEqual(V2)
    expect(result.current.saving).toBe('idle')
    expect(result.current.conflict).toBe(true)
  })

  it('conflito ⇒ `reload()` limpa o conflito e relê a versão gravada (a saída do MNM-37)', async () => {
    db.escrita = { data: [], error: null }
    const { result } = await montar()
    await act(async () => {
      await result.current.apply(d => moveNode(d, null, 0, 1))
    })
    expect(result.current.conflict).toBe(true)

    const OUTRA = '2026-10-28T12:00:03.000000+00:00'
    db.linha = { value: V2, updated_at: OUTRA }
    db.escrita = { data: [{ updated_at: NOVO }], error: null }
    await act(() => result.current.reload())
    expect(result.current.conflict).toBe(false)
    expect(result.current.state).toBe('ready')

    db.chamadas = []
    await act(async () => {
      await result.current.apply(d => moveNode(d, null, 0, 1))
    })
    expect(filtrosDaEscrita()).toEqual([
      ['key', 'menu'],
      ['updated_at', OUTRA],
    ])
  })

  it('erro na gravação ⇒ volta ao gravado, saving idle, nunca saved (MNM-38)', async () => {
    db.escrita = { data: null, error: { message: 'permission denied' } }
    const { result } = await montar()
    const vistos: string[] = []
    let r: { kind: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => moveNode(d, null, 0, 1))
      vistos.push(result.current.saving)
    })
    expect(r?.kind).toBe('falha')
    expect(result.current.document).toEqual(V2)
    expect(result.current.saving).toBe('idle')
    expect(vistos).not.toContain('saved')
    expect(result.current.conflict).toBe(false)
  })

  it('é otimista: enquanto a escrita está no ar, a tela já mostra o documento novo', async () => {
    let soltar: () => void = () => undefined
    db.segurar = new Promise<void>(r => (soltar = r))
    const { result } = await montar()
    let p: Promise<unknown>
    act(() => {
      p = result.current.apply(d => moveNode(d, null, 0, 1))
    })
    await waitFor(() => expect(result.current.saving).toBe('saving'))
    expect(result.current.document?.items.map(i => i.id)).toEqual(['n2', 'n1'])
    await act(async () => {
      soltar()
      await p
    })
    expect(result.current.saving).toBe('saved')
  })

  it('resposta sem updated_at é falha (a próxima gravação conflitaria consigo mesma)', async () => {
    db.escrita = { data: [{}], error: null }
    const { result } = await montar()
    let r: { kind: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => moveNode(d, null, 0, 1))
    })
    expect(r?.kind).toBe('falha')
    expect(result.current.document).toEqual(V2)
  })
})

describe('recusa local e no-op não vão à rede', () => {
  it('rótulo vazio é recusado com o motivo de core, sem chamada nenhuma', async () => {
    const { result } = await montar()
    db.chamadas = []
    let r: { kind: string; message: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => updateNode(d, 'n2', { label: '   ' }))
    })
    expect(r?.kind).toBe('recusa')
    expect(r?.message).toMatch(/nome/i)
    expect(db.chamadas).toEqual([])
    expect(result.current.document).toEqual(V2)
  })

  it('op que não muda nada (mover na ponta) não grava', async () => {
    const { result } = await montar()
    db.chamadas = []
    let r: unknown = 'x'
    await act(async () => {
      r = await result.current.apply(d => moveNode(d, null, 0, -1))
    })
    expect(r).toBeNull()
    expect(db.chamadas).toEqual([])
  })
})

describe('o teto do submenu num documento que já passou dele (MNM-24, revisto)', () => {
  const filhos30 = Array.from({ length: 30 }, (_, i) => ({
    id: `f${i}`,
    target: { kind: 'category' as const, category_id: `c${i}` },
    label: null,
    desktop: true,
    mobile: true,
  }))
  const DOC30: MenuDocument = {
    version: 2,
    items: [{ ...V2.items[0], children: filhos30 }, V2.items[1]],
  }

  it('com 30 filhos, tirar, mover, renomear e desligar um gravam; adicionar o 31º recusa sem rede', async () => {
    db.linha = { value: DOC30, updated_at: VISTO }
    const { result } = await montar()
    const ok: unknown[] = []
    await act(async () => {
      ok.push(await result.current.apply(d => removeNode(d, 'f0')))
      ok.push(await result.current.apply(d => moveNode(d, 'n1', 0, 1)))
      ok.push(await result.current.apply(d => updateNode(d, 'f3', { label: 'Anéis finos' })))
      ok.push(await result.current.apply(d => toggleSurface(d, 'f4', 'mobile', false)))
    })
    expect(ok).toEqual([null, null, null, null])
    expect(escritas()).toHaveLength(4)
    expect(result.current.document?.items[0].children).toHaveLength(29)

    db.chamadas = []
    let r: { kind: string; message: string } | null = null
    await act(async () => {
      r = await result.current.apply(d =>
        addChildNode(d, 'n1', { target: { kind: 'category', category_id: 'a' } }, () => 'x'),
      )
    })
    // 29 → 30 é crescer acima do teto: recusa, e nada vai à rede.
    expect(r).toEqual({ kind: 'recusa', message: 'O submenu tem o máximo de 24 itens.' })
    expect(db.chamadas).toEqual([])
  })
})

describe('primeira gravação e linha ausente', () => {
  it('sem v2, a 1ª apply grava o v2 inteiro convertido do legado', async () => {
    db.categorias = [cat('a', { menu_desktop: true, menu_mobile: true }), cat('b')]
    db.linha = { value: { links: [] }, updated_at: VISTO }
    const { result } = await montar()
    await act(async () => {
      await result.current.apply(d => addRootNode(d, { target: { kind: 'category', category_id: 'b' } }, result.current.categories, () => 'novo'))
    })
    const { value } = escritas()[0].args[0] as { value: unknown }
    const doc = parseMenuDocument(value)
    expect(doc?.items.map(i => i.id)).toEqual(['cat:a', 'novo'])
  })

  it('sem v2, a 1ª apply grava `items[n].banners` igual à coluna `menu_banners` legada (MNM-34)', async () => {
    const BANNERS = {
      desktop: [{ target: { kind: 'url', href: '/sobre' }, title: 'Campanha', image_desktop: 'https://cdn.exemplo/a.webp' }],
      mobile: [{ target: { kind: 'category', id: 'b' }, title: 'Campanha celular', image_mobile: 'https://cdn.exemplo/b.webp' }],
    }
    db.categorias = [cat('a', { menu_desktop: true, menu_mobile: true, menu_banners: BANNERS }), cat('b')]
    db.linha = { value: { links: [] }, updated_at: VISTO }
    const { result } = await montar()
    await act(async () => {
      await result.current.apply(d => updateNode(d, 'cat:a', { label: 'A' }))
    })
    const { value } = escritas()[0].args[0] as { value: { items: { id: string; banners: unknown }[] } }
    const a = value.items.find(i => i.id === 'cat:a')!
    expect(a.banners).toEqual(BANNERS)
  })

  it('linha ausente ⇒ insert com a chave; erro de chave duplicada é conflito', async () => {
    db.linha = null
    db.categorias = [cat('a')]
    db.escrita = { data: null, error: { message: 'duplicate key', code: '23505' } }
    const { result } = await montar()
    let r: { kind: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => addRootNode(d, { target: { kind: 'category', category_id: 'a' } }, [], () => 'x'))
    })
    const insert = escritas()
    expect(insert).toHaveLength(1)
    expect(insert[0].metodo).toBe('insert')
    expect((insert[0].args[0] as { key: string }).key).toBe('menu')
    expect(r?.kind).toBe('conflito')
    expect(result.current.document?.items).toEqual([])
  })

  it('linha ausente ⇒ insert que dá certo vira a versão vista', async () => {
    db.linha = null
    db.categorias = [cat('a')]
    const { result } = await montar()
    await act(async () => {
      await result.current.apply(d => addRootNode(d, { target: { kind: 'category', category_id: 'a' } }, [], () => 'x'))
    })
    db.chamadas = []
    await act(async () => {
      await result.current.apply(d => updateNode(d, 'x', { label: 'A' }))
    })
    expect(escritas()[0].metodo).toBe('update')
    expect(filtrosDaEscrita()).toEqual([
      ['key', 'menu'],
      ['updated_at', NOVO],
    ])
  })
})

describe('MNM-18 — nenhuma escrita em categories', () => {
  it('adicionar, mover, renomear e remover: só store_settings é escrita', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.apply(d => addRootNode(d, { target: { kind: 'category', category_id: 'b' } }, result.current.categories, () => 'nb'))
      await result.current.apply(d => moveNode(d, null, 2, 0))
      await result.current.apply(d => updateNode(d, 'nb', { label: 'Bê' }))
    })
    const tabelas = new Set(escritas().map(c => c.tabela))
    expect(tabelas).toEqual(new Set(['store_settings']))
    // sensor: o dublê ENXERGA escrita em categories (senão a ausência acima seria verdade por cegueira)
    const { supabase } = await import('@estrelinha/supabase/client')
    ;(supabase.from('categories') as unknown as { update: (v: unknown) => unknown }).update({ sort_order: 1 })
    expect(escritas().some(c => c.tabela === 'categories')).toBe(true)
  })
})

/**
 * Q02 (`BUG-20261028-resposta-perdida-tela-diz-que-nao-salvou`) — o servidor GRAVA e a resposta se
 * perde (o celular cai depois do PATCH). A tela dizia "Não salvou" e voltava a chave; a ação seguinte
 * acusava "outra janela". O banco é a verdade: relê-se a linha e compara-se o `value` com o enviado.
 */
describe('Q02 — resposta perdida: a releitura decide se salvou', () => {
  /** O que o banco faz com o jsonb: grava, e devolve com as chaves em outra ordem. */
  const gravarNoBanco = (versao: string) => (args: unknown[]) => {
    const { value } = args[0] as { value: Record<string, unknown> }
    const invertido = Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(value))).reverse())
    db.linha = { value: invertido, updated_at: versao }
  }

  it('gravou e a resposta se perdeu ⇒ relê, o banco tem o enviado: Salvo, sem falha', async () => {
    db.conferirVersao = true
    const { result } = await montar()
    db.aoEscrever = gravarNoBanco(NOVO)
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    let r: unknown = 'x'
    await act(async () => {
      r = await result.current.apply(d => moveNode(d, null, 0, 1))
    })
    expect(r).toBeNull()
    expect(result.current.saving).toBe('saved')
    expect(result.current.document?.items.map(i => i.id)).toEqual(['n2', 'n1'])
    expect(result.current.conflict).toBe(false)

    // A ação seguinte, na mesma aba, usa a versão RELIDA — e não acusa outra janela.
    db.aoEscrever = gravarNoBanco('2026-10-28T12:00:09.000001+00:00')
    db.escrita = { data: [{ updated_at: '2026-10-28T12:00:09.000001+00:00' }], error: null }
    db.chamadas = []
    let r2: unknown = 'x'
    await act(async () => {
      r2 = await result.current.apply(d => toggleSurface(d, 'n1', 'mobile', false))
    })
    expect(r2).toBeNull()
    expect(filtrosDaEscrita()).toEqual([
      ['key', 'menu'],
      ['updated_at', NOVO],
    ])
    expect(result.current.conflict).toBe(false)
  })

  it('erro e o banco NÃO tem o enviado ⇒ volta ao gravado e diz que não salvou', async () => {
    db.conferirVersao = true
    const { result } = await montar()
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    let r: { kind: string; message: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => moveNode(d, null, 0, 1))
    })
    expect(r).toEqual({ kind: 'falha', message: STORE_MENU_SAVE_FAILURE })
    expect(result.current.document).toEqual(V2)
    expect(result.current.saving).toBe('idle')
  })

  it('a releitura também falha ⇒ não afirma o que não sabe; a próxima ação, de volta a rede, não acusa conflito', async () => {
    db.conferirVersao = true
    const { result } = await montar()
    // O PATCH chega ao banco; a resposta e a releitura se perdem (o celular ficou sem rede).
    db.aoEscrever = (args: unknown[]) => {
      gravarNoBanco(NOVO)(args)
      db.erroLeitura = { message: 'TypeError: Failed to fetch' }
    }
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    let r: { kind: string; message: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => toggleSurface(d, 'n1', 'mobile', false))
    })
    expect(r).toEqual({ kind: 'incerto', message: STORE_MENU_SAVE_UNKNOWN })
    expect(r!.message).not.toBe(STORE_MENU_SAVE_FAILURE)

    // A rede volta. A dona toca outra chave.
    db.erroLeitura = null
    db.aoEscrever = gravarNoBanco('2026-10-28T12:00:09.000001+00:00')
    db.escrita = { data: [{ updated_at: '2026-10-28T12:00:09.000001+00:00' }], error: null }
    let r2: unknown = 'x'
    await act(async () => {
      r2 = await result.current.apply(d => toggleSurface(d, 'n2', 'mobile', true))
    })
    expect(r2).toBeNull()
    expect(result.current.conflict).toBe(false)
    // O que foi gravado é a verdade do banco (a 1ª mudança, que tinha valido) MAIS a 2ª.
    const ultimo = (escritas().at(-1)!.args[0] as { value: MenuDocument }).value
    expect(ultimo.items.map(i => [i.id, i.mobile])).toEqual([
      ['n1', false],
      ['n2', true],
    ])
    expect(result.current.document?.items.map(i => [i.id, i.mobile])).toEqual([
      ['n1', false],
      ['n2', true],
    ])
  })

  it('a releitura mostra que OUTRA janela gravou (valor diferente do enviado) ⇒ o conflito é verdadeiro', async () => {
    db.conferirVersao = true
    const { result } = await montar()
    db.aoEscrever = () => {
      db.erroLeitura = { message: 'TypeError: Failed to fetch' }
    }
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    await act(async () => {
      await result.current.apply(d => toggleSurface(d, 'n1', 'mobile', false))
    })
    // Outra janela grava outra coisa enquanto esta está sem rede.
    db.erroLeitura = null
    db.aoEscrever = null
    db.linha = { value: { version: 2, items: [V2.items[1]] }, updated_at: '2026-10-28T12:00:07.000000+00:00' }
    let r: { kind: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => toggleSurface(d, 'n2', 'mobile', true))
    })
    expect(r?.kind).toBe('conflito')
    expect(result.current.conflict).toBe(true)
  })

  it('o erro de gravação nunca chega cru à tela', async () => {
    const { result } = await montar()
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    let r: { message: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => moveNode(d, null, 0, 1))
    })
    expect(r!.message).not.toMatch(/TypeError|fetch/i)
  })
})

/**
 * S03 (QA r3, o resíduo de `BUG-20261029-incerteza-de-gravacao-com-titulo-nao-salvou`) — depois do
 * desfecho `incerto`, a tela mostrava o valor de ANTES do envio até a próxima ação, com o banco já
 * gravado. Agora ela relê sozinha assim que a rede responde e mostra a verdade do banco — sem esperar
 * toque nenhum, e sem acusar conflito que não houve.
 */
describe('S03 — depois da incerteza, a tela relê sozinha e mostra o que o banco tem', () => {
  const gravarNoBanco = (versao: string) => (args: unknown[]) => {
    const { value } = args[0] as { value: Record<string, unknown> }
    const invertido = Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(value))).reverse())
    db.linha = { value: invertido, updated_at: versao }
  }
  const mobileDe = (doc: MenuDocument | null, id: string) => doc?.items.find(i => i.id === id)?.mobile

  it('a releitura responde NA HORA (logo depois da que falhou): sem ação nenhuma, mostra o gravado e Salvo', async () => {
    db.conferirVersao = true
    const { result } = await montar()
    db.aoEscrever = gravarNoBanco(NOVO)
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    db.leiturasComErro = 1 // só a releitura do desfecho falha
    let r: { kind: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => toggleSurface(d, 'n1', 'mobile', false))
    })
    expect(r?.kind).toBe('incerto')
    await waitFor(() => expect(mobileDe(result.current.document, 'n1')).toBe(false), { timeout: 1500 })
    expect(result.current.saving).toBe('saved')
    expect(result.current.conflict).toBe(false)
    expect(escritas()).toHaveLength(1)
  })

  it('a rede volta depois: relê de novo sozinha e mostra o gravado; a próxima ação parte do NOVO updated_at', async () => {
    db.conferirVersao = true
    const { result } = await montar()
    db.aoEscrever = (args: unknown[]) => {
      gravarNoBanco(NOVO)(args)
      db.erroLeitura = { message: 'TypeError: Failed to fetch' }
    }
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    await act(async () => {
      await result.current.apply(d => toggleSurface(d, 'n1', 'mobile', false))
    })
    expect(mobileDe(result.current.document, 'n1')).toBe(true) // ainda não sabe
    db.erroLeitura = null
    db.aoEscrever = null
    await waitFor(() => expect(mobileDe(result.current.document, 'n1')).toBe(false), { timeout: 4000 })
    expect(result.current.conflict).toBe(false)

    db.aoEscrever = gravarNoBanco('2026-10-28T12:00:09.000001+00:00')
    db.escrita = { data: [{ updated_at: '2026-10-28T12:00:09.000001+00:00' }], error: null }
    db.chamadas = []
    let r2: unknown = 'x'
    await act(async () => {
      r2 = await result.current.apply(d => toggleSurface(d, 'n2', 'mobile', true))
    })
    expect(r2).toBeNull()
    expect(filtrosDaEscrita()).toEqual([
      ['key', 'menu'],
      ['updated_at', NOVO],
    ])
  })

  it('o banco NÃO tinha gravado: a releitura confirma o de antes, sem conflito, sem Salvo', async () => {
    db.conferirVersao = true
    const { result } = await montar()
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    db.leiturasComErro = 1
    await act(async () => {
      await result.current.apply(d => toggleSurface(d, 'n1', 'mobile', false))
    })
    // Espera a releitura em segundo plano acontecer (uma leitura a mais, depois da que falhou).
    await waitFor(
      () => expect(db.chamadas.filter(c => c.tabela === 'store_settings' && c.metodo === 'maybeSingle').length).toBeGreaterThanOrEqual(3),
      { timeout: 1500 },
    )
    expect(result.current.document).toEqual(V2)
    expect(result.current.conflict).toBe(false)
    expect(result.current.saving).toBe('idle')

    // A rede voltou: a próxima ação grava a partir da versão que a aba já via, sem reler antes.
    db.escrita = { data: [{ updated_at: NOVO }], error: null }
    db.chamadas = []
    let r2: unknown = 'x'
    await act(async () => {
      r2 = await result.current.apply(d => toggleSurface(d, 'n2', 'mobile', true))
    })
    expect(r2).toBeNull()
    expect(result.current.conflict).toBe(false)
    expect(db.chamadas.findIndex(c => c.metodo === 'maybeSingle')).toBe(-1)
    expect(filtrosDaEscrita()).toEqual([
      ['key', 'menu'],
      ['updated_at', VISTO],
    ])
  })

  // H01 da verificação r3 (F17) — o ramo POSITIVO do conflito na reconciliação. O caso acima prova
  // só o inverso (sem conflito falso); este prova que, sem ação nenhuma da dona, a releitura que
  // acha OUTRA versão (nem o valor enviado nem a versão que esta aba via) acusa o conflito.
  it('a releitura acha OUTRA versão (outra janela gravou): conflito verdadeiro, sem Salvo, sem ação nenhuma', async () => {
    db.conferirVersao = true
    const { result } = await montar()
    // O PATCH não grava e a resposta se perde; a releitura do desfecho também (sem rede).
    db.aoEscrever = () => {
      db.erroLeitura = { message: 'TypeError: Failed to fetch' }
    }
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    let r: { kind: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => toggleSurface(d, 'n1', 'mobile', false))
    })
    expect(r?.kind).toBe('incerto')
    expect(result.current.conflict).toBe(false)

    // Enquanto esta aba estava sem rede, outra janela gravou outra coisa.
    const OUTRA = '2026-10-28T12:00:07.000000+00:00'
    db.erroLeitura = null
    db.aoEscrever = null
    db.linha = { value: { version: 2, items: [V2.items[1]] }, updated_at: OUTRA }
    await waitFor(() => expect(result.current.conflict).toBe(true), { timeout: 4000 })
    expect(result.current.saving).not.toBe('saved')
    expect(escritas()).toHaveLength(1) // ninguém gravou de novo: foi a releitura sozinha
  })
})

/**
 * G01 da verificação r2 (N08, N09, N11) — a ESPERA da releitura, com relógio falso. Os casos do S03
 * acima provam que ela resolve; nenhum provava que ela PARA depois de resolver, que segue a sequência
 * de `STORE_MENU_RELEITURA_MS` enquanto a rede não responde, nem que voltar a ficar online relê na
 * hora. O relógio é trocado DEPOIS de montar (o `waitFor` da montagem roda com o relógio real).
 */
describe('G01 — a releitura da incerteza: para, espera em degraus, relê ao voltar a rede', () => {
  const gravarNoBanco = (versao: string) => (args: unknown[]) => {
    const { value } = args[0] as { value: Record<string, unknown> }
    db.linha = { value: JSON.parse(JSON.stringify(value)), updated_at: versao }
  }
  const leituras = () =>
    db.chamadas.filter(c => c.tabela === 'store_settings' && c.metodo === 'maybeSingle').length
  const avancar = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
  }
  /** Monta, liga o relógio falso e termina numa `apply` com desfecho `incerto`. */
  const incertoComRedeCaida = async () => {
    db.conferirVersao = true
    const hook = await montar()
    vi.useFakeTimers()
    db.aoEscrever = (args: unknown[]) => {
      gravarNoBanco(NOVO)(args)
      db.erroLeitura = { message: 'TypeError: Failed to fetch' }
    }
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    let r: { kind: string } | null = null
    await act(async () => {
      r = await hook.result.current.apply(d => toggleSurface(d, 'n1', 'mobile', false))
    })
    expect(r?.kind).toBe('incerto')
    return hook
  }

  it('depois de resolver (Salvo), não lê mais o banco, por mais que o relógio ande', async () => {
    db.conferirVersao = true
    const { result } = await montar()
    vi.useFakeTimers()
    db.aoEscrever = gravarNoBanco(NOVO)
    db.escrita = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    db.leiturasComErro = 1 // só a releitura do desfecho falha; a da reconciliação responde
    let r: { kind: string } | null = null
    await act(async () => {
      r = await result.current.apply(d => toggleSurface(d, 'n1', 'mobile', false))
    })
    expect(r?.kind).toBe('incerto')
    await avancar(0)
    expect(result.current.saving).toBe('saved')
    expect(result.current.document?.items.find(i => i.id === 'n1')?.mobile).toBe(false)
    const depoisDeResolver = leituras()

    await avancar(5 * 60_000)
    expect(leituras()).toBe(depoisDeResolver)
    expect(result.current.saving).toBe('idle') // o selo saiu; e nada mais foi lido
  })

  it('a sequência declarada é 0, 1, 2, 4, 8 e 15 s', () => {
    expect(STORE_MENU_RELEITURA_MS).toEqual([0, 1000, 2000, 4000, 8000, 15000])
  })

  // Os degraus abaixo são escritos por extenso, nunca lidos da constante: derivar dela provaria que
  // o hook é igual a si mesmo.
  it('enquanto a rede não responde, relê em 0, 1, 2, 4, 8, 15, 15… s', async () => {
    await incertoComRedeCaida()
    let esperado = leituras()
    // Cada degrau: 1 ms antes não leu; no instante, leu uma vez.
    for (const espera of [0, 1000, 2000, 4000, 8000, 15000, 15000, 15000]) {
      if (espera > 0) {
        await avancar(espera - 1)
        expect(leituras(), `antes do degrau de ${espera} ms`).toBe(esperado)
        await avancar(1)
      } else {
        await avancar(0)
      }
      esperado += 1
      expect(leituras(), `no degrau de ${espera} ms`).toBe(esperado)
    }
  })

  it('voltar a ficar online relê na hora, sem esperar o degrau; e resolve', async () => {
    const { result } = await incertoComRedeCaida()
    // Sobe a espera até o degrau de 15 s (0 + 1 + 2 + 4 + 8 = 15 s de leituras falhando).
    await avancar(0)
    await avancar(1000 + 2000 + 4000 + 8000)
    const antes = leituras()
    await avancar(5000) // no meio do degrau de 15 s: nada
    expect(leituras()).toBe(antes)

    db.erroLeitura = null
    db.aoEscrever = null
    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(leituras()).toBe(antes + 1)
    expect(result.current.saving).toBe('saved')
    expect(result.current.document?.items.find(i => i.id === 'n1')?.mobile).toBe(false)
    expect(result.current.conflict).toBe(false)

    // E parou: o degrau de 15 s que estava marcado não lê mais.
    await avancar(60_000)
    expect(leituras()).toBe(antes + 1)
  })

  // H02 da verificação r3 (F16) — o S03 declara `online` E `focus`; o G01 só provava o primeiro.
  it('voltar à aba ("focus") relê na hora, sem esperar o degrau; e resolve', async () => {
    const { result } = await incertoComRedeCaida()
    await avancar(0)
    await avancar(1000 + 2000 + 4000 + 8000)
    const antes = leituras()
    await avancar(5000) // no meio do degrau de 15 s: nada
    expect(leituras()).toBe(antes)

    db.erroLeitura = null
    db.aoEscrever = null
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(leituras()).toBe(antes + 1)
    expect(result.current.saving).toBe('saved')
    expect(result.current.document?.items.find(i => i.id === 'n1')?.mobile).toBe(false)
    expect(result.current.conflict).toBe(false)

    await avancar(60_000)
    expect(leituras()).toBe(antes + 1)
  })

  it('sem incerteza, "focus" não lê nada', async () => {
    await montar()
    vi.useFakeTimers()
    const antes = leituras()
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(leituras()).toBe(antes)
  })

  it('sem incerteza, "online" não lê nada', async () => {
    await montar()
    vi.useFakeTimers()
    const antes = leituras()
    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(leituras()).toBe(antes)
  })
})
