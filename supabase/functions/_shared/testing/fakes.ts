// Dublês compartilhados pelos testes das edge functions (AD-004).
//
// Vivem em `_shared/` porque o prefixo `_` diz ao CLI do Supabase que o diretório NÃO é uma function
// deployável — é código importado por outras. Nasceram em `mercado-pago/__tests__/fakes.ts` e foram
// movidos aqui quando a `send-email` passou a precisar dos mesmos dublês; aquele arquivo virou um
// reexport, para que `mercado-pago/__tests__/handlers.test.ts` não precisasse mudar nem um byte.
//
// Princípio de desenho (não afrouxe): cobrem SÓ a superfície que os handlers usam. Um dublê que
// tenta imitar o supabase-js inteiro fica errado e dá falso verde.
//
// Limite honesto: um dublê pode divergir do client real. O roteiro de sandbox continua sendo a prova
// de que os dois concordam; este harness complementa, não substitui.

// ---------------------------------------------------------------------------------------------
// fetch
// ---------------------------------------------------------------------------------------------

export interface FetchRoute {
  /** Casa pela URL. Primeira rota que casar vence. */
  match: string | RegExp
  status?: number
  /** Corpo da resposta. Ignorado quando `networkError` é true. */
  body?: unknown
  /**
   * Corpo **cru**, servido como está — para respostas que NÃO são JSON (página de erro HTML de um
   * proxy/WAF na frente do provedor). Vence `body`. Existe porque há ramo de handler que depende de
   * `res.json()` FALHAR (ORD-07: 4xx sem corpo parseável ⇒ 502), e por `JSON.stringify` esse ramo
   * é inalcançável.
   */
  rawBody?: string
  /** Simula queda de rede: o `fetch` rejeita, como faria um DNS/conexão falhando. */
  networkError?: boolean
}

export interface FetchCall {
  url: string
  method: string
  headers: Record<string, string>
  /** Corpo JÁ parseado — é sobre ele que os testes de payload asseveram. */
  body: any
}

export interface FakeFetch {
  fetch: typeof globalThis.fetch
  calls: FetchCall[]
}

export function createFakeFetch(routes: FetchRoute[] = []): FakeFetch {
  const calls: FetchCall[] = []

  const fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : String(input?.url ?? input)
    const headers: Record<string, string> = {}
    for (const [k, v] of Object.entries(init?.headers ?? {})) headers[k] = String(v)

    let body: any = null
    if (typeof init?.body === 'string') {
      try {
        body = JSON.parse(init.body)
      } catch {
        body = init.body
      }
    }

    calls.push({ url, method: init?.method ?? 'GET', headers, body })

    const route = routes.find((r) =>
      typeof r.match === 'string' ? url.includes(r.match) : r.match.test(url),
    )
    if (!route) {
      throw new Error(`fakeFetch: nenhuma rota casa com ${url}`)
    }
    if (route.networkError) {
      throw new Error('network down')
    }

    const status = route.status ?? 200
    if (route.rawBody !== undefined) {
      return new Response(route.rawBody, { status, headers: { 'Content-Type': 'text/html' } })
    }
    return new Response(JSON.stringify(route.body ?? {}), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof globalThis.fetch

  return { fetch, calls }
}

// ---------------------------------------------------------------------------------------------
// supabase
// ---------------------------------------------------------------------------------------------

export interface UpdateCall {
  table: string
  values: Record<string, unknown>
  /** `[coluna, valor]` do `.eq()` que escopa o update. */
  eq: [string, unknown] | null
}

export interface RpcCall {
  fn: string
  args: Record<string, unknown>
}

/**
 * Fixture de linha. A forma de função existe porque o webhook consulta a MESMA tabela duas vezes
 * com filtros diferentes (`id` e depois `mp_order_id`, WHK-03): sem enxergar o `.eq()`, o dublê
 * devolveria a mesma linha nos dois caminhos e o fallback nunca seria exercitado de verdade.
 *
 * O mesmo mecanismo serve a `store_settings`, que `create-payment` lê duas vezes por `key`
 * (`checkout` para o order bump e `payment` para o desconto PIX): a fixture discrimina por
 * `eq[1]` e devolve o `value` de cada chave.
 *
 * O segundo argumento (`select`) existe pelo mesmo motivo, um nível acima: o motor de e-mail RELÊ
 * `orders` com o MESMO filtro do handler, só com outro conjunto de colunas (e o join de
 * `order_items`). Sem enxergar o select, é impossível montar o estado real — "antes do update" na
 * leitura do handler e "depois do update" na releitura do e-mail —, e o e-mail nunca dispararia no
 * teste, dando falso verde no gatilho.
 */
export type RowFixture =
  | ((eq: [string, unknown] | null, select: string) => unknown | null)
  | unknown
  | null

export interface FakeSupabaseOptions {
  /** Usuário devolvido por `auth.getUser`. `null` → 401 nos handlers. */
  user?: { id: string } | null
  /** Linha devolvida por `.single()`/`.maybeSingle()` de cada tabela. */
  rows?: Record<string, RowFixture>
  /** Lista devolvida quando a query termina sem `.single()` (ex.: order_items, products). */
  lists?: Record<string, unknown[]>
  /** Resultado de `.rpc()` para QUALQUER nome de função. Fallback de `rpcByFn`. */
  rpc?: { data?: unknown; error?: unknown }
  /**
   * Resultado de `.rpc()` **por nome**, com precedência sobre `rpc`.
   *
   * Necessário porque um único fluxo pode chamar várias RPCs distintas com desfechos distintos: a
   * `send-email` chama `has_role` (autorização), `claim_order_email` (reivindicação) e
   * `finish_order_email` (fecho) no mesmo caminho. Com um resultado único para todas, é impossível
   * montar "é admin **e** já foi enviado" — o teste não conseguiria distinguir os cenários.
   */
  rpcByFn?: Record<string, { data?: unknown; error?: unknown }>
  /** Força erro em todo `.update()`, para exercitar o caminho de falha de persistência. */
  updateError?: unknown
}

export interface FakeSupabase {
  client: any
  updates: UpdateCall[]
  rpcs: RpcCall[]
}

export function createFakeSupabase(options: FakeSupabaseOptions = {}): FakeSupabase {
  const updates: UpdateCall[] = []
  const rpcs: RpcCall[] = []

  function builder(table: string) {
    let eqPair: [string, unknown] | null = null
    let selectColumns = ''
    let pendingUpdate: Record<string, unknown> | null = null

    const result = () => {
      if (pendingUpdate) {
        updates.push({ table, values: pendingUpdate, eq: eqPair })
        return { data: null, error: options.updateError ?? null }
      }
      return { data: options.lists?.[table] ?? null, error: null }
    }

    const row = () => {
      const fixture = options.rows?.[table] ?? null
      return typeof fixture === 'function'
        ? (fixture as (eq: [string, unknown] | null, select: string) => unknown | null)(
            eqPair,
            selectColumns,
          )
        : fixture
    }

    const chain: any = {
      select: (columns?: string) => {
        selectColumns = columns ?? ''
        return chain
      },
      eq: (column: string, value: unknown) => {
        eqPair = [column, value]
        return chain
      },
      in: () => chain,
      update: (values: Record<string, unknown>) => {
        pendingUpdate = values
        return chain
      },
      single: async () => {
        const data = row()
        return { data, error: data ? null : { message: 'not found' } }
      },
      maybeSingle: async () => ({ data: row(), error: null }),
      // Torna a cadeia awaitable sem `.single()` — é como os handlers leem order_items e products.
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result()).then(resolve, reject),
    }

    return chain
  }

  const client = {
    auth: {
      getUser: async () => {
        const user = options.user ?? null
        return user
          ? { data: { user }, error: null }
          : { data: { user: null }, error: { message: 'invalid jwt' } }
      },
    },
    from: (table: string) => builder(table),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcs.push({ fn, args })
      const chosen = options.rpcByFn?.[fn] ?? options.rpc
      return { data: chosen?.data ?? null, error: chosen?.error ?? null }
    },
  }

  return { client, updates, rpcs }
}
