import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * **A loja tem UM sistema de aviso, e ele é o Sonner** — `PRF-13`.
 *
 * Até a feature `38` o `App.tsx` montava DOIS: o `<Toaster />` do Radix (`@estrelinha/ui/toaster`) e
 * o `<Sonner />`. A varredura mostrou **zero** consumidores de `useToast` na loja — os sete avisos
 * que existem (adicionar ao carrinho, cupom, partilha, recuperação de carrinho, checkout) chamam
 * `toast` de `sonner`. O Radix estava no chunk inicial servindo a ninguém.
 *
 * **O modo de falha que este guarda existe para pegar não quebra nada.** Alguém importa `useToast`
 * num componente novo, o aviso não aparece (o provider saiu), e nem o build, nem o `tsc`, nem o teste
 * de componente dizem uma palavra — porque `useToast` funciona sozinho, ele só não tem onde pintar.
 * O conserto seria remontar o segundo sistema, e a loja voltaria a ter dois donos de "avisar a
 * cliente".
 *
 * O pacote continua instalado: quem usa o Radix é o **backoffice**, e o escopo abaixo é literal
 * justamente para não confundir os dois.
 *
 * ÂNCORA DUPLA — a varredura prova que leu arquivos **e** que a régua encontra o que procura. Só
 * contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um caminho
 * errado. As duas juntas é que fecham.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../..')

/** Escopo literal — a loja, e só ela. O backoffice segue com o Radix, de propósito. */
const ESCOPO = 'apps/store/src'

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [full] : []
  })

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

interface Arquivo {
  rel: string
  /** As linhas **sem comentário**. É sobre estas que a régua roda. */
  linhas: string[]
}

/**
 * Remove comentários preservando a NUMERAÇÃO das linhas.
 *
 * **CRLF normalizado primeiro, e isso é correção, não higiene**: em JavaScript `.` não casa `\r`, e
 * num checkout Windows — a plataforma deste projeto — `/\/\/.*$/` não removeria comentário nenhum.
 * O guarda passaria a acusar a própria prosa que explica a regra, e o conserto "óbvio" seria apagar
 * o comentário em vez de consertar o código.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, bloco => bloco.replace(/[^\n]/g, ' '))
    .split('\n')
    .map(linha => linha.replace(/\/\/.*$/, ''))

const varridos: Arquivo[] = arquivos(join(ROOT, ESCOPO)).map(caminho => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

const producao = varridos.filter(a => !eTeste(a.rel))

const procurar = (padrao: RegExp, alvo: Arquivo[] = producao) => {
  const achados: { arquivo: string; linha: number; texto: string }[] = []
  for (const { rel, linhas } of alvo) {
    linhas.forEach((texto, i) => {
      if (padrao.test(texto)) achados.push({ arquivo: rel, linha: i + 1, texto: texto.trim() })
    })
  }
  return achados
}

/** As duas formas de acordar o Radix: o hook e o componente. */
const RADIX_TOAST = /\buseToast\b|@estrelinha\/ui\/toaster|['"]@\/hooks\/use-toast['"]/
/** O sistema que a loja de fato usa. */
const SONNER = /from\s+['"]sonner['"]/

describe('toasterUnico — âncoras da varredura', () => {
  it('a varredura enxerga a loja', () => {
    // Caminho errado varre zero arquivo e faz TODA asserção de ausência passar por vacuidade.
    expect(varridos.length).toBeGreaterThan(200)
    expect(varridos.some(a => a.rel === 'apps/store/src/app/App.tsx')).toBe(true)
  })

  it('sobra produção de verdade depois de separar os testes', () => {
    expect(producao.length).toBeGreaterThan(150)
    expect(producao.some(a => eTeste(a.rel))).toBe(false)
  })

  it('a régua ENCONTRA o Sonner — a segunda ponta da âncora', () => {
    // Sem esta asserção, um regex quebrado faria o guarda passar sem medir nada.
    const usos = procurar(SONNER)
    expect(usos.length).toBeGreaterThanOrEqual(5)
    expect(usos.some(u => u.arquivo.endsWith('ProductCard.tsx'))).toBe(true)
  })

  it('sensor da régua: uma linha sintética com useToast É reprovada', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/sintetico.tsx',
      linhas: ["import { useToast } from '@estrelinha/ui/hooks/use-toast'"],
    }
    expect(procurar(RADIX_TOAST, [sintetico])).toHaveLength(1)
  })

  it('sensor de comentário: a mesma linha comentada NÃO é reprovada, com CRLF e com LF', () => {
    for (const quebra of ['\r\n', '\n']) {
      const fonte = ["const a = 1", "// import { useToast } from '@estrelinha/ui/toaster'"].join(
        quebra,
      )
      const sintetico: Arquivo = { rel: 'apps/store/src/sintetico.tsx', linhas: semComentarios(fonte) }
      expect(procurar(RADIX_TOAST, [sintetico])).toHaveLength(0)
    }
  })
})

describe('toasterUnico — o Radix não tem consumidor na loja (PRF-13)', () => {
  it('nenhum arquivo de produção da loja usa `useToast` ou monta o Toaster do Radix', () => {
    const achados = procurar(RADIX_TOAST)
    expect(
      achados,
      `avisos da loja saem por sonner; o Toaster do Radix saiu do App.tsx e não há onde pintar:\n${achados
        .map(a => `${a.arquivo}:${a.linha} → ${a.texto}`)
        .join('\n')}`,
    ).toEqual([])
  })

  it('o App.tsx não monta o Toaster do Radix, e continua montando o Sonner', () => {
    const app = varridos.find(a => a.rel === 'apps/store/src/app/App.tsx')!
    const fonte = app.linhas.join('\n')

    expect(fonte).not.toMatch(/<Toaster\s*\/>/)
    expect(fonte).toContain('<Sonner />')
  })

  it('o escopo é literal e o painel fica de fora — o Radix continua sendo dele', () => {
    // A remoção é da LOJA. O `@estrelinha/ui/toaster` segue instalado e montado no backoffice, e um
    // escopo largo demais aqui transformaria este guarda numa proibição que ninguém pediu.
    expect(ESCOPO).toBe('apps/store/src')
    expect(varridos.some(a => a.rel.startsWith('apps/backoffice/'))).toBe(false)
  })
})
