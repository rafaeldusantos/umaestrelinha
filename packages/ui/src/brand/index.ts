/**
 * A marca Uma Estrelinha em vetor — a escada de redução do board `78R-0`/`734-0`:
 *
 *   lockup     ≥ 600px   e-mail, papelaria, embalagem
 *   assinatura ≥ 190px   HEADER da loja, folha do menu, checkout, auth, rodapé
 *   símbolo    ≥  48px   favicon, avatar, selo, marca d'água
 *
 * Cada componente cai para o degrau de baixo quando pedem menos que o piso
 * dele, **preservando a altura**. Nenhum renderiza uma marca apagada.
 *
 * O piso não é estético: esta marca é monoline, o traço é uma fração fixa da
 * largura, e abaixo de ~1px de traço a linha vira o cinza do antialias. Os três
 * números saem dessa conta, com a espessura de cada desenho — a de 48px é a que
 * o próprio board escreveu ("Use de 48px para cima").
 */
export { EstrelinhaLockup, LOCKUP_FLOOR, type EstrelinhaLockupProps } from './EstrelinhaLockup'
export {
  EstrelinhaSignature,
  SIGNATURE_FLOOR,
  type EstrelinhaSignatureProps,
} from './EstrelinhaSignature'
export { EstrelinhaSymbol, SYMBOL_FLOOR, type EstrelinhaSymbolProps } from './EstrelinhaSymbol'
export { type BrandTone } from './BrandSvg'
