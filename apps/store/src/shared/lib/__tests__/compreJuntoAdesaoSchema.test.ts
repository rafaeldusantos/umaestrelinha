import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration do relatório de adesão ao Compre Junto — `buy_together_adoption`, a leitura
 * da aba Adesão do painel.
 *
 * Lê o `.sql` **do disco**, no molde de `overviewSchema.test.ts`, e pelo mesmo motivo: **afrouxar uma
 * migration não quebra nada**. A função nascendo sem `has_role` (toda cliente leria o que a loja vende
 * junto), com `execute` a `anon`, o período decidido por `current_date` (o fuso do servidor), a venda
 * sem o recorte de cancelado, a linha contada uma vez por principal nas peças, a marca sem principal
 * no pedido contando — tudo isso aplica limpo e passa em build, `tsc` e teste de componente. O que o
 * SQL devolve de fato é provado pelo probe `.specs/work-items/WI-01-compre-junto/probes/05-adesao.sh`.
 *
 * **A régua de venda é a do Dashboard, comparada por fragmento** com o `store_movement` VIGENTE (a
 * última migration que o recria, colhida do disco): se uma das duas mudar, este guarda reprova.
 *
 * **Uma régua por COMANDO** (`L-033`), cada uma um predicado exercido também contra texto mutado, e
 * `mutar()` **lança** quando a mutação não muda nada.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const MIGRATIONS = resolve(ROOT, 'supabase/migrations')
const CAMINHO = resolve(MIGRATIONS, '20261107120000_compre-junto-adesao.sql')

const sql = readFileSync(CAMINHO, 'utf8').replace(/\r\n/g, '\n')

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`L-031`, `BL-027`). */
const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, () => para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

const comandos = semComentario(sql)

/** O bloco de uma função, do `create or replace function` até o `$$;`. `null` reprova. */
const blocoDe = (texto: string, nome: string): string | null => {
  const c = semComentario(texto)
  const inicio = c.search(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${nome}\\s*\\(`, 'i'))
  if (inicio < 0) return null
  const fim = c.indexOf('$$;', inicio)
  return fim < 0 ? null : c.slice(inicio, fim + 3)
}

const bloco = (t: string) => blocoDe(t, 'buy_together_adoption')

const corpoDe = (b: string | null): string | null => {
  if (!b) return null
  const abre = b.search(/\bas\s+\$\$/i)
  return abre < 0 ? null : b.slice(abre)
}

const corpo = (t: string) => corpoDe(bloco(t))

/** Uma CTE do corpo: do `<nome> as (` até o `)` que a fecha (nível zero). `null` reprova. */
const cte = (texto: string, nome: string): string | null => {
  const c = corpo(texto)
  if (!c) return null
  const m = new RegExp(`\\b${nome}\\s+as\\s+\\(`, 'i').exec(c)
  if (!m) return null
  let nivel = 0
  for (let i = m.index + m[0].length - 1; i < c.length; i++) {
    if (c[i] === '(') nivel++
    if (c[i] === ')' && --nivel === 0) return c.slice(m.index, i + 1)
  }
  return null
}

const papeis = (texto: string, verbo: 'grant' | 'revoke'): string[] => {
  const prep = verbo === 'grant' ? 'to' : 'from'
  const re = new RegExp(
    `\\b${verbo}\\s+[\\w\\s,]+?\\s+on\\s+function\\s+public\\.buy_together_adoption(?:\\s*\\([^)]*\\))?\\s+${prep}\\s+([^;]+);`,
    'gi',
  )
  return [...semComentario(texto).matchAll(re)].flatMap(m => m[1].split(',').map(p => p.trim().toLowerCase()))
}

/**
 * A régua de venda de um corpo, sem o apelido da tabela e sem espaço: `payment_status='approved'and
 * status<>'cancelled'`. `null` quando o par não está escrito junto.
 */
const reguaDeVenda = (c: string | null): string | null => {
  const m = /(\w+)\.payment_status\s*=\s*'approved'\s+and\s+\1\.status\s*<>\s*'cancelled'/i.exec(c ?? '')
  return m ? m[0].replace(new RegExp(`\\b${m[1]}\\.`, 'g'), '').replace(/\s+/g, ' ').toLowerCase() : null
}

/** O `store_movement` vigente: a última migration (por prefixo) que o recria. */
const dashboard = (() => {
  const arquivos = readdirSync(MIGRATIONS)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .filter(f => /create\s+or\s+replace\s+function\s+public\.store_movement\s*\(/i.test(readFileSync(resolve(MIGRATIONS, f), 'utf8')))
  const ultimo = arquivos[arquivos.length - 1]
  return { arquivos, ultimo, corpo: corpoDe(blocoDe(readFileSync(resolve(MIGRATIONS, ultimo), 'utf8'), 'store_movement')) }
})()

// -------------------------------------------------------------------------------------------
// As réguas — cada uma devolve `true` quando a migration está certa
// -------------------------------------------------------------------------------------------

const R = {
  definer: (t: string) => /\bsecurity\s+definer\b/i.test(bloco(t) ?? ''),
  searchPath: (t: string) => /set\s+search_path\s*=\s*''/i.test(bloco(t) ?? ''),
  stable: (t: string) => /language\s+plpgsql\s+stable\b/i.test(bloco(t) ?? ''),
  /** A recusa vem ANTES de qualquer leitura de tabela. */
  recusaPrimeiro: (t: string) => {
    const c = corpo(t) ?? ''
    const recusa = c.search(
      /if\s+not\s+public\.has_role\(\s*auth\.uid\(\)\s*,\s*'admin'\s*\)\s+then\s+raise\s+exception\s+'[^']+'\s+using\s+errcode\s*=\s*'42501'/i,
    )
    const leitura = c.search(/\bfrom\s+public\./i)
    return recusa >= 0 && leitura > recusa
  },
  revoke: (t: string) => ['public', 'anon'].every(p => papeis(t, 'revoke').includes(p)),
  grantSoAuthenticated: (t: string) => {
    const g = papeis(t, 'grant')
    return g.length === 1 && g[0] === 'authenticated'
  },
  /** O período é 7, 30 ou 90 — e nada mais. */
  periodoTresValores: (t: string) =>
    /if\s+p_dias\s+is\s+null\s+or\s+p_dias\s+not\s+in\s*\(\s*7\s*,\s*30\s*,\s*90\s*\)\s+then\s+raise\s+exception\s+'[^']+'\s+using\s+errcode\s*=\s*'22023'/i.test(
      corpo(t) ?? '',
    ),
  /** Venda = a régua do Dashboard, escrita UMA vez, dentro de `with vendas`, e IGUAL à do `store_movement` vigente. */
  vendaIgualAoDashboard: (t: string) => {
    const c = corpo(t) ?? ''
    const v = cte(t, 'vendas') ?? ''
    const minha = reguaDeVenda(v)
    return (
      (c.match(/payment_status\s*=\s*'approved'/gi) ?? []).length === 1 &&
      minha !== null &&
      minha === reguaDeVenda(dashboard.corpo)
    )
  },
  /** O dia é de Brasília, pelo banco: `store_day(p_agora)` e o recorte por `store_day_start`. */
  periodoEmDiasDeBrasilia: (t: string) => {
    const c = corpo(t) ?? ''
    const v = cte(t, 'vendas') ?? ''
    return (
      /v_hoje\s*:=\s*public\.store_day\(\s*p_agora\s*\)/i.test(c) &&
      /v_desde\s*:=\s*v_hoje\s*-\s*\(\s*p_dias\s*-\s*1\s*\)/i.test(c) &&
      /o\.paid_at\s*>=\s*public\.store_day_start\(\s*v_desde\s*\)/i.test(v) &&
      /o\.paid_at\s*<=\s*p_agora\b/i.test(v)
    )
  },
  semRelogioDoServidor: (t: string) =>
    !/\bcurrent_date\b|\bnow\s*\(\)|\bcurrent_timestamp\b|\bat\s+time\s+zone\b|\blocaltimestamp\b|paid_at\s*::\s*date/i.test(corpo(t) ?? ''),
  /** Os dois arrays da marca se desaninham JUNTOS, alinhados por posição. */
  paresAlinhados: (t: string) =>
    /unnest\(\s*i\.accompanies_product_ids\s*,\s*i\.accompanies_list_ids\s*\)\s+as\s+m\(\s*principal\s*,\s*lista\s*\)/i.test(
      cte(t, 'pares') ?? '',
    ),
  /** A peça só conta quando a joia principal dela está no MESMO pedido. */
  principalNoMesmoPedido: (t: string) =>
    /exists\s*\(\s*select\s+1\s+from\s+public\.order_items\s+j\s+where\s+j\.order_id\s*=\s*i\.order_id\s+and\s+j\.id\s*<>\s*i\.id\s+and\s+j\.product_id\s*=\s*m\.principal\s*\)/i.test(
      cte(t, 'pares') ?? '',
    ),
  /** O valor é o preço pago em cada peça, vezes a quantidade da linha. */
  valorPeloPrecoPago: (t: string) => /i\.unit_price\s*\*\s*i\.quantity\s+as\s+valor/i.test(cte(t, 'pares') ?? ''),
  /** Nos indicadores a linha conta UMA vez: `linhas` é distinta por item, e as peças somam a quantidade dela. */
  linhaUmaVez: (t: string) => {
    const l = cte(t, 'linhas') ?? ''
    const tt = cte(t, 'totais') ?? ''
    return (
      /select\s+distinct\s+p\.item_id\b/i.test(l) &&
      !/\bprincipal\b|\blista\b/i.test(l) &&
      /coalesce\(\s*sum\(\s*l\.quantity\s*\)\s*,\s*0\s*\)\s+as\s+pecas/i.test(tt) &&
      /from\s+linhas\s+l\b/i.test(tt)
    )
  },
  /** Por joia, a linha conta uma vez por principal; por lista, uma vez por lista. */
  umaVezPorRecorte: (t: string) =>
    /select\s+distinct\s+p\.item_id\s*,\s*p\.order_id\s*,\s*p\.principal\b/i.test(cte(t, 'joia_linhas') ?? '') &&
    /select\s+distinct\s+p\.item_id\s*,\s*p\.lista\b/i.test(cte(t, 'lista_linhas') ?? ''),
  /** As listas de hoje entram com 0, e a linha "direto no produto" sai sempre, uma vez. */
  listasComZeroEDireto: (t: string) => {
    const k = cte(t, 'chaves_lista') ?? ''
    return /from\s+public\.buy_together_lists\s+bl\b/i.test(k) && /select\s+null::uuid\s*,\s*true\s*\)$/i.test(k)
  },
  /** A peça que mais sai leva a variação. */
  topComVariacao: (t: string) =>
    (corpo(t)?.match(/t\.nome\s*\|\|\s*coalesce\(\s*'\s·\s'\s*\|\|\s*nullif\(\s*btrim\(\s*t\.variant_label\s*\)\s*,\s*''\s*\)\s*,\s*''\s*\)/gi) ?? [])
      .length === 2,
  /** O histórico não depende do que a lista tem HOJE: nada lê as peças das listas nem os adicionais. */
  historicoSoDaMarca: (t: string) => !/buy_together_list_items|product_buy_together/i.test(corpo(t) ?? ''),
  divisaoPorZero: (t: string) => {
    const c = corpo(t) ?? ''
    return (
      /'parte'\s*,\s*case\s+when\s+t\.pagos\s*>\s*0\s+then\b/i.test(c) && /'media'\s*,\s*case\s+when\s+t\.com\s*>\s*0\s+then\b/i.test(c)
    )
  },
  semEscritaDeDado: (t: string) => !/\b(insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i.test(semComentario(t)),
  qualificado: (t: string) => {
    const c = corpo(t) ?? ''
    return !/(?<![\w.])(has_role|store_day|store_day_start|orders|order_items|products|buy_together_lists)\b(?!_)/i.test(
      c.replace(/'[^']*'/g, "''"),
    )
  },
}

// -------------------------------------------------------------------------------------------

describe('a migration do relatório de adesão — âncora', () => {
  it('o arquivo foi lido, e a função, o corpo e as CTEs foram achados', () => {
    expect(sql.length).toBeGreaterThan(1000)
    expect(bloco(sql)).not.toBeNull()
    expect(corpo(sql)).not.toBeNull()
    for (const nome of ['vendas', 'pares', 'linhas', 'totais', 'joia_linhas', 'joia_pecas', 'por_joia', 'lista_linhas', 'lista_pecas', 'chaves_lista', 'por_lista']) {
      expect(cte(sql, nome), nome).not.toBeNull()
    }
  })

  it('o `store_movement` do Dashboard foi achado no disco, e a régua dele foi lida', () => {
    expect(dashboard.arquivos.length).toBeGreaterThanOrEqual(3)
    expect(dashboard.corpo).not.toBeNull()
    expect(reguaDeVenda(dashboard.corpo)).toBe("payment_status = 'approved' and status <> 'cancelled'")
  })
})

describe('a migration do relatório de adesão — uma régua por comando', () => {
  it.each(Object.keys(R))('%s', nome => {
    expect(R[nome as keyof typeof R](sql)).toBe(true)
  })
})

describe('sensores — cada régua reprova a mutação que existe para recusar', () => {
  const casos: [keyof typeof R, string | RegExp, string][] = [
    ['definer', /security\s+definer/i, 'security invoker'],
    ['searchPath', "set search_path = ''", ''],
    ['stable', /language plpgsql\s+stable/i, 'language plpgsql volatile'],
    ['recusaPrimeiro', "errcode = '42501'", "errcode = 'P0001'"],
    ['recusaPrimeiro', "if not public.has_role(auth.uid(), 'admin') then", 'if false then'],
    ['revoke', 'from public, anon;', 'from public;'],
    ['grantSoAuthenticated', 'to authenticated;', 'to authenticated, anon;'],
    ['periodoTresValores', 'not in (7, 30, 90)', 'not in (7, 15, 30, 90)'],
    ['vendaIgualAoDashboard', "and o.status <> 'cancelled'", ''],
    ['vendaIgualAoDashboard', "and o.status <> 'cancelled'", "and o.status <> 'refunded'"],
    ['periodoEmDiasDeBrasilia', 'v_hoje := public.store_day(p_agora);', 'v_hoje := public.store_day(now());'],
    ['periodoEmDiasDeBrasilia', 'o.paid_at >= public.store_day_start(v_desde)', 'o.paid_at >= v_desde::timestamp'],
    ['periodoEmDiasDeBrasilia', 'v_hoje - (p_dias - 1)', 'v_hoje - p_dias'],
    ['semRelogioDoServidor', 'v_hoje := public.store_day(p_agora);', 'v_hoje := current_date;'],
    ['paresAlinhados', 'unnest(i.accompanies_product_ids, i.accompanies_list_ids)', 'unnest(i.accompanies_product_ids)'],
    ['principalNoMesmoPedido', 'and j.product_id = m.principal', ''],
    ['valorPeloPrecoPago', 'i.unit_price * i.quantity as valor', 'i.unit_price as valor'],
    ['linhaUmaVez', 'select distinct p.item_id, p.order_id, p.quantity, p.valor', 'select distinct p.item_id, p.order_id, p.principal, p.quantity, p.valor'],
    ['linhaUmaVez', 'coalesce(sum(l.quantity), 0) as pecas', 'count(*) as pecas'],
    ['umaVezPorRecorte', 'select distinct p.item_id, p.lista,', 'select p.item_id, p.lista,'],
    ['listasComZeroEDireto', 'select null::uuid, true', 'select null::uuid, true where false'],
    ['topComVariacao', /t\.nome \|\| coalesce\(' · ' \|\| nullif\(btrim\(t\.variant_label\), ''\), ''\)/, 't.nome'],
    ['historicoSoDaMarca', 'select bl.id as lista, false as direto from public.buy_together_lists bl', 'select bl.list_id as lista, false as direto from public.buy_together_list_items bl'],
    ['divisaoPorZero', 'case when t.pagos > 0 then round(t.com::numeric / t.pagos, 4) end', 'round(t.com::numeric / t.pagos, 4)'],
    ['semEscritaDeDado', 'revoke execute', "insert into public.store_settings (key) values ('x');\nrevoke execute"],
    ['qualificado', 'from public.orders o', 'from orders o'],
  ]

  it.each(casos.map(([r, de, para], i) => [`${i + 1}. ${r}`, r, de, para] as const))('%s', (_rotulo, regua, de, para) => {
    const mutante = mutar(comandos, de, para)
    expect(R[regua](mutante)).toBe(false)
  })

  it('toda régua tem ao menos um sensor', () => {
    const cobertas = new Set(casos.map(([r]) => r))
    expect(Object.keys(R).filter(r => !cobertas.has(r as keyof typeof R))).toEqual([])
  })

  it('a régua do Dashboard mudando também reprova (o fragmento é comparado, não copiado)', () => {
    const outro = mutar(dashboard.corpo ?? '', /status\s*<>\s*'cancelled'/, "status not in ('cancelled', 'refunded')")
    expect(reguaDeVenda(outro)).not.toBe(reguaDeVenda(corpo(sql)))
  })

  it('`mutar` lança quando a mutação não acha o alvo', () => {
    expect(() => mutar(comandos, 'texto que não existe', 'x')).toThrow('mutação não encontrou o alvo')
  })

  it('o removedor de comentário não apaga código depois de CRLF', () => {
    expect(semComentario('-- nota\r\nselect 1')).toContain('select 1')
  })
})
