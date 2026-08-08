// RFN-01 — a barra de massa, com as seis ações do artboard.
//
// Saiu de dentro da página quando deixou de ter duas ações e passou a ter seis, mais a de "os N do
// filtro" e a contagem. Componente próprio é o que permite testar cada ação sem montar a listagem
// inteira.

import { CheckCircle2, Copy, Download, PauseCircle, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'

interface Props {
  count: number
  /** Total do filtro — habilita "selecionar os N do filtro" enquanto a seleção for menor. */
  total: number
  busy?: boolean
  onEdit: () => void
  onActivate: () => void
  onPause: () => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
  onSelectAll: () => void
  onClear: () => void
}

const BulkBar = ({
  count, total, busy = false,
  onEdit, onActivate, onPause, onDuplicate, onExport, onDelete, onSelectAll, onClear,
}: Props) => (
  <div
    className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3"
    role="toolbar"
    aria-label="Ações em massa"
  >
    <span className="mr-1 text-sm font-medium">
      {count} selecionado{count === 1 ? '' : 's'}
    </span>

    {count < total && (
      <Button variant="ghost" size="sm" onClick={onSelectAll} disabled={busy}>
        Selecionar os {total} do filtro
      </Button>
    )}

    <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

    <Button size="sm" variant="outline" onClick={onEdit} disabled={busy}>
      <SlidersHorizontal className="mr-1 h-3.5 w-3.5" /> Editar em massa
    </Button>
    <Button size="sm" variant="outline" onClick={onActivate} disabled={busy}>
      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Ativar
    </Button>
    <Button size="sm" variant="outline" onClick={onPause} disabled={busy}>
      <PauseCircle className="mr-1 h-3.5 w-3.5" /> Pausar
    </Button>
    <Button size="sm" variant="outline" onClick={onDuplicate} disabled={busy}>
      <Copy className="mr-1 h-3.5 w-3.5" /> Duplicar
    </Button>
    <Button size="sm" variant="outline" onClick={onExport} disabled={busy}>
      <Download className="mr-1 h-3.5 w-3.5" /> Exportar
    </Button>
    {/* Destrutiva, e por isso separada e em tom próprio — ela abre a confirmação, não exclui. */}
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

export default BulkBar
