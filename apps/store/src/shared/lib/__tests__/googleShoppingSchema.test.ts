import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GOOGLE_AGE_GROUPS, GOOGLE_GENDERS } from '@estrelinha/supabase/types/settings'

/**
 * `GSH-19`, `GSH-20` — o guarda entre o schema em **SQL** e o que o TypeScript afirma.
 *
 * A propriedade ruim de sempre: **errar nisto não quebra nada.** Um `check` que não chegou a existir
 * (porque nasceu inline num `ADD COLUMN IF NOT EXISTS` sobre coluna já criada) deixa o banco aceitar
 * `gender = 'masculino'`, a suíte passa verde, e quem recusa é o Merchant Center — item a item,
 * dias depois do cutover. O vocabulário do TypeScript divergir do `check` produz o inverso: a tela
 * oferece um valor que o banco recusa, e a dona descobre no save.
 *
 * **Âncora dupla**, como em `faqSchema.test.ts`: o arquivo é encontrado (corpo mínimo) **e** o número
 * de colunas e constraints encontrados é asserido. Um caminho errado varreria zero e passaria em
 * silêncio, que é a pior falha possível deste tipo de teste.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * O caminho por extenso, de propósito: a régua nunca é o objeto medido. Derivá-lo de uma constante
 * do projeto faria a varredura encolher junto com o que ela deveria guardar.
 */
const MIGRATION = join(ROOT, 'supabase/migrations/20260816130000_30-google-shopping.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/** Comentário não é código: sem tirá-los, o texto que EXPLICA a regra entraria na medição dela. */
const LIMPO = SQL.replace(/--[^\n]*/g, '')

const ocorrencias = (re: RegExp): string[] => [...LIMPO.matchAll(re)].map(m => m[0])

describe('a migration está onde este teste procura', () => {
  it('o arquivo existe e tem corpo', () => {
    expect(SQL.length).toBeGreaterThan(2000)
    expect(LIMPO.length).toBeGreaterThan(700)
  })
})

describe('as seis colunas de identificação', () => {
  const esperadas = [
    'brand',
    'mpn',
    'age_group',
    'gender',
    'google_product_category',
    'identifier_exists',
  ]

  it.each(esperadas)('a coluna %s é criada', coluna => {
    expect(LIMPO).toMatch(new RegExp(`ADD COLUMN IF NOT EXISTS\\s+${coluna}\\s`, 'i'))
  })

  it('são seis em products, e a sétima é a de categories — âncora de contagem', () => {
    // A âncora conta TODAS as colunas da migration e discrimina onde cada bloco está. Um
    // `ADD COLUMN` novo que ninguém declarou aqui quebra — que é o ponto.
    expect(ocorrencias(/ADD COLUMN IF NOT EXISTS/gi)).toHaveLength(esperadas.length + 1)
    expect(LIMPO).toMatch(
      /ALTER TABLE public\.categories[\s\S]*ADD COLUMN IF NOT EXISTS\s+google_product_category/i,
    )
  })

  it('identifier_exists é boolean anulável — o terceiro estado é "nunca decidido"', () => {
    expect(LIMPO).toMatch(/ADD COLUMN IF NOT EXISTS\s+identifier_exists\s+boolean/i)
    expect(LIMPO).not.toMatch(/identifier_exists\s+boolean\s+NOT NULL/i)
  })
})

describe('os dois vocabulários fechados', () => {
  it('o check de age_group existe e é NOMEADO', () => {
    expect(LIMPO).toMatch(/ADD CONSTRAINT products_age_group_check/i)
  })

  it('o check de gender existe e é NOMEADO', () => {
    expect(LIMPO).toMatch(/ADD CONSTRAINT products_gender_check/i)
  })

  it('nenhum check nasce inline num ADD COLUMN — ali ele é ignorado em silêncio', () => {
    expect(LIMPO).not.toMatch(/ADD COLUMN IF NOT EXISTS[^,;]*\bCHECK\b/i)
  })

  it('o vocabulário de age_group no SQL é o mesmo do TypeScript', () => {
    const m = LIMPO.match(/age_group IN \(([^)]+)\)/i)
    expect(m).not.toBeNull()
    const doSql = m![1].split(',').map(s => s.trim().replace(/^'|'$/g, ''))
    expect(doSql).toEqual([...GOOGLE_AGE_GROUPS])
  })

  it('o vocabulário de gender no SQL é o mesmo do TypeScript', () => {
    const m = LIMPO.match(/gender IN \(([^)]+)\)/i)
    expect(m).not.toBeNull()
    const doSql = m![1].split(',').map(s => s.trim().replace(/^'|'$/g, ''))
    expect(doSql).toEqual([...GOOGLE_GENDERS])
  })

  it('os dois checks toleram NULL — o campo é opcional', () => {
    expect(LIMPO).toMatch(/age_group IS NULL OR/i)
    expect(LIMPO).toMatch(/gender IS NULL OR/i)
  })
})

describe('a migration não abre nada', () => {
  it('não concede grant a anon', () => {
    expect(LIMPO).not.toMatch(/grant[\s\S]*\banon\b/i)
  })

  it('não cria policy nova — products e store_settings já têm as suas', () => {
    expect(ocorrencias(/create policy/gi)).toEqual([])
  })

  it('não cria tabela nova', () => {
    expect(ocorrencias(/create table/gi)).toEqual([])
  })
})

describe('a semente do interruptor', () => {
  it('semeia a chave google_shopping em store_settings', () => {
    expect(LIMPO).toMatch(/INSERT INTO public\.store_settings[\s\S]*'google_shopping'/i)
  })

  it('nasce DESLIGADO — o feed não pode responder antes do cutover', () => {
    expect(LIMPO).toMatch(/'enabled',\s*false/i)
    expect(LIMPO).toMatch(/'ever_enabled',\s*false/i)
  })

  it('não sobrescreve configuração já existente', () => {
    expect(LIMPO).toMatch(/ON CONFLICT \(key\) DO NOTHING/i)
  })
})
