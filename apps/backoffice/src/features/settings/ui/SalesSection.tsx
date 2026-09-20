// Seção **Vendas** — feature 55.
//
// As três abas que decidiam como o dinheiro entra: *Pagamento* (Pix e cartão), *Checkout* (a oferta
// antes de pagar) e *Carrinho* (quando um carrinho parado vira abandonado). "Vendas" é a mesma
// palavra do eixo da sidebar que contém Pedidos, Carrinhos e Clientes — e não "Pagamento e
// carrinho", que é a enumeração do conteúdo em vez do nome do assunto.
//
// `CheckoutSettingsCard` entra **inteiro e intocado**: ele já era autocontido (lê e grava a chave
// `checkout` por conta própria) desde a `BMP-06`, e unificar o salvamento está na tabela
// *Out of Scope* da spec.

import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
import {
  DEFAULT_ABANDONED_CART,
  DEFAULT_PAYMENT,
  type AbandonedCartSettings,
  type PaymentSettings,
} from '@estrelinha/supabase/types/settings'
import { FormCard, FieldGroup, InfoBanner, MoneyInput, SettingsSaveButton, SWITCH_TAP_44, ToggleField } from '@/shared/ui'
import { useSettingsSave } from '../model/useSettingsSave'
import CheckoutSettingsCard from './CheckoutSettingsCard'
import { SettingsLoading } from './settingsParts'

export const SalesSection = () => {
  const { data, isLoading } = useStoreSettings()
  const { salvar, salvando } = useSettingsSave()

  const [payment, setPayment] = useState<PaymentSettings>(DEFAULT_PAYMENT)
  const [abandonedCart, setAbandonedCart] = useState<AbandonedCartSettings>(DEFAULT_ABANDONED_CART)

  useEffect(() => {
    if (!data) return
    setPayment(data.payment)
    setAbandonedCart(data.abandoned_cart)
  }, [data])

  if (isLoading) return <SettingsLoading />

  return (
    <div className="space-y-6">
      <FormCard title="Pagamento" description="Como a cliente paga, e em quantas vezes">
        <ToggleField
          label="PIX habilitado"
          checked={payment.pix_enabled}
          onChange={v => setPayment({ ...payment, pix_enabled: v })}
          switchClassName={SWITCH_TAP_44}
        />

        {/* `CFG-25` — desconto em PORCENTO. `MoneyInput` não se aplica: ele prefixa `R$` e
            formataria `5` como `5,00` reais, que é outra grandeza. */}
        <FieldGroup label="Desconto no PIX (%)" htmlFor="pix-desconto">
          <Input id="pix-desconto"
            type="number"
            min={0}
            max={50}
            value={payment.pix_discount_percent}
            onChange={e =>
              setPayment({ ...payment, pix_discount_percent: Number(e.target.value) || 0 })
            }
          />
        </FieldGroup>

        <ToggleField
          label="Cartão de crédito habilitado"
          checked={payment.card_enabled}
          onChange={v => setPayment({ ...payment, card_enabled: v })}
          switchClassName={SWITCH_TAP_44}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Contagem, não dinheiro — fica como está (`CFG-25`). */}
          <FieldGroup label="Máximo de parcelas" htmlFor="max-parcelas">
            <Input id="max-parcelas"
              type="number"
              min={1}
              max={12}
              value={payment.max_installments}
              onChange={e =>
                setPayment({ ...payment, max_installments: Number(e.target.value) || 1 })
              }
            />
          </FieldGroup>

          {/* `v ?? 0` mantém `CFG-24`: o campo cru gravava `Number(…) || 0`, então esvaziá-lo sempre
              gravou zero. Propagar o `null` do `MoneyInput` mudaria o dado sem que nenhuma AC peça. */}
          <FieldGroup label="Valor mínimo da parcela" htmlFor="min-installment-value">
            <MoneyInput
              id="min-installment-value"
              value={payment.min_installment_value}
              onChange={v => setPayment({ ...payment, min_installment_value: v ?? 0 })}
            />
          </FieldGroup>
        </div>

        <SettingsSaveButton
          testId="salvar-pagamento"
          loading={salvando}
          onClick={() => void salvar('payment', payment)}
        />
      </FormCard>

      {/* CHECKOUT — order bump (BMP-06). O card salva a chave `checkout` por conta própria. */}
      <CheckoutSettingsCard />

      <FormCard
        title="Carrinho abandonado"
        description="Quando um carrinho parado deixa de contar como ativo"
      >
        <InfoBanner icon={ShoppingCart} data-testid="aviso-carrinho-abandonado">
          <p>
            Configure quando um carrinho parado vira "abandonado". A loja não envia lembrete
            automático de carrinho. Se um dia enviar, a decisão e o texto são da dona (BL-030).
          </p>
        </InfoBanner>

        {/* Feature 42 (FIX-03): os controles de lembrete automático (`auto_email_enabled`,
            `auto_email_hours`, `reminder_coupon_code`) saíram daqui porque NENHUM código os lia para
            enviar coisa nenhuma — era um interruptor sem motor. Os campos seguem no tipo e no JSONB;
            só a tela deixou de prometer. */}
        <FieldGroup
          label="Marcar como abandonado após (horas)" htmlFor="carrinho-horas"
          hint="Tempo de inatividade antes de mudar o status de 'ativo' para 'abandonado'. Recomendado: 4h."
        >
          <Input id="carrinho-horas"
            type="number"
            min={1}
            max={72}
            value={abandonedCart.threshold_hours}
            onChange={e =>
              setAbandonedCart({ ...abandonedCart, threshold_hours: Number(e.target.value) || 1 })
            }
          />
        </FieldGroup>

        <SettingsSaveButton
          testId="salvar-carrinho"
          loading={salvando}
          onClick={() => void salvar('abandoned_cart', abandonedCart)}
        />
      </FormCard>
    </div>
  )
}

export default SalesSection
