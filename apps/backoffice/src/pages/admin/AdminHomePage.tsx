// A tela onde a composição da Home é decidida (feature 24).
//
// A Home já era dinâmica — as fileiras saem de `categories` por `sort_order`, a grade de banners de
// quem tem `banner_url`, os números da faixa de vantagens de `store_settings`. O que ainda estava
// cravado no `.tsx` era a **composição**: quais seções existem, em que ordem, com que texto e com
// que limite. É isso que esta tela edita.
//
// Duas colunas no desktop e **duas abas em 390px**: lista e prévia não cabem lado a lado num
// celular, e espremê-las daria duas colunas ilegíveis em vez de uma legível. ~90% dos acessos da
// LOJA vêm do celular; o painel é usado nos dois, e a dona confere a vitrine com o telefone na mão.

import { useState } from 'react'
import { AlertTriangle, ExternalLink, House, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import type { HomeSectionType } from '@estrelinha/core/home'
import { useAdminCategories } from '@/entities/category'
import { useAdminHomeSections } from '@/entities/home'
import {
  HomeBlockTray,
  HomePreview,
  HomeSectionList,
  useAdminResolvedHome,
} from '@/features/home-composition'
import { PageHeader, TableSkeleton } from '@/shared/ui'

type Aba = 'secoes' | 'previa'

const AdminHomePage = () => {
  const {
    sections,
    loading,
    error,
    fetchSections,
    createSection,
    setSectionActive,
    reorderSectionsTo,
  } = useAdminHomeSections()
  const { categories, loading: loadingCategorias } = useAdminCategories()

  const [aba, setAba] = useState<Aba>('secoes')
  // Clicar numa linha contorna o bloco correspondente na prévia. É a metade do gesto que a T30
  // completa: lá o clique abre o editor na coluna da esquerda, e o contorno continua sendo o que
  // liga as duas colunas.
  const [selecionada, setSelecionada] = useState<string | null>(null)

  const resolved = useAdminResolvedHome(sections, categories)

  const avisar = (titulo: string, erro: { message: string } | null) => {
    if (erro) toast({ title: titulo, description: erro.message, variant: 'destructive' })
  }

  const handleToggle = async (id: string, next: boolean) => {
    avisar('Não foi possível salvar', await setSectionActive(id, next))
  }

  const handleReorder = async (moves: { id: string; position: number }[]) => {
    avisar('Não foi possível reordenar', await reorderSectionsTo(moves))
  }

  const handleAdd = async (type: HomeSectionType) => {
    const { error: erro, id } = await createSection(type)
    avisar('Não foi possível acrescentar a seção', erro)
    if (!erro && id) setSelecionada(id)
  }

  return (
    <div>
      <PageHeader
        title="Home"
        subtitle="O que a cliente vê ao abrir a loja, na ordem em que ela vê."
        icon={House}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/" target="_blank" rel="noreferrer">
                Ver na loja <ExternalLink className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
            {/* Leva à bandeja, que é onde se acrescenta — em vez de abrir um modal com a mesma
                lista. A bandeja fica na tela porque é lá que se lê quais tipos já estão na Home,
                antes do clique. */}
            <Button asChild>
              <a href="#blocos" onClick={() => setAba('secoes')}>
                <Plus className="mr-1.5 h-4 w-4" /> Adicionar seção
              </a>
            </Button>
          </>
        }
      />

      {/* Falha de leitura é superfície EXPLÍCITA, não lista vazia. Foi engolir este erro que fez a
          tela de Coleções parecer "sem conteúdo" por meses, em cima de uma tabela inexistente. */}
      {error && (
        <div
          data-testid="home-erro"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-destructive">
              Não foi possível carregar as seções da Home
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSections}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar de novo
          </Button>
        </div>
      )}

      {loading || loadingCategorias ? (
        <TableSkeleton />
      ) : (
        <>
          {/* As abas só existem abaixo de `lg` — no desktop as duas colunas cabem, e um seletor
              ali obrigaria a escolher entre duas coisas que estão à vista. */}
          <div
            data-testid="abas-mobile"
            className="mb-4 flex gap-1 rounded-xl bg-muted p-1 lg:hidden"
          >
            {(
              [
                ['secoes', 'Seções'],
                ['previa', 'Prévia'],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={aba === valor}
                onClick={() => setAba(valor)}
                className={cn(
                  'min-h-11 flex-1 rounded-lg text-sm font-semibold',
                  aba === valor
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div
              data-testid="coluna-secoes"
              className={cn('min-w-0', aba !== 'secoes' && 'hidden lg:block')}
            >
              <HomeSectionList
                resolved={resolved}
                onToggle={handleToggle}
                onOpen={setSelecionada}
                onReorder={handleReorder}
                footer={
                  <div id="blocos">
                    <HomeBlockTray sections={sections} onAdd={handleAdd} />
                  </div>
                }
              />
            </div>

            <div
              data-testid="coluna-previa"
              className={cn('min-w-0', aba !== 'previa' && 'hidden lg:block')}
            >
              <HomePreview resolved={resolved} highlightId={selecionada} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminHomePage
