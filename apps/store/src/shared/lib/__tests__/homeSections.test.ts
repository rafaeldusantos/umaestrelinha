import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HOME_SECTION_TYPES,
  UNIQUE_SECTION_TYPES,
  DEFAULT_HOME_COMPOSITION,
  type HomeSectionType,
} from '@estrelinha/core/home'

/**
 * `HOME-06` — o guarda entre o catálogo de tipos escrito em **TypeScript** e o que a migration
 * aceita, mais tudo o mais que a Home só descobriria em produção.
 *
 * A composição da Home tem a mesma propriedade ruim da identidade visual: **errar nela não quebra
 * nada.** Um tipo a mais no TypeScript sem o `check` correspondente grava e falha só na tela da
 * dona; um texto da semente que envelheceu muda a Home no dia da virada e nenhum build acusa; uma
 * policy de escrita sem `has_role` abre a vitrine para qualquer pessoa autenticada e a suíte inteira
 * continua verde. Por isso este arquivo **lê a migration do disco** e compara com o core.
 *
 * A falha que este teste precisa evitar em si mesmo é a pior de todas: um caminho errado varre zero,
 * os dois conjuntos ficam vazios, a comparação passa e ninguém percebe. Daí a **âncora de contagem**
 * em cada parser — e um caso sintético que prova que o parser REPROVA quando deve.
 *
 * Molde exato de `materialTransitions.test.ts`, que faz o mesmo pela máquina de estado do material.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * O caminho por extenso. A régua nunca é o objeto medido: derivar este caminho de uma constante do
 * projeto faria a varredura encolher junto com o que ela deveria guardar.
 */
const MIGRATION = join(ROOT, 'supabase/migrations/20260815120000_24-home-gerenciavel.sql')

const SQL = readFileSync(MIGRATION, 'utf8')

/** Comentário não é código. Sem tirá-los, o texto que EXPLICA a regra entraria na medição dela. */
const semComentarios = (fonte: string): string => fonte.replace(/--[^\n]*/g, '')

const LIMPO = semComentarios(SQL)

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/** Os tipos que o `check (type in (…))` aceita. */
const tiposDoCheck = (fonte: string): string[] => {
  const inicio = fonte.indexOf('add constraint home_sections_type_check')
  if (inicio === -1) return []
  const fim = fonte.indexOf(');', inicio)
  const bloco = fim === -1 ? fonte.slice(inicio) : fonte.slice(inicio, fim)
  return [...bloco.matchAll(/'([a-z_]+)'/g)].map(m => m[1])
}

/** Os tipos cobertos pelo índice único parcial. */
const tiposUnicosDoIndice = (fonte: string): string[] => {
  const inicio = fonte.indexOf('create unique index if not exists home_sections_unique_types_idx')
  if (inicio === -1) return []
  const fim = fonte.indexOf(');', inicio)
  const bloco = fim === -1 ? fonte.slice(inicio) : fonte.slice(inicio, fim)
  return [...bloco.matchAll(/'([a-z_]+)'/g)].map(m => m[1])
}

interface LinhaSemeada {
  type: string
  position: number
  active: boolean
  config: Record<string, unknown>
}

/**
 * As sete linhas da semente, como o `values` as declara:
 * `('hero', 1, true, '{"eyebrow":…}'::jsonb)`.
 *
 * O `[^']*` é seguro porque nenhum texto da composição tem apóstrofo — e se algum passar a ter, ele
 * vai precisar de escape no SQL de qualquer forma, e esta linha é onde isso aparece.
 */
const sementeDoSql = (fonte: string): LinhaSemeada[] => {
  const inicio = fonte.indexOf('insert into public.home_sections (type, position, active, config)')
  if (inicio === -1) return []
  const fim = fonte.indexOf('where not exists', inicio)
  const bloco = fim === -1 ? fonte.slice(inicio) : fonte.slice(inicio, fim)

  return [...bloco.matchAll(/\('([a-z_]+)',\s*(\d+),\s*(true|false),\s*'(\{[^']*\})'::jsonb\)/g)].map(
    m => ({
      type: m[1],
      position: Number(m[2]),
      active: m[3] === 'true',
      config: JSON.parse(m[4]) as Record<string, unknown>,
    }),
  )
}

/** Cada FK da tabela de itens: coluna → ação de `on delete`. */
const acoesDeFk = (fonte: string): Map<string, string> => {
  const inicio = fonte.indexOf('create table if not exists public.home_section_items')
  if (inicio === -1) return new Map()
  const fim = fonte.indexOf('comment on table public.home_section_items', inicio)
  const corpo = fim === -1 ? fonte.slice(inicio) : fonte.slice(inicio, fim)

  const mapa = new Map<string, string>()
  const re = /(\w+)\s+uuid\s+(?:not null\s+)?references\s+public\.(\w+)\s*\(id\)\s*on delete\s+(set null|cascade|restrict|no action)/g
  for (const m of corpo.matchAll(re)) mapa.set(m[1], m[3])
  return mapa
}

interface Policy {
  nome: string
  tabela: string
  acao: string
  corpo: string
}

/** As policies criadas sobre as duas tabelas da Home. */
const policiesDaHome = (fonte: string): Policy[] => {
  const re =
    /create policy "([^"]+)" on (public\.home_section\w*)\s*\n?\s*for (all|select|insert|update|delete)([\s\S]*?);/g
  return [...fonte.matchAll(re)].map(m => ({
    nome: m[1],
    tabela: m[2],
    acao: m[3],
    corpo: m[4],
  }))
}

const TIPOS_DO_CHECK = tiposDoCheck(LIMPO)
const TIPOS_UNICOS_DO_INDICE = tiposUnicosDoIndice(LIMPO)
const SEMENTE = sementeDoSql(LIMPO)
const FKS = acoesDeFk(LIMPO)
const POLICIES = policiesDaHome(LIMPO)

// ---------------------------------------------------------------------------
// Âncoras — sem elas, um caminho errado varre zero e passa em silêncio
// ---------------------------------------------------------------------------

describe('âncora da leitura da migration da Home', () => {
  it('leu a migration de verdade: tem as duas tabelas', () => {
    expect(SQL.length).toBeGreaterThan(1000)
    expect(SQL).toContain('create table if not exists public.home_sections')
    expect(SQL).toContain('create table if not exists public.home_section_items')
  })

  it('extraiu os 10 tipos do `check`, e não uma lista vazia', () => {
    expect(TIPOS_DO_CHECK).toHaveLength(10)
  })

  it('extraiu os 6 tipos do índice único parcial', () => {
    expect(TIPOS_UNICOS_DO_INDICE).toHaveLength(6)
  })

  it('extraiu as 7 linhas da semente', () => {
    expect(SEMENTE).toHaveLength(7)
  })

  it('extraiu as 3 FK da tabela de itens', () => {
    expect([...FKS.keys()].sort()).toEqual(['category_id', 'product_id', 'section_id'])
  })

  it('extraiu as 4 policies das duas tabelas da Home', () => {
    // 2 de leitura pública (uma por tabela) + 2 de escrita de admin (uma por tabela).
    expect(POLICIES).toHaveLength(4)
  })

  it('os parsers REPROVAM um SQL divergente — a prova de que eles pegam', () => {
    const checkSintetico = `
      add constraint home_sections_type_check
      check (type in ('hero', 'drop_countdown'));
    `
    expect(tiposDoCheck(checkSintetico)).toEqual(['hero', 'drop_countdown'])

    const sementeSintetica = `
      insert into public.home_sections (type, position, active, config)
      select s.tipo, s.pos, s.ligada, s.conf
      from (values
        ('hero', 1, false, '{"eyebrow":"outro texto"}'::jsonb)
      ) as s(tipo, pos, ligada, conf)
      where not exists (select 1 from public.home_sections);
    `
    expect(sementeDoSql(sementeSintetica)).toEqual([
      { type: 'hero', position: 1, active: false, config: { eyebrow: 'outro texto' } },
    ])

    const fkSintetica = `
      create table if not exists public.home_section_items (
        category_id uuid references public.categories (id) on delete cascade,
      );
      comment on table public.home_section_items is 'x';
    `
    expect(acoesDeFk(fkSintetica).get('category_id')).toBe('cascade')

    const policySintetica = `
      create policy "sem guarda" on public.home_sections
        for all to authenticated
        using (true);
    `
    expect(policiesDaHome(policySintetica)).toHaveLength(1)
    expect(policiesDaHome(policySintetica)[0].corpo).not.toContain('has_role')
  })
})

// ---------------------------------------------------------------------------
// HOME-06 — o catálogo em TypeScript × o `check` da migration
// ---------------------------------------------------------------------------

describe('catálogo de tipos: TypeScript × migration (HOME-06)', () => {
  it('os dois conjuntos são exatamente iguais', () => {
    expect([...TIPOS_DO_CHECK].sort()).toEqual([...HOME_SECTION_TYPES].sort())
  })

  it.each(HOME_SECTION_TYPES)('o tipo `%s` do core está no `check` da migration', tipo => {
    expect(TIPOS_DO_CHECK).toContain(tipo)
  })

  it.each(['hero', 'trust_bar', 'banner_grid', 'collection_rows', 'brand_statement', 'trending_tags', 'newsletter', 'collection_feature', 'product_carousel', 'category_grid'])(
    'o tipo `%s` do `check` existe em HOME_SECTION_TYPES',
    tipo => {
      expect(HOME_SECTION_TYPES).toContain(tipo as HomeSectionType)
    },
  )

  it('o índice único parcial cobre exatamente UNIQUE_SECTION_TYPES', () => {
    // O painel esconder o bloco é UX; o índice é o que faz a regra valer contra escrita direta.
    // Divergir aqui deixaria a Home aceitar duas newsletters por um `POST` avulso.
    expect([...TIPOS_UNICOS_DO_INDICE].sort()).toEqual([...UNIQUE_SECTION_TYPES].sort())
  })

  it('NÃO existe tipo de contagem regressiva nem de prova social', () => {
    // `DropCountdown` e `SocialProof` saíram na feature 20 por decisão ética — depoimento inventado
    // sobre a morte de alguém tem peso diferente de depoimento inventado sobre um acessório. Um
    // catálogo genérico de blocos os traz de volta pela porta do painel, e a AUSÊNCIA é a regra.
    const proibidos =
      /countdown|contagem|regressiv|drop_|social_proof|prova_social|depoiment|testimonial|review|avaliac/i

    for (const tipo of TIPOS_DO_CHECK) {
      expect(tipo, `o \`check\` da migration aceita \`${tipo}\``).not.toMatch(proibidos)
    }
    for (const tipo of HOME_SECTION_TYPES) {
      expect(tipo, `o catálogo do core traz \`${tipo}\``).not.toMatch(proibidos)
    }
  })
})

// ---------------------------------------------------------------------------
// HOME-04 — a semente × DEFAULT_HOME_COMPOSITION
// ---------------------------------------------------------------------------

describe('semente da migration × DEFAULT_HOME_COMPOSITION (HOME-04)', () => {
  it('semeia a mesma quantidade de seções que a composição de hoje', () => {
    expect(SEMENTE).toHaveLength(DEFAULT_HOME_COMPOSITION.length)
  })

  it('a sequência de tipos é a da Home de hoje', () => {
    expect(SEMENTE.map(l => l.type)).toEqual(DEFAULT_HOME_COMPOSITION.map(s => s.type))
  })

  it.each(DEFAULT_HOME_COMPOSITION.map((s, i) => [s.type, i] as const))(
    'a seção `%s` tem posição, estado e config idênticos aos do core',
    (tipo, i) => {
      const doSql = SEMENTE[i]
      const doCore = DEFAULT_HOME_COMPOSITION[i]

      expect(doSql.type, `tipo divergente na posição ${i + 1}`).toBe(tipo)
      expect(doSql.position, `position divergente em ${tipo}`).toBe(doCore.position)
      expect(doSql.active, `active divergente em ${tipo}`).toBe(doCore.active)
      // Chave a chave: um texto que envelheceu de um lado muda a Home no dia da virada, e é
      // exatamente o risco nº 1 desta feature.
      expect(doSql.config, `config divergente em ${tipo}`).toEqual(doCore.config)
    },
  )

  it('a faixa institucional entra DENTRO das fileiras, depois da primeira', () => {
    const faixa = SEMENTE.find(l => l.type === 'brand_statement')
    expect(faixa?.config.interlude_after).toBe(0)
  })

  it('a semente é reexecutável — não duplica nem desfaz curadoria', () => {
    // Sem esta condição, rodar a migration de novo criaria sete seções paralelas, e a Home passaria
    // a ter dois heros (o índice único recusaria, e a migration inteira falharia).
    expect(LIMPO).toContain('where not exists (select 1 from public.home_sections)')
  })
})

// ---------------------------------------------------------------------------
// HOME-05 — RLS
// ---------------------------------------------------------------------------

describe('RLS das seções da Home (HOME-05)', () => {
  it('as duas tabelas habilitam row level security', () => {
    // Obrigatório, e não zelo: `public_schema_grants` concede `all on all tables` a anon e repete o
    // default privilege para toda tabela nova. Tabela sem RLS nasce escancarada.
    expect(LIMPO).toContain('alter table public.home_sections      enable row level security;')
    expect(LIMPO).toContain('alter table public.home_section_items enable row level security;')
  })

  it('a leitura pública das seções devolve só `active = true`', () => {
    const leitura = POLICIES.find(p => p.tabela === 'public.home_sections' && p.acao === 'select')
    expect(leitura).toBeDefined()
    expect(leitura?.corpo.replace(/\s+/g, ' ')).toContain('using (active = true)')
  })

  it('o item segue o estado da seção-mãe', () => {
    const leitura = POLICIES.find(
      p => p.tabela === 'public.home_section_items' && p.acao === 'select',
    )
    expect(leitura).toBeDefined()
    const corpo = leitura?.corpo.replace(/\s+/g, ' ') ?? ''
    expect(corpo).toContain('from public.home_sections s')
    expect(corpo).toContain('s.active = true')
  })

  it('TODA policy de escrita exige `has_role`, no `using` E no `with check`', () => {
    const escrita = POLICIES.filter(p => p.acao !== 'select')
    // Âncora: uma tabela sem policy de escrita passaria vacuamente no `for` abaixo.
    expect(escrita).toHaveLength(2)

    for (const policy of escrita) {
      const corpo = policy.corpo.replace(/\s+/g, ' ')
      expect(corpo, `${policy.nome} não guarda o \`using\``).toContain(
        "using (public.has_role(auth.uid(), 'admin'))",
      )
      expect(corpo, `${policy.nome} não guarda o \`with check\``).toContain(
        "with check (public.has_role(auth.uid(), 'admin'))",
      )
    }
  })

  it('nenhuma policy de escrita alcança `anon`', () => {
    for (const policy of POLICIES.filter(p => p.acao !== 'select')) {
      expect(policy.corpo, `${policy.nome} alcança anon`).not.toContain('anon')
      expect(policy.corpo, `${policy.nome} não é restrita a authenticated`).toContain(
        'to authenticated',
      )
    }
  })

  it('a migration não concede NADA a `anon`', () => {
    // Um `grant` avulso a anon aqui desfaria a RLS acima sem tocar em policy nenhuma.
    expect(LIMPO).not.toMatch(/grant[\s\S]{0,120}?\banon\b/i)
  })
})

// ---------------------------------------------------------------------------
// HOME-24 / HOME-30 — as FK, e a ação de cada uma
// ---------------------------------------------------------------------------

describe('FK dos itens: cascade só na seção (HOME-24, HOME-30)', () => {
  it('`section_id` é `on delete cascade` — a linha não tem sentido sem a seção', () => {
    expect(FKS.get('section_id')).toBe('cascade')
  })

  it.each(['category_id', 'product_id'])('`%s` é `on delete set null`, NUNCA cascade', coluna => {
    // Com cascade, apagar uma coleção apagaria a linha do banner e a ARTE que a dona subiu iria
    // junto. HOME-24/HOME-34 pedem o contrário: o painel tem de dizer QUAL destino se perdeu, o que
    // exige a linha continuar existindo.
    expect(FKS.get(coluna)).toBe('set null')
  })

  it('o CHECK de destino é `<= 1`, e não `= 1`', () => {
    // `= 1` faria a EXCLUSÃO DA CATEGORIA falhar: o próprio `set null` produz a linha com zero
    // destinos, e o CHECK recusaria o UPDATE que o Postgres emite ali.
    expect(LIMPO).toContain('check (num_nonnulls(category_id, product_id, href) <= 1)')
    expect(LIMPO).not.toContain('check (num_nonnulls(category_id, product_id, href) = 1)')
  })

  it('`label_snapshot` existe — é o que deixa o painel NOMEAR o destino perdido', () => {
    expect(LIMPO).toContain('label_snapshot text')
  })
})

// ---------------------------------------------------------------------------
// HOME-08 — o hero indelével
// ---------------------------------------------------------------------------

describe('o hero não desliga nem some (HOME-08)', () => {
  it('a função de guarda existe e cobre os dois caminhos', () => {
    const inicio = LIMPO.indexOf('create or replace function public.guard_hero_home_section')
    expect(inicio).toBeGreaterThan(-1)
    const corpo = LIMPO.slice(inicio, LIMPO.indexOf('$$;', inicio))

    expect(corpo).toContain("tg_op = 'DELETE'")
    expect(corpo).toContain("old.type = 'hero'")
    expect(corpo).toContain('new.active = false')
    // Duas recusas, não uma: apagar e desligar são caminhos diferentes.
    expect([...corpo.matchAll(/raise exception/g)]).toHaveLength(2)
  })

  it('o trigger está ligado, antes de update E de delete', () => {
    expect(LIMPO.replace(/\s+/g, ' ')).toContain(
      'create trigger trg_home_sections_hero_guard before update or delete on public.home_sections',
    )
  })
})
