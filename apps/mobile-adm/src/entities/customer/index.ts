export {
  COLUNAS_DA_CIDADE,
  COLUNAS_DA_FICHA,
  COLUNAS_DA_LISTA,
  COLUNAS_DO_ACHADO,
  COLUNAS_DO_PEDIDO,
  COLUNAS_DOS_ITENS,
  type CabecalhoDeCliente,
  type FichaDeCliente,
  type JanelaDeClientes,
  type LinhaDeCliente,
  type PedidoDaFicha,
} from './model/linha'
export { inicialDoCliente, nomeDoCliente, telefoneDoCliente, type TelefoneDoCliente } from './model/identidade'
export {
  FALHA_AO_ABRIR_CLIENTE,
  FALHA_DA_LISTA,
  FALHA_DOS_PEDIDOS,
  LEGENDA_DOS_NUMEROS,
  NAO_ENCONTREI_CLIENTE,
  VAZIO_EM_ABERTO,
  LIMPAR_CLIENTES,
  LIMPOU_CLIENTES,
  SEM_RESULTADO_FALADO,
  maisPedidosNaLista,
  VAZIO_SEM_CLIENTE,
  VAZIO_SEM_RECORRENTE,
  clienteDesde,
  contagemDaLista,
  rotuloDoPedido,
  subtituloDaLinha,
  ticketMedio,
  tituloDosPedidos,
  vazioDaBusca,
} from './model/frases'
export {
  CLIENTES_PATH,
  clienteHref,
  clientesHref,
  lerRecorteDeClientes,
  recorteDeClientesDoEndereco,
} from './model/clientesHref'
export { LISTA_DE_CLIENTES_KEY, chaveDaListaDeClientes, tamanhoDaJanelaDeClientes, useListaDeClientes } from './api/useListaDeClientes'
export { CLIENTE_KEY, chaveDoCliente, useCliente } from './api/useCliente'
export { PEDIDOS_DA_CLIENTE_KEY, chaveDosPedidosDoCliente, usePedidosDoCliente } from './api/usePedidosDoCliente'
export { buscarClientePorEmail } from './api/buscarClientePorEmail'
export { default as LinhaDoCliente } from './ui/LinhaDoCliente'
export { default as SeloEmAberto, ROTULO_EM_ABERTO } from './ui/SeloEmAberto'
export { default as Inicial } from './ui/Inicial'
