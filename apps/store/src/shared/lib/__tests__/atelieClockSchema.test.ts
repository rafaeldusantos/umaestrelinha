import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature `74` — `atelie_clock`, a confirmação de papel que o app do
 * celular faz em paralelo com cada leitura de pedido (`MAP-36`, `MAP-37`, `MAP-53`, `AD-058`).
 *
 * Molde de `overviewSchema.test.ts`, pelo mesmo motivo: **afrouxar uma migration não quebra nada**.
 * A função sem a recusa (toda conta logada passaria a "confirmar" o papel e a lista desenharia os
 * pedidos da cliente como se fossem a fila da loja), `execute` a `anon`, um `search_path` aberto, ou
 * uma leitura de tabela entrando de carona — tudo aplica limpo e passa em build, `tsc` e teste.
 *
 * **Uma régua por COMANDO** (`L-033`), cada uma um predicado exercido também contra texto mutado, e
 * `mutar()` **lança** quando a mutação não muda nada. As mutações partem do SQL **sem comentário**.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261024120000_74-relogio-do-atelie.sql')

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
  const inicio = c.search(/create\s+or\s+replace\s+function\s+public\.atelie_clock\s*\(/i)
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

const papeis = (texto: string, verbo: 'grant' | 'revoke'): string[] => {
  const prep = verbo === 'grant' ? 'to' : 'from'
  const re = new RegExp(
    `\\b${verbo}\\s+[\\w\\s,]+?\\s+on\\s+function\\s+public\\.atelie_clock(?:\\s*\\([^)]*\\))?\\s+${prep}\\s+([^;]+);`,
    'gi',
  )
  return [...semComentario(texto).matchAll(re)].flatMap(m => m[1].split(',').map(p => p.trim().toLowerCase()))
}

// -------------------------------------------------------------------------------------------
// As réguas — cada uma devolve `true` quando a migration está certa
// -------------------------------------------------------------------------------------------

const R = {
  definer: (t: string) => /\bsecurity\s+definer\b/i.test(bloco(t) ?? ''),
  searchPath: (t: string) => /set\s+search_path\s*=\s*''/i.test(bloco(t) ?? ''),
  stable: (t: string) => /language\s+plpgsql\s+stable\b/i.test(bloco(t) ?? ''),
  /** Sem argumento: não há dia a decidir, só a recusa e o instante. */
  semArgumento: (t: string) => /create\s+or\s+replace\s+function\s+public\.atelie_clock\s*\(\s*\)/i.test(bloco(t) ?? ''),
  /**
   * A recusa é o PRIMEIRO comando do corpo — antes do `return` e de qualquer outra coisa. Sem
   * leitura de tabela para servir de referência (não há nenhuma), a régua é posição: o `if not
   * has_role … 42501` vem logo depois do `begin`.
   */
  recusaPrimeiro: (t: string) =>
    /\bbegin\s+if\s+not\s+public\.has_role\(\s*auth\.uid\(\)\s*,\s*'admin'\s*\)\s+then\s+raise\s+exception\s+'[^']+'\s+using\s+errcode\s*=\s*'42501'\s*;\s*end\s+if\s*;/i.test(
      corpo(t) ?? '',
    ),
  /** Devolve só o instante do banco, na chave que o app lê. */
  devolveLidoEm: (t: string) => /return\s+jsonb_build_object\(\s*'lido_em'\s*,\s*now\(\)\s*\)\s*;/i.test(corpo(t) ?? ''),
  /** Nenhuma tabela lida: o corpo não tem `from`, nem `join`, nem `select`. */
  semLeituraDeTabela: (t: string) => !/\b(from|join|select)\b/i.test(corpo(t) ?? 'from'),
  revoke: (t: string) => ['public', 'anon'].every(p => papeis(t, 'revoke').includes(p)),
  grantSoAuthenticated: (t: string) => {
    const g = papeis(t, 'grant')
    return g.length === 1 && g[0] === 'authenticated'
  },
  semEscritaDeDado: (t: string) => !/\b(insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i.test(semComentario(t)),
  qualificado: (t: string) => !/(?<![\w.])has_role\b/i.test((corpo(t) ?? 'has_role').replace(/'[^']*'/g, "''")),
}

// -------------------------------------------------------------------------------------------

describe('a migration da 74 — âncora', () => {
  it('o arquivo foi lido, e a função e o corpo foram achados', () => {
    expect(sql.length).toBeGreaterThan(300)
    expect(bloco(sql)).not.toBeNull()
    expect(corpo(sql)).not.toBeNull()
    expect(papeis(sql, 'grant').length).toBeGreaterThan(0)
    expect(papeis(sql, 'revoke').length).toBeGreaterThan(0)
  })
})

describe('a migration da 74 — uma régua por comando', () => {
  it.each(Object.keys(R))('%s', nome => {
    expect(R[nome as keyof typeof R](sql)).toBe(true)
  })
})

describe('sensores — cada régua reprova a mutação que existe para recusar', () => {
  const casos: [keyof typeof R, string | RegExp, string][] = [
    ['definer', /security\s+definer/i, 'security invoker'],
    ['searchPath', "set search_path = ''", ''],
    ['searchPath', "set search_path = ''", 'set search_path = public'],
    ['stable', /language plpgsql\s+stable/i, 'language plpgsql volatile'],
    ['semArgumento', 'public.atelie_clock()\nreturns', 'public.atelie_clock(p_agora timestamptz default now())\nreturns'],
    ['recusaPrimeiro', "errcode = '42501'", "errcode = 'P0001'"],
    ['recusaPrimeiro', "if not public.has_role(auth.uid(), 'admin') then", 'if false then'],
    ['recusaPrimeiro', "if not public.has_role(auth.uid(), 'admin') then", "if not public.has_role(auth.uid(), 'customer') then"],
    ['recusaPrimeiro', 'begin\n  if not', "begin\n  perform 1;\n  if not"],
    ['devolveLidoEm', "'lido_em', now()", "'agora', now()"],
    ['semLeituraDeTabela', "return jsonb_build_object('lido_em', now());", "return (select jsonb_build_object('lido_em', max(created_at)) from public.orders);"],
    ['revoke', 'from public, anon;', 'from public;'],
    ['grantSoAuthenticated', 'to authenticated;', 'to authenticated, anon;'],
    ['grantSoAuthenticated', 'to authenticated;', 'to public;'],
    ['semEscritaDeDado', 'revoke execute', "insert into public.store_settings (key) values ('x');\nrevoke execute"],
    ['semEscritaDeDado', 'revoke execute', "delete from public.orders;\nrevoke execute"],
    ['qualificado', 'not public.has_role(', 'not has_role('],
  ]

  it.each(casos.map(([r, de, para], i) => [`${i + 1}. ${r}`, r, de, para] as const))('%s', (_rotulo, regua, de, para) => {
    const mutante = mutar(comandos, de, para)
    expect(R[regua](mutante)).toBe(false)
  })

  it('toda régua tem ao menos um sensor', () => {
    const cobertas = new Set(casos.map(([r]) => r))
    expect(Object.keys(R).filter(r => !cobertas.has(r as keyof typeof R))).toEqual([])
  })

  it('`mutar` lança quando a mutação não acha o alvo', () => {
    expect(() => mutar(comandos, 'texto que não existe', 'x')).toThrow('mutação não encontrou o alvo')
  })

  it('o removedor de comentário não apaga código depois de CRLF, nem depois de LF', () => {
    expect(semComentario('-- nota\r\nselect 1')).toContain('select 1')
    expect(semComentario('-- nota\nselect 1')).toContain('select 1')
  })

  it('o comentário do topo, que CITA leitura de tabela em prosa, não conta como leitura', () => {
    // O cabeçalho da migration fala em "leitura de tabela" e "devolve ... os pedidos": a régua lê o
    // corpo SEM comentário, e um comentário dentro do corpo também não a reprova.
    const comNota = mutar(comandos, 'begin\n', 'begin\n  -- nada vem from public.orders aqui\n')
    expect(R.semLeituraDeTabela(comNota)).toBe(true)
  })
})
