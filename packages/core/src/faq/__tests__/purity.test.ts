import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * `core/faq` é puro — e aqui isso não é estética.
 *
 * **O importador do catálogo roda em Node** e consome este diretório (`block.ts` extrai os pares das
 * descrições da Nuvemshop). Um `import` de React ou do client do Supabase derruba o importador **em
 * runtime**, não em build: o `tsc` acha tudo certo, o Vite resolve numerando, e a falha aparece no
 * dia em que alguém roda a importação de 3.476 vínculos.
 *
 * É a mesma razão de `core/shopping/__tests__/purity.test.ts` existir, e este arquivo é o molde dele
 * aplicado ao vizinho — com a diferença de que lá o consumidor é o Deno das edge functions e aqui é
 * o Node do importador.
 *
 * **A âncora de contagem é a parte que mais importa.** Um caminho errado faz a varredura ler zero
 * arquivo e passar em silêncio, que é a pior falha possível num teste desse tipo: ele vira um no-op
 * verde e ninguém descobre até o defeito chegar em produção.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const DIR = resolve(HERE, '..')

const PROIBIDOS = [
  { nome: 'React', re: /from\s+['"]react(-dom)?['"]/ },
  { nome: 'Supabase', re: /from\s+['"]@(estrelinha\/supabase|supabase\/supabase-js)['"]/ },
  { nome: 'Deno', re: /from\s+['"](https?:\/\/deno\.land|jsr:|npm:)/ },
  { nome: 'API de DOM', re: /\b(document|window|localStorage)\s*\./ },
]

const arquivos = readdirSync(DIR)
  .filter(f => f.endsWith('.ts'))
  .map(f => ({ nome: f, fonte: readFileSync(join(DIR, f), 'utf8') }))

describe('core/faq é puro', () => {
  // Sem esta, tudo abaixo pode passar sobre nada.
  it('a varredura encontrou os módulos do diretório', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(7)
    expect(arquivos.map(a => a.nome)).toEqual(
      expect.arrayContaining(['faq.ts', 'text.ts', 'page.ts', 'jsonld.ts', 'block.ts', 'suggest.ts']),
    )
  })

  it.each(PROIBIDOS)('nenhum arquivo importa $nome', ({ re }) => {
    const culpados = arquivos.filter(a => re.test(a.fonte)).map(a => a.nome)
    expect(culpados).toEqual([])
  })

  // SENSOR: a régua reprova de verdade quando o import existe. Sem este caso, um regex quebrado
  // passaria como "nenhum arquivo importa React" para sempre.
  it('a régua acusa um import injetado', () => {
    const injetado = "import { useState } from 'react'\nexport const x = 1\n"
    expect(PROIBIDOS.some(p => p.re.test(injetado))).toBe(true)
  })

  it('a régua NÃO acusa um import legítimo do próprio diretório', () => {
    const legitimo = "import type { FaqEntry } from './types.ts'\n"
    expect(PROIBIDOS.some(p => p.re.test(legitimo))).toBe(false)
  })

  // Todo especificador relativo leva `.ts` explícito: o Deno resolve o grafo de TIPOS também, e um
  // `import type` sem extensão derruba o worker antes da primeira linha rodar. Vite e vitest
  // resolvem as duas formas, então nada mais acusaria.
  it('todo import relativo declara a extensão .ts', () => {
    const semExtensao = arquivos.flatMap(a =>
      [...a.fonte.matchAll(/from\s+['"](\.[^'"]+)['"]/g)]
        .filter(m => !m[1].endsWith('.ts'))
        .map(m => `${a.nome}: ${m[1]}`),
    )
    expect(semExtensao).toEqual([])
  })
})
