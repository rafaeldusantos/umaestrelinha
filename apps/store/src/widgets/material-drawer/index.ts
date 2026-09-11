/**
 * A gaveta "Como enviar seu material" — a API pública do slice (feature `44`).
 *
 * Montada **uma vez** por `ProductPage`, e comandada pelo `materialDrawerStore` em
 * `entities/material`. Não tem gatilho embutido de propósito: quem abre é `MaterialSendTrigger`, que
 * vive em `entities` porque quem o renderiza (`ProductInfo`) não pode importar de `widgets`.
 *
 * O conteúdo do guia **não mora aqui** — mora em `@/entities/material`, junto com o que a página do
 * guia lê. `donoUnicoDoGuia.test.ts` recusa a segunda cópia e o import lateral entre os dois
 * widgets.
 */
export { default as MaterialDrawer } from './ui/MaterialDrawer'
