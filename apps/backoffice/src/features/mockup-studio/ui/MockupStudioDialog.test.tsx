// PMD-05 AC 1-3 — o estúdio em 1360 px, três colunas, camadas e filmstrip.
//
// A engine de composição é dublada de propósito: canvas real não roda em node (A12), e o que esta
// task entrega é a CASCA. A qualidade visual do composto é UAT manual, declarada — não fingida com
// uma asserção fraca sobre pixels que o jsdom nunca desenhou.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockupTemplate, ProductImage } from '@estrelinha/supabase/types'

const { useMockupsMock, composeMock, loadImageMock, uploadBlobMock } = vi.hoisted(() => ({
  useMockupsMock: vi.fn(),
  composeMock: vi.fn(),
  loadImageMock: vi.fn(),
  uploadBlobMock: vi.fn(),
}))

vi.mock('@estrelinha/core', () => ({
  useMockups: useMockupsMock,
  composeMockup: composeMock,
  loadImage: loadImageMock,
}))
vi.mock('@/features/product-form/lib/uploadProductImage', () => ({ uploadImageBlob: uploadBlobMock }))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import MockupStudioDialog from './MockupStudioDialog'

const template = (over: Partial<MockupTemplate> = {}): MockupTemplate => ({
  id: 'tpl-mao',
  name: 'Na mão',
  background_url: 'https://cdn/mao.jpg',
  overlay_url: 'https://cdn/mao-overlay.png',
  art_zone: { shape: 'circle', cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.2, rotation: 0 },
  blend_mode: 'multiply',
  shading_gain: 1,
  is_active: true,
  sort_order: 0,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00Z',
  ...over,
})

const fakeImage = () =>
  ({ naturalWidth: 800, naturalHeight: 800, width: 800, height: 800 }) as unknown as HTMLImageElement

const galeria: ProductImage[] = [
  { url: 'https://cdn/arte-1.webp', alt: 'Arte original', source: 'upload' },
]

const setup = (templates: MockupTemplate[] = [template()], images: ProductImage[] = galeria) => {
  useMockupsMock.mockReturnValue({ data: templates })
  const onApply = vi.fn()
  const onOpenChange = vi.fn()
  render(
    <MockupStudioDialog
      open
      onOpenChange={onOpenChange}
      images={images}
      productName="Botton Sailor Moon"
      onApply={onApply}
    />,
  )
  return { onApply, onOpenChange }
}

/** Escolhe a arte pelo caminho "usar imagem do produto" — o upload exige um input file. */
const chooseArt = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Usar imagem 1 do produto' }))
  })
}

/** Sempre pela coluna da esquerda: depois de selecionado, o filmstrip repete o nome do template. */
const templateButton = (name: string) =>
  within(screen.getByTestId('studio-source')).getByRole('button', { name: new RegExp(name) })

const selectTemplate = async (name: string) => {
  await act(async () => {
    fireEvent.click(templateButton(name))
  })
}

beforeEach(() => {
  // jsdom não implementa `getContext('2d')`. O palco só compõe quando tem contexto para desenhar —
  // sem este dublê, o efeito sai antes de chamar a engine e o teste mediria o jsdom, não o código.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D)

  useMockupsMock.mockReset()
  composeMock.mockReset().mockReturnValue({
    canvas: document.createElement('canvas'),
    toBlob: async () => new Blob(['x']),
    toDataURL: () => 'data:,',
  })
  loadImageMock.mockReset().mockResolvedValue(fakeImage())
  uploadBlobMock.mockReset().mockResolvedValue('https://cdn/render.webp')
})

describe('MockupStudioDialog — o painel de 1360 px (PMD-05 AC 1)', () => {
  it('abandona `max-w-3xl` e usa a largura do desenho', () => {
    setup()

    const dialog = screen.getByRole('dialog')
    expect(dialog.className).not.toContain('max-w-3xl')
    expect(dialog.className).toContain('w-[1360px]')
  })

  it('monta as três colunas do artboard: origem, palco e ajustes', () => {
    setup()

    expect(screen.getByTestId('studio-source')).toBeInTheDocument()
    expect(screen.getByTestId('studio-stage')).toBeInTheDocument()
    expect(screen.getByTestId('studio-controls')).toBeInTheDocument()
    expect(screen.getByTestId('studio-source').className).toContain('w-[264px]')
    expect(screen.getByTestId('studio-controls').className).toContain('w-[300px]')
  })

  it('o palco compõe na medida do artboard: 452 px para um fundo quadrado', async () => {
    setup()
    await chooseArt()
    await selectTemplate('Na mão')

    // Fundo de 800 px reduzido ao palco: `min(1, 452/800) * zoom 1` ⇒ 452.
    const canvas = await screen.findByTestId('studio-canvas')
    expect((canvas as HTMLCanvasElement).width).toBe(452)
  })
})

describe('MockupStudioDialog — coluna de mockups (PMD-05 AC 2)', () => {
  it('lista os mockups com thumb de 38 px e seleção múltipla', async () => {
    setup([template(), template({ id: 'tpl-mesa', name: 'Na mesa' })])

    const thumbs = [
      templateButton('Na mão').querySelector('img'),
      templateButton('Na mesa').querySelector('img'),
    ]
    expect(thumbs.every(img => img?.className.includes('h-[38px] w-[38px]'))).toBe(true)

    await selectTemplate('Na mão')
    await selectTemplate('Na mesa')

    expect(templateButton('Na mão')).toHaveAttribute('aria-pressed', 'true')
    expect(templateButton('Na mesa')).toHaveAttribute('aria-pressed', 'true')
  })

  it('template sem relevo medido avisa `relevo não medido — sai chapado`', () => {
    setup([template({ shading_gain: 0 })])

    expect(screen.getByText('relevo não medido — sai chapado')).toBeInTheDocument()
  })

  it('template com relevo medido não mostra o aviso', () => {
    setup([template({ shading_gain: 0.8 })])

    expect(screen.queryByText('relevo não medido — sai chapado')).not.toBeInTheDocument()
    expect(screen.getByText('relevo medido')).toBeInTheDocument()
  })

  it('template sem relevo SEGUE renderizável — avisa, não recusa', async () => {
    setup([template({ shading_gain: 0 })])
    await chooseArt()
    await selectTemplate('Na mão')

    // Entra no palco, entra no filmstrip e habilita a ação primária.
    await waitFor(() => expect(screen.getByTestId('studio-canvas')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Aplicar 1 imagens/ })).toBeEnabled()
    expect(within(screen.getByLabelText('Renders')).getByText('com aviso')).toBeInTheDocument()
  })
})

describe('MockupStudioDialog — palco (PMD-05 AC 3)', () => {
  it('mostra as quatro camadas, com Fundo e Arte como fixas', async () => {
    setup()
    await chooseArt()
    await selectTemplate('Na mão')

    const stage = screen.getByTestId('studio-stage')
    expect(within(stage).getByText('Fundo · sempre')).toBeInTheDocument()
    expect(within(stage).getByText('Arte · sempre')).toBeInTheDocument()
    expect(screen.getByLabelText('Camada Relevo')).toBeEnabled()
    expect(screen.getByLabelText('Camada Overlay')).toBeEnabled()
  })

  it('camada Relevo fica desabilitada quando o template não tem relevo medido', async () => {
    setup([template({ shading_gain: 0 })])
    await chooseArt()
    await selectTemplate('Na mão')

    expect(screen.getByLabelText('Camada Relevo')).toBeDisabled()
  })

  it('camada Overlay fica desabilitada quando o template não tem overlay', async () => {
    setup([template({ overlay_url: null })])
    await chooseArt()
    await selectTemplate('Na mão')

    expect(screen.getByLabelText('Camada Overlay')).toBeDisabled()
    expect(screen.getByText(/sem overlay/)).toBeInTheDocument()
  })

  it('desligar o relevo recompõe com `shadingGain: 0` — o engine não é tocado, só o parâmetro', async () => {
    setup()
    await chooseArt()
    await selectTemplate('Na mão')
    await waitFor(() => expect(composeMock).toHaveBeenCalled())
    composeMock.mockClear()

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Camada Relevo'))
    })

    await waitFor(() =>
      expect(composeMock).toHaveBeenCalledWith(expect.objectContaining({ shadingGain: 0 })),
    )
  })

  it('o botão antes/depois alterna para o fundo cru, sem compor', async () => {
    setup()
    await chooseArt()
    await selectTemplate('Na mão')
    await waitFor(() => expect(composeMock).toHaveBeenCalled())
    composeMock.mockClear()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Depois' }))
    })

    expect(screen.getByRole('button', { name: 'Antes' })).toHaveAttribute('aria-pressed', 'true')
    expect(composeMock).not.toHaveBeenCalled()
  })

  it('o zoom muda o percentual exibido', async () => {
    setup()
    await chooseArt()
    await selectTemplate('Na mão')

    expect(screen.getByText('100%')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Aumentar zoom'))
    expect(screen.getByText('125%')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Diminuir zoom'))
    fireEvent.click(screen.getByLabelText('Diminuir zoom'))
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('o filmstrip sai de `compondo` para `pronto` quando o asset carrega', async () => {
    let resolveLoad: (img: HTMLImageElement) => void = () => {}
    loadImageMock.mockImplementation(
      () => new Promise<HTMLImageElement>(resolve => { resolveLoad = resolve }),
    )
    // Sem overlay: um único `loadImage` pendente, e o resolve do teste é o dele.
    setup([template({ overlay_url: null })])

    fireEvent.click(screen.getByRole('button', { name: /Na mão/ }))

    const filmstrip = await screen.findByLabelText('Renders')
    expect(within(filmstrip).getByText('compondo')).toBeInTheDocument()

    await act(async () => {
      resolveLoad(fakeImage())
    })

    await waitFor(() =>
      expect(within(screen.getByLabelText('Renders')).getByText('pronto')).toBeInTheDocument(),
    )
  })

  it('clicar no filmstrip troca o template do palco e o ajuste da direita (T35)', async () => {
    setup([template(), template({ id: 'tpl-mesa', name: 'Na mesa' })])
    await chooseArt()
    await selectTemplate('Na mão')
    await selectTemplate('Na mesa')

    const filmstrip = screen.getByLabelText('Renders')
    const items = within(filmstrip).getAllByRole('button')
    expect(items[1]).toHaveAttribute('aria-pressed', 'true')

    await act(async () => {
      fireEvent.click(items[0])
    })

    expect(within(screen.getByLabelText('Renders')).getAllByRole('button')[0]).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('MockupStudioDialog — saída, ao aplicar e rodapé (PMD-05 AC 4-8)', () => {
  it('o rodapé informa quantidade, resolução, espera e a promessa de nada salvo (AC 7)', async () => {
    setup([template(), template({ id: 'tpl-mesa', name: 'Na mesa' })])
    await chooseArt()
    await selectTemplate('Na mão')
    await selectTemplate('Na mesa')

    expect(
      screen.getByText('2 renders em 1600 px · leva ~3 s · nada é salvo antes de você aplicar'),
    ).toBeInTheDocument()
  })

  it('a ação primária nomeia quantas imagens vão para o produto (AC 7)', async () => {
    setup()
    await chooseArt()
    await selectTemplate('Na mão')

    expect(screen.getByRole('button', { name: 'Aplicar 1 imagens ao produto' })).toBeEnabled()
  })

  it('fechar sem aplicar NÃO grava nada — nem Storage nem `images` (AC 8)', async () => {
    const { onApply, onOpenChange } = setup()
    await chooseArt()
    await selectTemplate('Na mão')
    await waitFor(() => expect(composeMock).toHaveBeenCalled())

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    })

    expect(uploadBlobMock).not.toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('a resolução e o formato escolhidos chegam ao arquivo gravado (AC 5)', async () => {
    setup()
    await chooseArt()
    await selectTemplate('Na mão')

    fireEvent.click(screen.getByRole('button', { name: '2000 px' }))
    fireEvent.click(screen.getByRole('button', { name: 'PNG' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar 1 imagens/ }))
    })

    expect(uploadBlobMock).toHaveBeenCalledWith(expect.any(Blob), {
      maxDimension: 2000,
      format: 'image/png',
    })
  })

  it('`Aplicar a todos` replica o ajuste do palco nos demais selecionados (AC 4)', async () => {
    setup([template(), template({ id: 'tpl-mesa', name: 'Na mesa' })])
    await chooseArt()
    await selectTemplate('Na mão')
    await selectTemplate('Na mesa')

    // O palco está no segundo template; muda a escala só dele.
    const escala = screen.getAllByRole('slider')[0]
    await act(async () => {
      fireEvent.keyDown(escala, { key: 'ArrowRight' })
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Aplicar a todos' }))
    })

    composeMock.mockClear()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar 2 imagens/ }))
    })

    const escalas = composeMock.mock.calls.map(([input]) => input.transform.scale)
    expect(escalas).toEqual([1.05, 1.05])
  })

  it('`Aplicar a todos` fica desabilitado com menos de dois mockups', async () => {
    setup([template(), template({ id: 'tpl-mesa', name: 'Na mesa' })])
    await chooseArt()
    await selectTemplate('Na mão')

    expect(screen.getByRole('button', { name: 'Aplicar a todos' })).toBeDisabled()
  })

  it('aplicar anexa os renders à galeria, com selo de mockup e alt gerado (AC 6)', async () => {
    const { onApply } = setup()
    await chooseArt()
    await selectTemplate('Na mão')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar 1 imagens/ }))
    })

    expect(onApply).toHaveBeenCalledWith([
      { url: 'https://cdn/arte-1.webp', alt: 'Arte original', source: 'upload' },
      { url: 'https://cdn/render.webp', alt: 'Botton Sailor Moon · Na mão', source: 'mockup' },
    ])
  })

  it('`Substituir` troca a galeria em vez de anexar (AC 6)', async () => {
    const { onApply } = setup()
    await chooseArt()
    await selectTemplate('Na mão')

    fireEvent.click(screen.getByRole('button', { name: 'Substituir' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar 1 imagens/ }))
    })

    expect(onApply).toHaveBeenCalledWith([
      { url: 'https://cdn/render.webp', alt: 'Botton Sailor Moon · Na mão', source: 'mockup' },
    ])
  })

  it('desligar `Gerar alt-text` aplica sem alt', async () => {
    const { onApply } = setup()
    await chooseArt()
    await selectTemplate('Na mão')

    fireEvent.click(screen.getByLabelText('Gerar alt-text de cada render'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar 1 imagens/ }))
    })

    expect(onApply.mock.calls[0][0][1]).toEqual({
      url: 'https://cdn/render.webp',
      alt: null,
      source: 'mockup',
    })
  })

  it('`1ª como principal` põe o render na frente da galeria', async () => {
    const { onApply } = setup()
    await chooseArt()
    await selectTemplate('Na mão')

    fireEvent.click(screen.getByLabelText('Definir 1ª como principal'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar 1 imagens/ }))
    })

    expect(onApply.mock.calls[0][0].map((i: ProductImage) => i.url)).toEqual([
      'https://cdn/render.webp',
      'https://cdn/arte-1.webp',
    ])
  })
})
