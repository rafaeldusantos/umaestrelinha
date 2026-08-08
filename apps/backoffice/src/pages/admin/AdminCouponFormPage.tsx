// O cupom em tela própria (feature 18 / T9, board `Cupom — tela interna (/admin/cupons/novo)`).
//
// Mesma moldura da promoção, e isso é o ponto: cupom e promoção são as duas metades do grupo
// `Descontos`, e telas irmãs que se parecem custam menos para aprender. O que diverge é o que TEM de
// divergir — o cupom tem código (que a cliente digita) e não tem faixas.
//
// A tela também é o caminho da DUPLICAÇÃO (`DSC-08`): `?from=<id>` chega pré-preenchida por
// `couponCopyValues`, com o código vazio e focado. É o mesmo padrão de `/admin/produtos/novo?from=`.

import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { cn } from '@estrelinha/ui/lib/utils'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import {
  useAdminCoupons,
  useCreateCoupon,
  useUpdateCoupon,
} from '@estrelinha/core/hooks/useCoupons'
import type { CouponType } from '@estrelinha/supabase/types/coupon'
import { DateField, FormCard, FormPageHeader, ToggleField } from '@/shared/ui'
import {
  CouponPreviewCard,
  couponCopyValues,
  couponFormValues,
  couponSchema,
  emptyCouponForm,
  toCouponPayload,
  type CouponFormValues,
} from '@/features/coupon-form'

const LIST = '/admin/cupons'

const TYPES: { value: CouponType; label: string }[] = [
  { value: 'percent', label: '% off' },
  { value: 'fixed', label: 'Valor fixo' },
  { value: 'free_shipping', label: 'Frete grátis' },
]

const segmentClass = (selected: boolean) =>
  cn(
    'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors',
    selected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
  )

const AdminCouponFormPage = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const fromId = searchParams.get('from')
  const navigate = useNavigate()
  const { data: coupons = [], isLoading } = useAdminCoupons()
  const createMut = useCreateCoupon()
  const updateMut = useUpdateCoupon()
  const codeRef = useRef<HTMLInputElement | null>(null)

  const isEdit = Boolean(id)
  const editing = id ? coupons.find(coupon => coupon.id === id) ?? null : null
  const source = fromId ? coupons.find(coupon => coupon.id === fromId) ?? null : null
  /** AC 2: **depois** de carregar. Antes disso "não achei" é só "ainda não chegou". */
  const notFound = isEdit && !isLoading && editing === null

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: emptyCouponForm,
  })

  useEffect(() => {
    if (editing) {
      form.reset(couponFormValues(editing))
      return
    }
    if (source) {
      form.reset(couponCopyValues(source))
      // O único campo que a cópia NÃO traz é o que precisa de decisão. Focar é dizer isso sem texto.
      codeRef.current?.focus()
    }
  }, [editing, source, form])

  const type = (form.watch('type') ?? 'percent') as CouponType
  const values = form.watch()
  const { ref: codeRegisterRef, ...codeField } = form.register('code')

  const onSubmit = async (formValues: CouponFormValues) => {
    const payload = toCouponPayload(formValues)
    try {
      if (editing) await updateMut.mutateAsync({ id: editing.id, ...payload })
      else await createMut.mutateAsync(payload)
      toast({ title: editing ? 'Cupom atualizado.' : 'Cupom criado.' })
      navigate(LIST)
    } catch (e) {
      // DSC-08 AC 5: código repetido cai aqui (`coupons.code` é `UNIQUE`) — e a tela fica com tudo o
      // que foi preenchido. Sair agora perderia a cópia inteira por causa de uma palavra.
      toast({
        title: 'Erro ao salvar cupom',
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
        <p className="font-heading text-lg font-bold text-foreground">Cupom não encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ele pode ter sido excluído por outra aba. A listagem mostra o que existe agora.
        </p>
        <Button className="mt-4 rounded-xl" variant="outline" onClick={() => navigate(LIST)}>
          Voltar para Cupons
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="w-full">
      <FormPageHeader
        group="Descontos"
        parentLabel="Cupons"
        title={editing ? editing.code : 'Novo cupom'}
        isDirty={form.formState.isDirty}
        saving={saving}
        saveLabel="Salvar cupom"
        onBack={() => navigate(LIST)}
        onSave={() => void submit()}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-6">
          <FormCard
            title="Identidade"
            description="O código é o que a cliente digita no checkout. Precisa valer sozinho, sem regra."
          >
            <div className="space-y-1.5">
              <Label htmlFor="cupom-codigo">Código</Label>
              <Input
                id="cupom-codigo"
                // Monospace porque é um código para copiar e conferir letra por letra — `0` e `O`
                // são indistinguíveis na fonte de texto.
                className="font-mono uppercase"
                placeholder="NANA10"
                {...codeField}
                // O `ref` do `register` não pode ser perdido: é por ele que o RHF lê e foca o campo.
                // Guardamos os dois — o dele e o nosso, que a duplicação usa para focar.
                ref={element => {
                  codeRegisterRef(element)
                  codeRef.current = element
                }}
                onChange={event =>
                  form.setValue('code', event.target.value.toUpperCase(), { shouldDirty: true })
                }
              />
              {form.formState.errors.code && (
                <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cupom-descricao">Descrição</Label>
              <Input
                id="cupom-descricao"
                placeholder="Para que serve este cupom (só você vê)"
                {...form.register('description')}
              />
            </div>
          </FormCard>

          <FormCard title="Desconto" description="O que o código faz quando é aceito.">
            <div className="flex w-fit items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5">
              {TYPES.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={segmentClass(type === option.value)}
                  onClick={() => form.setValue('type', option.value, { shouldDirty: true })}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cupom-valor">
                  {type === 'percent' ? 'Percentual' : type === 'fixed' ? 'Valor (R$)' : 'Valor'}
                </Label>
                <Input
                  id="cupom-valor"
                  type="number"
                  step={type === 'percent' ? '1' : '0.01'}
                  // AC 4: `free_shipping` não tem valor — o desconto é o frete do pedido.
                  disabled={type === 'free_shipping'}
                  {...form.register('value')}
                />
                {type === 'free_shipping' && (
                  <p className="text-xs text-muted-foreground">
                    O desconto é o frete do pedido — não há valor a definir.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cupom-minimo">Pedido mínimo (R$)</Label>
                <Input id="cupom-minimo" type="number" step="0.01" {...form.register('min_order')} />
                <p className="text-xs text-muted-foreground">
                  Zero significa sem mínimo — o cupom vale em qualquer valor.
                </p>
              </div>
            </div>
          </FormCard>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <FormCard title="Vigência">
            <DateField
              label="Válido de"
              placeholder="Vale desde já"
              value={form.watch('valid_from') ?? ''}
              onChange={value => form.setValue('valid_from', value, { shouldDirty: true })}
            />
            <DateField
              label="Válido até"
              placeholder="Sem fim"
              value={form.watch('valid_until') ?? ''}
              onChange={value => form.setValue('valid_until', value, { shouldDirty: true })}
              hint="Sem datas, o cupom vale enquanto estiver ativo."
            />
          </FormCard>

          <FormCard title="Uso">
            <div className="space-y-1.5">
              <Label htmlFor="cupom-limite">Limite de usos</Label>
              <Input
                id="cupom-limite"
                type="number"
                placeholder="Ilimitado"
                {...form.register('max_uses')}
              />
              <p className="text-xs text-muted-foreground">
                Em branco, não tem teto. Ao bater o limite o cupom aparece como Esgotado.
              </p>
            </div>
            <div data-testid="switch-ativo">
              <ToggleField
                label="Ativo"
                description="Desligado, o checkout deixa de aceitar o código — pedidos já feitos não mudam."
                checked={form.watch('active') ?? true}
                onChange={v => form.setValue('active', v, { shouldDirty: true })}
              />
            </div>
            <div data-testid="switch-primeiro-pedido">
              <ToggleField
                label="Apenas primeiro pedido"
                description="Só para quem nunca comprou na loja."
                checked={form.watch('first_order_only') ?? false}
                onChange={v => form.setValue('first_order_only', v, { shouldDirty: true })}
              />
            </div>
          </FormCard>

          <CouponPreviewCard values={values} />
        </aside>
      </div>

      {/* Mesmo motivo da tela de promoção: sem um submit na árvore, o `Enter` dentro de um campo não
          submete. `hidden` não o desqualifica de ser o botão default do form. */}
      <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" disabled={saving}>
        Salvar cupom
      </button>
    </form>
  )
}

export default AdminCouponFormPage
