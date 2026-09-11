import { MessageCircle } from 'lucide-react'
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'

/**
 * A saída para o WhatsApp, dentro da gaveta.
 *
 * **Existe para o `Outro material`**, e não é enfeite: o cartão desse material diz "fale com a gente
 * antes de enviar, para acertar quantidade e preparo" — e mandar fazer uma coisa sem oferecer como
 * fazê-la é pior do que não mandar. Era um Edge Case da spec que a primeira entrega não implementou,
 * achado pela verificação independente.
 *
 * **Número e mensagem saem das configurações da loja, nunca do JSX**, e **sem WhatsApp configurado o
 * bloco não renderiza** — mesma regra do `GuideWhatsAppCta` na página do guia. Um botão para um
 * número que não existe mais é pior do que botão nenhum.
 *
 * O rótulo sai em `ink` sobre o verde, e não em branco: `DESIGN.md` §2 reserva `whatsapp #25D366` a
 * este botão, e branco sobre ele mede 2,6:1. É o mesmo ajuste que o selo numerado das fichas do guia
 * precisou fazer.
 */
const MaterialDrawerWhatsApp = () => {
  const { whatsapp, whatsapp_message } = useGeneralSettings()
  const digitos = (whatsapp ?? '').replace(/\D/g, '')
  if (digitos.length < 10) return null

  const mensagem =
    whatsapp_message?.trim() ||
    'Olá! Vou enviar um material que não está na lista e queria acertar a quantidade e o preparo.'
  const link = `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      data-testid="material-drawer-whatsapp"
      className="flex h-12 items-center justify-center gap-2.5 rounded-sm bg-estrelinha-whatsapp text-[15px] font-semibold text-estrelinha-ink transition-opacity hover:opacity-90"
    >
      <MessageCircle aria-hidden className="h-[18px] w-[18px]" />
      Falar com a gente no WhatsApp
    </a>
  )
}

export default MaterialDrawerWhatsApp
