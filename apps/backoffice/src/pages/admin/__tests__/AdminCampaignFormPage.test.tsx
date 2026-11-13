// O cadastro da campanha (`/admin/campanhas/nova` e `/admin/campanhas/:id`), pela página real sobre
// o dublê do client que ENXERGA a consulta: cada recusa visível com o Salvar desligado e nada
// gravado; a gravação com o payload exato; a recusa de tirar percentual em uso pela contagem da view;
// "Encerrar agora" só em vigência; apagar desligado com pedido; a prévia acompanhando o que se digita.
//
// Inventário de `vi.mock`: o client do supabase e o `toast`. O hook, a porta, o modelo e `core` são os
// reais.

import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro, Resposta } from '@/test/dubleSupabase'
import type { DbCampaign } from '@estrelinha/supabase/types/campaign'
import { AGORA, BLACK_FRIDAY, NATAL, USO } from './campanhasFixture'

const h = vi.hoisted(() => ({
  campanhas: [] as unknown[],
  uso: [] as unknown[],
  pedidos: 0,
  responderExtra: null as null | ((r: unknown) => unknown),
  calls: [] as unknown[],
  rpc: null as unknown as ReturnType<typeof import('vitest')['vi']['fn']>,
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { vi: v } = await import('vitest')
  const { criarDuble } = await import('@/test/dubleSupabase')
  const duble = criarDuble(r => {
    const extra = h.responderExtra?.(r)
    if (extra) return extra as Resposta
    if (r.table === 'campaigns' && (r.update || r.delete)) return { data: [{ id: 'x' }] }
    if (r.table === 'campaigns') return { data: h.campanhas }
    if (r.table === 'campaign_percent_usage') return { data: h.uso }
    if (r.table === 'order_items') return { data: null, count: h.pedidos }
    return { data: [] }
  })
  h.calls = duble.calls
  h.rpc = v.fn().mockResolvedValue({ data: 'nova-id', error: null })
  return { supabase: { from: duble.from, rpc: (...a: unknown[]) => h.rpc(...a) } }
})

vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminCampaignFormPage from '../AdminCampaignFormPage'

const renderizar = (rota: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/campanhas" element={<div>LISTA DE CAMPANHAS</div>} />
          <Route path="/admin/campanhas/nova" element={<AdminCampaignFormPage />} />
          <Route path="/admin/campanhas/:id" element={<AdminCampaignFormPage />} />
          <Route path="/admin/produtos" element={<div>LISTA DE PRODUTOS</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const comCampanhas = (campanhas: DbCampaign[], pedidos = 0) => {
  h.campanhas = campanhas
  h.uso = USO.filter(u => campanhas.some(c => c.id === u.campaign_id))
  h.pedidos = pedidos
}

const salvar = () => screen.getByRole('button', { name: 'Salvar campanha' })
const digitar = (rotulo: string | RegExp, valor: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } })
const adicionarPercentual = (p: string) => {
  digitar('Novo percentual', p)
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
}

/** Uma campanha nova válida: nome, e os percentuais 10, 15 e 20. Sem outras campanhas. */
const preencherValida = async () => {
  renderizar('/admin/campanhas/nova')
  await screen.findByRole('heading', { name: 'Nova campanha' })
  digitar('Nome', 'Black Friday')
  for (const p of ['20', '10', '15']) adicionarPercentual(p)
}

const rpcNaoChamada = () => expect(h.rpc).not.toHaveBeenCalled()

beforeEach(() => {
  h.calls.length = 0
  h.responderExtra = null
  h.rpc.mockReset()
  h.rpc.mockResolvedValue({ data: 'nova-id', error: null })
  comCampanhas([])
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AGORA)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('nova campanha — gravar', () => {
  it('grava pela porta, com o fim exclusivo, os percentuais em ordem e preto e ouro', async () => {
    await preencherValida()
    expect(screen.getByTestId('estado-do-salvar')).toHaveTextContent('Pronta para salvar.')
    expect(salvar()).toBeEnabled()
    await act(async () => fireEvent.click(salvar()))

    expect(h.rpc).toHaveBeenCalledTimes(1)
    expect(h.rpc).toHaveBeenCalledWith('save_campaign', {
      p_id: null,
      p_name: 'Black Friday',
      p_badge_text: 'Black Friday',
      p_band_color: '#161514',
      p_accent_color: '#C2A063',
      // Nova nasce hoje 00:00 e hoje 23:59 em Brasília; o fim grava o minuto seguinte.
      p_starts_at: '2026-11-20T03:00:00.000Z',
      p_ends_at: '2026-11-21T03:00:00.000Z',
      p_active: true,
      p_percents: [10, 15, 20],
    })
    expect(await screen.findByText('LISTA DE CAMPANHAS')).toBeInTheDocument()
  })

  it('o texto do selo acompanha os 14 primeiros caracteres do nome, até ser escrito à mão', async () => {
    renderizar('/admin/campanhas/nova')
    await screen.findByRole('heading', { name: 'Nova campanha' })
    digitar('Nome', 'Black Friday de Natal')
    expect(screen.getByLabelText('Texto do selo')).toHaveValue('Black Friday d')
    digitar('Texto do selo', 'NATAL')
    digitar('Nome', 'Black Friday de Natal 2026')
    expect(screen.getByLabelText('Texto do selo')).toHaveValue('NATAL')
  })

  it('o texto do selo apagado volta a acompanhar o nome', async () => {
    renderizar('/admin/campanhas/nova')
    await screen.findByRole('heading', { name: 'Nova campanha' })
    digitar('Nome', 'Natal')
    digitar('Texto do selo', 'FIM DE ANO')
    digitar('Texto do selo', '')
    digitar('Nome', 'Natal de 2026')
    expect(screen.getByLabelText('Texto do selo')).toHaveValue('Natal de 2026')
  })
})

describe('as recusas do cadastro, cada uma com o motivo, nada gravado', () => {
  it('fim antes do início, no mesmo dia (data e hora)', async () => {
    await preencherValida()
    digitar('Hora do início', '23:59')
    digitar('Hora do fim', '00:00')
    expect(screen.getByText('O fim vem antes do início.')).toBeInTheDocument()
    expect(salvar()).toBeDisabled()
    expect(screen.getByTestId('estado-do-salvar')).toHaveTextContent('Corrija o que está marcado para salvar.')
    fireEvent.click(salvar())
    rpcNaoChamada()
  })

  it('percentual 0 e 80: "Use um número de 1 a 70."; repetido: "{n}% já está na campanha."', async () => {
    await preencherValida()
    adicionarPercentual('0')
    expect(screen.getByRole('alert')).toHaveTextContent('Use um número de 1 a 70.')
    adicionarPercentual('80')
    expect(screen.getByRole('alert')).toHaveTextContent('Use um número de 1 a 70.')
    adicionarPercentual('15')
    expect(screen.getByRole('alert')).toHaveTextContent('15% já está na campanha.')
    expect(screen.getAllByTestId('pilula-do-percentual').map(p => p.firstChild?.textContent)).toEqual(['10%', '15%', '20%'])
  })

  it('o sexto percentual: "Até 5 percentuais por campanha."', async () => {
    await preencherValida()
    adicionarPercentual('25')
    adicionarPercentual('30')
    adicionarPercentual('35')
    expect(screen.getByRole('alert')).toHaveTextContent('Até 5 percentuais por campanha.')
    expect(screen.getAllByTestId('pilula-do-percentual')).toHaveLength(5)
  })

  it('nenhum percentual: o motivo e o Salvar desligado', async () => {
    renderizar('/admin/campanhas/nova')
    await screen.findByRole('heading', { name: 'Nova campanha' })
    digitar('Nome', 'Black Friday')
    expect(screen.getByText('Nenhum percentual ainda.')).toBeInTheDocument()
    expect(screen.getByText('Acrescente ao menos um percentual.')).toBeInTheDocument()
    expect(salvar()).toBeDisabled()
    // Com um percentual, o motivo sai; tirando o último, ele volta.
    adicionarPercentual('10')
    expect(screen.queryByText('Acrescente ao menos um percentual.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tirar 10%' }))
    expect(screen.getByText('Acrescente ao menos um percentual.')).toBeInTheDocument()
    fireEvent.click(salvar())
    rpcNaoChamada()
  })

  it('a recusa do repetido sai junto com o percentual, e o motivo da lista vazia aparece', async () => {
    renderizar('/admin/campanhas/nova')
    await screen.findByRole('heading', { name: 'Nova campanha' })
    digitar('Nome', 'Black Friday')
    adicionarPercentual('10')
    adicionarPercentual('10')
    expect(screen.getByRole('alert')).toHaveTextContent('10% já está na campanha.')
    fireEvent.click(screen.getByRole('button', { name: 'Tirar 10%' }))
    expect(screen.getByText('Nenhum percentual ainda.')).toBeInTheDocument()
    expect(screen.queryByText('10% já está na campanha.')).toBeNull()
    expect(screen.getByText('Acrescente ao menos um percentual.')).toBeInTheDocument()
    expect(salvar()).toBeDisabled()
  })

  it('vigência que cruza a de outra campanha ligada', async () => {
    comCampanhas([BLACK_FRIDAY])
    await preencherValida()
    expect(
      screen.getByText(
        'A vigência cruza a da campanha “Black Friday” (13/11 a 30/11). Só uma campanha ligada pode valer por vez: mude as datas ou desligue a outra.',
      ),
    ).toBeInTheDocument()
    expect(salvar()).toBeDisabled()
    // Desligada, ela convive.
    fireEvent.click(screen.getByRole('switch', { name: 'Campanha ligada' }))
    expect(screen.queryByText(/A vigência cruza/)).toBeNull()
    expect(salvar()).toBeEnabled()
  })

  it('texto do selo acima de 14: o erro literal, o contador e Salvar desligado', async () => {
    await preencherValida()
    digitar('Texto do selo', 'BLACK FRIDAY 26')
    expect(
      screen.getByText('O selo cabe até 14 caracteres no cartão do celular. Use uma forma curta do nome.'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('contador-do-selo')).toHaveTextContent('15 / 14')
    expect(salvar()).toBeDisabled()
    fireEvent.click(salvar())
    rpcNaoChamada()
  })

  it('nome vazio: Salvar desligado', async () => {
    await preencherValida()
    digitar('Nome', '')
    expect(screen.getByText('Dê um nome à campanha.')).toBeInTheDocument()
    expect(salvar()).toBeDisabled()
  })

  it('par abaixo de 4,5:1 é recusado com a razão medida; as combinações prontas consertam', async () => {
    await preencherValida()
    expect(screen.getByTestId('medida-de-contraste')).toHaveTextContent('7,4:1 Contraste bom para ler o selo.')
    digitar('Cor de destaque', '#676767')
    expect(screen.getByTestId('medida-de-contraste')).toHaveTextContent(
      '3,2:1 Pouca diferença entre as cores: o selo fica difícil de ler. Escolha cores com mais diferença (o mínimo é 4,5:1).',
    )
    expect(salvar()).toBeDisabled()
    fireEvent.click(salvar())
    rpcNaoChamada()

    digitar('Cor de destaque', '#C2A06')
    expect(screen.getByTestId('medida-de-contraste')).toHaveTextContent('Use o formato #RRGGBB nas duas cores.')

    fireEvent.click(screen.getByRole('button', { name: /Vinho e rosa/ }))
    expect(screen.getByLabelText('Cor da faixa')).toHaveValue('#6E2433')
    expect(screen.getByLabelText('Cor de destaque')).toHaveValue('#F6DCD8')
    expect(salvar()).toBeEnabled()
  })
})

describe('a prévia do selo acompanha o que se digita', () => {
  it('o texto, as duas cores cruzadas e o MAIOR percentual', async () => {
    await preencherValida()
    const faixa = () => screen.getByTestId('faixa-da-campanha')
    expect(faixa()).toHaveAccessibleName('Black Friday, 20% de desconto')
    expect(screen.getByTestId('faixa-percentual')).toHaveTextContent('−20%')
    // R$ 179,90 com 20% ⇒ R$ 143,92.
    expect(screen.getByTestId('previa-preco').textContent).toMatch(/143,92/)

    digitar('Texto do selo', 'NATAL')
    fireEvent.click(screen.getByRole('button', { name: /Vinho e rosa/ }))
    expect(faixa()).toHaveAccessibleName('NATAL, 20% de desconto')
    expect(screen.getByTestId('faixa-texto').style.backgroundColor).toBe('rgb(110, 36, 51)')
    expect(screen.getByTestId('faixa-texto').style.color).toBe('rgb(246, 220, 216)')
    expect(screen.getByTestId('faixa-percentual').style.backgroundColor).toBe('rgb(246, 220, 216)')
    expect(screen.getByTestId('faixa-percentual').style.color).toBe('rgb(110, 36, 51)')
  })

  it('cor inválida cai para preto e ouro só na prévia', async () => {
    await preencherValida()
    digitar('Cor da faixa', '#12')
    expect(screen.getByTestId('faixa-texto').style.backgroundColor).toBe('rgb(22, 21, 20)')
  })
})

describe('editar — os percentuais em uso', () => {
  it('tirar o 15% com 12 peças é recusado com a contagem da view e o link das peças', async () => {
    comCampanhas([BLACK_FRIDAY])
    renderizar('/admin/campanhas/bf')
    await screen.findByRole('heading', { name: 'Black Friday' })
    expect(screen.getAllByTestId('pilula-do-percentual').map(p => p.textContent)).toEqual([
      '10%3 peçasTirar 10%',
      '15%12 peçasTirar 15%',
      '20%nenhuma peçaTirar 20%',
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Tirar 15%' }))
    expect(
      screen.getByText('12 peças usam 15%. Mude essas peças para outro percentual (ou tire da campanha) antes de tirar o 15%.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver as peças com 15%' })).toHaveAttribute(
      'href',
      '/admin/produtos?campanha=bf&percentual=15',
    )
    expect(screen.getAllByTestId('pilula-do-percentual')).toHaveLength(3)

    // Sem peça, sai.
    fireEvent.click(screen.getByRole('button', { name: 'Tirar 20%' }))
    expect(screen.getAllByTestId('pilula-do-percentual')).toHaveLength(2)
  })

  it('o banco recusando o percentual em uso (23503) volta na mesma frase', async () => {
    comCampanhas([BLACK_FRIDAY])
    renderizar('/admin/campanhas/bf')
    await screen.findByRole('heading', { name: 'Black Friday' })
    fireEvent.click(screen.getByRole('button', { name: 'Tirar 20%' }))
    h.rpc.mockResolvedValue({ data: null, error: { code: '23503', message: 'violates foreign key' } })
    // A tela contou zero peças em 20%, mas alguém marcou uma depois que ela abriu: o banco é a segunda
    // linha, e a recusa dele volta em frase, nada gravado.
    await act(async () => fireEvent.click(salvar()))
    expect(
      await screen.findByText('Um percentual que você tirou está em uso por alguma peça. Mude essas peças antes de tirá-lo.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('LISTA DE CAMPANHAS')).toBeNull()
    expect(h.rpc.mock.calls[0][1]).toMatchObject({ p_id: 'bf', p_percents: [10, 15] })
  })

  it('o subtítulo e o estado da edição', async () => {
    comCampanhas([BLACK_FRIDAY])
    renderizar('/admin/campanhas/bf')
    await screen.findByRole('heading', { name: 'Black Friday' })
    expect(screen.getByText('13/11 a 30/11/2026 · 15 peças marcadas')).toBeInTheDocument()
    expect(screen.getByText('Estado: em vigência até 30/11 às 23:59')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver as peças' })).toHaveAttribute('href', '/admin/produtos?campanha=bf')
    expect(screen.getByLabelText('Hora do fim')).toHaveValue('23:59')
  })
})

describe('encerrar e apagar', () => {
  it('"Encerrar agora" só na campanha em vigência, e põe o fim no instante atual', async () => {
    comCampanhas([BLACK_FRIDAY, NATAL])
    const { unmount } = renderizar('/admin/campanhas/natal')
    await screen.findByRole('heading', { name: 'Natal' })
    expect(screen.queryByRole('button', { name: 'Encerrar agora' })).toBeNull()
    unmount()

    renderizar('/admin/campanhas/bf')
    await screen.findByRole('heading', { name: 'Black Friday' })
    fireEvent.click(screen.getByRole('button', { name: 'Encerrar agora' }))
    const dialogo = await screen.findByRole('alertdialog')
    await act(async () => fireEvent.click(within(dialogo).getByRole('button', { name: 'Encerrar agora' })))

    const escrita = (h.calls as Registro[]).find(r => r.table === 'campaigns' && r.update)
    expect(escrita?.update).toEqual({ ends_at: AGORA.toISOString() })
    expect(escrita?.filters).toEqual([{ method: 'eq', args: ['id', 'bf'] }])
    expect(escrita?.select).toEqual(['id'])
    expect(await screen.findByText('LISTA DE CAMPANHAS')).toBeInTheDocument()
  })

  it('com pedido, apagar fica desligado com o motivo', async () => {
    comCampanhas([BLACK_FRIDAY], 2)
    renderizar('/admin/campanhas/bf')
    await screen.findByRole('heading', { name: 'Black Friday' })
    await waitFor(() =>
      expect(
        screen.getByText('Esta campanha já foi usada em pedido e não pode ser apagada. Para tirá-la da loja, encerre ou desligue.'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Apagar campanha' })).toBeDisabled()
    const contagem = (h.calls as Registro[]).find(r => r.table === 'order_items')
    expect(contagem?.filters).toEqual([{ method: 'eq', args: ['campaign_id', 'bf'] }])
  })

  it('sem pedido, apaga com confirmação', async () => {
    comCampanhas([NATAL], 0)
    renderizar('/admin/campanhas/natal')
    await screen.findByRole('heading', { name: 'Natal' })
    const apagar = screen.getByRole('button', { name: 'Apagar campanha' })
    await waitFor(() => expect(apagar).toBeEnabled())
    fireEvent.click(apagar)
    const dialogo = await screen.findByRole('alertdialog')
    await act(async () => fireEvent.click(within(dialogo).getByRole('button', { name: 'Apagar' })))
    const escrita = (h.calls as Registro[]).find(r => r.table === 'campaigns' && r.delete)
    expect(escrita?.filters).toEqual([{ method: 'eq', args: ['id', 'natal'] }])
    expect(await screen.findByText('LISTA DE CAMPANHAS')).toBeInTheDocument()
  })
})
