import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ESTRELINHA_COLORS, ESTRELINHA_PROFILES } from '@estrelinha/ui/tokens/estrelinha'

/**
 * O perfil de estilo da loja tem UM dono dos valores e UM dono do seletor.
 *
 * Os valores do Black Friday moram em `ESTRELINHA_PROFILES` (`packages/ui/src/tokens/`) e, por
 * cópia deliberada comparada por `palette.test.ts`, no bloco do perfil do `App.css`. Uma terceira
 * escrita de um desses hex — um componente pintando "o preto do Black Friday" à mão — não muda com o
 * perfil e não é comparada por ninguém: é o "defeito 01" no tamanho de uma cor.
 *
 * O nome do atributo do `<html>` que carrega o perfil mora em `STYLE_PROFILE_ATTRIBUTE`
 * (`@estrelinha/core/appearance`). Entre os arquivos de produção dos apps, só a folha da loja o
 * escreve por extenso (é CSS, não importa nada); o resto importa a constante. Dois nomes para o
 * mesmo atributo fariam o servidor escrever um e a folha selecionar outro, sem nada quebrar.
 *
 * Varre só produção: teste pode nomear o que quiser. ÂNCORA DUPLA: a varredura prova que leu
 * arquivos e que a régua encontra o que procura nos donos. O escopo e o allowlist estão escritos
 * literalmente aqui, e a lista de hex também — com uma âncora que a confere contra o dono, para a
 * lista não envelhecer.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * Escopo literal: os apps e o pacote de interface — onde a cor vira tela.
 *
 * `packages/core` fica FORA, e não por esquecimento: lá as cores são DADO (as combinações prontas
 * da faixa de campanha, `core/campaigns/limits.ts`, que a dona escolhe e o banco grava), e duas
 * delas coincidem com o preto e o ouro do Black Friday por terem nascido do mesmo protótipo. Elas
 * não são a paleta da loja nem mudam com o perfil — acusá-las seria medir coincidência de valor.
 */
const ESCOPO = ['apps', 'packages/ui']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git', '.server', '.vercel'])
const EXTENSOES = ['.ts', '.tsx', '.css', '.html']

/** Os hex que só o Black Friday tem — escritos à mão, conferidos contra o dono abaixo. */
const HEX_DO_BLACK_FRIDAY = [
  '#161514',
  '#57524B',
  '#1C1A18',
  '#0D0C0B',
  '#C2A063',
  '#9A7A45',
  '#E4DDD0',
  '#F0EADF',
  '#857A6C',
]

/** Onde esses hex podem estar escritos. */
const DONOS_DOS_HEX = (rel: string): boolean =>
  rel.startsWith('packages/ui/src/tokens/') || rel === 'apps/store/src/app/App.css'

/** O único arquivo de produção dos apps que escreve o nome do atributo por extenso. */
const DONO_DO_ATRIBUTO = 'apps/store/src/app/App.css'

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some((ext) => entry.name.endsWith(ext)) ? [full] : []
  })

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') ||
  rel.includes('/test/') ||
  /\.test\.tsx?$/.test(rel) ||
  /\.spec\.tsx?$/.test(rel)

/**
 * Remove comentários preservando a numeração das linhas. CRLF normalizado primeiro (`.` não casa
 * `\r`), e linha e bloco na MESMA varredura (`BL-027`). Em CSS e HTML só há bloco: lá `//` é parte
 * de URL, não comentário.
 */
const semComentarios = (fonte: string, ehCodigo: boolean): string[] => {
  const normalizada = fonte.replace(/\r\n/g, '\n')
  const padrao = ehCodigo ? /\/\/[^\n]*|\/\*[\s\S]*?\*\//g : /\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g
  return normalizada.replace(padrao, (trecho) => trecho.replace(/[^\n]/g, ' ')).split('\n')
}

interface Arquivo {
  rel: string
  linhas: string[]
}

const ler = (rel: string, fonte: string): Arquivo => ({
  rel,
  linhas: semComentarios(fonte, /\.tsx?$/.test(rel)),
})

const producao: Arquivo[] = ESCOPO.flatMap((d) => arquivos(join(ROOT, d)))
  .map((caminho) => relative(ROOT, caminho).split('\\').join('/'))
  .filter((rel) => !eTeste(rel))
  .map((rel) => ler(rel, readFileSync(join(ROOT, rel), 'utf8')))

/** O hex como token exato: `#161514` não casa `#1615140` nem `#16151480`. */
const regraDoHex = new RegExp(`(${HEX_DO_BLACK_FRIDAY.map((h) => h.slice(1)).join('|')})(?![0-9a-f])`, 'i')
const temHexDoBlackFriday = (texto: string): boolean =>
  [...texto.matchAll(/#([0-9a-f]{6})(?![0-9a-f])/gi)].some((m) => regraDoHex.test(m[1]))

/** O nome do atributo como token exato (`L-034`: `\b` não fecha diante de hífen). */
const temAtributo = (texto: string): boolean => /(?<![-\w])data-perfil(?![-\w])/.test(texto)

interface Ocorrencia {
  arquivo: string
  linha: number
}

const procurar = (alvo: Arquivo[], regra: (t: string) => boolean): Ocorrencia[] =>
  alvo.flatMap(({ rel, linhas }) =>
    linhas.flatMap((texto, i) => (regra(texto) ? [{ arquivo: rel, linha: i + 1 }] : [])),
  )

const hexForaDosDonos = (alvo: Arquivo[]): string[] =>
  procurar(alvo.filter((a) => !DONOS_DOS_HEX(a.rel)), temHexDoBlackFriday).map(
    (o) => `${o.arquivo}:${o.linha}`,
  )

const atributoForaDoDono = (alvo: Arquivo[]): string[] =>
  procurar(
    alvo.filter((a) => a.rel.startsWith('apps/') && a.rel !== DONO_DO_ATRIBUTO),
    temAtributo,
  ).map((o) => `${o.arquivo}:${o.linha}`)

describe('perfil de estilo — âncoras', () => {
  it('a varredura enxerga os apps e os pacotes, só produção', () => {
    expect(producao.length).toBeGreaterThan(400)
    expect(producao.some((a) => a.rel.startsWith('apps/store/src/'))).toBe(true)
    expect(producao.some((a) => a.rel.startsWith('apps/backoffice/src/'))).toBe(true)
    expect(producao.some((a) => a.rel.startsWith('packages/ui/src/tokens/'))).toBe(true)
    expect(producao.some((a) => a.rel === DONO_DO_ATRIBUTO)).toBe(true)
    expect(producao.some((a) => eTeste(a.rel))).toBe(false)
  })

  it('a lista de hex é exatamente o que só o Black Friday tem no dono', () => {
    const padrao = new Set(Object.values(ESTRELINHA_COLORS).map((h) => h.toUpperCase()))
    const exclusivos = new Set(
      Object.values(ESTRELINHA_PROFILES['black-friday'])
        .map((h) => h.toUpperCase())
        .filter((h) => !padrao.has(h)),
    )
    expect([...exclusivos].sort()).toEqual([...HEX_DO_BLACK_FRIDAY].sort())
  })

  it('a régua encontra cada hex nos dois donos, e o atributo na folha da loja', () => {
    const tokens = producao.filter((a) => a.rel.startsWith('packages/ui/src/tokens/'))
    const folha = producao.filter((a) => a.rel === DONO_DO_ATRIBUTO)
    for (const hex of HEX_DO_BLACK_FRIDAY) {
      const so = (t: string) => new RegExp(`${hex}(?![0-9a-f])`, 'i').test(t)
      expect(`${hex} no dono: ${procurar(tokens, so).length > 0}`).toBe(`${hex} no dono: true`)
      expect(`${hex} na folha: ${procurar(folha, so).length > 0}`).toBe(`${hex} na folha: true`)
    }
    expect(procurar(folha, temAtributo).length).toBeGreaterThan(0)
  })
})

describe('perfil de estilo — dono único', () => {
  it('nenhum hex do Black Friday fora de `packages/ui/src/tokens/` e do `App.css`', () => {
    expect(hexForaDosDonos(producao)).toEqual([])
  })

  it('nenhum arquivo de produção dos apps escreve o nome do atributo, fora da folha da loja', () => {
    expect(atributoForaDoDono(producao)).toEqual([])
  })
})

describe('perfil de estilo — sensores', () => {
  it('um hex do Black Friday num componente é acusado, em qualquer caixa', () => {
    const sintetico = [
      ler('apps/store/src/widgets/x/X.tsx', "const preto = '#161514'\nconst ouro = 'bg-[#c2a063]'\n"),
    ]
    expect(hexForaDosDonos(sintetico)).toEqual([
      'apps/store/src/widgets/x/X.tsx:1',
      'apps/store/src/widgets/x/X.tsx:2',
    ])
  })

  it('o nome do atributo num componente é acusado, e a constante não', () => {
    const sintetico = [
      ler(
        'apps/store/src/app/X.tsx',
        "el.setAttribute('data-perfil', p)\nel.setAttribute(STYLE_PROFILE_ATTRIBUTE, p)\n",
      ),
    ]
    expect(atributoForaDoDono(sintetico)).toEqual(['apps/store/src/app/X.tsx:1'])
  })

  it('inverso: o hex do Padrão, um hex mais longo e o hex em comentário passam', () => {
    const sintetico = [
      ler(
        'apps/store/src/widgets/x/X.tsx',
        "const a = '#23303A'\nconst b = '#16151480'\r\n// '#161514' citado na prosa\r\n/* #C2A063 */\n",
      ),
      ler('apps/store/src/widgets/x/x.css', '/* #161514 */\n.a { color: #34495e; }\n'),
    ]
    expect(hexForaDosDonos(sintetico)).toEqual([])
  })

  it('inverso: um atributo vizinho (`data-perfil-x`) e o nome em comentário passam', () => {
    const sintetico = [
      ler('apps/store/src/app/X.tsx', "const a = 'data-perfil-x'\n// data-perfil na prosa\n"),
    ]
    expect(atributoForaDoDono(sintetico)).toEqual([])
  })

  it('o dono dos hex pode escrevê-los; fora dos apps o atributo não é medido', () => {
    const sintetico = [
      ler('packages/ui/src/tokens/estrelinha.ts', "ink: '#161514',\n"),
      ler('packages/ui/src/x.tsx', "export const A = 'data-perfil'\n"),
    ]
    expect(hexForaDosDonos(sintetico)).toEqual([])
    expect(atributoForaDoDono(sintetico)).toEqual([])
  })

  it('o pacote de interface fora do dono É acusado pelo hex', () => {
    expect(hexForaDosDonos([ler('packages/ui/src/button.tsx', "const a = '#0d0c0b'\n")])).toEqual([
      'packages/ui/src/button.tsx:1',
    ])
  })
})
