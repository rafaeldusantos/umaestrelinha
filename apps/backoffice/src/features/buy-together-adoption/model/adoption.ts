// O relatório de adesão ao Compre Junto — a forma da resposta de `buy_together_adoption` e as frases
// da tela. Quem CONTA é o banco (a RPC); aqui só se escreve o que ela devolveu. Os números são de
// pedidos e de peças, nunca de pessoas.

/** Os períodos do relatório, em dias de Brasília contando o de hoje. O banco recusa qualquer outro. */
export const ADOPTION_PERIODS = [7, 30, 90] as const
export type AdoptionPeriod = (typeof ADOPTION_PERIODS)[number]
export const DEFAULT_ADOPTION_PERIOD: AdoptionPeriod = 30

export interface AdoptionByMain {
  principal: string
  nome: string
  pedidos: number
  pecas: number
  valor: number
  /** O que as peças levadas junto com esta joia deixaram de custar: preço cheio − preço pago. */
  desconto_concedido: number
  top_nome: string | null
}

export interface AdoptionByList {
  /** `null` na linha da peça escolhida direto no produto. */
  lista_id: string | null
  direto: boolean
  /** O nome de hoje; `null` na lista apagada e na linha direta. */
  nome: string | null
  pecas: number
  valor: number
  /** O que as peças desta lista deixaram de custar: preço cheio − preço pago. */
  desconto_concedido: number
  top_nome: string | null
}

export interface BuyTogetherAdoption {
  dias: number
  desde: string
  hoje: string
  lido_em: string
  pedidos_pagos: number
  pedidos_com: number
  pecas: number
  /** O preço pago nas peças levadas junto, já líquido de qualquer desconto. */
  valor: number
  /**
   * Tudo o que as peças levadas junto deixaram de custar (preço cheio − preço pago), qualquer que seja
   * o desconto que venceu na linha; a linha sem preço cheio (pedido de antes) conta 0. Calculado pelo banco.
   */
  desconto_concedido: number
  /** Pedidos com Compre Junto ÷ pedidos pagos; `null` sem pedido pago. */
  parte: number | null
  /** Peças ÷ pedidos com Compre Junto; `null` sem pedido com Compre Junto. */
  media: number | null
  por_joia: AdoptionByMain[]
  por_lista: AdoptionByList[]
}

export const RULE_NOTE =
  'Conta pedidos pagos e não cancelados, no dia de Brasília — a mesma régua do Dashboard. Uma peça conta quando entrou na sacola pelo Compre Junto e a joia dela está no mesmo pedido.'

export const DIRECT_PIECE_LABEL = 'Peça escolhida direto no produto'
export const DELETED_LIST_LABEL = 'Lista apagada'
export const NO_TOP_PIECE = '—'
export const DISCOUNT_GIVEN_LABEL = 'Desconto concedido'

export const periodLabel = (dias: number): string => `${dias} dias`

export const emptyLine = (dias: number): string => `Nenhum pedido teve peças compradas junto nos últimos ${dias} dias.`

/** "75% dos 4 pedidos pagos" — com a parte vinda do banco, nunca recalculada aqui. */
export const shareLine = (parte: number | null, pagos: number): string => {
  if (!pagos || parte === null) return 'Nenhum pedido pago no período'
  const pct = `${Math.round(Number(parte) * 100)}%`
  return pagos === 1 ? `${pct} do 1 pedido pago` : `${pct} dos ${pagos} pedidos pagos`
}

/** "1,7 por pedido, em média". */
export const averageLine = (media: number | null): string => {
  if (media === null || media === undefined) return 'sem média no período'
  return `${Number(media).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} por pedido, em média`
}

export const listLabel = (linha: AdoptionByList): string =>
  linha.direto ? DIRECT_PIECE_LABEL : linha.nome ?? DELETED_LIST_LABEL

/** A largura da barra de valor, em % do maior valor do recorte (arredondada). Zero sem valor. */
export const barWidth = (valor: number, maior: number): string =>
  maior > 0 ? `${Math.round((Number(valor) / maior) * 100)}%` : '0%'
