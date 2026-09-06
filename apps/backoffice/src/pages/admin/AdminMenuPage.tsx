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
  MenuBannerEditor,
  MenuIconPicker,
  MenuLinkDialog,
  MenuLivePreview,
  MenuPanelEditor,
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
    <div>
      <PageHeader
        title="Menu da loja"
        subtitle="Quem ocupa a barra, com que ícone, o que abre no painel e qual banner aparece — separado por dispositivo."
        icon={MenuIcon}
        actions={
          <>
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
        <div className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
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
            />

            {host ? (
              <>
                <MenuPanelEditor
                  surface={surface}
                  host={host}
                  categories={categories}
                  onToggleChild={handleToggleChild}
                />
                <MenuBannerEditor
                  surface={surface}
                  host={host}
                  categories={categories}
                  onSave={handleBanners}
                />
              </>
            ) : (
              <div
                data-testid="sem-entrada-selecionada"
                className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
              >
                Ligue uma categoria no menu do {NOME_DA_SUPERFICIE[surface]} para configurar o painel
                e os banners dela.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {/* A prévia é **a loja**, num iframe — não um desenho deste painel (`NAV-43`). O
                dispositivo dela é a superfície em edição: o alternador do cabeçalho governa os dois
                (`NAV-37`). `previaUnica.test.ts` recusa a volta de qualquer segundo desenho. */}
            <MenuLivePreview
              surface={surface}
              categories={pool}
              links={links}
              openId={selectedId}
            />

            {host && (
              <MenuIconPicker itemName={host.name} value={host.icon ?? null} onChange={handleIcon} />
            )}
          </div>
        </div>
      )}

      <MenuLinkDialog
        open={dialogoAberto}
        onOpenChange={setDialogoAberto}
        link={linkEmEdicao}
        onSave={handleSaveLink}
        onRemove={handleRemoveLink}
      />

      {salvando && <p className="mt-4 text-xs text-muted-foreground">Salvando…</p>}
    </div>
  )
}

export default AdminMenuPage
