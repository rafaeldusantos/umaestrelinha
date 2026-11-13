// A lista de `/admin/campanhas`, pela página real sobre o dublê do client que ENXERGA a consulta:
// as quatro pílulas de estado, a vigência, os percentuais, as peças, e os três estados sem dado.
//
// Inventário de `vi.mock`: só o client do supabase. O hook, o modelo e `core` são os reais.

import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro, Resposta } from '@/test/dubleSupabase'
import { AGORA, BLACK_FRIDAY, INVERNO, MAES, NATAL, USO } from './campanhasFixture'

const h = vi.hoisted(() => ({
  responder: (() => ({ data: [] })) as (r: unknown) => unknown,
  calls: [] as unknown[],
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble: criar } = await import('@/test/dubleSupabase')
  const duble = criar(r => h.responder(r) as Resposta)
  h.calls = duble.calls
  return { supabase: { from: duble.from } }
})

import AdminCampaignsPage from '../AdminCampaignsPage'


const responderCom = (campanhas: Resposta, uso: Resposta = { data: USO }) => {
  h.responder = (r: unknown) => {
    const reg = r as Registro
    if (reg.table === 'campaigns') return campanhas
    if (reg.table === 'campaign_percent_usage') return uso
    return { data: [] }
  }
}

const EditorSentinela = () => <div>EDITOR DE {useParams().id}</div>

const renderizar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/admin/campanhas']}>
        <Routes>
          <Route path="/admin/campanhas" element={<AdminCampaignsPage />} />
          <Route path="/admin/campanhas/nova" element={<div>EDITOR EM BRANCO</div>} />
          <Route path="/admin/campanhas/:id" element={<EditorSentinela />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  h.calls.length = 0
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AGORA)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('/admin/campanhas — a tabela', () => {
  it('cada campanha com a vigência, os percentuais, as peças e a pílula do estado — as quatro', async () => {
    responderCom({ data: [INVERNO, NATAL, BLACK_FRIDAY, MAES] })
    renderizar()

    const linhas = await screen.findAllByTestId('linha-da-campanha')
    expect(linhas).toHaveLength(4)

    const linhaDe = (nome: string) => linhas.find(l => within(l).queryAllByText(nome).length > 0)!
    const bf = linhaDe('Black Friday')
    expect(within(bf).getByText('13/11 a 30/11/2026')).toBeInTheDocument()
    expect(within(bf).getAllByText(/^\d+%$/).map(n => n.textContent)).toEqual(['10%', '15%', '20%'])
    expect(within(bf).getByText('15')).toBeInTheDocument()
    expect(within(bf).getByText('Em vigência')).toHaveAttribute('data-estado', 'em-vigencia')
    // O selo em linha antes do nome: o texto, e o MAIOR percentual.
    expect(within(bf).getByRole('img', { name: 'BLACK FRIDAY, 20% de desconto' })).toBeInTheDocument()

    expect(within(linhaDe('Natal')).getByText('Agendada')).toHaveAttribute('data-estado', 'agendada')
    expect(within(linhaDe('Dia das Mães')).getByText('Encerrada')).toHaveAttribute('data-estado', 'encerrada')
    expect(within(linhaDe('Inverno')).getByText('Desligada')).toHaveAttribute('data-estado', 'desligada')
  })

  it('o selo da linha usa as cores da campanha, cruzadas', async () => {
    responderCom({ data: [INVERNO] })
    renderizar()
    const linha = await screen.findByTestId('linha-da-campanha')
    const selo = within(linha).getByTestId('selo-em-linha')
    const [texto, percentual] = Array.from(selo.children) as HTMLElement[]
    expect(texto.style.backgroundColor).toBe('rgb(35, 48, 58)')
    expect(texto.style.color).toBe('rgb(184, 148, 95)')
    expect(percentual.style.backgroundColor).toBe('rgb(184, 148, 95)')
    expect(percentual.style.color).toBe('rgb(35, 48, 58)')
    expect(percentual.textContent).toBe('−5%')
  })

  it('a linha abre a edição', async () => {
    responderCom({ data: [BLACK_FRIDAY] })
    renderizar()
    const linha = await screen.findByTestId('linha-da-campanha')
    fireEvent.click(within(linha).getByRole('link'))
    expect(await screen.findByText('EDITOR DE bf')).toBeInTheDocument()
  })

  it('a lista lê as campanhas e o uso por percentual', async () => {
    responderCom({ data: [BLACK_FRIDAY] })
    renderizar()
    await screen.findByTestId('linha-da-campanha')
    const regs = h.calls as Registro[]
    expect(regs.map(r => r.table).sort()).toEqual(['campaign_percent_usage', 'campaigns'])
    expect(regs.find(r => r.table === 'campaigns')!.filters).toEqual([
      { method: 'order', args: ['starts_at', { ascending: false }] },
    ])
  })

  it('no celular, os cartões dizem "{vigência} · {n} peças"', async () => {
    responderCom({ data: [BLACK_FRIDAY, NATAL] })
    renderizar()
    const cartoes = await screen.findAllByTestId('cartao-da-campanha')
    expect(cartoes[0]).toHaveTextContent('13/11 a 30/11/2026 · 15 peças')
    expect(cartoes[1]).toHaveTextContent('01/12 a 24/12/2026 · 1 peça')
  })

  it('a nota do rodapé, literal', async () => {
    responderCom({ data: [BLACK_FRIDAY] })
    renderizar()
    expect(
      await screen.findByText(
        'A campanha vale na loja só quando está ligada e dentro da vigência (horário de Brasília). Encerrada, ela fica aqui com as marcações das peças, sem efeito.',
      ),
    ).toBeInTheDocument()
  })
})

describe('/admin/campanhas — sem dado', () => {
  it('vazio: a frase e o botão de criar', async () => {
    responderCom({ data: [] })
    renderizar()
    expect(await screen.findByText('Nenhuma campanha ainda.')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Nova campanha/ })).toHaveLength(2)
  })

  it('erro: o motivo e "Tentar de novo", que relê', async () => {
    responderCom({ data: null, error: { message: 'falhou a rede' } })
    renderizar()
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível carregar as campanhas. falhou a rede')

    responderCom({ data: [BLACK_FRIDAY] })
    fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(screen.getAllByTestId('linha-da-campanha')).toHaveLength(1))
  })

  it('carregando: o esqueleto, e nenhuma linha', () => {
    h.responder = () => new Promise(() => {})
    renderizar()
    expect(screen.queryByTestId('linha-da-campanha')).toBeNull()
    expect(screen.queryByText('Nenhuma campanha ainda.')).toBeNull()
  })
})
