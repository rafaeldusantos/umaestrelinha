// Pagamento e entrega do pedido (feature 59, `DET-11`).
//
// A forma de pagamento, com a data de aprovação quando houver, e o endereço do **snapshot do
// pedido** — `orders.address_*`, gravado no caixa. O endereço da conta é outra coisa: editá-lo vale
// para as próximas compras e não muda pedido feito (`DAD-08`).
import { formatShortDate } from '@estrelinha/core/orders'
import { maskCep } from '@estrelinha/core/validators'
import { isPickupOrder, PICKUP_METHOD_NAME } from '@estrelinha/core/shipping'
import { usePickupLocation } from '@/entities/pickup'
import {
  addressLines,
  limpo,
  paymentMethodLabel,
  type OrderDeliveryInput,
} from '../lib/paymentDelivery'

/**
 * RET-19 (feature 63): a entrega de um pedido de retirada — "Retirada no escritório" e a linha do
 * escritório, no lugar do endereço da cliente. Componente à parte porque é o ÚNICO ponto que lê a
 * configuração da loja: montado só para retirada, o pedido dos Correios continua sem essa leitura.
 */
const PickupDelivery = () => {
  const local = usePickupLocation()
  return (
    <div className="flex flex-col gap-1">
      <p className="estrelinha-eyebrow text-estrelinha-ink-soft">Entrega</p>
      <p className="text-[15px] font-medium text-estrelinha-ink">{PICKUP_METHOD_NAME}</p>
      {local && (
        <p data-testid="local-da-retirada" className="break-words text-[15px] leading-6 text-estrelinha-ink">
          {local}
        </p>
      )}
    </div>
  )
}

export interface OrderPaymentDeliveryProps {
  order: OrderDeliveryInput
}

const OrderPaymentDelivery = ({ order }: OrderPaymentDeliveryProps) => {
  const aprovadoEm = formatShortDate(order.paid_at)
  const linhas = addressLines(order)
  const cep = limpo(order.address_zip) ? maskCep(limpo(order.address_zip)) : ''
  const temEndereco = [
    order.address_street,
    order.address_number,
    order.address_neighborhood,
    order.address_city,
    order.address_zip,
  ].some((v) => limpo(v) !== '')

  return (
    <section
      aria-label="Pagamento e entrega"
      className="flex flex-col gap-4 rounded-md border border-estrelinha-line bg-estrelinha-surface p-4"
    >
      <h2 className="font-heading text-lg font-semibold text-estrelinha-ink">Pagamento e entrega</h2>

      <div className="flex flex-col gap-1">
        <p className="estrelinha-eyebrow text-estrelinha-ink-soft">Pagamento</p>
        <p className="text-[15px] font-medium text-estrelinha-ink">
          {paymentMethodLabel(order.payment_method)}
        </p>
        {aprovadoEm && <p className="text-[13px] text-estrelinha-ink-soft">Aprovado em {aprovadoEm}</p>}
      </div>

      {isPickupOrder(order) ? (
        <PickupDelivery />
      ) : temEndereco && (
        <div className="flex flex-col gap-1">
          <p className="estrelinha-eyebrow text-estrelinha-ink-soft">Entrega</p>
          <address className="flex flex-col text-[15px] not-italic leading-6 text-estrelinha-ink">
            {linhas.map((linha) => (
              <span key={linha} className="break-words">
                {linha}
              </span>
            ))}
            {/* O CEP numa linha só: o hífen é ponto de quebra para o navegador. */}
            {cep && (
              <span data-testid="endereco-cep" className="whitespace-nowrap">
                CEP {cep}
              </span>
            )}
          </address>
        </div>
      )}
    </section>
  )
}

export default OrderPaymentDelivery
