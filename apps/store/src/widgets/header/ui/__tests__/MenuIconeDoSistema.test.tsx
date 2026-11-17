import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { PresenteIcon } from '@estrelinha/ui/icons'
import Header from '../Header'
import MobileMenu from '@/widgets/mobile-menu/ui/MobileMenu'
import { useMenuUiStore } from '@/entities/category'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Um ícone do sistema escolhido no painel chega desenhado à barra do computador e à folha do
 * celular, pela fiação REAL: só o client do Supabase é dublado. O documento gravado em
 * `store_settings.menu` passa por `parseMenuDocument`, pela porta `menuItems` e por
 * `MENU_ICON_COMPONENTS` exatamente como na loja publicada — e na prévia do painel, que é esta
 * mesma loja num iframe.
 *
 * O desenho esperado é o do componente nomeado (`PresenteIcon`), e não o que sai do registro por
 * chave: é a ligação chave → desenho que está em prova.
 */

const { db, leituras } = vi.hoisted(() => ({
  db: { categories: [] as any[], store_settings: [] as any[], products: [] as any[] },
  leituras: [] as Array<{ tabela: string; select?: string; filtros: unknown[][] }>,
}))

vi.mock('@estrelinha/supabase/client', () => {
  const from = (tabela: string) => {
    const registro = { tabela, select: undefined as string | undefined, filtros: [] as unknown[][] }
    leituras.push(registro)
    const resposta = () => Promise.resolve({ data: (db as any)[tabela] ?? [], error: null })
    const builder: any = {
      select: (cols: string) => {
        registro.select = cols
        return builder
      },
      order: (...args: unknown[]) => {
        registro.filtros.push(['order', ...args])
        return builder
      },
      in: (...args: unknown[]) => {
        registro.filtros.push(['in', ...args])
        return builder
      },
      eq: (...args: unknown[]) => {
        registro.filtros.push(['eq', ...args])
        return builder
      },
      then: (ok: any, erro: any) => resposta().then(ok, erro),
    }
    return builder
  }
  return { supabase: { from } }
})

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: null, customer: null }) }))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: any) => sel({ open: vi.fn() }) }))
vi.mock('@/features/search', () => ({ useSearchUiStore: (sel: any) => sel({ openSearch: vi.fn() }) }))
vi.mock('@/entities/cart/model/cartStore', () => ({
  useCartStore: (sel: any) => sel({ uniqueItemsCount: () => 0 }),
}))
vi.mock('@/entities/wishlist/model/wishlistStore', () => ({
  useWishlistStore: (sel: any) => sel({ count: () => 0 }),
}))
vi.mock('@/widgets/cart-drawer/ui/CartButton', () => ({ default: () => <div /> }))
vi.mock('@/features/search/ui/SearchDropdown', () => ({ default: () => <div /> }))

const DOCUMENTO = {
  version: 2,
  items: [
    {
      id: 'n-presentes',
      target: { kind: 'link', href: '/presentes' },
      label: 'Presentes',
      desktop: true,
      mobile: true,
      icon: 'presente',
      banners: null,
      children: [],
    },
  ],
}

const comCliente = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )

/** O `<svg>` do desenho, renderizado fora da loja, para comparar com o que a loja pôs no item. */
const desenhoDoPresente = () => {
  const caixa = document.createElement('div')
  caixa.innerHTML = renderToStaticMarkup(<PresenteIcon />)
  return caixa.querySelector('svg')!
}

const mesmoDesenho = (svg: SVGElement | null) => {
  expect(svg).not.toBeNull()
  // O conteúdo do `<svg>` — os traços —, sem a classe de tamanho e cor que cada superfície aplica.
  expect(svg!.innerHTML).toBe(desenhoDoPresente().innerHTML)
}

beforeEach(() => {
  leituras.length = 0
  db.categories = []
  db.store_settings = [{ key: 'menu', value: DOCUMENTO }]
  db.products = []
  useMenuUiStore.setState({ open: false })
})

describe('um item principal com ícone do sistema', () => {
  it('a barra do computador desenha o ícone escolhido ao lado do nome', async () => {
    comCliente(<Header />)
    const item = await screen.findByRole('link', { name: 'Presentes' })
    mesmoDesenho(item.querySelector('svg'))
  })

  it('a folha do celular desenha o mesmo ícone', async () => {
    comCliente(<MobileMenu />)
    act(() => useMenuUiStore.setState({ open: true }))
    const item = await screen.findByRole('link', { name: 'Presentes' })
    mesmoDesenho(item.querySelector('svg'))
  })

  it('SENSOR: a comparação distingue um ícone do sistema de outro', async () => {
    db.store_settings = [
      { key: 'menu', value: { ...DOCUMENTO, items: [{ ...DOCUMENTO.items[0], icon: 'etiqueta' }] } },
    ]
    comCliente(<Header />)
    const item = await screen.findByRole('link', { name: 'Presentes' })
    expect(item.querySelector('svg')!.innerHTML).not.toBe(desenhoDoPresente().innerHTML)
  })
})
