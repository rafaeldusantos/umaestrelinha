// "O valor do seu pedido mudou" — no checkout.
//
// O `create-payment` recusou ANTES de cobrar: recalculado, o pedido sairia mais caro do que a tela
// mostrou, porque um desconto por item caiu — o do Compre Junto de uma peça (a dona baixou ou tirou o
// percentual), a promoção ou a oferta do checkout. A frase só nomeia o Compre Junto quando foi ele.
// A cliente vê o antes e o agora e confirma outra vez — a nova confirmação cria o pedido com o total
// novo. Tom memorial: nada de alarme, só o que aconteceu e o que fazer.
//
// Para a convidada, a nova confirmação pode esbarrar no código de e-mail: o primeiro pedido criou a
// conta do e-mail dela, e o servidor só cria outro pedido nesse e-mail com a posse provada. O aviso
// fica de pé com o total novo, diz por que o código é pedido e recebe o foco.
import { useEffect, useRef } from 'react'
import { formatPrice } from '@estrelinha/core/formatters'

export interface PriceChangedCheckoutProps {
  /** O total que a tela mostrou quando a cliente confirmou. */
  displayedTotal: number
  /** O total recalculado pelo servidor — o que será cobrado. */
  total: number
  /** A peça cujo desconto mudou; `null` quando o servidor não soube dizer. */
  piece: string | null
  /** Qual desconto caiu. Ausente vale o do Compre Junto. */
  reason?: 'buy_together' | 'discount'
  onConfirm: () => void
  onBackToBag: () => void
  /** A confirmação em curso: o botão principal espera. */
  busy?: boolean
  /**
   * O e-mail para onde o código foi enviado, quando a nova confirmação precisa dele (a conta nasceu
   * com o pedido anterior). Ausente, o aviso é o de sempre.
   */
  codeEmail?: string | null
}

const PriceChangedCheckout = ({
  displayedTotal,
  total,
  piece,
  reason = 'buy_together',
  onConfirm,
  onBackToBag,
  busy = false,
  codeEmail = null,
}: PriceChangedCheckoutProps) => {
  const ref = useRef<HTMLElement>(null)
  // A tela mudou de assunto (o desafio de código abriu no bloco Contato): o foco vem para cá, onde
  // está a explicação, em vez de ficar no <body>.
  useEffect(() => {
    if (codeEmail) ref.current?.focus()
  }, [codeEmail])

  return (
    <section
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="valor-mudou-titulo"
      className="flex w-full min-w-0 flex-col gap-4 rounded-lg border border-estrelinha-line bg-estrelinha-ground-deep p-5 md:p-6"
    >
      <h2
        id="valor-mudou-titulo"
        className="font-heading text-[22px] font-semibold leading-7 tracking-[-0.02em] text-estrelinha-ink"
      >
        O valor do seu pedido mudou
      </h2>
      {reason === 'buy_together' ? (
        <p className="text-[15px] leading-6 text-estrelinha-ink-soft">
          Desde que você montou a sacola, o desconto do Compre Junto{' '}
          {piece ? (
            <>
              do <strong className="font-semibold text-estrelinha-ink">{piece}</strong>
            </>
          ) : (
            'de uma das peças'
          )}{' '}
          mudou. Por isso o pagamento não seguiu. Nada foi cobrado.
        </p>
      ) : (
        <p className="text-[15px] leading-6 text-estrelinha-ink-soft">
          Desde que você montou a sacola, um desconto do seu pedido mudou. Por isso o pagamento não
          seguiu. Nada foi cobrado.
        </p>
      )}
      {codeEmail ? (
        <p className="text-[15px] leading-6 text-estrelinha-ink-soft">
          O seu primeiro pedido criou uma conta na loja com{' '}
          <strong className="break-all font-semibold text-estrelinha-ink">{codeEmail}</strong>. Por
          isso, antes de criar o pedido com o novo total, é preciso confirmar que o e-mail é seu. O
          código foi enviado para ele: digite-o no bloco Contato, acima, e confirme com o novo total.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1 rounded-md border border-estrelinha-line bg-white px-4 py-3">
          <span className="text-[13px] font-medium text-estrelinha-ink-soft">Antes</span>
          <s className="font-heading text-[20px] font-semibold text-estrelinha-ink-soft">
            {formatPrice(displayedTotal)}
          </s>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-md border border-estrelinha-primary bg-white px-4 py-3">
          <span className="text-[13px] font-medium text-estrelinha-ink-soft">Agora</span>
          <span className="font-heading text-[20px] font-semibold text-estrelinha-ink">
            {formatPrice(total)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center rounded-sm bg-estrelinha-primary px-6 font-semibold text-estrelinha-on-primary hover:bg-estrelinha-primary-strong disabled:opacity-50 md:flex-1"
        >
          Confirmar com o novo total
        </button>
        <button
          type="button"
          onClick={onBackToBag}
          aria-haspopup="dialog"
          className="flex h-12 w-full items-center justify-center rounded-sm border border-estrelinha-line bg-white px-6 font-medium text-estrelinha-ink hover:bg-estrelinha-ground-deep md:flex-1"
        >
          Voltar à sacola
        </button>
      </div>
    </section>
  )
}

export default PriceChangedCheckout
