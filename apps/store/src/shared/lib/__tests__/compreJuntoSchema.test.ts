import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BUY_TOGETHER_ADDONS_MAX,
  BUY_TOGETHER_LIST_ITEMS_MAX,
  BUY_TOGETHER_LIST_NAME_MAX,
} from '@estrelinha/core/buy-together'

/**
 * O guarda da migration do Compre Junto: listas de peças e adicionais de cada joia.
 *
 * Errar aqui não quebra nada: um `grant` a `anon`, uma policy sem `with check` ou um `cascade` no
 * lugar do `restrict` passam em build, `tsc` e teste de componente. Por isso o guarda lê a migration
 * do disco, uma régua por comando, e os tetos são IMPORTADOS de `@estrelinha/core/buy-together`, que
 * é o que a tela usa para recusar.
 *
 * **Âncora**: o arquivo é lido e cada extração devolve algo — uma que falha devolve `null` e
 * REPROVA. O `mutar()` **lança** quando a mutação não muda nada.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O caminho por extenso, de propósito: a régua nunca é o objeto medido. */
const MIGRATION = join(ROOT, 'supabase/migrations/20261105120000_compre-junto.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/** Comentário não é código: o cabeçalho explica em prosa o que a migration faz e não faz. */
const semComentario = (texto: string): string => texto.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')

const LIMPO = semComentario(SQL)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

const TABELAS = ['buy_together_lists', 'buy_together_list_items', 'product_buy_together'] as const

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
  const m = corpoDaTabela(texto, 'buy_together_lists')?.match(
    /check\s*\(\s*char_length\(btrim\(name\)\)\s+between\s+1\s+and\s+(\d+)\s*\)/i,
  )
  return m ? Number(m[1]) : null
}

/** A posição máxima permitida (o `check` é `between 0 and N`), ou `null`. */
const posicaoMaxima = (texto: string, tabela: string): number | null => {
  const m = corpoDaTabela(texto, tabela)?.match(/position\s+integer\s+not null\s+check\s*\(\s*position\s+between\s+0\s+and\s+(\d+)\s*\)/i)
  return m ? Number(m[1]) : null
}

/** A posição única por dono (lista ou joia), adiada até o fim da transação. */
const posicaoUnica = (texto: string, tabela: string, dono: string): boolean =>
  new RegExp(
    `unique\\s*\\(\\s*${dono}\\s*,\\s*position\\s*\\)\\s+deferrable initially deferred`,
    'i',
  ).test(corpoDaTabela(texto, tabela) ?? '')

const tiposDoAdicional = (texto: string): string[] | null => {
  const m = corpoDaTabela(texto, 'product_buy_together')?.match(/kind\s+text\s+not null\s+check\s*\(\s*kind in \(([^)]*)\)\s*\)/i)
  return m ? [...m[1].matchAll(/'(\w+)'/g)].map(x => x[1]) : null
}

const alvoCoerenteComOTipo = (texto: string): boolean => {
  const corpo = corpoDaTabela(texto, 'product_buy_together') ?? ''
  return (
    /kind = 'product' and target_product_id is not null and list_id is null/i.test(corpo) &&
    /kind = 'list' and list_id is not null and target_product_id is null/i.test(corpo)
  )
}

const fkComNome = (texto: string, nome: string, alvo: string, acao: string): boolean =>
  new RegExp(
    `constraint ${nome}\\s+foreign key \\(\\w+\\) references public\\.${alvo}\\s*\\(id\\)\\s+on delete ${acao}`,
    'i',
  ).test(corpoDaTabela(texto, 'product_buy_together') ?? '')

const variacoesSemFk = (texto: string): boolean => {
  const itens = corpoDaTabela(texto, 'buy_together_list_items') ?? ''
  const adicionais = corpoDaTabela(texto, 'product_buy_together') ?? ''
  return (
    /variant_ids\s+uuid\[\]\s+not null\s+default\s+'\{\}'/i.test(itens) &&
    /target_variant_ids\s+uuid\[\]\s+not null\s+default\s+'\{\}'/i.test(adicionais) &&
    /hidden_on_variant_ids\s+uuid\[\]\s+not null\s+default\s+'\{\}'/i.test(adicionais) &&
    !/product_variants/i.test(itens + adicionais)
  )
}

const pecaSaiComAListaEComOProduto = (texto: string): boolean => {
  const corpo = corpoDaTabela(texto, 'buy_together_list_items') ?? ''
  return (
    /list_id\s+uuid\s+not null\s+references\s+public\.buy_together_lists\s*\(id\)\s+on delete cascade/i.test(corpo) &&
    /product_id\s+uuid\s+not null\s+references\s+public\.products\s*\(id\)\s+on delete cascade/i.test(corpo)
  )
}

const viewDeUso = (texto: string): string | null => {
  const m = texto.match(/create or replace view public\.buy_together_list_usage\s+with\s*\(\s*security_invoker\s*=\s*true\s*\)\s+as([\s\S]*?);/i)
  return m ? m[1] : null
}

const comRls = (texto: string, tabela: string): boolean =>
  new RegExp(`alter table public\\.${tabela}\\s+enable row level security;`, 'i').test(texto)

const policies = (texto: string, tabela: string): string[] =>
  [...texto.matchAll(new RegExp(`create policy "[^"]+" on public\\.${tabela}\\b([\\s\\S]*?);`, 'gi'))].map(m => m[1])

/** A policy de leitura é pública e sem condição de ativo (`using (true)`). */
const leituraPublicaSemCondicao = (texto: string, tabela: string): boolean => {
  const leitura = policies(texto, tabela).filter(p => /for select/i.test(p))
  return (
    leitura.length === 1 &&
    /to anon, authenticated\b/i.test(leitura[0]) &&
    /using\s*\(\s*true\s*\)/i.test(leitura[0])
  )
}

/** A policy de escrita: `for all to authenticated` com `has_role` no `using` E no `with check`. */
const escritaSoDeAdmin = (texto: string, tabela: string): boolean => {
  const todas = policies(texto, tabela)
  const escrita = todas.filter(p => !/for select/i.test(p))
  if (escrita.length !== 1 || todas.length !== 2) return false
  const corpo = escrita[0]
  return (
    /for all\s+to authenticated\b/i.test(corpo) &&
    /using\s*\(\s*public\.has_role\(auth\.uid\(\), 'admin'\)\s*\)/i.test(corpo) &&
    /with check\s*\(\s*public\.has_role\(auth\.uid\(\), 'admin'\)\s*\)/i.test(corpo)
  )
}

const grantAAnon = (texto: string): boolean => /grant\b[^;]*\bto\b[^;]*\banon\b/i.test(texto)

const escreveDado = (texto: string): boolean => /^\s*(insert into|update\s+public\.|delete from)\b/im.test(texto)

// -------------------------------------------------------------------------------------------

describe('compreJuntoSchema — âncora', () => {
  it('a migration foi lida, as três tabelas e a view foram encontradas', () => {
    expect(SQL.length).toBeGreaterThan(1500)
    for (const t of TABELAS) expect(corpoDaTabela(LIMPO, t)).not.toBeNull()
    expect(viewDeUso(LIMPO)).not.toBeNull()
  })
})

describe('as tabelas', () => {
  it('nascem com `if not exists`', () => {
    expect(criadasSemIfNotExists(LIMPO)).toEqual([])
    expect(
      criadasSemIfNotExists(mutar(LIMPO, 'create table if not exists public.buy_together_lists', 'create table public.buy_together_lists')),
    ).toEqual(['buy_together_lists'])
  })

  it('o teto do nome é o de `core`', () => {
    expect(limiteDoNome(LIMPO)).toBe(BUY_TOGETHER_LIST_NAME_MAX)
    expect(limiteDoNome(mutar(LIMPO, 'between 1 and 40', 'between 1 and 80'))).toBe(80)
    expect(limiteDoNome(mutar(LIMPO, 'char_length(btrim(name))', 'char_length(name)'))).toBeNull()
  })

  it('a posição da peça vai de 0 ao teto de peças de `core`, e é única na lista', () => {
    expect(posicaoMaxima(LIMPO, 'buy_together_list_items')).toBe(BUY_TOGETHER_LIST_ITEMS_MAX - 1)
    expect(posicaoMaxima(mutar(LIMPO, 'between 0 and 11', 'between 0 and 99'), 'buy_together_list_items')).toBe(99)
    expect(posicaoUnica(LIMPO, 'buy_together_list_items', 'list_id')).toBe(true)
    expect(posicaoUnica(mutar(LIMPO, /unique \(list_id, position\) deferrable initially deferred/, 'unique (list_id, position)'), 'buy_together_list_items', 'list_id')).toBe(false)
  })

  it('a posição do adicional vai de 0 ao teto de adicionais de `core`, e é única na joia', () => {
    expect(posicaoMaxima(LIMPO, 'product_buy_together')).toBe(BUY_TOGETHER_ADDONS_MAX - 1)
    expect(posicaoMaxima(mutar(LIMPO, 'between 0 and 2', 'between 0 and 5'), 'product_buy_together')).toBe(5)
    expect(posicaoUnica(LIMPO, 'product_buy_together', 'product_id')).toBe(true)
    expect(posicaoUnica(mutar(LIMPO, /unique \(product_id, position\) deferrable initially deferred/, 'unique (product_id, position)'), 'product_buy_together', 'product_id')).toBe(false)
  })

  it('o tipo do adicional é `product` ou `list`, e o alvo acompanha o tipo', () => {
    expect(tiposDoAdicional(LIMPO)).toEqual(['product', 'list'])
    expect(tiposDoAdicional(mutar(LIMPO, "in ('product', 'list')", "in ('product', 'list', 'x')"))).toEqual(['product', 'list', 'x'])
    expect(alvoCoerenteComOTipo(LIMPO)).toBe(true)
    expect(alvoCoerenteComOTipo(mutar(LIMPO, 'and list_id is null', ''))).toBe(false)
    expect(alvoCoerenteComOTipo(mutar(LIMPO, 'and target_product_id is null', ''))).toBe(false)
  })

  it('o vínculo produto→lista é `restrict`; as duas chaves para `products` têm nome', () => {
    expect(fkComNome(LIMPO, 'product_buy_together_list_id_fkey', 'buy_together_lists', 'restrict')).toBe(true)
    expect(
      fkComNome(
        mutar(LIMPO, /(product_buy_together_list_id_fkey\s+foreign key \(list_id\) references public\.buy_together_lists \(id\)) on delete restrict/, '$1 on delete cascade'),
        'product_buy_together_list_id_fkey', 'buy_together_lists', 'restrict',
      ),
    ).toBe(false)
    expect(fkComNome(LIMPO, 'product_buy_together_product_id_fkey', 'products', 'cascade')).toBe(true)
    expect(fkComNome(LIMPO, 'product_buy_together_target_product_id_fkey', 'products', 'cascade')).toBe(true)
    expect(
      fkComNome(mutar(LIMPO, 'constraint product_buy_together_target_product_id_fkey', 'constraint outro_nome'), 'product_buy_together_target_product_id_fkey', 'products', 'cascade'),
    ).toBe(false)
  })

  it('as variações são listas de ids SEM chave estrangeira (vazia = todas)', () => {
    expect(variacoesSemFk(LIMPO)).toBe(true)
    expect(variacoesSemFk(mutar(LIMPO, /hidden_on_variant_ids\s+uuid\[\]/, 'hidden_on_variant_ids uuid references public.product_variants (id)'))).toBe(false)
  })

  it('a peça sai com a lista e com o produto', () => {
    expect(pecaSaiComAListaEComOProduto(LIMPO)).toBe(true)
    expect(pecaSaiComAListaEComOProduto(mutar(LIMPO, /(references public\.buy_together_lists \(id\)) on delete cascade/, '$1 on delete restrict'))).toBe(false)
  })
})

describe('a view de uso', () => {
  it('é `security_invoker` e nomeia a joia que usa a lista', () => {
    const corpo = viewDeUso(LIMPO)!
    expect(corpo).toMatch(/p\.name as product_name/i)
    expect(corpo).toMatch(/a\.kind = 'list'/i)
    expect(viewDeUso(mutar(LIMPO, 'with (security_invoker = true)', ''))).toBeNull()
    expect(/security_invoker\s*=\s*false/i.test(mutar(LIMPO, 'security_invoker = true', 'security_invoker = false'))).toBe(true)
    expect(/security_invoker\s*=\s*false/i.test(LIMPO)).toBe(false)
  })
})

describe('RLS — a loja lê, só o admin grava', () => {
  it.each(TABELAS)('%s tem RLS ligada', tabela => {
    expect(comRls(LIMPO, tabela)).toBe(true)
    expect(comRls(mutar(LIMPO, new RegExp(`alter table public\\.${tabela}\\s+enable row level security;`), ''), tabela)).toBe(false)
  })

  it.each(TABELAS)('%s: leitura pública sem condição de ativo', tabela => {
    expect(leituraPublicaSemCondicao(LIMPO, tabela)).toBe(true)
    // A mutação carrega o NOME da tabela: os corpos das três policies de leitura são idênticos, e
    // mutar só o corpo acertaria sempre a primeira tabela.
    const alvo = `on public.${tabela}${policies(LIMPO, tabela).find(p => /for select/i.test(p))!}`
    expect(leituraPublicaSemCondicao(mutar(LIMPO, alvo, alvo.replace('using (true)', 'using (false)')), tabela)).toBe(false)
    expect(leituraPublicaSemCondicao(mutar(LIMPO, alvo, alvo.replace('to anon, authenticated', 'to authenticated')), tabela)).toBe(false)
  })

  it.each(TABELAS)('%s: a escrita é de admin, no `using` E no `with check`', tabela => {
    expect(escritaSoDeAdmin(LIMPO, tabela)).toBe(true)
    const comando = policies(LIMPO, tabela).find(p => !/for select/i.test(p))!
    // A mutação carrega o corpo exato da policy da tabela: os corpos das três são idênticos.
    const alvo = `on public.${tabela}${comando}`
    // A meia-correção: sem o `with check`, um não-admin autenticado INSERE livremente.
    expect(escritaSoDeAdmin(mutar(LIMPO, alvo, alvo.replace(/\s*with check[\s\S]*$/i, '')), tabela)).toBe(false)
    expect(escritaSoDeAdmin(mutar(LIMPO, alvo, alvo.replace('to authenticated', 'to public')), tabela)).toBe(false)
    expect(escritaSoDeAdmin(mutar(LIMPO, alvo, alvo.replace("using (public.has_role(auth.uid(), 'admin'))", 'using (true)')), tabela)).toBe(false)
    // Uma terceira policy (escrita aberta de conveniência) também reprova.
    expect(escritaSoDeAdmin(`${LIMPO}\ncreate policy "x" on public.${tabela} for insert to anon with check (true);`, tabela)).toBe(false)
  })

  it('nenhum `grant` alcança o anon', () => {
    expect(grantAAnon(LIMPO)).toBe(false)
    expect(grantAAnon(`${LIMPO}\ngrant insert on public.buy_together_lists to anon;`)).toBe(true)
  })
})

describe('a migration não escreve dado', () => {
  it('sem insert, update ou delete', () => {
    expect(escreveDado(LIMPO)).toBe(false)
    expect(escreveDado(`${LIMPO}\ninsert into public.buy_together_lists (name) values ('x');`)).toBe(true)
  })
})
