import { whatsappChatUrl } from '@estrelinha/core/notifications'
import { telefoneDoCliente, type CabecalhoDeCliente } from '@/entities/customer'
import { nomeDoLinkExterno } from '@/shared/config/novaAba'
import { WHATSAPP_FUNDO, WHATSAPP_TEXTO } from '@/shared/config/whatsapp'
import CartaoDaFicha from './CartaoDaFicha'

export const ROTULO_DO_WHATSAPP = 'Conversar no WhatsApp'

/**
 * O contato da ficha (feature `76`, `MAC-17`, `MAC-28`): o e-mail, sempre; o telefone mascarado e o botão
 * "Conversar no WhatsApp" **só** quando o telefone vira um número que o `wa.me` entende
 * (`telefoneDoCliente`). Sem telefone válido, nem a linha nem o botão existem — um `wa.me` sem número
 * abre uma conversa em branco, e um botão que não leva a lugar nenhum é CTA morto.
 *
 * O botão é `<a target="_blank" rel="noopener noreferrer">`, o `href` é o de `whatsappChatUrl` (`core`,
 * o dono do endereço) e **não leva texto**: abre a conversa em branco. A mensagem pronta é a cobrança
 * do pedido, e é do pedido. As cores são as da marca do terceiro (`shared/config/whatsapp.ts`).
 */
const ContatoDaCliente = ({ cliente }: { cliente: CabecalhoDeCliente }) => {
  const telefone = telefoneDoCliente(cliente)
  const href = telefone ? whatsappChatUrl(cliente.phone) : null
  return (
    <CartaoDaFicha id="contato" titulo="Contato">
      <div className="space-y-1 text-sm">
        <p data-parte="email" className="[overflow-wrap:anywhere]">
          {cliente.email}
        </p>
        {telefone && (
          <p data-parte="telefone" className="[overflow-wrap:anywhere]">
            {telefone.mascarado}
          </p>
        )}
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          aria-label={nomeDoLinkExterno(ROTULO_DO_WHATSAPP)}
          rel="noopener noreferrer"
          data-parte="whatsapp"
          style={{ backgroundColor: WHATSAPP_FUNDO, color: WHATSAPP_TEXTO }}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-sm px-4 py-2 text-center text-sm font-medium [overflow-wrap:anywhere]"
        >
          {ROTULO_DO_WHATSAPP}
        </a>
      )}
    </CartaoDaFicha>
  )
}

export default ContatoDaCliente
