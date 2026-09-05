import type { PaymentStatus } from '@estrelinha/supabase/types'

import type { PedidoVenda } from '../csv/types.ts'

/**
 * O de-para de status — de três eixos em português para dois em inglês.
 *
 * **A origem tem TRÊS eixos e o destino tem DOIS**, e essa é a assimetria que torna o mapeamento
 * não trivial. `Status do Pedido` (Aberto/Arquivado/Cancelado) é um eixo de **arquivo** — a Adri
 * arquiva quando quer —, enquanto `orders.status` é uma **faixa de operação**. Traduzir `Arquivado`
 * para `delivered` seria inventar uma entrega que ninguém registrou. Por isso o eixo de arquivo só
 * é lido para o caso `Cancelado`, e o resto sai de `Status do Envio`.
 *
 * Toda combinação medida está em `.specs/features/35-clientes-e-pedidos-nuvemshop/medicao.md`:
 * **5 triplas nos 35 pedidos importados**, e 10 no arquivo inteiro.
 *
 * Este módulo é **regra pura**: nada de Supabase, de Node, de rede. Ele existe aqui e não em
 * `packages/core` porque tem **um consumidor só** e nenhum segundo previsível — a loja nova não
 * fala com a Nuvemshop. `core` é para regra que dois consumidores compartilham.
 */

// ---------------------------------------------------------------------------------------------
// Os vocabulários da origem — fechados, e em português
// ---------------------------------------------------------------------------------------------

export const STATUS_PEDIDO = ['Aberto', 'Arquivado', 'Cancelado'] as const
export const STATUS_PAGAMENTO = ['Confirmado', 'Recusado', 'Pendente'] as const
export const STATUS_ENVIO = [
  'Não está embalado',
  'Pronto para enviar',
  'Enviado',
  'Entregue',
] as const

export type StatusPedido = (typeof STATUS_PEDIDO)[number]
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number]
export type StatusEnvio = (typeof STATUS_ENVIO)[number]

/**
 * O vocabulário do destino, espelhando `orders_status_check`.
 *
 * A constraint mora na migration `20260829120000_34-painel-de-vendas.sql`, e esta lista é uma
 * **cópia deliberada** — o importador roda em Node e não pode perguntar ao banco durante o
 * mapeamento. Pela regra do projeto, cópia deliberada vem com guarda que lê os dois do disco e
 * compara: `orderStatus.test.ts` lê aquela migration e confere item a item.
 */
export const ORDER_STATUSES = [
  'pending',
  'paid',
  'separating',
  'shipped',
  'delivered',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export class UnknownVocabularyError extends Error {}

// ---------------------------------------------------------------------------------------------
// Pagamento
// ---------------------------------------------------------------------------------------------

/**
 * `Recusado` é o único valor **ambíguo** do arquivo, e o próprio arquivo desfaz a ambiguidade.
 *
 * Medido: 6 ocorrências, cobrindo duas coisas diferentes — 4 PIX que venceram sem ninguém pagar
 * (`Vencimento do pagamento` preenchido, `Data de pagamento` vazia) e 2 cartões negados (`Parcelas`
 * preenchido, sem vencimento). Mapear os dois para o mesmo estado apagaria a diferença entre
 * "ninguém pagou" e "o cartão foi recusado" — e as duas pedem ação diferente da Adri: o primeiro
 * expira sozinho, o segundo vale um recado.
 *
 * `'ambiguo'` é um valor de trabalho, nunca um destino: `mapPaymentStatus` o resolve antes de
 * devolver. Está no tipo para que o `Record` continue TOTAL sobre o vocabulário da origem.
 */
const PAGAMENTO: Record<StatusPagamento, PaymentStatus | 'ambiguo'> = {
  Confirmado: 'approved',
  Pendente: 'pending',
  Recusado: 'ambiguo',
}

type EixosDePagamento = Pick<
  PedidoVenda,
  'statusPagamento' | 'vencimentoPagamento' | 'dataPagamento' | 'numero'
>

const exigirVocabulario = <T extends string>(
  valor: string,
  vocabulario: readonly T[],
  eixo: string,
  numero: number,
): T => {
  if ((vocabulario as readonly string[]).includes(valor)) return valor as T
  // ABORTA em vez de escolher um padrão. Padrão silencioso num eixo de dinheiro é como se separa
  // pedido não pago — e o `balance` do relatório fecharia do mesmo jeito.
  throw new UnknownVocabularyError(
    `pedido ${numero}: "${eixo}" trouxe "${valor}", fora do vocabulário conhecido (${vocabulario.join(', ')})`,
  )
}

export const mapPaymentStatus = (pedido: EixosDePagamento): PaymentStatus => {
  const bruto = exigirVocabulario(
    pedido.statusPagamento,
    STATUS_PAGAMENTO,
    'Status do Pagamento',
    pedido.numero,
  )

  const destino = PAGAMENTO[bruto]
  if (destino !== 'ambiguo') return destino

  return pedido.vencimentoPagamento !== null && pedido.dataPagamento === null
    ? 'expired'
    : 'rejected'
}

// ---------------------------------------------------------------------------------------------
// Faixa de operação
// ---------------------------------------------------------------------------------------------

/**
 * `Status do Envio` → faixa, quando ela é determinada só pelo envio.
 *
 * `null` significa "o envio não decide sozinho": aí quem decide é o pagamento. `Pronto para enviar`
 * cai aqui junto de `Não está embalado` porque nenhum dos dois diz que a peça saiu — e nenhum dos
 * dois significa "estou montando agora", que é o que `separating` quer dizer no painel.
 */
const ENVIO: Record<StatusEnvio, OrderStatus | null> = {
  Entregue: 'delivered',
  Enviado: 'shipped',
  'Não está embalado': null,
  'Pronto para enviar': null,
}

export const mapOrderStatus = (pedido: PedidoVenda): OrderStatus => {
  const pedidoBruto = exigirVocabulario(
    pedido.statusPedido,
    STATUS_PEDIDO,
    'Status do Pedido',
    pedido.numero,
  )
  const envioBruto = exigirVocabulario(
    pedido.statusEnvio,
    STATUS_ENVIO,
    'Status do Envio',
    pedido.numero,
  )

  // Cancelado VENCE os outros dois eixos. Um pedido cancelado pode ter sido pago e até despachado
  // antes do cancelamento, e o arquivo guarda esses valores — mas o que a Adri precisa ver é que
  // ele está cancelado.
  if (pedidoBruto === 'Cancelado') return 'cancelled'

  const porEnvio = ENVIO[envioBruto]
  if (porEnvio !== null) return porEnvio

  return mapPaymentStatus(pedido) === 'approved' ? 'paid' : 'pending'
}

// ---------------------------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------------------------

/** A chave da distribuição observada do relatório: a tripla crua, como veio. */
export const describeTriple = (pedido: PedidoVenda): string =>
  `${pedido.statusPedido} | ${pedido.statusPagamento} | ${pedido.statusEnvio}`

/**
 * `Motivo do cancelamento` já vem em português no arquivo (`"O cliente mudou de ideia"`,
 * `"Venda de teste"`, `"Outro motivo"`), então não há de-para: `orders.cancel_reason` é texto livre
 * e recebe o valor como está. Existe como função para o mapeamento ter um lugar só de onde tirar o
 * campo, e para o dia em que a origem passar a mandar código em vez de frase.
 */
export const mapCancelReason = (pedido: PedidoVenda): string | null =>
  pedido.statusPedido === 'Cancelado' ? pedido.motivoCancelamento : null
