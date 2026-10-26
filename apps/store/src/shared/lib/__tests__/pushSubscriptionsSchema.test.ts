import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { PUSH_EVENTS } from '@estrelinha/core/notifications'

/**
 * O guarda da migration da feature `79` — as inscrições do aviso no celular (`MAN-23`, `MAN-27`,
 * `MAN-29`, `MAN-33`, `MAN-34`, `AD-062`).
 *
 * Molde de `atelieClockSchema.test.ts`, pelo motivo de sempre: **afrouxar uma migration não quebra
 * nada**. Uma policy para `authenticated` (a tabela guarda o endpoint, que é credencial de entrega,
 * e uma conta sem papel leria os aparelhos da dona), um `grant` a `authenticated`, o `on delete
 * cascade` sumindo (a conta apagada deixaria aparelhos órfãos recebendo avisos), o `unique` sumindo
 * (o mesmo celular em duas linhas, dois avisos iguais), um evento a mais no `check`, a trava de
 * `claim_push_test` sumindo (duas chamadas quase simultâneas passando as duas), ou o teto do teste
 * voltando para a linha da inscrição — tudo aplica limpo e passa em build, `tsc` e teste de componente.
 *
 * **O teto mora em `push_test_claims`, uma linha por CONTA** (conserto do probe da T26): gravado na
 * linha do aparelho testado, ele sumia quando a porta apagava essa linha por "gone" (`MAN-35`), e o
 * teste seguinte noutro aparelho da mesma conta saía na hora. As réguas abaixo recusam a volta nas
 * duas pontas: a coluna na inscrição e a conferência/gravação lendo a inscrição.
 *
 * **Uma régua por COMANDO** (`L-033`), cada uma um predicado exercido também contra texto mutado, e
 * `mutar()` **lança** quando a mutação não muda nada. O `default` e o `check` de `events` são
 * comparados com `PUSH_EVENTS` **importado** — a régua nunca é o objeto medido. A semântica
 * (permissões, cascata, atomicidade) é do probe `02-banco` da feature, contra o banco local.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const PASTA = resolve(ROOT, 'supabase/migrations')
const NOME = '20261026120000_79-avisos-no-celular.sql'

const sql = readFileSync(resolve(PASTA, NOME), 'utf8').replace(/\r\n/g, '\n')

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`L-031`, `BL-027`). */
const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, () => para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

const comandos = semComentario(sql)

/** O `create table` inteiro, até o `);` que o fecha. `null` reprova. */
const tabela = (texto: string): string | null => {
  const c = semComentario(texto)
  const inicio = c.search(/create\s+table\s+if\s+not\s+exists\s+public\.push_subscriptions\s*\(/i)
  if (inicio < 0) return null
  const fim = c.indexOf('\n);', inicio)
  return fim < 0 ? null : c.slice(inicio, fim + 3)
}

/** O `create table` da tabela do teto, até o `);` que o fecha. `null` reprova. */
const tabelaTeto = (texto: string): string | null => {
  const c = semComentario(texto)
  const inicio = c.search(/create\s+table\s+if\s+not\s+exists\s+public\.push_test_claims\s*\(/i)
  if (inicio < 0) return null
  const fim = c.indexOf('\n);', inicio)
  return fim < 0 ? null : c.slice(inicio, fim + 3)
}

/** O bloco da função, do `create or replace function` até o `$$;`. `null` reprova. */
const funcao = (texto: string): string | null => {
  const c = semComentario(texto)
  const inicio = c.search(/create\s+or\s+replace\s+function\s+public\.claim_push_test\s*\(/i)
  if (inicio < 0) return null
  const fim = c.indexOf('$$;', inicio)
  return fim < 0 ? null : c.slice(inicio, fim + 3)
}

/** O texto FORA da função — onde nenhuma escrita de dado pode morar. */
const foraDaFuncao = (texto: string): string => {
  const c = semComentario(texto)
  const f = funcao(texto)
  return f ? c.replace(f, '') : c
}

const listaDe = (trecho: string | undefined): string[] | null =>
  trecho === undefined ? null : [...trecho.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])

/** Os eventos do `default` de `events`, na ordem. `null` se o `default` sumiu. */
const eventosDoDefault = (texto: string): string[] | null =>
  listaDe((tabela(texto) ?? '').match(/\bevents\s+text\[\]\s+not\s+null\s+default\s+array\[([^\]]*)\]::text\[\]/i)?.[1])

/** Os eventos do `check` de `events`, na ordem. `null` se o `check` sumiu. */
const eventosDoCheck = (texto: string): string[] | null =>
  listaDe(
    (tabela(texto) ?? '').match(
      /constraint\s+push_subscriptions_events_check\s+check\s*\(\s*events\s*<@\s*array\[([^\]]*)\]::text\[\]\s*\)/i,
    )?.[1],
  )

/** Os papéis de cada `grant`/`revoke` sobre um alvo. */
const papeis = (texto: string, verbo: 'grant' | 'revoke', alvo: string): string[] => {
  const prep = verbo === 'grant' ? 'to' : 'from'
  const re = new RegExp(`\\b${verbo}\\s+[\\w\\s,]+?\\s+on\\s+${alvo}\\s+${prep}\\s+([^;]+);`, 'gi')
  return [...semComentario(texto).matchAll(re)].flatMap((m) => m[1].split(',').map((p) => p.trim().toLowerCase()))
}
const TABELA = 'public\\.push_subscriptions'
const TABELA_TETO = 'public\\.push_test_claims'
const FUNCAO = 'function\\s+public\\.claim_push_test\\s*\\(\\s*uuid\\s*,\\s*text\\s*\\)'

const indice = (corpo: string, re: RegExp): number => corpo.search(re)

// -------------------------------------------------------------------------------------------
// As réguas — cada uma devolve `true` quando a migration está certa
// -------------------------------------------------------------------------------------------

const R = {
  rls: (t: string) => /alter\s+table\s+public\.push_subscriptions\s+enable\s+row\s+level\s+security\s*;/i.test(semComentario(t)),
  /** MAN-23: NENHUMA policy, para papel nenhum — admin incluído. */
  zeroPolicy: (t: string) => !/\bcreate\s+policy\b/i.test(semComentario(t)),
  revokeTabela: (t: string) => ['public', 'anon', 'authenticated'].every((p) => papeis(t, 'revoke', TABELA).includes(p)),
  grantTabelaSoServiceRole: (t: string) => {
    const g = papeis(t, 'grant', TABELA)
    return g.length === 1 && g[0] === 'service_role'
  },
  /** MAN-29: a conta apagada leva as inscrições junto. */
  cascata: (t: string) =>
    /\buser_id\s+uuid\s+not\s+null\s+references\s+auth\.users\s*\(\s*id\s*\)\s+on\s+delete\s+cascade\b/i.test(tabela(t) ?? ''),
  /** MAN-27: o mesmo aparelho é UMA linha. */
  endpointUnico: (t: string) => /\bendpoint\s+text\s+not\s+null\s+unique\b/i.test(tabela(t) ?? ''),
  chavesObrigatorias: (t: string) =>
    /\bp256dh\s+text\s+not\s+null\b/i.test(tabela(t) ?? '') && /\bauth\s+text\s+not\s+null\b/i.test(tabela(t) ?? ''),
  indicePorConta: (t: string) =>
    /create\s+index\s+if\s+not\s+exists\s+push_subscriptions_user_id\s+on\s+public\.push_subscriptions\s*\(\s*user_id\s*\)\s*;/i.test(
      semComentario(t),
    ),
  /**
   * MAN-33: o teto NÃO mora na inscrição — a linha apagada por "gone" o levaria junto. A âncora de
   * `tabela()` é a dos `endpointUnico`/`cascata`; aqui só a ausência da coluna.
   */
  semTetoNaInscricao: (t: string) => tabela(t) !== null && !/\blast_test_at\b/i.test(tabela(t) ?? ''),
  /** MAN-33: uma linha POR CONTA, que cai com a conta (MAN-29). */
  tetoPorConta: (t: string) =>
    /\buser_id\s+uuid\s+primary\s+key\s+references\s+auth\.users\s*\(\s*id\s*\)\s+on\s+delete\s+cascade\b/i.test(tabelaTeto(t) ?? ''),
  tetoInstante: (t: string) => /\blast_test_at\s+timestamptz\s+not\s+null\b/i.test(tabelaTeto(t) ?? ''),
  rlsTeto: (t: string) => /alter\s+table\s+public\.push_test_claims\s+enable\s+row\s+level\s+security\s*;/i.test(semComentario(t)),
  revokeTeto: (t: string) => ['public', 'anon', 'authenticated'].every((p) => papeis(t, 'revoke', TABELA_TETO).includes(p)),
  grantTetoSoServiceRole: (t: string) => {
    const g = papeis(t, 'grant', TABELA_TETO)
    return g.length === 1 && g[0] === 'service_role'
  },
  definer: (t: string) => /\bsecurity\s+definer\b/i.test(funcao(t) ?? ''),
  searchPath: (t: string) => /set\s+search_path\s*=\s*''/i.test(funcao(t) ?? ''),
  devolveBoolean: (t: string) =>
    /create\s+or\s+replace\s+function\s+public\.claim_push_test\s*\(\s*p_user_id\s+uuid\s*,\s*p_endpoint\s+text\s*\)\s+returns\s+boolean\b/i.test(
      funcao(t) ?? '',
    ),
  /**
   * MAN-33: trava → o aparelho é da conta? → confere → grava, NESSA ordem. A trava é por conta; o
   * endpoint que não é da conta devolve `false` ANTES de tocar no teto; a conferência olha a linha DA
   * CONTA em `push_test_claims` (nunca a inscrição); a gravação é um upsert por `user_id`.
   */
  ordemTravaConfereGrava: (t: string) => {
    const f = funcao(t) ?? ''
    const trava = indice(f, /perform\s+pg_advisory_xact_lock\s*\(\s*hashtext\s*\(\s*p_user_id::text\s*\)\s*\)\s*;/i)
    const pertence = indice(
      f,
      /if\s+not\s+exists\s*\(\s*select\s+1\s+from\s+public\.push_subscriptions\s+where\s+user_id\s*=\s*p_user_id\s+and\s+endpoint\s*=\s*p_endpoint\s*\)\s*then\s+return\s+false\s*;\s*end\s+if\s*;/i,
    )
    const confere = indice(
      f,
      /if\s+exists\s*\(\s*select\s+1\s+from\s+public\.push_test_claims\s+where\s+user_id\s*=\s*p_user_id\s+and\s+last_test_at\s*>\s*now\(\)\s*-\s*interval\s+'30 seconds'\s*\)\s*then\s+return\s+false\s*;\s*end\s+if\s*;/i,
    )
    const grava = indice(
      f,
      /insert\s+into\s+public\.push_test_claims\s*\(\s*user_id\s*,\s*last_test_at\s*\)\s+values\s*\(\s*p_user_id\s*,\s*now\(\)\s*\)\s+on\s+conflict\s*\(\s*user_id\s*\)\s+do\s+update\s+set\s+last_test_at\s*=\s*excluded\.last_test_at\s*;\s*return\s+true\s*;/i,
    )
    return trava >= 0 && pertence > trava && confere > pertence && grava > confere
  },
  /** A função não grava na inscrição (nem o `last_used_at`): a única escrita dela é o teto. */
  funcaoNaoGravaInscricao: (t: string) => funcao(t) !== null && !/\b(update|insert\s+into|delete\s+from)\s+public\.push_subscriptions\b/i.test(funcao(t) ?? ''),
  revokeFuncao: (t: string) => ['public', 'anon', 'authenticated'].every((p) => papeis(t, 'revoke', FUNCAO).includes(p)),
  grantFuncaoSoServiceRole: (t: string) => {
    const g = papeis(t, 'grant', FUNCAO)
    return g.length === 1 && g[0] === 'service_role'
  },
  /** MAN-34: o canal `push` na memória de envio, com a constraint derrubada antes. */
  canalPush: (t: string) => {
    const c = semComentario(t)
    const derruba = c.search(/alter\s+table\s+public\.order_notifications\s+drop\s+constraint\s+if\s+exists\s+order_notifications_channel_check\s*;/i)
    const cria = c.search(
      /alter\s+table\s+public\.order_notifications\s+add\s+constraint\s+order_notifications_channel_check\s+check\s*\(\s*channel\s+in\s*\(\s*'email'\s*,\s*'whatsapp'\s*,\s*'push'\s*\)\s*\)\s*;/i,
    )
    return derruba >= 0 && cria > derruba
  },
  /** Nenhuma escrita de dado fora da função, e nenhum `drop table`/`truncate`. */
  semEscritaDeDado: (t: string) =>
    !/\b(insert\s+into|delete\s+from|update\s+public\.|truncate|drop\s+table)\b/i.test(foraDaFuncao(t)),
  recarregaSchema: (t: string) => /notify\s+pgrst\s*,\s*'reload schema'\s*;/i.test(semComentario(t)),
}

// -------------------------------------------------------------------------------------------

describe('âncoras — a varredura olhou alguma coisa', () => {
  it('o arquivo, a tabela, a função e a constraint foram achados', () => {
    expect(sql.length).toBeGreaterThan(1500)
    expect(tabela(sql)).not.toBeNull()
    expect(funcao(sql)).not.toBeNull()
    expect(tabelaTeto(sql)).not.toBeNull()
    expect(eventosDoCheck(sql)).not.toBeNull()
    expect(comandos).toMatch(/order_notifications_channel_check/)
  })

  it('o prefixo da migration é único entre as do disco', () => {
    const prefixo = NOME.slice(0, 14)
    expect(readdirSync(PASTA).filter((f) => f.startsWith(prefixo))).toEqual([NOME])
  })
})

describe('a tabela (MAN-23, MAN-27, MAN-29)', () => {
  it.each(Object.keys(R) as (keyof typeof R)[])('régua `%s`', (nome) => {
    expect(R[nome](sql)).toBe(true)
  })

  it('o `default` de `events` é PUSH_EVENTS, na ordem (A5: os quatro ligados)', () => {
    expect(eventosDoDefault(sql)).toEqual([...PUSH_EVENTS])
  })

  it('o `check` de `events` é PUSH_EVENTS, na ordem', () => {
    expect(eventosDoCheck(sql)).toEqual([...PUSH_EVENTS])
  })
})

describe('SENSORES — cada mutação reprova a régua dela', () => {
  const casos: [keyof typeof R, string | RegExp, string][] = [
    ['zeroPolicy', 'alter table public.push_subscriptions enable row level security;', 'alter table public.push_subscriptions enable row level security;\ncreate policy "admin" on public.push_subscriptions for select to authenticated using (true);'],
    ['grantTabelaSoServiceRole', 'grant select, insert, update, delete on public.push_subscriptions to service_role;', 'grant select, insert, update, delete on public.push_subscriptions to service_role, authenticated;'],
    ['revokeTabela', 'revoke all on public.push_subscriptions from public, anon, authenticated;', 'revoke all on public.push_subscriptions from public, anon;'],
    ['rls', 'alter table public.push_subscriptions enable row level security;', ''],
    ['cascata', 'references auth.users (id) on delete cascade', 'references auth.users (id)'],
    ['endpointUnico', 'endpoint text not null unique', 'endpoint text not null'],
    ['ordemTravaConfereGrava', /perform pg_advisory_xact_lock\(hashtext\(p_user_id::text\)\);/, ''],
    // O teto de volta na inscrição (a forma do defeito do probe 03), nas duas pontas.
    ['semTetoNaInscricao', '  last_used_at timestamptz not null default now(),\n', '  last_used_at timestamptz not null default now(),\n  last_test_at timestamptz,\n'],
    ['ordemTravaConfereGrava', /from public\.push_test_claims(?=\s+where user_id = p_user_id\s+and last_test_at)/, 'from public.push_subscriptions'],
    ['ordemTravaConfereGrava', 'on conflict (user_id) do update set last_test_at = excluded.last_test_at;', 'on conflict (user_id) do nothing;'],
    // O endpoint de outra conta deixaria de ser recusado antes do teto.
    ['ordemTravaConfereGrava', /if not exists \([\s\S]*?end if;/, ''],
    ['funcaoNaoGravaInscricao', '  return true;\nend;', '  update public.push_subscriptions set last_used_at = now() where endpoint = p_endpoint;\n  return true;\nend;'],
    ['tetoPorConta', 'user_id uuid primary key references auth.users (id) on delete cascade', 'user_id uuid references auth.users (id) on delete cascade'],
    ['tetoPorConta', 'user_id uuid primary key references auth.users (id) on delete cascade', 'user_id uuid primary key references auth.users (id)'],
    ['tetoInstante', 'last_test_at timestamptz not null\n', 'last_test_at timestamptz\n'],
    ['rlsTeto', 'alter table public.push_test_claims enable row level security;', ''],
    ['revokeTeto', 'revoke all on public.push_test_claims from public, anon, authenticated;', 'revoke all on public.push_test_claims from public, anon;'],
    ['grantTetoSoServiceRole', 'grant select, insert, update, delete on public.push_test_claims to service_role;', 'grant select, insert, update, delete on public.push_test_claims to service_role, authenticated;'],
    ['zeroPolicy', 'alter table public.push_test_claims enable row level security;', 'alter table public.push_test_claims enable row level security;\ncreate policy "dona" on public.push_test_claims for select to authenticated using (user_id = auth.uid());'],
    ['searchPath', "set search_path = ''", ''],
    ['definer', 'security definer', 'security invoker'],
    ['grantFuncaoSoServiceRole', 'grant execute on function public.claim_push_test(uuid, text) to service_role;', 'grant execute on function public.claim_push_test(uuid, text) to service_role, authenticated;'],
    ['canalPush', "check (channel in ('email', 'whatsapp', 'push'))", "check (channel in ('email', 'whatsapp'))"],
    ['semEscritaDeDado', "notify pgrst, 'reload schema';", "insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (gen_random_uuid(), 'x', 'y', 'z');\nnotify pgrst, 'reload schema';"],
  ]

  it.each(casos)('`%s` reprova a mutação', (regua, de, para) => {
    expect(R[regua](mutar(sql, de, para))).toBe(false)
  })

  it('a ordem confere/grava INVERTIDA reprova', () => {
    const f = funcao(sql)!
    const confere = f.match(/if\s+exists\s*\([\s\S]*?end\s+if\s*;/i)![0]
    const grava = f.match(/insert\s+into\s+public\.push_test_claims[\s\S]*?;/i)![0]
    const invertida = f.replace(confere, '§C§').replace(grava, confere).replace('§C§', grava)
    // As mutações partem do SQL SEM comentário: é dele que `funcao()` recorta o bloco.
    expect(R.ordemTravaConfereGrava(comandos)).toBe(true)
    expect(R.ordemTravaConfereGrava(mutar(comandos, f, invertida))).toBe(false)
  })

  it('o teto conferido ANTES de saber se o aparelho é da conta reprova', () => {
    const f = funcao(sql)!
    const pertence = f.match(/if\s+not\s+exists\s*\([\s\S]*?end\s+if\s*;/i)![0]
    const confere = f.match(/if\s+exists\s*\([\s\S]*?end\s+if\s*;/i)![0]
    const trocada = f.replace(pertence, '§P§').replace(confere, pertence).replace('§P§', confere)
    expect(R.ordemTravaConfereGrava(mutar(comandos, f, trocada))).toBe(false)
  })

  it('um evento a mais no `check` (ou a menos no `default`) diverge de PUSH_EVENTS', () => {
    const mais = mutar(sql, "events <@ array['owner_order_received',", "events <@ array['order_paid', 'owner_order_received',")
    expect(eventosDoCheck(mais)).not.toEqual([...PUSH_EVENTS])
    const menos = mutar(sql, "default array['owner_order_received', ", 'default array[')
    expect(eventosDoDefault(menos)).not.toEqual([...PUSH_EVENTS])
  })

  it('a régua de policy enxerga só código: a palavra em comentário não reprova (LF e CRLF)', () => {
    for (const quebra of ['\n', '\r\n']) {
      expect(R.zeroPolicy(`${sql}${quebra}-- create policy "x" on public.push_subscriptions${quebra}`)).toBe(true)
      expect(R.zeroPolicy(`${sql}${quebra}create policy "x" on public.push_subscriptions for all using (true);${quebra}`)).toBe(false)
    }
  })

  it('o `insert` DENTRO da função não conta como escrita de dado (e fora dela conta)', () => {
    expect(funcao(sql)).toMatch(/insert\s+into\s+public\.push_test_claims/i)
    expect(R.semEscritaDeDado(sql)).toBe(true)
    expect(
      R.semEscritaDeDado(mutar(sql, "notify pgrst, 'reload schema';", "insert into public.push_test_claims (user_id, last_test_at) values (gen_random_uuid(), now());\nnotify pgrst, 'reload schema';")),
    ).toBe(false)
  })

  it('mutar() lança quando a mutação não acha o alvo', () => {
    expect(() => mutar(sql, 'não existe este texto', 'x')).toThrow(/não encontrou/)
  })
})
