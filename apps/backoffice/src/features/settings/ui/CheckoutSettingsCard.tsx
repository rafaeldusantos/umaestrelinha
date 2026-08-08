// Configuração do order bump do checkout one-page (BMP-06).
//
// O card é auto-contido: lê `store_settings` e salva na chave **`checkout`** por conta própria.
// É o que fecha o ciclo de BMP-01 → BMP-04 — sem esta tela o lojista não tem como escolher o
// produto da oferta, e o desconto (aplicado no servidor) não teria o que aplicar.
//
// UI em tokens shadcn + `shared/ui`, conforme a decisão de 2026-07-20 do `STATE.md`.
import { useEffect, useState } from 'react'
import { Loader2, Save, Sparkles } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Button } from '@estrelinha/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import { useToast } from '@estrelinha/ui/hooks/use-toast'
import { formatPrice } from '@estrelinha/core/formatters'
import { useStoreSettings, useUpdateSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { DEFAULT_CHECKOUT, type CheckoutSettings } from '@estrelinha/supabase/types/settings'
import { FormCard, FieldGroup, ToggleField } from '@/shared/ui'
import { useAdminProducts } from '@/entities/product'

/** Fora de 1–99 o desconto não faz sentido: 0 não desconta e 100 daria o produto de graça. */
export const DISCOUNT_RANGE_MESSAGE = 'O desconto precisa ficar entre 1% e 99%.'
export const NO_PRODUCT_OPTION = 'none'

const isDiscountValid = (percent: number) =>
  Number.isInteger(percent) && percent >= 1 && percent <= 99

const CheckoutSettingsCard = () => {
  const { data, isLoading } = useStoreSettings()
  const update = useUpdateSettings()
  const { products, loading: loadingProducts } = useAdminProducts()
  const { toast } = useToast()

  const [checkout, setCheckout] = useState<CheckoutSettings>(DEFAULT_CHECKOUT)

  useEffect(() => {
    if (data) setCheckout(data.checkout)
  }, [data])

  const discountInvalid = !isDiscountValid(checkout.order_bump_discount_percent)

  const save = async () => {
    if (discountInvalid) return
    try {
      await update.mutateAsync({ key: 'checkout', value: checkout })
      toast({
        title: 'Configurações salvas',
        description: 'As alterações já estão valendo na loja.',
      })
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando configurações…
      </div>
    )
  }

  return (
    <FormCard>
      <div className="flex items-start gap-3 rounded-xl bg-muted p-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          O order bump é a oferta que aparece logo antes do botão de pagar, no checkout. O desconto é
          aplicado no servidor, então o valor exibido é sempre o valor cobrado.
        </p>
      </div>

      <ToggleField
        label="Order bump habilitado"
        description="Só aparece na loja se o produto escolhido existir e tiver estoque."
        checked={checkout.order_bump_enabled}
        onChange={(v) => setCheckout({ ...checkout, order_bump_enabled: v })}
      />

      <FieldGroup
        label="Produto da oferta"
        hint="Um produto complementar e baratinho converte melhor que um item caro."
      >
        <Select
          value={checkout.order_bump_product_id ?? NO_PRODUCT_OPTION}
          onValueChange={(v) =>
            setCheckout({
              ...checkout,
              order_bump_product_id: v === NO_PRODUCT_OPTION ? null : v,
            })
          }
        >
          <SelectTrigger aria-label="Produto da oferta">
            <SelectValue placeholder="Selecione um produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PRODUCT_OPTION}>Nenhum produto</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {formatPrice(p.price ?? 0)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loadingProducts && products.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum produto cadastrado ainda — crie um produto para poder oferecê-lo.
          </p>
        )}
      </FieldGroup>

      <FieldGroup label="Desconto da oferta (%)" htmlFor="order-bump-discount">
        <Input
          id="order-bump-discount"
          type="number"
          min={1}
          max={99}
          step={1}
          aria-invalid={discountInvalid}
          value={checkout.order_bump_discount_percent}
          onChange={(e) =>
            setCheckout({ ...checkout, order_bump_discount_percent: Number(e.target.value) })
          }
        />
      </FieldGroup>

      {discountInvalid && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {DISCOUNT_RANGE_MESSAGE}
        </p>
      )}

      <div className="pt-2">
        <Button
          onClick={() => void save()}
          disabled={update.isPending}
          className="rounded-xl gradient-cta text-white transition-all hover:scale-[1.02] hover:brightness-110"
        >
          {update.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar alterações
        </Button>
      </div>
    </FormCard>
  )
}

export default CheckoutSettingsCard
