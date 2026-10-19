import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Feature 67, Success Criterion 5 — **nenhuma sugestão vira marcação sem um toque da Adri.**
 *
 * A spec promete um guarda: *o painel não grava marcação fora de "Aprovar" e de "Salvar"*. O pedido
 * razoável que traria o defeito de volta é um "aplicar sugestões ao abrir a peça": a sugestão vira
 * marcação sem ninguém ver.
 *
 * ## A régua lê a AST do TypeScript, não o texto
 *
 * A rodada 2 da verificação independente achou dez evasões na primeira escrita, que era por regex:
 * tabela numa variável, alias do builder a mais de 300 caracteres da escrita, a vírgula final que o
 * Prettier põe numa chamada quebrada, `import { porta as outra }`, `porta?.(…)`, `porta<T>(…)`, a
 * porta passada por referência (`.then(porta)`), uma porta NOVA num arquivo autorizado, uma RPC, e um
 * escritor em `packages/`. Todas são grafias da mesma escrita. Molde: `wiringResolve.test.ts`.
 * Comentário, string e tipo ficam fora **por construção**.
 *
 * ## O que é medido
 *
 * 1. **Quem escreve na tabela.** Toda chamada `X.from(arg)` em produção (`apps/*` `/src`,
 *    `packages/*` `/src`, `supabase/functions`; testes e dublês fora) é seguida pela cadeia de
 *    chamadas — atravessando `await`, parênteses, `as`, `!`, e o ALIAS (`const q = X.from(…)`, e cada
 *    uso de `q` depois, em qualquer distância) — até o primeiro `select` (leitura) ou a primeira
 *    escrita (`insert`/`upsert`/`update`/`delete`).
 *    - `arg` literal e uma das três tabelas ⇒ escrita só no allowlist `ESCRITORES`; e um builder que
 *      **escapa** sem chegar a `select` nem a escrita (devolvido, passado como argumento, guardado
 *      numa propriedade) também é acusado: quem o recebe poderia escrever longe daqui.
 *    - `arg` NÃO literal (variável, template com `${}`, expressão) ⇒ escrita ou fuga acusada em
 *      QUALQUER arquivo, porque não há como saber a tabela. Allowlist `TABELA_DINAMICA`, hoje vazio.
 * 2. **As portas.** Os `export` de valor dos arquivos de `ARQUIVOS_DE_PORTA` são **colhidos do disco**
 *    e têm de ser IGUAIS a `portas ∪ naoEscrevem` declaradas aqui — export novo sem classificação
 *    reprova. A classificação é MEDIDA: o corpo de cada porta escreve (régua 1) ou chama outra porta;
 *    o de cada `naoEscreve`, nenhuma das duas coisas.
 * 3. **Quem usa a porta.** Qualquer referência de VALOR ao nome da porta conta como uso: chamada,
 *    `?.(`, genérico, passagem por referência, atribuição a outra variável, `{ porta }`, `ns.porta`.
 *    O nome é resolvido pelos aliases de `import { p as y }` e de `export { p as y }` (barril). Só os
 *    chamadores do allowlist literal podem usar.
 * 4. **RPC.** Toda `X.rpc(nome)` em produção tem `nome` literal, e o conjunto é IGUAL a `RPCS`; cada
 *    uma tem `create function` numa migration; e **nenhuma migration** escreve nas três tabelas
 *    (`insert into`/`update`/`delete from`/`merge into`). RPC nova, ou trigger que marque, reprova.
 *
 * Todas têm a **metade positiva** por igualdade: cada entrada de allowlist ainda grava, ainda chama.
 *
 * ## O que NÃO é medido
 *
 * - Uma porta chamada por **acesso computado** (`mod['gravar' + 'Recusas']`): o nome não existe na
 *   fonte. Acesso por literal (`mod['gravarRecusas']`) é medido.
 * - Uma escrita feita por `fetch` cru ao PostgREST, sem o client.
 * - A ordem/condição do uso dentro de um chamador autorizado: o guarda prova QUEM usa a porta, não
 *   que o uso está atrás do clique. Isso é dos testes de componente (`FilterValuesCard.variacoes`,
 *   `SuggestionQueue`).
 *
 * Mora na suíte da loja porque é aqui que moram os guardas que varrem `apps/**`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escritos um a um, e não derivados de constante: a régua não pode ser o objeto medido. */
const ESCOPO = [
  'apps/store/src',
  'apps/backoffice/src',
  'packages/core/src',
  'packages/supabase/src',
  'packages/auth/src',
  'packages/ui/src',
  'supabase/functions',
]

const TABELAS = ['product_filter_values', 'product_option_filter_values', 'filter_suggestion_dismissals'] as const
type Tabela = (typeof TABELAS)[number]

/** Régua 1 — quem pode escrever em cada tabela. LITERAL. */
const ESCRITORES: Record<Tabela, string[]> = {
  product_filter_values: [
    'apps/backoffice/src/entities/filter/api/useValueMarks.ts',
    'apps/backoffice/src/features/product-form/model/persistProduct.ts',
  ],
  product_option_filter_values: [
    'apps/backoffice/src/entities/filter/api/useOptionMarks.ts',
    'apps/backoffice/src/features/product-form/model/persistProduct.ts',
  ],
  filter_suggestion_dismissals: ['apps/backoffice/src/entities/filter/api/useSuggestionDismissals.ts'],
}

/** Régua 1 — quem pode escrever (ou deixar escapar um builder) com a tabela em expressão. Vazio. */
const TABELA_DINAMICA: string[] = []

const APROVAR = 'apps/backoffice/src/features/filter-suggestions/model/aprovar.ts'
const VALUE_MARKS = 'apps/backoffice/src/entities/filter/api/useValueMarks.ts'
const OPTION_MARKS = 'apps/backoffice/src/entities/filter/api/useOptionMarks.ts'
const DISMISSALS = 'apps/backoffice/src/entities/filter/api/useSuggestionDismissals.ts'
const PERSIST = 'apps/backoffice/src/features/product-form/model/persistProduct.ts'

/** Régua 2 — os arquivos cujos exports são colhidos. LITERAL: os quatro escritores e a fila. */
const ARQUIVOS_DE_PORTA = [VALUE_MARKS, OPTION_MARKS, DISMISSALS, PERSIST, APROVAR]

/**
 * Régua 2/3 — cada porta: onde é declarada e quem pode usá-la. LITERAL. O arquivo que declara pode
 * aparecer como usuário quando uma porta delega a outra por dentro (o `unmark` de `useOptionMarks`).
 */
const PORTAS: Record<string, { em: string; usadaPor: string[] }> = {
  // O "Salvar" do produto.
  persistProductRelations: { em: PERSIST, usadaPor: ['apps/backoffice/src/pages/admin/AdminProductFormPage.tsx'] },
  // O "Aprovar N" e o "Recusar N" da fila.
  gravarMarcacoesNaPeca: { em: VALUE_MARKS, usadaPor: [APROVAR] },
  apagarMarcacoesNaPeca: { em: VALUE_MARKS, usadaPor: [APROVAR] },
  gravarMarcacoesPorOpcao: { em: OPTION_MARKS, usadaPor: [APROVAR] },
  aprovarSugestoes: { em: APROVAR, usadaPor: ['apps/backoffice/src/features/filter-suggestions/ui/SuggestionQueue.tsx'] },
  recusarSugestoes: { em: APROVAR, usadaPor: ['apps/backoffice/src/features/filter-suggestions/ui/SuggestionQueue.tsx'] },
  // A marcação em massa da 66 ("Marcar N" e "Remover de N").
  useValueMarks: { em: VALUE_MARKS, usadaPor: ['apps/backoffice/src/pages/admin/AdminFilterValuePage.tsx'] },
  useOptionMarks: { em: OPTION_MARKS, usadaPor: ['apps/backoffice/src/pages/admin/AdminFilterValuePage.tsx'] },
  apagarMarcacoesPorOpcaoDoValor: { em: OPTION_MARKS, usadaPor: [OPTION_MARKS] },
  // A recusa: o "Recusar N" da fila e o "Recusar" do produto.
  gravarRecusas: { em: DISMISSALS, usadaPor: [APROVAR, 'apps/backoffice/src/features/product-form/ui/FilterValuesCard.tsx'] },
}

/** Régua 2 — os exports desses arquivos que NÃO escrevem (leitoras, puras, constantes). LITERAL. */
const NAO_ESCREVEM: Record<string, string[]> = {
  [VALUE_MARKS]: ['lerMarcacoesDoValor'],
  [OPTION_MARKS]: ['OPTION_MARK_CONFLICT', 'lerMarcacoesPorOpcaoDoValor'],
  [DISMISSALS]: [
    'DISMISSAL_COLUMNS',
    'DISMISSAL_CONFLICT',
    'SUGGESTION_DISMISSALS_KEY',
    'invalidarRecusas',
    'lerRecusas',
    'useSuggestionDismissals',
  ],
  [PERSIST]: [
    'TEMP_VARIANT_PREFIX',
    'isPersistFailure',
    'isTempVariantId',
    'planCategoryLinks',
    'planFilterValues',
    'planVariants',
    'tempVariantId',
  ],
  [APROVAR]: [],
}

/**
 * Régua 4 — as RPCs que o código chama. LITERAL. Nenhuma toca as três tabelas, e quem prova isso é a
 * varredura das migrations abaixo, não este comentário.
 */
const RPCS = [
  'account_exists',
  'anonymize_customer',
  'apply_payment_approval',
  'claim_order_notification',
  'customer_order_events',
  'finish_order_notification',
  'get_abandoned_cart',
  'has_role',
  'increment_coupon_usage',
  'mark_cart_recovered',
  'set_kit_showcase',
  'set_material_status',
  'set_material_tracking',
  'track_abandoned_cart',
  'upsert_promotion',
]

interface Arquivo {
  rel: string
  fonte: string
}

/** Teste, dublê e setup podem nomear o que quiserem — o que se mede é o que roda em produção. */
const eTeste = (rel: string): boolean =>
  /(?:^|\/)__tests__\//.test(rel) ||
  /\.test\.tsx?$/.test(rel) ||
  /\/src\/test\//.test(rel) ||
  /^supabase\/functions\/_shared\/testing\//.test(rel)

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
const producao = todos.filter(a => !eTeste(a.rel))

// ─── AST ──────────────────────────────────────────────────────────────────────────────────────────

const cacheAst = new Map<string, ts.SourceFile>()
const ast = (a: Arquivo): ts.SourceFile => {
  const chave = `${a.rel}\0${a.fonte}`
  let sf = cacheAst.get(chave)
  if (!sf) {
    sf = ts.createSourceFile(
      a.rel,
      a.fonte,
      ts.ScriptTarget.Latest,
      true,
      a.rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    cacheAst.set(chave, sf)
  }
  return sf
}

const andarAst = (no: ts.Node, visitar: (n: ts.Node) => void): void => {
  visitar(no)
  ts.forEachChild(no, filho => andarAst(filho, visitar))
}

const ESCRITAS = new Set(['insert', 'upsert', 'update', 'delete'])

type Destino = 'escrita' | 'leitura' | 'fuga'

/** Envelopes que não mudam o valor: `await x`, `(x)`, `x as T`, `x!`, `<T>x`, `x satisfies T`. */
const envelope = (p: ts.Node, filho: ts.Node): boolean =>
  (ts.isAwaitExpression(p) ||
    ts.isParenthesizedExpression(p) ||
    ts.isAsExpression(p) ||
    ts.isNonNullExpression(p) ||
    ts.isTypeAssertionExpression(p) ||
    ts.isSatisfiesExpression(p)) &&
  p.expression === filho

/**
 * Para onde vai o builder que nasce em `inicio`: sobe pela cadeia `.metodo(…)` até o primeiro
 * `select` (leitura) ou a primeira escrita. Se ele é guardado numa variável (declaração ou `=`), segue
 * cada uso dela no arquivo. Qualquer outro destino — devolvido, argumento, propriedade, método
 * passado sem chamar — é `fuga`. Uma fuga basta para acusar; a escrita vence a fuga.
 */
const destinoDe = (inicio: ts.Node, sf: ts.SourceFile, profundidade = 0): Destino => {
  if (profundidade > 4) return 'fuga'
  let atual: ts.Node = inicio
  for (;;) {
    const p = atual.parent
    if (!p) return 'fuga'
    if (envelope(p, atual)) {
      atual = p
      continue
    }
    if (ts.isPropertyAccessExpression(p) && p.expression === atual) {
      const metodo = p.name.text
      const pp = p.parent
      if (!(pp && ts.isCallExpression(pp) && pp.expression === p)) return 'fuga'
      if (ESCRITAS.has(metodo)) return 'escrita'
      if (metodo === 'select') return 'leitura'
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
    if (alvo === null) return 'fuga'
    const usos: ts.Identifier[] = []
    andarAst(sf, n => {
      if (ts.isIdentifier(n) && n.text === alvo && n !== declaracao && !ehNomeDeDeclaracaoOuChave(n)) usos.push(n)
    })
    if (usos.length === 0) return 'fuga'
    const destinos = usos
      .filter(u => !(ts.isBinaryExpression(u.parent) && u.parent.left === u))
      .map(u => destinoDe(u, sf, profundidade + 1))
    if (destinos.includes('escrita')) return 'escrita'
    if (destinos.includes('fuga')) return 'fuga'
    return 'leitura'
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

/**
 * O nome da tabela: o literal, ou o identificador de UMA `const X = '<literal>'` do mesmo arquivo
 * (`useCoupons.ts` escreve `from(TABLE)`). Qualquer outra coisa — `let`, parâmetro, template com
 * `${}`, expressão, nome declarado duas vezes — é `null`: tabela que o guarda não sabe dizer.
 */
const tabelaDe = (e: ts.Expression | undefined, sf: ts.SourceFile): string | null => {
  const direto = literal(e)
  if (direto !== null || !e) return direto
  let alvo = e
  while (ts.isAsExpression(alvo) || ts.isParenthesizedExpression(alvo) || ts.isSatisfiesExpression(alvo)) alvo = alvo.expression
  if (!ts.isIdentifier(alvo)) return null
  const nome = alvo.text
  const decls: ts.VariableDeclaration[] = []
  andarAst(sf, n => {
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

interface UsoDeTabela {
  rel: string
  /** `null` quando o argumento não é literal. */
  tabela: string | null
  destino: Destino
  linha: number
}

const usosDeTabela = (lista: Arquivo[] = producao): UsoDeTabela[] => {
  const saida: UsoDeTabela[] = []
  for (const a of lista) {
    const sf = ast(a)
    andarAst(sf, n => {
      if (!ehFromDeTabela(n)) return
      saida.push({
        rel: a.rel,
        tabela: tabelaDe(n.arguments[0], sf),
        destino: destinoDe(n, sf),
        linha: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
      })
    })
  }
  return saida
}

/** Quem escreve — ou deixa escapar o builder — em `tabela`. */
const escritoresDe = (tabela: Tabela, lista: Arquivo[] = producao): string[] =>
  [
    ...new Set(
      usosDeTabela(lista)
        .filter(u => u.tabela === tabela && u.destino !== 'leitura')
        .map(u => u.rel),
    ),
  ].sort()

/** Escrita ou fuga com a tabela numa expressão — `rel:linha`. */
const dinamicos = (lista: Arquivo[] = producao): string[] =>
  usosDeTabela(lista)
    .filter(u => u.tabela === null && u.destino !== 'leitura')
    .map(u => `${u.rel}:${u.linha}`)
    .sort()

const escreveEm = (fonte: string, tabela: string): boolean =>
  usosDeTabela([{ rel: 'x.ts', fonte }]).some(u => u.tabela === tabela && u.destino !== 'leitura')

// ─── Portas ───────────────────────────────────────────────────────────────────────────────────────

/** Os nomes exportados como VALOR (tipo e interface não contam). `export *` vira `*`. */
const exportsDe = (a: Arquivo): string[] => {
  const nomes: string[] = []
  const tem = (n: ts.Node, k: ts.SyntaxKind) =>
    ts.canHaveModifiers(n) && (ts.getModifiers(n) ?? []).some(m => m.kind === k)
  for (const st of ast(a).statements) {
    const exportado = tem(st, ts.SyntaxKind.ExportKeyword)
    if (exportado && tem(st, ts.SyntaxKind.DefaultKeyword)) nomes.push('default')
    else if (exportado && ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) nomes.push(d.name.text)
        else nomes.push(`<desestruturação:${d.name.getText()}>`)
      }
    } else if (exportado && (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st))) {
      nomes.push(st.name?.text ?? 'default')
    } else if (ts.isExportAssignment(st)) nomes.push('default')
    else if (ts.isExportDeclaration(st) && !st.isTypeOnly) {
      if (!st.exportClause) nomes.push('*')
      else if (ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) if (!el.isTypeOnly) nomes.push(el.name.text)
      } else nomes.push(`* as ${st.exportClause.name.text}`)
    }
  }
  return nomes.sort()
}

/** O nó da declaração exportada `nome` (o inicializador, ou a função). */
const declaracaoDe = (a: Arquivo, nome: string): ts.Node | null => {
  for (const st of ast(a).statements) {
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.name.text === nome) return d.initializer ?? null
      }
    }
    if (ts.isFunctionDeclaration(st) && st.name?.text === nome) return st
  }
  return null
}

/** O identificador é nome de declaração, chave de objeto, nome de atributo JSX ou especificador? */
function ehNomeDeDeclaracaoOuChave(n: ts.Identifier): boolean {
  const p = n.parent
  if (!p) return false
  if (
    (ts.isVariableDeclaration(p) ||
      ts.isFunctionDeclaration(p) ||
      ts.isParameter(p) ||
      ts.isBindingElement(p) ||
      ts.isPropertyAssignment(p) ||
      ts.isPropertyDeclaration(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isPropertySignature(p) ||
      ts.isMethodSignature(p) ||
      ts.isClassDeclaration(p) ||
      ts.isInterfaceDeclaration(p) ||
      ts.isTypeAliasDeclaration(p) ||
      ts.isEnumMember(p) ||
      ts.isJsxAttribute(p)) &&
    (p as { name?: ts.Node }).name === n
  )
    return true
  if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p)) return true
  return false
}

/** Está numa posição de TIPO (`typeof porta` numa anotação, referência de tipo)? */
const emTipo = (n: ts.Node): boolean => {
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isTypeNode(p)) return true
    if (ts.isExpression(p) || ts.isStatement(p)) return false
  }
  return false
}

/**
 * Os nomes que, em `a`, significam a porta: o próprio nome, e os aliases de `import { porta as y }`
 * deste arquivo e de `export { porta as y }` de qualquer arquivo (o barril).
 */
const aliasesGlobais = (lista: Arquivo[]): Map<string, string> => {
  const mapa = new Map<string, string>()
  for (let volta = 0; volta < 3; volta++) {
    for (const a of lista) {
      andarAst(ast(a), n => {
        if (!ts.isExportSpecifier(n) || !n.propertyName) return
        const origem = n.propertyName.text
        const porta = PORTAS[origem] ? origem : mapa.get(origem)
        if (porta) mapa.set(n.name.text, porta)
      })
    }
  }
  return mapa
}

const nomesDaPorta = (a: Arquivo, porta: string, globais: Map<string, string>): Set<string> => {
  const nomes = new Set([porta, ...[...globais].filter(([, p]) => p === porta).map(([alias]) => alias)])
  andarAst(ast(a), n => {
    if (ts.isImportSpecifier(n) && n.propertyName && nomes.has(n.propertyName.text)) nomes.add(n.name.text)
  })
  return nomes
}

/** Quantas referências de VALOR à porta o nó contém (fora a própria declaração). */
const usosDaPortaEm = (raiz: ts.Node, nomes: Set<string>): number => {
  let usos = 0
  andarAst(raiz, n => {
    if (ts.isIdentifier(n) && nomes.has(n.text)) {
      const p = n.parent
      if (ehNomeDeDeclaracaoOuChave(n) || emTipo(n)) return
      // `obj.porta` — conta (namespace import, `await import(…)`); `porta.algo`, também.
      if (p && ts.isPropertyAccessExpression(p) && p.name === n && p.expression.kind === ts.SyntaxKind.ThisKeyword) return
      usos++
      return
    }
    if (ts.isElementAccessExpression(n) && literal(n.argumentExpression) && nomes.has(literal(n.argumentExpression)!)) usos++
  })
  return usos
}

const usuariosDe = (porta: string, lista: Arquivo[] = producao): string[] => {
  const globais = aliasesGlobais(lista)
  return lista
    .filter(a => usosDaPortaEm(ast(a), nomesDaPorta(a, porta, globais)) > 0)
    .map(a => a.rel)
    .sort()
}

/** O corpo `no` escreve — uma escrita/fuga de tabela protegida ou dinâmica, ou o uso de uma porta? */
const corpoEscreve = (a: Arquivo, no: ts.Node, excluir: string): boolean => {
  const sf = ast(a)
  let escreve = false
  andarAst(no, n => {
    if (!ehFromDeTabela(n)) return
    const tabela = tabelaDe(n.arguments[0], sf)
    if (tabela !== null && !(TABELAS as readonly string[]).includes(tabela)) return
    if (destinoDe(n, sf) !== 'leitura') escreve = true
  })
  const globais = aliasesGlobais(producao)
  for (const porta of Object.keys(PORTAS)) {
    if (porta === excluir) continue
    if (usosDaPortaEm(no, nomesDaPorta(a, porta, globais)) > 0) escreve = true
  }
  return escreve
}

// ─── RPC e migrations ─────────────────────────────────────────────────────────────────────────────

const rpcsDe = (lista: Arquivo[] = producao): string[] => {
  const nomes = new Set<string>()
  for (const a of lista) {
    andarAst(ast(a), n => {
      if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return
      if (n.expression.name.text !== 'rpc') return
      nomes.add(literal(n.arguments[0]) ?? `<dinâmica em ${a.rel}>`)
    })
  }
  return [...nomes].sort()
}

const MIGRATIONS = resolve(ROOT, 'supabase/migrations')
const migrations = readdirSync(MIGRATIONS)
  .filter(n => n.endsWith('.sql'))
  .map(n => ({ nome: n, sql: readFileSync(join(MIGRATIONS, n), 'utf8') }))

const semComentarioSql = (sql: string): string => sql.replace(/--[^\n\r]*|\/\*[\s\S]*?\*\//g, ' ')

const ESCRITA_SQL = new RegExp(
  String.raw`\b(?:insert\s+into|update|delete\s+from|merge\s+into)\s+(?:only\s+)?(?:"?public"?\.)?"?(${TABELAS.join('|')})"?(?![\w])`,
  'i',
)

const migrationsQueEscrevem = (lista = migrations): string[] =>
  lista.filter(m => ESCRITA_SQL.test(semComentarioSql(m.sql))).map(m => m.nome)

const rpcDefinida = (nome: string, lista = migrations): boolean =>
  lista.some(m =>
    new RegExp(String.raw`create\s+(?:or\s+replace\s+)?function\s+(?:"?public"?\.)?"?${nome}"?\s*\(`, 'i').test(
      semComentarioSql(m.sql),
    ),
  )

// ─── Asserções ────────────────────────────────────────────────────────────────────────────────────

describe('SC5 — o painel só grava marcação por ação explícita (feature 67)', () => {
  it('a varredura leu as pontas — âncora de arquivos (um nomeado de cada ponta, L-035)', () => {
    expect(producao.length).toBeGreaterThanOrEqual(600)
    expect(producao.map(a => a.rel)).toEqual(
      expect.arrayContaining([
        'apps/store/src/entities/product/lib/mapProduct.ts',
        'apps/backoffice/src/features/product-form/model/persistProduct.ts',
        'packages/core/src/hooks/useStoreSettings.ts',
        'packages/core/src/hooks/usePromotions.ts',
        'packages/supabase/src/client.ts',
        'supabase/functions/checkout/index.ts',
      ]),
    )
  })

  it('a AST foi lida — âncora de `from(...)` de tabela e de RPC no código inteiro', () => {
    // Um parser quebrado devolveria zero chamadas, e toda asserção de ausência abaixo aprovaria.
    expect(usosDeTabela().length).toBeGreaterThanOrEqual(150)
    expect(rpcsDe().length).toBeGreaterThanOrEqual(5)
  })

  it('arquivo de teste NÃO é varrido — e seria acusado se fosse', () => {
    const rels = producao.map(a => a.rel)
    expect(rels.some(eTeste)).toBe(false)
    expect(rels).not.toContain('apps/backoffice/src/test/dubleSupabase.ts')
    expect(rels).not.toContain('apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts')
    // O inverso que dá sentido à exclusão: o teste da fila USA a porta em código (não em string),
    // está em `todos`, e a régua o acusaria. A exclusão é o filtro — não sorte.
    const TESTE_DA_FILA = 'apps/backoffice/src/features/filter-suggestions/model/__tests__/aprovar.test.ts'
    const testeDaFila = todos.find(a => a.rel === TESTE_DA_FILA)
    expect(testeDaFila).toBeDefined()
    expect(usuariosDe('aprovarSugestoes', [testeDaFila!])).toEqual([TESTE_DA_FILA])
  })

  it.each(TABELAS)('alguém ainda LÊ `%s` pelo client — âncora de ocorrência', tabela => {
    expect(usosDeTabela().filter(u => u.tabela === tabela && u.destino === 'leitura').length).toBeGreaterThanOrEqual(1)
  })

  it.each(TABELAS)('`%s`: escritores = allowlist, por igualdade (nenhum a mais, nenhum a menos)', tabela => {
    expect(escritoresDe(tabela)).toEqual([...ESCRITORES[tabela]].sort())
  })

  it('tabela em expressão: nenhuma escrita nem fuga fora de `TABELA_DINAMICA` (hoje vazio)', () => {
    expect(dinamicos().filter(r => !TABELA_DINAMICA.includes(r.split(':')[0]))).toEqual([])
  })

  it.each(ARQUIVOS_DE_PORTA)('exports de `%s` colhidos do disco = portas ∪ naoEscrevem', rel => {
    const arquivo = producao.find(a => a.rel === rel)
    expect(arquivo, rel).toBeDefined()
    const declarados = [
      ...Object.entries(PORTAS)
        .filter(([, p]) => p.em === rel)
        .map(([nome]) => nome),
      ...NAO_ESCREVEM[rel],
    ].sort()
    expect(exportsDe(arquivo!)).toEqual(declarados)
  })

  it.each(Object.keys(PORTAS))('a porta `%s` escreve de fato — o corpo grava ou usa outra porta', porta => {
    const arquivo = producao.find(a => a.rel === PORTAS[porta].em)!
    const corpo = declaracaoDe(arquivo, porta)
    expect(corpo, porta).not.toBeNull()
    expect(corpoEscreve(arquivo, corpo!, porta)).toBe(true)
  })

  it.each(Object.entries(NAO_ESCREVEM).flatMap(([rel, nomes]) => nomes.map(n => [n, rel])))(
    '`%s` NÃO escreve — nem tabela protegida, nem porta (%s)',
    (nome, rel) => {
      const arquivo = producao.find(a => a.rel === rel)!
      const corpo = declaracaoDe(arquivo, nome)
      expect(corpo, nome).not.toBeNull()
      expect(corpoEscreve(arquivo, corpo!, nome)).toBe(false)
    },
  )

  it.each(Object.keys(PORTAS))('a porta `%s`: usuários = allowlist, por igualdade', porta => {
    expect(usuariosDe(porta)).toEqual([...PORTAS[porta].usadaPor].sort())
  })

  it('RPC: o conjunto chamado em produção = `RPCS`, por igualdade, e todo nome é literal', () => {
    expect(rpcsDe()).toEqual([...RPCS].sort())
  })

  it.each(RPCS)('RPC `%s` tem `create function` numa migration', nome => {
    expect(rpcDefinida(nome)).toBe(true)
  })

  it('nenhuma migration escreve nas três tabelas — nem RPC, nem trigger (âncora: 3 de 3 criadas)', () => {
    expect(migrationsQueEscrevem()).toEqual([])
    for (const t of TABELAS) {
      expect(
        migrations.some(m => new RegExp(String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?${t}\b`, 'i').test(m.sql)),
        t,
      ).toBe(true)
    }
  })
})

describe('SC5 — sensores da régua (chamam os colhedores reais)', () => {
  const SINT = 'apps/backoffice/src/features/x/Sintetico.tsx'
  const um = (fonte: string, rel = SINT): Arquivo[] => [{ rel, fonte }]
  const T = 'product_filter_values'

  it('escrita: compacta, quebrada em linhas, com vírgula final do Prettier, nas quatro operações', () => {
    expect(escreveEm(`supabase.from('product_filter_values').upsert(linhas)`, T)).toBe(true)
    expect(escreveEm(`client.from("product_option_filter_values").insert(x)`, 'product_option_filter_values')).toBe(true)
    expect(
      escreveEm(`await supabase\n  .from('product_option_filter_values')\n  .delete()\n  .eq('value_id', v)`, 'product_option_filter_values'),
    ).toBe(true)
    expect(escreveEm(`await supabase\n  .from(\`filter_suggestion_dismissals\`)\n  .update({ a: 1 })`, 'filter_suggestion_dismissals')).toBe(
      true,
    )
    expect(escreveEm(`await supabase\n  .from(\n    'product_filter_values',\n  )\n  .upsert([])`, T)).toBe(true)
    expect(escreveEm(`await (supabase.from('product_filter_values') as any)!.eq('a', 1).delete()`, T)).toBe(true)
  })

  it('escrita pelo ALIAS do builder, a qualquer distância, e por reatribuição', () => {
    const longe = `const q = supabase.from('product_filter_values')\n${'const pad = 1\n'.repeat(200)}await q.delete().eq('a', 1)`
    expect(escreveEm(longe, T)).toBe(true)
    expect(escreveEm(`let q; q = supabase.from('product_filter_values'); q.upsert([])`, T)).toBe(true)
    expect(escreveEm(`const q = supabase.from('product_filter_values'); const r = q; r.insert([])`, T)).toBe(true)
  })

  it('fuga: o builder devolvido, passado como argumento ou guardado em propriedade é acusado', () => {
    expect(escreveEm(`const t = () => supabase.from('product_filter_values')`, T)).toBe(true)
    expect(escreveEm(`usar(supabase.from('product_filter_values'))`, T)).toBe(true)
    expect(escreveEm(`const o = { q: supabase.from('product_filter_values') }`, T)).toBe(true)
    expect(escreveEm(`const f = supabase.from('product_filter_values').upsert`, T)).toBe(true)
  })

  it('tabela em expressão: escrita e fuga acusadas em qualquer arquivo; leitura não', () => {
    expect(dinamicos(um(`await supabase.from(T).upsert([])`))).toEqual([`${SINT}:1`])
    expect(dinamicos(um('await supabase.from(`product_${x}`).delete()'))).toEqual([`${SINT}:1`])
    expect(dinamicos(um(`const tabela = (n: string) => supabase.from(n)`))).toEqual([`${SINT}:1`])
    expect(dinamicos(um(`await supabase.from(nome).select('id')`))).toEqual([])
  })

  it('um arquivo sintético fora do allowlist que escreve é listado', () => {
    expect(escritoresDe(T, um(`await supabase.from('product_filter_values').upsert(r)`))).toEqual([SINT])
  })

  it('inverso — LER não é acusado, nem lendo por alias', () => {
    expect(escreveEm(`supabase.from('product_filter_values').select('product_id', { count: 'exact', head: true }).eq('v', v)`, T)).toBe(
      false,
    )
    expect(escreveEm(`const base = supabase.from('product_filter_values').select('a')\nconst r = await base.eq('v', 1)`, T)).toBe(false)
  })

  it('limite conservador: builder em `let` estreitado por reatribuição (`q = q.select()`) é tratado como fuga', () => {
    // Sem análise de fluxo, o `q.eq()` depois da reatribuição não sabe que `q` já é leitura. O erro
    // vai para o lado que ACUSA, nunca para o que aprova; nenhum arquivo de hoje tem essa forma.
    expect(escreveEm(`let q = supabase.from('product_filter_values')\nq = q.select('a')\nawait q.eq('v', 1)`, T)).toBe(true)
  })

  it('tabela por `const` do mesmo arquivo é resolvida — e a protegida por `const` é acusada (V02)', () => {
    expect(escritoresDe(T, um(`const __T = 'product_filter_values'\nawait supabase.from(__T).upsert([])`))).toEqual([SINT])
    expect(dinamicos(um(`const TABLE = 'coupons'\nawait supabase.from(TABLE).insert(x)`))).toEqual([])
    expect(dinamicos(um(`let T = 'coupons'\nawait supabase.from(T).insert(x)`))).toEqual([`${SINT}:2`])
  })

  it('inverso — escrita em OUTRA tabela não é atribuída; `Array.from` e `storage.from` não são tabela', () => {
    const fonte = `
      const { data } = await supabase.from('product_filter_values').select('value_id')
      await supabase.from('products').update({ name: 'x' }).eq('id', id)
      Array.from(conjunto).forEach(x => x)
      await supabase.storage.from(bucket).update(caminho, arquivo)
    `
    expect(escreveEm(fonte, T)).toBe(false)
    expect(dinamicos(um(fonte))).toEqual([])
    expect(escreveEm(`supabase.from('product_option_filter_values').upsert(r)`, T)).toBe(false)
  })

  it('comentário e string não são uso (CRLF, LF e o glob de dois asteriscos, BL-027)', () => {
    const GLOB = 'apps/' + '*'.repeat(2)
    expect(escreveEm(`// antes: supabase.from('product_filter_values').upsert(x)\nconst a = 1`, T)).toBe(false)
    expect(escreveEm(`/* from('product_filter_values').delete() */\r\nconst a = 1`, T)).toBe(false)
    expect(escreveEm(`const s = "supabase.from('product_filter_values').upsert(x)"`, T)).toBe(false)
    expect(escreveEm(`// nota em CRLF\r\nsupabase.from('product_filter_values').upsert(r)`, T)).toBe(true)
    expect(escreveEm(`// a varredura cobre ${GLOB}, e este glob era a armadilha\nsupabase.from('product_filter_values').upsert(r)`, T)).toBe(true)
  })

  it('exports colhidos: função, const, export {…}, default, `export *`; tipo não conta', () => {
    const fonte = `
      export const a = () => 1
      export async function b() {}
      export const C = 'x'
      const d = 1; const e = 2
      export { d, e as f }
      export * from './outro'
      export default 3
      export interface I { x: number }
      export type U = string
    `
    expect(exportsDe({ rel: 'x.ts', fonte })).toEqual(['*', 'C', 'a', 'b', 'd', 'default', 'f'])
  })

  it('a porta: chamada, `?.(`, genérico, referência, alias de import e de barril, `ns.porta` contam', () => {
    const P = 'gravarMarcacoesNaPeca'
    const casos = [
      `import { gravarMarcacoesNaPeca } from '@/entities/filter'\nuseEffect(() => { void gravarMarcacoesNaPeca(s) }, [])`,
      `import { gravarMarcacoesNaPeca } from '@/entities/filter'\nawait gravarMarcacoesNaPeca?.([])`,
      `import { gravarMarcacoesNaPeca } from '@/entities/filter'\nawait gravarMarcacoesNaPeca<unknown>([])`,
      `import { gravarMarcacoesNaPeca } from '@/entities/filter'\nPromise.resolve([]).then(gravarMarcacoesNaPeca)`,
      `import { gravarMarcacoesNaPeca as g } from '@/entities/filter'\nawait g([])`,
      `import { gravarMarcacoesNaPeca } from '@/entities/filter'\nconst g = gravarMarcacoesNaPeca`,
      `import { gravarMarcacoesNaPeca } from '@/entities/filter'\nusar({ gravarMarcacoesNaPeca })`,
      `import * as f from '@/entities/filter'\nawait f.gravarMarcacoesNaPeca([])`,
      `const m = await import('@/entities/filter')\nawait m['gravarMarcacoesNaPeca']([])`,
    ]
    for (const fonte of casos) expect(usuariosDe(P, um(fonte)), fonte).toEqual([SINT])
    // Alias pelo barril: o barril re-exporta com outro nome, e quem importa o alias é acusado.
    const barril = { rel: 'apps/backoffice/src/entities/x/index.ts', fonte: `export { gravarMarcacoesNaPeca as marcar } from './api'` }
    const tela = { rel: SINT, fonte: `import { marcar } from '@/entities/x'\nawait marcar([])` }
    expect(usuariosDe(P, [barril, tela])).toEqual([SINT])
  })

  it('a porta — inverso: declaração, import sem uso, re-export, chave, tipo e comentário não contam', () => {
    const P = 'gravarRecusas'
    const casos = [
      `export const gravarRecusas = async (r) => null`,
      `import { gravarRecusas } from '@/entities/filter'`,
      `export { gravarRecusas } from './api/useSuggestionDismissals'`,
      `const o = { gravarRecusas: 1 }`,
      `type F = typeof gravarRecusas`,
      `// gravarRecusas(x) era chamado aqui\nconst a = 1`,
      `gravarRecusasEmLote(x)`,
      `<Botao gravarRecusas={x} />`,
      `this.gravarRecusas(x)`,
    ]
    for (const fonte of casos) expect(usuariosDe(P, um(fonte)), fonte).toEqual([])
  })

  it('classificação medida: um export que escreve é porta; um que só lê não é', () => {
    const arquivo = {
      rel: 'x.ts',
      fonte: `
        export const marcarTudo = async () => { await supabase.from('product_filter_values').upsert([]) }
        export const delegar = async () => { await gravarRecusas([]) }
        export const ler = async () => supabase.from('product_filter_values').select('a')
      `,
    }
    expect(corpoEscreve(arquivo, declaracaoDe(arquivo, 'marcarTudo')!, 'marcarTudo')).toBe(true)
    expect(corpoEscreve(arquivo, declaracaoDe(arquivo, 'delegar')!, 'delegar')).toBe(true)
    expect(corpoEscreve(arquivo, declaracaoDe(arquivo, 'ler')!, 'ler')).toBe(false)
  })

  it('RPC: nome dinâmico é acusado; a varredura de migration pega escrita e ignora comentário', () => {
    expect(rpcsDe(um(`await supabase.rpc(nome, {})`))).toEqual([`<dinâmica em ${SINT}>`])
    expect(rpcsDe(um(`await supabase.rpc('marcar_filtros', { ids: [] })`))).toEqual(['marcar_filtros'])
    expect(rpcDefinida('marcar_filtros')).toBe(false)
    const m = (sql: string) => migrationsQueEscrevem([{ nome: 'm.sql', sql }])
    expect(m(`create function x() as $$ insert into public.product_filter_values values (1) $$`)).toEqual(['m.sql'])
    expect(m(`update product_option_filter_values set a = 1`)).toEqual(['m.sql'])
    expect(m(`DELETE FROM "public"."filter_suggestion_dismissals"`)).toEqual(['m.sql'])
    expect(m(`-- insert into public.product_filter_values\nselect 1`)).toEqual([])
    expect(m(`update public.product_filter_values_x set a = 1`)).toEqual([])
    expect(m(`select * from public.product_filter_values`)).toEqual([])
  })
})
