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
  normalizeMaterialTrackingCode,
  normalizeTrackingCode,
  trackingSheet,
  type ConfirmationInput,
} from '@estrelinha/core/orders'
import { materialTrackingRefusal, materialTransitionRefusal, type MaterialStatus } from '@estrelinha/core/material'
import type { PedidoDaAcao } from '@estrelinha/core/order-actions'

import { LISTA_DE_PEDIDOS_KEY, chaveDoPedido, type LinhaDaLista } from '@/entities/order'

import { gravarAcao, type ResultadoDaAcao } from '../api/gravarAcao'
import { mostrarAviso } from './avisos'
import { definirErro, useEntradaDoErro, type ErroDaAcao, type OrigemDoErro } from './erros'
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
  /** O erro do pedido, de QUALQUER ação (a forma da `75`). As superfícies desenham `erroDe(...)`. */
  erro: ErroDaAcao | null
  /**
   * O erro do pedido só se a ação que o gerou é uma das `origens` (feature `82`, Fase 5, T17): o
   * rodapé e o cartão pedem `ERROS_DO_RODAPE`, a folha do envelope e o bloco dele `rastreio-do-material`,
   * a folha do rastreio de saída `rastreio`, e "Colocar em produção" `producao`.
   */
  erroDe: (origens: readonly OrigemDoErro[]) => ErroDaAcao | null
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
  // Feature `82` (`ENV-08`, `ENV-25`): as duas ações do bloco Material não são a primária do estado.
  if (pedido.tipo === 'rastreio-do-material') return { action: 'rastreio-do-material' }
  if (pedido.tipo === 'producao') return { action: 'producao' }
  const { action } = appPrimaryAction(row)
  return action === 'nenhuma' ? null : { action }
}

/** O erro do pedido para cada desfecho que não é sucesso; `null` ⇒ nenhuma frase (a releitura fala). */
const erroDoDesfecho = (r: Exclude<ResultadoDaAcao, { tipo: 'ok' }>, pedido: PedidoDaAcao): ErroDaAcao | null => {
  switch (r.tipo) {
    case 'mudou':
      return { frase: ORDER_CHANGED, retentativa: null }
    case 'material-recusado': {
      // `order_not_found`: a releitura leva ao "Não encontrei este pedido." (`MAA-04`, `MAP-29`).
      if (r.reason === 'order_not_found') return null
      const motivo = r.status ? materialTransitionRefusal(r.status as MaterialStatus, r.to as MaterialStatus) : null
      return { frase: motivo ?? ORDER_CHANGED, retentativa: null }
    }
    case 'material-rastreio-recusado':
      // Feature `82` (`ENV-09`): a recusa da RPC do código do envelope — a folha fica aberta com ela.
      return { frase: materialTrackingRefusal(r.reason), retentativa: null }
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
      return falhaDe(pedido)
  }
}

/**
 * A falha de rede ou de servidor (`falhou`, ou a exceção que não é recusa). Só o código do envelope
 * ganha retentativa (feature `82`, Fase 5, T16 — `BUG-20261026-rede-cai-ao-salvar-diz-que-nao-salvou`):
 * a RPC pode ter gravado com a resposta perdida, e o aviso `material_tracking_set` só sai num sucesso
 * visto pelo app. "Tentar de novo" regrava o MESMO código (a RPC é idempotente) e o aviso sai; se a
 * linha relida deixou de ser editável, o dono responde `mudou` sem ir à rede.
 */
const falhaDe = (pedido: PedidoDaAcao): ErroDaAcao => ({
  frase: ACTION_FAILED,
  retentativa:
    pedido.tipo === 'rastreio-do-material' ? { tipo: 'rastreio-do-material', codigo: normalizeMaterialTrackingCode(pedido.codigo) } : null,
})

export const useAcaoDoPedido = (id: string): AcaoDoPedido => {
  const queryClient = useQueryClient()
  const travado = useTravado(id)
  const entrada = useEntradaDoErro(id)
  const erro = entrada?.erro ?? null
  const erroDe = useCallback(
    (origens: readonly OrigemDoErro[]) => (entrada && origens.includes(entrada.de) ? entrada.erro : null),
    [entrada],
  )
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
                materialPassou: r.materialPassou,
                customer_name: row.customer_name,
                order_number: row.order_number,
              }),
            )
          }
          opcoes?.aoConcluir?.()
          return true
        }
        definirErro(id, erroDoDesfecho(r, pedido), pedido.tipo)
        return false
      } catch (e) {
        if (!mesmaConta()) return false
        if (isAccessDenied(e)) setErroBruto(e)
        else definirErro(id, falhaDe(pedido), pedido.tipo)
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

  return { executar, travado, erro, erroDe, erroBruto }
}
