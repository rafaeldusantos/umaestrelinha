// Feature `82` · T11 — "Colocar em produção" SOZINHO (`ENV-25`, `ENV-26`). Pela página, o pedido
// cancelado nunca chega a este botão: o bloco desenha a frase do cancelado no lugar dele. As duas
// camadas se mascaram (sensor do autor, M6: trocar `canStartProduction` por uma comparação só do
// material sobrevivia à página) — aqui o botão é provado por si, com a decisão vinda de `core`.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { PedidoDoDetalhe } from '@/entities/order'
import { detalhe } from '@/test/pedidos'

import type { AcaoDoPedido } from '../../model/useAcaoDoPedido'
import ColocarEmProducao from '../ColocarEmProducao'

const acaoDe = (extra: Partial<AcaoDoPedido> = {}): AcaoDoPedido => ({
  executar: vi.fn(async () => true),
  travado: false,
  erro: null,
  // Feature `82`, Fase 5 (T17): a superfície lê o erro DELA por `erroDe` — o dublê não tem erro.
  erroDe: () => null,
  erroBruto: null,
  ...extra,
})
const montar = (pedido: PedidoDoDetalhe, acao = acaoDe()) => {
  render(<ColocarEmProducao pedido={pedido} acao={acao} />)
  return acao
}
const botao = () => screen.queryByRole('button', { name: /^(Colocar em produção|Salvando…)$/ })

describe('ColocarEmProducao (ENV-25)', () => {
  it.each([
    ['recebido e cancelado', detalhe({ status: 'cancelled', payment_status: 'cancelled', material_status: 'material_recebido' })],
    ['aguardando', detalhe({ status: 'paid', material_status: 'aguardando_material' })],
    ['a caminho', detalhe({ status: 'paid', material_status: 'material_enviado' })],
    ['em produção', detalhe({ status: 'paid', material_status: 'em_producao' })],
    ['sem material', detalhe({ status: 'paid', material_status: 'nao_aplicavel' })],
  ])('%s ⇒ nada', (_n, pedido) => {
    montar(pedido)
    expect(botao()).toBeNull()
  })

  it('recebido: tocar pede `{ tipo: "producao" }` à ação do pedido, com a linha', () => {
    const pedido = detalhe({ status: 'paid', material_status: 'material_recebido' })
    const acao = montar(pedido)
    fireEvent.click(botao()!)
    // O terceiro argumento leva o foco ao título no sucesso (T15 — o botão some e o foco caía no
    // `<body>`); o efeito é provado pela página real em `envelopeDaCliente.test.tsx`.
    expect(acao.executar).toHaveBeenCalledWith(pedido, { tipo: 'producao' }, { aoConcluir: expect.any(Function) })
  })

  it('travado: "Salvando…" com `aria-disabled`, e o toque não sai', () => {
    const acao = montar(detalhe({ status: 'paid', material_status: 'material_recebido' }), acaoDe({ travado: true }))
    expect(botao()).toHaveTextContent('Salvando…')
    expect(botao()).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(botao()!)
    expect(acao.executar).not.toHaveBeenCalled()
  })
})

// Fase 5, T17 (BUG-20261026-erro-de-uma-acao-aparece-em-outra): o erro de "Colocar em produção" fica
// junto do botão, e só o dele — `erroDe(['producao'])`.
describe('o erro junto do botão (82, T17)', () => {
  const ERRO = { frase: 'Não consegui salvar. Tente de novo.', retentativa: null }
  const RECEBIDO = () => detalhe({ status: 'paid', material_status: 'material_recebido' })

  it('pede SÓ o erro de `producao`, e o desenha logo depois do botão', () => {
    const erroDe = vi.fn((origens: readonly string[]) => (origens.length === 1 && origens[0] === 'producao' ? ERRO : null))
    montar(RECEBIDO(), acaoDe({ erroDe, erro: ERRO }))
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(botao()!.compareDocumentPosition(alerta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(erroDe).toHaveBeenCalledWith(['producao'])
  })

  it('o erro de OUTRA ação (o dublê não o devolve para `producao`) não aparece', () => {
    montar(RECEBIDO(), acaoDe({ erro: ERRO, erroDe: () => null }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('o pedido mudou e o botão saiu: a frase fica sozinha no lugar dele', () => {
    montar(detalhe({ status: 'paid', material_status: 'em_producao' }), acaoDe({ erroDe: () => ERRO }))
    expect(botao()).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
  })

  it('no ar, nenhum erro (os estados são exclusivos)', () => {
    montar(RECEBIDO(), acaoDe({ travado: true, erroDe: () => ERRO }))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
