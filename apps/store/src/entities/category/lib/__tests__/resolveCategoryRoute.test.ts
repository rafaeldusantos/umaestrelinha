import { describe, expect, it } from 'vitest'
import type { Category } from '@estrelinha/supabase/types'
import { resolveCategoryRoute } from '../resolveCategoryRoute'

/**
 * `URL-03`, `URL-04`, `SEO-02` — a tabela de seis regras do `design.md`, uma por linha.
 *
 * A árvore é a do catálogo real: `joias-afetivas` é raiz e `joia-de-leite-materno` pende dela. É
 * exatamente o par que a medição de 2026-08-09 colheu do site em produção.
 */
const cat = (id: string, slug: string, parent_id: string | null = null): Category =>
  ({
    id,
    name: slug,
    slug,
    description: null,
    image_url: null,
    color_accent: null,
    emoji: '',
    parent_id,
    sort_order: 0,
    active: true,
    show_in_menu: false,
    menu_promo: null,
  }) as Category

const TREE: Category[] = [
  cat('c-raiz', 'joias-afetivas'),
  cat('c-filha', 'joia-de-leite-materno', 'c-raiz'),
  cat('c-outra-raiz', 'pingentes'),
]

describe('resolveCategoryRoute — regra 1: categoria raiz', () => {
  it('resolve, e a canônica é a de um segmento', () => {
    const route = resolveCategoryRoute({ slug: 'joias-afetivas', categories: TREE })

    expect(route.kind).toBe('ok')
    if (route.kind !== 'ok') throw new Error('esperava ok')
    expect(route.canonical).toBe('/joias-afetivas')
    expect(route.category.id).toBe('c-raiz')
  })

  it('o discriminante é literal de STRING — nunca booleano (strictNullChecks: false)', () => {
    const route = resolveCategoryRoute({ slug: 'joias-afetivas', categories: TREE })
    expect(typeof route.kind).toBe('string')
    expect(['ok', 'redirect', 'notfound']).toContain(route.kind)
  })
})

describe('resolveCategoryRoute — regra 2: filha aberta por UM segmento', () => {
  it('RESOLVE em vez de redirecionar, com a canônica de dois segmentos (AD-018)', () => {
    const route = resolveCategoryRoute({ slug: 'joia-de-leite-materno', categories: TREE })

    expect(route.kind).toBe('ok')
    expect(route.kind).not.toBe('redirect')
    if (route.kind !== 'ok') throw new Error('esperava ok')
    expect(route.canonical).toBe('/joias-afetivas/joia-de-leite-materno')
    expect(route.category.id).toBe('c-filha')
  })
})

describe('resolveCategoryRoute — regra 3: filha com o pai CERTO na URL', () => {
  it('resolve, e a canônica é a própria URL pedida', () => {
    const route = resolveCategoryRoute({
      slug: 'joia-de-leite-materno',
      parentSlug: 'joias-afetivas',
      categories: TREE,
    })

    expect(route.kind).toBe('ok')
    if (route.kind !== 'ok') throw new Error('esperava ok')
    expect(route.canonical).toBe('/joias-afetivas/joia-de-leite-materno')
  })
})

describe('resolveCategoryRoute — regra 4: pai ERRADO na URL', () => {
  it('redireciona para a canônica — o mesmo conteúdo não fica sob dois endereços', () => {
    const route = resolveCategoryRoute({
      slug: 'joia-de-leite-materno',
      parentSlug: 'pingentes',
      categories: TREE,
    })

    expect(route.kind).toBe('redirect')
    if (route.kind !== 'redirect') throw new Error('esperava redirect')
    expect(route.to).toBe('/joias-afetivas/joia-de-leite-materno')
  })

  it('categoria RAIZ aberta com um pai qualquer também volta para a canônica', () => {
    const route = resolveCategoryRoute({
      slug: 'pingentes',
      parentSlug: 'joias-afetivas',
      categories: TREE,
    })

    expect(route.kind).toBe('redirect')
    if (route.kind !== 'redirect') throw new Error('esperava redirect')
    expect(route.to).toBe('/pingentes')
  })
})

describe('resolveCategoryRoute — regra 5: slug antigo em category_redirects (SEO-02)', () => {
  it('redireciona para a canônica do destino', () => {
    const route = resolveCategoryRoute({
      slug: 'leite-materno-antigo',
      categories: TREE,
      redirectTo: 'c-filha',
    })

    expect(route.kind).toBe('redirect')
    if (route.kind !== 'redirect') throw new Error('esperava redirect')
    // Destino é filha: a canônica tem dois segmentos, não um.
    expect(route.to).toBe('/joias-afetivas/joia-de-leite-materno')
  })

  it('categoria VIVA vence o redirect — a precedência é fixa, não a ordem da consulta', () => {
    const route = resolveCategoryRoute({
      slug: 'pingentes',
      categories: TREE,
      redirectTo: 'c-filha',
    })

    expect(route.kind).toBe('ok')
    if (route.kind !== 'ok') throw new Error('esperava ok')
    expect(route.canonical).toBe('/pingentes')
  })

  it('destino ausente da lista (apagado ou inativo) cai em notfound, nunca em navegação vazia', () => {
    const route = resolveCategoryRoute({
      slug: 'leite-materno-antigo',
      categories: TREE,
      redirectTo: 'c-que-nao-existe',
    })

    expect(route.kind).toBe('notfound')
  })
})

describe('resolveCategoryRoute — regra 6: o resto é 404 própria (URL-04)', () => {
  it('slug que não é categoria nem redirect', () => {
    expect(resolveCategoryRoute({ slug: 'nao-existe', categories: TREE }).kind).toBe('notfound')
  })

  it('categoria INATIVA não chega na lista — a policy `active = true` a filtra — e dá notfound', () => {
    // A RLS é quem esconde: a página recebe a árvore SEM a linha inativa. O teste reproduz esse
    // estado em vez de assumir que a função sabe de `active`.
    const semInativa = TREE.filter(c => c.slug !== 'pingentes')
    expect(resolveCategoryRoute({ slug: 'pingentes', categories: semInativa }).kind).toBe('notfound')
  })

  it('slug vazio cai em notfound sem lançar', () => {
    expect(() => resolveCategoryRoute({ slug: '', categories: TREE })).not.toThrow()
    expect(resolveCategoryRoute({ slug: '', categories: TREE }).kind).toBe('notfound')
  })

  it('árvore vazia — a consulta ainda não voltou — cai em notfound sem lançar', () => {
    expect(() => resolveCategoryRoute({ slug: 'joias-afetivas', categories: [] })).not.toThrow()
    expect(resolveCategoryRoute({ slug: 'joias-afetivas', categories: [] }).kind).toBe('notfound')
  })
})
