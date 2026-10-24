import { trackingEdit } from '@estrelinha/core/orders'

import type { PedidoDoDetalhe } from '@/entities/order'

import type { AcaoDoPedido } from '../model/useAcaoDoPedido'
import { useFolhaNoHistorico } from '../model/useFolhaNoHistorico'
import FolhaDoRastreio from './FolhaDoRastreio'

/**
 * "Informar" / "Alterar" na linha do rastreio do bloco Entrega (feature `75`, `MAA-11`, `MAA-14`,
 * `MAA-16`, `MAA-31`; design §3.6).
 *
 * Quem diz SE aparece e com que rótulo é `trackingEdit` (`core`): só `shipped`/`delivered`, nunca em
 * retirada. Abre a MESMA folha do rodapé, com `origem: 'entrega'` — e é a origem que escolhe a frase
 * pelo par (status, código anterior) em `trackingSheet`. O nome acessível diz o que se informa
 * ("Informar o rastreio"), começando pelo rótulo visível (WCAG 2.5.3). Alvo de 44 px.
 */
export interface EditarRastreioProps {
  pedido: PedidoDoDetalhe
  acao: AcaoDoPedido
  /**
   * O aviso de postagem saiu? (`DetalheDoPedido.avisoDePostagemSaiu`). Sem ele, "Alterar" em `shipped`
   * não afirma que a cliente recebeu o aviso (`BUG-20261024-folha-afirma-aviso-que-falhou`).
   */
  avisoDePostagemSaiu?: boolean
}

const EditarRastreio = ({ pedido, acao, avisoDePostagemSaiu }: EditarRastreioProps) => {
  const edicao = trackingEdit(pedido)
  const controle = useFolhaNoHistorico(pedido, 'entrega', avisoDePostagemSaiu)
  if (!edicao) return null
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!acao.travado) controle.abrir()
        }}
        data-testid="editar-rastreio"
        className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-medium text-estrelinha-primary underline underline-offset-4"
      >
        {edicao.rotulo}
        <span className="sr-only"> o rastreio</span>
      </button>
      <FolhaDoRastreio row={pedido} origem="entrega" controle={controle} acao={acao} />
    </>
  )
}

export default EditarRastreio
