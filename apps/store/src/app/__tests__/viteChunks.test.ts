import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `PRF-12` — **React, Supabase e React Query saem em chunks que sobrevivem a um deploy**.
 *
 * Enquanto a loja foi um arquivo só, qualquer alteração de código mudava o hash e o navegador de
 * quem já tinha visitado rebaixava tudo de novo — inclusive as dependências que não mudaram. Com os
 * três nomeados, a segunda visita depois de um deploy custa o código da loja e mais nada.
 *
 * **Por que ler o `vite.config.ts` do disco.** Não dá para importar o arquivo aqui: ele usa
 * `__dirname`, que não existe no ESM do vitest. E o defeito que este guarda pega não é de execução —
 * é alguém apagar um grupo, ou acrescentar um pacote ao `dedupe` sem pô-lo em grupo nenhum. Nos dois
 * casos o build passa e o chunk volta a inchar em silêncio.
 *
 * **A regra que amarra as duas listas**: pacote que precisa de instância única (`dedupe`) é
 * exatamente o que não pode acabar duplicado entre chunks. Se um deles ficar de fora dos grupos, o
 * Rollup pode copiá-lo para mais de um lugar — e duas cópias do React é tela branca com
 * "Invalid hook call", não lentidão.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/** Escopo literal: o config da loja, escrito à mão e não derivado de nada que ele exporte. */
const CONFIG_PATH = resolve(HERE, '../../../vite.config.ts')
const CONFIG = readFileSync(CONFIG_PATH, 'utf8')

/** A raiz do pacote: `react/jsx-runtime` → `react`, `@a/b/c` → `@a/b`. */
const raiz = (especificador: string): string => {
  const partes = especificador.split('/')
  return especificador.startsWith('@') ? `${partes[0]}/${partes[1]}` : partes[0]
}

/** Os grupos declarados em `VENDOR_CHUNKS`, lidos do fonte. */
const gruposDe = (fonte: string): Record<string, string[]> => {
  const bloco = fonte.match(/const VENDOR_CHUNKS[^=]*=\s*\{([\s\S]*?)\n\};/)
  if (!bloco) return {}
  const grupos: Record<string, string[]> = {}
  for (const m of bloco[1].matchAll(/(\w+):\s*\[([\s\S]*?)\]/g)) {
    grupos[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1])
  }
  return grupos
}

/** A lista do `dedupe` do `resolve`, lida do mesmo fonte. */
const dedupeDe = (fonte: string): string[] => {
  const bloco = fonte.match(/dedupe:\s*\[([\s\S]*?)\]/)
  if (!bloco) return []
  return [...bloco[1].matchAll(/"([^"]+)"/g)].map(x => x[1])
}

const grupos = gruposDe(CONFIG)
const dedupe = dedupeDe(CONFIG)

/** Os pacotes de `dedupe` que nenhum grupo reivindica — a divergência que este guarda recusa. */
const orfaosDoDedupe = (
  gs: Record<string, string[]>,
  lista: string[],
): string[] => {
  const reivindicados = new Set(Object.values(gs).flat().map(raiz))
  return lista.filter(p => !reivindicados.has(raiz(p)))
}

describe('viteChunks — âncoras da régua', () => {
  it('leu o vite.config.ts de verdade', () => {
    // Caminho errado leria string vazia e as asserções abaixo passariam por vacuidade.
    expect(CONFIG.length).toBeGreaterThan(500)
    expect(CONFIG).toContain('defineConfig')
  })

  it('a régua ENCONTRA os grupos e o dedupe — a segunda ponta da âncora', () => {
    expect(Object.keys(grupos).length).toBeGreaterThanOrEqual(3)
    expect(dedupe.length).toBeGreaterThanOrEqual(6)
  })

  it('sensor: um config sintético sem `react-dom` no grupo é REPROVADO', () => {
    const sintetico = {
      react: ['react'],
      query: ['@tanstack/react-query', '@tanstack/query-core'],
    }
    expect(orfaosDoDedupe(sintetico, dedupe)).toContain('react-dom')
  })

  it('sensor: com os grupos reais, não sobra órfão', () => {
    expect(orfaosDoDedupe(grupos, dedupe)).toEqual([])
  })
})

describe('viteChunks — os três chunks de fornecedor (PRF-12)', () => {
  it('os três grupos existem, com estes nomes', () => {
    expect(Object.keys(grupos).sort()).toEqual(['query', 'react', 'supabase'])
  })

  it('o `manualChunks` está ligado no build, e não só declarado', () => {
    // O grupo existir sem estar ligado é o modo de falha silencioso: a constante fica no arquivo, o
    // build passa, e o chunk continua sendo um só.
    expect(CONFIG).toMatch(/build:\s*\{[\s\S]*rollupOptions:[\s\S]*output:[\s\S]*manualChunks/)
    expect(CONFIG).toContain('vendorChunk(id)')
  })

  it('todo pacote do `dedupe` está em algum grupo — instância única não pode ser duplicada', () => {
    expect(
      orfaosDoDedupe(grupos, dedupe),
      'pacote deduplicado fora dos grupos pode acabar copiado em dois chunks',
    ).toEqual([])
  })

  it('o grupo `react` cobre o runtime de JSX, não só `react` e `react-dom`', () => {
    for (const pacote of ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime']) {
      expect(grupos.react).toContain(pacote)
    }
  })

  it('o grupo `query` é exatamente o par que o `dedupe` já protege', () => {
    expect([...grupos.query].sort()).toEqual(['@tanstack/query-core', '@tanstack/react-query'])
  })

  it('o grupo `supabase` leva o client E o realtime que ele arrasta no boot', () => {
    // `design.md`: o `createClient` puxa `realtime-js` + `phoenix` na montagem, e só o `PixPayment`
    // usa. Separar o client em dois é assunto de outra feature — o que dá para fazer aqui é tirar os
    // três do chunk de entrada juntos.
    expect(grupos.supabase).toContain('@supabase/supabase-js')
    expect(grupos.supabase).toContain('@supabase/realtime-js')
    expect(grupos.supabase).toContain('@supabase/phoenix')
  })

  it('nenhum pacote é reivindicado por dois grupos — seriam duas cópias do mesmo módulo', () => {
    // A comparação é por RAIZ e entre grupos: `react` e `react/jsx-runtime` no mesmo grupo são o
    // mesmo pacote e estão certos; o que não pode é a mesma raiz aparecer em dois chunks, porque aí
    // o Rollup escolheria um e o outro carregaria uma cópia.
    const porGrupo = Object.entries(grupos).map(
      ([nome, pacotes]) => [nome, new Set(pacotes.map(raiz))] as const,
    )
    const colisoes: string[] = []
    for (let i = 0; i < porGrupo.length; i++) {
      for (let j = i + 1; j < porGrupo.length; j++) {
        for (const pacote of porGrupo[i][1]) {
          if (porGrupo[j][1].has(pacote)) {
            colisoes.push(`${pacote} em ${porGrupo[i][0]} e ${porGrupo[j][0]}`)
          }
        }
      }
    }
    expect(colisoes).toEqual([])
  })
})
