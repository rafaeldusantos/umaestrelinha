import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useJsonLd } from '../useJsonLd'

/**
 * `FAQL-13` — o dono único do dado estruturado injetado pela SPA.
 *
 * A metade que este arquivo existe para travar é a **remoção**. Numa SPA o `<head>` sobrevive à
 * navegação, e uma tag deixada para trás declara um `FAQPage` numa página que não é ela — o que um
 * rastreador de IA cita como se fosse verdade.
 */

const nossos = () =>
  [...document.head.querySelectorAll('script[type="application/ld+json"][data-owner="estrelinha-spa"]')]

describe('useJsonLd', () => {
  it('injeta o script com o conteúdo serializado', () => {
    renderHook(() => useJsonLd({ '@type': 'FAQPage', mainEntity: [] }))

    expect(nossos()).toHaveLength(1)
    expect(JSON.parse(nossos()[0].textContent ?? '{}')).toEqual({
      '@type': 'FAQPage',
      mainEntity: [],
    })
  })

  it('REMOVE o script no unmount', () => {
    const { unmount } = renderHook(() => useJsonLd({ '@type': 'FAQPage' }))
    expect(nossos()).toHaveLength(1)

    unmount()
    expect(nossos()).toHaveLength(0)
  })

  it('trocar o conteúdo não acumula duas tags', () => {
    const { rerender } = renderHook(({ doc }) => useJsonLd(doc), {
      initialProps: { doc: { a: 1 } as object },
    })
    rerender({ doc: { a: 2 } })

    expect(nossos()).toHaveLength(1)
    expect(nossos()[0].textContent).toContain('"a":2')
  })

  it('null e undefined não injetam nada', () => {
    renderHook(() => useJsonLd(null))
    expect(nossos()).toHaveLength(0)

    renderHook(() => useJsonLd(undefined))
    expect(nossos()).toHaveLength(0)
  })

  // ⚠️ A `product-page` (edge function) injeta o JSON-LD do produto NO HTML SERVIDO, antes de o
  // React existir. Um seletor genérico o arrancaria ao desmontar esta página — e o produto perderia
  // o dado estruturado que o Merchant Center compara com o feed.
  it('não remove um script de outro dono, como o que a edge function serve', () => {
    const deOutro = document.createElement('script')
    deOutro.setAttribute('type', 'application/ld+json')
    deOutro.textContent = '{"@type":"Product"}'
    document.head.appendChild(deOutro)

    const { unmount } = renderHook(() => useJsonLd({ '@type': 'FAQPage' }))
    unmount()

    expect(document.head.contains(deOutro)).toBe(true)
    deOutro.remove()
  })
})
