import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * **Cada rota é um chunk, e uma rota nova não pode voltar a ser import estático** — `PRF-16`.
 *
 * Este guarda existe pela mesma razão que `reservedSlugs.test.ts`: a regressão é silenciosa. Alguém
 * acrescenta uma página, escreve `import NovaPage from "@/pages/NovaPage"` porque é o que o editor
 * completa, e **nada quebra** — o build passa, o `tsc` passa, a rota funciona. O que acontece é o
 * chunk de entrada crescer, e ninguém olha o tamanho de um bundle a cada PR.
 *
 * **Bidirecional**, e os dois sentidos importam:
 * - uma página do `App.tsx` importada estaticamente derruba a suíte;
 * - uma entrada em `lazy` que deixou de ser rota também derruba — senão o arquivo acumula chunks
 *   fantasmas que ninguém monta.
 *
 * **O `NotFound` que a `CategoryPage` importa NÃO é violação.** A categoria renderiza a 404 própria
 * no caminho de slug inexistente (`URL-04`), o que põe a 404 no chunk da categoria além do dela.
 * Isso é o comportamento correto — quem chega numa URL errada já está baixando a categoria —, e o
 * escopo desta régua é **só o `App.tsx`**, escrito literalmente, para que o caso nunca seja confundido
 * com regressão.
 *
 * ÂNCORA DUPLA: prova que leu o `App.tsx` de verdade **e** que a régua encontra as 14 chamadas de
 * `lazy`. Só ler o arquivo deixa passar um regex quebrado; só contar ocorrências deixa passar um
 * caminho errado.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/** Escopo literal — o arquivo de rotas, e só ele. */
const APP_PATH = resolve(HERE, '../App.tsx')
const PAGES_DIR = resolve(HERE, '../../pages')

const APP = readFileSync(APP_PATH, 'utf8')

interface Analise {
  /** `const X = lazy(() => import("@/pages/Y"))` */
  preguicosas: { nome: string; modulo: string }[]
  /** `import X from "@/pages/Y"` — o defeito que este guarda existe para pegar. */
  estaticas: { nome: string; modulo: string }[]
  /** Os nomes usados como `element={<X ...`. */
  elementos: string[]
}

const analisar = (fonte: string): Analise => ({
  preguicosas: [...fonte.matchAll(/const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\("([^"]+)"\)/g)].map(
    m => ({ nome: m[1], modulo: m[2] }),
  ),
  estaticas: [...fonte.matchAll(/^import\s+(\w+)\s+from\s+"(@\/pages\/[^"]+)";?$/gm)].map(m => ({
    nome: m[1],
    modulo: m[2],
  })),
  elementos: [...new Set([...fonte.matchAll(/element=\{<(\w+)/g)].map(m => m[1]))],
})

const app = analisar(APP)

/** O que pode aparecer em `element=` sem ser página: a moldura e o redirect declarativo. */
const NAO_SAO_PAGINAS = ['StoreLayout', 'Navigate']

/** As páginas que existem no disco — o outro lado da bidirecionalidade. */
const paginasNoDisco = readdirSync(PAGES_DIR, { withFileTypes: true })
  .filter(e => e.isFile() && e.name.endsWith('.tsx'))
  .map(e => e.name.replace(/\.tsx$/, ''))

describe('routeSplitting — âncoras da régua', () => {
  it('leu o App.tsx de verdade', () => {
    // Caminho errado leria string vazia e TODA asserção de ausência abaixo passaria por vacuidade.
    expect(APP.length).toBeGreaterThan(2000)
    expect(APP).toContain('<BrowserRouter>')
    expect(APP).toContain('<Routes>')
  })

  it('a régua ENCONTRA as 14 páginas preguiçosas — a segunda ponta da âncora', () => {
    expect(app.preguicosas.length).toBeGreaterThanOrEqual(14)
    expect(app.preguicosas.map(p => p.nome)).toContain('HomePage')
    expect(app.preguicosas.map(p => p.nome)).toContain('CheckoutPage')
  })

  it('a régua enxerga os elementos de rota', () => {
    expect(app.elementos.length).toBeGreaterThanOrEqual(14)
    expect(app.elementos).toContain('StoreLayout')
  })

  it('sensor: um App.tsx sintético com import estático de página é REPROVADO', () => {
    const sintetico = [
      'import { lazy } from "react";',
      'import HomePage from "@/pages/HomePage";',
      'const CategoryPage = lazy(() => import("@/pages/CategoryPage"));',
    ].join('\n')

    expect(analisar(sintetico).estaticas).toEqual([
      { nome: 'HomePage', modulo: '@/pages/HomePage' },
    ])
  })

  it('sensor bidirecional: um `lazy` que não vira rota é visível para a régua', () => {
    const sintetico = [
      'const OrfaPage = lazy(() => import("@/pages/OrfaPage"));',
      '<Route path="/" element={<StoreLayout />} />',
    ].join('\n')

    const { preguicosas, elementos } = analisar(sintetico)
    expect(preguicosas.map(p => p.nome)).toEqual(['OrfaPage'])
    expect(elementos).not.toContain('OrfaPage')
  })
})

describe('routeSplitting — cada página é um chunk (PRF-16)', () => {
  it('nenhuma página é importada estaticamente pelo App.tsx', () => {
    expect(
      app.estaticas,
      `página em import estático volta para o chunk de entrada: ${app.estaticas
        .map(e => e.modulo)
        .join(', ')}`,
    ).toEqual([])
  })

  it('as 14 páginas do disco estão TODAS em `lazy`', () => {
    const preguicosas = app.preguicosas.map(p => p.modulo.replace('@/pages/', ''))
    expect(paginasNoDisco).toHaveLength(14)
    expect([...preguicosas].sort()).toEqual([...paginasNoDisco].sort())
  })

  it('bidirecional: toda entrada em `lazy` é montada como rota', () => {
    const orfas = app.preguicosas.filter(p => !app.elementos.includes(p.nome))
    expect(orfas.map(o => o.nome), 'chunk que ninguém monta').toEqual([])
  })

  it('bidirecional: todo elemento de rota é preguiçoso, ou é a moldura/o redirect', () => {
    const nomes = new Set(app.preguicosas.map(p => p.nome))
    const intrusos = app.elementos.filter(e => !nomes.has(e) && !NAO_SAO_PAGINAS.includes(e))
    expect(intrusos, 'elemento de rota que não é chunk próprio').toEqual([])
  })

  it('a moldura NÃO é preguiçosa — adiá-la trocaria um download por dois', () => {
    // `StoreLayout` aparece em toda rota da loja. É o único import de componente de rota que
    // continua estático, e isso é decisão, não esquecimento.
    expect(APP).toContain('import StoreLayout from "@/widgets/store-layout/ui/StoreLayout";')
    expect(app.preguicosas.map(p => p.nome)).not.toContain('StoreLayout')
  })
})

describe('routeSplitting — o que segura o carregamento sob demanda', () => {
  it('as rotas ficam dentro de um `Suspense`, e ele dentro do `ChunkErrorBoundary`', () => {
    // O limite de erro tem de ficar ACIMA: quem rejeita é o `import()` de dentro do `Suspense`, e um
    // limite irmão não pegaria — o resultado seria tela branca.
    expect(APP.indexOf('<ChunkErrorBoundary>')).toBeGreaterThan(-1)
    expect(APP.indexOf('<ChunkErrorBoundary>')).toBeLessThan(APP.indexOf('<Suspense'))
    expect(APP.indexOf('<Suspense')).toBeLessThan(APP.indexOf('<Routes>'))
  })

  it('o `Suspense` fica DENTRO do BrowserRouter e ABAIXO do ScrollToTop', () => {
    // `scrollToTop.test.tsx` guarda o comportamento do botão voltar; aqui se guarda a posição, que é
    // o que faria aquele teste passar a medir outra coisa.
    const dentro = APP.slice(APP.indexOf('<BrowserRouter>'), APP.indexOf('</BrowserRouter>'))
    expect(dentro).toContain('<Suspense')
    expect(dentro.indexOf('<ScrollToTop />')).toBeLessThan(dentro.indexOf('<Suspense'))
  })

  it('a leitura de `?preview=1` continua ACIMA das Routes e fora do Suspense (AD-019)', () => {
    // Feature 25: a prévia da home no painel decide pelo `window.location` porque roda antes do
    // roteador. Empurrá-la para dentro do `Suspense` atrasaria a decisão e quebraria o
    // `postMessage`.
    expect(APP.indexOf('isPreviewWindow(')).toBeLessThan(APP.indexOf('<ChunkErrorBoundary>'))
  })

  it('o StoreLayout tem o próprio `Suspense` em volta do Outlet — a moldura não pisca', () => {
    const layout = readFileSync(
      resolve(HERE, '../../widgets/store-layout/ui/StoreLayout.tsx'),
      'utf8',
    )
    expect(layout).toContain('<Suspense fallback={<RouteFallback />}>')
    expect(layout.indexOf('<Suspense fallback={<RouteFallback />}>')).toBeLessThan(
      layout.indexOf('<Outlet />'),
    )
  })

  it('o NotFound importado pela CategoryPage não é violação — o escopo é o App.tsx', () => {
    // O caso do `design.md`: com `lazy`, a 404 entra no chunk da categoria além do próprio, e isso é
    // CORRETO. Se algum dia a régua passar a varrer `pages/`, este teste vira o alarme.
    const categoria = readFileSync(resolve(PAGES_DIR, 'CategoryPage.tsx'), 'utf8')
    expect(categoria).toMatch(/import NotFound from ['"][^'"]*NotFound['"]/)
    expect(APP_PATH.replace(/\\/g, '/').endsWith('src/app/App.tsx')).toBe(true)
  })
})
