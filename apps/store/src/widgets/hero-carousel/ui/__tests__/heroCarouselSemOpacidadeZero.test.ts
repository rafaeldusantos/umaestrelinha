import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { semComentarios } from '@/test/sourceScan'

/**
 * **O Banner principal não nasce invisível** — `BNR-25`, a régua de `PRF-19` aplicada ao bloco novo.
 *
 * Este bloco pode ser o elemento do LCP da Home: quando a Adri o põe no topo, a maior imagem da
 * primeira dobra é o primeiro slide. E o Chrome **não conta como pintado** o que está em opacidade
 * zero — foi exatamente assim que o hero adiava a métrica em 2 s (medido no Lighthouse de
 * 2026-09-06: `elementRenderDelay` de 2005 ms contra `timeToFirstByte` de 25 ms).
 *
 * **Por que um guarda, e não confiança.** Pôr uma animação de entrada aqui é uma linha, parece
 * inofensivo, e não quebra nada: build, `tsc` e teste de componente passam, e a tela até fica mais
 * bonita. O único sintoma é meio segundo a mais de LCP num aparelho lento.
 *
 * **A régua cobre TRÊS grafias, e a terceira é a lição da feature 40.** Lá o guarda foi ancorado na
 * sintaxe do variant (`hidden: { … }`) e a verificação independente o derrubou com
 * `<motion.p initial={{ opacity: 0 }}>` — a porta ao lado, mesmo efeito. Guarda ancorado em sintaxe
 * guarda a sintaxe, não a regra. Aqui a régua é **o valor zero de opacidade em qualquer forma**:
 *
 *   1. objeto do framer (`opacity: 0`), em variant ou em prop inline;
 *   2. estilo inline do React (`opacity: 0` dentro de `style={{…}}`) — mesma forma da 1;
 *   3. classe utilitária (`opacity-0`), inclusive com prefixo de breakpoint ou de estado.
 *
 * ÂNCORA DUPLA: o arquivo tem de ser **lido** e a imagem do slide tem de ser **encontrada**. Um
 * caminho errado varreria zero e passaria em silêncio — a pior falha possível num guarda deste tipo.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const CARROSSEL = resolve(HERE, '../HeroCarousel.tsx')

/**
 * A régua, como predicado — asserção e sensor chamam a mesma função (`BL-028`).
 *
 * Roda sobre o fonte **sem comentário**: a documentação do widget cita `opacity: 0` para explicar por
 * que ele não pode existir, e uma régua que lesse prosa reprovaria a própria explicação — empurrando
 * o porquê para fora do código, que é o oposto do que este repositório faz.
 *
 * `opacity: 0.5` e `opacity-50` **não** casam. Só o zero.
 */
export const nasceInvisivel = (fonte: string): boolean => {
  const limpo = semComentarios(fonte)
  /** Forma de objeto: framer, `style={{…}}`, qualquer literal. */
  const objeto = /\bopacity\s*:\s*0(?:\.0+)?\s*[,}\]]/.test(limpo)
  /** Classe utilitária, com ou sem prefixo (`md:opacity-0`, `group-hover:opacity-0`). */
  const classe = /(?:^|[\s"'`:[])opacity-0(?![\d.])/.test(limpo)
  return objeto || classe
}

describe('o Banner principal não nasce em opacidade zero (BNR-25)', () => {
  const fonte = semComentarios(readFileSync(CARROSSEL, 'utf8'))

  it('o arquivo do carrossel foi lido de verdade (âncora 1)', () => {
    expect(fonte.length).toBeGreaterThan(1000)
  })

  it('a imagem do slide está no arquivo varrido (âncora 2)', () => {
    // Sem esta âncora, o guarda continuaria "passando" depois de a arte mudar de arquivo — e estaria
    // guardando um componente que já não desenha imagem nenhuma.
    expect(fonte).toContain('<img')
    expect(fonte).toContain('<picture>')
  })

  it('nada no carrossel nasce em opacidade zero', () => {
    expect(
      nasceInvisivel(fonte),
      'Alguma coisa no Banner principal voltou a nascer invisível. Este bloco pode ser o elemento ' +
        'do LCP da Home, e o Chrome não conta como pintado o que está em opacidade zero — a ' +
        'animação passa a adiar a métrica no celular. Se precisar de entrada, anime `transform` ' +
        '(que não impede a pintura), nunca a opacidade.',
    ).toBe(false)
  })

  it('SENSOR: a régua reprova o variant do framer', () => {
    expect(nasceInvisivel('const item = { hidden: { opacity: 0, y: 20 } }')).toBe(true)
    expect(nasceInvisivel('hidden: {opacity:0, y: 20}')).toBe(true)
    expect(nasceInvisivel('hidden: { opacity: 0.0 }')).toBe(true)
  })

  it('SENSOR: a régua reprova a prop inline — a porta ao lado que derrubou o guarda da 40', () => {
    expect(nasceInvisivel('<motion.div initial={{ opacity: 0 }}>')).toBe(true)
    expect(nasceInvisivel('<img style={{ opacity: 0 }} />')).toBe(true)
  })

  it('SENSOR: a régua reprova a CLASSE utilitária, com e sem prefixo', () => {
    // A grafia mais provável neste widget, porque ele não usa framer: um `opacity-0` esperando o
    // `onLoad` da imagem — que é exatamente o terceiro mecanismo que a feature 38 removeu do card.
    expect(nasceInvisivel('className="h-full w-full opacity-0 transition-opacity"')).toBe(true)
    expect(nasceInvisivel('className={cn("md:opacity-0", x)}')).toBe(true)
    expect(nasceInvisivel("className='group-hover:opacity-0'")).toBe(true)
  })

  it('SENSOR: opacidade PARCIAL não é o defeito — só o zero', () => {
    expect(nasceInvisivel('hidden: { opacity: 0.5 }')).toBe(false)
    expect(nasceInvisivel('className="opacity-70"')).toBe(false)
    expect(nasceInvisivel('className="opacity-0.5"')).toBe(false)
  })

  it('SENSOR: `opacity: 1` não é confundido com o defeito', () => {
    expect(nasceInvisivel('animate={{ opacity: 1 }}')).toBe(false)
    expect(nasceInvisivel('className="opacity-100"')).toBe(false)
  })

  it('SENSOR: a régua não confunde `bg-estrelinha-surface/90` com opacidade zero', () => {
    // A transparência de fundo das setas é legítima e vai continuar existindo. Uma régua que a
    // acusasse seria afrouxada na primeira semana — e régua afrouxada não guarda nada.
    expect(nasceInvisivel('className="bg-estrelinha-surface/90"')).toBe(false)
  })
})
