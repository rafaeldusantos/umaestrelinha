import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `FAQ-14`, `FAQ-15`, `FAQ-18` — a biblioteca no painel.
 *
 * O que se prova aqui é **o que vai para o Supabase**: que a contagem sai da view `faq_usage` (e não
 * de uma coluna materializada), que o toggle manda só `is_active`, que a chave de dedupe é escrita
 * por `faqQuestionKey`, e que os três códigos do Postgres que esta tela pode receber viram motivo
 * legível em vez de "erro ao salvar".
 */

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { FAQ_SELECT, useAdminFaqs } from './useAdminFaqs'

interface Recorded {
  table: string
  select?: string
  insert?: unknown
  update?: unknown
  delete?: boolean
  filters: { method: string; args: unknown[] }[]
}

let calls: Recorded[] = []
let faqsResponse: { data: unknown[] | null; error: unknown }
let usageResponse: { data: unknown[] | null; error: unknown }
let writeResponse: { error: unknown }

const makeBuilder = (record: Recorded, resolve: () => unknown) => {
  const builder: Record<string, unknown> = {}
  for (const method of ['eq', 'order'] as const) {
    builder[method] = (...args: unknown[]) => {
      record.filters.push({ method, args })
      return builder
    }
  }
  builder.select = (arg: string) => {
    record.select = arg
    return builder
  }
  builder.insert = (values: unknown) => {
    record.insert = values
    return builder
  }
  builder.update = (values: unknown) => {
    record.update = values
    return builder
  }
  builder.delete = () => {
    record.delete = true
    return builder
  }
  builder.then = (onFulfilled: (value: unknown) => unknown) =>
    Promise.resolve(resolve()).then(onFulfilled)
  return builder
}

beforeEach(() => {
  calls = []
  faqsResponse = {
    data: [
      {
        id: 'f1',
        question: 'O anel é ajustável?',
        answer: 'Sim, dentro de dois números.',
        question_key: 'o anel e ajustavel',
        is_active: true,
      },
      {
        id: 'f2',
        question: 'Quanto tempo leva?',
        answer: 'Até 25 dias.',
        question_key: 'quanto tempo leva',
        is_active: false,
      },
    ],
    error: null,
  }
  usageResponse = { data: [{ faq_id: 'f1', products: 47 }], error: null }
  writeResponse = { error: null }

  fromMock.mockImplementation((table: string) => {
    const record: Recorded = { table, filters: [] }
    calls.push(record)
    return makeBuilder(record, () => {
      if (record.insert || record.update || record.delete) return writeResponse
      if (table === 'faq_usage') return usageResponse
      return faqsResponse
    })
  })
})

const montar = async () => {
  const hook = renderHook(() => useAdminFaqs())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useAdminFaqs — a leitura', () => {
  it('lê `faqs` com colunas nomeadas, ordenadas pela pergunta', async () => {
    await montar()

    const leitura = calls.find(c => c.table === 'faqs')!
    expect(leitura.select).toBe(FAQ_SELECT)
    expect(leitura.select).not.toContain('*')
    expect(leitura.filters).toContainEqual({
      method: 'order',
      args: ['question', { ascending: true }],
    })
  })

  // A contagem é view, não coluna: materializá-la daria um segundo dono do número, que o importador
  // desatualizaria ao gravar 3.475 vínculos de uma vez.
  it('a contagem de uso vem da view `faq_usage`', async () => {
    const { result } = await montar()

    expect(calls.map(c => c.table)).toContain('faq_usage')
    expect(result.current.faqs.find(f => f.id === 'f1')!.usage).toBe(47)
  })

  it('entrada sem linha na view conta zero, e não `undefined`', async () => {
    const { result } = await montar()
    expect(result.current.faqs.find(f => f.id === 'f2')!.usage).toBe(0)
  })

  it('falha de leitura vira `error`, e não lista vazia', async () => {
    faqsResponse = { data: null, error: { message: 'relation não existe' } }

    const { result } = await montar()

    expect(result.current.error).toBe('relation não existe')
    expect(result.current.faqs).toEqual([])
  })

  it('falha só na contagem não derruba a lista', async () => {
    usageResponse = { data: null, error: { message: 'view fora' } }

    const { result } = await montar()

    expect(result.current.error).toBeNull()
    expect(result.current.faqs).toHaveLength(2)
    expect(result.current.faqs[0].usage).toBe(0)
  })
})

describe('useAdminFaqs — criar', () => {
  it('grava `question_key` produzido por `faqQuestionKey`', async () => {
    const { result } = await montar()

    await act(async () => {
      await result.current.create('As joias são realmente feitas à mão?', 'Só a parte da resina.')
    })

    const insert = calls.find(c => c.insert)!.insert as Record<string, string>
    expect(insert.question_key).toBe('as joias sao realmente feitas a mao')
    expect(insert.question).toBe('As joias são realmente feitas à mão?')
  })

  it('recusa antes do banco quando o limite estoura', async () => {
    const { result } = await montar()

    let recusa: string | null = null
    await act(async () => {
      recusa = await result.current.create('a'.repeat(161), 'resposta')
    })

    expect(recusa).toBe('A pergunta tem 161 caracteres e o limite é 160.')
    expect(calls.some(c => c.insert)).toBe(false)
  })

  it('recusa pergunta vazia sem chamar o banco', async () => {
    const { result } = await montar()

    let recusa: string | null = null
    await act(async () => {
      recusa = await result.current.create('   ', 'resposta')
    })

    expect(recusa).toBe('A pergunta não pode ficar vazia.')
    expect(calls.some(c => c.insert)).toBe(false)
  })

  it('`23505` vira "já existe na biblioteca", e não a mensagem do Postgres', async () => {
    const { result } = await montar()
    writeResponse = { error: { code: '23505', message: 'duplicate key value violates …' } }

    let recusa: string | null = null
    await act(async () => {
      recusa = await result.current.create('P?', 'R.')
    })

    expect(recusa).toContain('já existe na biblioteca')
    expect(recusa).not.toContain('duplicate key')
  })

  it('`23514` vira aviso de limite', async () => {
    const { result } = await montar()
    writeResponse = { error: { code: '23514', message: 'new row for relation …' } }

    let recusa: string | null = null
    await act(async () => {
      recusa = await result.current.create('P?', 'R.')
    })

    expect(recusa).toContain('limite de caracteres')
  })

  it('sucesso devolve null', async () => {
    const { result } = await montar()

    let recusa: string | null = 'x'
    await act(async () => {
      recusa = await result.current.create('P?', 'R.')
    })

    expect(recusa).toBeNull()
  })
})

describe('useAdminFaqs — editar e ligar/desligar', () => {
  it('editar regrava a chave junto com o texto', async () => {
    const { result } = await montar()

    await act(async () => {
      await result.current.update('f1', 'O anel é ajustável mesmo?', 'Sim.')
    })

    const update = calls.find(c => c.update)!.update as Record<string, string>
    expect(update.question_key).toBe('o anel e ajustavel mesmo')
  })

  // Mesma regra do pausar cupom: acrescentar campos reescreveria a entrada com cache velho.
  it('o toggle manda `{ is_active }` e NADA mais', async () => {
    const { result } = await montar()

    await act(async () => {
      await result.current.toggle('f1', false)
    })

    const chamada = calls.find(c => c.update)!
    expect(chamada.update).toEqual({ is_active: false })
    expect(chamada.filters).toContainEqual({ method: 'eq', args: ['id', 'f1'] })
  })
})

describe('useAdminFaqs — apagar', () => {
  it('entrada EM USO é recusada com a contagem, e o delete nem sai', async () => {
    const { result } = await montar()

    let recusa: string | null = null
    await act(async () => {
      recusa = await result.current.remove('f1')
    })

    expect(recusa).toContain('47 produto(s)')
    expect(recusa).toContain('Desative')
    expect(calls.some(c => c.delete)).toBe(false)
  })

  it('entrada sem uso é apagada', async () => {
    const { result } = await montar()

    let recusa: string | null = 'x'
    await act(async () => {
      recusa = await result.current.remove('f2')
    })

    expect(recusa).toBeNull()
    expect(calls.some(c => c.delete)).toBe(true)
  })

  // A contagem em mão pode estar velha, e a escrita pode não vir daqui: quem garante é o banco.
  it('`23503` vindo do banco vira o mesmo aviso de desativar', async () => {
    const { result } = await montar()
    writeResponse = { error: { code: '23503', message: 'violates foreign key constraint' } }

    let recusa: string | null = null
    await act(async () => {
      recusa = await result.current.remove('f2')
    })

    expect(recusa).toContain('está em uso')
    expect(recusa).toContain('Desative')
  })
})
