export { useAdminResolvedHome } from './model/useAdminResolvedHome'
export {
  uploadHomeImage,
  HOME_BUCKET,
  HOME_FOLDER,
  type HomeImageUpload,
} from './lib/uploadHomeImage'
export { default as HomeBlockTray } from './ui/HomeBlockTray'
export { default as HomeSectionEditor, type SectionSaveDraft } from './ui/HomeSectionEditor'
export {
  SECTION_EDITORS,
  type EditorProduct,
  type SectionEditorProps,
  type SectionEditorEntry,
} from './ui/sectionEditors'
export {
  applyDraft,
  draftKey,
  emptyDraftItem,
  itemsChanged,
  toDraftItems,
  toNewItems,
  type DraftItem,
} from './model/sectionDraft'
// A prévia é a LOJA, num iframe (feature 25). O `HomePreview` esquemático — 277 linhas redesenhando
// à mão o que `apps/store/src/widgets/home-renderer` já desenha — foi removido junto com o segundo
// desenho da Home.
export { default as HomeLivePreview } from './ui/HomeLivePreview'
export { usePreviewBridge } from './model/usePreviewBridge'
export { default as HomeSectionList } from './ui/HomeSectionList'
export { default as HomeSectionRow } from './ui/HomeSectionRow'
