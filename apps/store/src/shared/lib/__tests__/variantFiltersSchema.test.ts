import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FILTER_OPTION_TEXT_MAX,
  FILTER_SUGGEST_TERMS_MAX,
  FILTER_SUGGEST_TERM_MAX,
} from '@estrelinha/core/filters'

/**
 * Feature 67 (VFL-01, 03, 21, 35 e as cascatas) — o guarda entre a migration dos filtros nas
 * variações e o que o TypeScript afirma. Molde de `productFiltersSchema.test.ts`.
 *
 * Errar nisto não quebra nada: um `check` de 12 termos com a tela recusando o 11º passa em build,
 * `tsc` e teste de componente — e a leitura pública da marcação por opção sem o recorte da peça
 * entregaria à loja a curadoria de peça desligada, sem erro em lugar nenhum. Por isso os números são
 * LIDOS do disco e comparados com `@estrelinha/core/filters`, e cada policy é recortada e medida.
 *
 * **Uma régua por comando** (`L-033`): cada tabela, cada policy e a função de validação têm o próprio
 * recorte, nunca um regex sobre a família. **Âncora dupla**: o arquivo tem corpo, e cada recorte
 * devolve algo — o que falha devolve `null` e REPROVA. `mutar()` **lança** quando a mutação não muda
 * nada (sensor cujo alvo sumiu viraria no-op verde).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O caminho por extenso, de propósito: a régua nunca é o objeto medido. */
const MIGRATION = join(ROOT, 'supabase/migrations/20261019120000_67-filtros-nas-variacoes.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/** Comentário não é código; o CRLF é normalizado ANTES, senão o `[^\n]` engole o `\r` (`L-031`). */
const semComentario = (texto: string): string => texto.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')

const LIMPO = semComentario(SQL)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

const MARCA = 'product_option_filter_values'
const RECUSA = 'filter_suggestion_dismissals'
const TABELAS = [MARCA, RECUSA] as const

// -------------------------------------------------------------------------------------------
// As réguas, como predicados
// -------------------------------------------------------------------------------------------

const corpoDaTabela = (texto: string, tabela: string): string | null => {
  const m = texto.match(new RegExp(`create table if not exists public\\.${tabela}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'))
  return m ? m[1] : null
}

const criadasSemIfNotExists = (texto: string): string[] =>
  [...texto.matchAll(/create table\s+(?!if not exists)(?:public\.)?(\w+)/gi)].map(m => m[1])

/** O teto do `check (char_length(coluna) between 1 and N)` da marcação por opção, ou `null`. */
const tetoEntre = (texto: string, coluna: string): number | null => {
  const m = corpoDaTabela(texto, MARCA)?.match(
    new RegExp(`check\\s*\\(\\s*char_length\\(${coluna}\\)\\s+between\\s+1\\s+and\\s+(\\d+)\\s*\\)`, 'i'),
  )
  return m ? Number(m[1]) : null
}

/** O teto do `check (char_length(coluna) <= N)` da recusa, ou `null` (o vazio é o alvo peça toda). */
const tetoDaRecusa = (texto: string, coluna: string): number | null => {
  const m = corpoDaTabela(texto, RECUSA)?.match(new RegExp(`check\\s*\\(\\s*char_length\\(${coluna}\\)\\s*<=\\s*(\\d+)\\s*\\)`, 'i'))
  return m ? Number(m[1]) : null
}

/** A chave primária da tabela, como lista de colunas, ou `null`. */
const chavePrimaria = (texto: string, tabela: string): string[] | null => {
  const m = corpoDaTabela(texto, tabela)?.match(/primary key\s*\(([^)]*)\)/i)
  return m ? m[1].split(',').map(c => c.trim()) : null
}

const cascata = (texto: string, tabela: string, coluna: string, alvo: string): boolean =>
  new RegExp(
    `\\b${coluna}\\s+uuid\\s+not null\\s+references\\s+public\\.${alvo}\\(id\\)\\s+on delete cascade`,
    'i',
  ).test(corpoDaTabela(texto, tabela) ?? '')

const CASCATAS: [string, string, string][] = [
  [MARCA, 'product_id', 'products'],
  [MARCA, 'value_id', 'filter_values'],
  [RECUSA, 'product_id', 'products'],
  [RECUSA, 'value_id', 'filter_values'],
]

/** O alvo da recusa é inteiro: os dois campos vazios juntos ou preenchidos juntos. */
const alvoInteiro = (texto: string): boolean =>
  /check\s*\(\s*\(\s*option_name\s*=\s*''\s*\)\s*=\s*\(\s*option_value\s*=\s*''\s*\)\s*\)/i.test(corpoDaTabela(texto, RECUSA) ?? '')

/** O corpo da função de validação dos termos, ou `null`. */
const funcaoDosTermos = (texto: string): string | null => {
  const m = texto.match(/create or replace function public\.filter_suggest_terms_valid\(t text\[\]\)([\s\S]*?)\$\$([\s\S]*?)\$\$/i)
  return m ? `${m[1]}\n${m[2]}` : null
}

const maxDeTermos = (texto: string): number | null => {
  const m = funcaoDosTermos(texto)?.match(/cardinality\(t\)\s*<=\s*(\d+)/i)
  return m ? Number(m[1]) : null
}

const maxDoTermo = (texto: string): number | null => {
  const m = funcaoDosTermos(texto)?.match(/char_length\(x\)\s+between\s+1\s+and\s+(\d+)/i)
  return m ? Number(m[1]) : null
}

/** A coluna nasce idempotente, não nula e com o vazio como default. */
const colunaDosTermos = (texto: string): boolean =>
  /alter table public\.filter_values\s+add column if not exists suggest_terms text\[\] not null default '\{\}'\s*;/i.test(texto)

/** O `check` da coluna chama a função, e só entra quando ainda não existe (reaplicável). */
const checkDosTermos = (texto: string): boolean => {
  const bloco = texto.match(/do \$\$([\s\S]*?)\$\$;/i)?.[1] ?? ''
  return (
    /if not exists\s*\(\s*select 1 from pg_constraint\s+where conname = 'filter_values_suggest_terms_valid'/i.test(bloco) &&
    /add constraint filter_values_suggest_terms_valid\s+check \(public\.filter_suggest_terms_valid\(suggest_terms\)\)/i.test(bloco)
  )
}

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

const escritaFechada = (p: Policy): boolean => {
  const m = p.corpo.match(/^using\s*\(([\s\S]*?)\)\s*with check\s*\(([\s\S]*)\)\s*$/i)
  return p.papeis.toLowerCase() === 'authenticated' && !!m && HAS_ROLE.test(m[1]) && HAS_ROLE.test(m[2])
}

const escritas = (texto: string): Policy[] => policies(texto).filter(p => p.comando !== 'select')
const leituras = (texto: string): Policy[] => policies(texto).filter(p => p.comando === 'select')
const leituraDe = (texto: string, tabela: string): Policy[] => leituras(texto).filter(p => p.tabela === tabela)

/** A leitura pública da marcação por opção recorta as DUAS coisas: grupo ativo E peça ativa. */
const leituraRecortada = (p: Policy | undefined): { grupo: boolean; peca: boolean } => ({
  grupo: /filter_values v[\s\S]*filter_groups g on g\.id = v\.group_id[\s\S]*v\.id = product_option_filter_values\.value_id[\s\S]*g\.is_active = true/i.test(
    p?.corpo ?? '',
  ),
  peca: /public\.products p[\s\S]*p\.id = product_option_filter_values\.product_id[\s\S]*p\.is_active = true/i.test(p?.corpo ?? ''),
})

/** Qualquer policy em RECUSA que alcance anon, ou um `for select` (a recusa não tem leitura pública). */
const recusaAberta = (texto: string): boolean =>
  policies(texto).some(p => p.tabela === RECUSA && (/\banon\b/i.test(p.papeis) || p.comando === 'select'))

const concedeAnon = (texto: string): boolean => /\bgrant\b[^;]*\banon\b/i.test(texto)

const escreveDado = (texto: string): boolean => /\b(insert\s+into|update\s+public\.|delete\s+from)\b/i.test(texto)

// -------------------------------------------------------------------------------------------

describe('a migration da 67 está onde este teste procura', () => {
  it('o arquivo existe e tem corpo — âncora 1', () => {
    expect(SQL.length).toBeGreaterThan(3000)
    expect(LIMPO.length).toBeGreaterThan(1500)
  })

  it.each([...TABELAS])('o corpo de %s é extraído — âncora 2', tabela => {
    expect(corpoDaTabela(LIMPO, tabela)).not.toBeNull()
  })

  it('a função dos termos é recortada — âncora 3', () => {
    expect(funcaoDosTermos(LIMPO)).not.toBeNull()
  })

  it('as policies são lidas: 1 de leitura e 2 de escrita — âncora 4', () => {
    expect(leituras(LIMPO)).toHaveLength(1)
    expect(escritas(LIMPO)).toHaveLength(2)
  })
})

describe('idempotente: as tabelas, os índices e a coluna', () => {
  it('nenhum create table sem if not exists', () => {
    expect(criadasSemIfNotExists(LIMPO)).toEqual([])
  })

  it('sensor — sem o if not exists, a régua acusa a tabela', () => {
    const mutante = mutar(LIMPO, `create table if not exists public.${RECUSA}`, `create table public.${RECUSA}`)
    expect(criadasSemIfNotExists(mutante)).toEqual([RECUSA])
  })

  it('os dois índices por valor também', () => {
    expect(LIMPO).toMatch(/create index if not exists pofv_value_idx\s+on public\.product_option_filter_values\s*\(value_id\)/i)
    expect(LIMPO).toMatch(/create index if not exists fsd_value_idx\s+on public\.filter_suggestion_dismissals\s*\(value_id\)/i)
  })

  it('a coluna suggest_terms: add column if not exists, não nula, default vazio', () => {
    expect(colunaDosTermos(LIMPO)).toBe(true)
  })

  it('sensor — sem o if not exists da coluna, a régua acusa', () => {
    const mutante = mutar(LIMPO, 'add column if not exists suggest_terms', 'add column suggest_terms')
    expect(colunaDosTermos(mutante)).toBe(false)
  })

  it('o check da coluna chama a função e só entra se não existir', () => {
    expect(checkDosTermos(LIMPO)).toBe(true)
  })

  it('sensor — o add constraint solto (sem o pg_constraint) é acusado', () => {
    const mutante = mutar(LIMPO, /if not exists \(\s*select 1 from pg_constraint/i, 'if true or exists (select 1 from pg_constraint')
    expect(checkDosTermos(mutante)).toBe(false)
  })
})

describe('VFL-01/03 — a identidade da marcação por opção', () => {
  it('a chave primária é (peça, eixo, texto, valor): marcar de novo é no-op', () => {
    expect(chavePrimaria(LIMPO, MARCA)).toEqual(['product_id', 'option_name', 'option_value', 'value_id'])
  })

  it('sensor — uma chave sem o texto é acusada', () => {
    const mutante = mutar(LIMPO, 'primary key (product_id, option_name, option_value, value_id)', 'primary key (product_id, option_name, value_id)')
    expect(chavePrimaria(mutante, MARCA)).not.toEqual(['product_id', 'option_name', 'option_value', 'value_id'])
  })

  it.each(['option_name', 'option_value'])('o check de %s é igual a FILTER_OPTION_TEXT_MAX', coluna => {
    expect(tetoEntre(LIMPO, coluna)).toBe(FILTER_OPTION_TEXT_MAX)
  })

  it('e o número é 120 — a constante não pode ter andado junto com o SQL por acidente', () => {
    expect(FILTER_OPTION_TEXT_MAX).toBe(120)
  })

  it('sensor — 121 no texto diverge da constante', () => {
    const mutante = mutar(LIMPO, /char_length\(option_value\) between 1 and 120/i, 'char_length(option_value) between 1 and 121')
    expect(tetoEntre(mutante, 'option_value')).not.toBe(FILTER_OPTION_TEXT_MAX)
  })

  it('sensor — sem o check do eixo, a extração devolve null', () => {
    const mutante = mutar(LIMPO, /\s+constraint pofv_option_name_len check \(char_length\(option_name\) between 1 and 120\)/i, '')
    expect(tetoEntre(mutante, 'option_name')).toBeNull()
  })
})

describe('VFL-21 — a recusa é por alvo, e o alvo é inteiro', () => {
  it('a chave primária é (peça, valor, eixo, texto)', () => {
    expect(chavePrimaria(LIMPO, RECUSA)).toEqual(['product_id', 'value_id', 'option_name', 'option_value'])
  })

  it.each(['option_name', 'option_value'])('o teto de %s na recusa é o mesmo FILTER_OPTION_TEXT_MAX', coluna => {
    expect(tetoDaRecusa(LIMPO, coluna)).toBe(FILTER_OPTION_TEXT_MAX)
  })

  it('o par vazio é o alvo peça toda: os dois campos vazios juntos ou preenchidos juntos', () => {
    expect(alvoInteiro(LIMPO)).toBe(true)
  })

  it('sensor — sem o check do alvo, a régua acusa', () => {
    const mutante = mutar(LIMPO, /,\s*constraint fsd_target_whole check \(\(option_name = ''\) = \(option_value = ''\)\)/i, '')
    expect(alvoInteiro(mutante)).toBe(false)
  })
})

describe('VFL-35 — os termos: o banco recusa o mesmo limite que core', () => {
  it('até FILTER_SUGGEST_TERMS_MAX termos', () => {
    expect(maxDeTermos(LIMPO)).toBe(FILTER_SUGGEST_TERMS_MAX)
    expect(FILTER_SUGGEST_TERMS_MAX).toBe(10)
  })

  it('cada um de 1 a FILTER_SUGGEST_TERM_MAX caracteres', () => {
    expect(maxDoTermo(LIMPO)).toBe(FILTER_SUGGEST_TERM_MAX)
    expect(FILTER_SUGGEST_TERM_MAX).toBe(40)
  })

  it('sensor — 12 termos no banco diverge de core', () => {
    const mutante = mutar(LIMPO, /cardinality\(t\) <= 10/, 'cardinality(t) <= 12')
    expect(maxDeTermos(mutante)).not.toBe(FILTER_SUGGEST_TERMS_MAX)
  })

  it('sensor — 41 por termo diverge de core', () => {
    const mutante = mutar(LIMPO, /char_length\(x\) between 1 and 40/, 'char_length(x) between 1 and 41')
    expect(maxDoTermo(mutante)).not.toBe(FILTER_SUGGEST_TERM_MAX)
  })

  it('a função é imutável e de search_path vazio', () => {
    const f = funcaoDosTermos(LIMPO) ?? ''
    expect(f).toMatch(/\bimmutable\b/i)
    expect(f).toMatch(/set search_path = ''/i)
  })
})

describe('as cascatas são o ciclo de vida (peça apagada, valor apagado)', () => {
  it.each(CASCATAS)('%s.%s → %s on delete cascade', (tabela, coluna, alvo) => {
    expect(cascata(LIMPO, tabela, coluna, alvo)).toBe(true)
  })

  it('sensor — uma FK sem cascade é acusada', () => {
    const corpo = corpoDaTabela(LIMPO, RECUSA)!
    const mutante = mutar(LIMPO, corpo, corpo.replace('references public.filter_values(id) on delete cascade', 'references public.filter_values(id)'))
    expect(cascata(mutante, RECUSA, 'value_id', 'filter_values')).toBe(false)
  })

  it('sensor — on delete set null também é acusado', () => {
    const corpo = corpoDaTabela(LIMPO, MARCA)!
    const mutante = mutar(LIMPO, corpo, corpo.replace('references public.products(id) on delete cascade', 'references public.products(id) on delete set null'))
    expect(cascata(mutante, MARCA, 'product_id', 'products')).toBe(false)
  })
})

describe('RLS — o molde da 66', () => {
  it.each([...TABELAS])('RLS ligado em %s', tabela => {
    expect(rlsLigado(LIMPO, tabela)).toBe(true)
  })

  it('sensor — sem o enable, a régua acusa', () => {
    const mutante = mutar(LIMPO, /alter table public\.filter_suggestion_dismissals\s+enable row level security;/, '')
    expect(rlsLigado(mutante, RECUSA)).toBe(false)
  })

  it('toda escrita é `to authenticated` com has_role no using E no with check, uma por tabela', () => {
    const lista = escritas(LIMPO)
    expect(lista.map(p => p.tabela).sort()).toEqual([...TABELAS].sort())
    for (const p of lista) expect(escritaFechada(p)).toBe(true)
  })

  it('sensor — o with check omitido (a meia-correção) é acusado', () => {
    const mutante = mutar(
      LIMPO,
      /(create policy "admin full product option filter values"[\s\S]*?using \(public\.has_role\(auth\.uid\(\), 'admin'\)\))\s*with check \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/,
      '$1',
    )
    expect(escritas(mutante).every(escritaFechada)).toBe(false)
  })

  it('sensor — o with check que vira `true` é acusado', () => {
    const mutante = mutar(
      LIMPO,
      /(create policy "admin full filter suggestion dismissals"[\s\S]*?)with check \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/,
      '$1with check (true)',
    )
    expect(escritas(mutante).every(escritaFechada)).toBe(false)
  })
})

describe('a leitura pública: a marcação por opção só de grupo ativo E peça ativa; a recusa, nenhuma', () => {
  it('uma leitura só, e ela é da marcação por opção, para anon e authenticated', () => {
    const [p] = leituraDe(LIMPO, MARCA)
    expect(leituras(LIMPO).map(x => x.tabela)).toEqual([MARCA])
    expect(p.papeis).toBe('anon, authenticated')
  })

  it('o recorte tem as DUAS condições', () => {
    expect(leituraRecortada(leituraDe(LIMPO, MARCA)[0])).toEqual({ grupo: true, peca: true })
  })

  it('sensor — sem o recorte da peça, a régua acusa', () => {
    const mutante = mutar(LIMPO, /\s+and p\.is_active = true/, '')
    expect(leituraRecortada(leituraDe(mutante, MARCA)[0]).peca).toBe(false)
  })

  it('sensor — sem o recorte do grupo, a régua acusa', () => {
    const mutante = mutar(LIMPO, /\s+and g\.is_active = true/, '')
    expect(leituraRecortada(leituraDe(mutante, MARCA)[0]).grupo).toBe(false)
  })

  it('a recusa não tem leitura pública nem alcança anon', () => {
    expect(recusaAberta(LIMPO)).toBe(false)
  })

  it('sensor — um `for select … using (true)` na recusa é acusado', () => {
    const mutante = mutar(
      LIMPO,
      /alter table public\.filter_suggestion_dismissals enable row level security;/,
      `alter table public.filter_suggestion_dismissals enable row level security;\ncreate policy "x" on public.${RECUSA} for select to anon, authenticated using (true);`,
    )
    expect(recusaAberta(mutante)).toBe(true)
  })

  it('sensor — a escrita da recusa estendida a anon é acusada', () => {
    const mutante = mutar(LIMPO, /(create policy "admin full filter suggestion dismissals" on public\.filter_suggestion_dismissals\s+for all to) authenticated/, '$1 anon, authenticated')
    expect(recusaAberta(mutante)).toBe(true)
  })
})

describe('a migration não abre nada e não escreve nada', () => {
  it('nenhum grant alcança anon', () => {
    expect(concedeAnon(LIMPO)).toBe(false)
  })

  it('sensor — um grant a anon é acusado', () => {
    const mutante = mutar(LIMPO, /alter table public\.product_option_filter_values enable/, 'grant select on public.filter_suggestion_dismissals to anon;\nalter table public.product_option_filter_values enable')
    expect(concedeAnon(mutante)).toBe(true)
  })

  it('nenhuma escrita de dado', () => {
    expect(escreveDado(LIMPO)).toBe(false)
  })

  it('sensor — um insert e um update são acusados', () => {
    const ins = mutar(LIMPO, /alter table public\.product_option_filter_values enable/, "insert into public.filter_suggestion_dismissals (product_id, value_id) values (null, null);\nalter table public.product_option_filter_values enable")
    const upd = mutar(LIMPO, /alter table public\.product_option_filter_values enable/, "update public.filter_values set suggest_terms = '{}';\nalter table public.product_option_filter_values enable")
    expect(escreveDado(ins)).toBe(true)
    expect(escreveDado(upd)).toBe(true)
  })

  it('sensor — a prosa do cabeçalho não entra na medição (CRLF e LF)', () => {
    const prosa = '-- aqui se explica que nenhum grant to anon e nenhum insert into public.x entram\n'
    expect(escreveDado(semComentario(prosa))).toBe(false)
    expect(concedeAnon(semComentario(prosa.replace(/\n/g, '\r\n')))).toBe(false)
  })
})
