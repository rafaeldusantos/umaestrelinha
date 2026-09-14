// O seletor de peças — `DST-03` e `DST-09` na tela (feature 50).
//
// O que esta suíte prova, além do filtro: que o seletor **responde antes do clique** (a peça que já
// está no bloco aparece dizendo isso, em vez de ser recusada depois), que a escolha **congela** o
// que a dona viu, e que ele **não desenha vitrine** — a régua de `AD-019` aplicada ao componente que
// mais convidaria a quebrá-la.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ProductPicker from './ProductPicker'
import type { EditorProduct } from './sectionEditors'

const prod = (over: Partial<EditorProduct> & { id: string; name: string }): EditorProduct => ({
  slug: over.slug ?? over.id,
  is_active: true,
  ...over,
})

const CATALOGO: EditorProduct[] = [
  prod({ id: 'p1', name: 'Colar de Cinzas', slug: 'colar-de-cinzas' }),
  prod({ id: 'p2', name: 'Pingente Gota', slug: 'pingente-gota' }),
  prod({ id: 'p3', name: 'Anel Coração', slug: 'anel-coracao' }),
  prod({ id: 'p4', name: 'Colar Memória', slug: 'colar-memoria' }),
  prod({ id: 'p5', name: 'Broche Pena', slug: 'broche-pena', is_active: false }),
]

const montar = (escolhidos: string[] = [], products: EditorProduct[] = CATALOGO) => {
  const onPick = vi.fn()
  render(<ProductPicker products={products} escolhidos={escolhidos} onPick={onPick} />)
  return onPick
}

const buscar = (termo: string) =>
  fireEvent.change(screen.getByLabelText('Acrescentar uma peça'), { target: { value: termo } })

const nomesNaLista = () =>
  within(screen.getByTestId('pecas-encontradas'))
    .getAllByRole('button')
    .map(b => b.textContent?.replace(/já está no bloco|fora do ar/g, '').trim())

describe('ProductPicker — a busca (DST-03)', () => {
  it('sem termo, oferece o catálogo inteiro', () => {
    montar()
    expect(nomesNaLista()).toEqual([
      'Colar de Cinzas',
      'Pingente Gota',
      'Anel Coração',
      'Colar Memória',
      'Broche Pena',
    ])
  })

  it('filtra por nome, SEM CAIXA — "colar" acha "Colar de Cinzas"', () => {
    montar()
    buscar('colar')
    expect(nomesNaLista()).toEqual(['Colar de Cinzas', 'Colar Memória'])
  })

  it('filtra SEM ACENTO — "coracao" acha "Anel Coração"', () => {
    // O par da asserção acima, e não um luxo: os nomes do catálogo desta loja são quase todos
    // acentuados, e um filtro que exigisse o acento certo falharia justamente em "memória",
    // "coração" e "cinzas de cremação".
    montar()
    buscar('coracao')
    expect(nomesNaLista()).toEqual(['Anel Coração'])
  })

  it('o termo acentuado também acha — a dobra vale para os dois lados', () => {
    montar()
    buscar('Coração')
    expect(nomesNaLista()).toEqual(['Anel Coração'])
  })

  it('espaço em volta do termo não muda o resultado', () => {
    montar()
    buscar('   gota   ')
    expect(nomesNaLista()).toEqual(['Pingente Gota'])
  })

  it('o contador diz quantas casaram, de quantas existem', () => {
    montar()
    expect(screen.getByTestId('contador-encontrados')).toHaveTextContent('5 no catálogo')
    buscar('colar')
    expect(screen.getByTestId('contador-encontrados')).toHaveTextContent('2 de 5')
  })
})

describe('ProductPicker — busca sem resultado EXPLICA (não é lista em branco)', () => {
  it('mostra o vazio dizendo o que aconteceu e o que fazer', () => {
    montar()
    buscar('bicicleta')

    const vazio = screen.getByTestId('busca-sem-resultado')
    expect(vazio).toHaveTextContent('Nenhuma peça com “bicicleta”')
    expect(vazio).toHaveTextContent(/ignora acento e maiúscula/)
  })

  it('a lista some — não fica uma lista vazia ao lado do aviso', () => {
    montar()
    buscar('bicicleta')
    expect(screen.queryByTestId('pecas-encontradas')).toBeNull()
  })

  it('catálogo vazio cai no mesmo vazio explicado, e não quebra', () => {
    montar([], [])
    expect(screen.getByTestId('busca-sem-resultado')).toBeInTheDocument()
  })
})

describe('ProductPicker — acrescentar congela o que a dona viu', () => {
  it('emite um `DraftItem` com `product_id`, `product_slug` e `label_snapshot`', () => {
    const onPick = montar()
    fireEvent.click(screen.getByTestId('peca-p2'))

    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick.mock.calls[0][0]).toMatchObject({
      product_id: 'p2',
      product_slug: 'pingente-gota',
      label_snapshot: 'Pingente Gota',
    })
  })

  it('o item emitido tem `key` própria — a lista é arrastável e reconciliaria por posição sem ela', () => {
    const onPick = montar()
    fireEvent.click(screen.getByTestId('peca-p1'))
    fireEvent.click(screen.getByTestId('peca-p2'))

    const [primeira] = onPick.mock.calls[0]
    const [segunda] = onPick.mock.calls[1]
    expect(primeira.key).toBeTruthy()
    expect(segunda.key).toBeTruthy()
    expect(primeira.key).not.toBe(segunda.key)
  })

  it('os outros campos de destino saem NULOS — uma peça não é coleção nem endereço livre', () => {
    // Sem isto, um item herdado de outro editor poderia chegar com `category_id` preenchido, e
    // `resolveItem` resolveria pelo ramo de categoria — o bloco mostraria uma coleção onde a dona
    // escolheu uma peça.
    const onPick = montar()
    fireEvent.click(screen.getByTestId('peca-p1'))

    expect(onPick.mock.calls[0][0]).toMatchObject({
      category_id: null,
      href: null,
      image_url: null,
      image_mobile_url: null,
      alt: null,
    })
  })

  it('acrescentar a peça encontrada pela busca emite ELA, não a primeira da lista', () => {
    const onPick = montar()
    buscar('memória')
    fireEvent.click(screen.getByTestId('peca-p4'))
    expect(onPick.mock.calls[0][0]).toMatchObject({ product_id: 'p4', product_slug: 'colar-memoria' })
  })
})

describe('ProductPicker — peça repetida (DST-09 na tela)', () => {
  it('quem já está no bloco aparece DESABILITADA, dizendo por quê', () => {
    montar(['p2'])
    expect(screen.getByTestId('peca-p2')).toBeDisabled()
    expect(screen.getByTestId('ja-escolhida-p2')).toHaveTextContent('já está no bloco')
  })

  it('clicar na desabilitada não acrescenta nada', () => {
    const onPick = montar(['p2'])
    fireEvent.click(screen.getByTestId('peca-p2'))
    expect(onPick).not.toHaveBeenCalled()
  })

  it('as outras continuam oferecidas — a recusa é da peça, não da lista', () => {
    // O par: uma régua que desabilitasse tudo passaria nas duas asserções acima.
    const onPick = montar(['p2'])
    expect(screen.getByTestId('peca-p1')).not.toBeDisabled()
    expect(screen.queryByTestId('ja-escolhida-p1')).toBeNull()

    fireEvent.click(screen.getByTestId('peca-p1'))
    expect(onPick).toHaveBeenCalledTimes(1)
  })
})

describe('ProductPicker — peça despublicada é escolhível, e DIZ que está fora do ar', () => {
  it('a peça fora do ar é marcada', () => {
    // Não é recusa (`A-12`): escolher uma peça despublicada é estado legítimo. Mas escolhê-la sem
    // saber faria o painel dizer "1 escolhida saiu do ar" logo depois, sem explicação.
    montar()
    expect(screen.getByTestId('fora-do-ar-p5')).toHaveTextContent('fora do ar')
  })

  it('e continua escolhível — a marca informa, não bloqueia', () => {
    const onPick = montar()
    expect(screen.getByTestId('peca-p5')).not.toBeDisabled()
    fireEvent.click(screen.getByTestId('peca-p5'))
    expect(onPick.mock.calls[0][0]).toMatchObject({ product_id: 'p5' })
  })

  it('peça no ar NÃO ganha a marca — senão a marca não significaria nada', () => {
    montar()
    expect(screen.queryByTestId('fora-do-ar-p1')).toBeNull()
  })
})

describe('ProductPicker — o teto de DESENHO da lista', () => {
  const muitos = Array.from({ length: 30 }, (_, i) =>
    prod({ id: `x${i}`, name: `Peça ${i}`, slug: `peca-${i}` }),
  )

  it('mostra 20 linhas e diz quantas ficaram de fora', () => {
    montar([], muitos)
    expect(nomesNaLista()).toHaveLength(20)
    expect(screen.getByTestId('mais-resultados')).toHaveTextContent('Mostrando 20 de 30')
  })

  it('com o catálogo cabendo, o aviso NÃO aparece', () => {
    montar()
    expect(screen.queryByTestId('mais-resultados')).toBeNull()
  })

  it('o teto é de desenho, não de escolha — a busca alcança quem ficou de fora', () => {
    montar([], muitos)
    buscar('Peça 27')
    expect(nomesNaLista()).toEqual(['Peça 27'])
  })
})

describe('ProductPicker — AD-019: o seletor NÃO desenha vitrine', () => {
  it('nenhuma imagem de produto é renderizada', () => {
    // O painel não desenha a Home. Miniaturas aqui seriam o segundo desenho voltando com o rótulo
    // de "ajuda a reconhecer a peça" — e `previaUnica.test.ts` derruba a suíte por isso.
    const { container } = render(
      <ProductPicker products={CATALOGO} escolhidos={[]} onPick={vi.fn()} />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('a lista é uma LISTA — `<ul>` de `<li>`, não uma grade', () => {
    montar()
    const lista = screen.getByTestId('pecas-encontradas')
    expect(lista.tagName).toBe('UL')
    expect(lista.className).not.toMatch(/grid-cols/)
  })

  it('nenhuma linha mostra preço — isto não é a vitrine', () => {
    montar()
    expect(screen.queryByText(/R\$/)).toBeNull()
  })
})

describe('ProductPicker — o alvo de toque', () => {
  it('cada linha tem ao menos 44px de altura', () => {
    // jsdom devolve 0 para toda medida de layout, então a régua é de token exato na classe — a
    // mesma prática dos guardas deste repositório.
    montar()
    for (const id of ['p1', 'p2', 'p3']) {
      expect(screen.getByTestId(`peca-${id}`).className).toMatch(/(?:^|\s)min-h-11(?![-\w])/)
    }
  })
})
