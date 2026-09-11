import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * **A página do produto não fala mais de material afetivo** — nem na coluna de informação, nem na
 * barra fixa do celular.
 *
 * O card "Esta joia é feita com material seu" nomeava `material_kinds`, e `material_kinds` **diz
 * menos que a descrição** (`BL-015`): há peça gravada com `{cinzas}` cuja descrição enumera cinco
 * materiais, há peça com `requires_material = false` cuja descrição manda enviar coto e cabelo, e há
 * material citado na descrição (`sangue`) que nem existe no enum. Anunciar um material só, na tela
 * onde a cliente decide a compra, é dizer errado — e num registro memorial isso não é detalhe de
 * copy.
 *
 * A coluna continua existindo e continua sendo lida em outros lugares: o checkout a congela no
 * `order_items`, a confirmação diz o que enviar, e o painel a mostra na fila de material. O que saiu
 * foi **a página do produto**, e este guarda é o que mantém isso verdadeiro.
 *
 * **Sem ele a volta é trivial e silenciosa**: um `<MaterialNotice>` novo, ou um `materialKindsOf`
 * dentro de `ProductDetailsAccordion`, e a suíte inteira continua verde — nenhum teste de componente
 * assere a ausência de algo que nunca existiu no arquivo dele.
 *
 * ÂNCORA DUPLA: a varredura prova que leu arquivos **e** que a régua encontra o que procura (o
 * sensor). Só contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um
 * caminho errado.
 *
 * A régua nunca é o objeto medido: o escopo está escrito **literalmente** aqui, e não derivado de
 * constante que o código sob teste exporte — lição da `fieldBorder`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/** `apps/store/src` — quatro níveis acima de `entities/product/ui/__tests__`. */
const SRC = resolve(HERE, '../../../..')

/** Escopo literal: as superfícies que a página do produto monta. */
const ESCOPO = ['entities/product/ui', 'widgets/product-buy-bar', 'pages/ProductPage.tsx']

const EXTENSOES = ['.ts', '.tsx']

/** Anda diretório ou arquivo — o escopo tem os dois. */
const caminhar = (alvo: string): string[] => {
  if (!existsSync(alvo)) return []
  if (!statSync(alvo).isDirectory()) {
    return EXTENSOES.some(ext => alvo.endsWith(ext)) ? [alvo] : []
  }
  return readdirSync(alvo, { withFileTypes: true }).flatMap(entry => {
    const caminho = join(alvo, entry.name)
    if (entry.isDirectory()) return caminhar(caminho)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [caminho] : []
  })
}

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

/**
 * Remove comentários preservando a NUMERAÇÃO das linhas — mesma função de
 * `freeShippingSingleOwner.test.ts`, e pela mesma razão.
 *
 * Aqui ela não é precaução teórica: `ProductInfo.tsx` e `ProductBuyBar.tsx` **explicam por escrito**
 * que o material saiu dali, e as duas frases citam o nome da coluna. Sem a remoção, o guarda
 * acusaria a prosa que explica a regra, e o conserto viraria "apague o comentário".
 *
 * CRLF normalizado PRIMEIRO: em JavaScript o ponto não casa `\r`, e num checkout Windows — que é a
 * plataforma deste projeto — nenhum comentário de linha seria removido. `ProductBuyBar.tsx` é CRLF
 * de verdade no disco, então isto é exercitado a cada execução.
 *
 * Linha e bloco na MESMA varredura (`BL-027`): em duas passadas, um comentário de linha que cite um
 * glob de dois asteriscos abre um bloco para a régua de bloco, que apaga até o próximo fecha-bloco —
 * inclusive CÓDIGO. Num guarda cuja asserção é uma ausência, isso não reprova: aprova em silêncio.
 */
export const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, trecho => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

interface Arquivo {
  rel: string
  /** As linhas **sem comentário**. É sobre estas que a régua roda. */
  linhas: string[]
}

const varridos: Arquivo[] = ESCOPO.flatMap(alvo => caminhar(join(SRC, alvo))).map(caminho => ({
  rel: relative(SRC, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

const producao = varridos.filter(a => !eTeste(a.rel))

/**
 * A régua, como PREDICADO — para a asserção e o sensor chamarem a mesma função.
 *
 * Cobre o componente apagado, os leitores de `@estrelinha/core/material` que nomeiam material, e a
 * coluna crua. `engravingLimit` e `DEFAULT_ENGRAVING_MAX_CHARS` **não** entram: gravação é outro
 * dado, e o `MAT-03` continua na página.
 */
export const falaDeMaterial = (linha: string): boolean =>
  /\bMaterialNotice\b|\bmaterial_kinds\b|\bmaterialKindsOf\b|\bmaterialKindLabel\b|\bMATERIAL_KIND_LABELS\b|\bmaterialSummary\b|\brequiresMaterial\b|\bmaterialAnchor\b/.test(
    linha,
  )

const ocorrencias = (): string[] => {
  const achados: string[] = []
  for (const { rel, linhas } of producao) {
    linhas.forEach((texto, i) => {
      if (falaDeMaterial(texto)) achados.push(`${rel}:${i + 1} ${texto.trim()}`)
    })
  }
  return achados
}

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('página do produto sem material afetivo — âncoras', () => {
  it('a varredura enxerga as superfícies da página', () => {
    // Varredura que varre zero arquivo passa em silêncio, que é a pior falha possível aqui.
    expect(producao.length).toBeGreaterThan(12)

    const nomes = producao.map(a => a.rel)
    expect(nomes).toContain('entities/product/ui/ProductInfo.tsx')
    expect(nomes).toContain('widgets/product-buy-bar/ui/ProductBuyBar.tsx')
    expect(nomes).toContain('pages/ProductPage.tsx')
  })

  it('a régua ACUSA as formas que foram removidas — as duas superfícies', () => {
    // Sensor: sem isto, um regex quebrado passaria por "nenhuma ocorrência".
    expect(falaDeMaterial('      <MaterialNotice product={product} />')).toBe(true)
    expect(
      falaDeMaterial('        {exige && <MaterialNotice product={product} variant="bar" />}'),
    ).toBe(true)
    expect(falaDeMaterial('  const kinds = materialKindsOf(product)')).toBe(true)
    expect(falaDeMaterial('  const exige = requiresMaterial(product)')).toBe(true)
    expect(falaDeMaterial('  {product.material_kinds.map(k => k)}')).toBe(true)
  })

  it('a régua NÃO acusa a gravação, que continua na página', () => {
    // O par do sensor acima: régua que acusa tudo é régua que ninguém consegue manter.
    expect(falaDeMaterial("import { engravingLimit } from '@estrelinha/core/material'")).toBe(false)
    expect(falaDeMaterial('      <EngravingField purchase={purchase} />')).toBe(false)
    expect(falaDeMaterial('  const limite = DEFAULT_ENGRAVING_MAX_CHARS')).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra
// ───────────────────────────────────────────────────────────────────────────

describe('página do produto sem material afetivo', () => {
  it('nenhuma superfície da página do produto lê material afetivo', () => {
    expect(ocorrencias()).toEqual([])
  })

  it('`MaterialNotice.tsx` não existe mais', () => {
    // O arquivo inteiro saiu: os dois consumidores dele eram as duas superfícies desta página.
    // Deixá-lo no disco sem consumidor seria a mesma sobra de `deleteSection` na feature 41.
    expect(existsSync(join(SRC, 'entities/product/ui/MaterialNotice.tsx'))).toBe(false)
  })

  it('a remoção de comentário enxerga LF e CRLF, e faz linha e bloco na MESMA passada', () => {
    expect(semComentarios('// material_kinds aqui\nconst a = 1\n')[0].trim()).toBe('')
    expect(semComentarios('// material_kinds aqui\r\nconst a = 1\r\n')[0].trim()).toBe('')
    expect(semComentarios('/* material_kinds\nem bloco */\nconst a = 1\n')[1].trim()).toBe('')

    // `BL-027`: o glob de dois asteriscos dentro de um comentário de LINHA não pode abrir bloco e
    // engolir o código de baixo — é assim que um guarda de ausência aprova em silêncio.
    const comGlob = semComentarios('// varre apps/**/*.tsx\nconst x = materialKindsOf(p)\n')
    expect(comGlob[1]).toContain('materialKindsOf')
  })

  it('o comentário que EXPLICA a remoção não é acusado, e o código seria', () => {
    // Par de sensores no arquivo real: a prosa passa, a linha de código reprovaria.
    const info = producao.find(a => a.rel === 'entities/product/ui/ProductInfo.tsx')
    expect(info).toBeDefined()
    expect(info!.linhas.some(falaDeMaterial)).toBe(false)
    // E a prosa está lá mesmo — sem isto, o caso acima passaria com o comentário apagado.
    expect(readFileSync(join(SRC, 'entities/product/ui/ProductInfo.tsx'), 'utf8')).toContain(
      'material_kinds',
    )
  })
})
