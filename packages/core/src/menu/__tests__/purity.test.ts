import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `core/menu` roda em Node, em Deno e no browser — e este guarda é o que mantém isso verdadeiro.
 *
 * Quem alcança este módulo de fora do Vite é a edge function do **sitemap**: o dono da canônica de
 * categoria é `categoryHref`, e ele mora aqui. Deno resolve por caminho relativo com extensão
 * explícita **e resolve o grafo de tipos junto** — um `export * from './menu'` sem `.ts`, ou um
 * `import type` de `@estrelinha/supabase/types`, derruba o worker com `Failed resolving types` antes
 * da primeira linha rodar. Medido em 2026-08-29; está escrito no `index.ts` e no `CLAUDE.md`.
 *
 * A feature 39 acrescenta três arquivos ao módulo (`icons.ts`, `target.ts`, `banners.ts`) e um deles
 * é o vocabulário de um conjunto de ícones **React**. É exatamente o tipo de arquivo que convida o
 * import errado: `MENU_ICON_COMPONENTS` mora em `@estrelinha/ui/icons`, e trazê-lo para cá não
 * quebraria teste nenhum — quebraria o sitemap em produção.
 *
 * Molde: `core/shopping/__tests__/purity.test.ts`. **Âncora de contagem obrigatória** — uma varredura
 * com caminho errado lê zero arquivo e passa em silêncio, que é a pior falha possível aqui.
 *
 * **A varredura lê ESPECIFICADOR DE IMPORT, nunca o texto do arquivo.** Casar por `includes` sobre a
 * fonte produz falso positivo em comentário — e faz o guarda ser "consertado" editando prosa.
 */

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Arquivo {
  nome: string
  fonte: string
  imports: string[]
}

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(fonte)) !== null) saida.push(m[1])
  return saida
}

const arquivos: Arquivo[] = readdirSync(DIR)
  .filter(f => f.endsWith('.ts'))
  .map(f => {
    const fonte = readFileSync(join(DIR, f), 'utf8')
    return { nome: f, fonte, imports: especificadores(fonte) }
  })

const importadores = (predicado: (spec: string) => boolean): string[] =>
  arquivos.filter(a => a.imports.some(predicado)).map(a => a.nome)

describe('core/menu é módulo puro', () => {
  it('a varredura enxerga o módulo — âncora de contagem', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(5)
    expect(arquivos.map(a => a.nome)).toEqual(
      expect.arrayContaining(['index.ts', 'menu.ts', 'icons.ts', 'target.ts', 'banners.ts']),
    )
  })

  it('a varredura de fato extrai imports — âncora do extrator', () => {
    const total = arquivos.reduce((n, a) => n + a.imports.length, 0)
    expect(total).toBeGreaterThanOrEqual(4)
  })

  it.each(['react', 'react-dom', '@supabase/supabase-js', '@estrelinha/supabase/client'])(
    'nenhum arquivo importa %s',
    dependencia => {
      expect(importadores(s => s === dependencia)).toEqual([])
    },
  )

  it('nenhum arquivo importa o pacote de UI — o desenho do ícone mora lá, a chave mora aqui', () => {
    expect(importadores(s => s.startsWith('@estrelinha/ui'))).toEqual([])
  })

  it('nenhum arquivo importa de apps/', () => {
    expect(importadores(s => s.includes('apps/'))).toEqual([])
  })

  it('nenhum arquivo toca o DOM — a function do sitemap roda em Deno, sem document nem window', () => {
    const culpados = arquivos.filter(a =>
      /\b(document|window|localStorage)\s*\.\w/.test(
        // comentário fora: o que importa é código
        a.fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''),
      ),
    )
    expect(culpados.map(c => c.nome)).toEqual([])
  })

  it('nenhum arquivo importa de payment/ — menu não é caminho de dinheiro', () => {
    expect(importadores(s => s.includes('/payment/'))).toEqual([])
  })
})

describe('core/menu é importável por Deno', () => {
  it('todo import relativo traz a extensão .ts explícita', () => {
    const semExtensao: string[] = []
    for (const { nome, imports } of arquivos) {
      for (const spec of imports) {
        if (spec.startsWith('.') && !spec.endsWith('.ts')) semExtensao.push(`${nome} → ${spec}`)
      }
    }
    expect(semExtensao).toEqual([])
  })

  it('a varredura de extensão de fato encontra imports relativos — âncora', () => {
    const relativos = arquivos.reduce(
      (n, a) => n + a.imports.filter(s => s.startsWith('.')).length,
      0,
    )
    expect(relativos).toBeGreaterThanOrEqual(4)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A varredura TRANSITIVA — feature 39
//
// A régua acima olha só os arquivos deste diretório, e isso deixou de bastar: `menu/preview.ts`
// importa `../home/preview.ts`, que importava `'./types'` **sem extensão**. Os dois especificadores
// de `core/menu` estavam certos, o guarda passava, e o Deno da function do sitemap teria morrido com
// `Failed resolving types` na primeira linha — porque ele resolve o grafo INTEIRO, e o de tipos
// junto. Um vizinho pode quebrar este módulo sem tocar nele.
//
// A caminhada começa no `index.ts`, que é a única porta declarada em `package.json`.
// ───────────────────────────────────────────────────────────────────────────

/** Um leitor de arquivo, injetável — é o que torna o sensor por mutação possível. */
type Leitor = (caminho: string) => string

/** `…/packages/core/src/home/preview.ts` → `home/preview.ts`. Independe de separador e de raiz. */
const rotulo = (caminho: string): string =>
  caminho.replace(/\\/g, '/').split('/').slice(-2).join('/')

const caminharGrafo = (
  entrada: string,
  ler: Leitor,
): { visitados: string[]; semExtensao: string[] } => {
  const visitados: string[] = []
  const semExtensao: string[] = []
  const fila = [entrada]
  const vistos = new Set<string>()

  while (fila.length > 0) {
    const atual = fila.shift()!
    if (vistos.has(atual)) continue
    vistos.add(atual)
    visitados.push(atual)

    for (const spec of especificadores(ler(atual))) {
      if (!spec.startsWith('.')) continue
      if (!spec.endsWith('.ts')) {
        // Sem extensão o grafo não é caminhável a partir daqui: registra e para neste ramo, em vez
        // de adivinhar `+ '.ts'` — adivinhar faria o guarda "consertar" o defeito que ele mede.
        semExtensao.push(`${rotulo(atual)} → ${spec}`)
        continue
      }
      fila.push(join(dirname(atual), spec))
    }
  }

  return { visitados, semExtensao }
}

describe('core/menu é importável por Deno — o grafo TRANSITIVO', () => {
  const grafo = caminharGrafo(join(DIR, 'index.ts'), c => readFileSync(c, 'utf8'))

  it('a caminhada sai de `core/menu` e alcança os vizinhos — âncora', () => {
    // Sem esta âncora, um `index.ts` que deixasse de exportar tudo faria a asserção abaixo varrer
    // dois arquivos e aprovar em silêncio.
    const rel = grafo.visitados.map(rotulo)
    expect(grafo.visitados.length).toBeGreaterThanOrEqual(8)
    expect(rel).toEqual(
      expect.arrayContaining([
        'menu/index.ts',
        'menu/menu.ts',
        'menu/preview.ts',
        'routes/index.ts',
        'home/preview.ts',
      ]),
    )
  })

  it('nenhum arquivo do grafo tem especificador relativo sem `.ts`', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('a régua PEGA o defeito de um vizinho — sensor por mutação', () => {
    // O defeito exato que existia antes desta feature: `menu/preview.ts` correto, e o arquivo de
    // `home` que ele importa com um `import type` sem extensão. Sem este sensor, a asserção acima
    // mede uma ausência — e ausência é o que passa sozinha quando o instrumento falha.
    const falso: Record<string, string> = {
      '/x/menu/index.ts': "export * from './preview.ts'",
      '/x/menu/preview.ts': "import type { A } from '../home/preview.ts'",
      '/x/home/preview.ts': "import type { HomeSection } from './types'",
    }
    const doente = caminharGrafo('/x/menu/index.ts', c => falso[c.replace(/\\/g, '/')] ?? '')
    expect(doente.semExtensao).toEqual(['home/preview.ts → ./types'])

    const curado = caminharGrafo('/x/menu/index.ts', c =>
      (falso[c.replace(/\\/g, '/')] ?? '').replace("'./types'", "'./types.ts'"),
    )
    expect(curado.semExtensao).toEqual([])
  })
})
