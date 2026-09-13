import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * `useCreateOrder` depois da feature `49`: o pedido nasce na edge function `checkout`, nunca mais
 * por `insert` do PostgREST (`PED-01`).
 *
 * ⚠️ **Os 14 casos anteriores não sumiram — mudaram de camada, e cada um tem endereço novo.** Eles
 * mapeavam coluna a coluna o `insert` que este hook montava (`ADR-05`, `SHP-07`/`SHP-08`,
 * `PRM-12`, o contrato dos itens). Essa responsabilidade está agora em dois lugares, e os dois
 * têm teste:
 *
 *   - **o que a loja ENVIA** — `features/checkout/lib/__tests__/buildOrderPayload.test.ts`
 *     (CEP sem máscara, snapshot de envio, `promotion_id` de uma × duas campanhas, os itens)
 *   - **o que o servidor GRAVA** — `supabase/functions/checkout/__tests__/createOrder.test.ts`
 *     (as colunas repassadas, a ordem das escritas, a idempotência)
 *
 * O que sobra para cá é o que só este hook pode errar: falar com a porta certa, repassar o corpo
 * sem mexer, devolver o acesso, e **distinguir o 409 de `needs_otp`** dos demais erros.
 */

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke }, from: vi.fn() },
}))

import { NeedsOtpError, useCreateOrder, type CreateOrderInput } from '../useOrders'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const baseInput = (
  overrides: Partial<CreateOrderInput> = {},
): CreateOrderInput & { client_request_id: string } => ({
  client_request_id: 'tentativa-1',
  customer_name: 'Marina Yamashita',
  customer_email: 'marina@email.com',
  customer_phone: '11988887777',
  customer_document: '52998224725',
  customer_id: 'cust-1',
  payment_method: 'pix',
  address_street: 'Av. Paulista',
  address_number: '1000',
  address_neighborhood: 'Bela Vista',
  address_city: 'São Paulo',
  address_state: 'SP',
  address_zip: '01310100',
  address_complement: 'Apto 42',
  shipping_service_id: '2',
  shipping_carrier: 'Correios',
  shipping_method: 'SEDEX',
  delivery_estimate_min: '2026-08-04',
  delivery_estimate_max: '2026-08-06',
  subtotal: 38.7,
  discount: 0,
  shipping_cost: 21.5,
  total: 60.2,
  items: [
    {
      product_id: 'prod-1',
      product_name: 'Joia com cinzas',
      product_image: null,
      size: null,
      finish: null,
      quantity: 2,
      unit_price: 12.9,
    },
  ],
  ...overrides,
})

const criar = async (input = baseInput()) => {
  const { result } = renderHook(() => useCreateOrder(), { wrapper })
  return result.current.mutateAsync(input)
}

/** O erro que `functions.invoke` devolve em 4xx: a `Response` original vive em `context`. */
const erroDaFunction = (status: number, corpo: unknown) => ({
  data: null,
  error: Object.assign(new Error(`Edge Function returned a non-2xx status code`), {
    context: { status, json: async () => corpo },
  }),
})

beforeEach(() => {
  invoke.mockReset()
  invoke.mockResolvedValue({ data: { order_id: 'order-1', access_token: 'tok-abc' }, error: null })
})

describe('useCreateOrder — a porta (PED-01)', () => {
  it('chama a action `create-order` da function `checkout`', async () => {
    await criar()

    expect(invoke).toHaveBeenCalledWith('checkout?action=create-order', expect.anything())
  })

  it('repassa o corpo montado, sem mexer nele', async () => {
    // O hook não é lugar de regra: quem monta é `buildOrderPayload`, quem grava é o servidor.
    const input = baseInput()
    await criar(input)

    expect(invoke.mock.calls[0][1]).toEqual({ body: input })
  })

  it('leva a chave de idempotência no corpo (PED-04)', async () => {
    await criar(baseInput({ } as Partial<CreateOrderInput>))

    expect((invoke.mock.calls[0][1] as { body: Record<string, unknown> }).body.client_request_id).toBe(
      'tentativa-1',
    )
  })

  it('NÃO monta o header Authorization à mão', async () => {
    // `functions.invoke` já anexa o token da sessão quando existe. Montá-lo aqui abriria a
    // possibilidade de a loja mandar um e o client outro.
    await criar()

    expect(invoke.mock.calls[0][1]).not.toHaveProperty('headers')
  })
})

describe('useCreateOrder — a resposta (PED-05)', () => {
  it('devolve o id e o token de acesso da convidada', async () => {
    await expect(criar()).resolves.toEqual({ id: 'order-1', access_token: 'tok-abc' })
  })

  it('quem tem sessão recebe o id com acesso nulo — o JWT já é a prova', async () => {
    invoke.mockResolvedValue({ data: { order_id: 'order-2', access_token: null }, error: null })

    await expect(criar()).resolves.toEqual({ id: 'order-2', access_token: null })
  })

  it('acesso ausente no corpo vira `null`, nunca `undefined`', async () => {
    // `undefined` passaria pelo `if (order.access_token)` da página do mesmo jeito, mas vazaria
    // para o storage como chave sem valor no dia em que alguém o gravasse sem conferir.
    invoke.mockResolvedValue({ data: { order_id: 'order-3' }, error: null })

    await expect(criar()).resolves.toEqual({ id: 'order-3', access_token: null })
  })
})

describe('useCreateOrder — o 409 de `needs_otp` é distinguível (IDN-08)', () => {
  it('rejeita com `NeedsOtpError` quando o servidor pede o código', async () => {
    // A distinção que importa: sem ela, a recusa vira o toast genérico de "não conseguimos criar
    // seu pedido", e a cliente fica sem saber que basta digitar o código que já está na caixa dela.
    invoke.mockResolvedValue(
      erroDaFunction(409, { error: 'Este e-mail já tem cadastro na loja.', reason: 'needs_otp' }),
    )

    await expect(criar()).rejects.toBeInstanceOf(NeedsOtpError)
  })

  it('o motivo legível do servidor chega na mensagem', async () => {
    invoke.mockResolvedValue(
      erroDaFunction(409, { error: 'Este e-mail já tem cadastro na loja.', reason: 'needs_otp' }),
    )

    await expect(criar()).rejects.toThrow('Este e-mail já tem cadastro na loja.')
  })

  it('outro erro da function NÃO vira `NeedsOtpError`', async () => {
    // O par inverso. Sem ele, um `catch` que tratasse toda falha como desafio abriria o campo de
    // código para quem teve problema de rede — e ela digitaria um código que nunca chegou.
    invoke.mockResolvedValue(erroDaFunction(500, { error: 'Não conseguimos criar seu pedido.' }))

    const erro = await criar().catch((e) => e)
    expect(erro).toBeInstanceOf(Error)
    expect(erro).not.toBeInstanceOf(NeedsOtpError)
    expect(erro.message).toBe('Não conseguimos criar seu pedido.')
  })
})

describe('useCreateOrder — falha (CHK-09)', () => {
  it('erro sem corpo legível ainda rejeita, com a mensagem do SDK', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('Failed to fetch') })

    await expect(criar()).rejects.toThrow('Failed to fetch')
  })

  it('corpo de erro ilegível não derruba o hook com TypeError', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('boom'), {
        context: {
          json: async () => {
            throw new Error('não é json')
          },
        },
      }),
    })

    await expect(criar()).rejects.toThrow('boom')
  })

  it('resposta 200 sem `order_id` é falha, não sucesso silencioso', async () => {
    // Sem esta asserção, um corpo `{}` faria a página seguir para o pagamento de um pedido que
    // não existe.
    invoke.mockResolvedValue({ data: {}, error: null })

    await expect(criar()).rejects.toThrow('Erro ao criar pedido')
  })
})
