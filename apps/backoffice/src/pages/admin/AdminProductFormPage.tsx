import { useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Package, Image as ImageIcon, Layers, Weight } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Switch } from '@estrelinha/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@estrelinha/ui/tabs'
import { supabase } from '@estrelinha/supabase/client'
import { useAdminProducts } from '@/entities/product/api/useAdminProducts'
import { useAdminCategories } from '@/entities/category/api/useAdminCategories'
import ImageGallery from '@/features/product-form/ui/ImageGallery'
import VariantImageCard from '@/features/product-form/ui/VariantImageCard'
import StorefrontPreview from '@/features/product-form/ui/StorefrontPreview'
import { clearMissingVariantImages } from '@/features/product-form/lib/variantImages'
import {
  imagesFact, priceSummary, stockFact, variantsFact, weightFact,
} from '@/features/product-form/model/summaryFacts'
import { useProductForm } from '@/features/product-form/model/useProductForm'
import { buildChecklist, computeMargin } from '@/features/product-form/model/checklist'
import { useFormDraft } from '@/features/product-form/model/useFormDraft'
import { isPersistFailure, isTempVariantId, persistProductRelations, type PersistClient } from '@/features/product-form/model/persistProduct'
import PublishChecklist from '@/features/product-form/ui/PublishChecklist'
import PricingTab from '@/features/product-form/ui/tabs/PricingTab'
import CategoryMultiSelect from '@/features/product-form/ui/CategoryMultiSelect'
import TagInput from '@/features/product-form/ui/TagInput'
import { selectionLabel, tagCounterLabel } from '@/features/product-form/model/taxonomyLabels'
import SlugField from '@/features/product-form/ui/SlugField'
import SlugReadonlyLine from '@/features/product-form/ui/SlugReadonlyLine'
import { persistRedirect } from '@/features/product-form/model/persistRedirect'
import CategoryFormDialog from '@/features/category-form/ui/CategoryFormDialog'
import { useCategoryUsage, useTagUsage } from '@/entities/category/api/useCategoryUsage'
import ProductFormHeader from '@/features/product-form/ui/ProductFormHeader'
import { canPublish as checklistCanPublish } from '@/features/product-form/model/checklist'
import { errorsByTab, firstErrorOfTab, hasBlockingErrors, validateProduct, type TabId } from '@/features/product-form/model/validateProduct'
import { formatPrice } from '@estrelinha/core/formatters'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import RichTextEditor from '@/shared/ui/RichTextEditor'
import VariantsTable, { type DeleteCheck } from '@/features/product-form/ui/VariantsTable'
import OptionsEditor from '@/features/product-form/ui/OptionsEditor'
import SeoPreview from '@/features/product-form/ui/SeoPreview'
import RelatedProductsSelect from '@/features/product-form/ui/RelatedProductsSelect'
import { MockupStudioDialog } from '@/features/mockup-studio'
import { PageHeader, FormCard } from '@/shared/ui'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@estrelinha/ui/alert-dialog'
import type { DbProduct, ProductVariant } from '@estrelinha/supabase/types'
import { storeUrlFor } from '@/features/product-form/lib/storeUrl'

/** As 5 abas de PFM-01. `variacoes` não existe mais: a grade mora em `precos`. */
const TABS: { id: TabId; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'midia', label: 'Mídia' },
  { id: 'precos', label: 'Preços & variações' },
  { id: 'seo', label: 'SEO' },
  { id: 'relacionados', label: 'Relacionados' },
]

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const AdminProductFormPage = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const fromId = searchParams.get('from')
  const navigate = useNavigate()
  const { products, createProduct, updateProduct } = useAdminProducts()
  const { categories, createCategory } = useAdminCategories()

  // 11/T21: o estado saiu da página. Eram ~30 campos num `useState` só, e é por isso que PFM-11
  // (validar campo de aba FECHADA) não tinha onde morar — o `Tabs` do Radix desmonta o conteúdo
  // inativo e leva o `required` do input com ele.
  const { form, setField, setFields, isDirty, savedSnapshot, markSaved, replaceForm, loading, isEdit } =
    useProductForm(id, fromId)
  // PFM-13: rascunho por produto em `sessionStorage`, com guarda de saída.
  const draft = useFormDraft({ productId: id, form, isDirty })
  const [saving, setSaving] = useState(false)
  // Só para travar o cabeçalho enquanto há envio em curso — o resto do estado de mídia é da
  // `ImageGallery` desde a T34.
  const [uploading, setUploading] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  /** RFN-08 AC 1: `Descartar` era a única ação destrutiva do formulário sem confirmação. */
  const [discardOpen, setDiscardOpen] = useState(false)
  // Controlado (era `defaultValue`) porque o atalho do checklist precisa ABRIR a aba do campo
  // pendente — sem isso o clique focaria um elemento que o Radix ainda não montou.
  const [activeTab, setActiveTab] = useState<TabId>('geral')
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([])
  // A19: contagens vêm de consulta agregada, nunca de `select('*')` no catálogo.
  const { countByCategory } = useCategoryUsage()
  const { countByTag, tagsByUsage } = useTagUsage()
  /** Nome pré-preenchido do "Criar categoria" inline. `null` = diálogo fechado. */
  const [newCategoryName, setNewCategoryName] = useState<string | null>(null)
  /**
   * PFM-02 AC 2-3: o slug é regerado do nome ATÉ a primeira edição manual. Depois disso o vínculo
   * está rompido e mudar o nome não mexe mais na URL — que é o que preserva o link já postado.
   */
  const [slugEdited, setSlugEdited] = useState(false)
  /** PFM-04: ligado por padrão. Produto publicado que muda de URL ganha 301 salvo decisão contrária. */
  const [redirectEnabled, setRedirectEnabled] = useState(true)
  /**
   * O slug que está no banco — base da comparação "a URL mudou?". Vem do snapshot do hook, que é
   * preenchido na carga e no save; um `useState` aqui reabriria a janela de ler o slug já editado.
   */
  const savedSlugRef = useRef<string>('')
  if (savedSlugRef.current === '' && savedSnapshot.slug !== '') {
    savedSlugRef.current = savedSnapshot.slug
  }
  const relatedIds = form.related_product_ids
  const buyTogetherIds = form.buy_together_ids
  const setRelatedIds = (ids: string[]) => setField('related_product_ids', ids)
  const setBuyTogetherIds = (ids: string[]) => setField('buy_together_ids', ids)
  // PFM-12: `computeMargin` exige `price > 0` **e** `cost > 0`. A conta anterior guardava só o
  // custo e, com preço 0, mandava `-Infinity` para a tela (defeito 11).
  const margin = computeMargin(form.price, form.cost_price)
  const summary = priceSummary(form)
  const variacoes = variantsFact(form)
  const estoque = stockFact(form)
  const previewUrl = storeUrlFor(form.slug || slugify(form.name))
  const checklist = buildChecklist(form)
  // PFM-11: a validação roda sobre o estado INTEIRO, independente de qual aba está montada.
  const issues = validateProduct(form)
  const tabErrors = errorsByTab(issues)
  // Publicar exige o checklist completo E nenhum erro de validação. Rascunho não exige nada.
  const canPublish = checklistCanPublish(checklist) && !hasBlockingErrors(issues)

  /** Abre a aba e foca o campo — nesta ordem, porque o Radix desmonta a aba inativa. */
  const focusField = (tab: TabId, field: string) => {
    setActiveTab(tab)
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${field}"]`)
      el?.focus()
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  /**
   * PFM-08 AC 9a: a FK `order_items.variant_id → product_variants(id)` é `NO ACTION`. Sem esta
   * consulta, excluir uma variação vendida devolveria erro de FK cru ao admin.
   */
  const checkVariantOrders = async (variant: ProductVariant): Promise<DeleteCheck> => {
    // Linha que ainda não existe no banco nunca foi vendida.
    if (isTempVariantId(variant.id)) return { orders: 0, verified: true }
    const { count, error } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('variant_id', variant.id)
    // Sem resposta não se sabe: recusar é a falha segura. Chutar "0" excluiria uma linha vendida.
    if (error) return { orders: 0, verified: false }
    return { orders: count ?? 0, verified: true }
  }

  const handleSubmit = async (e: React.FormEvent, intent: 'draft' | 'publish' = 'publish') => {
    e.preventDefault()
    // PFM-11 AC 1: o bloqueio vem daqui, não do `required` do input — que o Radix desmonta junto com
    // a aba inativa. Rascunho passa: o objetivo dele é justamente não perder trabalho incompleto.
    if (intent === 'publish' && hasBlockingErrors(issues)) {
      const first = issues.find(i => i.severity === 'error')!
      toast({ title: first.message, variant: 'destructive' })
      focusField(first.tab, first.field)
      return
    }
    setSaving(true)
    const payload: Record<string, unknown> = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description,
      base_price: Number(form.price),
      original_price: form.compare_price ? Number(form.compare_price) : null,
      cost_price: form.cost_price ? Number(form.cost_price) : null,
      // category_id é uuid nullable: string vazia quebra o cast no Postgres (22P02)
      category_id: form.category_id || null,
      stock_total: Number(form.stock_total),
      low_stock_threshold: Number(form.low_stock_threshold),
      // VAR-11 AC 4: a coluna é `jsonb`. Desde a T21 o estado já tem essa forma — `alt` e `source`
      // sobrevivem a um save que não tocou em imagem sem precisar de mapa paralelo.
      images: form.images,
      tags: form.tags,
      // O `is_active` é decidido pela AÇÃO, não por um switch: publicar coloca na loja, rascunho
      // mantém fora. Dois donos do mesmo dado é o defeito 01 da spec ("um dado, um controle").
      is_active: intent === 'publish',
      is_featured: form.is_featured,
      is_new: form.is_new,
      video_url: form.video_url || null,
      weight_kg: form.weight_kg || null,
      width_cm: form.width_cm || null,
      height_cm: form.height_cm || null,
      length_cm: form.length_cm || null,
      seo_title: form.seo_title || null,
      seo_description: form.seo_description || null,
      scheduled_at: form.scheduled_at || null,
      related_product_ids: relatedIds,
      buy_together_ids: buyTogetherIds,
      // T21b: o modelo novo passa a ser gravado. `options` leva o `position` de cada eixo
      // (PFM-07 AC 5); `stock_policy` e `production_lead_days` são colunas da 07/T1.
      options: form.options,
      stock_policy: form.stock_policy,
      production_lead_days: form.production_lead_days,
    }

    let err: { message: string } | null = null
    let savedId = id ?? null
    if (isEdit) {
      err = await updateProduct(id!, payload)
    } else {
      const created = await createProduct(payload)
      err = created.error
      savedId = created.id
    }

    if (err) {
      toast({ title: 'Erro ao salvar produto', description: err.message, variant: 'destructive' })
      setSaving(false)
      return
    }

    // PFM-04 AC 7: o 301 do endereço antigo. Antes das relações, porque um redirect órfão é
    // inofensivo e uma URL morta não é.
    const nextSlug = String(payload.slug)
    if (savedId && savedSlugRef.current && savedSlugRef.current !== nextSlug) {
      const redirect = await persistRedirect(supabase as unknown as PersistClient, {
        productId: savedId,
        previousSlug: savedSlugRef.current,
        nextSlug,
        enabled: redirectEnabled && form.is_active,
      })
      if (redirect.written === false && redirect.reason === 'error') {
        toast({
          title: 'O produto foi salvo, mas o redirecionamento da URL antiga não',
          description: redirect.message,
          variant: 'destructive',
        })
      }
    }

    // T21b: as duas tabelas que precisam de diff. Sem `savedId` não há dono para as relações — pode
    // acontecer se o insert passar mas o `select('id')` voltar vazio (RLS de leitura, por exemplo).
    if (savedId) {
      const relations = await persistProductRelations(
        supabase as unknown as PersistClient,
        savedId,
        { categoryIds: form.category_ids, variants: form.variants },
        savedSnapshot,
      )
      if (isPersistFailure(relations)) {
        // Nomeia o passo. Não diz "salvo": as colunas do produto entraram, as relações não, e
        // `supabase-js` não abre transação entre chamadas (ver a nota em `persistProduct.ts`).
        toast({
          title: `O produto foi salvo, mas as ${relations.step} não`,
          description: relations.message,
          variant: 'destructive',
        })
        setSaving(false)
        return
      }
    }

    toast({ title: isEdit ? 'Produto atualizado!' : 'Produto criado!' })
    // P1.7 AC 8: o rascunho existe para sobreviver a um F5, não a um save. Mantê-lo depois do
    // save faria a próxima abertura oferecer de volta um estado que já é o do banco.
    draft.discard()
    savedSlugRef.current = nextSlug
    markSaved({ categoryIds: form.category_ids, variants: form.variants, slug: nextSlug })
    navigate('/admin/produtos')
    setSaving(false)
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>

  // RFN-08 AC 2: a tela usa a largura que tem. `max-w-6xl` vinha de quando o formulário era uma
  // coluna só — hoje são três faixas, e o inspetor já tem largura própria.
  return (
    <form id="product-form" onSubmit={handleSubmit} className="w-full">
      <ProductFormHeader
        productName={form.name}
        isEdit={isEdit}
        isPublished={form.is_active}
        isDirty={isDirty}
        draftSavedAt={draft.savedAt}
        saving={saving || uploading}
        canPublish={canPublish}
        onBack={() => { if (draft.confirmLeave()) navigate('/admin/produtos') }}
        onDiscard={() => setDiscardOpen(true)}
        onSaveDraft={() => handleSubmit(new Event('submit') as unknown as React.FormEvent, 'draft')}
        onPublish={() => handleSubmit(new Event('submit') as unknown as React.FormEvent, 'publish')}
      />

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar as alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              O rascunho salvo automaticamente será apagado e o formulário volta ao que está no banco.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter editando</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                draft.discard()
                setDiscardOpen(false)
                navigate('/admin/produtos')
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryFormDialog
        open={newCategoryName !== null}
        onOpenChange={open => setNewCategoryName(open ? newCategoryName : null)}
        allCategories={categories}
        onSave={async data => {
          const created = await createCategory({ ...data, name: data.name || newCategoryName || '' })
          // PFM-05 AC 3: "ao salvar, SHALL já deixar a nova categoria marcada — sem perder o
          // rascunho do produto". O formulário nunca desmonta, então o rascunho está a salvo; o que
          // faltaria é marcar, e é o que esta linha faz.
          if (created.id) setField('category_ids', [...form.category_ids, created.id])
          setNewCategoryName(null)
          return created
        }}
      />

      {/* P1.7 AC 7: a oferta de restauração. Só aparece com rascunho pendente e é dispensável — não
          é um bloqueio, é uma opção. */}
      {draft.pendingDraft && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          <span className="flex-1 text-foreground">
            Há um rascunho não salvo deste produto. Quer continuar de onde parou?
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              replaceForm(draft.pendingDraft!.form)
              draft.dismissDraft()
            }}
          >
            Restaurar rascunho
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={draft.discard}>
            Descartar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Coluna principal */}
        <div className="lg:col-span-2 min-w-0">
          <Tabs value={activeTab} onValueChange={value => setActiveTab(value as TabId)} className="space-y-4">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/60 p-1 rounded-xl">
              {TABS.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-4">
                  {tab.label}
                  {/* PFM-11 AC 2-3: a contagem de erros da aba, e o clique leva ao primeiro campo
                      inválido dela. Sem isto o admin sabe que há erro e não sabe onde. */}
                  {tabErrors[tab.id] > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`${tabErrors[tab.id]} pendência(s) em ${tab.label}`}
                      onClick={event => {
                        event.stopPropagation()
                        const first = firstErrorOfTab(issues, tab.id)
                        if (first) focusField(first.tab, first.field)
                      }}
                      onKeyDown={event => {
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        const first = firstErrorOfTab(issues, tab.id)
                        if (first) focusField(first.tab, first.field)
                      }}
                      className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground"
                    >
                      {tabErrors[tab.id]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* GERAL — três cards, um por assunto (artboard `Produto — aba Geral`).
                Era um card só chamado "Informações gerais" com nome, URL, categorias, descrição e
                tags dentro. Categoria e tag não são "informação geral": são taxonomia, cada uma com
                contagem própria e regra própria, e amontoá-las no mesmo cartão do nome deixava a
                contagem sem cabeçalho onde morar. */}
            <TabsContent value="geral" className="space-y-4">
              <FormCard title="Identidade" description="Como o produto se chama e se apresenta na loja.">
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor="product-name">Nome do produto</Label>
                    {/* RFN-06 AC 1: o contador do artboard. 70 é o teto que o SEO usa no título. */}
                    <span className="text-xs text-muted-foreground" data-testid="name-counter">
                      {form.name.length} / 70
                    </span>
                  </div>
                  <Input
                    id="product-name"
                    data-field="name"
                    value={form.name}
                    onChange={e =>
                      setFields(
                        slugEdited
                          ? { name: e.target.value }
                          : { name: e.target.value, slug: slugify(e.target.value) },
                      )
                    }
                    required
                  />
                </div>
                {/* PFM-02 AC 1: aqui é LEITURA, e em largura cheia logo abaixo do nome — é dele que a
                    URL deriva. Dois campos editáveis do mesmo dado era o defeito 01; editar é na aba
                    SEO, num lugar só. */}
                <SlugReadonlyLine
                  slug={form.slug || slugify(form.name)}
                  derivedFromName={!slugEdited}
                  onEditInSeo={() => focusField('seo', 'slug')}
                />
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <RichTextEditor content={form.description} onChange={v => setField('description', v)} />
                </div>
              </FormCard>

              <FormCard
                title="Categorias"
                description="Um produto pode estar em quantas categorias fizer sentido — todas valem igual."
                action={
                  <span
                    className="text-xs font-semibold text-muted-foreground"
                    data-testid="category-counter"
                  >
                    {selectionLabel(form.category_ids.length)}
                  </span>
                }
              >
                {/* PFM-05: o produto está em várias ao mesmo tempo. O `Select` único obrigava o
                    lojista a escolher qual categoria perder. */}
                <div data-field="category_ids" tabIndex={-1}>
                  <CategoryMultiSelect
                    categories={categories}
                    selected={form.category_ids}
                    onChange={ids => setField('category_ids', ids)}
                    countByCategory={countByCategory}
                    onCreateCategory={setNewCategoryName}
                  />
                </div>
              </FormCard>

              {/* Os campos "Tamanhos" e "Acabamentos" saíram: eles eram os dois eixos FIXOS que o
                  `OptionsEditor` (aba Preços & variações) substituiu por eixos livres. */}
              <FormCard
                title="Tags"
                description="Alimentam a busca e os filtros da loja. Enter, vírgula ou colar da planilha."
                action={
                  <span
                    className="text-xs font-semibold text-muted-foreground"
                    data-testid="tag-counter"
                  >
                    {tagCounterLabel(form.tags.length)}
                  </span>
                }
              >
                <TagInput
                  tags={form.tags}
                  onChange={next => setField('tags', next)}
                  suggestions={tagsByUsage}
                  countByTag={countByTag}
                />
              </FormCard>
            </TabsContent>

            {/* MÍDIA */}
            <TabsContent value="midia">
              <FormCard title="Mídia" description="Imagens e vídeo do produto.">
                {/* PMD-01/03/04: a galeria virou componente próprio na T34 — alt-text com estado,
                    selo de origem, progresso por arquivo e colar da área de transferência. */}
                <ImageGallery
                  images={form.images}
                  onChange={next =>
                    // PMD-06: remover a foto que uma variação apontava não pode deixar a linha com
                    // uma URL morta — ela volta a usar a principal no mesmo gesto.
                    setFields({
                      images: next,
                      variants: clearMissingVariantImages(form.variants, next),
                    })
                  }
                  productName={form.name}
                  onOpenStudio={() => setStudioOpen(true)}
                  onUploadingChange={setUploading}
                />

                <div className="space-y-1.5">
                  <Label>Vídeo (URL YouTube/Vimeo)</Label>
                  <Input value={form.video_url} onChange={e => setField('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                </div>

                {/* T36: o estúdio devolve a galeria JÁ aplicada (anexar/substituir, principal,
                    alt-text), não uma lista de URLs para a página recombinar. */}
                <MockupStudioDialog
                  open={studioOpen}
                  onOpenChange={setStudioOpen}
                  images={form.images}
                  productName={form.name}
                  onApply={next => setField('images', next)}
                />
              </FormCard>
            </TabsContent>

            {/* PREÇOS */}
            <TabsContent value="precos" className="space-y-4">
              {/* PFM-09/PFM-15: preço, política de estoque em 3 modos, alerta por variação, prazo
                  de produção e dimensões. A precedência da grade avisa em voz alta quando NÃO é o
                  preço padrão que manda no valor cobrado. */}
              <PricingTab
                form={form}
                setField={setField}
                onGoToGrid={() => focusField('precos', 'variants')}
              />

              {/* PFM-01: eixos e grade moram na MESMA aba do preço agora — era o ponto da spec.
                  A tabela que editava o JSONB legado foi substituída pela grade com preço por linha. */}
              <FormCard title="Opções" description="Os eixos de escolha do produto. Máximo de 3.">
                <OptionsEditor
                  options={form.options}
                  onChange={next => setField('options', next)}
                />
              </FormCard>

              <FormCard title="Variações" description="Uma linha por combinação, com preço próprio.">
                <div data-field="variants" tabIndex={-1} className="sr-only" aria-hidden="true" />
                <VariantsTable
                  variants={form.variants}
                  options={form.options}
                  stockPolicy={form.stock_policy}
                  onChange={next => setField('variants', next)}
                  onRequestDelete={checkVariantOrders}
                  selectedIds={selectedVariantIds}
                  onSelectionChange={setSelectedVariantIds}
                  slug={form.slug || slugify(form.name)}
                  productId={id ?? ''}
                />
              </FormCard>

              {/* PMD-06: liga cada linha da grade a uma imagem que já está na galeria. Fica na aba
                  Preços porque é onde a grade mora — o vínculo é da variação, não da foto. */}
              <FormCard title="Imagem por variação" description="Cada linha pode mostrar a própria foto na loja.">
                <VariantImageCard
                  variants={form.variants}
                  options={form.options}
                  images={form.images}
                  onChange={next => setField('variants', next)}
                />
              </FormCard>

            </TabsContent>

            {/* SEO */}
            <TabsContent value="seo">
              <FormCard title="SEO" description="Como o produto aparece nos buscadores.">
                <div data-field="seo_title" tabIndex={-1} className="sr-only" aria-hidden="true" />
                <SlugField
                  slug={form.slug || slugify(form.name)}
                  onChange={value => {
                    setSlugEdited(true)
                    setField('slug', value)
                  }}
                  productId={id}
                  savedSlug={savedSlugRef.current}
                  isPublished={form.is_active}
                  redirectEnabled={redirectEnabled}
                  onRedirectToggle={setRedirectEnabled}
                />
                <SeoPreview
                  title={form.seo_title}
                  description={form.seo_description}
                  slug={form.slug || slugify(form.name)}
                  onTitleChange={v => setField('seo_title', v)}
                  onDescriptionChange={v => setField('seo_description', v)}
                />
              </FormCard>
            </TabsContent>

            {/* RELACIONADOS */}
            <TabsContent value="relacionados" className="space-y-4">
              <FormCard title="Produtos relacionados">
                <RelatedProductsSelect label="Produtos relacionados" selected={relatedIds} onChange={setRelatedIds} products={products} excludeId={id} />
              </FormCard>
              <FormCard title="Compre junto">
                <RelatedProductsSelect label="Compre junto" selected={buyTogetherIds} onChange={setBuyTogetherIds} products={products} excludeId={id} />
              </FormCard>
            </TabsContent>
          </Tabs>
        </div>

        {/* Coluna lateral (sticky) */}
        <aside className="lg:col-span-1 space-y-6 lg:sticky lg:top-6 self-start">
          <FormCard title="Publicação">
            <div className="flex flex-col gap-4">
              {/* O switch "Ativo" saiu na T25: quem decide se o produto vai à loja são as ações
                  *Salvar rascunho* / *Salvar e publicar* do cabeçalho. Dois donos do mesmo dado é o
                  defeito 01 da spec. */}
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.is_featured} onCheckedChange={v => setField('is_featured', v)} /> Destaque na home
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.is_new} onCheckedChange={v => setField('is_new', v)} /> Selo &quot;Novo&quot;
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Drop programado</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={e => setField('scheduled_at', e.target.value)} />
              <p className="text-xs text-muted-foreground">Deixe vazio para publicar imediatamente</p>
            </div>
          </FormCard>

          {/* A ordem é a do artboard `Aside`: Publicação → Pronto para publicar → Resumo → Prévia.
              Ela segue a pergunta que o admin faz descendo a coluna — *o que falta?*, *como está?*,
              *como vai aparecer?*. A prévia estava em segundo lugar, empurrando o checklist (o único
              card acionável) para baixo da dobra em telas de 1366px. */}
          <PublishChecklist
            items={checklist}
            onFocusField={item => focusField(item.tab, item.focusField)}
          />

          <FormCard title="Resumo">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">{summary.label}</span>
                <div className="flex items-center justify-between gap-2">
                  {/* RFN-07 AC 6: FAIXA quando há grade. Mostrar o `base_price` de um produto que a
                      loja cobra por variação é anunciar um preço que o caixa não pratica. */}
                  <span className="font-heading text-xl font-bold text-foreground" data-testid="summary-price">
                    {summary.kind === 'range'
                      ? `${formatPrice(summary.min)} – ${formatPrice(summary.max)}`
                      : formatPrice(summary.min)}
                  </span>
                  {margin !== null && (
                    <span
                      className={`shrink-0 rounded-pill px-2 py-0.5 text-xs font-semibold ${
                        margin.percent > 0 ? 'bg-green-50 text-green-700' : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      margem {margin.percent.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <dl className="space-y-2 border-t border-border pt-3">
                {variacoes && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Layers className="h-4 w-4" /> Variações
                    </dt>
                    <dd className="font-medium text-foreground">{variacoes}</dd>
                  </div>
                )}
                {/* Rótulo e valor vêm do MESMO fato: com `Não controlar` a linha diz
                    `Estoque · Não controla`, e "somado" só aparece quando há grade para somar. */}
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" /> {estoque.label}
                  </dt>
                  <dd className="font-medium text-foreground" data-testid="summary-stock">
                    {estoque.value}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-4 w-4" /> Imagens
                  </dt>
                  <dd className="font-medium text-foreground">{imagesFact(form)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Weight className="h-4 w-4" /> Peso de envio
                  </dt>
                  <dd className="font-medium text-foreground">{weightFact(form)}</dd>
                </div>
              </dl>
            </div>
          </FormCard>

          {/* PFM-17 / RFN-07 AC 8: como o card vai aparecer na loja, com o estado atual. */}
          <FormCard
            title="Prévia na loja"
            action={
              previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Abrir ↗
                </a>
              )
            }
          >
            <StorefrontPreview
              name={form.name}
              images={form.images}
              price={form.price}
              variants={form.variants}
            />
          </FormCard>
        </aside>
      </div>
    </form>
  )
}

export default AdminProductFormPage
