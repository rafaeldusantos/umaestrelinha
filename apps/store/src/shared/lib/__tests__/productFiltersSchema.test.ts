import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FILTER_NAME_MAX,
  FILTER_SLUG_PATTERN,
  RESERVED_FILTER_KEYS,
  RESERVED_FILTER_KEY_PREFIX,
} from '@estrelinha/core/filters'

/**
 * Feature 66 (FLT-04, FLT-07..09, FLT-35..38) — o guarda entre a migration dos filtros de produto e
 * o que o TypeScript afirma.
 *
 * A propriedade ruim de sempre: **errar nisto não quebra nada.** Um `check` de 45 com a tela contando
 * até 40, ou uma chave reservada que o banco aceita e `core` recusa, passa em build, `tsc` e teste de
 * componente. Por isso os números e a lista são LIDOS do disco e comparados com `@estrelinha/core/filters`.
 *
 * **Âncora dupla**: o arquivo é encontrado (corpo mínimo) **e** cada extração devolve algo — uma que
 * falha devolve `null`/vazio e REPROVA, em vez de virar comparação contra o nada.
 *
 * Cada régua é um **predicado**, para a asserção e o sensor chamarem a mesma função; o `mutar()`
 * **lança** quando a mutação não muda nada (um sensor cujo alvo sumiu viraria no-op).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O caminho por extenso, de propósito: a régua nunca é o objeto medido. */
const MIGRATION = join(ROOT, 'supabase/migrations/20261018120000_66-filtros-de-produto.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/** Comentário não é código: o cabeçalho explica em prosa o que a migration NÃO faz. */
const semComentario = (texto: string): string => texto.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')

const LIMPO = semComentario(SQL)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

const TABELAS = ['filter_groups', 'filter_values', 'product_filter_values', 'category_hidden_filter_groups'] as const

// -------------------------------------------------------------------------------------------
// As réguas, como predicados
// -------------------------------------------------------------------------------------------

/** O corpo do `create table` da tabela, ou `null`. */
const corpoDaTabela = (texto: string, tabela: string): string | null => {
  const m = texto.match(new RegExp(`create table if not exists public\\.${tabela}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'))
  return m ? m[1] : null
}

/** Tabelas criadas SEM `if not exists`. */
const criadasSemIfNotExists = (texto: string): string[] =>
  [...texto.matchAll(/create table\s+(?!if not exists)(?:public\.)?(\w+)/gi)].map(m => m[1])

/** O número do `check` de comprimento do nome numa tabela, ou `null`. */
const limiteDoNome = (texto: string, tabela: string): number | null => {
  const corpo = corpoDaTabela(texto, tabela)
  const m = corpo?.match(/check\s*\(\s*char_length\(name\)\s+between\s+1\s+and\s+(\d+)\s*\)/i)
  return m ? Number(m[1]) : null
}

/** O regex do `check` de formato do slug numa tabela, ou `null`. */
const formatoDoSlug = (texto: string, tabela: string): string | null => {
  const corpo = corpoDaTabela(texto, tabela)
  const m = corpo?.match(/check\s*\(\s*slug\s*~\s*'([^']+)'\s*\)/i)
  return m ? m[1] : null
}

/** As chaves do `slug not in (...)` de `filter_groups`, ordenadas. Vazio quando não há. */
const reservadasDoCheck = (texto: string): string[] => {
  const corpo = corpoDaTabela(texto, 'filter_groups')
  const m = corpo?.match(/slug not in\s*\(([^)]*)\)/i)
  if (!m) return []
  return [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]).sort()
}

/** O prefixo do `slug not like '…%'` de `filter_groups` (com o escape desfeito), ou `null`. */
const prefixoReservado = (texto: string): string | null => {
  const corpo = corpoDaTabela(texto, 'filter_groups')
  const m = corpo?.match(/and\s+slug not like\s+'([^']*)%'/i)
  return m ? m[1].replace(/\\(.)/g, '$1') : null
}

/** `slug` único em `filter_groups`, e `(group_id, slug)` único em `filter_values`. */
const unicidades = (texto: string): { grupo: boolean; valor: boolean } => ({
  grupo: /slug text not null\s+constraint \w+ unique\b/i.test(corpoDaTabela(texto, 'filter_groups') ?? ''),
  valor: /unique\s*\(\s*group_id\s*,\s*slug\s*\)/i.test(corpoDaTabela(texto, 'filter_values') ?? ''),
})

/** A FK `coluna → alvo` na tabela tem `on delete cascade`. */
const cascata = (texto: string, tabela: string, coluna: string, alvo: string): boolean =>
  new RegExp(
    `\\b${coluna}\\s+uuid\\s+not null\\s+references\\s+public\\.${alvo}\\(id\\)\\s+on delete cascade`,
    'i',
  ).test(corpoDaTabela(texto, tabela) ?? '')

const CASCATAS: [string, string, string][] = [
  ['filter_values', 'group_id', 'filter_groups'],
  ['product_filter_values', 'product_id', 'products'],
  ['product_filter_values', 'value_id', 'filter_values'],
  ['category_hidden_filter_groups', 'category_id', 'categories'],
  ['category_hidden_filter_groups', 'group_id', 'filter_groups'],
]

const rlsLigado = (texto: string, tabela: string): boolean =>
  new RegExp(`alter table public\\.${tabela}\\s+enable row level security\\s*;`, 'i').test(texto)

interface Policy {
  tabela: string
  comando: string
  papeis: string
  corpo: string
}

const policies = (texto: string): Policy[] =>
  texto
    .split(';')
    .map(s => s.trim())
    .filter(s => /^create policy/i.test(s))
    .map(s => {
      const m = s.match(/^create policy\s+"[^"]+"\s+on\s+public\.(\w+)\s+for\s+(\w+)\s+to\s+([\w\s,]+?)\s+(using[\s\S]*)$/i)
      return m ? { tabela: m[1], comando: m[2].toLowerCase(), papeis: m[3].trim(), corpo: m[4] } : null
    })
    .filter((p): p is Policy => p !== null)

const HAS_ROLE = /public\.has_role\(auth\.uid\(\),\s*'admin'\)/i

/** Uma policy de escrita está fechada: `to authenticated` e `has_role` no `using` E no `with check`. */
const escritaFechada = (p: Policy): boolean => {
  const m = p.corpo.match(/^using\s*\(([\s\S]*?)\)\s*with check\s*\(([\s\S]*)\)\s*$/i)
  return p.papeis.toLowerCase() === 'authenticated' && !!m && HAS_ROLE.test(m[1]) && HAS_ROLE.test(m[2])
}

const escritas = (texto: string): Policy[] => policies(texto).filter(p => p.comando !== 'select')
const leituras = (texto: string): Policy[] => policies(texto).filter(p => p.comando === 'select')
const leituraDe = (texto: string, tabela: string): Policy | undefined => leituras(texto).find(p => p.tabela === tabela)

const concedeAnon = (texto: string): boolean => /\bgrant\b[^;]*\banon\b/i.test(texto)

const escreveDado = (texto: string): boolean => /\b(insert\s+into|update\s+public\.|delete\s+from)\b/i.test(texto)

// -------------------------------------------------------------------------------------------

describe('a migration da 66 está onde este teste procura', () => {
  it('o arquivo existe e tem corpo — âncora 1', () => {
    expect(SQL.length).toBeGreaterThan(3000)
    expect(LIMPO.length).toBeGreaterThan(2000)
  })

  it.each([...TABELAS])('o corpo de %s é extraído — âncora 2', tabela => {
    expect(corpoDaTabela(LIMPO, tabela)).not.toBeNull()
  })

  it('as policies são lidas: 4 de leitura e 4 de escrita — âncora 3', () => {
    expect(leituras(LIMPO)).toHaveLength(4)
    expect(escritas(LIMPO)).toHaveLength(4)
  })
})

describe('as quatro tabelas nascem de forma idempotente', () => {
  it('nenhum create table sem if not exists', () => {
    expect(criadasSemIfNotExists(LIMPO)).toEqual([])
  })

  it('sensor — sem o if not exists, a régua acusa a tabela', () => {
    const mutante = mutar(LIMPO, 'create table if not exists public.filter_values', 'create table public.filter_values')
    expect(criadasSemIfNotExists(mutante)).toEqual(['filter_values'])
  })

  it('o índice por valor também', () => {
    expect(LIMPO).toMatch(/create index if not exists product_filter_values_value_idx\s+on public\.product_filter_values\s*\(value_id\)/i)
  })
})

describe('FLT-03/06 — o limite do nome tem dois escritos e UM número', () => {
  it.each(['filter_groups', 'filter_values'])('o check de %s é igual a FILTER_NAME_MAX', tabela => {
    expect(limiteDoNome(LIMPO, tabela)).toBe(FILTER_NAME_MAX)
  })

  it('e o número é 40 — a constante não pode ter andado junto com o SQL por acidente', () => {
    expect(FILTER_NAME_MAX).toBe(40)
  })

  it('sensor — 41 no grupo diverge da constante', () => {
    const mutante = mutar(LIMPO, /between 1 and 40/i, 'between 1 and 41')
    expect(limiteDoNome(mutante, 'filter_groups')).not.toBe(FILTER_NAME_MAX)
  })

  it('sensor — sem o check do valor, a extração devolve null', () => {
    const corpo = corpoDaTabela(LIMPO, 'filter_values')!
    const mutante = mutar(LIMPO, corpo, corpo.replace(/check \(char_length\(name\) between 1 and 40\)/i, ''))
    expect(limiteDoNome(mutante, 'filter_values')).toBeNull()
  })
})

describe('FLT-04 — o formato do slug é o de core, nas duas tabelas', () => {
  it.each(['filter_groups', 'filter_values'])('o regex do check de %s é FILTER_SLUG_PATTERN', tabela => {
    expect(formatoDoSlug(LIMPO, tabela)).toBe(FILTER_SLUG_PATTERN.source)
  })

  it('sensor — um regex que aceita sublinhado diverge', () => {
    const mutante = mutar(LIMPO, "'^[a-z0-9]+(-[a-z0-9]+)*$'", "'^[a-z0-9_]+(-[a-z0-9]+)*$'")
    expect(formatoDoSlug(mutante, 'filter_groups')).not.toBe(FILTER_SLUG_PATTERN.source)
  })
})

describe('FLT-04 — as chaves reservadas: o banco e core recusam a MESMA lista', () => {
  it('a lista do check é igual a RESERVED_FILTER_KEYS, nos dois sentidos', () => {
    expect(reservadasDoCheck(LIMPO)).toEqual([...RESERVED_FILTER_KEYS].sort())
  })

  it('o prefixo de campanha é o de core', () => {
    expect(prefixoReservado(LIMPO)).toBe(RESERVED_FILTER_KEY_PREFIX)
    expect(RESERVED_FILTER_KEY_PREFIX).toBe('utm_')
  })

  it('o sublinhado do prefixo está escapado — sem o escape, `_` casa qualquer caractere', () => {
    expect(LIMPO).toMatch(/slug not like 'utm\\_%'/)
  })

  it('sensor — uma chave a menos no banco é acusada', () => {
    const mutante = mutar(LIMPO, "'pagina', ", '')
    expect(reservadasDoCheck(mutante)).not.toEqual([...RESERVED_FILTER_KEYS].sort())
  })

  it('sensor — uma chave a mais no banco é acusada', () => {
    const mutante = mutar(LIMPO, "'fbclid')", "'fbclid', 'cor')")
    expect(reservadasDoCheck(mutante)).not.toEqual([...RESERVED_FILTER_KEYS].sort())
  })

  it('sensor — sem o not like, o prefixo some', () => {
    const mutante = mutar(LIMPO, /\s+and slug not like 'utm\\_%'/, '')
    expect(prefixoReservado(mutante)).toBeNull()
  })
})

describe('FLT-04/06 — a unicidade do slug', () => {
  it('slug único no grupo, e (group_id, slug) único no valor', () => {
    expect(unicidades(LIMPO)).toEqual({ grupo: true, valor: true })
  })

  it('sensor — sem o unique do grupo, a régua acusa', () => {
    const mutante = mutar(LIMPO, /constraint filter_groups_slug_key unique\n/, '')
    expect(unicidades(mutante).grupo).toBe(false)
  })

  it('sensor — sem o unique composto do valor, a régua acusa', () => {
    const mutante = mutar(LIMPO, /,\s*constraint filter_values_group_slug_key unique \(group_id, slug\)/, '')
    expect(unicidades(mutante).valor).toBe(false)
  })
})

describe('FLT-07/08/38 — as cascatas são o ciclo de vida', () => {
  it.each(CASCATAS)('%s.%s → %s on delete cascade', (tabela, coluna, alvo) => {
    expect(cascata(LIMPO, tabela, coluna, alvo)).toBe(true)
  })

  it('sensor — uma FK sem cascade é acusada', () => {
    const mutante = mutar(
      LIMPO,
      'value_id uuid not null references public.filter_values(id) on delete cascade',
      'value_id uuid not null references public.filter_values(id)',
    )
    expect(cascata(mutante, 'product_filter_values', 'value_id', 'filter_values')).toBe(false)
  })

  it('sensor — on delete set null também é acusado', () => {
    const mutante = mutar(
      LIMPO,
      'category_id uuid not null references public.categories(id) on delete cascade',
      'category_id uuid not null references public.categories(id) on delete set null',
    )
    expect(cascata(mutante, 'category_hidden_filter_groups', 'category_id', 'categories')).toBe(false)
  })
})

describe('RLS — o molde da feature 24', () => {
  it.each([...TABELAS])('RLS ligado em %s', tabela => {
    expect(rlsLigado(LIMPO, tabela)).toBe(true)
  })

  it('sensor — sem o enable, a régua acusa', () => {
    const mutante = mutar(LIMPO, /alter table public\.product_filter_values\s+enable row level security;/, '')
    expect(rlsLigado(mutante, 'product_filter_values')).toBe(false)
  })

  it('toda policy de escrita é `to authenticated` com has_role no using E no with check, uma por tabela', () => {
    const lista = escritas(LIMPO)
    expect(lista.map(p => p.tabela).sort()).toEqual([...TABELAS].sort())
    for (const p of lista) expect(escritaFechada(p)).toBe(true)
  })

  it('sensor — o with check omitido (a meia-correção) é acusado', () => {
    const mutante = mutar(
      LIMPO,
      /(create policy "admin full filter values"[\s\S]*?using \(public\.has_role\(auth\.uid\(\), 'admin'\)\))\s*with check \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/,
      '$1',
    )
    expect(escritas(mutante).every(escritaFechada)).toBe(false)
  })

  it('sensor — escrita `to anon, authenticated` é acusada', () => {
    const mutante = mutar(
      LIMPO,
      /(create policy "admin full filter groups" on public\.filter_groups\s+for all to) authenticated/,
      '$1 anon, authenticated',
    )
    expect(escritas(mutante).every(escritaFechada)).toBe(false)
  })

  it('sensor — o with check que vira `true` é acusado', () => {
    const mutante = mutar(
      LIMPO,
      /(create policy "admin full category hidden filter groups"[\s\S]*?)with check \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/,
      '$1with check (true)',
    )
    expect(escritas(mutante).every(escritaFechada)).toBe(false)
  })
})

describe('FLT-09/21 — a leitura pública só vê o que está ligado', () => {
  it('grupo: só is_active', () => {
    expect(leituraDe(LIMPO, 'filter_groups')?.corpo).toMatch(/^using\s*\(\s*is_active = true\s*\)$/i)
  })

  it('sensor — leitura do grupo sem condição é acusada', () => {
    const mutante = mutar(LIMPO, /using \(is_active = true\)/, 'using (true)')
    expect(leituraDe(mutante, 'filter_groups')?.corpo).not.toMatch(/is_active = true/i)
  })

  it('valor: só de grupo ativo', () => {
    expect(leituraDe(LIMPO, 'filter_values')?.corpo).toMatch(
      /filter_groups g[\s\S]*g\.id = filter_values\.group_id[\s\S]*g\.is_active = true/i,
    )
  })

  it('marcação: grupo ativo E produto ativo', () => {
    const corpo = leituraDe(LIMPO, 'product_filter_values')?.corpo ?? ''
    expect(corpo).toMatch(/g\.is_active = true/i)
    expect(corpo).toMatch(/public\.products p[\s\S]*p\.id = product_filter_values\.product_id[\s\S]*p\.is_active = true/i)
  })

  it('sensor — sem o recorte do produto, a régua da marcação reprova', () => {
    const mutante = mutar(LIMPO, /and p\.is_active = true/, '')
    expect(leituraDe(mutante, 'product_filter_values')?.corpo).not.toMatch(/p\.is_active = true/i)
  })

  it('o escondido é lido inteiro, por anon e authenticated', () => {
    const p = leituraDe(LIMPO, 'category_hidden_filter_groups')
    expect(p?.corpo).toMatch(/^using\s*\(\s*true\s*\)$/i)
    expect(p?.papeis).toBe('anon, authenticated')
  })
})

describe('a migration não abre nada e não escreve nada', () => {
  it('nenhum grant alcança anon', () => {
    expect(concedeAnon(LIMPO)).toBe(false)
  })

  it('sensor — um grant de insert a anon é acusado', () => {
    const mutante = mutar(LIMPO, /alter table public\.filter_groups\s+enable/, 'grant insert on public.filter_groups to anon;\nalter table public.filter_groups enable')
    expect(concedeAnon(mutante)).toBe(true)
  })

  it('nenhuma escrita de dado', () => {
    expect(escreveDado(LIMPO)).toBe(false)
  })

  it('sensor — um insert é acusado', () => {
    const mutante = mutar(
      LIMPO,
      /alter table public\.filter_groups\s+enable/,
      "insert into public.filter_groups (name, slug) values ('Acabamento', 'acabamento');\nalter table public.filter_groups enable",
    )
    expect(escreveDado(mutante)).toBe(true)
  })

  it('sensor — um update é acusado', () => {
    const mutante = mutar(LIMPO, /alter table public\.filter_groups\s+enable/, "update public.products set tags = '{}';\nalter table public.filter_groups enable")
    expect(escreveDado(mutante)).toBe(true)
  })

  it('sensor — a prosa do cabeçalho não entra na medição (CRLF e LF)', () => {
    const prosa = '-- aqui se explica que nenhum grant to anon e nenhum insert into public.x entram\n'
    expect(escreveDado(semComentario(prosa))).toBe(false)
    expect(concedeAnon(semComentario(prosa.replace(/\n/g, '\r\n')))).toBe(false)
  })
})
