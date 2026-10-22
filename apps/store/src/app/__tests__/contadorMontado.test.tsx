import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `VIS-17` (feature `71`) — o contador de visitas está MONTADO, no lugar certo.
 *
 * Existir sem ninguém montar passaria em build, `tsc` e em todos os outros testes: o
 * `VisitCounter.test.tsx` monta o componente ele mesmo. Este guarda lê o `App.tsx` do disco (molde de
 * `scrollToTop.test.tsx`) e exige as três coisas:
 *
 * - **montado**: o elemento aparece sob a forma `{!previewMode && <VisitCounter />}`;
 * - **só fora da prévia**: a loja dentro do iframe do painel nunca conta (`VIS-22`);
 * - **fora das `Routes`**, dentro do `BrowserRouter`: o checkout e o 404 vivem fora do
 *   `StoreLayout` e também contam, e o componente lê o `location`.
 *
 * A régua é uma função pura (`montagem`), chamada pela asserção e pelos sensores. Uma forma que ela
 * não sabe ler (`previewMode ? null : …`) devolve `null` e DERRUBA a âncora — nunca passa calada.
 */

const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf-8')

/** Linha e bloco na MESMA varredura (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

interface Montagem {
  importado: boolean
  dentroDoRouter: boolean
  foraDasRoutes: boolean
}

/** Onde o contador está montado, ou `null` quando a forma esperada não aparece. */
function montagem(fonte: string): Montagem | null {
  const codigo = semComentario(fonte)
  const elemento = codigo.search(/\{\s*!previewMode\s*&&\s*<VisitCounter\s*\/>\s*\}/)
  if (elemento === -1) return null
  const abreRouter = codigo.indexOf('<BrowserRouter>')
  const fechaRouter = codigo.indexOf('</BrowserRouter>')
  const abreRoutes = codigo.indexOf('<Routes>')
  const fechaRoutes = codigo.indexOf('</Routes>')
  return {
    importado: /import\s+VisitCounter\s+from\s+["']@\/app\/VisitCounter["']/.test(codigo),
    dentroDoRouter: abreRouter !== -1 && abreRouter < elemento && elemento < fechaRouter,
    foraDasRoutes: abreRoutes !== -1 && (elemento < abreRoutes || elemento > fechaRoutes),
  }
}

describe('VIS-17 — o contador está montado no App', () => {
  it('âncora: o App foi lido e a forma `{!previewMode && <VisitCounter />}` foi encontrada', () => {
    expect(APP).toContain('<BrowserRouter>')
    expect(APP).toContain('<Routes>')
    expect(montagem(APP)).not.toBeNull()
  })

  it('importado, dentro do BrowserRouter e fora das Routes', () => {
    expect(montagem(APP)).toEqual({ importado: true, dentroDoRouter: true, foraDasRoutes: true })
  })

  describe('sensores', () => {
    const base = `import VisitCounter from "@/app/VisitCounter";
<BrowserRouter>
  {!previewMode && <VisitCounter />}
  <Routes>
    <Route path="/" element={<Home />} />
  </Routes>
</BrowserRouter>`

    it('a forma certa passa', () => {
      expect(montagem(base)).toEqual({ importado: true, dentroDoRouter: true, foraDasRoutes: true })
    })

    it('sem o portão da prévia, a forma não é reconhecida (âncora cai)', () => {
      expect(montagem(base.replace('{!previewMode && <VisitCounter />}', '<VisitCounter />'))).toBeNull()
    })

    it('uma sintaxe que a régua não lê derruba a âncora em vez de passar', () => {
      expect(
        montagem(base.replace('{!previewMode && <VisitCounter />}', '{previewMode ? null : <VisitCounter />}')),
      ).toBeNull()
    })

    it('dentro das Routes é acusado', () => {
      const dentro = base
        .replace('  {!previewMode && <VisitCounter />}\n', '')
        .replace('<Routes>', '<Routes>\n    {!previewMode && <VisitCounter />}')
      expect(montagem(dentro)!.foraDasRoutes).toBe(false)
    })

    it('fora do BrowserRouter é acusado', () => {
      const fora = `{!previewMode && <VisitCounter />}\n${base.replace('  {!previewMode && <VisitCounter />}\n', '')}`
      expect(montagem(fora)!.dentroDoRouter).toBe(false)
    })

    it('só citado em comentário não conta como montado — com LF e com CRLF', () => {
      const comentado = base.replace('{!previewMode && <VisitCounter />}', '{/* {!previewMode && <VisitCounter />} */}')
      expect(montagem(comentado)).toBeNull()
      expect(montagem(comentado.replace(/\n/g, '\r\n'))).toBeNull()
    })
  })
})
