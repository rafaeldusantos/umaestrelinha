import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * A coluna de assuntos da página de perguntas passa POR BAIXO do header — e nada acusa.
 *
 * O defeito é o de sempre nesta família: `lg:sticky lg:top-24` fixa a coluna a 96px do topo, o
 * header da loja mede **136** (a faixa da marca, `md:h-[84px]`, mais a de departamentos, 52), e a
 * lista de assuntos some atrás da barra escura assim que a leitora rola. Build, `tsc` e teste de
 * componente seguem verdes: **jsdom devolve 0 para toda medida de layout**, então nenhuma asserção
 * de DOM encosta nisso. Quem descobre é a cliente.
 *
 * A folga é, por força, uma **segunda escrita** da altura do header — não há como um `top-` do
 * Tailwind derivar de uma classe que vive noutro arquivo. Cópia deliberada neste repositório vem
 * com guarda que **lê os dois do disco e compara** (`CLAUDE.md`), e é isto aqui.
 *
 * **O escopo é a página de perguntas, e só ela.** `OrderSummary` também usa `top-24` e **não** é
 * acusado: o checkout vive FORA do `StoreLayout` e tem header próprio (`CHK-10`, `App.tsx`).
 * Guarda com alcance maior que a regra acusa o arquivo certo pelo motivo errado.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const STORE_SRC = resolve(HERE, '../../..')

const HEADER = join(STORE_SRC, 'widgets/header/ui/Header.tsx')
const FAQ = join(STORE_SRC, 'pages/FaqPage.tsx')

/**
 * Comentário fora ANTES de medir — e **CRLF normalizado primeiro**.
 *
 * Aqui isto não é ritual: o próprio `FaqPage.tsx` explica a conta em prosa e cita `md:h-[84px]`,
 * `h-[52px]` e `top-24` dentro do comentário. Uma régua que casasse MENÇÃO leria 84 como se fosse
 * a folga e passaria com a coluna escondida — é o erro que o trilho do painel e o `HomeLivePreview`
 * já cometeram neste repositório, cada um acusando justamente o arquivo que estava certo.
 */
const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n?/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

const headerFonte = semComentarios(readFileSync(HEADER, 'utf8'))
const faqFonte = semComentarios(readFileSync(FAQ, 'utf8'))

/** A faixa da marca no desktop — `md:h-[84px]` na linha da `container`. */
const FAIXA_MARCA = /md:h-\[(\d+)px\]/
/** A faixa de departamentos — `const FAIXA_ALTURA = 'h-[52px]'`. */
const FAIXA_DEPARTAMENTOS = /FAIXA_ALTURA\s*=\s*'h-\[(\d+)px\]'/
/** A folga da coluna de assuntos — `lg:sticky lg:top-[152px]`. */
const FOLGA = /lg:top-\[(\d+)px\]/

const numero = (fonte: string, regra: RegExp): number | null => {
  const achado = fonte.match(regra)
  return achado ? Number(achado[1]) : null
}

const alturaDoHeader = numero(headerFonte, FAIXA_MARCA)! + numero(headerFonte, FAIXA_DEPARTAMENTOS)!

/**
 * A régua, escrita como **predicado** para a asserção e os sensores chamarem a mesma função.
 *
 * Devolve `null` quando a folga cobre o header, e o motivo quando não cobre. Veredito com motivo é
 * `string | null` de propósito: com `strictNullChecks: false`, união discriminada por booleano
 * literal não estreita, e o ramo do motivo não compilaria (`CLAUDE.md`).
 */
export const folgaInsuficiente = (fonte: string, header: number): string | null => {
  const folga = numero(semComentarios(fonte), FOLGA)
  if (folga === null) return `não declara \`lg:top-[<n>px]\` — a coluna não tem folga nenhuma`
  if (folga < header) return `a folga é ${folga}px e o header mede ${header}px`
  return null
}

describe('a coluna de assuntos fica ABAIXO do header (feature 46)', () => {
  // ÂNCORA 1 — os dois arquivos foram lidos de verdade.
  it('lê o header e a página de perguntas do disco', () => {
    expect(headerFonte.length).toBeGreaterThan(2000)
    expect(faqFonte.length).toBeGreaterThan(2000)
  })

  // ÂNCORA 2 — as três medidas foram ENCONTRADAS. Sem isto, renomear `FAIXA_ALTURA` ou trocar a
  // grafia do `top-` faria `numero` devolver `null`, e a comparação passaria por vacuidade.
  it('acha as três medidas, e nenhuma delas é suposta', () => {
    expect(numero(headerFonte, FAIXA_MARCA)).toBe(84)
    expect(numero(headerFonte, FAIXA_DEPARTAMENTOS)).toBe(52)
    expect(numero(faqFonte, FOLGA)).not.toBeNull()
    expect(alturaDoHeader).toBe(136)
  })

  it('a folga cobre as duas faixas do header', () => {
    expect(folgaInsuficiente(readFileSync(FAQ, 'utf8'), alturaDoHeader)).toBeNull()
  })

  // O header do desktop NÃO se recolhe: `md:translate-y-0` trava o recuo, que é só do celular.
  // Se isso deixar de valer, a conta acima passa a ter outro dono e este guarda precisa mudar junto.
  it('o header do desktop não se recolhe ao rolar', () => {
    expect(headerFonte).toContain('md:translate-y-0')
  })
})

describe('a régua é sensível', () => {
  it('REPROVA o `top-24` que a página tinha — 96 contra 136', () => {
    const antigo = '<div className="lg:sticky lg:top-[96px]">'
    expect(folgaInsuficiente(antigo, 136)).toContain('96')
  })

  it('REPROVA a folga removida por inteiro', () => {
    expect(folgaInsuficiente('<div className="lg:sticky lg:top-24">', 136)).toContain('folga')
  })

  it('NÃO acusa uma folga que cobre o header', () => {
    expect(folgaInsuficiente('<div className="lg:sticky lg:top-[152px]">', 136)).toBeNull()
  })

  it('acompanha o header: a mesma folga reprova se o header crescer', () => {
    expect(folgaInsuficiente('lg:top-[152px]', 136)).toBeNull()
    expect(folgaInsuficiente('lg:top-[152px]', 188)).toContain('188')
  })

  // O ponto cego que este repositório já pagou duas vezes: a régua tem de casar USO, nunca menção.
  it('ignora a conta escrita em COMENTÁRIO, de linha e de bloco, com LF e com CRLF', () => {
    const prosa = '/* o `top-24` valia 96 */\n// e `lg:top-[99px]` seria pouco\nlg:top-[152px]\n'
    expect(folgaInsuficiente(prosa, 136)).toBeNull()
    expect(folgaInsuficiente(prosa.replace(/\n/g, '\r\n'), 136)).toBeNull()
  })

  it('mas não come o código ao redor do comentário', () => {
    expect(semComentarios('// nota\nlg:top-[152px]\n')).toContain('lg:top-[152px]')
  })
})
