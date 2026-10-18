// A `HomePage` real monta o convite para o Instagram — e só no modo normal, com a Home resolvida.
//
// A fiação se prova pela página: um teste que montasse a Home e o convite lado a lado passaria com o
// convite apagado da página.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DEFAULT_HOME_COMPOSITION, type HomeSection } from '@estrelinha/core/home'

/* eslint-disable @typescript-eslint/no-explicit-any */
const { useHomeSectionsMock } = vi.hoisted(() => ({ useHomeSectionsMock: vi.fn() }))

vi.mock('@/entities/category', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="produto">{product.name}</div>,
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({ data: undefined, isLoading: false }),
  usePaymentSettings: () => ({ pix_enabled: true, pix_discount_percent: 5, max_installments: 6 }),
  useShippingSettings: () => ({ free_shipping_enabled: true, free_shipping_threshold: 150 }),
}))
vi.mock('@/entities/home/api/useHomeSections', () => ({ useHomeSections: useHomeSectionsMock }))
vi.mock('@/shared/lib/analytics', () => ({
  applyConsent: () => {},
  clearGaCookies: () => {},
  setConsentReader: () => {},
}))

import HomePage from '../HomePage'
import { useCookieConsentStore } from '@/entities/cookie-consent'
import { ATRASO_DO_CONVITE_MS } from '@/widgets/instagram-invite/ui/InstagramInvite'
import { resetInviteSeenForTests } from '@/widgets/instagram-invite/model/inviteSeen'

const TITULO = 'Acompanhe de perto o meu trabalho'
const paiFalso = { postMessage: vi.fn() }
const parentOriginal = Object.getOwnPropertyDescriptor(window, 'parent')

const newsletter = (): HomeSection =>
  ({ ...DEFAULT_HOME_COMPOSITION.find(s => s.type === 'newsletter')!, id: 'do-banco' }) as HomeSection

const renderPage = () => render(<MemoryRouter><HomePage /></MemoryRouter>)

const esperarOAtraso = async () => {
  await act(async () => {
    vi.advanceTimersByTime(ATRASO_DO_CONVITE_MS)
  })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  window.localStorage.clear()
  resetInviteSeenForTests()
  useCookieConsentStore.setState({ notice: 'answered', statistics: true, preferencesOpen: false })
  useHomeSectionsMock.mockReset()
  useHomeSectionsMock.mockReturnValue({ data: [newsletter()], isLoading: false })
  window.history.replaceState({}, '', '/')
  Object.defineProperty(window, 'parent', { value: window, configurable: true })
})

afterEach(() => {
  vi.useRealTimers()
  if (parentOriginal) Object.defineProperty(window, 'parent', parentOriginal)
  window.history.replaceState({}, '', '/')
})

describe('a Home monta o convite para o Instagram', () => {
  it('com a Home resolvida, o convite abre depois do atraso', async () => {
    renderPage()
    expect(screen.queryByRole('dialog')).toBeNull()
    await esperarOAtraso()
    expect(await screen.findByRole('dialog', { name: TITULO })).toBeInTheDocument()
  })

  it('enquanto a Home está no esqueleto, o convite não abre', async () => {
    useHomeSectionsMock.mockReturnValue({ data: undefined, isLoading: true })
    renderPage()
    await esperarOAtraso()
    await esperarOAtraso()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('em modo prévia (iframe e `?preview=1`), o convite não abre', async () => {
    window.history.replaceState({}, '', '/?preview=1')
    Object.defineProperty(window, 'parent', { value: paiFalso, configurable: true })
    renderPage()
    await esperarOAtraso()
    await esperarOAtraso()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
