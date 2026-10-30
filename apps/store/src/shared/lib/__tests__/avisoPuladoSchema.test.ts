import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature 88 — o status `skipped` em `order_notifications` e a RPC
 * `skip_order_notification` (`AVS-10`, `AVS-11`, `AVS-24`, `AD-069`).
 *
 * Lê o `.sql` **do disco**, no molde de `orderNotificationsSchema` e `entregaDeEmailSchema`, porque
 * afrouxar uma migration não quebra nada: um `where` que passa a aceitar `sent` faz um ajuste de
 * status sem aviso APAGAR a memória de um e-mail que já saiu (o avião do histórico o mandaria de
 * novo); um que aceita `pending` atropela um envio em curso; um `grant` que alcança `authenticated`
 * deixa uma cliente logada marcar o próprio e-mail como "a Adri escolheu não avisar". Tudo isso
 * aplica limpo e passa em build, em `tsc` e em teste de componente.
 *
 * **Uma régua por comando** (`L-033`), cada uma um predicado com sensor por mutação, e `mutar()`
 * LANÇA quando a mutação não acha o alvo — sensor que vira no-op em silêncio não prova nada.
 *
 * A semântica (as quatro transições, as permissões efetivas, o claim reivindicando `skipped`) só se
 * prova contra o banco: `.specs/features/88-aviso-opcional-nas-acoes-do-pedido/probes/01-aviso-pulado.sql`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const PASTA = resolve(ROOT, 'supabase/migrations')
const NOME_88 = '20261102120000_88-aviso-pulado.sql'
const NOME_42 = '20260907120000_42-notificacoes.sql'

const sql = readFileSync(resolve(PASTA, NOME_88), 'utf8')

const mutar = (texto: string, de: string, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${de.slice(0, 60)}…`)
  return mutante
}

/** O SQL sem comentários de linha — o cabeçalho deste arquivo EXPLICA as formas proibidas em prosa. CRLF e LF. */
const semComentarios = (texto: string): string => texto.replace(/--[^\r\n]*/g, '')

// -------------------------------------------------------------------------------------------
// As réguas, como predicados — uma por COMANDO
// -------------------------------------------------------------------------------------------

const CRIA_CHECK = /add\s+constraint\s+order_notifications_status_check\s+check\s*\(\s*status\s+in\s*\(([^)]*)\)\s*\)/i

/** Os valores do `check` de status que ESTE texto cria — ou `null`. */
const statusDoCheck = (texto: string): string[] | null => {
  const m = semComentarios(texto).match(CRIA_CHECK)
  return m ? [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]) : null
}

/** Comando 1: a constraint é derrubada ANTES de ser recriada — senão o `add` falha no banco existente. */
const derrubaAntesDeCriar = (texto: string): boolean => {
  const t = semComentarios(texto)
  const derruba = t.search(/alter\s+table\s+public\.order_notifications\s+drop\s+constraint\s+if\s+exists\s+order_notifications_status_check\s*;/i)
  const cria = t.search(CRIA_CHECK)
  return derruba >= 0 && cria > derruba
}

/** A última migration (na ordem do `db push`, o nome) que cria a constraint, e os valores dela. */
const vigente = (arquivos: { nome: string; texto: string }[]): { nome: string; status: string[] } | null => {
  const criadoras = arquivos
    .map((a) => ({ nome: a.nome, status: statusDoCheck(a.texto) }))
    .filter((a) => a.status !== null)
    .sort((a, b) => a.nome.localeCompare(b.nome))
  const ultima = criadoras[criadoras.length - 1]
  return ultima ? { nome: ultima.nome, status: ultima.status! } : null
}

/** A statement inteira de `create or replace function public.<nome>`, até o `$$;` — ou `null`. */
const funcao = (texto: string, nome: string): string | null =>
  semComentarios(texto).match(new RegExp(`create or replace function public\\.${nome}\\s*\\([\\s\\S]*?\\$\\$;`, 'i'))?.[0] ??
  null

/** Comando 2a: a assinatura é (uuid, text, text) e devolve `uuid` (o id gravado, ou null). */
const assinaturaCerta = (texto: string): boolean =>
  /skip_order_notification\s*\(\s*p_order_id\s+uuid\s*,\s*p_event\s+text\s*,\s*p_channel\s+text\s*\)\s*returns\s+uuid/i.test(
    funcao(texto, 'skip_order_notification') ?? '',
  )

/** Comando 2b: `security definer`. */
const securityDefiner = (texto: string): boolean => /\bsecurity\s+definer\b/i.test(funcao(texto, 'skip_order_notification') ?? '')

/** Comando 2c: `search_path` VAZIO — o corpo qualifica tudo com `public.`. */
const searchPathVazio = (texto: string): boolean =>
  /set\s+search_path\s*=\s*''/i.test(funcao(texto, 'skip_order_notification') ?? '')

/** O corpo entre `as $$` e `$$;`. */
const corpo = (texto: string): string => (funcao(texto, 'skip_order_notification') ?? '').match(/as\s+\$\$([\s\S]*?)\$\$;/i)?.[1] ?? ''

/** Comando 2d: grava `skipped`, pela tripla, numa statement só, devolvendo o id. */
const gravaSkippedPelaTripla = (texto: string): boolean => {
  const c = corpo(texto)
  return (
    /insert into public\.order_notifications as n \(order_id, event, channel, status\)/i.test(c) &&
    /values \(p_order_id, p_event, p_channel, 'skipped'\)/i.test(c) &&
    /on conflict \(order_id, event, channel\) do update/i.test(c) &&
    /set status = 'skipped'/i.test(c) &&
    /returning n\.id/i.test(c)
  )
}

/**
 * Comando 2e: o recorte do `do update` é EXATAMENTE `failed` e `skipped` (`AVS-11`). `sent` fica
 * intocado (o e-mail já saiu); `pending` fica intocado (o envio em curso vence).
 */
const recorteSoFailedESkipped = (texto: string): boolean => {
  const m = corpo(texto).match(/where\s+n\.status\s+in\s*\(([^)]*)\)/i)
  if (!m) return false
  const valores = [...m[1].matchAll(/'([a-z]+)'/g)].map((x) => x[1]).sort()
  return JSON.stringify(valores) === JSON.stringify(['failed', 'skipped'])
}

/**
 * Comando 2f (Verifier r1, `AVS-12`): o `do update` RENOVA `created_at` e limpa `error`. A linha do
 * histórico usa `sent_at ?? created_at`; sem renovar, um `failed→skipped` ou um segundo pulo
 * apareceria na hora ANTIGA, não na da escolha.
 */
const renovaHoraDaEscolha = (texto: string): boolean => {
  const set = corpo(texto).match(/do update\s+set([\s\S]*?)\bwhere\b/i)?.[1] ?? ''
  return /\bcreated_at\s*=\s*now\(\)/i.test(set) && /\berror\s*=\s*null\b/i.test(set)
}

/** Comando 3 (× 4): revogada de `public`, `anon` e `authenticated`, concedida só à `service_role`. */
const ASSINATURA = String.raw`public\.skip_order_notification\(uuid,\s*text,\s*text\)`
const revoga = (texto: string, papel: string): boolean =>
  new RegExp(`revoke\\s+all\\s+on\\s+function\\s+${ASSINATURA}\\s+from\\s+${papel}\\s*;`, 'i').test(semComentarios(texto))
const concedeServiceRole = (texto: string): boolean =>
  new RegExp(`grant\\s+execute\\s+on\\s+function\\s+${ASSINATURA}\\s+to\\s+service_role\\s*;`, 'i').test(semComentarios(texto))

/** Nenhum `grant` alcança papel de cliente — nem por curinga. */
const nenhumGrantDeCliente = (texto: string): boolean =>
  !/grant[^;]*\bto\b[^;]*\b(anon|authenticated|public)\b/is.test(semComentarios(texto))

/** Nenhuma escrita de DADO fora do corpo da função, e nada que apague. */
const semEscritaDeDado = (texto: string): boolean => {
  const fora = semComentarios(texto).replace(/as\s+\$\$[\s\S]*?\$\$;/gi, '')
  return !/\b(insert\s+into|update\s+public\.|delete\s+from|truncate|drop\s+table)\b/i.test(fora)
}

/** `claim_order_notification` NÃO é recriada aqui: o recorte dela já reivindica `skipped`. */
const naoRecriaOClaim = (texto: string): boolean => !/claim_order_notification/i.test(semComentarios(texto))

const recarregaSchema = (texto: string): boolean => /notify pgrst,\s*'reload schema';/i.test(semComentarios(texto))

// -------------------------------------------------------------------------------------------

const disco = readdirSync(PASTA)
  .filter((f) => f.endsWith('.sql'))
  .map((nome) => ({ nome, texto: readFileSync(resolve(PASTA, nome), 'utf8') }))

describe('âncoras — a varredura olhou alguma coisa', () => {
  it('a migration da 88 existe, tem corpo, e a função e o `check` foram achados nela', () => {
    expect(sql.length).toBeGreaterThan(1500)
    expect(funcao(sql, 'skip_order_notification')).not.toBeNull()
    expect(statusDoCheck(sql)).not.toBeNull()
    expect(corpo(sql)).not.toBe('')
  })

  it('duas migrations criam o `check` de status — a da 42 e a da 88 —, lidas da pasta inteira', () => {
    expect(disco.length).toBeGreaterThan(60)
    const criadoras = disco.filter((a) => statusDoCheck(a.texto) !== null).map((a) => a.nome).sort()
    expect(criadoras).toEqual([NOME_42, NOME_88])
  })
})

describe('o `check` de status VIGENTE é o da 88, com `skipped`', () => {
  it('a vigente é a da 88: pending, sent, failed, skipped — e a da 42 não é mais', () => {
    expect(vigente(disco)).toEqual({ nome: NOME_88, status: ['pending', 'sent', 'failed', 'skipped'] })
    expect(vigente(disco)?.nome).not.toBe(NOME_42)
  })

  it('a 88 derruba a constraint antes de recriá-la', () => {
    expect(derrubaAntesDeCriar(sql)).toBe(true)
  })

  it('SENSOR: sem o `drop`, ou com o `drop` depois do `add`, reprova', () => {
    const semDrop = mutar(sql, 'alter table public.order_notifications drop constraint if exists order_notifications_status_check;\n', '')
    expect(derrubaAntesDeCriar(semDrop)).toBe(false)
  })

  it('SENSOR: o `check` da 88 sem `skipped` deixa de ter os quatro', () => {
    const mutado = mutar(sql, "'failed', 'skipped'))", "'failed'))")
    expect(vigente(disco.map((a) => (a.nome === NOME_88 ? { ...a, texto: mutado } : a)))?.status).toEqual(['pending', 'sent', 'failed'])
  })

  it('SENSOR: sem a 88, a vigente volta a ser a da 42 — sem `skipped`', () => {
    expect(vigente(disco.filter((a) => a.nome !== NOME_88))).toEqual({ nome: NOME_42, status: ['pending', 'sent', 'failed'] })
  })

  it('SENSOR: uma migration posterior que recriasse o check sem `skipped` viraria a vigente', () => {
    const depois = [...disco, { nome: '20991231000000_x.sql', texto: "alter table public.order_notifications add constraint order_notifications_status_check check (status in ('pending', 'sent'));" }]
    expect(vigente(depois)).toEqual({ nome: '20991231000000_x.sql', status: ['pending', 'sent'] })
  })
})

describe('`skip_order_notification` — a forma', () => {
  it('assinatura (uuid, text, text) devolvendo uuid', () => {
    expect(assinaturaCerta(sql)).toBe(true)
  })
  it('SENSOR: devolvendo boolean reprova', () => {
    expect(assinaturaCerta(mutar(sql, 'returns uuid', 'returns boolean'))).toBe(false)
  })

  it('security definer', () => {
    expect(securityDefiner(sql)).toBe(true)
  })
  it('SENSOR: security invoker reprova', () => {
    expect(securityDefiner(mutar(sql, '\nsecurity definer\n', '\nsecurity invoker\n'))).toBe(false)
  })

  it("search_path vazio (set search_path = '')", () => {
    expect(searchPathVazio(sql)).toBe(true)
  })
  it('SENSOR: search_path = public reprova', () => {
    expect(searchPathVazio(mutar(sql, "set search_path = ''", 'set search_path = public'))).toBe(false)
  })

  it('grava `skipped` pela tripla (pedido, evento, canal), numa statement, devolvendo o id', () => {
    expect(gravaSkippedPelaTripla(sql)).toBe(true)
  })
  it('SENSOR: conflito sem o canal reprova', () => {
    expect(gravaSkippedPelaTripla(mutar(sql, 'on conflict (order_id, event, channel) do update', 'on conflict (order_id, event) do update'))).toBe(false)
  })
  it('SENSOR: inserir `pending` em vez de `skipped` reprova', () => {
    expect(gravaSkippedPelaTripla(mutar(sql, "values (p_order_id, p_event, p_channel, 'skipped')", "values (p_order_id, p_event, p_channel, 'pending')"))).toBe(false)
  })
  it('SENSOR: sem `returning n.id` reprova', () => {
    expect(gravaSkippedPelaTripla(mutar(sql, 'returning n.id;', ';'))).toBe(false)
  })

  it('o `do update` só alcança `failed` e `skipped` (AVS-11)', () => {
    expect(recorteSoFailedESkipped(sql)).toBe(true)
  })
  it('SENSOR: alcançar `sent` reprova (apagaria a memória de um e-mail enviado)', () => {
    expect(recorteSoFailedESkipped(mutar(sql, "where n.status in ('failed', 'skipped')", "where n.status in ('failed', 'skipped', 'sent')"))).toBe(false)
  })
  it('SENSOR: alcançar `pending` reprova (atropelaria o envio em curso)', () => {
    expect(recorteSoFailedESkipped(mutar(sql, "where n.status in ('failed', 'skipped')", "where n.status in ('failed', 'skipped', 'pending')"))).toBe(false)
  })
  it('SENSOR: o recorte do claim (status diferente de sent) no lugar reprova', () => {
    expect(recorteSoFailedESkipped(mutar(sql, "where n.status in ('failed', 'skipped')", "where n.status <> 'sent'"))).toBe(false)
  })
})

describe('`skip_order_notification` — a hora da escolha (AVS-12, Verifier r1)', () => {
  it('o `do update` renova `created_at = now()` e mantém `error = null`', () => {
    expect(renovaHoraDaEscolha(sql)).toBe(true)
  })
  it('SENSOR: sem renovar `created_at` reprova', () => {
    expect(renovaHoraDaEscolha(mutar(sql, ',\n      created_at = now()', ''))).toBe(false)
  })
  it('SENSOR: sem limpar `error` reprova', () => {
    expect(renovaHoraDaEscolha(mutar(sql, 'error = null', 'error = n.error'))).toBe(false)
  })
  it('SENSOR: `created_at = now()` depois do `where` (fora do `set`) não conta', () => {
    const mutado = mutar(sql, ',\n      created_at = now()', '')
    expect(renovaHoraDaEscolha(mutar(mutado, 'returning n.id;', 'returning n.id, now() as created_at;'))).toBe(false)
  })
})

describe('`skip_order_notification` — quem executa', () => {
  it.each(['public', 'anon', 'authenticated'])('revoga de `%s`', (papel) => {
    expect(revoga(sql, papel)).toBe(true)
  })
  it.each(['public', 'anon', 'authenticated'])('SENSOR: sem o revoke de `%s` reprova', (papel) => {
    const mutado = mutar(sql, `revoke all on function public.skip_order_notification(uuid, text, text) from ${papel};`, '')
    expect(revoga(mutado, papel)).toBe(false)
  })

  it('concede `execute` à service_role', () => {
    expect(concedeServiceRole(sql)).toBe(true)
  })
  it('SENSOR: sem o grant à service_role reprova', () => {
    expect(concedeServiceRole(mutar(sql, 'grant execute on function public.skip_order_notification(uuid, text, text) to service_role;', ''))).toBe(false)
  })

  it('nenhum `grant` alcança papel de cliente', () => {
    expect(nenhumGrantDeCliente(sql)).toBe(true)
  })
  it('SENSOR: um grant a `authenticated` reprova, e o mesmo texto em comentário não — com LF e com CRLF', () => {
    for (const quebra of ['\n', '\r\n']) {
      const linha = 'grant execute on function public.skip_order_notification(uuid, text, text) to authenticated;'
      expect(nenhumGrantDeCliente(`${sql}${quebra}-- ${linha}${quebra}`)).toBe(true)
      expect(nenhumGrantDeCliente(`${sql}${quebra}${linha}${quebra}`)).toBe(false)
    }
  })
})

describe('o resto da migration', () => {
  it('nenhuma escrita de dado fora do corpo da função', () => {
    expect(semEscritaDeDado(sql)).toBe(true)
  })
  it('SENSOR: um `update` solto, ou um `insert` solto, reprova', () => {
    expect(semEscritaDeDado(`${sql}\nupdate public.order_notifications set status = 'skipped' where status = 'failed';\n`)).toBe(false)
    expect(semEscritaDeDado(`${sql}\ninsert into public.order_notifications (order_id) values (null);\n`)).toBe(false)
  })

  it('não recria `claim_order_notification` — o recorte dela já reivindica `skipped`', () => {
    expect(naoRecriaOClaim(sql)).toBe(true)
  })
  it('SENSOR: recriar o claim aqui reprova', () => {
    expect(naoRecriaOClaim(`${sql}\ncreate or replace function public.claim_order_notification() returns uuid language sql as $$ select null::uuid $$;\n`)).toBe(false)
  })

  it('termina avisando o PostgREST (`notify pgrst`)', () => {
    expect(recarregaSchema(sql)).toBe(true)
  })
  it('SENSOR: sem o notify reprova', () => {
    expect(recarregaSchema(mutar(sql, "notify pgrst, 'reload schema';", ''))).toBe(false)
  })
})

describe('o `mutar` do próprio guarda', () => {
  it('lança quando o alvo não existe — um sensor que vira no-op não prova nada', () => {
    expect(() => mutar(sql, 'texto que não está na migration', 'x')).toThrow(/não encontrou o alvo/)
  })
})
