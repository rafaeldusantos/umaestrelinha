// Bloco 1 do acordeão one-page (CHK-03, CHK-04, CHK-11).
//
// Substitui `CustomerStep`, preservando o que aquele passo tinha de essencial: a chamada a
// `setGuestEmail` (captação de carrinho abandonado, CHK-11) e o checkbox de consentimento.
// O CPF **não** está aqui — é dado do pagador e vive no bloco 3 (board `04`).
//
// Nenhum `bg-nanita-jam` neste arquivo: a única pílula geleia da tela é o CTA (CHK-04).
// Por isso o disco de "feito" é tinta, e não geleia como no board.
import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Checkbox } from '@estrelinha/ui/checkbox'
import { useAuthContext } from '@estrelinha/auth'
import { setGuestEmail } from '@/features/abandoned-cart/model/useAbandonedCartTracker'
import { useCheckoutStore } from '../model/checkoutStore'

interface Props {
  open: boolean
  complete: boolean
  onEdit: () => void
  /** FLW-03: quem fecha este bloco é o clique da pessoa, nunca a última tecla dela. */
  onContinue: () => void
  /** FLW-02: `Continuar` só habilita com o bloco válido. */
  canContinue: boolean
}

const ContactBlock = ({ open, complete, onEdit, onContinue, canContinue }: Props) => {
  const { customer } = useAuthContext()
  const contact = useCheckoutStore((s) => s.contact)
  const setContact = useCheckoutStore((s) => s.setContact)
  const markDirty = useCheckoutStore((s) => s.markDirty)

  /**
   * FLW-01/FLW-04: sujar é o que impede o bloco de colapsar sozinho — por isso só passa por aqui
   * o que a **pessoa** digitou. A semeadura de `customers` abaixo NÃO chama isto: se chamasse,
   * cliente recorrente voltaria a ver os três blocos abertos (ADR-02).
   */
  const edit = (patch: Parameters<typeof setContact>[0]) => {
    markDirty('contact')
    setContact(patch)
  }

  // CHK-03: nome/e-mail vêm de `customers`, WhatsApp de `customers.phone` quando existir.
  // Semeia uma única vez para não sobrescrever o que a cliente digitar depois.
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current || !customer) return
    seeded.current = true
    const current = useCheckoutStore.getState().contact
    const patch: Partial<typeof current> = {}
    if (!current.name && customer.name) patch.name = customer.name
    if (!current.email && customer.email) patch.email = customer.email
    if (!current.whatsapp && customer.phone) patch.whatsapp = customer.phone
    if (Object.keys(patch).length > 0) setContact(patch)
  }, [customer, setContact])

  // CHK-11: preencher ou alterar o contato realimenta o tracker de carrinho abandonado.
  useEffect(() => {
    if (contact.email.includes('@')) setGuestEmail(contact.email, contact.consent)
  }, [contact.email, contact.consent])

  if (!open) {
    return (
      <section
        aria-label="Contato"
        className="flex items-center gap-3 rounded-lg border border-nanita-border bg-white px-4 py-[22px]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nanita-ink">
          {complete ? (
            <Check className="h-4 w-4 text-white" aria-label="Contato preenchido" />
          ) : (
            <span className="font-heading text-base font-semibold text-white">1</span>
          )}
        </span>
        <div className="flex min-w-0 grow flex-col gap-[3px]">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-nanita-plum">
            Contato
          </span>
          <span className="truncate text-[15px] font-semibold text-nanita-ink">
            {contact.name} · {contact.email}
          </span>
        </div>
        {/* BUG-20260728-alterar-alvo-de-toque-28px: 44px de alvo, aparência de link mantida.
            Entrega e Pagamento já tinham recebido o `min-h-11`; este ficou para trás e media
            28px — medido em 390×844. */}
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-11 shrink-0 items-center rounded-button px-3 text-sm font-semibold text-nanita-jam hover:underline"
        >
          Alterar
        </button>
      </section>
    )
  }

  return (
    <section
      aria-label="Contato"
      className="flex flex-col gap-5 rounded-lg border border-nanita-border bg-white p-4"
    >
      <header className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nanita-ink font-heading text-base font-semibold text-white">
          1
        </span>
        <div className="flex grow flex-col gap-[2px]">
          <h2 className="font-heading text-[21px] font-semibold tracking-[-0.02em] text-nanita-ink">
            Contato
          </h2>
          <p className="text-[13px] text-nanita-plum">
            Para o comprovante e os avisos de envio
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-[7px]">
          <Label htmlFor="contact-name" className="text-[13px] font-semibold text-nanita-ink">
            Nome completo
          </Label>
          <Input
            id="contact-name"
            value={contact.name}
            onChange={(e) => edit({ name: e.target.value })}
            placeholder="Seu nome"
            className="border-nanita-border"
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <Label htmlFor="contact-email" className="text-[13px] font-semibold text-nanita-ink">
            E-mail
          </Label>
          <Input
            id="contact-email"
            type="email"
            value={contact.email}
            onChange={(e) => edit({ email: e.target.value })}
            placeholder="seu@email.com"
            className="border-nanita-border"
          />
        </div>
      </div>

      <div className="flex flex-col gap-[7px] sm:max-w-[260px]">
        <Label htmlFor="contact-whatsapp" className="text-[13px] font-semibold text-nanita-ink">
          WhatsApp
        </Label>
        <Input
          id="contact-whatsapp"
          value={contact.whatsapp}
          onChange={(e) => edit({ whatsapp: e.target.value })}
          placeholder="(11) 99999-9999"
          className="border-nanita-border"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-xs text-nanita-plum">
        <Checkbox
          checked={contact.consent}
          onCheckedChange={(v) => edit({ consent: v === true })}
          className="mt-0.5 border-nanita-plum"
        />
        <span>
          Quero receber lembretes e novidades por e-mail. Você pode cancelar quando quiser.
        </span>
      </label>

      {/* FLW-02/FLW-03: contorno de tinta, não geleia sólida — CHK-04 reserva a única pílula
          geleia da tela para o CTA. `min-h-11` = 44px, o mínimo da premissa mobile. */}
      <Button
        type="button"
        disabled={!canContinue}
        onClick={onContinue}
        className="min-h-11 self-start rounded-button border-2 border-nanita-ink bg-transparent px-7 font-heading text-[15px] font-semibold text-nanita-ink hover:bg-nanita-sugar"
      >
        Continuar
      </Button>
    </section>
  )
}

export default ContactBlock
