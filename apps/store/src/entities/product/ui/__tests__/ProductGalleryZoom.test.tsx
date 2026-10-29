import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'

import ProductGallery from '../ProductGallery'

/**
 * Feature 87, `IMG-15`, provada pela GALERIA com o `ImageZoom` real.
 *
 * `ProductGallery.test.tsx` substitui o `ImageZoom` por um dublê que põe a URL de 1600 no DOM — lá
 * "nenhum elemento referencia a URL antes do ponteiro" é falso por construção do dublê, e um
 * `<link rel="prefetch">` posto pela galeria passaria. Aqui nada é dublado: o HTML inteiro da galeria
 * não pode nomear a rendição do zoom até o ponteiro entrar no palco.
 */
const STORAGE =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pingente.webp'

const montar = () =>
  render(<ProductGallery images={[{ url: STORAGE, alt: null, source: 'upload' }]} name="Pingente" />)

describe('ProductGallery com o ImageZoom real — a foto de 1600 só depois do ponteiro', () => {
  it('antes do ponteiro, nenhum elemento da galeria nomeia `width=1600`', () => {
    const { container } = montar()

    expect(container.innerHTML).toContain('width=1080')
    expect(container.innerHTML).not.toContain('width=1600')
  })

  it('com o ponteiro no palco do computador, a camada de zoom pede a rendição de 1600', () => {
    const { container, getByTestId } = montar()
    fireEvent.mouseEnter(container.querySelector('.cursor-zoom-in .cursor-zoom-in')!)

    expect(getByTestId('image-zoom-layer').style.backgroundImage).toContain(
      'pingente.webp?width=1600&resize=contain&quality=80',
    )
  })
})
