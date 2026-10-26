// Feature `76` · T23 — a lista de clientes (`MAC-04`, `MAC-05`, `MAC-10`, `MAC-12`, `MAC-31`, `MAC-34`),
// e a sentinela que se rearma sobre o dublê de `IntersectionObserver` que o teste dispara à mão. As
// frases vêm ESCRITAS POR EXTENSO (as de `MAC-04`/`MAC-10`).
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { CustomerSliceId } from '@estrelinha/core/customers'

import type { JanelaDeClientes } from '@/entities/customer'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import { listaDeClientes } from '@/test/clientes'
import { ObservadorFalso, dispararInterseccao, observadoresDe } from '@/test/intersecao'

import ListaDeClientes, { type ListaDeClientesProps } from '../ui/ListaDeClientes'

const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'

const janela = (n: number, extra: Partial<JanelaDeClientes> = {}): JanelaDeClientes => ({
  linhas: listaDeClientes(n),
  total: n,
  lido_em: LIDO_EM,
  fim: n < 25,
  ...extra,
})

const props = (extra: Partial<ListaDeClientesProps> = {}): ListaDeClientesProps => ({
  recorte: 'todas',
  termo: '',
  janela: undefined,
  falhou: false,
  tentarDeNovo: () => {},
  carregarMais: () => {},
  carregandoMais: false,
  proximaFalhou: false,
  limpar: () => {},
  ...extra,
})

const montar = (p: ListaDeClientesProps) => {
  const r = render(
    <MemoryRouter>
      <ListaDeClientes {...p} />
    </MemoryRouter>,
  )
  return {
    ...r,
    trocar: (q: ListaDeClientesProps) =>
      r.rerender(
        <MemoryRouter>
          <ListaDeClientes {...q} />
        </MemoryRouter>,
      ),
  }
}

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const secao = () => screen.getByRole('region', { name: 'Clientes' })
const linhasNaTela = () => screen.queryAllByTestId('linha-do-cliente')
const sentinela = () => screen.queryByTestId('sentinela')
const LIMPAR = () => screen.queryByRole('button', { name: 'Limpar' })

describe('os estados são exclusivos (L-063, MAC-12)', () => {
  it('FALHA sem dado: a frase e "Tentar de novo" — nenhum zero, nenhum vazio', () => {
    const tentarDeNovo = vi.fn()
    montar(props({ falhou: true, tentarDeNovo }))
    expect(secao()).toHaveAttribute('data-estado', 'falha')
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui carregar as clientes.')
    expect(screen.queryByText('Ainda não há clientes.')).toBeNull()
    expect(screen.queryByTestId('contagem')).toBeNull()
    expect(secao()).not.toHaveAttribute('aria-busy')
    expect(linhasNaTela()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })

  it('ESQUELETO: `aria-busy`, quatro traços parados com movimento reduzido e nenhum texto de conteúdo', () => {
    montar(props())
    expect(secao()).toHaveAttribute('data-estado', 'carregando')
    expect(secao()).toHaveAttribute('aria-busy', 'true')
    const tracos = secao().querySelectorAll('[aria-hidden="true"]')
    expect(tracos).toHaveLength(4)
    for (const t of tracos) {
      expect(tokens(t)).toContain('animate-pulse')
      expect(tokens(t)).toContain('motion-reduce:animate-none')
    }
    expect(secao().textContent).toBe('')
    expect(screen.queryByTestId('contagem')).toBeNull()
    expect(screen.queryByTestId('vazio')).toBeNull()
  })

  it('VAZIO: nem falha, nem esqueleto, nem contagem', () => {
    montar(props({ janela: janela(0, { fim: true }) }))
    expect(secao()).toHaveAttribute('data-estado', 'vazio')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(secao()).not.toHaveAttribute('aria-busy')
    expect(screen.queryByTestId('contagem')).toBeNull()
    expect(linhasNaTela()).toHaveLength(0)
  })

  it('DADO com a releitura falhada: as linhas ficam, sem falha nem esqueleto', () => {
    montar(props({ janela: janela(3), falhou: true }))
    expect(secao()).toHaveAttribute('data-estado', 'dado')
    expect(linhasNaTela()).toHaveLength(3)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(secao()).not.toHaveAttribute('aria-busy')
    expect(screen.queryByText('Ainda não há clientes.')).toBeNull()
  })
})

describe('o vazio tem uma frase por causa (MAC-10)', () => {
  it.each([
    ['base vazia', 'todas', '', 'Ainda não há clientes.'],
    ['recorte "em aberto"', 'em-aberto', '', 'Ninguém com pedido em aberto agora.'],
    ['recorte "compraram mais de uma vez"', 'recorrentes', '', 'Ninguém comprou mais de uma vez ainda.'],
    ['busca (aspas curvas e o termo)', 'todas', 'ana', 'Não achei ninguém com “ana”.'],
    ['busca vence o recorte', 'em-aberto', '  ana ', 'Não achei ninguém com “ana”.'],
  ] as [string, CustomerSliceId, string, string][])('%s ⇒ "%s"', (_c, recorte, termo, frase) => {
    montar(props({ recorte, termo, janela: janela(0, { total: 0, fim: true }) }))
    expect(screen.getByTestId('vazio')).toHaveTextContent(new RegExp(`^${frase}$`))
    for (const outra of ['Ainda não há clientes.', 'Ninguém com pedido em aberto agora.', 'Ninguém comprou mais de uma vez ainda.']) {
      if (outra !== frase) expect(screen.queryByText(outra)).toBeNull()
    }
  })

  it('"Limpar" só com recorte diferente de `todas` ou com busca, e chama `limpar`', () => {
    const limpar = vi.fn()
    const { trocar } = montar(props({ janela: janela(0, { fim: true }), limpar }))
    expect(LIMPAR()).toBeNull()
    trocar(props({ recorte: 'recorrentes', janela: janela(0, { fim: true }), limpar }))
    expect(LIMPAR()).not.toBeNull()
    trocar(props({ termo: 'ana', janela: janela(0, { fim: true }), limpar }))
    expect(LIMPAR()).not.toBeNull()
    trocar(props({ termo: '   ', janela: janela(0, { fim: true }), limpar }))
    expect(LIMPAR()).toBeNull()
    trocar(props({ recorte: 'em-aberto', janela: janela(0, { fim: true }), limpar }))
    expect(tokens(LIMPAR())).toContain('min-h-11')
    fireEvent.click(LIMPAR()!)
    expect(limpar).toHaveBeenCalledTimes(1)
  })
})

describe('a linha de contagem é a do SERVIDOR (MAC-04)', () => {
  it.each([
    [1, '1 cliente · das atividades mais recentes para as mais antigas'],
    [3, '3 clientes · das atividades mais recentes para as mais antigas'],
  ])('%d na janela e no total ⇒ "%s"', (n, frase) => {
    montar(props({ janela: janela(n) }))
    expect(screen.getByTestId('contagem').textContent).toBe(frase)
    expect(screen.getByTestId('contagem')).toHaveAttribute('aria-live', 'polite')
  })

  it('3 linhas na tela e total 12 ⇒ "12 clientes", nunca 3', () => {
    montar(props({ janela: janela(3, { total: 12, fim: false }) }))
    expect(linhasNaTela()).toHaveLength(3)
    expect(screen.getByTestId('contagem').textContent).toBe('12 clientes · das atividades mais recentes para as mais antigas')
  })

  it('a contagem vale com recorte e busca (a frase é a mesma)', () => {
    montar(props({ recorte: 'em-aberto', termo: 'ana', janela: janela(2, { total: 2 }) }))
    expect(screen.getByTestId('contagem').textContent).toBe('2 clientes · das atividades mais recentes para as mais antigas')
  })
})

describe('a lista', () => {
  it('uma linha por cliente, em `<li>` dentro de `<ul>`', () => {
    montar(props({ janela: janela(3) }))
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(linhasNaTela().map((l) => l.getAttribute('href'))).toEqual(listaDeClientes(3).map((c) => `/clientes/${c.id}`))
  })

  it('a folga do teclado vira `padding-bottom` da seção em TODO estado (MAC-34)', () => {
    const { trocar } = montar(props({ janela: janela(3), folgaDoTeclado: 280 }))
    expect(secao().style.paddingBottom).toBe('280px')
    trocar(props({ janela: janela(0, { fim: true }), folgaDoTeclado: 280 }))
    expect(secao().style.paddingBottom).toBe('280px')
    trocar(props({ falhou: true, folgaDoTeclado: 280 }))
    expect(secao().style.paddingBottom).toBe('280px')
    trocar(props({ folgaDoTeclado: 280 }))
    expect(secao().style.paddingBottom).toBe('280px')
    trocar(props({ janela: janela(3), folgaDoTeclado: 0 }))
    expect(secao().style.paddingBottom).toBe('0px')
  })
})

describe('a sentinela (MAC-05)', () => {
  it('cruzar a sentinela, 600 px antes do fim, chama `carregarMais` uma vez', () => {
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

  it('com `fim`: nenhuma sentinela, nenhum observador, nenhum esqueleto no fim', () => {
    const carregarMais = vi.fn()
    montar(props({ janela: janela(7), carregarMais }))
    expect(sentinela()).toBeNull()
    expect(ObservadorFalso.todos.filter((o) => !o.desligado)).toHaveLength(0)
    expect(secao().querySelector('[aria-busy]')).toBeNull()
    expect(carregarMais).not.toHaveBeenCalled()
  })

  it('com uma página no ar: nada observa, e um traço marca o fim', () => {
    montar(props({ janela: janela(25, { fim: false }), carregandoMais: true }))
    expect(observadoresDe(sentinela()!)).toHaveLength(0)
    const fim = secao().querySelector('[aria-busy="true"]')
    expect(fim).not.toBeNull()
    const tracos = Array.from(fim!.querySelectorAll('[aria-hidden="true"]')).filter((el) => tokens(el).includes('animate-pulse'))
    expect(tracos).toHaveLength(1)
    expect(tokens(tracos[0])).toContain('motion-reduce:animate-none')
  })

  it('sem página no ar: nenhum traço pulsando no fim', () => {
    montar(props({ janela: janela(25, { fim: false }) }))
    const pulsando = Array.from(secao().querySelectorAll('[aria-hidden="true"]')).filter((el) => tokens(el).includes('animate-pulse'))
    expect(pulsando).toHaveLength(0)
  })

  it('a próxima falhou: as linhas ficam, a sentinela some e o RODAPÉ oferece "Tentar de novo" que pede a página', () => {
    const carregarMais = vi.fn()
    montar(props({ janela: janela(25, { total: 60, fim: false }), carregarMais, proximaFalhou: true }))
    expect(linhasNaTela()).toHaveLength(25)
    expect(sentinela()).toBeNull()
    expect(screen.getByTestId('fim-com-falha')).toHaveTextContent(FALHA_DE_LEITURA)
    expect(secao()).toHaveAttribute('data-estado', 'dado')
    fireEvent.click(screen.getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(carregarMais).toHaveBeenCalledTimes(1)
  })

  it('a sentinela se REARMA: janela relida (objeto novo) desliga o observador velho e cria um novo', () => {
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
    const { trocar } = montar(props({ janela: janela(25, { fim: false }) }))
    const primeiro = observadoresDe(sentinela()!)[0]
    trocar(props({ janela: janela(30, { fim: true }) }))
    expect(primeiro.desligado).toBe(true)
    expect(sentinela()).toBeNull()
  })
})

describe('o tempo da linha é o do `lido_em` do servidor', () => {
  it('aparelho em 2027: o subtítulo continua contado da leitura', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2027-01-01T12:00:00Z'))
      montar(props({ janela: janela(1, { linhas: [{ ...listaDeClientes(1)[0], orders_paid: 1, last_order_at: '2026-10-21T14:00:00.000001+00:00' }] }) }))
      expect(screen.getByTestId('linha-do-cliente').querySelector('[data-parte="subtitulo"]')?.textContent).toBe(
        '1 compra · última há 2 dias',
      )
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('o vazio e o "Limpar" são ANUNCIADOS (BUG-20261024-vazio-da-busca-nao-e-anunciado)', () => {
  const anuncio = () => screen.getByTestId('anuncio-da-lista')

  it('a região existe em TODO estado, é educada (`aria-live`), e sai vazia quando não há o que anunciar', () => {
    for (const p of [props(), props({ falhou: true }), props({ janela: janela(3) })]) {
      const { unmount } = montar(p)
      expect(anuncio().getAttribute('aria-live')).toBe('polite')
      // Sem `role="status"`: a tela já tem uma, a do "Atualizando…" do puxar, e duas confundem quem a consulta.
      expect(anuncio().getAttribute('role')).toBeNull()
      expect(anuncio().textContent).toBe('')
      unmount()
    }
  })

  it('busca sem resultado: "Nenhum resultado." entra na MESMA região que já estava na tela', () => {
    const m = montar(props({ janela: janela(3), termo: '' }))
    const antes = anuncio()
    m.trocar(props({ janela: janela(0), termo: 'zzzqq' }))
    expect(anuncio()).toBe(antes)
    expect(anuncio().textContent).toBe('Nenhum resultado.')
    // A frase completa, com o termo, é a do `<p>` visível — uma vez só na árvore.
    expect(screen.getAllByText('Não achei ninguém com “zzzqq”.')).toHaveLength(1)
  })

  it.each(['em-aberto', 'recorrentes', 'todas'] as CustomerSliceId[])('recorte %s sem ninguém também é anunciado', (recorte) => {
    montar(props({ janela: janela(0), recorte }))
    expect(anuncio().textContent).toBe('Nenhum resultado.')
  })

  it('"Limpar" desfaz E avisa que desfez; a região não some com o botão', () => {
    const limpar = vi.fn()
    const m = montar(props({ janela: janela(0), termo: 'zzzqq', limpar }))
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(limpar).toHaveBeenCalledTimes(1)
    // Enquanto a lista ainda está vazia, a região continua dizendo que não há resultado.
    expect(anuncio().textContent).toBe('Nenhum resultado.')
    m.trocar(props({ janela: janela(3), limpar }))
    expect(anuncio().textContent).toBe('Busca e recorte desfeitos.')
    expect(LIMPAR()).toBeNull()
  })
})
