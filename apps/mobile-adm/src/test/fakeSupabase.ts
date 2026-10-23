import { vi } from 'vitest'

/**
 * Dublê do client do Supabase para os testes do app do ateliê. O `AuthProvider` de verdade roda
 * sobre ele — o que se prova é a árvore real reagindo à sessão, não um contexto escrito à mão.
 *
 * Ele ENXERGA o que importa às réguas: toda tabela lida fica em `tabelas` (para provar "nenhuma
 * leitura de dado da loja"), e cada chamada de auth fica gravada pelo `vi.fn`. A resposta do papel
 * pode ser SEGURADA (`segurarPapel`) — é o que reproduz o `BUG-20260802`: o login aceito antes de o
 * provider saber que a conta é admin.
 *
 * Uso: `vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))`.
 */

type Sessao = { user: { id: string; email: string } } | null

/** A resposta de uma RPC, na forma do supabase-js: ele NÃO rejeita, devolve `{ error }`. */
export type RespostaRpc = { data: unknown; error: null | { message: string; code?: string } }
/** Como uma RPC responde à `n`-ésima chamada (1, 2, …). Pode devolver uma promessa (segurar). */
type ComportamentoRpc = (n: number, args: unknown) => RespostaRpc | Promise<RespostaRpc>

/** Uma inscrição feita em `canal.on(tipo, filtro, cb)`. */
type Inscricao = { tipo: string; filtro: Record<string, unknown>; cb: (payload: unknown) => void }

/** Um canal do Realtime, como o supabase-js o devolve: `on` encadeia e `subscribe` o liga. */
export interface CanalFalso {
  nome: string
  inscricoes: Inscricao[]
  inscrito: boolean
  removido: boolean
  on: (tipo: string, filtro: Record<string, unknown>, cb: (payload: unknown) => void) => CanalFalso
  subscribe: () => CanalFalso
  /**
   * Sai do canal SEM removê-lo do client (`RealtimeChannel.unsubscribe`, que o supabase-js oferece).
   * Registrado para que uma troca de `removeChannel` por `unsubscribe` morra por asserção (o canal
   * deixa de estar aberto, e `removeChannel` não é chamado), e não por `is not a function` (N09).
   */
  unsubscribe: ReturnType<typeof vi.fn>
}
export type FormaDeFalha = 'erro' | 'lanca' | 'rejeita'

const FALHA_DE_REDE = { message: 'Failed to fetch' }
type Ouvinte = (evento: string, sessao: Sessao) => void

const criar = () => {
  const estado = {
    sessao: null as Sessao,
    admins: new Set<string>(),
    getSessionPendente: false,
    papelSegurado: null as null | { soltar: () => void; promessa: Promise<void> },
    /** A consulta do papel responde com ERRO (falha rápida: DNS, conexão recusada, 5xx). */
    erroDoPapel: null as null | { message: string; code?: string },
    /**
     * As três formas de uma leitura falhar (`MAF-22`): `erro` responde `{ error }`, `lanca` lança na
     * hora (ao montar a consulta) e `rejeita` devolve uma promessa rejeitada.
     */
    falhaDoPapel: null as null | FormaDeFalha,
    falhaDoCadastro: null as null | FormaDeFalha,
    falhaDaSessao: null as null | FormaDeFalha,
    /** A leitura do cadastro (`customers`) NUNCA responde. */
    cadastroPendurado: false,
    /** O pedido de código de recuperação responde com erro (ex.: o 429 do reenvio cedo demais). */
    erroDoEnvio: null as null | { message: string; code?: string; status?: number },
    erroDoLogin: null as null | { message: string; code?: string; status?: number },
    erroDoCodigo: null as null | { message: string; code?: string; status?: number },
    tabelas: [] as string[],
    ouvintes: new Set<Ouvinte>(),
    /** Feature `73`: o comportamento de cada RPC, por nome. Sem entrada, `{ data: null }`. */
    rpcs: new Map<string, ComportamentoRpc>(),
    /** Toda chamada de RPC, com o nome E os argumentos — a régua de "sem argumento" e de "uma chamada". */
    chamadasRpc: [] as { nome: string; args: unknown[] }[],
    /** Todo canal aberto por `channel(nome)`, inclusive os já removidos. */
    canais: [] as CanalFalso[],
  }

  const emitir = (evento: string) => {
    for (const o of estado.ouvintes) o(evento, estado.sessao)
  }

  const consulta = (tabela: string) => {
    estado.tabelas.push(tabela)
    const falha = tabela === 'user_roles' ? estado.falhaDoPapel : tabela === 'customers' ? estado.falhaDoCadastro : null
    if (falha === 'lanca') throw new TypeError('Failed to fetch')
    const filtros: Record<string, unknown> = {}
    const cadeia = {
      select: () => cadeia,
      eq: (coluna: string, valor: unknown) => {
        filtros[coluna] = valor
        return cadeia
      },
      maybeSingle: async () => {
        if (falha === 'rejeita') throw new TypeError('Failed to fetch')
        if (falha === 'erro') return { data: null, error: FALHA_DE_REDE }
        if (tabela === 'customers' && estado.cadastroPendurado) await new Promise<void>(() => {})
        if (tabela === 'user_roles') {
          if (estado.papelSegurado) await estado.papelSegurado.promessa
          if (estado.erroDoPapel) return { data: null, error: estado.erroDoPapel }
          const ehAdmin = estado.admins.has(String(filtros.user_id)) && filtros.role === 'admin'
          return { data: ehAdmin ? { role: 'admin' } : null, error: null }
        }
        return { data: null, error: null }
      },
    }
    return cadeia
  }

  const client = {
    auth: {
      getSession: vi.fn(() => {
        if (estado.falhaDaSessao === 'lanca') throw new TypeError('Failed to fetch')
        if (estado.falhaDaSessao === 'rejeita') return Promise.reject(new TypeError('Failed to fetch'))
        if (estado.falhaDaSessao === 'erro') return Promise.resolve({ data: { session: null }, error: FALHA_DE_REDE })
        return estado.getSessionPendente
          ? new Promise(() => {})
          : Promise.resolve({ data: { session: estado.sessao }, error: null })
      }),
      onAuthStateChange: vi.fn((cb: Ouvinte) => {
        estado.ouvintes.add(cb)
        // Paridade com o supabase-js (conserto r2 da Fase 6, L-055): todo ouvinte novo recebe
        // `INITIAL_SESSION` com o resultado da MESMA leitura da sessão salva — no client real os dois
        // passam por `_useSession`. Aqui, a leitura é a última chamada de `getSession` (o provider lê
        // antes de se inscrever), inclusive as trocadas por `mockImplementationOnce`. Na leitura que
        // FALHA (qualquer das três formas) o client real emite sessão `null` — o mesmo `null` da
        // sessão ausente, e o evento não diz qual dos dois. Na leitura pendurada ele não chega.
        const ultima = client.auth.getSession.mock.results.at(-1)
        type Leitura = { data: { session: Sessao }; error: unknown }
        const leitura: Promise<Leitura> = !ultima
          ? Promise.resolve({ data: { session: estado.sessao }, error: null })
          : ultima.type === 'throw'
            ? Promise.reject(ultima.value)
            : Promise.resolve(ultima.value as Leitura | Promise<Leitura>)
        leitura.then(
          ({ data, error }) => {
            if (estado.ouvintes.has(cb)) cb('INITIAL_SESSION', error ? null : data.session)
          },
          () => {
            if (estado.ouvintes.has(cb)) cb('INITIAL_SESSION', null)
          },
        )
        return { data: { subscription: { unsubscribe: () => estado.ouvintes.delete(cb) } } }
      }),
      signInWithPassword: vi.fn(async ({ email }: { email: string; password: string }) => {
        if (estado.erroDoLogin) return { data: {}, error: estado.erroDoLogin }
        estado.sessao = { user: { id: `id-${email}`, email } }
        emitir('SIGNED_IN')
        return { data: { session: estado.sessao }, error: null }
      }),
      signOut: vi.fn(async () => {
        estado.sessao = null
        emitir('SIGNED_OUT')
        return { error: null }
      }),
      resetPasswordForEmail: vi.fn(async (_email: string) => ({ data: {}, error: estado.erroDoEnvio })),
      verifyOtp: vi.fn(async ({ email }: { email: string; token: string; type: string }) => {
        if (estado.erroDoCodigo) return { data: {}, error: estado.erroDoCodigo }
        estado.sessao = { user: { id: `id-${email}`, email } }
        emitir('SIGNED_IN')
        return { data: { user: estado.sessao.user }, error: null }
      }),
      updateUser: vi.fn(async (_attrs: { password?: string }) => ({ data: {}, error: null })),
      getUser: vi.fn(async () => ({ data: { user: estado.sessao?.user ?? null } })),
    },
    from: vi.fn(consulta),
    rpc: vi.fn((nome: string, ...args: unknown[]) => {
      estado.tabelas.push(`rpc:${nome}`)
      estado.chamadasRpc.push({ nome, args })
      const n = estado.chamadasRpc.filter((c) => c.nome === nome).length
      const comportamento = estado.rpcs.get(nome)
      return Promise.resolve(comportamento ? comportamento(n, args[0]) : { data: null, error: null })
    }),
    channel: vi.fn((nome: string) => {
      const canal: CanalFalso = {
        nome,
        inscricoes: [],
        inscrito: false,
        removido: false,
        on(tipo, filtro, cb) {
          canal.inscricoes.push({ tipo, filtro, cb })
          return canal
        },
        subscribe() {
          canal.inscrito = true
          return canal
        },
        unsubscribe: vi.fn(async () => {
          canal.inscrito = false
          return 'ok' as const
        }),
      }
      estado.canais.push(canal)
      return canal
    }),
    removeChannel: vi.fn(async (canal: CanalFalso) => {
      canal.removido = true
      return 'ok' as const
    }),
  }

  return {
    client,
    estado,
    /** Começa com uma sessão já gravada (o app reaberto). */
    comSessao(email: string, { admin }: { admin: boolean }) {
      estado.sessao = { user: { id: `id-${email}`, email } }
      if (admin) estado.admins.add(`id-${email}`)
    },
    tornarAdmin(email: string) {
      estado.admins.add(`id-${email}`)
    },
    segurarPapel() {
      let soltar = () => {}
      const promessa = new Promise<void>((r) => (soltar = r))
      estado.papelSegurado = { soltar, promessa }
      return () => {
        estado.papelSegurado = null
        soltar()
      }
    },
    /** A consulta do papel NUNCA responde (pacotes que somem: Wi-Fi com portal, túnel). */
    pendurarPapel() {
      estado.papelSegurado = { soltar: () => {}, promessa: new Promise<void>(() => {}) }
    },
    /** A leitura do cadastro de quem entrou (`customers`) nunca responde. */
    pendurarCadastro() {
      estado.cadastroPendurado = true
    },
    /** A leitura da sessão salva (`getSession`) nunca responde. */
    pendurarSessao() {
      estado.getSessionPendente = true
    },
    /** O GoTrue renova o token do MESMO usuário (o evento que ele dispara sozinho de tempo em tempo). */
    renovarToken() {
      emitir('TOKEN_REFRESHED')
    },
    /**
     * A aba (ou o app instalado) volta a ficar visível: o supabase-js relê a sessão salva e emite
     * `SIGNED_IN` com o MESMO usuário (`_recoverAndRefresh`), a cada `visibilitychange`.
     */
    voltarAba() {
      if (estado.sessao) emitir('SIGNED_IN')
    },
    /** A sessão cai sozinha com o app aberto (token vencido, revogação). */
    perderSessao() {
      estado.sessao = null
      emitir('SIGNED_OUT')
    },
    // ---- RPC (feature `73`) -------------------------------------------------------------------
    /** A RPC responde com este dado, em toda chamada. */
    responderRpc(nome: string, data: unknown) {
      estado.rpcs.set(nome, () => ({ data, error: null }))
    },
    /** A RPC responde com `{ error }` (o supabase-js não rejeita). Ex.: `{ code: '42501' }`. */
    falharRpc(nome: string, erro: { message: string; code?: string }) {
      estado.rpcs.set(nome, () => ({ data: null, error: erro }))
    },
    /** A RPC nunca responde (L-054: cada leitura pendura sozinha). */
    pendurarRpc(nome: string) {
      estado.rpcs.set(nome, () => new Promise<RespostaRpc>(() => {}))
    },
    /** Comportamento por chamada: `(n, args) => resposta`, `n` a partir de 1. */
    aoChamarRpc(nome: string, comportamento: ComportamentoRpc) {
      estado.rpcs.set(nome, comportamento)
    },
    /** As chamadas de uma RPC, cada uma com os argumentos depois do nome. */
    chamadasDe(nome: string) {
      return estado.chamadasRpc.filter((c) => c.nome === nome)
    },
    // ---- Realtime (feature `73`) --------------------------------------------------------------
    /** Os canais ligados e ainda não removidos. */
    canaisAbertos() {
      return estado.canais.filter((c) => c.inscrito && !c.removido)
    },
    /**
     * Um aviso de `postgres_changes` chega: todo canal aberto inscrito na `tabela` recebe o payload.
     * Devolve quantos callbacks foram chamados (zero é um aviso que ninguém ouviu).
     */
    emitir(tabela = 'orders', payload: unknown = { eventType: 'UPDATE', table: tabela }) {
      let chamados = 0
      for (const canal of estado.canais) {
        if (!canal.inscrito || canal.removido) continue
        for (const i of canal.inscricoes) {
          if (i.tipo === 'postgres_changes' && i.filtro.table === tabela) {
            i.cb(payload)
            chamados++
          }
        }
      }
      return chamados
    },
    /** Só as leituras que NÃO são do próprio `AuthProvider` (o papel e o cadastro de quem entrou). */
    leiturasDeDado() {
      return estado.tabelas.filter((t) => t !== 'user_roles' && t !== 'customers')
    },
    reset() {
      estado.sessao = null
      estado.admins.clear()
      estado.getSessionPendente = false
      estado.papelSegurado = null
      estado.erroDoPapel = null
      estado.falhaDoPapel = null
      estado.falhaDoCadastro = null
      estado.falhaDaSessao = null
      estado.cadastroPendurado = false
      estado.erroDoEnvio = null
      estado.erroDoLogin = null
      estado.erroDoCodigo = null
      estado.tabelas = []
      estado.ouvintes.clear()
      estado.rpcs.clear()
      estado.chamadasRpc = []
      estado.canais = []
      for (const f of Object.values(client.auth)) f.mockClear()
      client.from.mockClear()
      client.rpc.mockClear()
      client.channel.mockClear()
      client.removeChannel.mockClear()
    },
  }
}

export const fake = criar()
