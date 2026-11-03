// Uma peça da lista no editor: posição, foto, nome, preço e as variações liberadas.
//
// A peça é lida por id (`useProductVariants`), e nunca por nome: a busca por nome tem um dono só
// (`AD-036`). Peça fora do ar não oferece marcadores — a loja a pula em todas as joias.

import { ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'
import { formatPrice } from '@estrelinha/core/formatters'
import { PecaFoto, useProductVariants } from '@/entities/product'

export interface ListItemRowProps {
  productId: string
  position: number
  total: number
  variantIds: readonly string[]
  /** A linha com os marcadores de variação aberta. */
  open: boolean
  onToggleOpen: () => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
  onToggleVariant: (variantId: string) => void
  onReleaseAll: () => void
  onDragStart: () => void
  onDrop: () => void
}

const TAP = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent'

const ListItemRow = ({
  productId,
  position,
  total,
  variantIds,
  open,
  onToggleOpen,
  onMove,
  onRemove,
  onToggleVariant,
  onReleaseAll,
  onDragStart,
  onDrop,
}: ListItemRowProps) => {
  const { peca, carregando } = useProductVariants(productId)

  const foraDoAr = peca !== null && !peca.ativa
  const ativas = peca?.variacoes ?? []
  // Só conta o que ainda existe: um id liberado cuja variação saiu continua gravado, e a loja pula a
  // peça se NENHUMA das liberadas sobrou — por isso o resumo mostra quantas ainda valem.
  const liberadasVivas = ativas.filter(v => variantIds.includes(v.id))
  const resumo =
    variantIds.length === 0
      ? `todas as ativas (${ativas.length})`
      : `${liberadasVivas.length} de ${ativas.length}`
  const semNenhumaViva = variantIds.length > 0 && liberadasVivas.length === 0

  return (
    <li
      data-testid={`peca-da-lista-${position}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        onDrop()
      }}
      className={cn('rounded-xl border border-border/60 p-2', foraDoAr && 'border-estrelinha-admin-amber/40 bg-estrelinha-admin-amber/5')}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-muted-foreground md:block" aria-hidden />
        <span data-testid={`posicao-${position}`} className="w-5 shrink-0 text-center text-[11px] font-semibold text-muted-foreground">
          {position + 1}
        </span>
        <PecaFoto url={peca?.imagem} tamanho={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{peca?.nome ?? (carregando ? 'Carregando…' : 'Peça sem nome')}</p>
          {peca && (
            <p className="text-[11px] text-muted-foreground">a partir de {formatPrice(peca.precoBase)}</p>
          )}
        </div>
        {foraDoAr && (
          <span
            data-testid={`saiu-do-ar-${position}`}
            className="shrink-0 rounded bg-estrelinha-admin-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-estrelinha-admin-amber"
          >
            saiu do ar
          </span>
        )}
        <button
          type="button"
          className={TAP}
          disabled={position === 0}
          aria-label={`Subir ${peca?.nome ?? 'a peça'}`}
          onClick={() => onMove(-1)}
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          className={TAP}
          disabled={position === total - 1}
          aria-label={`Descer ${peca?.nome ?? 'a peça'}`}
          onClick={() => onMove(1)}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className={TAP} aria-label={`Tirar ${peca?.nome ?? 'a peça'} da lista`} onClick={onRemove}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {foraDoAr ? (
        <p data-testid={`aviso-fora-do-ar-${position}`} className="mt-2 text-xs text-muted-foreground">
          Esta peça saiu do ar. A loja a pula em todas as joias até ela voltar; tire-a da lista se não for voltar.
        </p>
      ) : (
        peca &&
        ativas.length > 0 && (
          <div className="mt-2 pl-7">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span data-testid={`resumo-variacoes-${position}`}>Variações oferecidas: {resumo}</span>
              <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={onToggleOpen}>
                {open ? 'Esconder' : 'Escolher quais'}
              </Button>
              {variantIds.length > 0 && (
                <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={onReleaseAll}>
                  Oferecer todas
                </Button>
              )}
            </div>
            {semNenhumaViva && (
              <p className="text-xs text-destructive">
                Nenhuma das variações liberadas existe mais. A loja pula esta peça até você escolher outras.
              </p>
            )}
            {open && (
              <div data-testid={`variacoes-${position}`} className="mt-1 space-y-1">
                <ul className="flex flex-wrap gap-2">
                  {ativas.map(v => {
                    const marcada = variantIds.includes(v.id)
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          aria-pressed={marcada}
                          onClick={() => onToggleVariant(v.id)}
                          className={cn(
                            'flex min-h-11 items-center gap-2 rounded-lg border px-2 py-1 text-xs transition-colors motion-reduce:transition-none',
                            marcada ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-input text-muted-foreground hover:bg-muted/50',
                          )}
                        >
                          <PecaFoto url={v.imagem} tamanho={28} />
                          {v.rotulo}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <p className="text-[11px] text-muted-foreground">
                  Nenhuma marcada vale todas as ativas, inclusive as que você criar depois.
                </p>
              </div>
            )}
          </div>
        )
      )}
    </li>
  )
}

export default ListItemRow
