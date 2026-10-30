// Feature `88` · `CRG-01`, `A-11` — o botão que grava mostra o trabalho NELE.
//
// Antes, os botões do pedido só ficavam desabilitados durante a gravação: sem texto, sem indicador,
// e a única prova de que algo aconteceu era a página piscar. Este é o dono único do padrão — o
// `Loader2` girando, o rótulo no gerúndio ("Marcando como enviado…") e `aria-busy` —, para a página
// do pedido, a lista e os diálogos não escreverem cada um o seu.
//
// O giro fica mesmo com "menos movimento" (`A-11`): é indicador de progresso, não enfeite, e a régua
// de movimento do painel já o dispensa. O texto muda em qualquer caso, e é ele o sinal para quem
// pediu menos movimento e para o leitor de tela.

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, type ButtonProps } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'

export interface ActionButtonProps extends ButtonProps {
  /** A gravação deste botão está em curso. */
  pending?: boolean
  /** O rótulo no gerúndio, mostrado no lugar dos filhos enquanto `pending`. */
  pendingLabel: string
  /** Alvo de toque de 44 px (`min-h-11`) — quando o chamador está num lugar que o dedo alcança. */
  alvo44?: boolean
}

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ pending = false, pendingLabel, alvo44 = false, disabled, className, children, ...rest }, ref) => (
    <Button
      ref={ref}
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending ? 'true' : undefined}
      className={cn(alvo44 && 'min-h-11', className)}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  ),
)
ActionButton.displayName = 'ActionButton'

export default ActionButton
