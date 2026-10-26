// Feature `79` · T25 · `MAN-16`, `MAN-23`, `L-047`, `L-055` — a tela "Avisos neste celular" sobre o
// `<App />` real e o supabase-js REAL (`src/test/clientReal.ts`): só o `fetch` e o storage são nossos.
// A porta (`portaDeAvisos.ts`), o `FunctionsClient` e o `PostgrestClient` são os de verdade, então o que
// se prova aqui é a TRADUÇÃO DE ERRO sobre a forma que o client real entrega: o `FunctionsHttpError`
// com o `Response` em `context`, e o `FunctionsFetchError` quando a rede cai.
//
// O caso que a porta existe para impedir (`L-047`, `BL-048`): o 403 de `requireAdmin` sai TAMBÉM quando
// `has_role` falha no servidor. Lido como "não é admin", ele traria de volta a recusa falsa que a `72`
// fechou. A porta pergunta à MESMA RPC da leitura (`atelie_clock`): `42501` ⇒ recusa; de pé ⇒ falha.
//
// O navegador é o arnês de `@/test/push` (o jsdom não tem `PushManager`). As frases são escritas por
// extenso. "Em nenhum instante": o DOM é lido a cada passo de 50 ms do relógio falso.
process.env.TZ = 'UTC'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { real, type Real, type RespostaRpcReal } from '@/test/clientReal'
import { CHAVES_FALSAS, push } from '@/test/push'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const FUNCTION = '/functions/v1/atelie-avisos'
const RELOGIO = '/rest/v1/rpc/atelie_clock'
const PAPEIS = '/rest/v1/user_roles'
const EXISTENTE = 'https://fcm.googleapis.com/fcm/send/p79-existente'
const CHAVE_PUBLICA = 'B' + 'x'.repeat(86)
const OS_QUATRO = ['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming']

const NAO_ATIVOU = 'Não consegui ativar os avisos. Tente de novo.'
const NAO_CONFERIU = 'Não consegui conferir os avisos deste celular. Tente de novo.'

const RELOGIO_OK: RespostaRpcReal = { status: 200, corpo: { lido_em: '2026-10-25T14:30:00.123456+00:00' } }
const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
/** O 403 de `requireAdmin` na function: a mesma resposta com o papel caído E com `has_role` falhando. */
const FORBIDDEN: RespostaRpcReal = { status: 403, corpo: { error: 'forbidden' } }

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const corpo = () => document.body.textContent ?? ''
const botao = (nome: string) => screen.queryByRole('button', { name: nome })

type Acoes = Partial<Record<'config' | 'status' | 'subscribe' | 'events' | 'unsubscribe' | 'test', RespostaRpcReal>>

const cenario = (acoes: Acoes) =>
  real.criar({
    sessao: 'valida',
    papel: 'admin',
    cadastro: 'ok',
    rpc: { atelie_clock: RELOGIO_OK },
    functions: { 'atelie-avisos': { porAcao: acoes as Record<string, RespostaRpcReal> } },
  })

/** As chamadas à function de uma ação (`?action=<ação>`), com o corpo já lido como JSON. */
const daAcao = (r: Real, acao: string) =>
  r.chamadasDe('POST', FUNCTION).filter((c) => new URLSearchParams(c.busca).get('action') === acao)

/** A conta PERDE o papel agora: a próxima conferência é 403 `42501` e a próxima consulta do papel, vazia. */
const perderOPapel = (r: Real) => {
  r.estado.papel = 'not-admin'
  r.estado.rpc = { ...r.estado.rpc, atelie_clock: RECUSA_403 }
}

const abrir = async (esperar: () => boolean) => {
  window.history.pushState({}, '', '/avisos')
  render(<App />)
  for (let i = 0; i < 80 && !esperar(); i++) await andar(50)
  expect(esperar()).toBe(true)
}

/** Toca e lê o `body` a cada 50 ms do relógio falso, por `ms`. */
const tocarEObservar = async (el: Element, ms: number) => {
  await act(async () => {
    fireEvent.click(el)
  })
  const instantes = [corpo()]
  for (let feito = 0; feito < ms; feito += 50) {
    await andar(50)
    instantes.push(corpo())
  }
  return instantes
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

describe('"Avisar neste celular" sobre o client real', () => {
  it('par: config e subscribe em 200 ⇒ os quatro interruptores, e o corpo de cada `invoke` exato (L-039)', async () => {
    push.instalar()
    const r = cenario({
      config: { status: 200, corpo: { applicationServerKey: CHAVE_PUBLICA } },
      subscribe: { status: 200, corpo: { events: OS_QUATRO } },
    })
    await abrir(() => !!botao('Avisar neste celular'))
    await tocarEObservar(botao('Avisar neste celular')!, 1000)
    expect(screen.getAllByRole('switch')).toHaveLength(4)
    expect(daAcao(r, 'config').map((c) => c.corpo)).toEqual([{}])
    const [inscricao] = daAcao(r, 'subscribe')
    expect(inscricao.corpo).toEqual({
      endpoint: 'https://fcm.googleapis.com/fcm/send/p79-1',
      keys: { p256dh: CHAVES_FALSAS.p256dh, auth: CHAVES_FALSAS.auth },
    })
    // A chave pública do servidor foi a que o navegador recebeu.
    expect(push.chamadas.subscribe).toEqual([{ userVisibleOnly: true, applicationServerKey: CHAVE_PUBLICA }])
    // Nenhum erro: o relógio não foi perguntado.
    expect(r.quantos(RELOGIO)).toBe(0)
  })

  it('a function em 403 + `atelie_clock` 403 `42501` ⇒ a recusa da `72`, e a frase de MAN-16 em instante nenhum', async () => {
    push.instalar()
    const r = cenario({ config: FORBIDDEN })
    await abrir(() => !!botao('Avisar neste celular'))
    perderOPapel(r)
    const instantes = await tocarEObservar(botao('Avisar neste celular')!, 4000)
    expect(daAcao(r, 'config')).toHaveLength(1)
    expect(r.quantos(RELOGIO)).toBe(1)
    expect(instantes.length).toBeGreaterThan(80)
    expect(instantes.findIndex((t) => t.includes(NAO_ATIVOU))).toBe(-1)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    // Nada inscrito: o `subscribe` do navegador nem saiu.
    expect(push.chamadas.subscribe).toHaveLength(0)
    expect(daAcao(r, 'subscribe')).toHaveLength(0)
  })

  it('a function em 403 com o relógio DE PÉ (has_role falhou no servidor) ⇒ MAN-16, NUNCA a recusa', async () => {
    push.instalar()
    const r = cenario({ config: FORBIDDEN })
    await abrir(() => !!botao('Avisar neste celular'))
    const papeisAntes = r.quantos(PAPEIS)
    const instantes = await tocarEObservar(botao('Avisar neste celular')!, 3000)
    expect(daAcao(r, 'config')).toHaveLength(1)
    // A porta PERGUNTOU (o 403 virou pergunta) e a resposta foi "papel de pé".
    expect(r.quantos(RELOGIO)).toBe(1)
    expect(screen.getByText(NAO_ATIVOU)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/avisos')
    expect(instantes.findIndex((t) => t.includes(SEM_ACESSO))).toBe(-1)
    // A vigia da recusa não abriu episódio: o papel não foi reconferido.
    expect(r.quantos(PAPEIS)).toBe(papeisAntes)
    expect(botao('Avisar neste celular')).not.toBeNull()
  })

  it('a function SEM REDE ⇒ MAN-16, e o relógio NÃO é chamado (rede nunca é pergunta de papel)', async () => {
    push.instalar()
    const r = cenario({ config: 'rede' })
    await abrir(() => !!botao('Avisar neste celular'))
    const papeisAntes = r.quantos(PAPEIS)
    const instantes = await tocarEObservar(botao('Avisar neste celular')!, 3000)
    expect(r.pedidos.filter((p) => p === FUNCTION)).toHaveLength(1)
    expect(r.quantos(RELOGIO)).toBe(0)
    expect(screen.getByText(NAO_ATIVOU)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/avisos')
    expect(instantes.findIndex((t) => t.includes(SEM_ACESSO))).toBe(-1)
    expect(r.quantos(PAPEIS)).toBe(papeisAntes)
  })

  it('o `subscribe` da porta em 403 + recusa ⇒ a recusa, e a inscrição do navegador DESFEITA', async () => {
    push.instalar()
    const r = cenario({
      config: { status: 200, corpo: { applicationServerKey: CHAVE_PUBLICA } },
      subscribe: FORBIDDEN,
    })
    await abrir(() => !!botao('Avisar neste celular'))
    perderOPapel(r)
    const instantes = await tocarEObservar(botao('Avisar neste celular')!, 4000)
    expect(daAcao(r, 'subscribe')).toHaveLength(1)
    expect(push.chamadas.unsubscribe).toBe(1)
    expect(instantes.findIndex((t) => t.includes(NAO_ATIVOU))).toBe(-1)
    expect(window.location.pathname).toBe('/login')
  })
})

describe('a leitura ao abrir (`status`) sobre o client real', () => {
  it('par: 200 conhecido ⇒ ligado, com o corpo `{ endpoint }` exato', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    const r = cenario({ status: { status: 200, corpo: { subscribed: true, events: OS_QUATRO } } })
    await abrir(() => screen.queryAllByRole('switch').length === 4)
    expect(daAcao(r, 'status').map((c) => c.corpo)).toEqual([{ endpoint: EXISTENTE }])
  })

  it('403 + `atelie_clock` 403 `42501` ⇒ a recusa, e nenhum interruptor em instante nenhum', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    const r = cenario({ status: FORBIDDEN })
    // O guarda da rota ainda vê a conta como admin (a primeira consulta do papel); a RPC já recusa, e
    // a conta perde o papel assim que o guarda a deixou entrar — a reconferência da vigia vê o vazio.
    r.estado.rpc = { ...r.estado.rpc, atelie_clock: RECUSA_403 }
    window.history.pushState({}, '', '/avisos')
    render(<App />)
    let interruptores = 0
    for (let i = 0; i < 80 && window.location.pathname !== '/login'; i++) {
      await andar(50)
      if (r.quantos(PAPEIS) >= 1) r.estado.papel = 'not-admin'
      interruptores += screen.queryAllByRole('switch').length
    }
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(interruptores).toBe(0)
    expect(daAcao(r, 'status')).toHaveLength(1)
  })

  it('403 com o relógio de pé ⇒ "Não consegui conferir…", nunca a recusa', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    const r = cenario({ status: FORBIDDEN })
    await abrir(() => corpo().includes(NAO_CONFERIU))
    expect(r.quantos(RELOGIO)).toBe(1)
    expect(window.location.pathname).toBe('/avisos')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
  })
})
