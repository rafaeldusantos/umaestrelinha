import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'

/**
 * Os canais de atendimento de uma página de política — `POL-09`.
 *
 * **Todo canal sai de `store_settings`, nenhum do JSX.** É a régua de `PDP-24`, que nasceu nesta
 * mesma família de páginas: a Políticas cravava "5% de desconto no PIX" enquanto o resto da loja lia
 * `pix_discount_percent`, e mudar o número no painel deixava a página mentindo sem nada acusar. Aqui
 * o dado é o telefone e o e-mail de atendimento — e uma política que manda escrever para um endereço
 * que a dona não usa mais é pior que uma política sem canal nenhum.
 *
 * **O e-mail aparece sempre; o WhatsApp só com número.** A assimetria é do dado: `general.email` tem
 * default não vazio e sempre resolve; `general.whatsapp` nasce vazio, e um botão apontando para
 * `wa.me/` sem dígito abre conversa com ninguém — a cliente que precisa devolver uma peça acha que
 * pediu e não pediu. Mesmo portão da Sobre (`SOB-08`) e do `WhatsAppFloat`.
 *
 * **Dois consumidores desde o primeiro dia** (as duas políticas da feature 45), e é por isso que o
 * portão mora aqui: replicado por página, a terceira política nasceria sem ele e nada acusaria
 * (`L-028`).
 */

/** Número curto demais é número não configurado, não número errado. */
const MIN_DIGITOS_WHATSAPP = 10

const PolicyContact = ({
  /** O que a cliente vai falar — entra na mensagem pronta do WhatsApp. */
  assunto,
}: {
  assunto: string
}) => {
  const { whatsapp, email, store_name } = useGeneralSettings()
  const digitos = (whatsapp ?? '').replace(/\D/g, '')
  const temWhatsApp = digitos.length >= MIN_DIGITOS_WHATSAPP
  const mensagem = `Olá! Vim pela ${assunto} da ${
    store_name || 'Uma Estrelinha'
  } e gostaria de falar com você.`

  return (
    <div className="flex flex-col gap-3.5 md:flex-row md:items-center">
      {temWhatsApp && (
        <a
          href={`https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm bg-estrelinha-primary px-7 py-3.5 text-[16px] font-semibold text-estrelinha-on-primary transition-colors hover:bg-estrelinha-primary-strong md:w-auto"
        >
          Falar no WhatsApp
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm border border-estrelinha-line bg-estrelinha-surface px-7 py-3.5 text-[16px] font-medium text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep md:w-auto"
        >
          {email}
        </a>
      )}
    </div>
  )
}

export default PolicyContact
