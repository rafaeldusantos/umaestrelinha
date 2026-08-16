import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { FAQ_MIN_CATEGORY_SAMPLE, FAQ_SUGGESTION_LIMIT, rankFaqSuggestions } from '../suggest'
import type { FaqCategoryUsage } from '../types'

/**
 * `FAQ-33` — **a guarda dos 80%**, medida contra o catálogo real.
 *
 * `suggest.test.ts` prova que a função faz o que a spec descreve. Este arquivo prova outra coisa, e
 * é a que justifica a feature ter escolhido determinismo em vez de IA: que a regra **acerta**, com o
 * dado que existe.
 *
 * A fixture é a distribuição real (produto → categorias, produto → perguntas) exportada do banco
 * local em 2026-08-16. O método é **leave-one-out**: para cada produto, a estatística é montada com
 * os **outros 686** e o ranking é perguntado como se aquele produto fosse novo. Sem isso o produto
 * entraria na conta que decide as sugestões dele, e a medição se autoconfirmaria.
 *
 * A régua é 80%. A medição de referência, em SQL, deu **84,0% de precisão** e **83,5% de cobertura**.
 * A folga de 4 pontos é proposital: a régua existe para pegar uma mudança que **quebra** a regra, não
 * para congelar o terceiro decimal de um catálogo que a dona vai curar.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE = join(HERE, '..', '__fixtures__', 'catalogUsage.json')

interface CatalogFixture {
  produtos: number
  categorias: number
  perguntas: number
  vinculos: number
  /** Uma entrada por produto: `[categorias, perguntas]`, ambas como índices. */
  linhas: [number[], number[]][]
}

const catalogo: CatalogFixture = JSON.parse(readFileSync(FIXTURE, 'utf8'))

// --- Âncora de contagem ------------------------------------------------------------------------
//
// Sem ela, uma fixture truncada (ou um caminho errado que devolvesse `{}`) faria a medição rodar
// sobre nada e **passar**, que é a pior falha possível numa guarda deste tipo.

describe('a fixture é o catálogo real', () => {
  it('tem as contagens medidas no banco em 2026-08-16', () => {
    expect(catalogo.produtos).toBe(687)
    expect(catalogo.categorias).toBe(36)
    expect(catalogo.perguntas).toBe(67)
    expect(catalogo.vinculos).toBe(3475)
    expect(catalogo.linhas).toHaveLength(687)
  })

  it('todo produto tem ao menos uma pergunta, e a soma bate com os vínculos', () => {
    const total = catalogo.linhas.reduce((soma, [, faqs]) => soma + faqs.length, 0)

    expect(total).toBe(catalogo.vinculos)
    expect(catalogo.linhas.every(([, faqs]) => faqs.length > 0)).toBe(true)
  })

  it('a mediana de perguntas por produto é 5, como medido', () => {
    const tamanhos = catalogo.linhas.map(([, faqs]) => faqs.length).sort((a, b) => a - b)
    expect(tamanhos[Math.floor(tamanhos.length / 2)]).toBe(5)
    expect(Math.max(...tamanhos)).toBe(8)
  })
})

// --- A medição ---------------------------------------------------------------------------------

/** `uses[categoria][pergunta]` e `sample[categoria]`, sobre o catálogo inteiro. */
const construirTotais = () => {
  const uses = new Map<number, Map<number, number>>()
  const sample = new Map<number, number>()

  for (const [cats, faqs] of catalogo.linhas) {
    for (const c of cats) {
      sample.set(c, (sample.get(c) ?? 0) + 1)
      let porFaq = uses.get(c)
      if (!porFaq) {
        porFaq = new Map<number, number>()
        uses.set(c, porFaq)
      }
      for (const f of faqs) porFaq.set(f, (porFaq.get(f) ?? 0) + 1)
    }
  }
  return { uses, sample }
}

const { uses: USES, sample: SAMPLE } = construirTotais()

/** As linhas de `faq_category_usage` **sem** o produto `indice` — o leave-one-out. */
const usageSem = (indice: number): FaqCategoryUsage[] => {
  const [cats, faqs] = catalogo.linhas[indice]
  const doProduto = new Set(faqs)
  const linhas: FaqCategoryUsage[] = []

  for (const c of cats) {
    const amostra = (SAMPLE.get(c) ?? 0) - 1
    for (const [f, n] of USES.get(c) ?? []) {
      const usos = n - (doProduto.has(f) ? 1 : 0)
      if (usos > 0) {
        linhas.push({ category_id: String(c), faq_id: String(f), uses: usos, sample: amostra })
      }
    }
  }
  return linhas
}

interface Medida {
  precisao: number
  cobertura: number
  semAcerto: number
  acertosMedios: number
}

const medir = (
  ranquear: (indice: number, linhas: FaqCategoryUsage[], cats: string[]) => string[],
): Medida => {
  let somaPrecisao = 0
  let somaCobertura = 0
  let somaAcertos = 0
  let semAcerto = 0

  catalogo.linhas.forEach(([cats, faqs], indice) => {
    const reais = new Set(faqs.map(String))
    const sugeridas = ranquear(indice, usageSem(indice), cats.map(String))
    const acertos = sugeridas.filter(id => reais.has(id)).length

    somaPrecisao += sugeridas.length > 0 ? acertos / sugeridas.length : 0
    somaCobertura += acertos / reais.size
    somaAcertos += acertos
    if (acertos === 0) semAcerto += 1
  })

  const n = catalogo.linhas.length
  return {
    precisao: somaPrecisao / n,
    cobertura: somaCobertura / n,
    semAcerto,
    acertosMedios: somaAcertos / n,
  }
}

const porProporcao = medir((_i, linhas, categoryIds) =>
  rankFaqSuggestions({ categoryIds, usage: linhas, productHasFaq: false }).map(s => s.faq_id),
)

describe('a sugestão por categoria acerta no catálogo real', () => {
  it('precisão@5 fica em pelo menos 80%', () => {
    expect(porProporcao.precisao).toBeGreaterThanOrEqual(0.8)
  })

  it('cobertura@5 fica em pelo menos 80%', () => {
    expect(porProporcao.cobertura).toBeGreaterThanOrEqual(0.8)
  })

  it('acerta ao menos 4 das 5 sugestões, em média', () => {
    expect(porProporcao.acertosMedios).toBeGreaterThanOrEqual(4)
  })

  it('deixa no máximo 10 produtos sem nenhum acerto', () => {
    expect(porProporcao.semAcerto).toBeLessThanOrEqual(10)
  })
})

// --- O sensor de discriminação, embutido -------------------------------------------------------
//
// Uma régua de 80% só vale alguma coisa se **reprovar** a implementação errada. A alternativa óbvia
// — ranquear por contagem bruta de vizinhos — é exatamente o que um refactor distraído produziria,
// e ela mede ~61%. Se este teste passasse com as duas, ele não estaria medindo nada.

const porContagemBruta = medir((_i, linhas, categoryIds) => {
  const doProduto = new Set(categoryIds)
  const melhor = new Map<string, number>()

  for (const linha of linhas) {
    if (!doProduto.has(linha.category_id)) continue
    if (!(linha.sample >= FAQ_MIN_CATEGORY_SAMPLE)) continue
    melhor.set(linha.faq_id, (melhor.get(linha.faq_id) ?? 0) + linha.uses)
  }

  return [...melhor.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, FAQ_SUGGESTION_LIMIT)
    .map(([id]) => id)
})

describe('a régua discrimina: a contagem bruta reprova nela', () => {
  it('ranquear por contagem bruta fica ABAIXO de 80% de precisão', () => {
    expect(porContagemBruta.precisao).toBeLessThan(0.8)
  })

  it('a proporção é melhor que a contagem bruta nas duas métricas', () => {
    expect(porProporcao.precisao).toBeGreaterThan(porContagemBruta.precisao)
    expect(porProporcao.cobertura).toBeGreaterThan(porContagemBruta.cobertura)
  })

  it('a contagem bruta deixa muito mais produtos sem acerto', () => {
    expect(porContagemBruta.semAcerto).toBeGreaterThan(porProporcao.semAcerto)
  })
})
