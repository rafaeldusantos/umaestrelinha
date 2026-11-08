// O link da proposta e como mandá-lo (feature 89, `LNK-01`..`LNK-03`, `SEG-01`).
//
// Aberta: o link vem SEMPRE (a function devolve o token pelo `get`, decifrando a cifra do banco), num
// campo só leitura que seleciona ao focar, com Copiar, WhatsApp e a prévia da mensagem. Nunca é
// preciso gerar link novo para copiar. A proposta gravada sem a cifra (antes da chave, ou sem ela) não
// tem como mostrar o link: o cartão diz isso e oferece "Gerar link novo" (= renovar), que mata o
// anterior. Expirada: o link morreu, e o cartão só oferece "Renovar prazo". Cancelada ou
// concluída: "Link encerrado", sem ação.
//
// O `wa.me` sai do dono único (`whatsappChatUrl`, `core`) com a mensagem de `LNK-02`
// (`proposalWhatsappText`). Copiar e abrir o WhatsApp registram "Link enviado" (`LNK-03`); a falha
// do registro não desfaz o envio — ela é dita, e o link já está com a Adri.

import { useId, useState } from 'react'
import { Copy, MessageCircle } from 'lucide-react'
import { whatsappChatUrl } from '@estrelinha/core/notifications'
import { LINK_WITHOUT_STORE, proposalExpiryDate, proposalWhatsappText } from '@estrelinha/core/proposals'
import { ActionButton, FormCard } from '@/shared/ui'
import type { LinkDaProposta } from '../model/proposalLink'
import { LINK_CLOSED, LINK_EXPIRED, LINK_UNAVAILABLE, NO_PHONE } from '../model/copy'
import type { SentChannel } from '../api/proposalsApi'

export type EstadoDoLink = 'aberta' | 'expirada' | 'encerrada'

interface Props {
  estado: EstadoDoLink
  /** O link montado (aberta com token e loja configurada); `null` nos outros casos. */
  link: LinkDaProposta | null
  /** Aberta com token, mas sem a loja configurada neste painel para montar o link. */
  semLoja?: boolean
  /** O prazo gravado — "Venceu em …" na expirada. */
  expiresAt: string
  customerName: string
  customerPhone: string | null
  /** O rótulo de renovar de `proposalActions` (`core`); `null` quando não se renova daqui. */
  renewLabel: string | null
  gerando: boolean
  onGerar: () => void
  onEnviado: (canal: SentChannel) => Promise<unknown>
}

const ProposalLinkCard = ({
  estado,
  link,
  semLoja = false,
  expiresAt,
  customerName,
  customerPhone,
  renewLabel,
  gerando,
  onGerar,
  onEnviado,
}: Props) => {
  const [recado, setRecado] = useState<string | null>(null)
  const idDoCampo = useId()

  if (estado === 'encerrada') {
    return (
      <FormCard title="Link para a cliente" description={LINK_CLOSED}>
        <p className="text-sm text-muted-foreground">Quem abrir o link lê que este pedido não está mais disponível.</p>
      </FormCard>
    )
  }

  const botaoDeGerar = renewLabel ? (
    <ActionButton
      variant={estado === 'expirada' ? 'default' : 'outline'}
      alvo44
      pending={gerando}
      pendingLabel={estado === 'expirada' ? 'Renovando…' : 'Gerando o link…'}
      onClick={onGerar}
    >
      {renewLabel}
    </ActionButton>
  ) : null

  if (estado === 'expirada') {
    return (
      <FormCard title="Link para a cliente" description={`Venceu em ${proposalExpiryDate(expiresAt, true)}.`}>
        <p className="text-sm text-muted-foreground">{LINK_EXPIRED}</p>
        {botaoDeGerar}
      </FormCard>
    )
  }

  if (!link) {
    return (
      <FormCard title="Link para a cliente">
        <p className="text-sm text-muted-foreground">{semLoja ? LINK_WITHOUT_STORE : LINK_UNAVAILABLE}</p>
        {!semLoja && botaoDeGerar}
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
    <FormCard title="Link para a cliente" description={`Vale até ${proposalExpiryDate(link.expiresAt, true)}.`}>
      <label htmlFor={idDoCampo} className="sr-only">
        Link para a cliente
      </label>
      <input
        id={idDoCampo}
        data-testid="link-da-proposta"
        readOnly
        value={link.link}
        onFocus={(e) => e.currentTarget.select()}
        className="h-11 w-full min-w-0 rounded-lg border border-input bg-muted/30 px-3 text-sm text-foreground"
      />
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
      <details className="rounded-lg border border-border px-3 py-2 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium text-foreground">Mensagem do WhatsApp</summary>
        <p data-testid="mensagem-do-whatsapp" className="whitespace-pre-line break-words pb-2 text-muted-foreground">
          {texto}
        </p>
      </details>
      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {recado}
      </p>
    </FormCard>
  )
}

export default ProposalLinkCard
