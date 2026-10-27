import { describe, expect, it } from 'vitest'

import { STORE_TIME_ZONE } from '@estrelinha/core/time'

import {
  blocoDaFuncao,
  blocoDaTabela,
  colunas,
  consultaDePedidos,
  corpoDaFuncao,
  diaDe,
  diaEPrazo,
  FILTROS_DA_83,
  fronteiras,
  foraDasFuncoes,
  lerMigration,
  listaPositiva,
  migrationVigenteDe,
  mutar,
  mutarNoBloco as mutarNoBlocoDe,
  papeis,
  pelaRegua,
  periodoCasado,
  PISO_DA_83,
  podaAntesDeGravar,
  podaSegura,
  portaoDeAdmin as portao,
  revogadaDosTres,
  semComentario,
  semQualificacao,
  SET_CERTO,
  setDoUpsert,
  somasComPiso,
  temSearchPathVazio,
  temSecurityDefiner,
  tetoDe5000 as teto,
  tetoNoPeriodo,
  tickets as ticket,
  upsertDentroDoFound,
  visitasDistintas as distintas,
} from './visitasRegras'

/**
 * O guarda da migration da feature `71` — Visitas únicas no Dashboard (`VIS-03`, `VIS-14`,
 * `VIS-15`, `VIS-27`, `VIS-28`, `VIS-30`..`VIS-34`, `VIS-44`).
 *
 * Lê o `.sql` **do disco**, no molde de `minhaContaSchema.test.ts`, e pelo mesmo motivo: **afrouxar
 * uma migration não quebra nada**. A tabela de visitas ganhando uma coluna de IP, a função de poda
 * nascendo `security definer` sem `revoke` (qualquer visitante apagaria a tabela pela chave
 * publicável), o `grant … to service_role` esquecido (toda visita daria 500), um `public.` tirado
 * de uma chamada (a primeira leitura do painel cai com `42883` e a migration aplica limpa), o dia
 * decidido por `current_date` (o fuso do servidor, não o de Brasília) — tudo isso aplica limpo e
 * passa em build, `tsc` e teste de componente.
 *
 * **Uma régua por COMANDO** (`L-033`). Cada régua é um **predicado**, exercido também contra texto
 * mutado — e `mutar()` **lança** quando a mutação não muda nada (lição do `mutar()` da `52`).
 * As mutações partem do SQL **sem comentário**: a prosa explica os comandos citando-os, e mutar o
 * arquivo cru consumiria a menção em vez do uso.
 *
 * **Desde a `83`** as funções de asserção MORAM em `visitasRegras.ts` (mudança de endereço, nenhuma
 * régua afrouxada) e são aplicadas também à migration VIGENTE — a última, por prefixo, que recria
 * `store_movement` e `record_store_visit` (bloco no fim deste arquivo, `L-035`).
 */

const ARQUIVO_DA_71 = '20261021120000_71-visitas-unicas.sql'

// CRLF normalizado ANTES de qualquer régua: um checkout no Windows não pode mudar o veredito.
const sql = lerMigration(ARQUIVO_DA_71)

const comandos = semComentario(sql)

/** Troca DENTRO do bloco de uma função da `71` (e só nele). Lança se o bloco ou a troca não acontecem. */
const mutarNoBloco = (nome: string, de: string | RegExp, para: string): string => mutarNoBlocoDe(sql, nome, de, para)

const NOVE_FUNCOES = [
  'store_time_zone',
  'store_day',
  'store_day_start',
  'store_week_start',
  'store_production_host',
  'prune_store_visits',
  'record_store_visit',
  'store_clock',
  'store_movement',
]

// -------------------------------------------------------------------------------------------
// Âncora
// -------------------------------------------------------------------------------------------

describe('âncora — o arquivo, as duas tabelas e as funções foram encontrados', () => {
  it('o arquivo foi lido e tem conteúdo', () => {
    expect(sql.length).toBeGreaterThan(1000)
  })

  it('as duas tabelas estão lá', () => {
    expect(blocoDaTabela(sql, 'store_visits')).not.toBeNull()
    expect(blocoDaTabela(sql, 'store_visit_counter')).not.toBeNull()
  })

  it.each(NOVE_FUNCOES)('a função `%s` está lá', (nome) => {
    expect(blocoDaFuncao(sql, nome)).not.toBeNull()
  })

  it('são EXATAMENTE nove funções criadas pela migration', () => {
    expect(comandos.match(/create\s+or\s+replace\s+function\s+public\.\w+/gi)).toHaveLength(9)
  })
})

// -------------------------------------------------------------------------------------------
// 1. As tabelas (VIS-28)
// -------------------------------------------------------------------------------------------

describe('1. store_visits — exatamente (day, visitor_id), fechada', () => {
  it('as colunas são EXATAMENTE `day date` e `visitor_id uuid`', () => {
    expect(colunas(sql, 'store_visits')).toEqual([
      ['day', 'date'],
      ['visitor_id', 'uuid'],
    ])
  })

  it('sensor — uma coluna a mais (o IP) é acusada', () => {
    const mutante = mutar(comandos, 'visitor_id uuid not null,', 'visitor_id uuid not null,\n  ip inet,')
    expect(colunas(mutante, 'store_visits')).not.toEqual([
      ['day', 'date'],
      ['visitor_id', 'uuid'],
    ])
  })

  it('a chave primária é `(day, visitor_id)` — a leitura e a poda recortam por `day`', () => {
    expect(/primary\s+key\s*\(\s*day\s*,\s*visitor_id\s*\)/i.test(blocoDaTabela(sql, 'store_visits') ?? '')).toBe(true)
  })

  it('sensor — sem a chave primária, reprova', () => {
    const mutante = mutar(comandos, /,\s*primary key \(day, visitor_id\)/, '')
    expect(/primary\s+key\s*\(\s*day\s*,\s*visitor_id\s*\)/i.test(blocoDaTabela(mutante, 'store_visits') ?? '')).toBe(false)
  })
})

describe('1. store_visit_counter — o singleton de instantes da LOJA', () => {
  it('as colunas são EXATAMENTE as quatro', () => {
    expect((colunas(sql, 'store_visit_counter') ?? []).map(([n]) => n)).toEqual([
      'id',
      'started_at',
      'last_recorded_at',
      'capped_day',
    ])
  })

  it('sensor — uma coluna fora das quatro é acusada', () => {
    const mutante = mutar(comandos, 'capped_day       date', 'capped_day       date,\n  last_visitor_id uuid')
    expect((colunas(mutante, 'store_visit_counter') ?? []).map(([n]) => n)).toContain('last_visitor_id')
  })

  it('é singleton: `id boolean primary key … check (id)`', () => {
    expect(/id\s+boolean\s+primary\s+key\s+default\s+true\s+check\s*\(\s*id\s*\)/i.test(blocoDaTabela(sql, 'store_visit_counter') ?? '')).toBe(true)
  })
})

describe.each(['store_visits', 'store_visit_counter'])('1. %s — RLS, revoke e nenhuma policy', (tabela) => {
  const rls = (texto: string) =>
    new RegExp(`alter\\s+table\\s+public\\.${tabela}\\s+enable\\s+row\\s+level\\s+security\\s*;`, 'i').test(semComentario(texto))
  const policy = (texto: string) =>
    new RegExp(`create\\s+policy\\s+[^;]*\\bon\\s+public\\.${tabela}\\b`, 'i').test(semComentario(texto))

  it('RLS ligada', () => {
    expect(rls(sql)).toBe(true)
  })

  it('sensor — sem RLS, reprova', () => {
    expect(rls(mutar(comandos, new RegExp(`alter table public\\.${tabela} enable row level security;`), ''))).toBe(false)
  })

  it('`revoke all` de public, anon e authenticated (sem ele, `anon` leria zero linhas em vez de 42501)', () => {
    expect(revogadaDosTres(sql, 'table', tabela)).toBe(true)
  })

  it('sensor — sem `anon` no revoke, reprova', () => {
    const mutante = mutar(comandos, `revoke all on table public.${tabela} from public, anon, authenticated;`, `revoke all on table public.${tabela} from public, authenticated;`)
    expect(revogadaDosTres(mutante, 'table', tabela)).toBe(false)
  })

  it('nenhum `grant` na tabela', () => {
    expect(papeis(sql, 'grant', 'table', tabela)).toEqual([])
  })

  it('nenhuma `create policy`', () => {
    expect(policy(sql)).toBe(false)
  })

  it('sensor — uma policy É acusada', () => {
    expect(policy(`${comandos}\ncreate policy "x" on public.${tabela} for select using (true);`)).toBe(true)
  })
})

// -------------------------------------------------------------------------------------------
// 2. As funções de régua (VIS-34) e o host
// -------------------------------------------------------------------------------------------

const REGUAS = ['store_time_zone', 'store_day', 'store_day_start', 'store_week_start', 'store_production_host']

describe.each(REGUAS)('2. `%s` — fechada, sem grant', (nome) => {
  it('revogada de public, anon e authenticated', () => {
    expect(revogadaDosTres(sql, 'function', nome)).toBe(true)
  })

  it('nenhum `grant`', () => {
    expect(papeis(sql, 'grant', 'function', nome)).toEqual([])
  })

  it('não é `security definer`', () => {
    expect(temSecurityDefiner(sql, nome)).toBe(false)
  })
})

describe('2. as réguas — sensores de grant e revoke', () => {
  it('sensor — um `grant` a `anon` numa régua É acusado', () => {
    const mutante = `${comandos}\ngrant execute on function public.store_day(timestamptz) to anon;`
    expect(papeis(mutante, 'grant', 'function', 'store_day')).toEqual(['anon'])
  })

  it('sensor — sem o revoke, reprova', () => {
    const mutante = mutar(comandos, 'revoke execute on function public.store_week_start(date) from public, anon, authenticated;', '')
    expect(revogadaDosTres(mutante, 'function', 'store_week_start')).toBe(false)
  })
})

describe('2. o fuso — UM literal, dentro de `store_time_zone`, igual ao dono em TypeScript', () => {
  const literais = (texto: string) => (semComentario(texto).match(/'America\/Sao_Paulo'/g) ?? []).length
  const dentroDoDono = (texto: string) => (blocoDaFuncao(texto, 'store_time_zone') ?? '').includes(`'${STORE_TIME_ZONE}'`)

  it('o literal aparece UMA vez no código', () => {
    expect(literais(sql)).toBe(1)
  })

  it('e é o de `STORE_TIME_ZONE` (`@estrelinha/core/time`), dentro de `store_time_zone`', () => {
    expect(dentroDoDono(sql)).toBe(true)
  })

  it('sensor — um segundo literal (em `store_day`) É acusado', () => {
    const mutante = mutar(comandos, '(p at time zone public.store_time_zone())::date', "(p at time zone 'America/Sao_Paulo')::date")
    expect(literais(mutante)).toBe(2)
  })

  it('sensor — um fuso diferente do dono em TypeScript reprova', () => {
    const mutante = mutar(comandos, "select 'America/Sao_Paulo'", "select 'America/Bahia'")
    expect(dentroDoDono(mutante)).toBe(false)
  })

  it('`store_day` e `store_day_start` leem o fuso de `store_time_zone()`', () => {
    expect(blocoDaFuncao(sql, 'store_day')).toMatch(/at\s+time\s+zone\s+public\.store_time_zone\(\)/i)
    expect(blocoDaFuncao(sql, 'store_day_start')).toMatch(/at\s+time\s+zone\s+public\.store_time_zone\(\)/i)
  })
})

describe('2. formas proibidas de decidir o dia (VIS-34)', () => {
  const proibidas = (texto: string): string[] => {
    const c = semComentario(texto)
    const achadas: string[] = []
    if (/\bcurrent_date\b/i.test(c)) achadas.push('current_date')
    if (/now\(\)\s*::\s*date/i.test(c)) achadas.push('now()::date')
    if (/paid_at\s*::\s*date/i.test(c)) achadas.push('paid_at::date')
    if (/date_trunc\s*\(\s*'week'/i.test(c)) achadas.push("date_trunc('week'")
    if (/-03\b/.test(c)) achadas.push('-03')
    return achadas
  }

  it('nenhuma está no código', () => {
    expect(proibidas(sql)).toEqual([])
  })

  it.each([
    ['current_date', 'v_dia date := public.store_day(p_agora);', 'v_dia date := current_date;'],
    ['now()::date', 'v_dia date := public.store_day(p_agora);', 'v_dia date := now()::date;'],
    ["date_trunc('week'", "select p - (extract(isodow from p)::int - 1)", "select date_trunc('week', p)::date"],
    ['-03', '(p at time zone public.store_time_zone())::date', "(p at time zone '-03')::date"],
  ])('sensor — `%s` É acusado', (forma, de, para) => {
    expect(proibidas(mutar(comandos, de, para))).toContain(forma)
  })

  it('`store_week_start` trunca a semana sobre a DATA local, por `isodow`', () => {
    expect(blocoDaFuncao(sql, 'store_week_start')).toMatch(/p\s*-\s*\(\s*extract\s*\(\s*isodow\s+from\s+p\s*\)\s*::\s*int\s*-\s*1\s*\)/i)
  })

  it('as quatro funções de dia NÃO têm `set search_path` (seriam deixadas de inlinar)', () => {
    for (const nome of ['store_time_zone', 'store_day', 'store_day_start', 'store_week_start']) {
      expect(blocoDaFuncao(sql, nome), nome).not.toMatch(/set\s+search_path/i)
    }
  })
})

describe('2. store_production_host — UMA leitura do host, com `search_path` vazio', () => {
  it('lê `store_settings.analytics.production_host` e cai em vazio', () => {
    const b = blocoDaFuncao(sql, 'store_production_host') ?? ''
    expect(b).toMatch(/coalesce\s*\(\s*\(\s*select\s+value\s*->>\s*'production_host'\s+from\s+public\.store_settings\s+where\s+key\s*=\s*'analytics'\s*\)\s*,\s*''\s*\)/i)
  })

  it('`search_path` vazio', () => {
    expect(temSearchPathVazio(sql, 'store_production_host')).toBe(true)
  })
})

// -------------------------------------------------------------------------------------------
// 3. prune_store_visits (VIS-30) — invoker, fechada
// -------------------------------------------------------------------------------------------

describe('3. prune_store_visits', () => {
  it('é `security invoker`, escrito por extenso — nunca definer', () => {
    expect(temSecurityDefiner(sql, 'prune_store_visits')).toBe(false)
    expect(blocoDaFuncao(sql, 'prune_store_visits')).toMatch(/\bsecurity\s+invoker\b/i)
  })

  it('sensor — `security definer` É acusado (a chave publicável apagaria a tabela inteira)', () => {
    const mutante = mutar(comandos, 'security invoker', 'security definer')
    expect(temSecurityDefiner(mutante, 'prune_store_visits')).toBe(true)
  })

  it('revogada dos três, e SEM grant nenhum', () => {
    expect(revogadaDosTres(sql, 'function', 'prune_store_visits')).toBe(true)
    expect(papeis(sql, 'grant', 'function', 'prune_store_visits')).toEqual([])
  })

  it('sensor — um `grant` a `authenticated` É acusado', () => {
    const mutante = `${comandos}\ngrant execute on function public.prune_store_visits(date) to authenticated;`
    expect(papeis(mutante, 'grant', 'function', 'prune_store_visits')).toEqual(['authenticated'])
  })

  const poda = (texto: string) =>
    /delete\s+from\s+public\.store_visits\s+where\s+day\s*<\s*p_dia\s*-\s*7\s*;/i.test(blocoDaFuncao(texto, 'prune_store_visits') ?? '')

  it('apaga `day < p_dia - 7` (hoje e os 7 anteriores ficam)', () => {
    expect(poda(sql)).toBe(true)
  })

  it('sensor — sem o `- 7`, reprova', () => {
    expect(poda(mutar(comandos, 'where day < p_dia - 7;', 'where day < p_dia - 30;'))).toBe(false)
  })
})

// -------------------------------------------------------------------------------------------
// 4. record_store_visit e store_clock (VIS-14, VIS-27, VIS-28, VIS-44)
// -------------------------------------------------------------------------------------------

const ASSINATURAS: Record<string, string> = {
  record_store_visit: 'record_store_visit(uuid, timestamptz)',
  store_clock: 'store_clock(timestamptz)',
}

describe.each(['record_store_visit', 'store_clock'])('4. %s — definer, só o service_role', (nome) => {
  it('`security definer` com `search_path` vazio', () => {
    expect(temSecurityDefiner(sql, nome)).toBe(true)
    expect(temSearchPathVazio(sql, nome)).toBe(true)
  })

  it('sensor — sem `security definer`, reprova', () => {
    const mutante = mutarNoBloco(nome, /security definer/i, 'security invoker')
    expect(temSecurityDefiner(mutante, nome)).toBe(false)
  })

  it('sensor — sem `search_path` vazio, reprova', () => {
    const mutante = mutarNoBloco(nome, /set search_path = ''/i, 'set search_path = public')
    expect(temSearchPathVazio(mutante, nome)).toBe(false)
  })

  it('revogada dos três', () => {
    expect(revogadaDosTres(sql, 'function', nome)).toBe(true)
  })

  it('`grant execute … to service_role` — e a NENHUM outro papel', () => {
    expect(papeis(sql, 'grant', 'function', nome)).toEqual(['service_role'])
  })

  it('sensor — sem o `grant … to service_role`, reprova (toda visita daria 500)', () => {
    const mutante = mutar(comandos, `grant execute on function public.${ASSINATURAS[nome]} to service_role;`, '')
    expect(papeis(mutante, 'grant', 'function', nome)).toEqual([])
  })

  it('sensor — um `grant` a `anon` É acusado', () => {
    const mutante = mutar(comandos, `grant execute on function public.${ASSINATURAS[nome]} to service_role;`, `grant execute on function public.${ASSINATURAS[nome]} to service_role, anon;`)
    expect(papeis(mutante, 'grant', 'function', nome)).toEqual(['service_role', 'anon'])
  })

  it('toda referência às funções e tabelas da feature é qualificada por `public.`', () => {
    expect(semQualificacao(sql, nome)).toEqual([])
  })

  it('`ate` e `agora` saem como `bigint` (sem ele o JSON traz `.000000`)', () => {
    const b = blocoDaFuncao(sql, nome) ?? ''
    expect(b).toMatch(/'ate'\s*,\s*\(\s*extract\s*\(\s*epoch\s+from\s+v_ate\s*\)\s*\*\s*1000\s*\)\s*::\s*bigint/i)
    expect(b).toMatch(/'agora'\s*,\s*\(\s*extract\s*\(\s*epoch\s+from\s+p_agora\s*\)\s*\*\s*1000\s*\)\s*::\s*bigint/i)
  })

  it('sensor — sem o `::bigint` em `ate`, reprova', () => {
    const mutante = mutarNoBloco(nome, /\(extract\(epoch from v_ate\) \* 1000\)::bigint/, 'extract(epoch from v_ate) * 1000')
    expect(blocoDaFuncao(mutante, nome)).not.toMatch(/'ate'\s*,\s*\(\s*extract\s*\(\s*epoch\s+from\s+v_ate\s*\)\s*\*\s*1000\s*\)\s*::\s*bigint/i)
  })
})

describe('4. a qualificação por `public.` — sensores', () => {
  it('sensor — um `public.` tirado de uma chamada É acusado', () => {
    const mutante = mutar(comandos, 'perform public.prune_store_visits(v_dia);', 'perform prune_store_visits(v_dia);')
    expect(semQualificacao(mutante, 'record_store_visit')).toEqual(['prune_store_visits'])
  })

  it('sensor — um `public.` tirado de uma tabela É acusado', () => {
    const mutante = mutar(comandos, 'from public.store_visits where day = v_dia and visitor_id = p_id', 'from store_visits where day = v_dia and visitor_id = p_id')
    expect(semQualificacao(mutante, 'record_store_visit')).toEqual(['store_visits'])
  })
})

describe('4. record_store_visit — a ordem do corpo', () => {
  const corpo = () => blocoDaFuncao(sql, 'record_store_visit') ?? ''

  // G9 (verificação r3): `store_clock` produz o MESMO `ate` das respostas robô/interno/429, e a
  // régua cobria só a gravação. Os dois produtores do campo têm de derivá-lo igual.

  it.each(['record_store_visit', 'store_clock'])(
    '%s: o dia vem de `store_day(p_agora)` e o prazo de `store_day_start(v_dia + 1)`',
    (nome) => {
      expect(diaEPrazo(sql, nome)).toBe(true)
    },
  )

  it.each(['record_store_visit', 'store_clock'])('%s: sensor — prazo no começo de HOJE reprova (S33)', (nome) => {
    expect(diaEPrazo(mutarNoBloco(nome, /store_day_start\(v_dia \+ 1\)/, 'store_day_start(v_dia)'), nome)).toBe(false)
  })

  it.each(['record_store_visit', 'store_clock'])('%s: sensor — prazo depois de AMANHÃ reprova (S33b)', (nome) => {
    expect(diaEPrazo(mutarNoBloco(nome, /store_day_start\(v_dia \+ 1\)/, 'store_day_start(v_dia + 2)'), nome)).toBe(false)
  })

  it('poda ANTES de gravar (VIS-30)', () => {
    const c = corpo()
    expect(c.search(/perform\s+public\.prune_store_visits\(\s*v_dia\s*\)/i)).toBeGreaterThan(-1)
    expect(c.search(/perform\s+public\.prune_store_visits/i)).toBeLessThan(c.search(/insert\s+into\s+public\.store_visits/i))
  })

  it('o teto é 5.000 linhas no dia (VIS-27)', () => {
    expect(teto(sql)).toBe(true)
  })

  it('sensor — sem o 5000, reprova', () => {
    expect(teto(mutar(comandos, '>= 5000', '>= 50000'))).toBe(false)
  })

  it('o teto anota o dia em `capped_day` (VIS-44)', () => {
    expect(corpo()).toMatch(/update\s+public\.store_visit_counter\s+set\s+capped_day\s*=\s*v_dia/i)
  })

  it('a gravação é `on conflict do nothing` e decide pelo `found` (a corrida responde `repetida`)', () => {
    expect(corpo()).toMatch(/insert\s+into\s+public\.store_visits\s*\(\s*day\s*,\s*visitor_id\s*\)\s*values\s*\(\s*v_dia\s*,\s*p_id\s*\)\s*on\s+conflict\s+do\s+nothing/i)
    expect(corpo()).toMatch(/if\s+found\s+then/i)
  })

  it('os quatro desfechos possíveis: gravada, repetida e teto', () => {
    const c = corpo()
    for (const d of ['gravada', 'repetida', 'teto']) expect(c).toContain(`'${d}'`)
  })
  // Conserto G2 da verificação r1 (VIS-38, VIS-40): `started_at` "gravado uma vez" e
  // `last_recorded_at` "acompanha a última linha nova". A metade semântica é provada pelo probe
  // (`probes/visitas.sql`, fixtura dos instantes); esta régua prende a FORMA do upsert, que é o que
  // a suíte enxerga sem banco.
  /** A cláusula `do update set …` do upsert do contador, espaços normalizados; `null` reprova. */

  it('o contador nasce com `started_at = last_recorded_at = p_agora`, e o `do update` só faz `greatest` em `last_recorded_at`', () => {
    expect(setDoUpsert(sql)).toBe(SET_CERTO)
  })

  it('`started_at` não é atribuído em lugar nenhum do corpo (só no `insert`)', () => {
    expect(blocoDaFuncao(comandos, 'record_store_visit')).not.toMatch(/started_at\s*=/i)
  })

  it('o upsert do contador mora DENTRO do `if found` — linha repetida não mexe nos instantes', () => {
    const c = blocoDaFuncao(comandos, 'record_store_visit') ?? ''
    const found = c.search(/if\s+found\s+then/i)
    const upsert = c.search(/insert\s+into\s+public\.store_visit_counter/i)
    const senao = c.indexOf("v_desfecho := 'repetida'", found)
    expect(found).toBeGreaterThan(-1)
    expect(upsert).toBeGreaterThan(found)
    expect(upsert).toBeLessThan(senao)
  })

  it('sensor S19 — o `do update` também reescrevendo `started_at` reprova', () => {
    const m = mutarNoBloco('record_store_visit', 'excluded.last_recorded_at);', 'excluded.last_recorded_at), started_at = excluded.started_at;')
    expect(setDoUpsert(m)).not.toBe(SET_CERTO)
    expect(blocoDaFuncao(m, 'record_store_visit')).toMatch(/started_at\s*=/i)
  })

  it('sensor S20 — `last_recorded_at` congelado reprova', () => {
    const m = mutarNoBloco('record_store_visit', /set last_recorded_at = greatest\([^;]*\);/, 'set last_recorded_at = public.store_visit_counter.last_recorded_at;')
    expect(setDoUpsert(m)).not.toBe(SET_CERTO)
  })

  it('sensor S21 — sem o `greatest` (a última gravação vence, mesmo anterior) reprova', () => {
    const m = mutarNoBloco('record_store_visit', /set last_recorded_at = greatest\([^;]*\);/, 'set last_recorded_at = excluded.last_recorded_at;')
    expect(setDoUpsert(m)).not.toBe(SET_CERTO)
  })
})

describe('4. store_clock — o relógio e o host, sem gravar', () => {
  it('lê o host de `store_production_host()` a cada chamada', () => {
    expect(blocoDaFuncao(sql, 'store_clock')).toMatch(/'production_host'\s*,\s*public\.store_production_host\(\)/i)
  })

  it('não escreve nada', () => {
    expect(blocoDaFuncao(sql, 'store_clock')).not.toMatch(/\b(insert|update|delete)\b/i)
  })
})

// -------------------------------------------------------------------------------------------
// 5. store_movement (VIS-15, VIS-31..VIS-34, VIS-44) — a leitura do painel
// -------------------------------------------------------------------------------------------

describe('5. store_movement — só admin, pela RPC', () => {

  it('`security definer`, `search_path` vazio', () => {
    expect(temSecurityDefiner(sql, 'store_movement')).toBe(true)
    expect(temSearchPathVazio(sql, 'store_movement')).toBe(true)
  })

  it('`has_role(auth.uid(), \'admin\')` DENTRO do corpo, recusando com 42501', () => {
    expect(portao(sql)).toBe(true)
  })

  it('sensor — sem o portão de admin, reprova', () => {
    expect(portao(mutarNoBloco('store_movement', /if not public\.has_role[\s\S]*?end if;/, ''))).toBe(false)
  })

  it('sensor — um errcode genérico reprova', () => {
    expect(portao(mutarNoBloco('store_movement', "errcode = '42501'", "errcode = 'P0001'"))).toBe(false)
  })

  it('`execute` revogado de public e anon, concedido SÓ a `authenticated`', () => {
    const r = papeis(sql, 'revoke', 'function', 'store_movement')
    expect(r).toContain('public')
    expect(r).toContain('anon')
    expect(papeis(sql, 'grant', 'function', 'store_movement')).toEqual(['authenticated'])
  })

  it('sensor — `execute` a `anon` É acusado', () => {
    const mutante = mutar(comandos, 'grant execute on function public.store_movement(timestamptz) to authenticated;', 'grant execute on function public.store_movement(timestamptz) to authenticated, anon;')
    expect(papeis(mutante, 'grant', 'function', 'store_movement')).toContain('anon')
  })

  it('sensor — sem o `grant … to authenticated`, reprova (o painel receberia 42501)', () => {
    const mutante = mutar(comandos, 'grant execute on function public.store_movement(timestamptz) to authenticated;', '')
    expect(papeis(mutante, 'grant', 'function', 'store_movement')).toEqual([])
  })

  it('toda referência às funções e tabelas da feature, a `has_role` e a `orders` é qualificada', () => {
    expect(semQualificacao(sql, 'store_movement')).toEqual([])
  })

  it('sensor — `has_role` sem `public.` É acusado', () => {
    const mutante = mutarNoBloco('store_movement', 'if not public.has_role(', 'if not has_role(')
    expect(semQualificacao(mutante, 'store_movement')).toEqual(['has_role'])
  })
})

describe('5. store_movement — visitas por `count(distinct)` em cada período (VIS-15)', () => {

  it('os três períodos contam ids DISTINTOS — nunca a soma dos dias', () => {
    expect(distintas(sql)).toBe(true)
  })

  it('sensor — a semana como `count(*)` reprova (a fixture seg/ter/qua daria 4)', () => {
    expect(distintas(mutarNoBloco('store_movement', 'count(distinct visitor_id) filter (where day between v_semana and v_hoje)', 'count(*) filter (where day between v_semana and v_hoje)'))).toBe(false)
  })

  it('a semana começa em `store_week_start(v_hoje)`', () => {
    expect(corpoDaFuncao(sql, 'store_movement')).toMatch(/v_semana\s*:=\s*public\.store_week_start\(\s*v_hoje\s*\)/i)
  })
})

describe('5. store_movement — vendas, faturamento e ticket (VIS-31, VIS-32)', () => {
  /** O `select … from public.orders …;` do corpo — o predicado de venda. `null` reprova. */

  it('venda é lista positiva: `approved` E não `cancelled`', () => {
    expect(listaPositiva(sql)).toBe(true)
  })

  it('sensor — sem o recorte de cancelado, reprova (fixture (c) voltaria a contar)', () => {
    expect(listaPositiva(mutarNoBloco('store_movement', /\s+and o\.status <> 'cancelled'/, ''))).toBe(false)
  })

  // SPEC_DEVIATION (D5): o predicado compara `paid_at` contra `store_day_start(…)` — a inversa da
  // mesma régua —, e não `store_day(paid_at)`: é o mesmo dia, e o predicado fica indexável.

  it('o predicado de `orders` usa `store_day_start` (D5)', () => {
    expect(pelaRegua(sql)).toBe(true)
  })

  it('sensor — o predicado por `paid_at::date` reprova (e é forma proibida)', () => {
    const mutante = mutarNoBloco('store_movement', 'o.paid_at >= public.store_day_start(v_desde)', 'o.paid_at::date >= v_desde')
    expect(pelaRegua(mutante)).toBe(false)
    expect(/paid_at\s*::\s*date/i.test(mutante)).toBe(true)
  })

  it('não filtra `nuvemshop_id` — pedidos importados contam (assunção pendente, padrão "contam")', () => {
    expect(corpoDaFuncao(sql, 'store_movement')).not.toMatch(/nuvemshop_id/i)
  })

  it('todo `sum(` do faturamento está dentro de `coalesce(…, 0)` — sem venda é 0, nunca NULL', () => {
    expect(somasComPiso(sql)).toBe(true)
  })

  it('sensor — um `coalesce` tirado reprova', () => {
    expect(somasComPiso(mutarNoBloco('store_movement', /coalesce\(sum\(o\.total\) filter \(where o\.paid_at >= v_ini_hoje\), 0\)/, 'sum(o.total) filter (where o.paid_at >= v_ini_hoje)'))).toBe(false)
  })

  // Conserto H1 da verificação r1: o MESMO sufixo nos três lugares (backreference). A régua antiga
  // (`v_f_\w+ / v_n_\w+`) aceitava o ticket de Hoje dividindo a soma da semana (mutante S08b), que
  // só morria por probe.

  it('o ticket é `round(faturamento / vendas, 2)` no banco, NULL sem venda — nos três períodos', () => {
    expect(ticket(sql)).toBe(3)
  })

  it('sensor — o ticket sem o `round` reprova', () => {
    expect(ticket(mutarNoBloco('store_movement', 'then round(v_f_hoje / v_n_hoje, 2) end', 'then v_f_hoje / v_n_hoje end'))).toBe(2)
  })

  it('sensor S08b — o ticket de Hoje dividindo a soma da SEMANA reprova', () => {
    expect(ticket(mutarNoBloco('store_movement', 'then round(v_f_hoje / v_n_hoje, 2) end', 'then round(v_f_semana / v_n_hoje, 2) end'))).toBe(2)
  })

  it('sensor S08c — o ticket de Hoje com o divisor de Ontem reprova', () => {
    expect(ticket(mutarNoBloco('store_movement', 'then round(v_f_hoje / v_n_hoje, 2) end', 'then round(v_f_hoje / v_n_ontem, 2) end'))).toBe(2)
  })

  it('cada período devolve as variáveis DELE — hoje, ontem e semana', () => {
    for (const p of ['hoje', 'ontem', 'semana'] as const) expect(periodoCasado(sql, p)).toBe(true)
  })

  it('sensor — o faturamento de Ontem lendo a soma da semana reprova', () => {
    const m = mutarNoBloco('store_movement', "'faturamento', v_f_ontem,", "'faturamento', v_f_semana,")
    expect(periodoCasado(m, 'ontem')).toBe(false)
    expect(periodoCasado(m, 'hoje')).toBe(true)
  })

  it('sensor — o ticket de Hoje trocado pelo de Ontem (bem formado, sufixo errado) reprova', () => {
    const m = mutarNoBloco('store_movement', 'case when v_n_hoje > 0 then round(v_f_hoje / v_n_hoje, 2) end', 'case when v_n_ontem > 0 then round(v_f_ontem / v_n_ontem, 2) end')
    expect(ticket(m)).toBe(3) // a régua do ticket, sozinha, aprovaria
    expect(periodoCasado(m, 'hoje')).toBe(false)
  })

  // Conserto G3 da verificação r1 (VIS-03, SPEC_DEVIATION D5): trocar `store_day(paid_at)` por um
  // intervalo só é "o mesmo dia" com `>=` no começo e `<` (aberto) no fim. A metade semântica é o
  // probe `probes/vendas.sql` (o pedido pago EXATAMENTE às 00:00); esta régua prende as seis
  // expressões de período da consulta de pedidos.

  it('Hoje é `paid_at >= v_ini_hoje`; Ontem é `[v_ini_ontem, v_ini_hoje)`, aberto à direita; Semana é `>= v_ini_semana` — nas contagens e nas somas', () => {
    expect(fronteiras(sql)).toBe(true)
  })

  it('sensor S10 — `<=` no fim de Ontem (o pedido das 00:00 contaria em Hoje E em Ontem) reprova', () => {
    const q = consultaDePedidos(comandos) ?? ''
    const alvo = 'o.paid_at >= v_ini_ontem and o.paid_at < v_ini_hoje'
    expect(q.split(alvo)).toHaveLength(3)
    expect(fronteiras(mutarNoBloco('store_movement', alvo, 'o.paid_at >= v_ini_ontem and o.paid_at <= v_ini_hoje'))).toBe(false)
  })

  it('sensor — Hoje com `>` (o pedido das 00:00 sairia de Hoje) reprova', () => {
    expect(fronteiras(mutarNoBloco('store_movement', 'count(*) filter (where o.paid_at >= v_ini_hoje)', 'count(*) filter (where o.paid_at > v_ini_hoje)'))).toBe(false)
  })
})

describe('5. store_movement — a poda e o teto na leitura (VIS-30, VIS-44)', () => {

  it('poda com `least(v_hoje, store_day(now()))` — um `p_agora` futuro não apaga o presente', () => {
    expect(podaSegura(sql)).toBe(true)
  })

  it('sensor — a poda por `v_hoje` puro reprova', () => {
    expect(podaSegura(mutarNoBloco('store_movement', 'least(v_hoje, public.store_day(now()))', 'v_hoje'))).toBe(false)
  })

  it('`teto_dia` sai só quando o dia do teto está no período aberto (`>= v_desde`)', () => {
    expect(corpoDaFuncao(sql, 'store_movement')).toMatch(/'teto_dia'\s*,\s*case\s+when\s+v_teto\s*>=\s*v_desde\s+then\s+v_teto::text\s+end/i)
  })

  it('a resposta traz os campos que o painel lê, sem decidir dia nem host', () => {
    const c = corpoDaFuncao(sql, 'store_movement') ?? ''
    for (const campo of ['hoje', 'ontem', 'inicio_semana', 'expira_em', 'lido_em', 'production_host', 'contagem_desde', 'contagem_desde_dia', 'ultima_visita', 'ultima_visita_dia', 'teto_dia', 'periodos', 'semana', 'visitas', 'vendas', 'faturamento', 'ticket']) {
      expect(c, campo).toContain(`'${campo}'`)
    }
    expect(c).toMatch(/'production_host'\s*,\s*public\.store_production_host\(\)/i)
  })
})

describe('5. store_movement — os dois DIAS do contador são o dia de Brasília (VIS-33, conserto G7 da r2)', () => {
  // A régua do campo acima confere só o NOME. A simplificação natural — `v_inicio::date::text` —
  // decide o dia pelo fuso da SESSÃO (UTC no local e no hospedado), e entre 21h e 24h de Brasília
  // ela escreve o dia SEGUINTE: "Última visita registrada: hoje às 22h30" na manhã de 22/10 para
  // uma visita de 21/10. O comportamento é provado por `probes/visitas.sql`
  // (`fixtura_dias_do_contador`); aqui fica a forma.

  /** Todo `::date` do código FORA do bloco de `store_day` — o único lugar onde o dia é decidido. */
  const dateForaDoDono = (texto: string): number => {
    const c = semComentario(texto)
    const dono = blocoDaFuncao(texto, 'store_day')
    if (!dono) return -1 // recorte que falha reprova (a régua espera 0)
    return (c.replace(dono, '').match(/::\s*date\b/gi) ?? []).length
  }

  it('âncora: o dono `store_day` tem o seu `::date` (sobre o instante já convertido ao fuso)', () => {
    expect(blocoDaFuncao(sql, 'store_day')).toMatch(/\(\s*p\s+at\s+time\s+zone\s+public\.store_time_zone\(\)\s*\)\s*::\s*date/i)
  })

  it('`contagem_desde_dia` é `public.store_day(v_inicio)::text`', () => {
    expect(diaDe(sql, 'contagem_desde_dia', 'v_inicio')).toBe(true)
  })

  it('`ultima_visita_dia` é `public.store_day(v_ultima)::text`', () => {
    expect(diaDe(sql, 'ultima_visita_dia', 'v_ultima')).toBe(true)
  })

  it('nenhum `::date` fora de `store_day`', () => {
    expect(dateForaDoDono(sql)).toBe(0)
  })

  it('sensor S24 — `v_inicio::date::text` reprova as duas réguas', () => {
    const m = mutarNoBloco('store_movement', 'public.store_day(v_inicio)::text', 'v_inicio::date::text')
    expect(diaDe(m, 'contagem_desde_dia', 'v_inicio')).toBe(false)
    expect(dateForaDoDono(m)).toBe(1)
  })

  it('sensor S25 — `v_ultima::date::text` reprova as duas réguas', () => {
    const m = mutarNoBloco('store_movement', 'public.store_day(v_ultima)::text', 'v_ultima::date::text')
    expect(diaDe(m, 'ultima_visita_dia', 'v_ultima')).toBe(false)
    expect(dateForaDoDono(m)).toBe(1)
  })

  it('sensor — os dois campos trocando de variável reprovam (o dia certo do instante errado)', () => {
    const m = mutarNoBloco('store_movement', 'public.store_day(v_ultima)::text', 'public.store_day(v_inicio)::text')
    expect(diaDe(m, 'ultima_visita_dia', 'v_ultima')).toBe(false)
    expect(dateForaDoDono(m)).toBe(0)
  })

  it('sensor — `date(v_inicio)` (sem `::`) também reprova a régua do campo', () => {
    const m = mutarNoBloco('store_movement', 'public.store_day(v_inicio)::text', 'date(v_inicio)::text')
    expect(diaDe(m, 'contagem_desde_dia', 'v_inicio')).toBe(false)
  })
})

// -------------------------------------------------------------------------------------------
// 7. O agendamento da poda — só se o pg_cron já existir (C7)
// -------------------------------------------------------------------------------------------

describe('7. pg_cron — o terceiro caminho da poda', () => {
  /** O `do $$ … end $$;` que agenda. `null` reprova. */
  const blocoDoCron = (texto: string): string | null => {
    const c = semComentario(texto)
    const inicio = c.search(/\bdo\s+\$\$/i)
    if (inicio < 0) return null
    const fim = c.indexOf('end $$;', inicio)
    if (fim < 0) return null
    return c.slice(inicio, fim + 7)
  }

  const guardado = (texto: string) => {
    const b = blocoDoCron(texto) ?? ''
    const se = b.search(/if\s+exists\s*\(\s*select\s+1\s+from\s+pg_extension\s+where\s+extname\s*=\s*'pg_cron'\s*\)\s+then/i)
    const agenda = b.search(/cron\.schedule\s*\(/i)
    const senao = b.search(/\belse\b/i)
    return se > -1 && agenda > se && (senao < 0 || agenda < senao)
  }

  const corpoDoJob = (texto: string): string | null => {
    const m = /'prune-store-visits'\s*,\s*'[^']+'\s*,\s*\$job\$([\s\S]*?)\$job\$/i.exec(blocoDoCron(texto) ?? '')
    return m ? m[1].replace(/\s+/g, ' ').trim() : null
  }

  it('âncora — o bloco do agendamento foi encontrado', () => {
    expect(blocoDoCron(sql)).not.toBeNull()
    expect(corpoDoJob(sql)).not.toBeNull()
  })

  it('agenda SÓ dentro de `if exists (… pg_extension … \'pg_cron\')`', () => {
    expect(guardado(sql)).toBe(true)
  })

  it('sensor — o agendamento fora do `if` reprova', () => {
    const mutante = mutar(comandos, /if exists \(select 1 from pg_extension where extname = 'pg_cron'\) then/, 'if true then')
    expect(guardado(mutante)).toBe(false)
  })

  it('NÃO cria a extensão', () => {
    expect(comandos).not.toMatch(/create\s+extension/i)
  })

  it('sensor — um `create extension` É acusado', () => {
    expect(mutar(comandos, 'perform cron.schedule(', 'create extension if not exists pg_cron;\n    perform cron.schedule(')).toMatch(/create\s+extension/i)
  })

  it('o job só chama a poda: `select public.prune_store_visits(public.store_day(now()))`', () => {
    expect(corpoDoJob(sql)).toBe('select public.prune_store_visits(public.store_day(now()))')
  })

  it('sensor — um `delete` literal no job reprova', () => {
    const mutante = mutar(comandos, 'select public.prune_store_visits(public.store_day(now()))', 'delete from public.store_visits')
    expect(corpoDoJob(mutante)).not.toBe('select public.prune_store_visits(public.store_day(now()))')
  })
})

// -------------------------------------------------------------------------------------------
// 6. Nenhuma escrita de dado fora de corpo de função
// -------------------------------------------------------------------------------------------

describe('6. a migration não escreve dado', () => {
  const escritas = (texto: string) => (foraDasFuncoes(texto).match(/\b(insert\s+into|update\s+public\.|delete\s+from)\b/gi) ?? [])

  it('nenhum insert/update/delete fora dos corpos de função', () => {
    expect(escritas(sql)).toEqual([])
  })

  it('sensor — uma semente do contador É acusada', () => {
    const mutante = `${comandos}\ninsert into public.store_visit_counter (id, started_at, last_recorded_at) values (true, now(), now());`
    expect(escritas(mutante)).toHaveLength(1)
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada (CRLF e LF)', () => {
    expect(escritas('-- delete from public.store_visits\nselect 1;')).toEqual([])
    expect(escritas('/* insert into x */\r\nselect 1;')).toEqual([])
    expect(escritas('-- nota em CRLF\r\ndelete from public.store_visits;')).toHaveLength(1)
  })
})

describe('o arnês de mutação', () => {
  it('`mutar()` LANÇA quando o alvo não existe', () => {
    expect(() => mutar(comandos, 'texto que não está no arquivo', 'x')).toThrow(/não encontrou o alvo/)
  })
})

// -------------------------------------------------------------------------------------------
// 8. A migration VIGENTE (feature 83, `L-035`) — as mesmas réguas, no arquivo que o banco executa
// -------------------------------------------------------------------------------------------

/**
 * A `83` recriou `store_movement` e `record_store_visit` numa migration nova. Sem este bloco, as
 * réguas acima mediriam só a `71`, que o banco já não executa: tirar o recorte de cancelado na `83`
 * deixaria este arquivo inteiro verde. A vigente é a ÚLTIMA migration, por prefixo, que cria a função
 * no CÓDIGO (`migrationVigenteDe`).
 *
 * O piso do predicado de `orders` e o total de `filter (` são da migration (a `83` lê anteontem e soma
 * as três expressões da comparação). Quem recriar a função de novo revisa os dois aqui — a âncora do
 * nome do arquivo reprova até isso acontecer.
 */
const VIGENTE_ESPERADA = '20261029120000_83-loja-ao-vivo.sql'
const vigenteDoMovimento = migrationVigenteDe('store_movement')
const vigenteDaGravacao = migrationVigenteDe('record_store_visit')
const mov = vigenteDoMovimento ? lerMigration(vigenteDoMovimento) : ''
const grav = vigenteDaGravacao ? lerMigration(vigenteDaGravacao) : ''
const comandosMov = semComentario(mov)

describe('8. a migration vigente — âncora', () => {
  it('as duas funções têm uma migration vigente, e é a da 83 (as réguas abaixo foram calibradas nela)', () => {
    expect(vigenteDoMovimento).toBe(VIGENTE_ESPERADA)
    expect(vigenteDaGravacao).toBe(VIGENTE_ESPERADA)
    expect(mov.length).toBeGreaterThan(1000)
  })

  it('sensor — a escolha é por CÓDIGO: uma migration posterior que só CITA a função em comentário não vira a vigente', () => {
    // A lista é passada à mão: o arquivo fictício não precisa existir para provar o critério,
    // mas `lerMigration` o leria — então o sensor usa só arquivos reais, em ordem invertida.
    expect(migrationVigenteDe('store_movement', ['20261021120000_71-visitas-unicas.sql'])).toBe('20261021120000_71-visitas-unicas.sql')
    expect(migrationVigenteDe('store_movement', ['20261023120000_73-resumo-do-atelie.sql'])).toBeNull()
  })
})

describe('8. store_movement vigente — portão, privilégio e qualificação', () => {
  it('`has_role` ⇒ 42501, `security definer`, `search_path` vazio', () => {
    expect(portao(mov)).toBe(true)
    expect(temSecurityDefiner(mov, 'store_movement')).toBe(true)
    expect(temSearchPathVazio(mov, 'store_movement')).toBe(true)
  })

  it('`execute` revogado de public e anon, concedido SÓ a `authenticated`', () => {
    const r = papeis(mov, 'revoke', 'function', 'store_movement')
    expect(r).toContain('public')
    expect(r).toContain('anon')
    expect(papeis(mov, 'grant', 'function', 'store_movement')).toEqual(['authenticated'])
  })

  it('toda referência é qualificada por `public.`', () => {
    expect(semQualificacao(mov, 'store_movement')).toEqual([])
  })

  it('sensor — sem o portão de admin, reprova', () => {
    expect(portao(mutarNoBlocoDe(mov, 'store_movement', /if not public\.has_role[\s\S]*?end if;/, ''))).toBe(false)
  })
})

describe('8. store_movement vigente — a régua de visita e de venda da 71', () => {
  it('visitas por `count(distinct)` nos três períodos', () => {
    expect(distintas(mov)).toBe(true)
  })

  it('venda é lista positiva: `approved` E não `cancelled`', () => {
    expect(listaPositiva(mov)).toBe(true)
  })

  it('o piso do predicado de `orders` usa `store_day_start` (D5)', () => {
    expect(pelaRegua(mov, PISO_DA_83)).toBe(true)
  })

  it('as seis fronteiras de período, meio-abertas, e o total de filtros da 83', () => {
    expect(fronteiras(mov, FILTROS_DA_83)).toBe(true)
  })

  it('todo `sum(` dentro de `coalesce(…, 0)`, e o ticket `round(…, 2)` com o mesmo sufixo nos três', () => {
    expect(somasComPiso(mov)).toBe(true)
    expect(ticket(mov)).toBe(3)
  })

  it('cada período devolve as variáveis DELE', () => {
    for (const p of ['hoje', 'ontem', 'semana'] as const) expect(periodoCasado(mov, p)).toBe(true)
  })

  it('poda com `least(…)`, `teto_dia` recortado por `v_desde`, e os dois dias do contador por `store_day`', () => {
    expect(podaSegura(mov)).toBe(true)
    expect(tetoNoPeriodo(mov)).toBe(true)
    expect(diaDe(mov, 'contagem_desde_dia', 'v_inicio')).toBe(true)
    expect(diaDe(mov, 'ultima_visita_dia', 'v_ultima')).toBe(true)
  })

  it('nenhum `::date` no arquivo vigente (o dia só por `store_day`)', () => {
    expect(comandosMov.match(/::\s*date\b/gi) ?? []).toEqual([])
  })

  it('a consulta de pedidos foi encontrada (a âncora das réguas de venda)', () => {
    expect(consultaDePedidos(mov)).toMatch(/from\s+public\.orders\s+o\b/i)
  })

  it('sensor — tirar `and o.status <> \'cancelled\'` da vigente reprova', () => {
    expect(listaPositiva(mutarNoBlocoDe(mov, 'store_movement', /\s+and o\.status <> 'cancelled'/, ''))).toBe(false)
  })

  it('sensor — `>=` → `>` na fronteira de Hoje da vigente reprova', () => {
    const m = mutarNoBlocoDe(mov, 'store_movement', 'count(*) filter (where o.paid_at >= v_ini_hoje),', 'count(*) filter (where o.paid_at > v_ini_hoje),')
    expect(fronteiras(m, FILTROS_DA_83)).toBe(false)
  })

  it('sensor — tirar um `coalesce` da vigente reprova', () => {
    const m = mutarNoBlocoDe(mov, 'store_movement', /coalesce\(sum\(o\.total\) filter \(where o\.paid_at >= v_ini_semana\), 0\)/, 'sum(o.total) filter (where o.paid_at >= v_ini_semana)')
    expect(somasComPiso(m)).toBe(false)
  })

  it('sensor — um filtro a mais na consulta de pedidos da vigente reprova o total', () => {
    const m = mutarNoBlocoDe(mov, 'store_movement', 'count(*) filter (where o.paid_at >= v_ini_semana),', 'count(*) filter (where o.paid_at >= v_ini_semana), count(*) filter (where o.paid_at >= v_ini_semana - 1),')
    expect(fronteiras(m, FILTROS_DA_83)).toBe(false)
  })
})

describe('8. record_store_visit vigente — a gravação da 71, intacta', () => {
  it('`security definer`, `search_path` vazio, revogada dos três e `grant` SÓ a `service_role`', () => {
    expect(temSecurityDefiner(grav, 'record_store_visit')).toBe(true)
    expect(temSearchPathVazio(grav, 'record_store_visit')).toBe(true)
    expect(revogadaDosTres(grav, 'function', 'record_store_visit')).toBe(true)
    expect(papeis(grav, 'grant', 'function', 'record_store_visit')).toEqual(['service_role'])
  })

  it('qualificada, dia e prazo, teto de 5.000, poda antes de gravar', () => {
    expect(semQualificacao(grav, 'record_store_visit')).toEqual([])
    expect(diaEPrazo(grav, 'record_store_visit')).toBe(true)
    expect(teto(grav)).toBe(true)
    expect(podaAntesDeGravar(grav)).toBe(true)
  })

  it('o upsert do contador é o da 71, dentro do `if found`', () => {
    expect(setDoUpsert(grav)).toBe(SET_CERTO)
    expect(upsertDentroDoFound(grav)).toBe(true)
  })

  it('os três desfechos', () => {
    const b = blocoDaFuncao(grav, 'record_store_visit') ?? ''
    for (const d of ['gravada', 'repetida', 'teto']) expect(b).toContain(`'${d}'`)
  })

  it('sensor — sem o `grant … to service_role` na vigente, reprova (toda visita daria 500)', () => {
    const m = mutar(semComentario(grav), 'grant execute on function public.record_store_visit(uuid, timestamptz) to service_role;', '')
    expect(papeis(m, 'grant', 'function', 'record_store_visit')).toEqual([])
  })

  it('sensor — o teto de 50.000 na vigente reprova', () => {
    expect(teto(mutarNoBlocoDe(grav, 'record_store_visit', '>= 5000', '>= 50000'))).toBe(false)
  })
})
