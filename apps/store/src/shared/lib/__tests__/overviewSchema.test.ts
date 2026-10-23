import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature `73` — `store_overview`, o resumo do ateliê (`MAI-09`..`MAI-14`,
 * `MAI-22`, `MAI-23`, `AD-055`, `AD-057`).
 *
 * Lê o `.sql` **do disco**, no molde de `visitasSchema.test.ts`, e pelo mesmo motivo: **afrouxar uma
 * migration não quebra nada**. A função nascendo sem `has_role` (toda cliente leria o faturamento da
 * loja), com `execute` a `anon`, o dia decidido por `current_date` (o fuso do servidor), o mês por
 * `date_trunc('month', now())`, a venda sem o recorte de cancelado, o `limit 4` das joias sumindo —
 * tudo isso aplica limpo e passa em build, `tsc` e teste de componente.
 *
 * **Uma régua por COMANDO** (`L-033`), cada uma um **predicado** exercido também contra texto mutado,
 * e `mutar()` **lança** quando a mutação não muda nada. As mutações partem do SQL **sem comentário**.
 * A regra da FILA (os quatro blocos e a união) tem guarda próprio: `filaComDonoUnico.test.ts`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261023120000_73-resumo-do-atelie.sql')

const sql = readFileSync(CAMINHO, 'utf8').replace(/\r\n/g, '\n')

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`L-031`, `BL-027`). */
const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, () => para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

const comandos = semComentario(sql)

/** O bloco da função, do `create or replace function` até o `$$;`. `null` reprova. */
const bloco = (texto: string): string | null => {
  const c = semComentario(texto)
  const inicio = c.search(/create\s+or\s+replace\s+function\s+public\.store_overview\s*\(/i)
  if (inicio < 0) return null
  const fim = c.indexOf('$$;', inicio)
  return fim < 0 ? null : c.slice(inicio, fim + 3)
}

/** O corpo (`as $$ … $$`). `null` reprova. */
const corpo = (texto: string): string | null => {
  const b = bloco(texto)
  if (!b) return null
  const abre = b.search(/\bas\s+\$\$/i)
  return abre < 0 ? null : b.slice(abre)
}

/** Uma CTE do corpo: do `<nome> as (` até o `)` que a fecha (nível zero). `null` reprova. */
const cte = (texto: string, nome: string): string | null => {
  const c = corpo(texto)
  if (!c) return null
  const m = new RegExp(`\\b${nome}\\s+as\\s+\\(`, 'i').exec(c)
  if (!m) return null
  let nivel = 0
  for (let i = m.index + m[0].length - 1; i < c.length; i++) {
    if (c[i] === '(') nivel++
    if (c[i] === ')' && --nivel === 0) return c.slice(m.index, i + 1)
  }
  return null
}

const papeis = (texto: string, verbo: 'grant' | 'revoke'): string[] => {
  const prep = verbo === 'grant' ? 'to' : 'from'
  const re = new RegExp(`\\b${verbo}\\s+[\\w\\s,]+?\\s+on\\s+function\\s+public\\.store_overview(?:\\s*\\([^)]*\\))?\\s+${prep}\\s+([^;]+);`, 'gi')
  return [...semComentario(texto).matchAll(re)].flatMap((m) => m[1].split(',').map((p) => p.trim().toLowerCase()))
}

// -------------------------------------------------------------------------------------------
// As réguas — cada uma devolve `true` quando a migration está certa
// -------------------------------------------------------------------------------------------

const R = {
  definer: (t: string) => /\bsecurity\s+definer\b/i.test(bloco(t) ?? ''),
  searchPath: (t: string) => /set\s+search_path\s*=\s*''/i.test(bloco(t) ?? ''),
  stable: (t: string) => /language\s+plpgsql\s+stable\b/i.test(bloco(t) ?? ''),
  /** A recusa vem ANTES de qualquer leitura de tabela. */
  recusaPrimeiro: (t: string) => {
    const c = corpo(t) ?? ''
    const recusa = c.search(
      /if\s+not\s+public\.has_role\(\s*auth\.uid\(\)\s*,\s*'admin'\s*\)\s+then\s+raise\s+exception\s+'[^']+'\s+using\s+errcode\s*=\s*'42501'/i,
    )
    const leitura = c.search(/\bfrom\s+public\./i)
    return recusa >= 0 && leitura > recusa
  },
  revoke: (t: string) => ['public', 'anon'].every((p) => papeis(t, 'revoke').includes(p)),
  grantSoAuthenticated: (t: string) => {
    const g = papeis(t, 'grant')
    return g.length === 1 && g[0] === 'authenticated'
  },
  /** Venda = o par do `AD-055`, escrito UMA vez, dentro de `with vendas`. */
  vendaUmaVez: (t: string) => {
    const c = corpo(t) ?? ''
    const v = cte(t, 'vendas') ?? ''
    return (
      (c.match(/payment_status\s*=\s*'approved'/gi) ?? []).length === 1 &&
      /o\.payment_status\s*=\s*'approved'\s+and\s+o\.status\s*<>\s*'cancelled'/i.test(v) &&
      /o\.paid_at\s*<=\s*p_agora/i.test(v)
    )
  },
  /** Nenhum relógio nem fuso do servidor no corpo: o dia é `store_day(p_agora)`. */
  semRelogioDoServidor: (t: string) => {
    const c = corpo(t) ?? ''
    return !/\bcurrent_date\b|\bnow\s*\(\)|\bcurrent_timestamp\b|\bat\s+time\s+zone\b|\blocaltimestamp\b|paid_at\s*::\s*date/i.test(c)
  },
  hojePorStoreDay: (t: string) => /v_hoje\s*:=\s*public\.store_day\(\s*p_agora\s*\)/i.test(corpo(t) ?? ''),
  mesPeloDiaDoBanco: (t: string) =>
    /v_mes\s*:=\s*date_trunc\(\s*'month'\s*,\s*v_hoje\s*\)::date/i.test(corpo(t) ?? ''),
  /**
   * Todo recorte de `paid_at` (e da primeira venda, que é um `min(paid_at)`) compara contra
   * `store_day_start(…)` ou contra `p_agora`. Âncora: os cinco recortes da função.
   */
  recortePorStoreDayStart: (t: string) => {
    const c = corpo(t) ?? ''
    const lados = [...c.matchAll(/(?:paid_at|primeira_venda)\s*(?:>=|<=|<|>)\s*([^\s]+)/gi)].map((m) => m[1])
    return lados.length >= 5 && lados.every((l) => /^public\.store_day_start\(/i.test(l) || /^p_agora\b/i.test(l))
  },
  semanaSeteDias: (t: string) => /generate_series\(\s*v_hoje\s*-\s*6\s*,\s*v_hoje\s*,\s*interval\s*'1 day'\s*\)/i.test(cte(t, 'dias') ?? ''),
  joiasLimit4: (t: string) => {
    const j = cte(t, 'joias') ?? ''
    return /order\s+by\s+pecas\s+desc\s*,\s*nome\s+limit\s+4\b/i.test(j) && /sum\(\s*i\.quantity\s*\)/i.test(j)
  },
  joiasSoDoMes: (t: string) => /\bfrom\s+do_mes\s+m\b/i.test(cte(t, 'joias') ?? ''),
  joiaOrfaPeloNome: (t: string) =>
    /case\s+when\s+p\.id\s+is\s+not\s+null\s+then\s+p\.id::text\s+else\s+'nome:'\s*\|\|\s*i\.product_name\s+end/i.test(cte(t, 'joias') ?? ''),
  recentes4: (t: string) =>
    /order\s+by\s+o\.created_at\s+desc\s*,\s*o\.id\s+desc\s+limit\s+4\b/i.test(cte(t, 'recentes') ?? ''),
  clientesPeloVinculo: (t: string) => {
    const p = cte(t, 'primeira') ?? ''
    return (
      /from\s+public\.customer_directory\s+d\b/i.test(p) &&
      /on\s+v\.customer_id\s*=\s*d\.id\s+or\s+lower\(v\.customer_email\)\s*=\s*lower\(d\.email\)/i.test(p) &&
      /min\(\s*v\.paid_at\s*\)/i.test(p)
    )
  },
  semEscritaDeDado: (t: string) => !/\b(insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i.test(semComentario(t)),
  qualificado: (t: string) => {
    const c = corpo(t) ?? ''
    return !/(?<![\w.])(has_role|store_day|store_day_start|orders|order_items|products|customer_directory)\b(?!_)/i.test(
      c.replace(/'[^']*'/g, "''"),
    )
  },
}

// -------------------------------------------------------------------------------------------

describe('a migration da 73 — âncora', () => {
  it('o arquivo foi lido, e a função, o corpo e as CTEs foram achados', () => {
    expect(sql.length).toBeGreaterThan(1000)
    expect(bloco(sql)).not.toBeNull()
    expect(corpo(sql)).not.toBeNull()
    for (const nome of ['vendas', 'dias', 'semana', 'do_mes', 'primeira', 'joias', 'fila', 'recentes']) {
      expect(cte(sql, nome), nome).not.toBeNull()
    }
  })
})

describe('a migration da 73 — uma régua por comando', () => {
  it.each(Object.keys(R))('%s', (nome) => {
    expect(R[nome as keyof typeof R](sql)).toBe(true)
  })
})

describe('sensores — cada régua reprova a mutação que existe para recusar', () => {
  const casos: [keyof typeof R, string | RegExp, string][] = [
    ['definer', /security\s+definer/i, 'security invoker'],
    ['searchPath', "set search_path = ''", ''],
    ['stable', /language plpgsql\s+stable/i, 'language plpgsql volatile'],
    ['recusaPrimeiro', "errcode = '42501'", "errcode = 'P0001'"],
    ['recusaPrimeiro', "if not public.has_role(auth.uid(), 'admin') then", 'if false then'],
    ['revoke', 'from public, anon;', 'from public;'],
    ['grantSoAuthenticated', 'to authenticated;', 'to authenticated, anon;'],
    ['vendaUmaVez', "and o.status <> 'cancelled'", ''],
    ['vendaUmaVez', 'and o.paid_at <= p_agora', ''],
    ['semRelogioDoServidor', 'v_hoje := public.store_day(p_agora);', 'v_hoje := current_date;'],
    ['semRelogioDoServidor', "v_mes := date_trunc('month', v_hoje)::date;", "v_mes := date_trunc('month', now())::date;"],
    ['hojePorStoreDay', 'public.store_day(p_agora)', 'public.store_day(now())'],
    ['mesPeloDiaDoBanco', "date_trunc('month', v_hoje)", "date_trunc('month', p_agora)"],
    ['recortePorStoreDayStart', 'v.paid_at >= public.store_day_start(v_mes)', "v.paid_at >= v_mes::timestamp"],
    ['semanaSeteDias', 'v_hoje - 6', 'v_hoje - 7'],
    ['joiasLimit4', /order by pecas desc, nome\s+limit 4/, 'order by pecas desc, nome\n    limit 5'],
    ['joiasSoDoMes', 'from do_mes m\n    join public.order_items', 'from vendas m\n    join public.order_items'],
    ['joiaOrfaPeloNome', "'nome:' || i.product_name", "'sem produto'"],
    ['recentes4', 'order by o.created_at desc, o.id desc\n    limit 4', 'order by o.created_at desc, o.id desc\n    limit 3'],
    ['clientesPeloVinculo', ' or lower(v.customer_email) = lower(d.email)', ''],
    ['semEscritaDeDado', 'revoke execute', "insert into public.store_settings (key) values ('x');\nrevoke execute"],
    ['qualificado', 'from public.orders o\n  ),\n  recentes', 'from orders o\n  ),\n  recentes'],
  ]

  it.each(casos.map(([r, de, para], i) => [`${i + 1}. ${r}`, r, de, para] as const))('%s', (_rotulo, regua, de, para) => {
    const mutante = mutar(comandos, de, para)
    expect(R[regua](mutante)).toBe(false)
  })

  it('toda régua tem ao menos um sensor', () => {
    const cobertas = new Set(casos.map(([r]) => r))
    expect(Object.keys(R).filter((r) => !cobertas.has(r as keyof typeof R))).toEqual([])
  })

  it('`mutar` lança quando a mutação não acha o alvo', () => {
    expect(() => mutar(comandos, 'texto que não existe', 'x')).toThrow('mutação não encontrou o alvo')
  })

  it('o removedor de comentário não apaga código depois de CRLF', () => {
    expect(semComentario('-- nota\r\nselect 1')).toContain('select 1')
  })
})
