import { describe, expect, it } from 'vitest'

import { ACCESS_BAND_LABELS } from '@estrelinha/core/live'
import { STORE_TIME_ZONE } from '@estrelinha/core/time'

import {
  blocoDaFuncao,
  colunas,
  consultaDePedidos,
  corpoDaFuncao,
  foraDasFuncoes,
  lerMigration,
  migrationVigenteDe,
  mutar,
  mutarNoBloco,
  papeis,
  portaoDeAdmin,
  revogadaDosTres,
  semComentario,
  temSearchPathVazio,
  temSecurityDefiner,
  todasAsMigrations,
} from './visitasRegras'

/**
 * O guarda da migration da feature `83` — Loja ao vivo, Fase 1 (`LAV-70`..`LAV-74`, `AD-066`).
 *
 * A `83` EMENDA a `VIS-28`: `store_visits` passa a guardar a hora cheia de Brasília da primeira
 * visita do dia, e nada mais. Afrouxar isso não quebra nada — uma coluna de IP ao lado, a hora
 * reescrita numa repetição, o `grant … to service_role` perdido na recriação (toda visita daria
 * 500), um segundo comando lendo a tabela de visitas (a soma das faixas deixaria de fechar com o
 * total) —, tudo aplica limpo e passa em build, `tsc` e teste de componente.
 *
 * **Uma régua por COMANDO** (`L-033`), cada uma com sensor por `mutar()`, que **lança** quando a
 * mutação não muda nada. As mutações partem do SQL **sem comentário** (a prosa cita os comandos).
 * As réguas de venda e de visita da `71` não são repetidas aqui: `visitasSchema.test.ts` as aplica à
 * migration VIGENTE (bloco 8 de lá), pelas funções de `visitasRegras.ts`. A metade SEMÂNTICA (bordas
 * de hora, faixas, comparação, snapshot) é provada por probe (`L-059`):
 * `.specs/features/83-loja-ao-vivo/probes/01-acessos.sql`.
 */

const ARQUIVO = '20261029120000_83-loja-ao-vivo.sql'
const ARQUIVO_DA_71 = '20261021120000_71-visitas-unicas.sql'

const sql = lerMigration(ARQUIVO)
const comandos = semComentario(sql)
const sql71 = lerMigration(ARQUIVO_DA_71)

const TRES_FUNCOES = ['store_hour', 'record_store_visit', 'store_movement']

/** Espaço normalizado — a comparação "byte a byte" da régua (7) ignora só a indentação. */
const norma = (t: string): string => t.replace(/\s+/g, ' ').trim()

// -------------------------------------------------------------------------------------------
// Utilidades da régua (1): os comandos `alter table … store_visits` e as colunas que eles somam
// -------------------------------------------------------------------------------------------

/** Cada comando `alter table [only] [public.]store_visits …;`, recortado até o `;`. */
const altersDeStoreVisits = (texto: string): string[] =>
  semComentario(texto).match(/\balter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?store_visits\b[^;]*;/gi) ?? []

/** As cláusulas de um `alter table`, separadas por vírgula de NÍVEL ZERO. */
const clausulas = (cmd: string): string[] => {
  const corpo = cmd.replace(/^\s*alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?store_visits\b/i, '').replace(/;\s*$/, '')
  const partes: string[] = []
  let nivel = 0
  let atual = ''
  for (const c of corpo) {
    if (c === '(') nivel++
    if (c === ')') nivel--
    if (c === ',' && nivel === 0) {
      partes.push(atual.trim())
      atual = ''
    } else atual += c
  }
  if (atual.trim()) partes.push(atual.trim())
  return partes
}

interface Leitura {
  colunas: string[]
  proibidas: string[]
}

/**
 * As colunas de `store_visits` depois de TODAS as migrations: as do `create table` mais toda
 * cláusula `add [column] [if not exists] <nome>`. `rename column` e `alter column … type` vão para
 * `proibidas` (renomear ou mudar o tipo também é mudar o que a tabela guarda).
 */
const colunasDeStoreVisits = (arquivos: { nome: string; texto: string }[]): Leitura => {
  const lidas: string[] = []
  const proibidas: string[] = []
  for (const { nome, texto } of arquivos) {
    for (const [c] of colunas(texto, 'store_visits') ?? []) lidas.push(c)
    for (const cmd of altersDeStoreVisits(texto)) {
      for (const cl of clausulas(cmd)) {
        if (/^add\s+(?:constraint|primary\s+key|unique|check|foreign\s+key)\b/i.test(cl)) continue
        const add = cl.match(/^add\s+(?:column\s+)?(?:if\s+not\s+exists\s+)?(\w+)/i)
        if (add) lidas.push(add[1].toLowerCase())
        if (/^rename\s+(?:column\s+)?\w+\s+to\b/i.test(cl)) proibidas.push(`${nome}: ${norma(cl)}`)
        if (/^alter\s+(?:column\s+)?\w+\s+(?:set\s+data\s+)?type\b/i.test(cl)) proibidas.push(`${nome}: ${norma(cl)}`)
      }
    }
  }
  return { colunas: lidas, proibidas }
}

const doDisco = () => todasAsMigrations().map((nome) => ({ nome, texto: lerMigration(nome) }))

// -------------------------------------------------------------------------------------------
// Âncora
// -------------------------------------------------------------------------------------------

describe('âncora — o arquivo, as três funções e o `alter table`', () => {
  it('o arquivo foi lido e tem conteúdo', () => {
    expect(sql.length).toBeGreaterThan(2000)
  })

  it.each(TRES_FUNCOES)('a função `%s` está lá', (nome) => {
    expect(blocoDaFuncao(sql, nome)).not.toBeNull()
  })

  it('são EXATAMENTE três funções criadas pela migration', () => {
    expect(comandos.match(/create\s+or\s+replace\s+function\s+public\.\w+/gi)).toHaveLength(3)
  })

  it('há EXATAMENTE um `alter table … store_visits`', () => {
    expect(altersDeStoreVisits(sql)).toHaveLength(1)
  })

  it('nenhuma tabela nova', () => {
    expect(comandos).not.toMatch(/create\s+table/i)
  })
})

// -------------------------------------------------------------------------------------------
// (1) As colunas de store_visits, lidas de TODAS as migrations (`L-035`)
// -------------------------------------------------------------------------------------------

describe('(1) store_visits tem EXATAMENTE day, visitor_id e first_hour — em todas as migrations', () => {
  it('a leitura do disco dá as três, e nenhuma renomeação ou troca de tipo', () => {
    const l = colunasDeStoreVisits(doDisco())
    expect(l.colunas).toEqual(['day', 'visitor_id', 'first_hour'])
    expect(l.proibidas).toEqual([])
  })

  it('âncora de escopo — a leitura varreu mais de 50 migrations e incluiu a 71 e a 83', () => {
    const nomes = todasAsMigrations()
    expect(nomes.length).toBeGreaterThan(50)
    expect(nomes).toContain(ARQUIVO)
    expect(nomes).toContain(ARQUIVO_DA_71)
  })

  const comExtra = (extra: string) =>
    colunasDeStoreVisits([...doDisco(), { nome: '99999999999999_sensor.sql', texto: extra }])

  it('sensor — `alter table only public.store_visits add ip inet;` (com `only`, sem `column`) é acusado', () => {
    expect(comExtra('alter table only public.store_visits add ip inet;').colunas).toContain('ip')
  })

  it('sensor — duas adições numa vírgula são acusadas as duas', () => {
    const l = comExtra('alter table store_visits add column if not exists user_agent text, add column referrer text;')
    expect(l.colunas).toContain('user_agent')
    expect(l.colunas).toContain('referrer')
  })

  it('sensor — `rename column` reprova', () => {
    expect(comExtra('alter table public.store_visits rename column first_hour to first_at;').proibidas).toHaveLength(1)
  })

  it('sensor — `alter column … type` reprova (a hora virando instante)', () => {
    expect(comExtra('alter table public.store_visits alter column first_hour type timestamptz;').proibidas).toHaveLength(1)
  })

  it('inverso — `enable row level security` e `add constraint` não contam como coluna', () => {
    const l = comExtra('alter table public.store_visits add constraint x check (day is not null);')
    expect(l.colunas).toEqual(['day', 'visitor_id', 'first_hour'])
  })

  it('sensor — a coluna da 83 com outro nome muda a leitura', () => {
    const m = mutar(comandos, 'add column if not exists first_hour smallint', 'add column if not exists first_seen_at smallint')
    const l = colunasDeStoreVisits(doDisco().map((a) => (a.nome === ARQUIVO ? { ...a, texto: m } : a)))
    expect(l.colunas).not.toEqual(['day', 'visitor_id', 'first_hour'])
  })
})

// -------------------------------------------------------------------------------------------
// (2) A coluna: smallint, 0..23
// -------------------------------------------------------------------------------------------

describe('(2) `first_hour smallint check (first_hour between 0 and 23)`, anulável', () => {
  const coluna = (texto: string) =>
    /add\s+column\s+if\s+not\s+exists\s+first_hour\s+smallint\s+check\s*\(\s*first_hour\s+between\s+0\s+and\s+23\s*\)\s*;/i.test(
      altersDeStoreVisits(texto)[0] ?? '',
    )

  it('a cláusula tem o tipo e o check, com `if not exists` (rodar de novo é no-op)', () => {
    expect(coluna(sql)).toBe(true)
  })

  it('não é `not null` nem tem `default` (as linhas antigas ficam sem hora)', () => {
    expect(altersDeStoreVisits(sql)[0]).not.toMatch(/not\s+null|default/i)
  })

  it('sensor — o check até 24 reprova', () => {
    expect(coluna(mutar(comandos, 'between 0 and 23', 'between 0 and 24'))).toBe(false)
  })

  it('sensor — sem `if not exists` reprova', () => {
    expect(coluna(mutar(comandos, 'add column if not exists first_hour', 'add column first_hour'))).toBe(false)
  })
})

// -------------------------------------------------------------------------------------------
// (3) store_hour — o fuso pelo dono, stable, fechada
// -------------------------------------------------------------------------------------------

describe('(3) store_hour', () => {
  const pelaZona = (texto: string) =>
    /select\s+extract\s*\(\s*hour\s+from\s+\(\s*p\s+at\s+time\s+zone\s+public\.store_time_zone\(\)\s*\)\s*\)\s*::\s*smallint/i.test(
      blocoDaFuncao(texto, 'store_hour') ?? '',
    )

  it('a hora sai de `p at time zone public.store_time_zone()`', () => {
    expect(pelaZona(sql)).toBe(true)
  })

  it('sensor — a hora do fuso da SESSÃO (sem `at time zone`) reprova', () => {
    expect(pelaZona(mutarNoBloco(sql, 'store_hour', '(p at time zone public.store_time_zone())', 'p'))).toBe(false)
  })

  it('`stable`, `language sql`, sem `security definer` e sem `set search_path` (para ser inlinada)', () => {
    const b = blocoDaFuncao(sql, 'store_hour') ?? ''
    expect(b).toMatch(/\blanguage\s+sql\b/i)
    expect(b).toMatch(/\bstable\b/i)
    expect(temSecurityDefiner(sql, 'store_hour')).toBe(false)
    expect(b).not.toMatch(/set\s+search_path/i)
  })

  it('sensor — `immutable` reprova a régua do `stable`', () => {
    expect(blocoDaFuncao(mutarNoBloco(sql, 'store_hour', /\bstable\b/, 'immutable'), 'store_hour')).not.toMatch(/\bstable\b/i)
  })

  it('revogada de public, anon e authenticated, sem `grant` nenhum', () => {
    expect(revogadaDosTres(sql, 'function', 'store_hour')).toBe(true)
    expect(papeis(sql, 'grant', 'function', 'store_hour')).toEqual([])
  })

  it('sensor — um `grant` a `authenticated` É acusado', () => {
    expect(papeis(`${comandos}\ngrant execute on function public.store_hour(timestamptz) to authenticated;`, 'grant', 'function', 'store_hour')).toEqual(['authenticated'])
  })

  it('sensor — sem `anon` no revoke, reprova', () => {
    const m = mutar(comandos, 'revoke execute on function public.store_hour(timestamptz) from public, anon, authenticated;', 'revoke execute on function public.store_hour(timestamptz) from public, authenticated;')
    expect(revogadaDosTres(m, 'function', 'store_hour')).toBe(false)
  })
})

// -------------------------------------------------------------------------------------------
// (4) A hora gravada só na INSERÇÃO; a repetição não a altera
// -------------------------------------------------------------------------------------------

describe('(4) record_store_visit grava `first_hour` na inserção, e nada a reescreve', () => {
  const insercao = (texto: string) =>
    /insert\s+into\s+public\.store_visits\s*\(\s*day\s*,\s*visitor_id\s*,\s*first_hour\s*\)\s*values\s*\(\s*v_dia\s*,\s*p_id\s*,\s*public\.store_hour\(\s*p_agora\s*\)\s*\)\s*on\s+conflict\s+do\s+nothing\s*;/i.test(
      blocoDaFuncao(texto, 'record_store_visit') ?? '',
    )
  const reescritas = (texto: string) => semComentario(texto).match(/\bupdate\s+(?:public\.)?store_visits\b/gi) ?? []

  it('o `insert` leva `public.store_hour(p_agora)` e é `on conflict do nothing`', () => {
    expect(insercao(sql)).toBe(true)
  })

  it('sensor — a hora de `now()` (e não do `p_agora`) reprova', () => {
    expect(insercao(mutarNoBloco(sql, 'record_store_visit', 'public.store_hour(p_agora)', 'public.store_hour(now())'))).toBe(false)
  })

  it('sensor — `on conflict … do update set first_hour` reprova', () => {
    expect(insercao(mutarNoBloco(sql, 'record_store_visit', /on conflict do nothing;/, 'on conflict (day, visitor_id) do update set first_hour = excluded.first_hour;'))).toBe(false)
  })

  it('NENHUM `update` da tabela de visitas no arquivo', () => {
    expect(reescritas(sql)).toEqual([])
  })

  it('sensor — um `update public.store_visits set first_hour` É acusado', () => {
    const m = mutarNoBloco(sql, 'record_store_visit', "v_desfecho := 'repetida';\n  elsif", "update public.store_visits set first_hour = public.store_hour(p_agora) where day = v_dia and visitor_id = p_id;\n    v_desfecho := 'repetida';\n  elsif")
    expect(reescritas(m)).toHaveLength(1)
  })
})

// -------------------------------------------------------------------------------------------
// (5) record_store_visit — privilégio, teto e poda intactos
// -------------------------------------------------------------------------------------------

describe('(5) record_store_visit — definer, só o service_role, teto e poda', () => {
  it('`security definer`, `search_path` vazio', () => {
    expect(temSecurityDefiner(sql, 'record_store_visit')).toBe(true)
    expect(temSearchPathVazio(sql, 'record_store_visit')).toBe(true)
  })

  it('revogada dos três e `grant execute … to service_role` — e a NENHUM outro papel', () => {
    expect(revogadaDosTres(sql, 'function', 'record_store_visit')).toBe(true)
    expect(papeis(sql, 'grant', 'function', 'record_store_visit')).toEqual(['service_role'])
  })

  it('sensor — sem o `grant … to service_role`, reprova (toda visita daria 500)', () => {
    const m = mutar(comandos, 'grant execute on function public.record_store_visit(uuid, timestamptz) to service_role;', '')
    expect(papeis(m, 'grant', 'function', 'record_store_visit')).toEqual([])
  })

  it('sensor — um `grant` a `anon` É acusado', () => {
    const m = mutar(comandos, 'to service_role;', 'to service_role, anon;')
    expect(papeis(m, 'grant', 'function', 'record_store_visit')).toContain('anon')
  })

  const tetoEPoda = (texto: string) => {
    const b = blocoDaFuncao(texto, 'record_store_visit') ?? ''
    return /\(\s*select\s+count\(\*\)\s+from\s+public\.store_visits\s+where\s+day\s*=\s*v_dia\s*\)\s*>=\s*5000\b/i.test(b) &&
      /perform\s+public\.prune_store_visits\(\s*v_dia\s*\)/i.test(b)
  }

  it('o teto `>= 5000` e a poda `prune_store_visits(v_dia)` estão lá', () => {
    expect(tetoEPoda(sql)).toBe(true)
  })

  it('sensor — sem a poda, reprova', () => {
    expect(tetoEPoda(mutarNoBloco(sql, 'record_store_visit', 'perform public.prune_store_visits(v_dia);', ''))).toBe(false)
  })
})

// -------------------------------------------------------------------------------------------
// (6) store_movement — o portão vem ANTES de qualquer leitura
// -------------------------------------------------------------------------------------------

describe('(6) store_movement — portão antes de ler, definer, só authenticated', () => {
  /** O portão (`raise … 42501`) aparece antes do primeiro `select`/`perform` do corpo. */
  const portaoPrimeiro = (texto: string) => {
    const c = corpoDaFuncao(texto, 'store_movement') ?? ''
    const begin = c.search(/\bbegin\b/i)
    const portao = c.search(/if\s+not\s+public\.has_role\s*\(\s*auth\.uid\(\)\s*,\s*'admin'\s*\)\s+then\s+raise\s+exception/i)
    const leitura = c.slice(begin).search(/\b(select|perform|with)\b/i)
    return portaoDeAdmin(texto) && begin > -1 && portao > begin && leitura > -1 && portao < begin + leitura
  }

  it('`has_role` ⇒ 42501 é o primeiro comando do corpo', () => {
    expect(portaoPrimeiro(sql)).toBe(true)
  })

  it('sensor — o portão DEPOIS da poda reprova', () => {
    const c = semComentario(sql)
    const portao = c.match(/ {2}if not public\.has_role\(auth\.uid\(\), 'admin'\) then\n[\s\S]*?end if;\n/)?.[0]
    if (!portao) throw new Error('portão não encontrado')
    const semPortao = mutarNoBloco(sql, 'store_movement', portao, '')
    const m = mutar(semPortao, '  perform public.prune_store_visits(least(v_hoje, public.store_day(now())));\n', `  perform public.prune_store_visits(least(v_hoje, public.store_day(now())));\n${portao}`)
    expect(portaoPrimeiro(m)).toBe(false)
  })

  it('`security definer`, `search_path` vazio', () => {
    expect(temSecurityDefiner(sql, 'store_movement')).toBe(true)
    expect(temSearchPathVazio(sql, 'store_movement')).toBe(true)
  })

  it('`execute` revogado de public e anon, concedido SÓ a `authenticated`', () => {
    const r = papeis(sql, 'revoke', 'function', 'store_movement')
    expect(r).toContain('public')
    expect(r).toContain('anon')
    expect(papeis(sql, 'grant', 'function', 'store_movement')).toEqual(['authenticated'])
  })

  it('sensor — `execute` a `anon` É acusado', () => {
    const m = mutar(comandos, 'grant execute on function public.store_movement(timestamptz) to authenticated;', 'grant execute on function public.store_movement(timestamptz) to authenticated, anon;')
    expect(papeis(m, 'grant', 'function', 'store_movement')).toContain('anon')
  })
})

// -------------------------------------------------------------------------------------------
// (7) Por fragmento, contra a 71 — o que `periodos` e o painel leem não mudou
// -------------------------------------------------------------------------------------------

describe('(7) os fragmentos de `periodos` são os da 71, byte a byte (espaço normalizado)', () => {
  // (a) os três `count(distinct visitor_id) filter (…)` de `periodos`
  const distintas = (texto: string): string[] =>
    (corpoDaFuncao(texto, 'store_movement')?.match(/count\s*\(\s*distinct\s+visitor_id\s*\)\s+filter\s*\([^)]*\)/gi) ?? []).map(norma)

  it('(a) os três `count(distinct visitor_id)` são os da 71', () => {
    expect(distintas(sql71)).toHaveLength(3)
    expect(distintas(sql)).toEqual(distintas(sql71))
  })

  it('(a) sensor — a semana como `count(distinct)` de outro recorte reprova', () => {
    const m = mutarNoBloco(sql, 'store_movement', 'filter (where day between v_semana and v_hoje)', 'filter (where day between v_desde and v_hoje)')
    expect(distintas(m)).not.toEqual(distintas(sql71))
  })

  // (b) as seis expressões de venda e faturamento de `periodos` (as seis primeiras do `select`)
  const itensDaConsulta = (texto: string): string[] => {
    const q = consultaDePedidos(texto) ?? ''
    const lista = q.replace(/^select\s+/i, '').split(/\binto\b/i)[0]
    const itens: string[] = []
    let nivel = 0
    let atual = ''
    for (const c of lista) {
      if (c === '(') nivel++
      if (c === ')') nivel--
      if (c === ',' && nivel === 0) {
        itens.push(norma(atual))
        atual = ''
      } else atual += c
    }
    if (atual.trim()) itens.push(norma(atual))
    return itens
  }

  it('(b) as seis expressões de venda e faturamento são as da 71, na mesma ordem', () => {
    expect(itensDaConsulta(sql71)).toHaveLength(6)
    expect(itensDaConsulta(sql).slice(0, 6)).toEqual(itensDaConsulta(sql71))
  })

  it('(b) sensor — `>=` → `>` no faturamento de Ontem reprova', () => {
    const m = mutarNoBloco(sql, 'store_movement', 'coalesce(sum(o.total) filter (where o.paid_at >= v_ini_ontem', 'coalesce(sum(o.total) filter (where o.paid_at > v_ini_ontem')
    expect(itensDaConsulta(m).slice(0, 6)).not.toEqual(itensDaConsulta(sql71))
  })

  // (c) a lista positiva e o teto do instante
  const recorte = (texto: string): string => {
    const q = consultaDePedidos(texto) ?? ''
    return norma(q.slice(q.search(/\bwhere\b/i)))
  }
  const FRAGMENTOS_C = ["o.payment_status = 'approved'", "and o.status <> 'cancelled'", 'and o.paid_at <= p_agora']

  it('(c) o `where` tem o par `approved` + `<> \'cancelled\'` e `o.paid_at <= p_agora`, como na 71', () => {
    for (const f of FRAGMENTOS_C) {
      expect(recorte(sql71), f).toContain(f)
      expect(recorte(sql), f).toContain(f)
    }
  })

  it('(c) sensor — sem o recorte de cancelado reprova', () => {
    expect(recorte(mutarNoBloco(sql, 'store_movement', /\s+and o\.status <> 'cancelled'/, ''))).not.toContain("and o.status <> 'cancelled'")
  })

  it('(c) sensor — `paid_at < p_agora` (aberto) reprova', () => {
    expect(recorte(mutarNoBloco(sql, 'store_movement', 'o.paid_at <= p_agora', 'o.paid_at < p_agora'))).not.toContain('and o.paid_at <= p_agora')
  })

  // (d) o bloco `'periodos', jsonb_build_object(…)` inteiro
  const blocoDePeriodos = (texto: string): string | null => {
    const c = corpoDaFuncao(texto, 'store_movement') ?? ''
    const inicio = c.search(/'periodos'\s*,\s*jsonb_build_object\s*\(/i)
    if (inicio < 0) return null
    let nivel = 0
    for (let i = c.indexOf('(', inicio); i < c.length; i++) {
      if (c[i] === '(') nivel++
      if (c[i] === ')') nivel--
      if (nivel === 0) return norma(c.slice(inicio, i + 1))
    }
    return null
  }

  it('(d) o bloco `periodos` é o da 71, inteiro', () => {
    expect(blocoDePeriodos(sql71)).not.toBeNull()
    expect(blocoDePeriodos(sql)).toBe(blocoDePeriodos(sql71))
  })

  it('(d) sensor — o ticket sem `round` reprova', () => {
    const m = mutarNoBloco(sql, 'store_movement', 'then round(v_f_semana / v_n_semana, 2) end', 'then v_f_semana / v_n_semana end')
    expect(blocoDePeriodos(m)).not.toBe(blocoDePeriodos(sql71))
  })
})

// -------------------------------------------------------------------------------------------
// (8) Formas proibidas de decidir dia e hora
// -------------------------------------------------------------------------------------------

describe('(8) nada de `current_date`, `now()::date`, `date_trunc`, offset fixo ou fuso literal', () => {
  const proibidas = (texto: string): string[] => {
    const c = semComentario(texto)
    const achadas: string[] = []
    if (/\bcurrent_date\b/i.test(c)) achadas.push('current_date')
    if (/now\(\)\s*::\s*date/i.test(c)) achadas.push('now()::date')
    if (/\bdate_trunc\s*\(/i.test(c)) achadas.push('date_trunc')
    if (/'[+-]\d{2}(?::?\d{2})?'|\binterval\s+'-?3\s+hours?'/i.test(c)) achadas.push('offset')
    if (c.includes(`'${STORE_TIME_ZONE}'`)) achadas.push('fuso literal')
    if (/extract\s*\(\s*hour\s+from\s+p_agora\s*\)/i.test(c)) achadas.push('hora UTC')
    return achadas
  }

  it('nenhuma está no código', () => {
    expect(proibidas(sql)).toEqual([])
  })

  it.each([
    ['current_date', 'v_hoje := public.store_day(p_agora);', 'v_hoje := current_date;'],
    ['now()::date', 'v_hoje := public.store_day(p_agora);', 'v_hoje := now()::date;'],
    ['date_trunc', 'v_semana := public.store_week_start(v_hoje);', "v_semana := date_trunc('week', v_hoje)::date;"],
    ['offset', '(p at time zone public.store_time_zone())', "(p at time zone '-03')"],
    ['fuso literal', '(p at time zone public.store_time_zone())', `(p at time zone '${STORE_TIME_ZONE}')`],
    ['hora UTC', 'v_hora := public.store_hour(p_agora);', 'v_hora := extract(hour from p_agora);'],
  ])('sensor — `%s` É acusado', (forma, de, para) => {
    expect(proibidas(mutar(comandos, de, para))).toContain(forma)
  })
})

// -------------------------------------------------------------------------------------------
// (9) Nenhuma escrita de dado fora de corpo de função
// -------------------------------------------------------------------------------------------

describe('(9) a migration não escreve dado', () => {
  const escritas = (texto: string) => foraDasFuncoes(texto).match(/\b(insert\s+into|update\s+(?:only\s+)?(?:public\.)?\w+\s+set|delete\s+from)\b/gi) ?? []

  it('nenhum insert/update/delete fora dos corpos de função', () => {
    expect(escritas(sql)).toEqual([])
  })

  it('sensor — preencher a hora das linhas antigas É acusado', () => {
    expect(escritas(`${comandos}\nupdate public.store_visits set first_hour = 0 where first_hour is null;`)).toHaveLength(1)
  })
})

// -------------------------------------------------------------------------------------------
// (10) A vigente é a da 83
// -------------------------------------------------------------------------------------------

describe('(10) a migration vigente das duas funções recriadas é esta', () => {
  it('`store_movement` e `record_store_visit`: a última, por prefixo, que as cria é a 83', () => {
    expect(migrationVigenteDe('store_movement')).toBe(ARQUIVO)
    expect(migrationVigenteDe('record_store_visit')).toBe(ARQUIVO)
    expect(migrationVigenteDe('store_hour')).toBe(ARQUIVO)
  })

  it('sensor — sem a 83 na lista, a vigente volta a ser a 71', () => {
    const semA83 = todasAsMigrations().filter((n) => n !== ARQUIVO)
    expect(migrationVigenteDe('store_movement', semA83)).toBe(ARQUIVO_DA_71)
  })
})

// -------------------------------------------------------------------------------------------
// (11) A largura da faixa × `ACCESS_BAND_LABELS` de `core/live`
// -------------------------------------------------------------------------------------------

describe('(11) a faixa do SQL e os rótulos de `core/live`', () => {
  // Cópia deliberada com guarda: a largura (`first_hour / N`) e o número de faixas
  // (`generate_series(0, M)`) moram no SQL; os rótulos, em `ACCESS_BAND_LABELS` (importado).
  /** Os dois divisores (o agrupamento `first_hour / N = f.faixa` e `… / N)::smallint as faixa_atual`) e o `M`. */
  const largura = (texto: string): { divisores: number[]; fim: number | null } => {
    const c = corpoDaFuncao(texto, 'store_movement') ?? ''
    const agrupa = c.match(/first_hour\s*\/\s*(\d+)\s*=\s*f\.faixa/i)
    const atual = c.match(/\/\s*(\d+)\s*\)\s*::\s*smallint\s+as\s+faixa_atual/i)
    const divisores = [agrupa, atual].filter((m) => m !== null).map((m) => Number(m![1]))
    const g = c.match(/generate_series\s*\(\s*0\s*,\s*(\d+)\s*\)\s+as\s+f\s*\(\s*faixa\s*\)/i)
    return { divisores, fim: g ? Number(g[1]) : null }
  }
  const bate = (texto: string): boolean => {
    const { divisores, fim } = largura(texto)
    if (fim === null || divisores.length !== 2) return false
    const n = divisores[0]
    return (
      divisores.every((d) => d === n) &&
      ACCESS_BAND_LABELS.length === fim + 1 &&
      ACCESS_BAND_LABELS.every((rotulo, i) => rotulo === `${i * n}h`) &&
      n * (fim + 1) === 24
    )
  }
  const vigente = () => lerMigration(migrationVigenteDe('store_movement') ?? ARQUIVO)

  it('âncora — a vigente tem os dois divisores (a faixa atual e o agrupamento) e o `generate_series`', () => {
    const { divisores, fim } = largura(vigente())
    expect(divisores).toEqual([3, 3])
    expect(fim).toBe(7)
  })

  it('o divisor `N` e o fim `M` batem com `ACCESS_BAND_LABELS`: M + 1 rótulos, o `i` é `${i × N}h`, cobrindo 24 h', () => {
    expect(bate(vigente())).toBe(true)
  })

  it('sensor — faixas de 4 horas no agrupamento (e só nele) reprovam', () => {
    expect(bate(mutarNoBloco(sql, 'store_movement', 'v.first_hour / 3 = f.faixa', 'v.first_hour / 4 = f.faixa'))).toBe(false)
  })

  it('sensor — seis faixas no `generate_series` reprovam', () => {
    expect(bate(mutarNoBloco(sql, 'store_movement', 'generate_series(0, 7) as f(faixa)', 'generate_series(0, 5) as f(faixa)'))).toBe(false)
  })

  it('sensor — a faixa atual com outro divisor reprova', () => {
    expect(bate(mutarNoBloco(sql, 'store_movement', 'filter (where day = v_hoje), 0)) / 3)', 'filter (where day = v_hoje), 0)) / 4)'))).toBe(false)
  })
})

// -------------------------------------------------------------------------------------------
// (12) Um snapshot: UMA leitura da tabela de visitas no corpo de store_movement
// -------------------------------------------------------------------------------------------

describe('(12) um snapshot — exatamente UM `from public.store_visits` em store_movement', () => {
  const leituras = (texto: string) => (corpoDaFuncao(texto, 'store_movement')?.match(/\bfrom\s+(?:public\.)?store_visits\b/gi) ?? []).length

  it('exatamente uma', () => {
    expect(leituras(sql)).toBe(1)
  })

  it('sensor — um segundo comando lendo a tabela reprova', () => {
    const m = mutarNoBloco(sql, 'store_movement', '  v_inicio_dia := public.store_day(v_inicio);', '  v_inicio_dia := public.store_day(v_inicio);\n  select count(*) into v_v_hoje from public.store_visits where day = v_hoje;')
    expect(leituras(m)).toBe(2)
  })
})

describe('o arnês de mutação', () => {
  it('`mutar()` LANÇA quando o alvo não existe', () => {
    expect(() => mutar(comandos, 'texto que não está no arquivo', 'x')).toThrow(/não encontrou o alvo/)
  })
})
