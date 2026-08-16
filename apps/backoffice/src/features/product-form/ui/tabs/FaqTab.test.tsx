import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminFaq } from '@/features/faq-library/api/useAdminFaqs'
import type { ProductFaqSelection } from '@/features/product-form/model/planFaqLinks'

/**
 * `FAQ-16`, `FAQ-17`, `FAQ-34`, `FAQ-37` — a aba `Perguntas` do produto.
 *
 * A sugestão é dublada aqui: a **regra** dela é provada em `@estrelinha/core/faq` e a **acurácia** em
 * `faqSuggestion.test.ts`, contra o catálogo real. O que falta provar é o que a tela faz com ela.
 */

const { suggestionsMock } = vi.hoisted(() => ({ suggestionsMock: vi.fn() }))
vi.mock('@/features/product-form/api/useFaqSuggestions', () => ({
  useFaqSuggestions: suggestionsMock,
}))

import FaqTab, { FAQ_AVISO_ACIMA_DE } from './FaqTab'

const faq = (id: string, question: string, answer = `Resposta de ${id}.`): AdminFaq => ({
  id,
  question,
  answer,
  question_key: question.toLowerCase().replace(/[?]/g, ''),
  is_active: true,
  usage: 0,
})

const BIBLIOTECA = [
  faq('f1', 'O anel é ajustável?', 'Sim, dentro de dois números.'),
  faq('f2', 'Quanto tempo leva?', 'Até 25 dias.'),
  faq('f3', 'Como envio meu material?', 'Você recebe as instruções.'),
]

const sel = (faq_id: string, over: Partial<ProductFaqSelection> = {}): ProductFaqSelection => ({
  faq_id,
  answer_override: null,
  defaultAnswer: BIBLIOTECA.find(f => f.id === faq_id)?.answer ?? null,
  ...over,
})

const onChange = vi.fn()
const onCreate = vi.fn(async () => null)

const montar = (value: ProductFaqSelection[] = [], categoryIds: string[] = ['c1']) => {
  render(
    <FaqTab
      value={value}
      onChange={onChange}
      library={BIBLIOTECA}
      categoryIds={categoryIds}
      onCreate={onCreate}
    />,
  )
}

beforeEach(() => {
  onChange.mockClear()
  onCreate.mockClear()
  suggestionsMock.mockReturnValue({ suggestions: [], loading: false })
})

describe('FaqTab — a lista do produto', () => {
  it('mostra as perguntas na ordem, numeradas', () => {
    montar([sel('f2'), sel('f1')])

    expect(screen.getByTestId('faq-linha-0')).toHaveTextContent('Quanto tempo leva?')
    expect(screen.getByTestId('faq-linha-1')).toHaveTextContent('O anel é ajustável?')
  })

  it('produto sem pergunta avisa que a seção não vai aparecer na loja', () => {
    montar([])

    expect(screen.getByTestId('faq-lista-vazia')).toHaveTextContent(
      /não vai aparecer/i,
    )
  })

  it('remover tira a pergunta da lista', () => {
    montar([sel('f1'), sel('f2')])

    fireEvent.click(screen.getByRole('button', { name: 'Remover “O anel é ajustável?”' }))

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ faq_id: 'f2' })])
  })

  // Aviso, não recusa: um teto rígido recusaria dado que já existe no catálogo.
  it('acima de 8 avisa, e não impede', () => {
    montar(Array.from({ length: FAQ_AVISO_ACIMA_DE + 1 }, (_, i) => sel(`x${i}`)))

    expect(screen.getByTestId('faq-aviso-muitas')).toHaveTextContent('9 perguntas')
  })

  it('até 8 não avisa nada', () => {
    montar(Array.from({ length: FAQ_AVISO_ACIMA_DE }, (_, i) => sel(`x${i}`)))
    expect(screen.queryByTestId('faq-aviso-muitas')).toBeNull()
  })

  it('vínculo cuja entrada saiu da biblioteca não quebra a tela', () => {
    montar([sel('fantasma')])
    expect(screen.getByTestId('faq-linha-0')).toHaveTextContent('Pergunta removida da biblioteca')
  })

  it('pergunta desativada é marcada como fora da loja', () => {
    render(
      <FaqTab
        value={[sel('f1')]}
        onChange={onChange}
        library={[{ ...BIBLIOTECA[0], is_active: false }]}
        categoryIds={['c1']}
        onCreate={onCreate}
      />,
    )

    expect(screen.getByText('desativada — não aparece na loja')).toBeInTheDocument()
  })
})

describe('FaqTab — a resposta própria', () => {
  it('sem resposta própria, mostra o padrão da biblioteca', () => {
    montar([sel('f1')])

    expect(screen.getByText('Sim, dentro de dois números.')).toBeInTheDocument()
    expect(screen.queryByTestId('faq-propria-0')).toBeNull()
  })

  it('"Responder diferente" abre o campo já com o padrão dentro', () => {
    montar([sel('f1')])

    fireEvent.click(screen.getByRole('button', { name: /Responder diferente/ }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ faq_id: 'f1', answer_override: 'Sim, dentro de dois números.' }),
    ])
  })

  it('com resposta própria, marca a linha e mostra o campo', () => {
    montar([sel('f1', { answer_override: 'Esta peça é de tamanho fixo.' })])

    expect(screen.getByTestId('faq-propria-0')).toHaveTextContent('resposta própria')
    expect(
      screen.getByLabelText('Resposta desta peça para “O anel é ajustável?”'),
    ).toHaveValue('Esta peça é de tamanho fixo.')
  })

  it('digitar atualiza só aquele vínculo', () => {
    montar([sel('f1', { answer_override: 'a' }), sel('f2')])

    fireEvent.change(screen.getByLabelText('Resposta desta peça para “O anel é ajustável?”'), {
      target: { value: 'novo texto' },
    })

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ faq_id: 'f1', answer_override: 'novo texto' }),
      expect.objectContaining({ faq_id: 'f2', answer_override: null }),
    ])
  })

  it('"Voltar ao padrão" limpa a resposta própria', () => {
    montar([sel('f1', { answer_override: 'algo' })])

    fireEvent.click(screen.getByRole('button', { name: /Voltar ao padrão/ }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ faq_id: 'f1', answer_override: null }),
    ])
  })
})

describe('FaqTab — as sugestões', () => {
  it('mostra as sugeridas com o texto da biblioteca', () => {
    suggestionsMock.mockReturnValue({
      suggestions: [
        { faq_id: 'f1', score: 0.9, source: 'category' },
        { faq_id: 'f2', score: 0.6, source: 'category' },
      ],
      loading: false,
    })
    montar([])

    expect(screen.getByRole('button', { name: /O anel é ajustável\?/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Quanto tempo leva\?/ })).toBeInTheDocument()
  })

  it('clicar numa sugestão a vincula', () => {
    suggestionsMock.mockReturnValue({
      suggestions: [{ faq_id: 'f1', score: 0.9, source: 'category' }],
      loading: false,
    })
    montar([])

    fireEvent.click(screen.getByRole('button', { name: /O anel é ajustável\?/ }))

    expect(onChange).toHaveBeenCalledWith([
      { faq_id: 'f1', answer_override: null, defaultAnswer: 'Sim, dentro de dois números.' },
    ])
  })

  it('"Adicionar todas" vincula na ordem exibida', () => {
    suggestionsMock.mockReturnValue({
      suggestions: [
        { faq_id: 'f1', score: 0.9, source: 'category' },
        { faq_id: 'f3', score: 0.5, source: 'category' },
      ],
      loading: false,
    })
    montar([])

    fireEvent.click(screen.getByRole('button', { name: /Adicionar todas/ }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ faq_id: 'f1' }),
      expect.objectContaining({ faq_id: 'f3' }),
    ])
  })

  it('"Adicionar todas" preserva o que o produto já tinha', () => {
    suggestionsMock.mockReturnValue({
      suggestions: [{ faq_id: 'f3', score: 0.5, source: 'category' }],
      loading: false,
    })
    montar([sel('f1')])

    fireEvent.click(screen.getByRole('button', { name: /Adicionar todas/ }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ faq_id: 'f1' }),
      expect.objectContaining({ faq_id: 'f3' }),
    ])
  })

  it('sem sugestão, diz por quê em vez de mostrar bloco vazio', () => {
    montar([])
    expect(screen.getByTestId('faq-sem-sugestao')).toBeInTheDocument()
  })
})

describe('FaqTab — buscar e criar', () => {
  it('a busca só mostra o que ainda não está no produto', () => {
    montar([sel('f1')])

    fireEvent.change(screen.getByLabelText('Buscar pergunta na biblioteca'), {
      target: { value: 'a' },
    })

    // Escopado ao bloco de resultados: o texto da pergunta também aparece na linha já vinculada e no
    // rótulo do botão de remover dela, e uma busca global casaria com os dois.
    const resultados = screen.getByTestId('faq-busca-resultados')
    expect(resultados).not.toHaveTextContent('O anel é ajustável?')
    expect(resultados).toHaveTextContent('Como envio meu material?')
  })

  it('clicar num resultado o vincula', () => {
    montar([])

    fireEvent.change(screen.getByLabelText('Buscar pergunta na biblioteca'), {
      target: { value: 'quanto tempo' },
    })
    fireEvent.click(screen.getByText('Quanto tempo leva?'))

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ faq_id: 'f2' })])
  })

  it('busca sem resultado convida a criar', () => {
    montar([])

    fireEvent.change(screen.getByLabelText('Buscar pergunta na biblioteca'), {
      target: { value: 'zzzz' },
    })

    expect(screen.getByTestId('faq-busca-vazia')).toHaveTextContent('Crie uma nova.')
  })

  it('"Criar pergunta" abre o editor sem sair da aba', () => {
    montar([])

    fireEvent.click(screen.getByRole('button', { name: /Criar pergunta/ }))
    expect(screen.getByRole('heading', { name: 'Nova pergunta' })).toBeInTheDocument()
  })
})

describe('FaqTab — reordenar por arrasto', () => {
  it('soltar uma linha sobre outra troca a ordem', () => {
    montar([sel('f1'), sel('f2'), sel('f3')])

    fireEvent.dragStart(screen.getByTestId('faq-linha-2'))
    fireEvent.drop(screen.getByTestId('faq-linha-0'))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ faq_id: 'f3' }),
      expect.objectContaining({ faq_id: 'f1' }),
      expect.objectContaining({ faq_id: 'f2' }),
    ])
  })

  it('soltar sobre si mesma não muda nada', () => {
    montar([sel('f1'), sel('f2')])

    fireEvent.dragStart(screen.getByTestId('faq-linha-0'))
    fireEvent.drop(screen.getByTestId('faq-linha-0'))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('as linhas são arrastáveis', () => {
    montar([sel('f1')])
    expect(screen.getByTestId('faq-linha-0')).toHaveAttribute('draggable', 'true')
  })
})
