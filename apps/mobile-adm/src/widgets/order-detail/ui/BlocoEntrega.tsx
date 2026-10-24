import { shippingLine } from '@estrelinha/core/orders'
import { PICKUP_METHOD_NAME, isPickupOrder } from '@estrelinha/core/shipping'
import { maskCep } from '@estrelinha/core/validators'
import type { PedidoDoDetalhe } from '@/entities/order'
import { BlocoDoDetalhe } from './BlocoDoDetalhe'

/** As linhas do endereço de entrega, sem as partes vazias. Só formato: nenhuma regra. */
const linhasDoEndereco = (p: PedidoDoDetalhe): string[] =>
  [
    [[p.address_street, p.address_number].filter(Boolean).join(', '), p.address_complement].filter(Boolean).join(' · '),
    p.address_neighborhood,
    [p.address_city, p.address_state].filter(Boolean).join('/'),
    p.address_zip ? `CEP ${maskCep(p.address_zip)}` : null,
  ].filter((l): l is string => !!l)

/**
 * O bloco "Entrega" (feature `74`, `MAP-26`, `MAP-27`).
 *
 * - **Retirada no escritório** (`isPickupOrder`, `AD-049`): só "Retirada no escritório" — sem
 *   transportadora, sem prazo e sem linha de rastreio.
 * - Entrega pelos Correios: o endereço, o serviço e a linha do rastreio de SAÍDA, que é de
 *   `shippingLine` (`core`): "Rastreio <código>", "Enviado sem código de rastreio", "Ainda não
 *   postado" ou "Sem rastreio". Sem botão de editar: a `74` só lê.
 */
const BlocoEntrega = ({ pedido }: { pedido: PedidoDoDetalhe }) => {
  if (isPickupOrder(pedido)) {
    return (
      <BlocoDoDetalhe id="entrega" titulo="Entrega">
        <p data-parte="retirada" className="text-sm">{PICKUP_METHOD_NAME}</p>
      </BlocoDoDetalhe>
    )
  }
  const rastreio = shippingLine(pedido)
  return (
    <BlocoDoDetalhe id="entrega" titulo="Entrega">
      <address data-parte="endereco" className="space-y-0.5 text-sm not-italic">
        {linhasDoEndereco(pedido).map((l) => (
          <p key={l} className="[overflow-wrap:anywhere]">{l}</p>
        ))}
      </address>
      {pedido.shipping_method && (
        <p data-parte="servico" className="mt-2 text-sm [overflow-wrap:anywhere]">{pedido.shipping_method}</p>
      )}
      {rastreio && (
        <p data-parte="rastreio" className="mt-1 text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{rastreio}</p>
      )}
    </BlocoDoDetalhe>
  )
}

export default BlocoEntrega
