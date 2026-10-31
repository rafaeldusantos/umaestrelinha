// As peças do pedido montado, só leitura (feature 89, `CON-01`, `CON-03`, `CON-09`).
//
// Foto, nome, variação, gravação, quantidade e o preço TRAVADO da linha. A cliente não muda nada
// aqui: quem muda é a Adri, e a frase do fim leva ao WhatsApp. A peça que saiu do ar desde a
// montagem é marcada — nunca escondida, nunca trocada (`CON-09`).
import type { PublicProposalLine } from '@estrelinha/core/proposals'
import { formatPrice } from '@estrelinha/core/formatters'
import { ITEM_UNAVAILABLE_MESSAGE } from '../api/proposalApi'

/** CON-03, palavra por palavra. */
export const CHANGE_ITEMS_HINT = 'Quer mudar alguma peça? Fale comigo pelo WhatsApp.'

interface Props {
  lines: PublicProposalLine[]
  /** O `wa.me` da loja; `null` quando o número não está configurado (o texto fica, sem link). */
  whatsappHref: string | null
}

const ProposalItems = ({ lines, whatsappHref }: Props) => (
  <section
    aria-label="Peças do pedido"
    className="flex flex-col gap-4 rounded-lg border border-estrelinha-line bg-white p-4"
  >
    <ul className="flex flex-col divide-y divide-estrelinha-line">
      {lines.map((line) => (
        <li
          key={line.position}
          className="flex min-w-0 gap-3 py-3 first:pt-0 last:pb-0"
          data-indisponivel={line.available ? undefined : ''}
        >
          {line.product_image ? (
            <img
              src={line.product_image}
              alt=""
              loading="lazy"
              className="h-16 w-16 shrink-0 rounded-sm border border-estrelinha-line object-cover"
            />
          ) : (
            <span className="h-16 w-16 shrink-0 rounded-sm bg-estrelinha-ground-deep" aria-hidden />
          )}
          <div className="flex min-w-0 grow flex-col gap-[2px]">
            <span className="text-[15px] font-semibold leading-5 text-estrelinha-ink [overflow-wrap:anywhere]">
              {line.product_name}
            </span>
            {line.variant_label && (
              <span className="text-[13px] text-estrelinha-ink-soft">{line.variant_label}</span>
            )}
            {line.engraving_text && (
              <span className="text-[13px] text-estrelinha-ink-soft [overflow-wrap:anywhere]">
                Gravação: {line.engraving_text}
              </span>
            )}
            <span className="text-[13px] text-estrelinha-ink-soft">Quantidade: {line.quantity}</span>
            {!line.available && (
              <span role="status" className="text-[13px] font-semibold text-estrelinha-alert">
                {ITEM_UNAVAILABLE_MESSAGE}
              </span>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-[2px]">
            <span className="text-[15px] font-semibold text-estrelinha-ink">
              {formatPrice(line.unit_price * line.quantity)}
            </span>
            {line.list_price > line.unit_price && (
              <span className="text-[13px] text-estrelinha-ink-soft line-through">
                {formatPrice(line.list_price * line.quantity)}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
    <p className="text-[13px] text-estrelinha-ink-soft">
      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center font-semibold text-estrelinha-primary underline underline-offset-2"
        >
          {CHANGE_ITEMS_HINT}
        </a>
      ) : (
        CHANGE_ITEMS_HINT
      )}
    </p>
  </section>
)

export default ProposalItems
