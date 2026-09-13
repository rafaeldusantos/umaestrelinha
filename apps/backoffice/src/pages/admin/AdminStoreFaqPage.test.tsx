import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { AdminFaqPageItem } from '@/features/faq-page/api/useAdminFaqPage'

/**
 * `FAQL-19`..`FAQL-25` — a tela de curadoria da página de perguntas.
 *
 * ⚠️ **Todo caso renderiza a PÁGINA REAL.** Montar o grupo e o diálogo lado a lado dentro do teste
 * provaria que os componentes funcionam e **não** que a página os monta — o achado nº 1 da
 * verificação da 44, e o mesmo que deixou `deleteSection` uma feature inteira exportada sem
 * consumidor na 41.
 */

const { useAdminFaqPageMock, useAdminFaqsMock } = vi.hoisted(() => ({
  useAdminFaqPageMock: vi.fn(),
  useAdminFaqsMock: vi.fn(),
}))

vi.mock('@/features/faq-page/api/useAdminFaqPage', () => ({
  useAdminFaqPage: useAdminFaqPageMock,
}))
vi.mock('@/features/faq-library/api/useAdminFaqs', () => ({ useAdminFaqs: useAdminFaqsMock }))

import AdminStoreFaqPage from './AdminStoreFaqPage'

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
  item({ faq_id: 'a', usage: 12 }),
  item({ faq_id: 'b', position: 1 }),
  item({ faq_id: 'c', category: 'cuidados', is_active: false }),
]

const comEstado = (over: Record<string, unknown> = {}) => {
  const acoes = {
    adicionar: vi.fn().mockResolvedValue(null),
    criarEAdicionar: vi.fn().mockResolvedValue(null),
    remover: vi.fn().mockResolvedValue(null),
    reordenar: vi.fn().mockResolvedValue(null),
    moverDeAssunto: vi.fn().mockResolvedValue(null),
    refetch: vi.fn(),
  }
  useAdminFaqPageMock.mockReturnValue({
    items: ITENS,
    loading: false,
    error: null,
    ...acoes,
    ...over,
  })
  return acoes
}

beforeEach(() => {
  useAdminFaqPageMock.mockReset()
  useAdminFaqsMock.mockReset()
  useAdminFaqsMock.mockReturnValue({ faqs: [], create: vi.fn() })
})

describe('AdminStoreFaqPage — os três estados', () => {
  it('carregando mostra o esqueleto, e não o estado vazio', () => {
    comEstado({ loading: true, items: [] })
    render(<AdminStoreFaqPage />)

    expect(screen.queryByText('A página de perguntas está vazia.')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // Vazio e ilegível não são o mesmo estado (AD-014).
  it('falha de leitura mostra o motivo e o "tentar de novo", nunca o vazio', () => {
    const acoes = comEstado({ error: 'connection refused', items: [] })
    render(<AdminStoreFaqPage />)

    expect(screen.getByText('Não foi possível ler a página de perguntas.')).toBeInTheDocument()
    expect(screen.getByText('connection refused')).toBeInTheDocument()
    expect(screen.queryByText('A página de perguntas está vazia.')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(acoes.refetch).toHaveBeenCalled()
  })

  it('página vazia sem erro explica o que fazer', () => {
    comEstado({ items: [] })
    render(<AdminStoreFaqPage />)

    expect(screen.getByText('A página de perguntas está vazia.')).toBeInTheDocument()
    expect(screen.queryByText('connection refused')).toBeNull()
  })
})

describe('AdminStoreFaqPage — a curadoria', () => {
  it('agrupa por assunto, na ordem da página', () => {
    comEstado()
    render(<AdminStoreFaqPage />)

    const titulos = screen.getAllByRole('button', { name: /Recolher/ }).map(b => b.textContent)
    expect(titulos[0]).toContain('Sobre as joias e a Uma Estrelinha')
    expect(titulos[1]).toContain('Cuidados com a joia')
  })

  it('conta o que está na página, o que está publicado e o que saiu do ar', () => {
    comEstado()
    render(<AdminStoreFaqPage />)

    expect(screen.getByText(/3 perguntas na página · 2 publicadas · 1 fora do ar/)).toBeInTheDocument()
  })

  // ⚠️ A fiação: é a PÁGINA que monta o diálogo. Sem este caso, apagar `<AddQuestionDialog />` daqui
  // deixaria o componente testado e o botão sem efeito nenhum.
  it('a página monta o diálogo, e o botão o abre', () => {
    comEstado()
    render(<AdminStoreFaqPage />)

    expect(screen.queryByText('Adicionar pergunta à página')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Adicionar pergunta/ }))
    expect(screen.getByText('Adicionar pergunta à página')).toBeInTheDocument()
  })

  it('a página monta os grupos, e remover chama o gravador com a pergunta certa', () => {
    const acoes = comEstado()
    render(<AdminStoreFaqPage />)

    fireEvent.click(screen.getByLabelText('Tirar “Pergunta a?” da página'))
    expect(acoes.remover).toHaveBeenCalledWith('a')
  })

  it('"Ver na loja" abre /perguntas-frequentes em outra aba', () => {
    comEstado()
    render(<AdminStoreFaqPage />)
    const link = screen.getByRole('link', { name: /Ver na loja/ })

    expect(link).toHaveAttribute('href', '/perguntas-frequentes')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('a busca filtra as linhas sem mexer na contagem do cabeçalho', () => {
    comEstado()
    render(<AdminStoreFaqPage />)
    fireEvent.change(screen.getByLabelText('Buscar pergunta ou resposta'), {
      target: { value: 'Pergunta b' },
    })

    expect(screen.getByText('Pergunta b?')).toBeInTheDocument()
    expect(screen.queryByText('Pergunta a?')).toBeNull()
    // O cabeçalho conta a PÁGINA, não o resultado da busca — são duas perguntas diferentes.
    expect(screen.getByText(/3 perguntas na página/)).toBeInTheDocument()
  })

  // O literal é a peça mais importante da tela: sem ele a Adri editaria uma resposta sem saber que
  // ela alcança as páginas de produto.
  it('avisa que a resposta é a mesma nos dois lugares', () => {
    comEstado()
    render(<AdminStoreFaqPage />)

    expect(screen.getByText('A resposta é a mesma nos dois lugares.')).toBeInTheDocument()
    expect(
      screen.getByText(/também aparece na página daquelas peças/),
    ).toBeInTheDocument()
  })

  it('o aviso de erro de escrita aparece na tela', async () => {
    const acoes = comEstado()
    acoes.remover.mockResolvedValue('A pergunta saiu da biblioteca. Recarregue.')
    render(<AdminStoreFaqPage />)

    fireEvent.click(screen.getByLabelText('Tirar “Pergunta a?” da página'))
    expect(await screen.findByRole('alert')).toHaveTextContent('A pergunta saiu da biblioteca')
  })
})
