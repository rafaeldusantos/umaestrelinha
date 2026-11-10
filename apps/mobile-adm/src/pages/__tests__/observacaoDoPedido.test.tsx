// A observação do pedido no detalhe, pela árvore REAL (`<App />` com sessão admin sobre o dublê do
// client): o bloco, a autoria, a ação e a falha que fica no bloco. A página monta o bloco; o teste
// nunca recria a composição. A porta (`gravarAcao`) e o dono da escrita (`core/order-actions`) são os
// de verdade.
//
// As frases são escritas POR EXTENSO (nunca lidas das constantes que elas provam). A autoria é a de
// `adminNoteAuthorLine` para 2026-10-21 17:40 UTC: 14h40 em Brasília.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pedidoHref } from '@/entities/order'
import { esquecerAcoes } from '@/features/order-actions'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { NOTA, OBSERVACAO, detalhe, item, statusRow } from '@/test/pedidos'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const ID = '00000000-0000-4000-8000-000000000244'
const REDE = { message: 'Failed to fetch' }
const AUTORIA = 'Atualizada em 21 out 2026 às 14h40 por Adri Muniz'

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const ehDetalhe = (cadeia: Elo[]) => cadeia.some((e) => e.metodo === 'maybeSingle')

const responder = (observacao: RespostaTabela | (() => RespostaTabela) = { data: null, error: null }) => {
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
  fake.responderTabela('order_list', (cadeia): RespostaTabela =>
    ehDetalhe(cadeia) ? { data: detalhe(), error: null } : { data: [], error: null, count: 0 },
  )
  fake.responderTabela('order_items', { data: [item()], error: null })
  fake.responderTabela('order_status_history', { data: [statusRow()], error: null })
  fake.responderTabela('order_notes', { data: [NOTA], error: null })
  fake.responderTabela('order_notifications', { data: [], error: null })
  fake.responderTabela('order_admin_notes', observacao)
  fake.responderTabela('order_manual_payments', { data: null, error: null })
}

const abrir = async () => {
  await montarApp(pedidoHref(ID), { estado: { doApp: true } })
  await andar(50)
}
const bloco = (nome: string) => screen.queryByRole('region', { name: nome })
const observacao = () => bloco('Observação')

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  esquecerRolagens()
  esquecerAcoes()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  act(() => esquecerAcoes())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('o bloco "Observação" no detalhe do pedido', () => {
  it('com observação gravada: o texto, a autoria da última edição e a ação "Editar"', async () => {
    responder({ data: OBSERVACAO, error: null })
    await abrir()
    const el = observacao()!
    expect(el).toBeInTheDocument()
    expect(within(el).getByText('Gravar o nome com letra cursiva, como no pedido anterior.')).toBeInTheDocument()
    expect(within(el).getByText(AUTORIA)).toBeInTheDocument()
    const editar = within(el).getByRole('button', { name: 'Editar observação' })
    expect(editar.textContent).toBe('Editar observação')
    expect(within(el).queryByRole('button', { name: 'Adicionar observação' })).toBeNull()
  })

  it('o texto guarda as quebras de linha como foram digitadas', async () => {
    responder({ data: { ...OBSERVACAO, note: 'Primeira linha.\nSegunda linha.' }, error: null })
    await abrir()
    const texto = within(observacao()!).getByText((_, n) => n?.textContent === 'Primeira linha.\nSegunda linha.' && n.tagName === 'P')
    expect(texto.className.split(/\s+/)).toContain('whitespace-pre-wrap')
  })

  it('sem observação: só a ação "Adicionar observação" — nenhum texto, nenhuma autoria', async () => {
    responder({ data: null, error: null })
    await abrir()
    const el = observacao()!
    expect(within(el).getByRole('button', { name: 'Adicionar observação' })).toBeInTheDocument()
    expect(within(el).queryByText(/^Atualizada em/)).toBeNull()
    expect(within(el).queryByRole('button', { name: /^Editar/ })).toBeNull()
    expect(within(el).queryByText('Não consegui ler a observação deste pedido.')).toBeNull()
  })

  it('a leitura da observação falhou: a frase do bloco e "Tentar de novo"; os outros blocos seguem', async () => {
    let n = 0
    responder(() => (++n === 1 ? { data: null, error: REDE } : { data: OBSERVACAO, error: null }))
    await abrir()
    const el = observacao()!
    expect(within(el).getByText('Não consegui ler a observação deste pedido.')).toBeInTheDocument()
    // Sem afirmar "sem observação": nem a ação de adicionar, nem a de editar.
    expect(within(el).queryByRole('button', { name: 'Adicionar observação' })).toBeNull()
    expect(within(el).queryByRole('button', { name: /^Editar/ })).toBeNull()
    for (const nome of ['Cliente', '1 joia', 'Entrega', 'Histórico']) expect(bloco(nome)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Pedido #0244')

    const cliente = bloco('Cliente')
    fireEvent.click(within(el).getByRole('button', { name: 'Tentar de novo' }))
    await andar(50)
    expect(within(observacao()!).getByText(AUTORIA)).toBeInTheDocument()
    expect(bloco('Cliente')).toBe(cliente)
  })
})
