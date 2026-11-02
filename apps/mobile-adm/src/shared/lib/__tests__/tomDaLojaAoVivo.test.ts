// Feature `83` · T10 — `LAV-64`, `LAV-65`: o registro da Loja ao vivo (Fase 1). Quem abre esta tela
// cuida de uma loja memorial; os números são de NAVEGADORES, nunca de "pessoas" (`VIS-41`). Nada de
// emoji, `!`, urgência fabricada ("corra", "não perca", "últimas", "agora mesmo") nem
// "pessoa(s)"/"usuário(s)". E, com o sistema pedindo menos movimento, nada se move.
//
// **Pela AST do TypeScript**, nos LITERAIS de texto (string, pedaços de template, texto de JSX), fora
// o que é CLASSE de estilo (`className=` e o argumento de `cn(…)`) e especificador de import (molde de
// `tomMemorialDeClientes`). Palavras por TOKEN EXATO (`(?<![-\w])…(?![-\w])`, `L-034`).
//
// **Escopo LITERAL, nomeado um a um** (design §6, `BL-058`): os arquivos da Fase 1 — `core/live/access.ts`,
// `core/stats/counterNotes.ts` e os do app. NÃO varre `core/live/**` inteiro.
//
// **A presença tem régua própria** (`BL-058`): ela conta PESSOAS — quem pulsou nos últimos 5 minutos —,
// então "pessoa(s)" é permitido SÓ nos arquivos dela (`core/live/presence.ts` e o cartão "Agora na
// loja"), e continua recusado nos da Fase 1. Na mesma régua, "últimos"/"últimas" passa SÓ seguido de
// uma duração ("últimos 5 minutos", "últimos 30 min"), que é janela de tempo e não urgência; "últimas
// unidades", "corra", "não perca" e "usuários" continuam recusados em todo arquivo.
//
// O movimento: `transition-*`/`animate-*` sem o par `motion-reduce:` que DESLIGUE movimento na mesma
// linha (régua estreita de `movimentoDeClientes`). Os arquivos de UI da `83` mais os dois de que a seção
// depende para o movimento (`shared/ui/leitura.tsx`, o `Traco`; `shared/ui/PullToRefresh.tsx`). As
// barras do gráfico NÃO têm transição nenhuma (`LAV-64`, por construção).
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const CORE = resolve(SRC, '../../../packages/core/src')

const DE_CORE = ['live/access.ts', 'stats/counterNotes.ts'] as const
/** Os arquivos da presença: "pessoa(s)" permitido, o resto da régua igual. */
const DA_PRESENCA_CORE = ['live/presence.ts', 'live/screen.ts'] as const
const DA_PRESENCA_APP = [
  'widgets/live-card/ui/CartaoAgoraNaLoja.tsx',
  'widgets/store-live/ui/BlocosDaPresenca.tsx',
  'widgets/store-live/ui/AgoraNaLoja.tsx',
  'widgets/store-live/ui/OQueEstaoFazendo.tsx',
  'widgets/store-live/ui/JoiasSendoVistas.tsx',
  'widgets/store-live/ui/DeOndeVieram.tsx',
  'widgets/store-live/ui/NoCelular.tsx',
  'widgets/store-live/ui/estilo.ts',
] as const
const DO_APP = [
  'entities/stats/model/aoVivo.ts',
  'entities/stats/model/periodos.ts',
  'pages/AoVivoPage.tsx',
  'widgets/store-access/model/barras.ts',
  'widgets/store-access/ui/CabecalhoAoVivo.tsx',
  'widgets/store-access/ui/GraficoDosAcessos.tsx',
  'widgets/store-access/ui/SecaoAcessos.tsx',
] as const
const DO_MOVIMENTO = [
  ...DO_APP.filter((rel) => rel.endsWith('.tsx')),
  ...DA_PRESENCA_APP,
  'shared/ui/leitura.tsx',
  'shared/ui/PullToRefresh.tsx',
] as const

interface Arquivo {
  rel: string
  texto: string
}

const ESCOPO: Arquivo[] = [
  ...DE_CORE.map((rel) => ({ rel: `core/${rel}`, texto: readFileSync(resolve(CORE, rel), 'utf8') })),
  ...DO_APP.map((rel) => ({ rel, texto: readFileSync(resolve(SRC, rel), 'utf8') })),
]
const ESCOPO_DA_PRESENCA: Arquivo[] = [
  ...DA_PRESENCA_CORE.map((rel) => ({ rel: `core/${rel}`, texto: readFileSync(resolve(CORE, rel), 'utf8') })),
  ...DA_PRESENCA_APP.map((rel) => ({ rel, texto: readFileSync(resolve(SRC, rel), 'utf8') })),
]

// ——— os literais ———

const parse = (rel: string, texto: string) =>
  ts.createSourceFile(rel, texto, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

const ehEstilo = (no: ts.Node): boolean => {
  for (let p: ts.Node | undefined = no.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return p.name.getText() === 'className'
    if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === 'cn') return true
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true
    if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isBlock(p) || ts.isSourceFile(p)) return false
  }
  return false
}

const literais = (rel: string, texto: string): string[] => {
  const achados: string[] = []
  const visitar = (no: ts.Node) => {
    if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no) || ts.isTemplateHead(no) || ts.isTemplateMiddle(no) || ts.isTemplateTail(no)) {
      if (!ehEstilo(no)) achados.push(no.text)
    } else if (ts.isJsxText(no)) {
      const t = no.getText().replace(/\s+/g, ' ').trim()
      if (t) achados.push(t)
    }
    no.forEachChild(visitar)
  }
  visitar(parse(rel, texto))
  return achados
}

const palavra = (re: string) => new RegExp(`(?<![-\\w])(?:${re})(?![-\\w])`, 'iu')
const FORMAS: { nome: string; re: RegExp }[] = [
  { nome: 'emoji', re: /\p{Extended_Pictographic}/u },
  { nome: 'exclamação', re: /!/ },
  { nome: 'urgência', re: palavra('corra|não\\s+perca|últimas?|últimos?|agora\\s+mesmo') },
  { nome: 'pessoas', re: palavra('pessoas?|usuários?|usuárias?') },
]

/** "últimos"/"últimas" seguido de uma duração é janela de tempo ("últimos 5 minutos", "últimos 30 min"). */
const DURACAO = '\\s+\\d+\\s*(?:min(?:utos?)?|h|horas?|segundos?|s)(?![-\\w])'
const FORMAS_DA_PRESENCA: { nome: string; re: RegExp }[] = [
  ...FORMAS.filter((f) => f.nome !== 'urgência' && f.nome !== 'pessoas'),
  { nome: 'urgência', re: palavra(`corra|não\\s+perca|últimas?(?!${DURACAO})|últimos?(?!${DURACAO})|agora\\s+mesmo`) },
  { nome: 'usuários', re: palavra('usuários?|usuárias?') },
]

const acusacoesPor = (formas: { nome: string; re: RegExp }[]) => (alvo: Arquivo[]): string[] =>
  alvo.flatMap((a) => literais(a.rel, a.texto).flatMap((l) => formas.filter((f) => f.re.test(l)).map((f) => `${a.rel} [${f.nome}] ${l}`)))
const acusacoes = acusacoesPor(FORMAS)
const acusacoesDaPresenca = acusacoesPor(FORMAS_DA_PRESENCA)
const sintetico = (fonte: string): Arquivo[] => [{ rel: 'sintetico.tsx', texto: fonte }]

// ——— o movimento (régua de `movimentoDeClientes`) ———

const semComentarios = (texto: string): string => texto.replace(/\r\n?/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')
const CLASSE_QUE_MOVE = /(?<![-\w:\]])((?:[a-z][a-z0-9-]*(?:\[[^\]\s]*\])?:)*)(transition|animate)(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?(?![-\w])/g
const DISPENSADAS = ['transition-none', 'animate-none', 'animate-spin']
const PARES = ['transition-none', 'animate-none']

const movimentoDe = (codigo: string) =>
  codigo.split('\n').flatMap((linha, i) =>
    [...linha.matchAll(CLASSE_QUE_MOVE)].map((m) => {
      const classe = m[3] ? `${m[2]}-${m[3]}` : m[2]
      return { classe, numero: i + 1, ehOPar: (m[1] ?? '').includes('motion-reduce:') && PARES.includes(classe) }
    }),
  )
const movimentoSemPar = (fonte: string): string[] => {
  const achados = movimentoDe(semComentarios(fonte))
  const linhasComPar = new Set(achados.filter((a) => a.ehOPar).map((a) => a.numero))
  return achados
    .filter((a) => !a.ehOPar && !DISPENSADAS.includes(a.classe) && !linhasComPar.has(a.numero))
    .map((a) => `${a.classe} (linha ${a.numero})`)
}
const FONTES_DO_MOVIMENTO = DO_MOVIMENTO.map((rel) => ({ rel, fonte: readFileSync(resolve(SRC, rel), 'utf8') }))

describe('o tom da Loja ao vivo (LAV-65) — âncoras', () => {
  it('cada arquivo nomeado foi lido, de `core` e do app, nas duas réguas', () => {
    expect(ESCOPO).toHaveLength(9)
    expect(ESCOPO.every((a) => a.texto.length > 0)).toBe(true)
    expect(ESCOPO.map((a) => a.rel)).toEqual(expect.arrayContaining(['core/live/access.ts', 'core/stats/counterNotes.ts', 'pages/AoVivoPage.tsx']))
    expect(ESCOPO_DA_PRESENCA.map((a) => a.rel)).toEqual([
      'core/live/presence.ts',
      'core/live/screen.ts',
      'widgets/live-card/ui/CartaoAgoraNaLoja.tsx',
      'widgets/store-live/ui/BlocosDaPresenca.tsx',
      'widgets/store-live/ui/AgoraNaLoja.tsx',
      'widgets/store-live/ui/OQueEstaoFazendo.tsx',
      'widgets/store-live/ui/JoiasSendoVistas.tsx',
      'widgets/store-live/ui/DeOndeVieram.tsx',
      'widgets/store-live/ui/NoCelular.tsx',
      'widgets/store-live/ui/estilo.ts',
    ])
    expect(ESCOPO_DA_PRESENCA.every((a) => a.texto.length > 0)).toBe(true)
  })

  it('o extrator achou os literais: acima de um piso, com as frases-chave dentro, e sem classe de estilo', () => {
    const todos = ESCOPO.flatMap((a) => literais(a.rel, a.texto))
    expect(todos.length).toBeGreaterThanOrEqual(40)
    const junto = todos.join('\n')
    for (const frase of ['Acessos', 'Conta só quem aceitou cookies de estatística.', 'Loja ao vivo', 'Desde segunda-feira.', 'Voltar'])
      expect(junto).toContain(frase)
    expect(todos.some((l) => /\bmin-h-11\b/.test(l))).toBe(false)
    const daPresenca = ESCOPO_DA_PRESENCA.flatMap((a) => literais(a.rel, a.texto)).join('\n')
    for (const frase of [
      'Agora na loja',
      'Ninguém na loja agora',
      'pessoas',
      ' na sacola',
      ' no checkout',
      'nos últimos 5 minutos',
      'Compraram (últimos 30 min)',
      'Joias sendo vistas agora',
      'De onde vieram',
      'o resto pelo computador ou tablet',
    ])
      expect(daPresenca).toContain(frase)
  })
})

describe('o tom da Loja ao vivo (LAV-65)', () => {
  it('nenhum literal da Fase 1 tem emoji, exclamação, urgência nem "pessoa(s)"/"usuário(s)"', () => {
    expect(acusacoes(ESCOPO)).toEqual([])
  })

  it('nenhum literal da presença tem emoji, exclamação, urgência nem "usuário(s)" — "pessoa(s)" pode', () => {
    expect(acusacoesDaPresenca(ESCOPO_DA_PRESENCA)).toEqual([])
    // os mesmos arquivos, na régua da Fase 1, seriam acusados por "pessoa(s)": a régua própria é o que os deixa passar
    expect(acusacoes(ESCOPO_DA_PRESENCA).some((a) => a.includes('[pessoas]'))).toBe(true)
  })
})

describe('o tom — sensores', () => {
  it.each([
    ["const t = 'Movimento bom hoje 🎉'", 'emoji'],
    ["const t = 'Que dia!'", 'exclamação'],
    ["const t = 'Corra, a loja está cheia'", 'urgência'],
    ['const t = <p>Não perca</p>', 'urgência'],
    ["const t = 'Últimas horas do dia'", 'urgência'],
    ["const t = 'Agora mesmo na loja'", 'urgência'],
    ["const t = '41 pessoas hoje'", 'pessoas'],
    ['const t = `${n} pessoa na loja`', 'pessoas'],
    ["const t = '12 usuários'", 'pessoas'],
  ])('acusa: %s', (codigo, forma) => {
    expect(acusacoes(sintetico(codigo)).some((a) => a.includes(`[${forma}]`))).toBe(true)
  })

  it.each([
    ["const t = 'Atualizado agora'"],
    ["const t = 'Visitas hoje, 41. Abrir loja ao vivo'"],
    ["const c = cn('min-h-11 !important-nao')"],
    ['const j = <div className="pessoa" />'],
    ["const e = a !== b ? 'sim' : 'não'"],
  ])('não acusa: %s', (codigo) => {
    expect(acusacoes(sintetico(codigo))).toEqual([])
  })

  it.each([
    ["const t = 'Últimas unidades'", 'urgência'],
    ["const t = 'Corra, 3 pessoas olhando'", 'urgência'],
    ['const t = <p>Não perca</p>', 'urgência'],
    ["const t = 'Os últimos que restam'", 'urgência'],
    ["const t = '12 usuários na loja'", 'usuários'],
    ["const t = '7 pessoas agora 🎉'", 'emoji'],
    ["const t = 'Loja cheia!'", 'exclamação'],
  ])('a régua da presença acusa: %s', (codigo, forma) => {
    expect(acusacoesDaPresenca(sintetico(codigo)).some((a) => a.includes(`[${forma}]`))).toBe(true)
  })

  it.each([
    ["const t = 'pessoas nos últimos 5 minutos'"],
    ["const t = 'Compraram (últimos 30 min)'"],
    ['const t = `${n} pessoa`'],
    ["const t = 'Ninguém na loja agora'"],
  ])('a régua da presença não acusa: %s', (codigo) => {
    expect(acusacoesDaPresenca(sintetico(codigo))).toEqual([])
  })

  it('a Fase 1 continua recusando "pessoas" e "últimos 5 minutos"', () => {
    expect(acusacoes(sintetico("const t = 'pessoas nos últimos 5 minutos'")).map((a) => a.split(' ')[1])).toEqual(['[urgência]', '[pessoas]'])
  })

  it('comentário não é literal — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(acusacoes(sintetico('// 41 pessoas!\r\nconst a = 1'))).toEqual([])
    expect(acusacoes(sintetico('/* corra */\nconst a = 1'))).toEqual([])
    expect(acusacoes(sintetico("// varre apps/**\nconst t = 'Corra'\n/* fim */")).length).toBe(1)
  })
})

describe('o movimento da Loja ao vivo respeita `prefers-reduced-motion` (LAV-64)', () => {
  it('ÂNCORA: os arquivos de movimento foram lidos, e a régua acha o esqueleto (`Traco`) com o par', () => {
    expect(FONTES_DO_MOVIMENTO).toHaveLength(14)
    const de = (rel: string) => movimentoDe(semComentarios(FONTES_DO_MOVIMENTO.find((f) => f.rel === rel)!.fonte)).map((t) => t.classe)
    expect(de('shared/ui/leitura.tsx')).toEqual(expect.arrayContaining(['animate-pulse', 'animate-none']))
  })

  it('nenhum arquivo em escopo declara movimento sem o par na mesma linha — e o gráfico não declara nenhum', () => {
    expect(FONTES_DO_MOVIMENTO.flatMap((f) => movimentoSemPar(f.fonte).map((c) => `${f.rel}: ${c}`))).toEqual([])
    const grafico = FONTES_DO_MOVIMENTO.find((f) => f.rel === 'widgets/store-access/ui/GraficoDosAcessos.tsx')!
    expect(movimentoDe(semComentarios(grafico.fonte))).toEqual([])
  })

  it('SENSOR: a classe sem par reprova, com par passa; `motion-reduce:opacity-100` não é par; a prosa não conta', () => {
    expect(movimentoSemPar('className="transition-all"')).toEqual(['transition-all (linha 1)'])
    expect(movimentoSemPar('className="transition-all motion-reduce:transition-none"')).toEqual([])
    expect(movimentoSemPar('className="transition-opacity motion-reduce:opacity-100"')).toEqual(['transition-opacity (linha 1)'])
    expect(movimentoSemPar('// transition-colors\r\nconst x = 1')).toEqual([])
    expect(movimentoSemPar('<a className="animate-pulse" />\n<b className="motion-reduce:animate-none" />')).toEqual(['animate-pulse (linha 1)'])
  })
})
