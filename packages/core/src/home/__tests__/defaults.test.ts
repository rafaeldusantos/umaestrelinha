import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_HOME_COMPOSITION } from '../defaults'
import { HOME_SECTION_TYPES } from '../catalog'
import type { HomeSectionType } from '../types'

/**
 * `DEFAULT_HOME_COMPOSITION` — a Home de hoje como dado (`HOME-04`, `HOME-07`).
 *
 * A constante tem de bater com a página **em duas direções**: a forma (sete seções, na ordem, com os
 * limites) e o texto. A segunda é a que ninguém veria falhar — um parágrafo quase igual, uma vírgula
 * a menos, e a Home semeada mostraria outra coisa sem build, `tsc` ou teste de widget reclamar. Por
 * isso os literais são comparados com o **fonte dos widgets no disco**.
 *
 * **A comparação com o disco se APOSENTA à medida que cada widget passa a receber o texto por prop**
 * (feature 24, emenda `E1`). O motivo é o contrário de descuido: enquanto o literal vive nos dois
 * lugares, compará-los é o que impede a divergência; depois que o widget exige o conteúdo por prop
 * **sem fallback**, não há segundo lugar — e manter aqui uma leitura do arquivo obrigaria alguém a
 * deixar o literal lá dentro só para o teste achar, que é justamente o segundo dono que a emenda
 * fecha. Quem assume o papel é `homeComposition.test.tsx`, estritamente mais forte: assere o **DOM
 * renderizado** ao fim do pipe inteiro, não o texto de um arquivo.
 *
 * Aposentado até aqui: **o hero** (a T13 tirou os seis literais do `HeroBanner`).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../..')

/**
 * Os caminhos por extenso. A régua nunca é o objeto medido: derivá-los de uma constante do projeto
 * faria a varredura encolher junto com o que ela deveria guardar.
 */
const FONTES = {
  brandStatement: 'apps/store/src/widgets/home-sections/ui/BrandStatement.tsx',
  trendingTags: 'apps/store/src/widgets/home-sections/ui/TrendingTags.tsx',
  newsletter: 'apps/store/src/features/newsletter/ui/NewsletterBanner.tsx',
  colecoes: 'apps/store/src/widgets/home-collections/model/pickHomeCollections.ts',
} as const

/**
 * O JSX quebra texto longo em várias linhas e o React o entrega com um espaço só. Sem normalizar, o
 * parágrafo do hero nunca casaria — e a falha pareceria divergência de conteúdo quando é só recuo.
 */
const normalizado = (fonte: string): string => fonte.replace(/\s+/g, ' ')

const LIDOS = Object.fromEntries(
  Object.entries(FONTES).map(([chave, caminho]) => [
    chave,
    normalizado(readFileSync(join(ROOT, caminho), 'utf8')),
  ]),
) as Record<keyof typeof FONTES, string>

const secao = (type: HomeSectionType) => DEFAULT_HOME_COMPOSITION.find(s => s.type === type)!

describe('DEFAULT_HOME_COMPOSITION — a forma', () => {
  it('tem 7 seções, nos tipos e na ordem da Home de hoje', () => {
    expect(DEFAULT_HOME_COMPOSITION.map(s => s.type)).toEqual([
      'hero',
      'trust_bar',
      'banner_grid',
      'collection_rows',
      'brand_statement',
      'trending_tags',
      'newsletter',
    ])
    expect(DEFAULT_HOME_COMPOSITION).toHaveLength(7)
  })

  it('as posições são 1..7, sem buraco e sem empate', () => {
    expect(DEFAULT_HOME_COMPOSITION.map(s => s.position)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('as sete nascem ativas — a Home semeada mostra tudo', () => {
    expect(DEFAULT_HOME_COMPOSITION.every(s => s.active)).toBe(true)
  })

  it('todo tipo semeado está no catálogo', () => {
    for (const s of DEFAULT_HOME_COMPOSITION) {
      expect(HOME_SECTION_TYPES).toContain(s.type)
    }
  })

  it('nenhuma seção nasce com curadoria — a derivação de hoje continua valendo', () => {
    // Item presente é override (`HOME-31`/`HOME-32`). Semear itens congelaria as coleções da vitrine
    // e categoria nova deixaria de entrar sozinha.
    for (const s of DEFAULT_HOME_COMPOSITION) {
      expect(s.items ?? []).toHaveLength(0)
    }
  })
})

describe('DEFAULT_HOME_COMPOSITION — os limites e o aninhamento', () => {
  it('a grade de banners nasce no arranjo de hoje', () => {
    expect(secao('banner_grid').config.layout).toBe('hero_pair')
  })

  it('as fileiras de coleção nascem com o limite de hoje', () => {
    expect(secao('collection_rows').config.limit).toBe(4)
    // E 4 é o número que a loja usa hoje, não um palpite.
    expect(LIDOS.colecoes).toMatch(/HOME_COLLECTION_ROWS = 4\b/)
  })

  it('os chips de tema nascem com o limite de hoje', () => {
    expect(secao('trending_tags').config.limit).toBe(12)
    expect(LIDOS.trendingTags).toMatch(/const LIMIT = 12\b/)
  })

  it('a faixa institucional entra depois da 1ª fileira, e é ela quem carrega o campo', () => {
    // `interlude_after: 0` é o que reproduz o `INTERLUDE_AFTER = 0` do `HomeCollections`. Um dono só:
    // desligar a faixa é desligar a faixa, e o campo some junto com ela.
    expect(secao('brand_statement').config.interlude_after).toBe(0)
  })

  it('a faixa de vantagens não traz texto: os números saem das settings (HOME-44)', () => {
    expect(Object.keys(secao('trust_bar').config)).toHaveLength(0)
  })
})

describe('DEFAULT_HOME_COMPOSITION — os literais batem com o disco', () => {
  it('âncora: leu os quatro fontes de verdade', () => {
    // Sem esta âncora, um caminho errado leria string vazia, todas as comparações abaixo falhariam
    // por um motivo enganoso — ou, se fossem escritas ao contrário, passariam em silêncio.
    for (const [chave, caminho] of Object.entries(FONTES)) {
      expect(LIDOS[chave as keyof typeof FONTES].length, caminho).toBeGreaterThan(500)
    }
    expect(Object.keys(FONTES)).toHaveLength(4)
  })

  it('o `HeroBanner` NÃO carrega mais os literais: eles são prop obrigatória', () => {
    // O par da aposentadoria acima. Um fallback literal que voltasse ao widget seria um segundo dono
    // dos mesmos textos, e a Home mostraria a versão antiga enquanto a dona edita a nova.
    const hero = normalizado(
      readFileSync(join(ROOT, 'apps/store/src/widgets/hero-banner/ui/HeroBanner.tsx'), 'utf8'),
    )
    const { config } = secao('hero')

    expect(hero.length).toBeGreaterThan(500)
    expect(hero).not.toContain(config.title_line1)
    expect(hero).not.toContain(config.paragraph)
    expect(hero).not.toContain(config.cta_label)
  })

  it('os sete campos da faixa institucional saem do `BrandStatement`', () => {
    const { config } = secao('brand_statement')
    expect(LIDOS.brandStatement).toContain(config.eyebrow)
    expect(LIDOS.brandStatement).toContain(config.title)
    expect(LIDOS.brandStatement).toContain(config.paragraph)
    expect(LIDOS.brandStatement).toContain(config.author_name)
    expect(LIDOS.brandStatement).toContain(config.author_role)
    expect(LIDOS.brandStatement).toContain(config.link_label)
    expect(LIDOS.brandStatement).toContain(`to="${config.link_href}"`)
  })

  it('título e subtítulo dos chips saem do `TrendingTags`', () => {
    const { config } = secao('trending_tags')
    expect(LIDOS.trendingTags).toContain(config.title)
    expect(LIDOS.trendingTags).toContain(config.subtitle)
  })

  it('título, subtítulo e rótulo do botão saem do `NewsletterBanner`', () => {
    const { config } = secao('newsletter')
    expect(LIDOS.newsletter).toContain(config.title)
    expect(LIDOS.newsletter).toContain(config.subtitle)
    expect(LIDOS.newsletter).toContain(config.cta_label)
  })
})
