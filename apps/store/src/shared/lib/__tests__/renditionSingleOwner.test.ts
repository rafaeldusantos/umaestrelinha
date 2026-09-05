import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * A URL de imagem em tamanho de exibição tem UM dono, e este guarda é o que mantém isso verdadeiro
 * — `PRF-15`.
 *
 * Oito superfícies da loja perguntam a mesma coisa: "qual a URL desta foto no tamanho desta vaga?".
 * Antes da feature 38 nenhuma perguntava — todas serviam o original de 1024px, inclusive em vagas de
 * 40px. Hoje quem responde é `renditionUrl` / `renditionSrcSet`
 * (`packages/core/src/media/rendition.ts`).
 *
 * **Sem este guarda, a nona superfície nasce montando a query à mão**, e nada quebra: o build passa,
 * o `tsc` passa, o teste de componente passa. O sintoma não é erro — é lentidão, e conta de
 * transformação. Foi exatamente assim que `free_shipping_threshold` ganhou sete leitores.
 *
 * ÂNCORA DUPLA: a varredura prova que leu arquivos **e** que a régua encontra o caminho legítimo.
 * Só contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um caminho
 * errado. As duas juntas é que fecham.
 *
 * A régua nunca é o objeto medido: o escopo e o allowlist estão escritos **literalmente** aqui, e
 * não derivados de constante que `rendition.ts` exporte — lição da `fieldBorder`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * Escopo literal: as duas pontas que têm tela, **e** o pacote onde o dono mora.
 *
 * `packages` entra porque sem ele o allowlist viraria letra morta — o único endereço autorizado
 * está lá, e um allowlist que não casa nada aprova por vacuidade.
 */
const ESCOPO = ['apps', 'packages']

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
  /** As linhas **sem comentário**. É sobre estas que a régua roda. */
  linhas: string[]
}

/**
 * Remove comentários preservando a NUMERAÇÃO das linhas.
 *
 * Sem isto o guarda casa a prosa que explica o defeito — e o conserto vira "edite o comentário", não
 * "conserte o código". Os comentários desta feature citam `render/image` e `width=` de propósito.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    // CRLF NORMALIZADO PRIMEIRO, e isto não é higiene — é correção.
    //
    // Em JavaScript `.` **não casa `\r`** (é terminador de linha, como `\n`), e `$` sem a flag `m`
    // não ancora antes dele. Num checkout Windows — que é a plataforma deste projeto — a linha
    // `// comentário\r` faz `/\/\/.*$/` não casar NADA, e nenhum comentário de linha é removido.
    .replace(/\r\n/g, '\n')
    // Bloco: troca o miolo por espaços, preservando as quebras — o índice de cada linha não desliza.
    .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, ' '))
    .split('\n')
    // `[^:]` ANTES do `//`, e isto é a diferença entre um guarda e um guarda inerte.
    //
    // O molde deste arquivo (`freeShippingSingleOwner`) procura um nome de coluna, que nunca
    // aparece dentro de uma URL. Este procura URL. Com o `/\/\/.*$/` do molde, a linha
    // `const u = 'https://x/storage/v1/render/image/public/a.webp'` perdia tudo a partir do
    // `https://` — o defeito que este guarda existe para pegar era apagado pelo próprio guarda,
    // em silêncio, e a suíte ficava verde para sempre. Medido por injeção de falha ao escrever
    // este arquivo: a linha injetada NÃO reprovava.
    .map((linha) => linha.replace(/(^|[^:])\/\/.*$/, '$1'))

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

const procurar = (padrao: RegExp, alvo: Arquivo[] = producao): Ocorrencia[] => {
  const achados: Ocorrencia[] = []
  for (const { rel, linhas } of alvo) {
    linhas.forEach((texto, i) => {
      // `lastIndex` não persiste porque os padrões abaixo não usam a flag `g`.
      if (padrao.test(texto)) achados.push({ arquivo: rel, linha: i + 1, texto: texto.trim() })
    })
  }
  return achados
}

/**
 * A forma de quem monta a URL de rendição à mão.
 *
 * `render/image` é o endpoint; `?width=` / `&width=` e `quality=` são a query que ele exige. Quem
 * escreve qualquer um dos três está reimplementando `renditionUrl`.
 */
const URL_A_MAO = /render\/image|[?&]width=|quality=/

/**
 * `srcSet` recebendo uma STRING LITERAL com descritor de largura.
 *
 * É a segunda forma do mesmo defeito: em vez de montar a URL à mão, crava-se a lista inteira no
 * JSX. O `srcset` continua certo no dia em que foi escrito e envelhece sozinho.
 */
const SRCSET_A_MAO = /srcSet\s*=\s*\{?\s*['"`][^'"`]*\d+w/

/** O caminho legítimo. Se ele sumir da varredura, o extrator está quebrado — não o código. */
const HELPER = /renditionUrl\(|renditionSrcSet\(/

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('rendition — âncoras da varredura', () => {
  it('a varredura enxerga os dois apps E os pacotes', () => {
    // Caminho errado varre zero arquivo e faz TODA asserção abaixo passar por vacuidade.
    expect(varridos.length).toBeGreaterThan(400)
    expect(varridos.some((a) => a.rel.startsWith('apps/store/src/'))).toBe(true)
    expect(varridos.some((a) => a.rel.startsWith('apps/backoffice/src/'))).toBe(true)
    expect(varridos.some((a) => a.rel.startsWith('packages/core/src/'))).toBe(true)
  })

  it('a varredura separa produção de teste, e sobra produção de verdade', () => {
    expect(producao.length).toBeGreaterThan(200)
    expect(producao.some((a) => a.rel.endsWith('.test.ts'))).toBe(false)
    expect(producao.some((a) => a.rel.endsWith('.test.tsx'))).toBe(false)
    expect(producao.some((a) => a.rel.includes('__tests__/'))).toBe(false)
  })

  it('a régua ENCONTRA o caminho legítimo — âncora de ocorrência', () => {
    // A segunda metade da âncora dupla. Sem ela, um recorte errado varreria zero arquivo de
    // vitrine e as asserções de ausência passariam sozinhas, para sempre.
    const legitimos = procurar(HELPER)
    expect(legitimos.length).toBeGreaterThanOrEqual(6)
    // E as superfícies que mais importam estão entre elas: a vitrine e a galeria do produto.
    const arquivos = new Set(legitimos.map((o) => o.arquivo))
    expect(arquivos.has('apps/store/src/entities/product/ui/ProductCard.tsx')).toBe(true)
    expect(arquivos.has('apps/store/src/entities/product/ui/ProductGallery.tsx')).toBe(true)
  })

  it('comentário é REMOVIDO, com CRLF e com LF — sensor do stripper', () => {
    // Os comentários desta feature citam `render/image` e `width=` para explicar a regra. Sem o
    // stripper, o guarda acusaria a própria explicação, e o conserto "óbvio" seria apagá-la.
    const crlf = semComentarios('const a = 1\r\n// monta ?width=360&quality=75 aqui\r\nconst b = 2\r\n')
    const lf = semComentarios('const a = 1\n// monta ?width=360&quality=75 aqui\nconst b = 2\n')
    const bloco = semComentarios('const a = 1\r\n/**\r\n * render/image e ?width=\r\n */\r\nconst b = 2\r\n')

    for (const linhas of [crlf, lf, bloco]) {
      expect(linhas.some((l) => URL_A_MAO.test(l))).toBe(false)
      // E o código em volta sobrevive — um stripper que apagasse tudo passaria no teste acima.
      expect(linhas.some((l) => l.includes('const a = 1'))).toBe(true)
      expect(linhas.some((l) => l.includes('const b = 2'))).toBe(true)
    }

    // A numeração não desliza: o bloco de 5 linhas continua com 5 linhas (+ a final vazia).
    expect(bloco).toHaveLength(6)
  })

  it('o `//` de uma URL NÃO é comentário — sensor do defeito que este guarda quase teve', () => {
    // Achado por injeção de falha: com o stripper do molde, a linha abaixo perdia tudo a partir de
    // `https://`, e a URL montada à mão — que é exatamente o que este guarda procura — sumia antes
    // de a régua rodar. Guarda inerte é pior que guarda nenhum: ele dá a impressão de cobertura.
    const url = "const u = 'https://x.supabase.co/storage/v1/render/image/public/a.webp?width=360'"
    const [linha] = semComentarios(url)

    expect(linha).toContain('render/image')
    expect(URL_A_MAO.test(linha)).toBe(true)

    // E o comentário no FIM de uma linha com URL continua sendo removido — a correção não pode
    // custar a propriedade original.
    const [mista] = semComentarios("const u = 'https://x/a.webp' // ?width=360&quality=75 aqui")
    expect(mista).toContain('https://x/a.webp')
    expect(URL_A_MAO.test(mista)).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra
// ───────────────────────────────────────────────────────────────────────────

/**
 * Exatamente UM arquivo pode escrever a URL de rendição: o **dono dela**.
 *
 * A lista existe para forçar quem quiser crescê-la a justificar por escrito, não para amansar a
 * varredura. Uma tela que "precisa" montar a URL não precisa: precisa de `renditionUrl`.
 */
const ALLOWLIST: Record<string, string> = {
  'packages/core/src/media/rendition.ts':
    'O dono. É ele quem troca `/object/public/` por `/render/image/public/` e escreve `width` e `quality` — e é por isso que ele não tem import nenhum: a edge function `product-page` o consome por caminho relativo.',
}

describe('ninguém monta a URL de rendição à mão (PRF-15)', () => {
  const escritas = procurar(URL_A_MAO)

  it('toda escrita está no allowlist, com motivo', () => {
    const foraDaLista = escritas.filter(
      (o) => !Object.prototype.hasOwnProperty.call(ALLOWLIST, o.arquivo),
    )
    expect(
      foraDaLista.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'peça a URL por `renditionUrl` / `renditionSrcSet` (@estrelinha/core/media) em vez de montá-la',
    ).toEqual([])
  })

  it('o allowlist ainda casa — se ele parar de casar, o teste reprova em vez de aprovar vazio', () => {
    // Sem esta asserção, renomear o módulo faria o allowlist virar letra morta e o guarda passaria
    // a aprovar por vacuidade.
    for (const arquivo of Object.keys(ALLOWLIST)) {
      expect(
        escritas.some((o) => o.arquivo === arquivo),
        `${arquivo} está no allowlist mas não monta mais a URL — remova a entrada`,
      ).toBe(true)
    }
  })

  it('o allowlist é FECHADO — UM endereço, escrito literalmente', () => {
    // Cada entrada é uma superfície a mais que pode divergir. Acrescentar uma exige mexer aqui, o
    // que é exatamente o ponto.
    expect(Object.keys(ALLOWLIST)).toEqual(['packages/core/src/media/rendition.ts'])
  })

  it('nenhuma entrada do allowlist é tela de vitrine, de galeria ou de checkout', () => {
    // Onde o defeito nasceria: `widgets/`, `features/`, `entities/`, `pages/`. Um arquivo desses
    // no allowlist seria o segundo dono com autorização por escrito.
    const telas = Object.keys(ALLOWLIST).filter((a) => /^apps\/.+\/src\//.test(a))
    expect(telas).toEqual([])
  })

  it('a régua DE FATO pegaria a URL montada à mão — sensor por mutação', () => {
    // Sem este sensor, um regex quebrado faria as asserções acima passar para sempre.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        "const url = base.replace('/object/public/', '/render/image/public/')",
        'const thumb = `${src}?width=160&quality=75`',
        "const grande = src + '&width=720'",
        "<img src={`${u}?quality=75`} />",
      ],
    }
    expect(procurar(URL_A_MAO, [sintetico])).toHaveLength(4)
  })

  it('a régua NÃO acusa a chamada legítima nem o `sizes` da vaga', () => {
    // O par do sensor acima: uma régua que casasse tudo seria tão inútil quanto uma que não casa
    // nada, e reprovaria o código correto. `min-width:` do `sizes` é a armadilha óbvia.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        'src={renditionUrl(imagemEmDestaque, 480)}',
        'srcSet={renditionSrcSet(imagemEmDestaque) || undefined}',
        'sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"',
        'sizes="(min-width: 768px) 25vw, 220px"',
      ],
    }
    expect(procurar(URL_A_MAO, [sintetico])).toEqual([])
  })
})

describe('nenhuma largura de `srcset` cravada em JSX (PRF-15)', () => {
  it('nenhum `srcSet` recebe string literal com descritor de largura', () => {
    // A lista de larguras tem um dono só (`RENDITION_WIDTHS`). Cravada no JSX, ela envelhece
    // sozinha — e o `srcset` continua sintaticamente válido enquanto aponta para o tamanho errado.
    const cravados = procurar(SRCSET_A_MAO)
    expect(cravados.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`)).toEqual([])
  })

  it('a régua DE FATO pegaria uma lista cravada — sensor por mutação', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        "srcSet={'https://x/a.webp 360w, https://x/b.webp 720w'}",
        'srcSet="https://x/a.webp 480w"',
        'srcSet={`${u} 360w, ${v} 720w`}',
      ],
    }
    expect(procurar(SRCSET_A_MAO, [sintetico])).toHaveLength(3)
  })

  it('a régua NÃO acusa o `srcSet` que vem do helper', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        'srcSet={renditionSrcSet(src) || undefined}',
        'srcSet={renditionSrcSet(product.image_url, [160, 320]) || undefined}',
      ],
    }
    expect(procurar(SRCSET_A_MAO, [sintetico])).toEqual([])
  })
})

/**
 * A comparação de posição decidindo `eager`/`lazy` no lugar de `imagePriority`.
 *
 * A régua é o CRUZAMENTO das duas coisas — uma comparação de índice **na mesma linha** que a dica
 * de carregamento. `index < 0` sozinho é aritmética de lista comum, e existe em telas que nada têm
 * a ver com imagem; o que não pode voltar é a decisão de prioridade tomada fora do dono.
 */
const PRIORIDADE_A_MAO =
  /(index|indice|\bi)\s*<\s*\d[^\n]*(eager|lazy|fetchpriority)|(eager|lazy|fetchpriority)[^\n]*(index|indice|\bi)\s*<\s*\d/i

describe('a prioridade do LCP também tem um dono (PRF-03 AC 4)', () => {
  it('as superfícies de listagem decidem por `imagePriority`, e não por `index < 6`', () => {
    // A régua repetida em seis vitrines é o "defeito 01" outra vez: a sétima nasce sem ela e nada
    // acusa. O número 6 mora em `EAGER_IMAGE_COUNT`, num lugar só.
    const comparacoes = procurar(PRIORIDADE_A_MAO)
    expect(comparacoes.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`)).toEqual([])
  })

  it('a régua DE FATO pegaria a comparação de volta — sensor por mutação', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        "loading={index < 6 ? 'eager' : 'lazy'}",
        'const eager = i < 6',
        "fetchpriority={indice < 1 ? 'high' : undefined}",
      ],
    }
    expect(procurar(PRIORIDADE_A_MAO, [sintetico])).toHaveLength(3)
  })

  it('a régua NÃO acusa aritmética de lista comum nem a dica vinda do dono', () => {
    // O par do sensor: `index < 0` é busca que não achou. Uma régua que o acusasse seria
    // abandonada na primeira semana, e uma régua abandonada não guarda nada.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.tsx',
      linhas: [
        'if (index < 0) return [...views, view]',
        'loading={prioridade.loading}',
        '{...dicaLcp}',
      ],
    }
    expect(procurar(PRIORIDADE_A_MAO, [sintetico])).toEqual([])
  })
})
