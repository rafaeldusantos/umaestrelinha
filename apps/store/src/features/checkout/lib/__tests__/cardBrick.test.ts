import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCardFormData } from '../cardBrick'

/* eslint-disable @typescript-eslint/no-explicit-any */

// PGM-06: o CTA valida o cartão ANTES de criar o pedido. `getCardFormData` é a fronteira dessa
// decisão: `null` significa "não crie nada, não cobre nada".
//
// A doc do SDK **não define** o comportamento de `getFormData()` com formulário inválido — por
// isso as duas formas de falha (promise rejeitada e retorno sem `token`) são exercidas aqui.
// Edge case da spec: nenhuma delas pode virar erro não tratado na página.

const FORM_DATA = {
  token: 'tok_123',
  installments: 3,
  payment_method_id: 'visa',
  issuer_id: '1',
  transaction_amount: 114.9,
  payer: { email: 'marina@email.com', identification: { type: 'CPF', number: '39053344705' } },
}

const setController = (getFormData?: () => Promise<unknown>) => {
  ;(window as any).cardPaymentBrickController = getFormData
    ? { unmount: vi.fn(), getFormData }
    : { unmount: vi.fn() }
}

beforeEach(() => {
  delete (window as any).cardPaymentBrickController
})

describe('getCardFormData', () => {
  it('formulário válido devolve o formData tokenizado', async () => {
    setController(async () => FORM_DATA)

    await expect(getCardFormData()).resolves.toEqual(FORM_DATA)
  })

  it('promise rejeitada devolve null, sem propagar o erro', async () => {
    setController(async () => {
      throw new Error('form inválido')
    })

    await expect(getCardFormData()).resolves.toBeNull()
  })

  it('retorno sem token devolve null', async () => {
    setController(async () => ({ installments: 1, payer: { email: 'marina@email.com' } }))

    await expect(getCardFormData()).resolves.toBeNull()
  })

  it('retorno nulo devolve null', async () => {
    setController(async () => null)

    await expect(getCardFormData()).resolves.toBeNull()
  })

  it('Brick ainda não montado (sem controller) devolve null', async () => {
    await expect(getCardFormData()).resolves.toBeNull()
  })

  it('controller sem getFormData devolve null', async () => {
    setController()

    await expect(getCardFormData()).resolves.toBeNull()
  })
})
