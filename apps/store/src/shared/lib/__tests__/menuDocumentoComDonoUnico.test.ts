import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * **O menu tem UM dono desde a feature 86 (`AD-068`): o documento de `store_settings.menu`.**
 *
 * Até a 86 o menu era deduzido de três colunas de `categories` (a curadoria por dispositivo e os
 * banners do painel) e da ordem da árvore. Agora a dona monta um documento (`{ version: 2, items }`)
 * e a loja desenha o documento. As colunas continuam no banco — é delas que `legacyMenuDocument`
 * monta o menu de ANTES da primeira gravação —, e é exatamente por continuarem lá que este guarda
 * existe: nada quebraria se uma tela voltasse a GRAVÁ-LAS. O build passa, o `tsc` passa, o teste
 * de componente passa, e a dona mexe numa fonte que a loja já não lê.
 *
 * Quatro réguas, uma por pergunta (`L-033`):
 *
 * 1. **Nenhum literal de objeto com uma das três colunas como chave** em produção de `apps/**` e das
 *    edge functions — é a forma que toda gravação tem. Exceção de UM, nomeada e com a metade
 *    positiva: o mapeador de LEITURA da loja (`useCategories.ts`), que copia a linha do banco.
 * 2. **Nenhuma chamada de escrita** (`.update(`, `.insert(`, `.upsert(` e as portas de escrita de
 *    categoria do painel) cujo argumento nomeie uma das três colunas — em `apps/**`, nas functions e
 *    em `packages/*\/src`. Zero exceção.
 * 3. **O valor cru do menu só é interpretado por `parseMenuDocument`**: os arquivos que tocam a linha
 *    (`settings.menu` ou a chave `menu` de `store_settings`) são exatamente dois — a leitura da loja
 *    e a porta do painel — e os dois chamam o dono. Nenhum arquivo de `apps/**` compara `version`.
 * 4. **A tela do menu não escreve em `categories`**: nos arquivos dela (`AdminMenuPage.tsx` e
 *    `features/store-menu/**`) a única tabela é `store_settings`, e nenhuma porta de escrita de
 *    categoria é nomeada.
 *
 * ÂNCORA DUPLA em cada régua: a varredura prova que leu arquivos **e** que a régua encontra a forma
 * legítima que deve encontrar. A régua nunca é o objeto medido: escopo e exceções estão escritos
 * literalmente aqui.
 *
 * `packages/*\/src` entra só na régua 2. Na 1 ele seria ruído: `core/menu` e `@estrelinha/supabase`
 * DECLARAM as colunas em tipos (chave seguida de dois-pontos), e `core/menu` é puro — o
 * `purity.test.ts` dele recusa o client do Supabase, então ele não grava nada por construção.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git', '.server'])
const EXTENSOES = ['.ts', '.tsx']

const listar = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return listar(full)
    return entry.isFile() && EXTENSOES.some((ext) => entry.name.endsWith(ext)) ? [full] : []
  })

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') ||
  rel.includes('/test/') ||
  rel.endsWith('.test.ts') ||
  rel.endsWith('.test.tsx')

/**
 * Remove comentários preservando as quebras de linha.
 *
 * CRLF normalizado primeiro (em JavaScript `.` não casa `\r`), e linha e bloco na MESMA varredura —
 * duas passadas têm o ponto cego do glob de dois asteriscos dentro de um comentário de linha, que
 * abre um "bloco" aos olhos da segunda e apaga código (`BL-027`). Os sensores abaixo provam os três.
 */
const semComentarios = (fonte: string): string =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n]/g, ' '))

interface Arquivo {
  rel: string
  /** O texto sem comentário, com as quebras preservadas. */
  texto: string
}

const ler = (escopo: string[]): Arquivo[] =>
  escopo
    .flatMap((d) => listar(join(ROOT, d)))
    .map((caminho) => ({
      rel: relative(ROOT, caminho).split('\\').join('/'),
      texto: semComentarios(readFileSync(caminho, 'utf8')),
    }))

const PACOTES = readdirSync(join(ROOT, 'packages'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => `packages/${e.name}/src`)

const varridosApps = ler(['apps', 'supabase/functions'])
const varridosComPacotes = [...varridosApps, ...ler(PACOTES)]

const producao = varridosApps.filter((a) => !eTeste(a.rel))
const producaoComPacotes = varridosComPacotes.filter((a) => !eTeste(a.rel))

interface Ocorrencia {
  arquivo: string
  linha: number
  trecho: string
}

const linhaDe = (texto: string, indice: number) => texto.slice(0, indice).split('\n').length

const fmt = (o: Ocorrencia[]) => o.map((x) => `${x.arquivo}:${x.linha} — ${x.trecho}`)

// ───────────────────────────────────────────────────────────────────────────
// As réguas, escritas como PREDICADO — asserção e sensor chamam a mesma função
// ───────────────────────────────────────────────────────────────────────────

const COLUNA = /\bmenu_(?:desktop|mobile|banners)\b/

/**
 * Régua 1 — a coluna como CHAVE de objeto: `menu_x:`, `'menu_x':`, `menu_x?:` (tipo) e a forma
 * abreviada `{ menu_x }` / `, menu_x,`. O caractere antes exige início, espaço, `{`, `,` ou `(` —
 * o acesso `row.menu_x` (leitura) começa por ponto e não casa.
 */
const CHAVE =
  /(?:^|[\s{,(])['"]?menu_(?:desktop|mobile|banners)['"]?\s*\??:|[{,]\s*menu_(?:desktop|mobile|banners)\s*(?=[,}])/gm

const chavesDaColuna = (alvo: Arquivo[]): Ocorrencia[] =>
  alvo.flatMap(({ rel, texto }) =>
    [...texto.matchAll(CHAVE)].map((m) => ({
      arquivo: rel,
      linha: linhaDe(texto, m.index ?? 0),
      trecho: m[0].trim(),
    })),
  )

/** O argumento de uma chamada, com parênteses balanceados (o texto já está sem comentário). */
const argumento = (texto: string, abre: number): string => {
  let profundidade = 0
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '(') profundidade++
    else if (texto[i] === ')') {
      profundidade--
      if (profundidade === 0) return texto.slice(abre + 1, i)
    }
  }
  return texto.slice(abre + 1)
}

/** As escritas do PostgREST e as portas de escrita de categoria do painel (`useAdminCategories`). */
const ESCRITA =
  /\.(?:update|insert|upsert)\s*\(|\b(?:updateCategory|updateCategoriesBatch|createCategory|moveCategories)\s*\(/g

interface Chamada {
  arquivo: string
  linha: number
  arg: string
}

const chamadasDeEscrita = (alvo: Arquivo[]): Chamada[] =>
  alvo.flatMap(({ rel, texto }) =>
    [...texto.matchAll(ESCRITA)].map((m) => {
      const abre = (m.index ?? 0) + m[0].lastIndexOf('(')
      return { arquivo: rel, linha: linhaDe(texto, m.index ?? 0), arg: argumento(texto, abre) }
    }),
  )

/** Régua 2 — uma escrita que nomeia a coluna no argumento. */
const escritasDaColuna = (alvo: Arquivo[]): Ocorrencia[] =>
  chamadasDeEscrita(alvo)
    .filter((c) => COLUNA.test(c.arg))
    .map((c) => ({ arquivo: c.arquivo, linha: c.linha, trecho: c.arg.replace(/\s+/g, ' ').trim() }))

/** Régua 3 — quem toca a linha crua do menu. */
const TOCA_A_LINHA =
  /\bsettings\s*\??\.\s*menu\b|\bSTORE_MENU_KEY\b|\.eq\(\s*['"]key['"]\s*,\s*['"]menu['"]\s*\)/
const COMPARA_VERSAO = /\bversion\s*(?:===|!==|==|!=)|(?:===|!==|==|!=)\s*[\w.?]*\bversion\b/

const leitoresDaLinha = (alvo: Arquivo[]): string[] =>
  alvo.filter((a) => TOCA_A_LINHA.test(a.texto)).map((a) => a.rel).sort()

/** Régua 4 — as tabelas que um arquivo nomeia em `.from(`, e as portas de escrita de categoria. */
const FROM = /\.from\(\s*([^)]*?)\s*\)/g
const PORTA_DE_CATEGORIA =
  /\b(?:updateCategory|updateCategoriesBatch|createCategory|moveCategories|updateSortOrders|deleteCategory|deleteCategoriesBatch)\b/

const violacoesDaTela = (alvo: Arquivo[]): Ocorrencia[] =>
  alvo.flatMap(({ rel, texto }) => {
    const achados: Ocorrencia[] = []
    for (const m of texto.matchAll(FROM)) {
      // Tabela que não é literal é acusada — não dá para provar que não é `categories`.
      if (m[1] !== "'store_settings'" && m[1] !== '"store_settings"') {
        achados.push({ arquivo: rel, linha: linhaDe(texto, m.index ?? 0), trecho: m[0] })
      }
    }
    const porta = PORTA_DE_CATEGORIA.exec(texto)
    if (porta) achados.push({ arquivo: rel, linha: linhaDe(texto, porta.index), trecho: porta[0] })
    return achados
  })

// ───────────────────────────────────────────────────────────────────────────
// Escopo e exceções, por extenso
// ───────────────────────────────────────────────────────────────────────────

/**
 * A ÚNICA exceção da régua 1: o mapeador da leitura de categorias da loja copia a linha do banco
 * (`menu_desktop: row.menu_desktop === true`) e declara o tipo dela. É leitura — e a metade positiva
 * abaixo prova que ele lê (`.select(`) e não escreve.
 */
const MAPEADOR_DE_LEITURA = 'apps/store/src/entities/category/api/useCategories.ts'

/** Os dois que tocam a linha crua, e por isso precisam chamar o dono. */
const LEITORES_DA_LINHA = [
  'apps/backoffice/src/features/store-menu/model/useStoreMenu.ts',
  'apps/store/src/entities/category/api/useMenu.ts',
]

const daTela = producao.filter(
  (a) =>
    a.rel === 'apps/backoffice/src/pages/admin/AdminMenuPage.tsx' ||
    a.rel.startsWith('apps/backoffice/src/features/store-menu/'),
)

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('menu com dono único — âncoras da varredura', () => {
  it('a varredura enxerga os dois apps, as edge functions e os pacotes', () => {
    expect(varridosApps.length).toBeGreaterThan(400)
    expect(producao.some((a) => a.rel.startsWith('apps/store/src/'))).toBe(true)
    expect(producao.some((a) => a.rel.startsWith('apps/backoffice/src/'))).toBe(true)
    expect(producao.some((a) => a.rel === 'supabase/functions/google-feed/index.ts')).toBe(true)
    expect(producaoComPacotes.some((a) => a.rel === 'packages/core/src/menu/structure.ts')).toBe(true)
    expect(producao.some((a) => eTeste(a.rel))).toBe(false)
  })

  it('régua 1 ENCONTRA a forma legítima: as chaves do mapeador de leitura', () => {
    const doMapeador = chavesDaColuna(producao.filter((a) => a.rel === MAPEADOR_DE_LEITURA))
    // Três no tipo da linha e três no objeto mapeado.
    expect(doMapeador.length).toBeGreaterThanOrEqual(6)
  })

  it('régua 2 ENCONTRA as escritas e lê o argumento delas', () => {
    const doDono = chamadasDeEscrita(
      producao.filter((a) => a.rel === 'apps/backoffice/src/features/store-menu/model/useStoreMenu.ts'),
    )
    // A gravação do documento: `.update({ value })` e o `.insert({ key: …, value })`.
    expect(doDono.map((c) => c.arg.replace(/\s+/g, ' ').trim())).toEqual(
      expect.arrayContaining(['{ value }', '{ key: STORE_MENU_KEY, value }']),
    )
    expect(chamadasDeEscrita(producaoComPacotes).length).toBeGreaterThan(50)
  })

  it('régua 4: a tela do menu foi achada, e ela lê `store_settings`', () => {
    const nomes = daTela.map((a) => a.rel)
    expect(nomes.length).toBeGreaterThan(10)
    expect(nomes).toContain('apps/backoffice/src/pages/admin/AdminMenuPage.tsx')
    expect(nomes).toContain('apps/backoffice/src/features/store-menu/model/useStoreMenu.ts')
    expect(
      daTela.some((a) => [...a.texto.matchAll(FROM)].some((m) => m[1] === "'store_settings'")),
    ).toBe(true)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// As réguas
// ───────────────────────────────────────────────────────────────────────────

describe('régua 1 — nenhum objeto leva as colunas antigas do menu (MNM-18, AD-068)', () => {
  it('fora do mapeador de leitura, nenhuma chave `menu_desktop`/`menu_mobile`/`menu_banners`', () => {
    const fora = chavesDaColuna(producao).filter((o) => o.arquivo !== MAPEADOR_DE_LEITURA)
    expect(
      fmt(fora),
      'o menu mora em store_settings.menu (documento v2), gravado por useStoreMenu',
    ).toEqual([])
  })

  it('metade positiva: o mapeador LÊ (`.select(`) e não escreve', () => {
    const mapeador = producao.find((a) => a.rel === MAPEADOR_DE_LEITURA)
    expect(mapeador, 'o mapeador da loja sumiu — a exceção ficou pendurada').toBeTruthy()
    expect(mapeador!.texto).toMatch(/\.select\(/)
    expect(chamadasDeEscrita([mapeador!])).toEqual([])
  })
})

describe('régua 2 — nenhuma escrita nomeia as colunas antigas (zero exceção)', () => {
  it('nem nos apps, nem nas functions, nem nos pacotes', () => {
    expect(fmt(escritasDaColuna(producaoComPacotes))).toEqual([])
  })
})

describe('régua 3 — o documento só é interpretado por `parseMenuDocument`', () => {
  it('quem toca a linha crua do menu são exatamente os dois leitores', () => {
    expect(leitoresDaLinha(producao)).toEqual([...LEITORES_DA_LINHA].sort())
  })

  it('metade positiva: os dois chamam `parseMenuDocument(`', () => {
    for (const rel of LEITORES_DA_LINHA) {
      const arquivo = producao.find((a) => a.rel === rel)
      expect(arquivo, `${rel} sumiu`).toBeTruthy()
      expect(arquivo!.texto, rel).toMatch(/\bparseMenuDocument\(/)
    }
  })

  it('nenhum arquivo de `apps/**` compara a versão do documento — quem decide é `core`', () => {
    const achados = producao
      .filter((a) => COMPARA_VERSAO.test(a.texto))
      .map((a) => a.rel)
    expect(achados).toEqual([])
  })
})

describe('régua 4 — a tela do menu não escreve em `categories` (MNM-18)', () => {
  it('a única tabela da tela é `store_settings`, e nenhuma porta de escrita de categoria aparece', () => {
    expect(fmt(violacoesDaTela(daTela))).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Sensores
// ───────────────────────────────────────────────────────────────────────────

const sintetico = (rel: string, ...linhas: string[]): Arquivo => ({
  rel,
  texto: semComentarios(linhas.join('\n')),
})

describe('a régua funciona — sensores', () => {
  it('comentário é removido com CRLF e com LF, e o código em volta sobrevive', () => {
    for (const fim of ['\r\n', '\n']) {
      const t = semComentarios(
        ['const a = 1', '// updateCategory(id, { menu_desktop: true })', 'const b = 2', ''].join(fim),
      )
      expect(t).not.toContain('menu_desktop')
      expect(t).toContain('const a = 1')
      expect(t).toContain('const b = 2')
    }
  })

  it('o glob de dois asteriscos num comentário de linha não engole o código abaixo', () => {
    const t = semComentarios(
      ['// vale para apps/**, e este glob é a armadilha', "supabase.from('categories').update({ menu_mobile: false })", '/* fim */'].join('\n'),
    )
    expect(fmt(escritasDaColuna([{ rel: 'x.ts', texto: t }]))).toHaveLength(1)
  })

  it('régua 1 pega a chave nas três grafias, e não acusa a leitura nem o `select`', () => {
    const ruim = sintetico(
      'apps/backoffice/src/x.ts',
      'const patch = { menu_desktop: true }',
      "const outro = { 'menu_banners': null }",
      'const curto = { id, menu_mobile }',
    )
    expect(chavesDaColuna([ruim])).toHaveLength(3)

    const bom = sintetico(
      'apps/backoffice/src/y.ts',
      'const lido = row.menu_desktop',
      "const SELECT = ['id', 'menu_desktop', 'menu_mobile'].join(', ')",
      "type U = Omit<C, 'menu_desktop' | 'menu_banners'>",
    )
    expect(chavesDaColuna([bom])).toEqual([])
  })

  it('régua 2 pega a escrita quebrada em linhas e pela porta do painel; o inverso passa', () => {
    const ruim = sintetico(
      'apps/backoffice/src/x.ts',
      "await supabase.from('categories').update({",
      '  sort_order: 1,',
      '  menu_banners: banners,',
      "}).eq('id', id)",
      'await updateCategory(id, { menu_desktop: false })',
    )
    expect(escritasDaColuna([ruim])).toHaveLength(2)

    const bom = sintetico(
      'apps/backoffice/src/y.ts',
      "await supabase.from('categories').update({ active: false }).eq('id', id)",
      "await supabase.from('categories').select('id, menu_desktop')",
    )
    expect(escritasDaColuna([bom])).toEqual([])
    expect(chamadasDeEscrita([bom])).toHaveLength(1)
  })

  it('régua 3 acusa um terceiro leitor da linha e a versão comparada à mão', () => {
    const intruso = sintetico(
      'apps/store/src/widgets/header/ui/Intruso.tsx',
      'const doc = settings?.menu',
      'if (doc?.version === 2) return doc.items',
    )
    expect(leitoresDaLinha([...producao, intruso])).toContain(
      'apps/store/src/widgets/header/ui/Intruso.tsx',
    )
    expect(COMPARA_VERSAO.test(intruso.texto)).toBe(true)
    expect(COMPARA_VERSAO.test("const value = { ...atual, version: 2, items }")).toBe(false)
  })

  it('régua 4 acusa a tabela de categorias, a tabela em variável e a porta; o inverso passa', () => {
    const ruim = sintetico(
      'apps/backoffice/src/pages/admin/AdminMenuPage.tsx',
      "await supabase.from('categories').update({ sort_order: 2 }).eq('id', id)",
      'await supabase.from(TABELA).select()',
      'const { updateSortOrders } = useAdminCategories()',
    )
    expect(violacoesDaTela([ruim])).toHaveLength(3)

    const bom = sintetico(
      'apps/backoffice/src/features/store-menu/model/x.ts',
      "await supabase.from('store_settings').update({ value }).eq('key', STORE_MENU_KEY)",
      'const { categories, loading } = useAdminCategories()',
    )
    expect(violacoesDaTela([bom])).toEqual([])
  })

  it('régua 4 é fronteira, não vazio: fora da tela a porta de categoria existe e é legítima', () => {
    const categorias = producao.find(
      (a) => a.rel === 'apps/backoffice/src/pages/admin/AdminCategoriesPage.tsx',
    )
    expect(categorias).toBeTruthy()
    expect(violacoesDaTela([categorias!]).length).toBeGreaterThan(0)
  })
})
