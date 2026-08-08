import { useEffect, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { Badge } from '@estrelinha/ui/badge'
import type { DbCategory } from '@estrelinha/supabase/types'
import { categoryPath, depthOf, flattenTree, parentPath } from '@/entities/category'

interface Props {
  /** Todas as categorias do catálogo. */
  categories: DbCategory[]
  /** Selecionadas, **na ordem de seleção** — vira `product_categories.position` (PFM-05 AC 4). */
  selected: string[]
  onChange: (ids: string[]) => void
  countByCategory?: Record<string, number>
  /** Abre o `CategoryFormDialog` com o nome já preenchido (AC 3). */
  onCreateCategory?: (name: string) => void
}

/**
 * Combobox de múltipla escolha com chips (PFM-05), no formato do artboard `Card · Categorias`.
 *
 * Substitui o `Select` único da aba Geral. O produto real está em várias categorias ao mesmo tempo —
 * o botton da Sailor Moon é *anime*, *Sailor Moon* e *mais vendidos* — e escolher uma só obrigava o
 * lojista a decidir qual delas perder.
 *
 * Três coisas mudaram na virada para o desenho, e nenhuma é decoração:
 *
 * - **Os chips moram dentro da caixa.** Fora dela, o campo de busca parecia um segundo controle, sem
 *   relação com a lista de escolhidas logo acima.
 * - **A lista é um dropdown, e só abre em uso.** Aberta permanentemente ela ocupava 224px do card em
 *   repouso e empurrava o card `Tags` para fora da primeira tela.
 * - **A selecionada continua na lista, marcada.** Antes ela era *removida* dos resultados: marcar
 *   `Anime` fazia `Anime` desaparecer, e desmarcar só era possível pelo chip. Caixa marcada diz as
 *   duas coisas — que está escolhida e que dá para desescolher — no mesmo lugar.
 */
const CategoryMultiSelect = ({
  categories,
  selected,
  onChange,
  countByCategory = {},
  onCreateCategory,
}: Props) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  /** A opção sob as setas do teclado. `-1` = nenhuma; `Enter` então cai no criar. */
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const byId = new Map(categories.map(category => [category.id, category]))
  const term = query.trim().toLowerCase()
  const ordered = flattenTree(categories)
  // A busca casa contra o CAMINHO, não contra o nome: `k-pop › girl` tem que achar a filha.
  const matches = ordered.filter(
    category => term === '' || categoryPath(category, categories).toLowerCase().includes(term),
  )

  /**
   * Fecha no clique fora — em `pointerdown` no documento, não no `blur` do campo.
   *
   * `blur` fecharia o dropdown *antes* do `click` no item chegar, e marcar uma categoria com o mouse
   * nunca funcionaria. Aqui a checagem é `contains`: clique no item está dentro do container, logo
   * não fecha, e escolher várias em sequência (o caso do artboard, com 3 chips) segue possível.
   */
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const toggle = (id: string) => {
    // Acrescenta no FIM: a ordem de seleção é a `position`, e reordenar por acidente mudaria o selo
    // que a vitrine escolhe (PST-06).
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
    setQuery('')
    setActiveIndex(-1)
  }

  const search = (value: string) => {
    setQuery(value)
    setOpen(true)
    setActiveIndex(-1)
  }

  const create = () => {
    if (term === '') return
    onCreateCategory?.(query.trim())
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    // `⌘⏎` cria direto, sem tirar a mão do teclado (AC 3) — vale mesmo com resultado na lista.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      create()
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (matches.length === 0) return
      event.preventDefault()
      setOpen(true)
      const down = event.key === 'ArrowDown'
      setActiveIndex(prev => {
        // `-1` não é uma posição — é "nenhuma". A fórmula genérica trataria como índice e mandaria o
        // `↑` para a penúltima em vez da última.
        if (prev === -1) return down ? 0 : matches.length - 1
        return (prev + (down ? 1 : -1) + matches.length) % matches.length
      })
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex >= 0 && matches[activeIndex]) toggle(matches[activeIndex].id)
      // Sem opção sob o cursor, `Enter` com termo digitado só pode significar criar.
      else create()
      return
    }
    // `Backspace` em campo VAZIO tira o último chip — a convenção do `TagInput` ao lado.
    if (event.key === 'Backspace' && query === '' && selected.length > 0) {
      event.preventDefault()
      onChange(selected.slice(0, -1))
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* A caixa é UM controle: chips e campo dentro da mesma borda, que acende junto. */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`flex flex-wrap items-center gap-1.5 rounded-xl border bg-background p-2 transition-colors ${
          open ? 'border-nana-violet ring-1 ring-nana-violet' : 'border-input'
        }`}
      >
        {selected.map(id => {
          const category = byId.get(id)
          return (
            <Badge key={id} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1.5">
              {category ? categoryPath(category, categories) : id}
              <button
                type="button"
                aria-label={`Remover ${category?.name ?? id}`}
                onClick={() => toggle(id)}
                className="rounded-full p-0.5 hover:bg-background/60"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )
        })}
        <input
          ref={inputRef}
          aria-label="Buscar categoria"
          role="combobox"
          aria-expanded={open}
          aria-controls="category-results"
          aria-autocomplete="list"
          value={query}
          placeholder={selected.length === 0 ? 'Buscar ou criar categoria…' : ''}
          onChange={event => search(event.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <p className="border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {term === ''
              ? 'Todas as categorias'
              : `${matches.length} resultado${matches.length === 1 ? '' : 's'} para "${query.trim()}"`}
          </p>

          <ul id="category-results" role="listbox" aria-multiselectable className="max-h-56 overflow-y-auto" data-testid="category-results">
            {matches.map((category, index) => {
              const isSelected = selected.includes(category.id)
              const depth = depthOf(category, categories)
              const count = countByCategory[category.id] ?? 0
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggle(category.id)}
                    onMouseEnter={() => setActiveIndex(index)}
                    // O recuo é a hierarquia. Fica no `style` porque `depth` é um número em runtime
                    // e Tailwind não gera classe para valor que ele não vê no código.
                    style={{ paddingLeft: 12 + Math.min(depth, 3) * 16 }}
                    className={`flex w-full items-center gap-2.5 py-2 pr-3 text-left transition-colors ${
                      index === activeIndex ? 'bg-muted' : ''
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-nana-violet bg-nana-violet text-white'
                          : 'border-input'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {/* O pai só aparece na BUSCA: ali o filtro pode trazer a filha sem a mãe, e o
                          recuo sozinho apontaria para uma linha que não está na tela. Sem busca a
                          árvore está inteira e o recuo basta. */}
                      {term !== '' && depth > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {parentPath(category, categories)}{' '}
                        </span>
                      )}
                      <span className="font-medium text-foreground">{category.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {count} produto{count === 1 ? '' : 's'}
                    </span>
                  </button>
                </li>
              )
            })}

            {matches.length === 0 && term === '' && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Nenhuma categoria no catálogo ainda.
              </li>
            )}
          </ul>

          {/* Criar fica no RODAPÉ e aparece com qualquer termo — não só quando a busca falha. Quem
              digita `Vaporwave` e vê `Vaporwave Retrô` na lista ainda pode querer a sua. */}
          {term !== '' && (
            <button
              type="button"
              onClick={create}
              className="flex w-full items-center gap-2.5 border-t border-border bg-nana-violet/5 px-3 py-2.5 text-left hover:bg-nana-violet/10"
            >
              <Plus className="h-4 w-4 shrink-0 text-nana-violet" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-nana-violet">
                  Criar categoria &quot;{query.trim()}&quot;
                </span>
                <span className="block text-xs text-muted-foreground">
                  abre um formulário curto aqui mesmo — nome, pai e slug automático
                </span>
              </span>
              <kbd className="shrink-0 text-[11px] font-semibold text-muted-foreground">⌘⏎</kbd>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default CategoryMultiSelect
