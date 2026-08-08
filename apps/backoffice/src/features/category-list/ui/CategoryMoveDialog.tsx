// O `Mover para…` da barra de massa, com o destino escolhido AQUI.
//
// A ação existia desde a T57 e só emitia um aviso — "escolha a categoria pai no inspetor, à
// direita" — que não tinha como ser cumprido: o inspetor edita UMA categoria (a que está aberta na
// linha), e a barra de massa fala de N selecionadas. O admin lia a instrução, ia ao inspetor e não
// encontrava lugar nenhum onde escolher o destino das outras. Botão que só sabe dizer onde não é.
//
// O seletor é `<select>` nativo pelo mesmo motivo do inspetor: testável sem portal. E é ele quem
// mostra a árvore — a indentação da opção é a profundidade da linha, para "Girl Groups" de dois pais
// diferentes não virarem duas opções idênticas.

import { useEffect, useState } from 'react'
import { FolderInput } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Label } from '@estrelinha/ui/label'
import { PREVIEW_LIMIT } from '@/features/bulk-edit/model/confirmDelete'
import type { CategoryRow } from '../model/categoryTree'

/** Sentinela da raiz. `''` já é "ainda não escolhi", e as duas coisas não podem ser a mesma. */
const RAIZ = '__raiz__'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** As que recebem pai novo. */
  moving: CategoryRow[]
  /** As que vão junto, dentro das que se movem. */
  carried: CategoryRow[]
  /** Destinos possíveis, na ordem e profundidade da árvore. */
  destinations: CategoryRow[]
  saving?: boolean
  onConfirm: (destinationId: string | null) => void
}

const CategoryMoveDialog = ({
  open, onOpenChange, moving, carried, destinations, saving = false, onConfirm,
}: Props) => {
  const [choice, setChoice] = useState('')

  // Reabrir com o destino anterior escolhido seria um clique de distância de mover para o lugar
  // errado — a seleção de agora é outra.
  useEffect(() => { if (open) setChoice('') }, [open])

  const preview = moving.slice(0, PREVIEW_LIMIT)
  const rest = moving.length - preview.length
  const plural = moving.length === 1 ? '' : 's'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[520px] max-w-[95vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FolderInput className="h-5 w-5 text-primary" aria-hidden="true" />
            Mover {moving.length} categoria{plural}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="mover-destino">Mover para</Label>
            <select
              id="mover-destino"
              value={choice}
              onChange={event => setChoice(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[13px]"
            >
              <option value="">Escolha o destino…</option>
              <option value={RAIZ}>Nenhuma — deixar como categoria raiz</option>
              {/* Espaço rígido na indentação: o navegador colapsa o espaço comum dentro da
                  `<option>`, e o recuo é o único sinal de nível que o `<select>` nativo aceita. */}
              {destinations.map(row => (
                <option key={row.category.id} value={row.category.id}>
                  {`${'   '.repeat(row.depth)}${row.depth > 0 ? '↳ ' : ''}${row.category.name}`}
                </option>
              ))}
            </select>
            <p className="text-[11.5px] text-muted-foreground">
              A categoria escolhida vira o pai. Ela própria e as que estão dentro dela não aparecem
              na lista — seria um ciclo.
            </p>
          </div>

          {carried.length > 0 && (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12.5px] text-foreground">
              <strong>{carried.length} subcategoria{carried.length === 1 ? '' : 's'}</strong> {' '}
              {carried.length === 1 ? 'vai' : 'vão'} junto e {carried.length === 1 ? 'continua' : 'continuam'} {' '}
              dentro da categoria que se moveu — a hierarquia de baixo não muda.
            </p>
          )}

          <ul className="divide-y divide-border rounded-xl border border-border" aria-label="Categorias que serão movidas">
            {preview.map(row => (
              <li key={row.category.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {row.depth > 0 && <span className="mr-1 text-muted-foreground">↳</span>}
                  {row.category.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.childCount > 0
                    ? `${row.childCount} subcategoria${row.childCount === 1 ? '' : 's'}`
                    : `${row.ownCount} produto${row.ownCount === 1 ? '' : 's'}`}
                </span>
              </li>
            ))}
          </ul>
          {rest > 0 && (
            <p className="text-xs text-muted-foreground">e mais {rest} categoria{rest === 1 ? '' : 's'}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              type="button"
              className="gradient-cta text-white"
              disabled={choice === '' || saving}
              onClick={() => onConfirm(choice === RAIZ ? null : choice)}
            >
              {saving ? 'Movendo…' : `Mover ${moving.length} categoria${plural}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CategoryMoveDialog
