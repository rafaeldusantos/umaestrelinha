/**
 * `core/filters` é regra pura (feature 66): sem React, sem Supabase, sem Deno — e alcançável fora do
 * Vite desde o primeiro import, com `.ts` explícito em todo especificador relativo, `import type` e
 * `export type` inclusos (ver o `CLAUDE.md` da raiz: o Deno resolve o grafo de TIPOS antes da
 * primeira linha rodar, e Vite e vitest resolvem as duas formas, então nada mais acusaria).
 *
 * A varredura lista o diretório do disco: arquivo novo do módulo entra na medição sozinho. **Âncora
 * de contagem** — sem ela, um caminho errado varre zero arquivo e passa em silêncio.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

const FONTES = readdirSync(DIR)
  .filter(f => f.endsWith('.ts'))
  .map(f => ({ nome: f, fonte: readFileSync(join(DIR, f), 'utf8') }))

const semComentario = (fonte: string): string =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

const especificadores = (fonte: string): string[] =>
  [...semComentario(fonte).matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map(m => m[1])

const acusar = (fontes: { nome: string; fonte: string }[]) => {
  const semExtensao: string[] = []
  const externos: string[] = []
  for (const { nome, fonte } of fontes) {
    for (const esp of especificadores(fonte)) {
      if (!esp.startsWith('.')) externos.push(`${nome} → ${esp}`)
      else if (!esp.endsWith('.ts')) semExtensao.push(`${nome} → ${esp}`)
    }
  }
  return { semExtensao, externos }
}

describe('core/filters é puro e alcançável por Deno', () => {
  it('âncora: os cinco arquivos do módulo são lidos', () => {
    const nomes = FONTES.map(f => f.nome).sort()
    expect(nomes).toEqual(expect.arrayContaining(['facets.ts', 'index.ts', 'rules.ts', 'types.ts', 'url.ts']))
    expect(FONTES.length).toBeGreaterThanOrEqual(5)
  })

  it('âncora: o barril reexporta por especificador relativo (a varredura acha o que medir)', () => {
    const barril = FONTES.find(f => f.nome === 'index.ts')!
    expect(especificadores(barril.fonte).length).toBeGreaterThanOrEqual(4)
  })

  it('todo especificador relativo tem `.ts` explícito', () => {
    expect(acusar(FONTES).semExtensao).toEqual([])
  })

  it('nenhum arquivo importa pacote (React, Supabase, Deno, alias @estrelinha)', () => {
    expect(acusar(FONTES).externos).toEqual([])
  })

  it('sensor: um `export type` sem extensão é acusado', () => {
    const r = acusar([{ nome: 'x.ts', fonte: "export type { A } from './types'\n" }])
    expect(r.semExtensao).toHaveLength(1)
  })

  it('sensor: um import de React é acusado, e a prosa que o cita não é (CRLF e LF)', () => {
    const fonte = "// citado em prosa: import x from 'react'\r\nimport { useState } from 'react'\n"
    expect(acusar([{ nome: 'x.ts', fonte }]).externos).toHaveLength(1)
    expect(acusar([{ nome: 'y.ts', fonte: "/* from '@estrelinha/supabase' */\n" }]).externos).toHaveLength(0)
  })

  it('sensor: o par com extensão passa', () => {
    expect(acusar([{ nome: 'x.ts', fonte: "import { a } from './rules.ts'\n" }])).toEqual({
      semExtensao: [],
      externos: [],
    })
  })
})
