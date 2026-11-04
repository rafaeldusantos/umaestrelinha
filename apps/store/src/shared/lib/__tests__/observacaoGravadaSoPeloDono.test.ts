import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * A observação do pedido só é gravada pelo dono — `packages/core/src/order-actions/adminNote.ts`.
 *
 * O painel e o app do ateliê gravam a mesma observação. Escrita duas vezes, a regra (aparar, o teto,
 * vazio apaga, quem editou, o efeito conferido pela linha devolvida) divergiria sem nada quebrar — é
 * o "defeito 01". Este guarda lê a AST de toda a produção de `apps/*\/src` e `packages/*\/src` e acusa
 * qualquer `X.from(<a tabela da observação>)` cuja cadeia chegue a uma escrita (`insert`, `update`,
 * `upsert`, `delete`) fora do dono — ou que escape sem `select` nem escrita (quem recebe o builder
 * poderia gravar longe daqui). Ler (`select`) é livre.
 *
 * Fora do escopo, declarado: as edge functions e as RPCs do banco (a conversão da proposta em pedido
 * grava a observação em SQL, dentro de uma transação — é outro dono por construção).
 *
 * **Metade positiva**: o hook do painel CHAMA o dono. Sem ela, apagar a delegação e não gravar nada
 * deixaria a ausência verdadeira e vazia.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O nome da tabela por partes, para este arquivo não ser ele mesmo uma ocorrência literal dela. */
const TABELA = ['order', 'admin', 'notes'].join('_')

const DONO = 'packages/core/src/order-actions/adminNote.ts'
const HOOK_DO_PAINEL = 'apps/backoffice/src/features/order-admin-note/api/useOrderAdminNote.ts'

const ESCRITAS = new Set(['insert', 'update', 'upsert', 'delete'])

interface Arquivo {
  rel: string
  fonte: string
}

const eTeste = (rel: string): boolean =>
  /(?:^|\/)__tests__\//.test(rel) || /\.test\.tsx?$/.test(rel) || /\/src\/test\//.test(rel)

const escopo = (): string[] =>
  ['apps', 'packages'].flatMap(raiz =>
    readdirSync(resolve(ROOT, raiz), { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => `${raiz}/${e.name}/src`)
      .filter(d => {
        try {
          readdirSync(resolve(ROOT, d))
          return true
        } catch {
          return false
        }
      }),
  )

const arquivosDe = (dir: string): Arquivo[] => {
  const saida: Arquivo[] = []
  const andar = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const caminho = join(d, e.name)
      if (e.isDirectory()) {
        if (e.name !== 'node_modules') andar(caminho)
        continue
      }
      if (!/\.tsx?$/.test(e.name) || /\.d\.ts$/.test(e.name)) continue
      saida.push({ rel: relative(ROOT, caminho).split('\\').join('/'), fonte: readFileSync(caminho, 'utf8') })
    }
  }
  andar(resolve(ROOT, dir))
  return saida
}

const ESCOPO = escopo()
const producao = ESCOPO.flatMap(arquivosDe).filter(a => !eTeste(a.rel))

const ast = (a: Arquivo): ts.SourceFile =>
  ts.createSourceFile(a.rel, a.fonte, ts.ScriptTarget.Latest, true, a.rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

const andarAst = (no: ts.Node, visitar: (n: ts.Node) => void): void => {
  visitar(no)
  ts.forEachChild(no, f => andarAst(f, visitar))
}

const literal = (e: ts.Expression | undefined): string | null =>
  e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) ? e.text : null

/** Sobe pela cadeia do builder até `select` (leitura), uma escrita (o comando) ou uma fuga. */
const destino = (inicio: ts.Node): string => {
  let atual: ts.Node = inicio
  for (;;) {
    const p = atual.parent
    if (!p) return 'fuga'
    if ((ts.isAwaitExpression(p) || ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p)) && p.expression === atual) {
      atual = p
      continue
    }
    if (ts.isPropertyAccessExpression(p) && p.expression === atual) {
      const pp = p.parent
      if (!(pp && ts.isCallExpression(pp) && pp.expression === p)) return 'fuga'
      if (ESCRITAS.has(p.name.text)) return p.name.text
      if (p.name.text === 'select') return 'leitura'
      atual = pp
      continue
    }
    return 'fuga'
  }
}

/** Toda escrita (ou fuga) de builder da tabela da observação, `arquivo:linha comando`. */
const acusadas = (lista: Arquivo[]): string[] => {
  const saida: string[] = []
  for (const a of lista) {
    const sf = ast(a)
    andarAst(sf, n => {
      if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression) || n.expression.name.text !== 'from') return
      if (literal(n.arguments[0]) !== TABELA) return
      const d = destino(n)
      if (d !== 'leitura') saida.push(`${a.rel}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1} ${d}`)
    })
  }
  return saida.sort()
}

const sintetico = (fonte: string): Arquivo[] => [{ rel: 'apps/x/src/x.ts', fonte }]

describe('âncoras', () => {
  it('a varredura cobre os apps e os pacotes, e lê centenas de arquivos', () => {
    expect(ESCOPO).toEqual(expect.arrayContaining(['apps/store/src', 'apps/backoffice/src', 'apps/mobile-adm/src', 'packages/core/src']))
    expect(producao.length).toBeGreaterThanOrEqual(500)
  })

  it('o dono é lido, e a régua acha as DUAS escritas dele (upsert e delete)', () => {
    const dono = producao.filter(a => a.rel === DONO)
    expect(dono).toHaveLength(1)
    expect(acusadas(dono).map(s => s.replace(/^.*:\d+ /, ''))).toEqual(['delete', 'upsert'])
  })
})

describe('nenhuma escrita da observação fora do dono', () => {
  it('fora do dono não sobra nada', () => {
    expect(acusadas(producao.filter(a => a.rel !== DONO))).toEqual([])
  })

  it.each([...ESCRITAS])('sensor: `%s` à mão é acusado', comando => {
    expect(acusadas(sintetico(`await supabase.from('${TABELA}').${comando}({}).eq('order_id', id)`))).toEqual([`apps/x/src/x.ts:1 ${comando}`])
  })

  it('sensor: o builder que escapa é acusado como fuga', () => {
    expect(acusadas(sintetico(`export const q = () => supabase.from('${TABELA}')`))).toEqual(['apps/x/src/x.ts:1 fuga'])
  })

  it('inverso: ler (`select`) não é acusado, e outra tabela também não', () => {
    expect(acusadas(sintetico(`await supabase.from('${TABELA}').select('note').eq('order_id', id).maybeSingle()`))).toEqual([])
    expect(acusadas(sintetico(`await supabase.from('order_notes').insert({ note: 'x' })`))).toEqual([])
  })

  it('inverso: o comentário que descreve a forma proibida não é acusado', () => {
    expect(acusadas(sintetico(`// nunca: supabase.from('${TABELA}').upsert(x)\r\nexport const a = 1`))).toEqual([])
  })
})

describe('metade positiva — o painel chama o dono', () => {
  it('o hook da observação no painel chama `writeAdminNote`', () => {
    const hook = producao.find(a => a.rel === HOOK_DO_PAINEL)
    expect(hook, HOOK_DO_PAINEL).toBeDefined()
    const chamados = new Set<string>()
    andarAst(ast(hook!), n => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) chamados.add(n.expression.text)
    })
    expect(chamados.has('writeAdminNote')).toBe(true)
  })
})
