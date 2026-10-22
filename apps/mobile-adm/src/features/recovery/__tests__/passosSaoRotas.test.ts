import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PASSOS_DA_RECUPERACAO } from '../model/passos'

/**
 * Os passos da recuperação e as rotas do `App.tsx` são a MESMA lista, nos dois sentidos, e cada rota
 * desenha o passo que o endereço nomeia (feature 72, `MAF-24`).
 *
 * Um passo sem rota cai no `*` (dentro do guarda) e devolve ao Login — o "Enviar código" pareceria
 * não fazer nada. Uma rota que desenha o passo errado mostra o campo do código no endereço da senha.
 */

const semComentarios = (t: string) => t.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}|\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/** `[caminho, passo]` de cada `<Route path="/recuperar…" element={<RecuperarPage passo="…" />} />`. */
const rotasDaRecuperacao = (fonte: string): Array<[string, string | null]> =>
  [...semComentarios(fonte).matchAll(/<Route\s+path="(\/recuperar[^"]*)"\s+element=\{([^}]*)\}/g)].map((m) => [
    m[1],
    /<RecuperarPage\s+passo="([a-z]+)"/.exec(m[2])?.[1] ?? null,
  ])

const esperado = Object.entries(PASSOS_DA_RECUPERACAO).map(([passo, caminho]) => [caminho, passo])

const fonte = readFileSync(resolve(__dirname, '../../../app/App.tsx'), 'utf8')

describe('PASSOS_DA_RECUPERACAO × rotas do App.tsx', () => {
  it('âncora — três passos e três rotas da recuperação', () => {
    expect(Object.keys(PASSOS_DA_RECUPERACAO)).toEqual(['email', 'codigo', 'senha'])
    expect(rotasDaRecuperacao(fonte)).toHaveLength(3)
  })

  it('cada passo tem a rota dele, e cada rota desenha o passo que o endereço nomeia', () => {
    expect(rotasDaRecuperacao(fonte)).toEqual(esperado)
  })

  it('SENSOR — uma rota que desenha o passo errado é acusada', () => {
    const doente = fonte.replace('<RecuperarPage passo="senha" />', '<RecuperarPage passo="codigo" />')
    expect(doente).not.toBe(fonte)
    expect(rotasDaRecuperacao(doente)).not.toEqual(esperado)
  })

  it('SENSOR — um passo sem rota é acusado', () => {
    const doente = fonte.replace(/\s*<Route path="\/recuperar\/codigo"[^\n]*/, '')
    expect(doente).not.toBe(fonte)
    expect(rotasDaRecuperacao(doente)).toHaveLength(2)
  })

  it('SENSOR INVERSO — rota da recuperação só em comentário não conta', () => {
    expect(rotasDaRecuperacao('// <Route path="/recuperar/x" element={<RecuperarPage passo="x" />} />')).toEqual([])
  })
})
