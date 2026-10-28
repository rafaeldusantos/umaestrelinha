import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
import { productListReturn } from '@/features/product-list/model/queryUrl'
import ImageGallery from '@/features/product-form/ui/ImageGallery'
import StorefrontPreview from '@/features/product-form/ui/StorefrontPreview'
import { clearMissingVariantImages } from '@/features/product-form/lib/variantImages'
import {
  imagesFact, priceSummary, stockFact, variantsFact, weightFact,
} from '@/features/product-form/model/summaryFacts'
import { useProductForm } from '@/features/product-form/model/useProductForm'
import { buildChecklist, computeMargin } from '@/features/product-form/model/checklist'
import { useFormDraft } from '@/features/product-form/model/useFormDraft'
import { isPersistFailure, isTempVariantId, persistProductRelations, type PersistClient } from '@/features/product-form/model/persistProduct'
import { marcacoesVigentes } from '@/features/product-form/model/optionMarks'
import PublishChecklist from '@/features/product-form/ui/PublishChecklist'
import PricingTab from '@/features/product-form/ui/tabs/PricingTab'
import SupplierCard from '@/features/product-form/ui/SupplierCard'
import SupplierSummaryCard from '@/features/product-form/ui/SupplierSummaryCard'
import {
  persistSuppliers,
  supplierFieldId,
  supplierRowsRefusal,
  supplierRowsToSave,
  type SupplierClient,
} from '@/features/product-form/model/persistSupplier'
import { fetchSuppliers, invalidateSuppliers, useSuppliers } from '@/entities/supplier'
import FaqTab from '@/features/product-form/ui/tabs/FaqTab'
import DescriptionFaqNotice from '@/features/product-form/ui/DescriptionFaqNotice'
import { useAdminFaqs } from '@/features/faq-library/api/useAdminFaqs'
import CategoryMultiSelect from '@/features/product-form/ui/CategoryMultiSelect'
import MaterialCard from '@/features/product-form/ui/MaterialCard'
import ProductActiveControl from '@/features/product-form/ui/ProductActiveControl'
import FilterValuesCard from '@/features/product-form/ui/FilterValuesCard'
import TagInput from '@/features/product-form/ui/TagInput'
import { hasEngravingAxis } from '@estrelinha/core/material'
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
import { syncGrid, type OptionsChange } from '@/features/product-form/model/gridSync'
import {
  applyOrphanChecks,
  mergePausedIds,
  mergePausedLabels,
  orphanVerdict,
  stillPausedLabels,
} from '@/features/product-form/model/orphans'
import { useOptionLibrary } from '@/entities/product'
import { cartesian, optionValuesKey, variantLabel } from '@estrelinha/core/pricing'
import SeoPreview from '@/features/product-form/ui/SeoPreview'
import { GoogleShoppingCard } from '@/features/product-form/ui/GoogleShoppingCard'
import RelatedProductsSelect from '@/features/product-form/ui/RelatedProductsSelect'
import { PageHeader, FormCard } from '@/shared/ui'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@estrelinha/ui/alert-dialog'
import type { DbProduct, ProductOption, ProductVariant } from '@estrelinha/supabase/types'
import { storeUrlFor } from '@/features/product-form/lib/storeUrl'

/** As 5 abas de PFM-01. `variacoes` não existe mais: a grade mora em `precos`. */
const TABS: { id: TabId; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  // Feature 28: logo depois de `Geral` porque a pergunta é a continuação da descrição, que mora
  // lá. Separá-las por três abas de preço e mídia esconderia justamente a relação que o aviso da
  // `FAQ-27` precisa tornar visível.
  { id: 'perguntas', label: 'Perguntas' },
  { id: 'midia', label: 'Mídia' },
  { id: 'precos', label: 'Preços & variações' },
  { id: 'seo', label: 'SEO' },
  { id: 'relacionados', label: 'Relacionados' },
]

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

/** O aviso de sucesso diz o que mudou NA LOJA, que é a pergunta de quem acabou de salvar. */
const savedToast = (isEdit: boolean, intent: 'draft' | 'publish') =>
  intent === 'publish'
    ? {
        title: isEdit ? 'Produto atualizado' : 'Produto criado',
        description: isEdit ? 'As alterações já estão na loja.' : 'O produto já está na loja.',
      }
    : {
        title: 'Rascunho salvo',
        description: 'O produto fica fora da loja até você publicar.',
      }

const AdminProductFormPage = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const fromId = searchParams.get('from')
  const navigate = useNavigate()
  // A lista entrega o próprio endereço ao abrir o cadastro (`productListHref`), e toda volta à lista
  // daqui reabre no mesmo filtro e na mesma página. Chegando de outro lugar, volta sem recorte.
  const location = useLocation()
  const voltarPara = productListReturn(location.state)
  const { createProduct, updateProduct } = useAdminProducts()
  const { categories, createCategory } = useAdminCategories()
  // Feature 80: os fornecedores cadastrados — a sugestão do nome e o "reaproveitar ou criar" do save.
  const { suppliers } = useSuppliers()
  const queryClient = useQueryClient()

  // 11/T21: o estado saiu da página. Eram ~30 campos num `useState` só, e é por isso que PFM-11
  // (validar campo de aba FECHADA) não tinha onde morar — o `Tabs` do Radix desmonta o conteúdo
  // inativo e leva o `required` do input com ele.
  const { form, setField, setFields, isDirty, savedSnapshot, markSaved, replaceForm, adoptSaved, reload, loading, isEdit } =
    useProductForm(id, fromId)
  // Feature 67: a projeção das marcações por opção — renomear eixo leva junto (`VFL-05`), remover
  // texto apaga (`VFL-06`). O bloco e o save leem ESTA lista, nunca o campo cru, então o que a tela
  // mostra marcado é exatamente o que vai ao banco. Rascunho antigo sem o campo vale lista vazia.
  const optionMarksVigentes = marcacoesVigentes(savedSnapshot.options, form.options, form.option_marks ?? [])
  // PFM-13: rascunho por produto em `sessionStorage`, com guarda de saída.
  const draft = useFormDraft({ productId: id, form, isDirty })
  const [saving, setSaving] = useState(false)
  // Só para travar o cabeçalho enquanto há envio em curso — o resto do estado de mídia é da
  // `ImageGallery` desde a T34.
  const [uploading, setUploading] = useState(false)
  /** RFN-08 AC 1: `Descartar` era a única ação destrutiva do formulário sem confirmação. */
  const [discardOpen, setDiscardOpen] = useState(false)
  // Controlado (era `defaultValue`) porque o atalho do checklist precisa ABRIR a aba do campo
  // pendente — sem isso o clique focaria um elemento que o Radix ainda não montou.
  const [activeTab, setActiveTab] = useState<TabId>('geral')
  // A biblioteca inteira: a aba precisa dela para resolver o texto de cada vínculo e para a busca.
  // São 67 entradas no catálogo real — leitura pequena, e a mesma que /admin/perguntas faz.
  const { faqs: faqLibrary, create: createFaq } = useAdminFaqs()
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

  // Feature 81 (`AD-063`): a grade acompanha as opções, e SÓ quando elas mudam pelo editor — abrir o
  // produto não sincroniza nada (OPV-08). `reflected` são as opções que a grade atual reflete
  // (`syncGrid` o devolve a cada chamada); ele recomeça das opções do formulário sempre que elas
  // chegam por OUTRO caminho (carga, releitura depois do save, rascunho restaurado) — é o que
  // `lastEmitted` detecta: se `form.options` não é o array que esta página emitiu por último, ele
  // veio de fora.
  const { library: optionLibrary } = useOptionLibrary()
  const reflected = useRef<ProductOption[]>(form.options)
  const lastEmitted = useRef<ProductOption[]>(form.options)
  /** As órfãs com id real já levadas à consulta de pedidos — `syncGrid` as devolve a cada chamada. */
  const checkedOrphans = useRef<Set<string>>(new Set())
  /** OPV-04: as vendidas (ou de consulta falhada) que ficaram pausadas, pelo nome. */
  const [pausedOrphans, setPausedOrphans] = useState<string[]>([])
  /** Os ids por trás de cada rótulo do aviso: ele nomeia só as que a grade de agora ainda tem pausadas. */
  const [pausedIds, setPausedIds] = useState<ReadonlyMap<string, readonly string[]>>(new Map())
  // A consulta de pedidos é assíncrona: a resposta é aplicada sobre a grade de AGORA (OPV-25).
  const formRef = useRef(form)
  formRef.current = form

  const pausedShown = stillPausedLabels(pausedOrphans, pausedIds, form.variants)

  const handleOptionsChange = (next: ProductOption[], change: OptionsChange) => {
    if (form.options !== lastEmitted.current) {
      reflected.current = form.options
      checkedOrphans.current = new Set()
      setPausedOrphans([])
      setPausedIds(new Map())
    }
    const result = syncGrid(
      { options: reflected.current, variants: form.variants },
      next,
      change,
      {
        price: Number(form.price) || 0,
        compare_price: Number(form.compare_price) || 0,
        weight_kg: Number(form.weight_kg) || 0,
      },
      id ?? '',
    )
    reflected.current = result.options
    lastEmitted.current = next
    setFields({ options: next, variants: result.variants })

    const pending = result.orphans.filter(v => !checkedOrphans.current.has(v.id))
    if (pending.length === 0) return
    pending.forEach(v => checkedOrphans.current.add(v.id))
    void Promise.all(
      pending.map(async variant =>
        orphanVerdict(
          variant.id,
          variantLabel(next, variant.option_values) || variant.name || variant.id,
          await checkVariantOrders(variant),
        ),
      ),
    ).then(verdicts => {
      const current = formRef.current
      // Uma linha que voltou ao cruzamento enquanto a consulta estava no ar não é mais órfã: nem
      // sai nem pausa, e volta a poder ser conferida se sair de novo.
      const combos = new Set(cartesian(current.options).map(optionValuesKey))
      const stillOrphan = verdicts.filter(verdict => {
        const variant = current.variants.find(v => v.id === verdict.id)
        const back = !!variant && combos.has(optionValuesKey(variant.option_values ?? {}))
        if (back) checkedOrphans.current.delete(verdict.id)
        return !back
      })
      const applied = applyOrphanChecks(current.variants, stillOrphan)
      if (stillOrphan.some(v => current.variants.some(row => row.id === v.id))) {
        setFields({ variants: applied.variants })
      }
      if (applied.paused.length > 0) {
        setPausedOrphans(prev => mergePausedLabels(prev, applied.paused))
        const present = new Set(current.variants.map(row => row.id))
        setPausedIds(prev => mergePausedIds(prev, stillOrphan.filter(v => present.has(v.id))))
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent, intent: 'draft' | 'publish' = 'publish') => {
    e.preventDefault()
    // FOR-09/FOR-10: nos DOIS botões, antes de qualquer gravação — e antes do checklist de
    // publicação, senão no "publicar" esta recusa nunca seria alcançada. Rascunho também: o `check`
    // do banco recusaria o link depois de o produto já gravado, e o aviso viraria "salvo, mas…".
    const fornecedorRecusado = supplierRowsRefusal(form.supplier_rows)
    if (fornecedorRecusado) {
      toast({ title: fornecedorRecusado.message, variant: 'destructive' })
      focusField('precos', supplierFieldId(fornecedorRecusado.field, fornecedorRecusado.index))
      return
    }
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
      // Feature 30 (`GSH-20`): vazio grava `null`, nunca string vazia. O feed omite a tag do campo
      // nulo; com string vazia ele emitiria `<g:brand></g:brand>`, que reprova a oferta.
      brand: form.brand || null,
      mpn: form.mpn || null,
      age_group: form.age_group || null,
      gender: form.gender || null,
      google_product_category: form.google_product_category || null,
      identifier_exists: form.identifier_exists,
      scheduled_at: form.scheduled_at || null,
      related_product_ids: relatedIds,
      buy_together_ids: buyTogetherIds,
      // T21b: o modelo novo passa a ser gravado. `options` leva o `position` de cada eixo
      // (PFM-07 AC 5); `stock_policy` e `production_lead_days` são colunas da 07/T1.
      options: form.options,
      stock_policy: form.stock_policy,
      production_lead_days: form.production_lead_days,
      // Feature 22: material afetivo. Salvar SEMPRE grava um booleano — é o que tira a linha do
      // estado `null` ("nunca decidido") e faz o importador parar de semeá-la.
      requires_material: form.requires_material === true,
      material_kinds: form.material_kinds,
      engraving_max_chars: form.engraving_max_chars,
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
        {
          categoryIds: form.category_ids,
          variants: form.variants,
          faqs: form.faqs,
          filterValueIds: form.filter_value_ids,
          optionMarks: optionMarksVigentes,
        },
        { ...savedSnapshot, faqs: savedSnapshot.faqIds },
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

    // Feature 80 (FOR-11..14): o fornecedor, depois de o produto existir.
    const fornecedores = form.supplier_rows
    const fornecedoresSalvos = savedSnapshot.suppliers ?? []
    if (savedId) {
      const supplierError = await persistSuppliers(
        supabase as unknown as SupplierClient,
        savedId,
        fornecedores,
        fornecedoresSalvos,
        suppliers,
        fetchSuppliers,
      )
      if (supplierError) {
        toast({ title: 'O produto foi salvo, mas o fornecedor não', description: supplierError, variant: 'destructive' })
        setSaving(false)
        return
      }
      void invalidateSuppliers(queryClient)
    }

    // P1.7 AC 8: o rascunho existe para sobreviver a um F5, não a um save. Mantê-lo depois do
    // save faria a próxima abertura oferecer de volta um estado que já é o do banco.
    draft.discard()
    savedSlugRef.current = nextSlug
    markSaved({
      categoryIds: form.category_ids,
      variants: form.variants,
      slug: nextSlug,
      faqIds: form.faqs.map(f => f.faq_id),
      filterValueIds: form.filter_value_ids ?? [],
      optionMarks: optionMarksVigentes,
      options: form.options,
      suppliers: supplierRowsToSave(fornecedores),
    })

    // Salvar mantém a página aberta. A releitura não é enfeite: as variações novas nasceram com id
    // provisório, e sem trocar pelo id real o próximo save inseriria a grade de novo. Produto novo
    // vai para a própria rota de edição — ficar em `/novo` faria o segundo save criar outro produto
    // —, e a troca de `id` já relê pelo efeito do `useProductForm`.
    if (!savedId) {
      toast(savedToast(isEdit, intent))
      navigate(voltarPara)
    } else if (!isEdit) {
      toast(savedToast(false, intent))
      navigate(`/admin/produtos/${savedId}/editar`, { replace: true, state: location.state })
    } else if (await reload()) {
      toast(savedToast(true, intent))
    } else {
      // Gravou, mas não deu para reler: continuar na página arriscaria a grade duplicada.
      toast(savedToast(true, intent))
      navigate(voltarPara)
    }
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
        onBack={() => { if (draft.confirmLeave()) navigate(voltarPara) }}
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
                navigate(voltarPara)
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
                <TabsTrigger key={tab.id} value={tab.id} className="max-w-full whitespace-normal data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg px-4">
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
                  {/* `FAQ-27`/`FAQ-28`: a descrição importada ainda traz o bloco de perguntas, e a
                      loja o filtra no render. Sem este aviso a dona editaria um texto invisível. */}
                  <DescriptionFaqNotice
                    description={form.description}
                    onRemove={texto => setField('description', texto)}
                    onGoToFaqTab={() => setActiveTab('perguntas')}
                  />
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

              {/* Feature 66 — os filtros da loja, logo depois das categorias: os dois são taxonomia
                  que a cliente usa para chegar à peça. O estado é do formulário e o save grava o
                  diff, depois de o produto existir (`FLT-13`). */}
              <FilterValuesCard
                selected={form.filter_value_ids}
                onChange={ids => setField('filter_value_ids', ids)}
                optionMarks={optionMarksVigentes}
                onOptionMarksChange={marks => setField('option_marks', marks)}
                product={{
                  id: isEdit ? (id ?? null) : null,
                  name: form.name,
                  tags: form.tags,
                  options: form.options,
                  variants: form.variants,
                  slug: form.slug,
                  is_active: form.is_active,
                }}
              />

              {/* Os campos "Tamanhos" e "Acabamentos" saíram: eles eram os dois eixos FIXOS que o
                  `OptionsEditor` (aba Preços & variações) substituiu por eixos livres. */}
              <FormCard
                title="Tags"
                description="Etiquetas para você e para a busca da loja — não aparecem como filtro. Enter, vírgula ou colar da planilha."
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

              {/* Feature 22 — se a peça exige material da cliente, e quanto cabe de gravação.
                  `offersEngraving` sai dos eixos do produto (aba Preços & variações): o limite só
                  faz sentido para os 35 produtos de 689 que de fato oferecem gravação.

                  A lista "Quais materiais" saiu daqui (`BL-015`): `material_kinds` dizia menos que a
                  descrição, e a loja parou de anunciá-la. A coluna continua gravada e preservada
                  pelo save — o formulário só não a edita mais. */}
              <MaterialCard
                requiresMaterial={form.requires_material}
                engravingMaxChars={form.engraving_max_chars}
                offersEngraving={hasEngravingAxis(form.options)}
                onChange={patch => setFields(patch)}
              />
            </TabsContent>

            {/* MÍDIA */}
            <TabsContent value="perguntas">
              <FaqTab
                value={form.faqs}
                onChange={proximo => setField('faqs', proximo)}
                library={faqLibrary}
                categoryIds={form.category_ids}
                onCreate={createFaq}
              />
            </TabsContent>

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
                  onUploadingChange={setUploading}
                />

                <div className="space-y-1.5">
                  <Label>Vídeo (URL YouTube/Vimeo)</Label>
                  <Input value={form.video_url} onChange={e => setField('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                </div>
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
                afterPrice={
                  <SupplierCard
                    rows={form.supplier_rows}
                    suppliers={suppliers}
                    onChange={rows => setField('supplier_rows', rows)}
                  />
                }
              />

              {/* PFM-01: eixos e grade moram na MESMA aba do preço agora — era o ponto da spec.
                  A tabela que editava o JSONB legado foi substituída pela grade com preço por linha. */}
              <FormCard title="Opções" description="As escolhas da peça, como tamanho ou acabamento. Até 3 opções.">
                <OptionsEditor
                  options={form.options}
                  onChange={handleOptionsChange}
                  library={optionLibrary}
                />
              </FormCard>

              <FormCard title="Variações" description="Uma linha por combinação, com preço próprio.">
                <div data-field="variants" tabIndex={-1} className="sr-only" aria-hidden="true" />
                {pausedShown.length > 0 && (
                  <p
                    role="alert"
                    className="rounded-xl border border-estrelinha-admin-amber/20 bg-estrelinha-admin-amber/10 p-3 text-sm text-estrelinha-admin-amber"
                  >
                    {/* BUG-20261026-valor-devolvido-volta-pausado (decidido em 2026-10-26 pela recomendação do QA):
                        devolver o valor NÃO religa a linha — só OPV-02 e OPV-04 mudam `is_active`
                        sozinhos —, então o aviso diz que ela continua pausada e onde se reativa. */}
                    Estas variações já foram vendidas e ficaram pausadas: {pausedShown.join(', ')}.
                    {' '}Continuam pausadas mesmo que o valor volte às opções; para vender de novo, ligue
                    “Ativa” na linha da grade.
                  </p>
                )}
                <VariantsTable
                  variants={form.variants}
                  options={form.options}
                  stockPolicy={form.stock_policy}
                  onChange={next => setField('variants', next)}
                  onRequestDelete={checkVariantOrders}
                  selectedIds={selectedVariantIds}
                  onSelectionChange={setSelectedVariantIds}
                  slug={form.slug || slugify(form.name)}
                  images={form.images}
                  onImagesAdded={added => setField('images', [...form.images, ...added])}
                  onUploadingChange={setUploading}
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

              <GoogleShoppingCard
                form={form}
                onChange={(campo, valor) => setField(campo, valor as never)}
              />
            </TabsContent>

            {/* RELACIONADOS */}
            <TabsContent value="relacionados" className="space-y-4">
              <FormCard title="Produtos relacionados">
                <RelatedProductsSelect label="Produtos relacionados" selected={relatedIds} onChange={setRelatedIds} excludeId={id} />
              </FormCard>
              <FormCard title="Compre junto">
                <RelatedProductsSelect label="Compre junto" selected={buyTogetherIds} onChange={setBuyTogetherIds} excludeId={id} />
              </FormCard>
            </TabsContent>
          </Tabs>
        </div>

        {/* Coluna lateral. NÃO é `sticky` (feature 67): o `lg:sticky lg:top-6` daqui nunca grudou — o
            `main` do painel era `overflow-auto` e prendia todo `sticky` de dentro. Com o `main`
            consertado ele passaria a grudar, e a coluna mede ~1.300px numa janela de 900: grudada no
            topo, o fim dela (gravação, SEO) ficaria fora de alcance até o fim do formulário, e o topo
            passaria por baixo do cabeçalho de salvar, que é quem gruda nesta tela. */}
        <aside className="lg:col-span-1 space-y-6 self-start">
          <FormCard title="Publicação">
            {/* O switch "Ativo" saiu na T25 (era um segundo dono de `is_active` dentro do save). O que
                volta aqui é uma AÇÃO que grava na hora, só aquela coluna — ver `ProductActiveControl`. */}
            <ProductActiveControl
              productId={isEdit ? id ?? null : null}
              active={form.is_active}
              canActivate={canPublish}
              isDirty={isDirty}
              onChanged={active => adoptSaved({ is_active: active })}
            />
            <div className="flex flex-col gap-4">
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

          {/* Feature 80 (FOR-16): o fornecedor SALVO, com o link da peça em nova aba. */}
          <SupplierSummaryCard suppliers={savedSnapshot.suppliers ?? []} />

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
