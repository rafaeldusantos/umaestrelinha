import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DEFAULT_HOME_COMPOSITION } from '@estrelinha/core/home'

/**
 * `HOME-07` — a leitura das seções **nunca deixa a Home em branco**.
 *
 * O que se prova aqui é o piso, e ele tem **duas** entradas: a consulta que erra e a que volta
 * vazia. As duas precisam entregar `DEFAULT_HOME_COMPOSITION` — devolver `[]` em qualquer uma
 * delas apagaria a Home inteira sem que nada quebrasse, que é a classe de falha desta feature.
 *
 * **Eram três até 2026-09-21**, e a terceira (o instante antes de qualquer resposta) foi
 * INVERTIDA, não apagada — ver o caso no fim do arquivo. `HOME-07` fala de leitura que **falha**
 * (`spec.md`, AC 7); pintar o piso enquanto a leitura está em curso era escopo além da AC, e
 * virou defeito quando a feature `41` revogou a premissa que o sustentava.
 */

const { fromMock, selectMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useHomeSections } from '../useHomeSections'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const linhaDoBanco = (over: Record<string, unknown> = {}) => ({
  id: 'sec-1',
  type: 'banner_grid',
  position: 3,
  active: true,
  config: { layout: 'hero_pair' },
  created_at: '2026-08-15T00:00:00Z',
  updated_at: '2026-08-15T00:00:00Z',
  ...over,
})

const itemDoBanco = (over: Record<string, unknown> = {}) => ({
  id: 'item-1',
  section_id: 'sec-1',
  position: 0,
  category_id: 'cat-1',
  product_id: null,
  href: null,
  image_url: 'https://cdn.test/campanha.webp',
  alt: 'Campanha de outono',
  label_snapshot: 'Prata 925',
  created_at: '2026-08-15T00:00:00Z',
  ...over,
})

const respondeCom = (data: unknown[] | null, error: unknown = null) => {
  selectMock.mockResolvedValue({ data, error })
}

const ler = async () => {
  const { result } = renderHook(() => useHomeSections(), { wrapper })
  await waitFor(() => expect(result.current.isFetching).toBe(false))
  return result
}

beforeEach(() => {
  fromMock.mockReset()
  selectMock.mockReset()
  fromMock.mockReturnValue({ select: selectMock })
  respondeCom([])
})

describe('useHomeSections — uma consulta só, com a curadoria embutida', () => {
  it('lê `home_sections` com a relação `items` na mesma ida', async () => {
    respondeCom([linhaDoBanco()])

    await ler()

    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('home_sections')
    expect(selectMock).toHaveBeenCalledTimes(1)
    // O slug do produto vem embutido na MESMA ida (emenda `E5`): a linha guarda o id, e
    // `/produtos/:slug` precisa do slug. Uma segunda consulta daria dois carregamentos numa página
    // só, e `useProducts()` baixaria o catálogo inteiro — o defeito que a feature 23 fechou.
    expect(selectMock).toHaveBeenCalledWith(
      '*, items:home_section_items(*, product:products(slug))',
    )
  })
})

describe('useHomeSections — o que o banco devolve chega mapeado', () => {
  it('devolve as seções do banco, com tipo, posição, estado e config', async () => {
    respondeCom([linhaDoBanco({ id: 'sec-hero', type: 'hero', position: 1, config: { eyebrow: 'Oi' } })])

    const result = await ler()

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0]).toMatchObject({
      id: 'sec-hero',
      type: 'hero',
      position: 1,
      active: true,
      config: { eyebrow: 'Oi' },
    })
  })

  it('o item curado chega com destino, arte e o rótulo congelado', async () => {
    respondeCom([linhaDoBanco({ items: [itemDoBanco()] })])

    const result = await ler()

    expect(result.current.data[0].items).toEqual([
      {
        id: 'item-1',
        section_id: 'sec-1',
        position: 0,
        category_id: 'cat-1',
        product_id: null,
        href: null,
        image_url: 'https://cdn.test/campanha.webp',
        image_mobile_url: null,
        alt: 'Campanha de outono',
        label_snapshot: 'Prata 925',
        product_slug: null,
      },
    ])
  })

  it('a arte de celular do item chega mapeada (BNR-21)', async () => {
    // Enumerar coluna a coluna é o que fez o telefone da cliente sumir do link de cobrança na
    // feature 35: a coluna gravada, o teste dela verde, e o mapper ignorando o campo. Este caso é o
    // sensor disso para a coluna nova.
    respondeCom([
      linhaDoBanco({
        items: [itemDoBanco({ image_mobile_url: 'https://cdn.test/campanha-celular.webp' })],
      }),
    ])

    const result = await ler()

    expect(result.current.data[0].items[0].image_mobile_url).toBe(
      'https://cdn.test/campanha-celular.webp',
    )
  })

  it('seção sem curadoria chega com a lista vazia — que é a derivação de hoje, não "sem conteúdo"', async () => {
    respondeCom([linhaDoBanco()])

    const result = await ler()

    expect(result.current.data[0].items).toEqual([])
  })

  it('tipo desconhecido chega inteiro: quem o pula é o renderizador, não a leitura', async () => {
    // Recusá-lo aqui tiraria da dona a única tela onde a linha pode ser removida.
    respondeCom([linhaDoBanco({ type: 'bloco_do_futuro' })])

    const result = await ler()

    expect(result.current.data[0].type).toBe('bloco_do_futuro')
  })
})

describe('useHomeSections — o piso semeado (HOME-07)', () => {
  const tiposDoPiso = DEFAULT_HOME_COMPOSITION.map(s => s.type)

  it('erro de leitura devolve a composição semeada, nunca `[]`', async () => {
    respondeCom(null, { message: 'permission denied for table home_sections' })

    const result = await ler()

    expect(result.current.data.map(s => s.type)).toEqual(tiposDoPiso)
    expect(result.current.data).toHaveLength(7)
  })

  it('lista vazia devolve o mesmo piso', async () => {
    respondeCom([])

    const result = await ler()

    expect(result.current.data.map(s => s.type)).toEqual(tiposDoPiso)
  })

  it('a PRIMEIRA pintura NÃO tem piso: "ainda não sei" é `undefined`, e quem desenha é o esqueleto', async () => {
    // **INVERTIDO, nunca apagado** — a doutrina da feature `41`: quando uma AC remove uma trava, o
    // teste que a defendia é invertido, senão a suíte fica verde a favor do estado removido.
    //
    // O que este caso defendia era `placeholderData: piso()`, que fazia a Home nascer com a
    // composição SEMEADA — hero ativo na posição 1 — em toda carga fria. Era verdade em 100% dos
    // bancos enquanto `guard_hero_home_section` existia; a `41` o derrubou (`AD-029`) para a dona
    // poder pôr o banner de campanha em cima. Com a "Chamada principal" DESLIGADA e o "Banner
    // principal" LIGADO, a cliente via a chamada semeada entrar, animar e sumir. O bloco vinha do
    // bundle, nunca do banco: a policy pública devolve só `active = true`.
    respondeCom([linhaDoBanco()])

    const { result } = renderHook(() => useHomeSections(), { wrapper })

    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(true)
    // O sensor do MECANISMO, e não só do sintoma: `placeholderData` (ou `initialData`) de volta
    // acende isto. É o que dispensa uma varredura de fonte, que casaria uma grafia só.
    expect(result.current.isPlaceholderData).toBe(false)

    await waitFor(() => expect(result.current.isFetching).toBe(false))

    // E o que chega depois é o BANCO, não o piso.
    expect(result.current.data.map(s => s.type)).toEqual(['banner_grid'])
  })

  it('o piso é uma CÓPIA — mutar o que a loja recebeu não contamina a constante', async () => {
    respondeCom([])

    const result = await ler()
    result.current.data[0].position = 99

    expect(DEFAULT_HOME_COMPOSITION[0].position).toBe(1)
  })
})

describe('useHomeSections — o slug do produto de destino (emenda E5)', () => {
  it('o slug embutido chega no item, para o banner de produto ter caminho canônico', async () => {
    respondeCom([
      linhaDoBanco({
        items: [
          itemDoBanco({
            category_id: null,
            product_id: 'prod-1',
            product: { slug: 'pingente-gota' },
          }),
        ],
      }),
    ])

    const result = await ler()

    expect(result.current.data[0].items[0]).toMatchObject({
      product_id: 'prod-1',
      product_slug: 'pingente-gota',
    })
  })

  it('produto despublicado volta sem a relação, e o slug cai em `null` — é a RLS decidindo', async () => {
    // Medido em probe contra o banco local: produto com `is_active = false` devolve
    // `{"product": null}` com o `product_id` intacto. "Saiu do ar" é resposta do banco, não filtro
    // do cliente — que é como `HOME-24` tem de funcionar.
    respondeCom([
      linhaDoBanco({
        items: [itemDoBanco({ category_id: null, product_id: 'prod-1', product: null })],
      }),
    ])

    const result = await ler()

    expect(result.current.data[0].items[0]).toMatchObject({
      product_id: 'prod-1',
      product_slug: null,
    })
  })
})
