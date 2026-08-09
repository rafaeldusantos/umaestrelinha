import { afterEach, describe, expect, it } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { useCanonical } from '../useCanonical'

/**
 * `URL-01` e `URL-03` — uma URL canônica por conteúdo.
 *
 * As asserções são sobre o `<head>` de verdade, não sobre a chamada do hook: o que o buscador lê é a
 * tag, e provar que o hook rodou não prova que a tag existe com o valor certo.
 */
const Page = ({ path }: { path: string | null }) => {
  useCanonical(path)
  return <div>página</div>
}

const canonicals = () =>
  Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'))

afterEach(() => {
  cleanup()
  for (const link of canonicals()) link.remove()
})

describe('useCanonical', () => {
  it('cria a tag quando ela não existe', () => {
    expect(canonicals()).toHaveLength(0)

    render(<Page path="/joias-afetivas" />)

    expect(canonicals()).toHaveLength(1)
    expect(canonicals()[0].getAttribute('href')).toBe(`${window.location.origin}/joias-afetivas`)
  })

  it('o href é ABSOLUTO, resolvido a partir de window.location.origin', () => {
    render(<Page path="/joias-afetivas/joia-de-leite-materno" />)

    const href = canonicals()[0].getAttribute('href')
    expect(href).toBe(`${window.location.origin}/joias-afetivas/joia-de-leite-materno`)
    expect(href?.startsWith('http')).toBe(true)
  })

  it('atualiza a tag existente quando o path muda — não empilha uma segunda', () => {
    const { rerender } = render(<Page path="/joias-afetivas" />)
    rerender(<Page path="/pingentes" />)

    expect(canonicals()).toHaveLength(1)
    expect(canonicals()[0].getAttribute('href')).toBe(`${window.location.origin}/pingentes`)
  })

  it('`null` não cria tag nenhuma', () => {
    render(<Page path={null} />)

    expect(canonicals()).toHaveLength(0)
  })

  it('remove no unmount — a canônica da página anterior não fica no <head>', () => {
    const { unmount } = render(<Page path="/joias-afetivas" />)
    expect(canonicals()).toHaveLength(1)

    unmount()

    expect(canonicals()).toHaveLength(0)
  })

  it('duas montagens em sequência deixam UMA tag, com o valor da segunda', () => {
    const primeira = render(<Page path="/joias-afetivas" />)
    primeira.unmount()
    render(<Page path="/pingentes" />)

    expect(canonicals()).toHaveLength(1)
    expect(canonicals()[0].getAttribute('href')).toBe(`${window.location.origin}/pingentes`)
  })

  it('navegar de uma página COM canônica para uma SEM não deixa a anterior', () => {
    const comCanonica = render(<Page path="/joias-afetivas" />)
    comCanonica.unmount()
    render(<Page path={null} />)

    expect(canonicals()).toHaveLength(0)
  })
})
