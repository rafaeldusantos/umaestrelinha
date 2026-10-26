// Feature `76` · T28 (G7) — `MAC-35`: o registro da aba Clientes é memorial. Boa parte de quem a Adri
// atende acabou de perder alguém; a tela que lista essas pessoas não pode ter emoji, ponto de
// exclamação, ranking ("melhores", "VIP", "top"), urgência ("atenção", "urgente", "últimas unidades") nem
// nomear o que a pessoa confiou à loja (cinzas, leite, cabelo, pelo, dente, coto, pena). Nenhum teste de
// componente repara em palavra que não escreveram: o texto errado passa em build, `tsc` e suíte.
//
// **Pela AST do TypeScript**, nos LITERAIS de texto dos arquivos de cliente (entidade, features, widgets e
// as duas páginas; só produção): string, template sem/com substituição (os pedaços de texto) e texto de
// JSX. O que é CLASSE de estilo (`className=` e o argumento de `cn(…)`) ou especificador de import não é
// frase e fica de fora — senão `top-0` seria acusado como "top". A fronteira das palavras é por TOKEN
// EXATO (`(?<![-\w])…(?![-\w])`, `L-034`): `top-0` não é "top", e `pelo` só é a palavra solta.
//
// Acusa, por FORMA (`L-033`):
// 1. emoji (`\p{Extended_Pictographic}`);
// 2. `!` dentro de texto (nunca o operador: ele não está num literal);
// 3. as palavras de ranking: VIP, melhor/melhores, top, ranking;
// 4. as palavras de urgência: atenção, urgente, últimas/últimos unidades;
// 5. o nome dos sete materiais, no singular e no plural.
//
// Alcance declarado: a frase escrita num literal. O texto que o app recebe do banco (o nome de um
// produto, "Pingente Gota") não é literal do código e não é medido aqui — a decisão de que o produto
// não nomeia material é da loja (`BL-015`).
//
// Âncora dupla: os arquivos lidos E a quantidade de literais de texto achados (acima de um piso, e as
// frases-chave presentes — "Em aberto", "cliente desde"): sem ela, um extrator quebrado aprovaria tudo.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const PASTAS = [
  'entities/customer/',
  'features/open-customer/',
  'features/customer-slice/',
  'features/customer-search/',
  'widgets/customer-list/',
  'widgets/customer-detail/',
]
const PAGINAS = ['pages/ClientesPage.tsx', 'pages/ClientePage.tsx']

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

describe('o registro da aba Clientes é memorial (MAC-35) — âncoras', () => {
  it('a varredura leu as pastas de cliente e as duas páginas', () => {
    expect(ESCOPO.length).toBeGreaterThanOrEqual(30)
    expect(ESCOPO.map((a) => a.rel)).toEqual(expect.arrayContaining(['entities/customer/model/frases.ts', 'pages/ClientePage.tsx']))
  })

  it('o extrator achou os literais: bem acima de um piso, e as frases-chave dentro', () => {
    const todos = ESCOPO.flatMap((a) => literais(a.rel, a.texto))
    expect(todos.length).toBeGreaterThanOrEqual(60)
    const junto = todos.join('\n')
    for (const frase of ['Em aberto', 'Não encontrei esta cliente.', 'Conversar no WhatsApp', 'Ver mais pedidos', 'Contam só os pedidos pagos.'])
      expect(junto).toContain(frase)
  })

  it('o extrator NÃO leva classe de estilo: `className` e `cn(…)` ficam fora', () => {
    const todos = ESCOPO.flatMap((a) => literais(a.rel, a.texto))
    expect(todos.some((l) => /\bpointer-events-none\b/.test(l))).toBe(false)
    expect(todos.some((l) => /\bmin-h-11\b/.test(l))).toBe(false)
  })
})

describe('o registro da aba Clientes é memorial (MAC-35)', () => {
  it('nenhum literal dos arquivos de cliente tem emoji, exclamação, ranking, urgência nem nome de material', () => {
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
