import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  HOME_SECTION_TYPES,
  UNIQUE_SECTION_TYPES,
  MAX_HOME_SECTIONS,
  sectionMeta,
  type HomeSectionType,
} from '../index'

/**
 * O catálogo de tipos de seção — `HOME-06`.
 *
 * Duas coisas se provam aqui, e a segunda é a que existe por razão ética: que o catálogo tem os dez
 * tipos com os seis únicos declarados, e que **não tem** contagem regressiva nem prova social. Os
 * dois saíram na feature 20 por decisão de produto, e um catálogo genérico de blocos é exatamente a
 * porta por onde eles voltariam — com a dona clicando, sem ninguém decidir nada.
 */

describe('HOME_SECTION_TYPES — os dez tipos', () => {
  it('tem exatamente 10 tipos, na ordem em que o painel os oferece', () => {
    expect(HOME_SECTION_TYPES).toEqual([
      'hero',
      'trust_bar',
      'banner_grid',
      'collection_rows',
      'brand_statement',
      'trending_tags',
      'newsletter',
      'collection_feature',
      'product_carousel',
      'category_grid',
    ])
    expect(HOME_SECTION_TYPES).toHaveLength(10)
  })

  it('não repete tipo', () => {
    expect(new Set(HOME_SECTION_TYPES).size).toBe(HOME_SECTION_TYPES.length)
  })
})

describe('HOME_SECTION_TYPES — o que NÃO pode entrar (HOME-06)', () => {
  it('não existe bloco de contagem regressiva', () => {
    // `DropCountdown` prometia uma "sexta do drop" que a loja não tem.
    expect(HOME_SECTION_TYPES.some(t => /countdown|regressiv|drop|timer|deadline/i.test(t))).toBe(
      false,
    )
  })

  it('não existe bloco de prova social', () => {
    // `SocialProof` eram dois depoimentos inventados. Numa loja em que a peça é feita com as cinzas
    // de alguém, depoimento fabricado não é exagero de marketing — é a mesma régua que tirou as
    // avaliações de demonstração e o contador de clientes do hero.
    expect(
      HOME_SECTION_TYPES.some(t =>
        /social|proof|review|avaliac|depoiment|testimonial|rating/i.test(t),
      ),
    ).toBe(false)
  })
})

describe('UNIQUE_SECTION_TYPES — os seis que só existem uma vez', () => {
  it('declara os seis únicos', () => {
    expect(UNIQUE_SECTION_TYPES).toEqual([
      'hero',
      'trust_bar',
      'collection_rows',
      'brand_statement',
      'trending_tags',
      'newsletter',
    ])
    expect(UNIQUE_SECTION_TYPES).toHaveLength(6)
  })

  it('todo tipo único é um tipo do catálogo', () => {
    for (const type of UNIQUE_SECTION_TYPES) {
      expect(HOME_SECTION_TYPES).toContain(type)
    }
  })

  it('os quatro repetíveis são os blocos de campanha', () => {
    const repetiveis = HOME_SECTION_TYPES.filter(t => !UNIQUE_SECTION_TYPES.includes(t))
    expect(repetiveis).toEqual([
      'banner_grid',
      'collection_feature',
      'product_carousel',
      'category_grid',
    ])
  })
})

describe('sectionMeta — rótulo, unicidade e a faixa de limite', () => {
  it('todo tipo do catálogo tem meta, com rótulo em português da loja', () => {
    for (const type of HOME_SECTION_TYPES) {
      const meta = sectionMeta(type)
      expect(meta).not.toBeNull()
      expect(meta!.type).toBe(type)
      expect(meta!.label.trim()).not.toBe('')
      // O rótulo é o que a dona lê; jargão de código na tela seria o painel falando outra língua.
      expect(meta!.label).not.toBe(type)
    }
  })

  it('`unique` acompanha `UNIQUE_SECTION_TYPES`, tipo a tipo', () => {
    for (const type of HOME_SECTION_TYPES) {
      expect(sectionMeta(type)!.unique).toBe(UNIQUE_SECTION_TYPES.includes(type))
    }
  })

  it('as fileiras de coleção aceitam de 1 a 8', () => {
    expect(sectionMeta('collection_rows')!.limit).toEqual({ min: 1, max: 8 })
  })

  it('os chips de tema aceitam de 1 a 24', () => {
    expect(sectionMeta('trending_tags')!.limit).toEqual({ min: 1, max: 24 })
  })

  it('tipo sem limite editável devolve `null`, não uma faixa inventada', () => {
    for (const type of ['hero', 'trust_bar', 'banner_grid', 'brand_statement', 'newsletter'] as const) {
      expect(sectionMeta(type)!.limit).toBeNull()
    }
  })

  it('tipo desconhecido devolve `null` em vez de lançar', () => {
    // A lista vem do banco: uma linha gravada por uma versão mais nova tem de ser pulada, nunca
    // derrubar a Home inteira.
    expect(sectionMeta('nao_existe' as HomeSectionType)).toBeNull()
  })
})

describe('MAX_HOME_SECTIONS — o teto', () => {
  it('a Home aceita no máximo 30 seções', () => {
    expect(MAX_HOME_SECTIONS).toBe(30)
  })
})

/**
 * A pureza do módulo, medida no disco.
 *
 * `core/home` não pode importar React nem Supabase: o guarda que compara este catálogo com o
 * `check (type in …)` da migration precisa importá-lo de dentro de um teste que lê arquivo — e um
 * `import` de React ali arrastaria meio ambiente de browser para um teste de node. Mesma restrição de
 * `core/routes` e `core/material`, e aqui ela é asserida em vez de combinada.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const MODULO = resolve(HERE, '..')

const FONTES = readdirSync(MODULO)
  .filter(nome => nome.endsWith('.ts'))
  .map(nome => ({ nome, fonte: readFileSync(join(MODULO, nome), 'utf8') }))

describe('core/home — módulo puro', () => {
  it('âncora: varreu os arquivos do módulo de verdade', () => {
    // Sem esta âncora, um caminho errado varreria zero arquivo e a suíte passaria em silêncio — que é
    // a pior falha possível num teste que lê o disco.
    //
    // A âncora nomeia os arquivos que **têm** de estar lá em vez de fixar a lista inteira: a varredura
    // abaixo é `readdirSync`, então todo arquivo novo do módulo já entra na medição sozinho. Fixar a
    // lista faria cada arquivo novo pedir uma edição neste teste, que é churn sem ganho de guarda.
    const nomes = FONTES.map(f => f.nome)
    expect(nomes).toEqual(expect.arrayContaining(['catalog.ts', 'index.ts', 'types.ts']))
    expect(FONTES.length).toBeGreaterThanOrEqual(3)
  })

  it('nenhum arquivo importa React nem Supabase', () => {
    for (const { nome, fonte } of FONTES) {
      const imports = [...fonte.matchAll(/from\s+'([^']+)'/g)].map(m => m[1])
      for (const alvo of imports) {
        expect(
          /^react|^@supabase|^@estrelinha\/supabase/.test(alvo),
          `${nome} importa ${alvo}`,
        ).toBe(false)
      }
    }
  })
})
