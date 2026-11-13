import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { tomProibido } from '@/test/tomProibido'

/**
 * O registro da loja é memorial: os textos da faixa de avisos — o rótulo da região e o das setas —
 * não usam urgência, contagem, escassez, prova social, apelo à economia, exclamação nem emoji. O
 * texto de cada aviso é da dona (dado, não código); este guarda lê os literais do widget, do disco e
 * sem comentário. A régua é a do Compre Junto (`@/test/tomProibido`).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const WIDGET = resolve(HERE, '../..')

const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap(nome => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' ? [] : arquivos(caminho)
    return /\.tsx?$/.test(nome) ? [caminho] : []
  })

/** Literais de texto: o que a cliente lê (e as classes, que a régua não acusa). */
const literais = (fonte: string): string[] =>
  [...fonte.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].map(m => m[1] ?? m[2] ?? m[3] ?? '')

const lidos = arquivos(WIDGET).map(caminho => ({
  caminho,
  textos: literais(semComentarios(readFileSync(caminho, 'utf8'))),
}))

describe('a faixa de avisos mantém o tom memorial', () => {
  it('âncora: os rótulos da faixa estão entre os literais lidos', () => {
    const todos = lidos.flatMap(l => l.textos)
    expect(todos).toContain('Avisos da loja')
    expect(todos).toContain('Aviso anterior')
    expect(todos).toContain('Próximo aviso')
  })

  it('nenhum literal usa urgência, escassez, prova social, exclamação ou emoji', () => {
    const achados = lidos.flatMap(l => l.textos.filter(tomProibido).map(t => `${l.caminho}: ${t}`))
    expect(achados).toEqual([])
  })

  it('sensor — um rótulo de urgência no widget é acusado', () => {
    const faixa = lidos.find(l => l.caminho.endsWith('AnnouncementBar.tsx'))!
    const mutado = [...faixa.textos, 'Últimas unidades!']
    expect(mutado.filter(tomProibido)).toEqual(['Últimas unidades!'])
  })

  it('sensor inverso — os rótulos da faixa não são acusados', () => {
    for (const frase of ['Avisos da loja', 'Aviso anterior', 'Próximo aviso', ' · ']) {
      expect(tomProibido(frase), frase).toBe(false)
    }
  })
})
