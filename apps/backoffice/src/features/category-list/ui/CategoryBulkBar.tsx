// RFN-09 / T57 — a barra de massa de categorias.
//
// Quatro ações, não cinco: **`Mesclar` foi cortada no aceite do artboard**. Mesclar move todos os
// vínculos de N categorias para uma e apaga as origens — é irreversível, precisa de prévia do que
// muda, e entrar de carona numa task de listagem seria a pior forma de estreá-la.
//
// A frase "as subcategorias acompanham a ação" não é decorativa: `cascadeSelection` põe as filhas no
// conjunto que vai para o `update`, então a barra precisa dizer isso antes de o admin clicar.

import { Eye, EyeOff, FolderInput, Trash2 } from 'lucide-react'
import { Button } from '@nanapin/ui/button'

interface Props {
  count: number
  /** Quantas das selecionadas são subcategorias arrastadas pelo pai. */
  cascadedCount: number
  busy?: boolean
  onMove: () => void
  onShow: () => void
  onHide: () => void
  onDelete: () => void
  onClear: () => void
}

const CategoryBulkBar = ({
  count, cascadedCount, busy = false, onMove, onShow, onHide, onDelete, onClear,
}: Props) => (
  <div
    className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3"
    role="toolbar"
    aria-label="Ações em massa de categorias"
  >
    <span className="mr-1 text-sm font-medium">
      {count} selecionada{count === 1 ? '' : 's'}
    </span>

    {cascadedCount > 0 && (
      <span className="text-xs text-muted-foreground">
        inclui {cascadedCount} subcategoria{cascadedCount === 1 ? '' : 's'}
      </span>
    )}

    <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

    <Button size="sm" variant="outline" onClick={onMove} disabled={busy}>
      <FolderInput className="mr-1 h-3.5 w-3.5" /> Mover para…
    </Button>
    <Button size="sm" variant="outline" onClick={onShow} disabled={busy}>
      <Eye className="mr-1 h-3.5 w-3.5" /> Mostrar
    </Button>
    <Button size="sm" variant="outline" onClick={onHide} disabled={busy}>
      <EyeOff className="mr-1 h-3.5 w-3.5" /> Ocultar
    </Button>
    <Button
      size="sm"
      variant="outline"
      onClick={onDelete}
      disabled={busy}
      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
    </Button>

    <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear} disabled={busy}>
      Limpar seleção
    </Button>
  </div>
)

export default CategoryBulkBar
