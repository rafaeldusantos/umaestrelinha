import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `core/admin-users` roda em Node, em Deno e no browser — e este guarda é o que mantém isso
 * verdadeiro.
 *
 * Quem alcança este módulo de fora do Vite é a edge function **`admin-users`**: ela importa as
 * recusas por caminho relativo (`../../../packages/core/src/admin-users/index.ts`) porque Deno não
 * conhece os alias `@estrelinha/*`. E Deno resolve o grafo **de tipos** junto — um
 * `export * from './refusals'` sem `.ts`, ou um `import type` de `@estrelinha/supabase/types`,
 * derruba o worker com `Failed resolving types` **antes da primeira linha rodar**. Nada no
 * `pnpm test` acusaria: vitest e Vite resolvem as duas formas.
 *
 * Molde: `core/menu/__tests__/purity.test.ts`. **Âncora de contagem obrigatória** — uma varredura
 * com caminho errado lê zero arquivo e passa em silêncio, que é a pior falha possível aqui.
 *
 * **A varredura lê ESPECIFICADOR DE IMPORT, nunca o texto do arquivo.** Casar por `includes` sobre
 * a fonte produz falso positivo em comentário — e faz o guarda ser "consertado" editando prosa.
 * Este arquivo cita `@estrelinha/supabase/types` na explicação acima, e é exatamente o caso que
 * derrubaria uma régua ingênua.
 */

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Arquivo {
  nome: string
  fonte: string
  imports: string[]
}

/**
 * Remove comentário de linha **e** de bloco na MESMA varredura.
 *
 * Sem isto a régua casa **menção** em vez de **uso**, e acusa exatamente o arquivo que está certo:
 * o `index.ts` deste módulo explica em prosa por que `export * from './refusals'` sem extensão
 * derruba o worker, e a primeira escrita deste guarda reprovou por causa dessa frase. É o mesmo
 * defeito que a feature 47 achou em `NavRail.tsx` e em `HomeLivePreview.tsx`, e o conserto é o
 * mesmo.
 *
 * `[^\n\r]` em vez de `.` fecha o comentário de linha **antes do `\r`** — num checkout Windows, um
 * `.` come o `\r` e o stripper fica inerte (`L-031`).
 */
export const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  const codigo = semComentario(fonte)
  while ((m = re.exec(codigo)) !== null) saida.push(m[1])
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

describe('core/admin-users é módulo puro', () => {
  it('a varredura enxerga o módulo — âncora de contagem', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(2)
    expect(arquivos.map(a => a.nome)).toEqual(
      expect.arrayContaining(['index.ts', 'refusals.ts']),
    )
  })

  it('a varredura de fato extrai imports — âncora do extrator', () => {
    const total = arquivos.reduce((n, a) => n + a.imports.length, 0)
    expect(total).toBeGreaterThanOrEqual(3)
  })

  // ─── o removedor de comentário, provado nos DOIS sentidos ───
  //
  // A primeira escrita deste guarda reprovou o `index.ts` deste módulo porque ele **explica em
  // prosa** o defeito que o guarda mede. Um guarda que acusa o arquivo certo é pior que nenhum: o
  // conserto óbvio é apagar a explicação.

  it('comentário de LINHA não vira import — o defeito que este guarda já teve', () => {
    expect(especificadores("// export * from './refusals'\n")).toEqual([])
  })

  it('comentário de BLOCO não vira import, na mesma varredura', () => {
    expect(especificadores("/* import x from './y' */\n")).toEqual([])
  })

  it('comentário de linha com CRLF não cega o removedor (L-031)', () => {
    // Com `.` no lugar de `[^\n\r]`, o `\r` é comido, o stripper não fecha, e TUDO depois vira
    // comentário — inclusive o import de verdade da linha seguinte.
    expect(especificadores("// nada aqui\r\nimport { A } from './real.ts'\r\n")).toEqual([
      './real.ts',
    ])
  })

  it('comentário de linha com LF puro também fecha', () => {
    expect(especificadores("// nada aqui\nimport { A } from './real.ts'\n")).toEqual(['./real.ts'])
  })

  it('um import DE VERDADE continua sendo encontrado — o sensor inverso', () => {
    // Sem este par, um removedor que apagasse o arquivo inteiro passaria como "consertado", e o
    // guarda viraria um no-op verde.
    expect(especificadores("import { A } from '../auth/errors.ts'\n")).toEqual(['../auth/errors.ts'])
  })

  it('import de verdade ao LADO de uma menção em comentário: só o de verdade sai', () => {
    const fonte = "// veja `from '@estrelinha/supabase/client'`\nimport { A } from './refusals.ts'\n"
    expect(especificadores(fonte)).toEqual(['./refusals.ts'])
  })

  it.each([
    'react',
    'react-dom',
    '@supabase/supabase-js',
    '@estrelinha/supabase/client',
    '@estrelinha/supabase/types',
  ])('nenhum arquivo importa %s', dependencia => {
    expect(importadores(s => s === dependencia)).toEqual([])
  })

  it('nenhum arquivo importa o pacote de UI', () => {
    expect(importadores(s => s.startsWith('@estrelinha/ui'))).toEqual([])
  })

  it('nenhum arquivo importa de apps/', () => {
    expect(importadores(s => s.includes('apps/'))).toEqual([])
  })

  it('nenhum arquivo importa de payment/ — identidade não é caminho de dinheiro', () => {
    expect(importadores(s => s.includes('/payment/'))).toEqual([])
  })

  it('nenhum arquivo toca o DOM — a function roda em Deno, sem document nem window', () => {
    const culpados = arquivos.filter(a =>
      /\b(document|window|localStorage)\s*\.\w/.test(
        semComentario(a.fonte),
      ),
    )
    expect(culpados.map(c => c.nome)).toEqual([])
  })

  it('nenhum arquivo lê variável de ambiente — a senha e a chave são do chamador', () => {
    // `Deno.env` e `import.meta.env` aqui dentro fariam a regra depender de onde ela roda, e o
    // painel e a function passariam a recusar coisas diferentes com o mesmo código.
    const culpados = arquivos.filter(a =>
      /\b(Deno\.env|process\.env|import\.meta\.env)\b/.test(
        semComentario(a.fonte),
      ),
    )
    expect(culpados.map(c => c.nome)).toEqual([])
  })
})

describe('core/admin-users é importável por Deno', () => {
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
    expect(relativos).toBeGreaterThanOrEqual(3)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A varredura TRANSITIVA
//
// A régua acima olha só os arquivos deste diretório, e isso não basta: `refusals.ts` importa
// `../auth/errors.ts` e `../constants.ts`, que são de **outros** módulos. Um `import type` sem
// extensão em qualquer um deles derruba a function, e os especificadores daqui continuariam todos
// certos. Um vizinho pode quebrar este módulo sem tocar nele — foi assim que `home/preview.ts`
// quase derrubou a function do sitemap na feature 39.
// ───────────────────────────────────────────────────────────────────────────

/** Um leitor de arquivo, injetável — é o que torna o sensor por mutação possível. */
type Leitor = (caminho: string) => string

/** `…/packages/core/src/auth/errors.ts` → `auth/errors.ts`. Independe de separador e de raiz. */
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

describe('core/admin-users é importável por Deno — o grafo TRANSITIVO', () => {
  const grafo = caminharGrafo(join(DIR, 'index.ts'), c => readFileSync(c, 'utf8'))

  it('a caminhada sai de `core/admin-users` e alcança os vizinhos — âncora', () => {
    // Sem esta âncora, um `index.ts` que deixasse de exportar tudo faria a asserção abaixo varrer
    // um arquivo e aprovar em silêncio.
    const rel = grafo.visitados.map(rotulo)
    expect(grafo.visitados.length).toBeGreaterThanOrEqual(4)
    expect(rel).toEqual(
      expect.arrayContaining([
        'admin-users/index.ts',
        'admin-users/refusals.ts',
        'auth/errors.ts',
        'src/constants.ts',
      ]),
    )
  })

  it('nenhum arquivo do grafo tem especificador relativo sem `.ts`', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('a régua PEGA o defeito de um vizinho — sensor por mutação', () => {
    // Sem este sensor, a asserção acima mede uma ausência — e ausência é o que passa sozinha quando
    // o instrumento falha.
    const falso: Record<string, string> = {
      '/x/admin-users/index.ts': "export * from './refusals.ts'",
      '/x/admin-users/refusals.ts': "import { SAME_PASSWORD } from '../auth/errors.ts'",
      '/x/auth/errors.ts': "import { MIN_PASSWORD_LENGTH } from '../constants'",
    }
    const doente = caminharGrafo('/x/admin-users/index.ts', c => falso[c.replace(/\\/g, '/')] ?? '')
    expect(doente.semExtensao).toEqual(['auth/errors.ts → ../constants'])

    const curado = caminharGrafo('/x/admin-users/index.ts', c =>
      (falso[c.replace(/\\/g, '/')] ?? '').replace("'../constants'", "'../constants.ts'"),
    )
    expect(curado.semExtensao).toEqual([])
  })

  it('a régua PEGA o defeito no próprio barrel — sensor por mutação, o outro sentido', () => {
    const falso: Record<string, string> = {
      '/x/admin-users/index.ts': "export * from './refusals'",
      '/x/admin-users/refusals.ts': '',
    }
    const doente = caminharGrafo('/x/admin-users/index.ts', c => falso[c.replace(/\\/g, '/')] ?? '')
    expect(doente.semExtensao).toEqual(['admin-users/index.ts → ./refusals'])
  })
})
