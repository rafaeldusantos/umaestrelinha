// A escolha da forma do bloco Compre Junto na loja — uma configuração para a loja inteira.
//
// Só muda a apresentação: as regras de total, de escolha faltando e do que vai à sacola valem iguais
// nas três formas. O vocabulário (as três formas, os nomes e o padrão) é de `core`; o painel não
// escreve uma segunda lista.

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import {
  BUY_TOGETHER_FORMS,
  BUY_TOGETHER_FORM_LABELS,
  type BuyTogetherForm,
} from '@estrelinha/core/buy-together'
import { useStoreSettings, useUpdateSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useBuyTogetherForm } from '@estrelinha/core/hooks/useBuyTogetherForm'
import { FormCard, SettingsSaveButton } from '@/shared/ui'

const BuyTogetherFormCard = () => {
  const { isLoading, isFetching } = useStoreSettings()
  const saved = useBuyTogetherForm()
  const update = useUpdateSettings()
  const [form, setForm] = useState<BuyTogetherForm>(saved)

  useEffect(() => {
    setForm(saved)
  }, [saved])

  const save = async () => {
    try {
      await update.mutateAsync({ key: 'buy_together', value: { form } })
      toast({ title: 'Forma do bloco salva', description: 'Já vale na loja, em todas as joias.' })
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
      <div className="mb-6 flex h-24 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Carregando…
      </div>
    )
  }

  return (
    <FormCard
      className="mb-6"
      title="Como o bloco aparece na loja"
      description="Vale para todas as joias. Só muda como as escolhas se abrem: o preço, o total e o que vai para a sacola são os mesmos."
    >
      <div
        role="radiogroup"
        aria-label="Forma do bloco Compre Junto na loja"
        data-testid="forma-do-bloco"
        className="grid grid-cols-1 gap-2 md:grid-cols-3"
      >
        {BUY_TOGETHER_FORMS.map(value => {
          const checked = form === value
          return (
            <label
              key={value}
              className={`flex min-h-11 min-w-0 cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                checked ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <input
                type="radio"
                name="forma-do-bloco"
                value={value}
                checked={checked}
                onChange={() => setForm(value)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{BUY_TOGETHER_FORM_LABELS[value].name}</span>
                <span className="break-words text-xs text-muted-foreground">
                  {BUY_TOGETHER_FORM_LABELS[value].description}
                </span>
              </span>
            </label>
          )
        })}
      </div>
      <SettingsSaveButton
        testId="salvar-forma-do-bloco"
        loading={update.isPending}
        disabled={isFetching || form === saved}
        onClick={save}
      />
    </FormCard>
  )
}

export default BuyTogetherFormCard
