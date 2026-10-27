// As ações de UMA linha da listagem de produtos, em dois gatilhos: o botão "⋯" da coluna Ações e o
// botão direito (toque longo no celular) sobre a linha.
//
// A lista é UMA (`RowAction[]`, montada pela página) e os dois menus só a desenham. Duas listas
// escritas à mão divergiriam no primeiro item novo — a opção apareceria num menu e não no outro.

import type { LucideIcon } from 'lucide-react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@estrelinha/ui/dropdown-menu'
import { ContextMenuItem, ContextMenuSeparator } from '@estrelinha/ui/context-menu'
import { Fragment } from 'react'

export interface RowAction {
  label: string
  icon: LucideIcon
  onSelect: () => void
  disabled?: boolean
  destructive?: boolean
  /** Desenha um separador ANTES do item — os grupos são abrir · estado · duplicar/excluir. */
  separatorBefore?: boolean
}

const destructiveClass = 'text-destructive focus:text-destructive'

export const RowActionsDropdown = ({ actions, rowName }: { actions: RowAction[]; rowName: string }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={`Ações de ${rowName}`}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      {actions.map(action => (
        <Fragment key={action.label}>
          {action.separatorBefore && <DropdownMenuSeparator />}
          <DropdownMenuItem
            disabled={action.disabled}
            onSelect={action.onSelect}
            className={action.destructive ? destructiveClass : undefined}
          >
            <action.icon className="mr-2 h-4 w-4" /> {action.label}
          </DropdownMenuItem>
        </Fragment>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)

/** Os itens do menu do botão direito — o `ContextMenu` em volta é do `AdminTable` (`rowMenu`). */
export const RowActionsContextItems = ({ actions }: { actions: RowAction[] }) => (
  <>
    {actions.map(action => (
      <Fragment key={action.label}>
        {action.separatorBefore && <ContextMenuSeparator />}
        <ContextMenuItem
          disabled={action.disabled}
          onSelect={action.onSelect}
          className={action.destructive ? destructiveClass : undefined}
        >
          <action.icon className="mr-2 h-4 w-4" /> {action.label}
        </ContextMenuItem>
      </Fragment>
    ))}
  </>
)
