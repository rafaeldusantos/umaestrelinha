// Feature 50 — toda classe que MOVE vem com o par que a desarma (`ANI-05`).
//
// A convenção de movimento deste repositório é CSS, e ela já existe na loja há três features:
// `motion-reduce:transition-none` ao lado da classe de transição, com asserção
// (`Header.tsx:52`, `ProductBuyBar.tsx:114`). O painel não tinha movimento nenhum até aqui e passou
// a ter — o selo `Salvando… → Salvo`, a linha que acende ao ser gravada, a seção que entra e sai da
// lista. **Sem este guarda, a quarta animação nasce sem o par e nada acusa**: build, `tsc` e teste
// de componente passam, e quem paga é quem pediu menos movimento no sistema operacional — que é
// justamente quem sente enjoo ou tem crise com movimento na tela.
//
// Por que a régua **não** é `matchMedia` num componente: a pergunta "esta pessoa pediu menos
// movimento?" teria dois donos — o CSS e o JavaScript —, e as duas respostas divergiriam sem nada
// quebrar. É o "defeito 01" no tamanho de uma media query.
//
// **O escopo é literal, e é estreito de propósito.** Estes são os arquivos de UI que a feature 50
// tocou; o resto do painel carrega ~50 classes de transição de antes dela, sem par nenhum. Ampliar
// a régua para `apps/backoffice/**` é trabalho de uma feature própria (está registrado como dívida
// no `CLAUDE.md` da raiz), e um guarda que nasce reprovando 50 vezes é um guarda que alguém desliga.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

/**
 * Os arquivos sob a régua.
 *
 * Escritos um a um, e não derivados de um glob: a lista É a decisão de escopo, e um glob a
 * esconderia atrás de um padrão que ninguém releria. Arquivo que some daqui tem de sumir junto com
 * o movimento dele — a âncora abaixo exige que todos sejam lidos, então um caminho errado REPROVA
 * em vez de varrer zero e passar em silêncio.
 */
const ARQUIVOS = [
  'shared/ui/FormPageHeader.tsx',
  'pages/admin/AdminHomePage.tsx',
  'pages/admin/AdminMenuPage.tsx',
  'features/home-composition/ui/HomeSectionList.tsx',
  'features/home-composition/ui/HomeSectionRow.tsx',
  'features/home-composition/ui/HomeSectionEditor.tsx',
  'features/home-composition/ui/FeaturedProductsEditor.tsx',
  'features/home-composition/ui/ProductPicker.tsx',
] as const

/**
 * Comentário fora, numa varredura só.
 *
 * Linha e bloco na **mesma** passada (`BL-027`), e `[^\n\r]` fecha o comentário de linha antes do
 * `\r`: num checkout Windows — que é o desta máquina — um arquivo em CRLF faria o removedor engolir
 * o começo da linha seguinte junto, e a régua passaria a medir texto que não existe (`L-031`).
 *
 * Aqui ele não é zelo: **os arquivos em escopo explicam a regra em prosa**, citando
 * `transition-colors` e `motion-reduce:transition-none` por extenso. Uma régua que casasse menção
 * acusaria exatamente os arquivos que estão certos — já aconteceu duas vezes neste repositório.
 */
const semComentarios = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/**
 * A classe que move, por **token exato**.
 *
 * O grupo 1 recolhe os variantes (`hover:`, `md:`, `motion-reduce:`) para que a régua saiba
 * distinguir "transição atrás de um variante" — que continua movendo — da desarmação. O
 * `(?![-\w])` no fim é o que impede `animate-spin` de cobrir `animate-spin-slow`: `\b` não fecha
 * nada quando o vizinho é hífen (`L-034`).
 */
const CLASSE_QUE_MOVE = /(?<![-\w:])((?:[a-z][a-z0-9-]*:)*)(transition|animate)(?:-([a-z0-9]+(?:-[a-z0-9]+)*))?(?![-\w])/g

/**
 * O que **não** precisa de par, escrito literalmente.
 *
 * - `transition-none` / `animate-none` são a própria desarmação: exigir par delas seria circular.
 * - `animate-spin` é o giro do `Loader2`, e é **indicador de progresso, não enfeite**: congelá-lo
 *   sob `prefers-reduced-motion` apagaria o único sinal de que a gravação está em curso. É também a
 *   prática do repositório inteiro — as três ocorrências da loja (`CouponInput`, `ShippingCalc`,
 *   `CartPage`) nunca tiveram par. A exceção é por **token exato**, e há sensor provando que
 *   `animate-spinner` seria acusado.
 */
const DISPENSADAS = ['transition-none', 'animate-none', 'animate-spin'] as const

interface Achado {
  /** O token como aparece no fonte, sem os variantes. */
  classe: string
  /** A linha inteira, já sem comentário — é nela que o par tem de estar. */
  linha: string
  /** Índice da linha (1-based), para a mensagem de falha apontar o lugar. */
  numero: number
  /** O token vem depois de `motion-reduce:`? Então ele É o par, não o movimento. */
  ehOPar: boolean
}

/** A régua, escrita uma vez e chamada por todas as asserções e por todos os sensores (`L-015`). */
const movimentoDe = (codigo: string): Achado[] => {
  const achados: Achado[] = []
  codigo.split(/\r?\n/).forEach((linha, indice) => {
    for (const m of linha.matchAll(CLASSE_QUE_MOVE)) {
      const variantes = m[1] ?? ''
      const classe = m[3] ? `${m[2]}-${m[3]}` : m[2]
      achados.push({
        classe,
        linha,
        numero: indice + 1,
        ehOPar: variantes.includes('motion-reduce:'),
      })
    }
  })
  return achados
}

/**
 * As classes que movem **e não têm par na mesma linha**.
 *
 * "Mesma linha" é a régua, e é a mais estreita possível de propósito: o par existe para ser lido ao
 * lado da classe que ele desarma. Aceitar o par a três linhas de distância deixaria de ser legível e
 * passaria a ser adivinhação — e um par solto cobriria uma classe nova que ninguém reparou.
 */
const movimentoSemPar = (fonte: string): string[] => {
  const codigo = semComentarios(fonte)
  return movimentoDe(codigo)
    .filter(a => !a.ehOPar)
    .filter(a => !DISPENSADAS.includes(a.classe as (typeof DISPENSADAS)[number]))
    .filter(a => !a.linha.includes('motion-reduce:'))
    .map(a => `${a.classe} (linha ${a.numero})`)
}

const FONTES = ARQUIVOS.map(caminho => ({
  caminho,
  fonte: readFileSync(resolve(RAIZ, caminho), 'utf8'),
}))

describe('o movimento do painel respeita `prefers-reduced-motion` (ANI-05)', () => {
  it('ÂNCORA: os oito arquivos foram lidos, e a varredura ACHOU movimento neles', () => {
    // Âncora dupla. Sem a segunda, um regex quebrado varreria os arquivos certos, encontraria zero
    // classe e a asserção de baixo (`[] === []`) passaria — a pior falha possível num teste que lê
    // fonte, porque ele parece saudável.
    expect(FONTES).toHaveLength(ARQUIVOS.length)
    expect(FONTES.every(f => f.fonte.length > 0)).toBe(true)

    const tokens = FONTES.flatMap(f => movimentoDe(semComentarios(f.fonte)))
    expect(tokens.length).toBeGreaterThanOrEqual(8)

    // E a terceira: os pares existem mesmo. Uma régua que nunca visse `motion-reduce:` também
    // passaria na segunda âncora, acusando tudo — ou, com o filtro invertido, nada.
    expect(tokens.filter(t => t.ehOPar).length).toBeGreaterThanOrEqual(4)
  })

  it('nenhum arquivo em escopo declara movimento sem o par `motion-reduce:`', () => {
    const culpados = FONTES.flatMap(f => movimentoSemPar(f.fonte).map(c => `${f.caminho}: ${c}`))
    expect(culpados).toEqual([])
  })

  it('SENSOR: a classe sem par REPROVA, e a mesma COM par passa', () => {
    expect(movimentoSemPar('className="transition-opacity"')).toEqual(['transition-opacity (linha 1)'])
    expect(movimentoSemPar('className="transition-opacity motion-reduce:transition-none"')).toEqual([])

    // A entrada do preset, que é o outro caso desta feature.
    expect(movimentoSemPar('className="animate-fade-in"')).toEqual(['animate-fade-in (linha 1)'])
    expect(movimentoSemPar('className="animate-fade-in motion-reduce:animate-none"')).toEqual([])
  })

  it('SENSOR: variante na frente NÃO desculpa — `hover:` continua movendo', () => {
    // A forma que passaria numa régua ingênua ancorada em "a classe começa a palavra".
    expect(movimentoSemPar('className="hover:transition-colors"')).toEqual([
      'transition-colors (linha 1)',
    ])
    expect(movimentoSemPar('className="md:transition-transform motion-reduce:transition-none"')).toEqual([])
  })

  it('SENSOR: a transição sem sufixo (`transition` pelada) também é acusada', () => {
    expect(movimentoSemPar('className="transition duration-200"')).toEqual(['transition (linha 1)'])
    expect(movimentoSemPar('className="transition duration-200 motion-reduce:transition-none"')).toEqual([])
  })

  it('SENSOR: a dispensa é por TOKEN EXATO — `animate-spinner` é acusado, `animate-spin` não', () => {
    // `L-034`: `\b` não fecha nada quando o vizinho é hífen, e uma régua por prefixo deixaria passar
    // toda animação cujo nome começasse por `spin`.
    expect(movimentoSemPar('<Loader2 className="mr-2 h-4 w-4 animate-spin" />')).toEqual([])
    expect(movimentoSemPar('className="animate-spinner"')).toEqual(['animate-spinner (linha 1)'])
    expect(movimentoSemPar('className="animate-spin-slow"')).toEqual(['animate-spin-slow (linha 1)'])
    // E a desarmação não se cobra a si mesma.
    expect(movimentoSemPar('className="transition-none"')).toEqual([])
  })

  it('SENSOR: a PROSA que explica a regra não é acusada — com LF e com CRLF', () => {
    // Os arquivos em escopo citam as duas formas por extenso, para explicar por que o par existe.
    // Uma régua que casasse menção acusaria justamente quem está certo (`L-031`).
    const prosa = '// `transition-colors` acende a linha\nconst x = 1'
    expect(movimentoSemPar(prosa)).toEqual([])
    expect(movimentoSemPar('/* usa animate-fade-in aqui */\nconst x = 1')).toEqual([])

    // Em CRLF o removedor não pode engolir a linha seguinte: se engolisse, a classe de verdade
    // abaixo sumiria da varredura e o guarda ficaria cego num checkout Windows.
    expect(movimentoSemPar('// nota sobre transition-colors\r\nconst c = "transition-opacity"')).toEqual([
      'transition-opacity (linha 2)',
    ])
    expect(movimentoSemPar('// nota sobre transition-colors\nconst c = "transition-opacity"')).toEqual([
      'transition-opacity (linha 2)',
    ])
  })

  it('SENSOR: o par tem de estar na MESMA linha da classe que ele desarma', () => {
    // Um `motion-reduce:` solto três linhas acima cobriria uma classe nova que ninguém reparou.
    const longe = 'className={cn(\n  "motion-reduce:transition-none",\n  "transition-opacity",\n)}'
    expect(movimentoSemPar(longe)).toEqual(['transition-opacity (linha 3)'])
  })
})
