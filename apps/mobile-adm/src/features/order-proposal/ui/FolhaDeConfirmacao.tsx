import { useRef, type ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@estrelinha/ui/sheet'

import { devolverFoco } from '@/features/order-actions'
import type { FolhaNaEntrada } from '@/shared/lib/useFolhaNaEntrada'

/**
 * A folha de confirmação do pedido montado (cancelar, renovar) — molde da `FolhaDoRastreio` da `75`:
 * no histórico (o voltar do Android a fecha), sem o X do canto (16 px), nada fecha enquanto grava, e o
 * foco volta a quem abriu (ou ao título da página). A ação de confirmar é `ink` cheio.
 */
export interface FolhaDeConfirmacaoProps {
  controle: FolhaNaEntrada
  titulo: string
  frase: ReactNode
  manter: string
  confirmar: string
  travado: boolean
  erro: string | null
  aoConfirmar: () => void
}

const FolhaDeConfirmacao = ({ controle, titulo, frase, manter, confirmar, travado, erro, aoConfirmar }: FolhaDeConfirmacaoProps) => {
  const quemAbriu = useRef<HTMLElement | null>(null)
  return (
    <Sheet
      open={controle.aberta}
      onOpenChange={(abrir) => {
        if (!abrir && !travado) controle.fechar()
      }}
    >
      <SheetContent
        side="bottom"
        hideClose
        onOpenAutoFocus={() => {
          const ativo = document.activeElement
          quemAbriu.current = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          devolverFoco(quemAbriu.current)
          quemAbriu.current = null
        }}
        overlayClassName="motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
        className="max-h-[90dvh] overflow-y-auto rounded-t-lg border-estrelinha-line bg-estrelinha-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-estrelinha-ink motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
      >
        <div className="mx-auto max-w-lg space-y-4">
          <div className="space-y-1">
            <SheetTitle className="font-display text-lg text-estrelinha-ink [overflow-wrap:anywhere]">{titulo}</SheetTitle>
            <SheetDescription className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{frase}</SheetDescription>
          </div>
          {erro && (
            <p role="alert" className="rounded-md border border-estrelinha-alert/30 bg-estrelinha-alert-soft p-3 text-sm text-estrelinha-alert">
              {erro}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 min-[360px]:flex-row">
            <button
              type="button"
              onClick={() => {
                if (!travado) controle.fechar()
              }}
              className="min-h-12 flex-1 rounded-sm px-4 text-base font-medium text-estrelinha-primary hover:bg-estrelinha-ground-deep"
            >
              {manter}
            </button>
            <button
              type="button"
              aria-disabled={travado ? 'true' : undefined}
              onClick={() => {
                if (!travado) aoConfirmar()
              }}
              className="min-h-12 flex-1 rounded-sm bg-estrelinha-ink px-4 text-base font-medium text-estrelinha-on-primary aria-disabled:opacity-70"
            >
              {confirmar}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default FolhaDeConfirmacao
