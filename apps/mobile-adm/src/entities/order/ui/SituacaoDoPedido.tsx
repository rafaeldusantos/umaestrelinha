import { orderSituation, type SituationInput } from '@estrelinha/core/orders'
import Selo from '@/shared/ui/Selo'

/**
 * O selo da situação do pedido no app do ateliê (feature `73`, `MAI-14`; feature `74`, `MAP-16`).
 *
 * **Não decide nada**: o rótulo e o tom são de `orderSituation` (`@estrelinha/core/orders`), o mesmo
 * dono da loja (`situacaoComDonoUnico`), pedido com o público `'atelie'`: a mesma chave e o mesmo
 * tom da loja, na voz de quem administra — "Aguardando material" e "Material a caminho", nunca o
 * "seu material" da cliente (`BUG-20261022-situacao-fala-com-a-cliente-no-atelie`).
 *
 * A apresentação do tom (a pílula, o ponto, o rótulo que nunca é cortado) mora em `shared/ui/Selo`
 * desde a `74`: o selo de pagamento do detalhe usa a mesma régua de cor, sem um segundo mapa.
 */
const SituacaoDoPedido = ({ pedido }: { pedido: SituationInput }) => {
  const { key, label, tone } = orderSituation(pedido, 'atelie')
  return (
    <Selo tom={tone} dados={{ 'data-situation': key }}>
      {label}
    </Selo>
  )
}

export default SituacaoDoPedido
