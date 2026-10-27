import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Feature `75` · `AD-059`, design §8.5 — `core/order-actions` não carrega client nenhum.
 *
 * O dono da escrita recebe o client (`OrderWriteDeps`). O único pacote que ele pode citar é o
 * supabase-js, e só em `import type` — o tipo do client que recebe. Um import de VALOR dele (criar o
 * client aqui) faria o módulo depender de env e de rede no carregamento; um `@estrelinha/*` traria o
 * client da loja (que lança sem env) ou o React. Relativo sempre com `.ts` (molde de
 * `core/orders/__tests__/purity.test.ts`).
 *
 * A varredura lê ESPECIFICADOR DE IMPORT sobre a fonte sem comentário — nunca `includes` sobre o
 * texto, que acusaria a prosa dos cabeçalhos. **Âncora de contagem obrigatória**: uma varredura com
 * caminho errado lê zero arquivo e passa em silêncio.
 */

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`BL-027`). */
const semComentario = (fonte: string): string => fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

interface Import {
  spec: string
  /** `import type …` / `export type … from` — só tipo, apagado na compilação. */
  soTipo: boolean
}

const importsDe = (fonte: string): Import[] => {
  const saida: Import[] = []
  const codigo = semComentario(fonte)
  const re = /\b(import|export)(\s+type)?\s+[^'";]*?\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(codigo)) !== null) {
    if (m[3] !== undefined) saida.push({ spec: m[3], soTipo: Boolean(m[2]) })
    else saida.push({ spec: (m[4] ?? m[5]) as string, soTipo: false })
  }
  return saida
}

const listar = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const caminho = join(dir, f)
    if (statSync(caminho).isDirectory()) return f === '__tests__' ? [] : listar(caminho).map((n) => `${f}/${n}`)
    return f.endsWith('.ts') ? [f] : []
  })

const arquivos = listar(DIR).map((nome) => ({ nome, imports: importsDe(readFileSync(join(DIR, nome), 'utf8')) }))

const SUPABASE_JS = '@supabase/supabase-js'

/** O que nenhum arquivo do módulo pode importar, nem como tipo. */
const proibido = (i: Import): boolean =>
  /^(react|react-dom)(\/|$)/.test(i.spec) ||
  /^@estrelinha\//.test(i.spec) ||
  /^@\//.test(i.spec) ||
  /^(https?:|npm:|jsr:|node:)/.test(i.spec) ||
  (i.spec.startsWith('.') && !i.spec.endsWith('.ts')) ||
  // Pacote: só o supabase-js, e só como tipo.
  (!i.spec.startsWith('.') && !(i.spec === SUPABASE_JS && i.soTipo))

const acusados = (lista: { nome: string; imports: Import[] }[]): string[] =>
  lista.flatMap((a) => a.imports.filter(proibido).map((i) => `${a.nome} → ${i.spec}${i.soTipo ? ' (type)' : ''}`))

describe('core/order-actions não carrega client, React nem alias', () => {
  it('a varredura enxerga o módulo — âncora de contagem', () => {
    expect(arquivos.map((a) => a.nome)).toEqual(
      expect.arrayContaining([
        'index.ts',
        'types.ts',
        'notify.ts',
        'status.ts',
        'tracking.ts',
        'material.ts',
        'appAction.ts',
        'materialTracking.ts',
      ]),
    )
    expect(arquivos.length).toBeGreaterThanOrEqual(8)
  })

  it('a âncora de USO: o barril e os arquivos têm imports, então a régua não varre o vazio', () => {
    expect(arquivos.find((a) => a.nome === 'index.ts')?.imports.length).toBeGreaterThanOrEqual(6)
    expect(arquivos.find((a) => a.nome === 'types.ts')?.imports).toContainEqual({ spec: SUPABASE_JS, soTipo: true })
  })

  it('nenhum import proibido: React, `@estrelinha/*`, alias, URL, relativo sem `.ts`, supabase-js como valor', () => {
    expect(acusados(arquivos)).toEqual([])
  })

  it('sensor — `import { createClient }` (VALOR) do supabase-js É acusado', () => {
    const mutante = [{ nome: 'x.ts', imports: importsDe(`import { createClient } from '${SUPABASE_JS}'\n`) }]
    expect(acusados(mutante)).toEqual([`x.ts → ${SUPABASE_JS}`])
  })

  it('sensor — o mesmo pacote em `import type` NÃO é acusado (o inverso)', () => {
    const certo = [{ nome: 'x.ts', imports: importsDe(`import type { SupabaseClient } from '${SUPABASE_JS}'\n`) }]
    expect(acusados(certo)).toEqual([])
  })

  it('sensor — React, `@estrelinha/*`, alias e relativo sem `.ts` (inclusive `import type`) são acusados', () => {
    const mutante = [
      {
        nome: 'x.ts',
        imports: importsDe(
          [
            `import { useState } from 'react'`,
            `import { supabase } from '@estrelinha/supabase'`,
            `import type { DbOrder } from '@estrelinha/supabase/types'`,
            `import { x } from '@/shared/x'`,
            `import type { Y } from './types'`,
            `export { z } from '../orders/tracking'`,
          ].join('\n'),
        ),
      },
    ]
    expect(acusados(mutante)).toHaveLength(6)
  })

  it('sensor do removedor de comentário — a menção em prosa não é acusada, com CRLF e com LF', () => {
    const prosa = `// exemplo: import { createClient } from '${SUPABASE_JS}'\r\n/* outra: from './x'\n */\nexport const a = 1`
    expect(importsDe(prosa)).toEqual([])
    const usoDepoisDeCrlf = `// nota\r\nimport { x } from './x'\r\n`
    expect(importsDe(usoDepoisDeCrlf)).toEqual([{ spec: './x', soTipo: false }])
  })
})
