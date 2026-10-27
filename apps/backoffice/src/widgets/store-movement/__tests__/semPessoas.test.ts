// Feature 71 · `VIS-41` — o bloco nunca chama o número de "pessoas" nem de "usuários".
//
// O contador conta NAVEGADORES: celular e computador da mesma cliente contam dois, e cada janela
// anônima conta um. Chamar isso de "pessoas" afirmaria o que o contador não sabe. O rótulo é
// "Visitas únicas", e o ⓘ explica o resto.
//
// A régua lê o fonte do widget do disco, SEM comentários — este arquivo e os do widget explicam a
// regra em prosa, e uma régua que casasse menção acusaria quem está certo. Linha e bloco na mesma
// varredura, com o CRLF normalizado antes (`L-031`, `BL-027`).

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Os arquivos de PRODUÇÃO do widget, escritos um a um: a lista é a decisão de escopo.
 *
 * Feature `83` (`L-035`): as três notas do contador saíram de `model/labels.ts` para
 * `packages/core/src/stats/counterNotes.ts` e são desenhadas por este bloco (reexportadas). Sem o
 * quarto arquivo o escopo encolheria em silêncio — "pessoas" entraria numa nota sem acusar.
 */
const ARQUIVOS = [
  'model/labels.ts',
  'ui/StoreMovement.tsx',
  'index.ts',
  '../../../../../packages/core/src/stats/counterNotes.ts',
] as const

const semComentarios = (texto: string): string =>
  texto.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

/** "pessoa(s)" e "usuário(s)/usuária(s)", com e sem acento, sem diferenciar maiúsculas. */
const PALAVRA_PROIBIDA = /(?<![\p{L}])(pessoas?|usu[aá]ri[oa]s?)(?![\p{L}])/giu

/** A régua, chamada pelas asserções e pelos sensores (`L-015`). */
const proibidas = (fonte: string): string[] =>
  Array.from(semComentarios(fonte).matchAll(PALAVRA_PROIBIDA), m => m[1])

const FONTES = ARQUIVOS.map(caminho => ({ caminho, fonte: readFileSync(resolve(RAIZ, caminho), 'utf8') }))

describe('VIS-41 — sem "pessoas" e sem "usuários" no bloco', () => {
  it('ÂNCORA: os quatro arquivos foram lidos, e o texto do ⓘ, o rótulo e as notas estão neles', () => {
    expect(FONTES).toHaveLength(4)
    expect(FONTES.every(f => f.fonte.length > 0)).toBe(true)
    const labels = semComentarios(FONTES[0].fonte)
    expect(labels).toContain('export const VISIT_INFO_TEXT')
    expect(labels).toContain('Cada navegador conta uma vez no período')
    expect(semComentarios(FONTES[1].fonte)).toContain('Visitas únicas')
    // O dono das notas do contador (feature 83), NOMEADO: um caminho errado lançaria na leitura, e
    // um arquivo trocado não teria as três declarações.
    const notas = semComentarios(FONTES[3].fonte)
    expect(FONTES[3].caminho.endsWith('packages/core/src/stats/counterNotes.ts')).toBe(true)
    for (const nome of ['countingSinceLine', 'emptyCounterLine', 'cappedLine']) {
      expect(notas).toContain(`export const ${nome}`)
    }
  })

  it('nenhum literal do widget fala em pessoas ou usuários', () => {
    const achados = FONTES.flatMap(f => proibidas(f.fonte).map(p => `${f.caminho}: ${p}`))
    expect(achados).toEqual([])
  })

  it('SENSOR: a palavra num literal REPROVA, nas formas singular, plural, com e sem acento', () => {
    expect(proibidas("const t = '5 pessoas visitaram'")).toEqual(['pessoas'])
    expect(proibidas('<p>Uma pessoa</p>')).toEqual(['pessoa'])
    expect(proibidas("label: 'Usuários únicos'")).toEqual(['Usuários'])
    expect(proibidas("label: 'usuarios'")).toEqual(['usuarios'])
  })

  it('SENSOR: a prosa em comentário NÃO é acusada — com LF e com CRLF', () => {
    expect(proibidas('// não chamar de pessoas\nconst x = 1')).toEqual([])
    expect(proibidas('/* usuários */\nconst x = 1')).toEqual([])
    // Em CRLF o removedor não pode engolir a linha seguinte.
    expect(proibidas("// nota\r\nconst t = 'pessoas'")).toEqual(['pessoas'])
  })

  it('INVERSO: "Visitas únicas" e "navegador" passam; palavra que só CONTÉM o trecho também', () => {
    expect(proibidas("label: 'Visitas únicas'")).toEqual([])
    expect(proibidas("'Cada navegador conta uma vez'")).toEqual([])
    expect(proibidas("'pessoal'")).toEqual([])
  })
})
