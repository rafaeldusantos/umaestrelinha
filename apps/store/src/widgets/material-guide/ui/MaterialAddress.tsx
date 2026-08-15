import { MapPin, MessageCircle } from 'lucide-react'
import { useGeneralSettings, useMaterialSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { TAP_ROW } from '@/shared/lib/touchTarget'

/**
 * O endereço para onde a cliente posta o material (`MAT-01`).
 *
 * **Não renderiza endereço pela metade, e essa é a regra inteira deste componente.** Enquanto o
 * logradouro estiver vazio — porque a linha ainda não chegou do banco, porque a dona ainda não
 * preencheu a aba Material, porque a leitura falhou — o bloco mostra o convite a combinar o envio.
 * Um endereço incompleto aqui não é um layout feio: é cinzas de cremação postadas para um lugar que
 * não existe, e não há segunda via.
 *
 * Vem de `store_settings` e não do código porque mudar de endereço é operação da dona; com o
 * endereço em `.tsx` ela viraria um deploy.
 */
const MaterialAddress = () => {
  const material = useMaterialSettings()
  const { whatsapp, store_name } = useGeneralSettings()

  const completo = material.street.trim() !== '' && material.city.trim() !== ''

  if (!completo) {
    const phone = whatsapp?.replace(/\D/g, '') || ''
    const texto = `Olá! Fiz um pedido na ${store_name || 'Uma Estrelinha'} e queria confirmar o endereço para enviar o material.`
    return (
      <div className="rounded-md border border-estrelinha-field bg-estrelinha-ground-deep p-5">
        <h3 className="font-display text-lg font-semibold text-estrelinha-ink">
          Confirme o endereço com a gente
        </h3>
        <p className="mt-2 text-[15px] leading-[24px] text-estrelinha-ink-soft">
          Antes de postar, fale com a gente para confirmar o endereço de envio. É rápido, e evita que
          o seu material siga para o lugar errado.
        </p>
        {phone.length >= 10 && (
          <a
            href={`https://wa.me/${phone}?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${TAP_ROW} mt-3 inline-flex items-center gap-2 font-semibold text-estrelinha-primary hover:underline`}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Falar pelo WhatsApp
          </a>
        )}
      </div>
    )
  }

  const linhaNumero = [material.street, material.number].filter(Boolean).join(', ')
  const linhaBairro = [material.complement, material.neighborhood].filter(Boolean).join(' · ')
  const linhaCidade = [
    [material.city, material.state].filter(Boolean).join('/'),
    material.zip,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="rounded-md border border-estrelinha-field bg-estrelinha-ground-deep p-5">
      <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-estrelinha-ink">
        <MapPin className="h-[18px] w-[18px] text-estrelinha-primary" aria-hidden />
        Endereço para envio
      </h3>
      <address className="mt-3 not-italic text-[15px] leading-[26px] text-estrelinha-ink">
        {material.recipient && <div className="font-semibold">{material.recipient}</div>}
        <div>{linhaNumero}</div>
        {linhaBairro && <div>{linhaBairro}</div>}
        <div>{linhaCidade}</div>
      </address>
      {material.notes && (
        <p className="mt-3 border-t border-estrelinha-line pt-3 text-[14px] leading-[22px] text-estrelinha-ink-soft">
          {material.notes}
        </p>
      )}
    </div>
  )
}

export default MaterialAddress
