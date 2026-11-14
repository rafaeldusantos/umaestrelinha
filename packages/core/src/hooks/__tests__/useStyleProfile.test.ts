// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { from: () => ({ select: selectMock }) },
}))

import { useStyleProfile } from '../useStyleProfile'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
}

async function perfilLido(linhas: Array<{ key: string; value: unknown }>) {
  selectMock.mockResolvedValue({ data: linhas, error: null })
  const { result } = renderHook(() => useStyleProfile(), { wrapper: makeWrapper() })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  return result.current
}

beforeEach(() => {
  selectMock.mockReset()
})

describe('useStyleProfile', () => {
  it('sem a chave `appearance`, o perfil é o Padrão', async () => {
    expect(await perfilLido([{ key: 'general', value: { store_name: 'Uma Estrelinha' } }])).toEqual({
      profile: 'padrao',
      isLoading: false,
    })
  })

  it('devolve o perfil gravado', async () => {
    expect((await perfilLido([{ key: 'appearance', value: { profile: 'black-friday' } }])).profile).toBe(
      'black-friday',
    )
  })

  it.each([
    ['perfil desconhecido', { profile: 'natal' }],
    ['perfil de outro tipo', { profile: 3 }],
    ['valor nulo', null],
    ['valor string', 'black-friday'],
  ])('com %s gravado, abre no Padrão', async (_nome, value) => {
    expect((await perfilLido([{ key: 'appearance', value }])).profile).toBe('padrao')
  })

  it('a leitura que falha abre no Padrão', async () => {
    selectMock.mockResolvedValue({ data: null, error: { message: 'falhou' } })
    const { result } = renderHook(() => useStyleProfile(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.profile).toBe('padrao')
  })

  it('enquanto lê, diz que está lendo', () => {
    selectMock.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useStyleProfile(), { wrapper: makeWrapper() })
    expect(result.current).toEqual({ profile: 'padrao', isLoading: true })
  })
})
