// Feature 86: a tela do menu monta a partir daqui. Os editores da 39, que gravavam em `categories`
// (a lista da árvore, o painel de filhas, o card de abas e o cadastro de link), foram apagados na T20.
export { NOME_DA_SUPERFICIE, outraSuperficie } from './model/superficie'
export { default as MenuBannerEditor } from './ui/MenuBannerEditor'
export { default as MenuIconPicker } from './ui/MenuIconPicker'
export { default as MenuLivePreview } from './ui/MenuLivePreview'
export { default as MenuTree } from './ui/MenuTree'
export { default as MenuTargetPicker } from './ui/MenuTargetPicker'
export { default as MenuItemEditor, type MenuItemEdit } from './ui/MenuItemEditor'
export { default as MenuRemoveConfirm } from './ui/MenuRemoveConfirm'
export {
  MOTIVO_USADA,
  fraseDasFilhasQueEntram,
  fraseDasSubcategoriasDeFora,
  fraseDoSubmenu,
  type MenuPickerMode,
} from './model/textosDoMenu'
export { PAGINAS_DA_LOJA, type PaginaDaLoja } from './model/paginasDaLoja'
export {
  addChildNode,
  addRootNode,
  moveNode,
  removeNode,
  toggleSurface,
  updateNode,
  type NovoNo,
} from './model/documentOps'
export {
  STORE_MENU_CONFLICT_MESSAGE,
  STORE_MENU_LOAD_FAILURE,
  STORE_MENU_SALVO_MS,
  STORE_MENU_SAVE_FAILURE,
  STORE_MENU_SAVE_UNKNOWN,
  useStoreMenu,
} from './model/useStoreMenu'
