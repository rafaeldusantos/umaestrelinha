// Feature 86, T17 — o menu como a cliente vê: os itens da barra, na ordem, e o submenu de cada um.
//
// Substitui `MenuSlotList` + `MenuPanelEditor` da `39`, que listavam a ÁRVORE INTEIRA de categorias
// com uma chave por linha e deixavam a dona deduzir o menu. Aqui só aparece o que ESTÁ no documento
// (`MNM-03`): uma categoria fora do menu não tem linha nenhuma — nem desligada.
//
// - **A ordem é a do documento**, e reordenar (alça, ou "Mover para cima/baixo" pelo teclado —
//   `MNM-19`) muda só o documento. A `sort_order` da árvore, que ordena a Home e o rodapé, não é
//   tocada (`MNM-18`): este componente nem conhece categoria como coisa gravável.
// - **As chaves PC | Celular são do nó** (`MNM-28`, `MNM-29`). Desligado nos dois, o item fica
//   esmaecido com "Fora do menu" (`MNM-30`) — continua aqui, porque esta é a única tela onde dá para
//   religá-lo.
// - **O que deixou de existir é dito**: categoria inativa e apagada ganham selo (`MNM-35`, `MNM-36`),
//   e a apagada só oferece "Remover do menu" — não há o que editar nela.
//
// O componente não grava: ele chama quem o monta, que aplica a operação no documento.

import { useState, type DragEvent } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@estrelinha/ui/dropdown-menu'
import { MENU_ICON_COMPONENTS } from '@estrelinha/ui/icons'
import {
  MENU_SUBMENU_LIMIT,
  menuIconKey,
  menuNodeName,
  menuNodeState,
  pathLabel,
  type MenuCategory,
  type MenuDocument,
  type MenuNode,
  type MenuNodeState,
  type MenuRootNode,
  type MenuSurface,
} from '@estrelinha/core/menu'

interface Props {
  document: MenuDocument
  categories: readonly MenuCategory[]
  /** Quantos itens a loja desenha em cada dispositivo — `menuItems`, a mesma porta da loja. */
  contagem: Record<MenuSurface, number>
  onAdd: () => void
  onAddChild: (parentId: string) => void
  onToggle: (nodeId: string, surface: MenuSurface, next: boolean) => void
  onMove: (parentId: string | null, from: number, to: number) => void
  onEdit: (nodeId: string) => void
  /** Item principal: quem monta pede confirmação (`MNM-20`). */
  onRemoveRoot: (nodeId: string) => void
  /** Item de submenu: sai direto (`MNM-23`). */
  onRemoveChild: (nodeId: string) => void
  /** O item que a prévia deve abrir (o último expandido ou tocado). */
  onSelect?: (nodeId: string) => void
  /**
   * Q04 do QA da `86` — uma gravação está no ar: os controles de MOVER ficam desabilitados. Um toque
   * duplo no celular (que demora a responder) andava o item duas casas, com as duas gravações.
   */
  moverDesabilitado?: boolean
}

const SELO: Record<Exclude<MenuNodeState, 'ok'>, string> = {
  inactive: 'Categoria inativa — não aparece na loja',
  deleted: 'Categoria apagada',
}

/** O destino legível: `Joias › Anéis` ou `/sobre`. */
const destinoDe = (node: MenuNode, categories: readonly MenuCategory[]): string =>
  node.target.kind === 'category'
    ? pathLabel(categories, node.target.category_id) || '—'
    : node.target.href

const nomeDe = (node: MenuNode, categories: readonly MenuCategory[]): string =>
  menuNodeName(node, categories) || 'Categoria apagada'

const Selo = ({ texto, testId }: { texto: string; testId: string }) => (
  <span
    data-testid={testId}
    className="shrink-0 rounded-full bg-estrelinha-admin-amber/10 px-2 py-0.5 text-[11px] font-semibold text-estrelinha-admin-amber"
  >
    {texto}
  </span>
)

/** As duas chaves de dispositivo de um nó. */
const Chaves = ({
  node,
  nome,
  onToggle,
}: {
  node: MenuNode
  nome: string
  onToggle: Props['onToggle']
}) => (
  <div role="group" aria-label={`Onde “${nome}” aparece`} className="flex shrink-0 gap-1">
    {(
      [
        ['desktop', 'PC', 'no computador'],
        ['mobile', 'Celular', 'no celular'],
      ] as const
    ).map(([surface, rotulo, onde]) => (
      <button
        key={surface}
        type="button"
        data-testid={`chave-${surface}-${node.id}`}
        aria-pressed={node[surface]}
        aria-label={`Mostrar “${nome}” ${onde}`}
        onClick={() => onToggle(node.id, surface, !node[surface])}
        className={cn(
          'min-h-11 min-w-11 rounded-lg border px-2 text-xs font-semibold transition-colors motion-reduce:transition-none',
          node[surface]
            ? 'border-primary bg-primary/10 text-foreground'
            : 'border-border text-muted-foreground line-through hover:bg-muted',
        )}
      >
        {rotulo}
      </button>
    ))}
  </div>
)

const lerArraste = (e: DragEvent): { lista: string; indice: number } | null => {
  const bruto = e.dataTransfer?.getData('text/plain') ?? ''
  const [lista, indice] = bruto.split('|')
  const n = Number(indice)
  return lista && Number.isInteger(n) ? { lista, indice: n } : null
}

const MenuTree = ({
  document,
  categories,
  contagem,
  onAdd,
  onAddChild,
  onToggle,
  onMove,
  onEdit,
  onRemoveRoot,
  onRemoveChild,
  onSelect,
  moverDesabilitado = false,
}: Props) => {
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set())

  const alternar = (id: string) => {
    onSelect?.(id)
    setAbertos(atual => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  const arrastavel = (lista: string, indice: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.stopPropagation()
      e.dataTransfer?.setData('text/plain', `${lista}|${indice}`)
    },
    onDragOver: (e: DragEvent) => e.preventDefault(),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const origem = lerArraste(e)
      // Arraste entre listas (do menu principal para um submenu, ou entre submenus) não é mover:
      // mudar um item de nível é tirá-lo e acrescentá-lo, e a tela pede isso explicitamente.
      if (moverDesabilitado || !origem || origem.lista !== lista || origem.indice === indice) return
      onMove(lista === 'raiz' ? null : lista, origem.indice, indice)
    },
  })

  if (document.items.length === 0) {
    return (
      <section
        data-testid="menu-vazio"
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-8 text-center"
      >
        <h2 className="font-heading text-base font-bold text-foreground">O menu está vazio</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Acrescente as categorias e as páginas que a cliente vê na barra do topo. Cada item pode ter
          um submenu.
        </p>
        <Button type="button" className="min-h-11" data-testid="adicionar-primeiro" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Adicionar item ao menu
        </Button>
      </section>
    )
  }

  const ultimo = document.items.length - 1

  return (
    <section data-testid="arvore-do-menu" className="rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-bold text-foreground">Itens do menu principal</h2>
          <p data-testid="contador-itens" className="text-xs text-muted-foreground">
            {contagem.desktop} no computador · {contagem.mobile} no celular · arraste pela alça para
            reordenar
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          // Q06: o `Button` é `whitespace-nowrap`; com a fonte a 200 % o rótulo passava da tela.
          className="h-auto min-h-11 max-w-full whitespace-normal"
          data-testid="adicionar-item"
          onClick={onAdd}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Adicionar item
        </Button>
      </header>

      <ul className="flex flex-col divide-y divide-border">
        {document.items.map((item: MenuRootNode, indice) => {
          const estado = menuNodeState(item, categories)
          const apagado = estado === 'deleted'
          const nome = nomeDe(item, categories)
          const fora = !item.desktop && !item.mobile
          const aberto = abertos.has(item.id) && !apagado
          const chave = menuIconKey(item.icon)
          const Icone = chave ? MENU_ICON_COMPONENTS[chave] : null
          const proprio = item.target.kind === 'category' && typeof item.label === 'string' && item.label.trim() !== ''
          const filhos = item.children

          return (
            <li key={item.id} data-testid={`item-${item.id}`} {...arrastavel('raiz', indice)}>
              {/* `flex-wrap` + a base de 10rem do nome: em 390 os controles descem para uma segunda linha
                  em vez de espremer o nome a 29px ("Joi…"), medido na prova da 86. */}
              <div
                data-testid={`linha-${item.id}`}
                className={cn('flex min-w-0 flex-wrap items-center gap-2 px-2 py-2 sm:px-3', fora && 'opacity-60')}
              >
                <span
                  aria-hidden
                  title="Arrastar para reordenar"
                  className="flex h-11 w-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                <span
                  data-testid={`icone-${item.id}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-semibold text-muted-foreground"
                >
                  {Icone ? <Icone className="h-5 w-5" aria-hidden /> : 'sem'}
                </span>

                <button
                  type="button"
                  className="flex min-h-11 min-w-0 flex-1 basis-40 flex-col items-start text-left"
                  onClick={() => onSelect?.(item.id)}
                >
                  <span className="flex max-w-full flex-wrap items-center gap-1.5">
                    <span className="min-w-0 break-words text-sm font-semibold text-foreground">{nome}</span>
                    {estado !== 'ok' && <Selo testId={`selo-${item.id}`} texto={SELO[estado]} />}
                    {fora && estado === 'ok' && <Selo testId={`selo-${item.id}`} texto="Fora do menu" />}
                  </span>
                  <span data-testid={`meta-${item.id}`} className="max-w-full break-words text-xs text-muted-foreground">
                    {item.target.kind === 'category' ? 'Categoria' : 'Link'} · {destinoDe(item, categories)} ·{' '}
                    {filhos.length > 0 ? `${filhos.length} no submenu` : 'sem submenu'}
                    {proprio ? ' · nome próprio' : ''}
                  </span>
                </button>

                {/* Q06 do QA: `flex-wrap` + `min-w-0` + `max-w-full`, e NÃO `shrink-0` — com a fonte do
                    celular a 200 % cada alvo de 44 vira 88 px, e um bloco `shrink-0` ficava com a
                    largura de uma linha só, saindo da tela (o body rolava de lado). */}
                <div
                  data-testid={`controles-${item.id}`}
                  className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2"
                >
                {!apagado && <Chaves node={item} nome={nome} onToggle={onToggle} />}

                {!apagado && (
                  <button
                    type="button"
                    data-testid={`expandir-${item.id}`}
                    aria-expanded={aberto}
                    aria-label={aberto ? `Fechar o submenu de “${nome}”` : `Abrir o submenu de “${nome}”`}
                    onClick={() => alternar(item.id)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <ChevronDown
                      aria-hidden
                      className={cn('h-4 w-4 transition-transform motion-reduce:transition-none', aberto && 'rotate-180')}
                    />
                  </button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger
                    data-testid={`acoes-${item.id}`}
                    aria-label={`Ações de “${nome}”`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!apagado && (
                      <>
                        <DropdownMenuItem data-testid={`editar-${item.id}`} className="min-h-11" onSelect={() => onEdit(item.id)}>
                          Editar nome, ícone e banners
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          data-testid={`subir-${item.id}`}
                          className="min-h-11"
                          disabled={indice === 0 || moverDesabilitado}
                          onSelect={() => onMove(null, indice, indice - 1)}
                        >
                          Mover para cima
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          data-testid={`descer-${item.id}`}
                          className="min-h-11"
                          disabled={indice === ultimo || moverDesabilitado}
                          onSelect={() => onMove(null, indice, indice + 1)}
                        >
                          Mover para baixo
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem
                      data-testid={`remover-${item.id}`}
                      className="min-h-11 text-destructive focus:text-destructive"
                      onSelect={() => onRemoveRoot(item.id)}
                    >
                      Remover do menu
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>

              {aberto && (
                <div data-testid={`submenu-${item.id}`} className="border-t border-border bg-muted/30 px-3 py-3 sm:pl-12">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Submenu — abre no mega menu do computador e na lista do celular
                    </p>
                    <span
                      data-testid={`contador-submenu-${item.id}`}
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground"
                    >
                      {filhos.length}/{MENU_SUBMENU_LIMIT}
                    </span>
                  </div>

                  {filhos.length === 0 ? (
                    <p data-testid={`submenu-vazio-${item.id}`} className="py-2 text-sm text-muted-foreground">
                      Sem submenu: na loja, “{nome}” é um link direto.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {filhos.map((filho, k) => {
                        const estadoFilho = menuNodeState(filho, categories)
                        const filhoApagado = estadoFilho === 'deleted'
                        const nomeFilho = nomeDe(filho, categories)
                        const foraFilho = !filho.desktop && !filho.mobile
                        return (
                          <li
                            key={filho.id}
                            data-testid={`filho-${filho.id}`}
                            {...arrastavel(item.id, k)}
                            className={cn(
                              'flex min-w-0 flex-wrap items-center gap-1.5 rounded-xl bg-card px-2 py-1.5',
                              foraFilho && 'opacity-60',
                            )}
                          >
                            <span aria-hidden className="flex h-11 w-5 shrink-0 cursor-grab items-center justify-center text-muted-foreground">
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <span data-testid={`nome-${filho.id}`} className="flex min-w-0 flex-1 basis-28 flex-col">
                              <span className="flex max-w-full flex-wrap items-center gap-1.5">
                                <span className="min-w-0 break-words text-sm font-medium text-foreground">{nomeFilho}</span>
                                {estadoFilho !== 'ok' && (
                                  <Selo testId={`selo-${filho.id}`} texto={SELO[estadoFilho]} />
                                )}
                              </span>
                              <span className="max-w-full break-words text-xs text-muted-foreground">
                                {destinoDe(filho, categories)}
                              </span>
                            </span>
                            <span
                              data-testid={`controles-${filho.id}`}
                              className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5"
                            >
                            {!filhoApagado && <Chaves node={filho} nome={nomeFilho} onToggle={onToggle} />}
                            {!filhoApagado && (
                              <>
                                <button
                                  type="button"
                                  data-testid={`subir-${filho.id}`}
                                  aria-label={`Mover “${nomeFilho}” para cima`}
                                  disabled={k === 0 || moverDesabilitado}
                                  onClick={() => onMove(item.id, k, k - 1)}
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                                >
                                  <ArrowUp className="h-4 w-4" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  data-testid={`descer-${filho.id}`}
                                  aria-label={`Mover “${nomeFilho}” para baixo`}
                                  disabled={k === filhos.length - 1 || moverDesabilitado}
                                  onClick={() => onMove(item.id, k, k + 1)}
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-40"
                                >
                                  <ArrowDown className="h-4 w-4" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  data-testid={`editar-${filho.id}`}
                                  aria-label={`Editar “${nomeFilho}”`}
                                  onClick={() => onEdit(filho.id)}
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                                >
                                  <Pencil className="h-4 w-4" aria-hidden />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              data-testid={`tirar-${filho.id}`}
                              aria-label={`Tirar “${nomeFilho}” do submenu`}
                              onClick={() => onRemoveChild(filho.id)}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  <div className="mt-2 flex flex-col items-start gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto min-h-11 max-w-full whitespace-normal text-left"
                      data-testid={`adicionar-ao-submenu-${item.id}`}
                      disabled={filhos.length >= MENU_SUBMENU_LIMIT}
                      onClick={() => onAddChild(item.id)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Adicionar ao submenu
                    </Button>
                    {filhos.length >= MENU_SUBMENU_LIMIT && (
                      <p data-testid={`submenu-cheio-${item.id}`} className="text-xs text-muted-foreground">
                        O submenu tem o máximo de {MENU_SUBMENU_LIMIT} itens.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default MenuTree
