import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * A campanha em vigência, lida pela policy pública de `campaigns` (filtrada por `now()` no banco).
 * O dublê ENXERGA a tabela e o `select`: um que devolvesse dado para qualquer chamada aprovaria um
 * hook que lê a tabela errada.
 */
const { fromMock, selectMock } = vi.hoisted(() => ({ fromMock: vi.fn(), selectMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { LIVE_CAMPAIGN_SELECT, useLiveCampaign } from '../useLiveCampaign'

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  fromMock.mockReset()
  selectMock.mockReset()
  fromMock.mockReturnValue({ select: selectMock })
})

describe('useLiveCampaign', () => {
  it('lê `campaigns` com os percentuais embutidos e devolve a campanha com eles em ordem', async () => {
    selectMock.mockResolvedValue({
      data: [
        {
          id: 'camp-bf',
          name: 'Black Friday',
          badge_text: 'Black Friday',
          band_color: '#161514',
          accent_color: '#C2A063',
          ends_at: '2026-12-01T03:00:00Z',
          campaign_percents: [{ percent: 20 }, { percent: 10 }, { percent: 15 }],
        },
      ],
      error: null,
    })
    const { result } = renderHook(() => useLiveCampaign(), { wrapper })
    await waitFor(() => expect(result.current.data).toBeTruthy())

    expect(fromMock).toHaveBeenCalledWith('campaigns')
    expect(selectMock).toHaveBeenCalledWith(LIVE_CAMPAIGN_SELECT)
    expect(LIVE_CAMPAIGN_SELECT).toContain('campaign_percents(percent)')
    expect(result.current.data).toEqual({
      id: 'camp-bf',
      name: 'Black Friday',
      badge_text: 'Black Friday',
      band_color: '#161514',
      accent_color: '#C2A063',
      ends_at: '2026-12-01T03:00:00Z',
      percents: [10, 15, 20],
    })
  })

  it('sem campanha em vigência (a leitura pública volta vazia), devolve nenhuma', async () => {
    selectMock.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useLiveCampaign(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('a leitura que falha é falha, nunca "sem campanha"', async () => {
    selectMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const { result } = renderHook(() => useLiveCampaign(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.data).toBeUndefined()
  })
})
