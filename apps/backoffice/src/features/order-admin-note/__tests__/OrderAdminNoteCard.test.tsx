// A observação do pedido no painel — o card autossuficiente e o hook que ele usa.
//
// O client é dublado na FRONTEIRA (`@estrelinha/supabase/client`) com um builder que registra a
// cadeia inteira, e o dono da escrita de `core` roda DE VERDADE (só espiado): o que se prova é que a
// tela lê por `order_id`, que a falha de leitura não vira "sem observação", e que salvar passa pelo
// dono — a cadeia gravada no client é a dele.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Passo = [string, ...unknown[]]
interface Cadeia {
  tabela: string
  passos: Passo[]
}

const { estado, writeSpy } = vi.hoisted(() => ({
  estado: {
    linha: null as unknown,
    cadeias: [] as { tabela: string; passos: [string, ...unknown[]][] }[],
    leitura: (): unknown => ({ data: null, error: null }),
    escrita: (_c: { tabela: string; passos: [string, ...unknown[]][] }): unknown => ({ data: [], error: null }),
  },
  writeSpy: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => {
  const builder = (cadeia: Cadeia) => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'maybeSingle', 'upsert', 'delete', 'insert', 'update']) {
      b[m] = (...args: unknown[]) => {
        cadeia.passos.push([m, ...args])
        return b
      }
    }
    b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      const escreve = ['upsert', 'delete', 'insert', 'update'].includes(cadeia.passos[0]?.[0] as string)
      try {
        return Promise.resolve(escreve ? estado.escrita(cadeia) : estado.leitura()).then(resolve, reject)
      } catch (e) {
        return Promise.reject(e).then(resolve, reject)
      }
    }
    return b
  }
  return {
    supabase: {
      from: (tabela: string) => {
        const cadeia: Cadeia = { tabela, passos: [] }
        estado.cadeias.push(cadeia)
        return builder(cadeia)
      },
    },
  }
})

vi.mock('@estrelinha/auth', () => ({
  useAuthContext: () => ({ user: { id: 'u-admin', email: 'adri@exemplo.invalid' }, customer: { name: 'Adri Muniz' } }),
}))

vi.mock('@estrelinha/core/order-actions', async (importOriginal) => {
  const real = await importOriginal<typeof import('@estrelinha/core/order-actions')>()
  return {
    ...real,
    writeAdminNote: (...args: Parameters<typeof real.writeAdminNote>) => {
      writeSpy(...args)
      return real.writeAdminNote(...args)
    },
  }
})

import { OrderAdminNoteCard } from '../index'

const LINHA = {
  order_id: 'o1',
  note: 'Gravar "Ana" na frente',
  updated_by: 'u-outra',
  updated_by_name: 'Bruna Lima',
  // 15h00 UTC = 12h00 em Brasília
  updated_at: '2026-11-03T15:00:00.000Z',
}

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <OrderAdminNoteCard orderId="o1" />
    </QueryClientProvider>,
  )

const leituras = () => estado.cadeias.filter((c) => c.passos[0]?.[0] === 'select')

beforeEach(() => {
  estado.cadeias.length = 0
  // O banco dublado guarda a linha: a releitura depois de gravar devolve o que foi gravado.
  estado.linha = null
  estado.leitura = () => ({ data: estado.linha, error: null })
  estado.escrita = (c) => {
    if (c.passos[0][0] === 'delete') {
      const antes = estado.linha
      estado.linha = null
      return { data: antes ? [antes] : [], error: null }
    }
    estado.linha = { ...LINHA, ...(c.passos[0][1] as Record<string, unknown>) }
    return { data: [estado.linha], error: null }
  }
  writeSpy.mockClear()
})

describe('a leitura', () => {
  it('lê `order_admin_notes` pelo `order_id` do pedido, uma linha no máximo', async () => {
    montar()
    await screen.findByRole('textbox', { name: 'Observação' })
    expect(leituras()).toEqual([
      {
        tabela: 'order_admin_notes',
        passos: [
          ['select', 'order_id, note, updated_by, updated_by_name, updated_at'],
          ['eq', 'order_id', 'o1'],
          ['maybeSingle'],
        ],
      },
    ])
  })

  it('o card diz de quem é: só quem administra vê, a cliente não recebe', async () => {
    montar()
    const card = (await screen.findByRole('textbox', { name: 'Observação' })).closest('section') as HTMLElement
    expect(within(card).getByRole('heading', { name: 'Observação' })).toBeInTheDocument()
    expect(card).toHaveTextContent('Só quem administra vê. A cliente não recebe.')
  })

  it('com observação: o texto no campo e "Atualizada em <data> por <nome>"', async () => {
    estado.linha = LINHA
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    await waitFor(() => expect(campo).toHaveValue('Gravar "Ana" na frente'))
    expect(screen.getByText('Atualizada em 3 nov 2026 às 12h00 por Bruna Lima')).toBeInTheDocument()
  })

  it('sem observação: o campo vazio, e nenhuma linha de autoria', async () => {
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    expect(campo).toHaveValue('')
    expect(screen.queryByText(/Atualizada em/)).toBeNull()
  })

  it('a leitura que falha NÃO se apresenta como "sem observação": frase, "Tentar de novo" e nenhum campo', async () => {
    estado.leitura = () => ({ data: null, error: { message: 'falhou' } })
    montar()
    expect(await screen.findByText('Não consegui ler a observação deste pedido.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Observação' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Salvar observação' })).toBeNull()

    estado.leitura = () => ({ data: LINHA, error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Observação' })).toHaveValue('Gravar "Ana" na frente'))
  })

  it('carregando: esqueleto, sem campo editável', () => {
    estado.leitura = () => new Promise(() => {})
    montar()
    expect(screen.getByTestId('observacao-carregando')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Observação' })).toBeNull()
  })
})

describe('salvar', () => {
  it('cadastra pelo dono de `core`: upsert com o texto aparado, quem editou e o nome', async () => {
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    fireEvent.change(campo, { target: { value: '  Gravar "Ana" na frente  ' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }))
    })
    await waitFor(() => expect(screen.getByText(/Atualizada em .* por Adri Muniz/)).toBeInTheDocument())

    expect(writeSpy).toHaveBeenCalledTimes(1)
    expect(writeSpy.mock.calls[0][1]).toMatchObject({ orderId: 'o1', texto: '  Gravar "Ana" na frente  ', userId: 'u-admin', userName: 'Adri Muniz' })
    const escrita = estado.cadeias.find((c) => c.passos[0][0] === 'upsert')!
    expect(escrita.tabela).toBe('order_admin_notes')
    expect(escrita.passos[0][1]).toMatchObject({ order_id: 'o1', note: 'Gravar "Ana" na frente', updated_by: 'u-admin', updated_by_name: 'Adri Muniz' })
  })

  it('o contador mostra a contagem de `core` (texto aparado) contra o teto de `core` (1000)', async () => {
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    fireEvent.change(campo, { target: { value: '  abc  ' } })
    expect(screen.getByText('3/1000')).toBeInTheDocument()
  })

  it('a tela não trava nem conta em UTF-16: 1000 caracteres fora do plano básico são aceitos e salvos', async () => {
    // '𝒜' é UM ponto de código e DUAS unidades de UTF-16 — core e o banco aceitam mil deles.
    const mil = '𝒜'.repeat(1000)
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    expect(campo).not.toHaveAttribute('maxLength')
    fireEvent.change(campo, { target: { value: mil } })
    expect(campo).toHaveValue(mil)
    expect(screen.getByText('1000/1000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar observação' })).toBeEnabled()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }))
    })
    expect(writeSpy).toHaveBeenCalledTimes(1)
    expect(estado.cadeias.find((c) => c.passos[0][0] === 'upsert')?.passos[0][1]).toMatchObject({ note: mil })
  })

  it('acima do teto de `core`: o Salvar trava e a recusa de `core` aparece', async () => {
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    fireEvent.change(campo, { target: { value: '𝒜'.repeat(1001) } })
    expect(screen.getByText('1001/1000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar observação' })).toBeDisabled()
    expect(screen.getByText('A observação vai até 1000 caracteres.')).toBeInTheDocument()
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it('edita a que existe; apagar o texto apaga a observação (delete pelo dono)', async () => {
    estado.linha = LINHA
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    await waitFor(() => expect(campo).toHaveValue(LINHA.note))
    fireEvent.change(campo, { target: { value: '' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }))
    })
    const escrita = estado.cadeias.find((c) => c.passos[0][0] === 'delete')!
    expect(escrita.passos).toEqual([['delete'], ['eq', 'order_id', 'o1'], ['select', 'order_id, note, updated_by, updated_by_name, updated_at']])
  })

  it('o botão de salvar fica travado enquanto não há mudança', async () => {
    estado.linha = LINHA
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    await waitFor(() => expect(campo).toHaveValue(LINHA.note))
    expect(screen.getByRole('button', { name: 'Salvar observação' })).toBeDisabled()
    fireEvent.change(campo, { target: { value: `${LINHA.note}!` } })
    expect(screen.getByRole('button', { name: 'Salvar observação' })).toBeEnabled()
  })

  it('gravando: o botão mostra o gerúndio e fica travado', async () => {
    let soltar: (v: unknown) => void = () => {}
    estado.escrita = () => new Promise((r) => (soltar = r))
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    fireEvent.change(campo, { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }))
    const botao = await screen.findByRole('button', { name: /Salvando observação/ })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute('aria-busy', 'true')
    await act(async () => soltar({ data: [{ ...LINHA, note: 'x' }], error: null }))
  })

  it('a gravação que falha mantém o texto no campo e diz que não salvou', async () => {
    estado.escrita = () => ({ data: null, error: { message: 'rls' } })
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    fireEvent.change(campo, { target: { value: 'Ligar antes de postar' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('A observação não foi salva. Tente de novo.')
    expect(screen.getByRole('textbox', { name: 'Observação' })).toHaveValue('Ligar antes de postar')
  })

  it('zero linhas gravadas também é falha, nunca sucesso', async () => {
    estado.escrita = () => ({ data: [], error: null })
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    fireEvent.change(campo, { target: { value: 'x' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('A observação não foi salva. Tente de novo.')
    expect(screen.queryByText(/Atualizada em/)).toBeNull()
  })
})
