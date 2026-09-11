import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `core/notifications` roda em Node, em Deno e no browser — e este guarda é o que mantém isso
 * verdadeiro.
 *
 * Quem alcança este módulo de fora do Vite é a edge function `send-notification`: o motor importa
 * `eventsForTrigger`, `preconditionFailure`, `interpolate`, a régua de tom e os defaults por
 * caminho relativo. O Deno resolve por caminho relativo com extensão explícita **e resolve o grafo
 * de tipos junto** — um `export * from './events'` sem `.ts`, ou um `import type` de
 * `@estrelinha/supabase/types`, derruba o worker com `Failed resolving types` antes da primeira
 * linha rodar. Vite e vitest resolvem as duas formas, então nada mais acusaria.
 *
 * Molde: `core/menu/__tests__/purity.test.ts`. **Âncora de contagem obrigatória** — uma varredura
 * com caminho errado lê zero arquivo e passa em silêncio, que é a pior falha possível aqui. A
 * varredura desce em `providers/`, porque é lá que a feature 43 acrescenta o adaptador do WhatsApp.
 *
 * **A varredura lê ESPECIFICADOR DE IMPORT, nunca o texto do arquivo.** Casar por `includes` sobre
 * a fonte produz falso positivo em comentário — e faz o guarda ser "consertado" editando prosa.
 */

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Arquivo {
  nome: string
  fonte: string
  imports: string[]
}

/**
 * Comentário fora ANTES de extrair. O `index.ts` deste módulo explica em prosa que um
 * `export * from './events'` sem `.ts` derruba o Deno — e a primeira versão deste extrator leu a
 * prosa como import e acusou o arquivo que estava certo. A saída errada seria reescrever a prosa;
 * a certa é o guarda medir só código. `//` só depois de espaço ou início de linha, para o `//` de
 * uma URL dentro de string não ser tomado por comentário.
 */
const semComentarios = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  const codigo = semComentarios(fonte)
  while ((m = re.exec(codigo)) !== null) saida.push(m[1])
  return saida
}

/** `.ts` de produção, recursivo, fora de `__tests__`. Nome relativo a `notifications/`. */
const listar = (dir: string, prefixo = ''): string[] =>
  readdirSync(dir).flatMap((f) => {
    const caminho = join(dir, f)
    if (statSync(caminho).isDirectory()) return f === '__tests__' ? [] : listar(caminho, `${prefixo}${f}/`)
    return f.endsWith('.ts') ? [`${prefixo}${f}`] : []
  })

const arquivos: Arquivo[] = listar(DIR).map((nome) => {
  const fonte = readFileSync(join(DIR, nome), 'utf8')
  return { nome, fonte, imports: especificadores(fonte) }
})

const importadores = (predicado: (spec: string) => boolean): string[] =>
  arquivos.filter((a) => a.imports.some(predicado)).map((a) => a.nome)

describe('core/notifications é módulo puro', () => {
  it('a varredura enxerga o módulo — âncora de contagem', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(8)
    expect(arquivos.map((a) => a.nome)).toEqual(
      expect.arrayContaining([
        'index.ts',
        'events.ts',
        'precondition.ts',
        'triggers.ts',
        'variables.ts',
        'copy.ts',
        'settings.ts',
        'defaults.ts',
      ]),
    )
  })

  it('a varredura de fato extrai imports — âncora do extrator', () => {
    const total = arquivos.reduce((n, a) => n + a.imports.length, 0)
    expect(total).toBeGreaterThanOrEqual(10)
  })

  it.each(['react', 'react-dom', '@supabase/supabase-js', '@estrelinha/supabase/client', '@estrelinha/supabase/types'])(
    'nenhum arquivo importa %s',
    (dependencia) => {
      expect(importadores((s) => s === dependencia || s.startsWith(`${dependencia}/`))).toEqual([])
    },
  )

  it('nenhum arquivo importa por alias `@estrelinha/*` — o Deno não conhece alias nenhum', () => {
    expect(importadores((s) => s.startsWith('@estrelinha/'))).toEqual([])
  })

  it('nenhum arquivo importa de apps/ nem do pacote de UI', () => {
    expect(importadores((s) => s.includes('apps/') || s.startsWith('@estrelinha/ui'))).toEqual([])
  })

  it('nenhum arquivo toca o DOM nem o Deno — o motor roda em Deno, o painel no browser, o teste em Node', () => {
    const culpados = arquivos.filter((a) =>
      /\b(document|window|localStorage|Deno)\s*\.\w/.test(
        a.fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''),
      ),
    )
    expect(culpados.map((c) => c.nome)).toEqual([])
  })

  it('nenhum arquivo importa de payment/ — notificação não é dinheiro (NTF-16)', () => {
    expect(importadores((s) => s.includes('/payment/'))).toEqual([])
  })
})

describe('core/notifications é importável por Deno', () => {
  it('todo import relativo traz a extensão .ts explícita — inclusive `import type`', () => {
    const semExtensao: string[] = []
    for (const { nome, imports } of arquivos) {
      for (const spec of imports) {
        if (spec.startsWith('.') && !spec.endsWith('.ts')) semExtensao.push(`${nome} → ${spec}`)
      }
    }
    expect(semExtensao).toEqual([])
  })

  it('a varredura de extensão de fato encontra imports relativos — âncora', () => {
    const relativos = arquivos.reduce((n, a) => n + a.imports.filter((s) => s.startsWith('.')).length, 0)
    expect(relativos).toBeGreaterThanOrEqual(10)
  })

  it('SENSOR: o extrator pega um `import type` sem extensão', () => {
    const doente = especificadores("import type { X } from './events'\nexport * from './copy.ts'")
    expect(doente).toEqual(['./events', './copy.ts'])
    expect(doente.filter((s) => s.startsWith('.') && !s.endsWith('.ts'))).toEqual(['./events'])
  })

  it('SENSOR: prosa em comentário não é import — e código depois do comentário continua sendo', () => {
    // O defeito exato que a primeira versão deste guarda teve: o cabeçalho do `index.ts` cita
    // `export * from './events'` como exemplo do erro, e o extrator o acusou.
    const fonte = [
      "// Um `export * from './events'` sem .ts derruba o Deno.",
      '/* e um `import type { A } from "./tipos"` também */',
      "export * from './events.ts'",
      "const url = 'https://exemplo.invalid/x' // comentário no fim da linha",
    ].join('\n')
    expect(especificadores(fonte)).toEqual(['./events.ts'])
    expect(semComentarios(fonte)).toContain("'https://exemplo.invalid/x'")
  })
})
