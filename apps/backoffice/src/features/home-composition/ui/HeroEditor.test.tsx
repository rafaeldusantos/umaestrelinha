// T27 — o editor da chamada principal (feature 24, `HOME-16`..`HOME-20`).
//
// Os testes rodam pelo CASCO (`HomeSectionEditor`) e não pelo corpo solto, porque a recusa mora no
// registro: provar "o `alt` é obrigatório para salvar" exige apertar o botão de salvar de verdade e
// ver que a gravação **não aconteceu**. Um teste do corpo isolado provaria que o campo existe, que
// é outra coisa.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_HOME_COMPOSITION, type HomeSection } from '@estrelinha/core/home'
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
  cat({ id: 'leite', name: 'Joias com leite materno', slug: 'leite-materno', sort_order: 1 }),
  cat({ id: 'cinzas', name: 'Eternize as cinzas', slug: 'cinzas', sort_order: 2 }),
]

const heroBase = DEFAULT_HOME_COMPOSITION.find(s => s.type === 'hero')!

const onSave = vi.fn().mockResolvedValue(null)
const onCancel = vi.fn()

const renderEditor = (over: Partial<HomeSection> = {}) => {
  const section: HomeSection = {
    ...heroBase,
    ...over,
    config: { ...heroBase.config, ...(over.config ?? {}) },
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
      onCancel={onCancel}
      onSave={onSave}
    />,
  )
}

const salvar = () => fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
const configSalvo = () => onSave.mock.calls[0][0].config as Record<string, unknown>

beforeEach(() => {
  vi.clearAllMocks()
  onSave.mockResolvedValue(null)
  upload.uploadHomeImage.mockResolvedValue({ url: 'https://cdn/foto.webp', error: null, warning: null })
})

describe('HeroEditor — os seis campos (HOME-16)', () => {
  it('edita sobretítulo, as duas linhas do título, parágrafo e o rótulo do botão', async () => {
    renderEditor()

    fireEvent.change(screen.getByLabelText('Sobretítulo'), { target: { value: 'Feito à mão' } })
    fireEvent.change(screen.getByLabelText('Título — 1ª linha'), { target: { value: 'A memória dela,' } })
    fireEvent.change(screen.getByLabelText('Título — 2ª linha'), { target: { value: 'no seu colo.' } })
    fireEvent.change(screen.getByLabelText('Parágrafo'), { target: { value: 'Cada peça é única.' } })
    fireEvent.change(screen.getByLabelText('Botão — texto'), { target: { value: 'Quero a minha' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo()).toMatchObject({
      eyebrow: 'Feito à mão',
      title_line1: 'A memória dela,',
      title_line2: 'no seu colo.',
      paragraph: 'Cada peça é única.',
      cta_label: 'Quero a minha',
    })
  })

  it('as duas linhas do título são DOIS campos — a quebra é estrutural, não um enter', () => {
    renderEditor()
    expect(screen.getByLabelText('Título — 1ª linha')).toHaveValue('O que você ama,')
    expect(screen.getByLabelText('Título — 2ª linha')).toHaveValue('eternizado em joia.')
  })

  it('o destino do botão oferece as coleções pelo caminho canônico da loja', async () => {
    renderEditor()

    fireEvent.change(screen.getByLabelText('Botão — destino'), { target: { value: '/leite-materno' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo()).toMatchObject({ cta_href: '/leite-materno' })
  })

  it('“Outro endereço da loja…” abre o campo livre', async () => {
    renderEditor({ config: { cta_href: '' } })

    fireEvent.change(screen.getByLabelText('Botão — destino'), { target: { value: '__outro' } })
    fireEvent.change(screen.getByLabelText('Endereço do botão'), { target: { value: '/como-enviar' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo()).toMatchObject({ cta_href: '/como-enviar' })
  })
})

describe('HeroEditor — o destino é recusado ao salvar, dizendo o problema (HOME-20)', () => {
  it('endereço de infraestrutura não chega à loja e é recusado — nada é gravado', async () => {
    renderEditor({ config: { cta_href: '/assets/banner.png' } })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      '“/assets” é reservado da infraestrutura e não chega à loja',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('endereço fora da loja é recusado dizendo que precisa começar com “/”', async () => {
    renderEditor({ config: { cta_href: 'https://instagram.com/umaestrelinha' } })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      'O endereço precisa começar com “/”',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('o destino de hoje (`/busca`) passa', async () => {
    renderEditor()
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo()).toMatchObject({ cta_href: '/busca' })
  })
})

describe('HeroEditor — o `alt` é obrigatório para salvar (HOME-18)', () => {
  it('com foto e sem descrição, salvar é RECUSADO e nada vai para o banco', async () => {
    renderEditor({ config: { image_url: 'https://cdn/foto.webp', image_alt: '' } })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      'Descreva a imagem: quem usa leitor de tela só tem essa descrição.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('descrição só com espaço em branco conta como vazia', async () => {
    renderEditor({ config: { image_url: 'https://cdn/foto.webp', image_alt: '   ' } })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent('Descreva a imagem')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('com foto e descrição preenchida, salva', async () => {
    renderEditor({ config: { image_url: 'https://cdn/foto.webp' } })

    fireEvent.change(screen.getByLabelText('Descrição da imagem *'), {
      target: { value: 'Pingente de resina com leite materno' },
    })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo()).toMatchObject({ image_alt: 'Pingente de resina com leite materno' })
  })

  it('SEM foto, a descrição vazia não é cobrada — não há imagem para descrever', async () => {
    renderEditor()
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })
})

describe('HeroEditor — a foto (HOME-17, HOME-19, HOME-28)', () => {
  it('sem foto, a tela diz que entra a arte da marca e não oferece "Remover foto"', () => {
    renderEditor()
    expect(screen.queryByTestId('hero-foto')).toBeNull()
    expect(screen.getByText('Sem foto, entra a arte da marca')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remover foto/ })).toBeNull()
  })

  it('enviar uma foto grava a URL no rascunho', async () => {
    renderEditor()

    fireEvent.change(screen.getByLabelText('Enviar uma foto'), {
      target: { files: [new File(['x'], 'peca.png', { type: 'image/png' })] },
    })

    expect(await screen.findByTestId('hero-foto')).toHaveAttribute('src', 'https://cdn/foto.webp')
  })

  it('falha de envio NÃO grava nada no rascunho, e diz o motivo (HOME-28)', async () => {
    upload.uploadHomeImage.mockResolvedValue({
      url: null,
      error: 'peca.png: falha ao enviar',
      warning: null,
    })
    renderEditor()

    fireEvent.change(screen.getByLabelText('Enviar uma foto'), {
      target: { files: [new File(['x'], 'peca.png', { type: 'image/png' })] },
    })

    expect(await screen.findByTestId('hero-recado-arte')).toHaveTextContent('peca.png: falha ao enviar')
    // A seção não fica com foto pela metade: nenhuma imagem entrou no rascunho.
    expect(screen.queryByTestId('hero-foto')).toBeNull()
  })

  it('remover a foto volta à arte da marca — e é isso que vai para o banco', async () => {
    renderEditor({ config: { image_url: 'https://cdn/foto.webp', image_alt: 'Pingente' } })

    fireEvent.click(screen.getByRole('button', { name: /Remover foto/ }))

    expect(screen.queryByTestId('hero-foto')).toBeNull()
    expect(screen.getByText('Sem foto, entra a arte da marca')).toBeInTheDocument()

    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo()).toMatchObject({ image_url: null, image_alt: null })
  })

  it('a medida recomendada sai de `core/home`, não da tela', () => {
    renderEditor()
    expect(screen.getByText('1200 × 890 px')).toBeInTheDocument()
  })
})
