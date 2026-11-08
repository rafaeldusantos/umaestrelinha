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
