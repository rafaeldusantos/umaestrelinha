/**
 * Um item da faixa de departamentos — board `5ND-0`: caixa alta, 13px, peso
 * 500, `0.09em` de entreletra, em `on-primary` sobre a faixa `primary`.
 *
 * O estado aberto **não** troca a cor do rótulo por `accent`: ouro sobre
 * `primary` mede 3,29:1, e a regra da paleta é que o acento nunca é texto fora
 * de `ink`. Quem marca o item aberto é uma régua de 2px em `accent` — objeto
 * gráfico, onde a WCAG pede 3:1 e não 4,5:1 —, e o rótulo vai a branco. Duas
 * pistas, nenhuma delas só de cor.
 *
 * Mora num módulo próprio, e não dentro do `MegaMenu`, porque os dois
 * consumidores são o `MegaMenu` (as entradas de `menuEntries`) e o `Header`
 * (a linha fixa "Sobre"): declarar a mesma forma em dois lugares é como uma
 * delas fica para trás.
 */
export const NAV_ITEM =
  'flex h-full items-center border-b-2 text-[13px] font-medium uppercase tracking-[0.09em] text-estrelinha-on-primary transition-colors hover:text-white'
