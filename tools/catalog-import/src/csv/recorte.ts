import type { PedidoVenda } from './types.ts'

/**
 * O primeiro pedido da Uma Estrelinha.
 *
 * **O arquivo exportado carrega dois negócios.** Os pedidos `#100`..`#134` (abr–jun/2025) são de uma
 * loja de artigos religiosos que ocupou a mesma conta Nuvemshop: quartinhas, velas votivas, guias,
 * ferramentas de assentamento, imagens de orixás. O `#135` (03/07/2025) é o primeiro de joia
 * afetiva, e daí em diante são todos.
 *
 * Medido em 2026-08-30: 35 pedidos de cada lado, e **zero e-mail em comum** — são duas bases de
 * clientes distintas. Decisão do usuário na mesma data: importar só a partir daqui.
 *
 * **Por que um número e não uma heurística sobre o nome do produto.** Uma regex de "parece joia"
 * erra em quatro pedidos reais — `#108`, `#114`, `#126` e `#133` têm "Pingente roda cigana",
 * "Pingente espelho de Oxum" e afins, que casam com qualquer lista de palavras e são artigo
 * religioso. O corte é uma data de virada de negócio, não uma propriedade do item: um literal com a
 * medição ao lado é honesto, e a regex seria adivinhação disfarçada de regra.
 */
export const PRIMEIRO_PEDIDO = 135

/**
 * **Sem teto, de propósito.** O arquivo de hoje vai até `#169`, mas um export futuro trará pedidos
 * novos — e um `max` os deixaria de fora em silêncio, que é o pior desfecho possível: o import
 * passaria verde importando um espelho velho.
 */
export const dentroDoRecorte = (pedido: Pick<PedidoVenda, 'numero'>): boolean =>
  pedido.numero >= PRIMEIRO_PEDIDO

export interface Recorte {
  dentro: PedidoVenda[]
  fora: PedidoVenda[]
}

/** Separa em vez de filtrar: quem ficou de fora vai para o relatório, não para o silêncio. */
export const aplicarRecorte = (pedidos: PedidoVenda[]): Recorte => ({
  dentro: pedidos.filter(dentroDoRecorte),
  fora: pedidos.filter(p => !dentroDoRecorte(p)),
})
