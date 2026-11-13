import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CAMPAIGN_BADGE_MAX,
  CAMPAIGN_DEFAULT_COLORS,
  CAMPAIGN_HEX,
  CAMPAIGN_NAME_MAX,
  CAMPAIGN_PERCENTS_MAX,
  CAMPAIGN_PERCENT_MAX,
  CAMPAIGN_PERCENT_MIN,
} from '@estrelinha/core/campaigns'

/**
 * O guarda da migration das campanhas de desconto: a campanha, os percentuais que ela
 * oferece, a marcação da peça e a campanha na linha do pedido.
 *
 * Errar aqui não quebra nada: um `cascade` no lugar do `restrict`, uma exclusão sem `where (active)`,
 * um `grant` ao anon ou uma policy sem `with check` passam em build, `tsc` e teste de componente. Por
 * isso o guarda lê a migration do disco, UMA régua por comando, e os tetos são IMPORTADOS de
 * `@estrelinha/core/campaigns`, que é o que a tela usa para recusar.
 *
 * O comportamento (a exclusão recusando, o `23503`, o teto, o que o anon vê) é do probe
 * `01-campanhas.sql`, da pasta de probes do cadastro de campanhas; este arquivo guarda a forma.
 *
 * **Âncora**: o arquivo é lido e cada extração devolve algo — uma que falha devolve `null` e
 * REPROVA. O `mutar()` **lança** quando a mutação não muda nada.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O caminho por extenso, de propósito: a régua nunca é o objeto medido. */
const MIGRATION = join(ROOT, 'supabase/migrations/20261130120000_102-campanhas.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/** Comentário não é código: o cabeçalho explica em prosa o que a migration faz e não faz. */
const semComentario = (texto: string): string => texto.replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')

const LIMPO = semComentario(SQL)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

const TABELAS = ['campaigns', 'campaign_percents', 'product_campaigns'] as const

// -------------------------------------------------------------------------------------------
// As réguas, como predicados
// -------------------------------------------------------------------------------------------

const corpoDaTabela = (texto: string, tabela: string): string | null => {
  const m = texto.match(new RegExp(`create table if not exists public\\.${tabela}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'))
  return m ? m[1] : null
}

const criadasSemIfNotExists = (texto: string): string[] =>
  [...texto.matchAll(/create table\s+(?!if not exists)(?:public\.)?(\w+)/gi)].map(m => m[1])

/** O teto de um texto: `check (char_length(btrim(<coluna>)) between 1 and N)`. */
const tetoDoTexto = (texto: string, coluna: string): number | null => {
  const m = corpoDaTabela(texto, 'campaigns')?.match(
    new RegExp(`${coluna}\\s+text not null check \\(char_length\\(btrim\\(${coluna}\\)\\) between 1 and (\\d+)\\)`, 'i'),
  )
  return m ? Number(m[1]) : null
}

/** A cor: o `check` de formato e o padrão. */
const cor = (texto: string, coluna: string): { padrao: string; formato: string } | null => {
  const m = corpoDaTabela(texto, 'campaigns')?.match(
    new RegExp(`${coluna}\\s+text not null default '([^']+)' check \\(${coluna} ~ '([^']+)'\\)`, 'i'),
  )
  return m ? { padrao: m[1], formato: m[2] } : null
}

const fimDepoisDoInicio = (texto: string): boolean =>
  /constraint campaigns_ends_after_starts check \(ends_at > starts_at\)/i.test(corpoDaTabela(texto, 'campaigns') ?? '')

/** A exclusão: gist sobre o intervalo meio-aberto, só entre as LIGADAS. */
const exclusao = (texto: string): string | null => {
  const m = (corpoDaTabela(texto, 'campaigns') ?? '').match(
    /constraint campaigns_one_live_at_a_time\s+exclude using gist \(([\s\S]*?)\) where \((\w+)\)/i,
  )
  return m ? `${m[1].replace(/\s+/g, ' ')} | ${m[2]}` : null
}

const faixaDoPercentual = (texto: string): [number, number] | null => {
  const m = corpoDaTabela(texto, 'campaign_percents')?.match(/percent\s+integer not null check \(percent between (\d+) and (\d+)\)/i)
  return m ? [Number(m[1]), Number(m[2])] : null
}

const percentualSaiComACampanha = (texto: string): boolean =>
  /campaign_id uuid not null references public\.campaigns \(id\) on delete cascade/i.test(
    corpoDaTabela(texto, 'campaign_percents') ?? '',
  )

/** O corpo de uma função `create or replace function public.<nome>` até o `$$;` que a fecha. */
const corpoDaFuncao = (texto: string, nome: string): string | null => {
  const inicio = texto.search(new RegExp(`create or replace function public\\.${nome}\\(`, 'i'))
  if (inicio === -1) return null
  const fim = texto.indexOf('$$;', inicio)
  return fim === -1 ? null : texto.slice(inicio, fim)
}

/** O teto do gatilho: `if v_count >= N then raise … 23514`, com a linha da campanha travada antes. */
const tetoDoGatilho = (texto: string): number | null => {
  const corpo = corpoDaFuncao(texto, 'validate_campaign_percent') ?? ''
  if (!/perform 1 from public\.campaigns where id = new\.campaign_id for update;/i.test(corpo)) return null
  const m = corpo.match(/if v_count >= (\d+) then\s+raise exception '[^']*'\s+using errcode = '23514';/i)
  return m ? Number(m[1]) : null
}

const gatilhoLigado = (texto: string): boolean =>
  /create trigger campaign_percents_validate\s+before insert on public\.campaign_percents\s+for each row execute function public\.validate_campaign_percent\(\);/i.test(
    texto,
  )

/** A chave composta da marcação aponta para os percentuais da campanha, com `restrict`. */
const chaveCompostaRestrict = (texto: string): boolean =>
  /constraint product_campaigns_percent_fkey\s+foreign key \(campaign_id, percent\) references public\.campaign_percents \(campaign_id, percent\)\s+on delete restrict/i.test(
    corpoDaTabela(texto, 'product_campaigns') ?? '',
  )

const marcacaoSaiComPecaECampanha = (texto: string): boolean => {
  const corpo = corpoDaTabela(texto, 'product_campaigns') ?? ''
  return (
    /product_id\s+uuid not null references public\.products \(id\) on delete cascade/i.test(corpo) &&
    /campaign_id uuid not null references public\.campaigns \(id\) on delete cascade/i.test(corpo) &&
    /primary key \(product_id, campaign_id\)/i.test(corpo)
  )
}

const pedidoRestrict = (texto: string): boolean =>
  /alter table public\.order_items\s+add column if not exists campaign_id uuid\s+constraint order_items_campaign_id_fkey references public\.campaigns \(id\) on delete restrict;/i.test(
    texto,
  )

/** Só UMA coluna nova em `order_items` — as outras são de outra entrega (outra entrega). */
const colunasNovasDoPedido = (texto: string): string[] =>
  [...texto.matchAll(/alter table public\.order_items\s+add column if not exists (\w+)/gi)].map(m => m[1])

const viewDeUso = (texto: string): string | null => {
  const m = texto.match(
    /create or replace view public\.campaign_percent_usage with \(security_invoker = true\) as([\s\S]*?);/i,
  )
  return m ? m[1] : null
}

const comRls = (texto: string, tabela: string): boolean =>
  new RegExp(`alter table public\\.${tabela}\\s+enable row level security;`, 'i').test(texto)

const policies = (texto: string, tabela: string): string[] =>
  [...texto.matchAll(new RegExp(`create policy "[^"]+" on public\\.${tabela}\\b([\\s\\S]*?);`, 'gi'))].map(m => m[1])

const HAS_ROLE = String.raw`\(\(select public\.has_role\(\(select auth\.uid\(\)\), 'admin'\)\)\)`

/** A escrita: UMA policy `for all to authenticated` com `has_role` no `using` E no `with check`. */
const escritaSoDeAdmin = (texto: string, tabela: string): boolean => {
  const todas = policies(texto, tabela)
  const escrita = todas.filter(p => !/for select/i.test(p))
  if (escrita.length !== 1 || todas.length !== 2) return false
  const corpo = escrita[0]
  return (
    /for all\s+to authenticated\b/i.test(corpo) &&
    new RegExp(`using ${HAS_ROLE}`, 'i').test(corpo) &&
    new RegExp(`with check ${HAS_ROLE}`, 'i').test(corpo)
  )
}

/** A leitura pública: UMA policy `for select to anon, authenticated`; devolve o `using`. */
const leituraPublica = (texto: string, tabela: string): string | null => {
  const leitura = policies(texto, tabela).filter(p => /for select/i.test(p))
  if (leitura.length !== 1 || !/to anon, authenticated\b/i.test(leitura[0])) return null
  const m = leitura[0].match(/using \(([\s\S]*)\)\s*$/i)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

const grantAAnon = (texto: string): boolean => /grant\b[^;]*\bto\b[^;]*\banon\b/i.test(texto)

/** O texto fora dos corpos de função: é ali que uma escrita de dado seria escrita de dado. */
const foraDasFuncoes = (texto: string): string => texto.replace(/\$\$[\s\S]*?\$\$/g, '$$ $$')

const escreveDado = (texto: string): boolean =>
  /^\s*(insert into|update\s+public\.|delete from)\b/im.test(foraDasFuncoes(texto))

const gravacao = (texto: string): string | null => corpoDaFuncao(texto, 'save_campaign')

const ASSINATURA = 'public.save_campaign(uuid, text, text, text, text, timestamptz, timestamptz, boolean, integer[])'

// -------------------------------------------------------------------------------------------

describe('campanhasSchema — âncora', () => {
  it('a migration foi lida; as três tabelas, a view, o gatilho e a gravação foram encontrados', () => {
    expect(SQL.length).toBeGreaterThan(3000)
    for (const t of TABELAS) expect(corpoDaTabela(LIMPO, t)).not.toBeNull()
    expect(viewDeUso(LIMPO)).not.toBeNull()
    expect(corpoDaFuncao(LIMPO, 'validate_campaign_percent')).not.toBeNull()
    expect(gravacao(LIMPO)).not.toBeNull()
  })
})

describe('a campanha', () => {
  it('as tabelas nascem com `if not exists`', () => {
    expect(criadasSemIfNotExists(LIMPO)).toEqual([])
    expect(
      criadasSemIfNotExists(mutar(LIMPO, 'create table if not exists public.campaigns', 'create table public.campaigns')),
    ).toEqual(['campaigns'])
  })

  it('o teto do nome e o do texto do selo são os de `core`', () => {
    expect(tetoDoTexto(LIMPO, 'name')).toBe(CAMPAIGN_NAME_MAX)
    expect(tetoDoTexto(LIMPO, 'badge_text')).toBe(CAMPAIGN_BADGE_MAX)
    expect(tetoDoTexto(mutar(LIMPO, 'char_length(btrim(badge_text)) between 1 and 14', 'char_length(btrim(badge_text)) between 1 and 20'), 'badge_text')).toBe(20)
    expect(tetoDoTexto(mutar(LIMPO, 'char_length(btrim(name)) between 1 and 40', 'char_length(name) between 1 and 40'), 'name')).toBeNull()
  })

  it('as duas cores: o `check` de formato é o de `core`, e o padrão é preto e ouro', () => {
    expect(cor(LIMPO, 'band_color')).toEqual({ padrao: CAMPAIGN_DEFAULT_COLORS.band, formato: CAMPAIGN_HEX.source })
    expect(cor(LIMPO, 'accent_color')).toEqual({ padrao: CAMPAIGN_DEFAULT_COLORS.accent, formato: CAMPAIGN_HEX.source })
    expect(cor(mutar(LIMPO, "check (accent_color ~ '^#[0-9A-Fa-f]{6}$')", ''), 'accent_color')).toBeNull()
    expect(cor(mutar(LIMPO, "band_color ~ '^#[0-9A-Fa-f]{6}$'", "band_color ~ '^#'"), 'band_color')?.formato).toBe('^#')
  })

  it('o fim vem depois do início', () => {
    expect(fimDepoisDoInicio(LIMPO)).toBe(true)
    expect(fimDepoisDoInicio(mutar(LIMPO, 'check (ends_at > starts_at)', 'check (ends_at >= starts_at)'))).toBe(false)
  })

  it("uma ligada por vez: exclusão gist sobre `tstzrange(…, '[)')` com `where (active)`", () => {
    expect(exclusao(LIMPO)).toBe("tstzrange(starts_at, ends_at, '[)') with && | active")
    expect(exclusao(mutar(LIMPO, "'[)'", "'[]'"))).not.toBe("tstzrange(starts_at, ends_at, '[)') with && | active")
    expect(exclusao(mutar(LIMPO, ' where (active)', ''))).toBeNull()
  })
})

describe('os percentuais', () => {
  it('a faixa é a de `core`, e os percentuais saem com a campanha', () => {
    expect(faixaDoPercentual(LIMPO)).toEqual([CAMPAIGN_PERCENT_MIN, CAMPAIGN_PERCENT_MAX])
    expect(faixaDoPercentual(mutar(LIMPO, 'percent between 1 and 70', 'percent between 0 and 90'))).toEqual([0, 90])
    expect(percentualSaiComACampanha(LIMPO)).toBe(true)
  })

  it('o teto é o de `core`, num gatilho ligado antes do insert, com a campanha travada', () => {
    expect(tetoDoGatilho(LIMPO)).toBe(CAMPAIGN_PERCENTS_MAX)
    expect(tetoDoGatilho(mutar(LIMPO, 'if v_count >= 5 then', 'if v_count >= 6 then'))).toBe(6)
    expect(tetoDoGatilho(mutar(LIMPO, ' for update;', ';'))).toBeNull()
    expect(gatilhoLigado(LIMPO)).toBe(true)
    expect(gatilhoLigado(mutar(LIMPO, 'before insert on public.campaign_percents', 'after insert on public.campaign_percents'))).toBe(false)
  })
})

describe('a marcação da peça', () => {
  it('a chave composta aponta para os percentuais da campanha, com `restrict`', () => {
    expect(chaveCompostaRestrict(LIMPO)).toBe(true)
    expect(
      chaveCompostaRestrict(mutar(LIMPO, /(references public\.campaign_percents \(campaign_id, percent\)\s+)on delete restrict/, '$1on delete cascade')),
    ).toBe(false)
  })

  it('sai com a peça e com a campanha; uma por peça e campanha', () => {
    expect(marcacaoSaiComPecaECampanha(LIMPO)).toBe(true)
    expect(
      marcacaoSaiComPecaECampanha(mutar(LIMPO, /(product_id\s+uuid not null references public\.products \(id\)) on delete cascade/, '$1 on delete restrict')),
    ).toBe(false)
    expect(marcacaoSaiComPecaECampanha(mutar(LIMPO, 'primary key (product_id, campaign_id)', 'primary key (product_id, campaign_id, percent)'))).toBe(false)
  })
})

describe('a campanha na linha do pedido', () => {
  it('`order_items.campaign_id` é `restrict`, e é a ÚNICA coluna nova do pedido aqui', () => {
    expect(pedidoRestrict(LIMPO)).toBe(true)
    expect(pedidoRestrict(mutar(LIMPO, 'references public.campaigns (id) on delete restrict;', 'references public.campaigns (id) on delete set null;'))).toBe(false)
    expect(colunasNovasDoPedido(LIMPO)).toEqual(['campaign_id'])
  })
})

describe('a view de uso', () => {
  it('é `security_invoker` e conta as peças por campanha e percentual', () => {
    const corpo = viewDeUso(LIMPO)!
    expect(corpo).toMatch(/count\(pc\.product_id\)::integer as products/i)
    expect(corpo).toMatch(/left join public\.product_campaigns pc/i)
    expect(viewDeUso(mutar(LIMPO, 'with (security_invoker = true)', ''))).toBeNull()
  })
})

describe('a gravação da campanha', () => {
  it('é `security invoker` com `search_path` vazio, e recusa quem não é admin antes de gravar', () => {
    const corpo = gravacao(LIMPO)!
    expect(corpo).toMatch(/security invoker\s+set search_path = ''/i)
    expect(corpo).not.toMatch(/security definer/i)
    expect(corpo.search(/has_role\(auth\.uid\(\), 'admin'\)/i)).toBeLessThan(corpo.search(/insert into public\.campaigns/i))
    expect(gravacao(mutar(LIMPO, /(create or replace function public\.save_campaign[\s\S]*?)security invoker/i, '$1security definer'))).toMatch(/security definer/i)
  })

  it('tira os percentuais ANTES de acrescentar (trocar não esbarra no teto)', () => {
    const corpo = gravacao(LIMPO)!
    expect(corpo.search(/delete from public\.campaign_percents/i)).toBeGreaterThan(-1)
    expect(corpo.search(/delete from public\.campaign_percents/i)).toBeLessThan(corpo.search(/insert into public\.campaign_percents/i))
  })

  it('o `execute` sai do anon e do `public`, e entra só para `authenticated`', () => {
    expect(LIMPO).toContain(`revoke all on function ${ASSINATURA} from public;`)
    expect(LIMPO).toContain(`revoke all on function ${ASSINATURA} from anon;`)
    expect(LIMPO).toContain(`grant execute on function ${ASSINATURA} to authenticated;`)
  })
})

describe('RLS — a loja lê só a campanha em vigência, só o admin grava', () => {
  it.each(TABELAS)('%s tem RLS ligada', tabela => {
    expect(comRls(LIMPO, tabela)).toBe(true)
    expect(comRls(mutar(LIMPO, new RegExp(`alter table public\\.${tabela}\\s+enable row level security;`), ''), tabela)).toBe(false)
  })

  it('a leitura pública da campanha é a vigência: ligada, início inclusivo, fim exclusivo', () => {
    expect(leituraPublica(LIMPO, 'campaigns')).toBe('active and starts_at <= now() and now() < ends_at')
    expect(leituraPublica(mutar(LIMPO, 'to anon, authenticated\n\tusing (active and', 'to authenticated\n\tusing (active and'), 'campaigns')).toBeNull()
  })

  it('as filhas perguntam pela campanha visível; a marcação exige a peça ativa', () => {
    expect(leituraPublica(LIMPO, 'campaign_percents')).toBe('exists (select 1 from public.campaigns c where c.id = campaign_id)')
    expect(leituraPublica(LIMPO, 'product_campaigns')).toBe(
      'exists (select 1 from public.campaigns c where c.id = campaign_id) and exists (select 1 from public.products p where p.id = product_id and p.is_active)',
    )
    expect(
      leituraPublica(mutar(LIMPO, ' and p.is_active', ''), 'product_campaigns'),
    ).not.toMatch(/is_active/)
  })

  it.each(TABELAS)('%s: a escrita é de admin, no `using` E no `with check`', tabela => {
    expect(escritaSoDeAdmin(LIMPO, tabela)).toBe(true)
    const comando = policies(LIMPO, tabela).find(p => !/for select/i.test(p))!
    // A mutação carrega o nome da tabela: os corpos das três policies de escrita são idênticos.
    const alvo = `on public.${tabela}${comando}`
    // A meia-correção: sem o `with check`, um não-admin autenticado INSERE livremente.
    expect(escritaSoDeAdmin(mutar(LIMPO, alvo, alvo.replace(/\s*with check[\s\S]*$/i, '')), tabela)).toBe(false)
    expect(escritaSoDeAdmin(mutar(LIMPO, alvo, alvo.replace('to authenticated', 'to public')), tabela)).toBe(false)
    expect(escritaSoDeAdmin(mutar(LIMPO, alvo, alvo.replace(/using \(\(select[^\n]*/, 'using (true)')), tabela)).toBe(false)
    expect(escritaSoDeAdmin(`${LIMPO}\ncreate policy "x" on public.${tabela} for insert to anon with check (true);`, tabela)).toBe(false)
  })

  it('nenhum `grant` alcança o anon', () => {
    expect(grantAAnon(LIMPO)).toBe(false)
    expect(grantAAnon(`${LIMPO}\ngrant insert on public.campaigns to anon;`)).toBe(true)
  })
})

describe('a migration não escreve dado', () => {
  it('sem insert, update ou delete fora dos corpos de função', () => {
    expect(escreveDado(LIMPO)).toBe(false)
    expect(escreveDado(`${LIMPO}\ninsert into public.campaigns (name) values ('x');`)).toBe(true)
    expect(escreveDado(`${LIMPO}\nupdate public.products set base_price = 1;`)).toBe(true)
  })
})
