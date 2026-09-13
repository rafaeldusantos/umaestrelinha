// Feature 47 — a folga do palco tem UM dono, e ele mora em `core`.
//
// Antes desta feature a constante existia **duas vezes**: `HomeLivePreview.tsx:33` e
// `MenuLivePreview.tsx:31`, cada uma com o seu `FOLGA = 40`. É o "defeito 01" em miniatura — mudar a
// folga num palco e não no outro faz as duas prévias escalarem diferente, com build, `tsc` e teste
// de componente verdes, e quem descobre é quem estranha que a mesma loja parece de dois tamanhos.
//
// A régua varre `apps/backoffice/**` procurando **declaração**, nunca menção: os dois palcos
// explicam em comentário que a folga saiu dali, e uma régua ingênua acusaria justamente os arquivos
// que estão certos.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap(nome => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return arquivos(caminho)
    return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

/**
 * Comentário fora, numa varredura só.
 *
 * Linha e bloco na **mesma** passada (`BL-027`), e `[^\n\r]` fecha o comentário de linha antes do
 * `\r`: com `[^\n]`, um arquivo em CRLF engoliria o começo da linha seguinte junto.
 */
const semComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const FONTES = arquivos(RAIZ).map(caminho => ({
  caminho: caminho.slice(RAIZ.length + 1).replace(/\\/g, '/'),
  codigo: semComentarios(readFileSync(caminho, 'utf8')),
}))

/** A régua, escrita uma vez e chamada duas: pela asserção e pelo sensor. */
const declaraFolga = (codigo: string): boolean =>
  /\b(?:const|let|var)\s+FOLGA\b/.test(codigo) ||
  // A forma sem nome: o número cru descontado da caixa antes de escalar.
  /caixa\.(?:width|height)\s*-\s*\d+/.test(codigo)

describe('a folga do palco — dono único (feature 47)', () => {
  it('ÂNCORA: a varredura leu arquivos, e achou os DOIS palcos', () => {
    // Sem as duas âncoras, um caminho errado varreria zero arquivo e a régua abaixo passaria em
    // silêncio — que é a pior falha possível num teste que lê fonte.
    expect(FONTES.length).toBeGreaterThan(100)

    const palcos = FONTES.filter(f => /LivePreview\.tsx$/.test(f.caminho))
    expect(palcos.map(f => f.caminho).sort()).toEqual([
      'features/home-composition/ui/HomeLivePreview.tsx',
      'features/store-menu/ui/MenuLivePreview.tsx',
    ])
  })

  it('nenhum arquivo de `apps/backoffice/**` declara a folga', () => {
    const culpados = FONTES.filter(f => declaraFolga(f.codigo)).map(f => f.caminho)
    expect(culpados).toEqual([])
  })

  it('os dois palcos pedem o quadro a `previewFrame`, em vez de calculá-lo', () => {
    const palcos = FONTES.filter(f => /LivePreview\.tsx$/.test(f.caminho))

    for (const palco of palcos) {
      expect(palco.codigo).toContain('previewFrame(')
      // `previewScale` é a peça que a conta local usava; quem chama `previewFrame` não precisa dela.
      expect(palco.codigo).not.toContain('previewScale')
    }
  })

  it('SENSOR: as duas formas antigas REPROVAM na mesma régua', () => {
    expect(declaraFolga('const FOLGA = 40')).toBe(true)
    expect(declaraFolga('const escala = previewScale(caixa.width - 40, width)')).toBe(true)

    // E o par: o que os palcos fazem hoje **passa**, senão a régua estaria acusando o certo.
    expect(declaraFolga('const frame = previewFrame(device, caixa, cheia)')).toBe(false)
  })

  it('SENSOR: a régua procura DECLARAÇÃO, nunca menção em comentário', () => {
    // Os dois palcos citam a constante antiga no comentário que explica por que ela saiu.
    expect(declaraFolga(semComentarios('// era `const FOLGA = 40` aqui\nconst x = 1'))).toBe(false)
    expect(declaraFolga(semComentarios('/* const FOLGA = 40 */\nconst x = 1'))).toBe(false)
    // Com CRLF, e sem comer a linha seguinte.
    expect(declaraFolga(semComentarios('// nota sobre FOLGA\r\nconst FOLGA = 40'))).toBe(true)
  })
})
