// Feature `74` · T15 — `MAP-37`: no app do ateliê, toda leitura de tabela pelo PostgREST passa por
// `lerComPapel`. A RLS de `orders`/`order_items` devolve à conta SEM papel admin os pedidos DELA como
// cliente, sem erro (probe `03-cliente-sem-papel`); uma leitura fora de `lerComPapel` desenharia essas
// linhas como se fossem a fila da loja, com build, `tsc` e teste de componente verdes.
//
// **Pela AST do TypeScript**, não por regex (a lição do guarda da `67`: régua de uso por regex mede a
// grafia, não a chamada). Três réguas:
//   1. só quatro arquivos de produção importam o client (`@estrelinha/supabase/client`): `lerComPapel.ts`,
//      os dois hooks e, desde a `75`, a porta de escrita — allowlist literal;
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
const LER_COM_PAPEL = 'entities/order/api/lerComPapel.ts'
const HOOKS = ['entities/order/api/useListaDePedidos.ts', 'entities/order/api/usePedido.ts']
// Feature `75` (T16): a porta de ESCRITA (`gravarAcao.ts`) é o quarto importador. Ela não lê tabela
// nenhuma e não usa o client como receptor — só o entrega ao dono da escrita —, e quem mede isso é o
// vizinho `escritaSoPelaPorta.test.ts` (régua 2). A igualdade abaixo continua por igualdade: um quinto
// importador reprova aqui E lá.
const PORTA_DE_ESCRITA = 'features/order-actions/api/gravarAcao.ts'
const IMPORTAM_O_CLIENT = [LER_COM_PAPEL, ...HOOKS, PORTA_DE_ESCRITA]

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

/** O nó está dentro de uma função que é ARGUMENTO de `lerComPapel(`? */
const dentroDeLerComPapel = (no: ts.Node): boolean => {
  for (let p: ts.Node | undefined = no.parent; p; p = p.parent) {
    if ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && p.parent && ehChamadaDe(p.parent, 'lerComPapel')) {
      if ((p.parent as ts.CallExpression).arguments.includes(p as ts.Expression)) return true
    }
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
    if (ehChamadaDe(n, 'lerComPapel')) achado.chamadasLerComPapel++
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

const lidos = arquivos(SRC).map((caminho) => {
  const rel = relative(SRC, caminho).split('\\').join('/')
  return { rel, texto: readFileSync(caminho, 'utf8') }
})

describe('toda leitura do app passa por lerComPapel (MAP-37)', () => {
  it('âncora: o app foi lido, com os quatro arquivos da allowlist', () => {
    expect(lidos.length).toBeGreaterThan(40)
    for (const rel of IMPORTAM_O_CLIENT) expect(lidos.map((l) => l.rel)).toContain(rel)
  })

  it('régua 1: só lerComPapel, os dois hooks e a porta de escrita importam o client — por igualdade', () => {
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

  it('régua 3: lerComPapel.ts não lê tabela — só a RPC', () => {
    const a = medir(LER_COM_PAPEL, lidos.find((l) => l.rel === LER_COM_PAPEL)!.texto, { podeLer: false })
    expect(a.froms).toBe(0)
    expect(a.problemas).toEqual([])
    expect(lidos.find((l) => l.rel === LER_COM_PAPEL)!.texto).toMatch(/supabase\.rpc\('atelie_clock'\)/)
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
