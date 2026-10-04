import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `core/orders` roda em Node, em Deno e no browser — e este guarda é o que mantém isso verdadeiro.
 *
 * A edge function `send-notification` já alcança `format.ts` por caminho relativo, e a feature `59`
 * acrescentou ao diretório as regras do selo, da janela do PIX novo, da linha do tempo e do link de
 * rastreio. O Deno resolve por caminho relativo com extensão explícita **e resolve o grafo de tipos
 * junto**: um especificador relativo sem `.ts` — `import type` incluso — derruba o worker antes da
 * primeira linha rodar, e Vite e vitest resolvem as duas formas, então nada mais acusaria.
 *
 * Molde: `core/notifications/__tests__/purity.test.ts`. **Âncora de contagem obrigatória** — uma
 * varredura com caminho errado lê zero arquivo e passa em silêncio.
 *
 * A varredura lê ESPECIFICADOR DE IMPORT, nunca o texto: casar por `includes` sobre a fonte acusaria
 * a prosa dos cabeçalhos, que explicam a regra sem escrever a forma proibida.
 */

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  const codigo = semComentario(fonte)
  while ((m = re.exec(codigo)) !== null) saida.push(m[1])
  return saida
}

const listar = (dir: string, prefixo = ''): string[] =>
  readdirSync(dir).flatMap((f) => {
    const caminho = join(dir, f)
    if (statSync(caminho).isDirectory()) return f === '__tests__' ? [] : listar(caminho, `${prefixo}${f}/`)
    return f.endsWith('.ts') ? [`${prefixo}${f}`] : []
  })

const arquivos = listar(DIR).map((nome) => ({
  nome,
  imports: especificadores(readFileSync(join(DIR, nome), 'utf8')),
}))

/** Relativo sem `.ts` — a forma que o Deno não resolve. */
const relativoSemExtensao = (spec: string): boolean => spec.startsWith('.') && !spec.endsWith('.ts')

/** Pacote de runtime que não existe nos três ambientes. */
const runtimeProibido = (spec: string): boolean =>
  /^(react|react-dom)(\/|$)/.test(spec) ||
  /^@supabase\//.test(spec) ||
  /^@estrelinha\//.test(spec) ||
  /^(https?:|npm:|jsr:)/.test(spec)

describe('core/orders é módulo puro e alcançável pelo Deno', () => {
  it('a varredura enxerga o módulo — âncora de contagem', () => {
    expect(arquivos.map((a) => a.nome)).toEqual(
      expect.arrayContaining([
        'index.ts',
        'format.ts',
        'situation.ts',
        'repix.ts',
        'journey.ts',
        'tracking.ts',
      ]),
    )
    expect(arquivos.length).toBeGreaterThanOrEqual(6)
  })

  it('todo especificador relativo leva `.ts` explícito', () => {
    const acusados = arquivos.flatMap((a) =>
      a.imports.filter(relativoSemExtensao).map((s) => `${a.nome} → ${s}`),
    )
    expect(acusados).toEqual([])
  })

  it('nenhum arquivo importa React, Supabase, alias do Vite ou URL', () => {
    const acusados = arquivos.flatMap((a) =>
      a.imports.filter(runtimeProibido).map((s) => `${a.nome} → ${s}`),
    )
    expect(acusados).toEqual([])
  })

  it('a âncora de USO: o barrel tem especificadores, então a régua não está varrendo o vazio', () => {
    const barrel = arquivos.find((a) => a.nome === 'index.ts')
    expect(barrel?.imports.length).toBeGreaterThanOrEqual(2)
  })

  it('sensor — `import type` relativo sem extensão É acusado', () => {
    const mutante = especificadores(`import type { X } from ${"'./situation'"}\nexport const a = 1`)
    expect(mutante.filter(relativoSemExtensao)).toEqual(['./situation'])
  })

  it('sensor — o par com extensão NÃO é acusado', () => {
    const certo = especificadores(`import type { X } from ${"'./situation.ts'"}`)
    expect(certo.filter(relativoSemExtensao)).toEqual([])
  })

  it('sensor — React, Supabase e o alias são acusados', () => {
    const mutante = especificadores(
      [
        `import { useState } from ${"'react'"}`,
        `import { createClient } from ${"'@supabase/supabase-js'"}`,
        `import type { Order } from ${"'@estrelinha/supabase/types'"}`,
      ].join('\n'),
    )
    expect(mutante.filter(runtimeProibido)).toHaveLength(3)
  })

  it('sensor do removedor de comentário — a menção em prosa não é acusada, com CRLF e com LF', () => {
    const prosa = `// exemplo: from ${"'./types'"}\r\n/* outra: from ${"'./x'"}\n */\nexport const a = 1`
    expect(especificadores(prosa)).toEqual([])
    const usoDepoisDeCrlf = `// nota\r\nimport { x } from ${"'./x'"}\r\n`
    expect(especificadores(usoDepoisDeCrlf)).toEqual(['./x'])
  })
})
