export {
  cancelarMontado,
  gravarObservacaoDoMontado,
  lerMontado,
  listarMontados,
  registrarEnvio,
  renovarMontado,
  type ErroDaProposta,
  type RespostaDePropostas,
} from './api/portaDePropostas'
export * from './model/frases'
export type {
  CanalDoEnvio,
  EventoDoMontado,
  LeituraDoMontado,
  ListaDeMontados,
  MontadoNaLista,
  MontadoRenovado,
  PecaDoMontado,
  PecaResumida,
  PedidoMontado,
} from './model/tipos'
export { MONTADOS_KEY, MONTADO_KEY, chaveDoMontado, useMontado, useMontados, type DetalheDoMontado, type MontadoAchado } from './model/useMontados'
export {
  useAcoesDoMontado,
  type AcoesDoMontado,
  type AvisoDoMontado,
  type LinkRenovado,
  type PrecosMudados,
} from './model/useAcoesDoMontado'
export { default as SeloDoMontado } from './ui/SeloDoMontado'
export { default as CartaoDoLink, type ConteudoDoLink, type CartaoDoLinkProps } from './ui/CartaoDoLink'
export { default as FolhaDeConfirmacao, type FolhaDeConfirmacaoProps } from './ui/FolhaDeConfirmacao'
export * from './model/montagem'
export { usePassosDaMontagem, type PassosDaMontagem } from './model/usePassosDaMontagem'
export { default as PassoDaCliente, type PassoDaClienteProps, type BuscaDaMontagem } from './ui/PassoDaCliente'
export * from './model/frasesDaMontagem'
export { useLeituraDoTexto, type LeituraDoTexto } from './model/useLeituraDoTexto'
export { default as FolhaColarTexto, type FolhaColarTextoProps } from './ui/FolhaColarTexto'
export * from './model/sacola'
export { default as PassoDasPecas, type PassoDasPecasProps, type CatalogoDoPasso } from './ui/PassoDasPecas'
export { default as FolhaDaVariacao, type FolhaDaVariacaoProps } from './ui/FolhaDaVariacao'
export * from './model/descontos'
export { conferirResumo } from './api/portaDePropostas'
export type { PreviaDaMontagem, ResumoDaMontagem } from './model/tipos'
export { useResumoDaMontagem, type ResumoDaMontagemNaTela } from './model/useResumoDaMontagem'
export { useAplicarCupom, type AplicarCupom } from './model/useAplicarCupom'
export { default as PassoDosDescontos, type PassoDosDescontosProps } from './ui/PassoDosDescontos'
export {
  ALTERACOES_SALVAS,
  CARREGANDO_O_MONTADO,
  CRIANDO_O_LINK,
  CRIAR_LINK,
  EDITAR_PEDIDO_MONTADO,
  LINK_CRIADO,
  NOTA_DO_EDITAR,
  O_LINK_CONTINUA,
  SALVAR_ALTERACOES,
  agoraEhSoMandar,
  corpoDoSave,
  enderecoDaEntrega,
  montagemDoMontado,
  motivoDaRevisao,
  notaDaRevisao,
  type AlvoDoSave,
  type CorpoDoSave,
} from './model/revisao'
export { salvarMontado } from './api/portaDePropostas'
export { cotarFrete } from './api/portaDaCotacao'
export type { MontadoSalvo } from './model/tipos'
export { useCriarLink, type CriarLink } from './model/useCriarLink'
export { lerCotacao, useCotacaoDaRevisao, useRelogioDaMontagem, COTACAO_DA_MONTAGEM_KEY, RELOGIO_DA_MONTAGEM_KEY } from './model/useCotacaoDaRevisao'
export { marcarEdicao, edicaoMarcada, esquecerEdicao, deixarDesfecho, type DesfechoDaGravacao } from './model/montadoEmEdicao'
export { default as PassoRevisar, type PassoRevisarProps } from './ui/PassoRevisar'
export {
  RASCUNHO_KEY,
  apagarRascunho,
  guardarRascunho,
  lerRascunho,
  rascunhoDaMontagem,
  retomadaDoRascunho,
  type Rascunho,
  type Retomada,
} from './model/rascunho'
export type { PromocaoDaLinha } from './model/tipos'
export { usePromocaoDasLinhas, type PromocaoDasLinhas } from './model/usePromocaoDasLinhas'
