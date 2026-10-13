import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Feature 63 (`RET-19`) — a entrega de um pedido de retirada no escritório.
//
// Arquivo à parte porque só a retirada lê a configuração da loja (`usePickupLocation`): o arquivo
// irmão monta o componente sem dublê de `store_settings`, e os casos dele continuam sem precisar.

const { escritorio } = vi.hoisted(() => ({
  escritorio: {
    material: null as Record<string, string> | null,
    shipping: null as Record<string, unknown> | null,
  },
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({
    data: escritorio.material
      ? { material: escritorio.material, ...(escritorio.shipping ? { shipping: escritorio.shipping } : {}) }
      : undefined,
  }),
}))

import OrderPaymentDelivery from '../OrderPaymentDelivery'

const COMPLETO = {
  recipient: 'Adri Muniz', street: 'Rua Dona Laura', number: '455', complement: 'Sala 7',
  neighborhood: 'Rio Branco', city: 'Porto Alegre', state: 'RS', zip: '90430091', notes: '',
}
const LINHA = 'Escritório - Uma Estrelinha - Rua Dona Laura, Rio Branco, Porto Alegre/RS'

const pedido = (shipping_service_id: string) => ({
  payment_method: 'pix',
  customer_name: 'Marina Yamashita',
  address_street: 'Rua da Cliente',
  address_number: '12',
  address_complement: 'casa 3',
  address_neighborhood: 'Petrópolis',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  address_zip: '90460000',
  shipping_service_id,
})

beforeEach(() => {
  escritorio.material = { ...COMPLETO }
  escritorio.shipping = null
})

describe('OrderPaymentDelivery — retirada no escritório (RET-19)', () => {
  it('mostra "Retirada no escritório" e a linha do escritório, no lugar do endereço da cliente', () => {
    render(<OrderPaymentDelivery order={pedido('retirada')} />)

    expect(screen.getByText('Retirada no escritório')).toBeInTheDocument()
    expect(screen.getByTestId('local-da-retirada')).toHaveTextContent(LINHA)
    for (const proibido of ['Rua da Cliente', 'casa 3', 'Petrópolis', '455', 'Sala 7']) {
      expect(screen.getByRole('region', { name: 'Pagamento e entrega' }).textContent, proibido).not.toContain(proibido)
    }
    expect(screen.queryByTestId('endereco-cep')).not.toBeInTheDocument()
  })

  it('sem o endereço do escritório (configuração vazia ou ainda carregando): só "Retirada no escritório"', () => {
    escritorio.material = null
    render(<OrderPaymentDelivery order={pedido('retirada')} />)

    expect(screen.getByText('Retirada no escritório')).toBeInTheDocument()
    expect(screen.queryByTestId('local-da-retirada')).not.toBeInTheDocument()
    expect(screen.queryByText(/Rua da Cliente/)).not.toBeInTheDocument()
  })

  it('a retirada DESLIGADA depois não muda onde a cliente busca: a linha do escritório continua', () => {
    // O pedido já é de retirada; o interruptor só decide quem pode ESCOLHER a retirada daqui em
    // diante (`usePickupLocation` não tem o portão do CEP nem o do interruptor — o mutante N19 da
    // rodada 2 o punha e sobrevivia à suíte).
    escritorio.shipping = { pickup_enabled: false, handling_days: 3 }
    render(<OrderPaymentDelivery order={pedido('retirada')} />)

    expect(screen.getByText('Retirada no escritório')).toBeInTheDocument()
    expect(screen.getByTestId('local-da-retirada')).toHaveTextContent(LINHA)
  })

  it('o par: o mesmo pedido pelos Correios mostra o endereço da cliente, e nenhuma retirada', () => {
    render(<OrderPaymentDelivery order={pedido('1')} />)

    expect(screen.getByText(/Rua da Cliente/)).toBeInTheDocument()
    expect(screen.queryByText('Retirada no escritório')).not.toBeInTheDocument()
  })
})
