// A promoção em tela própria (feature 18 / T5, board `Promoção — tela interna (/admin/promocoes/nova)`).
//
// Era um `DialogContent max-w-3xl` que rolava por dentro. O que cabia mal lá: as três chaves e a
// vigência disputando as mesmas duas colunas (e se sobrepondo em 1366px), e o repetidor de faixas —
// a parte que exige COMPARAR linhas — com menos altura útil que a lista de categorias.
//
// A regra não mudou nada: `promotionSchema`, `toWriteInput` e a chamada única de `upsert_promotion`
// são as mesmas da feature 17. O que mudou é a moldura, e por isso as ACs de PRM-02..PRM-08 seguem
// provadas aqui, palavra por palavra, na suíte que migrou do dialog.

import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { DateField, FormCard, FormPageHeader, ToggleField } from '@/shared/ui'
import {
  useAdminPromotions,
  useCreatePromotion,
  useUpdatePromotion,
} from '@estrelinha/core/hooks/usePromotions'
import type { PromotionDiscountKind, PromotionScope } from '@estrelinha/supabase/types/promotion'
import type { MenuCategory } from '@estrelinha/core/menu'
import { useAdminCategories } from '@/entities/category'
import {
  PromotionShowcaseCard,
  ScopePicker,
  TierRepeater,
  emptyPromotionForm,
  promotionSchema,
  toDateInput,
  toWriteInput,
  useEligiblePreview,
  type PromotionFormValues,
} from '@/features/promotion-form'

const LIST = '/admin/promocoes'

const AdminPromotionFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: promotions = [], isLoading } = useAdminPromotions()
  const { categories } = useAdminCategories()
  const createMut = useCreatePromotion()
  const updateMut = useUpdatePromotion()

  const isEdit = Boolean(id)
  // A5: a listagem inteira já está em cache; achar nela é o mesmo caminho de `AdminProductFormPage`.
  const editing = id ? promotions.find(promo => promo.id === id) ?? null : null
  /** AC 3: **depois** de carregar. Antes disso "não achei" é só "ainda não chegou". */
  const notFound = isEdit && !isLoading && editing === null

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: emptyPromotionForm,
  })

  useEffect(() => {
    if (!editing) return
    form.reset({
      name: editing.name,
      scope: editing.scope,
      discount_kind: editing.discount_kind,
      category_ids: editing.categoryIds,
      tiers: editing.tiers,
      valid_from: toDateInput(editing.valid_from),
      valid_until: toDateInput(editing.valid_until),
      stacks_with_coupon: editing.stacks_with_coupon,
      is_kit_showcase: editing.is_kit_showcase,
      active: editing.active,
    })
  }, [editing, form])

  const scope = (form.watch('scope') ?? 'categories') as PromotionScope
  const categoryIds = form.watch('category_ids') ?? []
  const kind = (form.watch('discount_kind') ?? 'unit_price') as PromotionDiscountKind
  const tiers = form.watch('tiers') ?? []

  const preview = useEligiblePreview(
    scope,
    categoryIds,
    categories as unknown as MenuCategory[],
  )

  /**
   * PRM-05 — por que NÃO existe uma chamada de `set_kit_showcase` aqui.
   *
   * `upsert_promotion` já desliga a vitrine anterior antes de escrever esta linha, e tem de fazer
   * isso: `promotions_single_kit_showcase` é índice único parcial, então ligar antes de desligar é
   * recusado pelo próprio banco. Chamar `set_kit_showcase` depois do upsert seria uma **segunda
   * escrita do mesmo fato** — dois donos do mesmo dado, o "defeito 01" do projeto.
   */
  const onSubmit = async (values: PromotionFormValues) => {
    const payload = toWriteInput(values)
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, ...payload })
      else await createMut.mutateAsync(payload)
      toast({ title: editing ? 'Promoção atualizada.' : 'Promoção criada.' })
      navigate(LIST)
    } catch (e) {
      // Nada de navegação otimista: a tela fica com o que a pessoa digitou. Sair antes da confirmação
      // faria o admin dizer "salvou" sobre uma promoção que não existe.
      toast({
        title: 'Erro ao salvar promoção',
        description: (e as Error).message,
        variant: 'destructive',
      })
    }
  }

  const saving = createMut.isPending || updateMut.isPending
  const submit = form.handleSubmit(onSubmit)

  if (isEdit && isLoading) {
    return <div className="p-12 text-center text-muted-foreground">Carregando...</div>
  }

  if (notFound) {
    return (
      <div className="p-12 text-center">
        <p className="font-heading text-lg font-bold text-foreground">Promoção não encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ela pode ter sido excluída por outra aba. A listagem mostra o que existe agora.
        </p>
        <Button className="mt-4 rounded-xl" variant="outline" onClick={() => navigate(LIST)}>
          Voltar para Promoções
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="w-full">
      <FormPageHeader
        group="Descontos"
        parentLabel="Promoções"
        title={editing ? editing.name : 'Nova promoção'}
        isDirty={form.formState.isDirty}
        saving={saving}
        saveLabel="Salvar promoção"
        onBack={() => navigate(LIST)}
        onSave={() => void submit()}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-6">
          <FormCard title="Identidade" description="Vale sozinha, sem código. Cupom é outra coisa.">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-1.5">
                <Label htmlFor="promo-nome">Nome</Label>
                <Input id="promo-nome" placeholder="Kit de bottons" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-tipo">Tipo de regra</Label>
                {/* Um valor só, e o banco garante: `check (type = 'progressive_qty')`. O seletor
                    existe desabilitado porque ele NOMEIA o que a regra faz — abrir o enum sem AC para
                    um segundo tipo é a armadilha da `AD-011`. */}
                <select
                  id="promo-tipo"
                  disabled
                  value="progressive_qty"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-70"
                >
                  <option value="progressive_qty">Desconto progressivo por quantidade</option>
                </select>
              </div>
            </div>
          </FormCard>

          <ScopePicker
            scope={scope}
            onScopeChange={next => form.setValue('scope', next, { shouldValidate: false })}
            categoryIds={categoryIds}
            onCategoryIdsChange={ids => form.setValue('category_ids', ids, { shouldValidate: true })}
            categories={categories}
            eligibleCount={preview.count}
            error={form.formState.errors.category_ids?.message as string | undefined}
          />

          <TierRepeater
            form={form}
            kind={kind}
            // `shouldValidate` de propósito: trocar de `% off` para `Preço por unidade` muda o
            // INTERVALO válido de `value` (1–90 vira "> 0"), então a mensagem tem de ser reavaliada
            // no mesmo clique — senão fica um erro de percentual pendurado num campo de reais.
            onKindChange={next =>
              form.setValue('discount_kind', next, {
                shouldValidate: form.formState.isSubmitted,
              })
            }
            referencePrice={preview.referencePrice}
          />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <FormCard title="Vigência">
            <DateField
              label="Válida de"
              placeholder="Vale desde já"
              value={form.watch('valid_from') ?? ''}
              onChange={value => form.setValue('valid_from', value, { shouldDirty: true })}
            />
            <DateField
              label="Válida até"
              placeholder="Sem fim"
              value={form.watch('valid_until') ?? ''}
              onChange={value => form.setValue('valid_until', value, { shouldDirty: true })}
              hint="Sem datas, a regra vale enquanto estiver ativa."
            />
          </FormCard>

          <FormCard title="Comportamento">
            <div data-testid="switch-ativa">
              <ToggleField
                label="Ativa"
                description="Desligada, a regra para de descontar em pedido novo — e não mexe em pedido já pago."
                checked={form.watch('active') ?? true}
                onChange={v => form.setValue('active', v, { shouldDirty: true })}
              />
            </div>
            <div data-testid="switch-vitrine">
              <ToggleField
                label="Vitrine do kit"
                description="A tela Monte seu kit da loja exibe esta promoção. Só uma por vez."
                checked={form.watch('is_kit_showcase') ?? false}
                onChange={v => form.setValue('is_kit_showcase', v, { shouldDirty: true })}
              />
            </div>
            <div data-testid="switch-cupom">
              <ToggleField
                label="Acumula com cupom"
                description="Desligado: cupom e promoção não somam no mesmo item."
                checked={form.watch('stacks_with_coupon') ?? false}
                onChange={v => form.setValue('stacks_with_coupon', v, { shouldDirty: true })}
              />
            </div>
          </FormCard>

          <PromotionShowcaseCard
            tiers={tiers as { min_qty: number | string; value: number | string }[]}
            kind={kind}
            referencePrice={preview.referencePrice}
          />

          <p className="text-xs text-muted-foreground">
            Ao salvar, a regra passa a valer para {preview.count} produtos — inclusive fora da tela de
            kit.
          </p>
        </aside>
      </div>

      {/* O save mora no cabeçalho (DSC-03). Este botão existe para o `Enter` dentro de um campo
          submeter o formulário como em qualquer form HTML — sem um submit na árvore, o `Enter` não faz
          nada. `hidden` não o desqualifica de ser o botão default do form. */}
      <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" disabled={saving}>
        Salvar promoção
      </button>
    </form>
  )
}

export default AdminPromotionFormPage
