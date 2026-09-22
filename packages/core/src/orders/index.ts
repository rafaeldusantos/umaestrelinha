// `@estrelinha/core/orders` — o vocabulário de um pedido que os três consumidores compartilham.
//
// O barrel existe para a loja e o painel importarem por nome. A edge function `send-notification`
// **não** passa por aqui: ela alcança o arquivo por caminho relativo, com extensão explícita, e é
// o arquivo que o guarda de alcance protege.
export { formatOrderNumber, stripOrderNumberPrefix } from './format'
