// Configuração do order bump do checkout one-page (BMP-06).
//
// O card é auto-contido: lê `store_settings` e salva na chave **`checkout`** por conta própria.
// É o que fecha o ciclo de BMP-01 → BMP-04 — sem esta tela o lojista não tem como escolher o
// produto da oferta, e o desconto (aplicado no servidor) não teria o que aplicar.
//
// UI em tokens shadcn + `shared/ui`, conforme a decisão de 2026-07-20 do `STATE.md`.
import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { useToast } from '@estrelinha/ui/hooks/use-toast'
import { useStoreSettings, useUpdateSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { DEFAULT_CHECKOUT, type CheckoutSettings } from '@estrelinha/supabase/types/settings'
import { FormCard, FieldGroup, InfoBanner, SettingsSaveButton, SWITCH_TAP_44, ToggleField } from '@/shared/ui'
import { ProductSearchField, useProductPool } from '@/entities/product'

/** Fora de 1–99 o desconto não faz sentido: 0 não desconta e 100 daria o produto de graça. */
export const DISCOUNT_RANGE_MESSAGE = 'O desconto precisa ficar entre 1% e 99%.'
// `NO_PRODUCT_OPTION` saiu com o `<Select>` (feature 51): era o valor-sentinela da opção "Nenhum
// produto" daquela lista, e sem a lista ele não nomeia mais nada. O estado continua alcançável pelo
// controle de limpar do campo de busca.

const isDiscountValid = (percent: number) =>
  Number.isInteger(percent) && percent >= 1 && percent <= 99

const CheckoutSettingsCard = () => {
  const { data, isLoading } = useStoreSettings()
  const update = useUpdateSettings()
  // **Feature 51**: o `<Select>` de 702 `<SelectItem>` virou a busca compartilhada (`BUS-07`). O
  // pool entra aqui só para responder "a loja já tem alguma peça cadastrada?" — é a MESMA chave que
  // o campo abaixo lê, então continua sendo **uma** requisição (`BUS-20`).
  const { produtos, carregando: carregandoProdutos } = useProductPool()
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
    <FormCard
      title="Checkout"
      description="A oferta que aparece logo antes do botão de pagar"
    >
      {/* Feature 55 (`CFG-26`): era uma das quatro caixas de aviso ad hoc do painel. Mesmo ícone,
          mesmo texto, mesma posição — muda o dono da aparência. */}
      <InfoBanner icon={Sparkles} data-testid="aviso-order-bump">
        <p>
          O order bump é a oferta que aparece logo antes do botão de pagar, no checkout. O desconto é
          aplicado no servidor, então o valor exibido é sempre o valor cobrado.
        </p>
      </InfoBanner>

      <ToggleField
        switchClassName={SWITCH_TAP_44}
        label="Order bump habilitado"
        description="Só aparece na loja se o produto escolhido existir e tiver estoque."
        checked={checkout.order_bump_enabled}
        onChange={(v) => setCheckout({ ...checkout, order_bump_enabled: v })}
      />

      {/* Sem `FieldGroup` aqui, e de propósito: o campo já desenha o próprio `<label>` com este
          texto, e o `<Label>` do grupo o repetiria — dois rótulos com a mesma frase para um
          controle só. O nome acessível continua sendo exatamente "Produto da oferta" (R7). */}
      <div className="space-y-1.5">
        <ProductSearchField
          id="order-bump-produto"
          rotulo="Produto da oferta"
          modo="unico"
          // A única tela do painel que liga o preço, e ela o mostrava antes desta feature: tirá-lo
          // seria regressão de algo que a busca não foi chamada para piorar (`A-07`).
          mostrarPreco
          escolhido={checkout.order_bump_product_id}
          placeholder="procure a peça da oferta pelo nome"
          onEscolher={(produto) =>
            setCheckout({ ...checkout, order_bump_product_id: produto.id })
          }
          // O "Nenhum produto" do `<Select>` antigo era uma opção da lista; aqui ele é o caminho de
          // volta do modo único (`BUS-09`). O estado continua alcançável — muda o controle, não a
          // escolha que a dona pode fazer.
          onLimpar={() => setCheckout({ ...checkout, order_bump_product_id: null })}
        />

        {checkout.order_bump_product_id === null && (
          <p data-testid="sem-produto-da-oferta" className="text-xs text-muted-foreground">
            Nenhum produto escolhido — a oferta não aparece no checkout.
          </p>
        )}

        {!carregandoProdutos && produtos.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum produto cadastrado ainda — crie um produto para poder oferecê-lo.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Um produto complementar e baratinho converte melhor que um item caro.
        </p>
      </div>

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

      {/* Feature 56 (`LEG-20`): era a terceira escrita da mesma string de classes, e já tinha
          divergido — esta não levava o `h-11`, então o botão nascia com 40px, abaixo do piso de
          alvo de toque que `CFG-14` nomeia. Com o dono em `shared/ui` ele ganha os 44px e a largura
          cheia no celular de graça. */}
      <SettingsSaveButton
        testId="salvar-checkout"
        loading={update.isPending}
        onClick={() => void save()}
      />
    </FormCard>
  )
}

export default CheckoutSettingsCard
