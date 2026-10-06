import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature `61` — a chave do Measurement Protocol não pode vazar.
 *
 * Lê o `.sql` **do disco**, no molde de `entregaDeEmailSchema`, `checkoutSchema` e `menuSchema`. O
 * motivo é o de sempre: **afrouxar uma migration não quebra nada**. Uma policy "só para admin" na
 * tabela da chave, um `grant` que alcança `anon`, um `revoke` que some — tudo aplica limpo e passa
 * em build, em `tsc` e em teste de componente. Quem descobre é quem for procurar, e do outro lado
 * está uma credencial que deixa qualquer pessoa mandar compra falsa para o GA4 da loja.
 *
 * O que este arquivo guarda, e por quê:
 *
 * - **`analytics_secrets` tem RLS ligada e ZERO policy.** Com RLS e nenhuma policy, `anon` e
 *   `authenticated` não leem nem gravam linha nenhuma; só a service role alcança. Uma policy, mesmo
 *   com `has_role`, abriria a chave ao navegador da admin — e o painel nunca a vê de volta
 *   (`ANL-05`: só de escrita).
 * - **O `revoke` é a segunda camada.** Os default privileges do Supabase concedem tudo a `anon` e
 *   `authenticated` em tabela nova; sem o revoke a única contenção seria a RLS.
 * - **Nenhum `grant`**, em lugar nenhum da migration.
 * - **O interruptor nasce `false`** e a semeadura é `on conflict (key) do nothing` — o `do nothing`
 *   é o que impede o `db push` seguinte de religar ou desligar o que a dona escolheu.
 * - **O `check` de `ga_purchase_status` tem EXATAMENTE os cinco estados** — nem um a mais (estado
 *   que o servidor não produz), nem um a menos (o servidor gravaria e o banco recusaria, no meio da
 *   aprovação do pagamento).
 *
 * Cada régua é um **predicado** (`L-033`: uma por COMANDO, nunca uma para a família), exercido
 * contra o arquivo real E contra uma mutação dele. O helper `mutar()` **lança** quando a mutação
 * não muda nada: um sensor cujo `replace` perde o alvo vira no-op em silêncio, e passaria a medir o
 * arquivo intacto.
 *
 * O removedor de comentário normaliza CRLF antes (`L-031`) e faz linha e bloco na MESMA varredura
 * (`BL-027`). O cabeçalho da migration explica em prosa o que é proibido; sem o removedor, a régua
 * acusaria a prosa.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261005120000_61-google-analytics.sql')

const sql = readFileSync(CAMINHO, 'utf8')

/** Os cinco estados do envio do `purchase` (`CMP-02..07`). A ordem não importa; o conjunto sim. */
const STATUS_DO_ENVIO = ['sending', 'sent', 'failed', 'skipped_declined', 'skipped_disabled']

/** As cinco colunas novas de `orders`. */
const COLUNAS = [
  'ga_client_id',
  'ga_session_id',
  'analytics_declined',
  'ga_purchase_status',
  'ga_purchase_at',
] as const

// -------------------------------------------------------------------------------------------
// Removedor de comentário, token exato e o mutador que lança
// -------------------------------------------------------------------------------------------

const semComentario = (texto: string): string =>
  texto.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|--[^\n]*/g, '')

/** Token exato (`L-034`): o nome não pode continuar em letra, dígito, `_` ou `-`. */
const tk = (nome: string): string => `${nome}(?![-\\w])`

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

// -------------------------------------------------------------------------------------------
// As réguas — uma por COMANDO
// -------------------------------------------------------------------------------------------

/** Comando 1: a semeadura da chave `analytics`, recortada do `INSERT` até o `;`. */
const blocoDaSemeadura = (texto: string): string | null =>
  semComentario(texto).match(
    /insert\s+into\s+public\.store_settings\s*\(key,\s*value\)\s*values\s*\(\s*'analytics'[\s\S]*?;/i,
  )?.[0] ?? null

const semeiaComDoNothing = (texto: string): boolean => {
  const bloco = blocoDaSemeadura(texto)
  return bloco !== null && /on\s+conflict\s*\(key\)\s*do\s+nothing\s*;$/i.test(bloco)
}

const interruptorNasceDesligado = (texto: string): boolean => {
  const bloco = blocoDaSemeadura(texto)
  return bloco !== null && /'enabled',\s*false\b/i.test(bloco) && !/'enabled',\s*true\b/i.test(bloco)
}

/** Comando 2: a tabela nasce, com a chave presa a um nome só e o valor limitado a 128. */
const blocoDaTabela = (texto: string): string | null =>
  semComentario(texto).match(
    new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${tk('analytics_secrets')}\\s*\\([\\s\\S]*?\\n\\);`, 'i'),
  )?.[0] ?? null

const tabelaComLimites = (texto: string): boolean => {
  const bloco = blocoDaTabela(texto)
  return (
    bloco !== null &&
    /key\s+text\s+primary\s+key\s+check\s*\(\s*key\s*=\s*'ga4_api_secret'\s*\)/i.test(bloco) &&
    /value\s+text\s+not\s+null\s+check\s*\(\s*char_length\(value\)\s+between\s+1\s+and\s+128\s*\)/i.test(bloco)
  )
}

/** Comando 3: RLS ligada. */
const ligaRls = (texto: string): boolean =>
  new RegExp(
    `alter\\s+table\\s+public\\.${tk('analytics_secrets')}\\s+enable\\s+row\\s+level\\s+security\\s*;`,
    'i',
  ).test(semComentario(texto))

/** Comando 4 (ausência): nenhuma policy, em lugar nenhum da migration. */
const semPolicy = (texto: string): boolean => !/create\s+policy/i.test(semComentario(texto))

/** Comando 5: `revoke all` de `anon` E de `authenticated`. */
const revogaDosDois = (texto: string): boolean =>
  new RegExp(
    `revoke\\s+all\\s+on\\s+(?:table\\s+)?public\\.${tk('analytics_secrets')}\\s+from\\s+anon\\s*,\\s*authenticated\\s*;`,
    'i',
  ).test(semComentario(texto))

/** Comando 6 (ausência): nenhum `grant`. */
const semGrant = (texto: string): boolean => !/\bgrant\s/i.test(semComentario(texto))

/** Comando 7 (× 5 colunas): cada coluna de `orders` entra com `add column if not exists`. */
const adicionaColuna = (texto: string, coluna: string): boolean =>
  new RegExp(`add\\s+column\\s+if\\s+not\\s+exists\\s+${tk(coluna)}`, 'i').test(semComentario(texto))

/** O alvo do `alter table` das colunas é `orders`, e não outra tabela. */
const colunasEmOrders = (texto: string): boolean =>
  /alter\s+table\s+public\.orders\s+add\s+column\s+if\s+not\s+exists\s+ga_client_id/i.test(semComentario(texto))

/** `analytics_declined` é `boolean not null default false` — pedido antigo não é "recusou". */
const recusaNasceFalsa = (texto: string): boolean =>
  /analytics_declined\s+boolean\s+not\s+null\s+default\s+false/i.test(semComentario(texto))

/** Comando 8: o `check` do status do envio, com o CONJUNTO exato dos cinco estados. */
const statusDoCheck = (texto: string): string[] | null => {
  const m = semComentario(texto).match(/check\s*\(\s*ga_purchase_status\s+in\s*\(([^)]*)\)\s*\)/i)
  if (!m) return null
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort()
}

const checkComOsCinco = (texto: string): boolean =>
  JSON.stringify(statusDoCheck(texto)) === JSON.stringify([...STATUS_DO_ENVIO].sort())

/** Comando 9 (ausência): nenhuma escrita de dado além da semeadura de configuração. */
const semEscritaDeDado = (texto: string): boolean => {
  const s = semComentario(texto)
  return (
    !/\bupdate\s+public\./i.test(s) &&
    !/\bdelete\s+from\b/i.test(s) &&
    !/insert\s+into\s+public\.(?!store_settings\b)/i.test(s)
  )
}

// -------------------------------------------------------------------------------------------

describe('analyticsSchema — âncoras', () => {
  it('leu a migration do disco, e ela fala das três coisas', () => {
    expect(sql).toContain('analytics_secrets')
    expect(sql).toContain('store_settings')
    expect(sql).toContain('public.orders')
  })

  it('os recortes ACHAM os blocos — recorte que falha devolve null e reprova', () => {
    expect(blocoDaSemeadura(sql)).not.toBeNull()
    expect(blocoDaTabela(sql)).not.toBeNull()
    expect(statusDoCheck(sql)).not.toBeNull()
  })

  it('o removedor de comentário funciona com CRLF e com LF', () => {
    expect(semComentario('a -- create policy x\r\nb')).toBe('a \nb')
    expect(semComentario('a -- create policy x\nb')).toBe('a \nb')
    expect(semComentario('a /* grant ** */ b')).toBe('a  b')
  })

  it('mutar() LANÇA quando a mutação não encontra o alvo', () => {
    expect(() => mutar(sql, 'texto que não existe na migration', 'x')).toThrow(/não encontrou o alvo/)
  })
})

describe('store_settings.analytics — a semeadura', () => {
  it('é `on conflict (key) do nothing`', () => {
    expect(semeiaComDoNothing(sql)).toBe(true)
  })

  it('sensor: trocar por `do update` reprova', () => {
    const m = mutar(sql, /ON CONFLICT \(key\) DO NOTHING;/, 'ON CONFLICT (key) DO UPDATE SET value = excluded.value;')
    expect(semeiaComDoNothing(m)).toBe(false)
  })

  it('o interruptor nasce DESLIGADO', () => {
    expect(interruptorNasceDesligado(sql)).toBe(true)
  })

  it('sensor: nascer ligado reprova', () => {
    expect(interruptorNasceDesligado(mutar(sql, "'enabled', false", "'enabled', true"))).toBe(false)
  })
})

describe('analytics_secrets — a chave não sai do servidor', () => {
  it('a tabela prende a chave a um nome só e limita o valor a 1..128', () => {
    expect(tabelaComLimites(sql)).toBe(true)
  })

  it('sensor: sem o limite de tamanho reprova', () => {
    expect(tabelaComLimites(mutar(sql, 'between 1 and 128', 'between 0 and 100000'))).toBe(false)
  })

  it('sensor: sem o check do nome da chave reprova', () => {
    expect(tabelaComLimites(mutar(sql, " check (key = 'ga4_api_secret')", ''))).toBe(false)
  })

  it('RLS ligada', () => {
    expect(ligaRls(sql)).toBe(true)
  })

  it('sensor: sem o `enable row level security` reprova', () => {
    expect(ligaRls(mutar(sql, /alter table public\.analytics_secrets enable row level security;/, ''))).toBe(false)
  })

  it('ZERO policy na migration', () => {
    expect(semPolicy(sql)).toBe(true)
  })

  it('sensor: uma policy "só para admin" reprova', () => {
    const m = mutar(
      sql,
      'revoke all on public.analytics_secrets',
      "create policy \"admin le\" on public.analytics_secrets for select to authenticated using (public.has_role(auth.uid(), 'admin'));\nrevoke all on public.analytics_secrets",
    )
    expect(semPolicy(m)).toBe(false)
  })

  it('sensor inverso: a palavra "policy" na prosa do cabeçalho NÃO é acusada', () => {
    // O cabeçalho da migration diz "nenhuma policy" e "Uma policy 'so para admin'". Se a régua
    // lesse comentário, o arquivo certo reprovaria.
    expect(sql).toMatch(/--[^\n]*policy/i)
    expect(semPolicy(sql)).toBe(true)
  })

  it('`revoke all` de anon E de authenticated', () => {
    expect(revogaDosDois(sql)).toBe(true)
  })

  it('sensor: revogar só de anon reprova', () => {
    expect(revogaDosDois(mutar(sql, 'from anon, authenticated;', 'from anon;'))).toBe(false)
  })

  it('sensor: sem o revoke reprova', () => {
    expect(revogaDosDois(mutar(sql, /revoke all on public\.analytics_secrets from anon, authenticated;/, ''))).toBe(false)
  })

  it('nenhum `grant`', () => {
    expect(semGrant(sql)).toBe(true)
  })

  it('sensor: um grant de select a anon reprova', () => {
    const m = mutar(
      sql,
      'revoke all on public.analytics_secrets from anon, authenticated;',
      'revoke all on public.analytics_secrets from anon, authenticated;\ngrant select on public.analytics_secrets to anon;',
    )
    expect(semGrant(m)).toBe(false)
  })
})

describe('orders — os ids do GA e o resultado do envio', () => {
  it('as colunas entram em `public.orders`', () => {
    expect(colunasEmOrders(sql)).toBe(true)
  })

  it('sensor: mudar a tabela-alvo reprova', () => {
    expect(colunasEmOrders(mutar(sql, 'alter table public.orders', 'alter table public.customers'))).toBe(false)
  })

  for (const coluna of COLUNAS) {
    it(`${coluna}: \`add column if not exists\``, () => {
      expect(adicionaColuna(sql, coluna)).toBe(true)
    })

    it(`${coluna}: sensor — sem o \`if not exists\` reprova`, () => {
      const m = mutar(sql, new RegExp(`add column if not exists ${coluna}(?![-\\w])`), `add column ${coluna}`)
      expect(adicionaColuna(m, coluna)).toBe(false)
    })
  }

  it('o recorte é por token exato: `ga_purchase_status` não casa `ga_purchase_status_x`', () => {
    expect(adicionaColuna('add column if not exists ga_purchase_status_x text', 'ga_purchase_status')).toBe(false)
  })

  it('`analytics_declined` nasce `not null default false`', () => {
    expect(recusaNasceFalsa(sql)).toBe(true)
  })

  it('sensor: default true reprova', () => {
    expect(recusaNasceFalsa(mutar(sql, 'boolean not null default false', 'boolean not null default true'))).toBe(false)
  })

  it('o check de `ga_purchase_status` tem EXATAMENTE os cinco estados', () => {
    expect(statusDoCheck(sql)).toEqual([...STATUS_DO_ENVIO].sort())
    expect(checkComOsCinco(sql)).toBe(true)
  })

  it('sensor: um estado a menos reprova', () => {
    expect(checkComOsCinco(mutar(sql, ", 'skipped_disabled'", ''))).toBe(false)
  })

  it('sensor: um estado a mais reprova', () => {
    expect(checkComOsCinco(mutar(sql, "'skipped_disabled')", "'skipped_disabled', 'retrying')"))).toBe(false)
  })
})

describe('a migration não escreve dado além da configuração', () => {
  it('nenhum update, delete, nem insert fora de store_settings', () => {
    expect(semEscritaDeDado(sql)).toBe(true)
  })

  it('sensor: um update em orders reprova', () => {
    const m = mutar(sql, 'comment on column public.orders.ga_client_id', "update public.orders set analytics_declined = true;\ncomment on column public.orders.ga_client_id")
    expect(semEscritaDeDado(m)).toBe(false)
  })

  it('sensor: um insert em analytics_secrets reprova (a chave nunca vem semeada)', () => {
    const m = mutar(
      sql,
      'alter table public.analytics_secrets enable',
      "insert into public.analytics_secrets (key, value) values ('ga4_api_secret', 'x');\nalter table public.analytics_secrets enable",
    )
    expect(semEscritaDeDado(m)).toBe(false)
  })
})
