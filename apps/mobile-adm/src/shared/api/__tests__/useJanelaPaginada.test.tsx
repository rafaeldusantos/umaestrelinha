// Feature `76` · T12 — `useJanelaPaginada` com a consulta INJETADA (abordagem A do Design). A máquina
// (geração, recusa da próxima, releitura em páginas cheias, `lerComPapel` em torno de cada leitura) é a
// que a `74` fechou em quatro rodadas; aqui ela é provada sem nenhuma tabela, para a lista de clientes
// e a de pedidos de uma cliente herdarem a mesma prova. O comportamento de PEDIDOS segue provado, sem
// uma asserção tocada, por `useListaDePedidos.test.tsx` e `pedidosComClientReal.test.tsx`.
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake } from '@/test/fakeSupabase'

import { tamanhoDaJanelaDe, useJanelaPaginada, type PaginaLida, type PedidoDeLeitura } from '../useJanelaPaginada'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const REDE = new TypeError('Failed to fetch')

interface Linha {
  id: string
}
const linhas = (n: number, desde = 0): Linha[] => Array.from({ length: n }, (_, i) => ({ id: `id-${String(desde + i).padStart(4, '0')}` }))
const PAGINA = 25

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)

type Consultar = (p: PedidoDeLeitura<string>) => Promise<PaginaLida<Linha>>
let sequencia = 0
const montar = (consultar: Consultar, extra: { desduplicar?: boolean; habilitada?: boolean; chave?: readonly unknown[] } = {}) => {
  const chave = extra.chave ?? ['atelie-teste', `c${++sequencia}`]
  return renderHook(
    () =>
      useJanelaPaginada<Linha, string>({
        chave,
        tamanhoDaPagina: PAGINA,
        consultar,
        cursorDe: (u) => u.id,
        desduplicar: extra.desduplicar,
        habilitada: extra.habilitada,
      }),
    { wrapper },
  )
}

const segurada = <T,>() => {
  let soltar: (v: T) => void = () => {}
  let falhar: (e: unknown) => void = () => {}
  const promessa = new Promise<T>((res, rej) => {
    soltar = res
    falhar = rej
  })
  return { promessa, soltar, falhar }
}

beforeEach(() => {
  fake.reset()
  client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
})
afterEach(() => client.clear())

describe('tamanhoDaJanelaDe: páginas cheias, nunca menos que uma', () => {
  it.each([
    [0, 25],
    [1, 25],
    [25, 25],
    [26, 50],
    [50, 50],
    [51, 75],
  ])('%i carregadas ⇒ janela de %i', (carregadas, esperado) => {
    expect(tamanhoDaJanelaDe(carregadas, 25)).toBe(esperado)
  })
  it('respeita o tamanho da página (20 por página, como os pedidos de uma cliente)', () => {
    expect(tamanhoDaJanelaDe(21, 20)).toBe(40)
  })
})

describe('a primeira leitura', () => {
  it('lê a janela do topo com contagem, sem cursor, e devolve linhas, total e o instante do banco', async () => {
    const consultar = vi.fn<Consultar>(async () => ({ linhas: linhas(3), count: 3 }))
    const { result } = montar(consultar)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(consultar).toHaveBeenCalledTimes(1)
    expect(consultar).toHaveBeenCalledWith({ limite: 25, contar: true })
    expect(result.current.data).toEqual({ linhas: linhas(3), total: 3, lido_em: LIDO_EM, fim: true })
  })

  it('a janela cheia não é o fim; sem contagem do servidor, o total é o das linhas', async () => {
    const { result } = montar(async () => ({ linhas: linhas(25), count: null }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.fim).toBe(false)
    expect(result.current.data?.total).toBe(25)
  })

  it('a consulta roda DENTRO de lerComPapel: a RPC de papel já saiu quando ela é chamada', async () => {
    let rpcsNaChamada = -1
    const { result } = montar(async () => {
      rpcsNaChamada = fake.chamadasDe('atelie_clock').length
      return { linhas: [], count: 0 }
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(rpcsNaChamada).toBe(1)
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
  })

  it('desligada (`habilitada: false`): nenhuma consulta e nenhuma RPC', async () => {
    const consultar = vi.fn<Consultar>(async () => ({ linhas: [], count: 0 }))
    const { result } = montar(consultar, { habilitada: false })
    await act(async () => {})
    expect(consultar).not.toHaveBeenCalled()
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(0)
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('a página seguinte', () => {
  it('sai pelo cursor da ÚLTIMA linha, sem contagem, confirma o papel de novo e anexa', async () => {
    const consultar = vi.fn<Consultar>(async (p) => ({ linhas: p.cursor ? linhas(25, 25) : linhas(25), count: p.contar ? 90 : null }))
    const { result } = montar(consultar)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => result.current.carregarMais())
    expect(consultar).toHaveBeenLastCalledWith({ limite: 25, cursor: 'id-0024', contar: false })
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(2)
    expect(result.current.data?.linhas).toHaveLength(50)
    expect(result.current.data?.total).toBe(90)
  })

  it('a página curta é o fim: depois dela, carregar mais não sai', async () => {
    const consultar = vi.fn<Consultar>(async (p) => ({ linhas: p.cursor ? linhas(4, 25) : linhas(25), count: null }))
    const { result } = montar(consultar)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => result.current.carregarMais())
    expect(result.current.data?.fim).toBe(true)
    await act(async () => result.current.carregarMais())
    expect(consultar).toHaveBeenCalledTimes(2)
  })

  it('toque duplo no MESMO tique: uma só ida', async () => {
    const segura = segurada<PaginaLida<Linha>>()
    const consultar = vi.fn<Consultar>(async (p) => (p.cursor ? segura.promessa : { linhas: linhas(25), count: null }))
    const { result } = montar(consultar)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => {
      void result.current.carregarMais()
      void result.current.carregarMais()
    })
    expect(consultar.mock.calls.filter(([p]) => p.cursor)).toHaveLength(1)
    await act(async () => segura.soltar({ linhas: linhas(25, 25), count: null }))
  })

  it('`desduplicar`: o `id` que já está na janela é descartado; o fim vem do tamanho BRUTO da página', async () => {
    const consultar = vi.fn<Consultar>(async (p) => ({ linhas: p.cursor ? [...linhas(24, 100), { id: 'id-0003' }] : linhas(25), count: null }))
    const { result } = montar(consultar, { desduplicar: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => result.current.carregarMais())
    const ids = result.current.data!.linhas.map((l) => l.id)
    expect(ids).toHaveLength(49)
    expect(new Set(ids).size).toBe(49)
    expect(result.current.data?.fim).toBe(false)
  })

  it('sem `desduplicar` (pedidos) a lista fica como o servidor mandou — inerte', async () => {
    const consultar = vi.fn<Consultar>(async (p) => ({ linhas: p.cursor ? [...linhas(24, 100), { id: 'id-0003' }] : linhas(25), count: null }))
    const { result } = montar(consultar)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => result.current.carregarMais())
    expect(result.current.data?.linhas).toHaveLength(50)
  })

  it('a falha (rede) da página seguinte MANTÉM as linhas, marca `proximaFalhou` e uma nova tentativa limpa', async () => {
    let falhar = true
    const consultar = vi.fn<Consultar>(async (p) => {
      if (p.cursor && falhar) throw REDE
      return { linhas: p.cursor ? linhas(25, 25) : linhas(25), count: null }
    })
    const { result } = montar(consultar)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => result.current.carregarMais())
    expect(result.current.proximaFalhou).toBe(true)
    expect(result.current.erroDaProxima).toBe(REDE)
    expect(result.current.data?.linhas).toHaveLength(25)
    falhar = false
    await act(async () => result.current.carregarMais())
    expect(result.current.proximaFalhou).toBe(false)
    expect(result.current.data?.linhas).toHaveLength(50)
  })
})

describe('a releitura da janela (G-A11)', () => {
  it('relê tantas linhas quantas já estavam carregadas, em páginas cheias, com contagem', async () => {
    const consultar = vi.fn<Consultar>(async (p) => ({ linhas: linhas(p.cursor ? 5 : p.limite), count: null }))
    const { result } = montar(consultar)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => result.current.carregarMais())
    // 25 + 5 = 30 carregadas ⇒ a releitura pede 50.
    await act(async () => void (await result.current.refetch()))
    expect(consultar).toHaveBeenLastCalledWith({ limite: 50, contar: true })
  })
})

describe('a geração (E3): a página que saiu antes de uma releitura é velha', () => {
  it('uma releitura que COMEÇA com a página em voo a descarta em silêncio', async () => {
    const segura = segurada<PaginaLida<Linha>>()
    const consultar = vi.fn<Consultar>(async (p) => (p.cursor ? segura.promessa : { linhas: linhas(25), count: null }))
    const { result } = montar(consultar)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    let proxima: Promise<void> = Promise.resolve()
    await act(async () => {
      proxima = result.current.carregarMais()
    })
    await act(async () => void (await result.current.refetch()))
    await act(async () => {
      segura.soltar({ linhas: linhas(25, 25), count: null })
      await proxima
    })
    expect(result.current.data?.linhas).toHaveLength(25)
    expect(result.current.proximaFalhou).toBe(false)
  })

  it('a falha da página velha também é descartada: não pinta erro sobre a janela nova', async () => {
    const segura = segurada<PaginaLida<Linha>>()
    const consultar = vi.fn<Consultar>(async (p) => (p.cursor ? segura.promessa : { linhas: linhas(25), count: null }))
    const { result } = montar(consultar)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    let proxima: Promise<void> = Promise.resolve()
    await act(async () => {
      proxima = result.current.carregarMais()
    })
    await act(async () => void (await result.current.refetch()))
    await act(async () => {
      segura.falhar(REDE)
      await proxima
    })
    expect(result.current.proximaFalhou).toBe(false)
  })
})

describe('a recusa (42501) vence', () => {
  it('na janela: a RPC recusa e a consulta devolve dados ⇒ o erro é a recusa, sem repetir (retryUnlessDenied)', async () => {
    fake.falharRpc('atelie_clock', RECUSA)
    const { result } = montar(async () => ({ linhas: linhas(3), count: 3 }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(RECUSA)
    expect(result.current.data).toBeUndefined()
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
  })

  it('a consulta falha por rede MAS a RPC recusa ⇒ a recusa vence (Promise.allSettled, nunca all)', async () => {
    fake.falharRpc('atelie_clock', RECUSA)
    const { result } = montar(async () => Promise.reject(REDE))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(RECUSA)
  })

  it('rede na janela repete UMA vez', async () => {
    const consultar = vi.fn<Consultar>(async () => Promise.reject(REDE))
    const { result } = montar(consultar)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(consultar).toHaveBeenCalledTimes(2)
  })

  it('na página seguinte: a recusa fica em `erroDaProxima` e SOBREVIVE à remontagem do hook (o RequireAdmin troca a página pela splash)', async () => {
    const chave = ['atelie-teste', 'remonta']
    const consultar: Consultar = async (p) => ({ linhas: p.cursor ? linhas(25, 25) : linhas(25), count: null })
    const primeira = montar(consultar, { chave })
    await waitFor(() => expect(primeira.result.current.isSuccess).toBe(true))
    fake.aoChamarRpc('atelie_clock', () => ({ data: null, error: RECUSA }))
    await act(async () => primeira.result.current.carregarMais())
    expect(primeira.result.current.erroDaProxima).toEqual(RECUSA)
    primeira.unmount()
    const segunda = montar(consultar, { chave })
    // O cache ainda guarda a leitura bem-sucedida, e a recusa continua valendo sobre ELA.
    await waitFor(() => expect(segunda.result.current.data).toBeDefined())
    expect(segunda.result.current.erroDaProxima).toEqual(RECUSA)
    expect(segunda.result.current.proximaFalhou).toBe(true)
  })

  it('a recusa da próxima deixa de valer quando uma releitura confirma o papel (preso ao `dataUpdatedAt`)', async () => {
    const chave = ['atelie-teste', 'presa']
    const consultar: Consultar = async (p) => ({ linhas: p.cursor ? linhas(25, 25) : linhas(25), count: null })
    const primeira = montar(consultar, { chave })
    await waitFor(() => expect(primeira.result.current.isSuccess).toBe(true))
    fake.aoChamarRpc('atelie_clock', () => ({ data: null, error: RECUSA }))
    await act(async () => primeira.result.current.carregarMais())
    expect(primeira.result.current.erroDaProxima).toEqual(RECUSA)
    primeira.unmount()
    // Papel de volta: a releitura da remontagem lê de novo e muda o `dataUpdatedAt`.
    fake.aoChamarRpc('atelie_clock', () => ({ data: { lido_em: LIDO_EM }, error: null }))
    await new Promise((r) => setTimeout(r, 5))
    const segunda = montar(consultar, { chave })
    await waitFor(() => expect(segunda.result.current.isFetching).toBe(false))
    await waitFor(() => expect(segunda.result.current.erroDaProxima).toBeNull())
    expect(segunda.result.current.proximaFalhou).toBe(false)
  })

  it('a recusa guardada de uma chave não vaza para outra', async () => {
    const consultar: Consultar = async (p) => ({ linhas: p.cursor ? linhas(25, 25) : linhas(25), count: null })
    const a = montar(consultar, { chave: ['atelie-teste', 'a'] })
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true))
    fake.aoChamarRpc('atelie_clock', () => ({ data: null, error: RECUSA }))
    await act(async () => a.result.current.carregarMais())
    fake.aoChamarRpc('atelie_clock', () => ({ data: { lido_em: LIDO_EM }, error: null }))
    const b = montar(consultar, { chave: ['atelie-teste', 'b'] })
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true))
    expect(b.result.current.erroDaProxima).toBeNull()
  })
})
