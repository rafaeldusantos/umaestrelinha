import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuCategory } from '@estrelinha/core/menu'
import { RADIX_POINTER_DOWN, enableRadixSelectInJsdom } from '@/test/radix'

/**
 * `FAQ-35`, `FAQ-36` — o lote por categoria.
 *
 * `applyToCategory.test.ts` prova a conta. Aqui prova-se o que a tela faz com ela: que a **prévia
 * sai antes** de gravar, que o botão diz o número, e que o insert manda uma linha por produto do
 * plano — e nenhuma a mais.
 */

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import ApplyToCategoryDialog from './ApplyToCategoryDialog'

beforeAll(enableRadixSelectInJsdom)

const cat = (id: string, name: string, parent_id: string | null = null) =>
  ({ id, name, parent_id, slug: id, active: true, sort_order: 0 }) as unknown as MenuCategory & {
    name: string
  }

const CATEGORIAS = [cat('joias', 'Joias afetivas'), cat('pingentes', 'Pingentes', 'joias')]

let vinculosCategoria: unknown[]
let jaComPergunta: unknown[]
let insertPayload: unknown = null
let insertError: unknown = null

beforeEach(() => {
  vinculosCategoria = [
    { product_id: 'p1', category_id: 'joias' },
    { product_id: 'p2', category_id: 'pingentes' },
    { product_id: 'p3', category_id: 'joias' },
  ]
  jaComPergunta = [{ product_id: 'p3' }]
  insertPayload = null
  insertError = null

  fromMock.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => Promise.resolve({ data: jaComPergunta, error: null }),
      then: (fn: (v: unknown) => unknown) =>
        Promise.resolve({ data: vinculosCategoria, error: null }).then(fn),
    }),
    insert: (linhas: unknown) => {
      insertPayload = linhas
      return Promise.resolve({ data: null, error: insertError })
    },
    _table: table,
  }))
})

const abrir = () =>
  render(
    <ApplyToCategoryDialog
      open
      faqId="f1"
      faqQuestion="Como envio meu material de DNA?"
      categories={CATEGORIAS}
      onClose={vi.fn()}
      onDone={vi.fn()}
    />,
  )

const escolherCategoria = async (nome: string) => {
  fireEvent.pointerDown(screen.getByRole('combobox', { name: /Categoria/ }), RADIX_POINTER_DOWN)
  const opcao = await screen.findByRole('option', { name: nome })
  fireEvent.click(opcao)
}

describe('ApplyToCategoryDialog', () => {
  it('mostra a pergunta que será aplicada', () => {
    abrir()
    expect(screen.getByText('“Como envio meu material de DNA?”')).toBeInTheDocument()
  })

  it('avisa que o lote alcança as subcategorias', () => {
    abrir()
    expect(screen.getByText(/também alcança as subcategorias/i)).toBeInTheDocument()
  })

  it('sem categoria escolhida, não há prévia e o botão está desabilitado', () => {
    abrir()

    expect(screen.queryByTestId('faq-batch-preview')).toBeNull()
    expect(screen.getByRole('button', { name: /Aplicar a 0 produto/ })).toBeDisabled()
  })

  // A prévia é o que separa um lote que a dona controla de um que ela descobre depois.
  it('a prévia sai ANTES de gravar, com quem recebe e quem é pulado', async () => {
    abrir()
    await escolherCategoria('Joias afetivas')

    const previa = await screen.findByTestId('faq-batch-preview')
    expect(previa).toHaveTextContent('2 produto(s) vão receber esta pergunta.')
    expect(previa).toHaveTextContent('1 já tinham e serão pulados.')
  })

  it('o botão diz o número, e nada foi gravado ainda', async () => {
    abrir()
    await escolherCategoria('Joias afetivas')

    expect(await screen.findByRole('button', { name: 'Aplicar a 2 produto(s)' })).toBeEnabled()
    expect(insertPayload).toBeNull()
  })

  it('aplicar grava uma linha por produto do plano, e nenhuma a mais', async () => {
    abrir()
    await escolherCategoria('Joias afetivas')
    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar a 2 produto(s)' }))

    await waitFor(() => expect(insertPayload).not.toBeNull())

    const linhas = insertPayload as Array<Record<string, unknown>>
    expect(linhas.map(l => l.product_id).sort()).toEqual(['p1', 'p2'])
    expect(linhas.every(l => l.faq_id === 'f1')).toBe(true)
    expect(linhas.every(l => l.answer_override === null)).toBe(true)
  })

  // Um lote não sabe a ordem que a dona escolheu produto a produto; entrar no fim é o único lugar
  // que não desloca o que ela já organizou.
  it('a pergunta entra no FIM da lista de cada produto', async () => {
    abrir()
    await escolherCategoria('Joias afetivas')
    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar a 2 produto(s)' }))

    await waitFor(() => expect(insertPayload).not.toBeNull())
    const linhas = insertPayload as Array<Record<string, unknown>>
    expect(linhas.every(l => l.position === 999)).toBe(true)
  })

  it('ao fim, informa quantos vínculos foram criados', async () => {
    abrir()
    await escolherCategoria('Joias afetivas')
    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar a 2 produto(s)' }))

    expect(await screen.findByRole('status')).toHaveTextContent('2 vínculo(s) criado(s)')
  })

  it('erro de gravação aparece na tela', async () => {
    insertError = { message: 'permission denied' }
    abrir()
    await escolherCategoria('Joias afetivas')
    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar a 2 produto(s)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied')
  })

  it('categoria sem produto diz isso, e o botão fica desabilitado', async () => {
    vinculosCategoria = []
    abrir()
    await escolherCategoria('Joias afetivas')

    expect(await screen.findByText(/não tem produto nenhum/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Aplicar a 0 produto/ })).toBeDisabled()
  })
})
