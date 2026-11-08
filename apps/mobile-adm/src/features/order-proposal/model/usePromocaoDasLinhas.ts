import { COMBINADO_DESLIGADO, pedidoDoResumo } from './descontos'
import type { LinhaDaSacola } from './sacola'
import type { PromocaoDaLinha } from './tipos'
import { useResumoDaMontagem } from './useResumoDaMontagem'

export interface PromocaoDasLinhas {
  /** Por linha, na ordem: a promoção que vale nela, ou `null`. `null` inteiro: não há o que mostrar. */
  promocoes: (PromocaoDaLinha | null)[] | null
  /** A recusa (`42501`) que a porta lançou — a página a entrega à MESMA vigia das leituras. */
  erroBruto: unknown
}

/**
 * A promoção vigente de cada peça do passo 2, pela MESMA prévia do resumo
 * (`order-proposals?action=preview`): o app não lê promoções, e o servidor diz, por linha, qual vale.
 * Vai só a escolha (sem cupom nem desconto combinado: a pergunta é "esta peça está em promoção?"), com a
 * chamada anterior cancelada a cada mudança. Enquanto confere, com a prévia falhando ou recusada, não há
 * etiqueta nenhuma — nada inventado, nada bloqueado.
 */
export const usePromocaoDasLinhas = (linhas: readonly LinhaDaSacola[] | null, email: string): PromocaoDasLinhas => {
  const resumo = useResumoDaMontagem(linhas && linhas.length > 0 ? pedidoDoResumo(linhas, null, COMBINADO_DESLIGADO, email) : null)
  const pronta = linhas !== null && resumo.previa !== null && !resumo.conferindo && !resumo.falhou && resumo.recusa === null
  const promocoes = pronta ? linhas.map((_, i) => resumo.previa?.lines?.[i]?.promotion ?? null) : null
  return { promocoes, erroBruto: resumo.erroBruto }
}
