// A tela onde o menu da loja é decidido (feature 16).
//
// Existe porque a barra do topo tinha 4 lugares e o banco tem N categorias, e o código escolhia com
// `.slice(0, 4)` de uma lista chapada. Com a árvore real — `Bottons › {Academia, Anime, K-Pop, …}` —
// isso punha na barra o contêiner de tudo e uma subcategoria que empatou em `sort_order`.
//
// **Não é um construtor de menu.** É uma VISÃO sobre `public.categories`: cada linha aqui é a mesma
// linha que a tela de Categorias edita, e o que se grava são duas colunas dela (`show_in_menu`,
// `menu_promo`) mais a `sort_order` que já existia. Uma tabela `menu_items` própria seria uma segunda
// árvore ao lado da que já existe, e as duas divergiriam no primeiro rename.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ExternalLink, Menu as MenuIcon, RefreshCw } from 'lucide-react'
import { Button } from '@nanapin/ui/button'
import { toast } from '@nanapin/ui/hooks/use-toast'
import { menuEntries, type MenuCategory } from '@nanapin/core/menu'
import { reorderWithinParent } from '@/features/category-list'
import { MenuBarPreview, MenuPromoEditor, MenuSlotList } from '@/features/store-menu'
import { useAdminCategories } from '@/entities/category'
import { PageHeader, TableSkeleton } from '@/shared/ui'
import type { MenuPromo } from '@nanapin/supabase/types'

const AdminMenuPage = () => {
  const { categories, loading, error, fetchCategories, updateCategory, updateSortOrders } =
    useAdminCategories()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const pool = categories as unknown as MenuCategory[]
  const entries = useMemo(() => menuEntries(pool), [pool])

  // A primeira entrada do menu é a seleção padrão: abrir a tela num painel vazio esconde metade do
  // que ela faz.
  const selectedId = activeId ?? entries[0]?.id ?? null
  const host = categories.find(c => c.id === selectedId) ?? null

  const handleToggle = async (id: string, next: boolean, refusal: string | null) => {
    if (refusal) {
      // A recusa vem do domínio (`canEnterMenu`) e chega até aqui como texto — a tela não recalcula
      // a regra, só a comunica.
      toast({ title: 'Sem vaga na barra', description: refusal, variant: 'destructive' })
      return
    }
    setSaving(true)
    const err = await updateCategory(id, { show_in_menu: next })
    setSaving(false)
    if (err) toast({ title: 'Não foi possível salvar', description: err.message, variant: 'destructive' })
  }

  const handleReorder = async (draggedId: string, targetId: string) => {
    // `reorderWithinParent` devolve **só as linhas que mudaram de posição** e `null` quando origem e
    // destino têm pais diferentes — mudar de pai é a tela de Categorias, não efeito colateral de
    // soltar a linha aqui.
    const moves = reorderWithinParent(categories, draggedId, targetId)
    if (!moves) {
      toast({
        title: 'Não dá para reordenar entre ramos',
        description: 'As duas categorias têm pais diferentes. Mova uma delas na tela de Categorias.',
        variant: 'destructive',
      })
      return
    }
    if (moves.length === 0) return
    setSaving(true)
    const err = await updateSortOrders(moves)
    setSaving(false)
    if (err) toast({ title: 'Não foi possível reordenar', description: err.message, variant: 'destructive' })
  }

  const handlePromo = async (promo: MenuPromo | null) => {
    if (!host) return
    // Card ligado sem destino escolhido não vai para o banco: gravaria um jsonb que a loja
    // descartaria na leitura, e o admin veria "salvo" sem card nenhum aparecer.
    if (promo !== null && !promo.category_id) {
      toast({
        title: 'Escolha a coleção de destino',
        description: 'O card sempre leva a uma coleção — sem destino ele não aparece na loja.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    const err = await updateCategory(host.id, { menu_promo: promo })
    setSaving(false)
    if (err) toast({ title: 'Não foi possível salvar o card', description: err.message, variant: 'destructive' })
  }

  return (
    <div>
      <PageHeader
        title="Menu da loja"
        subtitle="Quem ocupa a barra do topo, em que ordem, e o card promocional de cada painel."
        icon={MenuIcon}
        actions={
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              Ver na loja <ExternalLink className="ml-1.5 h-4 w-4" />
            </a>
          </Button>
        }
      />

      {/* Falha de leitura é superfície EXPLÍCITA, não lista vazia. Foi engolir este erro que fez a
          tela de Coleções parecer "sem conteúdo" por meses, em cima de uma tabela inexistente. */}
      {error && (
        <div
          data-testid="menu-erro"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-destructive">
              Não foi possível carregar as categorias
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchCategories}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar de novo
          </Button>
        </div>
      )}

      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-6">
            <MenuSlotList
              categories={categories}
              activeId={selectedId}
              onSelect={setActiveId}
              onToggle={handleToggle}
              onReorder={handleReorder}
            />
            <MenuBarPreview entries={entries} />
          </div>

          <div className="flex flex-col gap-6">
            {host ? (
              <>
                <div className="rounded-2xl border border-border bg-card">
                  <header className="border-b border-border px-4 py-3">
                    <h2 className="font-heading text-sm font-bold text-foreground">
                      Painel de “{host.name}”
                    </h2>
                  </header>
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Subcategorias
                      </span>
                      {/* Leitura, com link para quem edita. Editar a árvore em duas telas é o
                          mesmo defeito que esta feature está evitando. */}
                      <Link
                        to="/admin/categorias"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Editar em Categorias →
                      </Link>
                    </div>
                    <p className="text-sm text-foreground">
                      {entries.find(e => e.id === host.id)?.children.length
                        ? entries
                            .find(e => e.id === host.id)!
                            .children.map(c => c.name)
                            .join(' · ')
                        : 'Nenhuma — no menu esta entrada é um link direto, sem painel.'}
                    </p>
                  </div>
                </div>

                <MenuPromoEditor host={host} categories={categories} onChange={handlePromo} />
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Ligue uma categoria no menu para configurar o painel dela.
              </div>
            )}
          </div>
        </div>
      )}

      {saving && <p className="mt-4 text-xs text-muted-foreground">Salvando…</p>}
    </div>
  )
}

export default AdminMenuPage
