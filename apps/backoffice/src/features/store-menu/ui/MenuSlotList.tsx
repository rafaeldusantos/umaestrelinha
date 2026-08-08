// A curadoria da barra do topo da loja: quem ocupa as vagas, e em que ordem.
//
// Não é uma segunda árvore de categorias. Cada linha aqui é **a mesma linha** de `public.categories`
// que a tela de Categorias edita — esta tela só liga `show_in_menu` e mexe em `sort_order`. Uma
// tabela `menu_items` própria significaria dois lugares para consertar cada regra, e as duas
// divergiriam no primeiro rename de categoria.
//
// As subcategorias aparecem em **leitura**, com link para `/admin/categorias`. Editar hierarquia em
// duas telas é o mesmo defeito de novo.

import { GripVertical, Lock, Star, Info } from 'lucide-react'
import { Switch } from '@estrelinha/ui/switch'
import { cn } from '@estrelinha/ui/lib/utils'
import { MENU_SLOT_LIMIT, menuSlotRefusal, pathLabel, type MenuCategory } from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category'

/**
 * As entradas fixas do menu, que vivem no código da loja (`Header` / `MobileMenu`) e não no banco.
 *
 * Aparecem aqui **travadas** por um motivo específico: sem elas a tela diz "4 vagas" e a barra da
 * loja mostra 6 itens, e o admin não tem como saber de onde vieram os outros dois. Elas não são
 * editáveis porque são rotas do produto — um interruptor que esconde "Sobre" é armadilha sem demanda.
 */
export const FIXED_ENTRIES = [
  { label: 'Crie o Seu', href: '/crie-seu-botton', Icon: Star },
  { label: 'Sobre', href: '/sobre', Icon: Info },
] as const

interface Props {
  /** Todas as categorias, na ordem em que a árvore as desenha. */
  categories: AdminCategory[]
  /** Qual entrada está selecionada para editar o painel/promo. */
  activeId: string | null
  onSelect: (id: string) => void
  /** Recebe o veredito do domínio — a recusa da 5ª vaga chega aqui com o motivo. */
  onToggle: (id: string, next: boolean, refusal: string | null) => void
  onReorder: (draggedId: string, targetId: string) => void
}

const MenuSlotList = ({ categories, activeId, onSelect, onToggle, onReorder }: Props) => {
  const pool = categories as unknown as MenuCategory[]
  const inMenu = categories.filter(c => c.show_in_menu)
  const used = inMenu.length
  const childCountOf = (id: string) => categories.filter(c => c.parent_id === id).length

  return (
    <div className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-bold text-foreground">Barra do topo</h2>
        <span
          data-testid="contador-vagas"
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            // Passar de 4 é estado alcançável (SQL na mão, dois admins) e o contador precisa
            // *acusar*, não esconder — por isso `menuEntries` não trunca.
            used > MENU_SLOT_LIMIT
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {used} de {MENU_SLOT_LIMIT} vagas
        </span>
      </header>

      <ul>
        {categories.map(category => {
          const children = childCountOf(category.id)
          const refusal = menuSlotRefusal(pool, category.id)

          return (
            <li key={category.id}>
              <div
                data-testid={`vaga-${category.id}`}
                draggable={category.show_in_menu}
                onDragStart={
                  category.show_in_menu
                    ? e => e.dataTransfer.setData('text/plain', category.id)
                    : undefined
                }
                onDragOver={category.show_in_menu ? e => e.preventDefault() : undefined}
                onDrop={
                  category.show_in_menu
                    ? e => {
                        e.preventDefault()
                        onReorder(e.dataTransfer.getData('text/plain'), category.id)
                      }
                    : undefined
                }
                className={cn(
                  'flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-0',
                  activeId === category.id ? 'bg-primary/5' : 'hover:bg-muted/30',
                )}
              >
                {/* Vão de largura fixa mesmo quando vazio: sem ele, as linhas sem alça de arraste
                    puxam o nome para a esquerda e a coluna deixa de formar uma pista vertical. */}
                <span className="flex w-4 shrink-0 justify-center">
                  {category.show_in_menu && (
                    <GripVertical
                      className="h-4 w-4 cursor-grab text-muted-foreground"
                      aria-hidden
                    />
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => onSelect(category.id)}
                  className="flex min-w-0 flex-1 flex-col items-start text-left"
                >
                  <span className="truncate text-sm font-semibold text-foreground">
                    {category.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {/* O caminho na árvore, porque no banco real os universos são filhas de
                        "Bottons" — só o nome não diz o que está sendo posto no menu. */}
                    {pathLabel(pool, category.id)}
                    {' · '}
                    {children === 0
                      ? 'sem subcategoria'
                      : `${children} subcategoria${children === 1 ? '' : 's'}`}
                  </span>
                </button>

                {!category.active && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    inativa — não aparece na loja
                  </span>
                )}

                <span className="flex w-10 shrink-0 justify-end">
                  <Switch
                    checked={category.show_in_menu}
                    aria-label={`${category.show_in_menu ? 'Tirar' : 'Pôr'} ${category.name} no menu`}
                    onCheckedChange={next =>
                      onToggle(
                        category.id,
                        next,
                        // O motivo vem do domínio, não da tela: o `disabled` de um switch some num
                        // teste, num atalho de teclado ou numa chamada direta ao hook — e a barra
                        // ganha um quinto item que estoura em 1440px.
                        next ? refusal : null,
                      )
                    }
                  />
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="border-t border-border bg-muted/20">
        {FIXED_ENTRIES.map(({ label, href, Icon }) => (
          <div
            key={href}
            data-testid={`fixa-${label}`}
            className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0"
          >
            <span className="flex w-4 shrink-0 justify-center">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </span>
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
            <code className="text-xs text-muted-foreground">{href}</code>
            <span className="w-10 shrink-0 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              fixo
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MenuSlotList
