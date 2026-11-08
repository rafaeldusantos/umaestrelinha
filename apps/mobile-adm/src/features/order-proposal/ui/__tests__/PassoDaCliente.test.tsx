// O passo 1 da montagem sozinho, na forma do protótipo: os resultados da busca num cartão, a inicial
// de 44 px, o convite "Tem os dados numa mensagem?" com título de corpo e ícone em ouro, o exemplo no
// e-mail, e o endereço da cliente nova num bloco próprio depois do cartão Entrega. A fiação pela página
// real está em `pages/__tests__/montarPedido.test.tsx`. Medida de layout é da QA, em navegador: aqui a
// régua é o token exato da classe (jsdom não mede pixel).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ClienteDaMontagem } from '@/entities/customer'

import { montagemVazia, type EstadoDaMontagem, type Entrega } from '../../model/montagem'
import PassoDaCliente, { type BuscaDaMontagem } from '../PassoDaCliente'

const JULIANA: ClienteDaMontagem = {
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  name: 'Juliana Prates',
  email: 'juliana@exemplo.invalid',
  phone: '51988887777',
  fichaId: 'aaaaaaaa-0000-4000-8000-000000000001',
  pedidos: 2,
}

const busca = (dado: ClienteDaMontagem[] | undefined): BuscaDaMontagem => ({
  termo: '',
  aoBuscar: vi.fn(),
  dado,
  carregando: false,
  falhou: false,
  tentarDeNovo: vi.fn(),
})

const montar = (estado: EstadoDaMontagem, entregaEfetiva: Entrega | null, resultados?: ClienteDaMontagem[]) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PassoDaCliente
        estado={estado}
        despachar={vi.fn()}
        entregaEfetiva={entregaEfetiva}
        enderecos={{ dado: [], carregando: false, falhou: false, tentarDeNovo: vi.fn() }}
        fichaDoEmail={null}
        aoUsarFicha={vi.fn()}
        busca={busca(resultados)}
        refDoEmail={{ current: null }}
        aoCorrigirEmail={vi.fn()}
        aoColarTexto={vi.fn()}
        aoDesfazerLeitura={vi.fn()}
      />
    </QueryClientProvider>,
  )

const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const nova = (): EstadoDaMontagem => ({ ...montagemVazia(), modo: 'nova' })

describe('o passo da cliente na forma do protótipo', () => {
  it('os resultados da busca vêm num cartão (superfície, borda, raio de caixa) e a inicial tem 44 px', () => {
    montar(montagemVazia(), null, [JULIANA])
    const lista = screen.getByRole('list', { name: 'Clientes' })
    expect(classes(lista)).toEqual(expect.arrayContaining(['bg-estrelinha-surface', 'border', 'border-estrelinha-line', 'rounded-lg']))

    const inicial = lista.querySelector('[data-parte="inicial"]')!
    expect(classes(inicial)).toEqual(expect.arrayContaining(['h-11', 'w-11']))
    expect(classes(inicial)).not.toContain('h-10')
    expect(classes(inicial)).not.toContain('w-10')
  })

  it('o convite "Tem os dados numa mensagem?" tem título de 15 px 500 no corpo, ícone em ouro e respiro de 18 px', () => {
    montar(nova(), 'outro')
    const convite = screen.getByRole('region', { name: 'Tem os dados numa mensagem?' })
    expect(classes(convite)).toContain('p-[18px]')
    expect(classes(convite)).not.toContain('p-4')

    const titulo = within(convite).getByRole('heading', { name: 'Tem os dados numa mensagem?' })
    expect(classes(titulo)).toEqual(expect.arrayContaining(['font-body', 'text-[15px]', 'font-medium']))
    expect(classes(titulo)).not.toContain('font-display')
    expect(classes(titulo)).not.toContain('text-lg')

    const icone = convite.querySelector('svg')!
    expect(classes(icone)).toContain('text-estrelinha-accent')
  })

  it('o e-mail da cliente nova traz o exemplo "nome@email.com"', () => {
    montar(nova(), 'outro')
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('placeholder', 'nome@email.com')
  })

  it('o endereço da cliente nova é um bloco próprio "Endereço de entrega", depois do cartão Entrega e fora das opções', () => {
    montar(nova(), 'outro')
    const entrega = screen.getByRole('region', { name: 'Entrega' })
    const endereco = screen.getByRole('region', { name: 'Endereço de entrega' })
    expect(within(endereco).getByRole('heading', { name: 'Endereço de entrega' })).toBeInTheDocument()
    expect(within(endereco).getByLabelText('CEP')).toBeInTheDocument()
    expect(within(screen.getByRole('radiogroup', { name: 'Entrega' })).queryByLabelText('CEP')).not.toBeInTheDocument()
    expect(entrega.contains(endereco)).toBe(false)
    expect(entrega.compareDocumentPosition(endereco) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // As duas opções seguem juntas no cartão Entrega.
    expect(within(entrega).getAllByRole('radio')).toHaveLength(2)
  })

  it('com "A cliente preenche no link", o bloco do endereço não aparece', () => {
    montar(nova(), 'link')
    expect(screen.queryByRole('region', { name: 'Endereço de entrega' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('CEP')).not.toBeInTheDocument()
  })
})
