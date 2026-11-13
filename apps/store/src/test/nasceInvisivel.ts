// A régua "nasce invisível" dos guardas de opacidade zero, com UM dono: o guarda do Banner principal
// e o da faixa de avisos chamam a mesma função (a faixa entrou como segundo leitor).

import { semComentarios } from './sourceScan'

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
