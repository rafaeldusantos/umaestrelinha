import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import ImageZoom from '../ImageZoom'

/**
 * Feature 87 — o zoom do palco no computador amplia uma foto de 1600px, e só a pede depois que o
 * ponteiro entra (`IMG-15`..`IMG-17`).
 *
 * "Nenhum elemento referencia a URL" é medido no HTML inteiro do contêiner: um `<link>`, um
 * `<img>` escondido ou um `background-image` montado antes da hora apareceriam ali.
 */
const PALCO = 'https://x.supabase.co/storage/v1/render/image/public/p/a.webp?width=1080'
const ZOOM = 'https://x.supabase.co/storage/v1/render/image/public/p/a.webp?width=1600'
const ZOOM_B = 'https://x.supabase.co/storage/v1/render/image/public/p/b.webp?width=1600'

const montar = (zoomSrc = ZOOM) =>
  render(
    <ImageZoom
      src={PALCO}
      srcSet={`${PALCO} 1080w`}
      sizes="(min-width: 768px) 50vw, 100vw"
      zoomSrc={zoomSrc}
      alt="Pingente"
    />,
  )

const palco = () => screen.getByAltText('Pingente').parentElement as HTMLElement
const camada = () => screen.queryByTestId('image-zoom-layer')

describe('ImageZoom — a foto grande só depois do ponteiro (IMG-15)', () => {
  it('antes da primeira entrada, nenhum elemento referencia a URL do zoom', () => {
    const { container } = montar()

    expect(container.innerHTML).not.toContain('width=1600')
    expect(camada()).toBeNull()
  })

  it('ao entrar, a camada usa a URL do zoom no `background-image`', () => {
    montar()
    fireEvent.mouseEnter(palco())

    expect(camada()!.style.backgroundImage).toBe(`url(${ZOOM})`)
  })

  it('ao sair, a camada some; ao voltar, reaparece com a mesma URL', () => {
    montar()
    fireEvent.mouseEnter(palco())
    fireEvent.mouseLeave(palco())
    expect(camada()).toBeNull()

    fireEvent.mouseEnter(palco())
    expect(camada()!.style.backgroundImage).toBe(`url(${ZOOM})`)
  })

  it('o `<img>` do palco carrega o par `srcset`/`sizes` recebido (IMG-02)', () => {
    montar()
    const img = screen.getByAltText('Pingente')

    expect(img.getAttribute('srcset')).toBe(`${PALCO} 1080w`)
    expect(img.getAttribute('sizes')).toBe('(min-width: 768px) 50vw, 100vw')
    expect(img.getAttribute('src')).toBe(PALCO)
  })
})

describe('ImageZoom — a foto ativa manda (IMG-16, IMG-17)', () => {
  it('trocar o `zoomSrc` troca a camada, sem a foto anterior', () => {
    const { rerender, container } = montar()
    fireEvent.mouseEnter(palco())
    rerender(
      <ImageZoom
        src={PALCO}
        srcSet={`${PALCO} 1080w`}
        sizes="(min-width: 768px) 50vw, 100vw"
        zoomSrc={ZOOM_B}
        alt="Pingente"
      />,
    )

    expect(camada()!.style.backgroundImage).toBe(`url(${ZOOM_B})`)
    expect(container.innerHTML).not.toContain('a.webp?width=1600')
  })

  it('URL externa vai à camada inalterada', () => {
    const externa = 'https://cdn.parceiro.example/terceira.jpg'
    montar(externa)
    fireEvent.mouseEnter(palco())

    expect(camada()!.style.backgroundImage).toBe(`url(${externa})`)
  })
})
