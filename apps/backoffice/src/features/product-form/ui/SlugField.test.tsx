import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

// PFM-02, PFM-03, PFM-04 (P1.5): slug só na aba SEO, disponibilidade verificada ao digitar (não no
// insert), e 301 para produto já publicado.

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import SlugField from './SlugField'
import SlugReadonlyLine from './SlugReadonlyLine'
import { blocksSave, suggestSlug } from '../model/useSlugAvailability'
import { persistRedirect } from '../model/persistRedirect'
import type { PersistClient } from '../model/persistProduct'

/** Encena `from('products').select('id').eq('slug', …)[.neq(…)].maybeSingle()`. */
const respondWith = (row: unknown, error: unknown = null) => {
  const chain: Record<string, unknown> = {}
  chain.neq = () => chain
  chain.maybeSingle = () => Promise.resolve({ data: row, error })
  fromMock.mockReturnValue({ select: () => ({ eq: () => chain }) })
}

const props = () => ({
  slug: 'botton-sailor-moon',
  onChange: vi.fn(),
  productId: 'p1',
  savedSlug: 'botton-sailor-moon',
  isPublished: true,
  redirectEnabled: true,
  onRedirectToggle: vi.fn(),
})

beforeEach(() => {
  fromMock.mockReset()
  respondWith(null)
})

afterEach(() => vi.restoreAllMocks())

describe('suggestSlug / blocksSave', () => {
  it('sugere sufixo numérico e não empilha sufixos', () => {
    expect(suggestSlug('botton-sailor-moon')).toBe('botton-sailor-moon-2')
    expect(suggestSlug('botton-sailor-moon-2')).toBe('botton-sailor-moon-2')
  })

  it('slug ocupado e inválido bloqueiam o save; os outros estados, não', () => {
    expect(blocksSave('taken')).toBe(true)
    expect(blocksSave('invalid')).toBe(true)
    expect(blocksSave('available')).toBe(false)
    expect(blocksSave('checking')).toBe(false)
    // `error` NÃO bloqueia: falha de rede não pode impedir o save de um slug que talvez esteja
    // livre. O `UNIQUE` do banco continua sendo a rede de segurança.
    expect(blocksSave('error')).toBe(false)
  })
})

describe('SlugField — disponibilidade ao digitar (PFM-03 AC 4-5)', () => {
  it('slug livre mostra `Disponível`', async () => {
    respondWith(null)
    render(<SlugField {...props()} />)

    await waitFor(() =>
      expect(screen.getByTestId('slug-status').textContent).toContain('Disponível'),
    )
  })

  it('slug ocupado mostra `Já existe` e oferece a sugestão', async () => {
    respondWith({ id: 'outro-produto' })
    render(<SlugField {...props()} />)

    await waitFor(() => expect(screen.getByTestId('slug-status').textContent).toContain('Já existe'))
    expect(screen.getByRole('button', { name: /Usar botton-sailor-moon-2/ })).toBeInTheDocument()
  })

  it('clicar na sugestão troca o slug', async () => {
    respondWith({ id: 'outro-produto' })
    const p = props()
    render(<SlugField {...p} />)
    await waitFor(() => expect(screen.getByTestId('slug-status').textContent).toContain('Já existe'))

    fireEvent.click(screen.getByRole('button', { name: /Usar botton-sailor-moon-2/ }))

    expect(p.onChange).toHaveBeenCalledWith('botton-sailor-moon-2')
  })

  it('slug com caractere inválido nem consulta o banco', async () => {
    render(<SlugField {...props()} slug="Botton Sailor Moon!" />)

    await waitFor(() =>
      expect(screen.getByTestId('slug-status').textContent).toContain('letras minúsculas'),
    )
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('consulta que FALHA não afirma disponível — dizer isso é o defeito 15 de volta', async () => {
    respondWith(null, { message: 'timeout' })
    render(<SlugField {...props()} />)

    await waitFor(() =>
      expect(screen.getByTestId('slug-status').textContent).toContain('Não foi possível verificar'),
    )
  })

  it('o produto em edição não colide consigo mesmo — a consulta exclui o próprio id', async () => {
    const neq = vi.fn()
    const chain: Record<string, unknown> = {}
    chain.neq = (...args: unknown[]) => {
      neq(...args)
      return chain
    }
    chain.maybeSingle = () => Promise.resolve({ data: null, error: null })
    fromMock.mockReturnValue({ select: () => ({ eq: () => chain }) })

    render(<SlugField {...props()} />)

    await waitFor(() => expect(neq).toHaveBeenCalledWith('id', 'p1'))
  })
})

describe('SlugField — aviso de 301 (PFM-04 AC 6, 10)', () => {
  it('produto publicado com slug ALTERADO mostra o aviso e o toggle ligado', () => {
    render(<SlugField {...props()} slug="botton-lua-prateada" savedSlug="botton-sailor-moon" />)

    expect(screen.getByRole('alert').textContent).toContain('já está publicado')
    expect(screen.getByLabelText(/Criar redirecionamento 301/)).toBeChecked()
  })

  it('slug inalterado não mostra aviso — não há endereço antigo para preservar', () => {
    render(<SlugField {...props()} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('rascunho (não publicado) com slug alterado não mostra aviso — ninguém salvou esse link', () => {
    render(
      <SlugField
        {...props()}
        isPublished={false}
        slug="botton-lua-prateada"
        savedSlug="botton-sailor-moon"
      />,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('desligar o toggle é reportado ao formulário', () => {
    const p = props()
    render(<SlugField {...p} slug="botton-lua-prateada" savedSlug="botton-sailor-moon" />)

    fireEvent.click(screen.getByLabelText(/Criar redirecionamento 301/))

    expect(p.onRedirectToggle).toHaveBeenCalledWith(false)
  })
})

describe('SlugReadonlyLine — a aba Geral não edita slug (PFM-02 AC 1, 3)', () => {
  it('mostra a URL como TEXTO, sem input', () => {
    const { container } = render(
      <SlugReadonlyLine slug="botton-sailor-moon" derivedFromName onEditInSeo={vi.fn()} />,
    )

    // O domínio e o slug são elementos separados — o artboard dá peso maior ao slug, que é a parte
    // que muda. A asserção é sobre a faixa inteira, não sobre um nó só.
    expect(screen.getByText('umaestrelinha.com.br/produto/')).toBeInTheDocument()
    expect(screen.getByText('botton-sailor-moon')).toBeInTheDocument()
    expect(container.querySelector('input')).toBeNull()
  })

  it('diz que a URL vem do nome quando o vínculo está intacto', () => {
    render(<SlugReadonlyLine slug="botton" derivedFromName onEditInSeo={vi.fn()} />)
    expect(screen.getByText(/gerada do nome/)).toBeInTheDocument()
  })

  it('depois de editada, avisa que o nome não altera mais a URL (AC 3)', () => {
    render(<SlugReadonlyLine slug="botton" derivedFromName={false} onEditInSeo={vi.fn()} />)
    expect(screen.getByText(/mudar o nome não altera mais a URL/)).toBeInTheDocument()
  })

  it('o link leva para a aba SEO', () => {
    const onEditInSeo = vi.fn()
    render(<SlugReadonlyLine slug="botton" derivedFromName onEditInSeo={onEditInSeo} />)

    fireEvent.click(screen.getByRole('button', { name: /Editar em SEO/ }))

    expect(onEditInSeo).toHaveBeenCalled()
  })
})

// --- Gravação do 301 -----------------------------------------------------------------------------

interface Call {
  table: string
  op: string
  payload?: unknown
}

const fakeClient = (fail?: { table: string; op: string; message: string }) => {
  const calls: Call[] = []
  const result = (table: string, op: string) =>
    Promise.resolve(
      fail && fail.table === table && fail.op === op
        ? { error: { message: fail.message } }
        : { error: null },
    )
  const client: PersistClient = {
    from: (table: string) => ({
      insert: rows => {
        calls.push({ table, op: 'insert', payload: rows })
        return result(table, 'insert')
      },
      upsert: rows => {
        calls.push({ table, op: 'upsert', payload: rows })
        return result(table, 'upsert')
      },
      update: () => ({ eq: () => result(table, 'update') }),
      delete: () => ({
        eq: () => ({
          in: (_column, values) => {
            calls.push({ table, op: 'delete', payload: values })
            return result(table, 'delete')
          },
        }),
      }),
    }),
  }
  return { client, calls }
}

describe('persistRedirect — a gravação (PFM-04 AC 7, 9, 10)', () => {
  const base = {
    productId: 'p1',
    previousSlug: 'botton-sailor-moon',
    nextSlug: 'botton-lua-prateada',
    enabled: true,
  }

  it('slug mudou e toggle ligado: grava o slug ANTIGO apontando para o produto', async () => {
    const { client, calls } = fakeClient()

    const result = await persistRedirect(client, base)

    expect(result).toEqual({ written: true })
    const upsert = calls.find(c => c.op === 'upsert')!
    expect(upsert.payload).toEqual([{ from_slug: 'botton-sailor-moon', product_id: 'p1' }])
  })

  it('toggle DESLIGADO não cria registro nenhum (AC 10)', async () => {
    const { client, calls } = fakeClient()

    const result = await persistRedirect(client, { ...base, enabled: false })

    expect(result).toEqual({ written: false, reason: 'disabled' })
    expect(calls).toEqual([])
  })

  it('slug inalterado não cria registro — não há endereço antigo', async () => {
    const { client, calls } = fakeClient()

    const result = await persistRedirect(client, { ...base, nextSlug: base.previousSlug })

    expect(result).toEqual({ written: false, reason: 'unchanged' })
    expect(calls).toEqual([])
  })

  it('produto novo (sem slug anterior) não cria redirect', async () => {
    const { client } = fakeClient()
    expect(await persistRedirect(client, { ...base, previousSlug: '' })).toEqual({
      written: false,
      reason: 'empty',
    })
  })

  it('AC 9: o slug que vira ATIVO deixa de ser redirect de outro produto', async () => {
    const { client, calls } = fakeClient()

    await persistRedirect(client, base)

    const del = calls.find(c => c.op === 'delete')!
    expect(del.table).toBe('product_redirects')
    expect(del.payload).toEqual(['botton-lua-prateada'])
    // E o delete vem ANTES do upsert: senão o novo registro poderia ser o apagado.
    expect(calls.indexOf(del)).toBeLessThan(calls.findIndex(c => c.op === 'upsert'))
  })

  it('falha na gravação é reportada com a mensagem, não engolida', async () => {
    const { client } = fakeClient({
      table: 'product_redirects',
      op: 'upsert',
      message: 'permission denied',
    })

    expect(await persistRedirect(client, base)).toEqual({
      written: false,
      reason: 'error',
      message: 'permission denied',
    })
  })
})
