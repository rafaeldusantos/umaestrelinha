// O editor do bloco **Produtos em destaque** — `DST-02`, `DST-07`..`DST-11`, `DST-18`.
//
// Montado pelo `HomeSectionEditor` de verdade, e não solto: a recusa mora no casco (`SECTION_EDITORS`
// carrega a régua do tipo), então um teste que renderizasse só o corpo provaria os campos e **nada**
// sobre as cinco cobranças. É a lição da `44` — *um teste que monta a árvore que quer provar não
// prova árvore nenhuma*: aqui quem monta é o casco, como na tela.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { HomeSection, HomeSectionConfig, ResolvedSection } from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category'
import HomeSectionEditor from './HomeSectionEditor'
import type { EditorProduct } from './sectionEditors'
import type { DraftItem } from '../model/sectionDraft'

const prod = (over: Partial<EditorProduct> & { id: string; name: string }): EditorProduct => ({
  slug: over.slug ?? over.id,
  is_active: true,
  ...over,
})

const PRODUTOS: EditorProduct[] = [
  prod({ id: 'p1', name: 'Colar de Cinzas', slug: 'colar-de-cinzas' }),
  prod({ id: 'p2', name: 'Pingente Gota', slug: 'pingente-gota' }),
  prod({ id: 'p3', name: 'Anel Coração', slug: 'anel-coracao' }),
  prod({ id: 'p4', name: 'Broche Pena', slug: 'broche-pena', is_active: false }),
]

const itemSalvo = (position: number, productId: string, nome: string) => ({
  id: `i${position}`,
  section_id: 's1',
  position,
  category_id: null,
  product_id: productId,
  product_slug: PRODUTOS.find(p => p.id === productId)?.slug ?? null,
  href: null,
  image_url: null,
  image_mobile_url: null,
  alt: null,
  label_snapshot: nome,
})

const secao = (config: HomeSectionConfig = {}, items: HomeSection['items'] = []): HomeSection => ({
  id: 's1',
  type: 'product_carousel',
  position: 1,
  active: true,
  config,
  items,
})

const montar = (section: HomeSection = secao()) => {
  const onSave = vi.fn().mockResolvedValue(null)
  const onDraftChange = vi.fn()

  render(
    <HomeSectionEditor
      entry={
        {
          section,
          renders: true,
          hiddenReason: null,
          items: [],
          droppedCount: 0,
          nestedUnder: null,
        } as unknown as ResolvedSection
      }
      categories={[] as unknown as readonly AdminCategory[]}
      products={PRODUTOS}
      saving={false}
      onCancel={vi.fn()}
      onSave={onSave}
      onDraftChange={onDraftChange}
    />,
  )

  return { onSave, onDraftChange }
}

const salvar = () => fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
const recusa = () => screen.queryByTestId('editor-recusa')?.textContent ?? ''

/** O rascunho corrente, do último `onDraftChange`. É o que a prévia recebe. */
const rascunho = (onDraftChange: ReturnType<typeof vi.fn>): { config: HomeSectionConfig; items: DraftItem[] } =>
  onDraftChange.mock.calls[onDraftChange.mock.calls.length - 1][0]

const nomesDaCuradoria = () =>
  within(screen.getByTestId('curadoria'))
    .getAllByRole('listitem')
    .map(li => li.querySelector('.truncate')?.textContent)

describe('FeaturedProductsEditor — os três cartões, na ordem da decisão (DST-02)', () => {
  it('Conteúdo → Apresentação → Peças escolhidas', () => {
    montar()
    const titulos = screen.getAllByText(/^(Conteúdo|Apresentação|Peças escolhidas)$/).map(n => n.textContent)
    expect(titulos).toEqual(['Conteúdo', 'Apresentação', 'Peças escolhidas'])
  })

  it('o cartão de Conteúdo pede título e descrição', () => {
    montar()
    expect(screen.getByLabelText('Título do bloco')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição (opcional)')).toBeInTheDocument()
  })

  it('o seletor de peças está no rodapé do cartão de curadoria', () => {
    montar()
    expect(screen.getByTestId('seletor-de-pecas')).toBeInTheDocument()
  })

  it('título e descrição semeiam do `config` salvo', () => {
    montar(secao({ title: 'Feitas à mão neste mês', subtitle: 'o lote de setembro' }))
    expect(screen.getByLabelText('Título do bloco')).toHaveValue('Feitas à mão neste mês')
    expect(screen.getByLabelText('Descrição (opcional)')).toHaveValue('o lote de setembro')
  })

  it('digitar o título sobe no rascunho — é o que a prévia mostra antes de salvar', () => {
    const { onDraftChange } = montar()
    fireEvent.change(screen.getByLabelText('Título do bloco'), { target: { value: 'Novidades' } })
    expect(rascunho(onDraftChange).config.title).toBe('Novidades')
  })
})

describe('FeaturedProductsEditor — Slider × Grade', () => {
  it('o par usa `aria-pressed`, e `slider` é o padrão quando não há `display`', () => {
    montar()
    expect(screen.getByTestId('apresentacao-slider')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('apresentacao-grid')).toHaveAttribute('aria-pressed', 'false')
  })

  it('`display` desconhecido lê como `slider` — a tela não fica sem marca (DST-10)', () => {
    // O valor alcançável por escrita direta ou por uma versão mais nova. `featuredDisplay` recua,
    // e a tela não pode recuar de um jeito diferente.
    montar(secao({ display: 'carrossel-3d' as never }))
    expect(screen.getByTestId('apresentacao-slider')).toHaveAttribute('aria-pressed', 'true')
  })

  it('`grid` salvo marca a Grade', () => {
    montar(secao({ display: 'grid' }))
    expect(screen.getByTestId('apresentacao-grid')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('apresentacao-slider')).toHaveAttribute('aria-pressed', 'false')
  })

  it('cada opção diz em uma linha o que faz', () => {
    montar()
    expect(screen.getByTestId('apresentacao-slider')).toHaveTextContent('uma fileira que rola')
    expect(screen.getByTestId('apresentacao-grid')).toHaveTextContent('linhas de 4, o que sobrar vai abaixo')
  })

  it('clicar em Grade grava `display: grid` no rascunho', () => {
    const { onDraftChange } = montar()
    fireEvent.click(screen.getByTestId('apresentacao-grid'))
    expect(rascunho(onDraftChange).config.display).toBe('grid')
  })

  it('DST-18 — trocar de apresentação NÃO mexe na curadoria', () => {
    // Asserido sobre os ITENS, e não sobre a classe do botão: o que a AC promete é que doze
    // escolhas sobrevivem a um clique, e uma asserção de estilo seria verdadeira nos dois mundos.
    const { onDraftChange } = montar(
      secao({ title: 'x' }, [itemSalvo(1, 'p1', 'Colar de Cinzas'), itemSalvo(2, 'p2', 'Pingente Gota')]),
    )

    fireEvent.click(screen.getByTestId('apresentacao-grid'))
    const depois = rascunho(onDraftChange)

    expect(depois.config.display).toBe('grid')
    expect(depois.items.map(i => i.product_id)).toEqual(['p1', 'p2'])
    expect(depois.items.map(i => i.product_slug)).toEqual(['colar-de-cinzas', 'pingente-gota'])
  })
})

describe('FeaturedProductsEditor — a lista de peças', () => {
  it('semeia do que está salvo, na ordem da `position`', () => {
    montar(secao({ title: 'x' }, [itemSalvo(2, 'p2', 'Pingente Gota'), itemSalvo(1, 'p1', 'Colar de Cinzas')]))
    expect(nomesDaCuradoria()).toEqual(['Colar de Cinzas', 'Pingente Gota'])
  })

  it('cada linha traz a posição — a ordem é o que a dona está decidindo', () => {
    montar(secao({ title: 'x' }, [itemSalvo(1, 'p1', 'Colar de Cinzas'), itemSalvo(2, 'p2', 'Pingente Gota')]))
    expect(screen.getByTestId('posicao-0')).toHaveTextContent('1º')
    expect(screen.getByTestId('posicao-1')).toHaveTextContent('2º')
  })

  it('o nome exibido é o VIVO do catálogo, não o congelado — renomear o produto aparece aqui', () => {
    const renomeado = [{ ...itemSalvo(1, 'p1', 'Nome antigo') }]
    montar(secao({ title: 'x' }, renomeado))
    expect(nomesDaCuradoria()).toEqual(['Colar de Cinzas'])
  })

  it('acrescentar pelo seletor põe a peça no FIM da lista', () => {
    const { onDraftChange } = montar(secao({ title: 'x' }, [itemSalvo(1, 'p1', 'Colar de Cinzas')]))
    fireEvent.click(screen.getByTestId('peca-p2'))

    expect(rascunho(onDraftChange).items.map(i => i.product_id)).toEqual(['p1', 'p2'])
    expect(nomesDaCuradoria()).toEqual(['Colar de Cinzas', 'Pingente Gota'])
  })

  it('a peça acrescentada leva o `product_slug` — é o que faz a prévia mostrá-la (DST-24)', () => {
    const { onDraftChange } = montar(secao({ title: 'x' }))
    fireEvent.click(screen.getByTestId('peca-p2'))

    expect(rascunho(onDraftChange).items[0]).toMatchObject({
      product_id: 'p2',
      product_slug: 'pingente-gota',
      label_snapshot: 'Pingente Gota',
    })
  })

  it('a peça já escolhida aparece desabilitada no seletor (DST-09 na tela)', () => {
    montar(secao({ title: 'x' }, [itemSalvo(1, 'p1', 'Colar de Cinzas')]))
    expect(screen.getByTestId('peca-p1')).toBeDisabled()
    expect(screen.getByTestId('peca-p2')).not.toBeDisabled()
  })

  it('remover tira aquela peça, e só ela', () => {
    const { onDraftChange } = montar(
      secao({ title: 'x' }, [
        itemSalvo(1, 'p1', 'Colar de Cinzas'),
        itemSalvo(2, 'p2', 'Pingente Gota'),
        itemSalvo(3, 'p3', 'Anel Coração'),
      ]),
    )

    fireEvent.click(screen.getByTestId('remover-peca-1'))
    expect(rascunho(onDraftChange).items.map(i => i.product_id)).toEqual(['p1', 'p3'])
  })

  it('o contador diz `n de 12`', () => {
    montar(secao({ title: 'x' }, [itemSalvo(1, 'p1', 'Colar de Cinzas')]))
    expect(screen.getByTestId('contador-pecas')).toHaveTextContent('1 de 12')
  })

  it('com mais de uma peça, o contador convida a arrastar', () => {
    montar(secao({ title: 'x' }, [itemSalvo(1, 'p1', 'a'), itemSalvo(2, 'p2', 'b')]))
    expect(screen.getByTestId('contador-pecas')).toHaveTextContent('arraste para trocar de ordem')
  })

  it('lista vazia DIZ que o bloco não aparece na loja', () => {
    montar()
    expect(screen.getByTestId('curadoria-vazia')).toHaveTextContent('não aparece na loja')
  })
})

describe('FeaturedProductsEditor — arrastar reordena', () => {
  it('soltar a 2ª sobre a 1ª troca as duas', () => {
    const { onDraftChange } = montar(
      secao({ title: 'x' }, [
        itemSalvo(1, 'p1', 'Colar de Cinzas'),
        itemSalvo(2, 'p2', 'Pingente Gota'),
        itemSalvo(3, 'p3', 'Anel Coração'),
      ]),
    )

    fireEvent.dragStart(screen.getByTestId('peca-escolhida-1'))
    fireEvent.drop(screen.getByTestId('peca-escolhida-0'))

    expect(rascunho(onDraftChange).items.map(i => i.product_id)).toEqual(['p2', 'p1', 'p3'])
  })

  it('soltar sobre si mesma não muda nada', () => {
    const { onDraftChange } = montar(
      secao({ title: 'x' }, [itemSalvo(1, 'p1', 'a'), itemSalvo(2, 'p2', 'b')]),
    )

    fireEvent.dragStart(screen.getByTestId('peca-escolhida-0'))
    fireEvent.drop(screen.getByTestId('peca-escolhida-0'))

    expect(rascunho(onDraftChange).items.map(i => i.product_id)).toEqual(['p1', 'p2'])
  })
})

describe('FeaturedProductsEditor — peça que saiu do ar (DST-16)', () => {
  it('peça despublicada é marcada "fora do ar", com o nome ainda legível', () => {
    montar(secao({ title: 'x' }, [itemSalvo(1, 'p4', 'Broche Pena')]))
    expect(screen.getByTestId('peca-fora-do-ar-0')).toHaveTextContent('fora do ar')
    expect(nomesDaCuradoria()).toEqual(['Broche Pena'])
  })

  it('peça APAGADA do catálogo é outra marca, e o nome vem do rótulo congelado', () => {
    // O `on delete set null` zera o `product_id`: sem o `label_snapshot` a linha seria um retângulo
    // vazio, e a dona não teria como saber o que remover.
    const orfa = { ...itemSalvo(1, 'p1', 'Peça que sumiu'), product_id: null, product_slug: null }
    montar(secao({ title: 'x' }, [orfa]))

    expect(screen.getByTestId('peca-apagada-0')).toHaveTextContent('apagada do catálogo')
    expect(nomesDaCuradoria()).toEqual(['Peça que sumiu'])
  })

  it('peça no ar NÃO ganha marca nenhuma — senão as marcas não significariam nada', () => {
    montar(secao({ title: 'x' }, [itemSalvo(1, 'p1', 'Colar de Cinzas')]))
    expect(screen.queryByTestId('peca-fora-do-ar-0')).toBeNull()
    expect(screen.queryByTestId('peca-apagada-0')).toBeNull()
  })
})

describe('FeaturedProductsEditor — as recusas vêm de `core`, e preservam o preenchido', () => {
  it('DST-07 — sem título, salvar é recusado dizendo por quê', () => {
    const { onSave } = montar(secao({}, [itemSalvo(1, 'p1', 'Colar de Cinzas')]))
    salvar()

    expect(onSave).not.toHaveBeenCalled()
    expect(recusa()).toContain('Dê um título ao bloco')
  })

  it('DST-07 — a recusa PRESERVA o que ela preencheu (HOME-14)', () => {
    const { onDraftChange } = montar(secao({}, [itemSalvo(1, 'p1', 'Colar de Cinzas')]))
    fireEvent.change(screen.getByLabelText('Descrição (opcional)'), { target: { value: 'o lote' } })
    salvar()

    expect(screen.getByLabelText('Descrição (opcional)')).toHaveValue('o lote')
    expect(nomesDaCuradoria()).toEqual(['Colar de Cinzas'])
    expect(rascunho(onDraftChange).items).toHaveLength(1)
  })

  it('DST-11 — lista vazia é recusada dizendo que o bloco não aparece', () => {
    const { onSave } = montar(secao({ title: 'Feitas à mão' }))
    salvar()

    expect(onSave).not.toHaveBeenCalled()
    expect(recusa()).toContain('Escolha ao menos uma peça')
  })

  it('DST-08 — o 13º é recusado NOMEANDO o teto e sugerindo um segundo bloco', () => {
    const treze = Array.from({ length: 13 }, (_, i) => itemSalvo(i + 1, `p${i}`, `Peça ${i}`))
    const { onSave } = montar(secao({ title: 'Feitas à mão' }, treze))
    salvar()

    expect(onSave).not.toHaveBeenCalled()
    expect(recusa()).toContain('Cabem 12 peças neste bloco, e há 13')
    expect(recusa()).toContain('segundo bloco')
  })

  it('DST-08 — a tela também AVISA do excedente antes do clique', () => {
    // A contrapartida da recusa: o estado é alcançável por escrita direta, e um estado gravado que
    // nenhuma tela mostra é como dado errado sobrevive por meses.
    const treze = Array.from({ length: 13 }, (_, i) => itemSalvo(i + 1, `p${i}`, `Peça ${i}`))
    montar(secao({ title: 'x' }, treze))
    expect(screen.getByTestId('pecas-excedentes')).toHaveTextContent('Cabem 12 peças neste bloco, e há 13')
  })

  it('DST-09 — peça repetida é recusada nomeando a posição', () => {
    const repetida = [itemSalvo(1, 'p1', 'Colar de Cinzas'), { ...itemSalvo(2, 'p1', 'Colar de Cinzas'), id: 'i2' }]
    const { onSave } = montar(secao({ title: 'Feitas à mão' }, repetida))
    salvar()

    expect(onSave).not.toHaveBeenCalled()
    expect(recusa()).toContain('2º item')
    expect(recusa()).toContain('já está no bloco')
  })

  it('item órfão é recusado, pedindo escolha ou remoção', () => {
    const orfa = { ...itemSalvo(1, 'p1', 'Peça que sumiu'), product_id: null, product_slug: null }
    const { onSave } = montar(secao({ title: 'Feitas à mão' }, [orfa]))
    salvar()

    expect(onSave).not.toHaveBeenCalled()
    expect(recusa()).toContain('1º item')
  })

  it('com título e uma peça, salvar PASSA — a recusa não é sempre verdadeira', async () => {
    // O inverso, e ele é obrigatório: sem este caso, um `refusal` que recusasse tudo passaria em
    // todas as asserções acima.
    const { onSave } = montar(secao({ title: 'Feitas à mão' }, [itemSalvo(1, 'p1', 'Colar de Cinzas')]))
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(screen.queryByTestId('editor-recusa')).toBeNull()
    expect(onSave.mock.calls[0][0].items.map((i: DraftItem) => i.product_id)).toEqual(['p1'])
  })

  it('`display` desconhecido NÃO impede a gravação (DST-10)', () => {
    // Recusar por causa de um `config` gravado por escrita direta deixaria a dona sem como
    // consertar pela tela.
    const { onSave } = montar(
      secao({ title: 'Feitas à mão', display: 'carrossel-3d' as never }, [itemSalvo(1, 'p1', 'Colar de Cinzas')]),
    )
    salvar()
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})

describe('FeaturedProductsEditor — AD-019: o editor NÃO desenha a vitrine', () => {
  it('nenhuma imagem de produto é renderizada', () => {
    const { container } = render(
      <HomeSectionEditor
        entry={
          {
            section: secao({ title: 'x' }, [itemSalvo(1, 'p1', 'Colar de Cinzas')]),
            renders: true,
            hiddenReason: null,
            items: [],
            droppedCount: 0,
            nestedUnder: null,
          } as unknown as ResolvedSection
        }
        categories={[] as unknown as readonly AdminCategory[]}
        products={PRODUTOS}
        saving={false}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('a curadoria é uma LISTA, não uma grade de miniaturas', () => {
    montar(secao({ title: 'x' }, [itemSalvo(1, 'p1', 'Colar de Cinzas')]))
    const lista = screen.getByTestId('curadoria')
    expect(lista.tagName).toBe('UL')
    expect(lista.className).not.toMatch(/grid-cols/)
  })
})
