/**
 * `core/analytics` inteiro tem de ser alcançável por Deno, e puro.
 *
 * A edge function `mercado-pago` importa a compra (`purchase.ts`) por caminho relativo, e o Deno
 * resolve o grafo de **tipos** junto: um especificador relativo sem `.ts` — `import type` incluso —
 * derruba o worker com `Failed resolving types` **antes da primeira linha rodar**. Vite e vitest
 * resolvem as duas formas, então nada mais acusaria. Medido na feature `33`.
 *
 * **O escopo é o diretório inteiro, barrel incluso** — ao contrário de `core/checkout`, cujo barrel
 * fica de fora. Aqui não há razão para a exceção: o módulo nasceu com a extensão em todo import, e
 * a function pode importar o barrel ou um arquivo, à escolha. A lista de entradas é **lida do
 * disco**, nunca escrita à mão: um arquivo novo entra na varredura por construção.
 *
 * Molde: `core/checkout/__tests__/denoReach.test.ts`, inclusive o leitor injetável — é ele que
 * torna o sensor por mutação possível — e o removedor de comentário em uma passada só.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Os arquivos de produção do módulo, do disco. */
const ENTRADAS = readdirSync(DIR)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .sort()

type Leitor = (caminho: string) => string

/** Comentário de linha e de bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r`. */
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
        // Registra e para neste ramo: adivinhar `+ '.ts'` "consertaria" o defeito que o guarda mede.
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

/** Prefixa um trecho a um arquivo do módulo, e só a ele. */
const comPrefixo =
  (arquivo: string, trecho: string): Leitor =>
  (caminho) =>
    rotulo(caminho) === `analytics/${arquivo}` ? `${trecho}${lerDoDisco(caminho)}` : lerDoDisco(caminho)

describe('core/analytics — alcançável por Deno e puro', () => {
  const grafo = caminharGrafo(caminhos, lerDoDisco)

  it('ÂNCORA: leu os seis arquivos de produção do módulo, e o grafo saiu dele', () => {
    // Sem esta âncora, um caminho errado leria zero arquivo e as asserções abaixo passariam sobre
    // listas vazias.
    expect(ENTRADAS).toEqual(['events.ts', 'host.ts', 'ids.ts', 'index.ts', 'items.ts', 'purchase.ts'])
    // O grafo transitivo sai do módulo e alcança `shopping/identity.ts` e, a partir DELE, o
    // `shopping/types.ts` — dois saltos, prova de que ele CAMINHA. (Até o ajuste do
    // `transaction_id` cru, o vizinho era `orders/format.ts`; a compra deixou de importá-lo.)
    const rotulos = grafo.visitados.map(rotulo)
    expect(rotulos).toEqual(expect.arrayContaining(['shopping/identity.ts', 'shopping/types.ts']))
    // Segunda âncora: o conteúdo é o esperado, não um arquivo vazio que casaria com tudo.
    expect(lerDoDisco(join(DIR, 'purchase.ts'))).toContain('buildPurchaseBody')
  })

  it('nenhum especificador relativo do grafo vem sem `.ts`', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum arquivo do grafo importa nada de fora — nem React, nem Supabase, nem Deno', () => {
    expect(grafo.externos).toEqual([])
  })

  it('sensor — um `import type` sem extensão É acusado', () => {
    const m = caminharGrafo(caminhos, comPrefixo('items.ts', "import type { X } from './events'\n"))
    expect(m.semExtensao).toEqual(['analytics/items.ts → ./events'])
  })

  it('sensor — um reexport sem extensão no barrel É acusado', () => {
    const m = caminharGrafo(caminhos, comPrefixo('index.ts', "export * from './host'\n"))
    expect(m.semExtensao).toEqual(['analytics/index.ts → ./host'])
  })

  it('sensor CRLF — comentário de linha em arquivo CRLF não engole a linha seguinte', () => {
    const m = caminharGrafo(
      caminhos,
      comPrefixo('purchase.ts', "// nota em CRLF\r\nimport type { X } from './items'\r\n"),
    )
    expect(m.semExtensao).toEqual(['analytics/purchase.ts → ./items'])
  })

  it('sensor do removedor — a MENÇÃO em prosa não é acusada, o USO é', () => {
    const linha = caminharGrafo(caminhos, comPrefixo('ids.ts', "// o barrel faria from './host' sem extensão\n"))
    const bloco = caminharGrafo(
      caminhos,
      comPrefixo('ids.ts', "/* nota: from './host' aparece aqui\r\n   e segue */\n"),
    )
    expect(linha.semExtensao).toEqual([])
    expect(bloco.semExtensao).toEqual([])
  })

  it('sensor inverso — o mesmo import COM extensão não é acusado', () => {
    const m = caminharGrafo(caminhos, comPrefixo('items.ts', "import type { X } from './events.ts'\n"))
    expect(m.semExtensao).toEqual([])
  })

  it('sensor — import de React e de Supabase são acusados', () => {
    const react = caminharGrafo(caminhos, comPrefixo('events.ts', "import { useEffect } from 'react'\n"))
    const supa = caminharGrafo(
      caminhos,
      comPrefixo('purchase.ts', "import type { X } from '@estrelinha/supabase/types'\n"),
    )
    expect(react.externos).toEqual(['analytics/events.ts → react'])
    expect(supa.externos).toEqual(['analytics/purchase.ts → @estrelinha/supabase/types'])
  })
})
