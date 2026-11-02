/**
 * `core/buy-together` é lido pelo painel, pela loja e pela function `checkout` no Deno, por caminho
 * relativo. Lá todo especificador relativo precisa de `.ts` — `import type` incluso — e nenhum pacote
 * resolve. Vite e vitest aceitam as duas formas, então só este guarda acusa. Ele caminha o grafo
 * TRANSITIVO a partir de todo arquivo do diretório, lido do disco (âncora cravada de contagem), e
 * recusa React, Supabase, Deno, alias e `node:`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const ARQUIVOS = readdirSync(DIR).filter((f) => f.endsWith('.ts')).sort()

type Leitor = (caminho: string) => string

const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(semComentario(fonte))) !== null) saida.push(m[1])
  return saida
}

const rotulo = (c: string) => c.replace(/\\/g, '/').split('/').slice(-2).join('/')

const caminhar = (entradas: string[], ler: Leitor) => {
  const visitados: string[] = []
  const semExtensao: string[] = []
  const externos: string[] = []
  const fila = [...entradas]
  const vistos = new Set<string>()
  while (fila.length > 0) {
    const atual = fila.shift()!
    if (vistos.has(atual)) continue
    vistos.add(atual)
    visitados.push(atual)
    for (const spec of especificadores(ler(atual))) {
      if (!spec.startsWith('.')) externos.push(`${rotulo(atual)} → ${spec}`)
      else if (!spec.endsWith('.ts')) semExtensao.push(`${rotulo(atual)} → ${spec}`)
      else fila.push(join(dirname(atual), spec))
    }
  }
  return { visitados, semExtensao, externos }
}

const disco: Leitor = (c) => readFileSync(c, 'utf8')
const entradas = ARQUIVOS.map((f) => join(DIR, f))

describe('core/buy-together — puro e alcançável pelo Deno', () => {
  const g = caminhar(entradas, disco)

  it('âncora: os sete arquivos do módulo e as duas folhas que ele importa foram lidos', () => {
    expect(ARQUIVOS).toEqual(['availability.ts', 'index.ts', 'marks.ts', 'rules.ts', 'settings.ts', 'total.ts', 'types.ts'])
    // Os sete do módulo, mais `material/material.ts` e `payment/pix.ts`, que `total.ts` alcança.
    expect(g.visitados).toHaveLength(9)
    expect(disco(join(DIR, 'rules.ts'))).toContain('export const listDeleteRefusal')
  })

  it('nenhum especificador relativo sem `.ts` no grafo transitivo', () => {
    expect(g.semExtensao).toEqual([])
  })

  it('nenhum import de pacote (React, Supabase, Deno, alias, node:)', () => {
    expect(g.externos).toEqual([])
  })

  it('sensor — `import type` sem extensão É acusado', () => {
    const m: Leitor = (c) =>
      rotulo(c) === 'buy-together/rules.ts' ? `import type { X } from './types'\n${disco(c)}` : disco(c)
    expect(caminhar(entradas, m).semExtensao).toEqual(['buy-together/rules.ts → ./types'])
  })

  it('sensor — React e o client do Supabase SÃO acusados', () => {
    const m: Leitor = (c) =>
      rotulo(c) === 'buy-together/rules.ts'
        ? `import { useMemo } from 'react'\nimport { supabase } from '@estrelinha/supabase/client'\n${disco(c)}`
        : disco(c)
    expect(caminhar(entradas, m).externos).toHaveLength(2)
  })

  it('sensor inverso — a menção em comentário (CRLF e LF) não é acusada', () => {
    const m: Leitor = (c) =>
      rotulo(c) === 'buy-together/rules.ts' ? `// from 'react'\r\n/* from './x'\n */\n${disco(c)}` : disco(c)
    const r = caminhar(entradas, m)
    expect(r.semExtensao).toEqual([])
    expect(r.externos).toEqual([])
  })
})
