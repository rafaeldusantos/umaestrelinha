import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// ADR-03: o endereço usado no pedido é gravado/atualizado em `addresses`, `is_default = true`.
// ADR-04: editar o endereço não cria um segundo default para o mesmo cliente.
// design.md → Error Handling: falhar aqui NÃO bloqueia a compra — resolve `{ saved: false }`.

const {
  fromMock,
  lookupSelect,
  lookupEqCustomer,
  lookupEqDefault,
  maybeSingleMock,
  updateMock,
  updateEqMock,
  updateSelectMock,
  insertMock,
  insertSelectMock,
} = vi.hoisted(() => ({
  fromMock: vi.fn(),
  lookupSelect: vi.fn(),
  lookupEqCustomer: vi.fn(),
  lookupEqDefault: vi.fn(),
  maybeSingleMock: vi.fn(),
  updateMock: vi.fn(),
  updateEqMock: vi.fn(),
  updateSelectMock: vi.fn(),
  insertMock: vi.fn(),
  insertSelectMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useSaveAddress, type AddressFields } from '../useSaveAddress'

const address: AddressFields = {
  cep: '01310100',
  street: 'Av. Paulista',
  number: '1000',
  complement: 'Apto 42',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const run = (customerId = 'cust-1') => {
  const { result } = renderHook(() => useSaveAddress(), { wrapper })
  return result.current.mutateAsync({ customerId, address })
}

/** Nenhum endereço default para o cliente. */
const withoutDefault = () => maybeSingleMock.mockResolvedValue({ data: null, error: null })
/** Já existe um endereço default. */
const withDefault = (id = 'addr-1') =>
  maybeSingleMock.mockResolvedValue({ data: { id }, error: null })

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})

  for (const m of [
    fromMock,
    lookupSelect,
    lookupEqCustomer,
    lookupEqDefault,
    maybeSingleMock,
    updateMock,
    updateEqMock,
    updateSelectMock,
    insertMock,
    insertSelectMock,
  ]) {
    m.mockReset()
  }

  fromMock.mockReturnValue({ select: lookupSelect, update: updateMock, insert: insertMock })
  lookupSelect.mockReturnValue({ eq: lookupEqCustomer })
  lookupEqCustomer.mockReturnValue({ eq: lookupEqDefault })
  lookupEqDefault.mockReturnValue({ maybeSingle: maybeSingleMock })

  updateMock.mockReturnValue({ eq: updateEqMock })
  updateEqMock.mockReturnValue({ select: updateSelectMock })
  updateSelectMock.mockResolvedValue({ data: [{ id: 'addr-1' }], error: null })

  insertMock.mockReturnValue({ select: insertSelectMock })
  insertSelectMock.mockResolvedValue({ data: [{ id: 'addr-1' }], error: null })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useSaveAddress — primeiro endereço (ADR-03)', () => {
  it('sem endereço default, insere o endereço com is_default: true', async () => {
    withoutDefault()

    await run()

    expect(insertMock).toHaveBeenCalledWith({
      customer_id: 'cust-1',
      cep: '01310100',
      street: 'Av. Paulista',
      number: '1000',
      complement: 'Apto 42',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      is_default: true,
    })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('procura o default existente escopado ao próprio cliente', async () => {
    withoutDefault()

    await run('cust-9')

    expect(lookupEqCustomer).toHaveBeenCalledWith('customer_id', 'cust-9')
    expect(lookupEqDefault).toHaveBeenCalledWith('is_default', true)
  })

  it('resolve com { saved: true } depois de inserir', async () => {
    withoutDefault()

    await expect(run()).resolves.toEqual({ saved: true })
  })
})

describe('useSaveAddress — endereço já existente (ADR-04)', () => {
  it('com default existente, atualiza o registro e NÃO insere um segundo', async () => {
    withDefault('addr-77')

    await run()

    expect(updateMock).toHaveBeenCalledWith(address)
    expect(updateEqMock).toHaveBeenCalledWith('id', 'addr-77')
    expect(insertMock).toHaveBeenCalledTimes(0)
  })

  it('resolve com { saved: true } depois de atualizar', async () => {
    withDefault()

    await expect(run()).resolves.toEqual({ saved: true })
  })
})

describe('useSaveAddress — falha não bloqueia a compra', () => {
  it('UPDATE com 0 linhas afetadas (RLS) resolve { saved: false } em vez de rejeitar', async () => {
    withDefault()
    updateSelectMock.mockResolvedValue({ data: [], error: null })

    await expect(run()).resolves.toEqual({ saved: false })
  })

  it('INSERT com 0 linhas afetadas (RLS) resolve { saved: false } em vez de rejeitar', async () => {
    withoutDefault()
    insertSelectMock.mockResolvedValue({ data: [], error: null })

    await expect(run()).resolves.toEqual({ saved: false })
  })

  it('erro do banco na escrita resolve { saved: false } e loga', async () => {
    withoutDefault()
    insertSelectMock.mockResolvedValue({ data: null, error: { message: 'network down' } })

    await expect(run()).resolves.toEqual({ saved: false })
    expect(console.warn).toHaveBeenCalled()
  })

  it('erro ao consultar o default não grava nada (evitaria um segundo default) e resolve { saved: false }', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    await expect(run()).resolves.toEqual({ saved: false })
    expect(insertMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })
})
