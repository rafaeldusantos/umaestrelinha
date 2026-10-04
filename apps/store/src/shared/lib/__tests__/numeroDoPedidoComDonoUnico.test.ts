import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { formatOrderNumber } from '@estrelinha/core/orders'

/**
 * Como se escreve o número de um pedido — `PIX-P4-03`, feature `58`.
 *
 * ---------------------------------------------------------------------------------------------
 * O que este guarda existe para impedir
 * ---------------------------------------------------------------------------------------------
 *
 * O prefixo é **apresentação**: a coluna guarda `0244`, e quem mostra escreve `#0244`. Colado à
 * mão, ele diverge sem nada quebrar — e divergia, antes desta feature, em quatro grafias ao mesmo
 * tempo: a loja mostrava `PEDIDO 0244` **sem** prefixo, `/conta` mostrava `#0244`, o painel
 * `#0244` em quatro telas e o e-mail `Pedido 0244`. Nenhuma delas derruba build, `tsc` ou teste de
 * componente. O que elas produzem é a cliente lendo um número no e-mail e não o reconhecendo na
 * tela — num registro em que ela vai citar esse número no WhatsApp para perguntar da joia da mãe.
 *
 * A régua é **o prefixo colado ao número por quem exibe**, nas duas grafias do identificador
 * (`order_number` e `orderNumber`, que é o mesmo dado com outro nome de prop) e nas duas formas de
 * juntar: interpolação e concatenação. Um guarda que só conhecesse a forma `snake_case` seria cego
 * exatamente ao `OrderCancelDialog`, que recebe o valor por prop.
 *
 * ---------------------------------------------------------------------------------------------
 * A METADE POSITIVA, e por que ela não é opcional
 * ---------------------------------------------------------------------------------------------
 *
 * Uma regra de ausência sobrevive à feature medindo o nada: apagar as três chamadas do formatador
 * deixaria a negativa **verdadeira e vazia**, com o número saindo cru em toda tela. É o modo de
 * falha que `originZipNotRead` teve na `55` — o arquivo medido mudou de nome, a ausência passou por
 * falta de assunto, e quem reprovou foi a asserção positiva ao lado. Por isso as três superfícies
 * são cobradas por nome: a loja, o painel e a function de e-mail.
 *
 * ---------------------------------------------------------------------------------------------
 * ÂNCORA DUPLA — arquivos lidos **e** a forma encontrada
 * ---------------------------------------------------------------------------------------------
 *
 * Só contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um caminho
 * errado. O escopo está escrito **literalmente** aqui, nunca derivado de constante que o código sob
 * teste exporte — a régua não pode ser o objeto medido (lição da `fieldBorder`).
 *
 * **Allowlist de UM: este próprio arquivo.** Ele precisa carregar as formas proibidas nos sensores,
 * e um caso abaixo prova que outro arquivo de teste **seria** acusado — senão "teste é isento"
 * viraria a porta por onde a forma volta.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal: os dois apps e as functions — as três pontas que exibem o número. */
const ESCOPO = ['apps', 'supabase/functions']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [full] : []
  })

/**
 * O fonte **sem os comentários**, uma entrada por linha.
 *
 * Sem isto a régua casa a prosa que explica o defeito, e o conserto vira "edite o comentário" em
 * vez de "conserte o código". Este arquivo é o exemplo vivo: a explicação acima escreve o prefixo
 * colado ao número várias vezes de propósito.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    // CRLF normalizado PRIMEIRO: em JavaScript `.` não casa `\r`, e num checkout Windows — a
    // plataforma deste projeto — o removedor de linha ficaria inerte (`L-031`).
    .replace(/\r\n/g, '\n')
    // Linha e bloco na MESMA varredura (`BL-027`). Em duas passadas, um comentário de LINHA que
    // cite um glob de dois asteriscos carrega um abre-bloco dentro de si, e a régua de bloco apaga
    // dali até o próximo fecha-bloco — inclusive CÓDIGO. Num guarda cuja asserção é uma ausência,
    // o efeito é aprovar em silêncio o que estiver lá dentro.
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, trecho => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

interface Arquivo {
  rel: string
  linhas: string[]
}

const varridos: Arquivo[] = ESCOPO.flatMap(d => arquivos(join(ROOT, d))).map(caminho => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

/** O único arquivo autorizado a escrever as formas proibidas: este, para os sensores abaixo. */
const ALLOWLIST = ['apps/store/src/shared/lib/__tests__/numeroDoPedidoComDonoUnico.test.ts']

const medidos = varridos.filter(a => !ALLOWLIST.includes(a.rel))

interface Ocorrencia {
  arquivo: string
  linha: number
  texto: string
}

const procurar = (regua: RegExp, alvo: Arquivo[] = medidos): Ocorrencia[] =>
  alvo.flatMap(a =>
    a.linhas.flatMap((texto, i) =>
      regua.test(texto) ? [{ arquivo: a.rel, linha: i + 1, texto: texto.trim() }] : [],
    ),
  )

// -------------------------------------------------------------------------------------------
// As réguas, como predicados — uma por FORMA (`L-033`)
// -------------------------------------------------------------------------------------------

/**
 * O identificador do número, nas duas grafias — coluna e prop.
 *
 * Escrito como fragmento e interpolado nas réguas para as duas formas medirem exatamente o mesmo
 * conjunto: duas listas divergiriam na primeira vez que alguém acrescentasse uma grafia a uma só.
 */
const NUMERO = '(?:order_number|orderNumber)'

/**
 * **Interpolação**: o prefixo grudado numa expressão que termina no número — tanto em template
 * literal (`${…}`) quanto em JSX (`{…}`).
 *
 * `[^}\n]*` antes do identificador é o que alcança `o.order_number`, `row.order_number` e
 * `escapar(o.order_number)`; e o recorte à direita é por **token exato** (`(?![-\w])`), senão um
 * campo hipotético `order_numbering` cairia junto (`L-034`).
 */
const REGUA_INTERPOLACAO = new RegExp(`#\\$?\\{[^}\\n]*${NUMERO}(?![-\\w])`)

/**
 * **Concatenação**: o prefixo como string somada ao número.
 *
 * Forma menos provável que a de cima, e por isso mesmo a que passaria despercebida — ninguém
 * procura por ela ao revisar.
 */
const REGUA_CONCATENACAO = new RegExp(
  `(?:['"\`]#['"\`]\\s*\\+|\\+\\s*['"\`]#['"\`])|` +
    `#['"\`]\\s*\\+\\s*[^\\n]*${NUMERO}(?![-\\w])`,
)

/** O formatador sendo chamado — a metade positiva. */
const REGUA_CHAMADA = /formatOrderNumber\s*\(/

const cita = (rel: string): Arquivo => {
  const achado = varridos.find(a => a.rel === rel)
  // Um caminho que mudou de nome faria a asserção positiva passar por ausência de assunto — que é
  // exatamente como `originZipNotRead` sobreviveu à feature `55` medindo o nada.
  if (!achado) throw new Error(`arquivo fora da varredura: ${rel}`)
  return achado
}

const chama = (rel: string): boolean => cita(rel).linhas.some(l => REGUA_CHAMADA.test(l))

// -------------------------------------------------------------------------------------------

describe('o número do pedido — âncoras da varredura', () => {
  it('a varredura leu arquivos dos DOIS apps e das functions', () => {
    // Sem esta âncora, um caminho errado varreria zero arquivo e as asserções de ausência abaixo
    // passariam em silêncio — a pior falha possível num teste que lê disco. O escopo é parte da
    // asserção (`L-035`): nomear uma ponta só seria allowlist com outro nome.
    expect(varridos.length).toBeGreaterThan(400)
    expect(varridos.map(a => a.rel)).toEqual(
      expect.arrayContaining([
        'apps/store/src/pages/OrderConfirmationPage.tsx',
        'apps/backoffice/src/pages/admin/AdminOrdersPage.tsx',
        'supabase/functions/send-notification/render/vars.ts',
      ]),
    )
  })

  it('a régua encontra as duas formas — âncora de contagem', () => {
    // A segunda metade da âncora dupla. As ocorrências vivem NESTE arquivo (os sensores abaixo), e
    // é por isso que ele é a allowlist de um: uma régua que não achasse nada em lugar nenhum seria
    // indistinguível de uma régua quebrada.
    const proprio = cita(ALLOWLIST[0])

    expect(proprio.linhas.some(l => REGUA_INTERPOLACAO.test(l))).toBe(true)
    expect(proprio.linhas.some(l => REGUA_CONCATENACAO.test(l))).toBe(true)
  })
})

describe('ninguém cola o `#` à mão (PIX-P4-03)', () => {
  it('nenhum arquivo interpola o prefixo junto do número', () => {
    expect(procurar(REGUA_INTERPOLACAO)).toEqual([])
  })

  it('nenhum arquivo concatena o prefixo com o número', () => {
    expect(procurar(REGUA_CONCATENACAO)).toEqual([])
  })

  it('sensor — as duas formas do identificador em JSX são acusadas', () => {
    const acusa = (linha: string) => REGUA_INTERPOLACAO.test(linha)

    expect(acusa('          #{o.order_number}')).toBe(true)
    expect(acusa('          Cancelar Pedido #{orderNumber}')).toBe(true)
  })

  it('sensor — as duas formas do identificador em template literal são acusadas', () => {
    const acusa = (linha: string) => REGUA_INTERPOLACAO.test(linha)

    expect(acusa('  title={`Pedido #${order.order_number}`}')).toBe(true)
    expect(acusa('  const t = `pedido #${escapar(o.order_number)} guardado`')).toBe(true)
    expect(acusa('  const t = `Pedido #${orderNumber}`')).toBe(true)
  })

  it('sensor — a concatenação é acusada', () => {
    expect(REGUA_CONCATENACAO.test("  const rotulo = '#' + order.order_number")).toBe(true)
    expect(REGUA_CONCATENACAO.test('  const rotulo = order.order_number + "#"')).toBe(true)
  })

  it('sensor inverso — a chamada do formatador NÃO é acusada', () => {
    // Sem este par, uma régua que acusasse qualquer menção ao número passaria como "sensível" e
    // reprovaria justamente o conserto.
    const linhas = [
      '          {formatOrderNumber(o.order_number)}',
      '  title={`Pedido ${formatOrderNumber(order.order_number)}`}',
      '    numero_pedido: formatOrderNumber(order.order_number),',
      "  aria-label={`Abrir pedido ${o.order_number}`}",
    ]

    for (const linha of linhas) {
      expect(REGUA_INTERPOLACAO.test(linha)).toBe(false)
      expect(REGUA_CONCATENACAO.test(linha)).toBe(false)
    }
  })

  it('sensor — o recorte à direita é por token exato, não por prefixo', () => {
    // `toContain`/`\b` casariam um campo vizinho cujo nome COMEÇA pelo do número. `-` não é
    // caractere de palavra, então `\b` não fecha nada e `order_number-legacy` cairia junto
    // (`L-034`).
    expect(REGUA_INTERPOLACAO.test('  const t = `#${o.order_numbering}`')).toBe(false)
    expect(REGUA_INTERPOLACAO.test('  const t = `#${o.order_number_legacy}`')).toBe(false)
    expect(REGUA_INTERPOLACAO.test('  const t = `#${o.order_number}`')).toBe(true)
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada, o USO é', () => {
    const acusadas = (fonte: string) =>
      semComentarios(fonte).filter(l => REGUA_INTERPOLACAO.test(l))

    expect(acusadas('// antes era #{o.order_number}, colado a mao\nconst x = 1')).toEqual([])
    expect(acusadas('/* antes era #{o.order_number} */\r\nconst x = 1')).toEqual([])
    // CRLF e LF, o mesmo uso, os dois acusados.
    expect(acusadas('// nota\r\nconst t = `#${o.order_number}`')).toHaveLength(1)
    expect(acusadas('// nota\nconst t = `#${o.order_number}`')).toHaveLength(1)
  })

  it('sensor do glob de dois asteriscos — o comentário de linha não cega a varredura', () => {
    // `BL-027`: em duas passadas, um comentário de linha citando um glob terminado em dois
    // asteriscos carrega um abre-bloco, e a régua de bloco apagaria daí até o próximo fecha-bloco —
    // inclusive o código que vem depois. Aqui a passada é uma só.
    const fonte = [
      '// varre apps/** e para por aqui',
      'const t = `#${o.order_number}`',
      '/* um bloco de verdade, mais abaixo */',
      'const u = 2',
    ].join('\n')

    expect(semComentarios(fonte).filter(l => REGUA_INTERPOLACAO.test(l))).toHaveLength(1)
  })

  it('a allowlist tem UM arquivo, e outro arquivo de teste SERIA acusado', () => {
    // Sem esta prova, "teste é isento" viraria a porta por onde a forma volta ao repositório.
    expect(ALLOWLIST).toHaveLength(1)

    const outroTeste: Arquivo = {
      rel: 'apps/backoffice/src/pages/admin/AdminOrdersPage.test.tsx',
      linhas: ['    expect(tela).toHaveTextContent(`#${o.order_number}`)'],
    }

    expect(procurar(REGUA_INTERPOLACAO, [outroTeste])).toHaveLength(1)
  })
})

describe('as três superfícies chamam o formatador — a metade positiva', () => {
  it.each([
    ['a loja, em /pedido/:id', 'apps/store/src/pages/OrderConfirmationPage.tsx'],
    // Feature `59`: a conta deixou de escrever o número ela mesma — as linhas são do widget da
    // lista e as pendências citam o pedido. A montagem dos dois pela página NÃO é cobrada aqui: o
    // `<AttentionList` é exigido em `pagamentoComDonoUnico.test.ts`, e as duas peças renderizadas pela
    // página real, em `pages/__tests__/AccountPage.test.tsx`.
    ['a loja, em /conta (a lista)', 'apps/store/src/widgets/order-list/ui/OrderList.tsx'],
    [
      'a loja, em /conta (as pendências)',
      'apps/store/src/widgets/order-attention/ui/AttentionList.tsx',
    ],
    // Feature 58 — as duas telas do pagamento PIX. Elas citam o número justamente no momento em
    // que a pessoa mais precisa reconhecê-lo ("perdi minha compra?"), então são as que mais teriam
    // a ganhar com um `#` digitado à mão.
    [
      'a loja, na espera nomeada',
      'apps/store/src/features/order-payment/ui/PaymentProgress.tsx',
    ],
    ['a loja, na tela do PIX', 'apps/store/src/features/order-payment/ui/PixSurface.tsx'],
    ['o painel, na lista', 'apps/backoffice/src/pages/admin/AdminOrdersPage.tsx'],
    ['o painel, no detalhe', 'apps/backoffice/src/pages/admin/AdminOrderPage.tsx'],
    ['o e-mail, nas variáveis', 'supabase/functions/send-notification/render/vars.ts'],
    ['o e-mail, na versão texto', 'supabase/functions/send-notification/render/layout.ts'],
  ])('%s', (_nome, rel) => {
    expect(chama(rel)).toBe(true)
  })

  it('sensor — um arquivo fora da varredura derruba a régua em vez de passar', () => {
    // A asserção positiva acima só vale enquanto o caminho existir. Se um arquivo for renomeado,
    // este guarda tem de GRITAR — não decidir que a regra está satisfeita porque não achou nada.
    expect(() => chama('apps/store/src/pages/PaginaQueNaoExiste.tsx')).toThrow(/fora da varredura/)
  })

  /**
   * **TODO importador do lado Deno, derivado da varredura — nunca um arquivo nomeado à mão.**
   *
   * O grafo de módulo da edge function é resolvido pelo Deno, e lá todo especificador relativo
   * precisa de extensão explícita — `import type` incluso. Sem ela o worker morre ANTES da primeira
   * linha rodar, e nada mais neste repositório acusaria: Vite e vitest resolvem as duas formas. O
   * preço já está registrado duas vezes (features `33` e `52`), com a function fora do ar.
   *
   * A primeira escrita desta régua lia **um** arquivo (`render/vars.ts`) e havia **dois**: tirar a
   * extensão do import de `render/layout.ts` deixava functions 14/14 verde e os dois guardas do
   * store verdes (mutante M21 da verificação independente). *Escopo de varredura menor que a regra
   * é allowlist com outro nome* — então o conjunto é **derivado**: quem citar o módulo passa a ser
   * cobrado no mesmo instante em que passa a citá-lo, sem ninguém lembrar de acrescentá-lo aqui.
   */
  const IMPORTA_O_FORMATADOR = new RegExp(
    `(?:from|import)\\s*\\(?\\s*['"]([^'"\\n]*orders/format[^'"\\n]*)['"]`,
  )

  const importadoresDeno = varridos
    .filter(a => a.rel.startsWith('supabase/functions/'))
    .flatMap(a =>
      a.linhas.flatMap((texto, i) => {
        const achado = IMPORTA_O_FORMATADOR.exec(texto)
        return achado ? [{ arquivo: a.rel, linha: i + 1, especificador: achado[1] }] : []
      }),
    )

  it('a varredura acha TODOS os importadores do lado Deno — âncora de contagem', () => {
    // Sem esta âncora, um regex quebrado varreria zero importador e a asserção abaixo passaria em
    // silêncio sobre uma lista vazia — a pior falha possível num teste que lê disco. São dois hoje,
    // e o piso é dois: um terceiro entra sozinho, um a menos derruba.
    expect(importadoresDeno.length).toBeGreaterThanOrEqual(2)
    expect(importadoresDeno.map(i => i.arquivo)).toEqual(
      expect.arrayContaining([
        'supabase/functions/send-notification/render/vars.ts',
        'supabase/functions/send-notification/render/layout.ts',
      ]),
    )
  })

  it('todos alcançam o formatador por caminho relativo COM extensão — o Deno exige', () => {
    const semExtensao = importadoresDeno.filter(i => !i.especificador.endsWith('/orders/format.ts'))

    expect(semExtensao).toEqual([])
  })

  it('sensor — um importador sem a extensão É acusado, e o com extensão NÃO é', () => {
    // A régua é exercida contra as duas formas, sobre um arquivo sintético: sem o par, um regex que
    // acusasse tudo passaria como "sensível" e reprovaria justamente o conserto.
    const linha = (especificador: string) =>
      `import { formatOrderNumber } from '${especificador}'`
    const extrair = (texto: string) => IMPORTA_O_FORMATADOR.exec(texto)?.[1] ?? null

    expect(extrair(linha('../../../../packages/core/src/orders/format'))).toBe(
      '../../../../packages/core/src/orders/format',
    )
    expect(extrair(linha('../../../../packages/core/src/orders/format.ts'))).toBe(
      '../../../../packages/core/src/orders/format.ts',
    )
    expect(
      extrair(linha('../../../../packages/core/src/orders/format'))!.endsWith('/orders/format.ts'),
    ).toBe(false)
  })

  it('sensor — a régua enxerga `import type` e o import dinâmico, não só o `import` de valor', () => {
    // O grafo de TIPOS também é resolvido pelo Deno: foi um `import type` sem extensão que derrubou
    // o worker na `33`, antes da primeira linha rodar.
    const extrair = (texto: string) => IMPORTA_O_FORMATADOR.exec(texto)?.[1] ?? null

    expect(extrair("import type { X } from '../../packages/core/src/orders/format'")).toBe(
      '../../packages/core/src/orders/format',
    )
    expect(extrair("const m = await import('../../packages/core/src/orders/format')")).toBe(
      '../../packages/core/src/orders/format',
    )
  })

  it('sensor — a régua não confunde o módulo com um vizinho de nome parecido', () => {
    const extrair = (texto: string) => IMPORTA_O_FORMATADOR.exec(texto)?.[1] ?? null

    expect(extrair("import { x } from '../../packages/core/src/orders/formatters.ts'")).toBe(
      '../../packages/core/src/orders/formatters.ts',
    )
    expect(extrair("import { x } from '../../packages/core/src/notifications/dispatch.ts'")).toBeNull()
  })

  it('o dono devolve o que as superfícies exibem', () => {
    // A ponta da regra, aqui para o guarda não ser só sobre nomes de função: a saída é `#` + valor,
    // uma vez só, e ausência continua sendo ausência.
    expect(formatOrderNumber('0244')).toBe('#0244')
    expect(formatOrderNumber('NS-169')).toBe('#NS-169')
    expect(formatOrderNumber('')).toBe('')
  })
})
