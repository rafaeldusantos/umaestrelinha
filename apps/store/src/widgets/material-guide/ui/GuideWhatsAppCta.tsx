import { MessageCircle } from 'lucide-react'
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { GUIDE_COLUMN } from './GuideSection'

/**
 * "Ficou com dúvida no preparo do seu material?" (`5MC-0`).
 *
 * O número e a mensagem saem das configurações da loja, nunca do JSX — mesma regra que a faixa de
 * vantagens da home segue (`HOME-…`): número em código é o caminho para a loja prometer um canal que
 * não existe mais. **Sem WhatsApp configurado a faixa não renderiza**, em vez de mostrar um botão que
 * abre uma conversa com ninguém.
 */
const GuideWhatsAppCta = () => {
  const { whatsapp, whatsapp_message } = useGeneralSettings()
  const digitos = (whatsapp ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null

  const mensagem =
    whatsapp_message?.trim() ||
    `Olá! Estou preparando o material para a minha joia e fiquei com uma dúvida.`
  const link = `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`

  return (
    <section className="w-full bg-gradient-to-br from-estrelinha-ground-deep to-estrelinha-serenity py-10 md:py-[52px]">
      <div
        className={`${GUIDE_COLUMN} flex flex-col items-center gap-5 text-center md:flex-row md:justify-center md:gap-7 md:text-right`}
      >
        <div className="flex flex-col gap-1 md:items-end">
          <p className="text-[15px] font-light leading-5 text-estrelinha-ink-soft md:text-[16px]">
            Ficou com dúvida no preparo do seu material?
          </p>
          <p className="font-display text-[26px] leading-9 text-estrelinha-ink md:text-[30px] md:leading-9">
            Chama no WhatsApp!
          </p>
        </div>

        {/*
          O único verde da loja, e é aqui que ele pode estar: `DESIGN.md` §2 reserva
          `whatsapp #25D366` ao botão do WhatsApp. Branco sobre ele mede 2,6:1, então o rótulo sai em
          `ink` — o mesmo ajuste que o selo numerado das fichas precisou.
        */}
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2.5 rounded-sm bg-estrelinha-whatsapp px-7 py-3.5 text-[15px] font-semibold text-estrelinha-ink transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-[22px] w-[22px] shrink-0" aria-hidden />
          Falar com a Adri
        </a>
      </div>
    </section>
  )
}

export default GuideWhatsAppCta
