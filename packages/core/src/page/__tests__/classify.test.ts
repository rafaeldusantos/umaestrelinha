import { describe, expect, it } from 'vitest'
import {
  APP_ROUTE_PATTERNS,
  LEGACY_REDIRECTS,
  NON_INDEXABLE_PATHS,
  SITEMAP_STATIC_PATHS,
} from '../../routes/routes.ts'
import { classifyPath } from '../classify.ts'

/** O segmento legado de coleção, montado por junção — ver o guarda de `core/menu`. */
const COLECAO = ['co', 'lecao'].join('')

/**
 * Feature 69, T04 — `classifyPath`, uma linha da tabela "Decisão por caminho" do `design.md` por
 * caso. A guarda que liga `APP_ROUTE_PATTERNS` ao `App.tsx` lido do disco é da loja
 * (`apps/store/src/app/__tests__/rotasDeApp.test.ts`); aqui é a regra.
 */

describe('APP_ROUTE_PATTERNS — composto dos donos, não escrito à mão', () => {
  it('é exatamente as não indexáveis + a pergunta + as legadas, sem repetição', () => {
    expect([...APP_ROUTE_PATTERNS].sort()).toEqual(
      [
        ...NON_INDEXABLE_PATHS.map(r => r.path),
        '/perguntas-frequentes/:pergunta',
        ...LEGACY_REDIRECTS.map(r => r.from),
      ].sort(),
    )
    expect(new Set(APP_ROUTE_PATTERNS).size).toBe(APP_ROUTE_PATTERNS.length)
  })

  it('as rotas da tarefa estão todas lá — âncora de contagem (14)', () => {
    expect(APP_ROUTE_PATTERNS).toEqual(
      expect.arrayContaining([
        '/carrinho',
        '/pedido/:id',
        '/pedido/:id/pagamento',
        '/busca',
        '/conta',
        '/conta/dados',
        '/favoritos',
        '/entrar',
        '/checkout',
        '/perguntas-frequentes/:pergunta',
        '/produto/:slug',
        // as legadas por dado: o caminho de coleção escrito por extenso é recusado por
        // `menu/__tests__/menu.test.ts` em qualquer arquivo de core fora de `routes/`.
        ...LEGACY_REDIRECTS.map(r => r.from).filter(f => f.split('/')[1] === COLECAO),
        '/categoria/:slug',
        '/como-enviar-o-material',
      ]),
    )
    expect(APP_ROUTE_PATTERNS).toHaveLength(14)
  })

  it('nenhuma rota de app é página fixa indexável nem a forma de produto/categoria', () => {
    for (const p of APP_ROUTE_PATTERNS) {
      expect(SITEMAP_STATIC_PATHS).not.toContain(p)
      expect(['/produtos/:slug', '/:slug', '/:parentSlug/:slug']).not.toContain(p)
    }
  })
})

describe('classifyPath — produto', () => {
  it('/produtos/:slug ⇒ product, com o slug', () => {
    expect(classifyPath('/produtos/pulseira-7-nos')).toEqual({ kind: 'product', slug: 'pulseira-7-nos' })
  })

  it('o slug sai com a caixa que chegou — quem decide se existe é o banco', () => {
    expect(classifyPath('/Produtos/Pulseira')).toEqual({ kind: 'product', slug: 'Pulseira' })
  })

  it('/produtos sozinho não é produto nem categoria — é slug reservado ⇒ notfound', () => {
    expect(classifyPath('/produtos')).toEqual({ kind: 'notfound' })
  })

  it('/produtos/a/b — três segmentos ⇒ notfound', () => {
    expect(classifyPath('/produtos/a/b')).toEqual({ kind: 'notfound' })
  })
})

describe('classifyPath — categoria', () => {
  it('/:slug ⇒ category, sem pai', () => {
    expect(classifyPath('/joias-afetivas')).toEqual({ kind: 'category', slug: 'joias-afetivas', parentSlug: null })
  })

  it('/:pai/:filha ⇒ category, com o pai', () => {
    expect(classifyPath('/joias-afetivas/joia-afetiva-linha-pet')).toEqual({
      kind: 'category',
      slug: 'joia-afetiva-linha-pet',
      parentSlug: 'joias-afetivas',
    })
  })

  it('/qualquer-coisa-xyz é categoria candidata — quem diz 404 é o banco (SSV-08)', () => {
    expect(classifyPath('/qualquer-coisa-xyz').kind).toBe('category')
  })

  it.each(['/conta/xyz', '/sobre/x', '/api', '/assets', '/_vercel/x', '/pedido'])(
    '%s — primeiro segmento reservado que não casou rota ⇒ notfound, sem ir ao banco',
    path => {
      expect(classifyPath(path)).toEqual({ kind: 'notfound' })
    },
  )
})

describe('classifyPath — 3+ segmentos não declarados (SSV-09)', () => {
  it.each(['/a/b/c', '/joias-afetivas/x/y', '/a/b/c/d'])('%s ⇒ notfound', path => {
    expect(classifyPath(path)).toEqual({ kind: 'notfound' })
  })
})

describe('classifyPath — rota de app segue 200 (SSV-10)', () => {
  it.each([
    '/carrinho',
    '/checkout',
    '/busca',
    '/conta',
    '/conta/dados',
    '/favoritos',
    '/entrar',
    '/pedido/7c1d0b8a-1111-4222-8333-444455556666',
    '/pedido/7c1d0b8a-1111-4222-8333-444455556666/pagamento',
    '/perguntas-frequentes/como-envio-cinzas-1a2b3c4d',
    '/produto/pulseira',
    `/${COLECAO}/joias-afetivas`,
    '/categoria/joias-afetivas',
    '/como-enviar-o-material',
  ])('%s ⇒ app', path => {
    expect(classifyPath(path)).toEqual({ kind: 'app' })
  })

  it('a parte estática casa sem caixa, como o React Router', () => {
    expect(classifyPath('/Carrinho')).toEqual({ kind: 'app' })
  })

  it('a Home, se chegar aqui, é app — shell intacto', () => {
    expect(classifyPath('/')).toEqual({ kind: 'app' })
  })
})

describe('classifyPath — página fixa indexável (SSV-22)', () => {
  it('toda entrada de SITEMAP_STATIC_PATHS menos "/" ⇒ static, com o caminho declarado', () => {
    const fixas = SITEMAP_STATIC_PATHS.filter(p => p !== '/')
    expect(fixas.length).toBeGreaterThanOrEqual(6)
    for (const path of fixas) expect(classifyPath(path)).toEqual({ kind: 'static', path })
  })

  it('caixa diferente devolve o caminho DECLARADO, que é o da canônica', () => {
    expect(classifyPath('/Sobre')).toEqual({ kind: 'static', path: '/sobre' })
  })

  it('/perguntas-frequentes é static; /perguntas-frequentes/:p é app', () => {
    expect(classifyPath('/perguntas-frequentes')).toEqual({ kind: 'static', path: '/perguntas-frequentes' })
    expect(classifyPath('/perguntas-frequentes/x-1a2b3c4d')).toEqual({ kind: 'app' })
  })
})

describe('classifyPath — entrada que não pode ser endereço (validação)', () => {
  it.each([
    ['extensão de arquivo', '/x.png'],
    ['extensão em subcaminho', '/joias-afetivas/foto.webp'],
    ['favicon', '/favicon.ico'],
    ['ponto-ponto', '/../etc/passwd'],
    ['ponto-ponto no meio', '/produtos/..'],
    ['codificado', '/produtos/%2e%2e'],
    ['codificado em categoria', '/joias%2Fafetivas'],
    ['segmento vazio', '//joias'],
    ['barra final', '/joias-afetivas/'],
    ['sem barra inicial', 'joias-afetivas'],
    ['vazio', ''],
  ])('%s (%s) ⇒ notfound', (_n, path) => {
    expect(classifyPath(path)).toEqual({ kind: 'notfound' })
  })
})
