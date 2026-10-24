import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * O supabase-js DE VERDADE (2.110.7), com a rede e o armazenamento trocados (feature 72, conserto r2
 * da verificação da Fase 6, `L-055`).
 *
 * Por que existe ao lado de `fakeSupabase.ts`: o dublê provava uma ordem de eventos que o client real
 * não produz. Ele não emitia `INITIAL_SESSION` (que o client emite com sessão `null` quando a leitura
 * da sessão FALHA, igual a quando ela não existe) nem o `SIGNED_IN` que o client emite a cada volta da
 * aba. As duas lacunas da r2 só apareceram sobre o client real. Aqui o que roda é o `GoTrueClient` e o
 * `PostgrestClient` reais: só o `fetch` e o `storage` são nossos.
 *
 * A loja tem a CÓPIA DELIBERADA deste arquivo (`apps/store/src/test/clientReal.ts`), e
 * `src/test/__tests__/clientRealPareado.test.ts` (fecho da r3) exige que, fora deste comentário, o
 * código das duas seja idêntico. Mudou aqui, mude lá no mesmo movimento.
 *
 * Determinístico: tudo que espera, espera por `setTimeout` (o atraso da resposta, o recuo das
 * retentativas do client) — o teste roda com relógio falso e anda o tempo à mão. Nenhum pacote sai.
 *
 * Uso (o `Proxy` deixa cada teste criar um client novo, com o estado interno zerado):
 *   vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))
 *   beforeEach(() => { vi.useFakeTimers(); real.criar({ ... }) })
 */

export type Resposta = 'ok' | 'falha' | 'pendura'

export interface Cenario {
  /** A sessão salva no storage: ausente, válida, ou com o token vencido (o `getSession` renova). */
  sessao: 'ausente' | 'valida' | 'vencida'
  /** A consulta do papel: admin, sem papel, falha de rede, ou nunca responde. */
  papel: 'admin' | 'not-admin' | 'falha' | 'pendura'
  /** A leitura do cadastro (`customers`). */
  cadastro: Resposta
  /** Quanto a resposta do papel e do cadastro demora (ms). */
  atrasoMs?: number
  /**
   * Como cada RPC responde (`/rest/v1/rpc/<nome>`), feature `73`: um status HTTP com corpo (o 403
   * `42501` do Postgres, um 500), `rede` (o `fetch` rejeita) ou `pendura`. RPC sem entrada responde
   * `null` com 200 — o mesmo `{ data: null }` do dublê, que a tela lê como "ainda sem dado".
   */
  rpc?: Record<string, RespostaRpcReal>
  /**
   * Como cada tabela ou view responde (`/rest/v1/<nome>`), feature `74`: a mesma forma de `rpc`.
   * Tabela sem entrada responde `[]` com 200, como antes. `user_roles` e `customers` NÃO passam por
   * aqui: são o papel e o cadastro, e têm campo próprio.
   */
  tabelas?: Record<string, RespostaRpcReal>
}

export type RespostaRpcReal = { status: number; corpo: unknown } | 'rede' | 'pendura'

export const USUARIO = {
  id: 'u-adri',
  email: 'adri@exemplo.invalid',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}

const CHAVE = 'estrelinha-teste-sessao'
const FALHA = () => new TypeError('Failed to fetch')

const sessaoDe = (user: typeof USUARIO, vencida: boolean) => {
  const agora = Math.floor(Date.now() / 1000)
  return {
    access_token: `token-${user.id}`,
    refresh_token: `refresh-${user.id}`,
    expires_at: vencida ? agora - 3600 : agora + 3600,
    expires_in: 3600,
    token_type: 'bearer',
    user,
  }
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const criarReal = (cenario: Cenario) => {
  const mem: Record<string, string> = {}
  if (cenario.sessao !== 'ausente') mem[CHAVE] = JSON.stringify(sessaoDe(USUARIO, cenario.sessao === 'vencida'))
  const storage = {
    getItem: (k: string) => mem[k] ?? null,
    setItem: (k: string, v: string) => {
      mem[k] = v
    },
    removeItem: (k: string) => {
      delete mem[k]
    },
  }
  /** O cenário é mutável no meio do teste (a rede volta, o papel passa a responder). */
  const estado = { ...cenario }
  /** Cada pedido que saiu, pelo caminho (`/rest/v1/user_roles`, `/auth/v1/token`…). */
  const pedidos: string[] = []
  const eventos: string[] = []

  const fetchFalso = async (entrada: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(entrada))
    pedidos.push(url.pathname)
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'refresh_token') throw FALHA()
      const { email } = JSON.parse(String(init?.body ?? '{}')) as { email: string }
      const user = { ...USUARIO, id: `id-${email}`, email }
      return json(sessaoDe(user, false))
    }
    if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 })
    if (url.pathname === '/rest/v1/user_roles') {
      if (estado.atrasoMs) await esperar(estado.atrasoMs)
      if (estado.papel === 'falha') throw FALHA()
      if (estado.papel === 'pendura') await new Promise<never>(() => {})
      return json(estado.papel === 'admin' ? [{ role: 'admin' }] : [])
    }
    if (url.pathname === '/rest/v1/customers') {
      if (estado.atrasoMs) await esperar(estado.atrasoMs)
      if (estado.cadastro === 'falha') throw FALHA()
      if (estado.cadastro === 'pendura') await new Promise<never>(() => {})
      const uid = (url.searchParams.get('user_id') ?? '').replace(/^eq\./, '')
      return json([{ id: 'c-adri', user_id: uid, name: 'Adri Muniz', email: USUARIO.email, phone: '51999990000' }])
    }
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const r = estado.rpc?.[url.pathname.slice('/rest/v1/rpc/'.length)]
      if (r === 'rede') throw FALHA()
      if (r === 'pendura') await new Promise<never>(() => {})
      return typeof r === 'object' ? json(r.corpo, r.status) : json(null)
    }
    const t = estado.tabelas?.[url.pathname.slice('/rest/v1/'.length)]
    if (t === 'rede') throw FALHA()
    if (t === 'pendura') await new Promise<never>(() => {})
    if (typeof t === 'object') return json(t.corpo, t.status)
    return json([])
  }

  const client = createClient('http://127.0.0.1:54441', 'chave-de-teste', {
    auth: { storage, storageKey: CHAVE, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchFalso as typeof fetch },
  })
  client.auth.onAuthStateChange((evento, sessao) => {
    eventos.push(`${evento}:${sessao ? 'com' : 'null'}`)
  })

  return {
    client,
    estado,
    pedidos,
    /** Os eventos que o client emitiu, na ordem (`INITIAL_SESSION:null`, `SIGNED_IN:com`…). */
    eventos,
    /** A sessão continua salva? (o supabase-js NÃO a apaga numa falha de rede retentável). */
    sessaoSalva: () => CHAVE in mem,
    quantos: (caminho: string) => pedidos.filter((p) => p === caminho).length,
    /** A aba (ou o app instalado) volta a ficar visível: o client relê a sessão e emite `SIGNED_IN`. */
    voltarAba: () => {
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
    },
  }
}

export type Real = ReturnType<typeof criarReal>

export const real = {
  atual: null as Real | null,
  criar(cenario: Cenario): Real {
    real.atual = criarReal(cenario)
    return real.atual
  },
}

/** O `supabase` que o provider importa: repassa ao client do teste corrente. */
export const supabaseProxy = new Proxy({} as SupabaseClient, {
  get: (_alvo, chave) => {
    if (!real.atual) throw new Error('clientReal: chame real.criar() antes de montar o provider')
    const valor = (real.atual.client as unknown as Record<string | symbol, unknown>)[chave]
    return typeof valor === 'function' ? (valor as (...a: unknown[]) => unknown).bind(real.atual.client) : valor
  },
})
