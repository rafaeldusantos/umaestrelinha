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
 * Desde a feature `74` ele também registra a CADEIA inteira de cada leitura de tabela de dado
 * (`cadeiasDe`), e uma tabela sem resposta configurada lança (`responderTabela`).
 *
 * Desde a feature `75` (T14) ele também ESCREVE: `update`/`insert`/`upsert`/`delete` numa tabela de
 * dado ficam em `escritasDe(tabela)` com os VALORES e a cadeia de filtros que veio depois (`eq`, `in`,
 * `select`), e `functions.invoke` em `invocacoesDe(nome)`. A resposta de cada escrita, de cada RPC
 * (`filaRpc`) e de cada invocação sai de uma FILA, uma por chamada, na ordem — e a fila que esgota
 * (ou que nunca foi configurada) LANÇA e fica em `esgotamentos()`. Sem isso, "zero escritas" seria
 * verdade por silêncio: uma escrita sem resposta configurada viraria `undefined` e a suíte não veria.
 * `log()` é a ordem global das idas ao banco (`update orders`, `rpc set_material_status`,
 * `invoke send-notification?action=trigger`…) — é com ele que se prova "o passo seguinte não roda".
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

/**
 * Feature `74` (R9, `L-060`) — uma chamada da cadeia de uma leitura de tabela: o método e os
 * argumentos, na ordem em que o código os encadeou. `select` com as opções (`{ count: 'exact' }`)
 * entra inteiro, e um `.neq` a mais aparece na cadeia — a régua é a IGUALDADE com a cadeia de `core`.
 */
export type Elo = { metodo: string; args: unknown[] }
/** O que uma leitura de tabela devolve, na forma do supabase-js (ele NÃO rejeita). */
export type RespostaTabela = { data: unknown; error: null | { message: string; code?: string }; count?: number | null }
/** Como a tabela responde à `n`-ésima leitura, vendo a cadeia inteira. Pode devolver promessa (segurar). */
type ComportamentoTabela = (cadeia: Elo[], n: number) => RespostaTabela | Promise<RespostaTabela>

/** A leitura de tabela do dublê, tipada como o builder do supabase-js é usado: encadeia e é `thenable`. */
export interface ConsultaFalsa extends PromiseLike<RespostaTabela> {
  update(...args: unknown[]): ConsultaFalsa
  insert(...args: unknown[]): ConsultaFalsa
  upsert(...args: unknown[]): ConsultaFalsa
  delete(...args: unknown[]): ConsultaFalsa
  select(...args: unknown[]): ConsultaFalsa
  or(...args: unknown[]): ConsultaFalsa
  in(...args: unknown[]): ConsultaFalsa
  eq(...args: unknown[]): ConsultaFalsa
  neq(...args: unknown[]): ConsultaFalsa
  is(...args: unknown[]): ConsultaFalsa
  not(...args: unknown[]): ConsultaFalsa
  ilike(...args: unknown[]): ConsultaFalsa
  gt(...args: unknown[]): ConsultaFalsa
  lt(...args: unknown[]): ConsultaFalsa
  gte(...args: unknown[]): ConsultaFalsa
  lte(...args: unknown[]): ConsultaFalsa
  order(...args: unknown[]): ConsultaFalsa
  limit(...args: unknown[]): ConsultaFalsa
  range(...args: unknown[]): ConsultaFalsa
  maybeSingle(): Promise<RespostaTabela>
  single(): Promise<RespostaTabela>
}

/** Os métodos de filtro e de forma que o dublê aceita e registra. Fora desta lista, `is not a function`. */
const METODOS_DA_CADEIA = ['select', 'or', 'in', 'eq', 'neq', 'is', 'not', 'ilike', 'gt', 'lt', 'gte', 'lte', 'order', 'limit', 'range'] as const

/** Os comandos de escrita que o dublê aceita (feature `75`). O primeiro elo decide o modo da consulta. */
const COMANDOS_DE_ESCRITA = ['update', 'insert', 'upsert', 'delete'] as const
export type ComandoDeEscrita = (typeof COMANDOS_DE_ESCRITA)[number]

/** Uma escrita registrada: a tabela, o comando, os valores passados e a cadeia de filtros DEPOIS dele. */
export type Escrita = { tabela: string; comando: ComandoDeEscrita; valores: unknown[]; cadeia: Elo[] }
/** Uma resposta da fila: o valor, ou uma função (para segurar com promessa). */
type NaFila<T> = T | (() => T | Promise<T>)
/** O que `functions.invoke` devolve, na forma do supabase-js (ele NÃO rejeita). */
export type RespostaInvocacao = { data: unknown; error: null | { message: string } }

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
    /** Feature `74`: como cada tabela de DADO responde. Sem entrada, ler a tabela LANÇA. */
    respostasDeTabela: new Map<string, ComportamentoTabela>(),
    /** Toda leitura de tabela de dado, com a cadeia inteira, na ordem em que saiu. */
    leituras: [] as { tabela: string; cadeia: Elo[]; final: 'then' | 'maybeSingle' | 'single' }[],
    // ---- Escrita (feature `75`, T14) ----
    /** A fila de respostas das escritas de cada tabela: uma por escrita, na ordem. */
    filasDeEscrita: new Map<string, NaFila<RespostaTabela>[]>(),
    /** Toda escrita, com os valores e a cadeia depois do comando. */
    escritas: [] as Escrita[],
    /** A fila de respostas de cada RPC posta em fila (`filaRpc`). */
    filasDeRpc: new Map<string, NaFila<RespostaRpc>[]>(),
    /** A fila de respostas de cada function (`functions.invoke`). */
    filasDeInvocacao: new Map<string, NaFila<RespostaInvocacao>[]>(),
    /** Toda invocação de function, com o nome e as opções (o corpo). */
    invocacoes: [] as { nome: string; opcoes: unknown }[],
    /** As filas que esgotaram (ou nunca existiram) — cada uma também LANÇOU. */
    esgotamentos: [] as string[],
    /** A ordem global das idas ao banco: `update orders`, `rpc atelie_clock`, `invoke …`. */
    log: [] as string[],
  }

  /** Tira a próxima resposta da fila; a fila vazia (ou ausente) registra o esgotamento e LANÇA. */
  const proxima = async <T,>(fila: NaFila<T>[] | undefined, rotulo: string): Promise<T> => {
    const item = fila?.shift()
    if (item === undefined) {
      estado.esgotamentos.push(rotulo)
      throw new Error(`fakeSupabase: a fila de "${rotulo}" esgotou (nenhuma resposta configurada para esta chamada)`)
    }
    return typeof item === 'function' ? (item as () => T | Promise<T>)() : item
  }

  const emitir = (evento: string) => {
    for (const o of estado.ouvintes) o(evento, estado.sessao)
  }

  /**
   * Feature `74` — a leitura de uma tabela de DADO (`order_list`, `order_items`…). Registra a cadeia
   * inteira e só responde quando é aguardada (o builder do supabase-js é `thenable`), ou no
   * `maybeSingle`/`single`. Uma tabela sem resposta configurada LANÇA na hora: devolver `[]` em
   * silêncio faria uma consulta ao lugar errado passar por "lista vazia".
   */
  const leituraDeDado = (tabela: string): ConsultaFalsa => {
    const comportamento = estado.respostasDeTabela.get(tabela)
    // Feature `75`: a tabela que só tem fila de ESCRITA não lança aqui; ler dela lança ao responder.
    if (!comportamento && !estado.filasDeEscrita.has(tabela))
      throw new Error(`fakeSupabase: a tabela "${tabela}" não tem resposta configurada (responderTabela/filaDeEscrita)`)
    const cadeia: Elo[] = []
    let escrita: Escrita | null = null
    const responder = (final: 'then' | 'maybeSingle' | 'single'): Promise<RespostaTabela> => {
      if (escrita) {
        estado.log.push(`${escrita.comando} ${tabela}`)
        return proxima(estado.filasDeEscrita.get(tabela), `${escrita.comando} ${tabela}`)
      }
      if (!comportamento)
        return Promise.reject(new Error(`fakeSupabase: a tabela "${tabela}" não tem resposta de LEITURA configurada (responderTabela)`))
      estado.log.push(`select ${tabela}`)
      estado.leituras.push({ tabela, cadeia, final })
      const n = estado.leituras.filter((l) => l.tabela === tabela).length
      return Promise.resolve(comportamento(cadeia, n))
    }
    const builder: Record<string, unknown> = {}
    for (const metodo of METODOS_DA_CADEIA) {
      builder[metodo] = (...args: unknown[]) => {
        cadeia.push({ metodo, args })
        return builder
      }
    }
    for (const comando of COMANDOS_DE_ESCRITA) {
      builder[comando] = (...valores: unknown[]) => {
        if (escrita || cadeia.length > 0) throw new Error(`fakeSupabase: "${comando}" tem de ser o primeiro elo da consulta`)
        // A cadeia da escrita é a mesma referência: os filtros que vêm DEPOIS entram nela.
        escrita = { tabela, comando, valores, cadeia }
        estado.escritas.push(escrita)
        return builder
      }
    }
    builder.maybeSingle = () => {
      cadeia.push({ metodo: 'maybeSingle', args: [] })
      return responder('maybeSingle')
    }
    builder.single = () => {
      cadeia.push({ metodo: 'single', args: [] })
      return responder('single')
    }
    builder.then = (ok: (v: RespostaTabela) => unknown, erro?: (e: unknown) => unknown) => responder('then').then(ok, erro)
    return builder as unknown as ConsultaFalsa
  }

  const consulta = (tabela: string): ConsultaFalsa => {
    estado.tabelas.push(tabela)
    if (tabela !== 'user_roles' && tabela !== 'customers') return leituraDeDado(tabela)
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
    // A cadeia do papel e do cadastro só tem `select`/`eq`/`maybeSingle` — é o que o AuthProvider usa.
    return cadeia as unknown as ConsultaFalsa
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
      estado.log.push(`rpc ${nome}`)
      // Feature `75`: a RPC posta em FILA responde dela, e a fila esgotada LANÇA (síncrono, como o
      // client que lança na hora) — nunca o `{ data: null }` silencioso de uma RPC sem entrada.
      if (estado.filasDeRpc.has(nome)) {
        const fila = estado.filasDeRpc.get(nome)
        const item = fila.shift()
        if (item === undefined) {
          estado.esgotamentos.push(`rpc ${nome}`)
          throw new Error(`fakeSupabase: a fila de "rpc ${nome}" esgotou (nenhuma resposta configurada para esta chamada)`)
        }
        return Promise.resolve(typeof item === 'function' ? item() : item)
      }
      const n = estado.chamadasRpc.filter((c) => c.nome === nome).length
      const comportamento = estado.rpcs.get(nome)
      return Promise.resolve(comportamento ? comportamento(n, args[0]) : { data: null, error: null })
    }),
    functions: {
      /** Feature `75`: registra o nome e as opções; responde da fila da function, e a fila vazia LANÇA. */
      invoke: vi.fn((nome: string, opcoes?: unknown) => {
        estado.invocacoes.push({ nome, opcoes })
        estado.log.push(`invoke ${nome}`)
        return proxima(estado.filasDeInvocacao.get(nome), `invoke ${nome}`)
      }),
    },
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
    // ---- Tabelas de dado (feature `74`) --------------------------------------------------------
    /** A tabela responde com esta resposta (ou função da cadeia e do número da leitura). */
    responderTabela(tabela: string, resposta: RespostaTabela | ComportamentoTabela) {
      estado.respostasDeTabela.set(tabela, typeof resposta === 'function' ? resposta : () => resposta)
    },
    /** A tabela responde `{ error }` (o supabase-js não rejeita). */
    falharTabela(tabela: string, erro: { message: string; code?: string } = FALHA_DE_REDE) {
      estado.respostasDeTabela.set(tabela, () => ({ data: null, error: erro }))
    },
    /** A leitura da tabela nunca responde (L-054: cada leitura pendura sozinha). */
    pendurarTabela(tabela: string) {
      estado.respostasDeTabela.set(tabela, () => new Promise<RespostaTabela>(() => {}))
    },
    /** As cadeias de cada leitura da tabela, na ordem — a régua de `L-060` é a igualdade. */
    cadeiasDe(tabela: string) {
      return estado.leituras.filter((l) => l.tabela === tabela).map((l) => l.cadeia)
    },
    // ---- Escrita (feature `75`, T14) -----------------------------------------------------------
    /**
     * Põe respostas na fila das ESCRITAS da tabela (`update`/`insert`/`upsert`/`delete`), uma por
     * escrita, na ordem. A escrita que chega com a fila vazia LANÇA e fica em `esgotamentos()`.
     */
    filaDeEscrita(tabela: string, ...respostas: NaFila<RespostaTabela>[]) {
      const fila = estado.filasDeEscrita.get(tabela) ?? []
      fila.push(...respostas)
      estado.filasDeEscrita.set(tabela, fila)
    },
    /** As escritas da tabela, na ordem, com os valores e a cadeia depois do comando. */
    escritasDe(tabela: string) {
      return estado.escritas.filter((e) => e.tabela === tabela)
    },
    /** Põe respostas na fila da RPC, uma por chamada. Com fila, a chamada sem resposta LANÇA. */
    filaRpc(nome: string, ...respostas: NaFila<RespostaRpc>[]) {
      const fila = estado.filasDeRpc.get(nome) ?? []
      fila.push(...respostas)
      estado.filasDeRpc.set(nome, fila)
    },
    /** Põe respostas na fila da function (`functions.invoke`), uma por invocação. */
    filaDeInvocacao(nome: string, ...respostas: NaFila<RespostaInvocacao>[]) {
      const fila = estado.filasDeInvocacao.get(nome) ?? []
      fila.push(...respostas)
      estado.filasDeInvocacao.set(nome, fila)
    },
    /** As invocações da function, com as opções (o corpo). */
    invocacoesDe(nome: string) {
      return estado.invocacoes.filter((i) => i.nome === nome)
    },
    /** As filas que esgotaram (cada uma lançou). Um teste que termina com isto não vazio mediu o nada. */
    esgotamentos() {
      return [...estado.esgotamentos]
    },
    /** A ordem global das idas ao banco e das invocações. */
    log() {
      return [...estado.log]
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
      estado.respostasDeTabela.clear()
      estado.leituras = []
      estado.filasDeEscrita.clear()
      estado.escritas = []
      estado.filasDeRpc.clear()
      estado.filasDeInvocacao.clear()
      estado.invocacoes = []
      estado.esgotamentos = []
      estado.log = []
      for (const f of Object.values(client.auth)) f.mockClear()
      client.functions.invoke.mockClear()
      client.from.mockClear()
      client.rpc.mockClear()
      client.channel.mockClear()
      client.removeChannel.mockClear()
    },
  }
}

export const fake = criar()
