import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Feature 82 (`ENV-22`, A1) — o guarda da migration que grava QUEM informou o código do envelope, e
 * QUANDO.
 *
 * O que ela protege é a AUTORIA: a tela do ateliê diz "Informado pela cliente" ou "Registrado por
 * você" a partir de `material_tracking_set_by`, e a única coisa que torna essa frase verdadeira é a
 * coluna ser decidida pelo PAPEL de quem chama, dentro da RPC. Um parâmetro "quem sou eu" seria
 * forjável pela própria cliente, e passaria em build, `tsc` e em todo teste do app (que dubla a RPC).
 *
 * Uma régua por comando (`L-033`), cada uma escrita como predicado para a asserção e o sensor
 * chamarem a MESMA função; o `mutar()` **lança** quando a mutação não muda nada. **Âncora**: o arquivo
 * é lido (corpo mínimo), e cada extração devolve algo — uma que falha devolve `null` e REPROVA.
 *
 * A semântica (cliente ⇒ `customer`, admin ⇒ `admin`, recusas sem tocar nas colunas) é provada pelo
 * probe `.specs/features/82-envelope-da-cliente/probes/01-rpc.sql`, contra o banco local.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Os caminhos por extenso, de propósito: a régua nunca é o objeto medido. */
const MIGRATION = join(ROOT, 'supabase/migrations/20261028120000_82-envelope-da-cliente.sql')
const MIGRATION_35 = join(ROOT, 'supabase/migrations/20260830120000_35-clientes-e-pedidos-nuvemshop.sql')

const SQL = readFileSync(MIGRATION, 'utf8')
const SQL_35 = readFileSync(MIGRATION_35, 'utf8')

/** Comentário não é código: o cabeçalho explica em prosa o que a migration faz e não faz. */
const semComentario = (texto: string): string => texto.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')

const LIMPO = semComentario(SQL)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

// -------------------------------------------------------------------------------------------
// As réguas, como predicados
// -------------------------------------------------------------------------------------------

/** A assinatura e o corpo (`$$ … $$`) de `set_material_tracking`, ou `null`. */
const funcao = (texto: string): { assinatura: string; cabecalho: string; corpo: string } | null => {
  const m = texto.match(
    /create or replace function public\.set_material_tracking\s*\(([^)]*)\)([\s\S]*?)as \$\$([\s\S]*?)\$\$;/i,
  )
  return m ? { assinatura: m[1].replace(/\s+/g, ' ').trim(), cabecalho: m[2], corpo: m[3] } : null
}

/** As duas colunas, cada uma com `add column if not exists` e o tipo certo. */
const colunasAditivas = (texto: string): boolean =>
  /add column if not exists material_tracking_set_at timestamptz\b/i.test(texto) &&
  /add column if not exists material_tracking_set_by text\b/i.test(texto)

/** Os valores que o `check` aceita, ordenados, ou `null` se o `check` não tem a forma esperada. */
const valoresDoCheck = (texto: string): string[] | null => {
  const m = texto.match(
    /add constraint orders_material_tracking_set_by_check\s+check\s*\(\s*material_tracking_set_by is null or material_tracking_set_by in \(([^)]*)\)\s*\)/i,
  )
  return m ? [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]).sort() : null
}

/** O `check` é recriado com `drop … if exists` antes do `add` — a migration roda duas vezes. */
const checkIdempotente = (texto: string): boolean => {
  const drop = texto.search(/drop constraint if exists orders_material_tracking_set_by_check/i)
  const add = texto.search(/add constraint orders_material_tracking_set_by_check/i)
  return drop !== -1 && add !== -1 && drop < add
}

/** `set_by` decidido pelo PAPEL: `v_admin` vem de `has_role(auth.uid(), …)` e é o que o `case` lê. */
const autoriaPeloPapel = (texto: string): boolean => {
  const f = funcao(texto)
  if (!f) return false
  return (
    /v_admin\s*:=\s*public\.has_role\(auth\.uid\(\),\s*'admin'\)\s*;/i.test(f.corpo) &&
    /material_tracking_set_by\s*=\s*case when v_admin then 'admin' else 'customer' end/i.test(f.corpo)
  )
}

/** A assinatura é a da `22`, sem parâmetro a mais — nenhum "quem sou eu" vindo de fora. */
const assinaturaSemAutoria = (texto: string): boolean =>
  funcao(texto)?.assinatura.toLowerCase() === 'p_order_id uuid, p_code text'

/** `set_at` é o relógio do servidor, nunca um valor de quem chama. */
const dataPeloServidor = (texto: string): boolean =>
  /material_tracking_set_at\s*=\s*now\(\)/i.test(funcao(texto)?.corpo ?? '')

/** UM `update`, e ele vem DEPOIS do `if not found` (a recusa sai antes de qualquer escrita). */
const updateDepoisDaAutorizacao = (texto: string): boolean => {
  const corpo = funcao(texto)?.corpo ?? ''
  const updates = [...corpo.matchAll(/\bupdate\s+public\.orders\b/gi)]
  const naoAchou = corpo.search(/if not found then/i)
  return updates.length === 1 && naoAchou !== -1 && (updates[0].index ?? -1) > naoAchou
}

/**
 * O `where` do `update`, normalizado, ou `null`. Ele é EXATAMENTE `id = p_order_id`: qualquer
 * condição a mais (ex.: "só se o código mudou") faria regravar o MESMO código não atualizar a autoria
 * nem o `set_at` — e "Registrado por você" nunca apareceria quando a Adri confirma o código que a
 * cliente informou (M37 da verificação, rodada 1). A semântica é provada pelo caso 1b do probe.
 */
const whereDoUpdate = (texto: string): string | null => {
  const corpo = funcao(texto)?.corpo ?? ''
  const m = corpo.match(/\bupdate\s+public\.orders\b[\s\S]*?\bwhere\s+([^;]*);/i)
  return m ? m[1].replace(/\s+/g, ' ').trim().toLowerCase() : null
}

/** A autorização da `22`, intacta: admin OU dona do pedido, na mesma leitura. */
const autorizacaoIntacta = (texto: string): boolean => {
  const corpo = funcao(texto)?.corpo ?? ''
  return (
    /where o\.id = p_order_id\s+and \(\s*v_admin\s+or o\.customer_id in \(select c\.id from public\.customers c where c\.user_id = auth\.uid\(\)\)\s*\)/i.test(
      corpo,
    )
  )
}

const definerComSearchPath = (texto: string): boolean => {
  const cab = funcao(texto)?.cabecalho ?? ''
  return /security definer/i.test(cab) && /set search_path = public/i.test(cab)
}

/** Para quem `execute` é concedido nesta função. */
const concedidoA = (texto: string): string[] =>
  [...texto.matchAll(/grant execute on function public\.set_material_tracking\(uuid, text\) to (\w+)/gi)]
    .map((m) => m[1].toLowerCase())
    .sort()

const revogaPublicEAnon = (texto: string): boolean =>
  /revoke all on function public\.set_material_tracking\(uuid, text\) from public;/i.test(texto) &&
  /revoke all on function public\.set_material_tracking\(uuid, text\) from anon;/i.test(texto)

/** A lista de colunas de `create or replace view public.order_list`, ou `null`. */
const colunasDaView = (texto: string): string[] | null => {
  const m = texto.match(/create or replace view public\.order_list\s+with \(security_invoker = true\) as\s+select([\s\S]*?)from public\.orders o;/i)
  if (!m) return null
  // A janela da ordinal tem vírgulas dentro dos parênteses: ela vira um token só.
  const lista = m[1].replace(/row_number\(\)[\s\S]*?as purchase_ordinal/i, 'purchase_ordinal')
  return lista
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
}

/** Escrita de dado FORA do corpo da função — a migration é aditiva. */
const escritaForaDaFuncao = (texto: string): string[] =>
  [...texto.replace(/\$\$[\s\S]*?\$\$/g, '').matchAll(/\b(insert\s+into|update\s+public\.\w+\s+set|delete\s+from)\b/gi)].map(
    (m) => m[1].toLowerCase(),
  )

const COLUNAS_35 = colunasDaView(semComentario(SQL_35).toLowerCase())

// -------------------------------------------------------------------------------------------

describe('envelopeSchema — âncora da leitura', () => {
  it('leu a migration de verdade: as colunas, o check, a RPC e a view', () => {
    expect(SQL.length).toBeGreaterThan(1500)
    expect(funcao(LIMPO)).not.toBeNull()
    expect(valoresDoCheck(LIMPO)).not.toBeNull()
    expect(colunasDaView(LIMPO)).not.toBeNull()
    // A view da `35` também é lida — é contra ela que a lista é comparada.
    expect(COLUNAS_35).not.toBeNull()
    expect(COLUNAS_35!.length).toBeGreaterThan(40)
  })

  it('`mutar` lança quando o alvo não existe', () => {
    expect(() => mutar(LIMPO, 'alvo que não existe', 'x')).toThrow(/não encontrou o alvo/)
  })
})

describe('envelopeSchema — as duas colunas', () => {
  it('nascem com `add column if not exists`, `timestamptz` e `text`', () => {
    expect(colunasAditivas(LIMPO)).toBe(true)
    expect(colunasAditivas(mutar(LIMPO, /add column if not exists material_tracking_set_by/i, 'add column material_tracking_set_by'))).toBe(false)
    expect(colunasAditivas(mutar(LIMPO, /material_tracking_set_at timestamptz/i, 'material_tracking_set_at text'))).toBe(false)
  })

  it('o `check` aceita exatamente `customer` e `admin` (e nulo)', () => {
    expect(valoresDoCheck(LIMPO)).toEqual(['admin', 'customer'])
    expect(valoresDoCheck(mutar(LIMPO, "in ('customer', 'admin')", "in ('customer', 'admin', 'sistema')"))).toEqual([
      'admin',
      'customer',
      'sistema',
    ])
    expect(valoresDoCheck(mutar(LIMPO, 'material_tracking_set_by is null or ', ''))).toBeNull()
  })

  it('o `check` é recriado com `drop … if exists` ANTES do `add`', () => {
    expect(checkIdempotente(LIMPO)).toBe(true)
    expect(checkIdempotente(mutar(LIMPO, /drop constraint if exists orders_material_tracking_set_by_check/i, 'drop constraint orders_material_tracking_set_by_check'))).toBe(false)
  })
})

describe('envelopeSchema — `set_material_tracking` (ENV-22)', () => {
  it('`set_by` é decidido pelo PAPEL (`has_role`), nunca por parâmetro', () => {
    expect(autoriaPeloPapel(LIMPO)).toBe(true)
    expect(autoriaPeloPapel(mutar(LIMPO, 'case when v_admin then', "case when p_code like 'A%' then"))).toBe(false)
    expect(autoriaPeloPapel(mutar(LIMPO, "v_admin := public.has_role(auth.uid(), 'admin');", 'v_admin := true;'))).toBe(false)
  })

  it('a assinatura continua `(p_order_id uuid, p_code text)` — sem um "quem sou eu"', () => {
    expect(assinaturaSemAutoria(LIMPO)).toBe(true)
    expect(assinaturaSemAutoria(mutar(LIMPO, /p_code text\s*\)/, 'p_code text, p_by text)'))).toBe(false)
  })

  it('`set_at = now()`', () => {
    expect(dataPeloServidor(LIMPO)).toBe(true)
    expect(dataPeloServidor(mutar(LIMPO, /material_tracking_set_at\s*=\s*now\(\)/i, 'material_tracking_set_at = clock_timestamp() - interval \'1 day\''))).toBe(false)
  })

  it('UM `update`, e só depois do `if not found` — recusa não escreve', () => {
    expect(updateDepoisDaAutorizacao(LIMPO)).toBe(true)
    const f = funcao(LIMPO)!
    const antes = mutar(
      LIMPO,
      'if not found then',
      "update public.orders set material_tracking_set_at = now() where id = p_order_id;\n\tif not found then",
    )
    expect(updateDepoisDaAutorizacao(antes)).toBe(false)
    expect(f.corpo).toMatch(/if not found then/i)
  })

  it('o `where` do `update` é exatamente `id = p_order_id` — regravar o mesmo código atualiza a autoria', () => {
    expect(whereDoUpdate(LIMPO)).toBe('id = p_order_id')
    expect(
      whereDoUpdate(mutar(LIMPO, /where id = p_order_id;/, 'where id = p_order_id\n\t\tand material_tracking_code is distinct from v_code;')),
    ).toBe('id = p_order_id and material_tracking_code is distinct from v_code')
    expect(whereDoUpdate(mutar(LIMPO, /where id = p_order_id;/, "where id = p_order_id and material_status <> 'material_recebido';"))).not.toBe(
      'id = p_order_id',
    )
    // Sem `where`, a extração não acha nada e REPROVA (nunca "aprova por ausência").
    expect(whereDoUpdate(mutar(LIMPO, /\s*where id = p_order_id;/, ';'))).toBeNull()
  })

  it('a autorização da `22` está intacta (admin OU dona, na mesma leitura)', () => {
    expect(autorizacaoIntacta(LIMPO)).toBe(true)
    expect(autorizacaoIntacta(mutar(LIMPO, /\s+or o\.customer_id in/i, ' and o.customer_id in'))).toBe(false)
  })

  it('`security definer` com `search_path = public`', () => {
    expect(definerComSearchPath(LIMPO)).toBe(true)
    expect(definerComSearchPath(mutar(LIMPO, /security definer/i, 'security invoker'))).toBe(false)
  })

  it('`execute` só a `authenticated`, revogado de `public` e `anon`', () => {
    expect(concedidoA(LIMPO)).toEqual(['authenticated'])
    expect(revogaPublicEAnon(LIMPO)).toBe(true)
    expect(
      concedidoA(`${LIMPO}\ngrant execute on function public.set_material_tracking(uuid, text) to anon;`),
    ).toEqual(['anon', 'authenticated'])
    expect(revogaPublicEAnon(mutar(LIMPO, /revoke all on function public\.set_material_tracking\(uuid, text\) from anon;/i, ''))).toBe(false)
  })
})

describe('envelopeSchema — `order_list`', () => {
  it('com `security_invoker`, e as duas colunas como as DUAS ÚLTIMAS', () => {
    const cols = colunasDaView(LIMPO)!
    expect(cols.slice(-2)).toEqual(['material_tracking_set_at', 'material_tracking_set_by'])
    expect(colunasDaView(mutar(LIMPO, 'with (security_invoker = true)', ''))).toBeNull()
    const trocadas = colunasDaView(
      mutar(LIMPO, /material_tracking_set_at,\s*material_tracking_set_by/, 'material_tracking_set_by,\n\tmaterial_tracking_set_at'),
    )!
    expect(trocadas.slice(-2)).not.toEqual(['material_tracking_set_at', 'material_tracking_set_by'])
  })

  it('o que vem antes é a lista da `35`, intacta e na mesma ordem', () => {
    const cols = colunasDaView(LIMPO)!
    expect(cols.slice(0, -2)).toEqual(COLUNAS_35)
    const reordenada = colunasDaView(mutar(LIMPO, 'id, order_number, customer_id', 'order_number, id, customer_id'))!
    expect(reordenada.slice(0, -2)).not.toEqual(COLUNAS_35)
  })
})

describe('envelopeSchema — aditiva', () => {
  it('nenhum `insert`/`update`/`delete` fora do corpo da função', () => {
    expect(escritaForaDaFuncao(LIMPO)).toEqual([])
    expect(escritaForaDaFuncao(`${LIMPO}\nupdate public.orders set material_tracking_set_by = 'admin';`)).toEqual(['update public.orders set'])
    expect(escritaForaDaFuncao(`${LIMPO}\ndelete from public.orders;`)).toEqual(['delete from'])
  })
})
