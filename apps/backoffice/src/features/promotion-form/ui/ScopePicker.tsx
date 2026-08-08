// "Vale para" — o escopo da promoção (feature 17 / T16, board `Promoção — desconto progressivo`).
//
// Três segmentos no board, DOIS funcionando. `Produtos` fica desabilitado com o rótulo "em breve"
// (A8): a tabela suportaria escopo por produto avulso, mas o caso de uso real é por categoria, e
// expor o segmento sem AC arrastaria seletor de produto com busca e paginação para dentro desta
// feature. O board não muda; a tela deixa de prometer o que a spec não cobre.

import { X } from 'lucide-react'
import { Label } from '@nanapin/ui/label'
import { cn } from '@nanapin/ui/lib/utils'
import type { DbCategory } from '@nanapin/supabase/types'
import { categoryPath, flattenTree } from '@/entities/category'
import type { PromotionScope } from '@nanapin/supabase/types/promotion'

interface Props {
  scope: PromotionScope
  onScopeChange: (scope: PromotionScope) => void
  categoryIds: string[]
  onCategoryIdsChange: (ids: string[]) => void
  categories: DbCategory[]
  /** `142 produtos elegíveis · inclui subcategorias`. */
  eligibleCount: number
  error?: string
}

const segmentClass = (selected: boolean) =>
  cn(
    'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
    selected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
  )

const ScopePicker = ({
  scope,
  onScopeChange,
  categoryIds,
  onCategoryIdsChange,
  categories,
  eligibleCount,
  error,
}: Props) => {
  const nameById = new Map(categories.map(category => [category.id, category.name]))
  // Ordem de árvore com o caminho no rótulo: numa lista de 30 categorias, duas "Girl Groups" de pais
  // diferentes são indistinguíveis sem ele.
  const available = flattenTree(categories).filter(category => !categoryIds.includes(category.id))

  return (
    // Card branco, e não painel `bg-muted` — a tela deixou de ser modal na feature 18, e na coluna
    // de uma tela inteira o escopo é uma decisão de primeira ordem, do mesmo peso da identidade.
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label>Vale para</Label>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-0.5">
          <button
            type="button"
            className={segmentClass(scope === 'all')}
            onClick={() => onScopeChange('all')}
          >
            Toda a loja
          </button>
          <button
            type="button"
            className={segmentClass(scope === 'categories')}
            onClick={() => onScopeChange('categories')}
          >
            Categorias
          </button>
          <button
            type="button"
            disabled
            title="Escopo por produto avulso ainda não existe nesta versão."
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground/60"
          >
            Produtos <span className="font-normal">· em breve</span>
          </button>
        </div>
      </div>

      {scope === 'all' ? (
        <p className="mt-3 text-xs text-muted-foreground">
          A regra vale para o pedido inteiro — {eligibleCount} produtos no catálogo.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {categoryIds.map(id => (
              <span
                key={id}
                data-testid={`chip-${id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1.5 pl-3 pr-1.5 text-xs font-semibold text-foreground"
              >
                {nameById.get(id) ?? 'Categoria removida'}
                <button
                  type="button"
                  aria-label={`Remover ${nameById.get(id) ?? id}`}
                  onClick={() => onCategoryIdsChange(categoryIds.filter(current => current !== id))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}

            {/* `<select>` nativo pelo mesmo motivo do `Mover para…` das categorias: testável sem
                portal, e o teclado já funciona sem nenhum trabalho nosso. */}
            <select
              aria-label="Adicionar categoria"
              value=""
              disabled={available.length === 0}
              onChange={event => {
                if (event.target.value) onCategoryIdsChange([...categoryIds, event.target.value])
              }}
              className="rounded-full border border-dashed border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50"
            >
              <option value="">+ Adicionar categoria</option>
              {available.map(category => (
                <option key={category.id} value={category.id}>
                  {categoryPath(category, categories)}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {eligibleCount} produtos elegíveis · inclui subcategorias
          </p>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </>
      )}
    </div>
  )
}

export default ScopePicker
