import type { ReactNode } from 'react'
import { normalizeBrPhone, whatsappChatUrl } from '@estrelinha/core/notifications'
import { purchaseOrdinalLabel } from '@estrelinha/core/orders'
import { maskPhone } from '@estrelinha/core/validators'
import type { PedidoDoDetalhe } from '@/entities/order'
import { MessageCircle } from 'lucide-react'
import { nomeDoLinkExterno } from '@/shared/config/novaAba'
import { WHATSAPP_FUNDO, WHATSAPP_TEXTO } from '@/shared/config/whatsapp'
import { BlocoDoDetalhe } from './BlocoDoDetalhe'

/**
 * O bloco "Cliente" do detalhe (feature `74`, `MAP-22`, A20, A21): o nome (ou o e-mail, sem nome), a
 * ordinal da compra (`purchaseOrdinalLabel`), o e-mail e — só com telefone VÁLIDO por
 * `normalizeBrPhone` (`core`, o dono do número do `wa.me`) — o telefone e o link "WhatsApp" (`whatsappChatUrl`, em `core`, sem mensagem pronta — A21).
 *
 * - O link abre a conversa sem escrever nada: a mensagem pronta é a cobrança da `75`.
 * - "Ver cliente" (feature `76`, `MAC-21`) é o nó que a página compõe (`verCliente`): o bloco só o
 *   recebe, como os blocos da `75` recebem o botão da ação. Quem sabe abrir a ficha é
 *   `features/open-customer`; um widget não importa de uma feature.
 */
const BlocoCliente = ({ pedido, verCliente }: { pedido: PedidoDoDetalhe; verCliente?: ReactNode }) => {
  const numero = normalizeBrPhone(pedido.customer_phone)
  const ordinal = purchaseOrdinalLabel(pedido.purchase_ordinal)
  return (
    <BlocoDoDetalhe id="cliente" titulo="Cliente">
      {/* O protótipo: o nome em destaque com o selo da compra ao lado, o contato embaixo, e as duas
          ações lado a lado — o WhatsApp ocupa o que sobra, "Ver cliente" o próprio tamanho. */}
      <div className="flex flex-wrap items-center gap-2">
        <p data-parte="nome" className="min-w-0 font-display text-lg font-bold [overflow-wrap:anywhere]">
          {pedido.customer_name || pedido.customer_email}
        </p>
        {ordinal && (
          <span data-parte="ordinal" className="rounded-pill bg-estrelinha-ground-deep px-2 py-0.5 text-xs text-estrelinha-ink">
            {ordinal}
          </span>
        )}
      </div>
      <div className="mt-1.5 space-y-0.5 text-sm text-estrelinha-ink-soft">
        <p data-parte="email" className="[overflow-wrap:anywhere]">{pedido.customer_email}</p>
        {/* Desenhado a partir do número JÁ normalizado, sem o `55`: um `+55 51 …` gravado não sai torto. */}
        {numero && <p data-parte="telefone">{maskPhone(numero.slice(2))}</p>}
      </div>
      {(numero || verCliente) && (
        <div className="mt-3.5 flex flex-wrap items-start gap-2">
          {numero && (
            <a
              href={whatsappChatUrl(pedido.customer_phone)}
              target="_blank"
              aria-label={nomeDoLinkExterno('WhatsApp')}
              rel="noopener noreferrer"
              style={{ backgroundColor: WHATSAPP_FUNDO, color: WHATSAPP_TEXTO }}
              className="flex min-h-11 min-w-[min(100%,8rem)] flex-1 items-center justify-center gap-2 rounded-sm px-4 py-2 font-display text-sm font-bold"
            >
              <MessageCircle aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.5} />
              WhatsApp
            </a>
          )}
          {verCliente && <div className="min-w-0 max-w-full">{verCliente}</div>}
        </div>
      )}
    </BlocoDoDetalhe>
  )
}

export default BlocoCliente
