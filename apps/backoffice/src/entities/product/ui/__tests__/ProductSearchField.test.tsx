// O componente compartilhado de busca de produto (feature 51, T04).
//
// **Este arquivo é o contrato de `ProductPicker.test.tsx` migrado**, caso a caso — vazio explicado,
// teto de 20, "já está no bloco", "fora do ar", `<ul>`/`<li>`, ausência de imagem e 44px —, mais o
// que só existe a partir daqui: o modo único, o estado de carga, o estado de erro e o preço.
//
// O pool vem do dublê do client, e não de um prop: é assim que o componente funciona na tela, e um
// teste que injetasse a lista provaria um componente que não existe.
//
// `BUS-05`, `BUS-06`, `BUS-08`, `BUS-09`, `BUS-10`, `BUS-12`, `BUS-14`, `BUS-17`, `BUS-18`.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import ProductSearchField, { type ProductSearchFieldProps } from '../ProductSearchField'
import type { ProdutoDoPool } from '../../lib/buscarProdutos'

const peca = (id: string, name: string, over: Partial<ProdutoDoPool> = {}): ProdutoDoPool => ({
  id,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  is_active: true,
  base_price: 289,
  ...over,
})

const CATALOGO: ProdutoDoPool[] = [
  peca('p1', 'Colar de Cinzas'),
  peca('p2', 'Pingente Gota'),
  peca('p3', 'Anel Coração'),
  peca('p4', 'Colar Memória'),
  peca('p5', 'Broche Pena', { is_active: false }),
]

/** O client dublado: conta, e depois entrega a página. */
const encena = (pool: ProdutoDoPool[], erro: { message?: string } | null = null) => {
  fromMock.mockImplementation(() => ({
    select: (_colunas: string, opcoes?: { head?: true }) => {
      if (opcoes?.head) {
        return Promise.resolve({ count: erro ? null : pool.length, error: erro })
      }
      const construtor = {
        order: () => construtor,
        range: () => Promise.resolve({ data: pool, error: null }),
      }
      return construtor
    },
  }))
}

const ROTULO = 'Acrescentar uma peça'

const Palco = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const montar = async (props: Partial<ProductSearchFieldProps> = {}) => {
  const onEscolher = vi.fn()
  const onLimpar = vi.fn()
  const utils = render(
    <Palco>
      <ProductSearchField
        rotulo={ROTULO}
        onEscolher={onEscolher}
        onLimpar={onLimpar}
        {...props}
      />
    </Palco>,
  )
  // O pool desce por React Query: sem esperar, toda asserção mediria o estado de carga.
  await waitFor(() => expect(screen.queryByTestId('busca-carregando')).toBeNull())
  return { onEscolher, onLimpar, ...utils }
}

const buscar = (termo: string) =>
  fireEvent.change(screen.getByLabelText(ROTULO), { target: { value: termo } })

const nomesNaLista = () =>
  within(screen.getByTestId('pecas-encontradas'))
    .getAllByRole('button')
    .map(b => b.textContent?.replace(/já está no bloco|fora do ar|R\$[\s\S]*$/g, '').trim())

beforeEach(() => {
  fromMock.mockReset()
  encena(CATALOGO)
})

describe('ProductSearchField — a busca', () => {
  it('sem termo, oferece o catálogo inteiro', async () => {
    await montar()
    expect(nomesNaLista()).toEqual([
      'Anel Coração',
      'Broche Pena',
      'Colar de Cinzas',
      'Colar Memória',
      'Pingente Gota',
    ])
  })

  it('filtra por nome, SEM CAIXA — "colar" acha as duas', async () => {
    await montar()
    buscar('colar')
    expect(nomesNaLista()).toEqual(['Colar de Cinzas', 'Colar Memória'])
  })

  it('filtra SEM ACENTO — "coracao" acha "Anel Coração"', async () => {
    await montar()
    buscar('coracao')
    expect(nomesNaLista()).toEqual(['Anel Coração'])
  })

  it('o termo acentuado também acha — a dobra vale para os dois lados', async () => {
    await montar()
    buscar('Coração')
    expect(nomesNaLista()).toEqual(['Anel Coração'])
  })

  it('espaço em volta do termo não muda o resultado', async () => {
    await montar()
    buscar('   gota   ')
    expect(nomesNaLista()).toEqual(['Pingente Gota'])
  })

  it('palavras em qualquer ordem — "cinzas colar" acha "Colar de Cinzas"', async () => {
    // O que esta feature acrescentou sobre o `includes` das cinco telas antigas.
    await montar()
    buscar('cinzas colar')
    expect(nomesNaLista()).toEqual(['Colar de Cinzas'])
  })

  it('o contador diz quantas casaram, de quantas existem', async () => {
    await montar()
    expect(screen.getByTestId('contador-encontrados')).toHaveTextContent('5 no catálogo')
    buscar('colar')
    expect(screen.getByTestId('contador-encontrados')).toHaveTextContent('2 de 5')
  })
})

describe('ProductSearchField — busca sem resultado EXPLICA (BUS-05)', () => {
  it('mostra o vazio dizendo o que aconteceu e o que fazer, citando o termo', async () => {
    await montar()
    buscar('bicicleta')

    const vazio = screen.getByTestId('busca-sem-resultado')
    expect(vazio).toHaveTextContent('Nenhuma peça com “bicicleta”')
    expect(vazio).toHaveTextContent(/ignora acento e maiúscula/)
  })

  it('a lista some — não fica uma lista vazia ao lado do aviso', async () => {
    await montar()
    buscar('bicicleta')
    expect(screen.queryByTestId('pecas-encontradas')).toBeNull()
  })

  it('catálogo vazio cai no mesmo vazio explicado, e NÃO diz que a busca falhou', async () => {
    encena([])
    await montar()
    expect(screen.getByTestId('busca-sem-resultado')).toBeInTheDocument()
    expect(screen.queryByTestId('busca-com-erro')).toBeNull()
  })
})

describe('ProductSearchField — o modo MÚLTIPLO (BUS-08, BUS-14)', () => {
  it('escolher emite o produto do pool, inteiro', async () => {
    const { onEscolher } = await montar()
    fireEvent.click(screen.getByTestId('peca-p2'))

    expect(onEscolher).toHaveBeenCalledTimes(1)
    expect(onEscolher.mock.calls[0][0]).toMatchObject({
      id: 'p2',
      name: 'Pingente Gota',
      slug: 'pingente-gota',
    })
  })

  it('quem já está na lista aparece DESABILITADA, dizendo por quê', async () => {
    await montar({ selecionados: ['p2'] })
    expect(screen.getByTestId('peca-p2')).toBeDisabled()
    expect(screen.getByTestId('ja-escolhida-p2')).toHaveTextContent('já está no bloco')
  })

  it('o texto da recusa é de quem CHAMA — a Home diz "bloco", a aba de relacionados diz "lista"', async () => {
    // Um parâmetro, e não um segundo componente: o que varia é uma palavra, e o que não pode variar
    // é a lista de resultados (`A-06`). O padrão fica com o vocabulário da Home, que é o consumidor
    // de onde este componente saiu.
    await montar({ selecionados: ['p2'], rotuloJaEscolhida: 'já está na lista' })
    expect(screen.getByTestId('ja-escolhida-p2')).toHaveTextContent('já está na lista')
    expect(screen.getByTestId('ja-escolhida-p2')).not.toHaveTextContent('bloco')
  })

  it('clicar na desabilitada não emite nada — sem duplicata (BUS-14)', async () => {
    const { onEscolher } = await montar({ selecionados: ['p2'] })
    fireEvent.click(screen.getByTestId('peca-p2'))
    expect(onEscolher).not.toHaveBeenCalled()
  })

  it('as outras continuam oferecidas — a recusa é da peça, não da lista', async () => {
    // O par: uma régua que desabilitasse tudo passaria nas duas asserções acima.
    const { onEscolher } = await montar({ selecionados: ['p2'] })
    expect(screen.getByTestId('peca-p1')).not.toBeDisabled()
    expect(screen.queryByTestId('ja-escolhida-p1')).toBeNull()

    fireEvent.click(screen.getByTestId('peca-p1'))
    expect(onEscolher).toHaveBeenCalledTimes(1)
  })

  it('`selecionados` DESABILITA e aparece; `excluir` SOME da lista', async () => {
    // A diferença é deliberada: quem já está no bloco precisa ser visto para a dona entender por
    // que não pode escolhê-lo; o produto que está sendo editado nunca foi uma opção.
    await montar({ selecionados: ['p2'], excluir: ['p1'] })
    expect(screen.getByTestId('peca-p2')).toBeInTheDocument()
    expect(screen.queryByTestId('peca-p1')).toBeNull()
  })

  it('o excluído sai também da CONTAGEM — o contador não promete linha que não existe', async () => {
    await montar({ excluir: ['p1'] })
    expect(screen.getByTestId('contador-encontrados')).toHaveTextContent('4 no catálogo')
  })
})

describe('ProductSearchField — o modo ÚNICO (BUS-09)', () => {
  it('a peça escolhida aparece NOMEADA no campo', async () => {
    await montar({ modo: 'unico', escolhido: 'p1' })
    expect(screen.getByTestId('produto-escolhido')).toHaveTextContent('Colar de Cinzas')
  })

  it('o controle de limpar existe e chama `onLimpar`', async () => {
    const { onLimpar } = await montar({ modo: 'unico', escolhido: 'p1' })
    fireEvent.click(screen.getByTestId('limpar-produto'))
    expect(onLimpar).toHaveBeenCalledTimes(1)
  })

  it('escolher outra SUBSTITUI — o chamador recebe a nova, e uma vez só', async () => {
    const { onEscolher } = await montar({ modo: 'unico', escolhido: 'p1' })
    fireEvent.click(screen.getByTestId('peca-p2'))

    expect(onEscolher).toHaveBeenCalledTimes(1)
    expect(onEscolher.mock.calls[0][0]).toMatchObject({ id: 'p2' })
  })

  it('sem nada escolhido, o campo NÃO mostra bloco de escolha', async () => {
    // O par do primeiro caso: sem ele, um bloco sempre presente passaria igual.
    await montar({ modo: 'unico', escolhido: null })
    expect(screen.queryByTestId('produto-escolhido')).toBeNull()
  })

  it('peça APAGADA do catálogo segue mostrando o nome congelado pelo chamador', async () => {
    // Sem o nome congelado o campo trocaria a escolha por vazio, e a dona não teria como saber
    // **qual** peça se perdeu.
    await montar({ modo: 'unico', escolhido: 'sumiu', nomeEscolhido: 'Colar Antigo' })
    expect(screen.getByTestId('produto-escolhido')).toHaveTextContent('Colar Antigo')
  })

  it('o modo MÚLTIPLO não mostra bloco de escolha, mesmo com `escolhido`', async () => {
    await montar({ modo: 'multiplo', escolhido: 'p1' })
    expect(screen.queryByTestId('produto-escolhido')).toBeNull()
  })
})

describe('ProductSearchField — peça fora do ar é MARCADA e continua escolhível (BUS-10)', () => {
  it('a peça fora do ar é marcada', async () => {
    await montar()
    expect(screen.getByTestId('fora-do-ar-p5')).toHaveTextContent('fora do ar')
  })

  it('e continua escolhível — a marca informa, não bloqueia', async () => {
    // O par obrigatório: marcar **e** desabilitar passaria no caso acima e quebraria a AC.
    const { onEscolher } = await montar()
    expect(screen.getByTestId('peca-p5')).not.toBeDisabled()
    fireEvent.click(screen.getByTestId('peca-p5'))
    expect(onEscolher.mock.calls[0][0]).toMatchObject({ id: 'p5' })
  })

  it('peça no ar NÃO ganha a marca — senão a marca não significaria nada', async () => {
    await montar()
    expect(screen.queryByTestId('fora-do-ar-p1')).toBeNull()
  })
})

describe('ProductSearchField — o teto de DESENHO da lista (BUS-06)', () => {
  const muitos = Array.from({ length: 30 }, (_, i) =>
    peca(`x${String(i).padStart(2, '0')}`, `Peça ${String(i).padStart(2, '0')}`),
  )

  it('mostra 20 linhas e diz quantas ficaram de fora', async () => {
    encena(muitos)
    await montar()
    expect(nomesNaLista()).toHaveLength(20)
    expect(screen.getByTestId('mais-resultados')).toHaveTextContent('Mostrando 20 de 30')
  })

  it('com o catálogo cabendo, o aviso NÃO aparece', async () => {
    await montar()
    expect(screen.queryByTestId('mais-resultados')).toBeNull()
  })

  it('o teto é de desenho, não de escolha — a busca alcança quem ficou de fora', async () => {
    encena(muitos)
    await montar()
    buscar('Peça 27')
    expect(nomesNaLista()).toEqual(['Peça 27'])
  })
})

describe('ProductSearchField — o estado de CARGA (edge case)', () => {
  it('enquanto o pool não chega, o campo é utilizável e a lista DIZ que está carregando', () => {
    // Um vazio aqui se leria como "não achei", e a dona reescreveria o termo contra um catálogo que
    // ainda não chegou.
    let liberar: (v: unknown) => void = () => {}
    fromMock.mockImplementation(() => ({
      select: () => new Promise(resolve => { liberar = resolve }),
    }))

    render(
      <Palco>
        <ProductSearchField rotulo={ROTULO} onEscolher={vi.fn()} />
      </Palco>,
    )

    expect(screen.getByTestId('busca-carregando')).toHaveTextContent('Carregando o catálogo')
    expect(screen.queryByTestId('busca-sem-resultado')).toBeNull()
    expect(screen.getByLabelText(ROTULO)).not.toBeDisabled()
    liberar({ count: 0, error: null })
  })
})

describe('ProductSearchField — o estado de ERRO (BUS-12)', () => {
  it('diz que não conseguiu carregar, com a mensagem do banco', async () => {
    encena(CATALOGO, { message: 'permission denied' })
    render(
      <Palco>
        <ProductSearchField rotulo={ROTULO} onEscolher={vi.fn()} />
      </Palco>,
    )

    await waitFor(() => expect(screen.getByTestId('busca-com-erro')).toBeInTheDocument())
    expect(screen.getByTestId('busca-com-erro')).toHaveTextContent(
      'Não foi possível carregar o catálogo.',
    )
    expect(screen.getByTestId('busca-com-erro')).toHaveTextContent('permission denied')
  })

  it('e o campo NÃO sugere que o catálogo está vazio', async () => {
    // A distinção é o ponto: "nenhuma peça" mandaria a dona procurar o problema no catálogo dela.
    encena(CATALOGO, { message: 'permission denied' })
    render(
      <Palco>
        <ProductSearchField rotulo={ROTULO} onEscolher={vi.fn()} />
      </Palco>,
    )

    await waitFor(() => expect(screen.getByTestId('busca-com-erro')).toBeInTheDocument())
    expect(screen.queryByTestId('busca-sem-resultado')).toBeNull()
    expect(screen.queryByTestId('pecas-encontradas')).toBeNull()
  })

  it('oferece TENTAR DE NOVO, e o clique pede a leitura outra vez', async () => {
    let falhar = true
    fromMock.mockImplementation(() => ({
      select: (_colunas: string, opcoes?: { head?: true }) => {
        if (opcoes?.head) {
          return Promise.resolve(
            falhar ? { count: null, error: { message: 'offline' } } : { count: 1, error: null },
          )
        }
        const construtor = {
          order: () => construtor,
          range: () => Promise.resolve({ data: [CATALOGO[0]], error: null }),
        }
        return construtor
      },
    }))

    render(
      <Palco>
        <ProductSearchField rotulo={ROTULO} onEscolher={vi.fn()} />
      </Palco>,
    )
    await waitFor(() => expect(screen.getByTestId('busca-tentar-de-novo')).toBeInTheDocument())

    falhar = false
    fireEvent.click(screen.getByTestId('busca-tentar-de-novo'))

    await waitFor(() => expect(screen.getByTestId('peca-p1')).toBeInTheDocument())
    expect(screen.queryByTestId('busca-com-erro')).toBeNull()
  })
})

describe('ProductSearchField — o preço é parâmetro, não composição (A-07)', () => {
  it('desligado por padrão: nenhuma linha mostra preço', async () => {
    await montar()
    expect(screen.queryByText(/R\$/)).toBeNull()
    expect(screen.queryByTestId('preco-p1')).toBeNull()
  })

  it('ligado, mostra o preço formatado na linha', async () => {
    // O par: sem ele, apagar o ramo do preço deixaria o caso acima verde e o order bump mudo.
    await montar({ mostrarPreco: true })
    expect(screen.getByTestId('preco-p1')).toHaveTextContent('R$')
    expect(screen.getByTestId('preco-p1')).toHaveTextContent('289,00')
  })

  it('peça sem preço não quebra a linha', async () => {
    encena([peca('s1', 'Colar Sem Preço', { base_price: null })])
    await montar({ mostrarPreco: true })
    expect(screen.getByTestId('preco-s1')).toHaveTextContent('0,00')
  })
})

describe('ProductSearchField — AD-019: o seletor NÃO desenha vitrine (BUS-17)', () => {
  it('nenhuma imagem é renderizada', async () => {
    // O painel não desenha a Home. Miniaturas aqui seriam o segundo desenho voltando com o rótulo
    // de "ajuda a reconhecer a peça" — e `previaUnica.test.ts` derruba a suíte por isso.
    const { container } = await montar()
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('a lista é uma LISTA — `<ul>` de `<li>`, não uma grade', async () => {
    await montar()
    const lista = screen.getByTestId('pecas-encontradas')
    expect(lista.tagName).toBe('UL')
    expect(lista.className).not.toMatch(/grid-cols/)
    expect(within(lista).getAllByRole('listitem').length).toBeGreaterThan(0)
  })

  it('cada linha clicável é filha de um `<li>`', async () => {
    await montar()
    expect(screen.getByTestId('peca-p1').parentElement?.tagName).toBe('LI')
  })
})

describe('ProductSearchField — o alvo de toque (BUS-18)', () => {
  it('cada linha tem ao menos 44px de altura, por TOKEN EXATO', async () => {
    // jsdom devolve 0 para toda medida de layout, então a régua é de token na classe. O `(?![-\w])`
    // é obrigatório: `toContain('h-11')` casaria `min-h-11` e também `h-110` (`L-034`).
    await montar()
    for (const id of ['p1', 'p2', 'p3']) {
      expect(screen.getByTestId(`peca-${id}`).className).toMatch(/(?:^|\s)min-h-11(?![-\w])/)
    }
  })

  it('o controle de limpar do modo único também tem 44px', async () => {
    await montar({ modo: 'unico', escolhido: 'p1' })
    expect(screen.getByTestId('limpar-produto').className).toMatch(/(?:^|\s)h-11(?![-\w])/)
    expect(screen.getByTestId('limpar-produto').className).toMatch(/(?:^|\s)w-11(?![-\w])/)
  })

  it('o botão de tentar de novo também', async () => {
    encena(CATALOGO, { message: 'offline' })
    render(
      <Palco>
        <ProductSearchField rotulo={ROTULO} onEscolher={vi.fn()} />
      </Palco>,
    )
    await waitFor(() => expect(screen.getByTestId('busca-tentar-de-novo')).toBeInTheDocument())
    expect(screen.getByTestId('busca-tentar-de-novo').className).toMatch(
      /(?:^|\s)min-h-11(?![-\w])/,
    )
  })
})

describe('ProductSearchField — o rótulo é o nome acessível do campo', () => {
  it('o `<label>` aponta para o `<input>`', async () => {
    await montar()
    expect(screen.getByLabelText(ROTULO).tagName).toBe('INPUT')
  })

  it('o `id` é parametrizável — a tela que já tem um `htmlFor` próprio o reusa', async () => {
    await montar({ id: 'produto-da-oferta' })
    expect(screen.getByLabelText(ROTULO).id).toBe('produto-da-oferta')
  })
})
