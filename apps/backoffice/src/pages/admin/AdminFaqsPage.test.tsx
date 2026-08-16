import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminFaq } from '@/features/faq-library/api/useAdminFaqs'

/**
 * `/admin/perguntas` — `FAQ-14`, `FAQ-15`.
 *
 * A coluna **"em N produtos"** é o que dá sentido à tela: editar uma resposta sem ela é decisão às
 * cegas — a diferença entre mexer em 3 páginas e mexer em 483.
 */

const { useAdminFaqsMock, useAdminCategoriesMock } = vi.hoisted(() => ({
  useAdminFaqsMock: vi.fn(),
  useAdminCategoriesMock: vi.fn(),
}))

vi.mock('@/features/faq-library/api/useAdminFaqs', () => ({ useAdminFaqs: useAdminFaqsMock }))
vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: useAdminCategoriesMock,
}))
// O diálogo do lote consulta o Supabase ao abrir; aqui o que se mede é a listagem.
vi.mock('@/features/faq-library/ui/ApplyToCategoryDialog', () => ({
  default: ({ open, faqQuestion }: { open: boolean; faqQuestion: string }) =>
    open ? <div data-testid="lote">lote:{faqQuestion}</div> : null,
}))

import AdminFaqsPage from './AdminFaqsPage'

const faq = (over: Partial<AdminFaq> = {}): AdminFaq => ({
  id: 'f1',
  question: 'O anel é ajustável?',
  answer: 'Sim, dentro de dois números.',
  question_key: 'o anel e ajustavel',
  is_active: true,
  usage: 47,
  ...over,
})

const toggle = vi.fn(async () => null)
const remove = vi.fn(async () => null)
const create = vi.fn(async () => null)
const update = vi.fn(async () => null)

const montar = (over: Record<string, unknown> = {}) => {
  useAdminFaqsMock.mockReturnValue({
    faqs: [faq()],
    loading: false,
    error: null,
    refetch: vi.fn(),
    create,
    update,
    toggle,
    remove,
    ...over,
  })
  useAdminCategoriesMock.mockReturnValue({ categories: [] })
  return render(<AdminFaqsPage />)
}

beforeEach(() => {
  toggle.mockClear()
  remove.mockClear().mockResolvedValue(null)
  create.mockClear()
  update.mockClear()
})

describe('AdminFaqsPage — a listagem', () => {
  it('mostra a pergunta e o começo da resposta', () => {
    montar()

    expect(screen.getByText('O anel é ajustável?')).toBeInTheDocument()
    expect(screen.getByText('Sim, dentro de dois números.')).toBeInTheDocument()
  })

  it('mostra em quantos produtos a pergunta está', () => {
    montar()
    expect(screen.getByText('47')).toBeInTheDocument()
  })

  it('entrada sem uso diz "nenhum", e não zero solto', () => {
    montar({ faqs: [faq({ usage: 0 })] })
    expect(screen.getByText('nenhum')).toBeInTheDocument()
  })

  it('o interruptor reflete o estado e liga/desliga mandando só o valor', () => {
    montar()

    const chave = screen.getByRole('switch', { name: /Desativar/ })
    expect(chave).toBeChecked()

    fireEvent.click(chave)
    expect(toggle).toHaveBeenCalledWith('f1', false)
  })
})

describe('AdminFaqsPage — os estados vazios', () => {
  it('biblioteca vazia explica de onde as perguntas vêm', () => {
    montar({ faqs: [] })

    expect(screen.getByText('A biblioteca está vazia.')).toBeInTheDocument()
    expect(screen.getByText(/importador do catálogo/i)).toBeInTheDocument()
  })

  // "Vazio" e "quebrado" não são o mesmo estado — a tela de Coleções passou meses confundindo os
  // dois sobre uma tabela que nunca existiu (`AD-014`).
  it('falha de leitura NÃO se disfarça de biblioteca vazia', () => {
    montar({ error: 'relation "faqs" does not exist' })

    expect(screen.getByText('Não foi possível ler a biblioteca.')).toBeInTheDocument()
    expect(screen.getByText('relation "faqs" does not exist')).toBeInTheDocument()
    expect(screen.queryByText('A biblioteca está vazia.')).toBeNull()
  })
})

describe('AdminFaqsPage — a busca', () => {
  it('filtra por pergunta, ignorando acento e caixa', () => {
    montar({ faqs: [faq(), faq({ id: 'f2', question: 'Quanto tempo leva?', question_key: 'quanto tempo leva' })] })

    fireEvent.change(screen.getByLabelText('Buscar pergunta ou resposta'), {
      target: { value: 'AJUSTAVEL' },
    })

    expect(screen.getByText('O anel é ajustável?')).toBeInTheDocument()
    expect(screen.queryByText('Quanto tempo leva?')).toBeNull()
  })

  it('busca também na resposta', () => {
    montar({ faqs: [faq(), faq({ id: 'f2', question: 'Outra?', answer: 'Prazo de 25 dias.', question_key: 'outra' })] })

    fireEvent.change(screen.getByLabelText('Buscar pergunta ou resposta'), {
      target: { value: 'prazo' },
    })

    expect(screen.getByText('Outra?')).toBeInTheDocument()
    expect(screen.queryByText('O anel é ajustável?')).toBeNull()
  })

  it('busca sem resultado diz isso, e não "biblioteca vazia"', () => {
    montar()

    fireEvent.change(screen.getByLabelText('Buscar pergunta ou resposta'), {
      target: { value: 'zzz' },
    })

    expect(screen.getByText('Nenhuma pergunta com esse texto.')).toBeInTheDocument()
  })
})

describe('AdminFaqsPage — apagar', () => {
  it('a recusa de apagar aparece na tela', async () => {
    remove.mockResolvedValue(
      'Esta pergunta está em uso e não pode ser apagada. Ela está em 47 produto(s). Desative-a.',
    )
    montar()

    fireEvent.click(screen.getByRole('button', { name: /Apagar/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('47 produto(s)')
    expect(await screen.findByRole('alert')).toHaveTextContent('Desative')
  })
})

describe('AdminFaqsPage — os diálogos', () => {
  it('"Nova pergunta" abre o editor vazio', () => {
    montar()

    fireEvent.click(screen.getByRole('button', { name: /Nova pergunta/ }))

    expect(screen.getByRole('heading', { name: 'Nova pergunta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Pergunta')).toHaveValue('')
  })

  it('editar abre o editor preenchido', () => {
    montar()

    fireEvent.click(screen.getByRole('button', { name: /Editar/ }))

    expect(screen.getByRole('heading', { name: 'Editar pergunta' })).toBeInTheDocument()
    expect(screen.getByLabelText('Pergunta')).toHaveValue('O anel é ajustável?')
  })

  it('o lote abre com a pergunta escolhida', () => {
    montar()

    fireEvent.click(screen.getByRole('button', { name: /Aplicar .* a uma categoria/ }))

    expect(screen.getByTestId('lote')).toHaveTextContent('lote:O anel é ajustável?')
  })
})
