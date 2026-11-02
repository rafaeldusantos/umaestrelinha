import { describe, expect, it } from 'vitest'

import { PRESENCE_DEVICES, PRESENCE_PAGE_KINDS, PRESENCE_SOURCES, PRESENCE_CART_MAX } from '@estrelinha/core/visits'

import {
  blocoDaFuncao,
  blocoDaTabela,
  colunas,
  lerMigration,
  mutar,
  papeis,
  revogadaDosTres,
  semComentario,
  temSearchPathVazio,
  temSecurityDefiner,
} from './visitasRegras'

/**
 * O guarda da migration da presença na loja (Loja ao vivo, Fase 2).
 *
 * Lê o `.sql` do disco, no molde de `visitasSchema.test.ts`: afrouxar uma migration não quebra nada.
 * Uma coluna de IP, de user agent, de referrer ou de URL acrescentada à presença, uma policy aberta,
 * o `grant … to service_role` esquecido (todo pulso daria 500), a poda sumindo, o teto de linhas
 * caindo — tudo isso aplica limpo e passa em build, `tsc` e teste de componente.
 *
 * Uma régua por comando, cada uma um predicado exercido também contra texto mutado; `mutar()` lança
 * quando não acha o alvo. O comportamento (grava, poda, não conta duas vezes, teto, só `service_role`)
 * é provado pelo probe contra o banco local, não aqui.
 */

const ARQUIVO = '20261104120000_presenca-na-loja.sql'
const sql = lerMigration(ARQUIVO)
const comandos = semComentario(sql)

const TABELAS = ['store_presence', 'store_presence_minutes', 'store_presence_carts']

/** As colunas permitidas, por extenso. Qualquer coluna a mais reprova. */
const COLUNAS: Record<string, string[][]> = {
  store_presence: [
    ['presence_id', 'uuid'],
    ['last_seen_at', 'timestamptz'],
    ['page_kind', 'text'],
    ['product_id', 'uuid'],
    ['cart_items', 'smallint'],
    ['source', 'text'],
    ['device', 'text'],
  ],
  store_presence_minutes: [
    ['minute', 'timestamptz'],
    ['presence_id', 'uuid'],
  ],
  store_presence_carts: [
    ['day', 'date'],
    ['presence_id', 'uuid'],
    ['first_cart_at', 'timestamptz'],
  ],
}

/** Um nome de coluna que guardaria dado proibido: IP, user agent, referrer, URL. */
const PROIBIDA = /(?:^|_)(?:ip|ua|user_agent|agent|referr?er|ref|url|uri|path|host|origin)(?:_|$)/i
const colunasProibidas = (texto: string): string[] =>
  TABELAS.flatMap((t) => (colunas(texto, t) ?? []).map(([n]) => n)).filter((n) => PROIBIDA.test(n))

/** Os valores do `check (coluna in (...))` de uma tabela. */
const vocabulario = (texto: string, tabela: string, coluna: string): string[] | null => {
  const b = blocoDaTabela(texto, tabela)
  if (!b) return null
  const m = b.match(new RegExp(`\\b${coluna}\\b[^,]*?check\\s*\\(\\s*${coluna}\\s+in\\s*\\(([^)]*)\\)`, 'i'))
  if (!m) return null
  return m[1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''))
}

const rlsLigada = (texto: string, tabela: string): boolean =>
  new RegExp(`alter\\s+table\\s+public\\.${tabela}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(semComentario(texto))

const temPolicy = (texto: string): boolean => /\bcreate\s+policy\b/i.test(semComentario(texto))

const podaNaGravacao = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, 'record_store_presence')
  return !!b && /perform\s+public\.prune_store_presence\s*\(\s*p_agora\s*\)/i.test(b)
}

/** As três podas, cada uma com o seu prazo. */
const prazosDaPoda = (texto: string): Record<string, boolean> => {
  const b = blocoDaFuncao(texto, 'prune_store_presence') ?? ''
  return {
    presenca: /delete\s+from\s+public\.store_presence\s+where\s+last_seen_at\s*<\s*p_agora\s*-\s*interval\s+'30 minutes'/i.test(b),
    minuto: /delete\s+from\s+public\.store_presence_minutes\s+where\s+minute\s*<\s*p_agora\s*-\s*interval\s+'1 hour'/i.test(b),
    sacola: /delete\s+from\s+public\.store_presence_carts\s+where\s+day\s*<\s*public\.store_day\s*\(\s*p_agora\s*\)\s*-\s*14\b/i.test(b),
  }
}

const tetoDe5000 = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, 'record_store_presence')
  return !!b && /select\s+count\(\*\)\s+from\s+public\.store_presence\s*\)\s*>=\s*5000\b/i.test(b)
}

const comparaOHost = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, 'record_store_presence')
  return (
    !!b &&
    /public\.store_production_host\s*\(\s*\)/i.test(b) &&
    /public\.store_canonical_host\s*\(\s*p_host\s*\)\s*<>\s*v_prod/i.test(b)
  )
}

const minutoSemDuplicar = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, 'record_store_presence')
  return !!b && /insert\s+into\s+public\.store_presence_minutes[\s\S]*?on\s+conflict\s+do\s+nothing/i.test(b)
}

const marcaComPrimeiraHora = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, 'record_store_presence')
  return !!b && /insert\s+into\s+public\.store_presence_carts[\s\S]*?on\s+conflict\s+do\s+nothing/i.test(b)
}

/** `insert`/`update`/`delete` fora dos corpos de função: escrita de dado na migration. */
const escritaForaDeFuncao = (texto: string): boolean => {
  const sem = semComentario(texto).replace(/\$\$[\s\S]*?\$\$/g, '')
  return /\b(?:insert\s+into|update\s+public\.|delete\s+from)\b/i.test(sem)
}

const FN_GRAVA = 'record_store_presence'

describe('migration da presença — a forma das tabelas', () => {
  it('âncora: o arquivo foi lido e as três tabelas e as três funções foram recortadas', () => {
    expect(sql).toContain('record_store_presence')
    for (const t of TABELAS) expect(blocoDaTabela(sql, t), t).not.toBeNull()
    for (const f of ['record_store_presence', 'prune_store_presence', 'store_canonical_host']) {
      expect(blocoDaFuncao(sql, f), f).not.toBeNull()
    }
  })

  it.each(TABELAS)('%s tem exatamente as colunas permitidas', (t) => {
    expect(colunas(sql, t)).toEqual(COLUNAS[t])
  })

  it('nenhuma coluna guarda IP, user agent, referrer ou URL', () => {
    expect(colunasProibidas(sql)).toEqual([])
  })

  it('sensor — uma coluna de user agent, de IP ou de URL É acusada', () => {
    for (const col of ['user_agent text', 'ip inet', 'page_url text', 'referrer text']) {
      const m = mutar(sql, 'device       text not null', `${col},\n  device text not null`)
      expect(colunasProibidas(m).length, col).toBe(1)
    }
  })

  it('os vocabulários do `check` são os do contrato do corpo (importados)', () => {
    expect(vocabulario(sql, 'store_presence', 'page_kind')).toEqual([...PRESENCE_PAGE_KINDS])
    expect(vocabulario(sql, 'store_presence', 'source')).toEqual([...PRESENCE_SOURCES])
    expect(vocabulario(sql, 'store_presence', 'device')).toEqual([...PRESENCE_DEVICES])
    expect(comandos).toMatch(new RegExp(`cart_items\\s+smallint[^,]*check\\s*\\(cart_items between 0 and ${PRESENCE_CART_MAX}\\)`))
  })

  it('sensor — uma faixa a mais no `check` diverge do contrato', () => {
    const m = mutar(sql, "'whatsapp', 'direto', 'outros'", "'whatsapp', 'direto', 'outros', 'facebook'")
    expect(vocabulario(m, 'store_presence', 'source')).not.toEqual([...PRESENCE_SOURCES])
  })
})

describe('migration da presença — fechada', () => {
  it.each(TABELAS)('%s: RLS ligada e `revoke all` dos três papéis', (t) => {
    expect(rlsLigada(sql, t)).toBe(true)
    expect(revogadaDosTres(sql, 'table', t)).toBe(true)
  })

  it('nenhuma policy', () => {
    expect(temPolicy(sql)).toBe(false)
    expect(temPolicy(`${sql}\ncreate policy x on public.store_presence for select using (true);`)).toBe(true)
  })

  it('sensor — sem o `revoke` de `anon`, a régua reprova', () => {
    const m = mutar(comandos, 'revoke all on table public.store_presence from public, anon, authenticated;', 'revoke all on table public.store_presence from public, authenticated;')
    expect(revogadaDosTres(m, 'table', 'store_presence')).toBe(false)
  })

  it('a gravação é `security definer`, `search_path` vazio, revogada dos três e concedida SÓ à `service_role`', () => {
    expect(temSecurityDefiner(sql, FN_GRAVA)).toBe(true)
    expect(temSearchPathVazio(sql, FN_GRAVA)).toBe(true)
    expect(revogadaDosTres(sql, 'function', FN_GRAVA)).toBe(true)
    expect(papeis(sql, 'grant', 'function', FN_GRAVA)).toEqual(['service_role'])
  })

  it('sensor — o grant esquecido, ou estendido a `anon`, reprova', () => {
    const semGrant = mutar(comandos, /grant execute on function public\.record_store_presence[^;]*;/, '')
    expect(papeis(semGrant, 'grant', 'function', FN_GRAVA)).toEqual([])
    const comAnon = mutar(comandos, 'to service_role;', 'to service_role, anon;')
    expect(papeis(comAnon, 'grant', 'function', FN_GRAVA)).toContain('anon')
  })

  it('a poda e o host canônico não são concedidos a ninguém', () => {
    for (const f of ['prune_store_presence', 'store_canonical_host']) {
      expect(revogadaDosTres(sql, 'function', f), f).toBe(true)
      expect(papeis(sql, 'grant', 'function', f), f).toEqual([])
    }
    expect(temSecurityDefiner(sql, 'prune_store_presence')).toBe(false)
  })

  it('nenhuma escrita de dado fora de função', () => {
    expect(escritaForaDeFuncao(sql)).toBe(false)
    expect(escritaForaDeFuncao(`${sql}\ninsert into public.store_presence values (1);`)).toBe(true)
  })
})

describe('migration da presença — poda, teto, host e contagem', () => {
  it('a gravação poda antes de gravar', () => {
    expect(podaNaGravacao(sql)).toBe(true)
    expect(podaNaGravacao(mutar(comandos, 'perform public.prune_store_presence(p_agora);', ''))).toBe(false)
  })

  it('os três prazos: presença 30 min, minuto 1 hora, marca de sacola 14 dias', () => {
    expect(prazosDaPoda(sql)).toEqual({ presenca: true, minuto: true, sacola: true })
    expect(prazosDaPoda(mutar(comandos, "interval '30 minutes'", "interval '3 hours'")).presenca).toBe(false)
    expect(prazosDaPoda(mutar(comandos, "interval '1 hour'", "interval '1 day'")).minuto).toBe(false)
    expect(prazosDaPoda(mutar(comandos, 'store_day(p_agora) - 14', 'store_day(p_agora) - 90')).sacola).toBe(false)
  })

  it('o teto de 5.000 linhas na presença', () => {
    expect(tetoDe5000(sql)).toBe(true)
    expect(tetoDe5000(mutar(comandos, '>= 5000', '>= 50000'))).toBe(false)
  })

  it('o host da origem é comparado com o host de produção, no SQL', () => {
    expect(comparaOHost(sql)).toBe(true)
    expect(comparaOHost(mutar(comandos, 'public.store_canonical_host(p_host) <> v_prod', 'false'))).toBe(false)
  })

  it('o minuto e a marca diária não contam duas vezes', () => {
    expect(minutoSemDuplicar(sql)).toBe(true)
    expect(marcaComPrimeiraHora(sql)).toBe(true)
    const semNada = mutar(comandos, /(insert into public\.store_presence_carts[\s\S]*?)on conflict do nothing/, 'INSERE_MARCA')
    expect(marcaComPrimeiraHora(semNada)).toBe(false)
  })

  it('o job do pg_cron só nasce se a extensão existir, e não a cria', () => {
    expect(comandos).toMatch(/if\s+exists\s*\(\s*select\s+1\s+from\s+pg_extension\s+where\s+extname\s*=\s*'pg_cron'\s*\)\s+then\s+perform\s+cron\.schedule\(\s*'prune-store-presence'/i)
    expect(comandos).not.toMatch(/create\s+extension/i)
  })
})
