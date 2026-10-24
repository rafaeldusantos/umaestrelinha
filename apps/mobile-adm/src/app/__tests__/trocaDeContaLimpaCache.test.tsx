// Feature `74` · T27 — a troca de conta limpa o cache inteiro (E6, R6, `MAP-37`, TE7), pela árvore
// REAL (`<App />` sobre o dublê do client, com o `AuthProvider` de verdade).
//
// O que se prova é o DESENHO: depois da troca, nada da conta anterior aparece — nem as linhas da lista,
// nem o detalhe, nem o número do selo —, mesmo com as leituras da conta nova ainda no ar. Sem o
// `clear()`, o `RequireAdmin` remontaria as páginas e o React Query desenharia o cache da conta que saiu
// enquanto a leitura da nova não volta.
process.env.TZ = 'UTC'

import { act, fireEvent, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pedidoHref } from '@/entities/order'
import { fake, type RespostaTabela } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { NOTA, detalhe, item, linha, statusRow } from '@/test/pedidos'
import { resumo } from '@/test/resumo'
import { CANAL_DA_LISTA } from '@/pages/PedidosPage'
import { esquecerTermos } from '@/shared/lib/useTermoDaEntrada'
import { definirErro, esquecerAcoes, lerErro, mostrarAviso, travar, useAviso } from '@/features/order-actions'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const A = 'adri@exemplo.invalid'
const B = 'bia@exemplo.invalid'
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const ID = '00000000-0000-4000-8000-000000000244'
const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const linhasNaTela = () => screen.queryAllByTestId('linha-do-pedido')
const selo = () => screen.queryByTestId('selo-da-aba')
const navegar = async (caminho: string) => {
  await act(async () => {
    window.history.pushState({}, '', caminho)
    window.dispatchEvent(new PopStateEvent('popstate'))
    await vi.advanceTimersByTimeAsync(50)
  })
}

/** A conta A lê: lista com a Marina, o detalhe dela e o selo com 5. */
const responderContaA = () => {
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
  fake.responderRpc('store_overview', resumo({ fila: { ...resumo().fila, precisa_acao: 5 } }))
  fake.responderTabela('order_list', (cadeia): RespostaTabela =>
    cadeia.some((e) => e.metodo === 'maybeSingle') ? { data: detalhe(), error: null } : { data: [linha()], error: null, count: 1 },
  )
  fake.responderTabela('order_items', { data: [item()], error: null })
  fake.responderTabela('order_status_history', { data: [statusRow()], error: null })
  fake.responderTabela('order_notes', { data: [NOTA], error: null })
  fake.responderTabela('order_notifications', { data: [], error: null })
}

/** Tudo da conta nova fica no ar: o que aparecer na tela só pode ter vindo do cache. */
const pendurarTudo = () => {
  fake.pendurarRpc('atelie_clock')
  fake.pendurarRpc('store_overview')
  fake.pendurarTabela('order_list')
}

const entrarComo = async (email: string) => {
  fake.tornarAdmin(email)
  await act(async () => {
    await fake.client.auth.signInWithPassword({ email, password: 'segredo-de-teste' })
    await vi.advanceTimersByTimeAsync(50)
  })
}

beforeEach(() => {
  fake.reset()
  fake.comSessao(A, { admin: true })
  esquecerTermos()
  esquecerAcoes()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('a troca de conta limpa o cache (E6)', () => {
  it('A → B sem sair: com lista, detalhe e selo de A em cache, nada de A é desenhado enquanto B lê', async () => {
    responderContaA()
    await montarApp(pedidoHref(ID))
    await andar(50)
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido #0244' })).toBeInTheDocument()
    await navegar('/pedidos?visao=tudo')
    // Pré-condição esperada pelo achado (sob carga, 50 ms de relógio falso não bastam à primeira leitura).
    expect(await screen.findAllByTestId('linha-do-pedido')).toHaveLength(1)
    expect((await screen.findByTestId('selo-da-aba')).textContent).toBe('5')

    // A página e o layout seguem MONTADOS na troca (o `h1` é o mesmo nó): é o caso em que limpar o
    // cache sem avisar quem o observa deixaria o número de A no selo.
    const h1Antes = screen.getByRole('heading', { level: 1 })
    pendurarTudo()
    await entrarComo(B)
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    expect(screen.getByRole('heading', { level: 1 })).toBe(h1Antes)
    expect(linhasNaTela()).toHaveLength(0)
    expect(selo()).toBeNull()
    expect(screen.getByRole('main').textContent).not.toMatch(/Marina|#0244|R\$/)

    await navegar(pedidoHref(ID))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Pedido')
    expect(screen.queryByRole('region', { name: 'Cliente' })).toBeNull()
    expect(screen.getAllByTestId('esqueleto-do-bloco').length).toBeGreaterThan(0)
  })

  it('a volta da aba com o MESMO usuário mantém o cache: a lista e o selo seguem, sem esqueleto', async () => {
    responderContaA()
    await montarApp('/pedidos?visao=tudo')
    await andar(50)
    const [antes] = await screen.findAllByTestId('linha-do-pedido')
    expect((await screen.findByTestId('selo-da-aba')).textContent).toBe('5')

    pendurarTudo()
    await act(async () => {
      fake.voltarAba()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(linhasNaTela()).toHaveLength(1)
    expect(linhasNaTela()[0]).toBe(antes)
    expect(selo()?.textContent).toBe('5')
    expect(screen.getByRole('region', { name: 'Pedidos' })).not.toHaveAttribute('aria-busy')
  })

  it('sair ⇒ cache vazio: entrar de novo com a MESMA conta, com tudo no ar, não desenha o que estava antes', async () => {
    responderContaA()
    await montarApp('/pedidos?visao=tudo')
    await andar(50)
    expect(await screen.findAllByTestId('linha-do-pedido')).toHaveLength(1)

    await act(async () => {
      fake.perderSessao()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(window.location.pathname).toBe('/login')

    pendurarTudo()
    await entrarComo(A)
    await navegar('/pedidos?visao=tudo')
    expect(linhasNaTela()).toHaveLength(0)
    expect(selo()).toBeNull()
  })

  it('sair com a lista ABERTA e uma leitura em voo (TE7): o canal sai e a resposta que chega depois não é desenhada', async () => {
    responderContaA()
    let soltar: (r: RespostaTabela) => void = () => {}
    let n = 0
    fake.responderTabela('order_list', () =>
      ++n === 1 ? { data: [linha()], error: null, count: 1 } : new Promise<RespostaTabela>((r) => (soltar = r)),
    )
    await montarApp('/pedidos?visao=tudo')
    await andar(50)
    expect(await screen.findAllByTestId('linha-do-pedido')).toHaveLength(1)
    expect(fake.canaisAbertos().map((c) => c.nome)).toEqual([CANAL_DA_LISTA])
    act(() => {
      fake.emitir('orders')
    })
    await andar(50)
    expect(n).toBe(2)

    await act(async () => {
      fake.perderSessao()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(window.location.pathname).toBe('/login')
    expect(fake.client.removeChannel).toHaveBeenCalled()
    expect(fake.canaisAbertos()).toHaveLength(0)

    await act(async () => {
      soltar({ data: [linha({ customer_name: 'Resposta Atrasada' })], error: null, count: 1 })
      await vi.advanceTimersByTimeAsync(50)
    })
    pendurarTudo()
    await entrarComo(A)
    await navegar('/pedidos?visao=tudo')
    expect(screen.queryByText('Resposta Atrasada')).toBeNull()
    expect(linhasNaTela()).toHaveLength(0)
  })
})

// B02: o termo da busca fica na memória por entrada do histórico — e, como o cache, é da CONTA. Um nome
// de cliente digitado por A não pode reaparecer na caixa de B quando B volta àquela entrada.
describe('a troca de conta esquece os termos da busca (B02)', () => {
  it('A busca, abre o pedido, B entra e volta: a caixa vem vazia', async () => {
    responderContaA()
    await montarApp('/pedidos?visao=tudo')
    await andar(50)
    expect(await screen.findAllByTestId('linha-do-pedido')).toHaveLength(1)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pedido' }), { target: { value: 'Marina' } })
    await andar(350)
    await andar(50)
    fireEvent.click(linhasNaTela()[0])
    await andar(50)
    expect(window.location.pathname).toBe(pedidoHref(linha().id))
    await entrarComo(B)
    await andar(50)
    await act(async () => {
      window.history.back()
      await vi.advanceTimersByTimeAsync(50)
    })
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    expect((screen.getByRole('searchbox', { name: 'Buscar pedido' }) as HTMLInputElement).value).toBe('')
  })

  // Feature `75` · T17 (A20, `L-057`) — a trava, o erro e a confirmação das ações são da conta.
  const sujarAcoesDeA = () => {
    act(() => {
      expect(travar(ID)).toBe(true)
      definirErro(ID, { frase: 'Não consegui salvar. Tente de novo.', retentativa: { tipo: 'primaria' } })
      mostrarAviso({ titulo: 'Material registrado.', frase: 'O pedido #0244 foi para a bancada.' })
    })
  }

  it('A → B sem sair: B não herda a trava, o erro nem a confirmação de A (feature 75)', async () => {
    responderContaA()
    await montarApp('/pedidos?visao=tudo')
    await andar(50)
    expect(await screen.findAllByTestId('linha-do-pedido')).toHaveLength(1)
    const aviso = renderHook(() => useAviso())
    sujarAcoesDeA()
    expect(aviso.result.current?.titulo).toBe('Material registrado.')

    pendurarTudo()
    await entrarComo(B)
    await andar(50)
    expect(lerErro(ID)).toBeNull()
    expect(aviso.result.current).toBeNull()
    expect(travar(ID)).toBe(true)
  })

  it('sair e entrar de novo com a MESMA conta: a reentrada não herda a trava nem o erro (feature 75, L-057)', async () => {
    responderContaA()
    await montarApp('/pedidos?visao=tudo')
    await andar(50)
    expect(await screen.findAllByTestId('linha-do-pedido')).toHaveLength(1)
    sujarAcoesDeA()

    await act(async () => {
      fake.perderSessao()
      await vi.advanceTimersByTimeAsync(50)
    })
    pendurarTudo()
    await entrarComo(A)
    expect(lerErro(ID)).toBeNull()
    expect(travar(ID)).toBe(true)
  })

  it('a volta da aba com o MESMO usuário NÃO esquece a trava nem o erro (a ação em voo continua dona dela)', async () => {
    responderContaA()
    await montarApp('/pedidos?visao=tudo')
    await andar(50)
    expect(await screen.findAllByTestId('linha-do-pedido')).toHaveLength(1)
    sujarAcoesDeA()
    await act(async () => {
      fake.voltarAba()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(lerErro(ID)?.frase).toBe('Não consegui salvar. Tente de novo.')
    expect(travar(ID)).toBe(false)
  })
})
