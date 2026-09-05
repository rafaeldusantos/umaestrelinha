import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// SHP-02: o mapper de produto precisa carregar `weight_kg`/`width_cm`/`height_cm`/`length_cm`.
// Sem eles a cotação "real" sairia sempre com os fallbacks 11/2/16/0.1 — frete errado com cara
// de certo.

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import {
  LISTING_LIMIT,
  useAllProducts,
  useFeaturedProducts,
  useNewProducts,
  useProducts,
} from '../useProducts'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Um builder do PostgREST de mentira — **encadeável e thenable**.
 *
 * `select()` deixou de ser o fim da cadeia quando as listagens passaram a declarar ordenação e teto
 * (`PRF-09`): agora vem `.order().order().limit()`, e na categoria um `.in()` antes. Um mock que
 * devolvesse a Promise direto do `select` quebraria na primeira chamada encadeada.
 *
 * Nenhuma asserção deste arquivo mudou — o que mudou é a FORMA do dublê, que passou a ter os
 * mesmos métodos que o código sob teste chama. E o dublê registra a janela pedida, para os testes
 * de `PRF-09` poderem prová-la.
 */
interface JanelaPedida {
  order: { column: string; ascending: boolean }[]
  limit: number | null
}

const criarBuilder = (
  resolver: () => { data: unknown; error: unknown },
  hooks: { onIn?: (column: string, values: string[]) => void } = {},
) => {
  const janela: JanelaPedida = { order: [], limit: null }
  const q: any = {
    order: (column: string, options?: { ascending?: boolean }) => {
      janela.order.push({ column, ascending: options?.ascending !== false })
      return q
    },
    limit: (count: number) => {
      janela.limit = count
      return q
    },
    eq: () => q,
    in: (column: string, values: string[]) => {
      hooks.onIn?.(column, values)
      return q
    },
    then: (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
      Promise.resolve(resolver()).then(onOk, onErr),
  }
  q.janela = janela
  return q
}

const dbRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'prod-1',
  name: 'Botton Sakura',
  slug: 'botton-sakura',
  base_price: 12.9,
  category_id: 'cat-1',
  categories: { slug: 'anime', name: 'Anime' },
  images: [],
  stock: 10,
  weight_kg: 0.85,
  width_cm: 25,
  height_cm: 7,
  length_cm: 30,
  ...overrides,
})

const respondWith = (rows: unknown[]) => {
  const q = criarBuilder(() => ({ data: rows, error: null }))
  fromMock.mockReturnValue({ select: () => q })
  return { janela: () => q.janela as JanelaPedida }
}

/**
 * A árvore que o banco tem de verdade: guarda-chuva "Bottons" com os universos dentro, e "Naruto"
 * dentro de "Anime". É ela que expõe o roll-up — `cat-anime` tem uma NETA.
 */
const TREE = [
  { id: 'cat-bottons', parent_id: null, slug: 'bottons' },
  { id: 'cat-anime', parent_id: 'cat-bottons', slug: 'anime' },
  { id: 'cat-kpop', parent_id: 'cat-bottons', slug: 'kpop' },
  { id: 'cat-naruto', parent_id: 'cat-anime', slug: 'naruto' },
]

/**
 * Encena as três leituras da variante com `categorySlug`: árvore → vínculos → produtos.
 *
 * `linksByCategory` mapeia categoria → produtos vinculados **a ela**, para o teste poder pôr um
 * produto só na filha e provar que ele aparece na página do pai.
 */
const respondForCategory = (
  linksByCategory: Record<string, string[]>,
  rows: unknown[],
  tree = TREE,
) => {
  const filtroSpy = vi.fn()
  let categoriesSelects = 0
  let productSelects = 0
  let galho: string[] = []
  let produtos: any = null

  fromMock.mockImplementation((table: string) => {
    if (table === 'categories') {
      categoriesSelects += 1
      // A árvore não passa por `listingWindow`: são duas colunas de `categories`, não listagem.
      return { select: () => Promise.resolve({ data: tree, error: null }) }
    }
    // `product_categories` NÃO é mais consultada em separado: o filtro roda dentro da consulta de
    // produto, por embed aliased. Se alguém voltar a consultá-la, o teste de N+1 acusa.
    productSelects += 1
    produtos = criarBuilder(
      () => {
        // Encena o servidor: devolve os produtos vinculados a qualquer categoria do galho, sem
        // repetir — que é o que o inner join do PostgREST faz.
        const ids = [...new Set(galho.flatMap(id => linksByCategory[id] ?? []))]
        return { data: ids.length > 0 ? rows : [], error: null }
      },
      {
        onIn: (column, values) => {
          filtroSpy(column, values)
          galho = values
        },
      },
    )
    return { select: () => produtos }
  })
  return {
    filtroSpy,
    /** O galho de categorias enviado ao servidor — o que de fato viaja na URL. */
    galhoEnviado: () => filtroSpy.mock.calls[0]?.[1] as string[] | undefined,
    counts: () => ({ categoriesSelects, productSelects }),
    /** A ordenação e o teto que a consulta de produtos declarou (`PRF-09`). */
    janela: () => produtos?.janela as JanelaPedida | undefined,
  }
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

beforeEach(() => {
  fromMock.mockReset()
})

describe('useProducts — dimensões do produto (SHP-02)', () => {
  it('mapeia weight_kg, width_cm, height_cm e length_cm com os valores do banco', async () => {
    respondWith([dbRow()])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.weight_kg).toBe(0.85)
    expect(mapped.width_cm).toBe(25)
    expect(mapped.height_cm).toBe(7)
    expect(mapped.length_cm).toBe(30)
  })

  it('colunas nulas viram undefined, para o fallback por item de toQuotePayload valer', async () => {
    respondWith([dbRow({ weight_kg: null, width_cm: null, height_cm: null, length_cm: null })])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.weight_kg).toBeUndefined()
    expect(mapped.width_cm).toBeUndefined()
    expect(mapped.height_cm).toBeUndefined()
    expect(mapped.length_cm).toBeUndefined()
  })
})

// VAR-11 AC 2: `products.images` é `jsonb [{url, alt, source}]` desde a migration 20260801120200.
// O mapper passa a normalizar em vez de assumir `string[]`.
describe('useProducts — leitura de images (VAR-11)', () => {
  it('mapeia o jsonb do banco preservando url, alt e source', async () => {
    respondWith([
      dbRow({ images: [{ url: 'sailor.webp', alt: 'Botton da Lua', source: 'mockup' }] }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.images).toEqual([{ url: 'sailor.webp', alt: 'Botton da Lua', source: 'mockup' }])
  })

  it('image_url é a url da primeira imagem — não o objeto', async () => {
    respondWith([
      dbRow({
        images: [
          { url: 'primeira.webp', alt: null, source: 'upload' },
          { url: 'segunda.webp', alt: null, source: 'upload' },
        ],
      }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].image_url).toBe('primeira.webp')
  })

  it('ainda aceita string[] — a ordem de deploy entre banco e bundle não pode importar (AC 1)', async () => {
    respondWith([dbRow({ images: ['legado.webp'] })])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.images).toEqual([{ url: 'legado.webp', alt: null, source: 'upload' }])
    expect(mapped.image_url).toBe('legado.webp')
  })

  it('produto sem imagem: lista vazia e image_url string vazia, nunca undefined (AC 3)', async () => {
    respondWith([dbRow({ images: null })])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.images).toEqual([])
    expect(mapped.image_url).toBe('')
  })
})

// PST-05: a loja passa a receber `options` e `product_variants` junto do produto — sem eles não há
// como saber qual variação o cliente escolheu.
describe('useProducts — grade do produto (PST-05)', () => {
  it('mapeia options e as variações da tabela product_variants', async () => {
    respondWith([
      dbRow({
        stock_policy: 'backorder',
        options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }],
        product_variants: [
          {
            id: 'v1',
            product_id: 'prod-1',
            option_values: { Tamanho: '4,5 cm' },
            price: 7.9,
            stock: 3,
            is_active: true,
            position: 1,
          },
        ],
      }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.options).toEqual([{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }])
    expect(mapped.stock_policy).toBe('backorder')
    expect(mapped.variants).toHaveLength(1)
    expect(mapped.variants[0]).toMatchObject({
      id: 'v1',
      option_values: { Tamanho: '4,5 cm' },
      price: 7.9,
      stock: 3,
      is_active: true,
      position: 1,
    })
  })

  it('variação sem is_active legível nasce PAUSADA — não entra na loja por omissão', async () => {
    respondWith([
      dbRow({
        options: [{ name: 'Tamanho', values: ['4,5 cm'], position: 0 }],
        product_variants: [{ id: 'v1', option_values: { Tamanho: '4,5 cm' }, price: 7.9 }],
      }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].variants[0].is_active).toBe(false)
  })

  it('variação sem id é descartada — viraria um item que o create-payment recusa com 422', async () => {
    respondWith([
      dbRow({ product_variants: [{ option_values: { Tamanho: '4,5 cm' }, price: 7.9 }] }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].variants).toEqual([])
  })

  it('eixo sem valores é descartado e stock_policy desconhecida cai em track', async () => {
    respondWith([
      dbRow({
        stock_policy: 'sei-la',
        options: [
          { name: 'Tamanho', values: [], position: 0 },
          { name: 'Cor', values: ['Rosa'], position: 1 },
        ],
      }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.options.map(o => o.name)).toEqual(['Cor'])
    expect(mapped.stock_policy).toBe('track')
  })

  it('produto sem grade: options e variants vazios, nunca undefined', async () => {
    respondWith([dbRow({ options: null, product_variants: null })])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.options).toEqual([])
    expect(mapped.variants).toEqual([])
  })

  it('mapeia os vínculos N:N de product_categories com a position de cada um (PST-06)', async () => {
    respondWith([
      dbRow({
        product_categories: [
          { category_id: 'cat-anime', position: 0 },
          { category_id: 'cat-kpop', position: 1 },
        ],
      }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].category_links).toEqual([
      { category_id: 'cat-anime', position: 0 },
      { category_id: 'cat-kpop', position: 1 },
    ])
  })
})

// PST-06 AC 4: "a página de coleção SHALL consultar `product_categories` — SHALL deixar de filtrar
// por `.eq('category_id')`". A prova é na CHAMADA: é o filtro que decide se um produto em 3
// categorias aparece nas 3 páginas.
describe('useProducts — filtro por categoria N:N (PST-06 AC 4)', () => {
  it('filtra no SERVIDOR pela categoria, por embed aliased de product_categories', async () => {
    const { filtroSpy } = respondForCategory({ 'cat-anime': ['prod-1', 'prod-9'] }, [dbRow()])

    const { result } = renderHook(() => useProducts('anime'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(filtroSpy).toHaveBeenCalledWith('filtro.category_id', expect.arrayContaining(['cat-anime']))
    expect(result.current.data).toHaveLength(1)
  })

  it('BUG-20260809: o que viaja na URL e a arvore de CATEGORIAS, nunca a lista de produtos', async () => {
    /*
     * A regressao que derrubou a maior categoria da loja, congelada.
     *
     * A implementacao anterior buscava os `product_id` do galho e os mandava de volta num
     * `.in('id', [...])`. Com 508 produtos a URL passou de 14.000 caracteres e o gateway recusou —
     * a pagina mostrava "0 produtos encontrados", sem erro. O tamanho do que viaja tem de depender
     * da PROFUNDIDADE da arvore, nao do tamanho do catalogo.
     */
    const { filtroSpy, galhoEnviado } = respondForCategory(
      { 'cat-anime': Array.from({ length: 500 }, (_, i) => `prod-${i}`) },
      [dbRow()],
    )

    const { result } = renderHook(() => useProducts('anime'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    for (const [coluna] of filtroSpy.mock.calls) {
      expect(coluna, 'nenhum filtro pode ser por id de produto').not.toBe('id')
    }
    // 500 produtos na categoria, e o que sobe sao 2 ids de categoria (`anime` + a neta `naruto`).
    expect(galhoEnviado()!.length).toBeLessThanOrEqual(4)
    expect(galhoEnviado()).toEqual(expect.arrayContaining(['cat-anime']))
  })

  it('o mesmo produto aparece em outra categoria — o vínculo é que decide, não products.category_id', async () => {
    // `dbRow` tem `category_id: 'cat-1'`; a página é da 'cat-anime'. Sob o filtro antigo
    // (`.eq('category_id')`) este produto não apareceria aqui.
    respondForCategory({ 'cat-anime': ['prod-1'] }, [dbRow({ category_id: 'cat-1' })])

    const { result } = renderHook(() => useProducts('anime'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.map(p => p.id)).toEqual(['prod-1'])
  })

  it('categoria sem nenhum vínculo devolve lista vazia', async () => {
    respondForCategory({}, [dbRow()])

    const { result } = renderHook(() => useProducts('anime'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  // MENU-03 — o roll-up da descendência.
  describe('roll-up da descendência (MENU-03)', () => {
    it('a página do universo inclui os produtos das filhas E das netas', async () => {
      // Nada vinculado a "Bottons" diretamente: tudo mora nas filhas e netas. Sob o filtro antigo
      // (`.eq('category_id', 'cat-bottons')`) esta página vinha VAZIA — era o bug real, em que
      // `/colecao/bottons` listava 4 produtos num catálogo de 32.
      const { galhoEnviado } = respondForCategory(
        { 'cat-anime': ['prod-anime'], 'cat-naruto': ['prod-naruto'], 'cat-kpop': ['prod-kpop'] },
        [dbRow()],
      )

      const { result } = renderHook(() => useProducts('bottons'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(galhoEnviado()).toEqual(
        expect.arrayContaining(['cat-bottons', 'cat-anime', 'cat-kpop', 'cat-naruto']),
      )
    })

    it('folha continua idêntica ao comportamento anterior — só o próprio id', async () => {
      const { filtroSpy } = respondForCategory({ 'cat-naruto': ['prod-naruto'] }, [dbRow()])

      const { result } = renderHook(() => useProducts('naruto'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(filtroSpy).toHaveBeenCalledWith('filtro.category_id', ['cat-naruto'])
    })

    it('produto vinculado ao pai E à filha entra UMA vez só', async () => {
      respondForCategory(
        { 'cat-anime': ['prod-dupla'], 'cat-naruto': ['prod-dupla'] },
        [dbRow({ id: 'prod-dupla' })],
      )

      const { result } = renderHook(() => useProducts('anime'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Antes a deduplicacao era do cliente (`Set` sobre os vinculos); agora e do inner join. A
      // garantia e a mesma e continua asserida: o produto aparece UMA vez na listagem.
      expect(result.current.data!.map(p => p.id)).toEqual(['prod-dupla'])
    })

    it('sem N+1: UMA leitura da arvore e UMA de produtos, qualquer que seja a descendencia', async () => {
      const { counts } = respondForCategory(
        { 'cat-anime': ['prod-anime'], 'cat-naruto': ['prod-naruto'] },
        [dbRow()],
      )

      const { result } = renderHook(() => useProducts('bottons'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // "Bottons" tem 3 descendentes; uma implementacao por-descendente faria 3 leituras.
      // Sao DUAS consultas agora, nao tres: a de vinculos deixou de existir.
      expect(counts()).toEqual({ categoriesSelects: 1, productSelects: 1 })
    })

    it('URL-04: slug inexistente devolve VAZIO — nunca a listagem completa do catálogo', async () => {
      /*
       * Este teste media o comportamento ANTERIOR ("devolve a listagem completa, como antes"), que
       * fazia sentido enquanto categoria vivia em `/colecao/:slug`. Com a categoria na raiz do
       * domínio (`AD-018`), toda URL errada da loja passa por aqui — e `URL-04` diz, com todas as
       * letras, "nunca tela branca nem listagem completa do catálogo".
       */
      const catalogoCompletoSpy = vi.fn()
      fromMock.mockImplementation((table: string) => {
        if (table === 'categories') return { select: () => Promise.resolve({ data: TREE, error: null }) }
        return {
          select: () => {
            catalogoCompletoSpy()
            return criarBuilder(() => ({ data: [dbRow()], error: null }))
          },
        }
      })

      const { result } = renderHook(() => useProducts('fantasma'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
      // A prova de que os 689 produtos não foram baixados é a consulta NÃO ter acontecido — o
      // resultado vazio sozinho não distinguiria "não buscou" de "buscou e filtrou".
      expect(catalogoCompletoSpy).not.toHaveBeenCalled()
    })

    it('BUG-20260809: falha da consulta SOBE, em vez de virar lista vazia', async () => {
      /*
       * A segunda metade do defeito. `if (error) return []` transformava a falha em
       * "0 produtos encontrados", e a tela mandava quem chegasse mexer em filtro que nao tinha nada
       * a ver. Pior: React Query guardava o vazio como SUCESSO — sem nova tentativa.
       *
       * Mesma forma que AD-014 registrou em `useAdminCollections` (PGRST205 engolido, grade vazia
       * para sempre). Vazio e falha sao estados diferentes.
       */
      fromMock.mockImplementation((table: string) => {
        if (table === 'categories') return { select: () => Promise.resolve({ data: TREE, error: null }) }
        return {
          select: () => criarBuilder(() => ({ data: null, error: { message: 'URI too long' } })),
        }
      })

      const { result } = renderHook(() => useProducts('anime'), { wrapper })
      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.data).toBeUndefined()
      expect(result.current.isSuccess).toBe(false)
      expect((result.current.error as Error).message).toContain('URI too long')
    })

    it('falha ao ler a arvore de categorias tambem sobe', async () => {
      fromMock.mockImplementation(() => ({
        select: () => Promise.resolve({ data: null, error: { message: 'sem conexao' } }),
      }))

      const { result } = renderHook(() => useProducts('anime'), { wrapper })
      await waitFor(() => expect(result.current.isError).toBe(true))

      expect((result.current.error as Error).message).toContain('sem conexao')
    })

    // URL-04 — o interruptor que impede a consulta de sair antes de a rota resolver.
    describe('enabled', () => {
      it('`enabled: false` não dispara consulta nenhuma', async () => {
        respondForCategory({ 'cat-anime': ['prod-1'] }, [dbRow()])

        const { result } = renderHook(() => useProducts('anime', { enabled: false }), { wrapper })

        expect(fromMock).not.toHaveBeenCalled()
        expect(result.current.fetchStatus).toBe('idle')
        expect(result.current.data).toBeUndefined()
      })

      it('`enabled: true` dispara normalmente', async () => {
        respondForCategory({ 'cat-anime': ['prod-1'] }, [dbRow()])

        const { result } = renderHook(() => useProducts('anime', { enabled: true }), { wrapper })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toHaveLength(1)
      })

      it('sem `options` o padrão continua sendo ligado — as telas antigas não mudam', async () => {
        respondForCategory({ 'cat-anime': ['prod-1'] }, [dbRow()])

        const { result } = renderHook(() => useProducts('anime'), { wrapper })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toHaveLength(1)
      })
    })

    it('SEM slug o catálogo inteiro continua vindo — outras telas dependem disso', async () => {
      // Regressão: o corte de `URL-04` é do ramo "slug informado que não casa". A chamada sem slug
      // é a da home e da busca, e ela não muda.
      respondWith([dbRow(), dbRow({ id: 'prod-2' })])

      const { result } = renderHook(() => useProducts(), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(fromMock).toHaveBeenCalledWith('products')
    })

    it('árvore com ciclo termina em vez de travar a página', async () => {
      const ciclo = [
        { id: 'a', parent_id: 'b', slug: 'a' },
        { id: 'b', parent_id: 'a', slug: 'b' },
      ]
      respondForCategory({ a: ['prod-a'], b: ['prod-b'] }, [dbRow()], ciclo)

      const { result } = renderHook(() => useProducts('a'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
    })
  })
})

/**
 * `PRF-09` — a janela da consulta: ordem declarada e teto explícito.
 *
 * As duas coisas andam juntas, e é por isso que moram no mesmo `describe`. **Teto sem ordem é lista
 * indefinida**: assim que o servidor devolve "as primeiras N", quem decide quais são as primeiras
 * passa a ser o plano de execução, e a fileira da home mostraria peças diferentes a cada recarga.
 *
 * E **ordem sem teto não resolve o que motivou a feature**: medido em 2026-09-05, a home disparava
 * quatro consultas de árvore inteira — `joias-afetivas` sozinha trazia 505 produtos e 1,10 MB
 * comprimidos para desenhar QUATRO cards.
 */
describe('useProducts — a janela da consulta (PRF-09)', () => {
  it('sem `limit`, a listagem declara o teto de LISTING_LIMIT — o corte deixa de ser herdado', async () => {
    // Sem `.limit()` o PostgREST corta em `db-max-rows` e responde 200 com a lista truncada: um
    // catálogo que cruze a marca perderia produtos na vitrine sem erro em lugar nenhum.
    const { janela } = respondWith([dbRow()])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(janela().limit).toBe(LISTING_LIMIT)
  })

  it('o teto é um número escrito num lugar só, e ele é 1.000', () => {
    expect(LISTING_LIMIT).toBe(1000)
  })

  it('`limit` da chamada substitui o teto — quem desenha 4 cards pede 4 linhas', async () => {
    const { janela } = respondWith([dbRow()])

    const { result } = renderHook(() => useProducts(undefined, { limit: 4 }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(janela().limit).toBe(4)
  })

  it('a consulta declara ordenação por created_at ascendente — a ordem de inserção que a vitrine já pratica', async () => {
    const { janela } = respondWith([dbRow()])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(janela().order[0]).toEqual({ column: 'created_at', ascending: true })
  })

  it('a ordenação tem desempate por id — o importador grava em lote e `now()` é o tempo da TRANSAÇÃO', async () => {
    // Centenas de produtos compartilham o mesmo `created_at`. Sem o segundo critério, o empate
    // voltaria a ser resolvido pelo plano de execução — ou seja, indefinido.
    const { janela } = respondWith([dbRow()])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(janela().order).toHaveLength(2)
    expect(janela().order[1]).toEqual({ column: 'id', ascending: true })
  })

  it('a consulta POR CATEGORIA declara a mesma janela, depois do filtro', async () => {
    const { janela } = respondForCategory({ 'cat-anime': ['prod-1'] }, [dbRow()])

    const { result } = renderHook(() => useProducts('anime', { limit: 4 }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(janela()!.order).toEqual([
      { column: 'created_at', ascending: true },
      { column: 'id', ascending: true },
    ])
    expect(janela()!.limit).toBe(4)
  })

  it('a consulta por categoria SEM limite continua no teto — a página da categoria recebe a lista inteira', async () => {
    // `LST-*`: filtro, ordenação e rolagem infinita continuam no cliente, sobre a lista inteira.
    const { janela } = respondForCategory({ 'cat-anime': ['prod-1'] }, [dbRow()])

    const { result } = renderHook(() => useProducts('anime'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(janela()!.limit).toBe(LISTING_LIMIT)
  })

  it('useAllProducts declara janela — é a consulta que a busca e a gaveta usam', async () => {
    const { janela } = respondWith([dbRow()])

    const { result } = renderHook(() => useAllProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(janela().limit).toBe(LISTING_LIMIT)
    expect(janela().order).toHaveLength(2)
  })

  it('useFeaturedProducts declara janela', async () => {
    const { janela } = respondWith([dbRow()])

    const { result } = renderHook(() => useFeaturedProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(janela().limit).toBe(LISTING_LIMIT)
    expect(janela().order).toHaveLength(2)
  })

  it('useNewProducts declara janela', async () => {
    const { janela } = respondWith([dbRow()])

    const { result } = renderHook(() => useNewProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(janela().limit).toBe(LISTING_LIMIT)
    expect(janela().order).toHaveLength(2)
  })

  it('uma resposta EXATAMENTE no tamanho do teto continua sendo a lista inteira que chegou', async () => {
    // O teto declarado não recorta no cliente: o que ele muda é o pedido, não a leitura.
    const cheia = Array.from({ length: 3 }, (_, i) => dbRow({ id: 'prod-' + i }))
    respondWith(cheia)

    const { result } = renderHook(() => useProducts(undefined, { limit: 3 }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(3)
  })
})

describe('useProducts — o limite entra na CHAVE do cache (PRF-09)', () => {
  /**
   * Sem isto a fileira da home e a página da categoria compartilhariam a resposta: quem chegasse
   * primeiro serviria o outro, e a categoria inteira apareceria com quatro produtos — ou a home
   * baixaria os 505. É o mesmo cliente para os dois, então a chave tem de distinguir o pedido.
   */
  const clienteCompartilhado = () => {
    // `staleTime` alto de propósito: em produção o cliente da loja nasce com 5 minutos (`PRF-07`), e
    // com o padrão zero do vitest toda montagem revalidaria — as duas chamadas refariam a consulta e
    // o teste mediria a revalidação, não a chave.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
  }

  const consultasDeProduto = () => fromMock.mock.calls.filter(([t]) => t === 'products').length

  it('dois limites diferentes para o mesmo slug são duas consultas', async () => {
    const wrap = clienteCompartilhado()
    respondForCategory({ 'cat-anime': ['prod-1'] }, [dbRow()])

    const quatro = renderHook(() => useProducts('anime', { limit: 4 }), { wrapper: wrap })
    await waitFor(() => expect(quatro.result.current.isSuccess).toBe(true))
    const apósQuatro = consultasDeProduto()

    const inteira = renderHook(() => useProducts('anime'), { wrapper: wrap })
    await waitFor(() => expect(inteira.result.current.isSuccess).toBe(true))

    expect(consultasDeProduto()).toBeGreaterThan(apósQuatro)
  })

  it('o MESMO limite para o mesmo slug reusa o cache — a home não paga duas vezes pela fileira', async () => {
    const wrap = clienteCompartilhado()
    respondForCategory({ 'cat-anime': ['prod-1'] }, [dbRow()])

    const primeira = renderHook(() => useProducts('anime', { limit: 4 }), { wrapper: wrap })
    await waitFor(() => expect(primeira.result.current.isSuccess).toBe(true))
    const chamadas = consultasDeProduto()

    const segunda = renderHook(() => useProducts('anime', { limit: 4 }), { wrapper: wrap })
    await waitFor(() => expect(segunda.result.current.isSuccess).toBe(true))

    expect(consultasDeProduto()).toBe(chamadas)
  })
})
