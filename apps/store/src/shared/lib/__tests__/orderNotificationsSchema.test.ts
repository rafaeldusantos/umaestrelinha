import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { NOTIFICATION_EVENTS } from '@estrelinha/core/notifications'

/**
 * O guarda da migration da feature 42 — a memória de "já avisei?" que ganha canal, e os textos
 * que vão para o banco (`NTF-01`, `PNL-06`).
 *
 * Lê o `.sql` **do disco**, como `menuSchema`, `homeSections`, `faqSchema` e `importSchema`. O
 * motivo é o de sempre: **afrouxar uma migration não quebra nada**. Um `check` de `event` que
 * perde um valor faz o motor falhar no `insert` do evento novo — em produção, no caixa. Um índice
 * que vira parcial deixa dois webhooks concorrentes enviarem o mesmo e-mail duas vezes. Uma view
 * sem `security_invoker` entrega a lista de e-mails de toda cliente a qualquer `authenticated`. Um
 * `do nothing` que vira `do update` sobrescreve o texto que a Adri editou no próximo `db push`.
 * Tudo isso aplica limpo e passa em build, em `tsc` e em teste de componente.
 *
 * Cada régua é um **predicado**, para poder ser exercida contra texto mutado (sensor). E a lista
 * de eventos é comparada com `NOTIFICATION_EVENTS` **nos dois sentidos**: evento em `core` que não
 * está no `check` quebraria o motor; evento no `check` que não está em `core` seria um valor que
 * nenhuma tela sabe rotular.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20260907120000_42-notificacoes.sql')

const sql = readFileSync(CAMINHO, 'utf8')
const minusculo = sql.toLowerCase()

// -------------------------------------------------------------------------------------------
// As réguas, como predicados
// -------------------------------------------------------------------------------------------

/**
 * O SQL **sem os comentários de linha**. Toda régua de ausência precisa disto: este arquivo
 * EXPLICA por escrito que nada alcança `anon` e que a tabela não é apagada. Trata CRLF e LF.
 */
const semComentarios = (texto: string): string => texto.replace(/--[^\r\n]*/g, '')

/** A lista de eventos do `check` de `event`, na ordem do arquivo — ou `null` se o `check` sumiu. */
const eventosDoCheck = (texto: string): string[] | null => {
  const m = semComentarios(texto).match(
    /add constraint\s+order_notifications_event_check\s+check\s*\(\s*event in \(([\s\S]*?)\)\s*\)/i,
  )
  if (!m) return null
  return [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1])
}

/** O `create unique index` sobre (order_id, event, channel) — e a statement inteira, para olhar o `where`. */
const indiceUnico = (texto: string): string | null =>
  semComentarios(texto).match(
    /create unique index if not exists\s+order_notifications_order_event_channel\s+on public\.order_notifications\s*\(order_id,\s*event,\s*channel\)[^;]*;/i,
  )?.[0] ?? null

/** Índice presente **e** sem cláusula `where` — o ponto de serialização do `on conflict`. */
const indiceNaoParcial = (texto: string): boolean => {
  const stmt = indiceUnico(texto)
  return stmt !== null && !/\bwhere\b/i.test(stmt)
}

/** A statement da view, inteira. */
const viewStatement = (texto: string): string | null =>
  semComentarios(texto).match(/create or replace view public\.order_emails[\s\S]*?;/i)?.[0] ?? null

const viewComSecurityInvoker = (texto: string): boolean =>
  /create or replace view public\.order_emails\s+with\s*\(\s*security_invoker\s*=\s*true\s*\)/i.test(
    semComentarios(texto),
  )

/** A view expõe `event` como `type` e recorta só o canal e-mail — é o contrato do código publicado. */
const viewCompativel = (texto: string): boolean => {
  const stmt = viewStatement(texto) ?? ''
  return /event as type/i.test(stmt) && /where channel = 'email'/i.test(stmt) && /from public\.order_notifications/i.test(stmt)
}

/** Nenhum `grant` alcança `anon` — nem por curinga (`public`). */
const nenhumGrantParaAnon = (texto: string): boolean =>
  !/grant[^;]*\bto\b[^;]*\b(anon|public)\b/is.test(semComentarios(texto))

/** O corpo da função `nome`, entre `as $$` e `$$;` — ou `null`. */
const corpoDaFuncao = (texto: string, nome: string): string | null => {
  const re = new RegExp(`create or replace function public\\.${nome}\\s*\\([\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$;`, 'i')
  return semComentarios(texto).match(re)?.[1] ?? null
}

/** A RPC antiga delega para a nova, com o canal e-mail cravado. */
const claimDelega = (texto: string): boolean =>
  /select public\.claim_order_notification\(p_order_id,\s*p_type,\s*'email'\);/i.test(
    corpoDaFuncao(texto, 'claim_order_email') ?? '',
  )

const finishDelega = (texto: string): boolean =>
  /select public\.finish_order_notification\(p_id,\s*p_provider_message_id,\s*p_error\);/i.test(
    corpoDaFuncao(texto, 'finish_order_email') ?? '',
  )

/** A RPC nova reivindica pela tripla, numa statement só, e só fora de `sent`. */
const claimNovaAtomica = (texto: string): boolean => {
  const corpo = corpoDaFuncao(texto, 'claim_order_notification') ?? ''
  return (
    /on conflict \(order_id,\s*event,\s*channel\) do update/i.test(corpo) &&
    /where n\.status <> 'sent'/i.test(corpo) &&
    /returning n\.id/i.test(corpo)
  )
}

/** As duas RPCs novas: revogadas de public/anon/authenticated e concedidas só a service_role. */
const rpcSoServiceRole = (texto: string, nome: string): boolean => {
  const t = semComentarios(texto)
  const assinatura = `${nome}\\(uuid,\\s*text,\\s*text\\)`
  return (
    new RegExp(`revoke all on function public\\.${assinatura} from public;`, 'i').test(t) &&
    new RegExp(`revoke all on function public\\.${assinatura} from anon;`, 'i').test(t) &&
    new RegExp(`revoke all on function public\\.${assinatura} from authenticated;`, 'i').test(t) &&
    new RegExp(`grant execute on function public\\.${assinatura} to service_role;`, 'i').test(t)
  )
}

/** A semeadura não pode sobrescrever a linha existente. */
const semeaduraNaoSobrescreve = (texto: string): boolean => {
  const insert = semComentarios(texto).match(/insert into public\.store_settings[\s\S]*?do nothing;|insert into public\.store_settings[\s\S]*?;/i)?.[0]
  if (!insert) return false
  return /on conflict \(key\) do nothing/i.test(insert) && !/do update/i.test(insert)
}

/** O rename da tabela vive num `do $$` guardado pelos DOIS nomes em `pg_tables`. */
const renameGuardado = (texto: string): boolean => {
  const blocos = semComentarios(texto).match(/do \$\$[\s\S]*?\$\$;/g) ?? []
  return blocos.some(
    (b) =>
      b.includes("tablename = 'order_emails'") &&
      b.includes("tablename = 'order_notifications'") &&
      /alter table public\.order_emails rename to order_notifications/i.test(b),
  )
}

/** O rename da coluna idem, guardado pelos dois nomes de coluna. */
const renameDaColunaGuardado = (texto: string): boolean => {
  const blocos = semComentarios(texto).match(/do \$\$[\s\S]*?\$\$;/g) ?? []
  return blocos.some(
    (b) =>
      b.includes("column_name = 'type'") &&
      b.includes("column_name = 'event'") &&
      /rename column type to event/i.test(b),
  )
}

/** Nada que apague dado: nem `drop table`, nem `delete`, nem `truncate`. Rename, não cópia. */
const preservaDados = (texto: string): boolean =>
  !/\b(drop table|delete from|truncate)\b/i.test(semComentarios(texto))

const policyComHasRole = (texto: string): boolean =>
  /create policy "admin read order_notifications" on public\.order_notifications\s+for select to authenticated using \(public\.has_role\(auth\.uid\(\), 'admin'\)\);/i.test(
    semComentarios(texto),
  )

const checkDeCanal = (texto: string): boolean =>
  /check \(channel in \('email',\s*'whatsapp'\)\)/i.test(semComentarios(texto))

const checkDeStatus = (texto: string): boolean =>
  /check \(status in \('pending',\s*'sent',\s*'failed'\)\)/i.test(semComentarios(texto))

const recarregaSchema = (texto: string): boolean => /notify pgrst,\s*'reload schema';/i.test(semComentarios(texto))

// -------------------------------------------------------------------------------------------

describe('âncoras — a varredura olhou alguma coisa', () => {
  it('a migration existe e tem corpo', () => {
    expect(sql.length).toBeGreaterThan(8000)
    expect(minusculo).toContain('order_notifications')
  })

  it('achou o `check` de event, o índice, a view e a semente no texto lido', () => {
    // A segunda metade da âncora dupla: arquivo lido **e** alvos encontrados.
    expect(eventosDoCheck(sql)).not.toBeNull()
    expect(indiceUnico(sql)).not.toBeNull()
    expect(viewStatement(sql)).not.toBeNull()
    expect(minusculo).toContain("values ('notifications'")
  })

  it('`NOTIFICATION_EVENTS` tem tamanho de verdade', () => {
    expect(NOTIFICATION_EVENTS.length).toBe(15)
  })
})

describe('o `check` de `event` é NOTIFICATION_EVENTS — nos dois sentidos, e na ordem', () => {
  it('a lista do SQL é exatamente a do TypeScript', () => {
    expect(eventosDoCheck(sql)).toEqual([...NOTIFICATION_EVENTS])
  })

  it('SENSOR: tirar um evento do SQL reprova', () => {
    const mutado = sql.replace("\t\t'pix_expired',\n", '')
    expect(mutado).not.toBe(sql)
    expect(eventosDoCheck(mutado)).not.toEqual([...NOTIFICATION_EVENTS])
  })

  it('SENSOR: um evento a mais no SQL (que `core` não rotula) reprova', () => {
    const mutado = sql.replace("\t\t'owner_material_incoming'\n", "\t\t'owner_material_incoming',\n\t\t'order_confirmed'\n")
    expect(mutado).not.toBe(sql)
    expect(eventosDoCheck(mutado)).not.toEqual([...NOTIFICATION_EVENTS])
  })

  it('o `check` antigo, que só conhecia quatro valores, cai antes do novo entrar', () => {
    expect(minusculo).toContain('drop constraint if exists order_emails_type_check')
    expect(minusculo.indexOf('drop constraint if exists order_emails_type_check')).toBeLessThan(
      minusculo.indexOf('add constraint order_notifications_event_check'),
    )
  })
})

describe('o índice único (order_id, event, channel) — NÃO parcial', () => {
  it('existe e não tem `where`', () => {
    expect(indiceNaoParcial(sql)).toBe(true)
  })

  it('SENSOR: um índice parcial reprova na mesma régua', () => {
    // `where status = 'sent'` só detectaria a colisão DEPOIS da entrega: dois webhooks concorrentes
    // passariam os dois pelo `insert pending` e enviariam duas vezes.
    const mutado = sql.replace(
      'on public.order_notifications (order_id, event, channel);',
      "on public.order_notifications (order_id, event, channel) where status = 'sent';",
    )
    expect(mutado).not.toBe(sql)
    expect(indiceNaoParcial(mutado)).toBe(false)
  })

  it('o índice antigo (order_id, type) cai', () => {
    expect(minusculo).toContain('drop index if exists public.order_emails_order_type')
  })
})

describe('as RPCs', () => {
  it('a nova reivindica pela tripla, numa statement só, e só fora de `sent`', () => {
    expect(claimNovaAtomica(sql)).toBe(true)
  })

  it('SENSOR: um `on conflict` sem o canal reprova', () => {
    const mutado = sql.replace('on conflict (order_id, event, channel) do update', 'on conflict (order_id, event) do update')
    expect(mutado).not.toBe(sql)
    expect(claimNovaAtomica(mutado)).toBe(false)
  })

  it('as duas novas só são executáveis pela service_role', () => {
    expect(rpcSoServiceRole(sql, 'claim_order_notification')).toBe(true)
    expect(rpcSoServiceRole(sql, 'finish_order_notification')).toBe(true)
  })

  it('SENSOR: perder o revoke de `anon` reprova', () => {
    const mutado = sql.replace(
      'revoke all on function public.claim_order_notification(uuid, text, text) from anon;\n',
      '',
    )
    expect(mutado).not.toBe(sql)
    expect(rpcSoServiceRole(mutado, 'claim_order_notification')).toBe(false)
  })

  it('as antigas DELEGAM para as novas com o canal e-mail — a janela de deploy fica coberta', () => {
    expect(claimDelega(sql)).toBe(true)
    expect(finishDelega(sql)).toBe(true)
  })

  it('SENSOR: a antiga voltando ao corpo próprio (o `insert` de antes) reprova', () => {
    const mutado = sql.replace(
      "select public.claim_order_notification(p_order_id, p_type, 'email');",
      "insert into public.order_notifications as n (order_id, event, status) values (p_order_id, p_type, 'pending') returning n.id;",
    )
    expect(mutado).not.toBe(sql)
    expect(claimDelega(mutado)).toBe(false)
  })
})

describe('a view de compatibilidade `order_emails`', () => {
  it('é `security_invoker` — a RLS da tabela vale para quem consulta', () => {
    expect(viewComSecurityInvoker(sql)).toBe(true)
  })

  it('SENSOR: sem `security_invoker` reprova', () => {
    const mutado = sql.replace('\twith (security_invoker = true)\n', '')
    expect(mutado).not.toBe(sql)
    expect(viewComSecurityInvoker(mutado)).toBe(false)
  })

  it('expõe `event` como `type`, recorta `channel = email`, e lê da tabela nova', () => {
    expect(viewCompativel(sql)).toBe(true)
  })

  it('SENSOR: uma view que deixa de recortar o canal reprova', () => {
    const mutado = sql.replace("\t where channel = 'email';", ';')
    expect(mutado).not.toBe(sql)
    expect(viewCompativel(mutado)).toBe(false)
  })
})

describe('a semeadura de `store_settings.notifications`', () => {
  it('não sobrescreve a linha existente', () => {
    expect(semeaduraNaoSobrescreve(sql)).toBe(true)
  })

  it('SENSOR: um upsert reprova na mesma régua', () => {
    // Com `do update`, todo `db push` futuro devolveria o texto default por cima do que a Adri
    // escreveu, e religaria o que ela desligou.
    const mutado = sql.replace('on conflict (key) do nothing;', 'on conflict (key) do update set value = excluded.value;')
    expect(mutado).not.toBe(sql)
    expect(semeaduraNaoSobrescreve(mutado)).toBe(false)
  })
})

describe('rename, não cópia — e o dado sobrevive', () => {
  it('o rename da tabela é guardado pelos dois nomes em `pg_tables`', () => {
    expect(renameGuardado(sql)).toBe(true)
  })

  it('SENSOR: um rename solto (fora do `do $$`) reprova', () => {
    const mutado = sql.replace(
      /do \$\$\nbegin\n\tif exists \(\n\t\tselect 1 from pg_tables where schemaname = 'public' and tablename = 'order_emails'\n\t\) and not exists \(\n\t\tselect 1 from pg_tables where schemaname = 'public' and tablename = 'order_notifications'\n\t\) then\n\t\talter table public\.order_emails rename to order_notifications;\n\tend if;\nend\n\$\$;/,
      'alter table public.order_emails rename to order_notifications;',
    )
    expect(mutado).not.toBe(sql)
    expect(renameGuardado(mutado)).toBe(false)
  })

  it('o rename da coluna é guardado pelos dois nomes de coluna', () => {
    expect(renameDaColunaGuardado(sql)).toBe(true)
  })

  it('nada apaga dado: sem `drop table`, `delete` ou `truncate`', () => {
    expect(preservaDados(sql)).toBe(true)
  })

  it('SENSOR: um `drop table` reprova, e um comentário citando `drop table` não', () => {
    expect(preservaDados(`${sql}\ndrop table public.order_emails;\n`)).toBe(false)
    expect(preservaDados(`${sql}\n-- nunca: drop table public.order_emails;\n`)).toBe(true)
  })

  it('`channel` nasce `not null default email`, com `check` dos dois canais', () => {
    expect(minusculo).toContain("add column if not exists channel text not null default 'email'")
    expect(checkDeCanal(sql)).toBe(true)
  })

  it('o `check` de `status` continua pending/sent/failed', () => {
    expect(checkDeStatus(sql)).toBe(true)
  })
})

describe('RLS e permissões', () => {
  it('a leitura é só do admin, por `has_role`', () => {
    expect(policyComHasRole(sql)).toBe(true)
  })

  it('nenhum `grant` alcança `anon`', () => {
    expect(nenhumGrantParaAnon(sql)).toBe(true)
  })

  it('SENSOR: um grant para `anon` reprova, e o mesmo texto em comentário não — com LF e com CRLF', () => {
    for (const quebra of ['\n', '\r\n']) {
      expect(nenhumGrantParaAnon(`${sql}${quebra}-- grant select on public.order_emails to anon;${quebra}`)).toBe(true)
      expect(nenhumGrantParaAnon(`${sql}${quebra}grant select on public.order_emails to anon;${quebra}`)).toBe(false)
    }
  })

  it('nenhuma policy de ESCRITA — quem escreve é a service role, pelas RPCs', () => {
    const policies = semComentarios(sql).match(/create policy[\s\S]*?;/gi) ?? []
    expect(policies).toHaveLength(1)
    expect(policies[0]).toMatch(/for select/i)
  })
})

describe('o PostgREST é avisado do rename', () => {
  it('a migration termina com `notify pgrst, reload schema`', () => {
    expect(recarregaSchema(sql)).toBe(true)
    expect(semComentarios(sql).trim().endsWith("notify pgrst, 'reload schema';")).toBe(true)
  })

  it('SENSOR: sem o notify reprova', () => {
    const mutado = sql.replace("notify pgrst, 'reload schema';", '')
    expect(mutado).not.toBe(sql)
    expect(recarregaSchema(mutado)).toBe(false)
  })
})
