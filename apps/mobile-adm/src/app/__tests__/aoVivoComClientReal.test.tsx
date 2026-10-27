// Feature `83` · T11 — `LAV-60`: a Loja ao vivo (e o cartão "Visitas hoje" da Início) sobre o
// supabase-js REAL (`src/test/clientReal.ts`). O `PostgrestClient` de verdade transforma o 403 do
// PostgREST em `{ error: { code: '42501' } }` — a recusa —, e o 500 e a rede caída em erros SEM esse
// código — a falha do bloco, nunca "Esta conta não tem acesso".
//
// "Nenhum número em instante nenhum" é lido de duas formas: a cada passo do relógio e num
// `MutationObserver` que confere TODA mutação do DOM depois de o 403 ser ENTREGUE. Sem o observador, um
// número pintado e apagado dentro de um passo passaria (molde de `acoesComClientReal`).
//
// "Entregue" é o INSTANTE (relógio falso) em que o `fetch` falso devolve a resposta; a régua vale de
// qualquer instante POSTERIOR em diante. No mesmo instante a cadeia da resposta (o parse do PostgREST,
// o React Query) ainda corre em microtarefas, e o número de antes, ainda na tela, não é recusa
// desenhada — medido: conferir no próprio instante da entrega acusava o dado do cache de ANTES de a
// resposta chegar. Qualquer mutação um instante depois (o "há N s" que pulsa a cada 1 s, por exemplo)
// já é depois da recusa, e é conferida.
process.env.TZ = 'UTC'

import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { real, type Cenario, type RespostaRpcReal } from '@/test/clientReal'
import { movimentoComAcessos } from '@/test/movimento'
import { resumo } from '@/test/resumo'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA } from '@/shared/ui/leitura'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const RPC_MOVIMENTO = '/rest/v1/rpc/store_movement'
const ROLES = '/rest/v1/user_roles'

const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
const ERRO_500: RespostaRpcReal = { status: 500, corpo: { code: 'XX000', details: null, hint: null, message: 'internal error' } }
const OK: RespostaRpcReal = { status: 200, corpo: movimentoComAcessos() }

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

/** Um número da seção, do cartão ou a linha de frescor: o que NÃO pode aparecer na recusa. */
const algumNumero = (): string | null => {
  const grupo = document.querySelector('[role="group"][aria-label^="Visitas,"], [role="group"][aria-label^="Vendas,"], [role="group"][aria-label^="Conversão,"]')
  if (grupo) return `grupo ${grupo.getAttribute('aria-label')}`
  const cartao = document.querySelector('[data-testid="cartao-visitas-hoje"]')
  if (cartao && /\d/.test(cartao.textContent ?? '')) return `cartão ${cartao.textContent}`
  if (/Atualizado/.test(document.body.textContent ?? '')) return 'frescor'
  return null
}

/**
 * Monta o app em `rota` e vigia o DOM: depois que `store_movement` ENTREGA uma resposta recusada,
 * toda mutação é conferida. `recusarNa` é a chamada (1ª, 2ª…) que recusa; as anteriores dão 200.
 */
const montarVigiando = (rota: string, recusarNa: number, { perderPapel = true, ...extra }: Partial<Cenario> & { perderPapel?: boolean } = {}) => {
  let n = 0
  let entregueEm: number | null = null
  const depoisDaEntrega = () => entregueEm !== null && Date.now() > entregueEm
  const violacoes: string[] = []
  const rpc = new Proxy({ store_overview: { status: 200, corpo: resumo() } } as Record<string, RespostaRpcReal>, {
    get(alvo, chave) {
      if (chave !== 'store_movement') return alvo[chave as string]
      n += 1
      if (n >= recusarNa) {
        entregueEm ??= Date.now()
        // a conta perdeu o papel: a reconferência diz "sem papel" (ou, com `perderPapel: false`, a
        // recusa é da FUNÇÃO e o papel segue admin — a página não desmonta, e o cache está ali)
        if (perderPapel) r.estado.papel = 'not-admin'
        return RECUSA_403
      }
      return OK
    },
  })
  const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', rpc, ...extra })
  const observador = new MutationObserver(() => {
    if (!depoisDaEntrega()) return
    const v = algumNumero()
    if (v) violacoes.push(v)
  })
  observador.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true })
  window.history.pushState({}, '', rota)
  render(<App />)
  return { r, violacoes, observador, foiEntregue: () => entregueEm !== null, depoisDaEntrega }
}

/** Anda `ms` em passos de 50, conferindo a cada passo (depois do instante da entrega) que nenhum número existe. */
const andarConferindo = async (ms: number, depoisDaEntrega: () => boolean, violacoes: string[]) => {
  for (let feito = 0; feito < ms; feito += 50) {
    await andar(50)
    if (depoisDaEntrega()) {
      const v = algumNumero()
      if (v) violacoes.push(`passo: ${v}`)
    }
  }
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

describe('a recusa (`42501`) sobre o client real', () => {
  it('par: 200 e a Loja ao vivo desenha os números (a régua de "nenhum número" enxerga o número)', async () => {
    const { r, observador } = montarVigiando('/ao-vivo', Infinity)
    await andarConferindo(1000, () => false, [])
    observador.disconnect()
    expect(algumNumero()).toBe('grupo Visitas, hoje, 41')
    expect(r.quantos(RPC_MOVIMENTO)).toBe(1)
  })

  it('403 na PRIMEIRA leitura de `/ao-vivo` ⇒ o Login com a frase da `72`, e nenhum número em instante nenhum', async () => {
    const { r, violacoes, observador, foiEntregue, depoisDaEntrega } = montarVigiando('/ao-vivo', 1)
    await andarConferindo(4000, depoisDaEntrega, violacoes)
    observador.disconnect()
    expect(foiEntregue()).toBe(true)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(violacoes).toEqual([])
    expect(r.quantos(RPC_MOVIMENTO)).toBe(1)
  })

  it('403 na primeira leitura da Início ⇒ o cartão "Visitas hoje" nunca mostra número, e o Login', async () => {
    const { violacoes, observador, depoisDaEntrega } = montarVigiando('/', 1)
    await andarConferindo(4000, depoisDaEntrega, violacoes)
    observador.disconnect()
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(violacoes).toEqual([])
  })

  it('200 e depois 403 na releitura de 15 s (a conta perde o papel com a tela aberta) ⇒ nenhum número nem "Atualizado há" depois — nem o do cache', async () => {
    const { r, violacoes, observador, foiEntregue, depoisDaEntrega } = montarVigiando('/ao-vivo', 2)
    await andarConferindo(1000, depoisDaEntrega, violacoes)
    expect(algumNumero()).toBe('grupo Visitas, hoje, 41')
    expect(screen.getByTestId('frescor-ao-vivo').textContent).toMatch(/^Atualizado/)
    await andarConferindo(20_000, depoisDaEntrega, violacoes)
    observador.disconnect()
    expect(foiEntregue()).toBe(true)
    expect(r.quantos(RPC_MOVIMENTO)).toBe(2)
    expect(violacoes).toEqual([])
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
  })
})

describe('a recusa com o papel AINDA admin: a página fica montada, e o cache também', () => {
  it('200 e depois 403 na releitura de 15 s ⇒ nenhum número, nem o do cache, em instante nenhum depois; o ciclo para', async () => {
    const { r, violacoes, observador, foiEntregue, depoisDaEntrega } = montarVigiando('/ao-vivo', 2, { perderPapel: false })
    await andarConferindo(1000, depoisDaEntrega, violacoes)
    expect(algumNumero()).toBe('grupo Visitas, hoje, 41')
    await andarConferindo(20_000, depoisDaEntrega, violacoes)
    const depoisDaRecusa = r.quantos(RPC_MOVIMENTO)
    await andarConferindo(60_000, depoisDaEntrega, violacoes)
    observador.disconnect()
    expect(foiEntregue()).toBe(true)
    expect(violacoes).toEqual([])
    expect(window.location.pathname).toBe('/ao-vivo')
    expect(within(screen.getByRole('region', { name: 'Acessos' })).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    // Na recusa não há dado (`LAV-60`), e sem dado o cabeçalho não tem linha de frescor nenhuma (`LAV-07`):
    // nem "Atualizado há", nem "Não consegui atualizar agora." — não há o que atualizar.
    expect(screen.queryByTestId('frescor-ao-vivo')).toBeNull()
    // a reconferência foi UMA (a abertura e ela), e o intervalo parou na recusa
    expect(r.quantos(ROLES)).toBe(2)
    expect(r.quantos(RPC_MOVIMENTO)).toBe(depoisDaRecusa)
  })
})

describe('falha não é recusa (LAV-60)', () => {
  const abrirCom = async (rota: string, movimento: RespostaRpcReal) => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { store_movement: movimento, store_overview: { status: 200, corpo: resumo() } },
    })
    window.history.pushState({}, '', rota)
    render(<App />)
    for (let feito = 0; feito < 4000; feito += 50) await andar(50)
    return r
  }

  it.each([
    ['500', ERRO_500],
    ['rede caída', 'rede' as const],
  ])('%s em `/ao-vivo` ⇒ "Não consegui carregar.", NUNCA a recusa, e o papel não é reconferido', async (_nome, resposta) => {
    const r = await abrirCom('/ao-vivo', resposta)
    expect(window.location.pathname).toBe('/ao-vivo')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(within(screen.getByRole('region', { name: 'Acessos' })).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(r.quantos(ROLES)).toBe(1)
  })

  it.each([
    ['500', ERRO_500],
    ['rede caída', 'rede' as const],
  ])('%s na Início ⇒ o cartão diz "Não consegui carregar.", NUNCA a recusa', async (_nome, resposta) => {
    const r = await abrirCom('/', resposta)
    expect(window.location.pathname).toBe('/')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByTestId('cartao-visitas-hoje')).toHaveTextContent(FALHA_DE_LEITURA)
    expect(r.quantos(ROLES)).toBe(1)
  })
})
