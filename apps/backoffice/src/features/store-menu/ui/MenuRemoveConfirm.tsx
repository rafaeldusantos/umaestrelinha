// Feature 86, T18 — a confirmação de tirar um item do menu principal (`MNM-20`, `MNM-21`).
//
// Só o item PRINCIPAL pede confirmação: ele leva o submenu inteiro junto, e a frase diz quantos. Tirar
// um item de submenu é um item só, e desfaz-se adicionando de novo (`MNM-23`) — confirmar ali seria
// atrito sem proteção nenhuma.
//
// A segunda frase existe porque "remover" é ambíguo para quem montou a loja: a categoria (ou a página)
// **continua existindo**, só deixa de aparecer no menu (`MNM-21`). O foco nasce em "Cancelar": Enter
// por reflexo não apaga um submenu de 12 itens.

import { useRef } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@estrelinha/ui/alert-dialog'
import { fraseDoSubmenu } from '../model/textosDoMenu'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** O nome que o item mostra. */
  nome: string
  kind: 'category' | 'link'
  /** Quantos itens o submenu tem — saem junto. */
  filhos: number
  onConfirm: () => void
  /** Q07 — quem abriu decide para onde o foco volta (ao ⋯, ou ao vizinho do que saiu). */
  onCloseAutoFocus?: (evento: Event) => void
}

const MenuRemoveConfirm = ({ open, onOpenChange, nome, kind, filhos, onConfirm, onCloseAutoFocus }: Props) => {
  const cancelar = useRef<HTMLButtonElement>(null)
  const submenu = fraseDoSubmenu(filhos)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-testid="confirmar-remocao"
        onCloseAutoFocus={onCloseAutoFocus}
        onOpenAutoFocus={evento => {
          evento.preventDefault()
          cancelar.current?.focus()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Remover “{nome}” do menu?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-1.5">
              {submenu && <p data-testid="remocao-submenu">{submenu}</p>}
              <p data-testid="remocao-continua">
                {kind === 'category'
                  ? 'A categoria continua existindo na loja, só deixa de aparecer no menu.'
                  : 'A página continua existindo na loja, só deixa de aparecer no menu.'}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel ref={cancelar} className="min-h-11">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="confirmar-remover"
            className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Remover do menu
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default MenuRemoveConfirm
