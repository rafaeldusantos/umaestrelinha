/**
 * Feature 62 · `MTA-10` (a) — toda página da loja declara o próprio `<head>`.
 *
 * O defeito que esta feature fecha tinha esta forma: 17 de 18 páginas herdavam o `<title>` do
 * `index.html`, e nada quebrava — build, `tsc` e teste de componente passam com a aba dizendo a
 * mesma coisa em todo lugar. Com o GA4 ligado, todo `page_view` saía com o mesmo título.
 *
 * E `usePageMeta` **não reverte ao desmontar** (A12): uma página nova que esquecesse a chamada
 * herdaria o título da página ANTERIOR, que é pior que o genérico. Este guarda é a contrapartida
 * obrigatória daquela decisão.
 *
 * Lê o `App.tsx` do disco, colhe cada `lazy(() => import("@/pages/X"))` e exige `usePageMeta(` em
 * CÓDIGO no arquivo de cada uma — a prosa que cita o hook não conta (`semComentario`, linha e bloco
 * na mesma varredura, `BL-027`).
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const APP = readFileSync(resolve(SRC, 'app/App.tsx'), 'utf8')

const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/** As páginas `lazy` do `App.tsx`, pelo caminho do import. */
const paginasLazy = (app: string): string[] =>
  [...semComentario(app).matchAll(/lazy\(\s*\(\)\s*=>\s*import\(\s*["']@\/pages\/([\w/]+)["']\s*\)\s*\)/g)].map(
    m => m[1],
  )

const declara = (fonte: string): boolean => /\busePageMeta\s*\(/.test(semComentario(fonte))

const fonteDa = (pagina: string): string => readFileSync(resolve(SRC, `pages/${pagina}.tsx`), 'utf8')

describe('toda página lazy do App.tsx chama usePageMeta (MTA-10 a)', () => {
  const paginas = paginasLazy(APP)

  it('âncora: o App.tsx declara 18 páginas lazy', () => {
    // Número cravado de propósito: uma página nova muda esta contagem, e quem a acrescenta é
    // obrigado a passar por aqui — é exatamente o momento de lembrar do `usePageMeta`.
    expect(paginas).toHaveLength(18)
  })

  it.each(paginasLazy(APP))('`pages/%s.tsx` declara o próprio metadado', pagina => {
    expect(declara(fonteDa(pagina))).toBe(true)
  })

  it('sensor: uma página sem a chamada é acusada', () => {
    const semChamada = fonteDa('AboutPage').replace(/usePageMeta\s*\(/g, 'useAlgoMais(')
    expect(declara(semChamada)).toBe(false)
  })

  it('sensor: a chamada só em comentário NÃO conta (CRLF e LF)', () => {
    expect(declara('// usePageMeta(staticPageMeta("/"))\r\nconst X = () => null')).toBe(false)
    expect(declara('/* usePageMeta(x) */\nconst X = () => null')).toBe(false)
    expect(declara('const X = () => { usePageMeta(m) }')).toBe(true)
  })

  it('sensor: o colhedor acha uma página lazy nova, e ignora a citada em comentário', () => {
    const app = `${APP}\nconst Nova = lazy(() => import("@/pages/NovaPage"));\n// lazy(() => import("@/pages/Fantasma"))`
    expect(paginasLazy(app)).toContain('NovaPage')
    expect(paginasLazy(app)).not.toContain('Fantasma')
  })
})
