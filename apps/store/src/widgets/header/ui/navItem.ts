/**
 * Um item da faixa de departamentos — boards `5ND-0` e `DDR-0`: caixa alta,
 * 13px, peso 500, `0.09em` de entreletra, em `on-primary` sobre a faixa
 * `primary`.
 *
 * O estado aberto **não** troca a cor do rótulo por `accent`: ouro sobre
 * `primary` mede 3,26:1, e a regra da paleta é que o acento nunca é texto fora
 * de `ink`. Quem marca o item aberto é uma régua de 2px em `accent` — objeto
 * gráfico, onde a WCAG pede 3:1 e não 4,5:1 —, e o rótulo vai a branco. Duas
 * pistas, nenhuma delas só de cor.
 *
 * `whitespace-nowrap` entra na feature 39 e é estrutural, não estético: sem
 * teto de itens, a faixa **rola na horizontal** quando não cabe, e um rótulo
 * que embrulha em duas linhas dentro de uma faixa de 52px esconderia o estouro
 * em vez de mostrá-lo — que é o motivo de não haver `flex-wrap` em lugar
 * nenhum desta barra.
 *
 * Mora num módulo próprio, e não dentro do `MegaMenu`, porque a forma é lida
 * por mais de um lugar do widget (a entrada de categoria e o item de link, que
 * são elementos diferentes: um abre painel, o outro é `<a>` direto). Declarar a
 * mesma forma duas vezes é como uma delas fica para trás.
 */
export const NAV_ITEM =
  'flex h-full items-center gap-[9px] whitespace-nowrap border-b-2 text-[13px] font-medium uppercase tracking-[0.09em] text-estrelinha-on-primary transition-colors hover:text-white'

/**
 * O ícone da entrada, à esquerda do rótulo — `NAV-20`, board `DDR-0`.
 *
 * **`accent` e não `accent-strong`**: aqui o fundo é a faixa `primary`, onde
 * `accent` (#B8945F) mede 3,26:1 — acima dos 3:1 que a WCAG 1.4.11 pede para
 * objeto gráfico. `accent-strong`, que é o tom certo sobre claro, mediria menos
 * sobre escuro. O ouro é do desenho; o rótulo continua em `on-primary`.
 *
 * `shrink-0` é o que mantém a lane: numa barra que rola, um ícone que encolhe
 * deforma o desenho antes de a rolagem começar. E a vaga **só existe quando há
 * ícone** (`NAV-18`) — item sem ícone mostra só o nome, sem buraco reservado.
 */
export const NAV_ITEM_ICON = 'h-4 w-4 shrink-0 text-estrelinha-accent'

/**
 * A seta do item que abre painel — 12px, board `DDR-0`.
 *
 * Só aparece quando há painel (`hasPanel`): entrada sem subcategoria curada e
 * sem banner é **link direto**, e uma seta ali prometeria um painel que não
 * abre (`NAV-25`).
 */
export const NAV_ITEM_CHEVRON = 'h-3 w-3 shrink-0'
