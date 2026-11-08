// A porta dos pedidos montados sobre o `<App />` real e o supabase-js REAL
// (`src/test/clientReal.ts`): só o `fetch` e o storage são nossos. O que se prova é a TRADUÇÃO DE ERRO
// sobre a forma que o client real entrega (`FunctionsHttpError` com o `Response` em `context`, e
// `FunctionsFetchError` quando a rede cai), em cada ação da porta.
//
// O caso que a porta existe para impedir (`L-047`, `BL-048`): o 403 de `requireAdmin` sai TAMBÉM quando
// `has_role` falha no servidor. Lido como "não é admin", ele traria de volta a recusa falsa da `72`. A
// porta pergunta à MESMA RPC da leitura (`atelie_clock`): `42501` ⇒ recusa; de pé ⇒ falha.
//
// "Em nenhum instante": o DOM é lido a cada passo de 50 ms do relógio falso.
process.env.TZ = 'UTC'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { real, type Real, type RespostaRpcReal } from '@/test/clientReal'
import { AGORA, ID_ABERTO, leituraDoMontado, montadoNaLista } from '@/test/montados'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const FUNCTION = '/functions/v1/order-proposals'
const RELOGIO = '/rest/v1/rpc/atelie_clock'
const PAPEIS = '/rest/v1/user_roles'
const CLIENTE = 'Marina Duarte'
const FALHOU = 'Não consegui fazer isso agora. Tente de novo.'
const ENVIO_NAO_REGISTRADO = 'O link saiu, mas não consegui registrar o envio no histórico.'
/** A frase que cada ação mostra quando falha (o envio já saiu: o que falhou foi o registro). */
const FALHA_DE: Record<string, string> = { cancel: FALHOU, renew: FALHOU, note: FALHOU, 'log-sent': ENVIO_NAO_REGISTRADO }

const RELOGIO_OK: RespostaRpcReal = { status: 200, corpo: { lido_em: AGORA } }
const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
/** O 403 de `requireAdmin`: a mesma resposta com o papel caído E com `has_role` falhando. */
const FORBIDDEN: RespostaRpcReal = { status: 403, corpo: { error: 'forbidden' } }
const ok = (corpo: unknown): RespostaRpcReal => ({ status: 200, corpo })

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const corpo = () => document.body.textContent ?? ''

type Acao = 'list' | 'get' | 'renew' | 'cancel' | 'log-sent' | 'note'
const cenario = (acoes: Partial<Record<Acao, RespostaRpcReal>>) =>
  real.criar({
    sessao: 'valida',
    papel: 'admin',
    cadastro: 'ok',
    rpc: { atelie_clock: RELOGIO_OK },
    functions: { 'order-proposals': { porAcao: acoes as Record<string, RespostaRpcReal> } },
  })

const daAcao = (r: Real, acao: Acao) =>
  r.chamadasDe('POST', FUNCTION).filter((c) => new URLSearchParams(c.busca).get('action') === acao)

/** A conta PERDE o papel agora: a próxima conferência é 403 `42501` e a próxima consulta do papel, vazia. */
const perderOPapel = (r: Real) => {
  r.estado.papel = 'not-admin'
  r.estado.rpc = { ...r.estado.rpc, atelie_clock: RECUSA_403 }
}

const abrir = async (caminho: string, esperar: () => boolean) => {
  window.history.pushState({}, '', caminho)
  render(<App />)
  for (let i = 0; i < 80 && !esperar(); i++) await andar(50)
  expect(esperar()).toBe(true)
}

/** Lê o `body` a cada 50 ms do relógio falso, por `ms`, a partir de agora. */
const observar = async (ms: number) => {
  const instantes = [corpo()]
  for (let feito = 0; feito < ms; feito += 50) {
    await andar(50)
    instantes.push(corpo())
  }
  return instantes
}

const tocar = async (el: Element) => {
  await act(async () => {
    fireEvent.click(el)
  })
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

describe('a leitura dos montados sobre o client real', () => {
  it('par: `list` em 200 ⇒ os cartões, com o corpo exato', async () => {
    const r = cenario({ list: ok({ proposals: [montadoNaLista()], agora: AGORA }) })
    await abrir('/pedidos?visao=montados', () => corpo().includes(CLIENTE))
    expect(daAcao(r, 'list').map((c) => c.corpo)).toEqual([{}])
    expect(screen.getAllByTestId('cartao-do-montado')).toHaveLength(1)
  })

  it('`list` em 403 + `atelie_clock` 403 `42501` ⇒ a recusa da `72`, e nenhum dado da cliente em instante nenhum', async () => {
    const r = cenario({ list: FORBIDDEN })
    r.estado.rpc = { ...r.estado.rpc, atelie_clock: RECUSA_403 }
    window.history.pushState({}, '', '/pedidos?visao=montados')
    render(<App />)
    r.estado.papel = 'not-admin'
    const instantes = await observar(6000)
    expect(instantes.findIndex((t) => t.includes(CLIENTE))).toBe(-1)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
  })

  it('`get` em 403 + recusa ⇒ a recusa, e nenhum dado do pedido montado em instante nenhum', async () => {
    const r = cenario({ get: FORBIDDEN })
    r.estado.rpc = { ...r.estado.rpc, atelie_clock: RECUSA_403 }
    window.history.pushState({}, '', `/pedidos/montados/${ID_ABERTO}`)
    render(<App />)
    r.estado.papel = 'not-admin'
    const instantes = await observar(6000)
    expect(instantes.findIndex((t) => t.includes(CLIENTE))).toBe(-1)
    expect(window.location.pathname).toBe('/login')
  })

  it('`list` SEM REDE ⇒ a falha do bloco, nunca a recusa, e o relógio não é perguntado pela porta', async () => {
    const r = cenario({ list: 'rede' })
    await abrir('/pedidos?visao=montados', () => corpo().includes('Não consegui carregar.'))
    const instantes = await observar(1000)
    expect(instantes.findIndex((t) => t.includes(SEM_ACESSO))).toBe(-1)
    expect(window.location.pathname).toBe('/pedidos')
    expect(r.quantos(RELOGIO)).toBe(0)
  })
})

describe('as escritas do pedido montado sobre o client real', () => {
  const abrirMontado = async (r: Real) => {
    void r
    await abrir(`/pedidos/montados/${ID_ABERTO}`, () => corpo().includes(CLIENTE))
  }

  /** O botão de cada ação, a partir do pedido montado aberto (e, na folha, a confirmação). */
  const disparar: Record<Exclude<Acao, 'list' | 'get'>, () => Promise<void>> = {
    cancel: async () => {
      await tocar(screen.getByRole('button', { name: 'Cancelar este pedido' }))
      await andar(50)
      await tocar(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar pedido' }))
    },
    renew: async () => {
      await tocar(screen.getByRole('button', { name: 'Gerar link novo' }))
    },
    'log-sent': async () => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true })
      await tocar(screen.getByRole('button', { name: 'Copiar link' }))
    },
    note: async () => {
      await tocar(screen.getByTestId('editar-observacao-do-montado'))
      await andar(50)
      const folha = screen.getByRole('dialog')
      fireEvent.change(within(folha).getByRole('textbox'), { target: { value: 'Embrulhar para presente' } })
      await tocar(within(folha).getByRole('button', { name: 'Salvar' }))
    },
  }
  /** O `get` de cada caso: a aberta (com link), e a sem token para o "Gerar link novo". */
  const leituraPara = (acao: string) => (acao === 'renew' ? leituraDoMontado({ token: null, actions: { renew: true, renewLabel: 'Gerar link novo' } }) : leituraDoMontado())

  it.each(['cancel', 'renew', 'log-sent', 'note'] as const)(
    '`%s` em 403 + `atelie_clock` 403 `42501` ⇒ a recusa da `72`, a falha em instante nenhum, e o pedido montado some',
    async (acao) => {
      const r = cenario({ get: ok(leituraPara(acao)), [acao]: FORBIDDEN })
      await abrirMontado(r)
      perderOPapel(r)
      await disparar[acao]()
      const instantes = await observar(5000)
      expect(daAcao(r, acao)).toHaveLength(1)
      expect(instantes.findIndex((t) => t.includes(FALHA_DE[acao]))).toBe(-1)
      expect(window.location.pathname).toBe('/login')
      expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
      expect(corpo()).not.toContain(CLIENTE)
    },
  )

  it.each(['cancel', 'renew', 'log-sent', 'note'] as const)('`%s` em 403 com o relógio DE PÉ ⇒ a falha, NUNCA a recusa', async (acao) => {
    const r = cenario({ get: ok(leituraPara(acao)), [acao]: FORBIDDEN })
    await abrirMontado(r)
    const papeisAntes = r.quantos(PAPEIS)
    await disparar[acao]()
    const instantes = await observar(2000)
    expect(daAcao(r, acao)).toHaveLength(1)
    expect(instantes.findIndex((t) => t.includes(SEM_ACESSO))).toBe(-1)
    expect(window.location.pathname).toBe(`/pedidos/montados/${ID_ABERTO}`)
    expect(corpo()).toContain(FALHA_DE[acao])
    expect(r.quantos(PAPEIS)).toBe(papeisAntes)
  })

  it.each(['cancel', 'renew', 'log-sent', 'note'] as const)('`%s` SEM REDE ⇒ a falha, nunca a recusa, e o relógio não é perguntado pela porta', async (acao) => {
    const r = cenario({ get: ok(leituraPara(acao)), [acao]: 'rede' })
    await abrirMontado(r)
    const relogioAntes = r.quantos(RELOGIO)
    await disparar[acao]()
    const instantes = await observar(2000)
    expect(instantes.findIndex((t) => t.includes(SEM_ACESSO))).toBe(-1)
    expect(window.location.pathname).toBe(`/pedidos/montados/${ID_ABERTO}`)
    expect(corpo()).toContain(FALHA_DE[acao])
    // Depois da falha a tela RELÊ o pedido (`lerComPapel` pergunta o relógio uma vez); a porta, nenhuma.
    expect(r.quantos(RELOGIO) - relogioAntes).toBeLessThanOrEqual(1)
  })
})
