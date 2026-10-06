import { describe, expect, it } from 'vitest'
import { PRODUCT_SELECT } from '../mapProduct'

// Regressão de BUG-20260802-loja-nao-mostra-nenhum-produto.
//
// Este teste guarda uma STRING, e isso é deliberado: o defeito não estava em nenhuma lógica — estava
// na query. Com `categories(...)` sem o nome da FK, o PostgREST acha DOIS caminhos de `products` para
// `categories` (a coluna legada `products.category_id` e a N:N `product_categories`, criada pela
// feature 07), responde `300 PGRST201`, e os 3 hooks da loja tratam o erro como "nenhum resultado".
// Sintoma para a cliente: vitrine sem um único produto e "Produto não encontrado" em toda página de
// produto — sem erro na tela.
//
// Por que os testes existentes não pegaram: `useProducts.test.tsx` e `useProduct.test.tsx` mockam o
// client `supabase`, então a string do `select` nunca chega a um PostgREST de verdade. A prova real é
// HTTP contra o banco local (feita na sessão de QA); o que dá para guardar em vitest é a forma da
// query — e é o suficiente para impedir que a desambiguação seja removida sem querer.

/** O embed `product_categories(...)` inteiro, com um nível de parênteses aninhado dentro. */
const SEM_VINCULO = /product_categories\((?:[^()]|\([^()]*\))*\)/g

describe('PRODUCT_SELECT', () => {
  it('nomeia a FK ao embutir categories, senão o PostgREST devolve 300 PGRST201', () => {
    expect(PRODUCT_SELECT).toContain('categories!products_category_id_fkey(')
  })

  it('não embute categories de forma ambígua', () => {
    // `product_categories(` é legítimo (tabela própria); o proibido é `categories(` sem a FK NO TOPO
    // do select. Dentro de `product_categories(...)` o caminho é um só (`category_id`) — é onde o
    // embed da feature 61 mora. Por isso a régua lê o select SEM o embed do vínculo.
    const semVinculo = PRODUCT_SELECT.replace(SEM_VINCULO, '')
    expect(semVinculo).not.toBe(PRODUCT_SELECT)
    const ambiguo = /(^|[^_])\bcategories\(/.test(semVinculo)
    expect(ambiguo).toBe(false)
  })

  it('sensor: um categories( de topo sem a FK é acusado pela régua acima', () => {
    const ruim = `${PRODUCT_SELECT}, categories(slug)`
    expect(/(^|[^_])\bcategories\(/.test(ruim.replace(SEM_VINCULO, ''))).toBe(true)
  })

  it('segue trazendo o que o mapper lê', () => {
    for (const parte of [
      'product_variants(*)',
      // feature 61: a categoria embutida no vínculo — o `item_category` do GA4 sai dela.
      'product_categories(category_id, position, categories(slug, sort_order, active))',
    ]) {
      expect(PRODUCT_SELECT).toContain(parte)
    }
  })
})
