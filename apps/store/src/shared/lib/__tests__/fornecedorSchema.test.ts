import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SUPPLIER_NAME_MAX, SUPPLIER_URL_MAX } from '@estrelinha/core/suppliers'

/**
 * Feature 80 (FOR-01..04) — o guarda da migration do fornecedor da peça.
 *
 * O que ela protege é SIGILO: o fornecedor é informação só do painel, e a tabela pública `products`
 * não recorta coluna. Errar aqui não quebra nada — um `grant` a `anon` ou uma policy sem
 * `with check` passa em build, `tsc` e teste de componente, e a loja continua igual. Por isso o
 * guarda lê a migration do disco, uma régua por comando (`L-033`), e os tetos são IMPORTADOS de
 * `@estrelinha/core/suppliers`, que é o que a tela do painel usa para recusar.
 *
 * **Âncora dupla**: o arquivo é lido (corpo mínimo) e cada extração devolve algo — uma que falha
 * devolve `null` e REPROVA. O `mutar()` **lança** quando a mutação não muda nada.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O caminho por extenso, de propósito: a régua nunca é o objeto medido. */
const MIGRATION = join(ROOT, 'supabase/migrations/20261022150000_80-fornecedor-da-peca.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/** Comentário não é código: o cabeçalho explica em prosa o que a migration faz e não faz. */
const semComentario = (texto: string): string => texto.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')

const LIMPO = semComentario(SQL)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

const TABELAS = ['suppliers', 'product_suppliers'] as const

// -------------------------------------------------------------------------------------------
// As réguas, como predicados
// -------------------------------------------------------------------------------------------

const corpoDaTabela = (texto: string, tabela: string): string | null => {
  const m = texto.match(new RegExp(`create table if not exists public\\.${tabela}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'))
  return m ? m[1] : null
}

const criadasSemIfNotExists = (texto: string): string[] =>
  [...texto.matchAll(/create table\s+(?!if not exists)(?:public\.)?(\w+)/gi)].map(m => m[1])

const limiteDoNome = (texto: string): number | null => {
  const m = corpoDaTabela(texto, 'suppliers')?.match(
    /check\s*\(\s*char_length\(btrim\(name\)\)\s+between\s+1\s+and\s+(\d+)\s*\)/i,
  )
  return m ? Number(m[1]) : null
}

const nomeUnicoSemCaixa = (texto: string): boolean =>
  /create unique index if not exists \w+ on public\.suppliers\s*\(\s*lower\(btrim\(name\)\)\s*\)/i.test(texto)

const produtoEhChaveComCascata = (texto: string): boolean =>
  /product_id\s+uuid\s+primary key\s+references\s+public\.products\s*\(id\)\s+on delete cascade/i.test(
    corpoDaTabela(texto, 'product_suppliers') ?? '',
  )

const fornecedorComRestrict = (texto: string): boolean =>
  /supplier_id\s+uuid\s+not null\s+references\s+public\.suppliers\s*\(id\)\s+on delete restrict/i.test(
    corpoDaTabela(texto, 'product_suppliers') ?? '',
  )

/** O teto do link no `check`, ou `null` se o `check` não exige também o `http(s)://`. */
const limiteDoLink = (texto: string): number | null => {
  const m = corpoDaTabela(texto, 'product_suppliers')?.match(
    /check\s*\(\s*url is null or \(\s*url ~\* '\^https\?:\/\/'\s+and\s+char_length\(url\)\s*<=\s*(\d+)\s*\)\s*\)/i,
  )
  return m ? Number(m[1]) : null
}

const comRls = (texto: string, tabela: string): boolean =>
  new RegExp(`alter table public\\.${tabela}\\s+enable row level security;`, 'i').test(texto)

const revogaAnon = (texto: string, tabela: string): boolean =>
  new RegExp(`revoke all on table public\\.${tabela}\\s+from anon;`, 'i').test(texto)

/** O corpo da ÚNICA policy da tabela, ou `null` (nenhuma ou mais de uma). */
const policyDa = (texto: string, tabela: string): string | null => {
  const todas = [...texto.matchAll(new RegExp(`create policy "[^"]+" on public\\.${tabela}\\b([\\s\\S]*?);`, 'gi'))]
  return todas.length === 1 ? todas[0][1] : null
}

const policyDeAdmin = (texto: string, tabela: string): boolean => {
  const corpo = policyDa(texto, tabela)
  if (!corpo) return false
  return (
    /for all\s+to authenticated\b/i.test(corpo) &&
    /using\s*\(\s*public\.has_role\(auth\.uid\(\), 'admin'\)\s*\)/i.test(corpo) &&
    /with check\s*\(\s*public\.has_role\(auth\.uid\(\), 'admin'\)\s*\)/i.test(corpo)
  )
}

const grantAAnon = (texto: string): boolean => /grant\b[^;]*\bto\b[^;]*\banon\b/i.test(texto)

const escreveDado = (texto: string): boolean => /^\s*(insert into|update\s+public\.|delete from)\b/im.test(texto)

// -------------------------------------------------------------------------------------------

describe('fornecedorSchema — âncora', () => {
  it('a migration foi lida e as duas tabelas foram encontradas', () => {
    expect(SQL.length).toBeGreaterThan(500)
    for (const t of TABELAS) expect(corpoDaTabela(LIMPO, t)).not.toBeNull()
  })
})

describe('FOR-01 — os fornecedores', () => {
  it('as tabelas nascem com `if not exists`', () => {
    expect(criadasSemIfNotExists(LIMPO)).toEqual([])
    expect(criadasSemIfNotExists(mutar(LIMPO, 'create table if not exists public.suppliers', 'create table public.suppliers'))).toEqual(['suppliers'])
  })

  it('o teto do nome é o de `core`', () => {
    expect(limiteDoNome(LIMPO)).toBe(SUPPLIER_NAME_MAX)
    expect(limiteDoNome(mutar(LIMPO, 'between 1 and 120', 'between 1 and 200'))).toBe(200)
    expect(limiteDoNome(mutar(LIMPO, 'char_length(btrim(name))', 'char_length(name)'))).toBeNull()
  })

  it('o nome é único sem diferença de maiúsculas e de espaço nas pontas', () => {
    expect(nomeUnicoSemCaixa(LIMPO)).toBe(true)
    expect(nomeUnicoSemCaixa(mutar(LIMPO, '(lower(btrim(name)))', '(name)'))).toBe(false)
    expect(nomeUnicoSemCaixa(mutar(LIMPO, 'create unique index', 'create index'))).toBe(false)
  })
})

describe('FOR-02 — o vínculo', () => {
  it('um fornecedor por produto, que some junto com o produto', () => {
    expect(produtoEhChaveComCascata(LIMPO)).toBe(true)
    expect(produtoEhChaveComCascata(mutar(LIMPO, 'on delete cascade', 'on delete set null'))).toBe(false)
    expect(produtoEhChaveComCascata(mutar(LIMPO, 'product_id  uuid primary key', 'product_id  uuid'))).toBe(false)
  })

  it('o fornecedor em uso não pode ser apagado', () => {
    expect(fornecedorComRestrict(LIMPO)).toBe(true)
    expect(fornecedorComRestrict(mutar(LIMPO, 'on delete restrict', 'on delete cascade'))).toBe(false)
  })

  it('o link começa com http(s):// e tem o teto de `core`', () => {
    expect(limiteDoLink(LIMPO)).toBe(SUPPLIER_URL_MAX)
    expect(limiteDoLink(mutar(LIMPO, "url ~* '^https?://' and ", ''))).toBeNull()
    expect(limiteDoLink(mutar(LIMPO, '<= 2000', '<= 4000'))).toBe(4000)
  })
})

describe('FOR-03 — só o admin lê e grava', () => {
  it.each(TABELAS)('%s tem RLS ligada', tabela => {
    expect(comRls(LIMPO, tabela)).toBe(true)
    expect(comRls(mutar(LIMPO, new RegExp(`alter table public\\.${tabela}\\s+enable row level security;`), ''), tabela)).toBe(false)
  })

  it.each(TABELAS)('%s revoga tudo do anon', tabela => {
    expect(revogaAnon(LIMPO, tabela)).toBe(true)
    expect(revogaAnon(mutar(LIMPO, new RegExp(`revoke all on table public\\.${tabela}\\s+from anon;`), ''), tabela)).toBe(false)
  })

  it.each(TABELAS)('%s tem uma policy só, de admin, no `using` E no `with check`', tabela => {
    expect(policyDeAdmin(LIMPO, tabela)).toBe(true)
    // A mutação carrega o NOME da tabela: os corpos das duas policies são idênticos, e mutar só o
    // corpo acertava a primeira — o sensor da segunda media a tabela errada (achado ao escrever).
    const comando = `on public.${tabela}${policyDa(LIMPO, tabela)!}`
    // A meia-correção: sem o `with check`, um não-admin autenticado INSERE livremente.
    expect(policyDeAdmin(mutar(LIMPO, comando, comando.replace(/\s*with check[\s\S]*$/i, '')), tabela)).toBe(false)
    expect(policyDeAdmin(mutar(LIMPO, comando, comando.replace('to authenticated', 'to public')), tabela)).toBe(false)
    // Uma segunda policy (uma "leitura pública" de conveniência) também reprova.
    expect(policyDeAdmin(`${LIMPO}\ncreate policy "public read" on public.${tabela} for select using (true);`, tabela)).toBe(false)
  })

  it('nenhum `grant` alcança o anon', () => {
    expect(grantAAnon(LIMPO)).toBe(false)
    expect(grantAAnon(`${LIMPO}\ngrant select on public.suppliers to anon;`)).toBe(true)
  })
})

describe('FOR-04 — a migration não escreve dado', () => {
  it('sem insert, update ou delete', () => {
    expect(escreveDado(LIMPO)).toBe(false)
    expect(escreveDado(`${LIMPO}\ninsert into public.suppliers (name) values ('x');`)).toBe(true)
  })
})

// -------------------------------------------------------------------------------------------
// Vários fornecedores por produto — a chave do vínculo vira o PAR (produto, fornecedor)
// -------------------------------------------------------------------------------------------

const MIGRATION_VARIOS = join(ROOT, 'supabase/migrations/20261031120000_varios-fornecedores-por-produto.sql')
const LIMPO_VARIOS = semComentario(readFileSync(MIGRATION_VARIOS, 'utf8'))

/** A chave nova é exatamente (product_id, supplier_id), criada DEPOIS de derrubar a antiga. */
const chaveDoPar = (texto: string): boolean => {
  const derruba = texto.search(/alter table public\.product_suppliers drop constraint if exists product_suppliers_pkey;/i)
  const cria = texto.search(
    /alter table public\.product_suppliers add constraint product_suppliers_pkey primary key \(\s*product_id\s*,\s*supplier_id\s*\);/i,
  )
  return derruba >= 0 && cria > derruba
}

const posicaoAditiva = (texto: string): boolean =>
  /alter table public\.product_suppliers\s+add column if not exists position integer not null default 0 check \(position >= 0\);/i.test(texto)

describe('vários fornecedores por produto', () => {
  it('a migration foi lida', () => {
    expect(LIMPO_VARIOS.length).toBeGreaterThan(100)
  })

  it('a chave do vínculo é o par (produto, fornecedor), e a antiga cai antes', () => {
    expect(chaveDoPar(LIMPO_VARIOS)).toBe(true)
    expect(chaveDoPar(mutar(LIMPO_VARIOS, '(product_id, supplier_id)', '(product_id)'))).toBe(false)
    expect(chaveDoPar(mutar(LIMPO_VARIOS, /alter table public\.product_suppliers drop constraint[^;]*;/i, ''))).toBe(false)
  })

  it('a ordem da dona mora em `position`, coluna aditiva com default', () => {
    expect(posicaoAditiva(LIMPO_VARIOS)).toBe(true)
    expect(posicaoAditiva(mutar(LIMPO_VARIOS, 'add column if not exists', 'add column'))).toBe(false)
  })

  it('não abre leitura, não concede nada e não escreve dado — a tabela segue só do admin', () => {
    expect(/create policy|grant\b|disable row level security/i.test(LIMPO_VARIOS)).toBe(false)
    expect(escreveDado(LIMPO_VARIOS)).toBe(false)
    expect(/create policy|grant\b/i.test(`${LIMPO_VARIOS}\ngrant select on public.product_suppliers to anon;`)).toBe(true)
  })
})
