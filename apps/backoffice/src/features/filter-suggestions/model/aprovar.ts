// "Aprovar N" e "Recusar N" da fila — feature 67 (`VFL-20`, `VFL-21`, `VFL-23`, `VFL-27`).
//
// **Uma requisição por tabela** (`VFL-20`): o alvo opção vai inteiro num `upsert` em
// `product_option_filter_values`; o alvo peça toda, num `upsert` em `product_filter_values`. Os dois
// com `ignoreDuplicates`, então aprovar o que já foi aprovado (outra aba, um clique duplo) é no-op.
//
// **A troca peça toda → opção** (`VFL-27`) é a ÚNICA escrita em duas etapas, e a ordem é a regra:
// grava a opção PRIMEIRO e só depois apaga a marcação da peça toda. Uma falha no meio deixa a peça
// marcada em dobro — inofensivo, a peça toda vence na loja e a próxima aprovação conserta —, e nunca
// sem marcação nenhuma, que tiraria a peça do filtro em silêncio.
//
// Nada é otimista: quem chama só invalida as leituras depois de o banco responder, e uma recusa do
// banco na PRIMEIRA escrita deixa tudo exatamente como estava (`VFL-23`).

import type { SuggestionGroup } from '@estrelinha/core/filters'
import {
  apagarMarcacoesNaPeca,
  gravarMarcacoesNaPeca,
  gravarMarcacoesPorOpcao,
  gravarRecusas,
} from '@/entities/filter'

export interface ResultadoDaAprovacao {
  /** A frase do erro, ou `null`. */
  erro: string | null
  /** Houve escrita no banco (mesmo com erro depois)? Quem chama relê quando sim. */
  gravou: boolean
}

export const aprovarSugestoes = async (
  grupo: SuggestionGroup,
  selecionadas: ReadonlySet<string>,
): Promise<ResultadoDaAprovacao> => {
  const escolhidas = grupo.suggestions.filter(s => selecionadas.has(s.product_id))
  if (escolhidas.length === 0) return { erro: null, gravou: false }

  if (grupo.target === 'product') {
    const erro = await gravarMarcacoesNaPeca(escolhidas.map(s => ({ product_id: s.product_id, value_id: s.value_id })))
    return { erro, gravou: !erro }
  }

  const erro = await gravarMarcacoesPorOpcao(
    escolhidas.map(s => ({
      product_id: s.product_id,
      option_name: s.option_name,
      option_value: s.option_value,
      value_id: s.value_id,
    })),
  )
  if (erro) return { erro, gravou: false }

  const trocam = escolhidas.filter(s => s.replacesWholeMark).map(s => s.product_id)
  if (trocam.length === 0) return { erro: null, gravou: true }
  const erroDaTroca = await apagarMarcacoesNaPeca(grupo.value_id, trocam)
  return {
    erro: erroDaTroca
      ? `As opções foram marcadas, mas a marcação da peça toda não saiu: ${erroDaTroca}`
      : null,
    gravou: true,
  }
}

/**
 * "Recusar N": as recusas do alvo de cada sugestão selecionada (`VFL-21`), numa requisição só. A
 * spec pede a recusa, não o número de requisições; o "uma só" é escolha deste arquivo, e quem a mede
 * é `aprovar.test.ts` ("recusar — várias selecionadas").
 */
export const recusarSugestoes = async (
  grupo: SuggestionGroup,
  selecionadas: ReadonlySet<string>,
): Promise<ResultadoDaAprovacao> => {
  const escolhidas = grupo.suggestions.filter(s => selecionadas.has(s.product_id))
  if (escolhidas.length === 0) return { erro: null, gravou: false }
  const erro = await gravarRecusas(
    escolhidas.map(s => ({
      product_id: s.product_id,
      value_id: s.value_id,
      option_name: s.option_name,
      option_value: s.option_value,
    })),
  )
  return { erro, gravou: !erro }
}
