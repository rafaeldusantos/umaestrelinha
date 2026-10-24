// Feature `74` · T20 — a lista de pedidos (`MAP-08`, `MAP-09`, `MAP-13`, `MAP-15`, `MAP-34`, `MAP-35`,
// `MAP-44`, `MAP-45`), e a sentinela que se rearma (E4), sobre o dublê de `IntersectionObserver` que o
// teste dispara à mão (`@/test/intersecao`). As frases vêm ESCRITAS POR EXTENSO (as de `MAP-08`/`09`).
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { OrderSlice } from '@estrelinha/core/orders'

import type { JanelaDaLista, LinhaDaLista } from '@/entities/order'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import { ObservadorFalso, dispararInterseccao, observadoresDe } from '@/test/intersecao'
import { linha } from '@/test/pedidos'

import ListaDePedidos, { type ListaDePedidosProps } from '../ui/ListaDePedidos'

const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'

const linhas = (n: number): LinhaDaLista[] =>
  Array.from({ length: n }, (_, i) =>
    linha({ id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, order_number: String(i + 1).padStart(4, '0') }),
  )

const janela = (n: number, extra: Partial<JanelaDaLista> = {}): JanelaDaLista => ({
  linhas: linhas(n),
  total: n,
  lido_em: LIDO_EM,
  fim: n < 25,
  ...extra,
})

const props = (extra: Partial<ListaDePedidosProps> = {}): ListaDePedidosProps => ({
  recorte: { visao: 'precisa-acao' },
  termo: '',
  janela: undefined,
  falhou: false,
  tentarDeNovo: () => {},
  carregarMais: () => {},
  carregandoMais: false,
  proximaFalhou: false,
  ...extra,
})

const montar = (p: ListaDePedidosProps) => {
  const r = render(
    <MemoryRouter>
      <ListaDePedidos {...p} />
    </MemoryRouter>,
  )
  return {
    ...r,
    trocar: (q: ListaDePedidosProps) =>
      r.rerender(
        <MemoryRouter>
          <ListaDePedidos {...q} />
        </MemoryRouter>,
      ),
  }
}

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const secao = () => screen.getByRole('region', { name: 'Pedidos' })
const linhasNaTela = () => screen.queryAllByTestId('linha-do-pedido')
const sentinela = () => screen.queryByTestId('sentinela')

describe('os quatro estados são exclusivos (L-063)', () => {
  it('FALHA sem dado: "Não consegui carregar." e "Tentar de novo" — nunca "Nada por aqui." (MAP-34)', () => {
    const tentarDeNovo = vi.fn()
    montar(props({ falhou: true, tentarDeNovo }))
    expect(secao()).toHaveAttribute('data-estado', 'falha')
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(screen.queryByText('Nada por aqui.')).toBeNull()
    expect(secao()).not.toHaveAttribute('aria-busy')
    expect(linhasNaTela()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })

  it('ESQUELETO na primeira leitura: `aria-busy`, linhas de esqueleto paradas com movimento reduzido (MAP-44, MAP-45)', () => {
    montar(props())
    expect(secao()).toHaveAttribute('aria-busy', 'true')
    const tracos = secao().querySelectorAll('[aria-hidden="true"]')
    expect(tracos).toHaveLength(4)
    for (const t of tracos) {
      expect(tokens(t)).toContain('animate-pulse')
      expect(tokens(t)).toContain('motion-reduce:animate-none')
    }
    expect(screen.queryByText(FALHA_DE_LEITURA)).toBeNull()
    expect(screen.queryByText('Nada por aqui.')).toBeNull()
    expect(screen.queryByTestId('contagem')).toBeNull()
  })

  it('DADO com a releitura falhada: as linhas ficam, sem falha nem esqueleto (MAP-35)', () => {
    montar(props({ janela: janela(3), falhou: false }))
    expect(secao()).toHaveAttribute('data-estado', 'dado')
    expect(linhasNaTela()).toHaveLength(3)
    expect(screen.queryByText(FALHA_DE_LEITURA)).toBeNull()
    expect(secao()).not.toHaveAttribute('aria-busy')
  })
})

describe('o vazio (MAP-09)', () => {
  it.each([
    ['com busca', { visao: 'tudo' }, 'Marina', 'Nenhum pedido com “Marina”.'],
    ['"Precisa de ação" sem busca', { visao: 'precisa-acao' }, '', 'Nenhum pedido esperando você agora.'],
    ['outra visão', { visao: 'fila-material' }, '', 'Nenhum pedido nesta visão.'],
    ['um bloco', { bloco: 'sem-rastreio' }, '', 'Nenhum pedido nesta visão.'],
    ['"Precisa de ação" COM busca', { visao: 'precisa-acao' }, '  0244 ', 'Nenhum pedido com “0244”.'],
  ] as [string, OrderSlice, string, string][])('%s ⇒ "Nada por aqui." e "%s"', (_c, recorte, termo, dica) => {
    montar(props({ recorte, termo, janela: janela(0, { total: 0, fim: true }) }))
    expect(secao()).toHaveAttribute('data-estado', 'vazio')
    expect(screen.getByText('Nada por aqui.')).toBeInTheDocument()
    expect(screen.getByText(dica)).toBeInTheDocument()
    expect(screen.queryByTestId('contagem')).toBeNull()
    expect(screen.queryByText(FALHA_DE_LEITURA)).toBeNull()
  })
})

describe('a linha de contagem (MAP-08)', () => {
  it.each([
    [{ visao: 'precisa-acao' }, '', 1, '1 pedido precisa de você, do mais antigo para o mais novo.'],
    [{ visao: 'precisa-acao' }, '', 3, '3 pedidos precisam de você, do mais antigo para o mais novo.'],
    [{ visao: 'precisa-acao' }, '0244', 1, '1 pedido'],
    // G3 da verificação (rodada 2): termo só de espaços vale como SEM busca (MAP-12) também na contagem.
    [{ visao: 'precisa-acao' }, '   ', 3, '3 pedidos precisam de você, do mais antigo para o mais novo.'],
    [{ visao: 'tudo' }, '', 2, '2 pedidos'],
    [{ visao: 'concluidos' }, '', 1, '1 pedido'],
    [{ bloco: 'aguardando' }, '', 4, '4 pedidos'],
  ] as [OrderSlice, string, number, string][])('%j busca "%s", %d ⇒ "%s"', (recorte, termo, n, frase) => {
    montar(props({ recorte, termo, janela: janela(n) }))
    expect(screen.getByTestId('contagem').textContent).toBe(frase)
  })

  it('a contagem é o TOTAL do recorte, não as linhas carregadas', () => {
    montar(props({ recorte: { visao: 'tudo' }, janela: janela(25, { total: 60, fim: false }) }))
    expect(linhasNaTela()).toHaveLength(25)
    expect(screen.getByTestId('contagem').textContent).toBe('60 pedidos')
  })
})

describe('a sentinela (MAP-13, MAP-15)', () => {
  it('cruzar a sentinela, com margem antes do fim, chama `carregarMais` uma vez', () => {
    const carregarMais = vi.fn()
    montar(props({ janela: janela(25, { total: 60, fim: false }), carregarMais }))
    const alvo = sentinela()!
    const [observador] = observadoresDe(alvo)
    expect(observador.rootMargin).toBe('0px 0px 600px 0px')
    expect(dispararInterseccao(alvo, true)).toBe(1)
    expect(carregarMais).toHaveBeenCalledTimes(1)
    dispararInterseccao(alvo, false)
    expect(carregarMais).toHaveBeenCalledTimes(1)
  })

  it('com `fim`: nenhuma sentinela, nenhum observador, nenhum esqueleto no fim (MAP-15)', () => {
    const carregarMais = vi.fn()
    montar(props({ janela: janela(7), carregarMais }))
    expect(sentinela()).toBeNull()
    expect(ObservadorFalso.todos.filter((o) => !o.desligado)).toHaveLength(0)
    expect(secao().querySelector('[aria-busy]')).toBeNull()
    expect(carregarMais).not.toHaveBeenCalled()
  })

  it('com uma página no ar: nada observa, e um esqueleto marca o fim', () => {
    const carregarMais = vi.fn()
    montar(props({ janela: janela(25, { fim: false }), carregarMais, carregandoMais: true }))
    expect(observadoresDe(sentinela()!)).toHaveLength(0)
    const fim = secao().querySelector('[aria-busy="true"]')
    expect(fim).not.toBeNull()
    // O esqueleto é o `Traco` DENTRO do fim (O-r2-2): o `aria-busy` sozinho passava sem ele.
    const tracos = Array.from(fim!.querySelectorAll('[aria-hidden="true"]')).filter((el) => tokens(el).includes('animate-pulse'))
    expect(tracos).toHaveLength(1)
    expect(tokens(tracos[0])).toEqual(expect.arrayContaining(['h-20', 'w-full', 'motion-reduce:animate-none']))
  })

  it('sem página no ar: nenhum esqueleto no fim (o par do caso acima)', () => {
    montar(props({ janela: janela(25, { fim: false }) }))
    const pulsando = Array.from(secao().querySelectorAll('[aria-hidden="true"]')).filter((el) => tokens(el).includes('animate-pulse'))
    expect(pulsando).toHaveLength(0)
  })

  it('a próxima falhou: as linhas ficam, e o fim oferece "Tentar de novo" que pede a página (MAP-35)', () => {
    const carregarMais = vi.fn()
    montar(props({ janela: janela(25, { total: 60, fim: false }), carregarMais, proximaFalhou: true }))
    expect(linhasNaTela()).toHaveLength(25)
    expect(sentinela()).toBeNull()
    const fim = screen.getByTestId('fim-com-falha')
    expect(fim).toHaveTextContent(FALHA_DE_LEITURA)
    fireEvent.click(screen.getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(carregarMais).toHaveBeenCalledTimes(1)
  })
})

describe('a sentinela se REARMA (E4)', () => {
  it('um anexar descartado com ela ainda visível: um observador NOVO, e a página seguinte sai', () => {
    const carregarMais = vi.fn()
    const j = janela(25, { total: 60, fim: false })
    const { trocar } = montar(props({ janela: j, carregarMais }))
    const primeiro = observadoresDe(sentinela()!)[0]
    dispararInterseccao(sentinela()!, true)
    expect(carregarMais).toHaveBeenCalledTimes(1)

    // A página sai…
    trocar(props({ janela: j, carregarMais, carregandoMais: true }))
    expect(primeiro.desligado).toBe(true)
    // …e é descartada (E3): a janela é a MESMA, e a sentinela continua onde estava.
    trocar(props({ janela: j, carregarMais, carregandoMais: false }))
    const novos = observadoresDe(sentinela()!)
    expect(novos).toHaveLength(1)
    expect(novos[0]).not.toBe(primeiro)
    // O navegador avisa o observador novo na observação inicial: a sentinela está visível.
    dispararInterseccao(sentinela()!, true)
    expect(carregarMais).toHaveBeenCalledTimes(2)
  })

  it('uma janela relida (objeto novo, mesmo tamanho) também rearma; o observador velho não recebe mais nada', () => {
    const carregarMais = vi.fn()
    const { trocar } = montar(props({ janela: janela(25, { fim: false }), carregarMais }))
    const primeiro = observadoresDe(sentinela()!)[0]
    trocar(props({ janela: janela(25, { fim: false }), carregarMais }))
    expect(primeiro.desligado).toBe(true)
    expect(observadoresDe(sentinela()!)).toHaveLength(1)
    expect(dispararInterseccao(sentinela()!, true)).toBe(1)
    expect(carregarMais).toHaveBeenCalledTimes(1)
  })

  it('chegar ao fim desliga a sentinela', () => {
    const carregarMais = vi.fn()
    const { trocar } = montar(props({ janela: janela(25, { fim: false }), carregarMais }))
    const primeiro = observadoresDe(sentinela()!)[0]
    trocar(props({ janela: janela(30, { fim: true }), carregarMais }))
    expect(primeiro.desligado).toBe(true)
    expect(sentinela()).toBeNull()
    expect(ObservadorFalso.todos.filter((o) => !o.desligado)).toHaveLength(0)
  })
})

describe('a linha conta o tempo pelo relógio do SERVIDOR, nunca pelo do aparelho (A2, G7)', () => {
  // G7 da rodada 4: a fixtura (`created_at` 2026-10-20T13:04Z) dá "há 3 dias" contra o `LIDO_EM` e
  // contra o relógio real até ~2026-10-24 — a asserção era verdadeira nos dois mundos. Com o aparelho
  // em 2027, só o `lido_em` que a lista PASSA à linha dá "3 dias".
  it('aparelho em 2027-01-01: a parte "compra" diz 3 dias, contados do `lido_em` da janela', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2027-01-01T12:00:00Z'))
      montar(props({ janela: janela(1) }))
      const compra = screen.getByTestId('linha-do-pedido').querySelector('[data-parte="compra"]')
      expect(compra).not.toBeNull()
      expect(compra!.textContent).toMatch(/3 dias/)
    } finally {
      vi.useRealTimers()
    }
  })
})
