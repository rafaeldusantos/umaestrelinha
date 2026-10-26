import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Feature `75` · `MAA-39`, `MAA-27`, `AD-059` — **o pedido só é gravado pelo dono.**
 *
 * `@estrelinha/core/order-actions` é a única escrita PostgREST de `orders` e `order_status_history`
 * nos apps e nos pacotes: o painel delega a ele (`useAdminOrders`), e o app do ateliê também
 * (`gravarAcao`, `runAppAction`). Escrita duas vezes, a sequência "update → histórico → aviso"
 * divergiria sem nada quebrar — uma cópia sem a conferência do efeito gravaria histórico e avisaria a
 * cliente num `update` que não alterou linha nenhuma. É o "defeito 01".
 *
 * ## A régua lê a AST do TypeScript, não o texto
 *
 * Molde: `marcacaoSoPorAcao.test.ts` (feature `67`), cuja primeira escrita por regex deixava passar
 * dez grafias da mesma escrita. Toda chamada `X.from(arg)` em produção é seguida pela cadeia —
 * atravessando `await`, parênteses, `as`, `!` e o ALIAS do builder (`const q = X.from(…)`, e cada uso
 * de `q` depois) — até o primeiro `select` (leitura) ou a primeira escrita (`update`, `insert`,
 * `upsert`, `delete`). Comentário, string e tipo ficam fora **por construção**. Um builder que escapa
 * sem chegar a nenhum dos dois (devolvido, passado adiante) também é acusado: quem o recebe poderia
 * gravar longe daqui.
 *
 * - Tabela literal (ou `const` com literal no mesmo arquivo) `orders` ou `order_status_history` ⇒ a
 *   escrita é acusada, **uma régua por comando** (`L-033`): oito combinações, cada uma com caso.
 * - Tabela que não resolve para literal ⇒ acusada em QUALQUER arquivo: não há como saber a tabela.
 *
 * ## Allowlist literal de UMA entrada, por DECLARAÇÃO
 *
 * O corpo de `cancelOrder` em `apps/backoffice/src/entities/order/api/useAdminOrders.ts` grava o
 * cancelamento (status, motivo e a linha do histórico) — o app do ateliê não cancela, e trazer o
 * cancelamento para o dono é trabalho de outra feature. A entrada é a FUNÇÃO, não o arquivo: uma
 * escrita nova no mesmo arquivo, fora dela, é acusada (sensor abaixo).
 *
 * ## Metade positiva
 *
 * O painel CHAMA as três escritas do dono e a notificadora dele; o app chama `runAppAction` na porta
 * de escrita (incondicional desde a task `16`: o arquivo TEM de existir). Sem ela, apagar a
 * delegação e voltar a gravar à mão... seria acusado; mas apagar a delegação e não gravar nada
 * deixaria a ausência verdadeira e vazia.
 *
 * ## Fora do escopo — declarado, com o motivo
 *
 * Há outros donos que gravam pedidos POR CONSTRUÇÃO, no servidor, com a chave de serviço (que não
 * passa por RLS nem pela guarda de status): as edge functions em `supabase/functions` (o checkout, o
 * Mercado Pago, o Melhor Envio) e o importador da Nuvemshop em `tools/catalog-import` (que atualiza
 * os pedidos importados pelo PostgREST, rodado à mão). Eles não são consumidores deste dono, e
 * ampliar o escopo a esses diretórios **reprovaria o importador e as functions sem que eles tivessem
 * feito nada errado** — quem quiser ampliar decide outro dono antes.
 *
 * ## O que NÃO é medido
 *
 * - Escrita por `fetch` cru ao PostgREST, sem o client.
 * - Escrita por RPC (`set_material_status` mora no dono; o conjunto de RPCs é do `marcacaoSoPorAcao`).
 * - A gravação de `orders` da loja pelo checkout é do `pedidoComDonoUnico` (e hoje não existe).
 *
 * Mora na suíte da loja porque é aqui que moram os guardas que varrem `apps/**` e `packages/**`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escritos um a um — a régua não pode ser o objeto medido (lição do `brandScan`). */
const ESCOPO = [
  'apps/store/src',
  'apps/backoffice/src',
  'apps/mobile-adm/src',
  'packages/core/src',
  'packages/supabase/src',
  'packages/auth/src',
  'packages/ui/src',
]

const DONO = 'packages/core/src/order-actions/'

const TABELAS = ['orders', 'order_status_history'] as const
const COMANDOS = ['update', 'insert', 'upsert', 'delete'] as const

const PAINEL = 'apps/backoffice/src/entities/order/api/useAdminOrders.ts'
const NOTIFY_DO_PAINEL = 'apps/backoffice/src/entities/order/api/notifyOrder.ts'
const PORTA_DO_APP = 'apps/mobile-adm/src/features/order-actions/api/gravarAcao.ts'

/** A ÚNICA entrada: a função `cancelOrder` do painel, e só as duas escritas dela. LITERAL. */
const ALLOWLIST: Array<{ arquivo: string; funcao: string; escritas: string[] }> = [
  { arquivo: PAINEL, funcao: 'cancelOrder', escritas: ['update orders', 'insert order_status_history'] },
]

interface Arquivo {
  rel: string
  fonte: string
}

const eTeste = (rel: string): boolean =>
  /(?:^|\/)__tests__\//.test(rel) || /\.test\.tsx?$/.test(rel) || /\/src\/test\//.test(rel)

const arquivosDe = (relativo: string): Arquivo[] => {
  const saida: Arquivo[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name === 'node_modules') continue
        andar(caminho)
        continue
      }
      if (!/\.tsx?$/.test(entrada.name) || /\.d\.ts$/.test(entrada.name)) continue
      saida.push({ rel: relative(ROOT, caminho).split('\\').join('/'), fonte: readFileSync(caminho, 'utf8') })
    }
  }
  andar(resolve(ROOT, relativo))
  return saida
}

const todos = ESCOPO.flatMap(arquivosDe)
const producao = todos.filter((a) => !eTeste(a.rel))
const foraDoDono = producao.filter((a) => !a.rel.startsWith(DONO))
const doDono = producao.filter((a) => a.rel.startsWith(DONO))

// ─── AST ──────────────────────────────────────────────────────────────────────────────────────────

const ast = (a: Arquivo): ts.SourceFile =>
  ts.createSourceFile(a.rel, a.fonte, ts.ScriptTarget.Latest, true, a.rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

const andarAst = (no: ts.Node, visitar: (n: ts.Node) => void): void => {
  visitar(no)
  ts.forEachChild(no, (filho) => andarAst(filho, visitar))
}

const ESCRITAS = new Set<string>(COMANDOS)

/** O destino do builder: o comando de escrita, `leitura` ou `fuga`. */
type Destino = string

const envelope = (p: ts.Node, filho: ts.Node): boolean =>
  (ts.isAwaitExpression(p) ||
    ts.isParenthesizedExpression(p) ||
    ts.isAsExpression(p) ||
    ts.isNonNullExpression(p) ||
    ts.isTypeAssertionExpression(p) ||
    ts.isSatisfiesExpression(p)) &&
  p.expression === filho

const ehNomeDeclarado = (n: ts.Identifier): boolean => {
  const p = n.parent
  if (!p) return false
  if (
    (ts.isVariableDeclaration(p) ||
      ts.isParameter(p) ||
      ts.isBindingElement(p) ||
      ts.isPropertyAssignment(p) ||
      ts.isFunctionDeclaration(p) ||
      ts.isPropertyDeclaration(p) ||
      ts.isMethodDeclaration(p)) &&
    (p as { name?: ts.Node }).name === n
  )
    return true
  if (ts.isPropertyAccessExpression(p) && p.name === n) return true
  return ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p)
}

/** Sobe pela cadeia até `select` (leitura), uma escrita (o comando) ou uma fuga. Segue o alias. */
const destinoDe = (inicio: ts.Node, sf: ts.SourceFile, profundidade = 0): Destino[] => {
  if (profundidade > 4) return ['fuga']
  let atual: ts.Node = inicio
  for (;;) {
    const p = atual.parent
    if (!p) return ['fuga']
    if (envelope(p, atual)) {
      atual = p
      continue
    }
    if (ts.isPropertyAccessExpression(p) && p.expression === atual) {
      const metodo = p.name.text
      const pp = p.parent
      if (!(pp && ts.isCallExpression(pp) && pp.expression === p)) return ['fuga']
      if (ESCRITAS.has(metodo)) return [metodo]
      if (metodo === 'select') return ['leitura']
      atual = pp
      continue
    }
    let alvo: string | null = null
    let declaracao: ts.Node | null = null
    if (ts.isVariableDeclaration(p) && p.initializer === atual && ts.isIdentifier(p.name)) {
      alvo = p.name.text
      declaracao = p.name
    } else if (
      ts.isBinaryExpression(p) &&
      p.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      p.right === atual &&
      ts.isIdentifier(p.left)
    ) {
      alvo = p.left.text
      declaracao = p.left
    }
    if (alvo === null) return ['fuga']
    const usos: ts.Identifier[] = []
    andarAst(sf, (n) => {
      if (ts.isIdentifier(n) && n.text === alvo && n !== declaracao && !ehNomeDeclarado(n)) usos.push(n)
    })
    if (usos.length === 0) return ['fuga']
    return usos
      .filter((u) => !(ts.isBinaryExpression(u.parent) && u.parent.left === u))
      .flatMap((u) => destinoDe(u, sf, profundidade + 1))
  }
}

/** `X.from(arg)` de tabela — `Array.from`, `Buffer.from` (maiúscula) e `X.storage.from` não são. */
const ehFromDeTabela = (n: ts.Node): n is ts.CallExpression => {
  if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return false
  if (n.expression.name.text !== 'from') return false
  const objeto = n.expression.expression
  if (ts.isIdentifier(objeto) && /^[A-Z]/.test(objeto.text)) return false
  if (ts.isPropertyAccessExpression(objeto) && objeto.name.text === 'storage') return false
  return true
}

const literal = (e: ts.Expression | undefined): string | null =>
  e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) ? e.text : null

/** O literal, ou o de UMA `const X = '<literal>'` do mesmo arquivo. Qualquer outra coisa é `null`. */
const tabelaDe = (e: ts.Expression | undefined, sf: ts.SourceFile): string | null => {
  const direto = literal(e)
  if (direto !== null || !e) return direto
  let alvo = e
  while (ts.isAsExpression(alvo) || ts.isParenthesizedExpression(alvo) || ts.isSatisfiesExpression(alvo)) alvo = alvo.expression
  if (!ts.isIdentifier(alvo)) return null
  const nome = alvo.text
  const decls: ts.VariableDeclaration[] = []
  andarAst(sf, (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === nome) decls.push(n)
  })
  if (decls.length !== 1) return null
  const d = decls[0]
  if (!ts.isVariableDeclarationList(d.parent) || !(d.parent.flags & ts.NodeFlags.Const)) return null
  let init = d.initializer
  while (init && (ts.isAsExpression(init) || ts.isParenthesizedExpression(init) || ts.isSatisfiesExpression(init)))
    init = init.expression
  return literal(init)
}

/** As funções (por nome de declaração) que envolvem o nó, de dentro para fora. */
const funcoesEnvolventes = (n: ts.Node): string[] => {
  const nomes: string[] = []
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isFunctionDeclaration(p) && p.name) nomes.push(p.name.text)
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name) && p.initializer && (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer)))
      nomes.push(p.name.text)
  }
  return nomes
}

interface Escrita {
  rel: string
  /** `null` quando o argumento não resolve para literal. */
  tabela: string | null
  /** O comando, ou `fuga`. */
  comando: string
  linha: number
  funcoes: string[]
}

/** Toda escrita (ou fuga) de builder, em qualquer tabela. */
const escritas = (lista: Arquivo[]): Escrita[] => {
  const saida: Escrita[] = []
  for (const a of lista) {
    const sf = ast(a)
    andarAst(sf, (n) => {
      if (!ehFromDeTabela(n)) return
      const tabela = tabelaDe(n.arguments[0], sf)
      for (const comando of new Set(destinoDe(n, sf).filter((x) => x !== 'leitura'))) {
        saida.push({
          rel: a.rel,
          tabela,
          comando,
          linha: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
          funcoes: funcoesEnvolventes(n),
        })
      }
    })
  }
  return saida
}

const naAllowlist = (e: Escrita): boolean =>
  ALLOWLIST.some(
    (l) => l.arquivo === e.rel && e.funcoes.includes(l.funcao) && l.escritas.includes(`${e.comando} ${e.tabela}`),
  )

const fmt = (e: Escrita): string => `${e.rel}:${e.linha} ${e.comando} ${e.tabela ?? '<tabela dinâmica>'}`

/** O que o guarda acusa: escrita/fuga em `orders`/`order_status_history`, ou em tabela dinâmica. */
const acusadas = (lista: Arquivo[]): string[] =>
  escritas(lista)
    .filter((e) => e.tabela === null || (TABELAS as readonly string[]).includes(e.tabela))
    .filter((e) => !naAllowlist(e))
    .map(fmt)
    .sort()

/** Os nomes chamados (`nome(` com callee identificador) num arquivo. */
const chamados = (a: Arquivo): Set<string> => {
  const nomes = new Set<string>()
  andarAst(ast(a), (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) nomes.add(n.expression.text)
  })
  return nomes
}

const lido = (rel: string): Arquivo => {
  const a = producao.find((x) => x.rel === rel)
  if (!a) throw new Error(`o guarda não leu ${rel} — o escopo perdeu o arquivo`)
  return a
}

const sintetico = (fonte: string, rel = 'apps/x/src/x.ts'): Arquivo[] => [{ rel, fonte }]

// ─── âncoras ──────────────────────────────────────────────────────────────────────────────────────

describe('âncoras — a varredura enxerga o que mede', () => {
  it('o escopo literal cobre todo `apps/*/src` e `packages/*/src` do disco', () => {
    const doDisco = ['apps', 'packages']
      .flatMap((raiz) =>
        readdirSync(resolve(ROOT, raiz), { withFileTypes: true })
          .filter((e) => e.isDirectory() && existsSync(resolve(ROOT, raiz, e.name, 'src')))
          .map((e) => `${raiz}/${e.name}/src`),
      )
      .sort()
    expect([...ESCOPO].sort()).toEqual(doDisco)
  })

  it('arquivos lidos = os contados do disco por outro caminho, e são centenas', () => {
    const contados = ESCOPO.flatMap((dir) =>
      (readdirSync(resolve(ROOT, dir), { recursive: true }) as string[]).filter(
        (f) => /\.tsx?$/.test(f) && !/\.d\.ts$/.test(f) && !f.split(/[\\/]/).includes('node_modules'),
      ),
    ).length
    expect(todos.length).toBe(contados)
    expect(producao.length).toBeGreaterThanOrEqual(500)
  })

  it('o DONO é lido e a régua acha ≥ 3 escritas dentro dele (update de status, histórico, update do código)', () => {
    expect(doDono.map((a) => a.rel)).toEqual(
      expect.arrayContaining([`${DONO}status.ts`, `${DONO}tracking.ts`, `${DONO}material.ts`, `${DONO}appAction.ts`]),
    )
    const noDono = escritas(doDono).filter((e) => e.tabela !== null && (TABELAS as readonly string[]).includes(e.tabela))
    expect(noDono.map((e) => `${e.rel.slice(DONO.length)} ${e.comando} ${e.tabela}`).sort()).toEqual([
      'status.ts insert order_status_history',
      'status.ts update orders',
      'tracking.ts update orders',
    ])
  })

  it('a entrada da allowlist AINDA grava — as duas escritas de `cancelOrder` são achadas', () => {
    const doCancel = escritas([lido(PAINEL)]).filter((e) => e.funcoes.includes('cancelOrder'))
    expect(doCancel.map((e) => `${e.comando} ${e.tabela}`).sort()).toEqual(['insert order_status_history', 'update orders'])
  })
})

// ─── as réguas ────────────────────────────────────────────────────────────────────────────────────

describe('nenhuma escrita de pedido fora do dono', () => {
  const achadas = acusadas(foraDoDono)

  for (const tabela of TABELAS) {
    for (const comando of COMANDOS) {
      it(`\`${comando}\` em \`${tabela}\` — nenhum, fora do dono e da allowlist`, () => {
        expect(achadas.filter((a) => a.endsWith(` ${comando} ${tabela}`))).toEqual([])
        // O caso próprio da combinação: a mesma forma, num arquivo sintético, É acusada.
        const mutante = sintetico(`await supabase.from('${tabela}').${comando}({ id: 1 })`)
        expect(acusadas(mutante)).toEqual([`apps/x/src/x.ts:1 ${comando} ${tabela}`])
      })
    }
  }

  it('nenhum builder de pedido que escapa sem `select` nem escrita', () => {
    expect(achadas.filter((a) => / fuga /.test(a))).toEqual([])
  })

  it('nenhuma escrita com a tabela numa expressão (não há como saber qual é)', () => {
    expect(achadas.filter((a) => a.endsWith('<tabela dinâmica>'))).toEqual([])
  })

  it('o conjunto inteiro — fora do dono não sobra nada', () => {
    expect(achadas).toEqual([])
  })
})

describe('metade positiva — os consumidores CHAMAM o dono', () => {
  it('o painel chama as três escritas', () => {
    const nomes = chamados(lido(PAINEL))
    for (const n of ['writeOrderStatus', 'writeTrackingCode', 'writeMaterialStatus']) expect(nomes.has(n), n).toBe(true)
  })

  it('a notificadora do painel chama `triggerOrderNotification`', () => {
    expect(chamados(lido(NOTIFY_DO_PAINEL)).has('triggerOrderNotification')).toBe(true)
  })

  it('a porta do app EXISTE e chama `runAppAction`', () => {
    expect(existsSync(resolve(ROOT, PORTA_DO_APP))).toBe(true)
    expect(chamados(lido(PORTA_DO_APP)).has('runAppAction')).toBe(true)
  })
})

// ─── sensores ─────────────────────────────────────────────────────────────────────────────────────

describe('sensores — a régua acusa as grafias da mesma escrita', () => {
  const cadeia = (eol: string) =>
    [`// nota`, `const r = await supabase`, `  .from('orders')`, `  .update({ status: 'shipped' })`, `  .eq('id', id)`].join(eol)

  it('a cadeia quebrada em linhas, com LF', () => {
    expect(acusadas(sintetico(cadeia('\n')))).toEqual(['apps/x/src/x.ts:2 update orders'])
  })

  it('a mesma cadeia com CRLF', () => {
    expect(acusadas(sintetico(cadeia('\r\n')))).toEqual(['apps/x/src/x.ts:2 update orders'])
  })

  it('um comentário com o glob de dois asteriscos não esconde a escrita da linha seguinte', () => {
    const fonte = `/* varre apps/**/src e packages/** */\nawait supabase.from('order_status_history').insert({})`
    expect(acusadas(sintetico(fonte))).toEqual(['apps/x/src/x.ts:2 insert order_status_history'])
  })

  it('a tabela numa `const` com literal', () => {
    const fonte = `const T = 'orders'\nawait supabase.from(T).delete().eq('id', 1)`
    expect(acusadas(sintetico(fonte))).toEqual(['apps/x/src/x.ts:2 delete orders'])
  })

  it('a tabela que não resolve (parâmetro) é acusada como dinâmica', () => {
    const fonte = `export const f = async (t: string) => supabase.from(t).update({})`
    expect(acusadas(sintetico(fonte))).toEqual(['apps/x/src/x.ts:1 update <tabela dinâmica>'])
  })

  it('o alias de import do client', () => {
    const fonte = `import { supabase as db } from '@estrelinha/supabase'\nawait db.from('orders').upsert({ id: 1 })`
    expect(acusadas(sintetico(fonte))).toEqual(['apps/x/src/x.ts:2 upsert orders'])
  })

  it('o builder guardado numa variável e escrito depois', () => {
    const fonte = `const q = supabase.from('orders')\nawait q.update({ status: 'x' })`
    expect(acusadas(sintetico(fonte))).toEqual(['apps/x/src/x.ts:1 update orders'])
  })

  it('o builder que escapa (devolvido) é acusado como fuga', () => {
    const fonte = `export const pedidos = () => supabase.from('orders')`
    expect(acusadas(sintetico(fonte))).toEqual(['apps/x/src/x.ts:1 fuga orders'])
  })

  it('a allowlist é por DECLARAÇÃO: um `update` novo no MESMO arquivo, fora de `cancelOrder`, é acusado', () => {
    const real = lido(PAINEL)
    const ancora = '  const cancelOrder = async'
    if (!real.fonte.includes(ancora)) throw new Error('âncora do sensor não encontrada em useAdminOrders.ts')
    const mutante = real.fonte.replace(
      ancora,
      `  const arquivar = async (id: string) => {\n    await supabase.from('orders').update({ status: 'archived' }).eq('id', id)\n  }\n\n${ancora}`,
    )
    const r = acusadas([{ rel: PAINEL, fonte: mutante }])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatch(/useAdminOrders\.ts:\d+ update orders$/)
  })

  it('…e dentro de `cancelOrder` só as duas escritas autorizadas: um `delete` ali é acusado', () => {
    const real = lido(PAINEL)
    const ancora = "    const { error } = await supabase.from('orders').update({ status: 'cancelled'"
    if (!real.fonte.includes(ancora)) throw new Error('âncora do sensor não encontrada em cancelOrder')
    const mutante = real.fonte.replace(ancora, `    await supabase.from('orders').delete().eq('id', id)\n${ancora}`)
    const r = acusadas([{ rel: PAINEL, fonte: mutante }])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatch(/ delete orders$/)
  })

  it('a mesma função `cancelOrder` em OUTRO arquivo não herda a allowlist', () => {
    const fonte = `const cancelOrder = async () => { await supabase.from('orders').update({ status: 'cancelled' }) }`
    expect(acusadas(sintetico(fonte, 'apps/backoffice/src/outro.ts'))).toEqual(['apps/backoffice/src/outro.ts:1 update orders'])
  })
})

describe('inversos — o que NÃO é a escrita proibida', () => {
  it('ler `orders` (select) não é acusado', () => {
    expect(acusadas(sintetico(`await supabase.from('orders').select('id').eq('status', 'paid')`))).toEqual([])
  })

  it('um `update` de OUTRA tabela entre duas leituras de pedido não é atribuído a `orders`', () => {
    const fonte = [
      `await supabase.from('orders').select('id')`,
      `await supabase.from('customers').update({ phone: null }).eq('id', 1)`,
      `await supabase.from('order_status_history').select('*')`,
    ].join('\n')
    expect(acusadas(sintetico(fonte))).toEqual([])
  })

  it('o comentário que DESCREVE a forma proibida não é acusado (CRLF e LF)', () => {
    const fonte = `// nunca: supabase.from('orders').update(x)\r\n/* nem supabase.from('order_status_history').insert(y) */\nexport const a = 1`
    expect(acusadas(sintetico(fonte))).toEqual([])
  })

  it('`Array.from` e `storage.from` não são tabela', () => {
    const fonte = `Array.from(x).map(String)\nawait supabase.storage.from('orders').upload('a', b)`
    expect(acusadas(sintetico(fonte))).toEqual([])
  })
})
