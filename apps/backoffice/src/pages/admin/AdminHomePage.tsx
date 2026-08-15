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
//
// **`/admin/home/:sectionId` monta ESTA MESMA tela** (T30). Editar uma seção troca a coluna da
// esquerda — a lista vira o formulário — e a prévia da direita continua sendo a mesma árvore de
// React, com o bloco em edição contornado. É o precedente dos Descontos ("editor é TELA, não
// modal": sobrevive ao F5, é compartilhável) sem o preço que ele costuma cobrar, que aqui seria
// apagar a prévia justamente enquanto a dona edita olhando para ela.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ExternalLink, House, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import type { HomeSectionType } from '@estrelinha/core/home'
import { useAdminCategories } from '@/entities/category'
import { useAdminProducts } from '@/entities/product'
import { useAdminHomeSections } from '@/entities/home'
import {
  HomeBlockTray,
  HomeLivePreview,
  HomeSectionEditor,
  HomeSectionList,
  applyDraft,
  itemsChanged,
  toNewItems,
  useAdminResolvedHome,
  type SectionSaveDraft,
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
    updateSectionConfig,
    setSectionActive,
    reorderSectionsTo,
    curateSection,
  } = useAdminHomeSections()
  const { categories, loading: loadingCategorias } = useAdminCategories()
  const { products } = useAdminProducts()

  const navigate = useNavigate()
  const { sectionId } = useParams()

  const [aba, setAba] = useState<Aba>('secoes')
  const [saving, setSaving] = useState(false)

  const resolved = useAdminResolvedHome(sections, categories)

  // A seção em edição sai da URL, não de um estado paralelo: é o que faz a tela sobreviver ao F5 e
  // ser compartilhável. Id que não existe mais (seção apagada, link velho) cai na lista — a coluna
  // da esquerda volta a ser a lista, sem tela de erro para um endereço que já não aponta a nada.
  const emEdicao = sectionId ? resolved.find(e => e.section.id === sectionId) : null

  // Feature 25 — o que a prévia contorna e o que ela desenha.
  //
  // O contorno tem duas origens e uma precedência: a seção **em edição** vence a que está sob o
  // cursor. Sem isso, passar o mouse pela lista apagaria o contorno da seção que a dona está editando
  // — justamente enquanto ela olha para a prévia para conferir o que digitou.
  const [apontada, setApontada] = useState<string | null>(null)
  const selecionada = emEdicao ? emEdicao.section.id : apontada

  // O rascunho da seção aberta, para a prévia mostrar o que ainda não foi salvo (`PRV-09`).
  const [rascunho, setRascunho] = useState<SectionSaveDraft | null>(null)
  // Trocar de seção zera o rascunho. Sem isto, abrir a seção B mostraria por um quadro o rascunho da
  // A aplicado sobre a B — o `key` do editor recomeça o formulário, mas este estado é da página.
  useEffect(() => setRascunho(null), [sectionId])

  const previa = useMemo(
    () => applyDraft(sections, emEdicao?.section.id ?? null, rascunho),
    [sections, emEdicao, rascunho],
  )

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
    // Seção nova nasce desligada e vazia: abrir o editor dela é o passo seguinte óbvio, e é lá que
    // ela ganha o conteúdo que a fará valer a pena ligar.
    if (!erro && id) navigate(`/admin/home/${id}`)
  }

  /**
   * A gravação do editor.
   *
   * Devolve **o motivo da falha, ou `null`** — o editor precisa dele para dizer o que não foi salvo
   * sem limpar o formulário (`HOME-14`). Por isso não é um `toast` e pronto: o toast some, e o que
   * a dona precisa é continuar vendo o que digitou.
   *
   * A curadoria só é reescrita quando **mudou**: `curateSection` apaga e reinsere a lista inteira,
   * e pagar isso ao salvar só um título trocaria todos os ids de item sem motivo.
   */
  const handleSave = async (id: string, draft: SectionSaveDraft): Promise<string | null> => {
    const alvo = sections.find(s => s.id === id)
    setSaving(true)
    try {
      const falha = await updateSectionConfig(id, draft.config)
      if (falha) return falha.message

      if (alvo && itemsChanged(alvo, draft.items)) {
        const falhaItens = await curateSection(id, toNewItems(draft.items))
        if (falhaItens) return falhaItens.message
      }

      navigate('/admin/home')
      return null
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* No editor o cabeçalho é o do formulário — trilha `Loja / Home / <seção>`, selo de
          pendência e `Salvar ⌘S`. Dois cabeçalhos empilhados dariam dois títulos e dois pares de
          ações competindo pela mesma decisão. */}
      {!emEdicao && (
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
      )}

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

          {/*
            Feature 25 — **as larguras invertidas**. Antes: lista 748 e prévia 380, num 1440. Nenhuma
            representação de desktop cabe em 380px, e a prévia atual nem tentava. Agora o rail é a
            coluna estreita e a prévia é o palco, que é o modelo de toda ferramenta que faz isto
            (Shopify, Nuvemshop, o Customizer do WordPress).

            `items-start` some aqui de propósito: o palco precisa de **altura** para escalar o quadro,
            e `h-[calc(100vh-…)]` é o que a dá sem inventar um número fixo.
          */}
          <div className="grid gap-6 lg:h-[calc(100vh-11rem)] lg:grid-cols-[380px_minmax(0,1fr)]">
            <div
              data-testid="coluna-secoes"
              className={cn('min-w-0 lg:overflow-y-auto', aba !== 'secoes' && 'hidden lg:block')}
            >
              {emEdicao ? (
                // `key` na seção: trocar de seção pela prévia ou pela URL recomeça o rascunho. Sem
                // ele o formulário da seção anterior sobreviveria com os valores dela.
                <HomeSectionEditor
                  key={emEdicao.section.id}
                  entry={emEdicao}
                  categories={categories}
                  products={products}
                  saving={saving}
                  onCancel={() => navigate('/admin/home')}
                  onSave={draft => handleSave(emEdicao.section.id, draft)}
                  onDraftChange={setRascunho}
                />
              ) : (
                <HomeSectionList
                  resolved={resolved}
                  onToggle={handleToggle}
                  onOpen={id => navigate(`/admin/home/${id}`)}
                  onReorder={handleReorder}
                  onHover={setApontada}
                  footer={
                    <div id="blocos">
                      <HomeBlockTray sections={sections} onAdd={handleAdd} />
                    </div>
                  }
                />
              )}
            </div>

            <div
              data-testid="coluna-previa"
              className={cn('min-h-0 min-w-0', aba !== 'previa' && 'hidden lg:block')}
            >
              {/* Montado FORA do ramo do editor de propósito: é o que faz o iframe não remontar ao
                  abrir uma seção (`PRV-13`). Trocar de coluna aqui recarregaria o documento da loja e
                  apagaria a prévia justamente enquanto a dona edita olhando para ela. */}
              <HomeLivePreview
                sections={previa}
                highlightId={selecionada}
                onSelect={id => navigate(`/admin/home/${id}`)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminHomePage
