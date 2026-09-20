// Feature 56 (`LEG-14`, `LEG-19`) — dentro de Configurações, o contador de caracteres tem UM dono.
//
// ## O defeito que este guarda prende
//
// Antes desta feature o contador estava escrito **cinco vezes à mão** dentro do `EventCard`
// (um helper `counterLabel` chamado por campo, num `<p>` abaixo do input), e os quatro campos com
// limite das outras seções não tinham contador nenhum — o teto ia embutido no rótulo
// ("Título padrão (até 60 caracteres)"), com o número **cravado na frase**, longe da constante que
// o `maxLength` usa.
//
// É o "defeito 01" no tamanho de um `<p>`: as duas escritas renderizam, nenhuma quebra, e elas
// divergem no dia em que o limite mudar. A feature `46` mediu esse custo — subir `FAQ_ANSWER_MAX` em
// `core` deixou o contador do painel dizendo "0 / 600" porque ele tinha o número escrito à mão.
//
// ## O escopo é LITERAL e estreito, e isso está declarado
//
// A primeira escrita deste guarda varria `apps/backoffice/src` inteiro e nasceu acusando **sete**
// ocorrências em cinco arquivos fora de Configurações:
//
// | Arquivo | O que ele conta |
// | --- | --- |
// | `features/faq-library/ui/FaqEditorDialog.tsx` (×2) | comprimento **aparado** (`.trim().length`) |
// | `features/home-composition/ui/HeroEditor.tsx` | parágrafo do hero |
// | `features/product-form/ui/SeoPreview.tsx` (×2) | comprimento **+ a palavra "caracteres"** |
// | `pages/admin/AdminProductFormPage.tsx` | nome do produto |
//
// Elas **não são a mesma função**: duas aparam antes de contar, duas escrevem o sufixo "caracteres",
// e o espaçamento em volta da barra difere. Trocá-las pelo `CharCounter` mudaria texto visível em
// telas que esta feature não foi pedida para tocar, e quebraria as asserções delas. E um guarda que
// nasce reprovando sete vezes é um guarda que alguém desliga no primeiro gate — a lição literal de
// `animacaoRespeitaMovimento.test.ts`.
//
// Então o escopo é Configurações + a camada que ela compartilha. As sete de fora ficam registradas
// como dívida no `CLAUDE.md`, não escondidas numa allowlist.
//
// **Zero allowlist dentro do escopo**, além do próprio dono.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
/** `shared/ui/__tests__` → `apps/backoffice/src`. */
const RAIZ = resolve(HERE, '../../..')

/**
 * As pastas sob a régua — escritas uma a uma, nunca derivadas de constante que o código sob teste
 * exporte (lição da `fieldBorder`: a régua não pode ser o objeto medido).
 */
const ESCOPO = [
  'shared/ui',
  'features/settings',
  'features/notification-settings',
  'widgets/settings-sections',
] as const

const EXTENSOES = ['.ts', '.tsx']

const listar = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return listar(full)
    return entry.isFile() && EXTENSOES.some((ext) => entry.name.endsWith(ext)) ? [full] : []
  })

/**
 * Remove comentário preservando a NUMERAÇÃO das linhas — linha e bloco na MESMA varredura, na ordem
 * do texto (`BL-027`). Duas passadas têm um ponto cego medido: um comentário de linha que cite um
 * glob de dois asteriscos abre um "bloco" aos olhos da segunda régua, que apaga CÓDIGO até o próximo
 * fecha-bloco — e o guarda passa a aprovar o que estiver lá dentro, em silêncio.
 *
 * CRLF normalizado ANTES, e isto é correção e não higiene (`L-031`): em JavaScript `.` não casa
 * `\r`, então num checkout Windows — a plataforma deste projeto — o stripper de linha fica inerte.
 *
 * Aqui ele não é zelo: **este arquivo cita a forma proibida em prosa**, nos sensores e na tabela
 * acima. Sem o stripper, o conserto viraria "edite o comentário".
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

const eTeste = (rel: string) =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

interface Arquivo {
  rel: string
  linhas: string[]
}

const varridos: Arquivo[] = ESCOPO.flatMap((pasta) => {
  const dir = join(RAIZ, pasta)
  // Pasta que deixou de existir varreria zero arquivo e faria a regra passar por vacuidade. Aqui ela
  // REPROVA, que é a única saída aceitável.
  if (!existsSync(dir)) throw new Error(`escopo inexistente: ${pasta}`)
  return listar(dir)
}).map((caminho) => ({
  rel: relative(RAIZ, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

/** Teste pode escrever o que quiser — inclusive os sensores abaixo. */
const producao = varridos.filter((a) => !eTeste(a.rel))

/**
 * Um comprimento seguido de barra, nas duas grafias que o painel produziria — a interpolação de
 * template e a chave de JSX. Casa a FORMA do contador, não o nome de uma variável: a régua tem de
 * medir a propriedade, nunca o formato em que ela apareceu da primeira vez.
 */
const CONTADOR = /\.length\s*\}?\s*\//

const DONO = 'shared/ui/CharCounter.tsx'

const ocorrencias = (alvo: Arquivo[]) => {
  const achados: string[] = []
  for (const { rel, linhas } of alvo) {
    linhas.forEach((texto, i) => {
      if (CONTADOR.test(texto)) achados.push(`${rel}:${i + 1} → ${texto.trim()}`)
    })
  }
  return achados
}

describe('contador de caracteres — âncoras', () => {
  it('a varredura enxerga as quatro pastas do escopo', () => {
    // Caminho errado varre zero arquivo e faz a asserção de ausência passar por VACUIDADE, que é a
    // pior falha possível num guarda cuja regra é "não existe".
    expect(varridos.length).toBeGreaterThan(20)
    for (const pasta of ESCOPO) {
      expect(varridos.some((a) => a.rel.startsWith(`${pasta}/`)), pasta).toBe(true)
    }
    expect(varridos.some((a) => a.rel === DONO)).toBe(true)
  })

  it('a régua ENCONTRA a forma onde ela tem de estar — a outra metade da âncora', () => {
    // Sem isto, um regex quebrado varreria o escopo, acharia zero e a regra abaixo passaria sem
    // nada ter sido medido. Aconteceu na primeira escrita deste arquivo: o dono guardava o
    // comprimento numa variável antes de renderizar, e a régua — que casa `.length` colado na barra
    // — não o via. O conserto foi do DONO, que passou a escrever a forma direta; uma régua ajustada
    // para casar o nome da variável mediria aquele arquivo, não a propriedade.
    const noDono = ocorrencias(producao.filter((a) => a.rel === DONO))

    expect(noDono.length).toBeGreaterThanOrEqual(1)
  })
})

describe('LEG-14 / LEG-19 — nenhuma segunda escrita do contador em Configurações', () => {
  it('a forma do contador só aparece no dono', () => {
    const fora = ocorrencias(producao.filter((a) => a.rel !== DONO))

    expect(fora).toEqual([])
  })
})

describe('SENSORES', () => {
  const sonda = (linha: string) => CONTADOR.test(linha)

  it('a régua acusa a interpolação de template escrita à mão', () => {
    expect(sonda('  const rotulo = `${(value ?? "").length}/${limit}`')).toBe(true)
  })

  it('a régua acusa a chave de JSX escrita à mão', () => {
    expect(sonda('  <span>{valor.length}/{limite}</span>')).toBe(true)
  })

  it('a régua acusa mesmo com espaço em volta da barra', () => {
    expect(sonda('  {texto.length} / {limite}')).toBe(true)
  })

  it('INVERSO: ler `.length` sem barra depois NÃO é acusado', () => {
    // A metade que impede o guarda de virar "qualquer coisa reprova". `items.length` aparece às
    // dezenas no painel, e nenhuma delas é um contador.
    expect(sonda('  if (extra.length >= COPY_LIMITS.extraLines) return')).toBe(false)
    expect(sonda('  const total = linhas.length')).toBe(false)
    expect(sonda('  expect(achados.length).toBe(0)')).toBe(false)
  })

  it('INVERSO: uma divisão POR comprimento não é acusada — a barra vem antes', () => {
    expect(sonda('  const media = soma / valores.length')).toBe(false)
  })

  it('comentário é removido, com CRLF e com LF, e o código em volta sobrevive', () => {
    const forma = '{v.length}/{limite}'
    for (const quebra of ['\r\n', '\n']) {
      const linhas = semComentarios(
        ['const antes = 1', `// a forma proibida e ${forma}`, 'const depois = 3'].join(quebra),
      )
      expect(linhas.some((l) => CONTADOR.test(l))).toBe(false)
      expect(linhas.some((l) => l.includes('const antes = 1'))).toBe(true)
      expect(linhas.some((l) => l.includes('const depois = 3'))).toBe(true)
    }
  })

  it('comentário de LINHA que cita um glob não engole o código abaixo', () => {
    const fonte = [
      'const antes = 1',
      '// varre features/settings/**/*.tsx',
      'const contador = `${v.length}/${limite}`',
      'const depois = 3',
    ].join('\r\n')

    const linhas = semComentarios(fonte)

    expect(linhas.some((l) => l.includes('varre features'))).toBe(false)
    // O CÓDIGO abaixo do comentário continua visível — se sumisse, o guarda aprovaria a segunda
    // escrita em silêncio, que é exatamente o `BL-027`.
    expect(linhas.some((l) => CONTADOR.test(l))).toBe(true)
    expect(linhas.some((l) => l.includes('const depois = 3'))).toBe(true)
  })

  it('escopo inexistente REPROVA em vez de varrer zero', () => {
    // A propriedade que separa "não achei nada porque está limpo" de "não achei nada porque olhei
    // no lugar errado".
    expect(() => {
      const dir = join(RAIZ, 'features/secao-que-nao-existe')
      if (!existsSync(dir)) throw new Error('escopo inexistente')
      return listar(dir)
    }).toThrow('escopo inexistente')
  })
})
