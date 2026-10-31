// O link da proposta e como mandá-lo (feature 89, `LNK-01`..`LNK-03`, `SEG-01`).
//
// O link só existe nesta aba, logo depois de criado ou renovado (`model/linkMemory.ts`): o banco
// guarda o hash do token e não sabe remontá-lo. Sem o link em memória, o cartão diz isso e oferece
// "Gerar link novo" (= renovar), que mata o anterior — a frase avisa.
//
// O `wa.me` sai do dono único (`whatsappChatUrl`, `core`) com a mensagem de `LNK-02`
// (`proposalWhatsappText`). Copiar e abrir o WhatsApp registram "Link enviado" (`LNK-03`); a falha
// do registro não desfaz o envio — ela é dita, e o link já está com a Adri.

import { useState } from 'react'
import { Copy, MessageCircle } from 'lucide-react'
import { whatsappChatUrl } from '@estrelinha/core/notifications'
import { proposalExpiryDate, proposalWhatsappText } from '@estrelinha/core/proposals'
import { ActionButton, FormCard } from '@/shared/ui'
import type { LinkGuardado } from '../model/linkMemory'
import { LINK_EXPIRED, LINK_NOT_IN_MEMORY, NO_PHONE } from '../model/copy'
import type { SentChannel } from '../api/proposalsApi'

interface Props {
  link: LinkGuardado | null
  customerName: string
  customerPhone: string | null
  /** A proposta aceita link novo (aberta ou expirada). */
  podeGerar: boolean
  /** O prazo venceu (`LNK-06`): o cartão oferece "Renovar", que relê e trava os preços de hoje. */
  expirada?: boolean
  gerando: boolean
  onGerar: () => void
  onEnviado: (canal: SentChannel) => Promise<unknown>
}

const ProposalLinkCard = ({ link, customerName, customerPhone, podeGerar, expirada = false, gerando, onGerar, onEnviado }: Props) => {
  const [recado, setRecado] = useState<string | null>(null)

  if (!link) {
    return (
      <FormCard title="Link para a cliente">
        <p className="text-sm text-muted-foreground">{expirada ? LINK_EXPIRED : LINK_NOT_IN_MEMORY}</p>
        {podeGerar && (
          <ActionButton variant={expirada ? 'default' : 'outline'} alvo44 pending={gerando} pendingLabel={expirada ? 'Renovando…' : 'Gerando o link…'} onClick={onGerar}>
            {expirada ? 'Renovar' : 'Gerar link novo'}
          </ActionButton>
        )}
      </FormCard>
    )
  }

  const texto = proposalWhatsappText({ name: customerName, link: link.link, expiresAt: link.expiresAt })
  const wa = whatsappChatUrl(customerPhone, texto)

  const registrar = async (canal: SentChannel) => {
    try {
      await onEnviado(canal)
    } catch (e) {
      setRecado((e as Error)?.message || 'Não consegui registrar o envio.')
    }
  }

  const copiar = async () => {
    setRecado(null)
    try {
      await navigator.clipboard.writeText(link.link)
    } catch {
      setRecado('Não consegui copiar. Selecione o link e copie à mão.')
      return
    }
    setRecado('Link copiado.')
    await registrar('copy')
  }

  const abrirWhatsapp = async () => {
    if (!wa) return
    setRecado(null)
    window.open(wa, '_blank', 'noopener,noreferrer')
    await registrar('whatsapp')
  }

  return (
    <FormCard
      title="Link para a cliente"
      description={`Vale até ${proposalExpiryDate(link.expiresAt, true)}.`}
    >
      <p data-testid="link-da-proposta" className="break-all rounded-lg border border-input bg-muted/30 p-3 text-sm text-foreground">
        {link.link}
      </p>
      <div className="flex flex-wrap gap-2">
        <ActionButton alvo44 pendingLabel="Copiando…" onClick={copiar}>
          <Copy className="mr-1 h-4 w-4" aria-hidden /> Copiar link
        </ActionButton>
        {wa ? (
          <ActionButton variant="outline" alvo44 pendingLabel="Abrindo…" onClick={abrirWhatsapp}>
            <MessageCircle className="mr-1 h-4 w-4" aria-hidden /> Enviar pelo WhatsApp
          </ActionButton>
        ) : (
          // QA da 89: o botão do design system é `whitespace-nowrap`, e a 390 com a fonte a 200 % esta
          // frase empurrava a página para o lado. Ela quebra linha e nunca passa da largura do cartão.
          <ActionButton
            variant="outline"
            alvo44
            pendingLabel=""
            disabled
            className="h-auto min-w-0 max-w-full whitespace-normal py-2 text-left"
          >
            {NO_PHONE}
          </ActionButton>
        )}
      </div>
      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {recado}
      </p>
    </FormCard>
  )
}

export default ProposalLinkCard
