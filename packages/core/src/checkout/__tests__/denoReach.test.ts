/**
 * Os arquivos de `core/checkout` que a edge function `checkout` importa **por caminho relativo**
 * têm de ser alcançáveis por Deno.
 *
 * Deno resolve por caminho com extensão explícita **e resolve o grafo de TIPOS junto**: um
 * `export * from './types'` sem `.ts`, ou um `import type { X } from '@estrelinha/supabase/types'`,
 * derruba o worker com `Failed resolving types` **antes da primeira linha rodar**. Vite e vitest
 * resolvem as duas formas, então nada acusa aqui dentro. Medido na feature `33`.
 *
 * ⚠️ **O barrel `core/checkout/index.ts` NÃO está no escopo, de propósito.** Ele faz
 * `export * from './types'` e `'./blocks'` sem extensão, e `blocks.ts` importa
 * `'../validators/cep'` — também sem. Tornar o barrel alcançável arrastaria `core/validators`
 * inteiro para uma regra que só a edge function precisa. Quem a function importa é o **arquivo**,
 * nunca o barrel, e é o arquivo que este guarda protege.
 *
 * Molde: `core/menu/__tests__/purity.test.ts`, inclusive o leitor injetável — é ele que torna o
 * sensor por mutação possível.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

/** O que a edge function `checkout` importa por caminho relativo. Cresce com a feature. */
const ENTRADAS = ['identity.ts', 'guestAccess.ts']

/** Um leitor de arquivo, injetável — é o que torna o sensor por mutação possível. */
type Leitor = (caminho: string) => string

/**
 * Remove comentário de linha **e** de bloco na MESMA varredura.
 *
 * Sem isto a régua casa **menção**, não **uso**, e acusa exatamente o arquivo que está certo: o
 * cabeçalho de `identity.ts` explica em prosa por que o barrel faz `export * from './types'` sem
 * extensão — e a primeira execução deste guarda reprovou por causa dessa frase. É o mesmo ponto
 * cego que a `BL-027` fechou em `freeShippingSingleOwner.test.ts`, e a mesma correção: uma passada
 * só, com `[^\n\r]` fechando **antes** do `\r`, senão a linha comentada de um arquivo CRLF engole
 * a linha seguinte.
 */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

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

describe('core/checkout — o que a edge function importa é alcançável por Deno', () => {
  const grafo = caminharGrafo(caminhos, lerDoDisco)

  it('a varredura leu de fato os arquivos de entrada — âncora', () => {
    // Sem esta âncora, um caminho errado leria zero arquivo e as asserções abaixo passariam sobre
    // listas vazias — a pior falha possível num guarda que lê o disco.
    expect(grafo.visitados.length).toBeGreaterThanOrEqual(ENTRADAS.length)
    expect(grafo.visitados.map(rotulo)).toEqual(
      expect.arrayContaining(ENTRADAS.map((f) => `checkout/${f}`)),
    )
    // Segunda âncora: o conteúdo é o esperado, não um arquivo vazio que casaria com tudo.
    expect(lerDoDisco(join(DIR, 'identity.ts'))).toContain('resolveCheckoutIdentity')
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
      rotulo(caminho) === 'checkout/identity.ts'
        ? `import type { CheckoutDraft } from './types'\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    expect(caminharGrafo(caminhos, mutante).semExtensao).toEqual([
      'checkout/identity.ts → ./types',
    ])
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada, o USO é', () => {
    // O par que prova que a régua mede uso. A primeira escrita deste guarda reprovava o próprio
    // `identity.ts`, cujo cabeçalho cita `from './types'` para explicar por que o barrel fica fora
    // de escopo. Os dois casos abaixo diferem só por estar dentro ou fora do comentário.
    const soMencao: Leitor = (caminho) =>
      rotulo(caminho) === 'checkout/identity.ts'
        ? `// o barrel faz export * from './types', sem extensão\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    const mencaoEmBloco: Leitor = (caminho) =>
      rotulo(caminho) === 'checkout/identity.ts'
        ? `/* nota: from './types' aparece aqui\r\n   e segue na linha de baixo */\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    expect(caminharGrafo(caminhos, soMencao).semExtensao).toEqual([])
    expect(caminharGrafo(caminhos, mencaoEmBloco).semExtensao).toEqual([])
  })

  it('sensor CRLF — comentário de linha em arquivo CRLF não engole a linha seguinte', () => {
    // `[^\n\r]` em vez de `.` é o que separa as duas linhas. Com `.` o comentário comeria o import
    // real de baixo, e o guarda passaria cego sobre um especificador sem extensão.
    const crlf: Leitor = (caminho) =>
      rotulo(caminho) === 'checkout/identity.ts'
        ? `// nota em CRLF\r\nimport type { CheckoutDraft } from './types'\r\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    expect(caminharGrafo(caminhos, crlf).semExtensao).toEqual([
      'checkout/identity.ts → ./types',
    ])
  })

  it('sensor inverso — o mesmo import COM extensão não é acusado', () => {
    // Sem este par, uma régua que acusasse todo import relativo passaria como "sensível".
    const mutante: Leitor = (caminho) =>
      rotulo(caminho) === 'checkout/identity.ts'
        ? `export type { CheckoutDraft } from './types.ts'\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    expect(caminharGrafo(caminhos, mutante).semExtensao).toEqual([])
  })

  it('sensor — um import de Supabase É acusado', () => {
    const mutante: Leitor = (caminho) =>
      rotulo(caminho) === 'checkout/identity.ts'
        ? `import { createClient } from '@supabase/supabase-js'\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)

    const { externos } = caminharGrafo(caminhos, mutante)
    expect(externos.filter((e) => /@supabase/.test(e))).toHaveLength(1)
  })
})
