// Quais serviços do Melhor Envio a loja oferece — domínio puro (roda em Node, Deno e browser).
//
// Este arquivo é o **dono único** da pergunta:
//
//   > Que fretes a cliente pode escolher?
//
// A resposta é **Correios PAC e SEDEX**, e só. A cotação do Melhor Envio devolve todo serviço que a
// conta alcança (Jadlog .Package e .Com, Mini Envios, Loggi…), e a loja exibia todos. Quem responde
// é a edge function `melhor-envio` ao filtrar a cotação — as três telas que cotam (o checkout, o
// cálculo da página do produto e a aba Melhor Envio do pedido) leem a mesma resposta, então a regra
// vale para as três sem nenhuma delas reescrevê-la.
//
// A identidade é o **id do serviço**, nunca o nome: o id é estável entre sandbox e produção
// (1 = PAC, 2 = SEDEX), e o nome é texto de exibição que o Melhor Envio pode mudar.
//
// Os imports deste módulo (nenhum) e o arquivo em si são alcançados pelo Deno por caminho relativo
// com extensão explícita — não acrescente import sem `.ts`.

/** Ids dos serviços do Melhor Envio que a loja oferece, na ordem de exibição. */
export const ALLOWED_SHIPPING_SERVICE_IDS: readonly number[] = [
  1, // Correios PAC
  2, // Correios SEDEX
]

/** O valor do campo `services` da API de cotação: ids separados por vírgula. */
export const ALLOWED_SHIPPING_SERVICES_PARAM = ALLOWED_SHIPPING_SERVICE_IDS.join(',')

/** `true` quando o serviço cotado é um dos que a loja oferece. Aceita id numérico ou string. */
export function isAllowedShippingService(id: unknown): boolean {
  const n = typeof id === 'string' && id.trim() !== '' ? Number(id) : id
  return typeof n === 'number' && ALLOWED_SHIPPING_SERVICE_IDS.includes(n)
}
