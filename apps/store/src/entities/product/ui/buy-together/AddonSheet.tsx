import { useRef } from 'react'
import type { MutableRefObject } from 'react'
import { X } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@estrelinha/ui/dialog'
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@estrelinha/ui/sheet'
import type { BuyTogether, BuyTogetherAddon } from '../../model/useBuyTogether'
import useCompactViewport from '@/shared/lib/useCompactViewport'
import AddonPanel from './AddonPanel'

interface Props {
  addon: BuyTogetherAddon
  open: boolean
  /** O controle da linha que abriu a folha; o foco volta para ele ao fechar. */
  opener: MutableRefObject<HTMLElement | null>
  actions: Pick<
    BuyTogether,
    'toggle' | 'toggleOpen' | 'choosePiece' | 'selectOptions' | 'setEngraving'
  >
}

/**
 * A forma "Em folha": as escolhas de um adicional abrem numa folha no celular e num diálogo no
 * computador, com o MESMO painel da forma "Na linha" e o rodapé "Incluir no conjunto".
 *
 * O foco vai ao título ao abrir; Esc, o fundo e o fechar saem. Sair com a escolha incompleta tira a
 * marca do adicional — a folha existe para completar a escolha, e deixar marcado um adicional que o
 * botão de compra recusaria depois seria uma armadilha. Sair com a escolha completa a mantém.
 *
 * A folha só muda o lugar do painel: o estado do conjunto é o da página, e o total, o preço e o que
 * vai à sacola não dependem da forma.
 */
const AddonSheet = ({ addon, open, opener, actions }: Props) => {
  const compact = useCompactViewport()
  const title = useRef<HTMLHeadingElement>(null)
  // A escolha está completa quando nada falta e a gravação cabe — marcada ou não: pelo "Ver opções" a
  // folha abre sem marcar, e é o "Incluir no conjunto" que marca.
  const complete = addon.missing === null && addon.engravingRefusal === null
  // Sem a frase do que falta, a de gravação acima do limite (a única outra razão de não estar completa).
  const pending = addon.missing ?? addon.engravingRefusal

  const include = () => {
    if (!addon.marked) actions.toggle(addon.id)
    actions.toggleOpen(addon.id)
  }

  const dismiss = () => {
    if (addon.marked && !complete) actions.toggle(addon.id)
    actions.toggleOpen(addon.id)
  }

  const content = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
        <AddonPanel addon={addon} actions={actions} />
      </div>
      <footer className="flex shrink-0 flex-col gap-2 border-t border-estrelinha-line bg-estrelinha-ground px-4 py-3.5 sm:px-6">
        {pending && (
          <p role="status" className="text-[13px] leading-[18px] text-estrelinha-ink-soft">
            {pending}
          </p>
        )}
        <button
          type="button"
          disabled={!complete}
          onClick={include}
          className="flex h-12 w-full items-center justify-center rounded-sm bg-estrelinha-primary text-[15px] font-semibold text-estrelinha-on-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Incluir no conjunto
        </button>
      </footer>
    </>
  )

  // O foco inicial é o título, e o de volta é o controle da linha — o Radix só o devolve sozinho
  // quando a folha abre por um `Trigger`, que aqui não existe.
  const focusProps = {
    'aria-describedby': undefined,
    onOpenAutoFocus: (event: Event) => {
      event.preventDefault()
      title.current?.focus()
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault()
      opener.current?.focus()
    },
  }
  const titleClass =
    'font-display text-[19px] font-semibold leading-[25px] text-estrelinha-ink outline-none sm:text-[21px]'
  const motion = 'motion-reduce:animate-none motion-reduce:transition-none motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none'

  // O fechar dos dois desenhos: 44 px, rótulo em português e sem transição (o padrão do `DialogContent`
  // é um ícone de 16 px, "Close" e `transition-opacity` sem par de movimento reduzido).
  const closeClass =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-estrelinha-ground'

  if (compact) {
    return (
      <Sheet open={open} onOpenChange={next => !next && dismiss()}>
        <SheetContent
          side="bottom"
          hideClose
          data-testid="addon-sheet"
          className={`flex max-h-[90dvh] w-full flex-col gap-0 rounded-t-2xl bg-estrelinha-surface p-0 ${motion}`}
          {...focusProps}
        >
          <div className="flex shrink-0 items-start gap-3 px-4 pt-4">
            <SheetTitle ref={title} tabIndex={-1} className={`${titleClass} min-w-0 flex-1 break-words`}>
              {addon.name}
            </SheetTitle>
            <SheetClose aria-label="Fechar" className={closeClass}>
              <X aria-hidden className="h-[19px] w-[19px] text-estrelinha-ink" />
            </SheetClose>
          </div>
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={next => !next && dismiss()}>
      <DialogContent
        hideClose
        data-testid="addon-sheet"
        className={`flex max-h-[85vh] max-w-lg flex-col gap-0 bg-estrelinha-surface p-0 ${motion}`}
        {...focusProps}
      >
        <div className="flex shrink-0 items-start gap-3 px-6 pt-5">
          <DialogTitle ref={title} tabIndex={-1} className={`${titleClass} min-w-0 flex-1 break-words`}>
            {addon.name}
          </DialogTitle>
          <DialogClose aria-label="Fechar" className={closeClass}>
            <X aria-hidden className="h-[19px] w-[19px] text-estrelinha-ink" />
          </DialogClose>
        </div>
        {content}
      </DialogContent>
    </Dialog>
  )
}

export default AddonSheet
