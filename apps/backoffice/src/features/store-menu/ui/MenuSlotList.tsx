// A curadoria do menu de **uma** superfície: quem aparece, com que ícone, e em que ordem.
//
// Três coisas mudaram na feature 39, e cada uma consertava um defeito diferente:
//
// 1. **Não existe mais entrada fixa.** `FIXED_ENTRIES` declarava aqui dois itens do menu — "Crie o
//    Seu" (`/crie-seu-botton`) e "Sobre" — e os mostrava travados, na lista e na prévia. O primeiro
//    **nunca foi rota declarada**: caía na 404 da loja, e `routes.test.ts` já asseria isso do outro
//    lado. A tela onde a dona decide o menu mostrava, em dois lugares, um item que não existia. A
//    feature não corrigiu a lista — apagou o conceito: o "Sobre" virou item de LINK no banco, e a
//    Adri pode movê-lo, trocá-lo ou tirá-lo. `menuSemItemFixo.test.ts` recusa a volta.
// 2. **Não existe teto.** O contador dizia "4 de 4 vagas" e a tela RECUSAVA a quinta categoria. Era
//    número de código recusando curadoria da dona; hoje o contador diz "5 itens" e a barra da loja
//    rola quando não cabe. Nada aqui conta vaga.
// 3. **A pergunta tem duas respostas.** `show_in_menu` ligava o item nos dois dispositivos ao mesmo
//    tempo; uma coleção de nome longo que cabe em 1440 e estoura em 390 não tinha saída. O switch
//    desta lista mexe só na superfície corrente, e a linha AVISA quando a outra está diferente.
//
// **Esta lista não decide nada**: ela mostra o que `menuItems(input, surface)` devolve — a mesma
// função que desenha a barra do computador e a folha do celular —, mais as candidatas que ainda não
// entraram. Filtrar ou ordenar por conta própria seria o "defeito 01" nascendo de novo.

import { useEffect, useRef, type ReactNode } from 'react'
import { GripVertical, Link2, Plus } from 'lucide-react'
import { Switch } from '@estrelinha/ui/switch'
import { cn } from '@estrelinha/ui/lib/utils'
import { MENU_ICON_COMPONENTS } from '@estrelinha/ui/icons'
import {
  MENU_ICON_LABELS,
  bySortOrder,
  menuBannerSlots,
  menuIconKey,
  pathLabel,
  type MenuCategory,
  type MenuItem,
  type MenuLink,
  type MenuSurface,
} from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category'
import { NOME_DA_SUPERFICIE, outraSuperficie } from '../model/superficie'

const ligada = (category: MenuCategory, surface: MenuSurface): boolean =>
  surface === 'desktop' ? !!category.menu_desktop : !!category.menu_mobile

const linkLigado = (link: MenuLink, surface: MenuSurface): boolean =>
  surface === 'desktop' ? !!link.desktop : !!link.mobile

const plural = (quantidade: number, singular: string, plural_: string): string =>
  `${quantidade} ${quantidade === 1 ? singular : plural_}`

interface Linha {
  id: string
  kind: 'category' | 'link'
  name: string
  icon: string | null
  ligada: boolean
  /** A ordem em que a linha entra na fusão — a mesma de `byMenuOrder`. */
  sortOrder: number
  /** O que a linha diz debaixo do nome, já montado. */
  detalhe: string
  /** `null` quando a categoria está nas duas superfícies (ou fora das duas). */
  avisoCruzado: string | null
  inativa: boolean
  arrastavel: boolean
}

interface Props {
  surface: MenuSurface
  /**
   * O que a loja renderiza nesta superfície, **na ordem dela**.
   *
   * Vem de `menuItems`, e é o que faz esta tela mostrar a barra de verdade em vez de uma
   * aproximação: a contagem, a ordem e o papel (barra × painel) são os da loja.
   */
  items: MenuItem[]
  categories: AdminCategory[]
  links: MenuLink[]
  /** Qual entrada está selecionada — governa o editor de painel, o de banner e o de ícone. */
  activeId: string | null
  onSelect: (id: string) => void
  onToggleCategory: (id: string, next: boolean) => void
  onToggleLink: (id: string, next: boolean) => void
  onReorder: (draggedId: string, targetId: string) => void
  onAddLink: () => void
  onEditLink: (link: MenuLink) => void
  /**
   * O editor da entrada selecionada, para abrir **dentro da linha** dela (feature 48).
   *
   * Ele morava embaixo da lista, e com 38 entradas isso o punha a ~1.400px de rolagem do clique:
   * escolher outra categoria trocava o conteúdo de um card fora da vista, em silêncio. A lista o
   * recebe pronto e só decide ONDE ele entra — montá-lo aqui seria esta lista conhecer painel,
   * banner e ícone, que é o que `MenuEntryEditor` existe para saber.
   */
  editor?: ReactNode
}

const MenuSlotList = ({
  surface,
  items,
  categories,
  links,
  activeId,
  onSelect,
  onToggleCategory,
  onToggleLink,
  onReorder,
  onAddLink,
  onEditLink,
  editor,
}: Props) => {
  // Levar o painel aberto à vista quando a seleção muda (`FOCO-48`). `block: 'nearest'` rola só se
  // precisar — com a linha já visível não há pulo, e é por isso que abrir a tela (primeira entrada
  // selecionada por padrão) não arrasta ninguém para lugar nenhum.
  //
  // O `?.` do método não é zelo: **jsdom não implementa `scrollIntoView`**, e chamá-lo cru derruba
  // todo teste que renderiza esta lista — a feature morreria na suíte, não na tela.
  const painelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    painelRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  const pool = categories as unknown as MenuCategory[]
  const marcadas = new Set(pool.filter(c => ligada(c, surface)).map(c => c.id))

  const linhasDeCategoria: Linha[] = pool
    // Filha de uma categoria marcada **na mesma superfície** é item de painel, não entrada da barra
    // (`NAV-06`) — e o lugar dela é o editor de painel, logo abaixo. Repeti-la aqui daria dois
    // lugares para ligar a mesma coisa, e a dona não teria como saber qual deles vale.
    .filter(c => !(c.parent_id && marcadas.has(c.parent_id)))
    .map(c => {
      const dentro = marcadas.has(c.id)
      const filhas = pool.filter(f => f.parent_id === c.id)
      const noPainel = filhas.filter(f => marcadas.has(f.id)).length
      const banners = menuBannerSlots(c.menu_banners, surface).length
      const caminho = pathLabel(pool, c.id)
      const chave = menuIconKey(c.icon)

      const partes = dentro
        ? [
            filhas.length === 0 ? 'sem subcategoria' : plural(filhas.length, 'subcategoria', 'subcategorias'),
            `${noPainel} no painel`,
            banners === 0 ? 'sem banner' : plural(banners, 'banner', 'banners'),
          ]
        : [
            'fora do menu',
            chave ? MENU_ICON_LABELS[chave] : 'sem ícone escolhido',
          ]

      return {
        id: c.id,
        kind: 'category' as const,
        name: c.name,
        icon: c.icon ?? null,
        ligada: dentro,
        sortOrder: c.sort_order ?? 0,
        // O caminho na árvore entra quando ela tem pai: no banco real os universos são filhas de
        // outra categoria, e só o nome não diz o que está sendo posto no menu.
        detalhe: [caminho !== c.name ? caminho : null, ...partes].filter(Boolean).join(' · '),
        avisoCruzado:
          dentro !== ligada(c, outraSuperficie(surface))
            ? `desligada no ${NOME_DA_SUPERFICIE[dentro ? outraSuperficie(surface) : surface]}`
            : null,
        inativa: !c.active,
        // Arrastar reordena a `sort_order` da ÁRVORE, e ela vale também para a grade da home e o
        // rodapé — por isso só quem está na barra arrasta: mover o que está fora do menu mudaria
        // aquelas duas telas sem nada nesta dizer que mudou.
        arrastavel: dentro,
      }
    })

  const linhasDeLink: Linha[] = links.map(link => {
    const dentro = linkLigado(link, surface)
    return {
      id: link.id,
      kind: 'link' as const,
      name: link.label.trim() === '' ? '(sem nome)' : link.label,
      icon: link.icon ?? null,
      ligada: dentro,
      sortOrder: link.sort_order ?? 0,
      detalhe: `leva para ${link.href} · sem painel`,
      avisoCruzado:
        dentro !== linkLigado(link, outraSuperficie(surface))
          ? `desligado no ${NOME_DA_SUPERFICIE[dentro ? outraSuperficie(surface) : surface]}`
          : null,
      inativa: false,
      // Item de link não arrasta: a `sort_order` dele mora no jsonb, e um arraste que atravessasse a
      // fronteira categoria ⇄ link teria de gravar em duas fontes com significados diferentes.
      arrastavel: false,
    }
  })

  const linhas = [...linhasDeCategoria, ...linhasDeLink].sort((a, b) =>
    // O MESMO comparador da loja (`byMenuOrder` delega a este): a lista do painel e a barra do topo
    // não podem discordar de ordem, e o desempate por nome com locale `pt-BR` é o que torna as duas
    // reprodutíveis — `sort_order` nasce 0 para todo mundo, então empate é o caso comum.
    bySortOrder({ sort_order: a.sortOrder, name: a.name }, { sort_order: b.sortOrder, name: b.name }),
  )

  return (
    <div className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-bold text-foreground">
          {surface === 'desktop' ? 'Barra do topo · computador' : 'Menu do celular'}
        </h2>
        {/* Contagem é INFORMAÇÃO, nunca cota (`NAV-05`). "4 de 5 vagas" seria o teto de volta com
            outro nome — e o teto era o código recusando a curadoria da dona. */}
        <span
          data-testid="contador-itens"
          className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
        >
          {plural(items.length, 'item', 'itens')}
        </span>
      </header>

      <ul>
        {linhas.map(linha => {
          const chave = menuIconKey(linha.icon)
          const Icone = chave ? MENU_ICON_COMPONENTS[chave] : null

          return (
            /*
              **O separador é do `<li>`, não da linha** — e isso é conserto, não gosto (feature 48).
              Ele morava no `<div>` como `border-b border-border/60 last:border-0`, e o `<div>` era
              filho ÚNICO do `<li>`: `:last-child` casava sempre, e `.last\:border-0:last-child`
              (especificidade 0,2,0) anulava `.border-b` (0,1,0) em TODAS as linhas. A lista nunca
              teve separador, e o `last:` nunca separou o último de nada.
              Deixar como estava passaria a ser pior: com o painel dentro do `<li>`, só a linha
              selecionada deixaria de ser `:last-child` — ela ganharia um traço que as outras não
              têm, por acidente. No `<li>` a régua faz o que o nome dela diz, e o traço da entrada
              aberta cai DEPOIS do painel, que é o que fecha os dois como um bloco só.
            */
            <li
              key={`${linha.kind}-${linha.id}`}
              className="border-b border-border/60 last:border-0"
            >
              <div
                data-testid={`item-${linha.id}`}
                draggable={linha.arrastavel}
                onDragStart={
                  linha.arrastavel ? e => e.dataTransfer.setData('text/plain', linha.id) : undefined
                }
                onDragOver={linha.arrastavel ? e => e.preventDefault() : undefined}
                onDrop={
                  linha.arrastavel
                    ? e => {
                        e.preventDefault()
                        onReorder(e.dataTransfer.getData('text/plain'), linha.id)
                      }
                    : undefined
                }
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5',
                  activeId === linha.id ? 'bg-primary/5' : 'hover:bg-muted/30',
                )}
              >
                {/* As quatro vaias verticais do board têm largura FIXA, inclusive quando vazias:
                    sem isso a linha sem alça puxa o nome para a esquerda e a coluna deixa de formar
                    uma pista. */}
                <span className="flex w-3.5 shrink-0 justify-center">
                  {linha.arrastavel && (
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
                  )}
                </span>

                <button
                  type="button"
                  data-testid={`icone-${linha.id}`}
                  // A categoria escolhe o ícone na grade da coluna da direita, que edita a entrada
                  // SELECIONADA; o link escolhe dentro do próprio diálogo, porque ele não tem painel
                  // nem banner e abrir três cartões para um atalho seria desenhar o que não existe.
                  onClick={() =>
                    linha.kind === 'link'
                      ? onEditLink(links.find(l => l.id === linha.id)!)
                      : onSelect(linha.id)
                  }
                  aria-label={`Escolher o ícone de ${linha.name}`}
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border',
                    Icone ? 'border-border bg-muted/50' : 'border-dashed border-border bg-transparent',
                  )}
                >
                  {Icone ? (
                    <Icone className="h-[18px] w-[18px]" aria-hidden />
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    linha.kind === 'link'
                      ? onEditLink(links.find(l => l.id === linha.id)!)
                      : onSelect(linha.id)
                  }
                  className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                >
                  {/* **`max-w-full` nos dois, e é `items-start` quem obriga.** Com
                      `align-items: flex-start` num flex COLUNA, cada filho é dimensionado pelo
                      próprio conteúdo — não esticado —, então `truncate` nunca tem de quem cortar e
                      o texto sai pela direita. Medido em 390px: a linha tinha 384px dentro de uma
                      coluna de 342, e `main` (que é `overflow-auto`) ganhava rolagem horizontal.
                      O `min-w-0` do botão não resolve isto: ele dá piso zero ao BOTÃO, e quem estava
                      sem teto era o filho. */}
                  <span className="flex min-w-0 max-w-full items-center gap-1.5">
                    <span
                      className={cn(
                        'truncate text-sm',
                        linha.ligada ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
                      )}
                    >
                      {linha.name}
                    </span>
                    {linha.kind === 'link' && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Link
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate text-[11px] text-muted-foreground">
                    {linha.detalhe}
                    {linha.avisoCruzado && (
                      // O aviso NOMEIA o dispositivo (`NAV-02`): "desligada" sem dizer onde faria a
                      // dona abrir a outra aba para descobrir o que já está em tela.
                      <span data-testid={`aviso-${linha.id}`} className="text-estrelinha-admin-amber">
                        {' · '}
                        {linha.avisoCruzado}
                      </span>
                    )}
                  </span>
                </button>

                {linha.inativa && (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    inativa — não aparece na loja
                  </span>
                )}

                <span className="flex w-9 shrink-0 justify-end">
                  <Switch
                    checked={linha.ligada}
                    aria-label={`${linha.ligada ? 'Tirar' : 'Pôr'} ${linha.name} no menu do ${NOME_DA_SUPERFICIE[surface]}`}
                    onCheckedChange={next =>
                      // **Nenhuma recusa por contagem** (`NAV-03`): o 6º, o 10º e o 20º entram. Quem
                      // mostra o que acontece quando não cabe é a prévia, não um erro no clique.
                      linha.kind === 'link'
                        ? onToggleLink(linha.id, next)
                        : onToggleCategory(linha.id, next)
                    }
                  />
                </span>
              </div>

              {/* **O editor abre DENTRO da linha clicada** (feature 48, `FOCO-48`).
                  Ele é filho do mesmo `<li>`: não há como a lista crescer e afastá-lo do item que o
                  governa, porque a distância entre os dois é estrutural, não de layout.
                  A barra à esquerda é a única coisa que diz "este editor é daquela linha" — por isso
                  ela é `primary` e não `border`, e por isso o painel tem tom próprio.
                  Só categoria tem editor: item de link se edita no diálogo, e ele nem chega aqui
                  porque `onSelect` não é chamado por ele. */}
              {editor && linha.kind === 'category' && linha.id === activeId && (
                <div
                  ref={painelRef}
                  data-testid="painel-da-entrada"
                  className="border-t border-l-[3px] border-border border-l-primary bg-primary/[0.03]"
                >
                  {editor}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        data-testid="adicionar-link"
        onClick={onAddLink}
        className="flex w-full items-center gap-2.5 rounded-b-2xl border-t border-border bg-muted/20 px-4 py-2.5 text-left hover:bg-muted/40"
      >
        <span className="w-3.5 shrink-0" />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-primary/40">
          <Link2 className="h-3.5 w-3.5 text-primary" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-semibold text-primary">Adicionar um link</span>
          <span className="truncate text-[11px] text-muted-foreground">
            Uma página da loja no menu — “Sobre”, “Como enviar o material”, uma campanha
          </span>
        </span>
        <span className="w-9 shrink-0" />
      </button>
    </div>
  )
}

export default MenuSlotList
