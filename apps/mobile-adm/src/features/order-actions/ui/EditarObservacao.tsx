import type { LinhaDaLista, ObservacaoDoPedido } from '@/entities/order'

import { useFolhaNoHistorico } from '../model/useFolhaNoHistorico'
import type { ObservacaoDoPedidoAcao } from '../model/useObservacaoDoPedido'
import FolhaDaObservacao from './FolhaDaObservacao'

export const ADICIONAR_OBSERVACAO = 'Adicionar observação'
export const EDITAR_OBSERVACAO = 'Editar'

/**
 * A ação do bloco "Observação" do detalhe: "Adicionar observação" sem observação gravada,
 * "Editar" com ela — e a folha. O nome acessível de "Editar" diz o quê ("Editar observação"),
 * começando pelo rótulo visível (WCAG 2.5.3). Alvo de 44 px. Molde de `EditarRastreio`.
 */
export interface EditarObservacaoProps {
  pedido: LinhaDaLista
  observacao: ObservacaoDoPedidoAcao
  gravada: ObservacaoDoPedido | null
}

const EditarObservacao = ({ pedido, observacao, gravada }: EditarObservacaoProps) => {
  const controle = useFolhaNoHistorico(pedido, 'observacao')
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!observacao.travado) controle.abrir()
        }}
        data-testid="editar-observacao"
        className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-medium text-estrelinha-primary underline underline-offset-4"
      >
        {gravada ? EDITAR_OBSERVACAO : ADICIONAR_OBSERVACAO}
        {gravada && <span className="sr-only"> observação</span>}
      </button>
      <FolhaDaObservacao controle={controle} observacao={observacao} gravada={gravada} />
    </>
  )
}

export default EditarObservacao
