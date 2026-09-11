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
 * O **invólucro** — a AC diz "em nenhum ponto do caminho até ele", e o caminho começa aqui.
 *
 * Um `opacity-0` no registro `tipo → componente` esconderia o slide exatamente igual, e uma régua
 * que lesse só o widget aprovaria em silêncio. Foi a verificação independente que apontou o furo.
 */
const REGISTRO = resolve(HERE, '../../../home-renderer/ui/sectionRenderers.tsx')

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
  /**
   * Classe utilitária, com ou sem prefixo (`md:opacity-0`, `group-hover:opacity-0`) — **e com valor
   * arbitrário**, `opacity-[0]`, que a primeira escrita desta régua deixava passar.
   */
  const classe = /(?:^|[\s"'`:[{])opacity-(?:0|\[0(?:\.0+)?%?\])(?![\d.])/.test(limpo)
  /**
   * **As animações de entrada que começam em opacidade zero — e nenhuma delas contém a palavra
   * `opacity`.** É o que torna esta metade da régua indispensável, e o que a fez errar duas vezes.
   *
   * Duas famílias, de duas origens:
   *
   * - **`tailwindcss-animate`**: `fade-in` compila para `--tw-enter-opacity: 0`. A grafia já é usada
   *   nesta loja (`WhatsAppFloat.tsx`), e a rodada 1 da verificação a encontrou.
   * - **O PRÓPRIO PRESET deste projeto** (`packages/ui/tailwind.preset.ts`): `fade-in`, `scale-in` e
   *   `slide-up` são keyframes declarados ali, os três com `opacity: "0"` no primeiro quadro, e são
   *   usados pela classe `animate-fade-in`, `animate-scale-in`, `animate-slide-up`. A rodada 2
   *   encontrou os três — e o furo era **de um caractere**: a régua exigia o `fade-in` precedido de
   *   espaço ou aspas, e em `animate-fade-in` o caractere anterior é um hífen. Ela via a biblioteca
   *   e era cega ao que o repositório declara sozinho.
   *
   * O hífen entrou na classe de caracteres anteriores por isso. `-50`, `-95` e afins continuam de
   * fora: entrar de 50% ou 95% não esconde o elemento do medidor.
   */
  const fade = /(?:^|[\s"'`:[{-])(?:fade-in|scale-in|slide-up)(?:-0)?(?![-\d])/.test(limpo)
  /**
   * `invisible` — `visibility: hidden`, que o Chrome também não conta como pintado.
   *
   * Não tinha regra nenhuma até a rodada 2. O teste de `BNR-39` o checava, mas só no `<Link>` do
   * slide: um `invisible` no `<img>` passava pelos dois.
   */
  const oculto = /(?:^|[\s"'`:[{-])invisible(?![-\w])/.test(limpo)
  return objeto || classe || fade || oculto
}

describe('o Banner principal não nasce em opacidade zero (BNR-25)', () => {
  const fonte = semComentarios(readFileSync(CARROSSEL, 'utf8'))
  const registro = semComentarios(readFileSync(REGISTRO, 'utf8'))

  it('o arquivo do carrossel foi lido de verdade (âncora 1)', () => {
    expect(fonte.length).toBeGreaterThan(1000)
  })

  it('a imagem do slide está no arquivo varrido (âncora 2)', () => {
    // Sem esta âncora, o guarda continuaria "passando" depois de a arte mudar de arquivo — e estaria
    // guardando um componente que já não desenha imagem nenhuma.
    expect(fonte).toContain('<img')
    expect(fonte).toContain('<picture>')
  })

  it('o registro `tipo → componente` foi lido (âncora 3)', () => {
    // O caminho até o slide passa por ele, e uma régua que lesse só o widget aprovaria um
    // `opacity-0` posto aqui.
    expect(registro.length).toBeGreaterThan(500)
    expect(registro).toContain('hero_carousel')
  })

  it('nada no INVÓLUCRO nasce em opacidade zero', () => {
    expect(nasceInvisivel(registro)).toBe(false)
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

describe('os furos que a verificação independente encontrou', () => {
  it('SENSOR: `fade-in` do tailwindcss-animate É o defeito, e não contém a palavra `opacity`', () => {
    // O único dos três furos que não era hipotético: a grafia já existe nesta loja
    // (`WhatsAppFloat.tsx`), o plugin está no preset, e ela compila para `--tw-enter-opacity: 0`.
    expect(nasceInvisivel('className="animate-in fade-in duration-700"')).toBe(true)
    expect(nasceInvisivel('className="animate-in fade-in-0 slide-in-from-bottom-2"')).toBe(true)
    expect(nasceInvisivel('className={cn("md:fade-in", x)}')).toBe(true)
  })

  it('SENSOR: entrar de 50% NÃO é o defeito — `fade-in-50` passa', () => {
    // O par. Uma régua que acusasse toda entrada suave seria afrouxada na primeira semana.
    expect(nasceInvisivel('className="animate-in fade-in-50"')).toBe(false)
    expect(nasceInvisivel('className="animate-in fade-in-95 zoom-in-95"')).toBe(false)
  })

  it('SENSOR: o valor arbitrário `opacity-[0]` É o defeito', () => {
    expect(nasceInvisivel('className="opacity-[0]"')).toBe(true)
    expect(nasceInvisivel('className="md:opacity-[0.0]"')).toBe(true)
  })

  it('SENSOR: valor arbitrário PARCIAL não é o defeito', () => {
    expect(nasceInvisivel('className="opacity-[0.4]"')).toBe(false)
    expect(nasceInvisivel('className="opacity-[35%]"')).toBe(false)
  })

  it('SENSOR: `zoom-in` e `slide-in` não são acusados — eles não mexem em opacidade', () => {
    expect(nasceInvisivel('className="animate-in zoom-in-95 slide-in-from-top-1"')).toBe(false)
  })
})

describe('os furos da RODADA 2 — as animações do próprio preset', () => {
  it('SENSOR: `animate-fade-in`, `animate-scale-in` e `animate-slide-up` são o defeito', () => {
    // Os três são keyframes declarados em `packages/ui/tailwind.preset.ts`, os três com
    // `opacity: "0"` no primeiro quadro. A régua da rodada 1 via o `fade-in` do plugin e era cega a
    // estes: em `animate-fade-in` o caractere anterior é hífen, e a classe exigia espaço ou aspas.
    expect(nasceInvisivel('className="animate-fade-in"')).toBe(true)
    expect(nasceInvisivel('className="animate-scale-in delay-100"')).toBe(true)
    expect(nasceInvisivel('className={cn("animate-slide-up", x)}')).toBe(true)
  })

  it('SENSOR: `invisible` é o defeito — `visibility: hidden` também não é pintura', () => {
    expect(nasceInvisivel('className="invisible md:visible"')).toBe(true)
  })

  it('SENSOR: `animate-bounce-cart` e `animate-slide-in-right` NÃO são o defeito', () => {
    // O par. Os dois são keyframes do mesmo preset e **não** mexem em opacidade — só em `transform`,
    // que é justamente o que `PRF-19` recomenda em vez da opacidade.
    expect(nasceInvisivel('className="animate-bounce-cart"')).toBe(false)
    expect(nasceInvisivel('className="animate-slide-in-right"')).toBe(false)
  })

  it('SENSOR: `visible` não é confundido com `invisible`', () => {
    expect(nasceInvisivel('className="visible"')).toBe(false)
  })

  it('as classes acusadas existem MESMO no preset — a régua não inventa nome', () => {
    // Âncora contra a régua envelhecer sozinha: se um destes keyframes for renomeado ou perder o
    // `opacity: 0`, a régua passa a proibir uma classe que não existe, e ninguém descobre.
    const preset = readFileSync(
      resolve(HERE, '../../../../../../../packages/ui/tailwind.preset.ts'),
      'utf8',
    )
    for (const nome of ['fade-in', 'scale-in', 'slide-up']) {
      expect(preset, `${nome} não está mais no preset`).toContain(`"${nome}"`)
    }
  })
})
