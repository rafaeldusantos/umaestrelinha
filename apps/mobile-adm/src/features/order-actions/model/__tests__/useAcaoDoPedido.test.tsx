// Feature `75` · T18 — o hook da ação de UM pedido (design §3.5, §7; `MAA-02`, `MAA-03`, `MAA-15`,
// `MAA-20`, `MAA-21`, `MAA-22`, `MAA-36`, `MAA-37`, `MAA-40`, `MAA-41`, A20, A21).
//
// A porta (`gravarAcao`) é dublada POR MÓDULO: o que se prova aqui é o que o hook faz com cada
// desfecho — a trava no mesmo tique, a releitura das três chaves pelo ESTADO DO CACHE, a frase (escrita
// por extenso, nunca lida da constante que prova) e a retentativa.
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORE_OVERVIEW_KEY } from '@estrelinha/core/hooks/useStoreOverview'

import { LISTA_DE_PEDIDOS_KEY, chaveDoPedido } from '@/entities/order'
import { linha } from '@/test/pedidos'

import { esquecerAcoes, lerErro, travar, useAviso } from '../..'
import type { ResultadoDaAcao } from '../../api/gravarAcao'
import { useAcaoDoPedido } from '../useAcaoDoPedido'

const porta = vi.hoisted(() => ({ gravarAcao: vi.fn() }))
vi.mock('../../api/gravarAcao', () => ({ gravarAcao: porta.gravarAcao }))
vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const ID = '00000000-0000-4000-8000-000000000244'
const OUTRO = '00000000-0000-4000-8000-000000000999'
const RECUSA = Object.assign(new Error('acesso restrito ao painel'), { code: '42501' })

const AGUARDANDO = linha({ material_status: 'aguardando_material' })
const PAGO_COM_MATERIAL = linha({ material_status: 'material_recebido' })
const SEPARANDO = linha({ status: 'separating' })
const PRIMARIA = { tipo: 'primaria' } as const
const RASTREIO = { tipo: 'rastreio', codigo: ' ab 1234 5678 br ', origem: 'acao' } as const

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
const montar = (id = ID) => renderHook(() => useAcaoDoPedido(id), { wrapper })
const montarAviso = () => renderHook(() => useAviso())

/** Uma porta que segura a resposta até o teste soltar. */
const segurar = () => {
  let soltar: (r: ResultadoDaAcao) => void = () => {}
  let falhar: (e: unknown) => void = () => {}
  porta.gravarAcao.mockImplementationOnce(
    () =>
      new Promise<ResultadoDaAcao>((ok, erro) => {
        soltar = ok
        falhar = erro
      }),
  )
  return { soltar: (r: ResultadoDaAcao) => soltar(r), falhar: (e: unknown) => falhar(e) }
}

/** As quatro chaves semeadas: o pedido, dois recortes da lista, o resumo — e o pedido VIZINHO. */
const semear = () => {
  client.setQueryData(chaveDoPedido(ID), { id: ID })
  client.setQueryData([LISTA_DE_PEDIDOS_KEY, 'tudo', ''], { linhas: [] })
  client.setQueryData([LISTA_DE_PEDIDOS_KEY, 'a-separar', 'marina'], { linhas: [] })
  client.setQueryData(STORE_OVERVIEW_KEY, { fila: {} })
  client.setQueryData(chaveDoPedido(OUTRO), { id: OUTRO })
}
const invalidada = (chave: readonly unknown[]) => client.getQueryState(chave)?.isInvalidated
const conferirReleitura = () => {
  expect(invalidada(chaveDoPedido(ID))).toBe(true)
  expect(invalidada([LISTA_DE_PEDIDOS_KEY, 'tudo', ''])).toBe(true)
  expect(invalidada([LISTA_DE_PEDIDOS_KEY, 'a-separar', 'marina'])).toBe(true)
  expect(invalidada(STORE_OVERVIEW_KEY)).toBe(true)
  expect(invalidada(chaveDoPedido(OUTRO))).toBe(false)
}

beforeEach(() => {
  esquecerAcoes()
  porta.gravarAcao.mockReset()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  semear()
})
afterEach(() => client.clear())

describe('a trava (MAA-20, MAA-36)', () => {
  it('dois `executar()` no MESMO tique, sem `await` entre eles ⇒ UMA chamada à porta', async () => {
    const p = segurar()
    const { result } = montar()
    let a: Promise<boolean>, b: Promise<boolean>
    act(() => {
      a = result.current.executar(AGUARDANDO, PRIMARIA)
      b = result.current.executar(AGUARDANDO, PRIMARIA)
    })
    expect(porta.gravarAcao).toHaveBeenCalledTimes(1)
    expect(result.current.travado).toBe(true)
    await act(async () => {
      p.soltar({ tipo: 'ok', emailSent: false, materialMudou: false })
      await a!
      await b!
    })
    expect(porta.gravarAcao).toHaveBeenCalledTimes(1)
    expect(result.current.travado).toBe(false)
  })

  it('dois hooks do MESMO pedido (o cartão e o detalhe) ⇒ UMA chamada; o de outro pedido sai', async () => {
    const p = segurar()
    const cartao = montar()
    const detalhe = montar()
    const vizinho = montar(OUTRO)
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: false, materialMudou: false })
    act(() => {
      void cartao.result.current.executar(AGUARDANDO, PRIMARIA)
      void detalhe.result.current.executar(AGUARDANDO, PRIMARIA)
      void vizinho.result.current.executar(linha({ id: OUTRO }), PRIMARIA)
    })
    expect(porta.gravarAcao).toHaveBeenCalledTimes(2)
    expect(porta.gravarAcao.mock.calls.map((c) => (c[0] as { id: string }).id)).toEqual([ID, OUTRO])
    expect([cartao.result.current.travado, detalhe.result.current.travado]).toEqual([true, true])
    await act(async () => p.soltar({ tipo: 'ok', emailSent: false, materialMudou: false }))
  })

  it('a porta que LANÇA a recusa ainda solta a trava, e um terceiro `executar` sai (re-entrada, L-057)', async () => {
    porta.gravarAcao.mockRejectedValueOnce(RECUSA)
    const { result } = montar()
    await act(() => result.current.executar(AGUARDANDO, PRIMARIA))
    expect(result.current.travado).toBe(false)
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: false, materialMudou: false })
    await act(() => result.current.executar(AGUARDANDO, PRIMARIA))
    expect(porta.gravarAcao).toHaveBeenCalledTimes(2)
  })

  it('a linha e o pedido chegam à porta como vieram', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: false, materialMudou: false })
    const { result } = montar()
    await act(() => result.current.executar(SEPARANDO, RASTREIO))
    expect(porta.gravarAcao).toHaveBeenCalledWith(SEPARANDO, RASTREIO)
  })
})

describe('a releitura em TODO desfecho que chega à rede (MAA-41, MAA-37)', () => {
  it.each<[string, () => void]>([
    ['ok', () => porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: true, materialMudou: false })],
    ['mudou', () => porta.gravarAcao.mockResolvedValueOnce({ tipo: 'mudou' })],
    ['falhou', () => porta.gravarAcao.mockResolvedValueOnce({ tipo: 'falhou', erro: new TypeError('Failed to fetch') })],
    [
      'material-recusado',
      () =>
        porta.gravarAcao.mockResolvedValueOnce({ tipo: 'material-recusado', reason: 'invalid_transition', status: 'em_producao', to: 'material_recebido' }),
    ],
    ['parcial', () => porta.gravarAcao.mockResolvedValueOnce({ tipo: 'parcial', etapa: 'material', causa: 'falhou' })],
    ['recusa lançada', () => porta.gravarAcao.mockRejectedValueOnce(RECUSA)],
  ])('%s ⇒ o pedido, os dois recortes da lista e o resumo invalidados; o pedido vizinho não', async (_, preparar) => {
    preparar()
    const { result } = montar()
    expect(invalidada(chaveDoPedido(ID))).toBe(false)
    await act(() => result.current.executar(AGUARDANDO, PRIMARIA))
    conferirReleitura()
  })

  it('a ação travada (o segundo toque) NÃO relê nada', async () => {
    travar(ID)
    const { result } = montar()
    await act(() => result.current.executar(AGUARDANDO, PRIMARIA))
    expect(porta.gravarAcao).not.toHaveBeenCalled()
    expect(invalidada(chaveDoPedido(ID))).toBe(false)
  })
})

describe('o sucesso (MAA-02, A11)', () => {
  it('mostra a confirmação de `actionConfirmation` e limpa o erro do pedido', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'falhou', erro: new TypeError('Failed to fetch') })
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: true, materialMudou: false })
    const aviso = montarAviso()
    const { result } = montar()
    await act(() => result.current.executar(AGUARDANDO, PRIMARIA))
    expect(result.current.erro?.frase).toBe('Não consegui salvar. Tente de novo.')
    await act(() => result.current.executar(AGUARDANDO, PRIMARIA))
    expect(aviso.result.current).toMatchObject({
      titulo: 'Material registrado.',
      frase: 'O pedido #0244 foi para a bancada. Marina recebe a confirmação por e-mail.',
    })
    expect(result.current.erro).toBeNull()
    expect(lerErro(ID)).toBeNull()
  })

  it('"Iniciar separação" com o material: a frase é a de produção', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: true, materialMudou: true })
    const aviso = montarAviso()
    const { result } = montar()
    await act(() => result.current.executar(PAGO_COM_MATERIAL, PRIMARIA))
    expect(aviso.result.current).toMatchObject({ titulo: 'Separação iniciada.', frase: 'Pedido #0244 em produção. Marina recebe o aviso por e-mail.' })
  })

  it('o rastreio a partir de `separating` cita o aviso de postagem só com `emailSent`', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: true, materialMudou: false })
    const aviso = montarAviso()
    const { result } = montar()
    await act(() => result.current.executar(SEPARANDO, RASTREIO))
    expect(aviso.result.current).toMatchObject({ titulo: 'Rastreio salvo.', frase: 'Marina recebe o aviso de postagem por e-mail.' })
  })

  it('o idempotente de "Recebi" (`emailSent` falso) não cita e-mail (MAA-05)', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: false, materialMudou: false })
    const aviso = montarAviso()
    const { result } = montar()
    await act(() => result.current.executar(AGUARDANDO, PRIMARIA))
    expect(aviso.result.current).toMatchObject({ titulo: 'Material registrado.', frase: 'O pedido #0244 foi para a bancada.' })
  })
})

describe('as falhas — a frase, a retentativa, e NENHUMA confirmação (exclusividade)', () => {
  const executarCom = async (resultado: ResultadoDaAcao, row = AGUARDANDO, pedido: typeof PRIMARIA | typeof RASTREIO = PRIMARIA) => {
    porta.gravarAcao.mockResolvedValueOnce(resultado)
    const aviso = montarAviso()
    const hook = montar()
    await act(() => hook.result.current.executar(row, pedido))
    expect(aviso.result.current).toBeNull()
    return hook.result.current
  }

  it('`mudou` ⇒ "Este pedido mudou enquanto você olhava." (MAA-21)', async () => {
    const r = await executarCom({ tipo: 'mudou' })
    expect(r.erro).toEqual({ frase: 'Este pedido mudou enquanto você olhava.', retentativa: null })
  })

  it('`falhou` ⇒ "Não consegui salvar. Tente de novo." (MAA-22)', async () => {
    const r = await executarCom({ tipo: 'falhou', erro: new TypeError('Failed to fetch') })
    expect(r.erro).toEqual({ frase: 'Não consegui salvar. Tente de novo.', retentativa: null })
    expect(r.erroBruto).toBeNull()
  })

  it('`material-recusado` ⇒ o motivo de `materialTransitionRefusal(<status da RPC>, to)` (MAA-03, MAA-09)', async () => {
    const r = await executarCom({ tipo: 'material-recusado', reason: 'invalid_transition', status: 'em_producao', to: 'material_recebido' })
    expect(r.erro?.frase).toBe(
      'Este pedido está em “Em produção”. “Material recebido” só é possível a partir de “Aguardando material” ou “Material a caminho”.',
    )
  })

  it('`material-recusado` com `order_not_found` ⇒ nenhuma frase: a releitura leva ao "Não encontrei" (MAA-04)', async () => {
    const r = await executarCom({ tipo: 'material-recusado', reason: 'order_not_found', status: null, to: 'material_recebido' })
    expect(r.erro).toBeNull()
    conferirReleitura()
  })

  // QA C01: a retentativa diz o que reenvia — sem `espera`, a linha relida sem "Iniciar separação"
  // caía no `falhou` do dono e o "Tentar de novo" dizia "Não consegui salvar" sem ir à rede.
  it('`parcial` do material ⇒ PARTIAL_MATERIAL com a retentativa primária que ESPERA `separar` (MAA-40, QA C01)', async () => {
    const r = await executarCom({ tipo: 'parcial', etapa: 'material', causa: 'falhou' }, PAGO_COM_MATERIAL)
    expect(r.erro).toEqual({
      frase: 'A produção ficou registrada, mas o pedido não passou para separação.',
      retentativa: { tipo: 'primaria', espera: 'separar' },
    })
  })

  it('`parcial` do rastreio ⇒ PARTIAL_TRACKING com o código NORMALIZADO e a origem (MAA-15 a)', async () => {
    const r = await executarCom({ tipo: 'parcial', etapa: 'rastreio', causa: 'nenhuma-linha' }, SEPARANDO, RASTREIO)
    expect(r.erro).toEqual({
      frase: 'O código ficou salvo, mas o pedido não foi marcado como enviado.',
      retentativa: { tipo: 'rastreio', codigo: 'AB12345678BR', origem: 'acao' },
    })
  })

  it('a recusa LANÇADA ⇒ `erroBruto` preenchido, nenhuma confirmação e nenhuma frase de erro', async () => {
    porta.gravarAcao.mockRejectedValueOnce(RECUSA)
    const aviso = montarAviso()
    const { result } = montar()
    await act(() => result.current.executar(AGUARDANDO, PRIMARIA))
    expect(result.current.erroBruto).toBe(RECUSA)
    expect(aviso.result.current).toBeNull()
    expect(result.current.erro).toBeNull()
  })

  it('uma exceção que NÃO é recusa ⇒ ACTION_FAILED, nunca a recusa', async () => {
    porta.gravarAcao.mockRejectedValueOnce(new TypeError('quebrou'))
    const { result } = montar()
    await act(() => result.current.executar(AGUARDANDO, PRIMARIA))
    expect(result.current.erro).toEqual({ frase: 'Não consegui salvar. Tente de novo.', retentativa: null })
    expect(result.current.erroBruto).toBeNull()
  })

  it('o erro é do PEDIDO: um segundo hook do mesmo id vê a frase; o de outro id não', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'mudou' })
    const cartao = montar()
    const vizinho = montar(OUTRO)
    const detalhe = montar()
    await act(() => detalhe.result.current.executar(AGUARDANDO, PRIMARIA))
    expect(cartao.result.current.erro?.frase).toBe('Este pedido mudou enquanto você olhava.')
    expect(vizinho.result.current.erro).toBeNull()
  })
})

describe('a troca de conta no meio (edge case de §3.5)', () => {
  it.each<[string, (p: ReturnType<typeof segurar>) => void]>([
    ['sucesso', (p) => p.soltar({ tipo: 'ok', emailSent: true, materialMudou: false })],
    ['falha', (p) => p.soltar({ tipo: 'falhou', erro: new TypeError('x') })],
    ['recusa', (p) => p.falhar(RECUSA)],
  ])('%s chegando DEPOIS da troca ⇒ nenhum aviso, nenhum erro, e a trava da conta nova não é solta', async (_, responder) => {
    const p = segurar()
    const aviso = montarAviso()
    const { result } = montar()
    let voo: Promise<boolean>
    act(() => {
      voo = result.current.executar(AGUARDANDO, PRIMARIA)
    })
    // O que `LimparCacheNaTrocaDeConta` faz na troca — e a conta nova trava o mesmo pedido.
    act(() => esquecerAcoes())
    expect(travar(ID)).toBe(true)
    await act(async () => {
      responder(p)
      await voo!
    })
    expect(aviso.result.current).toBeNull()
    expect(lerErro(ID)).toBeNull()
    expect(result.current.erroBruto).toBeNull()
    expect(travar(ID)).toBe(false)
  })
})

// Feature `75` · T22 — o que `executar` devolve, e o `aoConcluir` da folha (a folha fecha no sucesso
// ANTES de a releitura chegar: o pedido relido em `shipped` não pode virar "mudou com a folha aberta").
describe('o retorno de `executar` e o `aoConcluir` (T22, MAA-13)', () => {
  it('sucesso ⇒ `true`, e `aoConcluir` roda ANTES de a releitura ser pedida', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: false, materialMudou: false })
    const { result } = montar()
    const ordem: string[] = []
    const invalidar = vi.spyOn(client, 'invalidateQueries').mockImplementation(async () => {
      ordem.push('releitura')
    })
    let r: boolean | undefined
    await act(async () => {
      r = await result.current.executar(SEPARANDO, RASTREIO, { aoConcluir: () => ordem.push('concluiu') })
    })
    expect(r).toBe(true)
    expect(ordem[0]).toBe('concluiu')
    expect(ordem.filter((o) => o === 'releitura')).toHaveLength(3)
    invalidar.mockRestore()
  })

  it.each([
    ['falhou', { tipo: 'falhou', erro: new Error('x') }],
    ['mudou', { tipo: 'mudou' }],
    ['parcial', { tipo: 'parcial', etapa: 'rastreio', causa: 'falhou' }],
  ] as const)('%s ⇒ `false`, e `aoConcluir` NÃO roda', async (_n, desfecho) => {
    porta.gravarAcao.mockResolvedValueOnce(desfecho)
    const { result } = montar()
    const aoConcluir = vi.fn()
    let r: boolean | undefined
    await act(async () => {
      r = await result.current.executar(SEPARANDO, RASTREIO, { aoConcluir })
    })
    expect(r).toBe(false)
    expect(aoConcluir).not.toHaveBeenCalled()
  })

  it('a recusa lançada ⇒ `false`, sem `aoConcluir`; o toque travado ⇒ `false` sem ir à porta', async () => {
    porta.gravarAcao.mockRejectedValueOnce(RECUSA)
    const { result } = montar()
    const aoConcluir = vi.fn()
    let r: boolean | undefined
    await act(async () => {
      r = await result.current.executar(AGUARDANDO, PRIMARIA, { aoConcluir })
    })
    expect(r).toBe(false)
    expect(aoConcluir).not.toHaveBeenCalled()

    travar(ID)
    await act(async () => {
      r = await result.current.executar(AGUARDANDO, PRIMARIA, { aoConcluir })
    })
    expect(r).toBe(false)
    expect(porta.gravarAcao).toHaveBeenCalledTimes(1)
    expect(aoConcluir).not.toHaveBeenCalled()
  })
})
