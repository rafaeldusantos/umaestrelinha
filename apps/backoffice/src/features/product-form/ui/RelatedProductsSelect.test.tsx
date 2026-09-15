// "Produtos relacionados" e "Compre junto" — o invólucro que a feature 51 deixou (`BUS-07`).
//
// O que este arquivo prova é o que sobrou aqui depois da troca: os chips do que já foi escolhido, o
// `excluir` do próprio produto, e a **ligação** com o campo compartilhado. A busca em si tem suíte
// própria (`ProductSearchField.test.tsx`) e não é remedida caso a caso — o que seria medir a mesma
// régua duas vezes.
//
// O caso que **reprovaria na régua antiga** está abaixo, e é o motivo de a troca não ser arrumação:
// até aqui o filtro era `p.name.toLowerCase().includes(termo.toLowerCase())`, que não dobra acento.
// Digitar `coracao` devolvia zero, e a dona concluía que a peça não existia — enquanto a mesma
// digitação, na Home, achava 106.

import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY } from '@/entities/product'
import RelatedProductsSelect from './RelatedProductsSelect'

const POOL = [
  { id: 'p1', name: 'Colar de Cinzas', slug: 'colar-de-cinzas', is_active: true, base_price: 289 },
  { id: 'p2', name: 'Anel Coração', slug: 'anel-coracao', is_active: true, base_price: 199 },
  { id: 'p3', name: 'Pingente Gota', slug: 'pingente-gota', is_active: true, base_price: 159 },
]

const Palco = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(PRODUCT_POOL_KEY, POOL)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const montar = (over: { selected?: string[]; excludeId?: string } = {}) => {
  const onChange = vi.fn()
  render(
    <Palco>
      <RelatedProductsSelect
        label="Produtos relacionados"
        selected={over.selected ?? []}
        excludeId={over.excludeId}
        onChange={onChange}
      />
    </Palco>,
  )
  return onChange
}

const digitar = (termo: string) =>
  fireEvent.change(screen.getByLabelText('Produtos relacionados'), { target: { value: termo } })

// ---------------------------------------------------------------------------
describe('a busca ganhou a dobra de acento que esta tela não tinha (BUS-02)', () => {
  it('`coracao` acha `Anel Coração` — a régua antiga devolvia ZERO', () => {
    montar()
    digitar('coracao')

    expect(screen.getByTestId('peca-p2')).toHaveTextContent('Anel Coração')
    // O sensor da própria régua antiga, escrito ao lado: `includes` sem dobra não casaria.
    expect('Anel Coração'.toLowerCase().includes('coracao')).toBe(false)
  })

  it('as palavras casam em qualquer ordem — `cinzas colar` acha `Colar de Cinzas` (BUS-01)', () => {
    montar()
    digitar('cinzas colar')

    expect(screen.getByTestId('peca-p1')).toHaveTextContent('Colar de Cinzas')
  })
})

describe('o que sobrou nesta tela: os chips e o recorte', () => {
  it('escolher acrescenta o id à lista de quem chama', () => {
    const onChange = montar()
    digitar('gota')
    fireEvent.click(screen.getByTestId('peca-p3'))

    expect(onChange).toHaveBeenCalledWith(['p3'])
  })

  it('o produto sendo editado SOME da lista — ninguém se relaciona consigo (excluir)', () => {
    montar({ excludeId: 'p1' })
    digitar('colar')

    expect(screen.queryByTestId('peca-p1')).toBeNull()
    expect(screen.getByTestId('busca-sem-resultado')).toHaveTextContent('Nenhuma peça com')
  })

  it('o que já está na lista APARECE desabilitado, e não some (BUS-08, BUS-14)', () => {
    const onChange = montar({ selected: ['p1'] })
    digitar('colar')

    const linha = screen.getByTestId('peca-p1')
    expect(linha).toBeDisabled()
    // O vocabulário é o desta tela, e não o da Home: "já está no bloco" leria mal aqui.
    expect(screen.getByTestId('ja-escolhida-p1')).toHaveTextContent('já está na lista')

    fireEvent.click(linha)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('os chips do escolhido continuam removíveis', () => {
    const onChange = montar({ selected: ['p1', 'p2'] })

    // Pelo rótulo do botão, e não pelo texto do nome: sem termo a lista mostra o catálogo inteiro
    // (`BUS-04`), então o nome aparece duas vezes na tela — no chip e na linha do resultado.
    expect(screen.getByLabelText('Remover Colar de Cinzas')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Remover Anel Coração'))

    expect(onChange).toHaveBeenCalledWith(['p1'])
  })

  it('sem nada escolhido, nenhum chip é desenhado', () => {
    montar()
    expect(screen.queryByLabelText(/^Remover /)).toBeNull()
  })
})
