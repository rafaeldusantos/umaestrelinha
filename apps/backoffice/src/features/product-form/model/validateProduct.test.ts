import { describe, expect, it } from 'vitest'
import {
  errorsByTab,
  firstErrorOfTab,
  hasBlockingErrors,
  validateProduct,
  type FieldIssue,
} from './validateProduct'
import { emptyProductForm, type ProductFormState } from './useProductForm'
import type { ProductVariant } from '@nanapin/supabase/types'

// PFM-11: "WHEN o admin salva com um campo obrigatório inválido em uma aba FECHADA THEN o sistema
// SHALL bloquear o save e SHALL exibir o erro — SHALL não depender do `required` do input".
//
// Todo teste aqui chama a função pura direto, com o formulário inteiro. É exatamente a condição da
// AC: nenhuma aba está montada, e a validação funciona igual.

const form = (over: Partial<ProductFormState> = {}): ProductFormState => ({
  ...emptyProductForm(),
  name: 'Botton Sailor Moon',
  price: 5.9,
  ...over,
})

let seq = 0
const variant = (over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm' },
  name: null,
  sku: null,
  price: 5.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

const TAMANHO = { name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }

const fields = (issues: FieldIssue[]) => issues.map(i => i.field)

describe('validateProduct — nome (aba Geral)', () => {
  it('nome vazio é erro na aba geral', () => {
    const issues = validateProduct(form({ name: '' }))
    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'name', tab: 'geral', severity: 'error' }),
    )
  })

  it('nome só com espaços também é erro — não é nome', () => {
    expect(fields(validateProduct(form({ name: '   ' })))).toContain('name')
  })

  it('nome preenchido não gera erro', () => {
    expect(fields(validateProduct(form()))).not.toContain('name')
  })
})

describe('validateProduct — preço com a aba Preços FECHADA (PFM-11 AC 1)', () => {
  it('preço 0 sem grade é erro na aba precos — detectado sem a aba existir', () => {
    const issues = validateProduct(form({ price: 0 }))
    expect(issues).toContainEqual(
      expect.objectContaining({ field: 'price', tab: 'precos', severity: 'error' }),
    )
  })

  it('preço negativo é erro', () => {
    expect(fields(validateProduct(form({ price: -1 })))).toContain('price')
  })

  it('preço positivo sem grade não gera erro', () => {
    expect(fields(validateProduct(form({ price: 5.9 })))).not.toContain('price')
  })

  it('preço 0 COM grade vendável não é erro — o trigger mantém base_price (A14)', () => {
    const issues = validateProduct(
      form({ price: 0, options: [TAMANHO], variants: [variant({ price: 7.9, is_active: true })] }),
    )
    expect(fields(issues)).not.toContain('price')
  })

  it('preço 0 com grade toda PAUSADA volta a ser erro — não há linha que cobre', () => {
    const issues = validateProduct(
      form({ price: 0, options: [TAMANHO], variants: [variant({ price: 7.9, is_active: false })] }),
    )
    expect(fields(issues)).toContain('price')
  })

  it('preço 0 com variação ativa e options VAZIO é erro — sem eixo a loja trata como simples', () => {
    const issues = validateProduct(
      form({ price: 0, options: [], variants: [variant({ price: 7.9, is_active: true })] }),
    )
    expect(fields(issues)).toContain('price')
  })
})

describe('validateProduct — preço "de" (aviso, não erro)', () => {
  it('preço "de" igual ao de venda é AVISO', () => {
    const issue = validateProduct(form({ price: 5.9, compare_price: 5.9 })).find(
      i => i.field === 'compare_price',
    )
    expect(issue?.severity).toBe('warning')
  })

  it('preço "de" menor que o de venda é AVISO — a vitrine mostraria desconto negativo', () => {
    const issue = validateProduct(form({ price: 9.9, compare_price: 5.9 })).find(
      i => i.field === 'compare_price',
    )
    expect(issue?.severity).toBe('warning')
  })

  it('preço "de" maior que o de venda não gera nada', () => {
    expect(fields(validateProduct(form({ price: 5.9, compare_price: 9.9 })))).not.toContain(
      'compare_price',
    )
  })

  it('preço "de" zerado (sem promoção) não gera nada', () => {
    expect(fields(validateProduct(form({ price: 5.9, compare_price: 0 })))).not.toContain(
      'compare_price',
    )
  })

  it('o aviso NÃO bloqueia o save', () => {
    const issues = validateProduct(form({ price: 5.9, compare_price: 5.9 }))
    expect(hasBlockingErrors(issues)).toBe(false)
  })
})

describe('validateProduct — variação sem preço (PFM-08 AC 11)', () => {
  it('variação ATIVA sem preço é erro, apontando a linha', () => {
    const issues = validateProduct(
      form({ options: [TAMANHO], variants: [variant({ price: 7.9 }), variant({ price: null })] }),
    )
    expect(issues).toContainEqual(
      expect.objectContaining({
        field: 'variants.1.price',
        tab: 'precos',
        severity: 'error',
        rows: [1],
      }),
    )
  })

  it('variação PAUSADA sem preço NÃO é erro — pausar é como o admin tira da loja', () => {
    const issues = validateProduct(
      form({ options: [TAMANHO], variants: [variant({ price: null, is_active: false })] }),
    )
    expect(issues.some(i => i.field.endsWith('.price') && i.severity === 'error')).toBe(false)
  })

  it('variação ativa com preço 0 não é "sem preço" — 0 é um preço declarado', () => {
    const issues = validateProduct(
      form({ options: [TAMANHO], variants: [variant({ price: 0 })] }),
    )
    expect(fields(issues)).not.toContain('variants.0.price')
  })

  it('a mensagem é a do desenho, para o admin saber a consequência', () => {
    const issues = validateProduct(form({ options: [TAMANHO], variants: [variant({ price: null })] }))
    expect(issues.find(i => i.field === 'variants.0.price')?.message).toBe(
      'Sem preço a variação não entra na loja.',
    )
  })
})

describe('validateProduct — SKU duplicado (edge case da spec)', () => {
  it('duas linhas com o mesmo SKU viram erro apontando AS DUAS', () => {
    const issues = validateProduct(
      form({
        options: [TAMANHO],
        variants: [variant({ sku: 'SLR-45' }), variant({ sku: 'SLR-35' }), variant({ sku: 'SLR-45' })],
      }),
    )
    const dup = issues.find(i => i.field.endsWith('.sku'))
    expect(dup?.rows).toEqual([0, 2])
    expect(dup?.severity).toBe('error')
    expect(dup?.message).toContain('SLR-45')
  })

  it('três linhas com o mesmo SKU apontam as três', () => {
    const issues = validateProduct(
      form({
        options: [TAMANHO],
        variants: [variant({ sku: 'X' }), variant({ sku: 'X' }), variant({ sku: 'X' })],
      }),
    )
    expect(issues.find(i => i.field.endsWith('.sku'))?.rows).toEqual([0, 1, 2])
  })

  it('SKU vazio ou só espaços não conta como duplicata — é o "sem SKU" de várias linhas', () => {
    const issues = validateProduct(
      form({
        options: [TAMANHO],
        variants: [variant({ sku: '' }), variant({ sku: null }), variant({ sku: '  ' })],
      }),
    )
    expect(issues.some(i => i.field.endsWith('.sku'))).toBe(false)
  })

  it('SKUs distintos não geram erro', () => {
    const issues = validateProduct(
      form({ options: [TAMANHO], variants: [variant({ sku: 'A' }), variant({ sku: 'B' })] }),
    )
    expect(issues.some(i => i.field.endsWith('.sku'))).toBe(false)
  })
})

describe('errorsByTab — badge de pendência (PFM-11 AC 2)', () => {
  it('conta erros por aba e deixa as abas sem erro em 0', () => {
    const counts = errorsByTab(validateProduct(form({ name: '', price: 0 })))
    expect(counts).toEqual({ geral: 1, midia: 0, precos: 1, seo: 0, relacionados: 0 })
  })

  it('formulário válido deixa todas as abas em 0', () => {
    expect(errorsByTab(validateProduct(form()))).toEqual({
      geral: 0,
      midia: 0,
      precos: 0,
      seo: 0,
      relacionados: 0,
    })
  })

  it('aviso NÃO entra na contagem do badge', () => {
    const counts = errorsByTab(validateProduct(form({ compare_price: 5.9, price: 5.9 })))
    expect(counts.precos).toBe(0)
  })

  it('duas linhas de grade sem preço contam 2 na aba precos', () => {
    const counts = errorsByTab(
      validateProduct(
        form({ options: [TAMANHO], variants: [variant({ price: null }), variant({ price: null })] }),
      ),
    )
    expect(counts.precos).toBe(2)
  })
})

describe('hasBlockingErrors / firstErrorOfTab', () => {
  it('formulário válido não bloqueia', () => {
    expect(hasBlockingErrors(validateProduct(form()))).toBe(false)
  })

  it('um erro qualquer bloqueia', () => {
    expect(hasBlockingErrors(validateProduct(form({ name: '' })))).toBe(true)
  })

  it('firstErrorOfTab devolve o primeiro erro da aba, para onde o clique no badge foca', () => {
    const issues = validateProduct(form({ name: '', price: 0 }))
    expect(firstErrorOfTab(issues, 'precos')?.field).toBe('price')
    expect(firstErrorOfTab(issues, 'geral')?.field).toBe('name')
  })

  it('firstErrorOfTab ignora aviso — o badge não leva a um campo que não bloqueia', () => {
    const issues = validateProduct(form({ compare_price: 5.9, price: 5.9 }))
    expect(firstErrorOfTab(issues, 'precos')).toBeNull()
  })

  it('firstErrorOfTab devolve null para aba sem pendência', () => {
    expect(firstErrorOfTab(validateProduct(form({ name: '' })), 'seo')).toBeNull()
  })
})
