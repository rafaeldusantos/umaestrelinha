// Feature 22 / T7 — a gravação dentro do estado de compra que já é único (MAT-03, MAT-04).
//
// O ponto que este arquivo congela: `engravingEnabled` deriva da **variação escolhida**, não do
// produto. O mesmo produto tem linhas `Com gravação: Sim` e `Não` — 626 variações no catálogo real,
// em 35 produtos —, e perguntar ao produto mostraria o campo para quem escolheu a linha que não
// grava, levando o texto para o pedido.

import { act, render, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useProductPurchase } from '../useProductPurchase'

const toastError = vi.hoisted(() => vi.fn())
/** O aviso de "adicionado ao carrinho" tem foto — e `PRF-02` pede que ela venha em rendição. */
const toastCustom = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { error: toastError, custom: toastCustom } }))

const variante = (over: Partial<ProductVariant>): ProductVariant =>
  ({
    id: 'v1', product_id: 'p1', option_values: {}, name: null, sku: null,
    price: 100, compare_price: null, stock: 5, weight_kg: null, image_url: null,
    is_active: true, position: 0,
    ...over,
  }) as ProductVariant

/** Um produto com o eixo real do catálogo: `Com gravação` com `Sim` e `Não`. */
const comGravacao = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1', name: 'Pingente com cinzas', slug: 'pingente', price: 100, compare_price: null,
    category_id: 'c1', category_slug: 'joias', description: '', image_url: '', images: [],
    stock_total: 10, low_stock_threshold: 5, is_new: false, is_featured: false, tags: [],
    stock_policy: 'track', category_links: [],
    options: [{ name: 'Com gravação', values: ['Sim', 'Não'], position: 0 }],
    variants: [
      variante({ id: 'v-sim', option_values: { 'Com gravação': 'Sim' }, price: 142 }),
      variante({ id: 'v-nao', option_values: { 'Com gravação': 'Não' }, price: 100 }),
    ],
    ...over,
  }) as Product

/** Produto simples: nenhum dos 654 do catálogo sem o eixo pode regredir por causa desta feature. */
const semGravacao = (): Product =>
  ({
    id: 'p2', name: 'Corrente de prata', slug: 'corrente', price: 80, compare_price: null,
    category_id: 'c1', category_slug: 'joias', description: '', image_url: '', images: [],
    stock_total: 10, low_stock_threshold: 5, is_new: false, is_featured: false, tags: [],
    stock_policy: 'track', category_links: [], options: [], variants: [],
  }) as Product

beforeEach(() => {
  useCartStore.setState({ items: [] })
  localStorage.clear()
  toastError.mockClear()
  toastCustom.mockClear()
})

describe('gravação — deriva da variação escolhida (MAT-03)', () => {
  it('a variação `Sim` habilita o campo', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Sim' }))

    expect(result.current.engravingEnabled).toBe(true)
  })

  it('a variação `Não` NÃO habilita', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Não' }))

    expect(result.current.engravingEnabled).toBe(false)
  })

  it('produto sem o eixo nunca habilita, e o `canAdd` dele não muda de resultado', () => {
    const { result } = renderHook(() => useProductPurchase(semGravacao()))

    expect(result.current.engravingEnabled).toBe(false)
    expect(result.current.canAdd).toBe(true)
    expect(result.current.engravingRefusal).toBeNull()
  })

  it('trocar de `Sim` para `Não` LIMPA o texto', () => {
    // Sem isto, quem digitou "Ana" e depois escolheu a linha que não grava levaria o texto para o
    // pedido — e a Adri gravaria o que a cliente desistiu de pedir. O campo some da tela; o estado
    // não pode sobreviver a ele.
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Sim' }))
    act(() => result.current.setEngraving('Ana'))
    expect(result.current.engraving).toBe('Ana')

    act(() => result.current.select({ 'Com gravação': 'Não' }))

    expect(result.current.engraving).toBe('')
  })
})

describe('gravação — o limite vem do cadastro daquele produto (MAT-03)', () => {
  it('sem limite declarado, vale o default de 20', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    expect(result.current.engravingLimit).toBe(20)
  })

  it('o limite do produto vence o default', () => {
    const { result } = renderHook(() =>
      useProductPurchase(comGravacao({ engraving_max_chars: 35 })),
    )
    expect(result.current.engravingLimit).toBe(35)
  })

  it('acima do limite: recusa com motivo e `canAdd` falso', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Sim' }))
    act(() => result.current.setEngraving('a'.repeat(21)))

    expect(result.current.engravingRefusal).toContain('21')
    expect(result.current.canAdd).toBe(false)
  })

  it('no limite exato: aceita', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Sim' }))
    act(() => result.current.setEngraving('a'.repeat(20)))

    expect(result.current.engravingRefusal).toBeNull()
    expect(result.current.canAdd).toBe(true)
  })

  it('texto pendurado numa variação que não grava NÃO recusa', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Não' }))
    act(() => result.current.setEngraving('a'.repeat(50)))

    expect(result.current.engravingRefusal).toBeNull()
    expect(result.current.canAdd).toBe(true)
  })
})

describe('adicionar ao carrinho com gravação (MAT-03, MAT-04)', () => {
  it('leva o texto normalizado para o item', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Sim' }))
    act(() => result.current.setEngraving('  Ana  '))
    act(() => result.current.add())

    expect(useCartStore.getState().items[0].engravingText).toBe('Ana')
  })

  it('texto só de espaços vira `null` — não cria linha separada', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Sim' }))
    act(() => result.current.setEngraving('   '))
    act(() => result.current.add())

    expect(useCartStore.getState().items[0].engravingText).toBeNull()
  })

  it('acima do limite NÃO adiciona, e o motivo é o da gravação — não "indisponível"', () => {
    // Dizer "essa combinação está indisponível" para quem só passou do limite manda a cliente
    // procurar o defeito no lugar errado.
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Sim' }))
    act(() => result.current.setEngraving('a'.repeat(30)))
    act(() => result.current.add())

    expect(useCartStore.getState().items).toHaveLength(0)
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('30'))
  })

  it('o preço do item é o da VARIAÇÃO — a gravação cobra pelo caminho que já existia (MAT-06)', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Sim' }))
    act(() => result.current.add())

    expect(useCartStore.getState().items[0].unitPrice).toBe(142)
  })

  it('a variação sem gravação cobra o preço dela — nenhum acréscimo inventado no front', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Não' }))
    act(() => result.current.add())

    expect(useCartStore.getState().items[0].unitPrice).toBe(100)
  })

  it('duas gravações diferentes viram duas linhas', () => {
    const { result } = renderHook(() => useProductPurchase(comGravacao()))
    act(() => result.current.select({ 'Com gravação': 'Sim' }))
    act(() => result.current.setEngraving('Ana'))
    act(() => result.current.add())
    act(() => result.current.setEngraving('Léo'))
    act(() => result.current.add())

    expect(useCartStore.getState().items).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------------------------
// Feature 30 · GSH-10 — a variação anunciada na Google Shopping abre selecionada
// ---------------------------------------------------------------------------------------------

describe('useProductPurchase — semente vinda do ?variant=', () => {
  const grade = (): Product =>
    ({
      id: 'p1', name: 'Pulseira', slug: 'pulseira', price: 19.9, compare_price: null,
      category_id: 'c1', category_slug: 'joias', description: '', image_url: '', images: [],
      stock_total: 10, low_stock_threshold: 5, is_new: false, is_featured: false, tags: [],
      stock_policy: 'track', category_links: [],
      options: [{ name: 'Tamanho', values: ['P', 'G'], position: 0 }],
      variants: [
        variante({ id: 'v-p', option_values: { Tamanho: 'P' }, price: 19.9, position: 0 }),
        variante({ id: 'v-g', option_values: { Tamanho: 'G' }, price: 24.9, position: 1 }),
      ],
    }) as Product

  it('com initialVariant, abre naquela linha e naquele preço', () => {
    const p = grade()
    const { result } = renderHook(() => useProductPurchase(p, undefined, p.variants[1]))
    expect(result.current.selected).toEqual({ Tamanho: 'G' })
    expect(result.current.variant?.id).toBe('v-g')
    expect(result.current.price).toBe(24.9)
  })

  it('SEM initialVariant, o comportamento é exatamente o de antes', () => {
    const p = grade()
    const { result } = renderHook(() => useProductPurchase(p))
    expect(result.current.selected).toEqual({ Tamanho: 'P' })
    expect(result.current.price).toBe(19.9)
  })

  it('initialVariant null cai na seleção padrão, sem erro', () => {
    const p = grade()
    const { result } = renderHook(() => useProductPurchase(p, undefined, null))
    expect(result.current.selected).toEqual({ Tamanho: 'P' })
  })

  it('linha que não cobre os eixos cai na seleção padrão', () => {
    const p = grade()
    const solta = variante({ id: 'v-x', option_values: {}, price: 999 })
    const { result } = renderHook(() => useProductPurchase(p, undefined, solta))
    expect(result.current.selected).toEqual({ Tamanho: 'P' })
    expect(result.current.price).toBe(19.9)
  })

  it('produto simples ignora o initialVariant sem efeito', () => {
    const p = grade()
    const simples = { ...p, options: [], variants: [] } as Product
    const { result } = renderHook(() => useProductPurchase(simples, undefined, p.variants[1]))
    expect(result.current.variant).toBeNull()
    expect(result.current.price).toBe(19.9)
  })

  it('a semente não trava a escolha: trocar de eixo continua funcionando', () => {
    const p = grade()
    const { result } = renderHook(() => useProductPurchase(p, undefined, p.variants[1]))
    act(() => result.current.select({ Tamanho: 'P' }))
    expect(result.current.variant?.id).toBe('v-p')
    expect(result.current.price).toBe(19.9)
  })
})

/**
 * `PRF-02` (AC 5) — o aviso de "adicionado ao carrinho" também pede rendição.
 *
 * A vaga tem 48px e o aviso aparece a cada clique em "adicionar". É a superfície mais fácil de
 * esquecer, porque ela nasce de um `toast.custom` e não de uma tela — e era exatamente por isso que
 * ela servia o original de 1024px.
 */
describe('o aviso de "adicionado ao carrinho" pede a foto do tamanho da vaga (PRF-02 AC 5)', () => {
  const STORAGE =
    'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pingente.webp'

  /** O `toast.custom` recebe uma FUNÇÃO que devolve o elemento — é ela que se desenha aqui. */
  const avisoDesenhado = () => {
    const [desenhar] = toastCustom.mock.calls[0] as [() => JSX.Element]
    return render(desenhar()).container
  }

  it('busca a rendição de 160, e não o objeto original', () => {
    const { result } = renderHook(() => useProductPurchase({ ...semGravacao(), image_url: STORAGE }))
    act(() => result.current.add())

    const foto = avisoDesenhado().querySelector('img')
    expect(foto?.getAttribute('src')).toContain('/render/image/public/')
    expect(foto?.getAttribute('src')).toContain('width=160')
    expect(foto?.getAttribute('src')).not.toContain('/object/public/')
  })
})
