// A foto pequena de uma peça (ou de uma variação) nas listas de escolha do painel.
//
// Nasceu na montagem do pedido (feature 89, ajuste de 2026-11-01): a Adri escolhe a peça e a
// variação para a cliente olhando o que vai mandar, e o nome sozinho não distingue "Prata 925" de
// "Banho de ouro" de longe. Sem foto, um quadrado neutro com o ícone da peça ocupa o MESMO lugar —
// a linha não muda de altura quando a foto não existe.
//
// A rendição é pedida a 2× do tamanho mostrado (`renditionUrl`, o dono único da URL de rendição).

import { Package } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'
import { renditionUrl } from '@estrelinha/core/media'

export interface PecaFotoProps {
  url: string | null | undefined
  /** O tamanho em px (quadrado). */
  tamanho?: number
  className?: string
}

const PecaFoto = ({ url, tamanho = 52, className }: PecaFotoProps) => {
  const caixa = { width: tamanho, height: tamanho }
  if (!url) {
    return (
      <span
        data-testid="peca-foto-vazia"
        aria-hidden
        style={caixa}
        className={cn('flex shrink-0 items-center justify-center rounded-lg border border-border bg-muted', className)}
      >
        <Package className="h-4 w-4 text-muted-foreground" />
      </span>
    )
  }
  return (
    <img
      data-testid="peca-foto"
      src={renditionUrl(url, tamanho * 2)}
      alt=""
      width={tamanho}
      height={tamanho}
      loading="lazy"
      style={caixa}
      className={cn('shrink-0 rounded-lg border border-border bg-muted object-cover', className)}
    />
  )
}

export default PecaFoto
