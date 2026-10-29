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
  ChevronRight,
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
  DropdownMenuSeparator,
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
import { BOTAO_CONTORNO, BOTAO_CTA, BOTAO_FANTASMA, ITEM_DE_ACAO, ITEM_DE_ACAO_PERIGO } from './estilos'

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

/** Os três tons de selo do protótipo: `.tag.warn` (inativa), `.tag.err` (apagada), `.tag.mute` (fora). */
const TOM_DO_SELO = {
  aviso: 'bg-estrelinha-admin-amber/10 text-estrelinha-admin-amber',
  erro: 'bg-destructive/10 text-destructive',
  neutro: 'bg-estrelinha-admin-elevated text-estrelinha-admin-text-secondary',
} as const

const TOM_POR_ESTADO: Record<Exclude<MenuNodeState, 'ok'>, keyof typeof TOM_DO_SELO> = {
  inactive: 'aviso',
  deleted: 'erro',
}

const Selo = ({ texto, testId, tom }: { texto: string; testId: string; tom: keyof typeof TOM_DO_SELO }) => (
  <span
    data-testid={testId}
    className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', TOM_DO_SELO[tom])}
  >
    {texto}
  </span>
)

/** O botão de ícone das linhas (`.ib` do protótipo): 44 × 44, hover em lilás claro. */
const BOTAO_ICONE =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-estrelinha-admin-text-secondary hover:bg-estrelinha-admin-elevated'

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
  // `.dev` do protótipo: as duas chaves emendadas num grupo de borda única.
  <div
    role="group"
    aria-label={`Onde “${nome}” aparece`}
    className="flex shrink-0 divide-x divide-estrelinha-admin-border overflow-hidden rounded-[10px] border border-estrelinha-admin-border"
  >
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
          'min-h-11 min-w-11 px-2.5 text-xs font-semibold transition-colors motion-reduce:transition-none',
          node[surface]
            ? 'bg-estrelinha-admin-violet/10 text-estrelinha-admin-violet'
            : 'bg-estrelinha-admin-card text-estrelinha-admin-muted hover:bg-estrelinha-admin-elevated',
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
        className="flex flex-col items-center gap-3 rounded-2xl border border-estrelinha-admin-border bg-estrelinha-admin-card px-5 py-10 text-center"
      >
        <h2 className="font-heading text-base font-bold text-estrelinha-admin-text">O menu está vazio</h2>
        <p className="max-w-sm text-xs text-estrelinha-admin-muted">
          Acrescente as categorias e as páginas que a cliente vê na barra do topo. Cada item pode ter
          um submenu.
        </p>
        <Button
          type="button"
          className={cn('h-auto min-h-11 max-w-full whitespace-normal', BOTAO_CTA)}
          data-testid="adicionar-primeiro"
          onClick={onAdd}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Adicionar item ao menu
        </Button>
      </section>
    )
  }

  const ultimo = document.items.length - 1

  return (
    <section
      data-testid="arvore-do-menu"
      className="rounded-2xl border border-estrelinha-admin-border bg-estrelinha-admin-card"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-estrelinha-admin-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-bold text-estrelinha-admin-text">Itens do menu principal</h2>
          <p data-testid="contador-itens" className="mt-0.5 text-xs text-estrelinha-admin-muted">
            {contagem.desktop} no computador · {contagem.mobile} no celular · arraste pela alça para
            reordenar
          </p>
        </div>
        <Button
          type="button"
          // Q06: o `Button` é `whitespace-nowrap`; com a fonte a 200 % o rótulo passava da tela.
          className={cn('h-auto min-h-11 max-w-full whitespace-normal', BOTAO_CTA)}
          data-testid="adicionar-item"
          onClick={onAdd}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Adicionar item
        </Button>
      </header>

      {/* Cada item é um cartão próprio (`.item` do protótipo), não uma linha de tabela. */}
      <ul className="flex flex-col gap-1.5 p-2">
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
            <li
              key={item.id}
              data-testid={`item-${item.id}`}
              className="rounded-[14px] border border-estrelinha-admin-border bg-estrelinha-admin-card"
              {...arrastavel('raiz', indice)}
            >
              {/* `flex-wrap` + a base de 10rem do nome: em 390 os controles descem para uma segunda linha
                  em vez de espremer o nome a 29px ("Joi…"), medido na prova da 86. */}
              <div
                data-testid={`linha-${item.id}`}
                className={cn('flex min-w-0 flex-wrap items-center gap-2 px-2 py-2 sm:px-3', fora && 'opacity-60')}
              >
                <span
                  aria-hidden
                  title="Arrastar para reordenar"
                  className="flex h-11 w-6 shrink-0 cursor-grab items-center justify-center text-estrelinha-admin-muted"
                >
                  <GripVertical className="h-4 w-4" />
                </span>
                {/* `.ico` do protótipo: violeta claro com o desenho; sem ícone, o tracejado "sem". */}
                <span
                  data-testid={`icone-${item.id}`}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    Icone
                      ? 'bg-estrelinha-admin-violet/10 text-estrelinha-admin-violet'
                      : 'border border-dashed border-input bg-estrelinha-admin-bg text-[10.5px] font-medium text-estrelinha-admin-muted',
                  )}
                >
                  {Icone ? <Icone className="h-5 w-5" aria-hidden /> : 'sem'}
                </span>

                <button
                  type="button"
                  className="flex min-h-11 min-w-0 flex-1 basis-40 flex-col items-start text-left"
                  onClick={() => onSelect?.(item.id)}
                >
                  <span className="flex max-w-full flex-wrap items-center gap-1.5">
                    <span className="min-w-0 break-words text-sm font-semibold text-estrelinha-admin-text">{nome}</span>
                    {estado !== 'ok' && (
                      <Selo testId={`selo-${item.id}`} texto={SELO[estado]} tom={TOM_POR_ESTADO[estado]} />
                    )}
                    {fora && estado === 'ok' && <Selo testId={`selo-${item.id}`} texto="Fora do menu" tom="neutro" />}
                  </span>
                  <span
                    data-testid={`meta-${item.id}`}
                    className="mt-0.5 max-w-full break-words text-xs text-estrelinha-admin-muted"
                  >
                    {/* O tipo é um selo (`.kind`); o " · " invisível mantém a frase inteira para o
                        leitor de tela e para quem copia o texto. */}
                    <span className="mr-1.5 rounded-md bg-estrelinha-admin-elevated px-1.5 py-px text-[11px] font-semibold text-estrelinha-admin-text-secondary">
                      {item.target.kind === 'category' ? 'Categoria' : 'Link'}
                    </span>
                    <span className="sr-only"> · </span>
                    {destinoDe(item, categories)} ·{' '}
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
                    className={BOTAO_ICONE}
                  >
                    <ChevronRight
                      aria-hidden
                      className={cn('h-4 w-4 transition-transform motion-reduce:transition-none', aberto && 'rotate-90')}
                    />
                  </button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger
                    data-testid={`acoes-${item.id}`}
                    aria-label={`Ações de “${nome}”`}
                    className={BOTAO_ICONE}
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-[220px] rounded-xl border-estrelinha-admin-border p-1.5 shadow-lg"
                  >
                    {!apagado && (
                      <>
                        <DropdownMenuItem data-testid={`editar-${item.id}`} className={ITEM_DE_ACAO} onSelect={() => onEdit(item.id)}>
                          Editar nome, ícone e banners
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          data-testid={`subir-${item.id}`}
                          className={ITEM_DE_ACAO}
                          disabled={indice === 0 || moverDesabilitado}
                          onSelect={() => onMove(null, indice, indice - 1)}
                        >
                          Mover para cima
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          data-testid={`descer-${item.id}`}
                          className={ITEM_DE_ACAO}
                          disabled={indice === ultimo || moverDesabilitado}
                          onSelect={() => onMove(null, indice, indice + 1)}
                        >
                          Mover para baixo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-estrelinha-admin-border" />
                      </>
                    )}
                    <DropdownMenuItem
                      data-testid={`remover-${item.id}`}
                      className={ITEM_DE_ACAO_PERIGO}
                      onSelect={() => onRemoveRoot(item.id)}
                    >
                      Remover do menu
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>

              {aberto && (
                <div
                  data-testid={`submenu-${item.id}`}
                  className="rounded-b-[14px] border-t border-estrelinha-admin-border bg-estrelinha-admin-bg px-2 py-3 sm:pl-11 sm:pr-2.5"
                >
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="text-xs text-estrelinha-admin-muted">
                      Submenu — abre no mega menu do computador e na lista do celular
                    </p>
                    <span
                      data-testid={`contador-submenu-${item.id}`}
                      className="text-xs tabular-nums text-estrelinha-admin-muted"
                    >
                      {filhos.length}/{MENU_SUBMENU_LIMIT}
                    </span>
                  </div>

                  {filhos.length === 0 ? (
                    <p
                      data-testid={`submenu-vazio-${item.id}`}
                      className="rounded-[10px] border-[1.5px] border-dashed border-input bg-estrelinha-admin-card p-3 text-center text-xs text-estrelinha-admin-muted"
                    >
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
                              'flex min-w-0 flex-wrap items-center gap-1.5 rounded-[10px] border border-estrelinha-admin-border bg-estrelinha-admin-card py-0.5 pl-0.5 pr-1',
                              foraFilho && 'opacity-60',
                            )}
                          >
                            <span aria-hidden className="flex h-11 w-6 shrink-0 cursor-grab items-center justify-center text-estrelinha-admin-muted">
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <span data-testid={`nome-${filho.id}`} className="flex min-w-0 flex-1 basis-28 flex-col">
                              <span className="flex max-w-full flex-wrap items-center gap-1.5">
                                <span className="min-w-0 break-words text-[13.5px] font-medium text-estrelinha-admin-text">{nomeFilho}</span>
                                {estadoFilho !== 'ok' && (
                                  <Selo
                                    testId={`selo-${filho.id}`}
                                    texto={SELO[estadoFilho]}
                                    tom={TOM_POR_ESTADO[estadoFilho]}
                                  />
                                )}
                              </span>
                              <span className="max-w-full break-words text-[11.5px] text-estrelinha-admin-muted">
                                {filho.target.kind === 'link' ? 'Link · ' : ''}
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
                                  className={cn(BOTAO_ICONE, 'disabled:opacity-30 disabled:hover:bg-transparent')}
                                >
                                  <ArrowUp className="h-4 w-4" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  data-testid={`descer-${filho.id}`}
                                  aria-label={`Mover “${nomeFilho}” para baixo`}
                                  disabled={k === filhos.length - 1 || moverDesabilitado}
                                  onClick={() => onMove(item.id, k, k + 1)}
                                  className={cn(BOTAO_ICONE, 'disabled:opacity-30 disabled:hover:bg-transparent')}
                                >
                                  <ArrowDown className="h-4 w-4" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  data-testid={`editar-${filho.id}`}
                                  aria-label={`Editar “${nomeFilho}”`}
                                  onClick={() => onEdit(filho.id)}
                                  className={BOTAO_ICONE}
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
                              className={BOTAO_ICONE}
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
                      className={cn('h-auto min-h-11 max-w-full whitespace-normal text-left', BOTAO_FANTASMA)}
                      data-testid={`adicionar-ao-submenu-${item.id}`}
                      disabled={filhos.length >= MENU_SUBMENU_LIMIT}
                      onClick={() => onAddChild(item.id)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Adicionar ao submenu
                    </Button>
                    {filhos.length >= MENU_SUBMENU_LIMIT && (
                      <p data-testid={`submenu-cheio-${item.id}`} className="text-xs text-estrelinha-admin-muted">
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

      {/* `.foot` do protótipo: o mesmo "Adicionar" no fim da lista, onde o olho termina. */}
      <div className="px-2 pb-3 sm:px-4 sm:pb-4">
        <Button
          type="button"
          variant="outline"
          className={cn('h-auto min-h-11 w-full max-w-full whitespace-normal', BOTAO_CONTORNO)}
          data-testid="adicionar-item-rodape"
          onClick={onAdd}
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Adicionar item ao menu
        </Button>
      </div>
    </section>
  )
}

export default MenuTree
