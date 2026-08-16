import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { OptionValues, Product, ProductOption, ProductVariant } from '@estrelinha/supabase/types'
import VariantPicker from '../VariantPicker'
import { PAGE_MAX_AXES } from '../../lib/variantSelection'

/**
 * `PDP-16`..`PDP-23` — o eixo que se escolhe por FOTO na página do produto.
 *
 * A regra pura (quando um eixo qualifica) está em `lib/__tests__/variantSelection.test.ts`. Aqui a
 * régua é a tela: o que é desenhado, o que o leitor de tela lê, e o que acontece ao clicar.
 */

const option = (name: string, values: string[], position = 0): ProductOption => ({
  name,
  values,
  position,
})

let seq = 0
const variant = (option_values: OptionValues, over: Partial<ProductVariant> = {}): ProductVariant =>
  ({
    id: `v${++seq}`,
    product_id: 'p1',
    option_values,
    name: null,
    sku: null,
    price: 100,
    compare_price: null,
    stock: 10,
    weight_kg: null,
    image_url: null,
    is_active: true,
    position: seq,
    ...over,
  }) as ProductVariant

const produto = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    options: [],
    variants: [],
    stock_policy: 'track',
    ...over,
  }) as Product

/** Um eixo com foto por valor — o caso que qualifica. */
const COM_FOTO = produto({
  options: [option('Cor', ['Prata', 'Ouro', 'Ródio'])],
  variants: [
    variant({ Cor: 'Prata' }, { image_url: 'prata.webp' }),
    variant({ Cor: 'Ouro' }, { image_url: 'ouro.webp' }),
    variant({ Cor: 'Ródio' }, { image_url: 'rodio.webp' }),
  ],
})

/** Todas as fotos iguais — o caso `Com gravação`, que NÃO qualifica. */
const FOTO_REPETIDA = produto({
  options: [option('Com gravação', ['Sim', 'Não'])],
  variants: [
    variant({ 'Com gravação': 'Sim' }, { image_url: 'mesma.webp' }),
    variant({ 'Com gravação': 'Não' }, { image_url: 'mesma.webp' }),
  ],
})

const renderPage = (p: Product, selected: OptionValues = {}, onChange = vi.fn()) => {
  const r = render(
    <VariantPicker
      product={p}
      max={PAGE_MAX_AXES}
      surface="page"
      selected={selected}
      onChange={onChange}
    />,
  )
  return { ...r, onChange }
}

describe('VariantPicker página — quando o eixo vira foto (PDP-16, PDP-17)', () => {
  it('eixo qualificado desenha uma foto por valor, e nenhum rótulo na vaga', () => {
    const { container } = renderPage(COM_FOTO)

    expect(container.querySelectorAll('img')).toHaveLength(3)
    // O nome do valor não é desenhado dentro da vaga — ele vai para o cabeçalho.
    expect(screen.queryByText('Prata')).toBeNull()
  })

  it('eixo com todas as fotos iguais continua em pílula com o nome', () => {
    const { container } = renderPage(FOTO_REPETIDA)

    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(screen.getByRole('radio', { name: 'Sim' }).textContent).toBe('Sim')
    expect(screen.getByRole('radio', { name: 'Não' }).textContent).toBe('Não')
  })

  it('eixo sem foto nenhuma continua em pílula', () => {
    const semFoto = produto({
      options: [option('Tamanho', ['P', 'G'])],
      variants: [variant({ Tamanho: 'P' }), variant({ Tamanho: 'G' })],
    })
    const { container } = renderPage(semFoto)

    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(screen.getByRole('radio', { name: 'P' })).toBeInTheDocument()
  })

  it('cada vaga leva a foto do PRÓPRIO valor', () => {
    const { container } = renderPage(COM_FOTO)
    const srcs = Array.from(container.querySelectorAll('img')).map(i => i.getAttribute('src'))

    expect(srcs).toEqual(['prata.webp', 'ouro.webp', 'rodio.webp'])
  })
})

describe('VariantPicker página — o cabeçalho do eixo (PDP-18)', () => {
  it('mostra `<eixo>: <valor escolhido>`', () => {
    // O rótulo chega a 40 caracteres no catálogo real — não cabe sob uma vaga de 56px.
    const { container } = renderPage(COM_FOTO, { Cor: 'Ouro' })

    expect(container.textContent).toContain('Cor:')
    expect(container.textContent).toContain('Ouro')
  })

  it('sem valor escolhido, mostra só o nome do eixo', () => {
    const { container } = renderPage(COM_FOTO)

    expect(container.textContent).toContain('Cor')
    expect(container.textContent).not.toContain('Cor:')
  })

  it('o eixo em pílula NÃO ganha o valor no cabeçalho — o nome já está na vaga', () => {
    const { container } = renderPage(FOTO_REPETIDA, { 'Com gravação': 'Sim' })

    expect(container.textContent).not.toContain('Com gravação:')
  })
})

describe('VariantPicker página — acessibilidade da vaga (PDP-19)', () => {
  it('cada vaga é um `radio` com `aria-label` igual ao valor', () => {
    renderPage(COM_FOTO)

    expect(screen.getByRole('radio', { name: 'Prata' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Ouro' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Ródio' })).toBeInTheDocument()
  })

  it('`aria-checked` reflete a escolha, e só numa vaga', () => {
    renderPage(COM_FOTO, { Cor: 'Ouro' })

    expect(screen.getByRole('radio', { name: 'Ouro' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Prata' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'Ródio' })).toHaveAttribute('aria-checked', 'false')
  })

  it('as vagas ficam dentro do `radiogroup` rotulado pelo eixo', () => {
    const { container } = renderPage(COM_FOTO)
    const grupo = container.querySelector('[role="radiogroup"]')!

    expect(grupo.getAttribute('aria-labelledby')).toBe('axis-Cor')
    expect(grupo.querySelectorAll('[role="radio"]')).toHaveLength(3)
  })

  it('a imagem é decorativa — quem nomeia a vaga é o `aria-label`', () => {
    const { container } = renderPage(COM_FOTO)

    for (const img of Array.from(container.querySelectorAll('img'))) {
      expect(img.getAttribute('alt')).toBe('')
    }
  })
})

describe('VariantPicker página — valor sem foto (PDP-20)', () => {
  const UMA_SEM_FOTO = produto({
    options: [option('Cor', ['Prata', 'Ouro', 'Ródio'])],
    variants: [
      variant({ Cor: 'Prata' }, { image_url: 'prata.webp' }),
      variant({ Cor: 'Ouro' }, { image_url: 'ouro.webp' }),
      variant({ Cor: 'Ródio' }),
    ],
  })

  it('a vaga existe e é escolhível, mas não desenha `<img>`', () => {
    const { container } = renderPage(UMA_SEM_FOTO)

    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(3)
    expect(container.querySelectorAll('img')).toHaveLength(2)
    expect(screen.getByRole('radio', { name: 'Ródio' })).toBeInTheDocument()
  })

  it('a vaga vazia NÃO recebe a foto de outro valor', () => {
    const { container } = renderPage(UMA_SEM_FOTO)
    const vaga = screen.getByRole('radio', { name: 'Ródio' })

    expect(vaga.querySelector('img')).toBeNull()
    // E nenhuma foto aparece duas vezes.
    const srcs = Array.from(container.querySelectorAll('img')).map(i => i.getAttribute('src'))
    expect(new Set(srcs).size).toBe(srcs.length)
  })
})

describe('VariantPicker página — indisponível (PDP-21, PST-08)', () => {
  it('valor sem estoque aparece DESABILITADO, e não escondido', () => {
    const esgotado = produto({
      options: [option('Cor', ['Prata', 'Ouro'])],
      variants: [
        variant({ Cor: 'Prata' }, { image_url: 'prata.webp' }),
        variant({ Cor: 'Ouro' }, { image_url: 'ouro.webp', stock: 0 }),
      ],
    })
    renderPage(esgotado)

    const vaga = screen.getByRole('radio', { name: 'Ouro' })
    expect(vaga).toBeInTheDocument()
    expect(vaga).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Prata' })).not.toBeDisabled()
  })
})

describe('VariantPicker página — a escolha (PDP-22)', () => {
  it('acionar a vaga chama `onChange` com o valor daquela vaga', () => {
    const { onChange } = renderPage(COM_FOTO, { Cor: 'Prata' })

    fireEvent.click(screen.getByRole('radio', { name: 'Ouro' }))

    expect(onChange).toHaveBeenCalledWith({ Cor: 'Ouro' })
  })

  it('a escolha preserva os outros eixos já escolhidos', () => {
    const doisEixos = produto({
      options: [option('Cor', ['Prata', 'Ouro'], 0), option('Tamanho', ['P', 'G'], 1)],
      variants: [
        variant({ Cor: 'Prata', Tamanho: 'P' }, { image_url: 'prata.webp' }),
        variant({ Cor: 'Ouro', Tamanho: 'P' }, { image_url: 'ouro.webp' }),
        variant({ Cor: 'Prata', Tamanho: 'G' }, { image_url: 'prata.webp' }),
        variant({ Cor: 'Ouro', Tamanho: 'G' }, { image_url: 'ouro.webp' }),
      ],
    })
    const { onChange } = renderPage(doisEixos, { Cor: 'Prata', Tamanho: 'G' })

    fireEvent.click(screen.getByRole('radio', { name: 'Ouro' }))

    expect(onChange).toHaveBeenCalledWith({ Cor: 'Ouro', Tamanho: 'G' })
  })
})

describe('VariantPicker página — a marcação da escolhida (PDP-23)', () => {
  it('a vaga escolhida engrossa para 2px em `ink`; as outras ficam em `field`', () => {
    renderPage(COM_FOTO, { Cor: 'Ouro' })

    expect(screen.getByRole('radio', { name: 'Ouro' }).className).toContain(
      'border-2 border-estrelinha-ink',
    )
    expect(screen.getByRole('radio', { name: 'Prata' }).className).toContain(
      'border border-estrelinha-field',
    )
  })

  it('a vaga mede 56px — acima do alvo de toque de 44, que ela satisfaz sozinha', () => {
    renderPage(COM_FOTO)

    // `h-14 w-14` = 56px. Por isso a vaga não usa `TAP_44`, que existe para desenho MENOR que 44.
    const vaga = screen.getByRole('radio', { name: 'Prata' })
    expect(vaga.className).toContain('h-14 w-14')
    expect(vaga.className).not.toContain('before:h-11')
  })
})

describe('VariantPicker — as outras superfícies não mudaram', () => {
  it('`surface="card"` continua em pílula, mesmo com fotos distintas', () => {
    const { container } = render(
      <VariantPicker product={COM_FOTO} max={2} surface="card" selected={{}} onChange={vi.fn()} />,
    )

    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(screen.getByRole('radio', { name: 'Prata' }).textContent).toBe('Prata')
  })

  it('`surface="sheet"` continua em pílula, mesmo com fotos distintas', () => {
    const { container } = render(
      <VariantPicker product={COM_FOTO} max={2} surface="sheet" selected={{}} onChange={vi.fn()} />,
    )

    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(screen.getByRole('radio', { name: 'Ouro' }).textContent).toBe('Ouro')
  })
})
