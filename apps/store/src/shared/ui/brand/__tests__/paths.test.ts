import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCKUP, SIGNATURE, SYMBOL, SYMBOL_TINY, type BrandArt } from '../paths'

/**
 * `paths.ts` é **gerado** de `.specs/brand/uma-estrelinha/*.svg` — `IDN-06`.
 *
 * São ~10KB de coordenada. Transcrever à mão não quebra nada visível: a letra
 * sai deformada, o build passa, o `tsc` passa e todo teste de componente passa.
 * Por isso a comparação aqui é **caractere a caractere** contra o arquivo-fonte,
 * e não uma inspeção de que "parece um path".
 *
 * ## A regra estrutural desta marca não é `fill-rule`
 *
 * A marca anterior era preenchimento: os contadores das letras eram buracos, e
 * separar os subpaths em elementos próprios pintava o miolo por cima do corpo.
 * Esta marca é **monoline** — `fill="none"`, tudo traço. Não há contador para
 * vazar, e `fill-rule` não tem efeito sobre um path que não preenche.
 *
 * O que a substitui é a **espessura**: um `<path>` por papel de traço. Dois
 * papéis com a mesma espessura vêm fundidos do arquivo-fonte; papéis com
 * espessuras diferentes não podem ser fundidos sem mudar o desenho. O sintoma
 * de um papel partido é **dois `<path>` com a mesma espessura no mesmo `<svg>`**
 * — e é isso que a última suíte aqui procura, no arquivo-fonte.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const BRAND = resolve(HERE, '../../../../../../..', '.specs/brand/uma-estrelinha')

/** Cada degrau, com o SVG de que foi gerado. */
const ARTES: ReadonlyArray<{ nome: string; art: BrandArt; file: string }> = [
  { nome: 'LOCKUP', art: LOCKUP, file: 'uma-estrelinha-lockup.svg' },
  { nome: 'SIGNATURE', art: SIGNATURE, file: 'uma-estrelinha-assinatura.svg' },
  { nome: 'SYMBOL', art: SYMBOL, file: 'uma-estrelinha-simbolo.svg' },
  { nome: 'SYMBOL_TINY', art: SYMBOL_TINY, file: 'uma-estrelinha-simbolo-16.svg' },
]

/** Os `<path>` do arquivo-fonte: `d` e espessura, na ordem de desenho. */
function pathsDoSvg(file: string): { d: string; width: number }[] {
  const svg = readFileSync(join(BRAND, file), 'utf8')
  return [...svg.matchAll(/<path d="([^"]+)"[^>]*stroke-width="([\d.]+)"/g)].map((m) => ({
    d: m[1],
    width: Number(m[2]),
  }))
}

function viewBoxDoSvg(file: string): string {
  return readFileSync(join(BRAND, file), 'utf8').match(/viewBox="([^"]+)"/)[1]
}

describe('âncora — a leitura encontrou a marca inteira', () => {
  it('são quatro degraus', () => {
    // Sem esta âncora, apagar um degrau do gerado não seria notado: as suítes
    // abaixo iteram a lista, e uma lista menor concorda consigo mesma. O número
    // está escrito aqui, e não derivado de `ARTES.length`, de propósito.
    expect(ARTES.length).toBe(4)
  })

  it('os quatro somam 10 papéis de traço', () => {
    // lockup 4 (marca · tipografia · assinatura · losangos) + assinatura 3
    // (marca · losangos · tipografia) + símbolo 2 (marca · fagulhas) +
    // símbolo reduzido 1.
    const total = ARTES.reduce((soma, { art }) => soma + art.strokes.length, 0)
    expect(total).toBe(10)
  })

  it.each(ARTES)('o SVG-fonte de `$nome` foi lido e tem traço', ({ file }) => {
    expect(pathsDoSvg(file).length).toBeGreaterThan(0)
  })
})

describe('a geometria veio do SVG, sem transcrição', () => {
  it.each(ARTES)('`$nome` bate caractere a caractere com `$file`', ({ art, file }) => {
    const fonte = pathsDoSvg(file)

    expect(art.strokes.length).toBe(fonte.length)
    art.strokes.forEach((stroke, i) => {
      expect(stroke.d).toBe(fonte[i].d)
    })
  })

  it.each(ARTES)('a espessura de cada papel de `$nome` veio do SVG', ({ art, file }) => {
    // A espessura é geometria nesta marca: errar 5,7 por 5,07 muda o desenho e
    // não muda mais nada. Ela é comparada como o `d`, do arquivo.
    expect(art.strokes.map((s) => s.width)).toEqual(pathsDoSvg(file).map((p) => p.width))
  })

  it.each(ARTES)('o viewBox de `$nome` veio do SVG', ({ art, file }) => {
    expect(art.viewBox).toBe(viewBoxDoSvg(file))
  })

  it.each(ARTES)('a proporção de `$nome` sai do próprio viewBox', ({ art }) => {
    const [, , w, h] = art.viewBox.split(/\s+/).map(Number)
    expect(art.ratio).toBeCloseTo(w / h, 6)
  })
})

describe('um `<path>` por papel de traço', () => {
  it.each(ARTES)('`$nome` não tem papel partido em dois elementos', ({ file }) => {
    // Duas espessuras iguais no mesmo arquivo = um papel que foi partido. O
    // export do Paper vem assim (um `<path>` por sub-elemento da camada); a
    // consolidação da T24 é o que este teste guarda.
    const larguras = pathsDoSvg(file).map((p) => p.width)
    expect(new Set(larguras).size).toBe(larguras.length)
  })

  it.each(ARTES)('`$nome` tem pelo menos um papel com vários subpaths', ({ art }) => {
    // Consolidar significa subpaths DENTRO do path. Um papel com um `M` só é
    // legítimo (a assinatura é uma linha; o anel é um arco), mas o conjunto não
    // pode ser todo de um subpath — isso seria o export cru.
    const subpaths = art.strokes.map((s) => (s.d.match(/M/g) ?? []).length)
    expect(Math.max(...subpaths)).toBeGreaterThan(1)
  })
})
