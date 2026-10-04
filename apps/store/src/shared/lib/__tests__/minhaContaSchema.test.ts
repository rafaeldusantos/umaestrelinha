import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature `59` — Minha Conta V2 (`LIN-01..03`, `DAD-06`, `DAD-07`,
 * `NUM-01..03`).
 *
 * Lê o `.sql` **do disco**, no molde de `orderNumberSchema`, `checkoutSchema` e
 * `entregaDeEmailSchema`, e pelo mesmo motivo: **afrouxar uma migration não quebra nada**. A
 * função do histórico devolvendo `note`, o gatilho deixando o CPF mudar, o índice perdendo o
 * `where`, a renumeração alcançando os pedidos `NS-` — todos aplicam limpo e passam em build,
 * `tsc` e teste de componente.
 *
 * **Uma régua por COMANDO** (`L-033`): são quatro comandos independentes, e uma régua só para a
 * família deixaria três deles sem dono. Cada régua é um **predicado**, exercido também contra texto
 * mutado — e `mutar()` **lança** quando a mutação não muda nada, porque mutação que vira no-op prova
 * o `replace` e mais nada (lição do `mutar()` da `52`).
 *
 * As mutações partem do SQL **sem comentário**: a prosa do cabeçalho cita os comandos para
 * explicá-los, e mutar o arquivo cru consumiria a menção em vez do uso (achado do guarda da `58`).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261004120000_59-minha-conta.sql')

// CRLF normalizado ANTES de qualquer régua: um checkout no Windows não pode mudar o veredito.
const sql = readFileSync(CAMINHO, 'utf8').replace(/\r\n/g, '\n')

// -------------------------------------------------------------------------------------------
// Utilidades
// -------------------------------------------------------------------------------------------

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`L-031`, `BL-027`). */
const semComentario = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

/** Mutação que não encontra o alvo **lança** — no-op silencioso não prova régua nenhuma. */
const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

const comandos = semComentario(sql)

/**
 * O corpo de uma função, do `create or replace function public.<nome>` até o `$$;` que a fecha.
 * Recorte que falha devolve `null` e **reprova** — nunca vira string vazia que aprova tudo.
 */
const blocoDaFuncao = (texto: string, nome: string): string | null => {
  const codigo = semComentario(texto)
  const inicio = codigo.search(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${nome}\\b`, 'i'))
  if (inicio < 0) return null
  const fim = codigo.indexOf('$$;', inicio)
  if (fim < 0) return null
  return codigo.slice(inicio, fim + 3)
}

const contar = (texto: string, re: RegExp): number =>
  (semComentario(texto).match(new RegExp(re.source, 'gi')) ?? []).length

// -------------------------------------------------------------------------------------------
// As réguas — 1. customer_order_events
// -------------------------------------------------------------------------------------------

const FN = 'customer_order_events'

const fnAssinatura = (texto: string): boolean =>
  /create\s+or\s+replace\s+function\s+public\.customer_order_events\s*\(\s*p_order_id\s+uuid\s*\)/i.test(
    semComentario(texto),
  )

/** O retorno é EXATAMENTE `status` e `created_at` — e o `select` também. */
const fnSoStatusEData = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, FN)
  if (!b) return false
  return (
    /returns\s+table\s*\(\s*status\s+text\s*,\s*created_at\s+timestamptz\s*\)/i.test(b) &&
    /select\s+h\.to_status\s*,\s*h\.created_at\s+from\s/i.test(b)
  )
}

/** Nem `note` nem `created_by` aparecem na função — nem no retorno, nem no `select`. */
const fnVazaColunaInterna = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, FN)
  return b === null || /\b(note|created_by)\b/i.test(b)
}

const fnSecurityDefiner = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, FN)
  return !!b && /\bsecurity\s+definer\b/i.test(b)
}

const fnSearchPathVazio = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, FN)
  return !!b && /set\s+search_path\s*=\s*''/i.test(b)
}

/** Só o pedido pedido, e só se for da cliente da sessão. */
const fnFiltraPelaDona = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, FN)
  if (!b) return false
  return (
    /join\s+public\.orders\s+o\s+on\s+o\.id\s*=\s*h\.order_id/i.test(b) &&
    /join\s+public\.customers\s+c\s+on\s+c\.id\s*=\s*o\.customer_id/i.test(b) &&
    /where\s+h\.order_id\s*=\s*p_order_id\s+and\s+c\.user_id\s*=\s*auth\.uid\(\)/i.test(b)
  )
}

const fnRevogadaDe = (texto: string, papel: string): boolean =>
  new RegExp(
    `revoke\\s+all\\s+on\\s+function\\s+public\\.${FN}\\(uuid\\)\\s+from\\s+${papel}\\s*;`,
    'i',
  ).test(semComentario(texto))

const fnConcedidaA = (texto: string, papel: string): boolean =>
  new RegExp(
    `grant\\s+[^;]*on\\s+function\\s+public\\.${FN}\\(uuid\\)\\s+to\\s+[^;]*\\b${papel}\\b[^;]*;`,
    'i',
  ).test(semComentario(texto))

// -------------------------------------------------------------------------------------------
// As réguas — 2. guard_customer_identity
// -------------------------------------------------------------------------------------------

const GATILHO = 'guard_customer_identity'

/**
 * A função do gatilho NÃO pode ser `security definer`: com ela, `current_user` seria sempre o dono,
 * e a saída de manutenção direta liberaria toda cliente.
 */
const gatilhoEhSecurityDefiner = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, GATILHO)
  return b === null || /\bsecurity\s+definer\b/i.test(b)
}

/** As três saídas, e só elas, numa única condição que devolve `new` antes de qualquer recusa. */
const gatilhoSaidas = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, GATILHO)
  if (!b) return false
  return /begin\s+if\s+current_user\s+not\s+in\s*\(\s*'authenticated'\s*,\s*'anon'\s*\)\s+or\s+auth\.role\(\)\s*=\s*'service_role'\s+or\s+public\.has_role\(\s*auth\.uid\(\)\s*,\s*'admin'\s*\)\s+then\s+return\s+new\s*;\s*end\s+if\s*;/i.test(
    b,
  )
}

const gatilhoRecusaEmail = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, GATILHO)
  return !!b && /if\s+new\.email\s+is\s+distinct\s+from\s+old\.email\s+then\s+raise\s+exception\b/i.test(b)
}

const gatilhoRecusaUserId = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, GATILHO)
  return (
    !!b && /if\s+new\.user_id\s+is\s+distinct\s+from\s+old\.user_id\s+then\s+raise\s+exception\b/i.test(b)
  )
}

/** O CPF só trava quando JÁ estava preenchido — vazio → preenchido passa, uma vez. */
const gatilhoRecusaCpfPreenchido = (texto: string): boolean => {
  const b = blocoDaFuncao(texto, GATILHO)
  return (
    !!b &&
    /if\s+coalesce\(\s*btrim\(\s*old\.cpf\s*\)\s*,\s*''\s*\)\s*<>\s*''\s+and\s+new\.cpf\s+is\s+distinct\s+from\s+old\.cpf\s+then\s+raise\s+exception\b/i.test(
      b,
    )
  )
}

/** As três recusas com `42501` — o mesmo código de "permissão negada" que o PostgREST traduz. */
const gatilhoErrcodes = (texto: string): number => {
  const b = blocoDaFuncao(texto, GATILHO)
  return b ? (b.match(/using\s+errcode\s*=\s*'42501'/gi) ?? []).length : 0
}

const gatilhoAntesDeUpdate = (texto: string): boolean =>
  /create\s+trigger\s+guard_customer_identity\s+before\s+update\s+on\s+public\.customers\s+for\s+each\s+row\s+execute\s+function\s+public\.guard_customer_identity\(\)\s*;/i.test(
    semComentario(texto),
  )

// -------------------------------------------------------------------------------------------
// As réguas — 3. addresses_one_default
// -------------------------------------------------------------------------------------------

/** Índice ÚNICO e PARCIAL — sem o `where`, cada cliente teria um endereço só, padrão ou não. */
const indiceUnicoParcial = (texto: string): boolean =>
  /create\s+unique\s+index\s+if\s+not\s+exists\s+addresses_one_default\s+on\s+public\.addresses\s*\(\s*customer_id\s*\)\s+where\s+is_default\s*;/i.test(
    semComentario(texto),
  )

/** O desempate vem ANTES do índice — senão o índice falha onde já houver dois padrões. */
const desempateAntesDoIndice = (texto: string): boolean => {
  const codigo = semComentario(texto)
  const desempate = codigo.search(
    /update\s+public\.addresses\s+a\s+set\s+is_default\s*=\s*false\s+where\s+a\.is_default\s+and\s+exists\s*\(/i,
  )
  const indice = codigo.search(/create\s+unique\s+index\s+if\s+not\s+exists\s+addresses_one_default/i)
  return desempate >= 0 && indice >= 0 && desempate < indice
}

// -------------------------------------------------------------------------------------------
// As réguas — 4. a renumeração
// -------------------------------------------------------------------------------------------

/** O recorte: só `NP-%`, em ordem de criação. */
const renumeraSoNp = (texto: string): boolean =>
  /for\s+r\s+in\s+select\s+id\s+from\s+public\.orders\s+where\s+order_number\s+like\s+'NP-%'\s+order\s+by\s+created_at\b/i.test(
    semComentario(texto),
  )

/** O número novo vem da MESMA sequência e do MESMO `lpad` do `default` da coluna (`58`). */
const renumeraPelaSequencia = (texto: string): boolean =>
  /update\s+public\.orders\s+set\s+order_number\s*=\s*lpad\(\s*nextval\(\s*'public\.orders_number_seq'::regclass\s*\)::text\s*,\s*4\s*,\s*'0'\s*\)\s+where\s+id\s*=\s*r\.id\s*;/i.test(
    semComentario(texto),
  )

/** Qualquer escrita em `orders` além da renumeração recortada. */
const escritasEmOrders = (texto: string): number => contar(texto, /update\s+public\.orders\b/)

const tocaNs = (texto: string): boolean => /'NS-/i.test(semComentario(texto))

// -------------------------------------------------------------------------------------------

describe('migration da 59 — âncoras de leitura', () => {
  it('a varredura leu o arquivo certo', () => {
    expect(sql.length).toBeGreaterThan(2000)
    expect(sql).toContain('Feature 59')
  })

  it('a varredura encontra os quatro comandos — âncora de contagem', () => {
    // A segunda metade da âncora dupla: o arquivo foi lido **e** a forma esperada está lá. Sem
    // ela, um comando renomeado faria as réguas de ausência abaixo passarem sobre nada.
    expect(contar(sql, /create\s+or\s+replace\s+function\s+public\./)).toBe(2)
    expect(contar(sql, /create\s+trigger\s/)).toBe(1)
    expect(contar(sql, /create\s+unique\s+index\s/)).toBe(1)
    expect(contar(sql, /\bdo\s+\$\$/)).toBe(1)
    expect(contar(sql, /update\s+public\./)).toBe(2)
  })

  it('o recorte de função devolve null quando a função não existe — e não string vazia', () => {
    expect(blocoDaFuncao(sql, 'nao_existe')).toBeNull()
    expect(blocoDaFuncao(sql, FN)).toContain('returns table')
    expect(blocoDaFuncao(sql, GATILHO)).toContain('returns trigger')
  })
})

describe('1. customer_order_events (LIN-01..03)', () => {
  it('existe, recebendo só o id do pedido', () => {
    expect(fnAssinatura(sql)).toBe(true)
  })

  it('sensor — outra assinatura reprova', () => {
    expect(fnAssinatura(mutar(comandos, 'customer_order_events(p_order_id uuid)', 'customer_order_events(p_customer_id uuid)'))).toBe(false)
  })

  it('devolve SÓ status e data', () => {
    expect(fnSoStatusEData(sql)).toBe(true)
    expect(fnVazaColunaInterna(sql)).toBe(false)
  })

  it('sensor — `note` no retorno é acusado', () => {
    // A nota é texto interno da Adri. Uma coluna a mais no `returns table` e no `select` aplica
    // limpo e entrega a nota à cliente.
    const mutante = mutar(
      mutar(comandos, 'created_at timestamptz)', 'created_at timestamptz, note text)'),
      'h.created_at\n\tfrom',
      'h.created_at, h.note\n\tfrom',
    )
    expect(fnSoStatusEData(mutante)).toBe(false)
    expect(fnVazaColunaInterna(mutante)).toBe(true)
  })

  it('sensor — `created_by` no `select` é acusado', () => {
    const mutante = mutar(comandos, 'select h.to_status, h.created_at', 'select h.to_status, h.created_at, h.created_by')
    expect(fnSoStatusEData(mutante)).toBe(false)
    expect(fnVazaColunaInterna(mutante)).toBe(true)
  })

  it('é `security definer` com `search_path` vazio', () => {
    expect(fnSecurityDefiner(sql)).toBe(true)
    expect(fnSearchPathVazio(sql)).toBe(true)
  })

  it('sensor — sem `security definer`, reprova', () => {
    expect(fnSecurityDefiner(mutar(comandos, 'stable\nsecurity definer', 'stable'))).toBe(false)
  })

  it('sensor — `search_path` com `public`, reprova', () => {
    // Só dentro da função do histórico — o gatilho também tem `search_path` vazio. O substituto vai
    // por FUNÇÃO: como texto, o `$$` do corpo viraria `$` no `replace` e o recorte fecharia longe.
    const b = blocoDaFuncao(comandos, FN) as string
    const corpoMutado = mutar(b, "set search_path = ''", 'set search_path = public')
    const mutante = comandos.replace(b, () => corpoMutado)
    expect(fnSearchPathVazio(mutante)).toBe(false)
  })

  it('filtra pelo pedido E pela dona da sessão', () => {
    expect(fnFiltraPelaDona(sql)).toBe(true)
  })

  it('sensor — sem o recorte por `auth.uid()`, reprova (todo histórico de todo pedido sairia)', () => {
    expect(fnFiltraPelaDona(mutar(comandos, /\s+and c\.user_id = auth\.uid\(\)/, ''))).toBe(false)
  })

  it('sensor — sem o recorte pelo pedido, reprova', () => {
    expect(fnFiltraPelaDona(mutar(comandos, 'where h.order_id = p_order_id\n\t\tand', 'where'))).toBe(false)
  })

  it('é revogada de `public` e de `anon`, e concedida a `authenticated`', () => {
    expect(fnRevogadaDe(sql, 'public')).toBe(true)
    expect(fnRevogadaDe(sql, 'anon')).toBe(true)
    expect(fnConcedidaA(sql, 'authenticated')).toBe(true)
    expect(fnConcedidaA(sql, 'anon')).toBe(false)
    expect(fnConcedidaA(sql, 'public')).toBe(false)
  })

  it('sensor — sem o `revoke` de `anon`, reprova (o papel herdaria das default privileges)', () => {
    expect(fnRevogadaDe(mutar(comandos, 'revoke all on function public.customer_order_events(uuid) from anon;', ''), 'anon')).toBe(false)
  })

  it('sensor — sem o `revoke` de `public`, reprova', () => {
    expect(fnRevogadaDe(mutar(comandos, 'revoke all on function public.customer_order_events(uuid) from public;', ''), 'public')).toBe(false)
  })

  it('sensor — um `grant` a `anon` É acusado', () => {
    const mutante = mutar(comandos, 'to authenticated;', 'to authenticated, anon;')
    expect(fnConcedidaA(mutante, 'anon')).toBe(true)
  })

  it('sensor — sem o `grant` a `authenticated`, reprova', () => {
    expect(fnConcedidaA(mutar(comandos, 'grant execute on function public.customer_order_events(uuid) to authenticated;', ''), 'authenticated')).toBe(false)
  })
})

describe('2. guard_customer_identity (DAD-06)', () => {
  it('a função do gatilho NÃO é `security definer`', () => {
    expect(gatilhoEhSecurityDefiner(sql)).toBe(false)
  })

  it('sensor — com `security definer`, é acusada (a saída de manutenção liberaria todo mundo)', () => {
    const mutante = mutar(comandos, 'returns trigger\nlanguage plpgsql', 'returns trigger\nlanguage plpgsql\nsecurity definer')
    expect(gatilhoEhSecurityDefiner(mutante)).toBe(true)
  })

  it('as três saídas — manutenção, service role e admin — vêm antes de qualquer recusa', () => {
    expect(gatilhoSaidas(sql)).toBe(true)
  })

  it('sensor — sem a saída do admin, reprova (o painel deixaria de corrigir o CPF)', () => {
    expect(gatilhoSaidas(mutar(comandos, /\s+or public\.has_role\(auth\.uid\(\), 'admin'\)/, ''))).toBe(false)
  })

  it('sensor — sem a saída da service role, reprova (o checkout deixaria de gravar o CPF)', () => {
    expect(gatilhoSaidas(mutar(comandos, /\s+or auth\.role\(\) = 'service_role'/, ''))).toBe(false)
  })

  it('sensor — a saída de manutenção alargada a `authenticated` reprova', () => {
    // A forma exata que abriria o gatilho para toda cliente: `authenticated` saindo da lista.
    expect(gatilhoSaidas(mutar(comandos, "not in ('authenticated', 'anon')", "not in ('anon')"))).toBe(false)
  })

  it('recusa trocar o e-mail', () => {
    expect(gatilhoRecusaEmail(sql)).toBe(true)
  })

  it('sensor — sem a recusa do e-mail, reprova', () => {
    expect(gatilhoRecusaEmail(mutar(comandos, 'if new.email is distinct from old.email then', 'if false then'))).toBe(false)
  })

  it('recusa trocar o dono (`user_id`)', () => {
    expect(gatilhoRecusaUserId(sql)).toBe(true)
  })

  it('sensor — sem a recusa do `user_id`, reprova', () => {
    expect(gatilhoRecusaUserId(mutar(comandos, 'if new.user_id is distinct from old.user_id then', 'if false then'))).toBe(false)
  })

  it('recusa trocar o CPF JÁ preenchido — e só ele', () => {
    expect(gatilhoRecusaCpfPreenchido(sql)).toBe(true)
  })

  it('sensor — sem a condição "já preenchido", reprova (o CPF vazio nunca poderia ser informado)', () => {
    expect(
      gatilhoRecusaCpfPreenchido(
        mutar(comandos, "if coalesce(btrim(old.cpf), '') <> '' and new.cpf", 'if new.cpf'),
      ),
    ).toBe(false)
  })

  it('sensor — sem a recusa do CPF, reprova', () => {
    expect(
      gatilhoRecusaCpfPreenchido(
        mutar(comandos, "and new.cpf is distinct from old.cpf then", 'and false then'),
      ),
    ).toBe(false)
  })

  it('as três recusas usam `42501`', () => {
    expect(gatilhoErrcodes(sql)).toBe(3)
  })

  it('sensor — um errcode genérico é acusado', () => {
    expect(gatilhoErrcodes(mutar(comandos, "using errcode = '42501'", "using errcode = 'P0001'"))).toBe(2)
  })

  it('é `before update` em `customers`, por linha', () => {
    expect(gatilhoAntesDeUpdate(sql)).toBe(true)
  })

  it('sensor — `after update` reprova (a linha já teria sido gravada)', () => {
    expect(gatilhoAntesDeUpdate(mutar(comandos, 'before update on public.customers', 'after update on public.customers'))).toBe(false)
  })

  it('sensor — `before insert` reprova (o update passaria livre)', () => {
    expect(gatilhoAntesDeUpdate(mutar(comandos, 'before update on public.customers', 'before insert on public.customers'))).toBe(false)
  })
})

describe('3. addresses_one_default (DAD-07)', () => {
  it('índice único e PARCIAL por cliente', () => {
    expect(indiceUnicoParcial(sql)).toBe(true)
  })

  it('sensor — sem o `where is_default`, reprova (um endereço só por cliente, padrão ou não)', () => {
    expect(indiceUnicoParcial(mutar(comandos, /\s+where is_default;/, ';'))).toBe(false)
  })

  it('sensor — sem o `unique`, reprova (dois padrões voltariam a ser possíveis)', () => {
    expect(indiceUnicoParcial(mutar(comandos, 'create unique index', 'create index'))).toBe(false)
  })

  it('o desempate dos padrões repetidos vem ANTES do índice', () => {
    expect(desempateAntesDoIndice(sql)).toBe(true)
  })

  it('sensor — sem o desempate, reprova (o índice falharia num banco com dois padrões)', () => {
    const mutante = mutar(comandos, /update public\.addresses a[\s\S]*?\);\n/, '')
    expect(desempateAntesDoIndice(mutante)).toBe(false)
  })
})

describe('4. a renumeração dos `NP-` (NUM-01..03)', () => {
  it('o recorte é `like \'NP-%\'`, em ordem de criação', () => {
    expect(renumeraSoNp(sql)).toBe(true)
  })

  it('sensor — o recorte alargado reprova (os 35 `NS-` seriam renumerados)', () => {
    expect(renumeraSoNp(mutar(comandos, "like 'NP-%'", "like '%'"))).toBe(false)
  })

  it('sensor — sem a ordem de criação, reprova', () => {
    expect(renumeraSoNp(mutar(comandos, 'order by created_at, id', 'order by id'))).toBe(false)
  })

  it('o número novo vem da sequência da 58, com o mesmo `lpad`, e só no pedido do laço', () => {
    expect(renumeraPelaSequencia(sql)).toBe(true)
  })

  it('sensor — sem o `lpad`, reprova (o pedido viraria `172` em vez de `0172`)', () => {
    expect(
      renumeraPelaSequencia(
        mutar(
          comandos,
          "lpad(nextval('public.orders_number_seq'::regclass)::text, 4, '0')",
          "nextval('public.orders_number_seq'::regclass)::text",
        ),
      ),
    ).toBe(false)
  })

  it('sensor — sem o `where id = r.id`, reprova (todos os pedidos ganhariam o mesmo número)', () => {
    expect(renumeraPelaSequencia(mutar(comandos, /\s+where id = r\.id;/, ';'))).toBe(false)
  })

  it('idempotente pelo recorte: é a ÚNICA escrita em `orders`, e o valor novo não casa `NP-%`', () => {
    // O `lpad(nextval(…))` só produz dígitos — a segunda passada não acha mais nenhum `NP-`.
    expect(escritasEmOrders(sql)).toBe(1)
    expect(renumeraSoNp(sql) && renumeraPelaSequencia(sql)).toBe(true)
  })

  it('sensor — uma segunda escrita em `orders` É acusada', () => {
    const mutante = `${comandos}\nupdate public.orders set order_number = 'NS-' || order_number;`
    expect(escritasEmOrders(mutante)).toBe(2)
    expect(tocaNs(mutante)).toBe(true)
  })

  it('não toca nos pedidos `NS-` da Nuvemshop', () => {
    expect(tocaNs(sql)).toBe(false)
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada, o USO é (CRLF e LF)', () => {
    expect(tocaNs("-- os 'NS-' ficam\nselect 1;")).toBe(false)
    expect(tocaNs("/* 'NS-' */\r\nselect 1;")).toBe(false)
    expect(tocaNs("-- nota em CRLF\r\nupdate public.orders set x = 'NS-1';")).toBe(true)
    expect(tocaNs("-- nota em LF\nupdate public.orders set x = 'NS-1';")).toBe(true)
  })
})

describe('o arnês de mutação', () => {
  it('`mutar()` LANÇA quando o alvo não existe', () => {
    expect(() => mutar(comandos, 'texto que não está no arquivo', 'x')).toThrow(/não encontrou o alvo/)
  })
})
