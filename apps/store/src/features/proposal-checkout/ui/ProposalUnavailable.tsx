// O link que não vale mais (feature 89, `CON-08`): inválido, expirado ou cancelado. Não revela dado
// nenhum da proposta — a página nem tem o que revelar, o servidor responde só o código.
import { MessageCircle } from 'lucide-react'
import { PROPOSAL_UNAVAILABLE_MESSAGE } from '../api/proposalApi'

interface Props {
  /** O `wa.me` da loja; `null` quando o número não está configurado (o botão sai de cena). */
  whatsappHref: string | null
}

const ProposalUnavailable = ({ whatsappHref }: Props) => (
  <section className="mx-auto flex max-w-[560px] flex-col items-center gap-5 px-5 py-16 text-center">
    <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-estrelinha-ink">
      Seu pedido
    </h1>
    <p className="text-[17px] leading-7 text-estrelinha-ink-soft">{PROPOSAL_UNAVAILABLE_MESSAGE}</p>
    {whatsappHref && (
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-estrelinha-primary px-6 font-heading text-[16px] font-semibold text-white"
      >
        <MessageCircle className="h-5 w-5" aria-hidden />
        Falar no WhatsApp
      </a>
    )}
  </section>
)

export default ProposalUnavailable
