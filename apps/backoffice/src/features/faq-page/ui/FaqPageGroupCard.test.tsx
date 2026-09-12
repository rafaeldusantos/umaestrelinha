import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import FaqPageGroupCard from './FaqPageGroupCard'
import type { AdminFaqPageItem } from '../api/useAdminFaqPage'

/**
 * `FAQL-20`, `FAQL-22`, `FAQL-23` — o grupo, a linha e o arraste.
 *
 * O arraste é o HTML5 nativo, como `HomeSectionRow` e `CategoryTable` já fazem. O que se assere aqui
 * é o **resultado**: a ordem que chega ao `onReordenar`, não a chamada.
 */

const item = (over: Partial<AdminFaqPageItem> & { faq_id: string }): AdminFaqPageItem => ({
  category: 'sobre',
  position: 0,
  answer_override: null,
  question: `Pergunta ${over.faq_id}?`,
  answer: 'A resposta padrão.',
  is_active: true,
  usage: 0,
  ...over,
})

const ITENS = [
  item({ faq_id: 'a', position: 0, usage: 12 }),
  item({ faq_id: 'b', position: 1 }),
  item({ faq_id: 'c', position: 2 }),
]

const desenhar = (over: Partial<Parameters<typeof FaqPageGroupCard>[0]> = {}) => {
  const props = {
    label: 'Sobre as joias e a Uma Estrelinha',
    items: ITENS,
    onEditar: vi.fn(),
    onRemover: vi.fn(),
    onReordenar: vi.fn(),
    onMoverParaCa: vi.fn(),
    ...over,
  }
  render(<FaqPageGroupCard {...props} />)
  return props
}

/** Arrasta `origem` e solta sobre `alvo`, como o navegador faz. */
const arrastar = (origem: string, alvo: string) => {
  const dados = new Map<string, string>()
  const dataTransfer = {
    setData: (k: string, v: string) => dados.set(k, v),
    getData: (k: string) => dados.get(k) ?? '',
  }
  const linha = (id: string) => document.querySelector(`[data-faq-id="${id}"]`)!

  fireEvent.dragStart(linha(origem), { dataTransfer })
  fireEvent.drop(linha(alvo), { dataTransfer })
}

describe('FaqPageGroupCard', () => {
  it('mostra o rótulo e a contagem do assunto', () => {
    desenhar()

    expect(screen.getByText('Sobre as joias e a Uma Estrelinha')).toBeInTheDocument()
    expect(screen.getByText('3 perguntas')).toBeInTheDocument()
  })

  it('colapsa e volta', () => {
    desenhar()
    const botao = screen.getByRole('button', { name: /Recolher/ })

    expect(screen.getByText('Pergunta a?')).toBeInTheDocument()
    fireEvent.click(botao)
    expect(screen.queryByText('Pergunta a?')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Abrir/ }))
    expect(screen.getByText('Pergunta a?')).toBeInTheDocument()
  })

  // ⚠️ O RESULTADO do arraste, não a chamada: a ordem que chega ao gravador.
  it('soltar a terceira sobre a primeira grava a ordem nova', () => {
    const props = desenhar()
    arrastar('c', 'a')

    expect(props.onReordenar).toHaveBeenCalledWith(['c', 'a', 'b'])
  })

  // ⚠️ As duas direções, e o par é o ponto: o gesto tem de se comportar igual arrastando para cima
  // e para baixo. A primeira escrita removia a origem antes de medir o índice do alvo, e o item
  // largado caía uma casa acima do lugar em que foi solto — só descendo.
  it('soltar a primeira sobre a última grava a ordem nova', () => {
    const props = desenhar()
    arrastar('a', 'c')

    expect(props.onReordenar).toHaveBeenCalledWith(['b', 'c', 'a'])
  })

  it('o item largado fica NO LUGAR do alvo, nas duas direções', () => {
    const props = desenhar()

    arrastar('a', 'b')
    expect(props.onReordenar).toHaveBeenLastCalledWith(['b', 'a', 'c'])

    arrastar('c', 'b')
    expect(props.onReordenar).toHaveBeenLastCalledWith(['a', 'c', 'b'])
  })

  it('soltar sobre a própria linha não grava nada', () => {
    const props = desenhar()
    arrastar('b', 'b')

    expect(props.onReordenar).not.toHaveBeenCalled()
  })

  it('linha vinda de OUTRO assunto chama mover, não reordenar', () => {
    const props = desenhar()
    const dados = new Map([['text/plain', 'de-fora']])
    fireEvent.drop(document.querySelector('[data-faq-id="a"]')!.parentElement!, {
      dataTransfer: { getData: (k: string) => dados.get(k) ?? '', setData: () => {} },
    })

    expect(props.onMoverParaCa).toHaveBeenCalledWith('de-fora')
    expect(props.onReordenar).not.toHaveBeenCalled()
  })

  it('a dica de arraste some quando há uma pergunta só', () => {
    desenhar({ items: [ITENS[0]] })
    expect(screen.queryByText('Arraste para mudar a ordem na página')).toBeNull()
  })
})

describe('FaqPageRow — dentro do grupo', () => {
  it('mostra "em N produtos" quando a pergunta é usada', () => {
    desenhar()
    expect(screen.getByText('em 12 produtos')).toBeInTheDocument()
  })

  // Divergência declarada do artboard: selo dizendo "zero" é ruído em 26 linhas.
  it('NÃO mostra selo nenhum quando a pergunta é só da página', () => {
    desenhar()
    const linha = document.querySelector('[data-faq-id="b"]')!
    expect(within(linha as HTMLElement).queryByText(/em \d+ produto/)).toBeNull()
  })

  // O literal é asserido porque ele é a metade da AC que explica o EFEITO — sem ele, o selo "fora
  // do ar" não diz o que está acontecendo com a cliente.
  it('entrada inativa mostra o selo e a frase que explica o efeito', () => {
    desenhar({ items: [item({ faq_id: 'z', is_active: false, question: 'Fora?' })] })

    expect(screen.getByText('Fora do ar')).toBeInTheDocument()
    expect(
      screen.getByText('Desativada na biblioteca — não aparece nesta página nem em nenhum produto.'),
    ).toBeInTheDocument()
  })

  it('o texto próprio da página é mostrado como tal', () => {
    desenhar({ items: [item({ faq_id: 'z', answer_override: 'A versão longa.' })] })
    expect(screen.getByText(/Texto próprio desta página: A versão longa\./)).toBeInTheDocument()
  })

  it('as ações nomeiam a pergunta, e "tirar da página" não diz apagar', () => {
    const props = desenhar()

    fireEvent.click(screen.getByLabelText('Tirar “Pergunta a?” da página'))
    expect(props.onRemover).toHaveBeenCalledWith(expect.objectContaining({ faq_id: 'a' }))

    fireEvent.click(screen.getByLabelText('Editar “Pergunta b?”'))
    expect(props.onEditar).toHaveBeenCalledWith(expect.objectContaining({ faq_id: 'b' }))
  })
})
