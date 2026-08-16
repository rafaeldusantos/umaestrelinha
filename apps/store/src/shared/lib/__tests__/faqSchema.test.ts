import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FAQ_ANSWER_MAX, FAQ_QUESTION_MAX } from '@estrelinha/core/faq'

/**
 * `FAQ-10`, `FAQ-12`, `FAQ-13` — o guarda entre o schema em **SQL** e o que o TypeScript afirma.
 *
 * Vale aqui a mesma propriedade ruim que obrigou `homeSections.test.ts` e `materialTransitions.test.ts`
 * a existirem: **errar nisto não quebra nada.** Uma policy de escrita sem `has_role` abre a
 * biblioteca inteira para qualquer pessoa autenticada e a suíte segue verde; o `on delete restrict`
 * virar `cascade` só se descobre no dia em que uma entrada apagada some de 453 páginas de produto;
 * `FAQ_ANSWER_MAX` divergir do `check` faz a tela aceitar um texto que o banco recusa, e a dona
 * descobre no save.
 *
 * A falha que este arquivo precisa evitar **em si mesmo** é um caminho errado varrendo zero e
 * passando em silêncio. Daí a **âncora dupla**: o arquivo é encontrado (tamanho mínimo) **e** o
 * número de policies, checks e views encontrados é asserido.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * O caminho por extenso, de propósito. A régua nunca é o objeto medido — derivá-lo de uma constante
 * do projeto faria a varredura encolher junto com o que ela deveria guardar.
 */
const MIGRATION = join(ROOT, 'supabase/migrations/20260816120000_28-perguntas-frequentes.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/** Comentário não é código: sem tirá-los, o texto que EXPLICA a regra entraria na medição dela. */
const LIMPO = SQL.replace(/--[^\n]*/g, '')

const ocorrencias = (re: RegExp): string[] => [...LIMPO.matchAll(re)].map(m => m[0])

// ---------------------------------------------------------------------------
// Âncora — sem ela, todo o resto pode passar sobre nada
// ---------------------------------------------------------------------------

describe('a migration está onde este teste procura', () => {
  it('o arquivo existe e tem corpo', () => {
    expect(SQL.length).toBeGreaterThan(3000)
    expect(LIMPO.length).toBeGreaterThan(1200)
  })

  it('cria as duas tabelas, os dois índices e as duas views', () => {
    expect(ocorrencias(/create table if not exists public\.\w+/g)).toEqual([
      'create table if not exists public.faqs',
      'create table if not exists public.product_faqs',
    ])
    expect(ocorrencias(/create (unique )?index if not exists \w+/g)).toHaveLength(2)
    expect(ocorrencias(/create or replace view public\.\w+/g)).toEqual([
      'create or replace view public.faq_usage',
      'create or replace view public.faq_category_usage',
    ])
  })

  it('declara exatamente 4 policies e 3 checks', () => {
    expect(ocorrencias(/create policy "[^"]+"/g)).toHaveLength(4)
    // `\s+` e não ` ` — o SQL alinha o `check` em coluna, e duas das três constraints têm mais de um
    // espaço (uma tem quebra de linha). Um parser exigindo espaço único acharia 1 de 3 e a âncora
    // reprovaria por motivo errado.
    expect(ocorrencias(/constraint \w+\s+check/g)).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Limites — o par TypeScript ⇄ SQL
// ---------------------------------------------------------------------------

/** Os dois números de um `check (… between A and B)` daquela constraint. */
const faixaDoCheck = (constraint: string): [number, number] | null => {
  const inicio = LIMPO.indexOf(`constraint ${constraint}`)
  if (inicio === -1) return null
  const bloco = LIMPO.slice(inicio, inicio + 240)
  // Exigir a palavra `check` no bloco impede que um `between` de outra declaração seja lido como se
  // fosse desta constraint.
  if (!bloco.includes('check')) return null
  const match = bloco.match(/between\s+(\d+)\s+and\s+(\d+)/)
  return match ? [Number(match[1]), Number(match[2])] : null
}

describe('os limites do TypeScript são os do banco', () => {
  it('a pergunta é 1..FAQ_QUESTION_MAX nos dois lados', () => {
    expect(faixaDoCheck('faqs_question_len')).toEqual([1, FAQ_QUESTION_MAX])
  })

  it('a resposta é 1..FAQ_ANSWER_MAX nos dois lados', () => {
    expect(faixaDoCheck('faqs_answer_len')).toEqual([1, FAQ_ANSWER_MAX])
  })

  it('a resposta própria do vínculo tem o mesmo teto da resposta padrão', () => {
    expect(faixaDoCheck('product_faqs_override_len')).toEqual([1, FAQ_ANSWER_MAX])
  })

  // Se o parser não achasse a constraint devolveria `null`, e `null !== [1, 160]` reprovaria — mas a
  // asserção abaixo prova que ele REPROVA quando deve, em vez de só não achar.
  it('o parser reprova uma constraint que não existe', () => {
    expect(faixaDoCheck('constraint_que_nao_existe')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// As FKs — as duas são diferentes de propósito
// ---------------------------------------------------------------------------

describe('as chaves estrangeiras', () => {
  it('`product_id` é `on delete cascade` — vínculo sem produto não significa nada', () => {
    expect(LIMPO).toMatch(/product_id\s+uuid not null references public\.products\(id\) on delete cascade/)
  })

  // A regra que impede uma entrada apagada de sumir de até 453 páginas em silêncio.
  it('`faq_id` é `on delete restrict`, e NUNCA cascade', () => {
    expect(LIMPO).toMatch(/faq_id\s+uuid not null references public\.faqs\(id\) on delete restrict/)
    expect(LIMPO).not.toMatch(/references public\.faqs\(id\) on delete cascade/)
  })

  it('a PK do vínculo é composta, o que impede a mesma pergunta duas vezes no produto', () => {
    expect(LIMPO).toMatch(/primary key \(product_id, faq_id\)/)
  })
})

// ---------------------------------------------------------------------------
// RLS
// ---------------------------------------------------------------------------

/** O corpo de uma policy, do `create policy` até o `;`. */
const corpoDaPolicy = (nome: string): string => {
  const inicio = LIMPO.indexOf(`create policy "${nome}"`)
  if (inicio === -1) return ''
  const fim = LIMPO.indexOf(';', inicio)
  return fim === -1 ? LIMPO.slice(inicio) : LIMPO.slice(inicio, fim)
}

describe('RLS', () => {
  it('as duas tabelas ligam row level security', () => {
    expect(LIMPO).toMatch(/alter table public\.faqs\s+enable row level security/)
    expect(LIMPO).toMatch(/alter table public\.product_faqs enable row level security/)
  })

  it('a leitura pública de `faqs` é só da entrada ativa', () => {
    const policy = corpoDaPolicy('public read active faqs')
    expect(policy).toContain('for select to public')
    expect(policy).toMatch(/using \(is_active = true\)/)
  })

  // Deliberado: é o que faz o vínculo órfão chegar ao navegador com `faq: null`, exercitando o ramo
  // de "pular a vaga" de `resolveProductFaqs` em produção.
  it('a leitura pública de `product_faqs` é sem condição, e a decisão está documentada', () => {
    expect(corpoDaPolicy('public read product faqs')).toMatch(/using \(true\)/)
    expect(SQL).toMatch(/lido publicamente SEM CONDIÇÃO|lido SEM CONDIÇÃO/i)
  })

  it('as duas policies de escrita são `to authenticated` com `has_role` no using E no with check', () => {
    for (const nome of ['admin full faqs', 'admin full product faqs']) {
      const policy = corpoDaPolicy(nome)
      expect(policy).toContain('for all to authenticated')
      expect(policy).toMatch(/using \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/)
      expect(policy).toMatch(/with check \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/)
    }
  })

  it('nenhuma policy de escrita alcança `anon`', () => {
    for (const nome of ['admin full faqs', 'admin full product faqs']) {
      expect(corpoDaPolicy(nome)).not.toContain('anon')
    }
  })

  it('a migration não emite `grant` nenhum', () => {
    expect(LIMPO).not.toMatch(/\bgrant\b/i)
  })
})

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

describe('as views', () => {
  it('as duas são `security_invoker`, como `category_product_counts`', () => {
    expect(ocorrencias(/with \(security_invoker = true\)/g)).toHaveLength(2)
  })

  it('`faq_category_usage` divide `uses` por `sample`, e não conta bruto', () => {
    const inicio = LIMPO.indexOf('create or replace view public.faq_category_usage')
    const bloco = LIMPO.slice(inicio)

    expect(bloco).toContain('as uses')
    expect(bloco).toContain('as sample')
    // `sample` é por CATEGORIA, e igual para todas as linhas dela — senão o ranking compararia
    // frações de bases diferentes.
    expect(bloco).toMatch(/join sizes s on s\.category_id = pc\.category_id/)
  })

  it('`faq_usage` conta por `left join`, para entrada sem uso aparecer com zero', () => {
    const inicio = LIMPO.indexOf('create or replace view public.faq_usage')
    const bloco = LIMPO.slice(inicio, LIMPO.indexOf(';', inicio))

    expect(bloco).toMatch(/left join public\.product_faqs/)
    expect(bloco).toContain('as products')
  })
})
