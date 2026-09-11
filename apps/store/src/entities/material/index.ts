/**
 * Material afetivo — a API pública do slice (feature `44`).
 *
 * **O conteúdo do guia mora aqui, e não em `widgets/material-guide`, desde a feature `44`**, e a
 * razão é a regra de camadas: as duas superfícies que o leem são widgets — a página do guia
 * (`widgets/material-guide`) e a gaveta da página do produto (`widgets/material-drawer`) —, e widget
 * não importa de widget. `entities` é a camada estritamente abaixo que as duas alcançam.
 *
 * Não foi para `packages/core` de propósito (`AD-033`): os dois consumidores são widgets do **mesmo
 * app**, e levar o conteúdo para lá exigiria ou uma dependência `core → @estrelinha/ui` (o tipo
 * `EstrelinhaIconName`), que `core/menu/__tests__/purity.test.ts` proíbe explicitamente, ou um
 * segundo vocabulário de ícones em core no molde de `core/menu/icons.ts` — uma cópia para evitar uma
 * cópia.
 *
 * O barrel de `widgets/material-guide` continua reexportando tudo isto, para que a página e o teste
 * dela não precisassem mudar uma linha no movimento.
 */
export {
  ANCORAS_DO_GUIA,
  ATALHOS_DE_MATERIAL,
  AVISO_SEM_RASTREIO,
  CARTOES_DE_MATERIAL,
  CHECKLIST_DO_ENVIO,
  DECLARACAO,
  DEPOIS_DE_POSTAR,
  FICHAS_DE_MATERIAL,
  FORMAS_DE_ENVIO,
  GUIA_MATERIAL_PATH,
  MATERIAIS_SEM_ANCORA,
  PASSOS_DO_ENVIO,
  PREPARO_EM_CASA,
  guiaMaterialHref,
} from './model/guide'
export type {
  AtalhoDeMaterial,
  AvisoDaFicha,
  CartaoDeMaterial,
  FichaDeMaterial,
  FormaDeEnvio,
  PassoDePreparo,
  PassoDoEnvio,
  PreparoEmCasa,
  TomDoAviso,
} from './model/guide'

export { VIDEOS_DE_PREPARO, videoCapa, videoDoMaterial, videoEmbed, videoUrl } from './model/videos'
export type { VideoDePreparo } from './model/videos'

export { useMaterialDrawerStore } from './model/materialDrawerStore'
export { default as MaterialAviso } from './ui/MaterialAviso'
export { default as MaterialSendTrigger } from './ui/MaterialSendTrigger'
