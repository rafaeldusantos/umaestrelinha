// A casca de um bloco do checkout FECHADO — Contato e Entrega (2026-10-04).
//
// Desenho da página "60 · Checkout — blocos fechados com prévia" no Paper. Até aqui o bloco
// fechado era uma linha só, com `truncate`: no celular o e-mail virava "marina.albuq…" e o frete
// era um rodapé cinza sem data. A cliente fechava o bloco e perdia de vista o que tinha digitado.
//
// O que mudou de forma: **"Alterar" subiu para a linha do rótulo**, e a prévia ganhou a largura
// inteira abaixo dela, recuada para a coluna do texto (`pl-11` = disco de 32 + vão de 12). Em 390
// isso são ~280px para o texto, contra ~210 quando a ação disputava a mesma linha.
//
// **Sem `truncate` na prévia**, e é de propósito: o texto quebra (`break-words`) em vez de cortar.
// O `min-w-0` da coluna dos blocos (`CheckoutPage`) continua necessário — ele existe por causa do
// min-content de texto que não quebra, e um e-mail sem espaço é exatamente isso.
//
// Um arquivo só para as duas, porque a casca é a mesma: escrita duas vezes, o recuo de uma
// divergiria do da outra sem nada quebrar. O Pagamento não usa esta casca — ele vive aberto
// (FLW-05) e o fechado dele não foi redesenhado.
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

interface Props {
  /** Nome da região — é o `aria-label` da `<section>` e o rótulo em versalete. */
  label: string
  /** O algarismo do disco enquanto o bloco não está completo. */
  step: number
  complete: boolean
  /** Rótulo acessível do ✓ quando completo ("Contato preenchido"). */
  completeLabel: string
  actionLabel: string
  onAction: () => void
  /** A prévia do que foi preenchido. Recuada para a coluna do texto. */
  children: ReactNode
  /**
   * Faixa de largura cheia abaixo da prévia — o frete escolhido, na Entrega. Fica fora do recuo
   * para o ícone dela cair na coluna do disco e o texto na coluna da prévia.
   */
  footer?: ReactNode
}

const CollapsedBlock = ({
  label,
  step,
  complete,
  completeLabel,
  actionLabel,
  onAction,
  children,
  footer,
}: Props) => (
  <section
    aria-label={label}
    className="flex flex-col gap-[6px] rounded-lg border border-estrelinha-line bg-white px-4 pb-4 pt-[10px]"
  >
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-estrelinha-ink">
        {complete ? (
          <Check className="h-4 w-4 text-white" aria-label={completeLabel} />
        ) : (
          <span className="font-heading text-base font-semibold text-white">{step}</span>
        )}
      </span>
      <span className="grow text-xs font-semibold uppercase tracking-[0.1em] text-estrelinha-ink-soft">
        {label}
      </span>
      {/* BUG-20260728-alterar-alvo-de-toque-28px: `min-h-11` = 44px de alvo, aparência de link.
          `-mr-1` alinha o texto da ação à borda interna do cartão, como no desenho. */}
      <button
        type="button"
        onClick={onAction}
        className="-mr-1 flex min-h-11 shrink-0 items-center rounded-sm px-3 text-sm font-semibold text-estrelinha-primary hover:underline"
      >
        {actionLabel}
      </button>
    </div>
    <div className="flex min-w-0 flex-col gap-[3px] break-words pl-11">{children}</div>
    {footer && <div className="mt-[10px]">{footer}</div>}
  </section>
)

export default CollapsedBlock
