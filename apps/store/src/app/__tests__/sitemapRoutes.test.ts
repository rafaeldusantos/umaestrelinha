import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LEGACY_REDIRECTS,
  NON_INDEXABLE_PATHS,
  SITEMAP_STATIC_PATHS,
} from '@estrelinha/core/routes'

/**
 * `SMP-24`, `SMP-25` — **toda rota declarada precisa estar classificada**.
 *
 * O sitemap enumera quatro coisas: o catálogo (produtos e categorias, que vêm do banco) e uma lista
 * fixa de páginas institucionais. A lista fixa é o pedaço que **envelhece sozinho**: a próxima
 * página pública da loja nasce no `App.tsx` e não entra em `SITEMAP_STATIC_PATHS` por esquecimento.
 * Nada quebra — a página funciona, responde 200, tem canônica —, ela só nunca é anunciada, e a
 * descoberta volta a depender de o rastreador executar o JavaScript da vitrine.
 *
 * É o mesmo mecanismo de `reservedSlugs.test.ts`, e pela mesma razão: com a `AD-018` o namespace de
 * rota é compartilhado, então uma lista de rotas mantida à mão diverge do `App.tsx` em silêncio.
 *
 * **A fonte é o `App.tsx` lido do disco, nunca `ROUTE_SLUGS`.** A régua não pode ser o objeto
 * medido: `ROUTE_SLUGS` é outro consumidor da mesma verdade, guardado por outro teste, e comparar os
 * dois entre si deixaria os dois envelhecerem juntos.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const APP = readFileSync(resolve(HERE, '../App.tsx'), 'utf8')

/**
 * Toda `path="…"` que aparece no arquivo, **sem repetição**.
 *
 * A varredura é textual e por isso alcança comentário também — o bloco que explica o ranqueamento do
 * React Router cita `path="*"` em prosa, e a leitura crua devolve 20 ocorrências para 19 rotas. A
 * deduplicação resolve isso sem enfraquecer nada: um comentário que citasse um caminho **novo**
 * continuaria caindo na classificação abaixo, e ser obrigado a classificar um caminho citado em
 * comentário é o lado certo do erro.
 */
const declaredRoutes = (): string[] => [
  ...new Set([...APP.matchAll(/path="([^"]*)"/g)].map((m) => m[1])),
]

/**
 * As rotas que o **catálogo** cobre: uma linha do banco por URL. Não entram em lista fixa nenhuma
 * porque o número delas muda a cada cadastro — quem as enumera é a function do sitemap.
 */
const DINAMICAS = ['/produtos/:slug', '/:slug', '/:parentSlug/:slug']

/** O curinga da 404. Não é conteúdo; é o que sobra. */
const CURINGA = '*'

const LEGADAS = LEGACY_REDIRECTS.map((entry) => entry.from)
const FORA = NON_INDEXABLE_PATHS.map((entry) => entry.path)

describe('sitemapRoutes — âncora da varredura (SMP-25)', () => {
  it('leu o `App.tsx` de verdade', () => {
    // Primeira metade da âncora dupla: um caminho errado devolveria string vazia, `declaredRoutes()`
    // devolveria `[]`, e **todos** os laços abaixo passariam por vacuidade. É a pior falha possível
    // num teste de varredura — ele vira um no-op verde (`L-021`).
    expect(APP.length).toBeGreaterThan(1000)
    expect(APP).toContain('<Routes>')
  })

  it('encontrou o número de rotas que o roteador declara', () => {
    // Segunda metade: contou o que leu. Se uma rota sumir do arquivo, este número cai e alguém
    // precisa olhar — em vez de a classificação passar a cobrir um roteador menor sem aviso.
    expect(declaredRoutes()).toHaveLength(19)
  })
})

describe('sitemapRoutes — classificação obrigatória (SMP-24)', () => {
  it('toda rota do `App.tsx` está classificada em exatamente UM conjunto', () => {
    const classificada = (path: string): string[] =>
      [
        SITEMAP_STATIC_PATHS.includes(path) ? 'sitemap' : null,
        FORA.includes(path) ? 'nao-indexavel' : null,
        DINAMICAS.includes(path) ? 'dinamica' : null,
        LEGADAS.includes(path) ? 'legada' : null,
        path === CURINGA ? 'curinga' : null,
      ].filter(Boolean) as string[]

    const problemas = declaredRoutes()
      .map((path) => ({ path, em: classificada(path) }))
      .filter((entry) => entry.em.length !== 1)
      .map((entry) =>
        entry.em.length === 0
          ? `${entry.path} — rota nova sem classificação: entra em SITEMAP_STATIC_PATHS ou em NON_INDEXABLE_PATHS`
          : `${entry.path} — classificada em mais de um conjunto: ${entry.em.join(', ')}`,
      )

    expect(problemas).toEqual([])
  })

  it('e nas DUAS direções: toda entrada classificada ainda é uma rota', () => {
    // Sem esta metade, uma página removida deixaria a entrada morta na lista para sempre — e o
    // sitemap anunciaria uma URL que só responde 404. É a mesma bidirecionalidade que
    // `reservedSlugs.test.ts` exige, e pelo mesmo motivo.
    const rotas = new Set(declaredRoutes())
    const orfas = [...SITEMAP_STATIC_PATHS, ...FORA].filter((path) => !rotas.has(path))

    expect(orfas).toEqual([])
  })
})

describe('sitemapRoutes — o que a classificação significa', () => {
  it('nenhuma rota legada é anunciada — sitemap é lista de canônicas', () => {
    // A `BL-007` escreveu isto em 2026-08-09: *"`category_redirects` e `product_redirects` NUNCA
    // entram no sitemap — sitemap é lista de canônicas, e slug antigo é o oposto disso"*.
    for (const path of LEGADAS) {
      expect(SITEMAP_STATIC_PATHS).not.toContain(path)
    }
  })

  it('nenhuma rota dinâmica está na lista fixa — quem as enumera é o catálogo', () => {
    // Um `/produtos/:slug` em `SITEMAP_STATIC_PATHS` viraria a `<loc>` literal
    // `https://…/produtos/:slug`, que é uma URL válida apontando para a 404.
    for (const path of DINAMICAS) {
      expect(SITEMAP_STATIC_PATHS).not.toContain(path)
      expect(FORA).not.toContain(path)
    }
  })

  it('o curinga da 404 não é conteúdo', () => {
    expect(SITEMAP_STATIC_PATHS).not.toContain(CURINGA)
    expect(declaredRoutes()).toContain(CURINGA)
  })
})
