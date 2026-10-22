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
    rpc: vi.fn((nome: string) => {
      estado.tabelas.push(`rpc:${nome}`)
      return Promise.resolve({ data: null, error: null })
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
      for (const f of Object.values(client.auth)) f.mockClear()
      client.from.mockClear()
      client.rpc.mockClear()
    },
  }
}

export const fake = criar()
