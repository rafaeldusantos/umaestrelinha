// MOD-02, MOD-04, MOD-07 — o modal Mídia (feature 85, T08).
//
// O modal é controlado como a página o usa: `open` vem de fora e `onOpenChange(false)` o fecha. As
// asserções de MOD-04 são sobre o que o componente FAZ ao fechar — ele nunca chama
// `onImagesChange`/`onVideoUrlChange` —, e a de MOD-07 é por token exato no nó do conteúdo,
// porque jsdom não mede largura.

import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProductImage } from '@estrelinha/supabase/types'
import ProductMediaDialog from './ProductMediaDialog'

const imagens: ProductImage[] = [
  { url: 'https://cdn/a.webp', alt: 'Pingente prateado', source: 'upload' },
  { url: 'https://cdn/b.webp', alt: null, source: 'mockup' },
]

const montar = () => {
  const onImagesChange = vi.fn()
  const onVideoUrlChange = vi.fn()
  const upload = vi.fn()
  const Moldura = () => {
    const [open, setOpen] = useState(true)
    return (
      <>
        <p data-testid="estado">{open ? 'aberto' : 'fechado'}</p>
        <ProductMediaDialog
          open={open}
          onOpenChange={setOpen}
          images={imagens}
          onImagesChange={onImagesChange}
          productName="Pingente Estrela"
          videoUrl="https://youtube.com/watch?v=abc"
          onVideoUrlChange={onVideoUrlChange}
          upload={upload}
          progress={[]}
          uploading={false}
        />
      </>
    )
  }
  render(<Moldura />)
  return { onImagesChange, onVideoUrlChange, upload }
}

/** Token exato: `'max-w-none'.includes('max-w-n')` e afins não podem passar por igualdade. */
const tokens = (el: Element) => el.className.split(/\s+/)

describe('ProductMediaDialog — conteúdo (MOD-02)', () => {
  it('título, subtítulo, a galeria inteira e o campo de vídeo ligado a `video_url`', () => {
    const { onVideoUrlChange } = montar()
    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByRole('heading', { name: 'Mídia' })).toBeInTheDocument()
    expect(
      within(dialog).getByText('Imagens e vídeo do produto. A primeira imagem é a principal.'),
    ).toBeInTheDocument()

    // A galeria de verdade: envio, uma linha por imagem, alt-text, "faltando", Gerar, selo e remover.
    expect(within(dialog).getByLabelText('Enviar imagens')).toBeInTheDocument()
    expect(within(dialog).getAllByTestId('image-tile')).toHaveLength(2)
    expect(within(dialog).getByLabelText('Alt-text da imagem 1')).toHaveValue('Pingente prateado')
    expect(within(dialog).getByText('faltando')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('button', { name: /Gerar$/ })).toHaveLength(2)
    expect(within(dialog).getByText('Mockup')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Remover imagem 2' })).toBeInTheDocument()

    const video = within(dialog).getByLabelText('Vídeo (URL YouTube/Vimeo)')
    expect(video).toHaveValue('https://youtube.com/watch?v=abc')
    expect(video).toHaveAttribute('placeholder', 'https://youtube.com/watch?v=...')
    fireEvent.change(video, { target: { value: 'https://vimeo.com/1' } })
    expect(onVideoUrlChange).toHaveBeenCalledWith('https://vimeo.com/1')
  })

  it('mudança na galeria vai direto ao formulário (sem cópia no modal)', () => {
    const { onImagesChange } = montar()

    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem 1' }))

    expect(onImagesChange).toHaveBeenCalledWith([imagens[1]])
  })

  it('o envio pela galeria usa o `upload` recebido', () => {
    const { upload } = montar()
    const file = new File(['x'], 'nova.png', { type: 'image/png' })

    fireEvent.drop(screen.getByLabelText('Enviar imagens'), { dataTransfer: { files: [file] } })

    expect(upload).toHaveBeenCalledTimes(1)
  })

  it('o rodapé diz onde se grava, tem "Concluir" e NÃO tem "Cancelar"', () => {
    montar()
    const dialog = screen.getByRole('dialog')

    expect(
      within(dialog).getByText('As mudanças entram no formulário. Grave com "Salvar" no topo da página.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Concluir' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Cancelar/i })).not.toBeInTheDocument()
  })
})

describe('ProductMediaDialog — fechar não desfaz nada (MOD-04)', () => {
  it.each([
    ['Concluir', () => fireEvent.click(screen.getByRole('button', { name: 'Concluir' }))],
    ['Esc', () => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })],
    ['o X', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
  ])('fechar por %s fecha o modal e não chama nenhum setter', (_nome, fechar) => {
    const { onImagesChange, onVideoUrlChange, upload } = montar()
    expect(screen.getByTestId('estado')).toHaveTextContent('aberto')

    fechar()

    expect(screen.getByTestId('estado')).toHaveTextContent('fechado')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onImagesChange).not.toHaveBeenCalled()
    expect(onVideoUrlChange).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
  })
})

describe('ProductMediaDialog — tela cheia abaixo de lg (MOD-07)', () => {
  it('o conteúdo leva os tokens de tela cheia, e os do cartão só com `lg:`', () => {
    montar()
    const classes = tokens(screen.getByRole('dialog'))

    // < lg: a tela inteira, sem canto e sem o teto de largura do diálogo padrão.
    for (const t of ['h-[100dvh]', 'w-screen', 'max-w-none', 'rounded-none', 'p-0']) {
      expect(classes).toContain(t)
    }
    // O padrão do `DialogContent` cede (twMerge): sem ele, o modal seria um cartão de 512px.
    for (const t of ['max-w-lg', 'w-full', 'p-6', 'sm:rounded-lg']) {
      expect(classes).not.toContain(t)
    }
    // ≥ lg: cartão de até 940px, com 24px de folga em cima e embaixo.
    for (const t of ['lg:h-auto', 'lg:max-h-[calc(100vh-48px)]', 'lg:max-w-[940px]', 'lg:rounded-2xl']) {
      expect(classes).toContain(t)
    }
    // A trilha de coluna de piso zero do primitivo continua (dialogGridTrack); só as linhas mudam.
    expect(classes).toContain('grid-cols-1')
    expect(classes).toContain('grid-rows-[auto_minmax(0,1fr)_auto]')
  })

  it('o corpo é quem rola; cabeçalho e rodapé ficam', () => {
    montar()
    const corpo = screen.getByTestId('media-dialog-body')

    expect(tokens(corpo)).toContain('overflow-y-auto')
    expect(tokens(corpo)).toContain('min-h-0')
  })

  it('"Concluir", o X e o campo de vídeo têm alvo de 44px (h-11)', () => {
    montar()

    expect(tokens(screen.getByRole('button', { name: 'Concluir' }))).toContain('h-11')
    expect(tokens(screen.getByLabelText('Vídeo (URL YouTube/Vimeo)'))).toContain('h-11')
    // O X é do pacote (`h-4 w-4`); a variante arbitrária no conteúdo o leva a 44px.
    const classes = tokens(screen.getByRole('dialog'))
    expect(classes).toContain('[&>button:last-child]:h-11')
    expect(classes).toContain('[&>button:last-child]:w-11')
    const dialog = screen.getByRole('dialog')
    expect(dialog.lastElementChild).toBe(screen.getByRole('button', { name: 'Close' }))
  })
})
