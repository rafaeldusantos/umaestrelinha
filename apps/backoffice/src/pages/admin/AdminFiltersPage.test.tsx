// Feature 66 — `/admin/filtros` (`FLT-01`..`FLT-10`, T08).
//
// A PÁGINA REAL é montada, com `GroupForm` e `ValueList` reais dentro dela. O único dublê é o hook
// do catálogo (`@/entities/filter`), e é ele que este arquivo usa para ver o que a tela pede: o
// hook em si — a régua de `core` antes da rede, os payloads, a releitura — é provado em
// `entities/filter/api/__tests__/useAdminFilterCatalog.test.ts`.
//
// Inventário de `vi.mock` desta página (`L-030`): só `@/entities/filter`. Nada mais é dublado.

import * as React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminFilterGroup } from '@/entities/filter'

const cat = vi.hoisted(() => ({
  groups: [] as unknown[],
  loading: false,
  error: null as string | null,
  fetchCatalog: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  createValue: vi.fn(),
  updateValue: vi.fn(),
  updateValueTerms: vi.fn(),
  deleteValue: vi.fn(),
  reorderGroups: vi.fn(),
  reorderValues: vi.fn(),
  /** Rodada 2 (VFL-36): quem está montado e ouvindo o dublê do catálogo — ver `publicar`. */
  ouvintes: new Set<() => void>(),
}))

// Feature 67 (`L-030`): a página passou a ler a fila para o "Sugestões (N)". As duas leituras dela
// (recusas e o pool da marcação) são dubladas aqui; a regra que transforma as duas em fila é a REAL.
const fila = vi.hoisted(() => ({ produtos: [] as unknown[], recusas: [] as unknown[], carregando: false }))
vi.mock('@/entities/filter', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/filter')>()),
  // Rodada 2 (VFL-36): o dublê re-renderiza quem o lê quando `publicar()` é chamado — é a forma da
  // releitura do hook real (provada em `useAdminFilterCatalog.test.ts`, B28), sem a rede. Sem isto
  // o único jeito de a página ver um catálogo novo era remontar, e remontar é recarregar.
  useAdminFilterCatalog: () => {
    const [, forcar] = React.useReducer((x: number) => x + 1, 0)
    React.useEffect(() => {
      cat.ouvintes.add(forcar)
      return () => {
        cat.ouvintes.delete(forcar)
      }
    }, [])
    return cat
  },
  useSuggestionDismissals: () => ({ recusas: fila.recusas, carregando: fila.carregando, erro: null }),
}))
vi.mock('@/entities/product', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/product')>()),
  useProductMarkingPool: () => ({ produtos: fila.produtos, carregando: fila.carregando, erro: null, recarregar: vi.fn() }),
}))

import AdminFiltersPage from './AdminFiltersPage'

const grupo = (
  id: string,
  name: string,
  slug: string,
  values: [string, string, string, number][],
  is_active = true,
): AdminFilterGroup => ({
  id,
  name,
  slug,
  is_active,
  sort_order: 0,
  created_at: '',
  values: values.map(([vid, vname, vslug, marked_count], i) => ({
    id: vid,
    group_id: id,
    name: vname,
    slug: vslug,
    sort_order: i,
    marked_count,
  })),
})

beforeEach(() => {
  fila.produtos = []
  fila.recusas = []
  fila.carregando = false
  cat.groups = [
    grupo('acab', 'Acabamento', 'acabamento', [
      ['prata', 'Prata 925', 'prata-925', 183],
      ['ouro', 'Folheado a ouro', 'folheado-a-ouro', 152],
      ['rodio', 'Ródio', 'rodio', 0],
    ]),
    grupo('ocasiao', 'Ocasião', 'ocasiao', [['maes', 'Dia das Mães', 'dia-das-maes', 1]], false),
  ]
  cat.loading = false
  cat.error = null
  for (const k of [
    'fetchCatalog', 'createGroup', 'updateGroup', 'deleteGroup', 'createValue', 'updateValue',
    'updateValueTerms', 'deleteValue', 'reorderGroups', 'reorderValues',
  ] as const) cat[k].mockReset()
  cat.createGroup.mockResolvedValue({ error: null, id: 'novo' })
  cat.updateGroup.mockResolvedValue(null)
  cat.deleteGroup.mockResolvedValue(null)
  cat.createValue.mockResolvedValue({ error: null, id: 'v-novo' })
  cat.updateValue.mockResolvedValue(null)
  cat.updateValueTerms.mockResolvedValue(null)
  cat.deleteValue.mockResolvedValue(null)
  cat.reorderGroups.mockResolvedValue(null)
  cat.reorderValues.mockResolvedValue(null)
})

let local = ''
const Onde = () => {
  local = useLocation().pathname
  return null
}

const montar = (rota = '/admin/filtros') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/filtros" element={<><AdminFiltersPage /><Onde /></>} />
          <Route path="/admin/filtros/:groupId" element={<><AdminFiltersPage /><Onde /></>} />
          <Route path="/admin/filtros/:groupId/valores/:valueId" element={<Onde />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const listaDeGrupos = () => screen.getByRole('region', { name: 'Grupos' })

describe('FLT-01 — a lista de grupos', () => {
  it('lista os grupos na ordem do catálogo, com valores, marcações e o interruptor', () => {
    montar()
    const linhas = within(listaDeGrupos()).getAllByRole('listitem')
    expect(linhas.map(l => within(l).getByRole('link').textContent)).toEqual([
      'Acabamento3 valores · 335 marcações',
      'Ocasião1 valor · 1 marcação · desligado na loja',
    ])
    expect(within(linhas[0]).getByRole('switch', { name: 'Mostrar “Acabamento” na loja' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(within(linhas[1]).getByRole('switch', { name: 'Mostrar “Ocasião” na loja' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.getByTestId('contador-grupos')).toHaveTextContent('2 de 12')
  })

  it('o grupo da URL é o que abre no editor', () => {
    montar('/admin/filtros/ocasiao')
    const editor = screen.getByTestId('editor-do-grupo')
    expect(within(editor).getByLabelText('Nome do grupo')).toHaveValue('Ocasião')
    expect(within(editor).getByText('Dia das Mães')).toBeInTheDocument()
  })

  it('a rota-mãe abre o primeiro grupo no computador', () => {
    montar()
    expect(within(screen.getByTestId('editor-do-grupo')).getByLabelText('Nome do grupo')).toHaveValue('Acabamento')
  })

  it('sem grupo nenhum, diz isso e oferece criar', () => {
    cat.groups = []
    montar()
    expect(screen.getByText('Nenhum grupo de filtro ainda.')).toBeInTheDocument()
  })

  it('falha de leitura mostra o erro e "Tentar de novo" relê como carga inicial', () => {
    cat.error = 'sem rede'
    montar()
    expect(screen.getByRole('alert')).toHaveTextContent('sem rede')
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(cat.fetchCatalog).toHaveBeenCalledWith('inicial')
  })
})

describe('FLT-02 — o endereço nasce do nome e é editável', () => {
  it('no grupo novo, digitar o nome preenche "Endereço no filtro" em kebab-case sem acento', async () => {
    montar()
    fireEvent.click(screen.getAllByRole('button', { name: 'Novo grupo' })[0])
    const editor = screen.getByTestId('editor-do-grupo')
    fireEvent.change(within(editor).getByLabelText('Nome do grupo'), { target: { value: 'Tipo de Joia Ótima' } })
    expect(within(editor).getByLabelText('Endereço no filtro')).toHaveValue('tipo-de-joia-otima')

    // Editável — e, depois de tocado, deixa de acompanhar o nome.
    fireEvent.change(within(editor).getByLabelText('Endereço no filtro'), { target: { value: 'tipo' } })
    fireEvent.change(within(editor).getByLabelText('Nome do grupo'), { target: { value: 'Tipo de peça' } })
    expect(within(editor).getByLabelText('Endereço no filtro')).toHaveValue('tipo')

    await act(async () => {
      fireEvent.click(within(editor).getByRole('button', { name: 'Criar grupo' }))
    })
    expect(cat.createGroup).toHaveBeenCalledWith({ name: 'Tipo de peça', slug: 'tipo' })
    await waitFor(() => expect(local).toBe('/admin/filtros/novo'))
  })

  it('no grupo existente, mudar o nome NÃO muda o endereço, e mudar o endereço avisa antes de salvar', () => {
    montar('/admin/filtros/acab')
    const editor = screen.getByTestId('editor-do-grupo')
    fireEvent.change(within(editor).getByLabelText('Nome do grupo'), { target: { value: 'Banho' } })
    expect(within(editor).getByLabelText('Endereço no filtro')).toHaveValue('acabamento')
    expect(screen.queryByTestId('aviso-endereco')).not.toBeInTheDocument()

    fireEvent.change(within(editor).getByLabelText('Endereço no filtro'), { target: { value: 'banho' } })
    expect(screen.getByTestId('aviso-endereco')).toHaveTextContent(
      'Links antigos com “acabamento” vão abrir a categoria sem este filtro.',
    )
  })
})

describe('FLT-03/FLT-04/FLT-10 — a recusa aparece em texto e o que foi digitado fica', () => {
  it.each([
    ['Dê um nome ao grupo.'],
    ['O nome pode ter até 40 caracteres.'],
    ['Já existe um grupo com este nome.'],
    ['Este endereço já é usado pela loja.'],
  ])('mostra "%s" e mantém o rascunho, sem "Salvo"', async motivo => {
    cat.updateGroup.mockResolvedValue(motivo)
    montar('/admin/filtros/acab')
    const editor = screen.getByTestId('editor-do-grupo')
    fireEvent.change(within(editor).getByLabelText('Endereço no filtro'), { target: { value: 'preco' } })
    await act(async () => {
      fireEvent.click(within(editor).getByRole('button', { name: 'Salvar grupo' }))
    })
    expect(within(editor).getByRole('alert')).toHaveTextContent(motivo)
    expect(within(editor).getByLabelText('Endereço no filtro')).toHaveValue('preco')
    expect(within(editor).queryByRole('status')).not.toBeInTheDocument()
    expect(cat.updateGroup).toHaveBeenCalledWith('acab', { name: 'Acabamento', slug: 'preco' })
  })

  it('gravou: mostra "Salvo"', async () => {
    montar('/admin/filtros/acab')
    const editor = screen.getByTestId('editor-do-grupo')
    await act(async () => {
      fireEvent.click(within(editor).getByRole('button', { name: 'Salvar grupo' }))
    })
    expect(within(editor).getByRole('status')).toHaveTextContent('Salvo')
  })

  it('o contador do nome usa o teto de 40', () => {
    montar('/admin/filtros/acab')
    expect(within(screen.getByTestId('editor-do-grupo')).getByText('10/40')).toBeInTheDocument()
  })
})

describe('FLT-05 — o teto de 12 grupos', () => {
  it('com 12 grupos, "Novo grupo" fica desabilitado e diz o motivo', () => {
    cat.groups = Array.from({ length: 12 }, (_, i) => grupo(`g${i}`, `Grupo ${i}`, `grupo-${i}`, []))
    montar()
    expect(screen.getByRole('button', { name: 'Novo grupo' })).toBeDisabled()
    expect(screen.getByText('A loja aceita até 12 grupos de filtro.')).toBeInTheDocument()
  })

  it('SENSOR: com 11, o botão está habilitado e não há motivo', () => {
    cat.groups = Array.from({ length: 11 }, (_, i) => grupo(`g${i}`, `Grupo ${i}`, `grupo-${i}`, []))
    montar()
    expect(screen.getByRole('button', { name: 'Novo grupo' })).toBeEnabled()
    expect(screen.queryByText('A loja aceita até 12 grupos de filtro.')).not.toBeInTheDocument()
  })
})

describe('FLT-06 — os valores', () => {
  it('acrescenta com o endereço derivado do nome', async () => {
    montar('/admin/filtros/acab')
    fireEvent.change(screen.getByLabelText('Nome do novo valor'), { target: { value: 'Prata 950 Polida' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    })
    expect(cat.createValue).toHaveBeenCalledWith('acab', { name: 'Prata 950 Polida', slug: 'prata-950-polida' })
    expect(screen.getByLabelText('Nome do novo valor')).toHaveValue('')
  })

  it('recusa mantém o nome digitado e mostra o motivo', async () => {
    cat.createValue.mockResolvedValue({ error: 'Já existe um valor com este nome neste grupo.', id: null })
    montar('/admin/filtros/acab')
    fireEvent.change(screen.getByLabelText('Nome do novo valor'), { target: { value: 'prata 925' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    })
    expect(screen.getByText('Já existe um valor com este nome neste grupo.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome do novo valor')).toHaveValue('prata 925')
  })

  it('renomeia na própria linha, com nome e endereço', async () => {
    montar('/admin/filtros/acab')
    fireEvent.click(screen.getByRole('button', { name: 'Renomear “Prata 925”' }))
    fireEvent.change(screen.getByLabelText('Nome do valor'), { target: { value: 'Prata 950' } })
    fireEvent.change(screen.getByLabelText('Endereço do valor'), { target: { value: 'prata-950' } })
    expect(screen.getByText('Mudar o endereço quebra links já compartilhados com este valor.')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    })
    expect(cat.updateValue).toHaveBeenCalledWith('prata', { name: 'Prata 950', slug: 'prata-950' })
  })

  // Verificação independente, rodada 3 (2026-10-18): FLT-10 estava provada para criar e editar
  // grupo e para acrescentar valor, mas não para RENOMEAR valor — tirar a guarda que só fecha a linha
  // sem recusa sobrevivia, e a recusa engolia o nome digitado junto com o motivo.
  it('renomear recusado mantém a linha aberta, com o nome digitado e o motivo (FLT-10)', async () => {
    cat.updateValue.mockResolvedValue('Já existe um valor com este nome neste grupo.')
    montar('/admin/filtros/acab')
    fireEvent.click(screen.getByRole('button', { name: 'Renomear “Prata 925”' }))
    fireEvent.change(screen.getByLabelText('Nome do valor'), { target: { value: 'Folheado a ouro' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    })
    const linha = screen.getByRole('form', { name: 'Editar “Prata 925”' })
    expect(within(linha).getByLabelText('Nome do valor')).toHaveValue('Folheado a ouro')
    expect(within(linha).getByRole('alert')).toHaveTextContent('Já existe um valor com este nome neste grupo.')
  })

  it('reordena arrastando: grava a ordem inteira do grupo', async () => {
    montar('/admin/filtros/acab')
    fireEvent.dragStart(screen.getByTestId('valor-rodio'))
    await act(async () => {
      fireEvent.drop(screen.getByTestId('valor-prata'))
    })
    expect(cat.reorderValues).toHaveBeenCalledWith('acab', ['rodio', 'prata', 'ouro'])
  })

  it('com 60 valores, "Adicionar" fica indisponível e diz o motivo', () => {
    cat.groups = [
      grupo(
        'acab',
        'Acabamento',
        'acabamento',
        Array.from({ length: 60 }, (_, i) => [`v${i}`, `Valor ${i}`, `valor-${i}`, 0] as [string, string, string, number]),
      ),
    ]
    montar('/admin/filtros/acab')
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled()
    expect(screen.getByText('Um grupo aceita até 60 valores.')).toBeInTheDocument()
  })

  it('cada valor leva à marcação em massa dele', () => {
    montar('/admin/filtros/acab')
    expect(screen.getByRole('link', { name: 'Marcar peças em “Prata 925”' })).toHaveAttribute(
      'href',
      '/admin/filtros/acab/valores/prata',
    )
  })
})

describe('FLT-07 — remover valor com peças pede confirmação com o número', () => {
  it('diz quantas peças perdem a marcação, e só remove ao confirmar', async () => {
    montar('/admin/filtros/acab')
    fireEvent.click(screen.getByRole('button', { name: 'Remover “Prata 925”' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).getByText('Remover “Prata 925”?')).toBeInTheDocument()
    expect(within(dialogo).getByText('183 peças perdem esta marcação. As peças continuam no catálogo.')).toBeInTheDocument()
    expect(cat.deleteValue).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Remover valor' }))
    })
    expect(cat.deleteValue).toHaveBeenCalledWith('prata')
  })

  it('cancelar não remove', async () => {
    montar('/admin/filtros/acab')
    fireEvent.click(screen.getByRole('button', { name: 'Remover “Prata 925”' }))
    const dialogo = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Manter' }))
    expect(cat.deleteValue).not.toHaveBeenCalled()
  })

  it('valor sem peça marcada é removido sem diálogo', async () => {
    montar('/admin/filtros/acab')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remover “Ródio”' }))
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(cat.deleteValue).toHaveBeenCalledWith('rodio')
  })

  it('o singular: 1 peça perde esta marcação', async () => {
    montar('/admin/filtros/ocasiao')
    fireEvent.click(screen.getByRole('button', { name: 'Remover “Dia das Mães”' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).getByText('1 peça perde esta marcação. As peças continuam no catálogo.')).toBeInTheDocument()
  })
})

describe('FLT-08 — remover grupo confirma com valores e marcações', () => {
  it('a frase nomeia os dois números, e confirmar apaga e volta à lista', async () => {
    montar('/admin/filtros/acab')
    fireEvent.click(screen.getByRole('button', { name: 'Remover grupo' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).getByText('Remover o grupo “Acabamento”?')).toBeInTheDocument()
    expect(
      within(dialogo).getByText('Saem junto 3 valores e 335 marcações. As peças continuam no catálogo.'),
    ).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Remover grupo' }))
    })
    expect(cat.deleteGroup).toHaveBeenCalledWith('acab')
    await waitFor(() => expect(local).toBe('/admin/filtros'))
  })

  it('a falha ao remover aparece e a tela não sai do grupo', async () => {
    cat.deleteGroup.mockResolvedValue('sem permissão')
    montar('/admin/filtros/acab')
    fireEvent.click(screen.getByRole('button', { name: 'Remover grupo' }))
    const dialogo = await screen.findByRole('alertdialog')
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Remover grupo' }))
    })
    expect(screen.getByText('sem permissão')).toBeInTheDocument()
    expect(local).toBe('/admin/filtros/acab')
  })
})

describe('FLT-09 — desligar um grupo', () => {
  it('o interruptor grava `is_active` daquele grupo', async () => {
    montar()
    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: 'Mostrar “Acabamento” na loja' }))
    })
    expect(cat.updateGroup).toHaveBeenCalledWith('acab', { is_active: false })
  })

  it('reordenar grupos arrastando grava a lista inteira', async () => {
    montar()
    fireEvent.dragStart(screen.getByTestId('grupo-ocasiao'))
    await act(async () => {
      fireEvent.drop(screen.getByTestId('grupo-acab'))
    })
    expect(cat.reorderGroups).toHaveBeenCalledWith(['ocasiao', 'acab'])
  })
})

describe('celular — a URL decide lista ou editor', () => {
  it('na rota-mãe o editor é só do computador; dentro de um grupo, a lista é que some no celular', () => {
    const { unmount } = montar()
    expect(screen.getByTestId('editor-do-grupo').className).toContain('hidden lg:block')
    unmount()
    montar('/admin/filtros/acab')
    expect(screen.getByTestId('editor-do-grupo').className).not.toContain('hidden')
    expect(listaDeGrupos().parentElement?.className).toContain('hidden lg:block')
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument()
  })
})

// Feature 67 (T09, `VFL-28`) — o link para a fila, com o total de sugestões pendentes.
describe('VFL-28 — "Sugestões (N)" em /admin/filtros', () => {
  const peca = (id: string, name: string, tags: string[] = []) => ({
    id, name, slug: id, is_active: true, base_price: 1, tags, category_ids: [], thumb: null,
    options: [], variants: [], filter_value_ids: [], option_marks: [],
  })

  it('o total vem da MESMA regra da fila (nome e tag contam), e o link leva a ela', () => {
    fila.produtos = [peca('a', 'Anel Prata 925'), peca('b', 'Colar', ['Prata925']), peca('c', 'Brinco')]
    montar()
    const link = screen.getByRole('link', { name: 'Sugestões (2)' })
    expect(link).toHaveAttribute('href', '/admin/filtros/sugestoes')
  })

  it('a recusa gravada tira a sugestão do total', () => {
    fila.produtos = [peca('a', 'Anel Prata 925'), peca('b', 'Colar', ['Prata925'])]
    fila.recusas = [{ product_id: 'b', value_id: 'prata', option_name: '', option_value: '' }]
    montar()
    expect(screen.getByRole('link', { name: 'Sugestões (1)' })).toBeInTheDocument()
  })

  it('enquanto a fila carrega, o link não afirma número', () => {
    fila.carregando = true
    montar()
    expect(screen.getByRole('link', { name: 'Sugestões' })).toBeInTheDocument()
  })

  it('sem grupo nenhum não há link (não há o que sugerir)', () => {
    cat.groups = []
    montar()
    expect(screen.queryByRole('link', { name: /^Sugestões/ })).toBeNull()
  })
})

// Feature 67 — a confirmação de remover valor soma as marcações por opção (edge case da spec).
describe('remover valor com marcações por opção', () => {
  const comOpcao = (marked: number, porOpcao: number) => {
    const g = cat.groups[0] as AdminFilterGroup
    cat.groups = [{ ...g, values: g.values.map(v => (v.id === 'rodio' ? { ...v, marked_count: marked, option_marked_count: porOpcao } : v)) }, ...cat.groups.slice(1)]
  }

  it('as duas formas somam na frase', async () => {
    comOpcao(3, 71)
    montar('/admin/filtros/acab')
    fireEvent.click(screen.getByRole('button', { name: 'Remover “Ródio”' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(
      within(dialogo).getByText('3 peças perdem esta marcação, e saem junto 71 marcações por opção. As peças continuam no catálogo.'),
    ).toBeInTheDocument()
  })

  it('só por opção (nenhuma peça toda) também pede confirmação', async () => {
    comOpcao(0, 1)
    montar('/admin/filtros/acab')
    fireEvent.click(screen.getByRole('button', { name: 'Remover “Ródio”' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).getByText('Saem junto 1 marcação por opção. As peças continuam no catálogo.')).toBeInTheDocument()
    expect(cat.deleteValue).not.toHaveBeenCalled()
  })
})

// Feature 67 — D2 da prova em navegador: "Chaveiro · 0 peças marcadas" com 145 marcações por opção.
// O número do grupo é a soma das marcações por valor (FLT-01) — das DUAS formas —, e a linha do valor
// diz as duas formas, cada uma na própria unidade (peças × marcações), sem somá-las como "peças".
describe('D2 — as contagens de /admin/filtros contam a marcação por opção', () => {
  const comContagens = (porValor: Record<string, [number, number]>) => {
    const g = cat.groups[0] as AdminFilterGroup
    cat.groups = [
      {
        ...g,
        values: g.values.map(v =>
          porValor[v.id] ? { ...v, marked_count: porValor[v.id][0], option_marked_count: porValor[v.id][1] } : v,
        ),
      },
      ...cat.groups.slice(1),
    ]
  }

  it('o grupo soma as duas formas: 183 + 171 + 152 + 145 = 651 marcações', () => {
    comContagens({ prata: [183, 171], rodio: [0, 145] })
    montar()
    const linhas = within(listaDeGrupos()).getAllByRole('listitem')
    expect(within(linhas[0]).getByRole('link').textContent).toBe('Acabamento3 valores · 651 marcações')
  })

  it('o valor diz as duas formas, cada uma na própria unidade — e o só-por-opção não diz "0 peças"', () => {
    comContagens({ prata: [183, 171], rodio: [0, 145] })
    montar('/admin/filtros/acab')
    // O endereço vem num `<span>` à parte (some no celular): a régua é o texto do `<p>` inteiro.
    const linha = (t: string) => screen.queryAllByText((_, el) => el?.tagName === 'P' && el.textContent === t)
    expect(linha('prata-925 · 183 peças na peça toda · 171 marcações por opção')).toHaveLength(1)
    expect(linha('rodio · 145 marcações por opção')).toHaveLength(1)
    // Sem marcação por opção, a frase da 66, intacta.
    expect(linha('folheado-a-ouro · 152 peças marcadas')).toHaveLength(1)
    expect(screen.queryAllByText((_, el) => el?.tagName === 'P' && /(?:^|\s)0 peças marcadas/.test(el.textContent ?? ''))).toEqual([])
  })

  it('remover o grupo diz o que a cascata leva: as duas formas', async () => {
    comContagens({ prata: [183, 171], rodio: [0, 145] })
    montar('/admin/filtros/acab')
    fireEvent.click(screen.getByRole('button', { name: /Remover grupo/ }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).getByText('Saem junto 3 valores e 651 marcações. As peças continuam no catálogo.')).toBeInTheDocument()
  })
})

// Feature 67 (T11, `VFL-35`..`VFL-37`) — o campo de termos no valor em edição.
describe('VFL-35..37 — "Também sugerir quando o texto tiver…"', () => {
  const editar = () => {
    montar('/admin/filtros/acab')
    fireEvent.click(screen.getByRole('button', { name: 'Renomear “Folheado a ouro”' }))
  }

  it('o campo, os dois contadores, e acrescentar grava a lista inteira', async () => {
    const g = cat.groups[0] as AdminFilterGroup
    cat.groups = [{ ...g, values: g.values.map(v => (v.id === 'ouro' ? { ...v, suggest_terms: ['Amarelo'] } : v)) }, ...cat.groups.slice(1)]
    editar()
    const campo = screen.getByLabelText('Também sugerir quando o texto tiver…')
    expect(screen.getByTestId('contador-termos')).toHaveTextContent('1 de 10')
    fireEvent.change(campo, { target: { value: 'Dourado' } })
    expect(screen.getByTestId('contador-termo')).toHaveTextContent('7/40')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Acrescentar' }))
    })
    expect(cat.updateValueTerms).toHaveBeenCalledWith('ouro', ['Amarelo', 'Dourado'])
    expect(campo).toHaveValue('')
  })

  it.each([
    ['', 'Escreva o termo.'],
    ['FOLHEADO a OURO', 'O nome do valor já sugere sozinho.'],
  ])('recusa %j com o motivo, sem gravar, e mantém o que foi digitado', async (termo, frase) => {
    editar()
    const campo = screen.getByLabelText('Também sugerir quando o texto tiver…')
    fireEvent.change(campo, { target: { value: termo } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Acrescentar' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent(frase)
    expect(cat.updateValueTerms).not.toHaveBeenCalled()
    expect(campo).toHaveValue(termo)
  })

  it('o repetido, sem diferenciar acento e caixa', async () => {
    const g = cat.groups[0] as AdminFilterGroup
    cat.groups = [{ ...g, values: g.values.map(v => (v.id === 'ouro' ? { ...v, suggest_terms: ['Dourádo'] } : v)) }, ...cat.groups.slice(1)]
    editar()
    fireEvent.change(screen.getByLabelText('Também sugerir quando o texto tiver…'), { target: { value: 'dourado' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Acrescentar' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Este termo já está na lista.')
  })

  it('tirar um termo grava a lista sem ele', async () => {
    const g = cat.groups[0] as AdminFilterGroup
    cat.groups = [{ ...g, values: g.values.map(v => (v.id === 'ouro' ? { ...v, suggest_terms: ['Amarelo', 'Dourado'] } : v)) }, ...cat.groups.slice(1)]
    editar()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tirar o termo “Amarelo”' }))
    })
    expect(cat.updateValueTerms).toHaveBeenCalledWith('ouro', ['Dourado'])
  })

  it('a fila considera o termo: o "Sugestões (N)" conta o que o termo casa', () => {
    fila.produtos = [{ id: 'd', name: 'Colar Dourado', slug: 'd', is_active: true, base_price: 1, tags: [], category_ids: [],
      thumb: null, options: [], variants: [], filter_value_ids: [], option_marks: [] }]
    montar()
    expect(screen.getByRole('link', { name: 'Sugestões (0)' })).toBeInTheDocument()
    const g = cat.groups[0] as AdminFilterGroup
    cat.groups = [{ ...g, values: g.values.map(v => (v.id === 'ouro' ? { ...v, suggest_terms: ['Dourado'] } : v)) }, ...cat.groups.slice(1)]
    cleanup()
    montar()
    expect(screen.getByRole('link', { name: 'Sugestões (1)' })).toBeInTheDocument()
  })

  it('VFL-36 — sessão CONTÍNUA: acrescentar o termo pela tela faz o "Sugestões (N)" contar a peça nova, sem remontar', async () => {
    // Rodada 2: o caso acima remonta a página (`cleanup()` + `montar()`), e por isso prova o
    // recálculo, não o "sem recarregar". Aqui a página fica montada do começo ao fim: o termo entra
    // pelo campo de verdade, o dublê do catálogo faz o que o hook real faz depois de gravar (relê e
    // publica o catálogo novo), e o número da fila muda na MESMA árvore.
    fila.produtos = [{ id: 'd', name: 'Colar Dourado', slug: 'd', is_active: true, base_price: 1, tags: [], category_ids: [],
      thumb: null, options: [], variants: [], filter_value_ids: [], option_marks: [] }]
    cat.updateValueTerms.mockImplementation(async (valueId: string, termos: string[]) => {
      const g = cat.groups[0] as AdminFilterGroup
      cat.groups = [
        { ...g, values: g.values.map(v => (v.id === valueId ? { ...v, suggest_terms: termos } : v)) },
        ...cat.groups.slice(1),
      ]
      act(() => cat.ouvintes.forEach(f => f()))
      return null
    })
    editar()
    const link = screen.getByRole('link', { name: 'Sugestões (0)' })
    fireEvent.change(screen.getByLabelText('Também sugerir quando o texto tiver…'), { target: { value: 'Dourado' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Acrescentar' }))
    })
    expect(cat.updateValueTerms).toHaveBeenCalledWith('ouro', ['Dourado'])
    await waitFor(() => expect(screen.getByRole('link', { name: 'Sugestões (1)' })).toBeInTheDocument())
    // A MESMA árvore: o nó do link é o de antes do termo, não um remontado.
    expect(screen.getByRole('link', { name: 'Sugestões (1)' })).toBe(link)
  })
})
