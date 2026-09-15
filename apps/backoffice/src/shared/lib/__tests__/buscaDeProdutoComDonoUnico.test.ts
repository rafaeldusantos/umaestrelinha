// A busca de produto do painel tem UM dono — feature 51, `BUS-21`..`BUS-24`.
//
// Antes desta feature, "qual peça?" era respondida de **cinco maneiras diferentes**, nenhuma sabendo
// da outra: duas listas filtradas em memória com réguas distintas, dois `<select>` com o catálogo
// inteiro dentro e busca nenhuma, e uma busca no servidor. E elas já discordavam, medido contra o
// banco hospedado: `name ilike '%coracao%'` devolve **0** linhas e `'%coração%'` devolve **106** —
// na Home a Adri achava as 106 peças (a dobra era no cliente), no menu a tela dizia que não existia
// nenhuma (o termo ia cru para o Postgres).
//
// **Sem este guarda, a sexta cópia nasce e nada acusa**: build, `tsc` e teste de componente passam
// com as cinco discordando, porque duas escritas da mesma regra não quebram nada — é o "defeito 01"
// deste repositório. As cinco de hoje nasceram uma a uma, cada uma razoável sozinha.
//
// **ZERO ALLOWLIST.** Não há lista de exceções por caminho neste arquivo, e é deliberado: o que
// separa o dono do resto é a **pasta**, escrita literalmente em cada régua. Uma entrada de allowlist
// seria uma superfície a mais autorizada a divergir.
//
// **ÂNCORA DUPLA** nas três réguas: a varredura prova que leu arquivos **e** que a régua encontra o
// que procura (`L-035`). Só contar arquivos deixa passar um regex quebrado; só procurar ocorrência
// deixa passar um caminho errado. Num guarda cuja asserção é uma AUSÊNCIA, uma régua que varre zero
// não reprova — ela **aprova em silêncio**, que é a pior falha possível.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(AQUI, '../../../../../..')

/** Escopo literal — o painel inteiro. A régua nunca é o objeto medido (lição da `fieldBorder`). */
const ESCOPO = ['apps/backoffice/src']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivosDe = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entrada => {
    if (IGNORADOS.has(entrada.name)) return []
    const completo = join(dir, entrada.name)
    if (entrada.isDirectory()) return arquivosDe(completo)
    return entrada.isFile() && EXTENSOES.some(ext => entrada.name.endsWith(ext)) ? [completo] : []
  })

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

/**
 * Comentário fora, numa varredura só — `BL-027`, `L-031`.
 *
 * Linha e bloco na **mesma** passada, por alternação: quem começa primeiro consome. Duas passadas
 * (bloco primeiro, linha depois) têm um ponto cego que a feature 39 encontrou nos guardas do menu —
 * um comentário de LINHA que cite um glob de dois asteriscos carrega um abre-bloco dentro de si, e
 * a régua de bloco apaga dali até o próximo fecha-bloco do arquivo, **inclusive código**.
 *
 * A classe `[^\n\r]` fecha o comentário de linha **antes do `\r`**: num checkout Windows — que é o
 * desta máquina — `[^\n]` engoliria o `\r` e a linha seguinte junto, e a régua passaria a medir
 * texto que não existe.
 *
 * O miolo vira espaço **preservando as quebras**, para que o guarda continue podendo apontar
 * `arquivo:linha`. E aqui isto não é zelo: os arquivos em escopo explicam esta feature em prosa,
 * citando as três formas proibidas por extenso. Uma régua que casasse menção acusaria exatamente
 * quem está certo — já aconteceu duas vezes neste repositório.
 */
const semComentarios = (fonte: string): string =>
  fonte.replace(/\/\/[^\n\r]*|\/\*[\s\S]*?\*\//g, trecho => trecho.replace(/[^\n\r]/g, ' '))

interface Arquivo {
  rel: string
  /** O fonte **sem comentário**, com as quebras preservadas. É sobre ele que as réguas rodam. */
  codigo: string
}

const varridos: Arquivo[] = ESCOPO.flatMap(d => arquivosDe(join(RAIZ, d))).map(caminho => ({
  rel: relative(RAIZ, caminho).split('\\').join('/'),
  codigo: semComentarios(readFileSync(caminho, 'utf8')),
}))

/** Só o que o painel de fato executa — teste pode nomear o que quiser, inclusive este arquivo. */
const producao = varridos.filter(a => !eTeste(a.rel))

interface Ocorrencia {
  arquivo: string
  linha: number
  texto: string
}

/** A linha (1-based) de um índice de caractere. */
const linhaDe = (codigo: string, indice: number): number =>
  codigo.slice(0, indice).split('\n').length

const trechoDe = (codigo: string, indice: number): string => {
  const inicio = codigo.lastIndexOf('\n', indice) + 1
  const fim = codigo.indexOf('\n', indice)
  return codigo.slice(inicio, fim === -1 ? undefined : fim).trim()
}

const ocorrencia = (arquivo: string, codigo: string, indice: number): Ocorrencia => ({
  arquivo,
  linha: linhaDe(codigo, indice),
  texto: trechoDe(codigo, indice),
})

// ===========================================================================
// Régua 1 — a consulta de produto filtrada por NOME (`BUS-21`)
// ===========================================================================

/**
 * As **duas** formas, e as duas são obrigatórias — `L-033`.
 *
 * A primeira escrita desta régua casava só a forma de método, e teria nascido **verde sobre nada**:
 * o dono não usa essa forma. `useAdminProducts` monta a condição como **string** e a entrega ao
 * `.or()` do PostgREST, e a chamada de método que existe no arquivo é sobre `sku`, em
 * `product_variants`. Régua por COMANDO, nunca uma para a família — e cada forma tem sensor próprio.
 *
 * 1. método: a chamada com o nome da coluna como primeiro argumento
 * 2. string do PostgREST: `name.` seguido do operador e de outro ponto
 *
 * **O recorte à esquerda é por token exato** (`L-034`): a negação `(?<![\w.$])` impede que a busca
 * de PEDIDO — que casa a coluna `customer_name` e está a um sublinhado de distância — seja acusada.
 * O `\b` não fecharia nada aqui, porque o vizinho é caractere de palavra. O ponto na negação também
 * recusa `produto.name.` seguido de operador, que seria acesso a propriedade e não filtro.
 */
const FILTRO_POR_NOME =
  /\.\s*(?:i?like|textSearch)\s*\(\s*['"]name['"]|(?<![\w.$])name\.(?:i?like|fts|plfts|phfts|wfts)\./g

const filtroPorNome = (alvo: readonly Arquivo[]): Ocorrencia[] => {
  const achados: Ocorrencia[] = []
  for (const { rel, codigo } of alvo) {
    for (const m of codigo.matchAll(FILTRO_POR_NOME)) achados.push(ocorrencia(rel, codigo, m.index ?? 0))
  }
  return achados
}

/** O dono: a pasta de leitura de produto. Escrita literalmente, não derivada de constante. */
const DONO_DA_CONSULTA = 'apps/backoffice/src/entities/product/api/'

// ===========================================================================
// Régua 2 — a DECLARAÇÃO da dobra de busca (`BUS-22`)
// ===========================================================================

const NORMALIZE_NFD = /\.\s*normalize\s*\(\s*['"]NFD['"]\s*\)/g

/**
 * Os elos de chamada que seguem uma posição do fonte, na ordem em que aparecem.
 *
 * Existe porque a régua precisa saber **onde a cadeia termina**, e não só o que ela contém: a dobra
 * de busca e o gerador de slug começam idênticos. A diferença é o que vem DEPOIS de tirar o acento.
 *
 * A profundidade conta parênteses e dá conta do único aninhamento real do repositório — o recorte
 * de hífen das pontas, cujo literal de regex traz um par de parênteses dentro. Um parêntese solto
 * dentro de literal ou de string desequilibraria a contagem; nesse caso a caminhada **para** e a
 * cadeia sai curta, o que torna a régua mais permissiva, nunca mais acusadora. O sensor de
 * caminhada abaixo mede isso na forma real.
 */
const elosApos = (codigo: string, posicao: number): string[] => {
  const elos: string[] = []
  let i = posicao
  for (;;) {
    while (i < codigo.length && /\s/.test(codigo[i])) i += 1
    if (codigo[i] !== '.') return elos
    let j = i + 1
    while (j < codigo.length && /[A-Za-z0-9_$]/.test(codigo[j])) j += 1
    const metodo = codigo.slice(i + 1, j)
    while (j < codigo.length && /\s/.test(codigo[j])) j += 1
    if (metodo === '' || codigo[j] !== '(') return elos
    let profundidade = 0
    let k = j
    for (; k < codigo.length; k += 1) {
      if (codigo[k] === '(') profundidade += 1
      else if (codigo[k] === ')') {
        profundidade -= 1
        if (profundidade === 0) break
      }
    }
    if (profundidade !== 0) return elos
    elos.push(`${metodo}(${codigo.slice(j + 1, k)})`)
    i = k + 1
  }
}

/**
 * O elo que tira o acento — e **só** ele.
 *
 * Três grafias, porque as três existem no painel: a classe de combinantes escrita com os caracteres
 * literais no fonte, a mesma classe em escape, e o identificador que o dono usa. Em todas, o que
 * define "tirar acento" é **substituir por NADA** — trocar por hífen ou por espaço é outra coisa.
 *
 * O identificador só conta quando é o **primeiro** argumento: assim a forma do dono casa e um nome
 * em caixa alta perdido no meio de outro argumento não.
 */
const ehTiraAcento = (elo: string): boolean => {
  const m = /^replace\(([\s\S]*)\)$/.exec(elo)
  if (!m) return false
  const args = m[1]
  if (!/,\s*(?:''|"")\s*$/.test(args)) return false
  return (
    /[\u0300-\u036f]/.test(args) ||
    /\\u0300\s*-\s*\\u036f/i.test(args) ||
    /^\s*[A-Z][A-Z0-9_]*\s*,/.test(args)
  )
}

/**
 * A dobra de BUSCA é a cadeia que **termina** no acento.
 *
 * Esta é a régua inteira, e ela é estrutural — não uma lista de arquivos perdoados. O gerador de
 * slug e a normalização de tag **continuam** depois de tirar o acento: uma junta por hífen, a outra
 * colapsa espaço. Elas produzem **endereço** e **rótulo**, não termo de busca, e unificá-las é
 * decisão sobre geração de slug — a spec desta feature as deixou de fora por escrito, e a dívida
 * está registrada no `CLAUDE.md` da raiz.
 *
 * E é por isso que a régua procura **declaração, nunca menção** (`BUS-22`): ela caminha por uma
 * cadeia de chamadas de verdade. Citar a dobra em prosa não produz elo nenhum — e o comentário já
 * saiu antes, de qualquer forma.
 */
const dobraDeBusca = (alvo: readonly Arquivo[]): Ocorrencia[] => {
  const achados: Ocorrencia[] = []
  for (const { rel, codigo } of alvo) {
    for (const m of codigo.matchAll(NORMALIZE_NFD)) {
      const elos = elosApos(codigo, (m.index ?? 0) + m[0].length)
      const acento = elos.findIndex(ehTiraAcento)
      if (acento === -1) continue
      if (elos.slice(acento + 1).some(e => /^replace\(/.test(e))) continue
      achados.push(ocorrencia(rel, codigo, m.index ?? 0))
    }
  }
  return achados
}

/** O dono da dobra. */
const DONO_DA_DOBRA = 'apps/backoffice/src/shared/lib/texto.ts'

// ===========================================================================
// Régua 3 — o catálogo inteiro virando lista de opções (`BUS-23`)
// ===========================================================================

/**
 * Os nomes que o painel dá ao catálogo de produtos.
 *
 * **O alcance desta régua é o nome, e isso está declarado e não escondido.** Uma régua puramente
 * estrutural ("uma iteração produzindo uma opção") acusaria as **doze** listas legítimas de
 * categoria e de coleção do painel, que têm exatamente a mesma forma, e um guarda que nasce
 * reprovando doze vezes é um guarda que alguém desliga. Um catálogo guardado numa variável batizada
 * de outro jeito escapa daqui; o que a régua compra é recusar **a volta da forma que existiu** — o
 * seletor de 702 itens que esta feature apagou de duas telas.
 */
const NOMES_DO_CATALOGO = [
  'products',
  'produtos',
  'pool',
  'productPool',
  'poolDeProdutos',
  'catalogo',
  'allProducts',
]

/**
 * Iteração sobre o catálogo que desemboca numa opção de `<select>`.
 *
 * O `map` entre o nome e a tag é o que aperta a régua: sem ele, um `products` citado no começo do
 * componente e uma tag qualquer duzentos caracteres abaixo bastariam para acusar. O elo
 * intermediário opcional cobre a forma com filtro no meio, e a janela atravessa linha de propósito
 * — a forma real ocupa três ou quatro.
 */
const CATALOGO_EM_OPCAO = new RegExp(
  '(?<![\\w$])(?:' +
    NOMES_DO_CATALOGO.join('|') +
    ')\\s*(?:\\.[A-Za-z]+\\([^()]*\\)\\s*)*\\.map\\([\\s\\S]{0,240}?<\\s*(?:option|SelectItem)\\b',
  'g',
)

const catalogoEmOpcao = (alvo: readonly Arquivo[]): Ocorrencia[] => {
  const achados: Ocorrencia[] = []
  for (const { rel, codigo } of alvo) {
    for (const m of codigo.matchAll(CATALOGO_EM_OPCAO)) achados.push(ocorrencia(rel, codigo, m.index ?? 0))
  }
  return achados
}

/** Qualquer opção de `<select>`, para provar que o extrator ENXERGA JSX. */
const QUALQUER_OPCAO = /<\s*(?:option|SelectItem)\b/

const DONO_DA_LISTA = 'apps/backoffice/src/entities/product/'

// ===========================================================================
// Âncoras
// ===========================================================================

const sintetico = (
  codigo: string,
  rel = 'apps/backoffice/src/features/x/ui/Sintetico.tsx',
): Arquivo[] => [{ rel, codigo: semComentarios(codigo) }]

describe('busca de produto — âncoras da varredura (BUS-24)', () => {
  it('ÂNCORA: a varredura enxerga o painel inteiro, e separa produção de teste', () => {
    // Caminho errado varre zero arquivo e faz TODA asserção de ausência abaixo passar por vacuidade.
    expect(varridos.length).toBeGreaterThan(350)
    expect(producao.length).toBeGreaterThan(200)
    expect(varridos.some(a => a.rel.startsWith('apps/backoffice/src/entities/product/'))).toBe(true)
    expect(varridos.some(a => a.rel.startsWith('apps/backoffice/src/features/'))).toBe(true)
    expect(producao.some(a => eTeste(a.rel))).toBe(false)
    // E este arquivo, que NOMEIA as três formas proibidas nos sensores, fica fora da produção.
    expect(producao.some(a => a.rel.endsWith('buscaDeProdutoComDonoUnico.test.ts'))).toBe(false)
  })

  it('ÂNCORA: as três réguas ACHAM o que procuram (L-035)', () => {
    // Sem esta âncora, um regex quebrado varreria os arquivos certos, encontraria zero e as
    // asserções de ausência passariam — a pior falha possível num teste que lê fonte, porque ele
    // parece saudável.
    const noDonoDaConsulta = filtroPorNome(producao.filter(a => a.rel.startsWith(DONO_DA_CONSULTA)))
    expect(noDonoDaConsulta.length).toBeGreaterThanOrEqual(1)

    const noDonoDaDobra = dobraDeBusca(producao.filter(a => a.rel === DONO_DA_DOBRA))
    expect(noDonoDaDobra).toHaveLength(1)

    // A terceira **não tem ocorrência legítima em dono nenhum** — o componente compartilhado é
    // `<ul>` de `<li>` e nunca um `<select>` (`BUS-17`), então "encontrar a régua no dono" é
    // impossível por construção, e fingir o contrário seria uma âncora falsa. O que a ancora é o
    // extrator de JSX: ele precisa enxergar as listas de CATEGORIA do painel, que são justamente a
    // forma que ela tem de NÃO acusar. Se este número cair a zero, o extrator quebrou.
    const comOpcao = producao.filter(a => QUALQUER_OPCAO.test(a.codigo))
    expect(comOpcao.length).toBeGreaterThanOrEqual(10)
  })

  it('SENSOR: comentário é removido — linha e bloco, com CRLF e com LF', () => {
    // A régua não pode ser confundida com a prosa sobre a régua. Os dois finais de linha precisam
    // ser provados: com `[^\n]` o removedor engoliria o `\r` e a linha seguinte junto num checkout
    // Windows, e o guarda passaria a medir texto que não existe (`L-031`).
    const crlf = semComentarios('const a = 1\r\n// name.ilike aqui\r\nconst b = 2\r\n')
    const lf = semComentarios('const a = 1\n// name.ilike aqui\nconst b = 2\n')
    const bloco = semComentarios('const a = 1\r\n/**\r\n * name.ilike\r\n */\r\nconst b = 2\r\n')

    for (const saida of [crlf, lf, bloco]) {
      expect(saida.includes('name.ilike')).toBe(false)
      // E o código em volta sobrevive — um removedor que apagasse tudo passaria no teste acima.
      expect(saida.includes('const a = 1')).toBe(true)
      expect(saida.includes('const b = 2')).toBe(true)
    }
    // A numeração não desliza: o bloco de 5 linhas continua com 5 linhas (+ a final vazia).
    expect(bloco.split('\n')).toHaveLength(6)
  })

  // O glob armadilha, montado por CONCATENAÇÃO de propósito — duas razões independentes.
  //
  // 1. Escrito colado, ele poria um abre-bloco cru no fonte DESTE arquivo, e todo guarda que varre
  //    a pasta dos apps passaria a ler daqui um bloco que nunca fecha.
  // 2. A forma importa: o glob termina em dois asteriscos SEM barra depois, e é só assim que o
  //    abre-bloco que ele carrega fica em aberto. Com a barra em seguida ele fecharia sozinho.
  const GLOB_ARMADILHA = 'apps/backoffice/' + '*'.repeat(2)

  it('SENSOR: comentário de LINHA com glob NÃO cega o código abaixo (BL-027)', () => {
    const fonte = [
      '/** a prosa que explica a régua */',
      `// a varredura cobre ${GLOB_ARMADILHA}, e este glob era a armadilha`,
      "const depois = supabase.from('products').ilike('name', '%x%')",
      '/* bloco de verdade */',
      'const final = 2',
      '',
    ].join('\n')

    const [{ codigo }] = sintetico(fonte)
    // O código sobrevive aos dois lados do comentário armadilha — e a REGRA continua o acusando.
    expect(filtroPorNome(sintetico(fonte)).map(o => o.linha)).toEqual([3])
    expect(codigo.includes('const final = 2')).toBe(true)
    // E a prosa continua sumindo — a correção não pode ter desligado o removedor.
    expect(codigo.includes('armadilha')).toBe(false)
    expect(codigo.includes('bloco de verdade')).toBe(false)
    expect(codigo.split('\n')).toHaveLength(6)
  })
})

// ===========================================================================
// BUS-21 — a consulta filtrada por nome
// ===========================================================================

describe('ninguém consulta `products` por nome fora do dono (BUS-21)', () => {
  it('toda filtragem por nome mora em `entities/product/api/`', () => {
    const fora = filtroPorNome(producao).filter(o => !o.arquivo.startsWith(DONO_DA_CONSULTA))
    expect(
      fora.map(o => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'use `useProductPool` + `buscarProdutos` de `@/entities/product` em vez de consultar por nome',
    ).toEqual([])
  })

  it('SENSOR: a forma de MÉTODO é acusada, nos três operadores', () => {
    // A forma que `useMenuProducts` usava, e que não dobrava acento — o defeito que abriu a feature.
    expect(filtroPorNome(sintetico("q.ilike('name', '%colar%')")).map(o => o.linha)).toEqual([1])
    expect(filtroPorNome(sintetico('q.like("name", "%colar%")')).map(o => o.linha)).toEqual([1])
    expect(filtroPorNome(sintetico("q.textSearch('name', termo)")).map(o => o.linha)).toEqual([1])
  })

  it('SENSOR: a forma de STRING é acusada — e é a que o dono de fato usa (L-033)', () => {
    // A primeira escrita desta régua casava só a forma de método, e teria nascido verde sobre nada:
    // o dono monta a condição como string e a entrega ao `.or()`.
    expect(filtroPorNome(sintetico('const c = [`name.ilike.%${termo}%`]')).map(o => o.linha)).toEqual([1])
    expect(filtroPorNome(sintetico("q.or('name.like.%colar%')")).map(o => o.linha)).toEqual([1])
    expect(filtroPorNome(sintetico("q.or('name.fts.colar')")).map(o => o.linha)).toEqual([1])
  })

  it('SENSOR INVERSO: a busca de PEDIDO e a de CLIENTE não são acusadas', () => {
    // A coluna do pedido está a um sublinhado de distância, e é legítima — a busca de pedidos tem
    // dono próprio (`orderQuery`). O `\b` não fecharia nada aqui (`L-034`).
    expect(filtroPorNome(sintetico('const c = `order_number.ilike.%x%,customer_name.ilike.%x%`'))).toEqual([])
    expect(filtroPorNome(sintetico('const c = COLUNAS.map(c => `${c}.ilike.%${termo}%`)'))).toEqual([])
    // O SKU vive em `product_variants`, e é a chamada de método que existe dentro do próprio dono.
    expect(filtroPorNome(sintetico("q.ilike('sku', '%abc%')"))).toEqual([])
    // Acesso a propriedade não é filtro.
    expect(filtroPorNome(sintetico('const n = produto.name.like'))).toEqual([])
  })

  it('SENSOR INVERSO: o próprio dono continua passando', () => {
    // A régua não pode acusar `useAdminProducts`, que é onde a filtragem legítima mora. Se ela
    // passasse a acusá-lo, o conserto "óbvio" seria mover a consulta para fora do dono.
    const noDono = filtroPorNome(producao).filter(o => o.arquivo.startsWith(DONO_DA_CONSULTA))
    expect(noDono.length).toBeGreaterThanOrEqual(1)
    expect(noDono.every(o => o.arquivo.startsWith(DONO_DA_CONSULTA))).toBe(true)
  })
})

// ===========================================================================
// BUS-22 — a dobra de busca
// ===========================================================================

describe('a dobra de busca tem um dono (BUS-22)', () => {
  it('só `shared/lib/texto.ts` declara a dobra', () => {
    const fora = dobraDeBusca(producao).filter(o => o.arquivo !== DONO_DA_DOBRA)
    expect(
      fora.map(o => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'importe `dobrarTexto`/`palavrasDoTermo` de `@/shared/lib/texto`',
    ).toEqual([])
  })

  it('SENSOR: a cadeia que TERMINA no acento é acusada, nas três grafias', () => {
    // As três que existiam: classe de combinantes literal, a mesma em escape, e o identificador.
    const literal =
      'const dobrar = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")'
    const escapada =
      "const fold = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')"
    const identificador = "const d = (v: string) => v.normalize('NFD').replace(ACENTOS, '')"
    expect(dobraDeBusca(sintetico(literal)).map(o => o.linha)).toEqual([1])
    expect(dobraDeBusca(sintetico(escapada)).map(o => o.linha)).toEqual([1])
    expect(dobraDeBusca(sintetico(identificador)).map(o => o.linha)).toEqual([1])
  })

  it('SENSOR: a cadeia QUEBRADA EM LINHAS é acusada — é a forma que o Prettier produz', () => {
    const quebrada = [
      'export const fold = (valor: string): string =>',
      '  valor',
      '    .toLowerCase()',
      "    .normalize('NFD')",
      "    .replace(/[\u0300-\u036f]/g, '')",
      '',
    ].join('\n')
    expect(dobraDeBusca(sintetico(quebrada)).map(o => o.linha)).toEqual([4])
  })

  it('SENSOR INVERSO: o gerador de slug e a normalização de tag NÃO são acusados', () => {
    // As duas continuam DEPOIS de tirar o acento — uma junta por hífen, a outra colapsa espaço. São
    // outra função (produzem endereço e rótulo), e a spec as deixou fora por escrito.
    const slug = [
      'const slugify = (s: string) =>',
      "  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')",
      "    .replace(/[^a-z0-9]+/g, '-')",
      "    .replace(/(^-|-$)/g, '')",
      '',
    ].join('\n')
    const tag = [
      'export const normalizeTag = (tag: string): string =>',
      '  tag',
      "    .normalize('NFD')",
      "    .replace(/[\u0300-\u036f]/g, '')",
      '    .toLowerCase()',
      '    .trim()',
      "    .replace(/\\s+/g, ' ')",
      '',
    ].join('\n')
    expect(dobraDeBusca(sintetico(slug))).toEqual([])
    expect(dobraDeBusca(sintetico(tag))).toEqual([])

    // E o gerador de id da sidebar, que tira TUDO que não é letra — nem acento ele nomeia.
    const id = "const groupId = (l: string) => l.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')"
    expect(dobraDeBusca(sintetico(id))).toEqual([])
  })

  it('SENSOR: o slug que PERDE a junção por hífen volta a ser a dobra — e é acusado', () => {
    // O par do sensor acima, e o que prova que a distinção é a CADEIA e não o nome da função: a
    // mesma declaração, sem os dois elos finais, é exatamente a dobra de busca.
    const mutante =
      "const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')"
    expect(dobraDeBusca(sintetico(mutante)).map(o => o.linha)).toEqual([1])
  })

  it('SENSOR: a PROSA que cita a dobra não é acusada — com LF e com CRLF', () => {
    // Os arquivos em escopo explicam esta feature por extenso. Uma régua que casasse menção
    // acusaria justamente quem está certo (`L-031`).
    const lf = "// a dobra era .normalize('NFD').replace(ACENTOS, '') aqui\nconst x = 1"
    const crlf = "// a dobra era .normalize('NFD').replace(ACENTOS, '') aqui\r\nconst x = 1"
    const emBloco = "/** usa .normalize('NFD').replace(ACENTOS, '') */\nconst x = 1"
    expect(dobraDeBusca(sintetico(lf))).toEqual([])
    expect(dobraDeBusca(sintetico(crlf))).toEqual([])
    expect(dobraDeBusca(sintetico(emBloco))).toEqual([])
  })

  it('SENSOR: a caminhada da cadeia lê os elos de verdade — inclusive o parêntese aninhado', () => {
    // Sem isto, um caminhador quebrado devolveria cadeia vazia, o gerador de slug deixaria de ser
    // reconhecido e a régua o acusaria — ou, pior, devolveria tudo e ela nunca acusaria ninguém.
    const cadeia =
      "x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')"
    const elos = elosApos(cadeia, cadeia.indexOf(')') + 1)
    expect(elos).toHaveLength(3)
    expect(elos.every(e => e.startsWith('replace('))).toBe(true)
    expect(elos[2]).toContain('^-|-$')
    expect(elos.filter(ehTiraAcento)).toHaveLength(1)
  })
})

// ===========================================================================
// BUS-23 — o catálogo inteiro numa lista de opções
// ===========================================================================

describe('o catálogo não volta a virar lista de opções (BUS-23)', () => {
  it('nenhuma tela fora de `entities/product/` mapeia o catálogo em opções', () => {
    const fora = catalogoEmOpcao(producao).filter(o => !o.arquivo.startsWith(DONO_DA_LISTA))
    expect(
      fora.map(o => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'use `<ProductSearchField>` de `@/entities/product` — 702 opções num `<select>` não é busca',
    ).toEqual([])
  })

  it('SENSOR: as duas formas que esta feature apagou são acusadas', () => {
    // O seletor do order bump e o do destino de item da Home, letra por letra.
    const comSelectItem = [
      '<SelectContent>',
      '  {products.map(p => (',
      '    <SelectItem key={p.id} value={p.id}>',
      '      {p.name}',
      '    </SelectItem>',
      '  ))}',
      '</SelectContent>',
      '',
    ].join('\n')
    const comOption = '{produtos.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}'
    expect(catalogoEmOpcao(sintetico(comSelectItem)).map(o => o.linha)).toEqual([2])
    expect(catalogoEmOpcao(sintetico(comOption)).map(o => o.linha)).toEqual([1])

    // E a forma com um elo intermediário, que uma régua ancorada no `map` colado deixaria passar.
    const filtrado =
      '{products.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}'
    expect(catalogoEmOpcao(sintetico(filtrado)).map(o => o.linha)).toEqual([1])
  })

  it('SENSOR INVERSO: as listas de CATEGORIA e as constantes do painel não são acusadas', () => {
    // São a forma idêntica sobre outro dado, e são doze no painel. Uma régua puramente estrutural
    // as acusaria todas — este é o par que prova que ela não o faz.
    const categorias = '{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}'
    const colecoes = '{colecoes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}'
    const constantes = '{PRICE_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}'
    const paginas = '{PAGE_SIZE_OPTIONS.map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}'
    for (const fonte of [categorias, colecoes, constantes, paginas]) {
      expect(catalogoEmOpcao(sintetico(fonte))).toEqual([])
    }
  })

  it('SENSOR INVERSO: o catálogo em lista que NÃO é `<select>` não é acusado', () => {
    // O painel de mais vendidos mapeia produtos há features, e não é um seletor. E o componente
    // compartilhado desta feature é `<ul>` de `<li>` por exigência de `BUS-17`.
    const maisVendidos = '{products.map((p, i) => (<li key={p.id}><span>{i + 1}</span>{p.name}</li>))}'
    const campo = '{itens.map(p => (<li key={p.id}><button type="button">{p.name}</button></li>))}'
    expect(catalogoEmOpcao(sintetico(maisVendidos))).toEqual([])
    expect(catalogoEmOpcao(sintetico(campo))).toEqual([])
  })

  it('SENSOR: a menção em PROSA não é acusada — é o defeito que a `L-031` registra', () => {
    // Duas telas desta feature explicam em comentário o que saiu delas, citando as tags por
    // extenso. Uma régua que casasse menção acusaria exatamente quem está certo.
    const prosa = '// o que saiu foram as ~702 {products.map(p => <option>)} do catálogo\nconst x = 1'
    expect(catalogoEmOpcao(sintetico(prosa))).toEqual([])
  })
})
