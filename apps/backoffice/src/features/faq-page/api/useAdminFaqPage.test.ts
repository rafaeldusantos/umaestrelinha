import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

/**
 * `FAQL-19`..`FAQL-24` — a curadoria da página de perguntas.
 *
 * O caso que carrega o desenho é `salvarTextoProprio`: texto idêntico ao padrão grava **`null`**.
 * Guardar a cópia daria dois donos do mesmo texto — editar a biblioteca deixaria de alcançar esta
 * página, e nada na tela diria por quê.
 */

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useAdminFaqPage } from './useAdminFaqPage'

const LINHAS = [
  {
    faq_id: 'a',
    category: 'sobre',
    position: 0,
    answer_override: null,
    faq: { id: 'a', question: 'O que são joias afetivas?', answer: 'A resposta padrão.', is_active: true },
  },
  {
    faq_id: 'b',
    category: 'sobre',
    position: 1,
    answer_override: 'Uma resposta só da página.',
    faq: { id: 'b', question: 'Não uso joias?', answer: 'O padrão dela.', is_active: true },
  },
  {
    faq_id: 'c',
    category: 'cuidados',
    position: 0,
    answer_override: null,
    // Entrada desativada na biblioteca: a RLS a esconde e o embed vem null.
    faq: null,
  },
]

const escritas: { tabela: string; op: string; payload?: unknown; onde?: unknown }[] = []
let erroDeLeitura: { message: string; code?: string } | null = null
let erroDeEscrita: { message: string; code?: string } | null = null

const construirQuery = (tabela: string) => {
  const registrar = (op: string, payload?: unknown) => {
    const gravacao = { tabela, op, payload, onde: undefined as unknown }
    escritas.push(gravacao)
    return {
      eq: (_coluna: string, valor: unknown) => {
        gravacao.onde = valor
        return Promise.resolve({ error: erroDeEscrita })
      },
      then: (resolver: (v: unknown) => unknown) => resolver({ error: erroDeEscrita }),
    }
  }

  return {
    select: () => ({
      order: () =>
        Promise.resolve({
          data: tabela === 'faq_page_items' ? LINHAS : [{ faq_id: 'a', products: 12 }],
          error: tabela === 'faq_page_items' ? erroDeLeitura : null,
        }),
      then: (resolver: (v: unknown) => unknown) =>
        resolver({ data: [{ faq_id: 'a', products: 12 }], error: null }),
    }),
    insert: (payload: unknown) => registrar('insert', payload),
    update: (payload: unknown) => registrar('update', payload),
    delete: () => registrar('delete'),
  }
}

const montar = async () => {
  const hook = renderHook(() => useAdminFaqPage())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

beforeEach(() => {
  escritas.length = 0
  erroDeLeitura = null
  erroDeEscrita = null
  fromMock.mockReset()
  fromMock.mockImplementation(construirQuery)
})

describe('useAdminFaqPage — leitura', () => {
  it('junta a colocação, a entrada e a contagem de uso', async () => {
    const { result } = await montar()

    expect(result.current.items).toHaveLength(3)
    expect(result.current.items[0]).toMatchObject({
      faq_id: 'a',
      question: 'O que são joias afetivas?',
      answer: 'A resposta padrão.',
      usage: 12,
      is_active: true,
    })
  })

  it('entrada escondida pela RLS chega como INATIVA, não como inexistente', async () => {
    const { result } = await montar()
    const semEntrada = result.current.items.find(i => i.faq_id === 'c')

    expect(semEntrada?.is_active).toBe(false)
    expect(semEntrada?.question).toBe('')
  })

  it('pergunta sem uso em produto nenhum conta zero', async () => {
    const { result } = await montar()
    expect(result.current.items.find(i => i.faq_id === 'b')?.usage).toBe(0)
  })

  // Vazio e ilegível não são o mesmo estado.
  it('erro de leitura vira `error`, e a lista NÃO vira vazia silenciosa', async () => {
    erroDeLeitura = { message: 'connection refused' }
    const { result } = await montar()

    expect(result.current.error).toBe('connection refused')
    expect(result.current.items).toEqual([])
  })
})

describe('useAdminFaqPage — escrita', () => {
  it('adicionar põe as perguntas no FIM do assunto', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.adicionar(['x', 'y'], 'sobre')
    })

    const insert = escritas.find(e => e.op === 'insert')
    // 'sobre' já tem posições 0 e 1; as novas entram em 2 e 3.
    expect(insert?.payload).toEqual([
      { faq_id: 'x', category: 'sobre', position: 2 },
      { faq_id: 'y', category: 'sobre', position: 3 },
    ])
  })

  it('adicionar com assunto fora do vocabulário é recusado ANTES de gravar', async () => {
    const { result } = await montar()
    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.adicionar(['x'], 'promocoes')
    })

    expect(motivo).toContain('não é um assunto da página')
    expect(escritas.filter(e => e.op === 'insert')).toHaveLength(0)
  })

  it('adicionar sem escolher pergunta nenhuma é recusado', async () => {
    const { result } = await montar()
    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.adicionar([], 'sobre')
    })

    expect(motivo).toBe('Escolha ao menos uma pergunta.')
    expect(escritas.filter(e => e.op === 'insert')).toHaveLength(0)
  })

  it('remover apaga a COLOCAÇÃO, nunca a entrada da biblioteca', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.remover('a')
    })

    const del = escritas.find(e => e.op === 'delete')
    expect(del?.tabela).toBe('faq_page_items')
    expect(del?.onde).toBe('a')
    expect(escritas.some(e => e.tabela === 'faqs')).toBe(false)
  })

  it('reordenar grava a posição de cada linha, na ordem recebida', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.reordenar('sobre', ['b', 'a'])
    })

    const updates = escritas.filter(e => e.op === 'update')
    expect(updates).toHaveLength(2)
    expect(updates[0]).toMatchObject({ payload: { position: 0 }, onde: 'b' })
    expect(updates[1]).toMatchObject({ payload: { position: 1 }, onde: 'a' })
  })

  it('mover de assunto grava o assunto novo e manda para o fim dele', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.moverDeAssunto('a', 'cuidados')
    })

    expect(escritas.find(e => e.op === 'update')).toMatchObject({
      payload: { category: 'cuidados', position: 1 },
      onde: 'a',
    })
  })

  // ⚠️ O caso que sustenta o desenho inteiro.
  it('texto próprio IDÊNTICO ao padrão grava null, não a cópia', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.salvarTextoProprio('a', 'A resposta padrão.')
    })

    expect(escritas.find(e => e.op === 'update')?.payload).toEqual({ answer_override: null })
  })

  it('texto próprio diferente do padrão é gravado', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.salvarTextoProprio('a', 'A versão longa, em primeira pessoa.')
    })

    expect(escritas.find(e => e.op === 'update')?.payload).toEqual({
      answer_override: 'A versão longa, em primeira pessoa.',
    })
  })

  it('texto próprio só de espaço limpa o campo', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.salvarTextoProprio('a', '   ')
    })

    expect(escritas.find(e => e.op === 'update')?.payload).toEqual({ answer_override: null })
  })

  it('erro de escrita vira motivo acionável, não o código cru', async () => {
    const { result } = await montar()
    erroDeEscrita = { message: 'duplicate key', code: '23505' }
    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.remover('a')
    })

    expect(motivo).toBe(
      'Esta pergunta já está na página. Procure por ela na lista em vez de acrescentar outra.',
    )
  })
})
