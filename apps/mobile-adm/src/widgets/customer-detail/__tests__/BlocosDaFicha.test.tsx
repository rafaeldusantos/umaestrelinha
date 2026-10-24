// Feature `76` · T25 — os blocos da ficha da cliente (`MAC-15`..`MAC-20`, `MAC-22`, `MAC-31`, `MAC-32`).
// Os textos esperados vêm ESCRITOS POR EXTENSO. O tempo é contado do `lido_em` do servidor.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { fichaDeCliente, pedidoDaFicha } from '@/test/clientes'
import CabecalhoDaCliente from '../ui/CabecalhoDaCliente'
import ContatoDaCliente from '../ui/ContatoDaCliente'
import NumerosDaCliente from '../ui/NumerosDaCliente'
import { nomeDoLinkExterno } from '@/shared/config/novaAba'
import PedidosDaCliente, { type PedidosDaClienteProps } from '../ui/PedidosDaCliente'

const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
/** O nome acessível do botão: o rótulo visível e o aviso de aba nova (BUG-20261024-whatsapp-da-ficha-nao-avisa-nova-aba). */
const NOME_DO_WHATSAPP = 'Conversar no WhatsApp (abre em outra aba)'
const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const semNbsp = (s: string | null | undefined) => (s ?? '').replace(/[\u00a0\u202f]/g, ' ')
const parte = (nome: string) => document.querySelector(`[data-parte="${nome}"]`)

const Onde = () => {
  const l = useLocation()
  return <output data-testid="onde">{JSON.stringify({ caminho: l.pathname, estado: l.state })}</output>
}
const noRoteador = (ui: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/clientes/x']}>
      <Routes>
        <Route path="/clientes/x" element={ui} />
        <Route path="/pedidos/:id" element={<Onde />} />
      </Routes>
    </MemoryRouter>,
  )

describe('CabecalhoDaCliente (MAC-15)', () => {
  it('inicial, nome e "cidade/UF · cliente desde mês ano"', () => {
    render(<CabecalhoDaCliente cliente={fichaDeCliente()} cidade={{ city: 'Porto Alegre', state: 'RS' }} />)
    expect(parte('inicial')?.textContent).toBe('M')
    expect(parte('nome')?.textContent).toBe('Marina Duarte')
    expect(parte('desde')?.textContent).toBe('Porto Alegre/RS · cliente desde março 2026')
  })

  it('sem cidade: só "cliente desde março 2026", nenhum separador solto', () => {
    render(<CabecalhoDaCliente cliente={fichaDeCliente()} cidade={null} />)
    expect(parte('desde')?.textContent).toBe('cliente desde março 2026')
    expect(parte('desde')?.textContent).not.toMatch(/·/)
  })

  it('sem nome: o e-mail e a inicial dele; quebra em vez de estourar', () => {
    render(<CabecalhoDaCliente cliente={fichaDeCliente({ name: null, email: 'sem.nome@exemplo.invalid' })} cidade={null} />)
    expect(parte('nome')?.textContent).toBe('sem.nome@exemplo.invalid')
    expect(parte('inicial')?.textContent).toBe('S')
    expect(tokens(parte('nome'))).toContain('[overflow-wrap:anywhere]')
    expect(tokens(parte('desde'))).toContain('[overflow-wrap:anywhere]')
  })
})

describe('CabecalhoDaCliente com fonte grande (BUG-20261024-nome-da-ficha-quebra-no-meio-da-palavra-a-200)', () => {
  // jsdom não mede layout: a régua é a do fonte, por token exato. O que ela prende: o avatar e o nome
  // EMPILHAM quando não cabem (a 200 % o avatar tomava um terço da largura e "Albuquerque" virava
  // "Albuque" / "rque"). O piso do bloco do texto é em `rem`, para crescer com a fonte do sistema.
  it('o cabeçalho embrulha e o bloco do texto tem piso em `rem` limitado a 100 %', () => {
    render(<CabecalhoDaCliente cliente={fichaDeCliente()} cidade={null} />)
    const cabecalho = document.querySelector('[data-bloco="cabecalho"]')
    expect(tokens(cabecalho)).toContain('flex-wrap')
    expect(tokens(parte('texto'))).toContain('min-w-[min(100%,12rem)]')
    expect(tokens(parte('texto'))).toContain('flex-1')
    // O nome continua quebrando só como último recurso, nunca estourando.
    expect(tokens(parte('nome'))).toContain('[overflow-wrap:anywhere]')
  })
})

describe('NumerosDaCliente (MAC-16, MAC-32)', () => {
  const numero = (n: string) => semNbsp(document.querySelector(`[data-numero="${n}"] [data-parte="valor"]`)?.textContent)

  it('compras, no total e ticket médio, do cabeçalho — e a legenda dos pedidos pagos', () => {
    render(<NumerosDaCliente cliente={fichaDeCliente({ orders_paid: 3, total_spent: 1167.7, avg_ticket: 389.23 })} />)
    expect(numero('compras')).toBe('3')
    expect(numero('total')).toBe('R$ 1.167,70')
    expect(numero('ticket')).toBe('R$ 389,23')
    expect(parte('legenda')?.textContent).toBe('Contam só os pedidos pagos.')
  })

  it('o ticket de quem nunca pagou é um travessão, nunca "R$ 0,00"', () => {
    render(<NumerosDaCliente cliente={fichaDeCliente({ orders_paid: 0, total_spent: 0, avg_ticket: null })} />)
    expect(numero('ticket')).toBe('—')
    expect(semNbsp(document.querySelector('[data-numero="ticket"]')?.textContent)).not.toContain('R$ 0,00')
    expect(numero('compras')).toBe('0')
  })

  it('os três números vêm da ficha: pedidos em outra fonte não os mudam', () => {
    render(<NumerosDaCliente cliente={fichaDeCliente({ orders_paid: 7, orders_total: 99, total_spent: 10, avg_ticket: 1.43 })} />)
    expect(numero('compras')).toBe('7')
  })

  it('a grade é `auto-fit` com piso em `rem`, sem coluna fixa: empilha com a fonte grande', () => {
    render(<NumerosDaCliente cliente={fichaDeCliente()} />)
    const grade = document.querySelector('[data-numero="compras"]')!.parentElement
    expect(tokens(grade)).toContain('grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))]')
    expect(tokens(grade).some((t) => /^grid-cols-\d+$/.test(t) || /^(sm|md|lg):grid-cols-/.test(t))).toBe(false)
    for (const v of document.querySelectorAll('[data-parte="valor"]')) expect(tokens(v)).toContain('[overflow-wrap:anywhere]')
  })
})

describe('ContatoDaCliente (MAC-17)', () => {
  it('com telefone válido: e-mail, telefone mascarado e o botão do WhatsApp sem texto pronto', () => {
    render(<ContatoDaCliente cliente={fichaDeCliente({ phone: '51998124471' })} />)
    expect(parte('email')?.textContent).toBe('marina@exemplo.invalid')
    expect(parte('telefone')?.textContent).toBe('(51) 99812-4471')
    const botao = screen.getByRole('link', { name: NOME_DO_WHATSAPP })
    expect(botao.getAttribute('href')).toBe('https://wa.me/5551998124471')
    expect(botao.getAttribute('href')).not.toContain('text=')
    expect(botao.getAttribute('target')).toBe('_blank')
    expect(botao.getAttribute('rel')).toBe('noopener noreferrer')
    expect(tokens(botao)).toEqual(expect.arrayContaining(['min-h-11', 'w-full']))
    expect(botao.style.backgroundColor).not.toBe('')
  })

  it('o telefone gravado com +55 e máscara sai igual', () => {
    render(<ContatoDaCliente cliente={fichaDeCliente({ phone: '+55 (51) 99812-4471' })} />)
    expect(parte('telefone')?.textContent).toBe('(51) 99812-4471')
    expect(screen.getByRole('link', { name: NOME_DO_WHATSAPP }).getAttribute('href')).toBe('https://wa.me/5551998124471')
  })

  it.each([[null], [''], ['123'], ['abc']])('telefone %j: nem a linha nem o botão existem; o e-mail fica', (phone) => {
    render(<ContatoDaCliente cliente={fichaDeCliente({ phone })} />)
    expect(parte('email')?.textContent).toBe('marina@exemplo.invalid')
    expect(parte('telefone')).toBeNull()
    expect(screen.queryByRole('link', { name: NOME_DO_WHATSAPP })).toBeNull()
    // Pelo TEXTO, não pelo papel: um `<a>` sem `href` não tem papel de link e escaparia da consulta acima.
    expect(screen.queryByText('Conversar no WhatsApp')).toBeNull()
    expect(document.querySelector('a[href*="wa.me"]')).toBeNull()
  })
})

describe('PedidosDaCliente (MAC-18, MAC-19, MAC-22, MAC-20)', () => {
  const pedidos = [
    pedidoDaFicha({ id: '00000000-0000-4000-8000-000000000244', order_number: '0244', item: 'Pingente Gota', total: 389.9, created_at: '2026-10-21T14:00:00.000001+00:00' }),
    pedidoDaFicha({ id: '00000000-0000-4000-8000-000000000230', order_number: '0230', item: null, total: 120, created_at: '2026-09-01T14:00:00.000001+00:00' }),
  ]
  const props = (extra: Partial<PedidosDaClienteProps> = {}): PedidosDaClienteProps => ({
    total: 2,
    janela: { linhas: pedidos, lido_em: LIDO_EM, fim: true },
    falhou: false,
    tentarDeNovo: () => {},
    carregarMais: () => {},
    carregandoMais: false,
    proximaFalhou: false,
    ...extra,
  })
  const titulo = () => screen.getByRole('heading', { level: 2 })
  const linhas = () => screen.queryAllByTestId('pedido-da-cliente')

  it('título "Pedidos · <orders_total>" e uma linha por pedido', () => {
    noRoteador(<PedidosDaCliente {...props({ total: 14, janela: { linhas: pedidos, lido_em: LIDO_EM, fim: false } })} />)
    expect(titulo().textContent).toBe('Pedidos · 14')
    expect(linhas()).toHaveLength(2)
  })

  it('"Pedidos · 1" no singular da contagem do cabeçalho; zero ⇒ "Nenhum pedido ainda."', () => {
    const { unmount } = noRoteador(<PedidosDaCliente {...props({ total: 1 })} />)
    expect(titulo().textContent).toBe('Pedidos · 1')
    unmount()
    noRoteador(<PedidosDaCliente {...props({ total: 0, janela: { linhas: [], lido_em: LIDO_EM, fim: true } })} />)
    expect(titulo().textContent).toBe('Nenhum pedido ainda.')
    expect(linhas()).toHaveLength(0)
  })

  it('cada linha: "#número · item", "data · há N dias", total e a situação do ateliê', () => {
    noRoteador(<PedidosDaCliente {...props()} />)
    const [a, b] = linhas()
    expect(within(a).getByText('#0244 · Pingente Gota')).toBeInTheDocument()
    expect(a.querySelector('[data-parte="quando"]')?.textContent).toBe('21 out · há 2 dias')
    expect(semNbsp(a.querySelector('[data-parte="total"]')?.textContent)).toBe('R$ 389,90')
    expect(a.querySelector('[data-situation]')?.getAttribute('data-situation')).toBe('in_production')
    expect(a.querySelector('[data-situation]')?.textContent).toBe('Em produção')
    // Sem item: só o número.
    expect(b.querySelector('[data-parte="rotulo"]')?.textContent).toBe('#0230')
  })

  it('o tempo é do `lido_em` do servidor, não do aparelho', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2031-03-01T00:00:00Z'))
      noRoteador(<PedidosDaCliente {...props()} />)
      expect(linhas()[0].querySelector('[data-parte="quando"]')?.textContent).toBe('21 out · há 2 dias')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a linha é um link de 44 px para o pedido, com `doApp` (o Voltar volta à ficha)', () => {
    noRoteador(<PedidosDaCliente {...props()} />)
    const [a] = linhas()
    expect(a.tagName).toBe('A')
    expect(a.getAttribute('href')).toBe('/pedidos/00000000-0000-4000-8000-000000000244')
    expect(tokens(a)).toContain('min-h-11')
    fireEvent.click(a)
    expect(JSON.parse(screen.getByTestId('onde').textContent ?? '')).toEqual({
      caminho: '/pedidos/00000000-0000-4000-8000-000000000244',
      estado: { doApp: true },
    })
  })

  it('tudo que pode ser longo quebra, e o total pode descer', () => {
    noRoteador(<PedidosDaCliente {...props()} />)
    const [a] = linhas()
    expect(tokens(a)).toContain('flex-wrap')
    for (const p of ['rotulo', 'quando', 'total']) expect(tokens(a.querySelector(`[data-parte="${p}"]`))).toContain('[overflow-wrap:anywhere]')
    for (const p of ['rotulo', 'quando', 'total']) {
      const t = tokens(a.querySelector(`[data-parte="${p}"]`))
      for (const proibida of ['truncate', 'whitespace-nowrap', 'shrink-0']) expect(t).not.toContain(proibida)
    }
  })

  it('"Ver mais pedidos" só com `!fim`, com 44 px, e pede a próxima página', () => {
    const carregarMais = vi.fn()
    const { unmount } = noRoteador(<PedidosDaCliente {...props({ carregarMais, janela: { linhas: pedidos, lido_em: LIDO_EM, fim: true } })} />)
    expect(screen.queryByRole('button', { name: 'Ver mais pedidos' })).toBeNull()
    unmount()
    noRoteador(<PedidosDaCliente {...props({ carregarMais, total: 40, janela: { linhas: pedidos, lido_em: LIDO_EM, fim: false } })} />)
    const botao = screen.getByRole('button', { name: 'Ver mais pedidos' })
    expect(tokens(botao)).toEqual(expect.arrayContaining(['min-h-11', 'w-full']))
    fireEvent.click(botao)
    expect(carregarMais).toHaveBeenCalledTimes(1)
  })

  it('a falha do BLOCO: a frase e "Tentar de novo", sem linhas e sem "Ver mais"', () => {
    const tentarDeNovo = vi.fn()
    noRoteador(<PedidosDaCliente {...props({ falhou: true, janela: undefined, tentarDeNovo })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui carregar os pedidos.')
    expect(titulo().textContent).toBe('Pedidos · 2')
    expect(linhas()).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Ver mais pedidos' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })

  it('a falha da PRÓXIMA página: as linhas ficam, a falha vai ao rodapé e o botão pede a mesma página', () => {
    const carregarMais = vi.fn()
    noRoteador(<PedidosDaCliente {...props({ carregarMais, proximaFalhou: true, total: 40, janela: { linhas: pedidos, lido_em: LIDO_EM, fim: false } })} />)
    expect(linhas()).toHaveLength(2)
    expect(within(screen.getByTestId('fim-com-falha')).getByRole('alert')).toHaveTextContent('Não consegui carregar os pedidos.')
    expect(screen.queryByRole('button', { name: 'Ver mais pedidos' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(carregarMais).toHaveBeenCalledTimes(1)
  })

  it('o ESQUELETO: `aria-busy`, traços parados com movimento reduzido, nenhuma linha nem falha', () => {
    noRoteador(<PedidosDaCliente {...props({ janela: undefined })} />)
    const esq = document.querySelector('[data-estado="carregando"]')!
    expect(esq.getAttribute('aria-busy')).toBe('true')
    for (const t of esq.querySelectorAll('[aria-hidden="true"]')) expect(tokens(t)).toContain('motion-reduce:animate-none')
    expect(linhas()).toHaveLength(0)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('o botão do WhatsApp avisa que abre outra aba (BUG-20261024-whatsapp-da-ficha-nao-avisa-nova-aba)', () => {
  it('o nome acessível é o rótulo VISÍVEL seguido do aviso, vindo do dono do aviso', () => {
    render(<ContatoDaCliente cliente={fichaDeCliente({ phone: '51998124471' })} />)
    const botao = screen.getByRole('link', { name: NOME_DO_WHATSAPP })
    expect(botao.getAttribute('aria-label')).toBe(nomeDoLinkExterno('Conversar no WhatsApp'))
    // O texto que se vê não muda (rótulo no nome: o aviso vem DEPOIS do rótulo).
    expect(botao.textContent).toBe('Conversar no WhatsApp')
  })
})

describe('"Ver mais pedidos" não perde o foco nem cala (BUG-20261024-ver-mais-pedidos-foco-cai-no-body)', () => {
  const faixa = (de: number, ate: number) =>
    Array.from({ length: ate - de }, (_, i) =>
      pedidoDaFicha({
        id: `00000000-0000-4000-8000-0000000003${String(de + i).padStart(2, '0')}`,
        order_number: String(de + i).padStart(4, '0'),
        item: `Peça ${de + i}`,
        created_at: '2026-10-21T14:00:00.000001+00:00',
      }),
    )
  const base = (linhas: ReturnType<typeof faixa>, extra: Partial<PedidosDaClienteProps> = {}): PedidosDaClienteProps => ({
    total: 22,
    janela: { linhas, lido_em: LIDO_EM, fim: linhas.length >= 22 },
    falhou: false,
    tentarDeNovo: () => {},
    carregarMais: () => {},
    carregandoMais: false,
    proximaFalhou: false,
    ...extra,
  })
  const montar = (p: PedidosDaClienteProps) => {
    const r = noRoteador(<PedidosDaCliente {...p} />)
    return (q: PedidosDaClienteProps) =>
      r.rerender(
        <MemoryRouter initialEntries={['/clientes/x']}>
          <Routes>
            <Route path="/clientes/x" element={<PedidosDaCliente {...q} />} />
          </Routes>
        </MemoryRouter>,
      )
  }
  const anuncio = () => screen.getByTestId('anuncio-dos-pedidos')

  it('a região de aviso existe desde o começo, educada (`aria-live`), e está vazia', () => {
    montar(base(faixa(0, 20)))
    expect(anuncio().getAttribute('aria-live')).toBe('polite')
    expect(anuncio().textContent).toBe('')
  })

  it('as linhas novas chegam e o botão sai: o foco vai à PRIMEIRA linha nova e o total é anunciado', () => {
    const trocar = montar(base(faixa(0, 20)))
    const botao = screen.getByRole('button', { name: 'Ver mais pedidos' })
    botao.focus()
    fireEvent.click(botao)
    trocar(base(faixa(0, 22)))
    expect(screen.queryByRole('button', { name: 'Ver mais pedidos' })).toBeNull()
    const links = screen.getAllByTestId('pedido-da-cliente')
    expect(links).toHaveLength(22)
    expect(document.activeElement).toBe(links[20])
    expect(anuncio().textContent).toBe('Agora são 22 pedidos na lista.')
  })

  it('com o botão ainda lá (próxima janela cheia) o foco também vai à primeira linha nova', () => {
    const trocar = montar(base(faixa(0, 20), { total: 60 }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais pedidos' }))
    trocar({ ...base(faixa(0, 40), { total: 60 }) })
    expect(document.activeElement).toBe(screen.getAllByTestId('pedido-da-cliente')[20])
    expect(anuncio().textContent).toBe('Agora são 40 pedidos na lista.')
  })

  it('a próxima página falha: o foco vai ao "Tentar de novo" do rodapé, nunca ao body', () => {
    const trocar = montar(base(faixa(0, 20), { total: 60 }))
    const botao = screen.getByRole('button', { name: 'Ver mais pedidos' })
    botao.focus()
    fireEvent.click(botao)
    trocar(base(faixa(0, 20), { total: 60, proximaFalhou: true }))
    expect(document.activeElement).toBe(within(screen.getByTestId('fim-com-falha')).getByRole('button', { name: 'Tentar de novo' }))
  })

  it('"Tentar de novo" com a falha JÁ na tela: se falha de novo o foco fica, e o sucesso leva o foco à primeira linha nova', () => {
    const trocar = montar(base(faixa(0, 20), { total: 60, proximaFalhou: true }))
    const tentar = within(screen.getByTestId('fim-com-falha')).getByRole('button', { name: 'Tentar de novo' })
    tentar.focus()
    fireEvent.click(tentar)
    // Continua falhando: nada se move.
    trocar(base(faixa(0, 20), { total: 60, proximaFalhou: true }))
    expect(document.activeElement).toBe(tentar)
    // Agora a página chega.
    trocar(base(faixa(0, 40), { total: 60 }))
    expect(document.activeElement).toBe(screen.getAllByTestId('pedido-da-cliente')[20])
    expect(anuncio().textContent).toBe('Agora são 40 pedidos na lista.')
  })

  it('"Tentar de novo" que falha DE NOVO depois de o rodapé sair do ar: o foco volta ao botão novo, nunca ao body (BUG-20261024-tentar-de-novo-da-ficha-solta-o-foco-ao-falhar-de-novo)', () => {
    const trocar = montar(base(faixa(0, 20), { total: 60, proximaFalhou: true }))
    const tentar = within(screen.getByTestId('fim-com-falha')).getByRole('button', { name: 'Tentar de novo' })
    tentar.focus()
    fireEvent.click(tentar)
    // A leitura está no ar: a falha some e o rodapé troca por "Ver mais pedidos" (o botão antigo sai do DOM).
    trocar(base(faixa(0, 20), { total: 60, carregandoMais: true }))
    expect(tentar.isConnected).toBe(false)
    // Falha de novo: o rodapé volta, e o foco com ele.
    trocar(base(faixa(0, 20), { total: 60, proximaFalhou: true }))
    const novo = within(screen.getByTestId('fim-com-falha')).getByRole('button', { name: 'Tentar de novo' })
    expect(document.activeElement).toBe(novo)
    // E um terceiro toque que dá certo ainda leva o foco à primeira linha nova.
    fireEvent.click(novo)
    trocar(base(faixa(0, 20), { total: 60, carregandoMais: true }))
    trocar(base(faixa(0, 40), { total: 60 }))
    expect(document.activeElement).toBe(screen.getAllByTestId('pedido-da-cliente')[20])
  })

  it('sem toque em "Ver mais", uma releitura que muda as linhas NÃO rouba o foco', () => {
    const trocar = montar(base(faixa(0, 20), { total: 60 }))
    const fora = document.createElement('button')
    document.body.appendChild(fora)
    fora.focus()
    trocar(base(faixa(0, 25), { total: 60 }))
    expect(document.activeElement).toBe(fora)
    expect(anuncio().textContent).toBe('')
    fora.remove()
  })
})
