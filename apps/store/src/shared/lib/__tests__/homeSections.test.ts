import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CAMPAIGN_OFFERS_CAMPAIGN_INDEX,
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

/**
 * A migration da feature 41 — e ela é lida **por inteiro**, não como um apêndice da 24.
 *
 * Duas coisas mudaram de arquivo e por isso mudam de fonte aqui:
 *
 * - **o `check (type in …)` vigente**, que a 41 recria com `hero_carousel`. Continuar medindo o da 24
 *   faria este guarda comparar o catálogo do TypeScript com uma constraint que o banco já não tem —
 *   o pior tipo de teste verde;
 * - **o guarda de "a Home nunca fica sem seção ativa"**, que deixou de travar o hero (`HOME-08`) e
 *   passou a travar a última linha ativa, qualquer que seja o tipo (`AD-029`).
 *
 * `supabase db push` aplica as migrations em ordem, então **a última que define a constraint é a que
 * vale**. Migration aplicada é imutável (`AD-017` venceu em 2026-08-17): a da 24 não é editada, é
 * superada.
 */
const MIGRATION_41 = join(ROOT, 'supabase/migrations/20260906120000_41-banner-principal-da-home.sql')

const SQL_41 = readFileSync(MIGRATION_41, 'utf8')

const LIMPO_41 = semComentarios(SQL_41)

/**
 * A migration do bloco "Joias em oferta". Ela recria, pela ordem de `db push`, as DUAS
 * listas de tipos: o `check (type in …)` (com `campaign_offers`) e o índice único parcial (o tipo é
 * único na Home). As duas passam a ser medidas aqui; continuar lendo a 41 e a 24 faria este guarda
 * comparar o catálogo com listas que o banco já não tem.
 */
const MIGRATION_OFERTAS = join(ROOT, 'supabase/migrations/20261130140000_102-joias-em-oferta-na-home.sql')

const SQL_OFERTAS = readFileSync(MIGRATION_OFERTAS, 'utf8')

const LIMPO_OFERTAS = semComentarios(SQL_OFERTAS)

/**
 * A migration do bloco "Joias em oferta" por campanha. Ela recria o índice único parcial dos tipos
 * SEM `campaign_offers` (o bloco passou a ser repetível, um por campanha), cria a coluna
 * `campaign_id` e o índice único parcial por campanha. O `check` de tipos continua o da anterior.
 */
const MIGRATION_POR_CAMPANHA = join(
  ROOT,
  'supabase/migrations/20261130170000_103-joias-em-oferta-por-campanha.sql',
)

const SQL_POR_CAMPANHA = readFileSync(MIGRATION_POR_CAMPANHA, 'utf8')

const LIMPO_POR_CAMPANHA = semComentarios(SQL_POR_CAMPANHA)

/** Todas as migrations, na ordem em que o `db push` as aplica (prefixo numérico). */
const PASTA_DE_MIGRATIONS = join(ROOT, 'supabase/migrations')
const TODAS_AS_MIGRATIONS = readdirSync(PASTA_DE_MIGRATIONS)
  .filter(nome => nome.endsWith('.sql'))
  .sort()

/** A última migration (por ordem de aplicação) cujo código — sem comentário — contém `trecho`. */
const ultimaQueDefine = (trecho: string): string | null => {
  let ultima: string | null = null
  for (const nome of TODAS_AS_MIGRATIONS) {
    const limpo = semComentarios(readFileSync(join(PASTA_DE_MIGRATIONS, nome), 'utf8'))
    if (limpo.includes(trecho)) ultima = nome
  }
  return ultima
}

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

/** O `check` vigente é o da migration do bloco Joias em oferta (`MIGRATION_OFERTAS`). */
const TIPOS_DO_CHECK = tiposDoCheck(LIMPO_OFERTAS)
/** O índice de tipos vigente é o da migration por campanha (`MIGRATION_POR_CAMPANHA`). */
const TIPOS_UNICOS_DO_INDICE = tiposUnicosDoIndice(LIMPO_POR_CAMPANHA)
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

  it('extraiu os 12 tipos do `check` vigente, e não uma lista vazia', () => {
    // O `check` vigente é o da migration do bloco **Joias em oferta**, que o recriou com `campaign_offers`. Ver
    // `MIGRATION_OFERTAS`: `db push` aplica em ordem, e a última definição é a que o banco tem.
    expect(TIPOS_DO_CHECK).toHaveLength(12)
  })

  it('extraiu os 6 tipos do índice único parcial vigente', () => {
    expect(TIPOS_UNICOS_DO_INDICE).toHaveLength(6)
  })

  it('o `check` VIGENTE é o da migration do bloco Joias em oferta, e o índice de tipos o da migration por campanha', () => {
    // Sem esta asserção, uma migration posterior que recriasse a constraint ou o índice deixaria este
    // guarda medindo uma lista que o banco já não tem, com a suíte verde.
    expect(TODAS_AS_MIGRATIONS.length).toBeGreaterThan(70)
    expect(ultimaQueDefine('add constraint home_sections_type_check')).toBe(
      '20261130140000_102-joias-em-oferta-na-home.sql',
    )
    expect(ultimaQueDefine('create unique index if not exists home_sections_unique_types_idx')).toBe(
      '20261130170000_103-joias-em-oferta-por-campanha.sql',
    )
    // E a recriação derruba antes de criar: `if not exists` sobre o índice anterior não mudaria nada.
    expect(LIMPO_OFERTAS).toContain('drop constraint if exists home_sections_type_check')
    expect(LIMPO_POR_CAMPANHA).toContain('drop index if exists public.home_sections_unique_types_idx')
    expect(
      LIMPO_POR_CAMPANHA.indexOf('drop index if exists public.home_sections_unique_types_idx'),
    ).toBeLessThan(
      LIMPO_POR_CAMPANHA.indexOf('create unique index if not exists home_sections_unique_types_idx'),
    )
  })

  it('a migration do bloco Joias em oferta não toca dado nem abre escrita a `anon`', () => {
    // O bloco nasce desligado quando a dona o acrescenta (HOME-10); semear mudaria a Home de quem já
    // a tem.
    expect(LIMPO_OFERTAS).not.toMatch(/\binsert\s+into\b/i)
    expect(LIMPO_OFERTAS).not.toMatch(/\bupdate\s+public\./i)
    expect(LIMPO_OFERTAS).not.toMatch(/\bdelete\s+from\b/i)
    expect(LIMPO_OFERTAS).not.toMatch(/\bgrant\b/i)
  })

  it('a migration por campanha não toca dado nem abre escrita a `anon`', () => {
    // O bloco que já existe fica sem campanha até a dona escolher uma: gravar a vigente nele seria
    // decidir por ela, e mudaria a Home de quem já a tem.
    expect(SQL_POR_CAMPANHA.length).toBeGreaterThan(500)
    expect(LIMPO_POR_CAMPANHA).not.toMatch(/\binsert\s+into\b/i)
    expect(LIMPO_POR_CAMPANHA).not.toMatch(/\bupdate\s+(public\.)?\w+\s+set\b/i)
    expect(LIMPO_POR_CAMPANHA).not.toMatch(/\bdelete\s+from\b/i)
    expect(LIMPO_POR_CAMPANHA).not.toMatch(/\btruncate\b/i)
    expect(LIMPO_POR_CAMPANHA).not.toMatch(/\bgrant\b/i)
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

  it.each(['hero', 'trust_bar', 'banner_grid', 'collection_rows', 'brand_statement', 'trending_tags', 'newsletter', 'collection_feature', 'product_carousel', 'category_grid', 'hero_carousel', 'campaign_offers'])(
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
// AD-029 (ex-HOME-08) — a Home não tem bloco indelével, tem uma última seção ativa
// ---------------------------------------------------------------------------
//
// `HOME-08` nunca existiu para proteger o hero: existiu para tornar IMPOSSÍVEL uma Home com zero
// seções ativas. A feature 41 precisa que o hero seja desligável — senão o carrossel de banner nunca
// ocupa o topo —, então a invariante foi **generalizada**, não apagada.
//
// Este bloco guarda a troca nos DOIS sentidos: o guarda novo existe e cobre os dois caminhos, **e** o
// antigo não existe mais. Sem o segundo sentido, uma migration que criasse o novo sem derrubar o
// velho deixaria os dois triggers ligados — e o hero continuaria indelével, com a suíte verde.

describe('a última seção ativa não desliga nem some (AD-029, BNR-42..BNR-45)', () => {
  const inicioDoGuarda = LIMPO_41.indexOf(
    'create or replace function public.guard_last_active_home_section',
  )
  const corpoDoGuarda =
    inicioDoGuarda === -1 ? '' : LIMPO_41.slice(inicioDoGuarda, LIMPO_41.indexOf('$$;', inicioDoGuarda))

  it('a função de guarda existe', () => {
    expect(inicioDoGuarda).toBeGreaterThan(-1)
    expect(corpoDoGuarda.length).toBeGreaterThan(200)
  })

  it('cobre o caminho do DELETE', () => {
    expect(corpoDoGuarda).toContain("tg_op = 'DELETE'")
    // Apagar linha JÁ desligada não pode ser recusado — ela não conta para a invariante.
    expect(corpoDoGuarda).toContain('old.active is not true')
  })

  it('cobre o caminho do desligamento', () => {
    expect(corpoDoGuarda).toContain('old.active is true')
    expect(corpoDoGuarda).toContain('new.active is not true')
  })

  it('decide por CONTAGEM das outras ativas, e não pelo tipo da linha', () => {
    // A diferença que faz o hero virar opção: o guarda não pergunta mais "esta linha é o hero?".
    expect(corpoDoGuarda).toMatch(/select\s+count\(\*\)\s+into\s+restantes/)
    expect(corpoDoGuarda).toContain('where active and id <> old.id')
    expect(corpoDoGuarda, 'o guarda voltou a olhar o TIPO da linha').not.toContain("'hero'")
  })

  it('recusa com o errcode que o PostgREST reporta como violação de constraint', () => {
    expect(corpoDoGuarda).toContain("using errcode = '23514'")
  })

  it('tem UMA recusa para os dois caminhos, e a mensagem tem um dono só', () => {
    // Duas cópias da frase divergiriam na primeira vez que alguém ajustasse uma delas — e é esta
    // mensagem que o painel exibe, sem reescrever (BNR-44).
    expect([...corpoDoGuarda.matchAll(/raise exception/g)]).toHaveLength(1)
    expect(corpoDoGuarda).toContain('A Home precisa de pelo menos uma secao ativa')
  })

  it('o trigger está ligado, antes de update E de delete', () => {
    expect(LIMPO_41.replace(/\s+/g, ' ')).toContain(
      'create trigger trg_home_sections_last_active_guard before update or delete on public.home_sections',
    )
  })

  it('o guarda ANTIGO do hero é derrubado — função e trigger', () => {
    // O segundo sentido. Criar o novo sem derrubar o velho deixaria o hero indelével com a suíte
    // verde, que é a falha mais cara possível numa troca de guarda.
    expect(LIMPO_41.replace(/\s+/g, ' ')).toContain(
      'drop trigger if exists trg_home_sections_hero_guard on public.home_sections',
    )
    expect(LIMPO_41.replace(/\s+/g, ' ')).toContain(
      'drop function if exists public.guard_hero_home_section()',
    )
  })

  it('a migration da 41 não recria o guarda do hero', () => {
    expect(LIMPO_41).not.toContain('create or replace function public.guard_hero_home_section')
    expect(LIMPO_41).not.toContain('create trigger trg_home_sections_hero_guard')
  })
})

// ---------------------------------------------------------------------------
// BNR-07, BNR-21, BNR-45, BNR-46 — a migration da 41
// ---------------------------------------------------------------------------

describe('âncora da leitura da migration da 41', () => {
  it('leu o arquivo de verdade', () => {
    expect(SQL_41.length).toBeGreaterThan(1000)
    expect(SQL_41).toContain('alter table public.home_section_items')
    expect(SQL_41).toContain('public.guard_last_active_home_section')
  })

  it('é ESTE arquivo que recria a constraint de tipo', () => {
    // A âncora que importa aqui não é a contagem (a de cima já a faz) — é a PROCEDÊNCIA. Se a 41
    // deixasse de recriar o `check`, `TIPOS_DO_CHECK` viria vazio, a comparação com o catálogo
    // falharia por outro motivo, e o diagnóstico apontaria para o lugar errado.
    expect(LIMPO_41).toContain('drop constraint if exists home_sections_type_check')
    expect(LIMPO_41).toContain('add constraint home_sections_type_check')
  })
})

describe('a arte de celular do item curado (BNR-07, BNR-21)', () => {
  it('a coluna entra de forma aditiva e idempotente', () => {
    expect(LIMPO_41.replace(/\s+/g, ' ')).toContain(
      'alter table public.home_section_items add column if not exists image_mobile_url text',
    )
  })

  it('a coluna é documentada, e a antiga é redocumentada como arte de computador', () => {
    // `image_url` mudou de significado sem mudar de nome: sem o comentário, quem abrir o schema em
    // 2027 não tem como saber que a coluna sem sufixo é a do computador.
    expect(SQL_41).toContain('comment on column public.home_section_items.image_mobile_url is')
    expect(SQL_41).toContain('comment on column public.home_section_items.image_url is')
  })
})

describe('a migration da 41 não toca dado (BNR-46)', () => {
  it('não tem insert, update nem delete de linha', () => {
    // A semente já rodou em produção. Uma escrita aqui mudaria a Home de quem já a tem — e o
    // sintoma apareceria para a cliente, não no diff.
    expect(LIMPO_41).not.toMatch(/\binsert\s+into\b/i)
    expect(LIMPO_41).not.toMatch(/\bupdate\s+public\./i)
    expect(LIMPO_41).not.toMatch(/\bdelete\s+from\b/i)
  })

  it('não concede nada a `anon`', () => {
    expect(LIMPO_41).not.toMatch(/grant[\s\S]{0,120}?\banon\b/i)
  })

  it('toda criação é idempotente', () => {
    // `db push` reaplica o arquivo inteiro se a linha de controle se perder; um `add column` sem
    // `if not exists` transformaria isso em falha de deploy.
    const criacoes = [...LIMPO_41.matchAll(/\bcreate\s+(or\s+replace\s+)?(function|trigger)\b/gi)]
    expect(criacoes.length).toBeGreaterThan(0)
    for (const [trecho] of criacoes) {
      expect(trecho.toLowerCase()).toMatch(/or replace|trigger/)
    }
    // Todo `create trigger` é precedido de um `drop trigger if exists` do mesmo nome.
    for (const [, nome] of LIMPO_41.matchAll(/create trigger (\w+)/g)) {
      expect(LIMPO_41, `o trigger ${nome} é criado sem drop antes`).toContain(
        `drop trigger if exists ${nome}`,
      )
    }
  })
})

// ---------------------------------------------------------------------------
// O bloco "Joias em oferta" por campanha
// ---------------------------------------------------------------------------

/** A declaração da coluna `campaign_id` de `home_sections`, até o `;`. */
const colunaDaCampanha = (fonte: string): string => {
  const inicio = fonte.search(/alter table public\.home_sections\s+add column if not exists campaign_id\b/)
  if (inicio === -1) return ''
  const fim = fonte.indexOf(';', inicio)
  return fim === -1 ? fonte.slice(inicio) : fonte.slice(inicio, fim)
}

/** A criação do índice por campanha, até o `;`. */
const indiceDaCampanha = (fonte: string, nome: string): string => {
  const inicio = fonte.indexOf(`create unique index if not exists ${nome}`)
  if (inicio === -1) return ''
  const fim = fonte.indexOf(';', inicio)
  return fim === -1 ? fonte.slice(inicio) : fonte.slice(inicio, fim)
}

const normaliza = (trecho: string): string => trecho.replace(/\s+/g, ' ').trim()

describe('a campanha do bloco Joias em oferta', () => {
  const coluna = normaliza(colunaDaCampanha(LIMPO_POR_CAMPANHA))
  const indice = normaliza(indiceDaCampanha(LIMPO_POR_CAMPANHA, CAMPAIGN_OFFERS_CAMPAIGN_INDEX))

  it('âncora: achou a coluna e o índice por campanha', () => {
    expect(coluna.length).toBeGreaterThan(0)
    expect(indice.length).toBeGreaterThan(0)
  })

  it('a coluna é uuid, opcional e aditiva, com FK para `campaigns`', () => {
    expect(coluna).toMatch(/add column if not exists campaign_id uuid\b/)
    expect(coluna).toMatch(/references public\.campaigns ?\(id\)/)
    expect(coluna).not.toMatch(/not null/)
  })

  it('apagar a campanha ZERA a coluna — `on delete set null`, nunca cascade nem restrict', () => {
    // Cascade apagaria o bloco da Home junto com a campanha; restrict impediria a dona de apagar a
    // campanha por causa de um bloco. O bloco fica sem campanha e o painel pede a escolha.
    expect(coluna).toMatch(/on delete set null/)
    expect(coluna).not.toMatch(/cascade/)
    expect(coluna).not.toMatch(/restrict/)
  })

  it('o índice por campanha é único, parcial, e tem o nome estável que o painel reconhece', () => {
    expect(CAMPAIGN_OFFERS_CAMPAIGN_INDEX).toBe('home_sections_campaign_offers_campaign_idx')
    expect(indice).toMatch(/on public\.home_sections ?\(campaign_id\)/)
    expect(indice).toMatch(/where type = 'campaign_offers' and campaign_id is not null$/)
  })

  it('o bloco sem campanha não entra no índice — dois blocos sem campanha convivem', () => {
    expect(indice).toContain('campaign_id is not null')
  })

  it('`campaign_offers` saiu do índice de tipos, e os outros seis continuam', () => {
    expect(TIPOS_UNICOS_DO_INDICE).not.toContain('campaign_offers')
    expect([...TIPOS_UNICOS_DO_INDICE].sort()).toEqual(
      ['brand_statement', 'collection_rows', 'hero', 'newsletter', 'trending_tags', 'trust_bar'],
    )
  })

  it('sensor: os parsers reprovam a coluna em cascade e o índice sem o recorte', () => {
    const cascade = normaliza(
      colunaDaCampanha(
        'alter table public.home_sections add column if not exists campaign_id uuid references public.campaigns (id) on delete cascade;',
      ),
    )
    expect(cascade).toMatch(/cascade/)
    expect(cascade).not.toMatch(/on delete set null/)
    const semRecorte = normaliza(
      indiceDaCampanha(
        `create unique index if not exists ${CAMPAIGN_OFFERS_CAMPAIGN_INDEX} on public.home_sections (campaign_id);`,
        CAMPAIGN_OFFERS_CAMPAIGN_INDEX,
      ),
    )
    expect(semRecorte).not.toMatch(/where type = 'campaign_offers' and campaign_id is not null$/)
  })
})
