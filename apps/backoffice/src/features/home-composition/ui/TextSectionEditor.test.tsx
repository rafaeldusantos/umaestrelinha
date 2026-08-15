// T29 — o editor das seções de texto (feature 24, `HOME-41`..`HOME-44`).
//
// A AC mais importante deste arquivo é uma AUSÊNCIA: a faixa de vantagens **não** ganha campo de
// texto. É a classe de falha que a `MarqueeBar` já produziu nesta loja — a tela prometendo "Parcele
// em 12×" enquanto o caixa cobrava 6 — e a única prova possível é procurar o campo e não achar.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_HOME_COMPOSITION,
  sectionMeta,
  type HomeSection,
  type HomeSectionType,
} from '@estrelinha/core/home'

vi.mock('../lib/uploadHomeImage', () => ({ uploadHomeImage: vi.fn() }))

import HomeSectionEditor from './HomeSectionEditor'

const onSave = vi.fn().mockResolvedValue(null)

const renderEditor = (type: HomeSectionType, over: Partial<HomeSection> = {}) => {
  const base = DEFAULT_HOME_COMPOSITION.find(s => s.type === type)!
  const section: HomeSection = {
    ...base,
    ...over,
    config: { ...base.config, ...(over.config ?? {}) },
  }
  return render(
    <MemoryRouter>
      <HomeSectionEditor
        entry={{
          section,
          renders: true,
          hiddenReason: null,
          items: [],
          droppedCount: 0,
          nestedUnder: null,
        }}
        categories={[]}
        products={[]}
        saving={false}
        onCancel={vi.fn()}
        onSave={onSave}
      />
    </MemoryRouter>,
  )
}

const salvar = () => fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
const configSalvo = () => onSave.mock.calls[0][0].config as Record<string, unknown>

beforeEach(() => {
  vi.clearAllMocks()
  onSave.mockResolvedValue(null)
})

describe('TextSectionEditor — a faixa institucional (HOME-43)', () => {
  it('edita sobretítulo, título, texto e a assinatura de quem faz', async () => {
    renderEditor('brand_statement')

    fireEvent.change(screen.getByLabelText('Sobretítulo'), { target: { value: 'Uma por vez' } })
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Cada joia é uma memória' } })
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'Feito à mão em resina.' } })
    fireEvent.change(screen.getByLabelText('Assinatura — nome'), { target: { value: 'Adri Muniz' } })
    fireEvent.change(screen.getByLabelText('Assinatura — o que faz'), {
      target: { value: 'artesã · POA' },
    })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo()).toMatchObject({
      eyebrow: 'Uma por vez',
      title: 'Cada joia é uma memória',
      paragraph: 'Feito à mão em resina.',
      author_name: 'Adri Muniz',
      author_role: 'artesã · POA',
    })
  })

  it('edita o rótulo e o destino do link de escape', async () => {
    renderEditor('brand_statement')

    fireEvent.change(screen.getByLabelText('Link — texto'), { target: { value: 'Conheça o ateliê' } })
    fireEvent.change(screen.getByLabelText('Link — destino'), { target: { value: '/sobre' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo()).toMatchObject({ link_label: 'Conheça o ateliê', link_href: '/sobre' })
  })

  it('destino que a loja não serve é recusado ao salvar', async () => {
    renderEditor('brand_statement', { config: { link_href: 'sobre' } })

    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      'O endereço precisa começar com “/”',
    )
    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('TextSectionEditor — os chips de tema e o limite (HOME-41, HOME-42)', () => {
  it('edita título, subtítulo e o link de "ver todos"', async () => {
    renderEditor('trending_tags')

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Explore por material' } })
    fireEvent.change(screen.getByLabelText('Subtítulo'), { target: { value: 'Direto ao ponto' } })
    fireEvent.change(screen.getByLabelText('Link — texto'), { target: { value: 'Ver tudo' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo()).toMatchObject({
      title: 'Explore por material',
      subtitle: 'Direto ao ponto',
      link_label: 'Ver tudo',
      link_href: '/busca',
    })
  })

  it('a faixa aceita sai de `sectionMeta`, não de dois números digitados na tela', () => {
    renderEditor('trending_tags')
    const faixa = sectionMeta('trending_tags')!.limit!

    const campo = screen.getByLabelText('Quantos itens mostrar')
    expect(campo).toHaveAttribute('min', String(faixa.min))
    expect(campo).toHaveAttribute('max', String(faixa.max))
    expect(screen.getByText(`De ${faixa.min} a ${faixa.max}. Deixe vazio para não cortar.`)).toBeInTheDocument()
  })

  it('limite dentro da faixa é gravado como NÚMERO', async () => {
    renderEditor('trending_tags')

    fireEvent.change(screen.getByLabelText('Quantos itens mostrar'), { target: { value: '6' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo().limit).toBe(6)
  })

  it('limite acima do teto é RECUSADO na tela, dizendo a faixa', async () => {
    renderEditor('trending_tags')

    fireEvent.change(screen.getByLabelText('Quantos itens mostrar'), { target: { value: '99' } })
    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent(
      '“Chips de tema” aceita de 1 a 24 itens.',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('limite abaixo do piso também é recusado', async () => {
    renderEditor('trending_tags')

    fireEvent.change(screen.getByLabelText('Quantos itens mostrar'), { target: { value: '0' } })
    salvar()

    expect(await screen.findByTestId('editor-recusa')).toHaveTextContent('aceita de 1 a 24 itens')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('limite vazio vira `null` — "sem corte", nunca `0`', async () => {
    renderEditor('trending_tags')

    fireEvent.change(screen.getByLabelText('Quantos itens mostrar'), { target: { value: '' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo().limit).toBeNull()
  })
})

describe('TextSectionEditor — a newsletter', () => {
  it('edita título, subtítulo e o texto do botão', async () => {
    renderEditor('newsletter')

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Novidades do ateliê' } })
    fireEvent.change(screen.getByLabelText('Botão — texto'), { target: { value: 'Quero receber' } })
    salvar()

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(configSalvo()).toMatchObject({ title: 'Novidades do ateliê', cta_label: 'Quero receber' })
  })

  it('não tem link de "ver todos": o botão dela abre o cadastro ali mesmo', () => {
    renderEditor('newsletter')
    expect(screen.queryByLabelText('Link — destino')).toBeNull()
  })

  it('não tem limite: não é uma seção de lista', () => {
    renderEditor('newsletter')
    expect(screen.queryByLabelText('Quantos itens mostrar')).toBeNull()
  })
})

describe('TextSectionEditor — a faixa de vantagens NÃO ganha campo de texto (HOME-44)', () => {
  it('nenhum campo de texto, nenhum campo de número — a ausência é a regra', () => {
    renderEditor('trust_bar')

    expect(screen.queryByLabelText('Título')).toBeNull()
    expect(screen.queryByLabelText('Subtítulo')).toBeNull()
    expect(screen.queryByLabelText('Quantos itens mostrar')).toBeNull()
    // Nem por acidente: o corpo do editor não desenha caixa de digitação nenhuma.
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
  })

  it('a tela DIZ onde o número mora, em vez de deixar a dona procurar', () => {
    renderEditor('trust_bar')

    expect(screen.getByText('Esta faixa não tem texto para escrever aqui.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Configurações' })
    expect(link).toHaveAttribute('href', '/admin/configuracoes')
  })

  it('explica o porquê: é a mesma fonte que o caixa cobra', () => {
    renderEditor('trust_bar')
    expect(screen.getByText(/a mesma fonte que o caixa cobra/)).toBeInTheDocument()
  })
})
