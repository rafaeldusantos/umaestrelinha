// Feature 66 — `/admin/filtros` (`FLT-01`..`FLT-10`, T08).
//
// A PÁGINA REAL é montada, com `GroupForm` e `ValueList` reais dentro dela. O único dublê é o hook
// do catálogo (`@/entities/filter`), e é ele que este arquivo usa para ver o que a tela pede: o
// hook em si — a régua de `core` antes da rede, os payloads, a releitura — é provado em
// `entities/filter/api/__tests__/useAdminFilterCatalog.test.ts`.
//
// Inventário de `vi.mock` desta página (`L-030`): só `@/entities/filter`. Nada mais é dublado.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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
  deleteValue: vi.fn(),
  reorderGroups: vi.fn(),
  reorderValues: vi.fn(),
}))

vi.mock('@/entities/filter', () => ({ useAdminFilterCatalog: () => cat }))

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
    'deleteValue', 'reorderGroups', 'reorderValues',
  ] as const) cat[k].mockReset()
  cat.createGroup.mockResolvedValue({ error: null, id: 'novo' })
  cat.updateGroup.mockResolvedValue(null)
  cat.deleteGroup.mockResolvedValue(null)
  cat.createValue.mockResolvedValue({ error: null, id: 'v-novo' })
  cat.updateValue.mockResolvedValue(null)
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
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/admin/filtros" element={<><AdminFiltersPage /><Onde /></>} />
        <Route path="/admin/filtros/:groupId" element={<><AdminFiltersPage /><Onde /></>} />
        <Route path="/admin/filtros/:groupId/valores/:valueId" element={<Onde />} />
      </Routes>
    </MemoryRouter>,
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
