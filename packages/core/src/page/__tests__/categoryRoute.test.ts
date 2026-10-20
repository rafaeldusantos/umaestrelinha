import { describe, expect, it } from 'vitest'
import { ROOT_FALLBACK, resolveCategoryRoute, type CategoryRouteNode } from '../categoryRoute.ts'

/**
 * `URL-03`, `URL-04`, `SEO-02` — a tabela de seis regras do `design.md` da feature 23, uma por linha.
 * Moradia anterior: `apps/store/src/entities/category/lib/__tests__/resolveCategoryRoute.test.ts`
 * (13 casos, movidos sem mudar asserção na feature 69, T02). Os casos de `inactiveFallback`
 * (SSV-14..16, SSV-32..34) vêm depois, no fim do arquivo.
 *
 * A árvore é a do catálogo real: `joias-afetivas` é raiz e `joia-de-leite-materno` pende dela. É
 * exatamente o par que a medição de 2026-08-09 colheu do site em produção.
 */
/** A forma da linha de `categories` que a loja passa — com colunas a mais que a regra não lê. */
interface Category extends CategoryRouteNode {
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  active: boolean
}

const cat = (id: string, slug: string, parent_id: string | null = null): Category => ({
  id,
  name: slug,
  slug,
  description: null,
  image_url: null,
  parent_id,
  sort_order: 0,
  active: true,
})

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

/**
 * Feature 69 — a categoria INATIVA. A árvore que chega aqui é só a ativa (RLS); quem reconhece a
 * inativa é a RPC `category_fallback(slug)`, que devolve o id do ancestral ativo mais próximo, ou
 * `ROOT_FALLBACK` quando não há nenhum. Os valores são os da spec: `/personalizados/profissoes`,
 * inativa hoje, tem de virar 301 para `/personalizados`.
 */
describe('resolveCategoryRoute — categoria inativa (feature 69)', () => {
  // `profissoes` (inativa) não está aqui: a RLS a esconde. `aco-inoxidavel` é filha ATIVA de
  // `joias-afetivas`, para o caso em que o ancestral ativo mais próximo é ele próprio uma filha.
  const ATIVA: Category[] = [
    cat('c-personalizados', 'personalizados'),
    cat('c-raiz', 'joias-afetivas'),
    cat('c-aco', 'aco-inoxidavel', 'c-raiz'),
  ]

  it('SSV-14: subcategoria inativa com pai ativo ⇒ 301 para a canônica do pai', () => {
    const route = resolveCategoryRoute({
      slug: 'profissoes',
      parentSlug: 'personalizados',
      categories: ATIVA,
      inactiveFallback: 'c-personalizados',
    })
    expect(route).toEqual({ kind: 'redirect', to: '/personalizados' })
  })

  it('SSV-14: aberta por UM segmento, o destino é o mesmo', () => {
    const route = resolveCategoryRoute({
      slug: 'profissoes',
      categories: ATIVA,
      inactiveFallback: 'c-personalizados',
    })
    expect(route).toEqual({ kind: 'redirect', to: '/personalizados' })
  })

  it('SSV-15: inativa sem ancestral ativo (ROOT_FALLBACK) ⇒ 301 para /', () => {
    expect(ROOT_FALLBACK).toBe('00000000-0000-0000-0000-000000000000')
    const route = resolveCategoryRoute({
      slug: 'raiz-inativa',
      categories: ATIVA,
      inactiveFallback: ROOT_FALLBACK,
    })
    expect(route).toEqual({ kind: 'redirect', to: '/' })
  })

  it('SSV-16: o ancestral ativo dois níveis acima ⇒ UM salto, direto para a canônica dele', () => {
    // neto inativo → pai inativo → avô `aco-inoxidavel` ativo (filha de `joias-afetivas`). A RPC já
    // subiu a cadeia: o destino é a canônica de DOIS segmentos do avô, sem passar pelo pai.
    const route = resolveCategoryRoute({
      slug: 'neto-inativo',
      parentSlug: 'pai-inativo',
      categories: ATIVA,
      inactiveFallback: 'c-aco',
    })
    expect(route).toEqual({ kind: 'redirect', to: '/joias-afetivas/aco-inoxidavel' })
  })

  it('id da RPC fora da árvore ativa é ignorado ⇒ notfound, nunca um salto para a Home por acidente', () => {
    const route = resolveCategoryRoute({
      slug: 'profissoes',
      categories: ATIVA,
      inactiveFallback: 'c-que-nao-existe',
    })
    expect(route.kind).toBe('notfound')
  })

  it('inactiveFallback nulo ⇒ notfound (não existe inativa com esse slug)', () => {
    expect(resolveCategoryRoute({ slug: 'nada', categories: ATIVA, inactiveFallback: null }).kind).toBe(
      'notfound',
    )
  })

  it('SSV-32: category_redirects para uma ativa ⇒ 301 à canônica dela', () => {
    const route = resolveCategoryRoute({
      slug: 'aco-antigo',
      categories: ATIVA,
      redirectTo: 'c-aco',
    })
    expect(route).toEqual({ kind: 'redirect', to: '/joias-afetivas/aco-inoxidavel' })
  })

  it('SSV-33: categoria ativa com o pai ERRADO na URL ⇒ 301 à canônica', () => {
    const route = resolveCategoryRoute({
      slug: 'aco-inoxidavel',
      parentSlug: 'personalizados',
      categories: ATIVA,
    })
    expect(route).toEqual({ kind: 'redirect', to: '/joias-afetivas/aco-inoxidavel' })
  })
})

describe('resolveCategoryRoute — a precedência (SSV-34): ativa > redirect > inativa > 404', () => {
  const ATIVA: Category[] = [
    cat('c-personalizados', 'personalizados'),
    cat('c-raiz', 'joias-afetivas'),
    cat('c-aco', 'aco-inoxidavel', 'c-raiz'),
  ]

  it('ativa vence redirect E inativa', () => {
    const route = resolveCategoryRoute({
      slug: 'personalizados',
      categories: ATIVA,
      redirectTo: 'c-aco',
      inactiveFallback: ROOT_FALLBACK,
    })
    expect(route.kind).toBe('ok')
    if (route.kind !== 'ok') throw new Error('esperava ok')
    expect(route.canonical).toBe('/personalizados')
  })

  it('redirect vence inativa', () => {
    const route = resolveCategoryRoute({
      slug: 'profissoes',
      categories: ATIVA,
      redirectTo: 'c-aco',
      inactiveFallback: 'c-personalizados',
    })
    expect(route).toEqual({ kind: 'redirect', to: '/joias-afetivas/aco-inoxidavel' })
  })

  it('redirect com destino fora da árvore cede à inativa', () => {
    const route = resolveCategoryRoute({
      slug: 'profissoes',
      categories: ATIVA,
      redirectTo: 'c-apagada',
      inactiveFallback: 'c-personalizados',
    })
    expect(route).toEqual({ kind: 'redirect', to: '/personalizados' })
  })

  it('redirect morto e inativa desconhecida ⇒ 404', () => {
    const route = resolveCategoryRoute({
      slug: 'profissoes',
      categories: ATIVA,
      redirectTo: 'c-apagada',
      inactiveFallback: 'c-tambem-apagada',
    })
    expect(route.kind).toBe('notfound')
  })

  it('a categoria devolvida é a MESMA referência da árvore, com o tipo de quem chamou', () => {
    const route = resolveCategoryRoute({ slug: 'personalizados', categories: ATIVA })
    if (route.kind !== 'ok') throw new Error('esperava ok')
    expect(route.category).toBe(ATIVA[0])
    // O tipo genérico preserva as colunas a mais — `name` existe sem cast.
    expect(route.category.name).toBe('personalizados')
  })
})
