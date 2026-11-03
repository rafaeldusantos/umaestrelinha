// A forma do bloco Compre Junto pela PÁGINA REAL do menu: a dona escolhe uma das três formas, grava
// e relê. Dublado só o client do Supabase (o dublê que enxerga tabela, filtro e escrita); a página,
// o cartão, o hook de leitura e o de gravação são os reais.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro, Resposta } from '@/test/dubleSupabase'

type Linha = Record<string, unknown>

const { banco } = vi.hoisted(() => ({
  banco: { settings: [] as Linha[], calls: [] as unknown[], falhaAoGravar: false },
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble } = await import('@/test/dubleSupabase')
  const duble = criarDuble((r): Resposta => {
    if (r.table === 'store_settings') {
      if (r.upsert) {
        if (banco.falhaAoGravar) return { error: { message: 'sem permissão' } }
        const novo = r.upsert.rows as Linha
        banco.settings = [...banco.settings.filter(s => s.key !== novo.key), novo]
        return { data: null }
      }
      return { data: banco.settings }
    }
    return { data: [] }
  })
  banco.calls = duble.calls
  return { supabase: { from: duble.from } }
})

const toastMock = vi.hoisted(() => vi.fn())
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: toastMock }))

import AdminBuyTogetherPage from './AdminBuyTogetherPage'

const montar = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/compre-junto']}>
        <Routes>
          <Route path="/admin/compre-junto" element={<AdminBuyTogetherPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const escritas = () =>
  (banco.calls as Registro[]).filter(c => c.table === 'store_settings' && c.upsert)

const opcao = (nome: RegExp) => screen.getByRole('radio', { name: nome }) as HTMLInputElement

beforeEach(() => {
  banco.settings = []
  banco.falhaAoGravar = false
  banco.calls.length = 0
  toastMock.mockClear()
})

describe('a forma do bloco no menu Compre Junto', () => {
  it('oferece as três formas e, sem escolha gravada, "Na linha" vem marcada', async () => {
    montar()
    await screen.findByTestId('forma-do-bloco')
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(opcao(/^Na linha/).checked).toBe(true)
    expect(opcao(/^Em folha/).checked).toBe(false)
    expect(opcao(/^Com fórmula/).checked).toBe(false)
    expect(screen.getByTestId('salvar-forma-do-bloco')).toBeDisabled()
  })

  it('a dona escolhe "Em folha", grava na chave buy_together e relê já marcada', async () => {
    montar()
    await screen.findByTestId('forma-do-bloco')
    fireEvent.click(opcao(/^Em folha/))
    fireEvent.click(screen.getByTestId('salvar-forma-do-bloco'))
    await waitFor(() => expect(escritas()).toHaveLength(1))
    expect(escritas()[0].upsert).toEqual({
      rows: { key: 'buy_together', value: { form: 'sheet' } },
      options: { onConflict: 'key' },
    })
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Forma do bloco salva' }))
    // A releitura (a chave foi invalidada) devolve o que foi gravado.
    await waitFor(() => expect(banco.settings).toHaveLength(1))
    await waitFor(() => expect(opcao(/^Em folha/).checked).toBe(true))
    expect(screen.getByTestId('salvar-forma-do-bloco')).toBeDisabled()
  })

  it('abre com a forma já gravada', async () => {
    banco.settings = [{ key: 'buy_together', value: { form: 'formula' } }]
    montar()
    await screen.findByTestId('forma-do-bloco')
    await waitFor(() => expect(opcao(/^Com fórmula/).checked).toBe(true))
  })

  it('um valor gravado que não é nenhuma das três abre como "Na linha"', async () => {
    banco.settings = [{ key: 'buy_together', value: { form: 'carrossel' } }]
    montar()
    await screen.findByTestId('forma-do-bloco')
    expect(opcao(/^Na linha/).checked).toBe(true)
  })

  it('a gravação que falha avisa e não finge que salvou', async () => {
    banco.falhaAoGravar = true
    montar()
    await screen.findByTestId('forma-do-bloco')
    fireEvent.click(opcao(/^Com fórmula/))
    fireEvent.click(screen.getByTestId('salvar-forma-do-bloco'))
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro ao salvar', variant: 'destructive' })),
    )
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Forma do bloco salva' }))
  })
})
