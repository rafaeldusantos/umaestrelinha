/**
 * A marca Nanita v2 em vetor — a escada de redução da prancha 21:
 *
 *   lockup   ≥ 140px   papelaria, embalagem, e-mail, RODAPÉ da loja
 *   wordmark ≥ 110px   HEADER da loja, folha do menu, checkout, auth
 *   monograma ≤ 48px   favicon, avatar, selo
 *
 * Cada componente cai para o degrau de baixo quando pedem menos que o piso
 * dele. Nenhum renderiza uma marca borrada.
 */
export { NanitaWordmark, WORDMARK_FLOOR, type BrandTone, type NanitaWordmarkProps } from './NanitaWordmark'
export { NanitaLockup, LOCKUP_FLOOR, type NanitaLockupProps } from './NanitaLockup'
export { NanitaMonogram, type NanitaMonogramProps } from './NanitaMonogram'
