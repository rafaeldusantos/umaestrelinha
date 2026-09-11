/**
 * O guia de material — a API pública do slice (feature 31).
 *
 * A página importa daqui, nunca de caminho profundo: é o barrel que deixa a seção mudar de arquivo
 * sem mexer em quem a monta. `GUIA_MATERIAL_PATH` e `guiaMaterialHref` saem junto porque quem linka
 * para o guia (rodapé, bloco do pedido) precisa do endereço, e não do desenho.
 *
 * **O conteúdo mudou de casa na feature `44`** e agora mora em `@/entities/material` — a gaveta da
 * página do produto também o lê, e widget não importa de widget. Este barrel continua reexportando
 * tudo, que é o que permitiu o movimento sem tocar em `HowToSendMaterialPage.tsx` nem no teste dela.
 */
export * from '@/entities/material'

export { default as GuideChecklist } from './ui/GuideChecklist'
export { default as GuideHero } from './ui/GuideHero'
export { default as GuideSteps } from './ui/GuideSteps'
export { default as GuideWhatsAppCta } from './ui/GuideWhatsAppCta'
export { default as HomePrepSection } from './ui/HomePrepSection'
export { default as MaterialsSection } from './ui/MaterialsSection'
export { default as ShippingSection } from './ui/ShippingSection'
export { default as VideoGallery } from './ui/VideoGallery'
export { default as VideoLightbox } from './ui/VideoLightbox'
export { default as MaterialAddress } from './ui/MaterialAddress'
