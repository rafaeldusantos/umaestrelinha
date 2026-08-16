/**
 * O guia de material — a API pública do slice (feature 31).
 *
 * A página importa daqui, nunca de caminho profundo: é o barrel que deixa a seção mudar de arquivo
 * sem mexer em quem a monta. `GUIA_MATERIAL_PATH` e `guiaMaterialHref` saem junto porque quem linka
 * para o guia (rodapé, aviso de material da página do produto, bloco do pedido) precisa do endereço,
 * e não do desenho.
 */
export {
  ANCORAS_DO_GUIA,
  ATALHOS_DE_MATERIAL,
  CARTOES_DE_MATERIAL,
  CHECKLIST_DO_ENVIO,
  FICHAS_DE_MATERIAL,
  GUIA_MATERIAL_PATH,
  MATERIAIS_SEM_ANCORA,
  PASSOS_DO_ENVIO,
  PREPARO_EM_CASA,
  guiaMaterialHref,
} from './model/guide'
export type { CartaoDeMaterial, FichaDeMaterial, PassoDoEnvio, PreparoEmCasa } from './model/guide'

export { VIDEOS_DE_PREPARO, videoCapa, videoDoMaterial, videoEmbed, videoUrl } from './model/videos'
export type { VideoDePreparo } from './model/videos'

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
