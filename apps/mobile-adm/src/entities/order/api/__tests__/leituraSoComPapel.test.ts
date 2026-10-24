// Feature `74` · T15 — `MAP-37`: no app do ateliê, toda leitura de tabela pelo PostgREST passa por
// `lerComPapel`. A RLS de `orders`/`order_items` devolve à conta SEM papel admin os pedidos DELA como
// cliente, sem erro (probe `03-cliente-sem-papel`); uma leitura fora de `lerComPapel` desenharia essas
// linhas como se fossem a fila da loja, com build, `tsc` e teste de componente verdes.
//
// **Pela AST do TypeScript**, não por regex (a lição do guarda da `67`: régua de uso por regex mede a
// grafia, não a chamada). Três réguas:
//   1. só oito arquivos de produção importam o client (`@estrelinha/supabase/client`): `lerComPapel.ts`,
//      os dois hooks de pedido, a porta de escrita (`75`) e, desde a `76`, os quatro de cliente —
//      allowlist literal;
//   2. nos dois hooks, toda referência a `supabase` é o receptor de um `.from(` (nada de passar o client
//      adiante, nada de `const db = supabase`), e toda chamada `supabase.from(` é ALCANÇÁVEL SÓ por
//      `lerComPapel`: ou está dentro de uma função passada a `lerComPapel(`, ou dentro de uma função
//      do arquivo, não exportada, cujas referências estão todas (recursivamente) nessas condições;
//   3. `lerComPapel.ts` não lê tabela nenhuma — só a RPC.
//
// Âncoras: os arquivos lidos, as sete chamadas `supabase.from(` achadas nos dois hooks, e a chamada a
// `lerComPapel(` achada em cada um.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const LER_COM_PAPEL = 'shared/api/lerComPapel.ts'
const HOOKS = ['entities/order/api/useListaDePedidos.ts', 'entities/order/api/usePedido.ts']
// Feature `75` (T16): a porta de ESCRITA (`gravarAcao.ts`) é o quarto importador. Ela não lê tabela
// nenhuma e não usa o client como receptor — só o entrega ao dono da escrita —, e quem mede isso é o
// vizinho `escritaSoPelaPorta.test.ts` (régua 2). A igualdade abaixo continua por igualdade: um quinto
// importador reprova aqui E lá.
const PORTA_DE_ESCRITA = 'features/order-actions/api/gravarAcao.ts'
// Feature `76` (T20, G2): os quatro de cliente. Leem tabelas e, como os de pedido, só dentro de
// `lerComPapel(` ou do `consultar` de `useJanelaPaginada(` (o segundo ponto de pareamento).
const HOOKS_DE_CLIENTE = [
  'entities/customer/api/useListaDeClientes.ts',
  'entities/customer/api/useCliente.ts',
  'entities/customer/api/usePedidosDoCliente.ts',
  'entities/customer/api/buscarClientePorEmail.ts',
]
const IMPORTAM_O_CLIENT = [LER_COM_PAPEL, ...HOOKS, PORTA_DE_ESCRITA, ...HOOKS_DE_CLIENTE]

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

const parse = (rel: string, texto: string) =>
  ts.createSourceFile(rel, texto, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

const visitar = (no: ts.Node, f: (n: ts.Node) => void) => {
  f(no)
  no.forEachChild((filho) => visitar(filho, f))
}

const importaOClient = (fonte: ts.SourceFile): boolean =>
  fonte.statements.some(
    (s) =>
      ts.isImportDeclaration(s) &&
      ts.isStringLiteral(s.moduleSpecifier) &&
      s.moduleSpecifier.text === '@estrelinha/supabase/client',
  )

const ehChamadaDe = (no: ts.Node, nome: string): no is ts.CallExpression =>
  ts.isCallExpression(no) && ts.isIdentifier(no.expression) && no.expression.text === nome

/**
 * O arrow é o `consultar` de uma chamada a `useJanelaPaginada({ … })`? (Feature `76`, T12: a janela
 * paginada tem UM dono, que embrulha CADA chamada a `consultar` em `lerComPapel` — a régua 4 abaixo
 * prova isso no dono. Passar a consulta como `consultar` é, portanto, o mesmo contrato que passá-la a
 * `lerComPapel(`.)
 */
const ehConsultarDaJanela = (p: ts.Node): boolean =>
  (ts.isArrowFunction(p) || ts.isFunctionExpression(p)) &&
  ts.isPropertyAssignment(p.parent) &&
  ts.isIdentifier(p.parent.name) &&
  p.parent.name.text === 'consultar' &&
  ts.isObjectLiteralExpression(p.parent.parent) &&
  ehChamadaDe(p.parent.parent.parent, 'useJanelaPaginada') &&
  (p.parent.parent.parent as ts.CallExpression).arguments.includes(p.parent.parent as ts.Expression)

/** O nó está dentro de uma função que é ARGUMENTO de `lerComPapel(` (ou o `consultar` da janela)? */
const dentroDeLerComPapel = (no: ts.Node): boolean => {
  for (let p: ts.Node | undefined = no.parent; p; p = p.parent) {
    if ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && p.parent && ehChamadaDe(p.parent, 'lerComPapel')) {
      if ((p.parent as ts.CallExpression).arguments.includes(p as ts.Expression)) return true
    }
    if (ehConsultarDaJanela(p)) return true
  }
  return false
}

/** A função NOMEADA (declaração ou `const f = (…) =>`) mais próxima que envolve o nó, ou `null`. */
const funcaoNomeada = (no: ts.Node): { nome: string; exportada: boolean } | null => {
  for (let p: ts.Node | undefined = no.parent; p; p = p.parent) {
    if (ts.isFunctionDeclaration(p) && p.name) {
      return { nome: p.name.text, exportada: !!p.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) }
    }
    if ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)) {
      const lista = p.parent.parent
      const stmt = lista?.parent
      const exportada = !!(stmt && ts.isVariableStatement(stmt) && stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
      return { nome: p.parent.name.text, exportada }
    }
  }
  return null
}

/**
 * O nó só é alcançável por `lerComPapel`? Direto, ou dentro de uma função do arquivo, não exportada,
 * cujas referências (fora da própria declaração) são todas alcançáveis só por `lerComPapel`.
 */
const alcancavelSoPorLerComPapel = (fonte: ts.SourceFile, no: ts.Node, vistos = new Set<string>()): boolean => {
  if (dentroDeLerComPapel(no)) return true
  const f = funcaoNomeada(no)
  if (!f || f.exportada || vistos.has(f.nome)) return false
  vistos.add(f.nome)
  const refs: ts.Identifier[] = []
  visitar(fonte, (n) => {
    if (ts.isIdentifier(n) && n.text === f.nome) {
      const declaracao =
        (ts.isVariableDeclaration(n.parent) && n.parent.name === n) || (ts.isFunctionDeclaration(n.parent) && n.parent.name === n)
      if (!declaracao) refs.push(n)
    }
  })
  return refs.length > 0 && refs.every((r) => alcancavelSoPorLerComPapel(fonte, r, new Set(vistos)))
}

interface Achado {
  froms: number
  chamadasLerComPapel: number
  problemas: string[]
}

/** As réguas 2 e 3 num arquivo — os sensores chamam a MESMA função. */
const medir = (rel: string, texto: string, { podeLer }: { podeLer: boolean }): Achado => {
  const fonte = parse(rel, texto)
  const achado: Achado = { froms: 0, chamadasLerComPapel: 0, problemas: [] }
  visitar(fonte, (n) => {
    if (ehChamadaDe(n, 'lerComPapel') || ehChamadaDe(n, 'useJanelaPaginada')) achado.chamadasLerComPapel++
    if (!ts.isIdentifier(n) || n.text !== 'supabase') return
    if (ts.isImportSpecifier(n.parent)) return
    const acesso = n.parent
    const ehFrom =
      ts.isPropertyAccessExpression(acesso) && acesso.expression === n && acesso.name.text === 'from' && ts.isCallExpression(acesso.parent)
    const ehRpc =
      ts.isPropertyAccessExpression(acesso) && acesso.expression === n && acesso.name.text === 'rpc' && ts.isCallExpression(acesso.parent)
    const linha = fonte.getLineAndCharacterOfPosition(n.getStart()).line + 1
    if (ehFrom) {
      achado.froms++
      if (!podeLer) achado.problemas.push(`${rel}:${linha} — lê tabela onde não pode`)
      else if (!alcancavelSoPorLerComPapel(fonte, acesso.parent)) achado.problemas.push(`${rel}:${linha} — supabase.from( fora de lerComPapel`)
    } else if (!(ehRpc && rel === LER_COM_PAPEL)) {
      achado.problemas.push(`${rel}:${linha} — o client usado de outro jeito (${acesso.getText().slice(0, 40)})`)
    }
  })
  return achado
}

/** Feature `76` (MAC-30): chamadas de ESCRITA (ou RPC) num arquivo de cliente, pela AST. */
const COMANDOS_QUE_ESCREVEM = new Set(['insert', 'update', 'upsert', 'delete', 'rpc'])
const escritasEmArquivoDeCliente = (rel: string, texto: string): string[] => {
  const fonte = parse(rel, texto)
  const achados: string[] = []
  visitar(fonte, (n) => {
    if (!ts.isCallExpression(n)) return
    const e = n.expression
    const nome = ts.isPropertyAccessExpression(e) ? e.name.text : ts.isIdentifier(e) ? e.text : null
    if (nome && COMANDOS_QUE_ESCREVEM.has(nome)) {
      achados.push(`${rel}:${fonte.getLineAndCharacterOfPosition(n.getStart()).line + 1} — ${nome}(`)
    }
  })
  return achados
}

const lidos = arquivos(SRC).map((caminho) => {
  const rel = relative(SRC, caminho).split('\\').join('/')
  return { rel, texto: readFileSync(caminho, 'utf8') }
})

describe('toda leitura do app passa por lerComPapel (MAP-37)', () => {
  it('âncora: o app foi lido, com os oito arquivos da allowlist', () => {
    expect(lidos.length).toBeGreaterThan(40)
    for (const rel of IMPORTAM_O_CLIENT) expect(lidos.map((l) => l.rel)).toContain(rel)
  })

  it('régua 1: só lerComPapel, os hooks de pedido e de cliente e a porta de escrita importam o client — por igualdade', () => {
    const importam = lidos.filter((l) => importaOClient(parse(l.rel, l.texto))).map((l) => l.rel).sort()
    expect(importam).toEqual([...IMPORTAM_O_CLIENT].sort())
  })

  it('régua 2: nos dois hooks, toda supabase.from( só é alcançável por lerComPapel', () => {
    const porArquivo = HOOKS.map((rel) => medir(rel, lidos.find((l) => l.rel === rel)!.texto, { podeLer: true }))
    // Âncora: as 7 chamadas (2 na lista — com e sem contagem —, 5 no detalhe) — e cada hook chama lerComPapel.
    expect(porArquivo.map((a) => a.froms)).toEqual([2, 5])
    expect(porArquivo.every((a) => a.chamadasLerComPapel > 0)).toBe(true)
    expect(porArquivo.flatMap((a) => a.problemas)).toEqual([])
  })

  it('régua 2 (feature 76): nos quatro hooks de cliente, toda supabase.from( só é alcançável por lerComPapel ou pelo `consultar` da janela', () => {
    const porArquivo = HOOKS_DE_CLIENTE.map((rel) => medir(rel, lidos.find((l) => l.rel === rel)!.texto, { podeLer: true }))
    // Âncora CONTADA, não digitada: as chamadas `supabase.from(` que a AST acha são as mesmas que um
    // segundo olhar (o texto sem comentário) acha — e há ao menos uma por arquivo. Um parser cego
    // zeraria os dois e passaria; um arquivo novo de leitura aumentaria os dois e seria medido.
    for (const [i, rel] of HOOKS_DE_CLIENTE.entries()) {
      const textoSemComentario = lidos.find((l) => l.rel === rel)!.texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
      const porTexto = [...textoSemComentario.matchAll(/\bsupabase\s*\.from\(/g)].length
      expect(porArquivo[i].froms).toBe(porTexto)
      expect(porArquivo[i].froms).toBeGreaterThan(0)
      expect(porArquivo[i].chamadasLerComPapel).toBeGreaterThan(0)
    }
    expect(porArquivo.flatMap((a) => a.problemas)).toEqual([])
  })

  it('régua 2 (feature 76, MAC-30): os quatro de cliente só LEEM — nenhum insert, update, upsert, delete ou rpc(', () => {
    const achados = HOOKS_DE_CLIENTE.flatMap((rel) => escritasEmArquivoDeCliente(rel, lidos.find((l) => l.rel === rel)!.texto))
    expect(achados).toEqual([])
  })

  it('régua 3: lerComPapel.ts não lê tabela — só a RPC', () => {
    const a = medir(LER_COM_PAPEL, lidos.find((l) => l.rel === LER_COM_PAPEL)!.texto, { podeLer: false })
    expect(a.froms).toBe(0)
    expect(a.problemas).toEqual([])
    expect(lidos.find((l) => l.rel === LER_COM_PAPEL)!.texto).toMatch(/supabase\.rpc\('atelie_clock'\)/)
  })
})

/** Régua 4 (feature `76`): no dono da janela, TODA chamada à consulta injetada está dentro de `lerComPapel(`. */
const DONO_DA_JANELA = 'shared/api/useJanelaPaginada.ts'
const medirDonoDaJanela = (texto: string): { chamadas: number; lerComPapel: number; problemas: string[] } => {
  const fonte = parse(DONO_DA_JANELA, texto)
  const r = { chamadas: 0, lerComPapel: 0, problemas: [] as string[] }
  visitar(fonte, (n) => {
    if (ehChamadaDe(n, 'lerComPapel')) r.lerComPapel++
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && /^consult(ar|aDaVez)$/.test(n.expression.text)) {
      r.chamadas++
      if (!dentroDeLerComPapel(n)) r.problemas.push(`${DONO_DA_JANELA}:${fonte.getLineAndCharacterOfPosition(n.getStart()).line + 1} — a consulta injetada fora de lerComPapel`)
    }
  })
  return r
}

describe('regra 4 (feature 76): o dono da janela só chama a consulta injetada dentro de lerComPapel', () => {
  const texto = () => lidos.find((l) => l.rel === DONO_DA_JANELA)!.texto

  it('âncora: o dono foi lido, não importa o client, chama lerComPapel e a consulta nos dois pontos (releitura e próxima)', () => {
    expect(lidos.map((l) => l.rel)).toContain(DONO_DA_JANELA)
    expect(importaOClient(parse(DONO_DA_JANELA, texto()))).toBe(false)
    const r = medirDonoDaJanela(texto())
    expect(r.chamadas).toBe(2)
    expect(r.lerComPapel).toBe(2)
    expect(r.problemas).toEqual([])
  })

  it('acusa: a consulta chamada solta (sem lerComPapel)', () => {
    const solto = texto().replace('await lerComPapel(() => consultar({ limite, contar: true }))', 'await { resultado: await consultar({ limite, contar: true }), lido_em: "" }')
    expect(solto).not.toBe(texto())
    expect(medirDonoDaJanela(solto).problemas).toHaveLength(1)
  })

  it('acusa: a consulta da próxima página chamada solta', () => {
    const solto = texto().replace(/await lerComPapel\(\(\) =>\s*consultaDaVez\(\{ limite: tamanhoDaPagina, cursor: cursor\(ultima\), contar: false \}\),\s*\)/, '{ resultado: await consultaDaVez({ limite: tamanhoDaPagina, cursor: cursor(ultima), contar: false }) }')
    expect(solto).not.toBe(texto())
    expect(medirDonoDaJanela(solto).problemas).toHaveLength(1)
  })
})

describe('sensores — o `consultar` da janela é o mesmo contrato de lerComPapel (feature 76)', () => {
  const H = 'entities/order/api/useListaDePedidos.ts'
  const imp = `import { supabase } from '@estrelinha/supabase/client'\n`
  it('inverso: o `from` dentro do `consultar` de useJanelaPaginada não é acusado', () => {
    const a = medir(H, `${imp}export const h = () => useJanelaPaginada({ consultar: (p) => supabase.from('order_list').select('id') })`, { podeLer: true })
    expect(a.problemas).toEqual([])
    expect(a.chamadasLerComPapel).toBe(1)
  })
  it('acusa: o `from` em OUTRA propriedade da janela (cursorDe) ou em outra chamada com `consultar`', () => {
    expect(medir(H, `${imp}export const h = () => useJanelaPaginada({ cursorDe: (p) => supabase.from('order_list').select('id') })`, { podeLer: true }).problemas).toHaveLength(1)
    expect(medir(H, `${imp}export const h = () => outra({ consultar: (p) => supabase.from('order_list').select('id') })`, { podeLer: true }).problemas).toHaveLength(1)
  })
})

describe('sensores — a régua acusa a leitura fora de lerComPapel e não acusa a de dentro', () => {
  const H = 'entities/order/api/useListaDePedidos.ts'
  const medirH = (codigo: string) => medir(H, `import { supabase } from '@estrelinha/supabase/client'\n${codigo}`, { podeLer: true })

  it('inverso: dentro do arrow passado a lerComPapel não é acusado', () => {
    expect(medirH(`const f = () => lerComPapel(async () => supabase.from('order_list').select('id'))`).problemas).toEqual([])
  })

  it('inverso: numa função privada chamada só de dentro de lerComPapel não é acusado', () => {
    expect(medirH(`const ler = () => supabase.from('x').select('id')\nexport const h = () => lerComPapel(() => ler())`).problemas).toEqual([])
  })

  it('acusa: supabase.from( solto, num hook', () => {
    expect(medirH(`export const h = async () => supabase.from('order_list').select('id')`).problemas).toHaveLength(1)
  })

  it('acusa: a função privada chamada também FORA de lerComPapel', () => {
    expect(medirH(`const ler = () => supabase.from('x').select('id')\nexport const h = () => { lerComPapel(() => ler()); return ler() }`).problemas).toHaveLength(1)
  })

  it('acusa: a função que lê, EXPORTADA (qualquer um a chamaria sem a confirmação)', () => {
    expect(medirH(`export const ler = () => supabase.from('x').select('id')\nexport const h = () => lerComPapel(() => ler())`).problemas).toHaveLength(1)
  })

  it('acusa: a função passada a OUTRA chamada (Promise.resolve), não a lerComPapel', () => {
    expect(medirH(`export const h = () => Promise.resolve().then(() => supabase.from('x').select('id'))`).problemas).toHaveLength(1)
  })

  it('acusa: o client passado adiante ou apelidado', () => {
    expect(medirH(`const db = supabase\nexport const h = () => lerComPapel(() => db.from('x'))`).problemas).toHaveLength(1)
  })

  it('acusa: leitura de tabela em lerComPapel.ts', () => {
    expect(medir(LER_COM_PAPEL, `import { supabase } from '@estrelinha/supabase/client'\nconst x = () => supabase.from('order_list')`, { podeLer: false }).problemas).toHaveLength(1)
  })

  it('a régua 1 enxerga o import (sensor da igualdade)', () => {
    expect(importaOClient(parse('a.ts', `import { supabase } from '@estrelinha/supabase/client'`))).toBe(true)
    expect(importaOClient(parse('a.ts', `// import { supabase } from '@estrelinha/supabase/client'`))).toBe(false)
  })

  it('o comentário que cita supabase.from( não conta (é AST)', () => {
    expect(medirH(`// supabase.from('order_list') aqui seria errado\nexport const h = 1`).froms).toBe(0)
  })
})

describe('sensores (feature 76) — os quatro de cliente só leem, e leem por lerComPapel', () => {
  const H = 'entities/customer/api/useCliente.ts'
  const imp = `import { supabase } from '@estrelinha/supabase/client'\n`

  it('acusa: uma consulta fora de lerComPapel e fora do `consultar` da janela, num hook de cliente', () => {
    expect(medir(H, `${imp}export const h = async () => supabase.from('customer_list').select('id')`, { podeLer: true }).problemas).toHaveLength(1)
  })

  it('inverso: a consulta dentro do `consultar` da janela ou de lerComPapel passa', () => {
    expect(medir(H, `${imp}export const h = () => useJanelaPaginada({ consultar: () => supabase.from('customer_list').select('id') })`, { podeLer: true }).problemas).toEqual([])
    expect(medir(H, `${imp}export const h = () => lerComPapel(async () => supabase.from('customer_list').select('id'))`, { podeLer: true }).problemas).toEqual([])
  })

  it.each([
    ["supabase.from('customer_list').insert({ name: 'x' })", 'insert'],
    ["supabase.from('customer_list').update({ name: 'x' }).eq('id', 1)", 'update'],
    ["supabase.from('customer_list').upsert({ name: 'x' })", 'upsert'],
    ["supabase.from('customer_list').delete().eq('id', 1)", 'delete'],
    ["supabase.rpc('qualquer')", 'rpc'],
    ["rpc('qualquer')", 'rpc'],
  ])('acusa a escrita: %s', (codigo, nome) => {
    const achados = escritasEmArquivoDeCliente(H, `${imp}export const h = () => ${codigo}`)
    expect(achados).toHaveLength(1)
    expect(achados[0]).toContain(`${nome}(`)
  })

  it('não acusa o que só lê, nem a palavra em comentário ou em texto', () => {
    expect(escritasEmArquivoDeCliente(H, `${imp}// update insert rpc(\nexport const h = () => supabase.from('customer_list').select('id').eq('id', 1)\nconst x = 'delete'`)).toEqual([])
  })

  it('a régua 1 acusa um QUINTO arquivo de cliente que importe o client (a igualdade tem oito)', () => {
    const importam = [...IMPORTAM_O_CLIENT, 'entities/customer/api/useOutro.ts'].sort()
    expect(importam).not.toEqual([...IMPORTAM_O_CLIENT].sort())
    expect(IMPORTAM_O_CLIENT).toHaveLength(8)
  })
})
