import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// PGD-03: o documento é persistido em `customers.cpf` antes de qualquer chamada a `create-payment`.
// PGD-02: documento inválido não chega ao banco.
// DOC-04: a coluna aceita CPF (11 dígitos) **e** CNPJ (14), sempre só dígitos.
// PGD-05: a RLS negada devolve 0 linhas SEM `error` — o hook precisa falhar mesmo assim,
//         senão o servidor leria CPF vazio e o PIX sairia sem pagador identificado.

const { fromMock, updateMock, eqMock, selectMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
  selectMock: vi.fn(),
}))

vi.mock('@nanapin/supabase/client', () => ({ supabase: { from: fromMock } }))

import {
  CPF_SAVE_FAILED_MESSAGE,
  INVALID_CPF_MESSAGE,
  useSaveCustomerCpf,
} from '../useSaveCustomerCpf'

const CPF_VALIDO = '39053344705'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const save = (cpf: string, customerId = 'cust-1') => {
  const { result } = renderHook(() => useSaveCustomerCpf(), { wrapper })
  return result.current.mutateAsync({ customerId, cpf })
}

beforeEach(() => {
  fromMock.mockReset()
  updateMock.mockReset()
  eqMock.mockReset()
  selectMock.mockReset()

  fromMock.mockReturnValue({ update: updateMock })
  updateMock.mockReturnValue({ eq: eqMock })
  eqMock.mockReturnValue({ select: selectMock })
  selectMock.mockResolvedValue({ data: [{ id: 'cust-1', cpf: CPF_VALIDO }], error: null })
})

describe('useSaveCustomerCpf — sucesso (PGD-03)', () => {
  it('atualiza `customers.cpf` do próprio cliente com o CPF sem máscara', async () => {
    await save(CPF_VALIDO)

    expect(fromMock).toHaveBeenCalledWith('customers')
    expect(updateMock).toHaveBeenCalledWith({ cpf: CPF_VALIDO })
    expect(eqMock).toHaveBeenCalledWith('id', 'cust-1')
  })

  it('CPF mascarado é normalizado para 11 dígitos antes de ir ao banco', async () => {
    await save('390.533.447-05')

    expect(updateMock).toHaveBeenCalledWith({ cpf: '39053344705' })
  })

  it('resolve com o CPF limpo gravado', async () => {
    await expect(save('390.533.447-05')).resolves.toBe('39053344705')
  })
})

describe('useSaveCustomerCpf — CNPJ grava igual ao CPF (DOC-04)', () => {
  it('CNPJ válido grava os 14 dígitos em customers.cpf', async () => {
    await save('11.222.333/0001-81')

    expect(updateMock).toHaveBeenCalledWith({ cpf: '11222333000181' })
  })

  it('resolve com o CNPJ limpo gravado', async () => {
    await expect(save('11222333000181')).resolves.toBe('11222333000181')
  })

  it('CNPJ com DV errado rejeita sem chamar o banco', async () => {
    await expect(save('11222333000182')).rejects.toThrow(INVALID_CPF_MESSAGE)
    expect(updateMock).not.toHaveBeenCalled()
  })
})

describe('useSaveCustomerCpf — documento inválido não chega ao banco (PGD-02)', () => {
  it('CPF com dígito verificador errado rejeita sem chamar o banco', async () => {
    await expect(save('39053344700')).rejects.toThrow(INVALID_CPF_MESSAGE)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('CPF com menos de 11 dígitos rejeita sem chamar o banco', async () => {
    await expect(save('3905334')).rejects.toThrow(INVALID_CPF_MESSAGE)
    expect(updateMock).not.toHaveBeenCalled()
  })

  // 12 e 13 dígitos são o vão entre CPF e CNPJ: nenhum dos dois DVs se aplica.
  it('comprimento entre CPF e CNPJ rejeita sem chamar o banco', async () => {
    await expect(save('112223330001')).rejects.toThrow(INVALID_CPF_MESSAGE)
    expect(updateMock).not.toHaveBeenCalled()
  })
})

describe('useSaveCustomerCpf — RLS nega em silêncio (PGD-05)', () => {
  it('0 linhas afetadas SEM error rejeita — não pode passar por gravação bem-sucedida', async () => {
    selectMock.mockResolvedValue({ data: [], error: null })

    await expect(save(CPF_VALIDO)).rejects.toThrow(CPF_SAVE_FAILED_MESSAGE)
  })

  it('data nulo SEM error também rejeita', async () => {
    selectMock.mockResolvedValue({ data: null, error: null })

    await expect(save(CPF_VALIDO)).rejects.toThrow(CPF_SAVE_FAILED_MESSAGE)
  })
})

describe('useSaveCustomerCpf — erro do banco / rede', () => {
  it('erro devolvido pelo Supabase rejeita com a mensagem do erro', async () => {
    selectMock.mockResolvedValue({ data: null, error: { message: 'FetchError: network down' } })

    await expect(save(CPF_VALIDO)).rejects.toThrow('FetchError: network down')
  })
})
