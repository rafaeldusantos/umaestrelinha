// "O valor deste pedido mudou" — pelo link do pedido ou por Minha conta.
//
// O pedido não é o da sacola em curso: não há total novo a confirmar aqui. A página diz o que
// aconteceu e oferece o contato da loja — o mesmo de `store_settings`, com o portão de 10 dígitos
// do WhatsApp (`whatsappHref`, a régua de `PolicyContact`) e o e-mail só quando existe.
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { formatOrderNumber } from '@estrelinha/core/orders'

import { whatsappHref } from '@/shared/lib/whatsapp'

export interface PriceChangedContactProps {
  orderNumber: string
}

const PriceChangedContact = ({ orderNumber }: PriceChangedContactProps) => {
  const { whatsapp, email } = useGeneralSettings()
  const numero = formatOrderNumber(orderNumber)
  const zap = whatsappHref(
    whatsapp,
    `Olá. O valor do meu pedido ${numero} mudou e o pagamento não seguiu. Podemos combinar como seguir?`,
  )

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[680px] flex-col items-center px-6 pb-12 pt-9 md:pt-12">
      <p className="estrelinha-eyebrow text-center text-estrelinha-ink-soft">
        Pedido <span>{numero}</span>
      </p>
      <h1 className="mt-3 text-center font-heading text-[30px] font-bold leading-9 tracking-[-0.02em] text-estrelinha-ink md:text-[38px] md:leading-[44px]">
        O valor deste pedido mudou
      </h1>
      <div role="alert" className="mt-3 flex max-w-[460px] flex-col gap-3 text-center text-[15px] leading-6 text-estrelinha-ink-soft">
        <p>
          Depois que este pedido foi feito, o desconto de uma das peças mudou, e o pagamento não pode
          seguir pelo valor de antes. Nada foi cobrado.
        </p>
        <p>Fale comigo para combinarmos como seguir com o seu pedido.</p>
      </div>
      <div className="mt-6 flex w-full flex-col gap-3 md:flex-row md:justify-center">
        {zap ? (
          <a
            href={zap}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center rounded-sm bg-estrelinha-primary px-6 font-semibold text-estrelinha-on-primary hover:bg-estrelinha-primary-strong md:w-auto"
          >
            Falar pelo WhatsApp
          </a>
        ) : null}
        {email ? (
          <a
            href={`mailto:${email}`}
            className="flex h-12 w-full items-center justify-center rounded-sm border border-estrelinha-line bg-estrelinha-surface px-6 font-medium text-estrelinha-ink hover:bg-estrelinha-ground-deep md:w-auto"
          >
            Escrever por e-mail
          </a>
        ) : null}
      </div>
    </div>
  )
}

export default PriceChangedContact
