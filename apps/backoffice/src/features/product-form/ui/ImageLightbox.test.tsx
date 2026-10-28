// Feature 85 — o visualizador das imagens (ZOM-02..06 e o edge case "imagem removida").
//
// O foco de volta (ZOM-05) é provado pela composição real: um botão de origem que, ao ser
// clicado, abre o visualizador — o mesmo papel da imagem do Resumo. Sem ele, "o foco volta" seria
// verdadeiro sobre nada.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ProductImage } from '@estrelinha/supabase/types'
import { SWIPE_PX } from '../model/mediaSummary'
import ImageLightbox from './ImageLightbox'

const img = (n: number, alt: string | null = null): ProductImage => ({
  url: `https://cdn/foto-${n}.webp`,
  alt,
  source: 'upload',
})

const TRES = [img(1, 'Pingente de leite materno'), img(2), img(3, 'Verso gravado')]

/** A composição real: um botão que abre o visualizador num índice, como a imagem do Resumo. */
function Origem({ images, abreEm = 0, onClose }: { images: ProductImage[]; abreEm?: number; onClose?: () => void }) {
  const [index, setIndex] = useState<number | null>(null)
  return (
    <>
      <button type="button" onClick={() => setIndex(abreEm)}>
        Ampliar imagem {abreEm + 1} de {images.length}
      </button>
      <ImageLightbox
        images={images}
        index={index}
        onIndexChange={setIndex}
        onClose={() => {
          onClose?.()
          setIndex(null)
        }}
      />
    </>
  )
}

const abrir = (images = TRES, abreEm = 0, onClose?: () => void) => {
  render(<Origem images={images} abreEm={abreEm} onClose={onClose} />)
  const origem = screen.getByRole('button', { name: `Ampliar imagem ${abreEm + 1} de ${images.length}` })
  origem.focus()
  fireEvent.click(origem)
  return origem
}

const contador = () => screen.getByText(/^\d+ \/ \d+$/)
const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)

// jsdom 20 não tem `PointerEvent`: o `fireEvent.pointerDown` perderia o `clientX`. Um `MouseEvent`
// com o tipo do ponteiro carrega a coordenada, e o React o entrega ao `onPointerDown`.
const arrastar = (dx: number) => {
  const palco = screen.getByTestId('lightbox-palco')
  act(() => {
    palco.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 200 }))
    palco.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 200 + dx }))
  })
}

describe('ImageLightbox — ZOM-02: a imagem inteira, o contador e o alt', () => {
  it('abre no índice dado, com o contador "n / N" numa região viva', () => {
    abrir(TRES, 1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(contador()).toHaveTextContent('2 / 3')
    expect(contador()).toHaveAttribute('aria-live', 'polite')
  })

  it('a imagem é inteira (object-contain) e é a do índice', () => {
    abrir(TRES, 2)
    const foto = screen.getByRole('img', { name: 'Verso gravado' })
    expect(foto.getAttribute('src')).toContain('foto-3')
    expect(tokens(foto)).toContain('object-contain')
  })

  it('mostra o alt-text embaixo quando há', () => {
    abrir(TRES, 0)
    expect(screen.getByText('Pingente de leite materno', { selector: 'p' })).toBeInTheDocument()
  })

  it('alt vazio (ou só espaço) não desenha texto embaixo', () => {
    abrir([img(1, null), img(2, '   ')], 0)
    const palco = screen.getByTestId('lightbox-palco')
    // Só o contador sobra como parágrafo.
    const paragrafos = Array.from(palco.querySelectorAll('p')).map(p => p.textContent)
    expect(paragrafos).toEqual(['1 / 2'])
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(Array.from(palco.querySelectorAll('p')).map(p => p.textContent)).toEqual(['2 / 2'])
  })
})

describe('ImageLightbox — ZOM-03: anterior, próxima e o laço', () => {
  it('"Próxima" avança e, na última, volta à primeira', () => {
    abrir(TRES, 1)
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(contador()).toHaveTextContent('3 / 3')
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(contador()).toHaveTextContent('1 / 3')
  })

  it('"Anterior" recua e, na primeira, vai à última', () => {
    abrir(TRES, 1)
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(contador()).toHaveTextContent('1 / 3')
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(contador()).toHaveTextContent('3 / 3')
  })

  it('→ e ← fazem o mesmo, com o laço nos dois sentidos', () => {
    abrir(TRES, 2)
    const dialogo = screen.getByRole('dialog')
    fireEvent.keyDown(dialogo, { key: 'ArrowRight' })
    expect(contador()).toHaveTextContent('1 / 3')
    fireEvent.keyDown(dialogo, { key: 'ArrowLeft' })
    expect(contador()).toHaveTextContent('3 / 3')
    fireEvent.keyDown(dialogo, { key: 'ArrowLeft' })
    expect(contador()).toHaveTextContent('2 / 3')
  })

  it('com uma imagem só, as setas não aparecem e as teclas não fazem nada', () => {
    abrir([img(1, 'Única')], 0)
    expect(screen.queryByRole('button', { name: 'Próxima' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Anterior' })).toBeNull()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'ArrowRight' })
    expect(contador()).toHaveTextContent('1 / 1')
  })
})

describe('ImageLightbox — ZOM-04: o gesto de arrastar', () => {
  it('o limiar é o da spec: 48px', () => {
    expect(SWIPE_PX).toBe(48)
  })

  it('49px para a esquerda troca para a próxima; 49px para a direita, para a anterior', () => {
    abrir(TRES, 1)
    arrastar(-49)
    expect(contador()).toHaveTextContent('3 / 3')
    arrastar(49)
    expect(contador()).toHaveTextContent('2 / 3')
  })

  it('47px não troca, nos dois sentidos — e 48 exatos também não ("mais de 48")', () => {
    abrir(TRES, 1)
    arrastar(-47)
    expect(contador()).toHaveTextContent('2 / 3')
    arrastar(47)
    expect(contador()).toHaveTextContent('2 / 3')
    arrastar(-48)
    expect(contador()).toHaveTextContent('2 / 3')
  })

  it('soltar o arrasto sobre o fundo não fecha o visualizador', () => {
    const onClose = vi.fn()
    abrir(TRES, 0, onClose)
    const palco = screen.getByTestId('lightbox-palco')
    arrastar(-60)
    fireEvent.click(palco)
    expect(onClose).not.toHaveBeenCalled()
    expect(contador()).toHaveTextContent('2 / 3')
  })
})

describe('ImageLightbox — ZOM-05: fechar devolve o foco à imagem que abriu', () => {
  it('Esc fecha e o foco volta ao botão de origem', async () => {
    const origem = abrir(TRES, 1)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    // O Radix devolve o foco num `setTimeout(0)` depois de desmontar o conteúdo.
    await waitFor(() => expect(document.activeElement).toBe(origem))
  })

  it('"Fechar" fecha e o foco volta ao botão de origem', async () => {
    const origem = abrir(TRES, 0)
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    // O Radix devolve o foco num `setTimeout(0)` depois de desmontar o conteúdo.
    await waitFor(() => expect(document.activeElement).toBe(origem))
  })

  it('clique no fundo fecha e o foco volta; clique na imagem não fecha', async () => {
    const origem = abrir(TRES, 0)
    fireEvent.click(screen.getByRole('img'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('lightbox-palco'))
    expect(screen.queryByRole('dialog')).toBeNull()
    // O Radix devolve o foco num `setTimeout(0)` depois de desmontar o conteúdo.
    await waitFor(() => expect(document.activeElement).toBe(origem))
  })

  it('o "Close" em inglês do pacote não é o controle de fechar: só "Fechar" é visível', () => {
    abrir(TRES, 0)
    const close = screen.getByRole('button', { name: 'Close' })
    expect(tokens(close.parentElement!)).toContain('[&>button:last-child]:hidden')
    expect(close.parentElement!.lastElementChild).toBe(close)
  })
})

describe('ZOM-06: alvo de toque de 44px', () => {
  it.each(['Anterior', 'Próxima', 'Fechar'])('"%s" tem h-11 e w-11', nome => {
    abrir(TRES, 0)
    const botao = screen.getByRole('button', { name: nome })
    expect(tokens(botao)).toEqual(expect.arrayContaining(['h-11', 'w-11']))
  })
})

describe('edge case: a imagem aberta foi removida', () => {
  it('index >= images.length ⇒ chama onClose e não desenha nada', () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={TRES} index={3} onIndexChange={vi.fn()} onClose={onClose} />)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('a lista encolhe com o visualizador aberto na última ⇒ fecha', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <ImageLightbox images={TRES} index={2} onIndexChange={vi.fn()} onClose={onClose} />,
    )
    expect(onClose).not.toHaveBeenCalled()
    rerender(<ImageLightbox images={TRES.slice(0, 2)} index={2} onIndexChange={vi.fn()} onClose={onClose} />)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('index null ⇒ fechado, sem chamar onClose', () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={TRES} index={null} onIndexChange={vi.fn()} onClose={onClose} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })
})
