import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { FaqPageGroup } from '@estrelinha/core/faq'

/**
 * `FAQL-01`, `FAQL-05`, `FAQL-08`..`FAQL-15` — a página de perguntas.
 *
 * ⚠️ **Todo caso aqui renderiza a PÁGINA REAL.** Montar `FaqQuestion` e `PolicyContact` lado a lado
 * dentro do teste provaria que os componentes funcionam e **não** que a página os monta — foi
 * exatamente esse o achado nº 1 da verificação da feature 44, onde apagar a gaveta da página deixava
 * 2828 testes verdes.
 */

const { useFaqPageMock, useGeneralSettingsMock } = vi.hoisted(() => ({
  useFaqPageMock: vi.fn(),
  useGeneralSettingsMock: vi.fn(),
}))

vi.mock('@/entities/faq/api/useFaqPage', () => ({ useFaqPage: useFaqPageMock }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: useGeneralSettingsMock,
}))

import FaqPage from '../FaqPage'

const GRUPOS: FaqPageGroup[] = [
  {
    category: 'sobre',
    label: 'Sobre as joias e a Uma Estrelinha',
    items: [
      { id: 'a1', question: 'O que são joias afetivas?', answer: 'São peças que eternizam histórias.', overridden: false },
      { id: 'a2', question: 'Não uso joias. Posso fazer outra peça?', answer: 'Claro, pirâmides e decorativas.', overridden: false },
    ],
  },
  {
    category: 'envio-do-material',
    label: 'Envio do material',
    items: [
      { id: 'b1', question: 'Como devo enviar o material?', answer: 'Carta Registrada, PAC ou SEDEX. Em Porto Alegre, motoboy.', overridden: false },
    ],
  },
]

const comEstado = (estado: Record<string, unknown>) =>
  useFaqPageMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...estado,
  })

/** A família inteira de pictogramas, por propriedade Unicode — não por faixa escrita à mão. */
const EMOJI = /\p{Extended_Pictographic}/u

const desenhar = () => render(<FaqPage />, { wrapper: MemoryRouter })

const jsonLd = () =>
  document.head.querySelector('script[type="application/ld+json"][data-owner="estrelinha-spa"]')

beforeEach(() => {
  useFaqPageMock.mockReset()
  useGeneralSettingsMock.mockReturnValue({
    whatsapp: '51999998888',
    email: 'contato@umaestrelinha.com.br',
    store_name: 'Uma Estrelinha',
  })
  jsonLd()?.remove()
})

describe('FaqPage — os três estados', () => {
  it('carregando: diz que está carregando, e NÃO diz que não há perguntas', () => {
    comEstado({ isLoading: true })
    desenhar()

    expect(screen.getByText('Carregando as perguntas…')).toBeInTheDocument()
    expect(screen.queryByText('Ainda não há perguntas publicadas.')).toBeNull()
  })

  // Vazio e ilegível não são o mesmo estado — a distinção que AD-014 e o BUG-20260809 custaram.
  it('falha de leitura: faixa de erro com "tentar de novo", nunca estado vazio', () => {
    comEstado({ error: new Error('connection refused') })
    desenhar()

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar as perguntas.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByText('Ainda não há perguntas publicadas.')).toBeNull()
  })

  it('o botão de erro chama refetch', () => {
    const refetch = vi.fn()
    comEstado({ error: new Error('x'), refetch })
    desenhar()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('lista vazia sem erro: diz que ainda não há perguntas, e oferece o contato', () => {
    comEstado({ data: [] })
    desenhar()

    expect(screen.getByText('Ainda não há perguntas publicadas.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Falar no WhatsApp' })).toBeInTheDocument()
  })
})

describe('FaqPage — o conteúdo', () => {
  beforeEach(() => comEstado({ data: GRUPOS }))

  it('tem o h1 e um h2 por assunto', () => {
    desenhar()

    expect(screen.getByRole('heading', { level: 1, name: 'Perguntas frequentes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Sobre as joias e a Uma Estrelinha' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Envio do material' })).toBeInTheDocument()
  })

  it('desenha todas as perguntas, com a resposta no DOM', () => {
    desenhar()

    expect(screen.getByText('O que são joias afetivas?')).toBeInTheDocument()
    expect(screen.getByText('São peças que eternizam histórias.')).toBeInTheDocument()
  })

  it('conta as perguntas e os assuntos', () => {
    desenhar()
    expect(screen.getByText('3 perguntas, em 2 assuntos')).toBeInTheDocument()
  })

  // ⚠️ A fiação: é a PÁGINA que monta o contato. Sem este caso, apagar `<PolicyContact />` daqui
  // deixaria o componente testado e o bloco ausente da loja.
  it('a página monta o bloco de contato, com os canais das settings', () => {
    desenhar()

    expect(screen.getByRole('heading', { name: 'Ainda ficou com dúvida?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Falar no WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me/51999998888'),
    )
  })

  it('a página monta o índice de assuntos', () => {
    desenhar()
    expect(screen.getByRole('navigation', { name: 'Assuntos' })).toBeInTheDocument()
  })

  // O registro é memorial: `copyInstitucional.test.tsx` já recusa emoji na loja, e esta página é
  // texto novo em volume.
  it('nenhum emoji no texto da página', () => {
    const { container } = desenhar()
    expect(container.textContent ?? '').not.toMatch(EMOJI)
  })

  // Sensor da régua acima: `\p{Extended_Pictographic}` é a propriedade Unicode que cobre a família
  // inteira, e não uma faixa escrita à mão que envelhece. Sem este caso, um regex quebrado diria
  // "nenhum emoji" para sempre — inclusive sobre o ✨ e o ❤️ que o texto de origem trazia.
  it('a régua de emoji acusa os dois que o texto de origem trazia', () => {
    expect('eternizando suas lembranças ✨').toMatch(EMOJI)
    expect('cada história importa ❤️').toMatch(EMOJI)
    expect('texto sem emoji, com acento e travessão — nada aqui').not.toMatch(EMOJI)
  })
})

describe('FaqPage — a busca', () => {
  beforeEach(() => comEstado({ data: GRUPOS }))

  it('filtra pelo texto e atualiza a contagem', async () => {
    desenhar()
    fireEvent.change(screen.getByLabelText('Buscar nas perguntas frequentes'), { target: { value: 'motoboy' } })

    await waitFor(() => expect(screen.getByText('1 pergunta encontrada')).toBeInTheDocument())
    expect(screen.queryByText('O que são joias afetivas?')).toBeNull()
    expect(screen.getByText('Como devo enviar o material?')).toBeInTheDocument()
  })

  it('sem resultado diz a frase da BUSCA, não a de página vazia', async () => {
    desenhar()
    fireEvent.change(screen.getByLabelText('Buscar nas perguntas frequentes'), { target: { value: 'zircônia' } })

    await waitFor(() => expect(screen.getByText('Nenhuma pergunta com esse texto.')).toBeInTheDocument())
    expect(screen.queryByText('Ainda não há perguntas publicadas.')).toBeNull()
  })
})

describe('FaqPage — a cabeça do documento', () => {
  it('injeta o FAQPage com uma entrada por pergunta', async () => {
    comEstado({ data: GRUPOS })
    desenhar()

    await waitFor(() => expect(jsonLd()).not.toBeNull())
    const doc = JSON.parse(jsonLd()?.textContent ?? '{}')
    expect(doc['@type']).toBe('FAQPage')
    expect(doc.mainEntity).toHaveLength(3)
    expect(doc.mainEntity[0].name).toBe('O que são joias afetivas?')
  })

  it('REMOVE o JSON-LD ao sair da página', async () => {
    comEstado({ data: GRUPOS })
    const { unmount } = desenhar()
    await waitFor(() => expect(jsonLd()).not.toBeNull())

    unmount()
    expect(jsonLd()).toBeNull()
  })

  // Um FAQPage com zero perguntas declarado enquanto a leitura acontece é uma afirmação falsa de
  // página vazia — pior que nenhum dado estruturado.
  it('não injeta nada enquanto carrega', () => {
    comEstado({ isLoading: true })
    desenhar()
    expect(jsonLd()).toBeNull()
  })

  it('declara a canônica e o título da página', async () => {
    comEstado({ data: GRUPOS })
    desenhar()

    await waitFor(() =>
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain(
        '/perguntas-frequentes',
      ),
    )
    expect(document.title).toContain('Perguntas frequentes')
  })
})
