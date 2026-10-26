// Feature `79` · T24 — `MAN-08` (tom) e o registro memorial nas telas dos avisos: a tela "Avisos neste
// celular", a pergunta do "Sair" no menu da conta e as frases de `features/push-notifications`. Boa parte
// de quem a Adri atende acabou de perder alguém; um aviso de pedido não é festa. Molde e régua:
// `tomMemorialDeClientes.test.ts` (`76`) — pela AST do TypeScript, nos LITERAIS de texto (string,
// pedaços de template, texto de JSX), fora de classe de estilo e de import, com fronteira por TOKEN
// EXATO (`L-034`).
//
// Acusa: emoji, `!` dentro de texto, ranking, urgência e o nome dos materiais. Os textos do aviso em si
// (`pushMessage`, em `core`) já têm a régua deles em `packages/core/src/notifications/__tests__/push.test.ts`.
//
// Âncora dupla: os arquivos lidos E os literais achados, com as frases-chave da spec dentro.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const PASTAS = ['features/push-notifications/', 'widgets/account-menu/']
const PAGINAS = ['pages/AvisosPage.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

const parse = (rel: string, texto: string) =>
  ts.createSourceFile(rel, texto, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

/** Os atributos de JSX cujo valor é classe de estilo, não frase. */
const ATRIBUTOS_DE_ESTILO = new Set(['className'])
/** As funções cujos argumentos de texto são classe de estilo. */
const FUNCOES_DE_ESTILO = new Set(['cn'])

const ehEstilo = (no: ts.Node): boolean => {
  for (let p: ts.Node | undefined = no.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return ATRIBUTOS_DE_ESTILO.has(p.name.getText())
    if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && FUNCOES_DE_ESTILO.has(p.expression.text)) return true
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true
    if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isBlock(p) || ts.isSourceFile(p)) return false
  }
  return false
}

/** Os literais de TEXTO de um arquivo: string, pedaços de template e texto de JSX. */
const literais = (rel: string, texto: string): string[] => {
  const fonte = parse(rel, texto)
  const achados: string[] = []
  const visitar = (no: ts.Node) => {
    if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) {
      if (!ehEstilo(no)) achados.push(no.text)
    } else if (ts.isTemplateHead(no) || ts.isTemplateMiddle(no) || ts.isTemplateTail(no)) {
      if (!ehEstilo(no)) achados.push(no.text)
    } else if (ts.isJsxText(no)) {
      const t = no.getText().replace(/\s+/g, ' ').trim()
      if (t) achados.push(t)
    }
    no.forEachChild(visitar)
  }
  visitar(fonte)
  return achados
}

interface Arquivo {
  rel: string
  texto: string
}

const ESCOPO: Arquivo[] = arquivos(SRC)
  .map((c) => relative(SRC, c).split('\\').join('/'))
  .filter((rel) => PASTAS.some((p) => rel.startsWith(p)) || PAGINAS.includes(rel))
  .map((rel) => ({ rel, texto: readFileSync(join(SRC, rel), 'utf8') }))

const palavra = (re: string) => new RegExp(`(?<![-\\w])(?:${re})(?![-\\w])`, 'iu')
const FORMAS: { nome: string; re: RegExp }[] = [
  { nome: 'emoji', re: /\p{Extended_Pictographic}/u },
  { nome: 'exclamação', re: /!/ },
  { nome: 'ranking', re: palavra('vip|melhor|melhores|top|ranking') },
  { nome: 'urgência', re: palavra('atenção|urgente|urgentes|últimas?\\s+unidades|últimos?\\s+unidades') },
  { nome: 'material', re: palavra('cinzas?|leite|cabelos?|pelos?|dentes?|cotos?|penas?') },
]

const acusacoes = (alvo: Arquivo[]): string[] =>
  alvo.flatMap((a) => literais(a.rel, a.texto).flatMap((l) => FORMAS.filter((f) => f.re.test(l)).map((f) => `${a.rel} [${f.nome}] ${l}`)))

const sintetico = (fonte: string): Arquivo[] => [{ rel: 'sintetico.tsx', texto: fonte }]

describe('o registro dos avisos é memorial (MAN-08) — âncoras', () => {
  it('a varredura leu a pasta dos avisos, o menu da conta e a página', () => {
    expect(ESCOPO.map((a) => a.rel)).toEqual(
      expect.arrayContaining([
        'features/push-notifications/model/frases.ts',
        'features/push-notifications/model/usePushNoAparelho.ts',
        'widgets/account-menu/ui/AccountMenu.tsx',
        'pages/AvisosPage.tsx',
      ]),
    )
    expect(ESCOPO.length).toBeGreaterThanOrEqual(8)
  })

  it('o extrator achou os literais: acima de um piso, e as frases da spec dentro', () => {
    const todos = ESCOPO.flatMap((a) => literais(a.rel, a.texto))
    expect(todos.length).toBeGreaterThanOrEqual(20)
    const junto = todos.join('\n')
    for (const frase of [
      'Avisar neste celular',
      'Este navegador não recebe avisos.',
      'Não consegui ativar os avisos. Tente de novo.',
      'Aguarde alguns segundos para mandar outro aviso de teste.',
      'Não consegui parar os avisos deste celular.',
      'Sair mesmo assim',
    ])
      expect(junto).toContain(frase)
  })

  it('o extrator NÃO leva classe de estilo: `className` e `cn(…)` ficam fora (medido na página)', () => {
    // Na página toda classe está em `className`/`cn(…)`. O menu da conta guarda a classe da linha numa
    // constante (`LINHA`), que o extrator lê como texto — sem palavra acusável nela, e declarado aqui.
    const todos = ESCOPO.filter((a) => a.rel === 'pages/AvisosPage.tsx').flatMap((a) => literais(a.rel, a.texto))
    expect(todos.length).toBeGreaterThan(0)
    expect(todos.some((l) => /\bmin-h-12\b/.test(l))).toBe(false)
    expect(todos.some((l) => /\btranslate-x-0\.5\b/.test(l))).toBe(false)
  })
})

describe('o registro dos avisos é memorial (MAN-08)', () => {
  it('nenhum literal das telas dos avisos tem emoji, exclamação, ranking, urgência nem nome de material', () => {
    expect(acusacoes(ESCOPO)).toEqual([])
  })
})

describe('sensores — a régua acusa cada forma e não acusa o que não é', () => {
  it.each([
    ["const t = 'Bem-vinda de volta 🎉'", 'emoji'],
    ["const t = 'Que bom ver você!'", 'exclamação'],
    ['const t = <p>Cliente VIP</p>', 'ranking'],
    ["const t = 'As melhores clientes'", 'ranking'],
    ["const t = 'Top 10 clientes'", 'ranking'],
    ["const t = 'Ranking de compras'", 'ranking'],
    ["const t = 'Atenção: pedido parado'", 'urgência'],
    ["const t = 'Pedido urgente'", 'urgência'],
    ["const t = 'Últimas unidades'", 'urgência'],
    ["const t = 'Enviou cinzas de cremação'", 'material'],
    ["const t = 'Mechas de cabelo'", 'material'],
    ["const t = 'Pelo do cão'", 'material'],
    ["const t = `Leite materno de ${nome}`", 'material'],
    ["const t = 'Coto umbilical'", 'material'],
    ["const t = 'Dente de leite'", 'material'],
    ['const t = <p>Uma pena</p>', 'material'],
  ])('acusa: %s', (codigo, forma) => {
    expect(acusacoes(sintetico(codigo)).some((a) => a.includes(`[${forma}]`))).toBe(true)
  })

  it.each([
    ["const t = 'Em aberto'"],
    ["const t = 'cliente desde março 2026'"],
    ['const t = <p>Pedidos · 3</p>'],
    ["const c = cn('top-0 pointer-events-none')"],
    ['const j = <div className="absolute top-0 left-0 pelo" />'],
    ["import { x } from '@/shared/top'"],
    ["const e = a !== b ? 'sim' : 'não'"],
    ["const t = 'Compraram mais de uma vez'"],
    ["const t = 'Ninguém comprou mais de uma vez ainda.'"],
  ])('não acusa: %s', (codigo) => {
    expect(acusacoes(sintetico(codigo))).toEqual([])
  })

  it('o operador `!` e o `!==` não são exclamação: só o texto é', () => {
    expect(acusacoes(sintetico("const t = !ok && a !== b ? 'x' : 'y'"))).toEqual([])
  })

  it('token exato (L-034): "topo" e "pelos" soltos — "topo" não é "top"; "pelos" é o plural do material', () => {
    expect(acusacoes(sintetico("const t = 'Voltar ao topo'"))).toEqual([])
    expect(acusacoes(sintetico("const t = 'Pelos de pet'")).some((a) => a.includes('[material]'))).toBe(true)
  })

  it('comentário não é literal — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(acusacoes(sintetico('// Cliente VIP!\r\nconst a = 1'))).toEqual([])
    expect(acusacoes(sintetico('// as melhores\nconst a = 1'))).toEqual([])
    expect(acusacoes(sintetico('/* urgente! */ const a = 1'))).toEqual([])
    expect(acusacoes(sintetico("// varre apps/**\nconst t = 'Atenção'\n/* fim */")).length).toBe(1)
  })
})
