import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * O aplicador do perfil de estilo está MONTADO, no lugar certo.
 *
 * `StyleProfileApplier.test.tsx` monta o componente ele mesmo; existir sem ninguém montar passaria em
 * build, `tsc` e nele. Este guarda lê o `App.tsx` do disco (molde de `contadorMontado.test.tsx`) e
 * exige: importado, montado SEM condição de prévia (é na prévia que o rascunho chega), dentro do
 * `BrowserRouter` (a troca de rota vem dele) e fora das `Routes` (o checkout e o 404 vestem o perfil).
 *
 * A régua é uma função pura, chamada pela asserção e pelos sensores. Uma forma que ela não lê devolve
 * `null` e derruba a âncora.
 */

const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf-8')

/** Linha e bloco na MESMA varredura (`BL-027`). */
const semComentario = (fonte: string): string => fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

interface Montagem {
  importado: boolean
  semCondicao: boolean
  dentroDoRouter: boolean
  foraDasRoutes: boolean
}

function montagem(fonte: string): Montagem | null {
  const codigo = semComentario(fonte)
  const elemento = codigo.search(/<StyleProfileApplier\s*\/>/)
  if (elemento === -1) return null
  const abreRouter = codigo.indexOf('<BrowserRouter>')
  const fechaRouter = codigo.indexOf('</BrowserRouter>')
  const abreRoutes = codigo.indexOf('<Routes>')
  const fechaRoutes = codigo.indexOf('</Routes>')
  return {
    importado: /import\s+StyleProfileApplier\s+from\s+["']@\/app\/StyleProfileApplier["']/.test(codigo),
    semCondicao: !/(?:&&|\?)\s*<StyleProfileApplier\s*\/>/.test(codigo),
    dentroDoRouter: abreRouter !== -1 && abreRouter < elemento && elemento < fechaRouter,
    foraDasRoutes: abreRoutes !== -1 && (elemento < abreRoutes || elemento > fechaRoutes),
  }
}

describe('o aplicador do perfil está montado no App', () => {
  it('âncora: o App foi lido e o elemento foi encontrado', () => {
    expect(APP).toContain('<BrowserRouter>')
    expect(APP).toContain('<Routes>')
    expect(montagem(APP)).not.toBeNull()
  })

  it('importado, sem condição de prévia, dentro do BrowserRouter e fora das Routes', () => {
    expect(montagem(APP)).toEqual({
      importado: true,
      semCondicao: true,
      dentroDoRouter: true,
      foraDasRoutes: true,
    })
  })

  it('sensor: só no comentário não conta como montado', () => {
    const fonte = APP.replace(/<StyleProfileApplier\s*\/>/g, '{/* <StyleProfileApplier /> */}')
    expect(montagem(fonte)).toBeNull()
  })

  it('sensor: atrás de `!previewMode &&` reprova', () => {
    const fonte = APP.replace(/<StyleProfileApplier\s*\/>/, '{!previewMode && <StyleProfileApplier />}')
    expect(montagem(fonte)?.semCondicao).toBe(false)
  })

  it('sensor: fora do BrowserRouter reprova', () => {
    const sem = APP.replace(/<StyleProfileApplier\s*\/>/, '')
    const fonte = sem.replace('<BrowserRouter>', '<StyleProfileApplier /><BrowserRouter>')
    expect(montagem(fonte)?.dentroDoRouter).toBe(false)
  })
})
