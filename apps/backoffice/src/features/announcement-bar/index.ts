// A tela "Faixa de avisos" monta a partir daqui.
export { default as AnnouncementLivePreview } from './ui/AnnouncementLivePreview'
export { default as AnnouncementList } from './ui/AnnouncementList'
export type { CampoDeArte } from './ui/AnnouncementFields'
export {
  avisoVazio,
  faixaDoGravado,
  moverAviso,
  paraGravar,
  recusaDoAviso,
  type AvisoRascunho,
  type FaixaRascunho,
} from './model/rascunho'
export { useAnnouncementsPreviewBridge } from './model/useAnnouncementsPreviewBridge'
export {
  ANNOUNCEMENT_BUCKET,
  ANNOUNCEMENT_FOLDER,
  deleteAnnouncementImage,
  uploadAnnouncementImage,
} from './lib/uploadAnnouncementImage'
