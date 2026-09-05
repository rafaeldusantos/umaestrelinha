// `PED-17` / `D5` — a transição de material em lote.
//
// ---------------------------------------------------------------------------------------------
// POR QUE É UM LAÇO, E NÃO UMA RPC DE LOTE
// ---------------------------------------------------------------------------------------------
// **Não existe RPC de lote, e inventar uma seria uma segunda máquina de estado.** `set_material_status`
// guarda os estados de origem permitidos no próprio `where`, o que a torna idempotente sob
// concorrência; uma função nova que recebesse N ids teria de reimplementar essa guarda, e as duas
// divergiriam no primeiro ajuste — que é o defeito 01 aplicado a SQL.
//
// ---------------------------------------------------------------------------------------------
// POR QUE UMA FALHA NÃO ABORTA AS OUTRAS
// ---------------------------------------------------------------------------------------------
// Transição inválida é o caso ESPERADO, não a exceção: a Adri seleciona nove envelopes e dois deles
// outra aba já marcou. Abortar o lote inteiro por causa disso faria ela repetir tudo — e repetir um
// lote parcialmente aplicado é como se descobre que não dá para confiar no botão.
//
// O que o lote devolve é um RESUMO: quantas passaram, quantas não estavam em estado que permite, e
// quantas falharam de verdade. Três números diferentes, porque são três coisas diferentes.

import type { AdminOrderRow } from '@/entities/order/api/orderQuery'

/**
 * O teto por lote.
 *
 * Cada linha é uma ida ao servidor, então 200 seleções são 200 requisições em sequência — a tela
 * congelaria sem dizer por quê. Acima disso a resposta certa é filtrar melhor, e a barra diz isso.
 */
export const BULK_LIMIT = 50

export interface BulkOutcome {
  /** Passaram: a RPC devolveu `ok: true`. */
  changed: number
  /** A RPC recusou a transição — estado de origem não permitia. **Não é erro.** */
  refused: number
  /** A chamada falhou (rede, permissão). É erro, e aparece separado. */
  failed: number
  /** Os números do pedido que não passaram, para a tela poder nomeá-los. */
  refusedOrders: string[]
  failedOrders: string[]
}

export type MaterialTransitionFn = (
  id: string,
  status: string,
) => Promise<{ ok: boolean; reason: string | null }>

/**
 * Roda a transição linha a linha e resume.
 *
 * `rows` e não `ids`: a seleção guarda a **linha** (`PLS-06`), porque sem os valores atuais não há
 * como nomear o que não passou — e "2 não passaram" sem dizer quais é um relatório que ninguém
 * pode agir sobre.
 */
export const runMaterialBulk = async (
  rows: AdminOrderRow[],
  status: string,
  transition: MaterialTransitionFn,
): Promise<BulkOutcome> => {
  const outcome: BulkOutcome = {
    changed: 0,
    refused: 0,
    failed: 0,
    refusedOrders: [],
    failedOrders: [],
  }

  for (const row of rows.slice(0, BULK_LIMIT)) {
    try {
      const resultado = await transition(row.id, status)
      if (resultado.ok) {
        outcome.changed += 1
      } else if (resultado.reason === 'rpc_failed') {
        outcome.failed += 1
        outcome.failedOrders.push(row.order_number)
      } else {
        outcome.refused += 1
        outcome.refusedOrders.push(row.order_number)
      }
    } catch {
      // Uma exceção não pode encerrar o laço: as linhas seguintes não têm nada a ver com esta.
      outcome.failed += 1
      outcome.failedOrders.push(row.order_number)
    }
  }

  return outcome
}

/**
 * O resumo em texto — `"7 marcadas · 2 não estavam em estado que permite"`.
 *
 * Cada parcela só aparece quando é diferente de zero: "7 marcadas · 0 recusadas · 0 falharam" faz
 * quem lê procurar um problema que não existe.
 */
export const bulkSummary = (outcome: BulkOutcome): string => {
  const partes: string[] = []

  if (outcome.changed > 0) {
    partes.push(`${outcome.changed} marcada${outcome.changed === 1 ? '' : 's'}`)
  }
  if (outcome.refused > 0) {
    partes.push(
      `${outcome.refused} não estava${outcome.refused === 1 ? '' : 'm'} em estado que permite`,
    )
  }
  if (outcome.failed > 0) {
    partes.push(`${outcome.failed} falhou${outcome.failed === 1 ? '' : 'ram'}`)
  }

  return partes.length === 0 ? 'Nada mudou' : partes.join(' · ')
}
