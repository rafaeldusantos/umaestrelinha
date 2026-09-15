// O seletor de peças da Home — o que sobrou dele depois da feature 51.
//
// **O contrato da BUSCA migrou inteiro** para
// `entities/product/ui/__tests__/ProductSearchField.test.tsx`: dobra de acento, casamento por
// palavra, ordenação, teto de 20, vazio explicado, "já está no bloco", "fora do ar", `<ul>`/`<li>`,
// ausência de imagem e os 44px. Ele não foi perdido — mudou de dono junto com o código, e lá vale
// para as cinco superfícies em vez de para uma.
//
// **O que fica aqui é o que NÃO é busca**: a montagem do `DraftItem`. Congelar `product_slug` e
// `label_snapshot` é regra da Home (`DST-24`, `HOME-24`), e é a única coisa que este arquivo ainda
// decide.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY, type ProdutoDoPool } from '@/entities/product'
import ProductPicker from './ProductPicker'

const peca = (id: string, name: string, slug: string): ProdutoDoPool => ({
  id,
  name,
  slug,
  is_active: true,
  base_price: 289,
})

const POOL: ProdutoDoPool[] = [
  peca('p1', 'Colar de Cinzas', 'colar-de-cinzas'),
  peca('p2', 'Pingente Gota', 'pingente-gota'),
]

/**
 * O pool entra **semeado no cache**, e não por um dublê de rede.
 *
 * O que este arquivo prova é a montagem do `DraftItem`; a leitura já tem dono e já tem suíte
 * própria (`useProductPool.test.ts`), com dublê que enxerga a projeção e a paginação. Semear aqui
 * mantém o render síncrono e deixa a asserção medir a montagem, que é o assunto.
 */
const Palco = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(PRODUCT_POOL_KEY, POOL)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const montar = (escolhidos: string[] = []) => {
  const onPick = vi.fn()
  render(
    <Palco>
      <ProductPicker escolhidos={escolhidos} onPick={onPick} />
    </Palco>,
  )
  return onPick
}

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

  it('emite a peça CLICADA, não a primeira da lista', () => {
    const onPick = montar()
    fireEvent.click(screen.getByTestId('peca-p2'))
    expect(onPick.mock.calls[0][0]).toMatchObject({ product_id: 'p2', product_slug: 'pingente-gota' })
  })
})

describe('ProductPicker — a delegação', () => {
  it('renderiza o campo compartilhado, com o rótulo da Home', () => {
    // O fio: apagar o `ProductSearchField` daqui deixaria o editor sem como acrescentar peça, e a
    // montagem do `DraftItem` acima nunca chegaria a ser exercitada — mas os quatro casos ficariam
    // "verdes por não rodar" se alguém os deixasse de fora.
    montar()
    expect(screen.getByLabelText('Acrescentar uma peça')).toBeInTheDocument()
    expect(screen.getByTestId('seletor-de-pecas')).toBeInTheDocument()
  })

  it('repassa os já escolhidos — quem está no bloco chega DESABILITADO ao campo', () => {
    // A régua de "já está no bloco" é do componente compartilhado; o que se prova aqui é que o
    // `escolhidos` da Home chega lá. Apagar o `selecionados=` deixaria a peça repetida escolhível.
    const onPick = montar(['p2'])
    expect(screen.getByTestId('peca-p2')).toBeDisabled()

    fireEvent.click(screen.getByTestId('peca-p2'))
    expect(onPick).not.toHaveBeenCalled()
  })

  it('não declara busca própria — sem dobra, sem teto, sem `<Input>` e sem filtro', () => {
    // A metade estrutural de `BUS-07`, lida do FONTE, no arquivo que mais convidaria a manter a
    // cópia: ele era o mais novo dos cinco e o único com contrato completo, e por isso o candidato
    // natural a "deixa esse como está". Uma asserção pelo DOM não alcançaria isto — uma cópia da
    // busca aqui renderizaria exatamente o mesmo.
    const fonte = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), 'ProductPicker.tsx'),
      'utf8',
    )
    // Âncora: o arquivo foi lido de verdade, e é o certo.
    expect(fonte).toContain('ProductSearchField')

    // Comentario fora, linha e bloco na MESMA varredura, com a classe que fecha antes do retorno
    // de carro: o cabecalho deste arquivo cita as formas proibidas em prosa, e uma regua que
    // casasse mencao acusaria justamente o arquivo que esta certo (L-031).
    const codigo = fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
    expect(codigo).not.toMatch(/normalize\(\s*['"]NFD['"]\s*\)/)
    expect(codigo).not.toMatch(/<Input[\s/>]/)
    expect(codigo).not.toMatch(/(?:^|[^\w.])useMemo(?![\w])/)
    expect(codigo).not.toMatch(/(?:^|[^\w.])useState(?![\w])/)
  })
})
