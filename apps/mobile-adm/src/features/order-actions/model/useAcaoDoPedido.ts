import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { STORE_OVERVIEW_KEY, isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import {
  ACTION_FAILED,
  ORDER_CHANGED,
  PARTIAL_MATERIAL,
  PARTIAL_TRACKING,
  actionConfirmation,
  appPrimaryAction,
  normalizeTrackingCode,
  trackingSheet,
  type ConfirmationInput,
} from '@estrelinha/core/orders'
import { materialTransitionRefusal, type MaterialStatus } from '@estrelinha/core/material'
import type { PedidoDaAcao } from '@estrelinha/core/order-actions'

import { LISTA_DE_PEDIDOS_KEY, chaveDoPedido, type LinhaDaLista } from '@/entities/order'

import { gravarAcao, type ResultadoDaAcao } from '../api/gravarAcao'
import { mostrarAviso } from './avisos'
import { definirErro, useErroDoPedido, type ErroDaAcao } from './erros'
import { geracaoDasAcoes } from './esquecerAcoes'
import { soltar, travar, useTravado } from './travas'

/**
 * A ação de UM pedido: trava, releitura, confirmação e erro (feature `75`, design §3.5, §7).
 *
 * Lida pelo rodapé do detalhe, pelo cartão da lista, pela folha do rastreio e pela linha
 * "Informar/Alterar" — todos com o MESMO estado, porque a trava, o aviso e o erro moram em módulo.
 *
 * `executar(row, pedido)`:
 *   1. `travar(id)` — o segundo toque no MESMO tique não sai (`MAA-20`);
 *   2. `gravarAcao` (a porta: o dono grava, "zero linhas" vira pergunta ao banco);
 *   3. em TODO desfecho que chegou à rede — inclusive a recusa lançada — relê o pedido, todos os
 *      recortes da lista e o resumo do selo (A21, `MAA-41`). Nunca `setQueryData`: o dado vem do banco;
 *   4. `soltar(id)` no `finally`.
 *
 * A troca de conta no meio (o que `LimparCacheNaTrocaDeConta` sinaliza com `esquecerAcoes`): nada é
 * desenhado, e a trava que a conta nova possa ter posto no mesmo pedido não é solta.
 * SPEC_DEVIATION (forma — §3.5 compara `user.id` do início e do fim): a régua é a GERAÇÃO das ações,
 * que sobe exatamente na troca de conta e vale também com o componente já desmontado (a saída desmonta
 * as páginas sob o `RequireAdmin`, e um `user.id` lido do render ficaria velho).
 */
/** O que quem chama pode pedir a `executar`. */
export interface OpcoesDaExecucao {
  /**
   * Chamado no SUCESSO, antes da releitura sair (a folha do rastreio fecha aqui: a releitura de um
   * pedido que acabou de ir a `shipped` não pode ser lida como "o pedido mudou com a folha aberta").
   */
  aoConcluir?: () => void
}

export interface AcaoDoPedido {
  /** `true` só no sucesso desenhado; `false` no toque travado, na falha, na recusa e na troca de conta. */
  executar: (row: LinhaDaLista, pedido: PedidoDaAcao, opcoes?: OpcoesDaExecucao) => Promise<boolean>
  travado: boolean
  erro: ErroDaAcao | null
  /** A recusa lançada pela porta — a página a passa a `useRecusaDePapel`. */
  erroBruto: unknown
}

/** O que a confirmação precisa saber do plano, calculado ANTES da escrita (a linha que a Adri viu). */
const entradaDaConfirmacao = (row: LinhaDaLista, pedido: PedidoDaAcao): Pick<ConfirmationInput, 'action' | 'citaEmailSeEnviado'> | null => {
  if (pedido.tipo === 'rastreio') {
    const folha = trackingSheet(row, pedido.origem)
    if (!folha) return null
    return { action: folha.modo === 'enviar' ? 'marcar-enviado' : 'salvar-rastreio', citaEmailSeEnviado: folha.citaEmailSeEnviado }
  }
  const { action } = appPrimaryAction(row)
  return action === 'nenhuma' ? null : { action }
}

/** O erro do pedido para cada desfecho que não é sucesso; `null` ⇒ nenhuma frase (a releitura fala). */
const erroDe = (r: Exclude<ResultadoDaAcao, { tipo: 'ok' }>, pedido: PedidoDaAcao): ErroDaAcao | null => {
  switch (r.tipo) {
    case 'mudou':
      return { frase: ORDER_CHANGED, retentativa: null }
    case 'material-recusado': {
      // `order_not_found`: a releitura leva ao "Não encontrei este pedido." (`MAA-04`, `MAP-29`).
      if (r.reason === 'order_not_found') return null
      const motivo = r.status ? materialTransitionRefusal(r.status as MaterialStatus, r.to as MaterialStatus) : null
      return { frase: motivo ?? ORDER_CHANGED, retentativa: null }
    }
    case 'parcial':
      // A retentativa diz o que reenvia: com a linha relida já sem "Iniciar separação" (outra aba, o
      // painel), o dono devolve `mudou` sem ir à rede — nunca "Não consegui salvar" (QA C01).
      if (r.etapa === 'material') return { frase: PARTIAL_MATERIAL, retentativa: { tipo: 'primaria', espera: 'separar' } }
      return {
        frase: PARTIAL_TRACKING,
        retentativa:
          pedido.tipo === 'rastreio'
            ? { tipo: 'rastreio', codigo: normalizeTrackingCode(pedido.codigo), origem: pedido.origem }
            : null,
      }
    default:
      return { frase: ACTION_FAILED, retentativa: null }
  }
}

export const useAcaoDoPedido = (id: string): AcaoDoPedido => {
  const queryClient = useQueryClient()
  const travado = useTravado(id)
  const erro = useErroDoPedido(id)
  const [erroBruto, setErroBruto] = useState<unknown>(null)

  const executar = useCallback(
    async (row: LinhaDaLista, pedido: PedidoDaAcao, opcoes?: OpcoesDaExecucao): Promise<boolean> => {
      if (!travar(id)) return false
      const geracao = geracaoDasAcoes()
      const mesmaConta = () => geracaoDasAcoes() === geracao
      const confirmacao = entradaDaConfirmacao(row, pedido)
      try {
        const r = await gravarAcao(row, pedido)
        if (!mesmaConta()) return false
        setErroBruto(null)
        if (r.tipo === 'ok') {
          definirErro(id, null)
          if (confirmacao) {
            mostrarAviso(
              actionConfirmation({
                ...confirmacao,
                emailSent: r.emailSent,
                materialMudou: r.materialMudou,
                customer_name: row.customer_name,
                order_number: row.order_number,
              }),
            )
          }
          opcoes?.aoConcluir?.()
          return true
        }
        definirErro(id, erroDe(r, pedido))
        return false
      } catch (e) {
        if (!mesmaConta()) return false
        if (isAccessDenied(e)) setErroBruto(e)
        else definirErro(id, { frase: ACTION_FAILED, retentativa: null })
        return false
      } finally {
        void queryClient.invalidateQueries({ queryKey: chaveDoPedido(id) })
        void queryClient.invalidateQueries({ queryKey: [LISTA_DE_PEDIDOS_KEY] })
        void queryClient.invalidateQueries({ queryKey: STORE_OVERVIEW_KEY })
        if (mesmaConta()) soltar(id)
      }
    },
    [id, queryClient],
  )

  return { executar, travado, erro, erroBruto }
}
