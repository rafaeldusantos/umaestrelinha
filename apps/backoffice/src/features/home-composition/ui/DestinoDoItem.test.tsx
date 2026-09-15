// O seletor de destino de um item curado — coleção, peça ou endereço da loja (`BUS-19`, `A-12`).
//
// Montado SOLTO aqui de propósito, e o motivo é o oposto da lição da `44`: o que este arquivo prova
// é o contrato do próprio `DestinoDoItem`, que tem **dois** consumidores (a grade de banners e o
// carrossel) e nenhum deles é dono da regra. A fiação — "o editor monta este seletor" — continua
// provada onde ela existe, nos testes dos dois editores, que rodam pelo casco.
//
// O que mudou na feature 51 e o que **não** mudou:
//
// - mudou o ramo da PEÇA: era uma `<option>` por produto do catálogo, sem busca nenhuma; virou o
//   `ProductSearchField`, o mesmo das outras quatro superfícies do painel;
// - **não** mudou o `<select>`: ele responde três perguntas, e duas delas não são sobre produto.
//   Trocá-lo inteiro apagaria as coleções e o endereço livre (`A-12`);
// - **não** mudou o congelamento: `product_slug` e `label_snapshot` continuam saindo junto com a
//   escolha (`BUS-19`). Sem o slug, a prévia trata a peça recém-escolhida como fora do ar.

import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminCategory } from '@/entities/category'
import { PRODUCT_POOL_KEY } from '@/entities/product'
import DestinoDoItem from './DestinoDoItem'
import { emptyDraftItem, type DraftItem } from '../model/sectionDraft'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory =>
  ({
    slug: over.slug ?? over.id,
    description: null,
    image_url: null,
    banner_url: null,
    color_accent: null,
    active: true,
    sort_order: 0,
    parent_id: null,
    product_count: 0,
    show_in_menu: false,
    menu_promo: null,
    ...over,
  }) as AdminCategory

const CATEGORIAS = [
  cat({ id: 'leite', name: 'Joias com leite materno', sort_order: 1 }),
  cat({ id: 'cinzas', name: 'Eternize as cinzas', sort_order: 2 }),
]

const POOL = [
  { id: 'p1', name: 'Colar de Cinzas', slug: 'colar-de-cinzas', is_active: true, base_price: 289 },
  { id: 'p2', name: 'Anel Coração', slug: 'anel-coracao', is_active: true, base_price: 199 },
  { id: 'p3', name: 'Broche Pena', slug: 'broche-pena', is_active: false, base_price: 149 },
]

const Palco = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(PRODUCT_POOL_KEY, POOL)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const montar = (over: Partial<DraftItem> = {}) => {
  const onChange = vi.fn()
  const item: DraftItem = { ...emptyDraftItem(), ...over }
  render(
    <Palco>
      <DestinoDoItem item={item} categories={CATEGORIAS} onChange={onChange} />
    </Palco>,
  )
  return onChange
}

const seletor = () => screen.getByLabelText('Leva para') as HTMLSelectElement
const escolher = (valor: string) => fireEvent.change(seletor(), { target: { value: valor } })
const digitar = (termo: string) =>
  fireEvent.change(screen.getByLabelText('Leva para · qual peça'), { target: { value: termo } })

// ---------------------------------------------------------------------------
describe('os três destinos continuam existindo (A-12)', () => {
  it('coleção, peça e endereço da loja estão no seletor', () => {
    montar()
    const textos = Array.from(seletor().querySelectorAll('option')).map(o => o.textContent)

    expect(textos).toContain('Coleção · Joias com leite materno')
    expect(textos).toContain('Produto…')
    expect(textos).toContain('Outro endereço da loja…')
  })

  it('o CATÁLOGO saiu do seletor — nenhuma peça vira `<option>` (BUS-07, BUS-23)', () => {
    // A metade que o par acima não mede. Com as duas juntas, apagar o ramo reprova em cima e
    // devolver as ~702 `<option>` reprova aqui.
    montar()
    const opcoes = Array.from(seletor().querySelectorAll('option'))

    expect(opcoes.map(o => o.value).some(v => v.startsWith('prod:'))).toBe(false)
    for (const peca of POOL) {
      expect(opcoes.map(o => o.textContent)).not.toContain(`Produto · ${peca.name}`)
    }
  })

  it('a coleção continua congelando o rótulo junto com a escolha (HOME-24)', () => {
    const onChange = montar()
    escolher('cat:cinzas')

    expect(onChange).toHaveBeenCalledWith({
      category_id: 'cinzas',
      product_id: null,
      href: null,
      label_snapshot: 'Eternize as cinzas',
    })
  })

  it('“Outro endereço da loja…” revela o campo de caminho e zera as duas FKs', () => {
    const onChange = montar()
    escolher('__outro')

    expect(onChange).toHaveBeenCalledWith({ category_id: null, product_id: null })
    fireEvent.change(screen.getByLabelText('Endereço do banner'), { target: { value: '/como-enviar' } })
    expect(onChange).toHaveBeenLastCalledWith({
      href: '/como-enviar',
      category_id: null,
      product_id: null,
    })
  })
})

// ---------------------------------------------------------------------------
describe('o ramo da peça é uma BUSCA (BUS-07, BUS-09)', () => {
  it('a busca só aparece depois de a dona escolher o ramo', () => {
    montar()
    expect(screen.queryByLabelText('Leva para · qual peça')).toBeNull()

    escolher('__produto')
    expect(screen.getByLabelText('Leva para · qual peça')).toBeInTheDocument()
  })

  it('a busca do destino ignora acento — `coracao` acha `Anel Coração` (BUS-02)', () => {
    montar()
    escolher('__produto')
    digitar('coracao')

    expect(screen.getByTestId('peca-p2')).toHaveTextContent('Anel Coração')
    expect(screen.queryByTestId('peca-p1')).toBeNull()
  })

  it('escolher a peça congela `product_slug` e `label_snapshot` junto (BUS-19)', () => {
    // O slug é o que faz `resolveItem` dizer "está no ar" ANTES de salvar. Sem ele a prévia trata a
    // peça recém-escolhida como fora do ar, justamente enquanto a dona a escolhe (`DST-24`).
    const onChange = montar()
    escolher('__produto')
    digitar('colar')
    fireEvent.click(screen.getByTestId('peca-p1'))

    expect(onChange).toHaveBeenLastCalledWith({
      category_id: null,
      product_id: 'p1',
      product_slug: 'colar-de-cinzas',
      href: null,
      label_snapshot: 'Colar de Cinzas',
    })
  })

  it('a peça já escolhida aparece NOMEADA, e dá para limpá-la', () => {
    const onChange = montar({
      product_id: 'p2',
      product_slug: 'anel-coracao',
      label_snapshot: 'Anel Coração',
    })

    expect(screen.getByTestId('produto-escolhido')).toHaveTextContent('Anel Coração')
    fireEvent.click(screen.getByTestId('limpar-produto'))
    expect(onChange).toHaveBeenLastCalledWith({
      product_id: null,
      product_slug: null,
      label_snapshot: null,
    })
  })

  it('peça APAGADA do catálogo segue mostrando o rótulo congelado, não vazio', () => {
    // O id não está no pool. Sem `nomeEscolhido` o campo trocaria o nome por branco e a dona não
    // teria como saber **qual** peça se perdeu.
    montar({ product_id: 'sumida', product_slug: null, label_snapshot: 'Pingente que saiu do ar' })

    expect(screen.getByTestId('produto-escolhido')).toHaveTextContent('Pingente que saiu do ar')
  })

  it('o rótulo de uma COLEÇÃO não é reaproveitado como nome de peça', () => {
    // O par do caso acima, e o defeito que ele evita: `label_snapshot` guarda os dois tipos de nome.
    // Lido cegamente, o campo diria que "Eternize as cinzas" é a peça escolhida.
    montar({ category_id: 'cinzas', label_snapshot: 'Eternize as cinzas' })
    escolher('__produto')

    expect(screen.queryByTestId('produto-escolhido')).toBeNull()
  })

  it('trocar para o ramo da peça zera coleção e endereço, sem apagar a peça já escolhida', () => {
    const onChange = montar({
      product_id: 'p1',
      product_slug: 'colar-de-cinzas',
      label_snapshot: 'Colar de Cinzas',
    })
    escolher('__produto')

    expect(onChange).toHaveBeenCalledWith({ category_id: null, href: null })
    expect(screen.getByTestId('produto-escolhido')).toHaveTextContent('Colar de Cinzas')
  })
})
