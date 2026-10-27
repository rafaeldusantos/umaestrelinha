export { gravarAcao, type ResultadoDaAcao } from './api/gravarAcao'
export { travar, soltar, useTravado } from './model/travas'
export { mostrarAviso, limparAviso, useAviso, type AvisoMostrado } from './model/avisos'
export { definirErro, lerErro, lerOrigemDoErro, useErroDoPedido, ERROS_DO_RODAPE, type ErroDaAcao, type OrigemDoErro } from './model/erros'
export { esquecerAcoes } from './model/esquecerAcoes'
export { useAcaoDoPedido, type AcaoDoPedido } from './model/useAcaoDoPedido'
export { useFolhaNoHistorico, type FolhaNoHistorico } from './model/useFolhaNoHistorico'
export { registrarRodape, publicarAlturaDoRodape, useHaRodape } from './model/rodape'
export { default as AvisoDaAcao, PRAZO_DO_AVISO_MS } from './ui/AvisoDaAcao'
export { default as FolhaDoRastreio, ROTULO_DO_CAMPO, AGORA_NAO, SALVAR, type FolhaDoRastreioProps } from './ui/FolhaDoRastreio'
export { default as RodapeDaAcao, type RodapeDaAcaoProps } from './ui/RodapeDaAcao'
export { default as EditarRastreio, type EditarRastreioProps } from './ui/EditarRastreio'
export { default as LembreteDoEnvio, LEMBRAR_DO_ENVIO, type LembreteDoEnvioProps } from './ui/LembreteDoEnvio'
export { default as BotaoDaAcao, type BotaoDaAcaoProps } from './ui/BotaoDaAcao'
export { useRecusaDaAcao } from './model/useRecusaDaAcao'
export {
  default as EnvelopeDaCliente,
  COPIAR_CODIGO,
  INFORMAR_CODIGO,
  ROTULO_DO_CODIGO,
  TITULO_DO_ENVELOPE,
  VER_NOS_CORREIOS,
  type EnvelopeDaClienteProps,
} from './ui/EnvelopeDaCliente'
export { default as ColocarEmProducao, COLOCAR_EM_PRODUCAO, type ColocarEmProducaoProps } from './ui/ColocarEmProducao'
export type { CopiaDaFolha, OrigemDaFolha } from './model/useFolhaNoHistorico'
