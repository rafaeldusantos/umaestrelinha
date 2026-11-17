import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isCampaignLive } from '@estrelinha/core/campaigns'

/**
 * A vigência da campanha tem DUAS escritas, e as duas precisam existir:
 *
 * - a **policy pública** de `campaigns` (SQL) é o que decide o que a loja recebe — a agendada e a
 *   desligada nunca chegam ao navegador;
 * - **`isCampaignLive`** (`core/campaigns/live.ts`) é quem responde a mesma pergunta para o painel,
 *   as functions e o feed, com o relógio de quem chama.
 *
 * Desde as views da vigência (`live_campaigns` e `live_product_campaigns`, que a loja lê para não
 * receber, com sessão de admin, as campanhas que a policy de admin entrega), há uma TERCEIRA escrita:
 * o filtro de `live_campaigns`. A view das marcações não o repete — pergunta à das campanhas —, e
 * este arquivo confere as duas coisas.
 *
 * Duas cópias da mesma regra é o "defeito 01", e a contrapartida obrigatória é este arquivo (molde
 * de `materialTransitions.test.ts`): ele **lê a policy do disco**, interpreta o predicado dela e
 * confere que as duas respondem IGUAL nas bordas — o instante do início (inclusivo), o do fim
 * (exclusivo), um milissegundo antes e depois de cada um, e a campanha desligada.
 *
 * O intérprete só conhece o vocabulário da vigência (`active`, `starts_at`, `ends_at`, `now()` e os
 * quatro comparadores). Qualquer outro termo LANÇA: um predicado que ele não entende reprova, em vez
 * de ser lido como "sempre verdadeiro".
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O caminho por extenso: a régua nunca é o objeto medido. */
const MIGRATION = join(ROOT, 'supabase/migrations/20261130120000_102-campanhas.sql')
const SQL = readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')
const MIGRATION_VIGENCIA = join(ROOT, 'supabase/migrations/20261130160000_103-campanha-vigente.sql')
const SQL_VIGENCIA = readFileSync(MIGRATION_VIGENCIA, 'utf8').replace(/\r\n/g, '\n').replace(/--[^\n]*/g, '')

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 60)}…`)
  return mutante
}

/** O `using` da policy pública de `campaigns`, ou `null`. */
const predicadoDaPolicy = (sql: string): string | null => {
  const m = sql.match(/create policy "campaigns_public_read" on public\.campaigns\s+for select[\s\S]*?using \(([\s\S]*?)\);/i)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

/** O `where` da view `live_campaigns`, ou `null`. */
const predicadoDaView = (sql: string): string | null => {
  const m = sql.match(/create or replace view public\.live_campaigns\b[\s\S]*?from public\.campaigns\s+where ([\s\S]*?);/i)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

/** O `where` da view `live_product_campaigns`, ou `null`. */
const filtroDasMarcacoes = (sql: string): string | null => {
  const m = sql.match(/create or replace view public\.live_product_campaigns\b[\s\S]*?from public\.product_campaigns pc\s+where ([\s\S]*?);/i)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

interface Linha {
  active: boolean
  starts_at: number
  ends_at: number
}

type Avaliador = (linha: Linha, agora: number) => boolean

const termo = (t: string, linha: Linha, agora: number): number => {
  if (t === 'now()') return agora
  if (t === 'starts_at') return linha.starts_at
  if (t === 'ends_at') return linha.ends_at
  throw new Error(`termo desconhecido na vigência: ${t}`)
}

const COMPARA: Record<string, (a: number, b: number) => boolean> = {
  '<=': (a, b) => a <= b,
  '<': (a, b) => a < b,
  '>=': (a, b) => a >= b,
  '>': (a, b) => a > b,
}

/** O predicado SQL como função. Só `and` entre condições; termo fora do vocabulário lança. */
const interpretar = (predicado: string): Avaliador => {
  const condicoes = predicado.split(/\s+and\s+/i).map(c => c.trim())
  const testes: Avaliador[] = condicoes.map(c => {
    if (/^active( = true)?$/i.test(c)) return linha => linha.active
    const m = c.match(/^(now\(\)|starts_at|ends_at)\s*(<=|<|>=|>)\s*(now\(\)|starts_at|ends_at)$/i)
    if (!m) throw new Error(`condição desconhecida na vigência: ${c}`)
    const [, a, op, b] = m
    return (linha, agora) => COMPARA[op](termo(a, linha, agora), termo(b, linha, agora))
  })
  return (linha, agora) => testes.every(t => t(linha, agora))
}

const INICIO = Date.parse('2026-11-13T03:00:00.000Z')
const FIM = Date.parse('2026-12-01T03:00:00.000Z')

/** As bordas: os dois instantes, um milissegundo de cada lado, o meio e longe. */
const INSTANTES = [INICIO - 86_400_000, INICIO - 1, INICIO, INICIO + 1, (INICIO + FIM) / 2, FIM - 1, FIM, FIM + 1, FIM + 86_400_000]

const divergencias = (avaliar: Avaliador): string[] => {
  const saida: string[] = []
  for (const active of [true, false]) {
    const linha = { active, starts_at: INICIO, ends_at: FIM }
    const campanha = {
      active,
      starts_at: new Date(INICIO).toISOString(),
      ends_at: new Date(FIM).toISOString(),
    }
    for (const agora of INSTANTES) {
      const sql = avaliar(linha, agora)
      const ts = isCampaignLive(campanha, agora)
      if (sql !== ts) saida.push(`${active ? 'ligada' : 'desligada'} @ ${new Date(agora).toISOString()}: SQL ${sql} × TS ${ts}`)
    }
  }
  return saida
}

describe('a vigência da campanha — a policy pública e `isCampaignLive` respondem igual', () => {
  it('âncora: a policy foi encontrada e o predicado tem as três condições', () => {
    const predicado = predicadoDaPolicy(SQL)
    expect(predicado).not.toBeNull()
    expect(predicado!.split(/\s+and\s+/i)).toHaveLength(3)
  })

  it('nas bordas, a policy e `core` dão a mesma resposta (18 casos)', () => {
    expect(divergencias(interpretar(predicadoDaPolicy(SQL)!))).toEqual([])
  })

  it('sensor — o fim INCLUSIVO na policy diverge no instante do fim', () => {
    const mutante = mutar(SQL, 'now() < ends_at', 'now() <= ends_at')
    expect(divergencias(interpretar(predicadoDaPolicy(mutante)!))).toEqual([
      'ligada @ 2026-12-01T03:00:00.000Z: SQL true × TS false',
    ])
  })

  it('sensor — o início EXCLUSIVO na policy diverge no instante do início', () => {
    const mutante = mutar(SQL, 'starts_at <= now()', 'starts_at < now()')
    expect(divergencias(interpretar(predicadoDaPolicy(mutante)!))).toEqual([
      'ligada @ 2026-11-13T03:00:00.000Z: SQL false × TS true',
    ])
  })

  it('sensor — a policy sem `active` diverge na desligada', () => {
    const mutante = mutar(SQL, 'using (active and ', 'using (')
    expect(divergencias(interpretar(predicadoDaPolicy(mutante)!)).length).toBeGreaterThan(0)
  })

  it('sensor — a forma invertida e equivalente (`ends_at > now()`) passa', () => {
    const mutante = mutar(SQL, 'now() < ends_at', 'ends_at > now()')
    expect(divergencias(interpretar(predicadoDaPolicy(mutante)!))).toEqual([])
  })

  it('sensor — um termo fora do vocabulário LANÇA, em vez de ser lido como verdadeiro', () => {
    const mutante = mutar(SQL, 'now() < ends_at', 'coalesce(ends_at, now()) > now()')
    expect(() => interpretar(predicadoDaPolicy(mutante)!)).toThrow(/condição desconhecida/)
  })
})

describe('a vigência da campanha — a view que a loja lê responde igual à policy e a `core`', () => {
  it('âncora: o filtro da view foi encontrado e tem as três condições', () => {
    const predicado = predicadoDaView(SQL_VIGENCIA)
    expect(predicado).not.toBeNull()
    expect(predicado!.split(/\s+and\s+/i)).toHaveLength(3)
  })

  it('nas bordas, a view e `core` dão a mesma resposta (18 casos)', () => {
    expect(divergencias(interpretar(predicadoDaView(SQL_VIGENCIA)!))).toEqual([])
  })

  it('o filtro da view é, termo a termo, o `using` da policy pública', () => {
    expect(predicadoDaView(SQL_VIGENCIA)).toBe(predicadoDaPolicy(SQL))
  })

  it('a view das marcações não reescreve a vigência: pergunta à view das campanhas', () => {
    expect(filtroDasMarcacoes(SQL_VIGENCIA)).toBe('exists (select 1 from public.live_campaigns lc where lc.id = pc.campaign_id)')
  })

  it('sensor — o fim INCLUSIVO na view diverge no instante do fim', () => {
    const mutante = mutar(SQL_VIGENCIA, 'now() < ends_at', 'now() <= ends_at')
    expect(divergencias(interpretar(predicadoDaView(mutante)!))).toEqual([
      'ligada @ 2026-12-01T03:00:00.000Z: SQL true × TS false',
    ])
  })

  it('sensor — a view sem `active` diverge na desligada', () => {
    const mutante = mutar(SQL_VIGENCIA, 'where active and ', 'where ')
    expect(divergencias(interpretar(predicadoDaView(mutante)!)).length).toBeGreaterThan(0)
  })

  it('sensor — a view das marcações lendo a tabela crua de campanhas é acusada', () => {
    const mutante = mutar(SQL_VIGENCIA, 'from public.live_campaigns lc', 'from public.campaigns lc')
    expect(filtroDasMarcacoes(mutante)).not.toBe(filtroDasMarcacoes(SQL_VIGENCIA))
  })
})
