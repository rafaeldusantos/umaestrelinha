import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@estrelinha/auth'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { ACTION_FAILED, ORDER_CHANGED, adminNoteRefusal } from '@estrelinha/core/orders'

import { chaveDoPedido } from '@/entities/order'

import { gravarObservacao } from '../api/gravarAcao'
import { mostrarAviso } from './avisos'
import { definirErro, useEntradaDoErro, type ErroDaAcao } from './erros'
import { geracaoDasAcoes } from './esquecerAcoes'
import { soltar, travar, useTravado } from './travas'

/** A confirmação da gravação (o `AvisoDaAcao` do layout, `role="status"`). */
export const OBSERVACAO_SALVA = 'Observação salva.'
export const OBSERVACAO_APAGADA = 'Observação apagada.'

export interface ObservacaoDoPedidoAcao {
  /**
   * Grava pela porta. `true` só no sucesso (e `aoConcluir` é chamado antes da releitura); `false` no
   * toque travado, na recusa do teto, na falha, na recusa de papel e na troca de conta.
   */
  salvar: (texto: string, opcoes?: { aoConcluir?: () => void }) => Promise<boolean>
  /** A trava do PEDIDO — a mesma do rodapé, do cartão e das folhas do rastreio. */
  travado: boolean
  /** O erro do pedido, só se quem o gerou foi a observação. */
  erro: ErroDaAcao | null
  /** A recusa (`42501`) que a porta lançou — a página a passa à vigia (`useRecusaDePapel`). */
  erroBruto: unknown
}

/**
 * A gravação da observação do pedido no app do ateliê, no molde de `useAcaoDoPedido`:
 *
 * 1. `travar(id)` — a trava por pedido, em módulo; o segundo toque no mesmo tique não sai;
 * 2. `gravarObservacao` (a porta: confere o papel e entrega o client ao dono de `core`);
 * 3. em todo desfecho que chegou à rede, relê o detalhe (a observação mora na leitura dele);
 * 4. `soltar(id)` no `finally`.
 *
 * O teto é recusado ANTES da trava e da rede, pela regra de `core` (`adminNoteRefusal`). O erro
 * fica em módulo (`definirErro(…, 'observacao')`) e o texto digitado fica na folha, que não fecha.
 *
 * O nome de quem grava vai na linha (`updated_by_name`): o nome do cadastro, senão o e-mail — a
 * mesma escolha do painel (`useOrderAdminNote`).
 */
export const useObservacaoDoPedido = (id: string): ObservacaoDoPedidoAcao => {
  const queryClient = useQueryClient()
  const { user, customer } = useAuthContext()
  const travado = useTravado(id)
  const entrada = useEntradaDoErro(id)
  const erro = entrada?.de === 'observacao' ? entrada.erro : null
  const [erroBruto, setErroBruto] = useState<unknown>(null)

  const salvar = useCallback(
    async (texto: string, opcoes?: { aoConcluir?: () => void }): Promise<boolean> => {
      if (adminNoteRefusal(texto) !== null) return false
      if (!travar(id)) return false
      const geracao = geracaoDasAcoes()
      const mesmaConta = () => geracaoDasAcoes() === geracao
      const autor = { userId: user?.id ?? null, userName: customer?.name?.trim() || user?.email || null }
      try {
        const r = await gravarObservacao(id, texto, autor)
        if (!mesmaConta()) return false
        setErroBruto(null)
        if (r.tipo === 'ok') {
          definirErro(id, null)
          mostrarAviso({ titulo: r.nota ? OBSERVACAO_SALVA : OBSERVACAO_APAGADA })
          opcoes?.aoConcluir?.()
          return true
        }
        const frase = r.tipo === 'mudou' ? ORDER_CHANGED : r.tipo === 'recusado' ? r.motivo : ACTION_FAILED
        definirErro(id, { frase, retentativa: null }, 'observacao')
        return false
      } catch (e) {
        if (!mesmaConta()) return false
        if (isAccessDenied(e)) setErroBruto(e)
        else definirErro(id, { frase: ACTION_FAILED, retentativa: null }, 'observacao')
        return false
      } finally {
        void queryClient.invalidateQueries({ queryKey: chaveDoPedido(id) })
        if (mesmaConta()) soltar(id)
      }
    },
    [id, queryClient, user, customer],
  )

  return { salvar, travado, erro, erroBruto }
}
