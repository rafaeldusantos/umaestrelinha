// A aba Adesão do Compre Junto (`/admin/compre-junto/adesao`), pela página real: só o client do
// Supabase é dublado. O que o SQL conta é provado pelo probe `05-adesao.sh` contra o banco local; aqui
// se prova o que a tela faz com a resposta — o período, os indicadores, os dois recortes, o vazio e o
// erro. A tabela no computador e os cartões no celular são classes por breakpoint (jsdom não mede
// layout): a medida é a da prova em navegador.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, from, consulta } = vi.hoisted(() => {
  const consulta = (data: unknown[] = []) => {
    const q: Record<string, unknown> = {}
    for (const m of ['select', 'order', 'eq', 'in', 'limit']) q[m] = () => q
    q.then = (ok: (r: unknown) => unknown) => Promise.resolve({ data, error: null }).then(ok)
    q.maybeSingle = () => Promise.resolve({ data: null, error: null })
    return q
  }
  return { rpc: vi.fn(), from: vi.fn((_tabela: string) => consulta()), consulta }
})

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { rpc, from } }))

import AdminBuyTogetherAdoptionPage from './AdminBuyTogetherAdoptionPage'
import AdminBuyTogetherPage from './AdminBuyTogetherPage'

const LISTA = '11111111-1111-4111-8111-111111111111'
const VAZIA = '22222222-2222-4222-8222-222222222222'
const APAGADA = '33333333-3333-4333-8333-333333333333'

const relatorio = (extra: Record<string, unknown> = {}) => ({
  dias: 30,
  desde: '2026-10-04',
  hoje: '2026-11-02',
  lido_em: '2026-11-02T18:00:00Z',
  pedidos_pagos: 4,
  pedidos_com: 3,
  pecas: 5,
  valor: 220,
  desconto_concedido: 37,
  parte: 0.75,
  media: 1.67,
  por_joia: [
    { principal: 'a', nome: 'Pingente Coração', pedidos: 2, pecas: 4, valor: 170, desconto_concedido: 37, top_nome: 'Corrente Veneziana em Prata 925 · 45 cm' },
    { principal: 'b', nome: 'Anel Estrela', pedidos: 1, pecas: 1, valor: 50, desconto_concedido: 5, top_nome: 'Corrente Veneziana em Prata 925 · 45 cm' },
  ],
  por_lista: [
    { lista_id: LISTA, direto: false, nome: 'Correntes', pecas: 4, valor: 210, desconto_concedido: 35, top_nome: 'Corrente Veneziana em Prata 925 · 45 cm' },
    { lista_id: null, direto: true, nome: null, pecas: 1, valor: 10, desconto_concedido: 2, top_nome: 'Caixinha de veludo' },
    { lista_id: APAGADA, direto: false, nome: null, pecas: 0, valor: 0, desconto_concedido: 0, top_nome: null },
    { lista_id: VAZIA, direto: false, nome: 'Embalagens', pecas: 0, valor: 0, desconto_concedido: 0, top_nome: null },
  ],
  ...extra,
})

let client: QueryClient

const montar = (rota = '/admin/compre-junto/adesao') =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/compre-junto" element={<AdminBuyTogetherPage />} />
          <Route path="/admin/compre-junto/adesao" element={<AdminBuyTogetherAdoptionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const indicador = (rotulo: string) => screen.getByText(rotulo).closest('[data-indicador]') as HTMLElement

beforeEach(() => {
  from.mockImplementation(() => consulta())
  rpc.mockReset()
  rpc.mockResolvedValue({ data: relatorio(), error: null })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe('a aba Adesão — período e indicadores', () => {
  it('abre nos últimos 30 dias, lendo a RPC do relatório com o período', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    expect(rpc).toHaveBeenCalledWith('buy_together_adoption', { p_dias: 30 })
    expect(screen.getByRole('tab', { name: '30 dias' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: '7 dias' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: '90 dias' })).toHaveAttribute('aria-selected', 'false')
  })

  it('mostra os três números, a parte dos pedidos pagos e a média por pedido', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const pedidos = indicador('Pedidos com Compre Junto')
    expect(within(pedidos).getByText('3')).toBeInTheDocument()
    expect(within(pedidos).getByText('75% dos 4 pedidos pagos')).toBeInTheDocument()
    const pecas = indicador('Peças levadas junto')
    expect(within(pecas).getByText('5')).toBeInTheDocument()
    expect(within(pecas).getByText('1,7 por pedido, em média')).toBeInTheDocument()
    const valor = indicador('Valor das peças levadas junto')
    expect(within(valor).getByText((_, n) => n?.textContent?.replace(/\s/g, ' ') === 'R$ 220,00')).toBeInTheDocument()
    expect(within(valor).getByText('pelo preço pago em cada peça')).toBeInTheDocument()
  })

  it('diz a regra por escrito: pedidos pagos e não cancelados, no dia de Brasília, e quando a peça conta', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    expect(
      screen.getByText(
        'Conta pedidos pagos e não cancelados, no dia de Brasília — a mesma régua do Dashboard. Uma peça conta quando entrou na sacola pelo Compre Junto e a joia dela está no mesmo pedido.',
      ),
    ).toBeInTheDocument()
  })

  it('trocar para 7 dias lê o relatório de 7 dias e mostra os números dele', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    rpc.mockResolvedValue({ data: relatorio({ dias: 7, pedidos_pagos: 3, pedidos_com: 2, pecas: 4, valor: 160, parte: 0.6667, media: 2 }), error: null })
    fireEvent.mouseDown(screen.getByRole('tab', { name: '7 dias' }))
    await screen.findByText('67% dos 3 pedidos pagos')
    expect(rpc).toHaveBeenLastCalledWith('buy_together_adoption', { p_dias: 7 })
    expect(screen.getByText('2,0 por pedido, em média')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '7 dias' })).toHaveAttribute('aria-selected', 'true')
  })

  it('90 dias também é um período', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    fireEvent.mouseDown(screen.getByRole('tab', { name: '90 dias' }))
    await waitFor(() => expect(rpc).toHaveBeenLastCalledWith('buy_together_adoption', { p_dias: 90 }))
  })

  it('um pedido pago só: a frase no singular', async () => {
    rpc.mockResolvedValue({ data: relatorio({ pedidos_pagos: 1, pedidos_com: 1, parte: 1 }), error: null })
    montar()
    expect(await screen.findByText('100% do 1 pedido pago')).toBeInTheDocument()
  })
})

describe('a aba Adesão — por joia principal e por lista', () => {
  it('por joia: a joia, pedidos, peças, valor e a peça que mais sai, com a variação — tabela e cartões', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const tabela = screen.getByTestId('adesao-tabela')
    expect(tabela.className).toMatch(/(?:^|\s)hidden(?:\s|$)/)
    expect(tabela.className).toMatch(/(?:^|\s)md:table(?:\s|$)/)
    expect(within(tabela).getAllByRole('columnheader').map(c => c.textContent)).toEqual([
      'Joia principal',
      'Pedidos',
      'Peças',
      'Valor',
      'Desconto concedido',
      'Peça que mais sai',
    ])
    const linha = within(tabela).getByText('Pingente Coração').closest('tr') as HTMLElement
    expect(within(linha).getAllByRole('cell').map(c => c.textContent?.replace(/\s/g, ' '))).toEqual([
      'Pingente Coração',
      '2',
      '4',
      'R$ 170,00',
      'R$ 37,00',
      'Corrente Veneziana em Prata 925 · 45 cm',
    ])
    const cartoes = screen.getByTestId('adesao-cartoes')
    expect(cartoes.className).toMatch(/(?:^|\s)md:hidden(?:\s|$)/)
    expect(within(cartoes).getByText('Anel Estrela')).toBeInTheDocument()
  })

  it('a barra de valor é proporcional ao maior valor do recorte', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const tabela = screen.getByTestId('adesao-tabela')
    const barra = (nome: string) =>
      within(within(tabela).getByText(nome).closest('tr') as HTMLElement).getByTestId('barra-de-valor') as HTMLElement
    expect(barra('Pingente Coração').style.width).toBe('100%')
    expect(barra('Anel Estrela').style.width).toBe('29%')
  })

  it('por lista: sem a coluna Pedidos, com a linha "direto no produto", a lista sem venda com zero e a apagada', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Por lista' }))
    const tabela = await screen.findByTestId('adesao-tabela')
    await waitFor(() =>
      expect(within(tabela).getAllByRole('columnheader').map(c => c.textContent)).toEqual(['Lista', 'Peças', 'Valor', 'Desconto concedido', 'Peça que mais sai']),
    )
    const celulas = (nome: string) =>
      within(within(tabela).getByText(nome).closest('tr') as HTMLElement)
        .getAllByRole('cell')
        .map(c => c.textContent?.replace(/\s/g, ' '))
    expect(celulas('Correntes')).toEqual(['Correntes', '4', 'R$ 210,00', 'R$ 35,00', 'Corrente Veneziana em Prata 925 · 45 cm'])
    expect(celulas('Peça escolhida direto no produto')).toEqual(['Peça escolhida direto no produto', '1', 'R$ 10,00', 'R$ 2,00', 'Caixinha de veludo'])
    expect(celulas('Embalagens')).toEqual(['Embalagens', '0', 'R$ 0,00', 'R$ 0,00', '—'])
    expect(celulas('Lista apagada')).toEqual(['Lista apagada', '0', 'R$ 0,00', 'R$ 0,00', '—'])
  })
})

describe('a aba Adesão — o desconto concedido', () => {
  // Os números da RPC: o valor é o pago (líquido) e o desconto é o cheio − o pago, os dois vindos do banco.
  // Os dois diferem em toda linha, para que ler um no lugar do outro reprove.
  const textoDe = (n: Element | null | undefined) => n?.textContent?.replace(/\s/g, ' ')

  it('por joia: a coluna "Desconto concedido" ao lado do valor pago, na tabela e nos cartões', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const tabela = screen.getByTestId('adesao-tabela')
    const celula = (nome: string, coluna: string) => {
      const cabecalhos = within(tabela).getAllByRole('columnheader').map(c => c.textContent)
      const linha = within(tabela).getByText(nome).closest('tr') as HTMLElement
      return textoDe(within(linha).getAllByRole('cell')[cabecalhos.indexOf(coluna)])
    }
    expect(celula('Pingente Coração', 'Desconto concedido')).toBe('R$ 37,00')
    expect(celula('Pingente Coração', 'Valor')).toBe('R$ 170,00')
    expect(celula('Anel Estrela', 'Desconto concedido')).toBe('R$ 5,00')
    const cartao = within(screen.getByTestId('adesao-cartoes')).getByText('Pingente Coração').closest('li') as HTMLElement
    expect(within(cartao).getByText((_, n) => textoDe(n) === 'Desconto concedido: R$ 37,00' && n?.tagName === 'P')).toBeInTheDocument()
    const outro = within(screen.getByTestId('adesao-cartoes')).getByText('Anel Estrela').closest('li') as HTMLElement
    expect(within(outro).getByText((_, n) => textoDe(n) === 'Desconto concedido: R$ 5,00' && n?.tagName === 'P')).toBeInTheDocument()
  })

  it('por lista: o desconto de cada lista e da peça escolhida direto, na tabela e nos cartões', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Por lista' }))
    const cartoes = screen.getByTestId('adesao-cartoes')
    await waitFor(() => expect(within(cartoes).getByText('Correntes')).toBeInTheDocument())
    const doCartao = (nome: string) =>
      [...(within(cartoes).getByText(nome).closest('li') as HTMLElement).querySelectorAll('p')].map(textoDe)
    expect(doCartao('Correntes')).toContain('Desconto concedido: R$ 35,00')
    expect(doCartao('Peça escolhida direto no produto')).toContain('Desconto concedido: R$ 2,00')
    expect(doCartao('Embalagens')).toContain('Desconto concedido: R$ 0,00')
  })

  it('o indicador de valor continua o preço pago, não o cheio', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const valor = indicador('Valor das peças levadas junto')
    expect(within(valor).getByText((_, n) => textoDe(n) === 'R$ 220,00')).toBeInTheDocument()
    expect(within(valor).getByText('pelo preço pago em cada peça')).toBeInTheDocument()
    expect(within(valor).queryByText((_, n) => textoDe(n) === 'R$ 257,00')).not.toBeInTheDocument()
  })

  it('resposta sem a chave (banco sem a migration) escreve "—", nunca um zero que ninguém contou', async () => {
    rpc.mockResolvedValue({
      data: relatorio({
        por_joia: [{ principal: 'a', nome: 'Pingente Coração', pedidos: 2, pecas: 4, valor: 170, top_nome: null }],
      }),
      error: null,
    })
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const tabela = screen.getByTestId('adesao-tabela')
    const linha = within(tabela).getByText('Pingente Coração').closest('tr') as HTMLElement
    expect(within(linha).getAllByRole('cell').map(textoDe)).toEqual(['Pingente Coração', '2', '4', 'R$ 170,00', '—', '—'])
    expect(document.body.textContent).not.toMatch(/NaN/)
  })

  it('o tom é memorial: nada de "economize" nem exclamação', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    expect(document.body.textContent).not.toMatch(/econom|!/i)
  })
})

describe('a aba Adesão — o cartão do recorte como no protótipo (BUG-013)', () => {
  it('o cartão tem o título do recorte e é nomeado por ele; trocar para "Por lista" troca o título', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const titulo = screen.getByRole('heading', { name: 'Por joia principal' })
    const cartao = screen.getByRole('region', { name: 'Por joia principal' })
    expect(cartao).toContainElement(titulo)
    expect(cartao).toContainElement(screen.getByTestId('adesao-tabela'))
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Por lista' }))
    expect(await screen.findByRole('heading', { name: 'Por lista' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Por lista' })).toContainElement(screen.getByTestId('adesao-tabela'))
    expect(screen.queryByRole('heading', { name: 'Por joia principal' })).not.toBeInTheDocument()
  })

  it('o título fica à esquerda e o alternador à direita, na mesma linha, embrulhando quando não cabe', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const titulo = screen.getByRole('heading', { name: 'Por joia principal' })
    const alternador = screen.getByRole('tablist', { name: 'Recorte' })
    const linha = titulo.parentElement as HTMLElement
    expect(linha).toContainElement(alternador)
    expect(titulo.compareDocumentPosition(alternador) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    for (const token of ['flex', 'flex-wrap', 'items-center', 'justify-between']) {
      expect(linha.className).toMatch(new RegExp(`(?:^|\\s)${token}(?:\\s|$)`))
    }
  })

  it('o alternador diz "Por joia" e "Por lista" — nenhuma aba chamada "Por joia principal"', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const alternador = screen.getByRole('tablist', { name: 'Recorte' })
    expect(within(alternador).getAllByRole('tab').map(t => t.textContent)).toEqual(['Por joia', 'Por lista'])
    expect(screen.getByRole('tab', { name: 'Por joia' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Por joia principal' })).not.toBeInTheDocument()
  })

  it('a nota da régua traz o ícone ⓘ de 14 px, escondido do leitor, antes do texto', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const texto = screen.getByText(/^Conta pedidos pagos e não cancelados/)
    const nota = texto.closest('[data-testid="nota-da-regua"]') as HTMLElement
    expect(nota).not.toBeNull()
    const icone = nota.querySelector('svg') as SVGElement
    expect(icone).not.toBeNull()
    expect(icone.getAttribute('aria-hidden')).toBe('true')
    expect(icone.getAttribute('width')).toBe('14')
    expect(icone.getAttribute('height')).toBe('14')
    expect(icone.compareDocumentPosition(texto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('o cartão do celular diz "Mais sai: <peça>"; a coluna da tabela continua "Peça que mais sai"', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const cartoes = screen.getByTestId('adesao-cartoes')
    const linhas = within(cartoes)
      .getAllByRole('listitem')
      .map(li => li.lastElementChild?.textContent)
    expect(linhas).toEqual(['Mais sai: Corrente Veneziana em Prata 925 · 45 cm', 'Mais sai: Corrente Veneziana em Prata 925 · 45 cm'])
    expect(cartoes.textContent).not.toMatch(/Peça que mais sai/)
    expect(within(screen.getByTestId('adesao-tabela')).getByRole('columnheader', { name: 'Peça que mais sai' })).toBeInTheDocument()
  })
})

describe('a aba Adesão — vazio, carregando e erro', () => {
  it('sem pedido com Compre Junto no período, diz isso por escrito — e nada de divisão por zero', async () => {
    rpc.mockResolvedValue({
      data: relatorio({ pedidos_pagos: 0, pedidos_com: 0, pecas: 0, valor: 0, parte: null, media: null, por_joia: [], por_lista: [] }),
      error: null,
    })
    montar()
    expect(await screen.findByText('Nenhum pedido teve peças compradas junto nos últimos 30 dias.')).toBeInTheDocument()
    expect(screen.queryByTestId('adesao-tabela')).not.toBeInTheDocument()
    expect(within(indicador('Pedidos com Compre Junto')).getByText('Nenhum pedido pago no período')).toBeInTheDocument()
    expect(within(indicador('Peças levadas junto')).getByText('sem média no período')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/)
  })

  it('enquanto lê, esqueleto no lugar dos números — nenhum zero antes de o número chegar', async () => {
    rpc.mockReturnValue(new Promise(() => {}))
    montar()
    expect(await screen.findAllByTestId('adesao-carregando')).not.toHaveLength(0)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('a leitura que falha diz que falhou, e tenta de novo', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'falhou', code: 'XX000' } })
    montar()
    expect(await screen.findByText('Não foi possível ler o relatório.')).toBeInTheDocument()
    rpc.mockResolvedValue({ data: relatorio(), error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('75% dos 4 pedidos pagos')).toBeInTheDocument()
  })

  it('o número é de pedidos e peças, nunca de pessoas', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    expect(document.body.textContent).not.toMatch(/pessoa|usuári|cliente/i)
  })
})

describe('as abas Listas e Adesão do Compre Junto', () => {
  it('na Adesão, a aba Adesão é a atual e Listas leva ao índice', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    const abas = screen.getByRole('navigation', { name: 'Compre Junto' })
    expect(within(abas).getByRole('link', { name: 'Adesão' })).toHaveAttribute('aria-current', 'page')
    expect(await within(abas).findByRole('link', { name: 'Listas 0' })).toHaveAttribute('href', '/admin/compre-junto')
  })

  it('na Adesão, o subtítulo é o mesmo da página (o do protótipo)', async () => {
    montar()
    await screen.findByText('75% dos 4 pedidos pagos')
    expect(
      screen.getByText(
        'As listas de peças que você oferece junto com outras joias, e como elas estão saindo. O Compre Junto de cada joia se monta na página dela.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Como as peças oferecidas junto com as joias estão saindo.')).not.toBeInTheDocument()
  })

  it('na Adesão, a aba Listas traz a contagem das listas', async () => {
    from.mockImplementation((tabela: string) =>
      consulta(
        tabela === 'buy_together_lists'
          ? [
              { id: LISTA, name: 'Correntes', updated_at: '2026-11-02T10:00:00Z' },
              { id: VAZIA, name: 'Embalagens', updated_at: '2026-11-02T10:00:00Z' },
            ]
          : [],
      ),
    )
    montar()
    const abas = screen.getByRole('navigation', { name: 'Compre Junto' })
    expect(within(abas).getByRole('link', { name: 'Listas' })).toBeInTheDocument()
    expect(await within(abas).findByRole('link', { name: 'Listas 2' })).toHaveAttribute('href', '/admin/compre-junto')
  })

  it('nas Listas, a aba Adesão leva ao relatório', async () => {
    montar('/admin/compre-junto')
    const abas = await screen.findByRole('navigation', { name: 'Compre Junto' })
    expect(await within(abas).findByRole('link', { name: 'Listas 0' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(within(abas).getByRole('link', { name: 'Adesão' }))
    expect(await screen.findByText('Pedidos com Compre Junto')).toBeInTheDocument()
  })
})
