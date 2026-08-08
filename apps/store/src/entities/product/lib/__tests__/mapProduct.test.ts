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

describe('PRODUCT_SELECT', () => {
  it('nomeia a FK ao embutir categories, senão o PostgREST devolve 300 PGRST201', () => {
    expect(PRODUCT_SELECT).toContain('categories!products_category_id_fkey(')
  })

  it('não embute categories de forma ambígua', () => {
    // `product_categories(` é legítimo (tabela própria); o proibido é `categories(` sem a FK.
    const ambiguo = /(^|[^_])\bcategories\(/.test(PRODUCT_SELECT)
    expect(ambiguo).toBe(false)
  })

  it('segue trazendo o que o mapper lê', () => {
    for (const parte of ['product_variants(*)', 'product_categories(category_id, position)']) {
      expect(PRODUCT_SELECT).toContain(parte)
    }
  })
})
