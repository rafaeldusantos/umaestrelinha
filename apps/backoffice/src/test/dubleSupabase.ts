// Um dublê de `supabase.from(...)` que ENXERGA o que a consulta pede — feature 67.
//
// Molde do dublê de `useValueMarks.test.ts`, extraído porque cinco arquivos da 67 precisam dele: um
// fake que não registra o filtro torna a regra inauditável (o `.eq` errado passaria com a mesma
// resposta). Cada chamada a `from` vira um `Registro` com a tabela, o `select`, os filtros na ordem
// em que foram encadeados, e a escrita (`upsert` com as opções, `insert`, `update`, `delete`).
//
// Quem responde é a função `responder`, que recebe o registro COMPLETO no momento em que a consulta
// é aguardada — é o que permite responder diferente por tabela, por filtro, ou segurar a resposta.

export interface Registro {
  table: string
  select?: unknown[]
  filters: { method: string; args: unknown[] }[]
  upsert?: { rows: unknown; options: unknown }
  insert?: unknown
  update?: unknown
  delete?: boolean
}

export type Resposta = { data?: unknown; error?: { message: string; code?: string } | null; count?: number | null }

export const criarDuble = (responder: (r: Registro) => Resposta | Promise<Resposta>) => {
  const calls: Registro[] = []
  const from = (table: string) => {
    const rec: Registro = { table, filters: [] }
    calls.push(rec)
    const b: Record<string, unknown> = {}
    for (const m of ['eq', 'in', 'neq', 'order', 'range', 'limit', 'or', 'is']) {
      b[m] = (...args: unknown[]) => {
        rec.filters.push({ method: m, args })
        return b
      }
    }
    b.select = (...args: unknown[]) => {
      rec.select = args
      return b
    }
    b.upsert = (rows: unknown, options: unknown) => {
      rec.upsert = { rows, options }
      return b
    }
    b.insert = (rows: unknown) => {
      rec.insert = rows
      return b
    }
    b.update = (values: unknown) => {
      rec.update = values
      return b
    }
    b.delete = () => {
      rec.delete = true
      return b
    }
    b.maybeSingle = () => Promise.resolve(responder(rec))
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
      Promise.resolve(responder(rec)).then(v => ({ error: null, ...v })).then(ok, ko)
    return b
  }
  return { from, calls }
}

/** Atalho: é uma escrita? */
export const ehEscrita = (r: Registro): boolean => !!(r.upsert || r.insert || r.update || r.delete)

/** Atalho: é a contagem (`head: true`)? */
export const ehContagem = (r: Registro): boolean => (r.select?.[1] as { head?: boolean } | undefined)?.head === true
