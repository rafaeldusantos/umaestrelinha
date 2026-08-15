import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { DEFAULT_HOME_COMPOSITION } from '@estrelinha/core/home'

/**
 * `HOME-07` — a leitura das seções **nunca deixa a Home em branco**.
 *
 * O que se prova aqui é o piso, e ele tem três entradas que falham de jeitos diferentes: a consulta
 * que erra, a que volta vazia, e o instante antes de qualquer resposta. As três precisam entregar
 * `DEFAULT_HOME_COMPOSITION` — devolver `[]` em qualquer uma delas apagaria a Home inteira sem que
 * nada quebrasse, que é a classe de falha desta feature.
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
    expect(selectMock).toHaveBeenCalledWith('*, items:home_section_items(*)')
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
        alt: 'Campanha de outono',
        label_snapshot: 'Prata 925',
      },
    ])
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

  it('o piso já está na PRIMEIRA pintura, antes de qualquer resposta', async () => {
    // Sem isto a Home nasce em branco a cada visita e só aparece quando a consulta volta — que é
    // "página em branco" pelo relógio, não pelo erro.
    respondeCom([linhaDoBanco()])

    const { result } = renderHook(() => useHomeSections(), { wrapper })

    expect(result.current.data.map(s => s.type)).toEqual(tiposDoPiso)

    await waitFor(() => expect(result.current.isFetching).toBe(false))
  })

  it('o piso é uma CÓPIA — mutar o que a loja recebeu não contamina a constante', async () => {
    respondeCom([])

    const result = await ler()
    result.current.data[0].position = 99

    expect(DEFAULT_HOME_COMPOSITION[0].position).toBe(1)
  })
})
