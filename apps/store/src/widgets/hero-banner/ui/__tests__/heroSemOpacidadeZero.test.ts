import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { semComentarios } from '@/test/sourceScan'

/**
 * **O elemento do LCP não nasce invisível** — `PRF-19`.
 *
 * O maior elemento de conteúdo desta loja é o `<p>` do hero. Até a feature 40 ele era um
 * `motion.p` cujo variant de entrada era `hidden: { opacity: 0, y: 20 }`, sob um contêiner com
 * `staggerChildren: 0.1`. Sendo o terceiro filho, ele só começava a aparecer 0,2 s depois do mount
 * e levava mais 0,45 s para chegar a `opacity: 1`.
 *
 * O Chrome **não conta como pintado** um elemento em opacidade zero. Medido no Lighthouse de
 * 2026-09-06 (móvel, Slow 4G simulado): `elementRenderDelay` de **2005 ms** contra
 * `timeToFirstByte` de **25 ms** — o tempo não estava na rede, estava na animação.
 *
 * **Por que um guarda.** Devolver `opacity: 0` ao variant é uma linha, parece inofensivo, e não
 * quebra nada: o build passa, o `tsc` passa, o teste de componente passa, e a tela até fica mais
 * bonita. O único sintoma é meio segundo a mais de LCP num aparelho lento — que ninguém vê em
 * review e que só reaparece na próxima auditoria.
 *
 * `PRF-03` já tinha escrito a mesma régua para os cards da primeira dobra. Este guarda estende ao
 * hero, que é onde ela mais valia.
 *
 * ÂNCORA: o arquivo tem de ser **lido** e os dois variants têm de ser **achados**. Um caminho
 * errado varreria zero e passaria em silêncio — a pior falha possível num guarda deste tipo.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const HERO = resolve(HERE, '../HeroBanner.tsx')

/**
 * A régua, como predicado — asserção e sensor chamam a mesma função (`BL-028`).
 *
 * Roda sobre o fonte **sem comentário**: o comentário do `HeroBanner` cita `opacity: 0` ao explicar
 * o defeito, e uma régua que lesse prosa reprovaria a própria documentação — empurrando a
 * explicação para fora do código, que é o oposto do que este repositório faz.
 *
 * **A régua é `opacity: 0` em QUALQUER lugar do arquivo, não só dentro de `hidden:`.**
 *
 * A primeira escrita ancorava em `hidden\s*:\s*\{…\}`, e a verificação independente derrubou-a com
 * um mutante que passou na suíte inteira: `<motion.p initial={{ opacity: 0 }}>` — a prop inline do
 * framer-motion, que ganha do variant e produz exatamente o mesmo defeito. Ancorar a régua na
 * *sintaxe do variant* deixava a porta ao lado aberta.
 *
 * O custo dessa amplitude é recusar também um `exit: { opacity: 0 }`, que seria legítimo em
 * abstrato. Aqui não é: o hero não desmonta, e uma animação de saída nele seria conversa a ter,
 * não regra a assumir.
 *
 * `opacity: 0.5` **não** casa — só o zero, com ou sem casas decimais nulas.
 */
export const nasceInvisivel = (fonte: string): boolean =>
  /\bopacity\s*:\s*0(?:\.0+)?\s*[,}\]]/.test(semComentarios(fonte))

describe('o hero não nasce em opacidade zero (PRF-19)', () => {
  const fonte = semComentarios(readFileSync(HERO, 'utf8'))

  it('o arquivo do hero foi lido de verdade (âncora 1)', () => {
    expect(fonte.length).toBeGreaterThan(1000)
  })

  it('os dois variants de entrada estão no arquivo (âncora 2)', () => {
    expect(fonte).toMatch(/const container\s*:\s*Variants/)
    expect(fonte).toMatch(/const item\s*:\s*Variants/)
    expect(fonte).toMatch(/hidden\s*:/)
  })

  it('nenhum variant `hidden` declara opacidade zero', () => {
    expect(
      nasceInvisivel(fonte),
      'Um variant de entrada do hero voltou a nascer em `opacity: 0`. O `<p>` daqui é o elemento ' +
        'do LCP, e o Chrome não conta como pintado o que está invisível — a animação passa a adiar ' +
        'a métrica em ~0,5 s no celular. Anime só `y` (transform não impede a pintura).',
    ).toBe(false)
  })

  it('a animação de entrada CONTINUA existindo — o deslize não foi removido junto', () => {
    // Sem isto o guarda aprovaria alguém que apagasse a animação inteira, que não é o pedido: o
    // pedido é entrar sem esconder.
    expect(fonte).toMatch(/hidden\s*:\s*\{\s*y\s*:\s*\d+\s*\}/)
    expect(fonte).toMatch(/show\s*:\s*\{\s*y\s*:\s*0/)
  })

  it('SENSOR: a régua reprova o variant antigo', () => {
    const antigo = `const item: Variants = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 },
    }`
    expect(nasceInvisivel(antigo)).toBe(true)
  })

  it('SENSOR: a régua reprova também sem espaço e com zero decimal', () => {
    expect(nasceInvisivel('hidden: {opacity:0, y: 20}')).toBe(true)
    expect(nasceInvisivel('hidden: { opacity: 0.0, y: 20 }')).toBe(true)
  })

  it('SENSOR: a régua reprova a prop INLINE, não só o variant', () => {
    // O mutante que derrubou a primeira escrita deste guarda: `initial` ganha do variant e produz o
    // mesmo defeito, mas não está dentro de nenhum `hidden: { … }`.
    expect(nasceInvisivel('<motion.p initial={{ opacity: 0 }} variants={item}>')).toBe(true)
    expect(nasceInvisivel('<motion.div animate={{ opacity: 0, y: 0 }}>')).toBe(true)
  })

  it('SENSOR: `opacity: 1` no `show` não é confundido com o defeito', () => {
    expect(nasceInvisivel('hidden: { y: 20 }, show: { opacity: 1, y: 0 }')).toBe(false)
  })

  it('SENSOR: opacidade PARCIAL não é o defeito — só o zero', () => {
    expect(nasceInvisivel('hidden: { opacity: 0.5, y: 20 }')).toBe(false)
    expect(nasceInvisivel('hidden: { opacity: 0.05 }')).toBe(false)
  })
})
