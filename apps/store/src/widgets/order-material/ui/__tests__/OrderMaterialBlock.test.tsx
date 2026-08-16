// Feature 22 / T15 e T16 — `MAT-11`, o rastreio da remessa DA CLIENTE.
//
// A invariante que este arquivo guarda vale mais que o layout: **nenhuma policy de `UPDATE` em
// `orders` foi aberta** (PAY-10). A escrita passa por `set_material_tracking`, uma RPC que grava um
// campo só — abrir a policy exporia `payment_status`, `total` e `paid_at` a quem só precisa informar
// um código dos Correios.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
const from = vi.hoisted(() => vi.fn())

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { rpc, from } }))

import OrderMaterialBlock from '../OrderMaterialBlock'

const montar = (props: Partial<React.ComponentProps<typeof OrderMaterialBlock>> = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OrderMaterialBlock
          orderId="order-1"
          materialStatus="aguardando_material"
          trackingCode={null}
          kinds={['cabelo']}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ok = (status: string) => ({ data: { ok: true, status, reason: null }, error: null })
const recusa = (reason: string, status = 'nao_aplicavel') => ({
  data: { ok: false, status, reason },
  error: null,
})

beforeEach(() => {
  rpc.mockReset().mockResolvedValue(ok('material_enviado'))
  from.mockReset()
})

describe('OrderMaterialBlock — quando aparece', () => {
  it('pedido `nao_aplicavel` não ganha bloco nenhum', () => {
    const { container } = montar({ materialStatus: 'nao_aplicavel' })
    expect(container).toBeEmptyDOMElement()
  })

  it('estado desconhecido cai em `nao_aplicavel` e também não renderiza', () => {
    const { container } = montar({ materialStatus: 'inventado' })
    expect(container).toBeEmptyDOMElement()
  })

  it('`aguardando_material` mostra a situação, os materiais e o campo', () => {
    montar()
    expect(screen.getByText('Aguardando material')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mecha de cabelo' })).toBeInTheDocument()
    expect(screen.getByLabelText(/registre o código de rastreio/i)).toBeInTheDocument()
  })

  it('pedido sem lista mostra "combinado com a gente", nunca lista vazia', () => {
    montar({ kinds: [] })
    expect(screen.getByText(/combinado com a gente/i)).toBeInTheDocument()
  })

  it('cada material leva à ficha dele', () => {
    montar({ kinds: ['leite_materno'] })
    expect(screen.getByRole('link', { name: 'Leite materno' })).toHaveAttribute(
      'href',
      '/como-enviar-seu-material-de-dna#leite-materno',
    )
  })
})

describe('OrderMaterialBlock — informar é OPCIONAL (MAT-11 AC 10)', () => {
  it('a tela diz que é opcional e que a loja registra no lugar dela', () => {
    // Nada trava se ela não informar: a Adri registra pelo painel, ou marca o recebimento direto.
    montar()
    expect(screen.getByText(/é opcional/i)).toBeInTheDocument()
    expect(screen.getByText(/registramos para você/i)).toBeInTheDocument()
  })

  it('código vazio NÃO chama a RPC', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(rpc).not.toHaveBeenCalled()
  })

  it('código só de espaços NÃO chama a RPC', async () => {
    montar()
    fireEvent.change(screen.getByLabelText(/registre o código/i), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(screen.getByText(/digite o código/i)).toBeInTheDocument())
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('OrderMaterialBlock — a escrita é por RPC, e só ela (MAT-11 AC 11)', () => {
  it('chama `set_material_tracking` com o pedido e o código, e NADA mais', async () => {
    montar()
    fireEvent.change(screen.getByLabelText(/registre o código/i), {
      target: { value: 'aa123456789br' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith('set_material_tracking', {
      p_order_id: 'order-1',
      p_code: 'AA123456789BR',
    })
  })

  it('NUNCA usa `from("orders").update(...)` — a policy de UPDATE segue fechada', () => {
    // PAY-10 é a razão de a RPC existir. Um `PATCH` aqui reabriria o buraco que ela fechou.
    montar()
    fireEvent.change(screen.getByLabelText(/registre o código/i), { target: { value: 'AA1BR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(from).not.toHaveBeenCalled()
  })

  it('recusa mostra MOTIVO VISÍVEL — nunca falha em silêncio', async () => {
    rpc.mockResolvedValue(recusa('not_allowed'))
    montar()
    fireEvent.change(screen.getByLabelText(/registre o código/i), { target: { value: 'AA1BR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() =>
      expect(screen.getByText(/não conseguimos registrar o código/i)).toBeInTheDocument(),
    )
    // E o caminho alternativo continua na tela: avisar a loja.
    expect(screen.getByText(/a gente registra para você/i)).toBeInTheDocument()
  })

  it('erro de rede vira mensagem, não tela quebrada', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'network' } })
    montar()
    fireEvent.change(screen.getByLabelText(/registre o código/i), { target: { value: 'AA1BR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(screen.getByText(/não foi possível registrar/i)).toBeInTheDocument())
  })
})

describe('OrderMaterialBlock — o estado nunca volta para trás (MAT-11 AC 12)', () => {
  it.each(['material_recebido', 'em_producao'])(
    'em `%s` o campo some e a tela diz que já está com a loja',
    status => {
      montar({ materialStatus: status })

      expect(screen.queryByLabelText(/registre o código/i)).not.toBeInTheDocument()
      expect(screen.getByText(/já está com a gente/i)).toBeInTheDocument()
    },
  )

  it('o código já registrado aparece', () => {
    montar({ materialStatus: 'material_enviado', trackingCode: 'AA123456789BR' })
    expect(screen.getByText('AA123456789BR')).toBeInTheDocument()
  })

  it('em `material_enviado` ainda dá para corrigir o código', () => {
    montar({ materialStatus: 'material_enviado', trackingCode: 'AA1BR' })
    expect(screen.getByLabelText(/registre o código/i)).toBeInTheDocument()
  })
})

describe('OrderMaterialBlock — pedido cancelado sai da fila (edge case)', () => {
  it('não oferece o campo, e diz o que acontece com o material', () => {
    montar({ cancelled: true })

    expect(screen.queryByLabelText(/registre o código/i)).not.toBeInTheDocument()
    expect(screen.getByText(/foi cancelado/i)).toBeInTheDocument()
    expect(screen.getByText(/volta para você/i)).toBeInTheDocument()
  })
})
