import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { PageMeta } from '@estrelinha/core/seo'
import { usePageMeta } from '../usePageMeta'
import { onPageMeta, type PageMetaDeclaration } from '../pageMeta'

/**
 * Feature 62 — `MTA-06`..`MTA-08`. Substitui `useDocumentMeta.test.tsx`: os casos de escrita
 * reaparecem aqui, e o de "restaura no unmount" foi INVERTIDO de propósito (A12) — reverter é a troca
 * intermediária de título que o `page_view` mediria.
 */

const conteudo = (seletor: string): string | null =>
  document.head.querySelector(seletor)?.getAttribute('content') ?? null

const PRODUTO: PageMeta = {
  title: 'Anel de Leite Materno | Uma Estrelinha',
  description: 'Anel feito à mão.',
  indexable: true,
}
const CHECKOUT: PageMeta = {
  title: 'Finalizar compra | Uma Estrelinha',
  description: 'Finalize sua compra na Uma Estrelinha.',
  indexable: false,
}

beforeEach(() => {
  document.head.innerHTML =
    '<meta name="description" content="genérica">' +
    '<meta property="og:title" content="genérico">' +
    '<meta property="og:description" content="genérica">' +
    '<meta name="twitter:title" content="genérico">' +
    '<meta name="twitter:description" content="genérica">'
  document.title = 'Uma Estrelinha - Joias afetivas artesanais em resina'
})

afterEach(() => {
  document.head.innerHTML = ''
})

describe('usePageMeta — escrita (MTA-07)', () => {
  it('grava o título e a descrição', () => {
    renderHook(() => usePageMeta(PRODUTO))
    expect(document.title).toBe(PRODUTO.title)
    expect(conteudo('meta[name="description"]')).toBe(PRODUTO.description)
  })

  it('og:title e twitter:title recebem o MESMO título; og:/twitter:description a MESMA descrição', () => {
    renderHook(() => usePageMeta(PRODUTO))
    expect(conteudo('meta[property="og:title"]')).toBe(PRODUTO.title)
    expect(conteudo('meta[name="twitter:title"]')).toBe(PRODUTO.title)
    expect(conteudo('meta[property="og:description"]')).toBe(PRODUTO.description)
    expect(conteudo('meta[name="twitter:description"]')).toBe(PRODUTO.description)
  })

  it('substitui a tag existente — nunca duplica', () => {
    renderHook(() => usePageMeta(PRODUTO))
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
  })

  it('cria a tag quando o documento não a traz', () => {
    document.head.innerHTML = ''
    renderHook(() => usePageMeta(PRODUTO))
    expect(conteudo('meta[name="description"]')).toBe(PRODUTO.description)
    expect(conteudo('meta[property="og:title"]')).toBe(PRODUTO.title)
  })

  it('a troca de página reescreve tudo', () => {
    const { rerender } = renderHook(({ m }) => usePageMeta(m), { initialProps: { m: PRODUTO } })
    rerender({ m: CHECKOUT })
    expect(document.title).toBe(CHECKOUT.title)
    expect(conteudo('meta[property="og:description"]')).toBe(CHECKOUT.description)
  })
})

describe('usePageMeta — robots (MTA-06)', () => {
  it('rota não indexável ganha exatamente UMA <meta name="robots" content="noindex">', () => {
    const { rerender } = renderHook(({ m }) => usePageMeta(m), { initialProps: { m: CHECKOUT } })
    rerender({ m: { ...CHECKOUT, title: 'Busca | Uma Estrelinha' } })
    const tags = document.head.querySelectorAll('meta[name="robots"]')
    expect(tags).toHaveLength(1)
    expect(tags[0].getAttribute('content')).toBe('noindex')
  })

  it('a rota indexável seguinte REMOVE a tag', () => {
    const { rerender } = renderHook(({ m }) => usePageMeta(m), { initialProps: { m: CHECKOUT } })
    expect(document.head.querySelector('meta[name="robots"]')).not.toBeNull()
    rerender({ m: PRODUTO })
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('o robots que o SERVIDOR pôs na 404 (feature 69) não ganha um segundo, e sai ao navegar para página indexável', () => {
    const servido = document.createElement('meta')
    servido.setAttribute('name', 'robots')
    servido.setAttribute('content', 'noindex')
    servido.setAttribute('data-owner', 'estrelinha-spa')
    document.head.appendChild(servido)
    const { rerender } = renderHook(({ m }: { m: PageMeta }) => usePageMeta(m), {
      initialProps: { m: { title: 'Página não encontrada | Uma Estrelinha', description: 'x', indexable: false } },
    })
    expect(document.head.querySelectorAll('meta[name="robots"]')).toHaveLength(1)
    rerender({ m: { title: 'Joias | Uma Estrelinha', description: 'y', indexable: true } })
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('rota indexável não remove um robots que não é nosso', () => {
    const alheio = document.createElement('meta')
    alheio.setAttribute('name', 'robots')
    alheio.setAttribute('content', 'max-image-preview:large')
    document.head.appendChild(alheio)
    renderHook(() => usePageMeta(PRODUTO))
    expect(conteudo('meta[name="robots"]')).toBe('max-image-preview:large')
  })
})

describe('usePageMeta — nada provisório (MTA-08)', () => {
  it('null (carregando) não escreve nada e não declara', () => {
    const ouvidas: PageMetaDeclaration[] = []
    const parar = onPageMeta(d => ouvidas.push(d))
    renderHook(() => usePageMeta(null))
    parar()
    expect(document.title).toBe('Uma Estrelinha - Joias afetivas artesanais em resina')
    expect(conteudo('meta[name="description"]')).toBe('genérica')
    expect(ouvidas).toEqual([])
  })

  it('ao desmontar, o título NÃO volta ao do index.html (A12)', () => {
    const { unmount } = renderHook(() => usePageMeta(PRODUTO))
    unmount()
    expect(document.title).toBe(PRODUTO.title)
    expect(conteudo('meta[name="description"]')).toBe(PRODUTO.description)
  })

  it('carregando → carregado: o título só muda uma vez, direto para o da página', () => {
    const titulos: string[] = []
    const obs = new MutationObserver(() => titulos.push(document.title))
    const { rerender } = renderHook(({ m }) => usePageMeta(m), {
      initialProps: { m: null as PageMeta | null },
    })
    obs.observe(document.head, { subtree: true, childList: true, characterData: true })
    rerender({ m: PRODUTO })
    return Promise.resolve().then(() => {
      obs.disconnect()
      expect(new Set(titulos)).toEqual(new Set([PRODUTO.title]))
    })
  })
})

describe('usePageMeta — a declaração (MTA-11)', () => {
  it('ao escrever, declara o título com o endereço atual', () => {
    window.history.replaceState(null, '', '/produtos/anel')
    const ouvidas: PageMetaDeclaration[] = []
    const parar = onPageMeta(d => ouvidas.push(d))
    renderHook(() => usePageMeta(PRODUTO))
    parar()
    expect(ouvidas).toEqual([{ pathname: '/produtos/anel', title: PRODUTO.title }])
  })
})
