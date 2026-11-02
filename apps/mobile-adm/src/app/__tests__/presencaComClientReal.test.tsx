// O cartão "Agora na loja" da Início sobre o supabase-js REAL (`src/test/clientReal.ts`): o 403 do
// PostgREST com `42501` em `store_live` é a recusa (o Login, e nenhum número da presença em instante
// nenhum depois da entrega — lido a cada passo e num `MutationObserver`); o 500 e a rede caída são a
// falha do cartão, nunca "Esta conta não tem acesso".
process.env.TZ = 'UTC'

import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { real, type RespostaRpcReal } from '@/test/clientReal'
import { movimentoComAcessos } from '@/test/movimento'
import { presenca } from '@/test/presenca'
import { resumo } from '@/test/resumo'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA } from '@/shared/ui/leitura'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const RPC_PRESENCA = '/rest/v1/rpc/store_live'
const ROLES = '/rest/v1/user_roles'
const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
const ERRO_500: RespostaRpcReal = { status: 500, corpo: { code: 'XX000', details: null, hint: null, message: 'internal error' } }

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

/** Um número da presença no cartão: o que NÃO pode aparecer na recusa. */
const numeroDaPresenca = (): string | null => {
  const cartao = document.querySelector('[data-testid="cartao-agora-na-loja"]')
  if (cartao && /\d|pessoa/.test(cartao.textContent ?? '')) return `cartão ${cartao.textContent}`
  return null
}

const montar = (rpcPresenca: () => RespostaRpcReal) => {
  let entregueEm: number | null = null
  const violacoes: string[] = []
  const rpc = new Proxy(
    { store_overview: { status: 200, corpo: resumo() }, store_movement: { status: 200, corpo: movimentoComAcessos() } } as Record<
      string,
      RespostaRpcReal
    >,
    {
      get(alvo, chave) {
        if (chave !== 'store_live') return alvo[chave as string]
        const resposta = rpcPresenca()
        if (resposta === RECUSA_403) {
          entregueEm ??= Date.now()
          r.estado.papel = 'not-admin'
        }
        return resposta
      },
    },
  )
  const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', rpc })
  const depois = () => entregueEm !== null && Date.now() > entregueEm
  const observador = new MutationObserver(() => {
    if (!depois()) return
    const v = numeroDaPresenca()
    if (v) violacoes.push(v)
  })
  observador.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true })
  window.history.pushState({}, '', '/')
  render(<App />)
  const andarConferindo = async (ms: number) => {
    for (let feito = 0; feito < ms; feito += 50) {
      await andar(50)
      if (depois()) {
        const v = numeroDaPresenca()
        if (v) violacoes.push(`passo: ${v}`)
      }
    }
  }
  return { r, violacoes, observador, andarConferindo, foiEntregue: () => entregueEm !== null }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  real.atual?.client.auth.stopAutoRefresh()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('a presença sobre o client real', () => {
  it('par: 200 e o cartão desenha o total (a régua enxerga o número)', async () => {
    const { r, observador, andarConferindo } = montar(() => ({ status: 200, corpo: presenca() }))
    await andarConferindo(1000)
    observador.disconnect()
    expect(numeroDaPresenca()).toMatch(/^cartão Agora na loja7pessoas/)
    expect(r.quantos(RPC_PRESENCA)).toBe(1)
  })

  it('403 `42501` ⇒ o Login com a recusa, e nenhum número da presença em instante nenhum', async () => {
    const { r, violacoes, observador, andarConferindo, foiEntregue } = montar(() => RECUSA_403)
    await andarConferindo(4000)
    observador.disconnect()
    expect(foiEntregue()).toBe(true)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(violacoes).toEqual([])
    expect(r.quantos(RPC_PRESENCA)).toBe(1)
  })

  it('200 e depois 403 na releitura de 30 s ⇒ nenhum número depois da entrega, e o Login', async () => {
    let n = 0
    const { violacoes, observador, andarConferindo, foiEntregue } = montar(() =>
      ++n === 1 ? { status: 200, corpo: presenca() } : RECUSA_403,
    )
    await andarConferindo(1000)
    expect(numeroDaPresenca()).not.toBeNull()
    await andarConferindo(35_000)
    observador.disconnect()
    expect(foiEntregue()).toBe(true)
    expect(violacoes).toEqual([])
    expect(window.location.pathname).toBe('/login')
  })

  it.each([
    ['500', ERRO_500],
    ['rede caída', 'rede' as const],
  ])('%s ⇒ o cartão diz "Não consegui carregar.", NUNCA a recusa, e o papel não é reconferido', async (_nome, resposta) => {
    const { r, observador, andarConferindo } = montar(() => resposta)
    await andarConferindo(4000)
    observador.disconnect()
    expect(window.location.pathname).toBe('/')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByTestId('cartao-agora-na-loja')).toHaveTextContent(FALHA_DE_LEITURA)
    expect(r.quantos(ROLES)).toBe(1)
  })
})
