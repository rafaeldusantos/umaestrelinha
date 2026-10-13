import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CATEGORY_LIST_ITEM_TITLE_MAX } from '@estrelinha/core/home'

/**
 * `LCT-26`, `LCT-27` — o guarda entre a migration da feature 64 e o que o TypeScript afirma.
 *
 * A propriedade ruim de sempre: **errar nisto não quebra nada.** Um `check` com 30 enquanto a tela
 * conta até 28 passa em build, `tsc` e teste de componente; o contrário (banco em 25, tela em 28)
 * faz a dona descobrir no salvar, com a curadoria inteira na mão. Por isso o número do `check` é
 * lido do disco e comparado com `CATEGORY_LIST_ITEM_TITLE_MAX`.
 *
 * **Âncora dupla**: o arquivo é encontrado (corpo mínimo) **e** o número do `check` é extraído — uma
 * extração que falha devolve `null` e REPROVA, em vez de virar comparação contra o nada.
 *
 * Cada régua é um **predicado**, para a asserção e o sensor chamarem a mesma função. E o `mutar()`
 * **lança** quando a mutação não muda nada: um sensor cujo alvo sumiu viraria no-op e "passaria" sem
 * provar régua nenhuma (a lição da feature `52`).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O caminho por extenso, de propósito: a régua nunca é o objeto medido. */
const MIGRATION = join(ROOT, 'supabase/migrations/20261012120000_64-lista-de-categorias.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/**
 * Comentário não é código: sem tirá-los, o texto que EXPLICA a regra entraria na medição dela. O
 * cabeçalho desta migration descreve em prosa o que ela NÃO faz, e é exatamente o que as réguas de
 * ausência procuram.
 */
const semComentario = (texto: string): string => texto.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')

const LIMPO = semComentario(SQL)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

// -------------------------------------------------------------------------------------------
// As réguas, como predicados
// -------------------------------------------------------------------------------------------

/** A coluna é acrescentada de forma idempotente. */
const criaColunaIdempotente = (texto: string): boolean =>
  /alter table public\.home_section_items\s+add column if not exists title text\s*;/i.test(texto)

/** O número do `check` de comprimento, ou `null` quando não há `check` legível. */
const limiteDoCheck = (texto: string): number | null => {
  const m = texto.match(
    /add constraint home_section_items_title_len\s+check\s*\(\s*title is null or char_length\(title\)\s*<=\s*(\d+)\s*\)/i,
  )
  return m ? Number(m[1]) : null
}

/** A constraint só é criada quando ainda não existe — senão reaplicar a migration lança. */
const constraintIdempotente = (texto: string): boolean =>
  /if not exists\s*\(\s*select 1 from pg_constraint\s+where conname = 'home_section_items_title_len'/i.test(
    texto,
  )

/** Algum `grant` alcançando `anon`. */
const concedeAnon = (texto: string): boolean => /\bgrant\b[^;]*\banon\b/i.test(texto)

/** Alguma escrita de dado. */
const escreveDado = (texto: string): boolean =>
  /\b(insert\s+into|update\s+public\.|delete\s+from)\b/i.test(texto)

// -------------------------------------------------------------------------------------------

describe('a migration da 64 está onde este teste procura', () => {
  it('o arquivo existe e tem corpo — âncora 1', () => {
    expect(SQL.length).toBeGreaterThan(800)
    expect(LIMPO.length).toBeGreaterThan(300)
  })

  it('o número do check é extraído — âncora 2', () => {
    expect(limiteDoCheck(LIMPO)).not.toBeNull()
  })
})

describe('LCT-26 — a coluna', () => {
  it('home_section_items ganha title text por add column if not exists', () => {
    expect(criaColunaIdempotente(LIMPO)).toBe(true)
  })

  it('sensor — sem o if not exists, a régua reprova', () => {
    const mutante = mutar(LIMPO, /add column if not exists title/i, 'add column title')
    expect(criaColunaIdempotente(mutante)).toBe(false)
  })

  it('a coluna é anulável — nenhum not null', () => {
    expect(LIMPO).not.toMatch(/title text\s+not null/i)
  })

  it('a constraint nasce de forma idempotente, guardada por pg_constraint', () => {
    expect(constraintIdempotente(LIMPO)).toBe(true)
  })

  it('sensor — sem a guarda de pg_constraint, a régua reprova', () => {
    const mutante = mutar(LIMPO, /if not exists\s*\(\s*select 1 from pg_constraint/i, 'if true or (select 1 from pg_constraint')
    expect(constraintIdempotente(mutante)).toBe(false)
  })
})

describe('LCT-27 — o limite tem dois escritos e UM número', () => {
  it('o check do banco é igual a CATEGORY_LIST_ITEM_TITLE_MAX', () => {
    expect(limiteDoCheck(LIMPO)).toBe(CATEGORY_LIST_ITEM_TITLE_MAX)
  })

  it('e o número é 28 — a constante não pode ter andado junto com o SQL por acidente', () => {
    expect(CATEGORY_LIST_ITEM_TITLE_MAX).toBe(28)
  })

  it('sensor — 29 no lugar de 28 diverge da constante', () => {
    const mutante = mutar(LIMPO, /char_length\(title\)\s*<=\s*28/i, 'char_length(title) <= 29')
    expect(limiteDoCheck(mutante)).not.toBe(CATEGORY_LIST_ITEM_TITLE_MAX)
  })

  it('sensor — sem o check, a extração devolve null (e a âncora 2 reprovaria)', () => {
    const mutante = mutar(
      LIMPO,
      /check\s*\(\s*title is null or char_length\(title\)\s*<=\s*28\s*\)/i,
      'check (true)',
    )
    expect(limiteDoCheck(mutante)).toBeNull()
  })
})

describe('LCT-26 — a migration não abre nada e não escreve nada', () => {
  it('nenhum grant alcança anon', () => {
    expect(concedeAnon(LIMPO)).toBe(false)
  })

  it('sensor — um grant de select a anon é acusado', () => {
    const mutante = mutar(LIMPO, /comment on column/i, 'grant select on public.home_section_items to anon;\ncomment on column')
    expect(concedeAnon(mutante)).toBe(true)
  })

  it('nenhuma escrita de dado', () => {
    expect(escreveDado(LIMPO)).toBe(false)
  })

  it('sensor — um insert é acusado', () => {
    const mutante = mutar(
      LIMPO,
      /comment on column/i,
      "insert into public.home_section_items (section_id, position) values (null, 0);\ncomment on column",
    )
    expect(escreveDado(mutante)).toBe(true)
  })

  it('sensor — um update é acusado', () => {
    const mutante = mutar(LIMPO, /comment on column/i, "update public.home_section_items set title = 'x';\ncomment on column")
    expect(escreveDado(mutante)).toBe(true)
  })

  it('sensor — a prosa do cabeçalho não entra na medição (CRLF e LF)', () => {
    const prosa = '-- aqui se explica que nenhum grant to anon e nenhum insert into public.x entram\n'
    expect(escreveDado(semComentario(prosa))).toBe(false)
    expect(concedeAnon(semComentario(prosa.replace(/\n/g, '\r\n')))).toBe(false)
  })
})
