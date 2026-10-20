/**
 * Feature 69 · T08 — `core/page/images.ts` tem de ser alcançável por Deno.
 *
 * Até a feature 70 a function `sitemap` importava `productPageImages` por caminho relativo. Ela foi
 * aposentada (o sitemap passou a sair da função `api/page` da Vercel, que empacota por esbuild), e
 * hoje nenhuma edge function alcança este arquivo — **a régua fica**, porque `images.ts` continua
 * sendo folha que uma function pode voltar a importar, e o custo de a exigência sumir só aparece no
 * dia em que alguém importar. Deno resolve por caminho com extensão explícita **e resolve o grafo de TIPOS junto**: um
 * especificador relativo sem `.ts`, ou um alias de pacote num `import type`, derruba o worker com
 * `Failed resolving types` antes da primeira linha rodar — e Vite e vitest resolvem as duas formas,
 * então nada acusaria aqui dentro.
 *
 * O grafo é TRANSITIVO: `images.ts` puxa `media/rendition.ts` e `shopping/offer.ts`, que puxa
 * `routes`, `faq` e o resto de `shopping`. Por isso o guarda caminha a partir do arquivo, e não lê
 * só ele. O barrel `core/page/index.ts` fica FORA do escopo: quem a function importa é o arquivo.
 *
 * Molde: `core/shipping/__tests__/denoReach.test.ts`, com o leitor injetável.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

/** O que as edge functions importam por caminho relativo. Cresce com a feature. */
const ENTRADAS = ['images.ts']

/** Um leitor de arquivo, injetável — é o que torna o sensor por mutação possível. */
type Leitor = (caminho: string) => string

/**
 * Remove comentário de linha **e** de bloco na MESMA varredura.
 *
 * Sem isto a régua casa **menção**, não **uso**: o cabeçalho de `images.ts` explica em prosa por
 * que o arquivo não importa nada, e o molde (`core/checkout`) reprovou o próprio arquivo certo na
 * primeira execução por uma frase assim. O CRLF é normalizado ANTES — e `[^\n\r]` fica de
 * reforço —, senão a linha comentada de um arquivo CRLF engole a linha seguinte. Linha e bloco na
 * mesma passada, como a `BL-027` fechou em `freeShippingSingleOwner.test.ts`.
 */
const semComentario = (fonte: string): string =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(semComentario(fonte))) !== null) saida.push(m[1])
  return saida
}

const rotulo = (caminho: string): string =>
  caminho.replace(/\\/g, '/').split('/').slice(-2).join('/')

const caminharGrafo = (entradas: string[], ler: Leitor) => {
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
      if (!spec.startsWith('.')) {
        externos.push(`${rotulo(atual)} → ${spec}`)
        continue
      }
      if (!spec.endsWith('.ts')) {
        // Sem extensão o grafo não é caminhável a partir daqui: registra e para neste ramo, em vez
        // de adivinhar `+ '.ts'` — adivinhar faria o guarda "consertar" o defeito que ele mede.
        semExtensao.push(`${rotulo(atual)} → ${spec}`)
        continue
      }
      fila.push(join(dirname(atual), spec))
    }
  }

  return { visitados, semExtensao, externos }
}

const lerDoDisco: Leitor = (caminho) => readFileSync(caminho, 'utf8')
const caminhos = ENTRADAS.map((f) => join(DIR, f))

describe('core/page/images.ts — alcançável por Deno, com o grafo inteiro', () => {
  const grafo = caminharGrafo(caminhos, lerDoDisco)

  it('a varredura leu de fato os arquivos de entrada — âncora', () => {
    // Sem esta âncora, um caminho errado leria zero arquivo e as asserções abaixo passariam sobre
    // listas vazias — a pior falha possível num guarda que lê o disco.
    expect(grafo.visitados.length).toBeGreaterThanOrEqual(ENTRADAS.length)
    expect(grafo.visitados.map(rotulo)).toEqual(
      expect.arrayContaining(ENTRADAS.map((f) => `page/${f}`)),
    )
    // Segunda âncora: o conteúdo é o esperado, não um arquivo vazio que casaria com tudo.
    expect(lerDoDisco(join(DIR, 'images.ts'))).toContain('productPageImages')
  })

  it('o grafo é transitivo — rendition, offer e os vizinhos de offer foram lidos (âncora)', () => {
    // Sem esta âncora, um caminhador que parasse na entrada passaria lendo um arquivo só — e o
    // defeito que derruba o worker mora, em geral, dois saltos adiante.
    const lidos = grafo.visitados.map(rotulo)
    expect(lidos).toEqual(
      expect.arrayContaining([
        'media/rendition.ts',
        'shopping/offer.ts',
        'shopping/types.ts',
        'routes/routes.ts',
        'faq/block.ts',
      ]),
    )
  })

  it('nenhum especificador relativo do grafo vem sem `.ts`', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum arquivo do grafo importa React, Supabase ou Deno', () => {
    // Puro de verdade: a mesma linha roda no navegador e no edge runtime.
    const proibidos = grafo.externos.filter((e) =>
      /react|@supabase|supabase-js|deno|esm\.sh/i.test(e),
    )
    expect(proibidos).toEqual([])
  })

  it('sensor — um `import type` sem extensão É acusado', () => {
    // A forma exata que derrubou o worker na `33`: o grafo de TIPOS também é resolvido por Deno.
    const mutante: Leitor = (caminho) =>
      rotulo(caminho) === 'page/images.ts'
        ? `import type { RenditionWidth } from '../media/rendition'\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    expect(caminharGrafo(caminhos, mutante).semExtensao).toEqual([
      'page/images.ts → ../media/rendition',
    ])
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada, o USO é', () => {
    // O par que prova que a régua mede uso: os dois casos abaixo diferem só por estar dentro ou
    // fora do comentário.
    const soMencao: Leitor = (caminho) =>
      rotulo(caminho) === 'page/images.ts'
        ? `// o barrel faz export * from '../media/rendition', sem extensão\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    const mencaoEmBloco: Leitor = (caminho) =>
      rotulo(caminho) === 'page/images.ts'
        ? `/* nota: from '../media/rendition' aparece aqui\r\n   e segue na linha de baixo */\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    expect(caminharGrafo(caminhos, soMencao).semExtensao).toEqual([])
    expect(caminharGrafo(caminhos, mencaoEmBloco).semExtensao).toEqual([])
  })

  it('sensor CRLF — comentário de linha em arquivo CRLF não engole a linha seguinte', () => {
    // `[^\n\r]` em vez de `.` é o que separa as duas linhas. Com `.` o comentário comeria o import
    // real de baixo, e o guarda passaria cego sobre um especificador sem extensão.
    const crlf: Leitor = (caminho) =>
      rotulo(caminho) === 'page/images.ts'
        ? `// nota em CRLF\r\nimport type { RenditionWidth } from '../media/rendition'\r\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    expect(caminharGrafo(caminhos, crlf).semExtensao).toEqual([
      'page/images.ts → ../media/rendition',
    ])
  })

  it('sensor inverso — o mesmo import COM extensão não é acusado', () => {
    // Sem este par, uma régua que acusasse todo import relativo passaria como "sensível".
    const mutante: Leitor = (caminho) =>
      rotulo(caminho) === 'page/images.ts'
        ? `export type { RenditionWidth } from '../media/rendition.ts'\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    expect(caminharGrafo(caminhos, mutante).semExtensao).toEqual([])
  })

  it('sensor — um import de Supabase É acusado', () => {
    const mutante: Leitor = (caminho) =>
      rotulo(caminho) === 'page/images.ts'
        ? `import { createClient } from '@supabase/supabase-js'\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    const { externos } = caminharGrafo(caminhos, mutante)
    expect(externos.filter((e) => /@supabase/.test(e))).toHaveLength(1)
  })
})
