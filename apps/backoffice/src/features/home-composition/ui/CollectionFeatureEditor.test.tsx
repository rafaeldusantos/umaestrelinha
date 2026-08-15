// T33 — o editor do destaque em coleção (feature 24, `HOME-37`, `HOME-39`).
//
// Como nos outros editores, os testes rodam pelo CASCO: "a coleção é obrigatória" só se prova
// apertando salvar e vendo que a gravação não aconteceu.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeSection, HomeSectionItem } from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category'

const upload = vi.hoisted(() => ({ uploadHomeImage: vi.fn() }))
vi.mock('../lib/uploadHomeImage', () => upload)

import HomeSectionEditor from './HomeSectionEditor'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory =>
  ({
    slug: over.slug ?? over.id,
    description: null,
    image_url: null,
    banner_url: null,
    color_accent: null,
    active: true,
    sort_order: 0,
    parent_id: null,
    product_count: 0,
    show_in_menu: false,
    menu_promo: null,
    ...over,
  }) as AdminCategory

const CATALOGO: AdminCategory[] = [
  cat({ id: 'leite', name: 'Joias com leite materno', sort_order: 1 }),
  cat({ id: 'cinzas', name: 'Eternize as cinzas', sort_order: 2 }),
  cat({ id: 'black', name: 'Coleção Black Friday', sort_order: 3, active: false }),
]

const item = (over: Partial<HomeSectionItem> = {}): HomeSectionItem => ({
  id: 'i1',
  section_id: 'destaque',
  position: 1,
  category_id: 'leite',
  product_id: null,
  href: null,
  image_url: null,
  alt: null,
  label_snapshot: 'Joias com leite materno',
  ...over,
})

const onSave = vi.fn().mockResolvedValue(null)

const renderEditor = (over: Partial<HomeSection> = {}) => {
  const section: HomeSection = {
    id: 'destaque',
    type: 'collection_feature',
    position: 8,
    active: true,
    config: {},
    ...over,
  }
  return render(
    <HomeSectionEditor
      entry={{
        section,
        renders: true,
        hiddenReason: null,
        items: [],
        droppedCount: 0,
        nestedUnder: null,
      }}
      categories={CATALOGO}
      products={[]}
      saving={false}
      onCancel={vi.fn()}
      onSave={onSave}
    />,
  )
}

const salvar = () => fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
const gravado = () =>
  onSave.mock.calls[0][0] as {
    config: Record<string, unknown>
    items: { category_id: string | null; label_snapshot: string | null }[]
  }

beforeEach(() => {
  vi.clearAllMocks()
  onSave.mockResolvedValue(null)
  upload.uploadHomeImage.mockResolvedValue({ url: 'https://cdn/foto.webp', error: null, warning: null })
})

describe('CollectionFeatureEditor — a coleção é OBRIGATÓRIA (HOME-37)', () => {
  it('sem coleção escolhida, salvar é recusado', async () => {
    renderEditor({ items: [] })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      'Escolha a coleção deste destaque: sem ela a faixa não aparece na loja.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('escolher a coleção grava a FK E o rótulo congelado no mesmo gesto', async () => {
    renderEditor({ items: [] })

    fireEvent.change(screen.getByLabelText('Coleção em destaque'), { target: { value: 'cinzas' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items).toEqual([
      expect.objectContaining({ category_id: 'cinzas', label_snapshot: 'Eternize as cinzas' }),
    ])
  })

  it('coleção apagada é nomeada na recusa, pelo rótulo congelado', async () => {
    renderEditor({ items: [item({ category_id: null, label_snapshot: 'Prata 925' })] })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      'O destino deste item (Prata 925) foi apagado.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('o destaque tem UM item, não uma lista: trocar de coleção não acrescenta linha', async () => {
    renderEditor({ items: [item()] })

    fireEvent.change(screen.getByLabelText('Coleção em destaque'), { target: { value: 'cinzas' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items).toHaveLength(1)
    expect(gravado().items[0].category_id).toBe('cinzas')
  })
})

describe('CollectionFeatureEditor — os campos de texto (HOME-37, HOME-38)', () => {
  it('título, texto e rótulo do botão são gravados no `config`', async () => {
    renderEditor({ items: [item()] })

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'O leite que vira joia' } })
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'Uma peça por vez.' } })
    fireEvent.change(screen.getByLabelText('Botão — texto'), { target: { value: 'Ver a coleção' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().config).toMatchObject({
      title: 'O leite que vira joia',
      text: 'Uma peça por vez.',
      cta_label: 'Ver a coleção',
    })
  })

  it('a tela diz o que acontece com os campos vazios, em vez de semear os textos da coleção', async () => {
    renderEditor({ items: [item()] })

    expect(screen.getByLabelText('Título')).toHaveValue('')
    expect(screen.getByText('Vazio, a loja usa o nome da coleção.')).toBeInTheDocument()
    expect(screen.getByText('Vazio, a loja usa a descrição da coleção.')).toBeInTheDocument()

    // Vazio é estado legítimo: com a coleção escolhida, salva sem título nenhum.
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })
})

describe('CollectionFeatureEditor — a arte (HOME-37, HOME-28)', () => {
  it('a foto enviada entra no `config`, e o `alt` só aparece depois dela', async () => {
    renderEditor({ items: [item()] })

    expect(screen.queryByLabelText('Descrição da imagem')).toBeNull()

    fireEvent.change(screen.getByLabelText('Enviar uma foto'), {
      target: { files: [new File(['x'], 'peca.png', { type: 'image/png' })] },
    })

    expect(await screen.findByTestId('destaque-foto')).toHaveAttribute('src', 'https://cdn/foto.webp')
    expect(screen.getByLabelText('Descrição da imagem')).toBeInTheDocument()
  })

  it('foto sem descrição é recusada ao salvar', async () => {
    renderEditor({ items: [item()], config: { image_url: 'https://cdn/foto.webp', image_alt: '  ' } })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      'Descreva a imagem: quem usa leitor de tela só tem essa descrição.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('falha de envio NÃO escreve no config — a seção não fica com foto pela metade', async () => {
    upload.uploadHomeImage.mockResolvedValue({
      url: null,
      error: 'peca.png: falha ao enviar',
      warning: null,
    })
    renderEditor({ items: [item()] })

    fireEvent.change(screen.getByLabelText('Enviar uma foto'), {
      target: { files: [new File(['x'], 'peca.png', { type: 'image/png' })] },
    })

    expect(await screen.findByTestId('destaque-recado')).toHaveTextContent('falha ao enviar')
    expect(screen.queryByTestId('destaque-foto')).toBeNull()
  })

  it('sem foto própria, a tela diz que entra a arte da coleção', () => {
    renderEditor({ items: [item()] })

    expect(
      screen.getByText('Uma foto da coleção. Sem foto, entra a arte de banner que a coleção já tem.'),
    ).toBeInTheDocument()
  })
})

describe('CollectionFeatureEditor — coleção fora do ar: o painel AVISA (HOME-39)', () => {
  it('coleção desativada em Categorias é nomeada, e o aviso diz a consequência', () => {
    renderEditor({ items: [item({ category_id: 'black', label_snapshot: 'Coleção Black Friday' })] })

    expect(screen.getByTestId('destaque-fora-do-ar')).toHaveTextContent(
      '“Coleção Black Friday” está desativada em Categorias.',
    )
    expect(screen.getByTestId('destaque-fora-do-ar')).toHaveTextContent(
      'este destaque não aparece na loja — o texto e a arte ficam guardados aqui',
    )
  })

  it('coleção apagada também é nomeada, pelo rótulo congelado', () => {
    renderEditor({ items: [item({ category_id: null, label_snapshot: 'Prata 925' })] })

    expect(screen.getByTestId('destaque-fora-do-ar')).toHaveTextContent(
      '“Prata 925” foi apagada em Categorias.',
    )
  })

  it('fora do ar AVISA, não recusa: a dona continua podendo salvar o texto', async () => {
    renderEditor({ items: [item({ category_id: 'black', label_snapshot: 'Coleção Black Friday' })] })

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Volta em novembro' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().config).toMatchObject({ title: 'Volta em novembro' })
  })

  it('a coleção fora do ar NÃO some do seletor — o destaque não troca de coleção sozinho', () => {
    renderEditor({ items: [item({ category_id: 'black', label_snapshot: 'Coleção Black Friday' })] })

    expect(screen.getByLabelText('Coleção em destaque')).toHaveValue('black')
    expect(
      screen.getByRole('option', { name: 'Coleção Black Friday (fora do ar)' }),
    ).toBeInTheDocument()
  })

  it('coleção no ar não produz aviso nenhum', () => {
    renderEditor({ items: [item()] })
    expect(screen.queryByTestId('destaque-fora-do-ar')).toBeNull()
  })
})
