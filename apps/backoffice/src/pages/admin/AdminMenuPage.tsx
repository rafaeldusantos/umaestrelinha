// A tela onde o menu da loja é decidido (feature 39 — reescrita da feature 16).
//
// O que ela era: uma lista de **quatro vagas** sobre `categories.show_in_menu`, com dois itens fixos
// escritos no próprio painel (um deles apontando para `/crie-seu-botton`, que **nunca foi rota** e
// caía na 404 da loja) e uma prévia da barra desenhada à mão em cima dos tokens do admin.
//
// O que ela é: a lista que `menuItems(input, surface)` devolve — a **mesma função** que desenha a
// barra do computador e a folha do celular —, mais os controles que a alimentam. Três consequências,
// e nenhuma é cosmética:
//
// 1. **Duas curadorias, não uma responsiva.** O alternador Computador/Celular troca ao mesmo tempo o
//    que se edita e o que se conta (`NAV-37`). A coluna gerada `show_in_menu` continua no banco para
//    a loja publicada não quebrar entre o `db push` e o deploy — e **nenhuma tela pode lê-la**.
// 2. **Sem teto e sem item fixo.** Nada aqui recusa por contagem, e nada aqui declara item de menu.
//    `menuSemTeto` e `menuSemItemFixo` recusam a volta dos dois.
// 3. **O painel não desenha o menu.** A prévia é a loja num iframe, como em `/admin/home`
//    (`previaUnica.test.ts`), e o dispositivo dela é a superfície em edição — o alternador do
//    cabeçalho governa lista, contagem, editores **e** prévia (`NAV-37`).

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  Menu as MenuIcon,
  Monitor,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  menuItems,
  type MenuBanners,
  type MenuCategory,
  type MenuIconKey,
  type MenuLink,
  type MenuSurface,
} from '@estrelinha/core/menu'
import { reorderWithinParent } from '@/features/category-list'
import {
  MenuEntryEditor,
  MenuLinkDialog,
  MenuLivePreview,
  MenuSlotList,
  NOME_DA_SUPERFICIE,
  useMenuLinks,
  type MenuLinkDraft,
} from '@/features/store-menu'
import { useAdminCategories } from '@/entities/category'
import { PageHeader, TableSkeleton } from '@/shared/ui'

/** A coluna que a superfície corrente liga. As duas são independentes de propósito (`AD-027`). */
const COLUNA: Record<MenuSurface, 'menu_desktop' | 'menu_mobile'> = {
  desktop: 'menu_desktop',
  mobile: 'menu_mobile',
}

/**
 * Falha de leitura é superfície EXPLÍCITA, não lista vazia (`NAV-41`).
 *
 * Foi engolir este erro que fez a tela de Coleções parecer "sem conteúdo" por meses, em cima de uma
 * tabela que nunca existiu. Aqui há **duas** leituras — as categorias e os itens de link —, e cada
 * uma pode falhar sozinha: uma faixa por fonte, dizendo qual delas não veio.
 */
const FaixaDeErro = ({
  testId,
  titulo,
  detalhe,
  onRetry,
}: {
  testId: string
  titulo: string
  detalhe: string
  onRetry: () => void
}) => (
  <div
    data-testid={testId}
    className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
  >
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-destructive">{titulo}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>
    </div>
    <Button variant="outline" size="sm" onClick={onRetry}>
      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar de novo
    </Button>
  </div>
)

const AdminMenuPage = () => {
  const { categories, loading, error, fetchCategories, updateCategory, updateSortOrders } =
    useAdminCategories()
  const {
    links,
    error: erroDeLinks,
    refetch: recarregarLinks,
    saveLink,
    removeLink,
    setLinkSurface,
  } = useMenuLinks()

  const [surface, setSurface] = useState<MenuSurface>('desktop')
  // A vista do celular (`FOCO-35`). Abre em `entradas` porque é onde se edita: a prévia é para
  // conferir o que já se decidiu.
  const [vista, setVista] = useState<'entradas' | 'previa'>('entradas')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [linkEmEdicao, setLinkEmEdicao] = useState<MenuLink | null>(null)
  const [dialogoAberto, setDialogoAberto] = useState(false)

  const pool = categories as unknown as MenuCategory[]
  // **A única porta.** A tela não filtra, não ordena e não trunca: o que ela mostra é o que a loja
  // renderiza nesta superfície, pela mesma função. Recalcular aqui seria o "defeito 01" nascendo
  // dentro da tela que existe para acabar com ele.
  const items = useMemo(() => menuItems({ categories: pool, links }, surface), [pool, links, surface])

  const primeiraEntrada = items.find(i => i.kind === 'category')?.id ?? null
  const selectedId = activeId ?? primeiraEntrada
  const host = categories.find(c => c.id === selectedId) ?? null

  // Trocar de dispositivo pode deixar a seleção apontando para uma entrada que não está mais na
  // barra. Voltar para a primeira é o que impede a coluna da direita de editar o painel de algo que
  // esta superfície não mostra.
  useEffect(() => {
    setActiveId(null)
  }, [surface])

  const avisar = (titulo: string, motivo: string) =>
    toast({ title: titulo, description: motivo, variant: 'destructive' })

  const gravarCategoria = async (id: string, mudanca: Record<string, unknown>, oQue: string) => {
    setSalvando(true)
    const falha = await updateCategory(id, mudanca)
    setSalvando(false)
    // `NAV-42` — a falha DIZ o que não salvou, e `updateCategory` só refaz a leitura quando deu
    // certo: o estado da tela volta a ser o do banco em vez de mostrar o que a dona tentou.
    if (falha) avisar(`Não foi possível salvar ${oQue}`, falha.message)
  }

  const handleToggleCategory = (id: string, next: boolean) =>
    // **Sem recusa por contagem** (`NAV-03`): o 6º, o 10º e o 20º entram. E só a coluna da
    // superfície corrente muda — ligar no computador não liga no celular.
    gravarCategoria(id, { [COLUNA[surface]]: next }, 'a entrada do menu')

  const handleToggleChild = (id: string, next: boolean) =>
    // É a MESMA coluna da entrada da barra: o papel (barra × painel) é derivado da árvore por
    // `menuItems` (`NAV-06`), nunca gravado.
    gravarCategoria(id, { [COLUNA[surface]]: next }, 'a subcategoria do painel')

  const handleIcon = (icon: MenuIconKey | null) => {
    if (!host) return
    return gravarCategoria(host.id, { icon }, 'o ícone')
  }

  const handleBanners = async (banners: MenuBanners): Promise<string | null> => {
    if (!host) return 'Escolha uma entrada do menu antes de configurar os banners.'
    setSalvando(true)
    const falha = await updateCategory(host.id, { menu_banners: banners })
    setSalvando(false)
    return falha ? falha.message : null
  }

  const handleToggleLink = async (id: string, next: boolean) => {
    setSalvando(true)
    const falha = await setLinkSurface(id, surface, next)
    setSalvando(false)
    if (falha) avisar('Não foi possível salvar o item de link', falha)
  }

  const handleReorder = async (draggedId: string, targetId: string) => {
    // `reorderWithinParent` devolve **só as linhas que mudaram de posição** e `null` quando origem e
    // destino têm pais diferentes — mudar de pai é a tela de Categorias, não efeito colateral de
    // soltar a linha aqui (`NAV-39`).
    const moves = reorderWithinParent(categories, draggedId, targetId)
    if (!moves) {
      avisar(
        'Não dá para reordenar entre ramos',
        'As duas categorias têm pais diferentes. Mova uma delas na tela de Categorias.',
      )
      return
    }
    if (moves.length === 0) return

    setSalvando(true)
    const falha = await updateSortOrders(moves)
    setSalvando(false)
    if (falha) {
      avisar('Não foi possível reordenar', falha.message)
      return
    }
    // `NAV-38` — o alcance é dito depois de gravar, e não escondido num rodapé: a `sort_order` é a
    // da ÁRVORE, e ela ordena também a grade da home e o rodapé da loja.
    toast({
      title: 'Ordem atualizada',
      description:
        'Esta é a ordem das categorias: ela vale também para a grade da home e o rodapé da loja.',
    })
  }

  const handleSaveLink = async (draft: MenuLinkDraft): Promise<string | null> => {
    setSalvando(true)
    const falha = await saveLink(draft)
    setSalvando(false)
    return falha
  }

  const handleRemoveLink = async (id: string): Promise<string | null> => {
    setSalvando(true)
    const falha = await removeLink(id)
    setSalvando(false)
    return falha
  }

  return (
    /*
      O molde de altura da Home, atualizado junto (`FOCO-13`) — altura cheia + coluna de 560 (2026-09-13, sem spec).

      O `11rem` que morava na grade era **suposição de altura de cabeçalho** — o próprio comentário
      abaixo registrava isso como dívida. Agora a altura é da raiz e vale `3rem`, que é o `p-6` do
      `<main>` do `AdminLayout` e nada mais. O `PageHeader` desta tela tem o subtítulo mais longo
      do painel: com `flex-1` na grade, um subtítulo que embrulhe encolhe o corpo em vez de empurrar
      a prévia para fora da janela.
    */
    <div className="lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col">
      <PageHeader
        className="shrink-0"
        title="Menu da loja"
        subtitle="Quem ocupa a barra, com que ícone, o que abre no painel e qual banner aparece — separado por dispositivo."
        icon={MenuIcon}
        actions={
          <>
            {/* `FOCO-33` — o aviso de gravação fica ONDE SE CLICA. Ele morava no fim do documento,
                depois de três editores: com o corpo rolando, ligar uma categoria no topo da lista
                dava um segundo de silêncio e nenhuma confirmação à vista.
                Sem espaço reservado (`FOCO-34`): o selo entra e sai, e os vizinhos não se mexem
                porque ele está no fim da fila de ações, não entre elas. */}
            {salvando && (
              <span
                data-testid="salvando"
                role="status"
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Salvando…
              </span>
            )}
            <div
              role="group"
              aria-label="Dispositivo do menu"
              className="flex gap-0.5 rounded-xl bg-muted p-0.5"
            >
              {(
                [
                  ['desktop', 'Computador', Monitor],
                  ['mobile', 'Celular', Smartphone],
                ] as const
              ).map(([valor, rotulo, Icone]) => (
                <button
                  key={valor}
                  type="button"
                  data-testid={`superficie-${valor}`}
                  aria-pressed={surface === valor}
                  onClick={() => setSurface(valor)}
                  className={cn(
                    'flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-xs font-semibold',
                    surface === valor
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icone className="h-3.5 w-3.5" aria-hidden />
                  {rotulo}
                </button>
              ))}
            </div>
            <Button variant="outline" asChild>
              <a href="/" target="_blank" rel="noreferrer">
                Ver na loja <ExternalLink className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
          </>
        }
      />

      {error && (
        <FaixaDeErro
          testId="menu-erro"
          titulo="Não foi possível carregar as categorias"
          detalhe={error}
          onRetry={fetchCategories}
        />
      )}

      {erroDeLinks && (
        <FaixaDeErro
          testId="menu-erro-links"
          titulo="Não foi possível carregar os itens de link"
          detalhe={erroDeLinks}
          onRetry={recarregarLinks}
        />
      )}

      {loading ? (
        <TableSkeleton />
      ) : (
        /* Feature 47 — `FOCO-35`..`FOCO-37`. Abaixo de `lg` a tela ALTERNA entre a lista e a prévia,
           como `/admin/home` faz desde a feature 24: sem isso, conferir o menu pelo telefone pedia
           rolar por três editores até achar o palco.

           **A forma é outra de propósito** (`FOCO-37`): aqui o alternador de vista nasce logo abaixo
           de uma pílula segmentada (Computador/Celular), e dois controles de forma idêntica
           empilhados leem como o mesmo controle duplicado. Um diz *o que estou editando*, o outro
           *o que estou vendo* — a pílula fica com o primeiro, a barra sublinhada com o segundo. */
        <>
        <div
          data-testid="abas-vista"
          role="tablist"
          aria-label="O que mostrar"
          className="mb-4 flex gap-4 border-b border-border lg:hidden"
        >
          {(
            [
              ['entradas', 'Entradas'],
              ['previa', 'Prévia'],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              data-testid={`vista-${valor}`}
              aria-selected={vista === valor}
              onClick={() => setVista(valor)}
              className={cn(
                'min-h-11 border-b-2 px-1 text-sm font-semibold transition-colors',
                vista === valor
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {/* **O molde literal de `/admin/home`**: altura de tela no corpo, a coluna da esquerda
            rolando dentro de si, e o palco parado ao lado. Sem isso a prévia rolava junto com os
            editores e saía da vista justamente enquanto se edita olhando para ela.
            A altura mora na RAIZ, e aqui a grade só toma o que sobra
            (`lg:flex-1`) — o desconto deixou de ser chute de cabeçalho.
            A largura também é a da Home: **560**. Nesta tela ela paga a dívida que a `47` deixou
            registrada — a grade do `MenuIconPicker` tem célula FIXA de 100px, e numa coluna de 440
            (menos o padding do card) sobravam três por fileira. "Mesmo molde" quer dizer o mesmo
            número: dois valores aqui e ali é o defeito 01 aplicado a layout, e é o que
            `AdminMenuPage.test.tsx` recusa lendo as duas páginas do disco. */}
        <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[560px_minmax(0,1fr)]">
          <div
            data-testid="coluna-entradas"
            className={cn(
              'flex min-h-0 min-w-0 flex-col gap-6 lg:overflow-y-auto',
              vista !== 'entradas' && 'hidden lg:flex',
            )}
          >
            <MenuSlotList
              surface={surface}
              items={items}
              categories={categories}
              links={links}
              activeId={selectedId}
              onSelect={setActiveId}
              onToggleCategory={handleToggleCategory}
              onToggleLink={handleToggleLink}
              onReorder={handleReorder}
              onAddLink={() => {
                setLinkEmEdicao(null)
                setDialogoAberto(true)
              }}
              onEditLink={link => {
                setLinkEmEdicao(link)
                setDialogoAberto(true)
              }}
              /* `FOCO-28` — os três editores da entrada num card com abas, na MESMA coluna. Antes o
                 seletor de ícone morava na coluna da direita, debaixo da prévia: configurar uma
                 categoria pedia olhar para as duas colunas ao mesmo tempo.
                 **Desde a feature 48 ele não fica mais ABAIXO da lista, e sim dentro da linha
                 selecionada** (`FOCO-48`): com 38 entradas, "abaixo da lista" eram ~1.400px de
                 rolagem, e trocar de categoria mudava um card fora da vista sem nada avisar.
                 A página continua montando o editor — quem decide ONDE ele entra é a lista. */
              editor={
                host && (
                  <MenuEntryEditor
                    surface={surface}
                    host={host}
                    categories={categories}
                    onToggleChild={handleToggleChild}
                    onSaveBanners={handleBanners}
                    onIcon={handleIcon}
                  />
                )
              }
            />

            {/* O vazio é da CURADORIA, não da seleção (`FOCO-49`). A condição deixou de ser
                `!host`: com o editor dentro da lista, `host` nulo por um instante de leitura não
                pode acender um aviso que manda a dona ligar uma categoria. Quem responde "não há o
                que editar" é a ausência de entrada de categoria na barra. */}
            {!items.some(i => i.kind === 'category') && (
              <div
                data-testid="sem-entrada-selecionada"
                className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
              >
                Ligue uma categoria no menu do {NOME_DA_SUPERFICIE[surface]} para configurar o painel
                e os banners dela.
              </div>
            )}
          </div>

          <div
            data-testid="coluna-previa-menu"
            className={cn(
              'flex min-h-0 min-w-0 flex-col gap-6',
              vista !== 'previa' && 'hidden lg:flex',
            )}
          >
            {/* A prévia é **a loja**, num iframe — não um desenho deste painel (`NAV-43`). O
                dispositivo dela é a superfície em edição: o alternador do cabeçalho governa os dois
                (`NAV-37`). `previaUnica.test.ts` recusa a volta de qualquer segundo desenho. */}
            <MenuLivePreview
              surface={surface}
              categories={pool}
              links={links}
              openId={selectedId}
            />
          </div>
        </div>
        </>
      )}

      <MenuLinkDialog
        open={dialogoAberto}
        onOpenChange={setDialogoAberto}
        link={linkEmEdicao}
        onSave={handleSaveLink}
        onRemove={handleRemoveLink}
      />

    </div>
  )
}

export default AdminMenuPage
