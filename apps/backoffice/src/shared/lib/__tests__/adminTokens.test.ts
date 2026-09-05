import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contrastRatio, mixOver } from '@estrelinha/core/color'

/**
 * `PED-02` / `PED-03` — o guarda dos tokens `--estrelinha-admin-*`.
 *
 * ---------------------------------------------------------------------------------------------
 * O DEFEITO QUE ELE EXISTE PARA IMPEDIR
 * ---------------------------------------------------------------------------------------------
 * `MaterialStatusBadge.tsx` pintava dois dos quatro estados do material com
 * `bg-estrelinha-admin-amber/10` e `bg-estrelinha-admin-emerald/10`. **Nenhum dos dois tokens
 * existia** — nem em `styles.css`, nem no mapa `estrelinha-admin` do preset. O Tailwind não emite
 * classe para token inexistente: as classes simplesmente não existiam no CSS, e os dois selos
 * saíam sem fundo, sem borda e com a cor herdada.
 *
 * Nada acusou. Build passa (não checa tipo nem CSS), `tsc` passa (é string), teste de componente
 * passa (o `className` está lá, com o texto certo). **É o defeito da identidade em estado puro**:
 * errar nele não quebra nada, e quem descobre é quem olha a tela.
 *
 * **Acrescentar os dois tokens não conserta a classe de defeito** — a próxima classe inventada
 * falha do mesmo jeito e do mesmo jeito silencioso. O que fecha o buraco é este arquivo.
 *
 * ---------------------------------------------------------------------------------------------
 * QUAL É A RÉGUA, E POR QUE NÃO É A UNIÃO DOS DOIS ARQUIVOS
 * ---------------------------------------------------------------------------------------------
 * O conjunto de classes válidas são as **CHAVES DO MAPA `estrelinha-admin` DO PRESET**, e só elas.
 * Não é a união com os nomes das variáveis CSS, e a diferença não é acadêmica:
 *
 *   - o preset mapeia a chave `muted` → `var(--estrelinha-admin-text-muted)`;
 *   - logo `text-estrelinha-admin-muted` é uma classe VÁLIDA;
 *   - e `text-estrelinha-admin-text-muted` **não é** — o Tailwind não emite nada para ela.
 *
 * Uma régua que unisse os dois arquivos aprovaria a segunda, que é justamente a forma que alguém
 * escreve ao ler o `styles.css` em vez do preset. A paridade preset→`styles.css` é asserida
 * separadamente, logo abaixo.
 *
 * ---------------------------------------------------------------------------------------------
 * AS DUAS PROPRIEDADES QUE UM GUARDA DESTE TIPO PRECISA TER
 * ---------------------------------------------------------------------------------------------
 * **Âncora dupla** — nº de arquivos varridos E nº de classes encontradas, com piso. Sem elas, um
 * caminho errado varre zero arquivo e o teste passa calado, que é a pior falha possível aqui.
 *
 * **A régua nunca é o objeto medido** — os diretórios são escritos literalmente, como no
 * `brandScan`, e não iterados de uma constante que também poderia estar errada.
 */

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(AQUI, '../../../../../..')

const PRESET = resolve(RAIZ, 'packages/ui/tailwind.preset.ts')
const STYLES = resolve(RAIZ, 'packages/ui/src/styles.css')

/**
 * O diretório varrido, escrito **literalmente**.
 *
 * Não sai de `process.cwd()` nem de constante de config: a régua não pode ser o objeto medido.
 */
const FONTE_DO_PAINEL = resolve(RAIZ, 'apps/backoffice/src')

/** Este arquivo se exclui da varredura — ele carrega o sensor, que é uma classe inexistente de propósito. */
const ESTE_ARQUIVO = 'adminTokens.test.ts'

// -------------------------------------------------------------------------------------------
// Leitura dos dois arquivos de token
// -------------------------------------------------------------------------------------------

/** As chaves do mapa `estrelinha-admin` do preset → o valor declarado (hex literal ou `var(...)`). */
function chavesDoPreset(): Record<string, string> {
  const fonte = readFileSync(PRESET, 'utf8')

  const bloco = fonte.match(/"estrelinha-admin":\s*\{([\s\S]*?)\n\s*\},/)
  if (!bloco) throw new Error('`tailwind.preset.ts` não declara o mapa `"estrelinha-admin"`')

  const chaves: Record<string, string> = {}
  for (const m of bloco[1].matchAll(/(?:"([a-z-]+)"|([a-z]+)):\s*"([^"]+)"/g)) {
    chaves[m[1] ?? m[2]] = m[3]
  }

  return chaves
}

function trechoDoBloco(bloco: ':root' | '.dark'): string {
  const css = readFileSync(STYLES, 'utf8')

  const inicio = css.indexOf(bloco === ':root' ? ':root {' : '.dark {')
  if (inicio < 0) throw new Error(`\`styles.css\` não tem o bloco \`${bloco}\``)

  return css.slice(inicio, css.indexOf('\n  }', inicio))
}

/**
 * **Todo** nome `--estrelinha-admin-*` declarado no bloco, seja qual for a forma do valor.
 *
 * Separado do mapa de hexes de propósito: `--estrelinha-admin-border-hover` é `rgba(…)` e
 * `--estrelinha-admin-gradient-cta` é um `linear-gradient(…)`. Os dois **existem** e uma chave do
 * preset pode apontar para eles — a checagem de existência não pode confundir "não é hex" com
 * "não está declarado". Foi este teste que pegou a própria régua estreita demais.
 */
function nomesDeclarados(bloco: ':root' | '.dark'): Set<string> {
  const nomes = new Set<string>()
  for (const m of trechoDoBloco(bloco).matchAll(/--estrelinha-admin-([a-z-]+):/g)) {
    nomes.add(m[1])
  }

  return nomes
}

/** Só os `--estrelinha-admin-*` que são hex — é o que a matemática de contraste sabe ler. */
function varsDoCss(bloco: ':root' | '.dark'): Record<string, string> {
  const found: Record<string, string> = {}
  for (const m of trechoDoBloco(bloco).matchAll(
    /--estrelinha-admin-([a-z-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g,
  )) {
    found[m[1]] = m[2].toUpperCase()
  }

  return found
}

// -------------------------------------------------------------------------------------------
// Varredura do fonte do painel
// -------------------------------------------------------------------------------------------

interface Ocorrencia {
  arquivo: string
  classe: string
}

function varrerPainel(): { arquivos: number; ocorrencias: Ocorrencia[] } {
  const ocorrencias: Ocorrencia[] = []
  let arquivos = 0

  const descer = (dir: string) => {
    for (const entrada of readdirSync(dir)) {
      const caminho = join(dir, entrada)
      if (statSync(caminho).isDirectory()) {
        descer(caminho)
        continue
      }
      if (!/\.(ts|tsx)$/.test(entrada)) continue
      if (entrada === ESTE_ARQUIVO) continue

      arquivos += 1
      const fonte = readFileSync(caminho, 'utf8')
      for (const m of fonte.matchAll(/estrelinha-admin-[a-z-]+/g)) {
        ocorrencias.push({ arquivo: caminho.slice(RAIZ.length + 1), classe: m[0] })
      }
    }
  }

  descer(FONTE_DO_PAINEL)
  return { arquivos, ocorrencias }
}

/**
 * A classificação, isolada da varredura **de propósito**: é ela que o sensor exercita.
 *
 * Um sensor que rodasse a varredura inteira sobre um fixture no disco provaria a leitura de
 * arquivo, não a régua. O que precisa ser provado é que uma classe inexistente **reprova**.
 */
const classeInvalida = (classe: string, validas: Set<string>): boolean =>
  !validas.has(classe.replace(/^estrelinha-admin-/, ''))

// -------------------------------------------------------------------------------------------

describe('tokens do painel — toda classe `estrelinha-admin-*` aponta para um token que existe', () => {
  const preset = chavesDoPreset()
  const validas = new Set(Object.keys(preset))
  const { arquivos, ocorrencias } = varrerPainel()

  it('a leitura do preset encontrou o mapa inteiro', () => {
    // Âncora: uma regex quebrada devolveria `{}` e TODA classe do painel reprovaria — ruidoso, mas
    // pelo menos barulhento. O caso silencioso é o inverso, e é o de baixo.
    expect(Object.keys(preset).length).toBeGreaterThanOrEqual(19)
    expect(validas.has('violet')).toBe(true)
    expect(validas.has('text-secondary')).toBe(true)
  })

  it('a varredura leu o painel de verdade — âncora dupla', () => {
    // Sem estas duas, um caminho errado varre zero arquivo, encontra zero classe, e o teste
    // principal passa em silêncio afirmando que está tudo certo. É a pior falha possível aqui.
    expect(arquivos).toBeGreaterThan(200)
    expect(ocorrencias.length).toBeGreaterThan(80)
  })

  it('nenhuma classe do painel aponta para token inexistente', () => {
    const orfas = ocorrencias
      .filter(o => classeInvalida(o.classe, validas))
      .map(o => `${o.arquivo}: ${o.classe}`)

    expect(orfas).toEqual([])
  })

  it('os dois tokens que faltavam agora existem, e são exatamente os do selo do material', () => {
    // A asserção que a feature 34 abriu. `amber` e `emerald` não estavam em lugar nenhum, e os
    // selos `Aguardando material` e `Material recebido` saíam transparentes.
    expect(validas.has('amber')).toBe(true)
    expect(validas.has('emerald')).toBe(true)

    const usadas = new Set(ocorrencias.map(o => o.classe))
    expect(usadas.has('estrelinha-admin-amber')).toBe(true)
    expect(usadas.has('estrelinha-admin-emerald')).toBe(true)
  })
})

describe('sensor — a régua reprova de verdade', () => {
  const validas = new Set(Object.keys(chavesDoPreset()))

  it('uma classe sabidamente inexistente reprova na MESMA régua', () => {
    // Montada por concatenação para que a varredura acima nunca a encontre no disco, mesmo que
    // alguém remova a exclusão deste arquivo um dia.
    const inventada = 'estrelinha-admin-' + 'inexistente'

    expect(classeInvalida(inventada, validas)).toBe(true)
  })

  it('a forma que se escreve ao ler o `styles.css` em vez do preset também reprova', () => {
    // `--estrelinha-admin-text-muted` EXISTE no CSS, mas a chave do preset é `muted`. O Tailwind
    // não emite nada para `text-estrelinha-admin-text-muted`. Uma régua feita da união dos dois
    // arquivos aprovaria esta classe — é o motivo de a régua ser só o preset.
    expect(classeInvalida('estrelinha-admin-' + 'text-muted', validas)).toBe(true)
    expect(classeInvalida('estrelinha-admin-muted', validas)).toBe(false)
  })

  it('uma classe legítima passa — senão o sensor acima estaria provando nada', () => {
    expect(classeInvalida('estrelinha-admin-violet', validas)).toBe(false)
  })
})

describe('paridade preset ↔ styles.css', () => {
  const preset = chavesDoPreset()
  const light = varsDoCss(':root')
  const dark = varsDoCss('.dark')
  const declaradasNoLight = nomesDeclarados(':root')

  it('as duas leituras do CSS encontraram os tokens', () => {
    expect(Object.keys(light).length).toBeGreaterThanOrEqual(15)
    expect(Object.keys(dark).length).toBeGreaterThanOrEqual(10)
    expect(declaradasNoLight.size).toBeGreaterThan(Object.keys(light).length)
  })

  it('toda chave que referencia `var(...)` aponta para uma variável declarada no light', () => {
    // Uma chave apontando para variável que não existe é o mesmo defeito com outra roupa: a classe
    // existe, o CSS resolve para vazio, e o elemento sai sem cor.
    //
    // Confere contra os NOMES declarados, não contra os hexes: `border-hover` é `rgba(…)` e existe.
    const quebradas: string[] = []

    for (const [chave, valor] of Object.entries(preset)) {
      const ref = valor.match(/^var\(--estrelinha-admin-([a-z-]+)\)$/)
      if (ref && !declaradasNoLight.has(ref[1])) {
        quebradas.push(`${chave} → --estrelinha-admin-${ref[1]}`)
      }
    }

    expect(quebradas).toEqual([])
  })

  it('`amber` e `emerald` leem a VARIÁVEL, não um hex — senão o dark não acompanha', () => {
    // Os sete acentos antigos (`violet`, `pop`, …) são hex literal aqui E em `styles.css`: dois
    // donos do mesmo valor, que só não divergiu porque nunca mudou. Estes dois MUDAM entre light e
    // dark, e um literal congelaria o valor do light nos dois temas — sem quebrar nada.
    expect(preset.amber).toBe('var(--estrelinha-admin-amber)')
    expect(preset.emerald).toBe('var(--estrelinha-admin-emerald)')

    expect(light.amber).toBeDefined()
    expect(dark.amber).toBeDefined()
    expect(light.emerald).toBeDefined()
    expect(dark.emerald).toBeDefined()
    expect(light.amber).not.toBe(dark.amber)
    expect(light.emerald).not.toBe(dark.emerald)
  })

  it('nenhuma chave com hex literal DIVERGE da variável de mesmo nome', () => {
    // A cópia deliberada dos sete acentos vem com guarda que lê os dois do disco e compara — a
    // consequência 3 do defeito 01 do repositório.
    const divergentes: string[] = []

    for (const [chave, valor] of Object.entries(preset)) {
      if (!valor.startsWith('#')) continue
      const noCss = light[chave]
      if (noCss && noCss !== valor.toUpperCase()) {
        divergentes.push(`${chave}: preset ${valor.toUpperCase()} × styles.css ${noCss}`)
      }
    }

    expect(divergentes).toEqual([])
  })
})

describe('contraste dos tokens de texto do painel (PED-03)', () => {
  const light = varsDoCss(':root')
  const dark = varsDoCss('.dark')

  const PISO = 4.5

  /** Veredito em texto: `expect(2.97).toBeGreaterThanOrEqual(4.5)` não diz qual token nem sobre o quê. */
  const piso = (nome: string, cor: string, fundoNome: string, fundo: string): string => {
    const razao = contrastRatio(cor, fundo)
    return razao >= PISO
      ? `${nome} sobre ${fundoNome}: OK`
      : `${nome} sobre ${fundoNome}: ${razao.toFixed(2)}:1 — abaixo de ${PISO}:1`
  }

  it('os três tokens de texto passam sobre `card` e sobre `bg`, no light', () => {
    for (const token of ['text', 'text-secondary', 'text-muted']) {
      expect(piso(token, light[token], 'card', light.card)).toContain('OK')
      expect(piso(token, light[token], 'bg', light.bg)).toContain('OK')
    }
  })

  it('os três tokens de texto passam sobre `card` e sobre `bg`, no dark', () => {
    // O `text-muted` do dark media 3,92:1 sobre o `card` do dark — o mesmo defeito do light, num
    // tema que ninguém abre para conferir.
    for (const token of ['text', 'text-secondary', 'text-muted']) {
      expect(piso(token, dark[token], 'card', dark.card)).toContain('OK')
      expect(piso(token, dark[token], 'bg', dark.bg)).toContain('OK')
    }
  })

  it('`text-muted` do light não voltou ao #9B8EC4, que media 2,97:1', () => {
    // A asserção nomeia o valor velho porque é ele que alguém reintroduz ao "restaurar a paleta".
    expect(light['text-muted']).not.toBe('#9B8EC4')
    expect(contrastRatio(light['text-muted'], light.card)).toBeGreaterThanOrEqual(PISO)
  })

  it('`text-muted` continua MAIS FRACO que `text-secondary` — o piso não pode comer a hierarquia', () => {
    // Sem esta, a correção de contraste "passa" empurrando muted para cima até virar secondary, e
    // a tela perde o degrau que justifica os dois tokens existirem.
    for (const tema of [light, dark]) {
      const razaoMuted = contrastRatio(tema['text-muted'], tema.card)
      const razaoSecondary = contrastRatio(tema['text-secondary'], tema.card)
      expect(razaoMuted).toBeLessThan(razaoSecondary)
    }
  })
})

describe('contraste dos selos do material (PED-01)', () => {
  const light = varsDoCss(':root')
  const dark = varsDoCss('.dark')

  /**
   * O fundo real do texto de um selo `bg-<token>/10 text-<token>` **não é o card**: é o próprio
   * token a 10% sobre o card. Medir contra o card puro superestima — e foi exatamente assim que a
   * prancha declarou `#B45309` aprovado (5,02:1 sobre branco) quando o fundo real dá 4,39:1.
   */
  const piorCaso = (cor: string, fundos: string[]): number =>
    Math.min(...fundos.flatMap(f => [contrastRatio(cor, f), contrastRatio(cor, mixOver(cor, f, 0.1))]))

  it('âmbar e esmeralda passam 4,5:1 sobre o PRÓPRIO fundo de 10%, no light', () => {
    const fundos = [light.card, light.bg]

    expect({
      amber: piorCaso(light.amber, fundos).toFixed(2),
      emerald: piorCaso(light.emerald, fundos).toFixed(2),
    }).toEqual({
      amber: expect.stringMatching(/^(4\.[5-9]|[5-9]|1[0-9])/),
      emerald: expect.stringMatching(/^(4\.[5-9]|[5-9]|1[0-9])/),
    })

    expect(piorCaso(light.amber, fundos)).toBeGreaterThanOrEqual(4.5)
    expect(piorCaso(light.emerald, fundos)).toBeGreaterThanOrEqual(4.5)
  })

  it('âmbar e esmeralda passam 4,5:1 sobre o próprio fundo de 10%, no dark', () => {
    const fundos = [dark.card, dark.bg]

    expect(piorCaso(dark.amber, fundos)).toBeGreaterThanOrEqual(4.5)
    expect(piorCaso(dark.emerald, fundos)).toBeGreaterThanOrEqual(4.5)
  })

  it('o `#B45309` da prancha REPROVA nesta régua — o sensor da medida do selo', () => {
    // Sem este caso, a régua acima poderia estar medindo contra o card puro e ninguém saberia. Ele
    // fixa a diferença: o hex proposto passa contra branco e falha contra o fundo que o selo pinta.
    expect(contrastRatio('#B45309', '#FFFFFF')).toBeGreaterThan(4.5)
    expect(contrastRatio('#B45309', mixOver('#B45309', '#FFFFFF', 0.1))).toBeLessThan(4.5)
  })

  it('violeta continua servindo ao terceiro selo — a régua vale para os quatro estados', () => {
    expect(piorCaso(light.violet, [light.card, light.bg])).toBeGreaterThanOrEqual(4.5)
  })
})
