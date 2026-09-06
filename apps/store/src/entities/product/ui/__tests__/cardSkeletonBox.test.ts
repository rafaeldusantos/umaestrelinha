import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { semComentarios } from '@/test/sourceScan'

/**
 * **O esqueleto e o card declaram a MESMA caixa** — `PRF-17`.
 *
 * `ProductCardSkeleton` existe para que a grade não salte quando os produtos chegam, e o jeito de
 * ele cumprir isso é ter a **altura** do card. As medidas dele foram tiradas em navegador (431px dos
 * dois lados, em 1440×900) — mas são, por construção, uma **segunda escrita** das do `ProductCard`.
 *
 * `apps/store/CLAUDE.md` já registrava a lacuna, com todas as letras:
 *
 * > As medidas são uma segunda escrita das do `ProductCard` e **nenhum teste de componente pega a
 * > divergência**: jsdom devolve 0 para toda medida de layout.
 *
 * Continua verdade — jsdom não mede altura, e nenhum teste vai medir. **Mas a altura não sai do
 * nada**: ela sai de quatro classes que os dois arquivos precisam declarar igual. Trocar
 * `aspect-[4/5]` por `aspect-square` no card, ou tirar o `min-h-[40px]` de um dos lados, muda a
 * altura de um e não do outro — e é isso que este guarda pega.
 *
 * Não substitui a auditoria em navegador; fecha o caso barato. O caro (mexer na tipografia mantendo
 * as classes) continua sendo medida de navegador, como o `CLAUDE.md` manda.
 *
 * ÂNCORA DUPLA: os dois arquivos têm de ser **lidos** e as quatro classes têm de ser **achadas** em
 * pelo menos um deles. Só ler não prova que a régua funciona; só casar não prova que leu os dois.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const UI = resolve(HERE, '..')

/**
 * As medidas que **produzem altura**, e a classe que cada lado usa para declarar cada uma.
 *
 * Não é toda classe dos dois arquivos: cor, arredondamento e largura não movem a grade. São estas
 * quatro que somam os 431px, e cada uma está no comentário do `ProductCardSkeleton` com a medida ao
 * lado.
 *
 * **Três são a mesma classe dos dois lados; a do nome NÃO é, e a diferença é deliberada.** O card
 * precisa de `min-h-[40px]` porque o nome pode ocupar **uma** linha e ainda assim tem de reservar
 * duas — é o que faz os preços de uma fileira empatarem na mesma linha (`COR-09`). O esqueleto tem
 * conteúdo de tamanho fixo, então declara `h-[40px]` exato. Forçar a mesma classe nos dois seria
 * inventar uma regra que o desenho não tem.
 */
const CAIXA = [
  { medida: 'palco da foto (280px)', card: 'aspect-[4/5]', esqueleto: 'aspect-[4/5]' },
  { medida: 'respiro foto→texto (16px)', card: 'mt-4', esqueleto: 'mt-4' },
  { medida: 'os três vãos (15px)', card: 'gap-[5px]', esqueleto: 'gap-[5px]' },
  { medida: 'duas linhas do nome (40px)', card: 'min-h-[40px]', esqueleto: 'h-[40px]' },
] as const

const ler = (arquivo: string) => semComentarios(readFileSync(resolve(UI, arquivo), 'utf8'))

/**
 * A régua, como predicado — asserção e sensor chamam a mesma função (`BL-028`).
 *
 * **Token exato, não `includes`.** `'min-h-[40px]'.includes('h-[40px]')` é `true`, então uma busca
 * por substring diria que o esqueleto declara `h-[40px]` mesmo se ele só tivesse `min-h-[40px]` —
 * e a régua aprovaria a divergência que existe para pegar. `\b` também não serve: ele não fecha
 * nada quando o vizinho é hífen. É a mesma lição que a verificação da feature 39 registrou.
 *
 * **A fronteira é `[-\w]`, não espaço em branco.** A primeira escrita exigia `(?:^|\s)` antes do
 * token e reprovava metade das classes reais — porque numa string de classe a primeira delas vem
 * logo depois da aspa (`className="mt-4 flex …"`), e não depois de espaço. Lookbehind negativo
 * resolve os dois lados de uma vez: `"` não é `[-\w]` e passa; o `-` de `min-h-` é, e não passa.
 */
export const declara = (fonte: string, classe: string): boolean =>
  new RegExp(
    `(?<![-\\w])${classe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![-\\w])`,
  ).test(fonte)

describe('o esqueleto espelha a caixa do card (PRF-17)', () => {
  const card = ler('ProductCard.tsx')
  const esqueleto = ler('ProductCardSkeleton.tsx')

  it('os dois arquivos foram lidos de verdade (âncora 1)', () => {
    expect(card.length).toBeGreaterThan(2000)
    expect(esqueleto.length).toBeGreaterThan(500)
  })

  it('a régua acha as quatro medidas no esqueleto (âncora 2)', () => {
    const achadas = CAIXA.filter((c) => declara(esqueleto, c.esqueleto)).map((c) => c.medida)
    expect(achadas).toEqual(CAIXA.map((c) => c.medida))
  })

  it.each(CAIXA)('a medida "$medida" é declarada nos DOIS arquivos', ({ card: noCard, esqueleto: noEsq }) => {
    expect(
      declara(card, noCard),
      `\`${noCard}\` sumiu do ProductCard. Se a caixa do card mudou, o ProductCardSkeleton ` +
        `precisa acompanhar — senão a grade da categoria e as fileiras da home voltam a saltar ` +
        `quando os produtos chegam (PRF-17).`,
    ).toBe(true)

    expect(
      declara(esqueleto, noEsq),
      `\`${noEsq}\` sumiu do ProductCardSkeleton, mas o card continua declarando \`${noCard}\`. ` +
        `As duas caixas divergiram — e jsdom não mede altura, então nenhum outro teste pega isto.`,
    ).toBe(true)
  })

  it('SENSOR: a régua reprova quando um lado perde a medida', () => {
    const mutilado = esqueleto.split('h-[40px]').join('h-[36px]')
    expect(declara(mutilado, 'h-[40px]')).toBe(false)
    expect(declara(card, 'min-h-[40px]')).toBe(true)
  })

  it('SENSOR: a régua NÃO confunde `min-h-[40px]` com `h-[40px]`', () => {
    // O ponto cego que `includes` teria: o card declara só `min-h-[40px]`, e uma busca por
    // substring diria que ele declara `h-[40px]` também. Aí a régua aprovaria um esqueleto que
    // tivesse perdido a reserva do nome.
    expect(declara('class="min-h-[40px] flex"', 'h-[40px]')).toBe(false)
    expect(declara('class="h-[40px] flex"', 'h-[40px]')).toBe(true)
  })
})
