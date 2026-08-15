// T28 — o editor da grade de banners (feature 24, `HOME-22`..`HOME-24`, `HOME-27`, `HOME-30`).
//
// Como no editor do hero, os testes rodam pelo CASCO: "cada banner exige imagem, `alt` e destino
// **para salvar**" só se prova apertando salvar e vendo que a gravação não aconteceu.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_HOME_COMPOSITION,
  layoutSlots,
  type HomeSection,
  type HomeSectionItem,
} from '@estrelinha/core/home'
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

const CATALOGO = [
  cat({ id: 'leite', name: 'Joias com leite materno', sort_order: 1 }),
  cat({ id: 'cinzas', name: 'Eternize as cinzas', sort_order: 2 }),
]
const PRODUTOS = [{ id: 'prod-1', name: 'Pingente Gota' }]

const gradeBase = DEFAULT_HOME_COMPOSITION.find(s => s.type === 'banner_grid')!

const item = (over: Partial<HomeSectionItem> = {}): HomeSectionItem => ({
  id: 'i1',
  section_id: 'banner_grid',
  position: 1,
  category_id: 'leite',
  product_id: null,
  href: null,
  image_url: 'https://cdn/arte.webp',
  alt: 'Campanha de outono',
  label_snapshot: 'Joias com leite materno',
  ...over,
})

const onSave = vi.fn().mockResolvedValue(null)

const renderEditor = (over: Partial<HomeSection> = {}) => {
  const section: HomeSection = {
    ...gradeBase,
    ...over,
    config: { ...gradeBase.config, ...(over.config ?? {}) },
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
      products={PRODUTOS}
      saving={false}
      onCancel={vi.fn()}
      onSave={onSave}
    />,
  )
}

const salvar = () => fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
const gravado = () => onSave.mock.calls[0][0] as { config: Record<string, unknown>; items: unknown[] }

beforeEach(() => {
  vi.clearAllMocks()
  onSave.mockResolvedValue(null)
  upload.uploadHomeImage.mockResolvedValue({ url: 'https://cdn/nova.webp', error: null, warning: null })
})

describe('BannerGridEditor — o arranjo manda nas vagas (HOME-22, emenda E3)', () => {
  it('oferece os quatro arranjos e grava o escolhido', async () => {
    renderEditor()

    for (const rotulo of ['1 imagem', '2 lado a lado', '1 grande + 2', '4 em fila']) {
      expect(screen.getByRole('button', { name: rotulo })).toBeInTheDocument()
    }

    fireEvent.click(screen.getByRole('button', { name: '4 em fila' }))
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().config).toMatchObject({ layout: 'quad' })
  })

  it('o número de vagas sai de `layoutSlots`, não de um número na tela', () => {
    renderEditor({ config: { layout: 'quad' } })
    expect(screen.getByTestId('contador-banners')).toHaveTextContent(`0 de ${layoutSlots('quad')}`)

    fireEvent.click(screen.getByRole('button', { name: '1 imagem' }))
    expect(screen.getByTestId('contador-banners')).toHaveTextContent(`0 de ${layoutSlots('single')}`)
  })

  it('acrescenta banners até o teto do arranjo, e aí para de oferecer', () => {
    renderEditor({ config: { layout: 'pair' } })

    fireEvent.click(screen.getByRole('button', { name: /Acrescentar o 1º banner/ }))
    fireEvent.click(screen.getByRole('button', { name: /Acrescentar o 2º banner/ }))

    expect(screen.getByTestId('contador-banners')).toHaveTextContent('2 de 2')
    expect(screen.queryByRole('button', { name: /Acrescentar/ })).toBeNull()
  })

  it('banner que não cabe no arranjo escolhido é DENUNCIADO, não descartado em silêncio', () => {
    renderEditor({ config: { layout: 'single' }, items: [item(), item({ id: 'i2' })] })

    expect(screen.getByTestId('banner-excedente')).toHaveTextContent(
      'Este arranjo desenha 1 banner: 1 não vão aparecer na loja.',
    )
  })
})

describe('BannerGridEditor — imagem, alt e destino são exigidos PARA SALVAR (HOME-22)', () => {
  it('banner sem arte é recusado, dizendo qual', async () => {
    renderEditor({ items: [item({ image_url: null, label_snapshot: null })] })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      '1º banner: envie a arte. Sem imagem não há banner.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('banner sem destino é recusado', async () => {
    renderEditor({ items: [item({ category_id: null, label_snapshot: null })] })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      '1º banner: Escolha o destino: uma coleção, um produto ou um caminho da loja.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('banner sem descrição é recusado — imagem sem `alt` é a página muda no leitor de tela', async () => {
    renderEditor({ items: [item({ alt: '   ' })] })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      '1º banner: Descreva a imagem: quem usa leitor de tela só tem essa descrição.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('a recusa nomeia o banner certo quando há mais de um', async () => {
    renderEditor({ items: [item(), item({ id: 'i2', alt: '' })] })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent('2º banner: Descreva a imagem')
  })

  it('completo, salva', async () => {
    renderEditor({ items: [item()] })
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })

  it('grade SEM banner próprio é legítima: não é recusa, é a derivação por Categorias (HOME-25)', async () => {
    renderEditor()

    expect(screen.getByTestId('banner-sem-proprio')).toHaveTextContent(
      'Sem banner próprio, quem manda é Categorias.',
    )
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items).toEqual([])
  })
})

describe('BannerGridEditor — exatamente UM destino fica gravado (HOME-23)', () => {
  it('escolher uma coleção grava `category_id` e zera os outros dois', async () => {
    renderEditor({ items: [item({ category_id: null, href: '/antigo', label_snapshot: null })] })

    fireEvent.change(screen.getByLabelText('Leva para'), { target: { value: 'cat:cinzas' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items[0]).toMatchObject({
      category_id: 'cinzas',
      product_id: null,
      href: null,
      // O rótulo é congelado NA ESCOLHA: depois do `set null` não há de onde lê-lo.
      label_snapshot: 'Eternize as cinzas',
    })
  })

  it('escolher um PRODUTO grava `product_id` — e é o destino que a emenda E5 fez renderizar', async () => {
    renderEditor({ items: [item({ category_id: null, label_snapshot: null })] })

    fireEvent.change(screen.getByLabelText('Leva para'), { target: { value: 'prod:prod-1' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items[0]).toMatchObject({
      category_id: null,
      product_id: 'prod-1',
      href: null,
      label_snapshot: 'Pingente Gota',
    })
  })

  it('“Outro endereço da loja…” grava o caminho e zera as duas FKs', async () => {
    renderEditor({ items: [item()] })

    fireEvent.change(screen.getByLabelText('Leva para'), { target: { value: '__outro' } })
    fireEvent.change(screen.getByLabelText('Endereço do banner'), {
      target: { value: '/como-enviar' },
    })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(gravado().items[0]).toMatchObject({
      category_id: null,
      product_id: null,
      href: '/como-enviar',
    })
  })
})

describe('BannerGridEditor — destino perdido (HOME-24)', () => {
  it('diz QUAL destino se perdeu, pelo rótulo congelado', () => {
    renderEditor({ items: [item({ category_id: null, label_snapshot: 'Prata 925' })] })

    expect(screen.getByTestId('banner-perdido-0')).toHaveTextContent('“Prata 925” foi apagado.')
    expect(screen.getByTestId('banner-perdido-0')).toHaveTextContent(
      'não aparece na loja — a arte fica guardada aqui',
    )
  })

  it('a arte continua guardada: a imagem segue na tela', () => {
    renderEditor({ items: [item({ category_id: null, label_snapshot: 'Prata 925' })] })

    expect(screen.getByTestId('banner-arte-0')).toHaveAttribute('src', 'https://cdn/arte.webp')
  })

  it('banner que nunca teve destino não é "perdido" — é "ainda não escolhi"', () => {
    renderEditor({ items: [item({ category_id: null, label_snapshot: null })] })
    expect(screen.queryByTestId('banner-perdido-0')).toBeNull()
  })
})

describe('BannerGridEditor — a proporção avisa, nunca recorta (HOME-27, HOME-28)', () => {
  it('mostra o tamanho recomendado em px de cada vaga do arranjo', () => {
    renderEditor({ config: { layout: 'hero_pair' }, items: [item(), item({ id: 'i2' })] })

    // A vaga grande e a de apoio de `hero_pair` têm proporções diferentes, e é por vaga que o aviso
    // faz sentido. As medidas saem de `layoutRatios`, não da tela.
    expect(screen.getByText('1176 × 1020 px')).toBeInTheDocument()
    expect(screen.getByText('1176 × 486 px')).toBeInTheDocument()
  })

  it('arte fora da proporção avisa E sobe assim mesmo — o corte é decisão da dona', async () => {
    upload.uploadHomeImage.mockResolvedValue({
      url: 'https://cdn/nova.webp',
      error: null,
      warning: 'Esta arte é 1:1 e a vaga é 2,42:1 — o tamanho recomendado é 1176 × 486 px.',
    })
    renderEditor({ items: [item({ image_url: null })] })

    fireEvent.change(screen.getByLabelText('Arte do 1º banner'), {
      target: { files: [new File(['x'], 'quadrada.png', { type: 'image/png' })] },
    })

    expect(await screen.findByTestId('banner-recado-0')).toHaveTextContent(
      'o tamanho recomendado é 1176 × 486 px',
    )
    expect(await screen.findByTestId('banner-arte-0')).toHaveAttribute('src', 'https://cdn/nova.webp')
  })

  it('falha de envio NÃO escreve no rascunho — a seção não fica com banner pela metade', async () => {
    upload.uploadHomeImage.mockResolvedValue({
      url: null,
      error: 'quadrada.png: falha ao enviar',
      warning: null,
    })
    renderEditor({ items: [item({ image_url: null })] })

    fireEvent.change(screen.getByLabelText('Arte do 1º banner'), {
      target: { files: [new File(['x'], 'quadrada.png', { type: 'image/png' })] },
    })

    expect(await screen.findByTestId('banner-recado-0')).toHaveTextContent('falha ao enviar')
    expect(screen.queryByTestId('banner-arte-0')).toBeNull()
  })
})
