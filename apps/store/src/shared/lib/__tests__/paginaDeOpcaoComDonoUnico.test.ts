import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * A página de OPÇÃO tem um dono — feature `68`, SVR-39 e SVR-40.
 *
 * ---------------------------------------------------------------------------------------------
 * O que este guarda existe para impedir
 * ---------------------------------------------------------------------------------------------
 *
 * "Esta opção tem página própria, qual é o título dela e qual é o endereço?" tem QUATRO leitores: a
 * página do produto na loja, o `<head>` servido (`servePage`, em `@estrelinha/core/page` desde a
 * feature `69` — antes, a edge function da página de produto, aposentada), o sitemap e o painel. A resposta mora em `@estrelinha/core/seo` (`productHead`, `indexableOptions`) e o endereço
 * tem um construtor só, `variantPath` (`@estrelinha/core/shopping`). Uma segunda escrita de qualquer
 * um dos três pedaços não quebra build, `tsc` nem teste de componente: o sitemap anunciaria uma URL
 * que a página não declara canônica, e o juiz da divergência seria o Google, semanas depois.
 *
 * Três formas pelas quais a segunda escrita nasceria, fora de `packages/core`:
 *
 *   (a) **montar o `?variant=`** — um literal de código com o parâmetro seguido de interpolação
 *       (template) ou de concatenação. Foi a forma do card da `67`, até a `68`.
 *   (b) **compor um título com a marca** — chamar `brandedTitle`. Medido em 2026-10-19: zero
 *       chamadas fora de `core`; o primeiro chamador seria a segunda régua da marca.
 *   (c) **emendar o nome da peça e o texto da opção com o travessão**, num template ou numa
 *       concatenação — a composição de SVR-08 escrita à mão.
 *
 * ---------------------------------------------------------------------------------------------
 * O ALCANCE da régua (a), declarado e não escondido
 * ---------------------------------------------------------------------------------------------
 *
 * Ela mede a GRAFIA do parâmetro, não a chamada: o nome do parâmetro escrito por interpolação de
 * outra string, ou o endereço montado por um construtor de query da plataforma (passando um objeto
 * com a chave do parâmetro), passam por ela — medido na verificação, rodada 2. O que segura essas
 * formas hoje é a metade POSITIVA, que exige `variantPath` no único consumidor que existe fora de
 * `core` (o card); um consumidor NOVO escrito por essas formas passaria. Fechar isso pediria ler a
 * AST, como `marcacaoSoPorAcao` faz — fica como limite, porque o construtor único já existe e é o
 * caminho mais curto para quem escreve o próximo link.
 *
 * ---------------------------------------------------------------------------------------------
 * O ALCANCE da régua (c), declarado e não escondido
 * ---------------------------------------------------------------------------------------------
 *
 * O travessão é pontuação comum da copy dos dois apps, e medido em 2026-10-19 havia dez templates
 * de produção com ele emendado a uma interpolação ("Status: … — a cliente foi avisada", "Cupom … aplicado
 * — …", a sugestão do filtro "Sugestão: {nome} — {motivo}"). Uma régua "travessão depois de
 * interpolação" nasceria acusando os dez, e guarda que nasce reprovando dez vezes é guarda que
 * alguém desliga. Por isso ela exige o PAR: a interpolação da esquerda nomeia o NOME (`name`/`nome`,
 * por token exato — `nomes` não conta) **e** a da direita nomeia o texto da opção (`option`,
 * `opcao`, `texto`, `text`, `value`, `valor`, `variant`, `cor`). O que ela não alcança: a mesma
 * composição com variáveis de outro nome (`${a} — ${b}`). É o limite de qualquer régua de grafia, e
 * a contenção dele é a metade positiva: os leitores CHAMAM o dono.
 *
 * ---------------------------------------------------------------------------------------------
 * O recorte de PRODUÇÃO, declarado
 * ---------------------------------------------------------------------------------------------
 *
 * Teste escreve a URL esperada por extenso (`?variant=${PRATA_B.id}`) para asserir sobre ela — é o
 * jeito certo de testar, e o card da `67` tem uma suíte inteira assim. Nenhum arquivo de teste
 * entrega página a cliente nenhuma, que é o que este guarda existe para impedir. Por isso a varredura
 * mede só produção, e há caso abaixo provando que o MESMO texto num arquivo de produção é acusado.
 *
 * ---------------------------------------------------------------------------------------------
 * A METADE POSITIVA, e por que ela não é opcional
 * ---------------------------------------------------------------------------------------------
 *
 * Uma regra de ausência sobrevive à feature medindo o nada: apagar a canônica de opção da loja
 * deixaria as três negativas verdadeiras e vazias. Os quatro leitores são cobrados por CHAMAR o dono.
 *
 * **Feature `69` — o leitor servido MUDOU DE ENDEREÇO** (`AD-053`): o `<head>` servido saiu da edge
 * function e foi para `packages/core/src/page/serve.ts`, que fica FORA do escopo das negativas (é
 * `core`, o dono) e é lido à parte pela positiva — o molde de `SITEMAP_URLS`. Uma positiva que
 * continuasse lendo o endereço velho reprovaria por "fora da varredura"; uma que fosse apagada
 * deixaria o `<head>` servido livre para perder a página de opção sem nada acusar. E a volta de um
 * SEGUNDO escritor servido nas functions é recusada por asserção própria, abaixo.
 *
 * Âncora dupla: arquivos lidos **e** a forma encontrada. O escopo está escrito literalmente aqui —
 * a régua nunca pode ser o objeto medido.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal: os dois apps e as edge functions. `packages/core` é o dono e fica de fora. */
// Feature 69: `apps/store/server` é a camada fina da função da Vercel (`api/page`) — também não
// monta `?variant=` nem título com a marca à mão; quem monta é `core/page`.
const ESCOPO = ['apps/store/src', 'apps/store/server', 'apps/backoffice/src', 'supabase/functions']

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
 * O fonte **sem os comentários**: o código desta feature explica o `?variant=` em prosa em quase
 * todo arquivo que o toca (a página, o card, a function), e a régua tem de medir USO, não menção.
 */
const semComentarios = (fonte: string): string =>
  fonte
    // CRLF normalizado PRIMEIRO: `.` não casa `\r` (`L-031`).
    .replace(/\r\n/g, '\n')
    // Linha e bloco na MESMA varredura (`BL-027`): em duas passadas, um comentário de linha que
    // cite um glob de dois asteriscos abriria um bloco falso e apagaria código até o próximo fecho.
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, trecho => trecho.replace(/[^\n]/g, ' '))

interface Arquivo {
  rel: string
  fonte: string
}

const ler = (caminho: string): Arquivo => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  fonte: semComentarios(readFileSync(caminho, 'utf8')),
})

const varridos: Arquivo[] = ESCOPO.flatMap(dir => arquivos(join(ROOT, dir))).map(ler)

const ehTeste = (rel: string) => rel.includes('/__tests__/') || /\.test\.tsx?$/.test(rel)

const producao = varridos.filter(a => !ehTeste(a.rel))

interface Ocorrencia {
  arquivo: string
  trecho: string
}

const procurar = (regua: RegExp, alvo: Arquivo[]): Ocorrencia[] =>
  alvo.flatMap(a => {
    const achado = a.fonte.match(regua)
    return achado ? [{ arquivo: a.rel, trecho: achado[0].slice(0, 80) }] : []
  })

// -------------------------------------------------------------------------------------------
// As réguas — uma por FORMA (`L-033`)
// -------------------------------------------------------------------------------------------

/**
 * (a) O parâmetro dentro de um literal de código, seguido de interpolação de template ou de
 * concatenação. A forma que um literal SEM expressão nenhuma tem (uma fixture, a URL de um exemplo)
 * não é montagem e não é acusada.
 */
const REGUA_PARAMETRO_A_MAO = new RegExp(
  // template: `…?variant=${…}`
  '\\?variant=\\$\\{' +
    // concatenação: '…?variant=' + id
    "|\\?variant=['\"`]\\s*\\+",
)

/** (b) Uma chamada à função que põe a marca no título. Importar sem chamar não é acusado. */
const REGUA_MARCA = /(?<![-\w])brandedTitle\s*\(/

/** O texto da opção, pelo nome da variável, por token exato à esquerda. */
const TEXTO_DA_OPCAO = '(?<![-\\w])(?:option|opcao|opção|texto|text|value|valor|variant|cor)'
/** O nome da peça, por token exato dos dois lados — `nomes` (a lista de sugestões) não conta. */
const NOME = '(?<![-\\w])(?:name|nome)(?![-\\w])'

/** (c) O nome e o texto emendados pelo travessão, em template ou em concatenação. */
const REGUA_TITULO_DE_OPCAO = new RegExp(
  // template: `${…name…} — ${…texto…}`
  `\\$\\{[^}\`]*${NOME}[^}\`]*\\}\\s*—\\s*\\$\\{[^}\`]*${TEXTO_DA_OPCAO}` +
    // concatenação: name + ' — ' + texto
    `|${NOME}\\s*\\+\\s*(['"\`])\\s*—\\s*\\1\\s*\\+\\s*[\\w.]*${TEXTO_DA_OPCAO}`,
)

const cita = (rel: string): Arquivo => {
  const achado = varridos.find(a => a.rel === rel)
  // Um caminho que mudou de nome faria a asserção positiva passar por ausência de assunto.
  if (!achado) throw new Error(`arquivo fora da varredura: ${rel}`)
  return achado
}

/** Os consumidores de `packages/core` que a metade positiva cobra — fora do escopo, lidos à parte. */
const SITEMAP_URLS = ler(join(ROOT, 'packages/core/src/sitemap/urls.ts'))
/** O `<head>` servido desde a feature `69` (`AD-053`) — o endereço novo do leitor servido. */
const SERVE_PAGE = ler(join(ROOT, 'packages/core/src/page/serve.ts'))

/** "Este arquivo CHAMA esta função" — token exato à esquerda, e `productHeadTags(` não é `productHead(`. */
const chama = (fonte: string, funcao: string) => new RegExp(`(?<![-\\w])${funcao}\\s*\\(`).test(fonte)

// -------------------------------------------------------------------------------------------

describe('a página de opção com dono único — âncoras da varredura', () => {
  it('a varredura leu os dois apps e as functions, e alcança os leitores', () => {
    // Sem esta âncora, um caminho errado varreria zero arquivo e as ausências passariam em silêncio.
    expect(varridos.length).toBeGreaterThan(1100) // 1208 em 2026-10-19
    expect(producao.length).toBeGreaterThan(650) // 696 em 2026-10-19
    expect(varridos.map(a => a.rel)).toEqual(
      expect.arrayContaining([
        'apps/store/src/pages/ProductPage.tsx',
        'apps/store/src/entities/product/ui/ProductCard.tsx',
        'apps/backoffice/src/features/product-form/ui/OptionMarkRow.tsx',
        // Feature 70: a leitura do sitemap saiu da edge function para a função da loja.
        'apps/store/server/sitemap.ts',
      ]),
    )
  })

  it('as três réguas encontram a forma que procuram — no DONO, que está fora do escopo', () => {
    // A segunda metade da âncora: a forma legítima existe em `core`, e a régua a enxerga lá.
    const offer = ler(join(ROOT, 'packages/core/src/shopping/offer.ts'))
    const variant = ler(join(ROOT, 'packages/core/src/seo/variant.ts'))
    expect(REGUA_PARAMETRO_A_MAO.test(offer.fonte)).toBe(true)
    expect(REGUA_MARCA.test(variant.fonte)).toBe(true)
    expect(REGUA_TITULO_DE_OPCAO.test(variant.fonte)).toBe(true)
  })
})

describe('fora de `packages/core`, ninguém compõe a página de opção (SVR-39, SVR-40)', () => {
  it('(a) nenhum arquivo de produção monta o `?variant=` à mão', () => {
    expect(procurar(REGUA_PARAMETRO_A_MAO, producao)).toEqual([])
  })

  it('(b) nenhum arquivo de produção chama a função da marca', () => {
    expect(procurar(REGUA_MARCA, producao)).toEqual([])
  })

  it('(c) nenhum arquivo de produção emenda o nome e o texto da opção com o travessão', () => {
    expect(procurar(REGUA_TITULO_DE_OPCAO, producao)).toEqual([])
  })
})

describe('a metade positiva — os leitores chamam o dono', () => {
  it('a página do produto chama `productHead`', () => {
    expect(chama(cita('apps/store/src/pages/ProductPage.tsx').fonte, 'productHead')).toBe(true)
  })

  it('o `<head>` servido (`core/page/serve.ts`, feature 69) chama `productHead`', () => {
    expect(chama(SERVE_PAGE.fonte, 'productHead')).toBe(true)
  })

  it('nenhuma edge function volta a ser um segundo escritor do `<head>` servido (feature 69)', () => {
    // O escritor servido é UM: `servePage`. Uma function que chamasse `productHead` seria o par que a
    // `69` desfez — dois `<head>` da mesma página, divergindo sem nada quebrar (o defeito 01).
    const functions = producao.filter(a => a.rel.startsWith('supabase/functions/'))
    expect(functions.length).toBeGreaterThan(20) // âncora: a varredura alcança as functions
    expect(functions.filter(a => chama(a.fonte, 'productHead')).map(a => a.rel)).toEqual([])
    expect(varridos.filter(a => a.rel.startsWith('supabase/functions/product-page/'))).toEqual([])
  })

  it('o card da vitrine chama `variantPath`', () => {
    expect(chama(cita('apps/store/src/entities/product/ui/ProductCard.tsx').fonte, 'variantPath')).toBe(true)
  })

  it('o gerador do sitemap chama `indexableOptions`', () => {
    expect(chama(SITEMAP_URLS.fonte, 'indexableOptions')).toBe(true)
  })
})

describe('sensores — a régua acusa o defeito e não acusa o conserto', () => {
  it('(a) a montagem antiga do card é acusada, nas duas formas de juntar', () => {
    expect(
      REGUA_PARAMETRO_A_MAO.test(
        'const destino = `${productPath(product.slug)}?variant=${encodeURIComponent(publicVariantId(v))}`',
      ),
    ).toBe(true)
    expect(REGUA_PARAMETRO_A_MAO.test("const d = productPath(slug) + '?variant=' + id")).toBe(true)
  })

  it('(a) sensor inverso — o construtor, e um literal sem expressão, não são acusados', () => {
    expect(REGUA_PARAMETRO_A_MAO.test('const destino = variantPath(product, v)')).toBe(false)
    expect(REGUA_PARAMETRO_A_MAO.test("const exemplo = '/produtos/pata?variant=1004'")).toBe(false)
    expect(REGUA_PARAMETRO_A_MAO.test("searchParams.get('variant')")).toBe(false)
  })

  it('(b) a chamada é acusada; o nome sem chamada e a função vizinha, não', () => {
    expect(REGUA_MARCA.test('const t = brandedTitle(`${nome} — ${texto}`)')).toBe(true)
    expect(REGUA_MARCA.test('seo.brandedTitle (titulo)')).toBe(true)
    expect(REGUA_MARCA.test("import { brandedTitle } from '@estrelinha/core/seo'")).toBe(false)
    expect(REGUA_MARCA.test('notBrandedTitle(x)')).toBe(false)
  })

  it('(c) a composição de SVR-08 é acusada, em template e em concatenação', () => {
    expect(REGUA_TITULO_DE_OPCAO.test('const t = `${product.name} — ${option.text}`')).toBe(true)
    expect(REGUA_TITULO_DE_OPCAO.test('document.title = `${nome} — ${texto}`')).toBe(true)
    expect(REGUA_TITULO_DE_OPCAO.test("const t = product.name + ' — ' + option.text")).toBe(true)
  })

  it('(c) sensor inverso — a copy de travessão que já existe NÃO é acusada', () => {
    // As formas medidas em 2026-10-19 nos dois apps, uma por arquivo.
    expect(REGUA_TITULO_DE_OPCAO.test('`Sugestão: ${nomes.get(s.value_id) ?? \'\'} — ${motivo(s)}`')).toBe(false)
    expect(REGUA_TITULO_DE_OPCAO.test('`Sugestão: ${v.name} — ${daquele.map(suggestionReason).join(\' · \')}`')).toBe(false)
    expect(REGUA_TITULO_DE_OPCAO.test('`Filtros da loja › ${grupo.name} — marque as peças deste valor.`')).toBe(false)
    expect(REGUA_TITULO_DE_OPCAO.test('{unavailable ? `${value} — indisponível` : value}')).toBe(false)
    expect(REGUA_TITULO_DE_OPCAO.test('`Cupom ${code} aplicado — ${effect}`')).toBe(false)
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada, o USO é (CRLF e LF)', () => {
    const acusa = (fonte: string) => REGUA_PARAMETRO_A_MAO.test(semComentarios(fonte))
    expect(acusa('// antes: `${productPath(slug)}?variant=${id}`\nconst x = variantPath(p, v)')).toBe(false)
    expect(acusa('/* o card montava ?variant=${id} à mão */\r\nconst x = 1')).toBe(false)
    expect(acusa('// nota\r\nconst d = `${base}?variant=${id}`')).toBe(true)
    expect(acusa('// nota\nconst d = `${base}?variant=${id}`')).toBe(true)
  })

  it('sensor do glob de dois asteriscos — o comentário de linha não cega a varredura (`BL-027`)', () => {
    const fonte = [
      '// varre apps/** e supabase/functions/** daqui para baixo',
      'const d = `${base}?variant=${id}`',
      '/* um bloco de verdade, mais abaixo */',
      'const u = 2',
    ].join('\n')
    expect(REGUA_PARAMETRO_A_MAO.test(semComentarios(fonte))).toBe(true)
  })

  it('o recorte de produção: o MESMO texto num arquivo de produção é acusado, num de teste não entra', () => {
    const forma = 'const d = `${productPath(slug)}?variant=${id}`'
    const prod: Arquivo = { rel: 'apps/store/src/pages/QualquerPagina.tsx', fonte: forma }
    const teste: Arquivo = { rel: 'apps/store/src/pages/__tests__/QualquerPagina.test.tsx', fonte: forma }
    expect(procurar(REGUA_PARAMETRO_A_MAO, [prod, teste].filter(a => !ehTeste(a.rel)))).toHaveLength(1)
    expect(ehTeste(teste.rel)).toBe(true)
    expect(ehTeste(prod.rel)).toBe(false)
  })

  it('sensor — a positiva reconhece a chamada, e `productHeadTags(` não passa por `productHead(`', () => {
    expect(chama('const h = productHead(entrada, p)', 'productHead')).toBe(true)
    expect(chama('const html = productHeadTags(shell, head)', 'productHead')).toBe(false)
    expect(chama("import { productHead } from '@estrelinha/core/seo'", 'productHead')).toBe(false)
  })

  it('sensor — um arquivo fora da varredura derruba a régua em vez de passar', () => {
    expect(() => cita('apps/store/src/pages/PaginaQueNaoExiste.tsx')).toThrow(/fora da varredura/)
  })
})
