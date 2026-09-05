/**
 * Contraste WCAG 2.1 — **reexporta `@estrelinha/core/color`**.
 *
 * A fórmula morava aqui desde a feature 19. A 34 trouxe o segundo consumidor — o guarda dos tokens
 * `--estrelinha-admin-*`, que roda no **backoffice** e não alcança a camada `shared` da loja —, e
 * pela consequência 1 do defeito 01 do repositório ela passou a ter um dono só, em `core`.
 *
 * Este arquivo continua existindo para que `contrast.test.ts` e `fieldBorder.test.ts` sigam
 * importando `../contrast` sem alteração: os dois guardas da loja não mudaram uma linha. Uma cópia
 * da fórmula aqui é que seria o defeito 01 em estado puro.
 */
export { parseHex, relativeLuminance, contrastRatio, mixOver } from '@estrelinha/core/color'
