// Feature `75` · T16 — no app do ateliê, toda ESCRITA passa pela porta (`features/order-actions/api/
// gravarAcao.ts`), e a porta só ENTREGA o client ao dono (`@estrelinha/core/order-actions`, `AD-059`).
// Ampliação de `MAP-37`/`MAA-29` (design §8.2), vizinho de `leituraSoComPapel.test.ts`.
//
// Por que existe: uma escrita escrita à mão no app seria a SEGUNDA escrita do status, do rastreio ou
// do material (o "defeito 01") — e, pior, uma escrita sem a pergunta "quem é você?" depois do zero
// linhas (`MAA-21`). Build, `tsc` e teste de componente passam com ela.
//
// **Pela AST do TypeScript** (lição do guarda da `67`). Três réguas:
//   1. em `apps/mobile-adm/src` (produção), nenhuma chamada de escrita de tabela — `update`, `insert`,
//      `upsert` em QUALQUER receptor, e `delete` cuja cadeia passa por uma chamada `from(` ou nasce no
//      identificador `supabase` —, nenhuma invocação de function (a propriedade `invoke` de
//      `functions`), e nenhuma `rpc(` fora de `lerComPapel.ts`;
//   2. quem importa o client são EXATAMENTE quatro arquivos (os três da `74` e a porta) — a mesma
//      lista que `leituraSoComPapel` compara por igualdade —, e na porta o identificador `supabase`
//      só aparece como VALOR passado (nunca receptor de um acesso por ponto);
//   3. metade positiva: a porta chama `runAppAction(` e `conferirPapel(`.
//
// **O `delete` tem escopo declarado**: `Set`/`Map` do app (`travas`, `termos`, `ouvintes`) usam
// `delete` legitimamente; acusá-lo em todo receptor faria o guarda nascer reprovando quatro vezes. O
// `delete` de tabela sempre passa por `from(` — a forma em que um builder fosse guardado numa variável
// já é recusada por `leituraSoComPapel` (o client só pode ser receptor de `from(` dentro de
// `lerComPapel`) e pela régua 2 aqui.
//
// Âncoras: os arquivos lidos (com a porta), os quatro importadores achados, e as duas chamadas da
// metade positiva achadas na porta.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const LER_COM_PAPEL = 'entities/order/api/lerComPapel.ts'
const PORTA = 'features/order-actions/api/gravarAcao.ts'
const IMPORTAM_O_CLIENT = [
  LER_COM_PAPEL,
  'entities/order/api/useListaDePedidos.ts',
  'entities/order/api/usePedido.ts',
  PORTA,
]
const COMANDOS_DE_TABELA = new Set(['update', 'insert', 'upsert'])

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
    (s) => ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier) && s.moduleSpecifier.text === '@estrelinha/supabase/client',
  )

/** A cadeia do receptor passa por uma chamada `from(` (`x.from(…)…`) ou nasce em `supabase`? */
const cadeiaDeTabela = (receptor: ts.Expression): boolean => {
  let e: ts.Expression = receptor
  for (;;) {
    if (ts.isCallExpression(e)) {
      const c = e.expression
      if (ts.isPropertyAccessExpression(c) && c.name.text === 'from') return true
      if (ts.isIdentifier(c) && c.text === 'from') return true
      e = c
    } else if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isNonNullExpression(e) || ts.isParenthesizedExpression(e)) {
      e = e.expression
    } else {
      return ts.isIdentifier(e) && e.text === 'supabase'
    }
  }
}

/** Régua 1 num arquivo — os sensores chamam a MESMA função. */
const escritasProibidas = (rel: string, texto: string): string[] => {
  const fonte = parse(rel, texto)
  const achados: string[] = []
  visitar(fonte, (n) => {
    if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return
    const acesso = n.expression
    const nome = acesso.name.text
    const linha = fonte.getLineAndCharacterOfPosition(n.getStart()).line + 1
    if (COMANDOS_DE_TABELA.has(nome)) achados.push(`${rel}:${linha} ${nome}`)
    else if (nome === 'delete' && cadeiaDeTabela(acesso.expression)) achados.push(`${rel}:${linha} delete`)
    else if (nome === 'invoke' && ts.isPropertyAccessExpression(acesso.expression) && acesso.expression.name.text === 'functions')
      achados.push(`${rel}:${linha} functions.invoke`)
    else if (nome === 'rpc' && rel !== LER_COM_PAPEL) achados.push(`${rel}:${linha} rpc`)
  })
  return achados
}

/** Régua 2 (segunda metade) — na porta, `supabase` nunca é receptor de um acesso por ponto. */
const clientComoReceptor = (rel: string, texto: string): { referencias: number; receptor: string[] } => {
  const fonte = parse(rel, texto)
  const r = { referencias: 0, receptor: [] as string[] }
  visitar(fonte, (n) => {
    if (!ts.isIdentifier(n) || n.text !== 'supabase' || ts.isImportSpecifier(n.parent)) return
    r.referencias++
    const p = n.parent
    if ((ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === n) {
      r.receptor.push(`${rel}:${fonte.getLineAndCharacterOfPosition(n.getStart()).line + 1}`)
    }
  })
  return r
}

/** As funções chamadas pelo nome (`f(`), para a metade positiva. */
const chamados = (rel: string, texto: string): Set<string> => {
  const fonte = parse(rel, texto)
  const nomes = new Set<string>()
  visitar(fonte, (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) nomes.add(n.expression.text)
  })
  return nomes
}

const lidos = arquivos(SRC).map((caminho) => ({ rel: relative(SRC, caminho).split('\\').join('/'), texto: readFileSync(caminho, 'utf8') }))
const textoDe = (rel: string) => lidos.find((l) => l.rel === rel)!.texto

describe('toda escrita do app passa pela porta (MAA-29, AD-059)', () => {
  it('âncora: o app foi lido, com a porta e os quatro importadores do client', () => {
    expect(lidos.length).toBeGreaterThan(80)
    for (const rel of IMPORTAM_O_CLIENT) expect(lidos.map((l) => l.rel)).toContain(rel)
  })

  it('régua 1: nenhuma escrita de tabela, nenhuma function e nenhuma RPC fora de lerComPapel — no app inteiro', () => {
    expect(lidos.flatMap((l) => escritasProibidas(l.rel, l.texto))).toEqual([])
  })

  it('régua 2: só quatro arquivos importam o client — por igualdade', () => {
    const importam = lidos.filter((l) => importaOClient(parse(l.rel, l.texto))).map((l) => l.rel).sort()
    expect(importam).toEqual([...IMPORTAM_O_CLIENT].sort())
  })

  it('régua 2: na porta, `supabase` só é VALOR passado — nunca receptor', () => {
    const r = clientComoReceptor(PORTA, textoDe(PORTA))
    // Âncora: as duas passagens (`client: supabase` e o primeiro argumento da notificadora).
    expect(r.referencias).toBe(2)
    expect(r.receptor).toEqual([])
  })

  it('régua 3 (metade positiva): a porta chama `runAppAction(` e `conferirPapel(`', () => {
    const nomes = chamados(PORTA, textoDe(PORTA))
    expect(nomes.has('runAppAction')).toBe(true)
    expect(nomes.has('conferirPapel')).toBe(true)
  })
})

describe('sensores — a régua acusa a escrita à mão e não acusa o que não é escrita', () => {
  const ARQ = 'entities/order/api/usePedido.ts'
  const imp = `import { supabase } from '@estrelinha/supabase/client'\n`

  it.each(['update', 'insert', 'upsert'])('acusa `supabase.from(…).%s(` dentro de lerComPapel (a leitura permitida não desculpa)', (cmd) => {
    const codigo = `${imp}export const f = () => lerComPapel(async () => supabase.from('orders').${cmd}({ status: 'shipped' }).eq('id', 'x'))`
    expect(escritasProibidas(ARQ, codigo)).toEqual([`${ARQ}:2 ${cmd}`])
  })

  it('acusa `delete` de tabela e a cadeia quebrada em linhas (LF e CRLF)', () => {
    const linhas = [imp.trim(), `export const f = () => supabase`, `  .from('orders')`, `  .delete()`, `  .eq('id', 'x')`]
    expect(escritasProibidas(ARQ, linhas.join('\n'))).toEqual([`${ARQ}:2 delete`])
    expect(escritasProibidas(ARQ, linhas.join('\r\n'))).toEqual([`${ARQ}:2 delete`])
  })

  it('acusa a function e a RPC fora de lerComPapel, e o `.rpc(` DENTRO de lerComPapel não', () => {
    expect(escritasProibidas(ARQ, `${imp}export const f = () => supabase.functions.invoke('send-notification?action=trigger', {})`)).toEqual([
      `${ARQ}:2 functions.invoke`,
    ])
    expect(escritasProibidas(ARQ, `${imp}export const f = () => supabase.rpc('set_material_status', {})`)).toEqual([`${ARQ}:2 rpc`])
    expect(escritasProibidas(LER_COM_PAPEL, `${imp}const f = () => supabase.rpc('atelie_clock')`)).toEqual([])
  })

  it('acusa o client APELIDADO escrevendo (a régua é o comando, não o nome do receptor)', () => {
    expect(escritasProibidas(ARQ, `const db = supabase\nexport const f = () => db.from('orders').update({})`)).toEqual([`${ARQ}:2 update`])
  })

  it('NÃO acusa o que é comentário — inclusive o glob de dois asteriscos (é AST)', () => {
    // O glob vai num comentário de LINHA: num de bloco, a sequência dele FECHA o comentário — no
    // TypeScript de verdade também, e o resto viraria código.
    const comentario = `// apps/**/x: supabase.from('orders').update({}) seria errado\n/* supabase.rpc('x') */\nexport const n = 1`
    expect(escritasProibidas(ARQ, comentario)).toEqual([])
    expect(escritasProibidas(ARQ, comentario.replace(/\n/g, '\r\n'))).toEqual([])
  })

  it('INVERSO: a leitura `.from(…).select(…)` do hook e o `delete` de Set/Map não são acusados', () => {
    expect(escritasProibidas(ARQ, `${imp}export const f = () => lerComPapel(async () => supabase.from('order_list').select('id').eq('id', 'x'))`)).toEqual([])
    expect(escritasProibidas(ARQ, `const termos = new Map<string, string>()\nexport const f = (k: string) => termos.delete(k)`)).toEqual([])
  })

  it('a régua 2 enxerga o client como receptor na porta, e aceita só a passagem como valor', () => {
    expect(clientComoReceptor(PORTA, `${imp}const x = supabase.from('orders')`).receptor).toEqual([`${PORTA}:2`])
    expect(clientComoReceptor(PORTA, `${imp}const x = supabase['rpc']`).receptor).toEqual([`${PORTA}:2`])
    expect(clientComoReceptor(PORTA, `${imp}const deps = { client: supabase }\nf(supabase)`)).toEqual({ referencias: 2, receptor: [] })
  })

  it('a metade positiva enxerga a ausência', () => {
    expect(chamados(PORTA, `export const g = () => outraCoisa()`).has('runAppAction')).toBe(false)
    expect(chamados(PORTA, `// runAppAction(deps)\nexport const g = 1`).has('runAppAction')).toBe(false)
  })
})
