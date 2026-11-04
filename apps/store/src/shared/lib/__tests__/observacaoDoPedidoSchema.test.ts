import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ORDER_ADMIN_NOTE_MAX } from '@estrelinha/core/orders'

/**
 * O guarda da migration da observação do pedido — o texto que só quem administra lê.
 *
 * O que ela protege é SIGILO: a cliente lê a linha inteira do pedido dela, e é por isso que a
 * observação mora numa tabela à parte. Errar aqui não quebra nada — um `grant` a `anon` ou uma policy
 * sem `with check` passa em build, `tsc` e teste de componente. Por isso o guarda lê a migration do
 * disco, uma régua por comando, e o teto é IMPORTADO de `@estrelinha/core/orders`, o mesmo número
 * que o contador da tela e o dono da escrita usam.
 *
 * **Âncora dupla**: o arquivo é lido e cada extração devolve algo — uma que falha devolve `null` e
 * REPROVA. O `mutar()` **lança** quando a mutação não muda nada.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O caminho por extenso, de propósito: a régua nunca é o objeto medido. */
const MIGRATION = join(ROOT, 'supabase/migrations/20261108120000_95-observacao-do-pedido.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/** Comentário não é código: o cabeçalho explica em prosa o que a migration faz e não faz. */
const semComentario = (texto: string): string => texto.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')

const LIMPO = semComentario(SQL)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

const TABELA = 'order_admin_notes'

const corpoDaTabela = (texto: string): string | null => {
  const m = texto.match(new RegExp(`create table if not exists public\\.${TABELA}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'))
  return m ? m[1] : null
}

const criadasSemIfNotExists = (texto: string): string[] =>
  [...texto.matchAll(/create table\s+(?!if not exists)(?:public\.)?(\w+)/gi)].map(m => m[1])

/** O teto do `check` do texto, contado aparado (`btrim`), ou `null`. */
const tetoDoTexto = (texto: string): number | null => {
  const m = corpoDaTabela(texto)?.match(
    /note\s+text\s+not null\s+check\s*\(\s*char_length\(btrim\(note\)\)\s+between\s+1\s+and\s+(\d+)\s*\)/i,
  )
  return m ? Number(m[1]) : null
}

const pedidoEhChaveComCascata = (texto: string): boolean =>
  /order_id\s+uuid\s+primary key\s+references\s+public\.orders\s*\(id\)\s+on delete cascade/i.test(corpoDaTabela(texto) ?? '')

const autorAnulaAoApagar = (texto: string): boolean =>
  /updated_by\s+uuid\s+references\s+auth\.users\s*\(id\)\s+on delete set null/i.test(corpoDaTabela(texto) ?? '')

const guardaNomeEInstante = (texto: string): boolean => {
  const corpo = corpoDaTabela(texto) ?? ''
  return /updated_by_name\s+text\b/i.test(corpo) && /updated_at\s+timestamptz\s+not null\s+default now\(\)/i.test(corpo)
}

/**
 * `updated_at` é do BANCO: o `default now()` só vale no `insert`, e a edição (o upsert em conflito) é
 * um `update` — sem o trigger, o instante viria do relógio de quem grava (o celular, no app do ateliê).
 */
const triggerDoInstante = (texto: string): boolean =>
  new RegExp(
    `create trigger \\w+\\s+before update on public\\.${TABELA}\\s+for each row execute function public\\.update_updated_at_column\\(\\);`,
    'i',
  ).test(texto)

const comRls = (texto: string): boolean =>
  new RegExp(`alter table public\\.${TABELA}\\s+enable row level security;`, 'i').test(texto)

const revogaAnon = (texto: string): boolean =>
  new RegExp(`revoke all on table public\\.${TABELA}\\s+from anon;`, 'i').test(texto)

/** O corpo da ÚNICA policy da tabela, ou `null` (nenhuma ou mais de uma). */
const policyDa = (texto: string): string | null => {
  const todas = [...texto.matchAll(new RegExp(`create policy "[^"]+" on public\\.${TABELA}\\b([\\s\\S]*?);`, 'gi'))]
  return todas.length === 1 ? todas[0][1] : null
}

const policyDeAdmin = (texto: string): boolean => {
  const corpo = policyDa(texto)
  if (!corpo) return false
  return (
    /for all\s+to authenticated\b/i.test(corpo) &&
    /using\s*\(\s*public\.has_role\(auth\.uid\(\), 'admin'\)\s*\)/i.test(corpo) &&
    /with check\s*\(\s*public\.has_role\(auth\.uid\(\), 'admin'\)\s*\)/i.test(corpo)
  )
}

const grantAAnon = (texto: string): boolean => /grant\b[^;]*\bto\b[^;]*\banon\b/i.test(texto)

const escreveDado = (texto: string): boolean => /^\s*(insert into|update\s+public\.|delete from)\b/im.test(texto)

/** A observação não pode virar coluna do pedido: a cliente lê a linha inteira. */
const mexeEmOrders = (texto: string): boolean => /alter table\s+(?:if exists\s+)?public\.orders\b/i.test(texto)

const naPublicacaoDoRealtime = (texto: string): boolean => /alter publication\b[^;]*\border_admin_notes\b/i.test(texto)

// -------------------------------------------------------------------------------------------

describe('observacaoDoPedidoSchema — âncora', () => {
  it('a migration foi lida e a tabela foi encontrada', () => {
    expect(SQL.length).toBeGreaterThan(500)
    expect(corpoDaTabela(LIMPO)).not.toBeNull()
  })
})

describe('a tabela da observação', () => {
  it('nasce com `if not exists`', () => {
    expect(criadasSemIfNotExists(LIMPO)).toEqual([])
    expect(criadasSemIfNotExists(mutar(LIMPO, `create table if not exists public.${TABELA}`, `create table public.${TABELA}`))).toEqual([TABELA])
  })

  it('o teto do texto é o de `core`, contado aparado', () => {
    expect(tetoDoTexto(LIMPO)).toBe(ORDER_ADMIN_NOTE_MAX)
    expect(tetoDoTexto(mutar(LIMPO, 'between 1 and 1000', 'between 1 and 2000'))).toBe(2000)
    expect(tetoDoTexto(mutar(LIMPO, 'char_length(btrim(note))', 'char_length(note)'))).toBeNull()
    expect(tetoDoTexto(mutar(LIMPO, /note\s+text not null/, 'note text'))).toBeNull()
  })

  it('uma observação por pedido, que some junto com o pedido', () => {
    expect(pedidoEhChaveComCascata(LIMPO)).toBe(true)
    expect(pedidoEhChaveComCascata(mutar(LIMPO, 'on delete cascade', 'on delete restrict'))).toBe(false)
    expect(pedidoEhChaveComCascata(mutar(LIMPO, /order_id\s+uuid primary key/, 'order_id uuid'))).toBe(false)
  })

  it('apagar a conta de quem editou anula o autor, sem apagar a observação', () => {
    expect(autorAnulaAoApagar(LIMPO)).toBe(true)
    expect(autorAnulaAoApagar(mutar(LIMPO, 'on delete set null', 'on delete cascade'))).toBe(false)
  })

  it('guarda o nome de quem editou e quando', () => {
    expect(guardaNomeEInstante(LIMPO)).toBe(true)
    expect(guardaNomeEInstante(mutar(LIMPO, /updated_by_name\s+text,?\n/, ''))).toBe(false)
  })

  it('o instante da edição é do banco: trigger `before update` com `update_updated_at_column`', () => {
    expect(triggerDoInstante(LIMPO)).toBe(true)
    expect(triggerDoInstante(mutar(LIMPO, /before update on public\.order_admin_notes/, 'after update on public.order_admin_notes'))).toBe(false)
    expect(triggerDoInstante(mutar(LIMPO, /create trigger[^;]*;/, ''))).toBe(false)
  })

  it('não toca na tabela de pedidos nem entra na publicação do Realtime', () => {
    expect(mexeEmOrders(LIMPO)).toBe(false)
    expect(mexeEmOrders(`${LIMPO}\nalter table public.orders add column admin_note text;`)).toBe(true)
    expect(naPublicacaoDoRealtime(LIMPO)).toBe(false)
    expect(naPublicacaoDoRealtime(`${LIMPO}\nalter publication supabase_realtime add table public.${TABELA};`)).toBe(true)
  })
})

describe('só o admin lê e grava', () => {
  it('RLS ligada', () => {
    expect(comRls(LIMPO)).toBe(true)
    expect(comRls(mutar(LIMPO, new RegExp(`alter table public\\.${TABELA}\\s+enable row level security;`), ''))).toBe(false)
  })

  it('revoga tudo do anon', () => {
    expect(revogaAnon(LIMPO)).toBe(true)
    expect(revogaAnon(mutar(LIMPO, new RegExp(`revoke all on table public\\.${TABELA}\\s+from anon;`), ''))).toBe(false)
  })

  it('uma policy só, de admin, `to authenticated`, no `using` E no `with check`', () => {
    expect(policyDeAdmin(LIMPO)).toBe(true)
    const comando = `on public.${TABELA}${policyDa(LIMPO)!}`
    // A meia-correção: sem o `with check`, uma cliente logada INSERE livremente.
    expect(policyDeAdmin(mutar(LIMPO, comando, comando.replace(/\s*with check[\s\S]*$/i, '')))).toBe(false)
    expect(policyDeAdmin(mutar(LIMPO, comando, comando.replace('to authenticated', 'to public')))).toBe(false)
    expect(policyDeAdmin(mutar(LIMPO, comando, comando.replace(/using\s*\([^\n]*\)/i, 'using (true)')))).toBe(false)
    // Uma segunda policy (uma leitura "da dona do pedido" de conveniência) também reprova.
    expect(policyDeAdmin(`${LIMPO}\ncreate policy "dona le" on public.${TABELA} for select using (true);`)).toBe(false)
  })

  it('nenhum `grant` alcança o anon', () => {
    expect(grantAAnon(LIMPO)).toBe(false)
    expect(grantAAnon(`${LIMPO}\ngrant select on public.${TABELA} to anon;`)).toBe(true)
  })
})

describe('a migration não escreve dado', () => {
  it('sem insert, update ou delete', () => {
    expect(escreveDado(LIMPO)).toBe(false)
    expect(escreveDado(`${LIMPO}\ninsert into public.${TABELA} (order_id, note) values (gen_random_uuid(), 'x');`)).toBe(true)
  })
})
