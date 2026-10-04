// O cartão "Rastreio do pacote" do detalhe (feature 59, `DET-03`, `DET-04`).
//
// `orders.tracking_code` sempre existiu e nenhuma tela da cliente o mostrava — o código ficava no
// painel e, quando muito, num e-mail. Aqui ele ganha o lugar dele: o código legível, a
// transportadora, um link para acompanhar e um botão para copiar.
//
// É a remessa de SAÍDA (ateliê → cliente). O envelope de ENTRADA (`material_tracking_code`) é
// outra coisa e mora no bloco do material.
//
// Quem monta o endereço do rastreio é `parcelTrackingUrl` (`@estrelinha/core/orders`), e quem
// decide se o cartão existe é a mesma função: sem código, sem link, sem cartão.
import { toast } from 'sonner'
import { parcelTrackingUrl } from '@estrelinha/core/orders'

export interface OrderTrackingCardProps {
  /** `orders.tracking_code`. Vazio ou só espaço ⇒ o cartão não é renderizado (`DET-04`). */
  code: string | null | undefined
  /** `orders.shipping_carrier`, quando houver. */
  carrier?: string | null
}

const OrderTrackingCard = ({ code, carrier }: OrderTrackingCardProps) => {
  const url = parcelTrackingUrl(code)
  if (!url) return null

  // O código como a cliente o lê e o cola: sem espaço em volta, em maiúsculas — a mesma forma que
  // vai no link.
  const codigo = (code ?? '').trim().toUpperCase()
  const transportadora = carrier?.trim()

  const copiar = async () => {
    // A área de transferência pode não existir (contexto sem HTTPS, navegador antigo) ou recusar
    // (permissão). Nos dois casos a cliente precisa saber que não copiou — um botão que parece ter
    // funcionado e não funcionou é o pior estado.
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard indisponível')
      await navigator.clipboard.writeText(codigo)
      toast.success('Código de rastreio copiado')
    } catch {
      toast.error('Não foi possível copiar. Selecione o código e copie à mão.')
    }
  }

  return (
    <section
      aria-label="Rastreio do pacote"
      className="flex flex-col gap-4 rounded-md bg-estrelinha-primary p-4 text-estrelinha-on-primary"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="estrelinha-eyebrow text-estrelinha-on-primary">Rastreio do pacote</p>
        <p className="break-all text-xl font-semibold tracking-wide text-estrelinha-on-primary">
          {codigo}
        </p>
        {transportadora && (
          <p className="text-sm text-estrelinha-on-primary">Enviado por {transportadora}</p>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 flex-1 items-center justify-center rounded-sm bg-estrelinha-on-primary px-5 py-2.5 text-[15px] font-semibold text-estrelinha-primary transition-opacity hover:opacity-95 motion-reduce:transition-none"
        >
          Acompanhar entrega
        </a>
        <button
          type="button"
          onClick={copiar}
          className="flex min-h-11 items-center justify-center rounded-sm border border-estrelinha-on-primary px-5 py-2.5 text-[15px] font-semibold text-estrelinha-on-primary transition-colors hover:bg-estrelinha-primary-strong motion-reduce:transition-none sm:w-auto"
        >
          Copiar
        </button>
      </div>
    </section>
  )
}

export default OrderTrackingCard
