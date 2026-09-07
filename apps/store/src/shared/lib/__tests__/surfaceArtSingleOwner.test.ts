import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * "A arte desta superfície, com recuo para a da outra" tem UM dono — `BNR-22`, `AD-030`.
 *
 * A regra nasceu na feature 39, dentro de `core/menu/banners.ts`, e **já custou uma divergência
 * silenciosa antes de sair de lá**: o painel recalculava o predicado por truthiness da string crua
 * enquanto `core` apara espaço, então um `image_mobile: "   "` fazia a loja reaproveitar a arte do
 * computador **com a tela dizendo que estava tudo certo**. É o "defeito 01" no tamanho de um `||`.
 *
 * A feature 41 levou os consumidores de dois para quatro (os dois banners do menu, os dois do
 * carrossel da Home). Hoje quem responde é `surfaceArt` / `surfaceImage`, em
 * `packages/core/src/media/surfaceArt.ts`.
 *
 * **Sem este guarda, o quinto consumidor nasce escrevendo `a || b` de novo**, e nada quebra: build,
 * `tsc` e teste de componente passam, e a loja volta a ter duas respostas para a mesma pergunta.
 *
 * ÂNCORA DUPLA: a varredura prova que leu arquivos **e** que a régua encontra o que procura. Só
 * contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um caminho
 * errado. As duas juntas é que fecham.
 *
 * A régua nunca é o objeto medido: o escopo e o dono estão escritos **literalmente** aqui, e não
 * derivados de constante que o código sob teste exporte — lição da `fieldBorder`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * Escopo literal: as duas pontas com tela **e** os pacotes.
 *
 * `packages` entra porque sem ele o dono único ficaria fora da varredura — e um guarda que não
 * enxerga o endereço autorizado não consegue provar que ele ainda existe.
 */
const ESCOPO = ['apps', 'packages']

/** O ÚNICO endereço autorizado a escrever a régua, escrito por extenso. */
const DONO = 'packages/core/src/media/surfaceArt.ts'

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some((ext) => entry.name.endsWith(ext)) ? [full] : []
  })

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

interface Arquivo {
  rel: string
  linhas: string[]
}

/**
 * Remove comentários preservando a NUMERAÇÃO das linhas.
 *
 * Escrito no molde já corrigido de `freeShippingSingleOwner` (`BL-027`): **linha e bloco na mesma
 * varredura**, com CRLF normalizado antes. Duas passadas separadas têm um ponto cego — um comentário
 * de linha que cite um glob de dois asteriscos carrega um abre-bloco dentro de si, e a passada de
 * bloco apaga daí até o próximo fecha-bloco do arquivo, **código junto**. Num guarda cuja asserção é
 * uma AUSÊNCIA, isso não reprova: passa a aprovar em silêncio o que estiver lá dentro.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

const varridos: Arquivo[] = ESCOPO.flatMap((d) => arquivos(join(ROOT, d))).map((caminho) => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

/** Só o que a loja e o painel de fato executam — teste pode nomear o que quiser. */
const producao = varridos.filter((a) => !eTeste(a.rel))

interface Ocorrencia {
  arquivo: string
  linha: number
  texto: string
}

/**
 * A expressão continua na linha seguinte?
 *
 * **O furo que a verificação independente achou**: a régua casava por linha, e o recuo escrito à mão
 * com o `||` quebrado passava inteiro — que é exatamente a forma que **o Prettier produz sozinho**
 * quando a expressão não cabe em 100 colunas:
 *
 *     const arte =
 *       banner.image_mobile ||
 *       banner.image_desktop
 *
 * Um guarda que só vê a versão de uma linha guarda o descuido e deixa passar a formatação padrão do
 * projeto — o oposto do que ele existe para fazer.
 *
 * As duas condições são as duas convenções do Prettier: `||` e `??` ficam no **fim** da linha;
 * `?` e `:` de ternário ficam no **começo** da seguinte.
 */
const continua = (atual: string, proxima: string): boolean =>
  /(?:\|\||\?\?|\?|:)\s*$/.test(atual) || /^\s*(?:\|\||\?\?|\?|:)/.test(proxima)

/**
 * As **linhas lógicas**: cada linha física seguida do que ela continua.
 *
 * O número devolvido é o da **primeira** linha, para o relatório continuar apontando `arquivo:linha`.
 * O teto de junção existe para uma cadeia mal formatada não engolir o arquivo inteiro e virar falso
 * positivo por vizinhança.
 */
const TETO_DE_JUNCAO = 6

const linhasLogicas = (linhas: string[]): { texto: string; fim: number }[] =>
  linhas.map((_, i) => {
    let junto = linhas[i]
    let fim = i
    for (let j = i; j < linhas.length - 1 && j - i < TETO_DE_JUNCAO; j += 1) {
      if (!continua(linhas[j], linhas[j + 1])) break
      junto += ' ' + linhas[j + 1].trim()
      fim = j + 1
    }
    return { texto: junto, fim }
  })

const procurar = (padrao: RegExp, alvo: Arquivo[] = producao): Ocorrencia[] => {
  const achados: Ocorrencia[] = []
  for (const { rel, linhas } of alvo) {
    // Uma expressão quebrada casa em várias linhas lógicas sobrepostas (a que começa na primeira, a
    // que começa na segunda…). Reportar todas transformaria **um** defeito em quatro entradas, e o
    // relatório do guarda vale pela precisão do endereço. Fica a primeira, e as sobrepostas somem.
    let coberto = -1
    linhasLogicas(linhas).forEach(({ texto, fim }, i) => {
      if (i <= coberto || !padrao.test(texto)) return
      coberto = fim
      achados.push({ arquivo: rel, linha: i + 1, texto: texto.trim() })
    })
  }
  return achados
}

/**
 * O recuo escrito à mão: **uma arte de CELULAR e uma de COMPUTADOR escolhidas na mesma linha.**
 *
 * A régua exige **uma de cada lado**, e essa precisão não é preciosismo — foi medida. A primeira
 * escrita deste guarda pedia só "dois nomes de arte com um operador entre", e acusou
 * `CollectionFeature.tsx:55`:
 *
 *     const imagem = content.image_url?.trim() || collection.imageUrl
 *
 * que é **outra regra**, legítima e sem relação: "a arte que a dona subiu vence a arte do destino".
 * As duas pontas ali são a mesma superfície. Um guarda que a acusasse seria afrouxado na primeira
 * semana — e régua afrouxada não guarda nada.
 *
 * Os dois pares de nomes que existem hoje: `image_desktop`/`image_mobile` (o banner do menu, em
 * jsonb) e `image_url`/`image_mobile_url` (o slide da Home, em tabela), mais as grafias camelCase
 * que o item resolvido usa.
 *
 * Ler uma arte sozinha continua livre: o mapper precisa, o editor precisa. O que não pode voltar é a
 * **decisão** de qual das duas usar.
 */
const MOBILE = '(?:image_mobile_url|image_mobile|imageMobileUrl)'
const DESKTOP = '(?:image_url|image_desktop|imageUrl)'

/** `||` e `??`. */
const OU = '(?:\\|\\||\\?\\?)'
/**
 * O `?` de um ternário e o `:` dele.
 *
 * `(?![.?])` exclui `?.` (encadeamento opcional) e `??` — sem isso, `item?.image_url` e um `:` de
 * objeto literal na mesma linha virariam falso positivo, e o `<picture>` do carrossel seria acusado.
 */
const TERNARIO = '\\?(?![.?])[^\\n]*:'

/**
 * As quatro formas, e a terceira é a que a primeira escrita da régua deixava passar.
 *
 * `surface === 'mobile' ? b.image_mobile : b.image_desktop` — a condição é a **superfície**, então
 * não há nome de arte antes do `?`. É exatamente como `menuBannerImage` estava escrito antes da
 * feature 41, ou seja: a forma mais provável de o defeito voltar era justamente a que escapava.
 */
/**
 * As formas **sem operador nenhum** — achadas na rodada 2 da verificação.
 *
 * As quatro alternativas acima exigem `||`, `??` ou ternário **entre** os dois nomes, e a junção em
 * linhas lógicas resolveu a quebra de linha, não a ausência de operador. Duas escritas escapavam:
 *
 * - `[a, b].find(Boolean)` — o array literal com as duas artes;
 * - `if (!image) image = item.image_url` — a reatribuição condicional, que é o mesmo recuo em duas
 *   sentenças. A retrorreferência (`\\1`) é o que a torna específica: sem ela, qualquer `if (!x)`
 *   perto de um nome de arte viraria falso positivo, e o mapper legítimo seria acusado.
 */
/**
 * O ponto antes de cada nome **não é decoração** — é o que separa "escolher entre as duas artes" de
 * "listar os nomes dos dois campos".
 *
 * Sem ele a régua acusava `MenuBannerEditor.tsx:103`, que percorre
 * `['badge', 'title', 'subtitle', 'image_desktop', 'image_mobile']` só para apagar campo em branco
 * antes de gravar. É uma lista de **nomes**, não uma decisão — e um guarda que a acusasse mandaria
 * consertar código correto, que é como guarda vira ruído e depois vira allowlist.
 */
const ARRAY_DAS_DUAS = `\\[[^\\]\\n]*(?:\\.${MOBILE}[^\\]\\n]*,[^\\]\\n]*\\.${DESKTOP}|\\.${DESKTOP}[^\\]\\n]*,[^\\]\\n]*\\.${MOBILE})[^\\]\\n]*\\]`
const REATRIBUICAO = `if\\s*\\(\\s*!\\s*(\\w+)\\s*\\)\\s*\\1\\s*=\\s*[^\\n]*(?:${MOBILE}|${DESKTOP})`

const RECUO_A_MAO = new RegExp(
  [
    `${MOBILE}[^\\n]*(?:${OU}|${TERNARIO})[^\\n]*${DESKTOP}`,
    `${DESKTOP}[^\\n]*(?:${OU}|${TERNARIO})[^\\n]*${MOBILE}`,
    `\\?(?![.?])[^\\n]*${MOBILE}[^\\n]*:[^\\n]*${DESKTOP}`,
    `\\?(?![.?])[^\\n]*${DESKTOP}[^\\n]*:[^\\n]*${MOBILE}`,
    ARRAY_DAS_DUAS,
    REATRIBUICAO,
  ].join('|'),
)

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('surfaceArt — âncoras da varredura', () => {
  it('a varredura enxerga os dois escopos', () => {
    expect(varridos.some((a) => a.rel.startsWith('apps/'))).toBe(true)
    expect(varridos.some((a) => a.rel.startsWith('packages/'))).toBe(true)
  })

  it('leu um número plausível de arquivos de produção (âncora 1)', () => {
    // Sem isto, um caminho errado varreria zero, a asserção de ausência passaria, e o guarda estaria
    // aprovando por vacuidade.
    expect(producao.length).toBeGreaterThan(300)
  })

  it('a régua ENCONTRA o que procura — em fonte sintético (âncora 2)', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: ['const arte = banner.image_desktop || banner.image_mobile'],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toHaveLength(1)
  })

  it('o dono único existe, e está no escopo varrido', () => {
    // Um allowlist que não casa nada aprova por vacuidade. Aqui o dono não é allowlist — é o
    // endereço que TEM de conter a régua.
    const dono = varridos.find((a) => a.rel === DONO)
    expect(dono, `${DONO} não foi encontrado`).toBeDefined()
    expect(dono!.linhas.join('\n')).toContain('export const surfaceArt')
    expect(dono!.linhas.join('\n')).toContain('export const surfaceImage')
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra
// ───────────────────────────────────────────────────────────────────────────

describe('ninguém escreve o recuo de arte à mão (BNR-22, AD-030)', () => {
  it('nenhum arquivo de produção fora do dono decide entre as duas artes', () => {
    const foraDoDono = procurar(RECUO_A_MAO).filter((o) => o.arquivo !== DONO)

    expect(
      foraDoDono.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'Alguém voltou a decidir "qual arte esta superfície usa" fora de `surfaceArt`. Essa régua já ' +
        'divergiu uma vez (feature 39): o painel decidia por truthiness da string crua e `core` ' +
        'apara espaço, e um `image_mobile: "   "` fazia a loja reaproveitar a arte do computador ' +
        'enquanto a tela dizia que estava tudo certo. Chame `surfaceArt`/`heroSlideArt`.',
    ).toEqual([])
  })

  it('o dono continua sendo alcançado pelos dois consumidores de `core`', () => {
    // A outra metade da regra: proibir a cópia não basta se o original deixar de ser chamado.
    const menu = varridos.find((a) => a.rel === 'packages/core/src/menu/banners.ts')!
    const carrossel = varridos.find((a) => a.rel === 'packages/core/src/home/carousel.ts')!

    expect(menu.linhas.join('\n')).toContain('surfaceArt')
    expect(carrossel.linhas.join('\n')).toContain('surfaceArt')
  })

  it('SENSOR: a régua pega o `||`, o `??` e o ternário', () => {
    const sintetico: Arquivo = {
      rel: 'apps/backoffice/src/features/sintetico.tsx',
      linhas: [
        'const arte = banner.image_mobile || banner.image_desktop',
        'const arte = item.image_mobile_url ?? item.image_url',
        "const arte = surface === 'mobile' ? b.image_mobile : b.image_desktop",
        'const src = item.imageMobileUrl || item.imageUrl',
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toHaveLength(4)
  })

  it('SENSOR: a régua pega o ternário cuja condição é a SUPERFÍCIE', () => {
    // A forma que a primeira escrita deste guarda deixava passar, e a mais provável de voltar: é
    // literalmente como `menuBannerImage` estava escrito antes da feature 41. Não há nome de arte
    // antes do `?`, então uma régua que exigisse "nome, operador, nome" ficava cega para ela.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        "const arte = surface === 'mobile' ? b.image_mobile : b.image_desktop",
        "texto(surface === 'desktop' ? banner.image_desktop : banner.image_mobile)",
        "const src = dispositivo === 'celular' ? i.imageMobileUrl : i.imageUrl",
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toHaveLength(3)
  })

  it('SENSOR: a régua NÃO acusa leitura simples de uma arte só', () => {
    // O par do sensor acima. Uma régua que acusasse o mapper ou o campo do formulário seria
    // afrouxada na primeira semana — e régua afrouxada não guarda nada.
    const sintetico: Arquivo = {
      rel: 'apps/backoffice/src/features/sintetico.tsx',
      linhas: [
        'image_mobile_url: row.image_mobile_url ?? null,',
        'const { image, imageReused } = heroSlideArt(item, surface)',
        'value={banner.image_mobile ?? ""}',
        'imageUrl: item.image_url?.trim() || null,',
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toEqual([])
  })

  it('SENSOR: a régua NÃO acusa "arte do item vence a do destino" — é OUTRA regra', () => {
    // Achado ao escrever este guarda: `CollectionFeature.tsx:55` faz exatamente isto, e as duas
    // pontas ali são a MESMA superfície. Confundir as duas regras faria o guarda cobrar uma
    // delegação que não existe.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        'const imagem = content.image_url?.trim() || collection.imageUrl',
        'imageUrl: item.image_url?.trim() || categoria.banner_url?.trim() || null,',
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toEqual([])
  })

  it('SENSOR: a régua NÃO acusa objeto literal com as duas artes na mesma linha', () => {
    // O `<picture>` do carrossel monta `{ image_url, image_mobile_url }` numa linha para passar a
    // `heroSlideArt`. Isso é ENTREGAR as duas ao dono, não escolher entre elas.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        '{ image_url: item.imageUrl, image_mobile_url: item.imageMobileUrl },',
        'heroSlideArt({ image_url: i?.imageUrl, image_mobile_url: i?.imageMobileUrl }, surface)',
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toEqual([])
  })

  it('SENSOR: o removedor de comentário funciona com LF e com CRLF', () => {
    // `.` não casa `\r` em JavaScript. Num checkout Windows — que é a plataforma deste projeto —
    // um removedor sem normalização deixaria todo comentário de linha intacto, e o guarda passaria
    // a acusar a prosa que explica a regra.
    const lf = semComentarios('// const x = a.image_desktop || a.image_mobile\nconst y = 1')
    const crlf = semComentarios('// const x = a.image_desktop || a.image_mobile\r\nconst y = 1')

    expect(procurar(RECUO_A_MAO, [{ rel: 'x.ts', linhas: lf }])).toEqual([])
    expect(procurar(RECUO_A_MAO, [{ rel: 'x.ts', linhas: crlf }])).toEqual([])
  })

  it('SENSOR: o `||` QUEBRADO EM LINHAS é pego — é o que o Prettier produz', () => {
    // O furo que a verificação independente achou. A versão de uma linha já era pega; a quebrada,
    // que é a formatação padrão do projeto para expressão longa, passava inteira.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: ['const arte =', '  banner.image_mobile ||', '  banner.image_desktop'],
    }
    const achados = procurar(RECUO_A_MAO, [sintetico])

    expect(achados).toHaveLength(1)
    // Aponta a PRIMEIRA linha da expressão, não a última — é onde quem for consertar precisa olhar.
    expect(achados[0].linha).toBe(2)
  })

  it('SENSOR: o TERNÁRIO quebrado em linhas também é pego', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        "const arte = surface === 'mobile'",
        '  ? b.image_mobile',
        '  : b.image_desktop',
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toHaveLength(1)
  })

  it('SENSOR: linhas vizinhas que NÃO continuam a expressão não são juntadas', () => {
    // O par. Sem o predicado de continuação, duas propriedades vizinhas de um objeto virariam uma
    // linha lógica só e o guarda acusaria todo mapper do projeto.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        '  image_url: row.image_url ?? null,',
        '  image_mobile_url: row.image_mobile_url ?? null,',
        '  alt: row.alt ?? null,',
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toEqual([])
  })

  it('SENSOR: o glob de dois asteriscos num comentário não cega a varredura (BL-027)', () => {
    // O ponto cego que a feature 39 encontrou: `apps/**` dentro de um comentário de LINHA carrega um
    // abre-bloco, e uma passada de bloco separada apagaria daí até o próximo fecha-bloco — código
    // junto. Num guarda de ausência isso não reprova: passa a aprovar em silêncio.
    const linhas = semComentarios(
      ['// varre apps/**/*.ts', 'const arte = b.image_desktop || b.image_mobile', '/* fim */'].join(
        '\n',
      ),
    )
    expect(procurar(RECUO_A_MAO, [{ rel: 'x.ts', linhas }])).toHaveLength(1)
  })
})

describe('o recuo SEM operador (rodada 2 da verificação)', () => {
  it('SENSOR: o array com as duas artes é pego', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        'const arte = [item.image_mobile_url, item.image_url].find(Boolean)',
        'const arte = [b.image_desktop, b.image_mobile].filter(Boolean)[0]',
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toHaveLength(2)
  })

  it('SENSOR: a reatribuição condicional é pega', () => {
    // O mesmo recuo escrito em duas sentenças, sem operador nenhum entre os dois nomes.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        'let image = item.image_mobile_url',
        'if (!image) image = item.image_url',
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toHaveLength(1)
  })

  it('SENSOR: `if (!x)` com OUTRA variável não é acusado', () => {
    // O par, e a razão da retrorreferência: sem ela, todo `if (!algo)` perto de um nome de arte
    // viraria falso positivo — e o mapper legítimo seria o primeiro a cair.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        'if (!categoria) return item.image_url',
        'if (!slug) fallback = produto.image_url',
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toEqual([])
  })

  it('SENSOR: array com UMA arte só não é acusado', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: ['const artes = [item.image_url, categoria.banner_url].filter(Boolean)'],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toEqual([])
  })
})

describe('a régua não acusa LISTA DE NOMES de campo', () => {
  it('SENSOR: percorrer os nomes das colunas para limpar campo vazio é legítimo', () => {
    // Achado ao fechar a rodada 2: `MenuBannerEditor.tsx` faz exatamente isto antes de gravar, e a
    // primeira versão do `ARRAY_DAS_DUAS` o acusava. É uma lista de nomes, não uma decisão.
    const sintetico: Arquivo = {
      rel: 'apps/backoffice/src/features/sintetico.tsx',
      linhas: [
        "for (const chave of ['badge', 'title', 'image_desktop', 'image_mobile'] as const) {",
        "const CAMPOS = ['image_url', 'image_mobile_url'] as const",
      ],
    }
    expect(procurar(RECUO_A_MAO, [sintetico])).toEqual([])
  })
})
