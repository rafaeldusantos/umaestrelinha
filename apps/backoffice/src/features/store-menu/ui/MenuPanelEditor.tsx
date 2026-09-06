// Quais subcategorias abrem no painel de uma entrada do menu (feature 39, `NAV-22`, `NAV-23`,
// `NAV-27`).
//
// Antes desta feature não havia escolha: o mega menu despejava **todas** as filhas ativas. Com 12
// filhas ele virava uma lista de 12 numa coluna de 180px, e a dona não tinha onde dizer o que
// interessa. O que existia nesta tela era uma linha de leitura ("Naruto · Villains") com um link
// para Categorias.
//
// **A marcação é a MESMA coluna que põe a categoria na barra** (`menu_desktop` / `menu_mobile`), e
// isso não é economia: o papel — entrada da barra × item do painel — é derivado da árvore por
// `menuItems` (`NAV-06`). Uma coluna "é item de painel" seria um segundo dono de algo que a árvore
// já responde, e ela dessincronizaria no primeiro "mover categoria", em silêncio.

import { useState } from 'react'
import { Checkbox } from '@estrelinha/ui/checkbox'
import { cn } from '@estrelinha/ui/lib/utils'
import { MENU_PANEL_COLUMN_SIZE, bySortOrder, type MenuCategory, type MenuSurface } from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category'
import { NOME_DA_SUPERFICIE } from '../model/superficie'

interface Props {
  surface: MenuSurface
  /** A entrada selecionada na lista. */
  host: AdminCategory
  categories: AdminCategory[]
  onToggleChild: (id: string, next: boolean) => void
}

const MenuPanelEditor = ({ surface, host, categories, onToggleChild }: Props) => {
  const [mostrarTodas, setMostrarTodas] = useState(false)

  const pool = categories as unknown as MenuCategory[]
  const filhas = pool.filter(c => c.parent_id === host.id).sort(bySortOrder)
  const marcada = (c: MenuCategory) => (surface === 'desktop' ? !!c.menu_desktop : !!c.menu_mobile)
  const marcadas = filhas.filter(marcada).length

  // O corte é o tamanho de UMA coluna do mega menu (`MENU_PANEL_COLUMN_SIZE`), e não um número
  // escolhido aqui: é a mesma medida que decide quando a lista da loja abre a segunda coluna.
  const visiveis = mostrarTodas ? filhas : filhas.slice(0, MENU_PANEL_COLUMN_SIZE)
  const escondidas = filhas.length - visiveis.length

  return (
    <div className="rounded-2xl border border-border bg-card">
      <header className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-bold text-foreground">
            Painel de “{host.name}”
          </h2>
          <span
            data-testid="contador-painel"
            className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
          >
            {marcadas} de {filhas.length}
          </span>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {/* Os dois fatos que a dona precisa antes de desmarcar algo (`NAV-23`, `NAV-24`): o
              arranjo é calculado, e desmarcar não tira a coleção da loja. Sem a segunda frase, a
              tela parece estar oferecendo apagar uma categoria. */}
          As colunas do mega menu são calculadas: até {MENU_PANEL_COLUMN_SIZE} por coluna, na ordem
          da árvore. Quem não está marcada continua existindo na loja — página, busca, rodapé e grade
          da home —, só não aparece no menu do {NOME_DA_SUPERFICIE[surface]}.
        </p>
      </header>

      {filhas.length === 0 ? (
        <p data-testid="painel-sem-filhas" className="px-4 py-4 text-sm text-muted-foreground">
          “{host.name}” não tem subcategorias. No menu ela é um link direto — sem painel e sem seta —,
          a não ser que você ponha um banner abaixo.
        </p>
      ) : (
        <ul>
          {visiveis.map(filha => {
            const dentro = marcada(filha)
            const contagem = (filha as AdminCategory).product_count ?? 0

            return (
              <li
                key={filha.id}
                data-testid={`filha-${filha.id}`}
                className="flex items-center gap-2.5 border-b border-border/40 px-4 py-2 last:border-0"
              >
                <Checkbox
                  id={`filha-check-${filha.id}`}
                  checked={dentro}
                  aria-label={`${dentro ? 'Tirar' : 'Pôr'} ${filha.name} no painel do ${NOME_DA_SUPERFICIE[surface]}`}
                  onCheckedChange={next => onToggleChild(filha.id, next === true)}
                />
                <label
                  htmlFor={`filha-check-${filha.id}`}
                  className={cn(
                    'min-w-0 flex-1 cursor-pointer truncate text-sm',
                    dentro ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {filha.name}
                  {!filha.active && (
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      (inativa — não aparece na loja)
                    </span>
                  )}
                </label>
                <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground">
                  {contagem === 1 ? '1 produto' : `${contagem} produtos`}
                </span>
              </li>
            )
          })}

          {escondidas > 0 && (
            <li className="px-4 py-2.5">
              <button
                type="button"
                data-testid="mostrar-todas-filhas"
                onClick={() => setMostrarTodas(true)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                mostrar as outras {escondidas} subcategorias
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export default MenuPanelEditor
