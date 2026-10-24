import { canChargeMaterial, chargeMaterialUrl } from '@estrelinha/core/orders'

import type { PedidoDoDetalhe } from '@/entities/order'
import { WHATSAPP_FUNDO, WHATSAPP_TEXTO } from '@/shared/config/whatsapp'

export const LEMBRAR_DO_ENVIO = 'Lembrar do envio no WhatsApp'

/**
 * "Lembrar do envio no WhatsApp" no bloco Material (feature `75`, `MAA-17`..`MAA-19`, A17..A19;
 * design §3.6).
 *
 * - **Aparece só quando `canChargeMaterial`** (`core`): material `aguardando_material`, pedido não
 *   cancelado e telefone que normaliza. Sem número o botão some — `wa.me` sem número abre uma conversa
 *   sem destinatário no celular (A17).
 * - **A URL é de `chargeMaterialUrl`** (`core`), a MESMA função do painel (o painel a reexporta por
 *   `toBe`), com a idade calculada pelo `lido_em` da LEITURA, nunca pelo relógio do aparelho
 *   (`AD-058`). A mensagem não nomeia o material e não tem urgência (`BL-015`).
 * - É um link: tocar abre o WhatsApp numa aba nova e não grava nada (`MAA-18`).
 * - A cor é a do terceiro, de `shared/config/whatsapp` (precedente da `65`). 44 px, largura inteira.
 */
export interface LembreteDoEnvioProps {
  pedido: PedidoDoDetalhe
  lidoEm: string
}

const LembreteDoEnvio = ({ pedido, lidoEm }: LembreteDoEnvioProps) => {
  if (!canChargeMaterial(pedido)) return null
  return (
    <a
      href={chargeMaterialUrl(pedido, pedido.customer_phone, new Date(lidoEm))}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="lembrete-do-envio"
      style={{ backgroundColor: WHATSAPP_FUNDO, color: WHATSAPP_TEXTO }}
      className="mt-3 flex min-h-11 w-full items-center justify-center rounded-sm px-4 py-2 text-center text-sm font-medium [overflow-wrap:anywhere]"
    >
      {LEMBRAR_DO_ENVIO}
    </a>
  )
}

export default LembreteDoEnvio
