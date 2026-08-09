import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { INFRA_SLUGS, ROUTE_SLUGS } from '@estrelinha/core/routes'

/**
 * `URL-06` — o guarda bidirecional entre as rotas e a lista de slugs reservados.
 *
 * Com categoria na raiz do domínio (`AD-018`), **o namespace de rota e o de slug de categoria são o
 * mesmo**. O React Router ranqueia por especificidade, então a rota sempre vence — e quem some é a
 * categoria, em silêncio e em produção. `ROUTE_SLUGS` é a contrapartida obrigatória dessa escolha: é
 * dela que o backoffice recusa o cadastro de uma categoria "sobre".
 *
 * Uma lista assim tem duas formas de envelhecer, e as duas são caladas:
 *
 * 1. **Rota nova que não entra na lista** — no dia em que alguém acrescentar `/ajuda` ao `App.tsx`,
 *    a categoria `ajuda` que já existe para de abrir. Ninguém percebe: a rota funciona.
 * 2. **Entrada morta na lista** — uma rota removida deixa o nome reservado para sempre, e o cadastro
 *    passa a recusar um endereço que já está livre. Também ninguém percebe: a recusa parece certa.
 *
 * Por isso a comparação é nas **duas direções**, e por isso ela lê o `App.tsx` **do disco** — mesmo
 * molde de `navItems.test.ts` no backoffice. Um teste que importasse a constante e a comparasse
 * consigo mesma não provaria nada.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * O caminho por extenso: a régua não pode ser o objeto medido. Derivar este caminho de uma constante
 * do app faria a varredura encolher junto com o que ela deveria guardar.
 */
const APP_TSX = join(ROOT, 'apps/store/src/app/App.tsx')

const APP = readFileSync(APP_TSX, 'utf8')

/** Comentário não é rota. O `App.tsx` **cita** `path="*"` dentro do bloco que explica o
 *  ranqueamento do React Router — sem tirar os comentários primeiro, o texto que documenta a tabela
 *  entraria na tabela. */
const semComentarios = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '')

const declaredPaths = (source: string): string[] =>
  [...semComentarios(source).matchAll(/path="([^"]*)"/g)].map((match) => match[1])

/**
 * O primeiro segmento **estático** de cada rota declarada.
 *
 * Ficam de fora, de propósito:
 * - o splat `*`, que é a 404 e não reserva nome nenhum;
 * - a raiz `/`, que não tem primeiro segmento;
 * - o segmento **dinâmico** (`/:slug`, `/:parentSlug/:slug`), que é justamente a categoria — reservá-lo
 *   seria reservar o namespace inteiro.
 */
const staticFirstSegments = (source: string): string[] => {
  const segments = declaredPaths(source)
    .filter((path) => path.startsWith('/'))
    .map((path) => path.split('/')[1] ?? '')
    .filter((segment) => segment !== '' && !segment.startsWith(':'))

  return [...new Set(segments)]
}

describe('rotas × slugs reservados — âncora da leitura', () => {
  it('leu o `App.tsx` de verdade: tem `<Routes>` e uma tabela de rotas', () => {
    // Âncora dupla. Sem ela, um caminho errado leria zero rota, a comparação bidirecional
    // compararia duas listas vazias e o guarda passaria em silêncio — a pior falha possível aqui.
    expect(APP).toContain('<Routes>')
    expect(declaredPaths(APP).length).toBeGreaterThanOrEqual(15)
  })
})

describe('rotas × slugs reservados — as duas direções (URL-06)', () => {
  it('todo primeiro segmento estático do `App.tsx` está em `ROUTE_SLUGS`', () => {
    // Direção 1: rota nova que não entrou na lista. É o caso do `/ajuda` de `AD-018`.
    const foraDaLista = staticFirstSegments(APP).filter((segment) => !ROUTE_SLUGS.includes(segment))

    expect(foraDaLista).toEqual([])
  })

  it('toda entrada de `ROUTE_SLUGS` é primeiro segmento de alguma rota — sem entrada morta', () => {
    // Direção 2: nome que continua reservado depois de a rota sair. Reservar o que está livre é tão
    // errado quanto liberar o que está ocupado — a diferença é que ninguém reclama.
    const semRota = ROUTE_SLUGS.filter((slug) => !staticFirstSegments(APP).includes(slug))

    expect(semRota).toEqual([])
  })

  it('as duas listas são o mesmo conjunto', () => {
    expect([...staticFirstSegments(APP)].sort()).toEqual([...ROUTE_SLUGS].sort())
  })
})

describe('rotas × slugs reservados — o que fica fora da comparação', () => {
  /**
   * `INFRA_SLUGS` **não** aparece no `App.tsx` e não deve aparecer: `assets` é a pasta que o Vite
   * emite no `dist`, e `api`/`_vercel` são reservados pela plataforma. Nenhum dos três chega ao
   * React Router — uma categoria com um desses slugs seria servida como arquivo (ou pela Vercel) e a
   * página nunca montaria. Ficam reservados por outro motivo, e por isso ficam fora da comparação.
   *
   * Os três nomes estão escritos aqui, e não iterados de `INFRA_SLUGS`: iterar a constante que se
   * quer guardar faria a asserção encolher junto com ela.
   */
  it.each(['assets', 'api', '_vercel'])(
    '`%s` é reservado por infraestrutura, e não é rota declarada',
    (slug) => {
      expect(INFRA_SLUGS).toContain(slug)
      expect(staticFirstSegments(APP)).not.toContain(slug)
    },
  )
})

describe('rotas × slugs reservados — o que o parser ignora, e o que ele pega', () => {
  it('splat, raiz e segmento dinâmico são ignorados', () => {
    const sintetico = `
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:slug" element={<CategoryPage />} />
        <Route path="/:parentSlug/:slug" element={<CategoryPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    `

    expect(staticFirstSegments(sintetico)).toEqual([])
  })

  it('`path=` citado em comentário não conta como rota', () => {
    // Não é hipótese: o bloco que explica o ranqueamento no `App.tsx` cita `path="*"` no texto.
    const sintetico = `
      <Routes>
        {/* o curinga é path="*", e uma rota path="/ajuda" entraria aqui */}
        <Route path="/sobre" element={<AboutPage />} />
      </Routes>
    `

    expect(staticFirstSegments(sintetico)).toEqual(['sobre'])
  })

  it('o guarda REPROVA uma rota nova que não entrou em `ROUTE_SLUGS`', () => {
    // A prova de que o teste pega: sem isto, um parser quebrado (regex errada, caminho errado)
    // devolveria lista vazia e as duas direções passariam para sempre.
    const sintetico = `
      <Routes>
        <Route path="/ajuda" element={<HelpPage />} />
      </Routes>
    `

    expect(staticFirstSegments(sintetico)).toEqual(['ajuda'])
    expect(staticFirstSegments(sintetico).filter((s) => !ROUTE_SLUGS.includes(s))).toEqual(['ajuda'])
  })
})
