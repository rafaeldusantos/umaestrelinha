import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FaqEditorDialog from './FaqEditorDialog'

/**
 * `FAQ-12`, `FAQ-18` — o editor da biblioteca.
 *
 * A régua da recusa é `faqRefusal`, a mesma do hook e do `check` da migration. O que este arquivo
 * prova é que a tela **barra antes** de chamar o banco — para a dona não perder o texto — e que a
 * recusa que vem do banco chega à tela em vez de sumir.
 */

const abrir = (props: Partial<React.ComponentProps<typeof FaqEditorDialog>> = {}) => {
  const onSave = props.onSave ?? vi.fn(async () => null)
  const onClose = props.onClose ?? vi.fn()
  render(
    <FaqEditorDialog open onClose={onClose} onSave={onSave} draft={props.draft} />,
  )
  return { onSave, onClose }
}

const pergunta = () => screen.getByLabelText('Pergunta') as HTMLInputElement
const resposta = () => screen.getByLabelText('Resposta') as HTMLTextAreaElement

describe('FaqEditorDialog — criar', () => {
  it('abre vazio e com o título de criação', () => {
    abrir()

    expect(screen.getByRole('heading', { name: 'Nova pergunta' })).toBeInTheDocument()
    expect(pergunta().value).toBe('')
    expect(resposta().value).toBe('')
  })

  it('grava o par digitado', async () => {
    const { onSave } = abrir()

    fireEvent.change(pergunta(), { target: { value: 'O anel é ajustável?' } })
    fireEvent.change(resposta(), { target: { value: 'Sim, dentro de dois números.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar pergunta' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('O anel é ajustável?', 'Sim, dentro de dois números.'),
    )
  })

  it('fecha depois de gravar', async () => {
    const { onClose } = abrir()

    fireEvent.change(pergunta(), { target: { value: 'P?' } })
    fireEvent.change(resposta(), { target: { value: 'R.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar pergunta' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})

describe('FaqEditorDialog — editar', () => {
  it('abre preenchido e com o título de edição', () => {
    abrir({ draft: { id: 'f1', question: 'P?', answer: 'R.' } })

    expect(screen.getByRole('heading', { name: 'Editar pergunta' })).toBeInTheDocument()
    expect(pergunta().value).toBe('P?')
    expect(resposta().value).toBe('R.')
  })

  it('avisa que a edição alcança quem usa o padrão, e não quem tem resposta própria', () => {
    abrir({ draft: { id: 'f1', question: 'P?', answer: 'R.' } })

    expect(screen.getByText(/resposta própria não é alterado/i)).toBeInTheDocument()
  })
})

describe('FaqEditorDialog — a recusa', () => {
  it('pergunta vazia é barrada ANTES do banco', async () => {
    const { onSave } = abrir()

    fireEvent.change(resposta(), { target: { value: 'R.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar pergunta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A pergunta não pode ficar vazia.')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('resposta vazia é barrada ANTES do banco', async () => {
    const { onSave } = abrir()

    fireEvent.change(pergunta(), { target: { value: 'P?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar pergunta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A resposta não pode ficar vazia.')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('pergunta acima de 160 é barrada com o tamanho', async () => {
    const { onSave } = abrir()

    fireEvent.change(pergunta(), { target: { value: 'a'.repeat(161) } })
    fireEvent.change(resposta(), { target: { value: 'R.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar pergunta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A pergunta tem 161 caracteres e o limite é 160.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('a recusa que vem do banco aparece na tela e o diálogo NÃO fecha', async () => {
    const onSave = vi.fn(async () => 'Esta pergunta já existe na biblioteca — procure por ela.')
    const onClose = vi.fn()
    render(<FaqEditorDialog open onClose={onClose} onSave={onSave} />)

    fireEvent.change(pergunta(), { target: { value: 'P?' } })
    fireEvent.change(resposta(), { target: { value: 'R.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar pergunta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('já existe na biblioteca')
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('FaqEditorDialog — os contadores', () => {
  it('mostram o limite de cada campo', () => {
    abrir()

    expect(screen.getByTestId('faq-question-counter')).toHaveTextContent('0 / 160')
    expect(screen.getByTestId('faq-answer-counter')).toHaveTextContent('0 / 600')
  })

  it('contam o texto já normalizado, como o limite mede', () => {
    abrir()

    fireEvent.change(pergunta(), { target: { value: '  abc  ' } })
    expect(screen.getByTestId('faq-question-counter')).toHaveTextContent('3 / 160')
  })
})

describe('FaqEditorDialog — a resposta é texto', () => {
  // Medido: zero das 3.476 respostas do catálogo usa tag. Um editor rico abriria na resposta a mesma
  // superfície que a descrição paga um sanitizador inteiro para conter.
  it('o campo de resposta é um `<textarea>`, não um editor rico', () => {
    abrir()
    expect(resposta().tagName).toBe('TEXTAREA')
  })
})
