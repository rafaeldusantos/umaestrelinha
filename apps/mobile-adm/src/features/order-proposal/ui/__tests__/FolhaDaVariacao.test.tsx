// A folha da variação sozinha: o botão "Acrescentar" entrega a escolha UMA vez por abertura.
//
// No navegador, o primeiro toque fecha a folha pelo histórico (assíncrono) e o Radix a mantém montada
// durante a animação de saída — um segundo toque nesse intervalo ainda alcança o botão. Aqui a folha
// fica aberta de propósito (o `controle` é fixo), que é exatamente esse intervalo, sem depender de
// animação no jsdom (que desmonta na hora). A fiação pela página real está em
// `pages/__tests__/montarPedido.pecas.test.tsx`.
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PecaParaProposta } from '@estrelinha/core/proposals'

import FolhaDaVariacao from '../FolhaDaVariacao'

vi.mock('../../model/usePromocaoDasLinhas', () => ({ usePromocaoDasLinhas: () => ({ promocoes: null, erroBruto: null }) }))

const COLAR: PecaParaProposta = {
  id: 'bbbbbbbb-0000-4000-8000-000000000002',
  nome: 'Colar Estrela',
  ativa: true,
  precoBase: 120,
  imagem: null,
  politica: 'track',
  estoqueTotal: 5,
  pedeMaterial: false,
  limiteDeGravacao: null,
  medidas: { weight_kg: null, width_cm: null, height_cm: null, length_cm: null },
  variacoes: [],
}

const montar = (aoConfirmar = vi.fn()) => {
  render(
    <FolhaDaVariacao
      controle={{ aberta: true, abrir: vi.fn(), fechar: vi.fn() }}
      peca={COLAR}
      editando={null}
      sacola={[]}
      aoConfirmar={aoConfirmar}
      emailDaCliente="helena@exemplo.invalid"
      aoRecusarPapel={vi.fn()}
    />,
  )
  return aoConfirmar
}

describe('FolhaDaVariacao · o botão de confirmar', () => {
  it('dois toques seguidos em "Acrescentar" entregam a escolha uma vez só, com a quantidade escolhida', async () => {
    const aoConfirmar = montar()
    const folha = screen.getByRole('dialog')
    await act(async () => {
      fireEvent.click(within(folha).getByRole('button', { name: 'Uma a mais' }))
    })
    const botao = within(folha).getByRole('button', { name: /^Acrescentar · / })
    expect((botao.textContent ?? '').replace(/\u00a0/g, ' ')).toBe('Acrescentar · R$ 240,00')
    // Cada toque no seu evento: o React aplica o primeiro antes do segundo, como no celular.
    await act(async () => {
      fireEvent.click(botao)
    })
    await act(async () => {
      fireEvent.click(botao)
    })
    expect(aoConfirmar).toHaveBeenCalledTimes(1)
    expect(aoConfirmar).toHaveBeenCalledWith({ variacao: null, quantidade: 2, gravacao: '' })
  })
})

describe('FolhaDaVariacao · o preço', () => {
  it('o preço da peça em serifa 700, na primária, a 16 px', () => {
    montar()
    const preco = within(screen.getByRole('dialog')).getByText((t) => t.replace(/\u00a0/g, ' ') === 'R$ 120,00')
    const cs = (preco.getAttribute('class') ?? '').split(/\s+/)
    expect(cs).toEqual(expect.arrayContaining(['font-display', 'font-bold', 'text-estrelinha-primary', 'text-base']))
    expect(cs).not.toContain('text-estrelinha-ink')
  })
})
