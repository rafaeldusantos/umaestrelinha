// "Alguma dúvida sobre este pedido?" — o fecho do detalhe (feature 59, `DET-12`).
//
// Abre o WhatsApp da loja com o número do pedido já na mensagem: a cliente não precisa copiar
// nada, e a Adri sabe de que pedido se trata na primeira linha. O número passa por
// `formatOrderNumber` — o `#` tem um dono só (`AD-043`), e é a mesma grafia que a cliente lê na
// tela e no e-mail.
//
// Sem número configurado na loja, o bloco inteiro some (`whatsappHref` → `null`): um "Conversar"
// que abre conversa com ninguém é pior que não oferecer o caminho.
import { MessageCircle } from 'lucide-react'
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { whatsappHref } from '@/shared/lib/whatsapp'
import { orderHelpMessage } from '../lib/orderHelpMessage'

export interface OrderHelpProps {
  /** `orders.order_number`, cru — o formatador escreve o `#`. */
  orderNumber: string
}

const OrderHelp = ({ orderNumber }: OrderHelpProps) => {
  const { whatsapp } = useGeneralSettings()
  const href = whatsappHref(whatsapp, orderHelpMessage(orderNumber))
  if (!href) return null

  return (
    <section
      aria-label="Alguma dúvida sobre este pedido?"
      className="flex flex-col gap-3 rounded-md border border-estrelinha-line bg-estrelinha-surface p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="font-heading text-lg font-semibold text-estrelinha-ink">
          Alguma dúvida sobre este pedido?
        </h2>
        <p className="text-sm text-estrelinha-ink-soft">
          Fale com a gente pelo WhatsApp — o número do pedido já vai na mensagem.
        </p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm border border-estrelinha-field px-5 py-2.5 text-[15px] font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep motion-reduce:transition-none"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Conversar
      </a>
    </section>
  )
}

export default OrderHelp
