import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AddQuestionDialog from './AddQuestionDialog'
import type { AdminFaq } from '@/features/faq-library/api/useAdminFaqs'

/**
 * `FAQL-18`, `FAQL-19` — as duas portas, e a recusa que mantém o corpus único.
 *
 * O caso central é o da duplicata: ela é recusada **antes de qualquer escrita**, e o teste prova
 * isso pela **ausência de chamada** ao gravador, não pelo texto do aviso. Um aviso de erro com a
 * escrita acontecendo atrás deixaria a segunda cópia gravada — e é exatamente o defeito que
 * `freeShippingRefusal` já registrou nesta base.
 */

const entrada = (over: Partial<AdminFaq> & { id: string; question: string }): AdminFaq => ({
  answer: 'Uma resposta.',
  question_key: over.question.toLowerCase().replace(/[?!.]+$/, ''),
  is_active: true,
  usage: 0,
  ...over,
})

const BIBLIOTECA: AdminFaq[] = [
  entrada({ id: 'f1', question: 'Quanto tempo demora para minha joia ficar pronta', usage: 48 }),
  entrada({ id: 'f2', question: 'Qual o prazo de entrega depois de pronta', usage: 12 }),
  entrada({ id: 'f3', question: 'Como devo limpar minha joia afetiva' }),
]

const desenhar = (over: Partial<Parameters<typeof AddQuestionDialog>[0]> = {}) => {
  const props = {
    open: true,
    biblioteca: BIBLIOTECA,
    jaNaPagina: [] as string[],
    onClose: vi.fn(),
    onEscolher: vi.fn().mockResolvedValue(null),
    onCriar: vi.fn().mockResolvedValue(null),
    ...over,
  }
  render(<AddQuestionDialog {...props} />)
  return props
}

const irParaNova = () => fireEvent.click(screen.getByRole('tab', { name: 'Escrever uma nova' }))

describe('AddQuestionDialog — da biblioteca', () => {
  it('abre na aba da biblioteca, que é o caminho de reuso', () => {
    desenhar()
    expect(screen.getByRole('tab', { name: 'Da biblioteca' })).toHaveAttribute('aria-selected', 'true')
  })

  it('mostra onde cada entrada já é usada', () => {
    desenhar()
    expect(screen.getByText('em 48 produtos')).toBeInTheDocument()
    expect(screen.getByText('em 12 produtos')).toBeInTheDocument()
  })

  it('busca filtra por pergunta e por resposta, sem acento e sem caixa', () => {
    desenhar()
    fireEvent.change(screen.getByLabelText('Buscar na biblioteca'), { target: { value: 'PRAZO' } })

    expect(screen.getByText('Qual o prazo de entrega depois de pronta')).toBeInTheDocument()
    expect(screen.queryByText('Como devo limpar minha joia afetiva')).toBeNull()
  })

  it('não oferece o que já está na página', () => {
    desenhar({ jaNaPagina: ['f1'] })
    expect(screen.queryByText('Quanto tempo demora para minha joia ficar pronta')).toBeNull()
    expect(screen.getByText('2 na biblioteca')).toBeInTheDocument()
  })

  it('escolhe várias e manda com o assunto', async () => {
    const props = desenhar()
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    fireEvent.click(screen.getAllByRole('checkbox')[2])
    fireEvent.change(screen.getByLabelText('Assunto na página'), { target: { value: 'cuidados' } })
    fireEvent.click(screen.getByRole('button', { name: /Adicionar 2 perguntas/ }))

    await waitFor(() => expect(props.onEscolher).toHaveBeenCalledWith(['f1', 'f3'], 'cuidados'))
  })

  it('o botão conta o que foi escolhido', () => {
    desenhar()
    expect(screen.getByRole('button', { name: 'Adicionar 0 perguntas' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    expect(screen.getByRole('button', { name: 'Adicionar 1 pergunta' })).toBeInTheDocument()
  })
})

describe('AddQuestionDialog — escrever uma nova', () => {
  // ⚠️ Provado pela AUSÊNCIA de chamada. Um aviso com a escrita acontecendo atrás deixaria a
  // segunda cópia da mesma pergunta gravada na biblioteca.
  it('pergunta duplicada é recusada ANTES de gravar, nomeando a que já existe', async () => {
    const props = desenhar()
    irParaNova()

    fireEvent.change(screen.getByLabelText('Pergunta'), {
      target: { value: 'Quanto tempo demora para minha joia ficar pronta?' },
    })
    fireEvent.change(screen.getByLabelText('Resposta'), { target: { value: 'Cerca de 15 dias.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar e adicionar' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /já existe na biblioteca como “Quanto tempo demora para minha joia ficar pronta”/,
      ),
    )
    expect(props.onCriar).not.toHaveBeenCalled()
  })

  it('a recusa aponta o caminho certo — a aba da biblioteca', async () => {
    desenhar()
    irParaNova()
    fireEvent.change(screen.getByLabelText('Pergunta'), {
      target: { value: 'quanto tempo demora para minha joia ficar pronta' },
    })
    fireEvent.change(screen.getByLabelText('Resposta'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar e adicionar' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('pela aba "Da biblioteca"'),
    )
  })

  it('pergunta ou resposta vazia é recusada, sem gravar', async () => {
    const props = desenhar()
    irParaNova()
    fireEvent.click(screen.getByRole('button', { name: 'Criar e adicionar' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(props.onCriar).not.toHaveBeenCalled()
  })

  it('pergunta nova de verdade é criada com o assunto escolhido', async () => {
    const props = desenhar()
    irParaNova()
    fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'Vocês fazem em ouro?' } })
    fireEvent.change(screen.getByLabelText('Resposta'), { target: { value: 'Sim, sob encomenda.' } })
    fireEvent.change(screen.getByLabelText('Assunto na página'), {
      target: { value: 'materiais-e-acabamentos' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Criar e adicionar' }))

    await waitFor(() =>
      expect(props.onCriar).toHaveBeenCalledWith(
        'Vocês fazem em ouro?',
        'Sim, sob encomenda.',
        'materiais-e-acabamentos',
      ),
    )
  })

  it('a tela explica o formato do texto puro', () => {
    desenhar()
    irParaNova()
    expect(
      screen.getByText(/Linha em branco separa parágrafo; linha começando com “- ” vira item/),
    ).toBeInTheDocument()
  })
})
