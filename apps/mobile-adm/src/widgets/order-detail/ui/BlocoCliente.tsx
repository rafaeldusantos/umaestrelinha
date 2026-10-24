import { normalizeBrPhone } from '@estrelinha/core/notifications'
import { purchaseOrdinalLabel } from '@estrelinha/core/orders'
import { maskPhone } from '@estrelinha/core/validators'
import type { PedidoDoDetalhe } from '@/entities/order'
import { BlocoDoDetalhe } from './BlocoDoDetalhe'

/** O endereço do WhatsApp de um número já normalizado — sem mensagem pronta (A21). */
const whatsappDe = (numero: string) => `https://wa.me/${numero}`

/**
 * O bloco "Cliente" do detalhe (feature `74`, `MAP-22`, A20, A21): o nome (ou o e-mail, sem nome), a
 * ordinal da compra (`purchaseOrdinalLabel`), o e-mail e — só com telefone VÁLIDO por
 * `normalizeBrPhone` (`core`, o dono do número do `wa.me`) — o telefone e o link "WhatsApp".
 *
 * - O link abre a conversa sem escrever nada: a mensagem pronta é a cobrança da `75`.
 * - "Ver cliente" **não** aparece até a `76` (A20): `/clientes` está em construção, e um link para o
 *   vazio é CTA morto.
 */
const BlocoCliente = ({ pedido }: { pedido: PedidoDoDetalhe }) => {
  const numero = normalizeBrPhone(pedido.customer_phone)
  const ordinal = purchaseOrdinalLabel(pedido.purchase_ordinal)
  return (
    <BlocoDoDetalhe id="cliente" titulo="Cliente">
      <div className="space-y-1 text-sm">
        <p data-parte="nome" className="font-medium [overflow-wrap:anywhere]">
          {pedido.customer_name || pedido.customer_email}
        </p>
        {ordinal && <p data-parte="ordinal" className="text-xs text-estrelinha-ink-soft">{ordinal}</p>}
        <p data-parte="email" className="[overflow-wrap:anywhere]">{pedido.customer_email}</p>
        {numero && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {/* Desenhado a partir do número JÁ normalizado, sem o `55`: um `+55 51 …` gravado não sai torto. */}
            <span data-parte="telefone">{maskPhone(numero.slice(2))}</span>
            <a
              href={whatsappDe(numero)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-sm px-1 font-medium text-estrelinha-primary underline underline-offset-4"
            >
              WhatsApp
            </a>
          </div>
        )}
      </div>
    </BlocoDoDetalhe>
  )
}

export default BlocoCliente
