/**
 * A fatia do `supabase-js` que o importador usa — declarada aqui para que o dublê dos testes seja
 * uma afirmação verificável e não um `any` (`AD-004`).
 *
 * ⚠️ **Nenhuma função `async` deste projeto pode devolver um query builder do supabase-js**: ele é
 * *thenable*, a promise o adota, e o chamador recebe o RESULTADO da consulta no lugar do builder
 * (`L-011`). Por isso as assinaturas abaixo terminam em `Promise<QueryResult<…>>` — o `await` é
 * sempre da chamada, nunca de um objeto guardado.
 */

export interface QueryError {
  message?: string
  code?: string
  details?: string
}

export interface QueryResult<T> {
  data: T | null
  error: QueryError | null
}

export interface Filterable<T> {
  eq(column: string, value: unknown): Promise<QueryResult<T>>
  in(column: string, values: readonly unknown[]): Promise<QueryResult<T>>
}

export interface TableClient {
  select<T>(columns: string): Promise<QueryResult<T[]>>
  /** Página fechada `[from, to]`, inclusiva nas duas pontas — a semântica do PostgREST. */
  selectRange<T>(columns: string, from: number, to: number): Promise<QueryResult<T[]>>
  insert<T>(values: unknown): { select(columns: string): { single(): Promise<QueryResult<T>> } }
  insertMany(values: readonly unknown[]): Promise<QueryResult<null>>
  update(values: unknown): Filterable<null>
  delete(): Filterable<null>
}

export interface DbLike {
  from(table: string): TableClient
}

export class DbError extends Error {
  constructor(operacao: string, error: QueryError) {
    super(`${operacao}: ${error.message ?? error.code ?? 'erro desconhecido'}`)
  }
}

/** Levanta o erro em vez de devolver `data: null` silencioso — o padrão que o `AD-012` cobra. */
export const unwrap = <T>(operacao: string, result: QueryResult<T>): T => {
  if (result.error !== null) throw new DbError(operacao, result.error)
  return result.data as T
}

/**
 * O teto de linhas que o PostgREST devolve numa resposta sem `Range`.
 *
 * **Este número é a causa do terceiro defeito do primeiro import real.** `select('id, nuvemshop_id')`
 * sobre `product_variants` parecia ler a tabela inteira; devolvia 1.000 das 3.356. Tudo depois disso
 * "não existia", o import tentava INSERT, e o banco recusava com
 * `duplicate key ... product_variants_nuvemshop_id_key` — ou seja, a idempotência quebrava
 * exatamente onde ela mais importa, e só a partir do volume real. Nenhum dublê de teste chega perto
 * de 1.000 linhas, então nenhum teste de unidade poderia ter pego.
 */
export const POSTGREST_PAGE = 1000

/**
 * Lê a tabela INTEIRA, paginando.
 *
 * A última página é reconhecida por vir menor que o teto. Uma tabela cujo total seja múltiplo exato
 * de `POSTGREST_PAGE` custa uma requisição vazia a mais — preço baixo por não precisar de `count`.
 */
export const selectAll = async <T>(
  table: TableClient,
  columns: string,
  operacao: string,
  page = POSTGREST_PAGE,
): Promise<T[]> => {
  const todas: T[] = []

  for (let from = 0; ; from += page) {
    const lote = unwrap(operacao, await table.selectRange<T>(columns, from, from + page - 1)) ?? []
    todas.push(...lote)
    if (lote.length < page) return todas
  }
}

/** O mínimo do `supabase-js` que o adaptador consome. */
export interface SupabaseJsLike {
  from(table: string): {
    select(columns: string): unknown
    insert(values: unknown): unknown
    update(values: unknown): unknown
    delete(): unknown
  }
}

interface Chain {
  select(columns: string): Chain
  single(): unknown
  range(from: number, to: number): unknown
  eq(column: string, value: unknown): unknown
  in(column: string, values: readonly unknown[]): unknown
}

/**
 * Adapta o `supabase-js` real à interface acima.
 *
 * Existe porque `insertMany` não tem equivalente de nome no client: lá, inserir muitas linhas é o
 * MESMO `insert` com um array. Um `insert` que às vezes devolve `{ select().single() }` e às vezes
 * é aguardado direto seria ambíguo no ponto de uso, então a interface separa os dois e o adaptador
 * junta.
 *
 * ⚠️ **Nenhum método aqui é `async`** — todos devolvem o builder para o chamador aguardar. Uma
 * função `async` que devolvesse builder entregaria o RESULTADO da consulta no lugar dele, porque o
 * builder é thenable e a promise o adota (`L-011`).
 */
export const adaptSupabase = (client: SupabaseJsLike): DbLike => ({
  from: (table: string) => ({
    select: (columns: string) => client.from(table).select(columns) as never,
    selectRange: (columns: string, from: number, to: number) =>
      (client.from(table).select(columns) as unknown as Chain).range(from, to) as never,
    insert: (values: unknown) => ({
      select: (columns: string) => ({
        single: () => (client.from(table).insert(values) as unknown as Chain).select(columns).single() as never,
      }),
    }),
    insertMany: (values: readonly unknown[]) => client.from(table).insert(values) as never,
    update: (values: unknown) => ({
      eq: (column: string, value: unknown) =>
        (client.from(table).update(values) as unknown as Chain).eq(column, value) as never,
      in: (column: string, list: readonly unknown[]) =>
        (client.from(table).update(values) as unknown as Chain).in(column, list) as never,
    }),
    delete: () => ({
      eq: (column: string, value: unknown) =>
        (client.from(table).delete() as unknown as Chain).eq(column, value) as never,
      in: (column: string, list: readonly unknown[]) =>
        (client.from(table).delete() as unknown as Chain).in(column, list) as never,
    }),
  }),
})
